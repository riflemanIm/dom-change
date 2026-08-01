import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PointTransactionType, Prisma, TrustLevel, VerificationType } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { AccessTokenPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from './mail.service';

type SessionMetadata = { userAgent?: string; ip?: string };
type RefreshPayload = { sub: string; sessionId: string; type: 'refresh' };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto, metadata: SessionMetadata) {
    const email = dto.email.trim().toLocaleLowerCase('ru');
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new ConflictException('Пользователь с таким email уже существует');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const welcomeBonus = Number(this.config.get('POINTS_WELCOME_BONUS') ?? 500);

    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            passwordHash,
            profile: { create: { displayName: dto.displayName.trim() } },
            pointAccount: {
              create: {
                available: welcomeBonus,
                bonus: welcomeBonus,
                transactions: {
                  create: {
                    type: PointTransactionType.BONUS,
                    amount: welcomeBonus,
                    idempotencyKey: `welcome:${email}`,
                    sourceType: 'REGISTRATION',
                    description: 'Приветственный бонус',
                  },
                },
              },
            },
          },
          include: { profile: true, pointAccount: true },
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
      throw error;
    }

    await this.issueEmailVerification(user.id, email);
    const tokens = await this.createSession(user.id, metadata);
    return { ...tokens, user: this.presentUser(user) };
  }

  async login(dto: LoginDto, metadata: SessionMetadata) {
    const email = dto.email.trim().toLocaleLowerCase('ru');
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true, pointAccount: true },
    });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Аккаунт ограничен');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
    const tokens = await this.createSession(user.id, metadata);
    return { ...tokens, user: this.presentUser(user) };
  }

  async refresh(refreshToken: string | undefined, metadata: SessionMetadata) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token отсутствует');

    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token недействителен');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Неверный тип token');

    const session = await this.prisma.userSession.findUnique({ where: { id: payload.sessionId } });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !(await argon2.verify(session.refreshTokenHash, refreshToken))
    ) {
      throw new UnauthorizedException('Сессия недействительна');
    }

    const claimed = await this.prisma.userSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) throw new UnauthorizedException('Refresh token уже использован');
    return this.createSession(payload.sub, metadata);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        ignoreExpiration: true,
      });
      await this.prisma.userSession.updateMany({
        where: { id: payload.sessionId, userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      return;
    }
  }

  async logoutAll(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, pointAccount: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.presentUser(user);
  }

  async resendEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) throw new UnprocessableEntityException('Email не указан');
    if (user.emailVerified) return { verified: true };
    await this.issueEmailVerification(user.id, user.email);
    return { sent: true };
  }

  async verifyEmail(userId: string, code: string) {
    const records = await this.prisma.contactVerification.findMany({
      where: {
        userId,
        type: VerificationType.EMAIL,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const verification = records[0];
    if (!verification || verification.attempts >= 5 || this.hashCode(code) !== verification.codeHash) {
      if (verification) {
        await this.prisma.contactVerification.update({
          where: { id: verification.id },
          data: { attempts: { increment: 1 } },
        });
      }
      throw new UnprocessableEntityException('Код неверен или истёк');
    }

    const bonus = Number(this.config.get('POINTS_EMAIL_VERIFICATION_BONUS') ?? 100);
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { emailVerified: true, trustLevel: TrustLevel.EMAIL_VERIFIED },
        select: { email: true },
      });
      await tx.contactVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: new Date() },
      });
      await tx.pointAccount.update({
        where: { userId },
        data: {
          available: { increment: bonus },
          bonus: { increment: bonus },
          transactions: {
            create: {
              type: PointTransactionType.BONUS,
              amount: bonus,
              idempotencyKey: `email-verified:${userId}`,
              sourceType: 'EMAIL_VERIFICATION',
              description: `Бонус за подтверждение ${user.email}`,
            },
          },
        },
      });
    });
    return { verified: true, bonusAwarded: bonus };
  }

  private async issueEmailVerification(userId: string, email: string) {
    const code = randomInt(100000, 1000000).toString();
    await this.prisma.contactVerification.create({
      data: {
        userId,
        type: VerificationType.EMAIL,
        target: email,
        codeHash: this.hashCode(code),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await this.mail.sendVerificationCode(email, code);
  }

  private async createSession(userId: string, metadata: SessionMetadata) {
    const sessionId = randomUUID();
    const refreshExpiresInSeconds = 30 * 24 * 60 * 60;
    const refreshToken = await this.jwt.signAsync<RefreshPayload>(
      { sub: userId, sessionId, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresInSeconds,
      },
    );
    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash: await argon2.hash(refreshToken, { type: argon2.argon2id }),
        userAgent: metadata.userAgent?.slice(0, 500),
        ipHash: metadata.ip ? this.hashCode(metadata.ip) : null,
        expiresAt: new Date(Date.now() + refreshExpiresInSeconds * 1000),
      },
    });
    const accessPayload: AccessTokenPayload = { sub: userId, sessionId, type: 'access' };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private hashCode(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private presentUser(user: Prisma.UserGetPayload<{ include: { profile: true; pointAccount: true } }>) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      trustLevel: user.trustLevel,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      profile: user.profile,
      points: user.pointAccount
        ? {
            available: user.pointAccount.available.toString(),
            reserved: user.pointAccount.reserved.toString(),
            pending: user.pointAccount.pending.toString(),
            bonus: user.pointAccount.bonus.toString(),
            frozen: user.pointAccount.frozen.toString(),
          }
        : null,
    };
  }
}
