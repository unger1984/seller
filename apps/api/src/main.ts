import 'reflect-metadata';
/** Точка входа NestJS API */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { logger } from '@seller/shared';
import { AppModule } from './app.module.js';
import { LoggerService } from './shared/logger/logger.service.js';

let appRef: { close: () => Promise<void> } | undefined;
let cleaningUp = false;

async function cleanup() {
  if (cleaningUp || !appRef) return;
  cleaningUp = true;
  await appRef.close();
}

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down');
  await cleanup();
  process.exit(0);
});

async function bootstrap() {
  const port = parseInt(process.env.PORT ?? '8084', 10);
  const isProd = process.env.NODE_ENV === 'production';

  let httpsOptions: { key: Buffer; cert: Buffer } | undefined;
  if (!isProd) {
    const certDir = path.resolve(process.cwd(), 'tooling/certs');
    const certPath = path.join(certDir, 'localhost.pem');
    const keyPath = path.join(certDir, 'localhost-key.pem');
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      logger.error(
        'Сертификаты не найдены. Выполните: npm run certs',
        { certPath, keyPath }
      );
      process.exit(1);
    }
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    ...(httpsOptions && { httpsOptions }),
  });
  appRef = app;
  app.useLogger(app.get(LoggerService));
  app.setGlobalPrefix('api');

  const raw = process.env.CORS_ORIGINS ?? '';
  const corsOrigins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });
  }

  const config = new DocumentBuilder()
    .setTitle('Seller API')
    .setDescription('API для управления товарами на Ozon и Wildberries')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const openApiDoc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, openApiDoc);

  await app.listen(port);
  const scheme = httpsOptions ? 'https' : 'http';
  logger.info(`${scheme}://localhost:${port}`, { prefix: 'API' });
}

bootstrap();
