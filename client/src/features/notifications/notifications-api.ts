import { authorizedRequest } from '@/features/auth/authorized-request';
export type NotificationItem = { id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string };
export type NotificationsResponse = { items: NotificationItem[]; unread: number };

async function request<T>(path: string, init?: RequestInit) {
  return authorizedRequest<T>(path, init, { fallbackMessage: 'Не удалось загрузить уведомления' });
}

export const notificationsApi = {
  list: () => request<NotificationsResponse>('/notifications'),
  read: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: () => request<{ count: number }>('/notifications/read-all', { method: 'PATCH' }),
};
