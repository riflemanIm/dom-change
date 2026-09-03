import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { RateLimitExceededException } from './rate-limit.service';

@Catch(RateLimitExceededException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  catch(exception: RateLimitExceededException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.setHeader('Retry-After', String(exception.retryAfter));
    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message: exception.message,
      error: 'Too Many Requests',
    });
  }
}
