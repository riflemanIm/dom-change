const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type AuthUser = {
  id: string;
  email: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  emailVerified: boolean;
  trustLevel: string;
  profile: { displayName: string; city?: string | null };
  points: { available: string; bonus: string };
};

type AuthResponse = {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw new Error(message || 'Не удалось выполнить запрос');
  }
  return body as T;
}

export const authApi = {
  async register(input: { email: string; displayName: string; password: string }) {
    const result = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    sessionStorage.setItem('accessToken', result.accessToken);
    return result;
  },

  async login(input: { email: string; password: string }) {
    const result = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    sessionStorage.setItem('accessToken', result.accessToken);
    return result;
  },

  async refresh() {
    const result = await request<Omit<AuthResponse, 'user'>>('/auth/refresh', { method: 'POST' });
    sessionStorage.setItem('accessToken', result.accessToken);
    return result.accessToken;
  },

  async me() {
    let token = sessionStorage.getItem('accessToken');
    if (!token) token = await this.refresh();
    return request<AuthUser>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async verifyEmail(code: string) {
    const token = sessionStorage.getItem('accessToken') ?? (await this.refresh());
    return request<{ verified: boolean; bonusAwarded: number }>('/auth/email/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
  },

  async resendEmailCode() {
    const token = sessionStorage.getItem('accessToken') ?? (await this.refresh());
    return request<{ sent?: boolean; verified?: boolean }>('/auth/email/resend', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
