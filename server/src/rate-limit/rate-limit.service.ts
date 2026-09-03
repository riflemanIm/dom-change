import { HttpException, HttpStatus, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { createClient, RedisClientType } from 'redis';

const consumeScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`;

export class RateLimitExceededException extends HttpException {
  constructor(readonly retryAfter: number) {
    super('Слишком много запросов. Попробуйте позже', HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class RateLimitService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly client: RedisClientType;
  private available = false;

  constructor(config: ConfigService) {
    this.client = createClient({ url: config.get<string>('REDIS_URL', 'redis://localhost:6379') });
    this.client.on('error', (error) => {
      if (this.available) this.logger.warn(`Redis rate limiter unavailable: ${error.message}`);
      this.available = false;
    });
    this.client.on('ready', () => { this.available = true; });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.available = true;
    } catch (error) {
      this.logger.warn(`Redis rate limiter disabled: ${(error as Error).message}`);
    }
  }

  async onApplicationShutdown() {
    if (this.client.isOpen) await this.client.quit().catch(() => this.client.destroy());
  }

  async consume(scope: string, identity: string | undefined, limit: number, windowSeconds: number) {
    if (!identity || !this.available) return;
    const digest = createHash('sha256').update(identity.trim().toLocaleLowerCase('ru')).digest('hex');
    try {
      const result = await this.client.eval(consumeScript, {
        keys: [`rate-limit:${scope}:${digest}`],
        arguments: [String(windowSeconds)],
      }) as [number, number];
      const [count, ttl] = result.map(Number);
      if (count > limit) throw new RateLimitExceededException(Math.max(1, ttl));
    } catch (error) {
      if (error instanceof RateLimitExceededException) throw error;
      this.available = false;
      this.logger.warn(`Redis rate limiter failed open: ${(error as Error).message}`);
    }
  }
}
