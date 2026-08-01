import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ExchangeRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateExchangeReviewDto } from './dto/exchange-review.dto';

@Injectable()
export class ExchangeReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, exchangeRequestId: string, dto: CreateExchangeReviewDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.exchangeRequest.findUnique({ where: { id: exchangeRequestId } });
        if (!request || (request.requesterId !== authorId && request.hostId !== authorId)) throw new NotFoundException('Заявка не найдена');
        if (request.status !== ExchangeRequestStatus.COMPLETED) throw new UnprocessableEntityException('Оставить отзыв можно после завершения обмена');
        const subjectId = request.requesterId === authorId ? request.hostId : request.requesterId;
        const review = await tx.exchangeReview.create({
          data: { exchangeRequestId, authorId, subjectId, ...dto, comment: dto.comment.trim() },
          include: { author: { select: { profile: { select: { displayName: true, avatarUrl: true } } } } },
        });
        const subjectWasHost = subjectId === request.hostId;
        const average = await tx.exchangeReview.aggregate({
          where: {
            subjectId,
            exchangeRequest: subjectWasHost ? { hostId: subjectId } : { requesterId: subjectId },
          },
          _avg: { rating: true },
        });
        await tx.userProfile.update({
          where: { userId: subjectId },
          data: subjectWasHost ? { hostRating: average._avg.rating } : { guestRating: average._avg.rating },
        });
        await tx.notification.create({
          data: { userId: subjectId, type: 'EXCHANGE_REVIEW', title: 'Новый отзыв', body: dto.comment.trim().slice(0, 160), link: '/account/exchanges' },
        });
        return review;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Вы уже оставили отзыв об этом обмене');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException('Отзыв уже обрабатывается, повторите запрос');
      throw error;
    }
  }
}
