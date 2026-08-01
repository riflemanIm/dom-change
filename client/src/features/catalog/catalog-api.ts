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
  owner?: {
    profile: {
      displayName: string;
      avatarUrl: string | null;
      hostRating: number | string | null;
    } | null;
  };
};

export type CatalogResponse = {
  items: CatalogProperty[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type CatalogAmenity = { id: string; name: string; category: string };

export type PropertyDetail = CatalogProperty & {
  description: string;
  type: string;
  areaSqm: number | null;
  roomsCount: number | null;
  bedsCount: number;
  allowsChildren: boolean;
  allowsPets: boolean;
  acceptsPoints: boolean;
  acceptsDirect: boolean;
  minNights: number;
  maxNights: number | null;
  amenities: Array<{ amenity: { id: string; name: string; category: string } }>;
  availability: Array<{
    id: string;
    startsOn: string;
    endsOn: string;
    type: string;
    minNights: number;
    maxNights: number | null;
    pointsPerNight: number;
    maxGuests: number;
  }>;
  owner: {
    createdAt: string;
    trustLevel: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    profile: {
      displayName: string;
      avatarUrl: string | null;
      description: string | null;
      completedExchanges: number;
      hostRating: number;
    } | null;
  };
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

export async function getCatalogAmenities() {
  const response = await fetch(`${API_URL}/amenities`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить список удобств');
  return response.json() as Promise<CatalogAmenity[]>;
}

export async function getCatalogLocations() {
  const response = await fetch(`${API_URL}/properties/locations`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить подсказки мест');
  return response.json() as Promise<string[]>;
}

export async function getProperty(slug: string) {
  const response = await fetch(`${API_URL}/properties/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Не удалось загрузить жильё');
  return response.json() as Promise<PropertyDetail>;
}
