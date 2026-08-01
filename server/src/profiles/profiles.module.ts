import { Body, Controller, Get, Module, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'profile', version: '1' })
class ProfilesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Получить свой профиль' })
  get(@Req() request: Request & AuthenticatedRequest) {
    return this.prisma.userProfile.findUniqueOrThrow({ where: { userId: request.user.sub } });
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить свой профиль' })
  update(@Req() request: Request & AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    const clean = {
      ...dto,
      displayName: dto.displayName?.trim(),
      surname: dto.surname?.trim(),
      patronymic: dto.patronymic?.trim(),
      city: dto.city?.trim(),
      description: dto.description?.trim(),
      avatarUrl: dto.avatarUrl?.trim(),
      interests: dto.interests?.map((value) => value.trim()).filter(Boolean),
      travelPreferences: dto.travelPreferences?.map((value) => value.trim()).filter(Boolean),
    };
    return this.prisma.userProfile.update({
      where: { userId: request.user.sub },
      data: clean,
    });
  }
}

@Module({ controllers: [ProfilesController] })
export class ProfilesModule {}
