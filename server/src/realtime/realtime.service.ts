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

  emitExchangeRead(exchangeRequestId: string, payload: unknown) {
    this.server?.to(`exchange:${exchangeRequestId}`).emit('exchange:read', payload);
  }

  emitExchangePresence(exchangeRequestId: string, payload: unknown) {
    this.server?.to(`exchange:${exchangeRequestId}`).emit('exchange:presence', payload);
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

  async isUserViewingExchange(userId: string, exchangeRequestId: string) {
    if (!this.server) return false;
    const sockets = await this.server.in(`exchange-active:${exchangeRequestId}`).fetchSockets();
    return sockets.some((socket) => socket.data.userId === userId);
  }

  async disconnectUser(userId: string) {
    await this.server?.in(`user:${userId}`).disconnectSockets(true);
  }
}
