/** Сервис отправки писем верификации и сброса пароля */
import { Inject, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { createLogger } from '@seller/shared';
import type { EmailConfig } from './email.config.js';

export const EMAIL_CONFIG = 'EMAIL_CONFIG';

@Injectable()
export class EmailService {
  private readonly log = createLogger(EmailService.name);
  constructor(
    private readonly mailer: MailerService,
    @Inject(EMAIL_CONFIG) private readonly config: EmailConfig
  ) {}

  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    if (this.config.smtp.dryRun) {
      this.log.i('DRY_RUN: verify email', { to, verifyUrl });
      return;
    }
    if (!this.config.smtp.host) {
      this.log.i('Verify email (jsonTransport — ссылка для теста)', {
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

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (this.config.smtp.dryRun) {
      this.log.i('DRY_RUN: reset password', { to, resetUrl });
      return;
    }
    if (!this.config.smtp.host) {
      this.log.i('Reset password (jsonTransport — ссылка для теста)', {
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
