import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class ExchangeMessagesService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  async list(userId: string, exchangeRequestId: string) {
    await this.participant(exchangeRequestId, userId);
    return this.prisma.exchangeMessage.findMany({
      where: { exchangeRequestId },
      include: { sender: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async create(userId: string, exchangeRequestId: string, rawBody: string) {
    const request = await this.participant(exchangeRequestId, userId);
    const body = rawBody.trim();
    if (!body || body.length > 4000) throw new UnprocessableEntityException('Сообщение должно содержать от 1 до 4000 символов');
    const recipientId = request.requesterId === userId ? request.hostId : request.requesterId;
    const direction = recipientId === request.requesterId ? 'outgoing' : 'incoming';
    const recipientViewingChat = await this.realtime.isUserViewingExchange(recipientId, exchangeRequestId);
    const result = await this.prisma.$transaction(async (tx) => {
      const message = await tx.exchangeMessage.create({
        data: { exchangeRequestId, senderId: userId, body },
        include: { sender: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
      });
      const notification = recipientViewingChat ? null : await tx.notification.create({
        data: { userId: recipientId, type: 'EXCHANGE_MESSAGE', title: 'Новое сообщение в чате', body: body.slice(0, 160), link: `/account/exchanges?direction=${direction}&chat=${exchangeRequestId}` },
      });
      return { message, notification };
    });
    this.realtime.emitExchangeMessage(exchangeRequestId, result.message);
    if (result.notification) this.realtime.emitNotification(recipientId, result.notification);
    return result.message;
  }

  async markRead(userId: string, exchangeRequestId: string) {
    await this.participant(exchangeRequestId, userId);
    const readAt = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const messages = await tx.exchangeMessage.updateMany({
        where: { exchangeRequestId, senderId: { not: userId }, readAt: null },
        data: { readAt },
      });
      const notifications = await tx.notification.updateMany({
        where: { userId, type: 'EXCHANGE_MESSAGE', link: { contains: `chat=${exchangeRequestId}` }, readAt: null },
        data: { readAt },
      });
      return { messages, notifications };
    });
    const payload = { exchangeRequestId, readerId: userId, readAt: readAt.toISOString() };
    if (result.messages.count > 0) this.realtime.emitExchangeRead(exchangeRequestId, payload);
    if (result.notifications.count > 0) this.realtime.requestNotificationsRefresh(userId);
    return { ...payload, count: result.messages.count };
  }

  async participant(id: string, userId: string) {
    const request = await this.prisma.exchangeRequest.findFirst({ where: { id, OR: [{ requesterId: userId }, { hostId: userId }] } });
    if (!request) throw new NotFoundException('Заявка не найдена');
    return request;
  }
}
