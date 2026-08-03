import { Body, Controller, DefaultValuePipe, Get, Module, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { CreateExchangeMessageDto } from './dto/exchange-message.dto';
import { CreateExchangeReviewDto } from './dto/exchange-review.dto';
import { CancelConfirmedExchangeDto, CreateExchangeRequestDto } from './dto/exchange-request.dto';
import { ExchangeMessagesService } from './exchange-messages.service';
import { ExchangeRealtimeGateway } from './exchange-realtime.gateway';
import { ExchangeReviewsService } from './exchange-reviews.service';
import { ExchangesService } from './exchanges.service';

@ApiTags('exchanges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'exchanges', version: '1' })
class ExchangesController {
  constructor(private readonly exchanges: ExchangesService, private readonly messages: ExchangeMessagesService, private readonly reviews: ExchangeReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Входящие или исходящие заявки на обмен' })
  list(
    @Req() request: Request & AuthenticatedRequest,
    @Query('direction', new DefaultValuePipe('incoming')) direction: 'incoming' | 'outgoing',
  ) {
    return this.exchanges.list(request.user.sub, direction === 'outgoing' ? 'outgoing' : 'incoming');
  }

  @Post()
  @ApiOperation({ summary: 'Создать заявку на обмен' })
  create(@Req() request: Request & AuthenticatedRequest, @Body() dto: CreateExchangeRequestDto) {
    return this.exchanges.create(request.user.sub, dto);
  }

  @Post(':id/preapprove')
  @ApiOperation({ summary: 'Предварительно одобрить входящую заявку' })
  preapprove(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.exchanges.preapprove(request.user.sub, id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Подтвердить предварительно одобренную заявку' })
  confirm(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.exchanges.confirm(request.user.sub, id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Отклонить входящую заявку' })
  reject(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.exchanges.reject(request.user.sub, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Отменить исходящую заявку' })
  cancel(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.exchanges.cancel(request.user.sub, id);
  }

  @Post(':id/cancel-confirmed')
  @ApiOperation({ summary: 'Отменить подтверждённый обмен и освободить резерв' })
  cancelConfirmed(
    @Req() request: Request & AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelConfirmedExchangeDto,
  ) {
    return this.exchanges.cancelConfirmed(request.user.sub, id, dto.reason);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Завершить обмен после даты выезда' })
  complete(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.exchanges.complete(request.user.sub, id);
  }

  @Get(':id/messages')
  messagesList(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.messages.list(request.user.sub, id);
  }

  @Post(':id/messages')
  messageCreate(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateExchangeMessageDto) {
    return this.messages.create(request.user.sub, id, dto.body);
  }

  @Post(':id/reviews')
  reviewCreate(@Req() request: Request & AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateExchangeReviewDto) {
    return this.reviews.create(request.user.sub, id, dto);
  }
}

@Module({ imports: [AuthModule, NotificationsModule], controllers: [ExchangesController], providers: [ExchangesService, ExchangeMessagesService, ExchangeReviewsService, ExchangeRealtimeGateway] })
export class ExchangesModule {}
