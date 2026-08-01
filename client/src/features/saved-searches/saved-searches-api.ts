import { authApi } from '@/features/auth/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export class SavedSearchApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function authorizedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let token = sessionStorage.getItem('accessToken');
  if (!token) token = await authApi.refresh();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw new SavedSearchApiError(message || 'Не удалось сохранить поиск', response.status);
  }
  return body as T;
}

export const savedSearchesApi = {
  list: () => authorizedRequest<SavedSearch[]>('/saved-searches'),
  create: (name: string, query: string) => authorizedRequest<SavedSearch>('/saved-searches', {
    method: 'POST', body: JSON.stringify({ name, query }),
  }),
  update: (id: string, input: { name?: string; notificationsEnabled?: boolean }) => authorizedRequest<SavedSearch>(`/saved-searches/${id}`, {
    method: 'PATCH', body: JSON.stringify(input),
  }),
  remove: (id: string) => authorizedRequest<void>(`/saved-searches/${id}`, { method: 'DELETE' }),
};
