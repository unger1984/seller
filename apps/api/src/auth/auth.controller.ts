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
  LoginSchema,
  RegisterSchema,
} from '@seller/shared-types';
import type { LoginInput, RegisterInput } from '@seller/shared-types';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { Request } from 'express';

/** DTO входа — cast к zod из api для обхода TS2742 */
class LoginDto extends createZodDto(LoginSchema as z.ZodTypeAny) {}

/** DTO регистрации */
class RegisterDto extends createZodDto(RegisterSchema as z.ZodTypeAny) {}

/** DTO смены активной компании */
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

  @Post('login')
  @ApiOperation({ summary: 'Вход' })
  @ApiBody({ type: LoginDto })
  @ApiQuery({ name: 'companyId', required: false })
  async login(@Body() body: LoginDto, @Query('companyId') companyId?: string) {
    return this.auth.login(body as LoginInput, companyId);
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
