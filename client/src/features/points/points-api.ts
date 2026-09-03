import { authorizedRequest } from '@/features/auth/authorized-request';

export type PointsHistory = {
  available: string;
  reserved: string;
  pending: string;
  bonus: string;
  frozen: string;
  transactions: Array<{ id: string; type: string; amount: string; description: string | null; createdAt: string }>;
};

export async function getPointsHistory() {
  return authorizedRequest<PointsHistory>('/points/history', undefined, { fallbackMessage: 'Не удалось загрузить историю ДомБаллов' });
}
