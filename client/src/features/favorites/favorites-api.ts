import { authApi } from '@/features/auth/auth-api';
import type { CatalogProperty } from '@/features/catalog/catalog-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class FavoritesApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function authorizedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let token = sessionStorage.getItem('accessToken');
  if (!token) token = await authApi.refresh();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw new FavoritesApiError(message || 'Не удалось обновить избранное', response.status);
  }
  return body as T;
}

let favoriteIdsPromise: Promise<string[]> | null = null;

export const favoritesApi = {
  list() {
    return authorizedRequest<CatalogProperty[]>('/favorites');
  },

  ids() {
    favoriteIdsPromise ??= authorizedRequest<string[]>('/favorites/ids').catch((error) => {
      favoriteIdsPromise = null;
      throw error;
    });
    return favoriteIdsPromise;
  },

  async add(propertyId: string) {
    const result = await authorizedRequest<{ favorite: boolean }>(`/favorites/${propertyId}`, { method: 'PUT' });
    favoriteIdsPromise = null;
    return result;
  },

  async remove(propertyId: string) {
    await authorizedRequest<void>(`/favorites/${propertyId}`, { method: 'DELETE' });
    favoriteIdsPromise = null;
  },
};
