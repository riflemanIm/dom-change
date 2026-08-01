import { Controller, Get, HttpCode, HttpStatus, Module, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'notifications', version: '1' })
class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() request: Request & AuthenticatedRequest) { return this.notifications.list(request.user.sub); }

  @Patch('read-all')
  readAll(@Req() request: Request & AuthenticatedRequest) { return this.notifications.readAll(request.user.sub); }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  read(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.notifications.read(request.user.sub, id); }
}

@Module({ controllers: [NotificationsController], providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
