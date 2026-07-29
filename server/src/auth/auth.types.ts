export type AccessTokenPayload = {
  sub: string;
  sessionId: string;
  type: 'access';
};

export type AuthenticatedRequest = {
  user: AccessTokenPayload;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};
