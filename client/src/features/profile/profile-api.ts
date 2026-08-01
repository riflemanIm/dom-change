import { authApi } from '@/features/auth/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export type Profile = {
  id: string; userId: string; displayName: string; surname: string | null; patronymic: string | null;
  avatarUrl: string | null; avatarKey: string | null; city: string | null; description: string | null; adultsCount: number;
  childrenCount: number; hasPets: boolean; interests: string[]; travelPreferences: string[];
  hostRating: string | null; guestRating: string | null; completedExchanges: number;
};

async function request<T>(path = '', init?: RequestInit) {
  let token = sessionStorage.getItem('accessToken');
  if (!token) token = await authApi.refresh();
  const response = await fetch(`${API_URL}/profile${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw new Error(message || 'Не удалось сохранить профиль');
  }
  return body as T;
}

export const profileApi = {
  get: () => request<Profile>(),
  update: (input: Partial<Profile>) => request<Profile>('', { method: 'PATCH', body: JSON.stringify(input) }),
  async uploadAvatar(file: File) {
    let token = sessionStorage.getItem('accessToken');
    if (!token) token = await authApi.refresh();
    const ticketResponse = await fetch(`${API_URL}/profile/avatar/upload-url`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size }),
    });
    const ticket = await ticketResponse.json().catch(() => null);
    if (!ticketResponse.ok) throw new Error(ticket?.message || 'Не удалось подготовить загрузку аватара');
    const upload = await fetch(ticket.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!upload.ok) throw new Error('MinIO не принял аватар');
    return request<Profile>(`/avatar/${ticket.uploadId}/complete`, { method: 'POST' });
  },
};
