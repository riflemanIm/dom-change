import { authApi } from '@/features/auth/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export type NotificationItem = { id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string };
export type NotificationsResponse = { items: NotificationItem[]; unread: number };

async function request<T>(path: string, init?: RequestInit) {
  let token = sessionStorage.getItem('accessToken');
  if (!token) token = await authApi.refresh();
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Не удалось загрузить уведомления');
  return (response.status === 204 ? null : await response.json()) as T;
}

export const notificationsApi = {
  list: () => request<NotificationsResponse>('/notifications'),
  read: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: () => request<{ count: number }>('/notifications/read-all', { method: 'PATCH' }),
};
