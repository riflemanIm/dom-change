import { ExchangeRequestStatus, ExchangeType, FileProcessingStatus, PointTransactionType, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { PointRulesService } from '../database/point-rules.service';
import { PrismaService } from '../database/prisma.service';
import { FilesService } from '../files/files.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AdminService } from './admin.service';

describe('Admin users integration', () => {
  const prisma = new PrismaService();
  const files = {
    publicBucket: 'test-public', privateBucket: 'test-private',
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as FilesService;
  const realtime = { disconnectUser: jest.fn().mockResolvedValue(undefined), requestNotificationsRefresh: jest.fn() } as unknown as RealtimeService;
  const service = new AdminService(prisma, { amount: jest.fn() } as unknown as PointRulesService, files, realtime);
  const runId = randomUUID();
  let actorId: string;
  let targetId: string;
  let survivorId: string;
  let propertyId: string;
  let requestId: string;
  let targetEmail: string;

  beforeAll(async () => {
    await prisma.$connect();
    const stale = await prisma.user.findMany({
      where: { email: { startsWith: 'admin-delete-' } },
      select: { id: true, pointAccount: { select: { id: true } } },
    });
    await prisma.pointTransaction.deleteMany({ where: { accountId: { in: stale.flatMap((user) => user.pointAccount ? [user.pointAccount.id] : []) } } });
    await prisma.user.deleteMany({ where: { id: { in: stale.map((user) => user.id) } } });
    const actor = await prisma.user.create({
      data: { email: `admin-delete-actor-${runId}@example.test`, passwordHash: 'test', role: UserRole.ADMIN,
        profile: { create: { displayName: 'Admin' } } },
    });
    const target = await prisma.user.create({
      data: { email: `admin-delete-target-${runId}@example.test`, passwordHash: 'test',
        profile: { create: { displayName: 'Target', avatarKey: `integration/${runId}/avatar.webp` } },
        pointAccount: { create: { available: 5, transactions: { create: {
          type: PointTransactionType.BONUS, amount: 5, sourceType: 'TEST',
          idempotencyKey: `admin-delete-test-${runId}`,
        } } } },
      },
    });
    const survivor = await prisma.user.create({
      data: { email: `admin-delete-survivor-${runId}@example.test`, passwordHash: 'test',
        profile: { create: { displayName: 'Survivor' } },
        pointAccount: { create: { available: 80, reserved: 20 } },
      },
    });
    actorId = actor.id; targetId = target.id; survivorId = survivor.id; targetEmail = target.email!;
    const property = await prisma.property.create({
      data: { ownerId: targetId, slug: `admin-delete-${runId}`, title: 'Test home',
        photos: { create: { storageKey: `integration/${runId}/photo.webp`, mimeType: 'image/webp',
          sizeBytes: 100, processingStatus: FileProcessingStatus.READY,
          previewKey: `integration/${runId}/preview.webp` } } },
    });
    propertyId = property.id;
    const request = await prisma.exchangeRequest.create({
      data: { requesterId: survivorId, hostId: targetId, targetPropertyId: propertyId,
        type: ExchangeType.POINTS, status: ExchangeRequestStatus.CONFIRMED,
        startsOn: new Date('2027-01-01'), endsOn: new Date('2027-01-03'), guests: 1, totalPoints: 20 },
    });
    requestId = request.id;
    await prisma.exchangeMessage.create({ data: { exchangeRequestId: requestId, senderId: survivorId, body: 'Message' } });
    await prisma.exchangeReview.create({ data: { exchangeRequestId: requestId, authorId: survivorId,
      subjectId: targetId, rating: 5, cleanlinessRating: 5, communicationRating: 5, comment: 'Review' } });
  });

  afterAll(async () => {
    try {
      if (requestId) await prisma.exchangeRequest.deleteMany({ where: { id: requestId } });
      if (propertyId) await prisma.property.deleteMany({ where: { id: propertyId } });
      const users = [actorId, targetId, survivorId].filter(Boolean);
      const accounts = await prisma.pointAccount.findMany({ where: { userId: { in: users } }, select: { id: true } });
      await prisma.pointTransaction.deleteMany({ where: { accountId: { in: accounts.map((account) => account.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    } finally { await prisma.$disconnect(); }
  });

  it('requires exact confirmation and preserves data on rejection', async () => {
    await expect(service.deleteUser(actorId, targetId, 'wrong')).rejects.toThrow('Подтверждение');
    expect(await prisma.user.findUnique({ where: { id: targetId } })).not.toBeNull();
    await expect(service.deleteUser(targetId, targetId, targetEmail)).rejects.toThrow('собственный');
  });

  it('edits account and profile fields, hashes a new password, and protects the current admin', async () => {
    await expect(service.updateUser(actorId, actorId, { role: UserRole.USER })).rejects.toThrow('собственные права');
    const updated = await service.updateUser(actorId, targetId, {
      displayName: 'New Target', city: 'Москва', phone: '+79990000000', interests: ['горы'],
      password: 'NewPassword123', emailVerified: true,
    });
    expect(updated.profile).toMatchObject({ displayName: 'New Target', city: 'Москва', interests: ['горы'] });
    expect(updated.phone).toBe('+79990000000');
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: targetId }, select: { passwordHash: true } });
    expect(await argon2.verify(saved.passwordHash, 'NewPassword123')).toBe(true);
  });

  it('deletes related records and releases a surviving guest’s reserved points', async () => {
    expect(await service.deletionPreview(actorId, targetId)).toMatchObject({ propertyCount: 1, affectedRequestCount: 1 });
    const result = await service.deleteUser(actorId, targetId, targetEmail);
    expect(result).toMatchObject({ deleted: true, propertyCount: 1, affectedRequestCount: 1, storageCleanupFailed: 0 });
    expect(await prisma.user.findUnique({ where: { id: targetId } })).toBeNull();
    expect(await prisma.property.findUnique({ where: { id: propertyId } })).toBeNull();
    expect(await prisma.exchangeRequest.findUnique({ where: { id: requestId } })).toBeNull();
    expect(await prisma.exchangeMessage.count({ where: { exchangeRequestId: requestId } })).toBe(0);
    expect(await prisma.exchangeReview.count({ where: { exchangeRequestId: requestId } })).toBe(0);
    expect(await prisma.pointTransaction.count({ where: { idempotencyKey: `admin-delete-test-${runId}` } })).toBe(0);
    const account = await prisma.pointAccount.findUniqueOrThrow({ where: { userId: survivorId } });
    expect(account.available).toBe(100n);
    expect(account.reserved).toBe(0n);
    expect(await prisma.pointTransaction.count({ where: { idempotencyKey: `admin-delete-release:${requestId}` } })).toBe(1);
    expect(files.delete).toHaveBeenCalledTimes(3);
    expect(realtime.disconnectUser).toHaveBeenCalledWith(targetId);
    expect(realtime.requestNotificationsRefresh).toHaveBeenCalledWith(survivorId);
    expect(await prisma.notification.count({ where: { userId: survivorId, title: 'Заявка удалена администратором' } })).toBe(1);
  });
});
