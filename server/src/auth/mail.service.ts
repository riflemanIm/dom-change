import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port: config.get<number>('SMTP_PORT', 1025),
      secure: false,
    });
  }

  async sendVerificationCode(email: string, code: string) {
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.log(`Код подтверждения для ${email}: ${code}`);
    }
    try {
      await this.transporter.sendMail({
        from: '"DomObmen" <noreply@domobmen.local>',
        to: email,
        subject: 'Подтвердите email в DomObmen',
        text: `Ваш код подтверждения: ${code}. Код действует 15 минут.`,
      });
    } catch (error) {
      this.logger.warn(`Не удалось отправить письмо через SMTP: ${(error as Error).message}`);
    }
  }
}
