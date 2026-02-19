/** Фабрика чтения и валидации конфигурации из env */
import { createLogger } from '@seller/shared';
import { config as loadEnv } from 'dotenv';

const log = createLogger('Config');
import type {
  Config,
  ConfigCredentials,
  ConfigDb,
  ConfigJwt,
  ConfigRedis,
  ConfigServer,
  ConfigSmtp,
} from './config.types.js';

const REQUIRED = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'CREDENTIALS_ENCRYPTION_KEY',
  'FRONTEND_URL',
] as const;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    log.e(`Обязательная переменная ${name} не задана. Добавьте в .env`);
    process.exit(1);
  }
  return v.trim();
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name]?.trim() ?? defaultValue;
}

/** Читает env, валидирует обязательные ключи, возвращает Config */
export function readConfig(): Config {
  loadEnv({
    path: process.env.APP_ENV === 'stage' ? '.env.stage' : '.env',
  });

  for (const key of REQUIRED) {
    requireEnv(key);
  }

  const server: ConfigServer = {
    port: parseInt(optionalEnv('PORT', '8084'), 10),
    corsOrigins: (optionalEnv('CORS_ORIGINS', ''))
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    frontendUrl: requireEnv('FRONTEND_URL'),
  };

  const db: ConfigDb = {
    databaseUrl: requireEnv('DATABASE_URL'),
  };

  const redis: ConfigRedis = {
    url: requireEnv('REDIS_URL'),
  };

  const jwt: ConfigJwt = {
    secret: requireEnv('JWT_SECRET'),
  };

  const credentials: ConfigCredentials = {
    encryptionKey: requireEnv('CREDENTIALS_ENCRYPTION_KEY'),
  };

  const smtp: ConfigSmtp = {
    host: process.env.SMTP_HOST?.trim() || undefined,
    port: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
    secure: optionalEnv('SMTP_SECURE', 'false') === 'true',
    user: process.env.SMTP_USER?.trim() || undefined,
    password: process.env.SMTP_PASSWORD?.trim() || undefined,
    from: optionalEnv('SMTP_FROM', 'noreply@seller.local'),
    dryRun: optionalEnv('SMTP_DRY_RUN', 'false') === 'true',
  };

  return {
    get env() {
      return process.env.NODE_ENV ?? 'development';
    },
    get server() {
      return server;
    },
    get db() {
      return db;
    },
    get redis() {
      return redis;
    },
    get jwt() {
      return jwt;
    },
    get credentials() {
      return credentials;
    },
    get smtp() {
      return smtp;
    },
  };
}
