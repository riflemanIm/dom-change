import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { RateLimitExceptionFilter } from './rate-limit.filter';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [
    RateLimitService,
    { provide: APP_FILTER, useClass: RateLimitExceptionFilter },
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
