import { authorizedRequest as requestWithAuth } from '@/features/auth/authorized-request';

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
  return requestWithAuth<T>(path, init, { fallbackMessage: 'Не удалось сохранить поиск', ErrorType: SavedSearchApiError });
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
