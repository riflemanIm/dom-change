import { authApi } from '@/features/auth/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type PointsHistory = {
  available: string;
  reserved: string;
  pending: string;
  bonus: string;
  frozen: string;
  transactions: Array<{ id: string; type: string; amount: string; description: string | null; createdAt: string }>;
};

export async function getPointsHistory() {
  let token = sessionStorage.getItem('accessToken');
  if (!token) token = await authApi.refresh();
  const response = await fetch(`${API_URL}/points/history`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Не удалось загрузить историю ДомБаллов');
  return body as PointsHistory;
}
