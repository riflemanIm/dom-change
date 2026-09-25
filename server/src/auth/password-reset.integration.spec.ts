import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { VerificationType } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

describe('Password reset integration', () => {
  const prisma = new PrismaService();
  const mail = { sendPasswordReset: jest.fn(), sendVerificationCode: jest.fn() } as unknown as MailService;
  const realtime = { disconnectUser: jest.fn() } as unknown as RealtimeService;
  const config = new ConfigService({
    APP_URL: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'integration-access-secret-at-least-32-characters',
    JWT_REFRESH_SECRET: 'integration-refresh-secret-at-least-32-characters',
  });
  const auth = new AuthService(prisma, new JwtService(), config, mail, realtime, { amount: jest.fn() } as never);
  const runId = randomUUID();
  const email = `password-reset-${runId}@example.test`;
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await cleanupStaleUsers();
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash('OldPassword123', { type: argon2.argon2id }),
        emailVerified: true,
        profile: { create: { displayName: 'Password Reset User' } },
        pointAccount: { create: {} },
        sessions: {
          create: [
            { refreshTokenHash: 'session-one', expiresAt: new Date(Date.now() + 86_400_000) },
            { refreshTokenHash: 'session-two', expiresAt: new Date(Date.now() + 86_400_000) },
          ],
        },
      },
    });
    userId = user.id;
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    try {
      if (userId) await prisma.user.delete({ where: { id: userId } });
      await cleanupStaleUsers();
    } finally {
      await prisma.$disconnect();
    }
  });

  it('does not reveal whether an email is registered', async () => {
    await expect(auth.requestPasswordReset('missing-user@example.test')).resolves.toEqual({ sent: true });
    expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    expect(await prisma.contactVerification.count({ where: { type: VerificationType.PASSWORD_RESET, target: 'missing-user@example.test' } })).toBe(0);
  });

  it('issues only one active token and stores no raw token', async () => {
    await auth.requestPasswordReset(email.toUpperCase());
    const firstUrl = resetUrlFromLastEmail();
    const firstToken = new URL(firstUrl).searchParams.get('token');
    expect(firstToken).toHaveLength(43);

    await auth.requestPasswordReset(email);
    const records = await prisma.contactVerification.findMany({
      where: { userId, type: VerificationType.PASSWORD_RESET },
      orderBy: { createdAt: 'asc' },
    });
    expect(records).toHaveLength(2);
    expect(records.filter(({ verifiedAt }) => verifiedAt === null)).toHaveLength(1);
    expect(records.some(({ codeHash }) => codeHash === firstToken)).toBe(false);
  });

  it('changes the password, revokes every session and rejects token reuse', async () => {
    await auth.requestPasswordReset(email);
    const token = new URL(resetUrlFromLastEmail()).searchParams.get('token');
    expect(token).toBeTruthy();

    await expect(auth.resetPassword(token!, 'NewPassword456')).resolves.toEqual({ reset: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await argon2.verify(user.passwordHash, 'NewPassword456')).toBe(true);
    expect(await argon2.verify(user.passwordHash, 'OldPassword123')).toBe(false);
    expect(await prisma.userSession.count({ where: { userId, revokedAt: null } })).toBe(0);
    expect(realtime.disconnectUser).toHaveBeenCalledWith(userId);
    await expect(auth.resetPassword(token!, 'AnotherPassword789')).rejects.toThrow('Ссылка недействительна или истекла');
  });

  function resetUrlFromLastEmail() {
    const calls = (mail.sendPasswordReset as jest.Mock).mock.calls;
    return calls[calls.length - 1][1] as string;
  }

  async function cleanupStaleUsers() {
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'password-reset-' }, AND: { email: { endsWith: '@example.test' } } },
    });
  }
});
