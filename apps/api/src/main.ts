import 'reflect-metadata';
/** Точка входа NestJS API */
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { logger } from '@seller/shared';
import { AppModule } from './app.module.js';
import { LoggerService } from './logger/logger.service.js';

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
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  appRef = app;
  app.useLogger(app.get(LoggerService));
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Seller API')
    .setDescription('API для управления товарами на Ozon и Wildberries')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const openApiDoc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, openApiDoc);

  await app.listen(3000);
}

bootstrap();
