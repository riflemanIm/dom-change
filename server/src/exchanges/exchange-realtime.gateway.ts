import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AccessTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ExchangeMessagesService } from './exchange-messages.service';

type AuthenticatedSocket = Socket & { data: { userId?: string; exchangeIds?: Set<string> } };

const socketCorsOrigin = (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
  const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS ?? process.env.APP_URL ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const isLocalDevelopment = process.env.NODE_ENV !== 'production'
    && Boolean(origin?.match(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/));
  if (!origin || allowedOrigins.has(origin) || isLocalDevelopment) callback(null, true);
  else callback(new Error(`WebSocket origin is not allowed: ${origin}`), false);
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: socketCorsOrigin, credentials: true },
  transports: ['websocket', 'polling'],
})
export class ExchangeRealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly messages: ExchangeMessagesService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
    server.use(async (client: AuthenticatedSocket, next) => {
      try {
        client.data.userId = await this.authenticate(client);
        next();
      } catch {
        next(new Error('Необходима повторная авторизация'));
      }
    });
  }

  async handleConnection(client: AuthenticatedSocket) {
    const userId = this.requireUser(client);
    client.data.exchangeIds = new Set();
    await client.join(`user:${userId}`);
    client.emit('realtime:ready', { userId });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data.userId;
    if (!userId) return;
    for (const exchangeRequestId of client.data.exchangeIds ?? []) {
      setTimeout(() => void this.broadcastPresence(exchangeRequestId, userId), 0);
    }
  }

  @SubscribeMessage('exchange:join')
  async joinExchange(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { exchangeRequestId?: string },
  ) {
    const userId = this.requireUser(client);
    const exchangeRequestId = this.requireUuid(payload?.exchangeRequestId);
    const messages = await this.messages.list(userId, exchangeRequestId);
    const request = await this.messages.participant(exchangeRequestId, userId);
    const peerUserId = request.requesterId === userId ? request.hostId : request.requesterId;
    client.data.exchangeIds?.add(exchangeRequestId);
    await client.join(`exchange:${exchangeRequestId}`);
    await this.broadcastPresence(exchangeRequestId, userId);
    return { ok: true, messages, peerUserId, peerOnline: await this.isUserOnline(peerUserId) };
  }

  @SubscribeMessage('exchange:leave')
  async leaveExchange(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { exchangeRequestId?: string },
  ) {
    const exchangeRequestId = this.requireUuid(payload?.exchangeRequestId);
    const userId = this.requireUser(client);
    client.data.exchangeIds?.delete(exchangeRequestId);
    await client.leave(`exchange:${exchangeRequestId}`);
    await this.broadcastPresence(exchangeRequestId, userId);
    return { ok: true };
  }

  @SubscribeMessage('exchange:typing')
  typing(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { exchangeRequestId?: string; typing?: boolean },
  ) {
    const userId = this.requireUser(client);
    const exchangeRequestId = this.requireJoinedExchange(client, payload?.exchangeRequestId);
    client.to(`exchange:${exchangeRequestId}`).emit('exchange:typing', {
      exchangeRequestId,
      userId,
      typing: payload?.typing === true,
    });
    return { ok: true };
  }

  @SubscribeMessage('exchange:read')
  readMessages(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { exchangeRequestId?: string },
  ) {
    const userId = this.requireUser(client);
    const exchangeRequestId = this.requireJoinedExchange(client, payload?.exchangeRequestId);
    return this.messages.markRead(userId, exchangeRequestId);
  }

  @SubscribeMessage('exchange:send')
  async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { exchangeRequestId?: string; body?: string },
  ) {
    const userId = this.requireUser(client);
    const exchangeRequestId = this.requireUuid(payload?.exchangeRequestId);
    const body = payload?.body?.trim() ?? '';
    if (!body || body.length > 4000) throw new WsException('Сообщение должно содержать от 1 до 4000 символов');
    return this.messages.create(userId, exchangeRequestId, body);
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    const authorization = client.handshake.headers.authorization;
    const token = typeof authToken === 'string'
      ? authToken
      : authorization?.startsWith('Bearer ')
        ? authorization.slice(7)
        : '';
    if (!token) throw new Error('Missing token');
    return token;
  }

  private async authenticate(client: Socket) {
    const token = this.extractToken(client);
    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
    if (payload.type !== 'access' || !payload.sub || !payload.sessionId) throw new Error('Invalid token');
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: 'ACTIVE', deletedAt: null },
      },
      select: { id: true },
    });
    if (!session) throw new Error('Session ended');
    return payload.sub;
  }

  private requireUser(client: AuthenticatedSocket) {
    if (!client.data.userId) throw new WsException('Нет авторизации');
    return client.data.userId;
  }

  private requireUuid(value?: string) {
    if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new WsException('Некорректный идентификатор заявки');
    }
    return value;
  }

  private requireJoinedExchange(client: AuthenticatedSocket, value?: string) {
    const exchangeRequestId = this.requireUuid(value);
    if (!client.data.exchangeIds?.has(exchangeRequestId)) throw new WsException('Сначала откройте чат заявки');
    return exchangeRequestId;
  }

  private async isUserOnline(userId: string) {
    return (await this.server.in(`user:${userId}`).fetchSockets()).length > 0;
  }

  private async broadcastPresence(exchangeRequestId: string, userId: string) {
    this.realtime.emitExchangePresence(exchangeRequestId, {
      exchangeRequestId,
      userId,
      online: await this.isUserOnline(userId),
    });
  }
}
