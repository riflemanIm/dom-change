import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

export const POINT_RULES = {
  registration: { key: 'registration', env: 'POINTS_WELCOME_BONUS', fallback: 500, label: 'Регистрация' },
  emailVerification: { key: 'emailVerification', env: 'POINTS_EMAIL_VERIFICATION_BONUS', fallback: 100, label: 'Подтверждение email' },
} as const;

export type PointRuleKey = keyof typeof POINT_RULES;

@Injectable()
export class PointRulesService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async amount(key: PointRuleKey) {
    const rule = POINT_RULES[key];
    const saved = await this.prisma.pointRule.findUnique({ where: { key } });
    return saved?.amount ?? Number(this.config.get(rule.env) ?? rule.fallback);
  }

  async list() {
    const rows = await this.prisma.pointRule.findMany();
    const saved = new Map(rows.map((row) => [row.key, row.amount]));
    return Object.values(POINT_RULES).map((rule) => ({
      key: rule.key,
      label: rule.label,
      amount: saved.get(rule.key) ?? Number(this.config.get(rule.env) ?? rule.fallback),
    }));
  }

  async update(key: PointRuleKey, amount: number) {
    await this.prisma.pointRule.upsert({
      where: { key },
      update: { amount },
      create: { key, amount },
    });
    return { key, label: POINT_RULES[key].label, amount };
  }
}
