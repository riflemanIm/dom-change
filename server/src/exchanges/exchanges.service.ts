import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AvailabilityType, ExchangeRequestStatus, ExchangeType, PointTransactionType, Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateExchangeRequestDto } from './dto/exchange-request.dto';

const requestInclude = {
  requester: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
  host: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
  targetProperty: { select: { id: true, slug: true, title: true, address: { select: { city: true, country: true } }, photos: { where: { isPrimary: true }, select: { externalUrl: true }, take: 1 } } },
  offeredProperty: { select: { id: true, slug: true, title: true, address: { select: { city: true, country: true } } } },
} satisfies Prisma.ExchangeRequestInclude;

@Injectable()
export class ExchangesService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  list(userId: string, direction: 'incoming' | 'outgoing') {
    return this.prisma.exchangeRequest.findMany({
      where: direction === 'incoming' ? { hostId: userId } : { requesterId: userId },
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(requesterId: string, dto: CreateExchangeRequestDto) {
    const startsOn = this.parseDate(dto.startsOn);
    const endsOn = this.parseDate(dto.endsOn);
    const nights = Math.round((endsOn.getTime() - startsOn.getTime()) / 86_400_000);
    if (startsOn < this.today() || nights < 1) throw new UnprocessableEntityException('Проверьте даты поездки');

    const target = await this.prisma.property.findFirst({
      where: { id: dto.targetPropertyId, status: PropertyStatus.PUBLISHED, deletedAt: null },
      include: { availability: true },
    });
    if (!target) throw new NotFoundException('Объявление не найдено');
    if (target.ownerId === requesterId) throw new UnprocessableEntityException('Нельзя отправить заявку на своё жильё');
    if (dto.guests > target.maxGuests) throw new UnprocessableEntityException('Слишком много гостей для этого жилья');
    if (dto.type === ExchangeType.POINTS && !target.acceptsPoints) throw new UnprocessableEntityException('Жильё не принимает обмен за баллы');
    if (dto.type === ExchangeType.DIRECT && !target.acceptsDirect) throw new UnprocessableEntityException('Жильё не принимает прямой обмен');

    const availabilityTypes: AvailabilityType[] = dto.type === ExchangeType.POINTS
      ? [AvailabilityType.POINTS, AvailabilityType.BOTH]
      : [AvailabilityType.DIRECT, AvailabilityType.BOTH];
    const period = target.availability.find((item) =>
      item.startsOn <= startsOn && item.endsOn >= endsOn && availabilityTypes.includes(item.type)
      && item.maxGuests >= dto.guests && item.minNights <= nights
      && (item.maxNights === null || item.maxNights >= nights));
    if (!period) throw new UnprocessableEntityException('Выбранные даты недоступны для этого типа обмена');

    let offeredPropertyId: string | null = null;
    if (dto.type === ExchangeType.DIRECT) {
      if (!dto.offeredPropertyId) throw new UnprocessableEntityException('Выберите своё жильё для прямого обмена');
      const offered = await this.prisma.property.findFirst({
        where: { id: dto.offeredPropertyId, ownerId: requesterId, status: PropertyStatus.PUBLISHED, deletedAt: null, acceptsDirect: true },
        select: { id: true },
      });
      if (!offered) throw new UnprocessableEntityException('Предложенное жильё недоступно для прямого обмена');
      offeredPropertyId = offered.id;
      if (await this.hasConfirmedConflict(offered.id, startsOn, endsOn)) {
        throw new ConflictException('Ваше жильё уже участвует в обмене на эти даты');
      }
    }

    const conflict = await this.hasConfirmedConflict(dto.targetPropertyId, startsOn, endsOn);
    if (conflict) throw new ConflictException('Эти даты уже заняты');
    const existing = await this.prisma.exchangeRequest.findFirst({
      where: { requesterId, targetPropertyId: target.id, status: { in: [ExchangeRequestStatus.PENDING, ExchangeRequestStatus.PREAPPROVED] }, startsOn: { lt: endsOn }, endsOn: { gt: startsOn } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('У вас уже есть активная заявка на пересекающиеся даты');

    const pointsPerNight = dto.type === ExchangeType.POINTS ? period.pointsPerNight : null;
    const request = await this.prisma.exchangeRequest.create({
      data: {
        requesterId,
        hostId: target.ownerId,
        targetPropertyId: target.id,
        offeredPropertyId,
        type: dto.type,
        startsOn,
        endsOn,
        guests: dto.guests,
        message: dto.message?.trim() || null,
        pointsPerNightSnapshot: pointsPerNight,
        totalPoints: pointsPerNight === null ? null : pointsPerNight * nights,
      },
      include: requestInclude,
    });
    await this.notifications.create(target.ownerId, 'EXCHANGE_STATUS', 'Новая заявка на обмен', request.targetProperty.title, '/account/exchanges');
    return request;
  }

  preapprove(hostId: string, id: string) {
    return this.transition(id, hostId, 'host', ExchangeRequestStatus.PENDING, ExchangeRequestStatus.PREAPPROVED, { preapprovedAt: new Date() });
  }

  async reject(hostId: string, id: string) {
    const request = await this.findParticipantRequest(id, hostId);
    if (request.hostId !== hostId) throw new ForbiddenException('Отклонить заявку может только хозяин');
    const rejectableStatuses: ExchangeRequestStatus[] = [ExchangeRequestStatus.PENDING, ExchangeRequestStatus.PREAPPROVED];
    if (!rejectableStatuses.includes(request.status)) throw new ConflictException('Заявку уже нельзя отклонить');
    return this.transition(id, hostId, 'host', request.status, ExchangeRequestStatus.REJECTED, { rejectedAt: new Date() });
  }

  async cancel(requesterId: string, id: string) {
    const request = await this.findParticipantRequest(id, requesterId);
    if (request.requesterId !== requesterId) throw new ForbiddenException('Отменить заявку может только отправитель');
    const cancellableStatuses: ExchangeRequestStatus[] = [ExchangeRequestStatus.PENDING, ExchangeRequestStatus.PREAPPROVED];
    if (!cancellableStatuses.includes(request.status)) throw new ConflictException('Заявку уже нельзя отменить');
    return this.transition(id, requesterId, 'requester', request.status, ExchangeRequestStatus.CANCELLED, { cancelledAt: new Date() });
  }

  async confirm(requesterId: string, id: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.exchangeRequest.findUnique({ where: { id } });
        if (!request) throw new NotFoundException('Заявка не найдена');
        if (request.requesterId !== requesterId) throw new ForbiddenException('Подтвердить заявку может только отправитель');
        if (request.status !== ExchangeRequestStatus.PREAPPROVED) throw new ConflictException('Заявка не ожидает подтверждения');
        const propertyIds = [request.targetPropertyId, request.offeredPropertyId].filter((propertyId): propertyId is string => Boolean(propertyId));
        const conflict = await tx.exchangeRequest.findFirst({
          where: {
            id: { not: id },
            status: ExchangeRequestStatus.CONFIRMED,
            startsOn: { lt: request.endsOn },
            endsOn: { gt: request.startsOn },
            OR: [{ targetPropertyId: { in: propertyIds } }, { offeredPropertyId: { in: propertyIds } }],
          },
          select: { id: true },
        });
        if (conflict) throw new ConflictException('Даты уже заняты другой заявкой');
        if (request.type === ExchangeType.POINTS && request.totalPoints) {
          const amount = BigInt(request.totalPoints);
          const reserved = await tx.pointAccount.updateMany({
            where: { userId: requesterId, available: { gte: amount } },
            data: { available: { decrement: amount }, reserved: { increment: amount }, version: { increment: 1 } },
          });
          if (reserved.count !== 1) throw new UnprocessableEntityException('Недостаточно ДомБаллов');
          await tx.pointTransaction.create({
            data: { account: { connect: { userId: requesterId } }, type: PointTransactionType.RESERVE, amount: -amount, idempotencyKey: `exchange-reserve:${id}`, sourceType: 'EXCHANGE_REQUEST', sourceId: id, description: 'Резерв на подтверждённый обмен' },
          });
        }
        const claimed = await tx.exchangeRequest.updateMany({
          where: { id, status: ExchangeRequestStatus.PREAPPROVED },
          data: { status: ExchangeRequestStatus.CONFIRMED, confirmedAt: new Date() },
        });
        if (claimed.count !== 1) throw new ConflictException('Статус заявки уже изменился');
        return tx.exchangeRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2002')) throw new ConflictException('Заявка уже обрабатывается, повторите запрос');
      throw error;
    }
  }

  async cancelConfirmed(userId: string, id: string, reason: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.exchangeRequest.findUnique({ where: { id } });
        if (!request || (request.requesterId !== userId && request.hostId !== userId)) {
          throw new NotFoundException('Заявка не найдена');
        }
        if (request.status !== ExchangeRequestStatus.CONFIRMED) {
          throw new ConflictException('Отменить этим способом можно только подтверждённый обмен');
        }
        const claimed = await tx.exchangeRequest.updateMany({
          where: { id, status: ExchangeRequestStatus.CONFIRMED },
          data: {
            status: ExchangeRequestStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledById: userId,
            cancellationReason: reason.trim(),
          },
        });
        if (claimed.count !== 1) throw new ConflictException('Статус заявки уже изменился');
        if (request.type === ExchangeType.POINTS && request.totalPoints) {
          const amount = BigInt(request.totalPoints);
          const released = await tx.pointAccount.updateMany({
            where: { userId: request.requesterId, reserved: { gte: amount } },
            data: { reserved: { decrement: amount }, available: { increment: amount }, version: { increment: 1 } },
          });
          if (released.count !== 1) throw new ConflictException('Не удалось освободить резерв ДомБаллов');
          await tx.pointTransaction.create({
            data: {
              account: { connect: { userId: request.requesterId } },
              type: PointTransactionType.RELEASE,
              amount,
              idempotencyKey: `exchange-release:${id}`,
              sourceType: 'EXCHANGE_REQUEST',
              sourceId: id,
              description: 'Возврат резерва после отмены обмена',
            },
          });
        }
        return tx.exchangeRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      this.rethrowTransactionConflict(error);
    }
  }

  async complete(userId: string, id: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.exchangeRequest.findUnique({ where: { id } });
        if (!request || (request.requesterId !== userId && request.hostId !== userId)) {
          throw new NotFoundException('Заявка не найдена');
        }
        if (request.status !== ExchangeRequestStatus.CONFIRMED) throw new ConflictException('Обмен не готов к завершению');
        if (request.endsOn > this.today()) throw new UnprocessableEntityException('Завершить обмен можно после даты выезда');
        const claimed = await tx.exchangeRequest.updateMany({
          where: { id, status: ExchangeRequestStatus.CONFIRMED },
          data: { status: ExchangeRequestStatus.COMPLETED, completedAt: new Date() },
        });
        if (claimed.count !== 1) throw new ConflictException('Статус заявки уже изменился');
        if (request.type === ExchangeType.POINTS && request.totalPoints) {
          const amount = BigInt(request.totalPoints);
          const debited = await tx.pointAccount.updateMany({
            where: { userId: request.requesterId, reserved: { gte: amount } },
            data: { reserved: { decrement: amount }, version: { increment: 1 } },
          });
          if (debited.count !== 1) throw new ConflictException('Не удалось списать резерв ДомБаллов');
          await tx.pointAccount.update({
            where: { userId: request.hostId },
            data: { available: { increment: amount }, version: { increment: 1 } },
          });
          await tx.pointTransaction.createMany({
            data: [
              { accountId: (await tx.pointAccount.findUniqueOrThrow({ where: { userId: request.requesterId }, select: { id: true } })).id, type: PointTransactionType.DEBIT, amount: -amount, idempotencyKey: `exchange-debit:${id}`, sourceType: 'EXCHANGE_REQUEST', sourceId: id, description: 'Оплата завершённого обмена' },
              { accountId: (await tx.pointAccount.findUniqueOrThrow({ where: { userId: request.hostId }, select: { id: true } })).id, type: PointTransactionType.HOST_CREDIT, amount, idempotencyKey: `exchange-host-credit:${id}`, sourceType: 'EXCHANGE_REQUEST', sourceId: id, description: 'Начисление за завершённый обмен' },
            ],
          });
        }
        await tx.userProfile.updateMany({
          where: { userId: { in: [request.requesterId, request.hostId] } },
          data: { completedExchanges: { increment: 1 } },
        });
        return tx.exchangeRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      this.rethrowTransactionConflict(error);
    }
  }

  private async transition(id: string, userId: string, actor: 'host' | 'requester', from: ExchangeRequestStatus, to: ExchangeRequestStatus, timestamps: Record<string, Date>) {
    await this.findParticipantRequest(id, userId);
    const updated = await this.prisma.exchangeRequest.updateMany({
      where: { id, [actor === 'host' ? 'hostId' : 'requesterId']: userId, status: from },
      data: { status: to, ...timestamps },
    });
    if (!updated.count) throw new ConflictException('Статус заявки уже изменился');
    const result = await this.prisma.exchangeRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
    const recipientId = actor === 'host' ? result.requesterId : result.hostId;
    const labels: Partial<Record<ExchangeRequestStatus, string>> = {
      PREAPPROVED: 'Заявка предварительно одобрена',
      REJECTED: 'Заявка отклонена',
      CANCELLED: 'Заявка отменена',
    };
    const direction = actor === 'host' ? 'outgoing' : 'incoming';
    await this.notifications.create(recipientId, 'EXCHANGE_STATUS', labels[to] ?? 'Статус заявки изменён', result.targetProperty.title, `/account/exchanges?direction=${direction}`);
    return result;
  }

  private async findParticipantRequest(id: string, userId: string) {
    const request = await this.prisma.exchangeRequest.findFirst({ where: { id, OR: [{ requesterId: userId }, { hostId: userId }] } });
    if (!request) throw new NotFoundException('Заявка не найдена');
    return request;
  }

  private hasConfirmedConflict(propertyId: string, startsOn: Date, endsOn: Date) {
    return this.prisma.exchangeRequest.findFirst({
      where: {
        status: ExchangeRequestStatus.CONFIRMED,
        startsOn: { lt: endsOn },
        endsOn: { gt: startsOn },
        OR: [{ targetPropertyId: propertyId }, { offeredPropertyId: propertyId }],
      },
      select: { id: true },
    });
  }

  private parseDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new UnprocessableEntityException('Некорректная дата');
    return date;
  }

  private today() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private rethrowTransactionConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2002')) {
      throw new ConflictException('Операция уже выполняется, обновите данные');
    }
    throw error;
  }
}
