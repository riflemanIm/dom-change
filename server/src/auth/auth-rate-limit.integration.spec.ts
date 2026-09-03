import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { AppModule } from '../app.module';

describe('Auth rate limit integration', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 30_000);

  afterAll(async () => app.close());

  it('returns 429 and Retry-After after repeated login attempts', async () => {
    const email = `rate-limit-${crypto.randomUUID()}@example.test`;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await login(email);
      expect(response.status).toBe(401);
    }

    const blocked = await login(email);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    await expect(blocked.json()).resolves.toMatchObject({
      statusCode: 429,
      message: 'Слишком много запросов. Попробуйте позже',
      error: 'Too Many Requests',
    });
  });

  function login(email: string) {
    return fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'WrongPassword123' }),
    });
  }
});
