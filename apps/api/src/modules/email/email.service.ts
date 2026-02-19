/** Сервис отправки писем верификации и сброса пароля */
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { createLogger } from '@seller/shared';
import { ConfigService } from '../../shared/config/config.service.js';

const log = createLogger('Email');

@Injectable()
export class EmailService {
  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService
  ) {}

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const baseUrl = this.config.cfg.server.frontendUrl;
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
    if (this.config.cfg.smtp.dryRun) {
      log.i('DRY_RUN: verify email', { to, verifyUrl });
      return;
    }
    if (!this.config.cfg.smtp.host) {
      log.i('Verify email (jsonTransport — ссылка для теста)', {
        to,
        verifyUrl,
        text: `Подтверждение email — перейдите: ${verifyUrl}`,
      });
    }
    await this.mailer.sendMail({
      to,
      subject: 'Подтверждение email — Seller',
      template: 'verify-email',
      context: { verifyUrl, email: to },
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const baseUrl = this.config.cfg.server.frontendUrl;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    if (this.config.cfg.smtp.dryRun) {
      log.i('DRY_RUN: reset password', { to, resetUrl });
      return;
    }
    if (!this.config.cfg.smtp.host) {
      log.i('Reset password (jsonTransport — ссылка для теста)', {
        to,
        resetUrl,
        text: `Сброс пароля — перейдите: ${resetUrl}`,
      });
    }
    await this.mailer.sendMail({
      to,
      subject: 'Сброс пароля — Seller',
      template: 'reset-password',
      context: { resetUrl, email: to },
    });
  }
}
