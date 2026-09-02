import {
  AvailabilityType,
  ExchangeRequestStatus,
  ExchangeType,
  PointTransactionType,
  PropertyStatus,
  PropertyType,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ExchangeReviewsService } from './exchange-reviews.service';
import { ExchangesService } from './exchanges.service';

describe('Exchange lifecycle integration', () => {
  const prisma = new PrismaService();
  const realtime = {
    emitNotification: jest.fn(),
    emitNotificationRead: jest.fn(),
    emitNotificationsReadAll: jest.fn(),
    requestNotificationsRefresh: jest.fn(),
  } as unknown as RealtimeService;
  const notifications = new NotificationsService(prisma, realtime);
  const exchanges = new ExchangesService(prisma, notifications, realtime);
  const reviews = new ExchangeReviewsService(prisma, realtime);
  const testRun = randomUUID();
  let requesterId: string;
  let hostId: string;
  let propertyId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await cleanupStaleIntegrationUsers();
    const [requester, host] = await Promise.all([
      createUser(`exchange-requester-${testRun}@example.test`, 'Exchange Requester', 1_000n),
      createUser(`exchange-host-${testRun}@example.test`, 'Exchange Host', 0n),
    ]);
    requesterId = requester.id;
    hostId = host.id;
    const property = await prisma.property.create({
      data: {
        ownerId: hostId,
        slug: `exchange-home-${testRun}`,
        title: 'Дом для integration-обмена',
        description: 'Опубликованное жильё для проверки полного жизненного цикла обмена.',
        type: PropertyType.HOUSE,
        maxGuests: 4,
        acceptsPoints: true,
        acceptsDirect: false,
        pointsPerNight: 100,
        status: PropertyStatus.PUBLISHED,
        address: { create: { country: 'Россия', city: 'Сочи' } },
        availability: {
          create: {
            startsOn: dateFromToday(10),
            endsOn: dateFromToday(90),
            type: AvailabilityType.POINTS,
            minNights: 1,
            maxNights: 30,
            pointsPerNight: 100,
            maxGuests: 4,
          },
        },
      },
    });
    propertyId = property.id;
  });

  beforeEach(async () => {
    await prisma.exchangeRequest.deleteMany({ where: { OR: [{ requesterId }, { hostId }] } });
    await prisma.notification.deleteMany({ where: { userId: { in: [requesterId, hostId] } } });
    const accounts = await prisma.pointAccount.findMany({ where: { userId: { in: [requesterId, hostId] } }, select: { id: true } });
    await prisma.pointTransaction.deleteMany({ where: { accountId: { in: accounts.map(({ id }) => id) } } });
    await prisma.pointAccount.update({ where: { userId: requesterId }, data: { available: 1_000n, reserved: 0n, version: 0 } });
    await prisma.pointAccount.update({ where: { userId: hostId }, data: { available: 0n, reserved: 0n, version: 0 } });
    await prisma.userProfile.updateMany({ where: { userId: { in: [requesterId, hostId] } }, data: { completedExchanges: 0, hostRating: null, guestRating: null } });
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      await cleanupUsers([requesterId, hostId].filter(Boolean));
    } finally {
      await prisma.$disconnect();
    }
  });

  it('reserves points on confirmation and releases them on cancellation', async () => {
    const request = await createPointsRequest(20);
    expect(request.totalPoints).toBe(300);
    expect(request.pointsPerNightSnapshot).toBe(100);

    await exchanges.preapprove(hostId, request.id);
    const confirmed = await exchanges.confirm(requesterId, request.id);
    expect(confirmed.status).toBe(ExchangeRequestStatus.CONFIRMED);
    await expectAccount(requesterId, 700n, 300n);

    const cancelled = await exchanges.cancelConfirmed(hostId, request.id, 'Изменились планы принимающей стороны');
    expect(cancelled.status).toBe(ExchangeRequestStatus.CANCELLED);
    expect(cancelled.cancelledById).toBe(hostId);
    await expectAccount(requesterId, 1_000n, 0n);

    const transactions = await transactionTypes(requesterId);
    expect(transactions).toEqual(expect.arrayContaining([PointTransactionType.RESERVE, PointTransactionType.RELEASE]));
    await expect(exchanges.cancelConfirmed(hostId, request.id, 'Повторная отмена')).rejects.toThrow('только подтверждённый обмен');
  });

  it('keeps a preapproved request unchanged when the balance is insufficient', async () => {
    const request = await createPointsRequest(30);
    await exchanges.preapprove(hostId, request.id);
    await prisma.pointAccount.update({ where: { userId: requesterId }, data: { available: 100n } });

    await expect(exchanges.confirm(requesterId, request.id)).rejects.toThrow('Недостаточно ДомБаллов');
    const unchanged = await prisma.exchangeRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(unchanged.status).toBe(ExchangeRequestStatus.PREAPPROVED);
    await expectAccount(requesterId, 100n, 0n);
    expect(await transactionTypes(requesterId)).toHaveLength(0);
  });

  it('settles points, updates profiles and accepts only one review per author', async () => {
    const request = await createPointsRequest(40);
    await exchanges.preapprove(hostId, request.id);
    await exchanges.confirm(requesterId, request.id);
    await prisma.exchangeRequest.update({
      where: { id: request.id },
      data: { startsOn: dateFromToday(-4), endsOn: dateFromToday(-1) },
    });

    const completed = await exchanges.complete(hostId, request.id);
    expect(completed.status).toBe(ExchangeRequestStatus.COMPLETED);
    await expectAccount(requesterId, 700n, 0n);
    await expectAccount(hostId, 300n, 0n);
    expect(await transactionTypes(requesterId)).toEqual(expect.arrayContaining([PointTransactionType.RESERVE, PointTransactionType.DEBIT]));
    expect(await transactionTypes(hostId)).toContain(PointTransactionType.HOST_CREDIT);

    const profiles = await prisma.userProfile.findMany({ where: { userId: { in: [requesterId, hostId] } } });
    expect(profiles.every(({ completedExchanges }) => completedExchanges === 1)).toBe(true);

    const reviewInput = { rating: 5, cleanlinessRating: 5, communicationRating: 4, comment: 'Прекрасный обмен и очень внимательный хозяин.' };
    const review = await reviews.create(requesterId, request.id, reviewInput);
    expect(review.subjectId).toBe(hostId);
    await expect(reviews.create(requesterId, request.id, reviewInput)).rejects.toThrow('Вы уже оставили отзыв');
    const hostProfile = await prisma.userProfile.findUniqueOrThrow({ where: { userId: hostId } });
    expect(hostProfile.hostRating?.toNumber()).toBe(5);
  });

  async function createPointsRequest(startOffset: number) {
    return exchanges.create(requesterId, {
      targetPropertyId: propertyId,
      type: ExchangeType.POINTS,
      startsOn: dateString(startOffset),
      endsOn: dateString(startOffset + 3),
      guests: 2,
      message: 'Integration test exchange request',
    });
  }

  async function createUser(email: string, displayName: string, available: bigint) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: 'integration-test',
        emailVerified: true,
        role: UserRole.USER,
        profile: { create: { displayName } },
        pointAccount: { create: { available } },
      },
    });
  }

  async function expectAccount(userId: string, available: bigint, reserved: bigint) {
    const account = await prisma.pointAccount.findUniqueOrThrow({ where: { userId } });
    expect(account).toMatchObject({ available, reserved });
  }

  async function transactionTypes(userId: string) {
    const transactions = await prisma.pointTransaction.findMany({ where: { account: { userId } }, orderBy: { createdAt: 'asc' } });
    return transactions.map(({ type }) => type);
  }

  async function cleanupStaleIntegrationUsers() {
    const users = await prisma.user.findMany({
      where: { email: { startsWith: 'exchange-' }, AND: { email: { endsWith: '@example.test' } } },
      select: { id: true },
    });
    await cleanupUsers(users.map(({ id }) => id));
  }

  async function cleanupUsers(userIds: string[]) {
    if (!userIds.length) return;
    await prisma.exchangeRequest.deleteMany({ where: { OR: [{ requesterId: { in: userIds } }, { hostId: { in: userIds } }] } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.property.deleteMany({ where: { ownerId: { in: userIds } } });
    const accounts = await prisma.pointAccount.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
    await prisma.pointTransaction.deleteMany({ where: { accountId: { in: accounts.map(({ id }) => id) } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

function dateFromToday(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function dateString(days: number) {
  return dateFromToday(days).toISOString().slice(0, 10);
}
