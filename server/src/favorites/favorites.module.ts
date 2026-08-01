import { Controller, Delete, Get, HttpCode, HttpStatus, Module, Param, ParseUUIDPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PropertiesModule } from '../properties/properties.module';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'favorites', version: '1' })
class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Избранные объявления' })
  list(@Req() request: Request & AuthenticatedRequest) {
    return this.favorites.list(request.user.sub);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Идентификаторы избранных объявлений' })
  ids(@Req() request: Request & AuthenticatedRequest) {
    return this.favorites.ids(request.user.sub);
  }

  @Put(':propertyId')
  @ApiOperation({ summary: 'Добавить объявление в избранное' })
  add(
    @Req() request: Request & AuthenticatedRequest,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.favorites.add(request.user.sub, propertyId);
  }

  @Delete(':propertyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить объявление из избранного' })
  remove(
    @Req() request: Request & AuthenticatedRequest,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.favorites.remove(request.user.sub, propertyId);
  }
}

@Module({
  imports: [PropertiesModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
