/** Модуль аутентификации */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '../../shared/config/config.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthTokenStore } from './auth-token.store.js';
import { JwtStrategy } from './jwt.strategy.js';
import { ThrottleResendGuard } from './guards/throttle-resend.guard.js';
import { ThrottleForgotGuard } from './guards/throttle-forgot.guard.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }) as never,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.cfg.jwt.secret,
        signOptions: { expiresIn: '7d' },
      }),
    }) as never,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenStore,
    JwtStrategy,
    ThrottleResendGuard,
    ThrottleForgotGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
