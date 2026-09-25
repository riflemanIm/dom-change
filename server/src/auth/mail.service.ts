import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly host: string;
  private readonly production: boolean;

  constructor(private readonly config: ConfigService) {
    const port = Number(config.get<string>('SMTP_PORT', '1025'));
    const user = config.get<string>('SMTP_USER')?.trim();
    const password = config.get<string>('SMTP_PASSWORD');
    this.host = config.get<string>('SMTP_HOST', 'localhost').trim();
    this.production = config.get<string>('NODE_ENV') === 'production';
    this.from = config.get<string>('SMTP_FROM', '"DomObmen" <noreply@domobmen.local>');
    this.transporter = nodemailer.createTransport({
      host: this.host,
      port,
      secure: config.get<string>('SMTP_SECURE') === 'true' || port === 465,
      requireTLS: port === 587,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });
  }

  async verifyReady() {
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const password = this.config.get<string>('SMTP_PASSWORD');
    if (this.production && (this.host === 'mailpit' || this.host === 'localhost' || !user || !password)) {
      throw new ServiceUnavailableException('Отправка писем пока не настроена. Попробуйте позже.');
    }
    try {
      await this.transporter.verify();
    } catch (error) {
      this.logger.error(`Проверка SMTP не прошла: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Почта временно недоступна. Попробуйте позже.');
    }
  }

  private async send(email: string, subject: string, content: string) {
    await this.verifyReady();
    try {
      await this.transporter.sendMail({ from: this.from, to: email, subject, text: content });
    } catch (error) {
      this.logger.error(`Не удалось отправить письмо через SMTP: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Не удалось отправить письмо. Попробуйте позже.');
    }
  }

  async sendVerificationCode(email: string, code: string) {
    if (!this.production) this.logger.log(`Код подтверждения для ${email}: ${code}`);
    await this.send(email, 'Подтвердите email в DomObmen', `Ваш код подтверждения: ${code}. Код действует 15 минут.`);
  }

  async sendPasswordReset(email: string, resetUrl: string) {
    await this.send(
      email,
      'Восстановление пароля DomObmen',
      `Чтобы установить новый пароль, перейдите по ссылке: ${resetUrl}. Ссылка действует 30 минут. Если вы не запрашивали восстановление, проигнорируйте письмо.`,
    );
  }
}
