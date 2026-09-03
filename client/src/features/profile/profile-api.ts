import { authorizedRequest } from '@/features/auth/authorized-request';
export type Profile = {
  id: string; userId: string; displayName: string; surname: string | null; patronymic: string | null;
  avatarUrl: string | null; avatarKey: string | null; city: string | null; description: string | null; adultsCount: number;
  childrenCount: number; hasPets: boolean; interests: string[]; travelPreferences: string[];
  hostRating: string | null; guestRating: string | null; completedExchanges: number;
};

async function request<T>(path = '', init?: RequestInit) {
  return authorizedRequest<T>(`/profile${path}`, init, { fallbackMessage: 'Не удалось сохранить профиль' });
}

export const profileApi = {
  get: () => request<Profile>(),
  update: (input: Partial<Profile>) => request<Profile>('', { method: 'PATCH', body: JSON.stringify(input) }),
  async uploadAvatar(file: File) {
    const ticket = await request<{ uploadId: string; uploadUrl: string }>('/avatar/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size }),
    });
    const upload = await fetch(ticket.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!upload.ok) throw new Error('MinIO не принял аватар');
    return request<Profile>(`/avatar/${ticket.uploadId}/complete`, { method: 'POST' });
  },
};
