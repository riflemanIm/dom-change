import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { PointRulesService } from './point-rules.service';

describe('PointRulesService', () => {
  const pointRule = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  };
  const service = new PointRulesService(
    { pointRule } as unknown as PrismaService,
    new ConfigService({ POINTS_WELCOME_BONUS: '500', POINTS_EMAIL_VERIFICATION_BONUS: '100' }),
  );

  beforeEach(() => jest.clearAllMocks());

  it('uses the environment until an administrator saves a rule', async () => {
    pointRule.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ amount: 750 });
    await expect(service.amount('registration')).resolves.toBe(500);
    await expect(service.amount('registration')).resolves.toBe(750);
  });

  it('persists a changed rule for future accruals', async () => {
    await expect(service.update('emailVerification', 150)).resolves.toEqual({
      key: 'emailVerification', label: 'Подтверждение email', amount: 150,
    });
    expect(pointRule.upsert).toHaveBeenCalledWith({
      where: { key: 'emailVerification' }, update: { amount: 150 },
      create: { key: 'emailVerification', amount: 150 },
    });
  });
});
