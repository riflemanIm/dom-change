import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AvailabilityType, ExchangeRequestStatus, ExchangeType, PointTransactionType, Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateExchangeRequestDto } from './dto/exchange-request.dto';

const requestInclude = {
  requester: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
  host: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
  targetProperty: { select: { id: true, slug: true, title: true, address: { select: { city: true, country: true } }, photos: { where: { isPrimary: true }, select: { externalUrl: true }, take: 1 } } },
  offeredProperty: { select: { id: true, slug: true, title: true, address: { select: { city: true, country: true } } } },
} satisfies Prisma.ExchangeRequestInclude;

@Injectable()
export class ExchangesService {
  constructor(private readonly prisma: PrismaService) {}

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
    }

    const conflict = await this.hasConfirmedConflict(dto.targetPropertyId, startsOn, endsOn);
    if (conflict) throw new ConflictException('Эти даты уже заняты');
    const existing = await this.prisma.exchangeRequest.findFirst({
      where: { requesterId, targetPropertyId: target.id, status: { in: [ExchangeRequestStatus.PENDING, ExchangeRequestStatus.PREAPPROVED] }, startsOn: { lt: endsOn }, endsOn: { gt: startsOn } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('У вас уже есть активная заявка на пересекающиеся даты');

    const pointsPerNight = dto.type === ExchangeType.POINTS ? period.pointsPerNight : null;
    return this.prisma.exchangeRequest.create({
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
  }

  preapprove(hostId: string, id: string) {
    return this.transition(id, hostId, 'host', ExchangeRequestStatus.PENDING, ExchangeRequestStatus.PREAPPROVED, { preapprovedAt: new Date() });
  }

  reject(hostId: string, id: string) {
    return this.transition(id, hostId, 'host', ExchangeRequestStatus.PENDING, ExchangeRequestStatus.REJECTED, { rejectedAt: new Date() });
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
        const conflict = await tx.exchangeRequest.findFirst({
          where: { id: { not: id }, targetPropertyId: request.targetPropertyId, status: ExchangeRequestStatus.CONFIRMED, startsOn: { lt: request.endsOn }, endsOn: { gt: request.startsOn } },
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

  private async transition(id: string, userId: string, actor: 'host' | 'requester', from: ExchangeRequestStatus, to: ExchangeRequestStatus, timestamps: Record<string, Date>) {
    await this.findParticipantRequest(id, userId);
    const updated = await this.prisma.exchangeRequest.updateMany({
      where: { id, [actor === 'host' ? 'hostId' : 'requesterId']: userId, status: from },
      data: { status: to, ...timestamps },
    });
    if (!updated.count) throw new ConflictException('Статус заявки уже изменился');
    return this.prisma.exchangeRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
  }

  private async findParticipantRequest(id: string, userId: string) {
    const request = await this.prisma.exchangeRequest.findFirst({ where: { id, OR: [{ requesterId: userId }, { hostId: userId }] } });
    if (!request) throw new NotFoundException('Заявка не найдена');
    return request;
  }

  private hasConfirmedConflict(propertyId: string, startsOn: Date, endsOn: Date) {
    return this.prisma.exchangeRequest.findFirst({ where: { targetPropertyId: propertyId, status: ExchangeRequestStatus.CONFIRMED, startsOn: { lt: endsOn }, endsOn: { gt: startsOn } }, select: { id: true } });
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
}
