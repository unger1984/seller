import 'reflect-metadata';
/** Точка входа NestJS API */
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
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
