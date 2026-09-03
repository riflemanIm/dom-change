import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { RateLimitExceededException, RateLimitService } from './rate-limit.service';

describe('Redis rate limiter integration', () => {
  let limiter: RateLimitService;

  beforeAll(async () => {
    limiter = new RateLimitService(new ConfigService({ REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379' }));
    await limiter.onModuleInit();
  });

  afterAll(async () => limiter.onApplicationShutdown());

  it('shares one limit across normalized identities and returns retry time', async () => {
    const scope = `integration-normalized-${randomUUID()}`;
    await limiter.consume(scope, 'User@Example.Test', 2, 30);
    await limiter.consume(scope, ' user@example.test ', 2, 30);

    let rejection: unknown;
    try {
      await limiter.consume(scope, 'USER@EXAMPLE.TEST', 2, 30);
    } catch (error) {
      rejection = error;
    }
    expect(rejection).toBeInstanceOf(RateLimitExceededException);
    expect((rejection as RateLimitExceededException).retryAfter).toBeGreaterThan(0);
    expect((rejection as RateLimitExceededException).retryAfter).toBeLessThanOrEqual(30);
  });

  it('enforces the limit atomically for concurrent requests', async () => {
    const scope = `integration-concurrent-${randomUUID()}`;
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => limiter.consume(scope, 'same-client', 4, 30)),
    );
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(4);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(8);
    for (const result of results) {
      if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(RateLimitExceededException);
    }
  });
});
