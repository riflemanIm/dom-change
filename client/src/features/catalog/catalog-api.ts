const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type CatalogProperty = {
  id: string;
  slug: string;
  title: string;
  bedroomsCount: number;
  maxGuests: number;
  pointsPerNight: number;
  address: {
    city: string;
    district: string | null;
  } | null;
  photos: Array<{
    id: string;
    isPrimary: boolean;
    sortOrder: number;
    previewUrl: string | null;
    url: string;
  }>;
};

export type CatalogResponse = {
  items: CatalogProperty[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export async function getCatalog(params: URLSearchParams) {
  const response = await fetch(`${API_URL}/properties?${params}`, { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw new Error(message || 'Не удалось загрузить каталог');
  }
  return response.json() as Promise<CatalogResponse>;
}
