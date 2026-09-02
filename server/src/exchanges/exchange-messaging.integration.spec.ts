import { ExchangeRequestStatus, ExchangeType, PropertyStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ExchangeMessagesService } from './exchange-messages.service';

describe('Exchange messaging integration', () => {
  const prisma = new PrismaService();
  const realtime = {
    emitExchangeMessage: jest.fn(),
    emitExchangeRead: jest.fn(),
    emitNotification: jest.fn(),
  } as unknown as RealtimeService;
  const messages = new ExchangeMessagesService(prisma, realtime);
  const testRun = randomUUID();
  let requesterId: string;
  let hostId: string;
  let outsiderId: string;
  let exchangeRequestId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await cleanupStaleIntegrationUsers();
    const [requester, host, outsider] = await Promise.all([
      createUser(`message-requester-${testRun}@example.test`, 'Message Requester'),
      createUser(`message-host-${testRun}@example.test`, 'Message Host'),
      createUser(`message-outsider-${testRun}@example.test`, 'Message Outsider'),
    ]);
    requesterId = requester.id;
    hostId = host.id;
    outsiderId = outsider.id;
    const property = await prisma.property.create({
      data: {
        ownerId: hostId,
        slug: `message-home-${testRun}`,
        title: 'Дом для проверки сообщений',
        status: PropertyStatus.PUBLISHED,
      },
    });
    const request = await prisma.exchangeRequest.create({
      data: {
        requesterId,
        hostId,
        targetPropertyId: property.id,
        type: ExchangeType.POINTS,
        status: ExchangeRequestStatus.CONFIRMED,
        startsOn: dateFromToday(10),
        endsOn: dateFromToday(13),
        guests: 2,
        pointsPerNightSnapshot: 100,
        totalPoints: 300,
      },
    });
    exchangeRequestId = request.id;
  });

  beforeEach(async () => {
    await prisma.exchangeMessage.deleteMany({ where: { exchangeRequestId } });
    await prisma.notification.deleteMany({ where: { userId: { in: [requesterId, hostId] } } });
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      await cleanupUsers([requesterId, hostId, outsiderId].filter(Boolean));
    } finally {
      await prisma.$disconnect();
    }
  });

  it('stores a message, notifies the recipient and emits it after commit', async () => {
    const message = await messages.create(requesterId, exchangeRequestId, '  Когда можно получить ключи?  ');

    expect(message.body).toBe('Когда можно получить ключи?');
    expect(message.sender.id).toBe(requesterId);
    const notification = await prisma.notification.findFirstOrThrow({ where: { userId: hostId, type: 'EXCHANGE_MESSAGE' } });
    expect(notification.body).toBe(message.body);
    expect(realtime.emitExchangeMessage).toHaveBeenCalledWith(exchangeRequestId, expect.objectContaining({ id: message.id }));
    expect(realtime.emitNotification).toHaveBeenCalledWith(hostId, expect.objectContaining({ id: notification.id }));
  });

  it('denies message history and sending to a non-participant', async () => {
    await expect(messages.list(outsiderId, exchangeRequestId)).rejects.toThrow('Заявка не найдена');
    await expect(messages.create(outsiderId, exchangeRequestId, 'Чужое сообщение')).rejects.toThrow('Заявка не найдена');
    expect(await prisma.exchangeMessage.count({ where: { exchangeRequestId } })).toBe(0);
    expect(realtime.emitExchangeMessage).not.toHaveBeenCalled();
  });

  it('rejects empty and oversized message bodies before writing', async () => {
    await expect(messages.create(requesterId, exchangeRequestId, '   ')).rejects.toThrow('от 1 до 4000 символов');
    await expect(messages.create(requesterId, exchangeRequestId, 'x'.repeat(4001))).rejects.toThrow('от 1 до 4000 символов');
    expect(await prisma.exchangeMessage.count({ where: { exchangeRequestId } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: hostId } })).toBe(0);
  });

  it('marks only incoming unread messages and emits an idempotent receipt', async () => {
    const requesterMessage = await messages.create(requesterId, exchangeRequestId, 'Сообщение хозяину');
    const hostMessage = await messages.create(hostId, exchangeRequestId, 'Ответ гостю');
    jest.clearAllMocks();

    const firstReceipt = await messages.markRead(hostId, exchangeRequestId);
    expect(firstReceipt.count).toBe(1);
    expect(realtime.emitExchangeRead).toHaveBeenCalledTimes(1);
    expect(realtime.emitExchangeRead).toHaveBeenCalledWith(exchangeRequestId, expect.objectContaining({ readerId: hostId }));

    const [readIncoming, ownMessage] = await Promise.all([
      prisma.exchangeMessage.findUniqueOrThrow({ where: { id: requesterMessage.id } }),
      prisma.exchangeMessage.findUniqueOrThrow({ where: { id: hostMessage.id } }),
    ]);
    expect(readIncoming.readAt).not.toBeNull();
    expect(ownMessage.readAt).toBeNull();

    const repeatedReceipt = await messages.markRead(hostId, exchangeRequestId);
    expect(repeatedReceipt.count).toBe(0);
    expect(realtime.emitExchangeRead).toHaveBeenCalledTimes(1);
  });

  async function createUser(email: string, displayName: string) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: 'integration-test',
        emailVerified: true,
        role: UserRole.USER,
        profile: { create: { displayName } },
        pointAccount: { create: {} },
      },
    });
  }

  async function cleanupStaleIntegrationUsers() {
    const users = await prisma.user.findMany({
      where: { email: { startsWith: 'message-' }, AND: { email: { endsWith: '@example.test' } } },
      select: { id: true },
    });
    await cleanupUsers(users.map(({ id }) => id));
  }

  async function cleanupUsers(userIds: string[]) {
    if (!userIds.length) return;
    await prisma.exchangeRequest.deleteMany({ where: { OR: [{ requesterId: { in: userIds } }, { hostId: { in: userIds } }] } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.property.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

function dateFromToday(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}
