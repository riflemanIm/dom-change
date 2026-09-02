import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ExchangeRequestStatus, ExchangeType, PropertyStatus, UserRole } from '@prisma/client';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

describe('Exchange realtime gateway integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let config: ConfigService;
  let realtimeUrl: string;
  let requesterId: string;
  let hostId: string;
  let outsiderId: string;
  let exchangeRequestId: string;
  let requesterToken: string;
  let hostToken: string;
  let outsiderToken: string;
  const sockets = new Set<Socket>();
  const runId = crypto.randomUUID();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    config = app.get(ConfigService);
    const address = app.getHttpServer().address() as AddressInfo;
    realtimeUrl = `http://127.0.0.1:${address.port}/realtime`;

    await cleanupStaleUsers();
    const [requester, host, outsider] = await Promise.all([
      createUser(`socket-requester-${runId}@example.test`, 'Socket Requester'),
      createUser(`socket-host-${runId}@example.test`, 'Socket Host'),
      createUser(`socket-outsider-${runId}@example.test`, 'Socket Outsider'),
    ]);
    requesterId = requester.id;
    hostId = host.id;
    outsiderId = outsider.id;
    const property = await prisma.property.create({
      data: { ownerId: hostId, slug: `socket-home-${runId}`, title: 'Дом для Socket.IO теста', status: PropertyStatus.PUBLISHED },
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
    [requesterToken, hostToken, outsiderToken] = await Promise.all([
      createSessionToken(requesterId),
      createSessionToken(hostId),
      createSessionToken(outsiderId),
    ]);
  }, 30_000);

  afterEach(() => {
    for (const socket of sockets) socket.disconnect();
    sockets.clear();
  });

  afterAll(async () => {
    try {
      for (const socket of sockets) socket.disconnect();
      if (prisma) await cleanupUsers([requesterId, hostId, outsiderId].filter(Boolean));
    } finally {
      if (app) await app.close();
    }
  });

  it('rejects a connection without a valid access token', async () => {
    const socket = client('invalid-token');
    const error = await onceConnectError(socket);
    expect(error.message).toBe('Необходима повторная авторизация');
  });

  it('joins participants, streams typing/messages and acknowledges reads', async () => {
    const requester = client(requesterToken);
    const host = client(hostToken);
    await Promise.all([onceConnected(requester), onceConnected(host)]);

    const requesterJoin = await emitAck<{ ok: true; peerUserId: string; peerOnline: boolean }>(requester, 'exchange:join', { exchangeRequestId });
    const hostJoin = await emitAck<{ ok: true; peerUserId: string; peerOnline: boolean }>(host, 'exchange:join', { exchangeRequestId });
    expect(requesterJoin).toMatchObject({ ok: true, peerUserId: hostId, peerOnline: true });
    expect(hostJoin).toMatchObject({ ok: true, peerUserId: requesterId, peerOnline: true });
    await expect(emitAck(requester, 'exchange:send', { exchangeRequestId, body: '   ' })).rejects.toThrow('от 1 до 4000 символов');

    const typingPromise = onceEvent<{ exchangeRequestId: string; userId: string; typing: boolean }>(host, 'exchange:typing');
    await emitAck(requester, 'exchange:typing', { exchangeRequestId, typing: true });
    await expect(typingPromise).resolves.toMatchObject({ exchangeRequestId, userId: requesterId, typing: true });

    const incomingPromise = onceEvent<{ id: string; body: string; sender: { id: string } }>(host, 'exchange:message');
    const sent = await emitAck<{ id: string; body: string }>(requester, 'exchange:send', { exchangeRequestId, body: 'Сообщение через реальный Socket.IO' });
    const incoming = await incomingPromise;
    expect(incoming).toMatchObject({ id: sent.id, body: sent.body, sender: { id: requesterId } });

    const readPromise = onceEvent<{ exchangeRequestId: string; readerId: string; readAt: string }>(requester, 'exchange:read');
    const receipt = await emitAck<{ count: number; readerId: string }>(host, 'exchange:read', { exchangeRequestId });
    expect(receipt).toMatchObject({ count: 1, readerId: hostId });
    await expect(readPromise).resolves.toMatchObject({ exchangeRequestId, readerId: hostId });
  });

  it('prevents an authenticated outsider from entering an exchange room', async () => {
    const outsider = client(outsiderToken);
    await onceConnected(outsider);
    await expect(emitAck(outsider, 'exchange:join', { exchangeRequestId })).rejects.toThrow('Заявка не найдена');
    await expect(emitAck(outsider, 'exchange:typing', { exchangeRequestId, typing: true })).rejects.toThrow('Сначала откройте чат заявки');
  });

  it('allows a participant to reconnect and rejoin the exchange room', async () => {
    const requester = client(requesterToken);
    const firstHost = client(hostToken);
    await Promise.all([onceConnected(requester), onceConnected(firstHost)]);
    await Promise.all([
      emitAck(requester, 'exchange:join', { exchangeRequestId }),
      emitAck(firstHost, 'exchange:join', { exchangeRequestId }),
    ]);
    const offlinePresence = onceEvent<{ userId: string; online: boolean }>(requester, 'exchange:presence');
    firstHost.disconnect();
    sockets.delete(firstHost);
    await expect(offlinePresence).resolves.toMatchObject({ userId: hostId, online: false });

    const reconnected = client(hostToken);
    await onceConnected(reconnected);
    const joined = await emitAck<{ ok: true; messages: unknown[] }>(reconnected, 'exchange:join', { exchangeRequestId });
    expect(joined.ok).toBe(true);
    expect(Array.isArray(joined.messages)).toBe(true);
  });

  function client(token: string) {
    const socket = io(realtimeUrl, {
      auth: { token },
      autoConnect: false,
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });
    sockets.add(socket);
    socket.connect();
    return socket;
  }

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

  async function createSessionToken(userId: string) {
    const session = await prisma.userSession.create({
      data: { userId, refreshTokenHash: 'integration-test', expiresAt: new Date(Date.now() + 60_000) },
    });
    return jwt.signAsync(
      { sub: userId, sessionId: session.id, type: 'access' },
      { secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: '1m' },
    );
  }

  async function cleanupStaleUsers() {
    const users = await prisma.user.findMany({
      where: { email: { startsWith: 'socket-' }, AND: { email: { endsWith: '@example.test' } } },
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

function onceConnected(socket: Socket) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connection timeout')), 3_000);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
  });
}

function onceConnectError(socket: Socket) {
  return new Promise<Error>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket auth timeout')), 3_000);
    socket.once('connect_error', (error) => { clearTimeout(timer); resolve(error); });
  });
}

function onceEvent<T>(socket: Socket, event: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Socket event timeout: ${event}`)), 3_000);
    socket.once(event, (payload: T) => { clearTimeout(timer); resolve(payload); });
  });
}

function emitAck<T = unknown>(socket: Socket, event: string, payload: unknown) {
  return new Promise<T>((resolve, reject) => {
    socket.timeout(3_000).emit(event, payload, (error: Error | null, response: T & { status?: string; message?: string }) => {
      if (error) reject(error);
      else if (response?.status === 'error') reject(new Error(response.message ?? 'Socket request failed'));
      else resolve(response);
    });
  });
}

function dateFromToday(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}
