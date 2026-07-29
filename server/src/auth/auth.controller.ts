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
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация по email и паролю' })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
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
  resendEmail(@Req() request: Request & AuthenticatedRequest) {
    return this.auth.resendEmailVerification(request.user.sub);
  }

  @Post('email/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подтвердить email кодом' })
  verifyEmail(@Req() request: Request & AuthenticatedRequest, @Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(request.user.sub, dto.code);
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
