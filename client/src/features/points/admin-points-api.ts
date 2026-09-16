import { authorizedRequest } from '@/features/auth/authorized-request';

export type AdminPointsUser = {
  id: string;
  email: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  status: string;
  profile: { displayName: string; avatarUrl: string | null } | null;
  pointAccount: { available: string; reserved: string } | null;
};

export const adminPointsApi = {
  users(query: string) {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    return authorizedRequest<AdminPointsUser[]>(`/admin/points/users?${params}`);
  },
  adjust(userId: string, amount: number, reason: string) {
    return authorizedRequest<AdminPointsUser>(`/admin/points/users/${userId}/adjustments`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  },
};
