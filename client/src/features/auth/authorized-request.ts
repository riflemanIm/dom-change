import { authApi } from './auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type ApiErrorConstructor = new (message: string, status: number) => Error;
type AuthorizedRequestOptions = {
  fallbackMessage?: string;
  ErrorType?: ApiErrorConstructor;
};

export class AuthorizedApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function authorizedRequest<T>(path: string, init?: RequestInit, options: AuthorizedRequestOptions = {}): Promise<T> {
  let token = sessionStorage.getItem('accessToken');
  if (!token) token = await authApi.refresh();

  let response = await send(path, token, init);
  if (response.status === 401) {
    try {
      token = await authApi.refresh();
      response = await send(path, token, init);
    } catch {
      sessionStorage.removeItem('accessToken');
      throw createError('Сессия завершена. Войдите снова', 401, options.ErrorType);
    }
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) sessionStorage.removeItem('accessToken');
    const serverMessage = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw createError(serverMessage || options.fallbackMessage || 'Не удалось выполнить запрос', response.status, options.ErrorType);
  }
  return body as T;
}

function send(path: string, token: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });
}

function createError(message: string, status: number, ErrorType: ApiErrorConstructor = AuthorizedApiError) {
  return new ErrorType(message, status);
}
