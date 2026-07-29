import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertPropertyDto } from './dto/property.dto';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/availability.dto';
import { CreatePhotoUploadDto, ReorderPhotosDto } from './dto/property-photo.dto';
import { PropertyPhotosService } from './property-photos.service';
import { PropertyAvailabilityService } from './property-availability.service';
import { PropertiesService } from './properties.service';

@ApiTags('amenities')
@Controller({ path: 'amenities', version: '1' })
class AmenitiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @ApiOperation({ summary: 'Активные удобства жилья' })
  list() {
    return this.properties.listAmenities();
  }
}

@ApiTags('properties')
@Controller({ path: 'properties', version: '1' })
class PropertiesController {
  constructor(
    private readonly properties: PropertiesService,
    private readonly photos: PropertyPhotosService,
    private readonly availability: PropertyAvailabilityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Каталог опубликованного жилья' })
  @ApiQuery({ name: 'city', required: false })
  list(@Query('city') city?: string) {
    return this.properties.listPublic(city);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои объявления' })
  mine(@Req() request: Request & AuthenticatedRequest) {
    return this.properties.listMine(request.user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать черновик объявления' })
  create(@Req() request: Request & AuthenticatedRequest, @Body() dto: UpsertPropertyDto) {
    return this.properties.createDraft(request.user.sub, dto);
  }

  @Get('mine/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить своё объявление' })
  getMine(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.properties.getMine(request.user.sub, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить своё объявление' })
  update(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertPropertyDto,
  ) {
    return this.properties.update(request.user.sub, id, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить объявление на модерацию' })
  submit(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.properties.submit(request.user.sub, id);
  }

  @Post(':id/photos/upload-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить временную ссылку загрузки фото' })
  createPhotoUpload(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePhotoUploadDto,
  ) {
    return this.photos.createUpload(request.user.sub, id, dto);
  }

  @Post(':id/photos/:photoId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подтвердить и обработать загруженное фото' })
  completePhoto(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.photos.complete(request.user.sub, id, photoId);
  }

  @Get('mine/:id/photos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Фотографии своего объявления' })
  listPhotos(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.photos.list(request.user.sub, id);
  }

  @Patch(':id/photos/order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Изменить порядок фотографий' })
  reorderPhotos(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderPhotosDto,
  ) {
    return this.photos.reorder(request.user.sub, id, dto.photoIds);
  }

  @Patch(':id/photos/:photoId/primary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выбрать главное фото' })
  setPrimaryPhoto(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.photos.setPrimary(request.user.sub, id, photoId);
  }

  @Delete(':id/photos/:photoId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить фотографию' })
  removePhoto(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.photos.remove(request.user.sub, id, photoId);
  }

  @Get('mine/:id/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Периоды доступности своего объявления' })
  listAvailability(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.availability.list(request.user.sub, id);
  }

  @Post(':id/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить период доступности' })
  createAvailability(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.availability.create(request.user.sub, id, dto);
  }

  @Patch(':id/availability/:periodId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Изменить период доступности' })
  updateAvailability(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.availability.update(request.user.sub, id, periodId, dto);
  }

  @Delete(':id/availability/:periodId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить период доступности' })
  removeAvailability(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('periodId', ParseUUIDPipe) periodId: string,
  ) {
    return this.availability.remove(request.user.sub, id, periodId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Архивировать своё объявление' })
  archive(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.properties.archive(request.user.sub, id);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Публичная карточка опубликованного жилья' })
  getPublic(@Param('idOrSlug') idOrSlug: string) {
    return this.properties.getPublic(idOrSlug);
  }
}

@Module({
  controllers: [PropertiesController, AmenitiesController],
  providers: [PropertiesService, PropertyPhotosService, PropertyAvailabilityService],
})
export class PropertiesModule {}
