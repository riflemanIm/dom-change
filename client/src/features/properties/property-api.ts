import { authApi } from '@/features/auth/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type Amenity = { id: string; code: string; name: string; category: string };

export type PropertyDraftInput = {
  title: string;
  description: string;
  type: string;
  areaSqm: number;
  roomsCount: number;
  bedroomsCount: number;
  bedsCount: number;
  maxGuests: number;
  hasElevator: boolean;
  allowsChildren: boolean;
  allowsPets: boolean;
  acceptsPoints: boolean;
  acceptsDirect: boolean;
  pointsPerNight: number;
  minNights: number;
  maxNights: number;
  address: {
    country: string;
    region?: string;
    city: string;
    district?: string;
    street?: string;
    houseNumber?: string;
  };
  rule: {
    smokingAllowed: boolean;
    eventsAllowed: boolean;
    additionalRules?: string;
  };
  amenityIds: string[];
};

async function authorizedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let token = sessionStorage.getItem('accessToken');
  if (!token) token = await authApi.refresh();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw new Error(message || 'Не удалось сохранить объявление');
  }
  return body as T;
}

export const propertyApi = {
  async amenities() {
    const response = await fetch(`${API_URL}/amenities`);
    if (!response.ok) throw new Error('Не удалось загрузить удобства');
    return response.json() as Promise<Amenity[]>;
  },

  create(input: PropertyDraftInput) {
    return authorizedRequest<{ id: string; status: string }>('/properties', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  submit(id: string) {
    return authorizedRequest<{ id: string; status: string }>(`/properties/${id}/submit`, {
      method: 'POST',
    });
  },

  listMine() {
    return authorizedRequest<Array<{ id: string; title: string; status: string; updatedAt: string }>>('/properties/mine');
  },
};
