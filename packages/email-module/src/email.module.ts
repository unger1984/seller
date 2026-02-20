/** Nest-модуль отправки email; конфиг из env или forRootAsync */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DynamicModule, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'node:path';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter.js';
import { EmailService, EMAIL_CONFIG } from './email.service.js';
import { readEmailConfig, type EmailConfig } from './email.config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type EmailModuleOptions = {
  config?: EmailConfig;
};

function buildMailerOptions(config: EmailConfig) {
  const smtp = config.smtp;
  return {
    transport: !smtp.host
      ? { jsonTransport: true }
      : {
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          auth:
            smtp.user && smtp.password
              ? { user: smtp.user, pass: smtp.password }
              : undefined,
          ...((smtp.host === 'localhost' || smtp.host === '127.0.0.1') && {
            ignoreTLS: true,
          }),
        },
    defaults: { from: smtp.from },
    template: {
      dir: join(__dirname, 'templates'),
      adapter: new PugAdapter(),
      options: { strict: true },
    },
  };
}

@Module({})
export class EmailModule {
  static forRoot(options?: EmailModuleOptions): DynamicModule {
    const config = options?.config ?? readEmailConfig();

    return {
      module: EmailModule,
      global: true,
      imports: [MailerModule.forRoot(buildMailerOptions(config))],
      providers: [{ provide: EMAIL_CONFIG, useValue: config }, EmailService],
      exports: [EmailService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => EmailConfig | Promise<EmailConfig>;
    inject?: (string | symbol | object)[];
  }): DynamicModule {
    return {
      module: EmailModule,
      global: true,
      imports: [
        MailerModule.forRootAsync({
          useFactory: async (...args: unknown[]) => {
            const config = await Promise.resolve(options.useFactory(...args));
            return buildMailerOptions(config);
          },
          inject: (options.inject ?? []) as never[],
        }),
      ],
      providers: [
        {
          provide: EMAIL_CONFIG,
          useFactory: options.useFactory,
          inject: (options.inject ?? []) as never[],
        },
        EmailService,
      ],
      exports: [EmailService],
    };
  }
}
