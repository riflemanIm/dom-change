import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { AuthModule } from '../auth/auth.module';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { PointsService } from './points.service';

@ApiTags('points')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'points', version: '1' })
class PointsController {
  constructor(private readonly points: PointsService) {}

  @Get('history')
  @ApiOperation({ summary: 'Баланс и история операций ДомБаллов' })
  history(@Req() request: Request & AuthenticatedRequest) {
    return this.points.history(request.user.sub);
  }
}

@ApiTags('admin points')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/points', version: '1' })
class AdminPointsController {
  constructor(private readonly points: PointsService) {}

  @Get('users')
  @ApiOperation({ summary: 'Найти пользователей для корректировки ДомБаллов' })
  users(@Query('q') query?: string) {
    return this.points.findUsers(query);
  }

  @Post('users/:userId/adjustments')
  @ApiOperation({ summary: 'Вручную скорректировать баланс ДомБаллов' })
  adjust(
    @Req() request: Request & AuthenticatedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdjustPointsDto,
  ) {
    return this.points.adjust(request.user.sub, userId, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [PointsController, AdminPointsController],
  providers: [PointsService],
})
export class PointsModule {}
