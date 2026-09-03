import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimitService } from '../rate-limit/rate-limit.service';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация по email и паролю' })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.limitRegistration(request, dto.email);
    const result = await this.auth.register(dto, this.metadata(request));
    this.setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход по email и паролю' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.limitLogin(request, dto.email);
    const result = await this.auth.login(dto, this.metadata(request));
    this.setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ротация refresh token' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(request.cookies?.refreshToken, this.metadata(request));
    this.setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _, ...body } = result;
    return body;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Завершить текущую сессию' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.refreshToken);
    response.clearCookie('refreshToken', this.cookieOptions());
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запросить ссылку для восстановления пароля' })
  async forgotPassword(@Body() dto: RequestPasswordResetDto, @Req() request: Request) {
    await Promise.all([
      this.rateLimit.consume('password-forgot-ip', request.ip, 10, 60 * 60),
      this.rateLimit.consume('password-forgot-email', dto.email, 3, 60 * 60),
    ]);
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Установить новый пароль по одноразовой ссылке' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await Promise.all([
      this.rateLimit.consume('password-reset-ip', request.ip, 10, 60 * 60),
      this.rateLimit.consume('password-reset-token', dto.token, 5, 60 * 60),
    ]);
    const result = await this.auth.resetPassword(dto.token, dto.password);
    response.clearCookie('refreshToken', this.cookieOptions());
    return result;
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Завершить все сессии пользователя' })
  async logoutAll(
    @Req() request: Request & AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logoutAll(request.user.sub);
    response.clearCookie('refreshToken', this.cookieOptions());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Текущий пользователь' })
  me(@Req() request: Request & AuthenticatedRequest) {
    return this.auth.me(request.user.sub);
  }

  @Post('email/resend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Повторно отправить код подтверждения email' })
  async resendEmail(@Req() request: Request & AuthenticatedRequest) {
    await this.rateLimit.consume('email-resend-user', request.user.sub, 3, 15 * 60);
    return this.auth.resendEmailVerification(request.user.sub);
  }

  @Post('email/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подтвердить email кодом' })
  async verifyEmail(@Req() request: Request & AuthenticatedRequest, @Body() dto: VerifyEmailDto) {
    await this.rateLimit.consume('email-verify-user', request.user.sub, 10, 15 * 60);
    return this.auth.verifyEmail(request.user.sub, dto.code);
  }

  private limitRegistration(request: Request, email: string) {
    return Promise.all([
      this.rateLimit.consume('register-ip', request.ip, 10, 60 * 60),
      this.rateLimit.consume('register-email', email, 5, 60 * 60),
    ]);
  }

  private limitLogin(request: Request, email: string) {
    return Promise.all([
      this.rateLimit.consume('login-ip', request.ip, 30, 15 * 60),
      this.rateLimit.consume('login-email', email, 10, 15 * 60),
    ]);
  }

  private metadata(request: Request) {
    return {
      userAgent: request.get('user-agent'),
      ip: request.ip,
    };
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie('refreshToken', token, {
      ...this.cookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: '/api/v1/auth',
    };
  }
}
