/** Контроллер аутентификации */
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import type { z } from 'zod';
import {
  ActiveCompanySchema,
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from '@seller/shared-types';
import type {
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  VerifyEmailInput,
  ResetPasswordInput,
} from '@seller/shared-types';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard.js';
import { ThrottleResendGuard } from './guards/throttle-resend.guard.js';
import { ThrottleForgotGuard } from './guards/throttle-forgot.guard.js';
import { Request } from 'express';

class LoginDto extends createZodDto(LoginSchema as z.ZodTypeAny) {}
class RegisterDto extends createZodDto(RegisterSchema as z.ZodTypeAny) {}
class ResendVerificationDto extends createZodDto(
  ResendVerificationSchema as z.ZodTypeAny
) {}
class ForgotPasswordDto extends createZodDto(
  ForgotPasswordSchema as z.ZodTypeAny
) {}
class VerifyEmailDto extends createZodDto(VerifyEmailSchema as z.ZodTypeAny) {}
class ResetPasswordDto extends createZodDto(
  ResetPasswordSchema as z.ZodTypeAny
) {}
class ActiveCompanyDto extends createZodDto(
  ActiveCompanySchema as z.ZodTypeAny
) {}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() body: RegisterDto) {
    return this.auth.register(body as RegisterInput);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Подтверждение email' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.auth.verifyEmail(body as VerifyEmailInput);
  }

  @Post('resend-verification')
  @UseGuards(ThrottleResendGuard)
  @ApiOperation({ summary: 'Повторная отправка письма верификации' })
  @ApiBody({ type: ResendVerificationDto })
  async resendVerification(@Body() body: ResendVerificationDto) {
    return this.auth.resendVerification(body as ResendVerificationInput);
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход' })
  @ApiBody({ type: LoginDto })
  @ApiQuery({ name: 'companyId', required: false })
  async login(@Body() body: LoginDto, @Query('companyId') companyId?: string) {
    return this.auth.login(body as LoginInput, companyId);
  }

  @Post('forgot-password')
  @UseGuards(ThrottleForgotGuard)
  @ApiOperation({ summary: 'Запрос сброса пароля' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body as ForgotPasswordInput);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Установка нового пароля' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body as ResetPasswordInput);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Текущий пользователь' })
  async me(@Req() req: Request & { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Unauthorized');
    return this.auth.me(userId);
  }

  @Patch('me/active-company')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Сменить активную компанию' })
  @ApiBody({ type: ActiveCompanyDto })
  async setActiveCompany(
    @Body() body: ActiveCompanyDto,
    @Req() req: Request & { user?: { userId: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Unauthorized');
    return this.auth.setActiveCompany(userId, body.companyId);
  }
}
