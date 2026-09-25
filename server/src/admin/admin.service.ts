import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, ExchangeRequestStatus, ExchangeType, FileProcessingStatus, PointTransactionType, Prisma, TrustLevel, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PointRulesService } from '../database/point-rules.service';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { CreateAmenityDto, UpdateAmenityDto } from './dto/amenity.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly rules: PointRulesService, private readonly files: FilesService, private readonly realtime: RealtimeService) {}

  async users(query = '') {
    const search = query.trim().slice(0, 100);
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(search ? { OR: [
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { profile: { displayName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        ] } : {}),
      },
      select: {
        id: true, email: true, role: true, status: true, emailVerified: true, createdAt: true,
        profile: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createUser(dto: CreateAdminUserDto) {
    const email = dto.email.trim().toLowerCase();
    const displayName = dto.displayName.trim();
    if (displayName.length < 2) throw new BadRequestException('Имя должно содержать хотя бы 2 символа');
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const welcomeBonus = await this.rules.amount('registration');
    try {
      return await this.prisma.user.create({
        data: {
          email, passwordHash, role: dto.role, emailVerified: dto.emailVerified ?? true,
          trustLevel: dto.emailVerified === false ? TrustLevel.NEW : TrustLevel.EMAIL_VERIFIED,
          profile: { create: { displayName } },
          pointAccount: { create: {
            available: welcomeBonus,
            bonus: welcomeBonus,
            ...(welcomeBonus > 0 ? { transactions: { create: {
              type: PointTransactionType.BONUS,
              amount: welcomeBonus,
              idempotencyKey: `welcome:${email}`,
              sourceType: 'ADMIN_CREATED_USER',
              description: 'Приветственный бонус',
            } } } : {}),
          } },
        },
        select: {
          id: true, email: true, role: true, status: true, emailVerified: true, createdAt: true,
          profile: { select: { displayName: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
      throw error;
    }
  }


  async userDetails(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, phone: true, role: true, status: true, trustLevel: true,
        emailVerified: true, phoneVerified: true, createdAt: true,
        profile: { select: {
          displayName: true, surname: true, patronymic: true, city: true, description: true,
          adultsCount: true, childrenCount: true, hasPets: true, interests: true, travelPreferences: true,
        } },
      },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async updateUser(actorId: string, id: string, dto: UpdateAdminUserDto) {
    if (!Object.keys(dto).length) throw new BadRequestException('Укажите изменения');
    if (dto.status === AccountStatus.DELETED) throw new BadRequestException('Для полного удаления используйте отдельное действие');
    const current = await this.userDetails(id);
    if (id === actorId && (dto.role && dto.role !== UserRole.ADMIN || dto.status && dto.status !== AccountStatus.ACTIVE)) {
      throw new BadRequestException('Нельзя снять собственные права или заблокировать себя');
    }
    const email = dto.email?.trim().toLowerCase();
    if (email !== undefined && email !== current.email && dto.emailVerified === undefined) {
      dto.emailVerified = false;
    }
    const passwordHash = dto.password ? await argon2.hash(dto.password, { type: argon2.argon2id }) : undefined;
    const profileData: Prisma.UserProfileUpdateInput = {
      ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim() } : {}),
      ...(dto.surname !== undefined ? { surname: dto.surname?.trim() || null } : {}),
      ...(dto.patronymic !== undefined ? { patronymic: dto.patronymic?.trim() || null } : {}),
      ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      ...(dto.adultsCount !== undefined ? { adultsCount: dto.adultsCount } : {}),
      ...(dto.childrenCount !== undefined ? { childrenCount: dto.childrenCount } : {}),
      ...(dto.hasPets !== undefined ? { hasPets: dto.hasPets } : {}),
      ...(dto.interests !== undefined ? { interests: dto.interests } : {}),
      ...(dto.travelPreferences !== undefined ? { travelPreferences: dto.travelPreferences } : {}),
    };
    try {
      await this.prisma.$transaction(async (tx) => {
        if (current.role === UserRole.ADMIN && current.status === AccountStatus.ACTIVE &&
            (dto.role && dto.role !== UserRole.ADMIN || dto.status && dto.status !== AccountStatus.ACTIVE)) {
          const remaining = await tx.user.count({ where: { role: UserRole.ADMIN, status: AccountStatus.ACTIVE, deletedAt: null } });
          if (remaining < 2) throw new BadRequestException('Нельзя отключить последнего активного администратора');
        }
        await tx.user.update({
          where: { id },
          data: {
            ...(email !== undefined ? { email } : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
            ...(dto.role !== undefined ? { role: dto.role } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.trustLevel !== undefined ? { trustLevel: dto.trustLevel } : {}),
            ...(dto.emailVerified !== undefined ? { emailVerified: dto.emailVerified } : {}),
            ...(dto.phoneVerified !== undefined ? { phoneVerified: dto.phoneVerified } : {}),
            ...(passwordHash ? { passwordHash } : {}),
            ...(Object.keys(profileData).length ? { profile: { upsert: {
              create: { displayName: dto.displayName?.trim() || current.profile?.displayName || 'Пользователь',
                surname: dto.surname?.trim() || null, patronymic: dto.patronymic?.trim() || null,
                city: dto.city?.trim() || null, description: dto.description?.trim() || null,
                adultsCount: dto.adultsCount ?? 1, childrenCount: dto.childrenCount ?? 0,
                hasPets: dto.hasPets ?? false, interests: dto.interests ?? [], travelPreferences: dto.travelPreferences ?? [],
              },
              update: profileData,
            } } } : {}),
          },
        });
        if (passwordHash || dto.status && dto.status !== AccountStatus.ACTIVE) {
          await tx.userSession.deleteMany({ where: { userId: id } });
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (passwordHash || dto.status && dto.status !== AccountStatus.ACTIVE) await this.realtime.disconnectUser(id).catch(() => undefined);
      return this.userDetails(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email или телефон уже используется');
      }
      throw error;
    }
  }

  private async deletionScope(db: Prisma.TransactionClient, id: string) {
    const user = await db.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true, role: true, status: true, profile: { select: { avatarKey: true } } },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    const properties = await db.property.findMany({
      where: { ownerId: id },
      select: { id: true, photos: { select: { storageKey: true, previewKey: true, processingStatus: true } } },
    });
    const propertyIds = properties.map((property) => property.id);
    const requests = await db.exchangeRequest.findMany({
      where: { OR: [
        { requesterId: id }, { hostId: id },
        { targetPropertyId: { in: propertyIds } }, { offeredPropertyId: { in: propertyIds } },
      ] },
      select: { id: true, requesterId: true, hostId: true, status: true, type: true, totalPoints: true },
    });
    return { user, properties, propertyIds, requests, requestIds: requests.map((request) => request.id) };
  }

  async deletionPreview(actorId: string, id: string) {
    if (actorId === id) throw new BadRequestException('Нельзя удалить собственный аккаунт');
    const scope = await this.deletionScope(this.prisma, id);
    return {
      email: scope.user.email, propertyCount: scope.propertyIds.length,
      affectedRequestCount: scope.requestIds.length,
    };
  }

  async deleteUser(actorId: string, id: string, confirmation: string) {
    if (actorId === id) throw new BadRequestException('Нельзя удалить собственный аккаунт');
    const result = await this.prisma.$transaction(async (tx) => {
      const scope = await this.deletionScope(tx, id);
      if (confirmation !== (scope.user.email || id)) throw new BadRequestException('Подтверждение не совпадает с email или ID пользователя');
      if (scope.user.role === UserRole.ADMIN && scope.user.status === AccountStatus.ACTIVE) {
        const admins = await tx.user.count({ where: { role: UserRole.ADMIN, status: AccountStatus.ACTIVE, deletedAt: null } });
        if (admins < 2) throw new BadRequestException('Нельзя удалить последнего активного администратора');
      }
      for (const request of scope.requests) {
        if (request.requesterId !== id && request.status === ExchangeRequestStatus.CONFIRMED &&
            request.type === ExchangeType.POINTS && request.totalPoints) {
          const amount = BigInt(request.totalPoints);
          const released = await tx.pointAccount.updateMany({
            where: { userId: request.requesterId, reserved: { gte: amount } },
            data: { reserved: { decrement: amount }, available: { increment: amount }, version: { increment: 1 } },
          });
          if (released.count !== 1) throw new ConflictException('Не удалось вернуть резерв ДомБаллов другому участнику');
          await tx.pointTransaction.create({
            data: {
              account: { connect: { userId: request.requesterId } },
              type: PointTransactionType.RELEASE, amount,
              idempotencyKey: `admin-delete-release:${request.id}`, sourceType: 'EXCHANGE_REQUEST',
              sourceId: request.id, description: 'Возврат резерва после удаления участника или жилья',
            },
          });
        }
      }
      const affectedUsers = [...new Set(scope.requests.map((request) =>
        request.requesterId === id ? request.hostId : request.requesterId).filter((userId) => userId !== id))];
      if (affectedUsers.length) await tx.notification.createMany({
        data: affectedUsers.map((userId) => ({
          userId, type: 'EXCHANGE_STATUS', title: 'Заявка удалена администратором',
          body: 'Аккаунт участника или жильё удалены, заявка больше недоступна',
          link: '/account/exchanges',
        })),
      });
      const requestFilter = { in: scope.requestIds };
      await tx.exchangeMessage.deleteMany({ where: { OR: [
        { exchangeRequestId: requestFilter }, { senderId: id },
      ] } });
      await tx.exchangeReview.deleteMany({ where: { OR: [
        { exchangeRequestId: requestFilter }, { authorId: id }, { subjectId: id },
      ] } });
      await tx.exchangeRequest.deleteMany({ where: { id: requestFilter } });
      await tx.exchangeRequest.updateMany({ where: { cancelledById: id }, data: { cancelledById: null } });
      await tx.propertyModerationDecision.deleteMany({ where: { moderatorId: id } });
      await tx.pointTransaction.updateMany({ where: { sourceType: 'ADMIN_USER', sourceId: id }, data: { sourceId: null } });
      const account = await tx.pointAccount.findUnique({ where: { userId: id }, select: { id: true } });
      if (account) await tx.pointTransaction.deleteMany({ where: { accountId: account.id } });
      await tx.property.deleteMany({ where: { ownerId: id } });
      await tx.user.delete({ where: { id } });
      return scope;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 });
    await this.realtime.disconnectUser(id).catch(() => undefined);
    for (const userId of new Set(result.requests.map((request) =>
      request.requesterId === id ? request.hostId : request.requesterId).filter((userId) => userId !== id))) {
      this.realtime.requestNotificationsRefresh(userId);
    }
    const objects: { bucket: string; key: string }[] = [];
    if (result.user.profile?.avatarKey) objects.push({ bucket: this.files.publicBucket, key: result.user.profile.avatarKey });
    for (const property of result.properties) {
      for (const photo of property.photos) {
        objects.push({
          bucket: photo.processingStatus === FileProcessingStatus.READY ? this.files.publicBucket : this.files.privateBucket,
          key: photo.storageKey,
        });
        if (photo.previewKey) objects.push({ bucket: this.files.publicBucket, key: photo.previewKey });
      }
    }
    let storageCleanupFailed = 0;
    for (let offset = 0; offset < objects.length; offset += 20) {
      const outcomes = await Promise.allSettled(objects.slice(offset, offset + 20).map(({ bucket, key }) => this.files.delete(bucket, key)));
      storageCleanupFailed += outcomes.filter((outcome) => outcome.status === 'rejected').length;
    }
    return {
      deleted: true, propertyCount: result.propertyIds.length, affectedRequestCount: result.requestIds.length,
      storageCleanupFailed,
    };
  }

  amenities() {
    return this.prisma.amenity.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async createAmenity(dto: CreateAmenityDto) {
    try {
      return await this.prisma.amenity.create({ data: {
        code: dto.code.trim(), name: dto.name.trim(), category: dto.category.trim(),
        sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive ?? true,
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Код удобства уже существует');
      }
      throw error;
    }
  }

  async updateAmenity(id: string, dto: UpdateAmenityDto) {
    if (!Object.keys(dto).length) throw new BadRequestException('Укажите изменения');
    try {
      return await this.prisma.amenity.update({ where: { id }, data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Удобство не найдено');
      }
      throw error;
    }
  }
}
