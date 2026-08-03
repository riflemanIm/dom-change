import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  async list(userId: string) {
    const [items, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread };
  }

  async create(userId: string, type: string, title: string, body: string, link?: string) {
    const notification = await this.prisma.notification.create({ data: { userId, type, title, body, link } });
    this.realtime.emitNotification(userId, notification);
    return notification;
  }

  async read(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    if (!updated.count) {
      const exists = await this.prisma.notification.count({ where: { id, userId } });
      if (!exists) throw new NotFoundException('Уведомление не найдено');
      return;
    }
    this.realtime.emitNotificationRead(userId, id);
  }

  async readAll(userId: string) {
    const result = await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    this.realtime.emitNotificationsReadAll(userId);
    return result;
  }
}
