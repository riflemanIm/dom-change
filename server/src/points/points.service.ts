import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, PointTransactionType, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AdjustPointsDto } from './dto/adjust-points.dto';

@Injectable()
export class PointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async history(userId: string) {
    const account = await this.prisma.pointAccount.findUniqueOrThrow({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 100 } },
    });
    return {
      available: account.available.toString(),
      reserved: account.reserved.toString(),
      pending: account.pending.toString(),
      bonus: account.bonus.toString(),
      frozen: account.frozen.toString(),
      transactions: account.transactions.map((transaction) => ({ ...transaction, amount: transaction.amount.toString() })),
    };
  }

  async findUsers(query = '') {
    const search = query.trim().slice(0, 100);
    const users = await this.prisma.user.findMany({
      where: {
        status: { not: AccountStatus.DELETED },
        deletedAt: null,
        ...(search ? {
          OR: [
            { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { profile: { displayName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          ],
        } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        profile: { select: { displayName: true, avatarUrl: true } },
        pointAccount: { select: { available: true, reserved: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return users.map((user) => this.presentAdminUser(user));
  }

  async adjust(adminId: string, userId: string, dto: AdjustPointsDto) {
    const amount = BigInt(dto.amount);
    const reason = dto.reason.trim();
    if (reason.length < 5) throw new BadRequestException('Укажите причину не короче 5 символов');
    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.pointAccount.findUnique({ where: { userId }, select: { id: true } });
      if (!account) throw new NotFoundException('Пользователь или счёт ДомБаллов не найден');

      if (amount < 0n) {
        const changed = await tx.pointAccount.updateMany({
          where: { id: account.id, available: { gte: -amount } },
          data: { available: { increment: amount }, version: { increment: 1 } },
        });
        if (changed.count !== 1) throw new BadRequestException('Недостаточно доступных ДомБаллов для списания');
      } else {
        await tx.pointAccount.update({
          where: { id: account.id },
          data: { available: { increment: amount }, version: { increment: 1 } },
        });
      }

      await tx.pointTransaction.create({
        data: {
          accountId: account.id,
          type: PointTransactionType.ADMIN_ADJUSTMENT,
          amount,
          idempotencyKey: `admin-adjustment:${randomUUID()}`,
          sourceType: 'ADMIN_USER',
          sourceId: adminId,
          description: reason,
        },
      });
      const notification = await tx.notification.create({
        data: {
          userId,
          type: 'POINTS_ADMIN_ADJUSTMENT',
          title: amount > 0n ? 'Начислены ДомБаллы' : 'Списаны ДомБаллы',
          body: `${amount > 0n ? '+' : ''}${amount.toString()} ДомБаллов · ${reason}`,
          link: '/account/points',
        },
      });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          profile: { select: { displayName: true, avatarUrl: true } },
          pointAccount: { select: { available: true, reserved: true } },
        },
      });
      return { user: this.presentAdminUser(user), notification };
    });
    this.realtime.emitNotification(userId, result.notification);
    return result.user;
  }

  private presentAdminUser<T extends { pointAccount: { available: bigint; reserved: bigint } | null }>(user: T) {
    return {
      ...user,
      pointAccount: user.pointAccount ? {
        available: user.pointAccount.available.toString(),
        reserved: user.pointAccount.reserved.toString(),
      } : null,
    };
  }
}
