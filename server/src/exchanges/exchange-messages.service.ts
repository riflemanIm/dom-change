import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ExchangeMessagesService {
  constructor(private readonly prisma: PrismaService) {}

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
    const recipientId = request.requesterId === userId ? request.hostId : request.requesterId;
    const direction = recipientId === request.requesterId ? 'outgoing' : 'incoming';
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.exchangeMessage.create({
        data: { exchangeRequestId, senderId: userId, body },
        include: { sender: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
      });
      await tx.notification.create({
        data: { userId: recipientId, type: 'EXCHANGE_MESSAGE', title: 'Новое сообщение', body: body.slice(0, 160), link: `/account/exchanges?direction=${direction}&chat=${exchangeRequestId}` },
      });
      return message;
    });
  }

  private async participant(id: string, userId: string) {
    const request = await this.prisma.exchangeRequest.findFirst({ where: { id, OR: [{ requesterId: userId }, { hostId: userId }] } });
    if (!request) throw new NotFoundException('Заявка не найдена');
    return request;
  }
}
