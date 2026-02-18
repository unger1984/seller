/** Конфигурация приложения */
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        ...(process.env.APP_ENV === 'stage' ? ['.env.stage'] : []),
        '.env',
      ],
    }) as never,
  ],
})
export class ConfigModule {}
