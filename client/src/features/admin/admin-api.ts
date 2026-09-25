import { authorizedRequest } from '@/features/auth/authorized-request';

export type AdminUser = {
  id: string;
  email: string | null;
  phone?: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  status: string;
  emailVerified: boolean;
  phoneVerified?: boolean;
  trustLevel?: 'NEW' | 'EMAIL_VERIFIED' | 'CONTACTS_VERIFIED' | 'VERIFIED_MEMBER' | 'TRUSTED_MEMBER';
  createdAt: string;
  profile: { displayName: string; surname?: string | null; patronymic?: string | null; city?: string | null; description?: string | null; adultsCount?: number; childrenCount?: number; hasPets?: boolean; interests?: string[]; travelPreferences?: string[] } | null;
};

export type AdminUserUpdate = {
  email?: string; phone?: string | null; displayName?: string; password?: string;
  role?: AdminUser['role']; status?: string; trustLevel?: NonNullable<AdminUser['trustLevel']>;
  emailVerified?: boolean; phoneVerified?: boolean; surname?: string | null; patronymic?: string | null;
  city?: string | null; description?: string | null; adultsCount?: number; childrenCount?: number;
  hasPets?: boolean; interests?: string[]; travelPreferences?: string[];
};

export type AdminDeletionPreview = { email: string | null; propertyCount: number; affectedRequestCount: number };
export type AdminDeletionResult = AdminDeletionPreview & { deleted: true; storageCleanupFailed: number };

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
  userDetails(id: string) { return authorizedRequest<AdminUser>(`/admin/users/${id}`); },
  updateUser(id: string, data: AdminUserUpdate) {
    return authorizedRequest<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  deletionPreview(id: string) { return authorizedRequest<AdminDeletionPreview>(`/admin/users/${id}/deletion-preview`); },
  deleteUser(id: string, confirmation: string) {
    return authorizedRequest<AdminDeletionResult>(`/admin/users/${id}`, { method: 'DELETE', body: JSON.stringify({ confirmation }) });
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
