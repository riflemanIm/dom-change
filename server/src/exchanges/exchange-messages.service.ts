import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExchangeMessagesService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

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
    const message = await this.prisma.exchangeMessage.create({
      data: { exchangeRequestId, senderId: userId, body },
      include: { sender: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
    });
    const recipientId = request.requesterId === userId ? request.hostId : request.requesterId;
    await this.notifications.create(recipientId, 'EXCHANGE_MESSAGE', 'Новое сообщение', body.slice(0, 160), `/account/exchanges?chat=${exchangeRequestId}`);
    return message;
  }

  private async participant(id: string, userId: string) {
    const request = await this.prisma.exchangeRequest.findFirst({ where: { id, OR: [{ requesterId: userId }, { hostId: userId }] } });
    if (!request) throw new NotFoundException('Заявка не найдена');
    return request;
  }
}
