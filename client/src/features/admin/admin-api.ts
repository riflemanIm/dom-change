import { authorizedRequest } from '@/features/auth/authorized-request';

export type AdminUser = {
  id: string;
  email: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  status: string;
  emailVerified: boolean;
  createdAt: string;
  profile: { displayName: string } | null;
};

export type AdminAmenity = {
  id: string;
  code: string;
  name: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

export type PointRule = { key: string; label: string; amount: number };

export const adminApi = {
  users(query = '') {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    return authorizedRequest<AdminUser[]>(`/admin/users?${params}`);
  },
  createUser(data: { email: string; displayName: string; password: string; role: AdminUser['role']; emailVerified: boolean }) {
    return authorizedRequest<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(data) });
  },
  amenities() { return authorizedRequest<AdminAmenity[]>('/admin/amenities'); },
  createAmenity(data: { code: string; name: string; category: string; sortOrder: number; isActive: boolean }) {
    return authorizedRequest<AdminAmenity>('/admin/amenities', { method: 'POST', body: JSON.stringify(data) });
  },
  updateAmenity(id: string, data: { name: string; category: string; sortOrder: number; isActive: boolean }) {
    return authorizedRequest<AdminAmenity>(`/admin/amenities/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  pointRules() { return authorizedRequest<PointRule[]>('/admin/point-rules'); },
  updatePointRule(key: string, amount: number) {
    return authorizedRequest<PointRule>(`/admin/point-rules/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ amount }) });
  },
};
