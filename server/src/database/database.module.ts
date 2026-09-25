import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PointRulesService } from './point-rules.service';

@Global()
@Module({
  providers: [PrismaService, PointRulesService],
  exports: [PrismaService, PointRulesService],
})
export class DatabaseModule {}
