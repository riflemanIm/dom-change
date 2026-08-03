import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server?: Server;

  attach(server: Server) {
    this.server = server;
  }

  emitExchangeMessage(exchangeRequestId: string, message: unknown) {
    this.server?.to(`exchange:${exchangeRequestId}`).emit('exchange:message', message);
  }

  emitNotification(userId: string, notification: unknown) {
    this.server?.to(`user:${userId}`).emit('notification:new', notification);
  }

  emitNotificationRead(userId: string, notificationId: string) {
    this.server?.to(`user:${userId}`).emit('notification:read', { id: notificationId });
  }

  emitNotificationsReadAll(userId: string) {
    this.server?.to(`user:${userId}`).emit('notifications:read-all', { readAt: new Date().toISOString() });
  }

  requestNotificationsRefresh(userId: string) {
    this.server?.to(`user:${userId}`).emit('notifications:refresh');
  }
}
