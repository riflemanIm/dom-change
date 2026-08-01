import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const [items, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread };
  }

  create(userId: string, type: string, title: string, body: string, link?: string) {
    return this.prisma.notification.create({ data: { userId, type, title, body, link } });
  }

  async read(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
    if (!updated.count) throw new NotFoundException('Уведомление не найдено');
  }

  readAll(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}
