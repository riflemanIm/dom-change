import { authorizedRequest as requestWithAuth } from '@/features/auth/authorized-request';

export type ModerationProperty = {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  areaSqm: number;
  roomsCount: number;
  bedroomsCount: number;
  bedsCount: number;
  maxGuests: number;
  pointsPerNight: number;
  updatedAt: string;
  address: {
    country: string;
    region: string | null;
    city: string;
    district: string | null;
    street: string | null;
    houseNumber: string | null;
  } | null;
  owner: {
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    profile: { displayName: string } | null;
  };
  photos: Array<{ id: string; url: string | null; previewUrl: string | null }>;
  moderationHistory: Array<{
    id: string;
    toStatus: string;
    comment: string | null;
    createdAt: string;
  }>;
};

type QueueResponse = {
  items: ModerationProperty[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

async function authorizedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return requestWithAuth<T>(path, init, { fallbackMessage: 'Не удалось выполнить действие модерации' });
}

export const moderationApi = {
  list(page = 1) {
    return authorizedRequest<QueueResponse>(`/moderation/properties?page=${page}&limit=20`);
  },

  decide(id: string, action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT', comment?: string) {
    return authorizedRequest<ModerationProperty>(`/moderation/properties/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ action, comment: comment?.trim() || undefined }),
    });
  },
};
