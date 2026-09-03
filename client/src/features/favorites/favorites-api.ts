import { authorizedRequest as requestWithAuth } from '@/features/auth/authorized-request';
import type { CatalogProperty } from '@/features/catalog/catalog-api';

export class FavoritesApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function authorizedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return requestWithAuth<T>(path, init, { fallbackMessage: 'Не удалось обновить избранное', ErrorType: FavoritesApiError });
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
