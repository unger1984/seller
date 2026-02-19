import 'reflect-metadata';
/** Точка входа NestJS API */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createLogger } from '@seller/shared';

const log = createLogger('App');
import { AppModule } from './app.module.js';
import { ConfigService } from './shared/config/config.service.js';
import { LoggerService } from './shared/logger/logger.service.js';

let appRef: { close: () => Promise<void> } | undefined;
let cleaningUp = false;

async function cleanup() {
  if (cleaningUp || !appRef) return;
  cleaningUp = true;
  await appRef.close();
}

process.on('SIGINT', async () => {
  log.i('SIGINT received, shutting down');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.i('SIGTERM received, shutting down');
  await cleanup();
  process.exit(0);
});

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  let httpsOptions: { key: Buffer; cert: Buffer } | undefined;
  if (!isProd) {
    const certDir = path.resolve(process.cwd(), 'tooling/certs');
    const certPath = path.join(certDir, 'localhost.pem');
    const keyPath = path.join(certDir, 'localhost-key.pem');
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      log.e('Сертификаты не найдены. Выполните: npm run certs', {
        certPath,
        keyPath,
      });
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

  const cfg = app.get(ConfigService);
  const { port, corsOrigins } = cfg.cfg.server;
  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });
  }

  const openApiConfig = new DocumentBuilder()
    .setTitle('Seller API')
    .setDescription('API для управления товарами на Ozon и Wildberries')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const openApiDoc = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, openApiDoc);

  await app.listen(port);
  const scheme = httpsOptions ? 'https' : 'http';
  log.i(`${scheme}://localhost:${port}`);
}

bootstrap();
