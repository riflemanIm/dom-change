import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const port = Number(config.get<string>('SMTP_PORT', '1025'));
    const user = config.get<string>('SMTP_USER')?.trim();
    const password = config.get<string>('SMTP_PASSWORD');
    this.from = config.get<string>('SMTP_FROM', '"DomObmen" <noreply@domobmen.local>');
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port,
      secure: config.get<string>('SMTP_SECURE') === 'true' || port === 465,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });
  }

  async sendVerificationCode(email: string, code: string) {
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.log(`Код подтверждения для ${email}: ${code}`);
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Подтвердите email в DomObmen',
        text: `Ваш код подтверждения: ${code}. Код действует 15 минут.`,
      });
    } catch (error) {
      this.logger.warn(`Не удалось отправить письмо через SMTP: ${(error as Error).message}`);
    }
  }

  async sendPasswordReset(email: string, resetUrl: string) {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Восстановление пароля DomObmen',
        text: `Чтобы установить новый пароль, перейдите по ссылке: ${resetUrl}. Ссылка действует 30 минут. Если вы не запрашивали восстановление, проигнорируйте письмо.`,
      });
    } catch (error) {
      this.logger.warn(`Не удалось отправить письмо через SMTP: ${(error as Error).message}`);
    }
  }
}
