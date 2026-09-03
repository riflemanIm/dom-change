import { authorizedRequest } from '@/features/auth/authorized-request';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type Amenity = { id: string; code: string; name: string; category: string };
export type PropertyPhoto = {
  id: string;
  sortOrder: number;
  isPrimary: boolean;
  processingStatus: string;
  width: number | null;
  height: number | null;
  url: string | null;
  previewUrl: string | null;
};
export type AvailabilityPeriod = {
  id: string;
  startsOn: string;
  endsOn: string;
  type: 'UNAVAILABLE' | 'POINTS' | 'DIRECT' | 'BOTH' | 'ON_REQUEST';
  minNights: number;
  maxNights: number | null;
  pointsPerNight: number;
  maxGuests: number;
  isFlexible: boolean;
  comment: string | null;
};

export type AvailabilityInput = {
  startsOn: string;
  endsOn: string;
  type: AvailabilityPeriod['type'];
  minNights: number;
  maxNights?: number;
  pointsPerNight: number;
  maxGuests: number;
  isFlexible: boolean;
  comment?: string;
};

export type AvailabilityUpdateInput = Omit<AvailabilityInput, 'maxNights' | 'comment'> & {
  maxNights: number | null;
  comment: string | null;
};

export type OwnedPropertySummary = {
  id: string;
  title: string;
  description: string;
  status: string;
  updatedAt: string;
  bedroomsCount: number;
  maxGuests: number;
  pointsPerNight: number;
  acceptsPoints: boolean;
  acceptsDirect: boolean;
  address: { country: string; city: string; district: string | null } | null;
  photos: PropertyPhoto[];
  availability: AvailabilityPeriod[];
  moderationHistory: Array<{
    toStatus: string;
    comment: string | null;
    createdAt: string;
  }>;
};

export type OwnedProperty = OwnedPropertySummary & Omit<PropertyDraftInput, 'areaSqm' | 'roomsCount' | 'maxNights' | 'address' | 'rule' | 'amenityIds'> & {
  areaSqm: number | null;
  roomsCount: number | null;
  maxNights: number | null;
  address: {
    country: string;
    region: string | null;
    city: string;
    district: string | null;
    street: string | null;
    houseNumber: string | null;
  } | null;
  rule: {
    smokingAllowed: boolean;
    eventsAllowed: boolean;
    additionalRules: string | null;
  } | null;
  amenities: Array<{ amenityId: string }>;
};

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

  getMine(id: string) {
    return authorizedRequest<OwnedProperty>(`/properties/mine/${id}`);
  },

  update(id: string, input: PropertyDraftInput, signal?: AbortSignal) {
    return authorizedRequest<{ id: string; status: string }>(`/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      signal,
    });
  },

  submit(id: string) {
    return authorizedRequest<{ id: string; status: string }>(`/properties/${id}/submit`, {
      method: 'POST',
    });
  },

  cancelSubmission(id: string) {
    return authorizedRequest<OwnedPropertySummary>(`/properties/${id}/cancel-submission`, { method: 'POST' });
  },

  hide(id: string) {
    return authorizedRequest<OwnedPropertySummary>(`/properties/${id}/hide`, { method: 'POST' });
  },

  restore(id: string) {
    return authorizedRequest<OwnedPropertySummary>(`/properties/${id}/restore`, { method: 'POST' });
  },

  archive(id: string) {
    return authorizedRequest<void>(`/properties/${id}`, { method: 'DELETE' });
  },

  listMine() {
    return authorizedRequest<OwnedPropertySummary[]>('/properties/mine');
  },

  photos(propertyId: string) {
    return authorizedRequest<PropertyPhoto[]>(`/properties/mine/${propertyId}/photos`);
  },

  async uploadPhoto(propertyId: string, file: File) {
    const ticket = await authorizedRequest<{ photoId: string; uploadUrl: string }>(
      `/properties/${propertyId}/photos/upload-url`,
      {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      },
    );
    const upload = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!upload.ok) throw new Error('MinIO не принял файл');
    return authorizedRequest<PropertyPhoto>(
      `/properties/${propertyId}/photos/${ticket.photoId}/complete`,
      { method: 'POST' },
    );
  },

  reorderPhotos(propertyId: string, photoIds: string[]) {
    return authorizedRequest<PropertyPhoto[]>(`/properties/${propertyId}/photos/order`, {
      method: 'PATCH',
      body: JSON.stringify({ photoIds }),
    });
  },

  setPrimaryPhoto(propertyId: string, photoId: string) {
    return authorizedRequest<{ primaryPhotoId: string }>(
      `/properties/${propertyId}/photos/${photoId}/primary`,
      { method: 'PATCH' },
    );
  },

  removePhoto(propertyId: string, photoId: string) {
    return authorizedRequest<void>(`/properties/${propertyId}/photos/${photoId}`, {
      method: 'DELETE',
    });
  },

  availability(propertyId: string) {
    return authorizedRequest<AvailabilityPeriod[]>(`/properties/mine/${propertyId}/availability`);
  },

  createAvailability(propertyId: string, input: AvailabilityInput) {
    return authorizedRequest<AvailabilityPeriod>(`/properties/${propertyId}/availability`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateAvailability(propertyId: string, periodId: string, input: AvailabilityUpdateInput) {
    return authorizedRequest<AvailabilityPeriod>(`/properties/${propertyId}/availability/${periodId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  removeAvailability(propertyId: string, periodId: string) {
    return authorizedRequest<void>(`/properties/${propertyId}/availability/${periodId}`, {
      method: 'DELETE',
    });
  },
};
