/** Модуль отправки email */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'node:path';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter.js';
import { ConfigService } from '../../shared/config/config.service.js';
import { EmailService } from './email.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const smtp = config.cfg.smtp;
        if (!smtp.host) {
          return {
            transport: { jsonTransport: true },
            defaults: { from: smtp.from },
            template: {
              dir: join(__dirname, 'templates'),
              adapter: new PugAdapter(),
              options: { strict: true },
            },
          };
        }
        return {
          transport: {
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth:
              smtp.user && smtp.password
                ? { user: smtp.user, pass: smtp.password }
                : undefined,
            ...(smtp.host === 'localhost' && { ignoreTLS: true }),
          },
          defaults: { from: smtp.from },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new PugAdapter(),
            options: { strict: true },
          },
        };
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
