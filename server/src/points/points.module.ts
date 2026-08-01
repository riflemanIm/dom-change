import { Controller, Get, Module, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

@ApiTags('points')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'points', version: '1' })
class PointsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('history')
  @ApiOperation({ summary: 'Баланс и история операций ДомБаллов' })
  async history(@Req() request: Request & AuthenticatedRequest) {
    const account = await this.prisma.pointAccount.findUniqueOrThrow({
      where: { userId: request.user.sub },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 100 } },
    });
    return {
      available: account.available.toString(),
      reserved: account.reserved.toString(),
      pending: account.pending.toString(),
      bonus: account.bonus.toString(),
      frozen: account.frozen.toString(),
      transactions: account.transactions.map((transaction) => ({ ...transaction, amount: transaction.amount.toString() })),
    };
  }
}

@Module({ controllers: [PointsController] })
export class PointsModule {}
