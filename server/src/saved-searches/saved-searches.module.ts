import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Module, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto/saved-search.dto';
import { SavedSearchesService } from './saved-searches.service';

@ApiTags('saved searches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'saved-searches', version: '1' })
class SavedSearchesController {
  constructor(private readonly savedSearches: SavedSearchesService) {}

  @Get()
  @ApiOperation({ summary: 'Сохранённые поиски пользователя' })
  list(@Req() request: Request & AuthenticatedRequest) {
    return this.savedSearches.list(request.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Сохранить параметры поиска' })
  create(@Req() request: Request & AuthenticatedRequest, @Body() dto: CreateSavedSearchDto) {
    return this.savedSearches.create(request.user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменить сохранённый поиск' })
  update(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    return this.savedSearches.update(request.user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить сохранённый поиск' })
  remove(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.savedSearches.remove(request.user.sub, id);
  }
}

@Module({ controllers: [SavedSearchesController], providers: [SavedSearchesService] })
export class SavedSearchesModule {}
