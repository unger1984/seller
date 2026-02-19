/** Конфиг SMTP из env — для standalone use (worker, тесты) */
export type EmailConfig = {
  smtp: {
    host?: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
    from: string;
    dryRun: boolean;
  };
  frontendUrl: string;
};

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name]?.trim() ?? defaultValue;
}

export function readEmailConfig(): EmailConfig {
  const smtp = {
    host: process.env.SMTP_HOST?.trim() || undefined,
    port: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
    secure: optionalEnv('SMTP_SECURE', 'false') === 'true',
    user: process.env.SMTP_USER?.trim() || undefined,
    password: process.env.SMTP_PASSWORD?.trim() || undefined,
    from: optionalEnv('SMTP_FROM', 'noreply@seller.local'),
    dryRun: optionalEnv('SMTP_DRY_RUN', 'false') === 'true',
  };
  const frontendUrl = optionalEnv('FRONTEND_URL', 'http://localhost:8443');
  return { smtp, frontendUrl };
}
