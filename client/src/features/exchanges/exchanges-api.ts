import { authorizedRequest as requestWithAuth } from '@/features/auth/authorized-request';

export type ExchangeStatus = 'PENDING' | 'PREAPPROVED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type ExchangeRequest = {
  id: string;
  type: 'POINTS' | 'DIRECT';
  status: ExchangeStatus;
  startsOn: string;
  endsOn: string;
  guests: number;
  message: string | null;
  cancellationReason?: string | null;
  totalPoints: number | null;
  createdAt: string;
  requester: { id: string; profile: { displayName: string; avatarUrl: string | null } | null };
  host: { id: string; profile: { displayName: string; avatarUrl: string | null } | null };
  targetProperty: { id: string; slug: string; title: string; address: { city: string; country: string } | null };
  offeredProperty: { id: string; slug: string; title: string; address: { city: string; country: string } | null } | null;
  reviews: ExchangeReview[];
};

export type ExchangeReview = {
  id: string;
  authorId: string;
  subjectId: string;
  rating: number;
  cleanlinessRating: number;
  communicationRating: number;
  comment: string;
  createdAt: string;
  author: { id: string; profile: { displayName: string; avatarUrl: string | null } | null };
};

export type ExchangeMessage = {
  id: string;
  exchangeRequestId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; profile: { displayName: string; avatarUrl: string | null } | null };
};

export class ExchangeApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function authorizedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return requestWithAuth<T>(path, init, { fallbackMessage: 'Не удалось выполнить действие с заявкой', ErrorType: ExchangeApiError });
}

export const exchangesApi = {
  list: (direction: 'incoming' | 'outgoing') => authorizedRequest<ExchangeRequest[]>(`/exchanges?direction=${direction}`),
  create: (input: { targetPropertyId: string; type: 'POINTS' | 'DIRECT'; offeredPropertyId?: string; startsOn: string; endsOn: string; guests: number; message?: string }) => authorizedRequest<ExchangeRequest>('/exchanges', { method: 'POST', body: JSON.stringify(input) }),
  action: (id: string, action: 'preapprove' | 'confirm' | 'reject' | 'cancel' | 'complete') => authorizedRequest<ExchangeRequest>(`/exchanges/${id}/${action}`, { method: 'POST' }),
  cancelConfirmed: (id: string, reason: string) => authorizedRequest<ExchangeRequest>(`/exchanges/${id}/cancel-confirmed`, { method: 'POST', body: JSON.stringify({ reason }) }),
  messages: (id: string) => authorizedRequest<ExchangeMessage[]>(`/exchanges/${id}/messages`),
  sendMessage: (id: string, body: string) => authorizedRequest<ExchangeMessage>(`/exchanges/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
  markMessagesRead: (id: string) => authorizedRequest<{ exchangeRequestId: string; readerId: string; readAt: string; count: number }>(`/exchanges/${id}/messages/read`, { method: 'POST' }),
  createReview: (id: string, input: { rating: number; cleanlinessRating: number; communicationRating: number; comment: string }) => authorizedRequest<ExchangeReview>(`/exchanges/${id}/reviews`, { method: 'POST', body: JSON.stringify(input) }),
};
