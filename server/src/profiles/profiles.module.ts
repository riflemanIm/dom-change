import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAvatarUploadDto } from './dto/avatar-upload.dto';
import { ProfileAvatarsService } from './profile-avatars.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'profile', version: '1' })
class ProfilesController {
  constructor(private readonly prisma: PrismaService, private readonly avatars: ProfileAvatarsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить свой профиль' })
  get(@Req() request: Request & AuthenticatedRequest) {
    return this.prisma.userProfile.findUniqueOrThrow({ where: { userId: request.user.sub } });
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить свой профиль' })
  update(@Req() request: Request & AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    const trimNullable = (value: string | null | undefined) => value === null ? null : value?.trim();
    const clean = {
      ...dto,
      displayName: dto.displayName?.trim(),
      surname: trimNullable(dto.surname),
      patronymic: trimNullable(dto.patronymic),
      city: trimNullable(dto.city),
      description: trimNullable(dto.description),
      avatarUrl: trimNullable(dto.avatarUrl),
      interests: dto.interests?.map((value) => value.trim()).filter(Boolean),
      travelPreferences: dto.travelPreferences?.map((value) => value.trim()).filter(Boolean),
    };
    return this.prisma.userProfile.update({
      where: { userId: request.user.sub },
      data: clean,
    });
  }

  @Post('avatar/upload-url')
  createAvatarUpload(@Req() request: Request & AuthenticatedRequest, @Body() dto: CreateAvatarUploadDto) {
    return this.avatars.createUpload(request.user.sub, dto);
  }

  @Post('avatar/:uploadId/complete')
  completeAvatar(@Req() request: Request & AuthenticatedRequest, @Param('uploadId', ParseUUIDPipe) uploadId: string) {
    return this.avatars.complete(request.user.sub, uploadId);
  }
}

@Controller({ path: 'profile-avatars', version: '1' })
class PublicProfileAvatarsController {
  constructor(private readonly avatars: ProfileAvatarsService) {}

  @Get(':userId')
  async get(@Param('userId', ParseUUIDPipe) userId: string, @Res() response: Response) {
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Cache-Control', 'no-cache');
    response.redirect(302, await this.avatars.redirectUrl(userId));
  }
}

@Module({ controllers: [ProfilesController, PublicProfileAvatarsController], providers: [ProfileAvatarsService] })
export class ProfilesModule {}
