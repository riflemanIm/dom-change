import { Body, Controller, DefaultValuePipe, Get, Module, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ModerationDecisionDto } from './dto/moderation-decision.dto';
import { ModerationService } from './moderation.service';

@ApiTags('moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
@Controller({ path: 'moderation/properties', version: '1' })
class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get()
  @ApiOperation({ summary: 'Очередь объявлений на модерацию' })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.moderation.list(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Полная карточка объявления для модерации' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.moderation.get(id);
  }

  @Post(':id/decision')
  @ApiOperation({ summary: 'Принять решение по объявлению' })
  decide(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerationDecisionDto,
  ) {
    return this.moderation.decide(request.user.sub, id, dto);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
