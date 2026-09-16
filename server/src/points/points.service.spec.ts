import { BadRequestException } from '@nestjs/common';
import { PointTransactionType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PointsService } from './points.service';

describe('PointsService admin adjustments', () => {
  const user = {
    id: 'user-id',
    email: 'user@example.test',
    role: 'USER',
    status: 'ACTIVE',
    profile: { displayName: 'Test User', avatarUrl: null },
    pointAccount: { available: 1250n, reserved: 0n },
  };

  function setup(updateCount = 1) {
    const notification = { id: 'notification-id', userId: user.id };
    const tx = {
      pointAccount: {
        findUnique: jest.fn().mockResolvedValue({ id: 'account-id' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
      },
      pointTransaction: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue(notification) },
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue(user) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    } as unknown as PrismaService;
    const realtime = { emitNotification: jest.fn() } as unknown as RealtimeService;
    return { service: new PointsService(prisma, realtime), tx, realtime };
  }

  it('credits points and records the administrator adjustment', async () => {
    const { service, tx, realtime } = setup();

    const result = await service.adjust('admin-id', user.id, { amount: 250, reason: 'Тестовый бонус' });

    expect(tx.pointAccount.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { available: { increment: 250n }, version: { increment: 1 } },
    }));
    expect(tx.pointTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: PointTransactionType.ADMIN_ADJUSTMENT,
      amount: 250n,
      sourceId: 'admin-id',
      description: 'Тестовый бонус',
    }) });
    expect(realtime.emitNotification).toHaveBeenCalledWith(user.id, expect.objectContaining({ id: 'notification-id' }));
    expect(result.pointAccount?.available).toBe('1250');
  });

  it('debits points with an atomic non-negative balance condition', async () => {
    const { service, tx } = setup();

    await service.adjust('admin-id', user.id, { amount: -100, reason: 'Тестовое списание' });

    expect(tx.pointAccount.updateMany).toHaveBeenCalledWith({
      where: { id: 'account-id', available: { gte: 100n } },
      data: { available: { increment: -100n }, version: { increment: 1 } },
    });
  });

  it('does not record or notify an adjustment when points are insufficient', async () => {
    const { service, tx, realtime } = setup(0);

    await expect(service.adjust('admin-id', user.id, { amount: -2000, reason: 'Тестовое списание' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.pointTransaction.create).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
    expect(realtime.emitNotification).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only reason before opening a transaction', async () => {
    const { service, tx } = setup();

    await expect(service.adjust('admin-id', user.id, { amount: 100, reason: '     ' }))
      .rejects.toThrow('Укажите причину не короче 5 символов');
    expect(tx.pointAccount.findUnique).not.toHaveBeenCalled();
  });
});
