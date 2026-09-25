import { BadRequestException, Body, Controller, Delete, Get, Module, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { AuthModule } from '../auth/auth.module';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { POINT_RULES, PointRuleKey, PointRulesService } from '../database/point-rules.service';
import { AdminService } from './admin.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { CreateAmenityDto, UpdateAmenityDto } from './dto/amenity.dto';
import { UpdatePointRuleDto } from './dto/point-rule.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin', version: '1' })
class AdminController {
  constructor(private readonly admin: AdminService, private readonly rules: PointRulesService) {}

  @Get('users')
  @ApiOperation({ summary: 'Список пользователей' })
  users(@Query('q') query?: string) { return this.admin.users(query); }

  @Post('users')
  @ApiOperation({ summary: 'Создать пользователя' })
  createUser(@Body() dto: CreateAdminUserDto) { return this.admin.createUser(dto); }

  @Get('users/:id')
  @ApiOperation({ summary: 'Данные пользователя для редактирования' })
  userDetails(@Param('id', ParseUUIDPipe) id: string) { return this.admin.userDetails(id); }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Изменить пользователя и профиль' })
  updateUser(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminUserDto) {
    return this.admin.updateUser(request.user.sub, id, dto);
  }

  @Get('users/:id/deletion-preview')
  @ApiOperation({ summary: 'Показать последствия полного удаления пользователя' })
  deletionPreview(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deletionPreview(request.user.sub, id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Безвозвратно удалить пользователя и связанные данные' })
  deleteUser(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body('confirmation') confirmation: string) {
    return this.admin.deleteUser(request.user.sub, id, confirmation);
  }

  @Get('amenities')
  @ApiOperation({ summary: 'Все удобства, включая отключённые' })
  amenities() { return this.admin.amenities(); }

  @Post('amenities')
  @ApiOperation({ summary: 'Создать удобство' })
  createAmenity(@Body() dto: CreateAmenityDto) { return this.admin.createAmenity(dto); }

  @Patch('amenities/:id')
  @ApiOperation({ summary: 'Изменить или отключить удобство' })
  updateAmenity(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAmenityDto) {
    return this.admin.updateAmenity(id, dto);
  }

  @Get('point-rules')
  @ApiOperation({ summary: 'Действующие правила автоматических бонусов' })
  pointRules() { return this.rules.list(); }

  @Patch('point-rules/:key')
  @ApiOperation({ summary: 'Изменить сумму автоматического бонуса' })
  updatePointRule(@Param('key') key: string, @Body() dto: UpdatePointRuleDto) {
    if (!Object.hasOwn(POINT_RULES, key)) throw new BadRequestException('Неизвестное правило');
    return this.rules.update(key as PointRuleKey, dto.amount);
  }
}

@Module({ imports: [AuthModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
