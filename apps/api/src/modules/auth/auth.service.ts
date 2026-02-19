/** Сервис аутентификации — регистрация, вход, верификация, сброс пароля */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ConfigService } from '../../shared/config/config.service.js';
import { AuthTokenStore } from './auth-token.store.js';
import { EmailQueueService } from './email-queue.service.js';
import type {
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  VerifyEmailInput,
  ResetPasswordInput,
} from '@seller/shared-types';

const SALT_ROUNDS = 10;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tokenStore: AuthTokenStore,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService
  ) {}

  /** Регистрация: создаёт User, ставит job на отправку письма верификации */
  async register(data: RegisterInput): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: { email: data.email, passwordHash },
      });
      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(rawToken);
      await this.tokenStore.invalidateEmailVerificationForUser(user.id);
      await this.tokenStore.setEmailVerificationToken(user.id, tokenHash);
      const baseUrl = this.config.cfg.server.frontendUrl;
      const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;
      await this.tokenStore.setPendingVerifyUrl(user.id, verifyUrl);
      await this.emailQueue.addVerifyEmail(user.id, user.email);
      return {
        message: 'Проверьте почту. Ссылка для подтверждения отправлена.',
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email уже зарегистрирован');
      }
      throw err;
    }
  }

  /** Верификация email: токен из письма, выдаёт JWT */
  async verifyEmail(
    data: VerifyEmailInput
  ): Promise<{ accessToken: string; user: UserResponse }> {
    const tokenHash = hashToken(data.token);
    const userId =
      await this.tokenStore.getUserIdByEmailVerificationToken(tokenHash);
    if (!userId) {
      throw new BadRequestException('Ссылка устарела. Запросите новое письмо.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { companyMembers: { include: { company: true } } },
    });
    const activeCompanyId = this.resolveActiveCompany(user, undefined);
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      activeCompanyId: activeCompanyId ?? undefined,
    });
    return {
      accessToken,
      user: this.toUserResponse(user, activeCompanyId),
    };
  }

  /** Повторная отправка письма верификации */
  async resendVerification(
    data: ResendVerificationInput
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      return { message: 'Если email зарегистрирован, письмо отправлено.' };
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException(
        'Email уже подтверждён. Войдите в систему.'
      );
    }
    await this.tokenStore.invalidateEmailVerificationForUser(user.id);
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    await this.tokenStore.setEmailVerificationToken(user.id, tokenHash);
    const baseUrl = this.config.cfg.server.frontendUrl;
    const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;
    await this.tokenStore.setPendingVerifyUrl(user.id, verifyUrl);
    await this.emailQueue.addVerifyEmail(user.id, user.email);
    return { message: 'Письмо отправлено. Проверьте почту.' };
  }

  /** Вход: проверка emailVerifiedAt, isActive, выдача JWT с memberships */
  async login(data: LoginInput, companyId?: string): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
      include: { companyMembers: { include: { company: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Подтвердите email. Проверьте почту или запросите новое письмо.'
      );
    }
    if (!user.isActive) {
      throw new ForbiddenException('Аккаунт не активирован');
    }
    const memberships = user.companyMembers.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      role: m.role,
    }));
    const requiresCompany = memberships.length === 0;
    const activeCompanyId = requiresCompany
      ? undefined
      : this.resolveActiveCompany(user, companyId);
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      activeCompanyId: activeCompanyId ?? undefined,
    });
    return {
      accessToken,
      user: this.toUserResponse(user, activeCompanyId ?? undefined),
      memberships,
      ...(requiresCompany && { requiresCompany: true }),
    };
  }

  /** Запрос сброса пароля */
  async forgotPassword(
    data: ForgotPasswordInput
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      return { message: 'Если email зарегистрирован, письмо отправлено.' };
    }
    await this.tokenStore.invalidatePasswordResetForUser(user.id);
    const requestId = randomUUID();
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    await this.tokenStore.setPasswordResetToken(user.id, tokenHash);
    const baseUrl = this.config.cfg.server.frontendUrl;
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
    await this.tokenStore.setPendingResetUrl(requestId, resetUrl);
    await this.emailQueue.addResetPassword(requestId, user.email);
    return { message: 'Если email зарегистрирован, письмо отправлено.' };
  }

  /** Установка нового пароля по токену */
  async resetPassword(data: ResetPasswordInput): Promise<{ message: string }> {
    const tokenHash = hashToken(data.token);
    const userId =
      await this.tokenStore.getUserIdByPasswordResetToken(tokenHash);
    if (!userId) {
      throw new BadRequestException(
        'Ссылка устарела. Запросите сброс пароля снова.'
      );
    }
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { message: 'Пароль изменён. Войдите в систему.' };
  }

  /** Сменить активную компанию */
  async setActiveCompany(
    userId: string,
    companyId: string
  ): Promise<{ accessToken: string; user: UserResponse }> {
    const member = await this.prisma.companyMember.findUnique({
      where: { userId_companyId: { userId, companyId } },
      include: { user: true, company: true },
    });
    if (!member) {
      throw new UnauthorizedException('Вы не состоите в этой компании');
    }
    const accessToken = this.jwt.sign({
      sub: member.userId,
      email: member.user.email,
      activeCompanyId: companyId,
    });
    return {
      accessToken,
      user: this.toUserResponse(member.user, companyId),
    };
  }

  /** Текущий пользователь по JWT — без TenantGuard */
  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyMembers: { include: { company: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Подтвердите email. Проверьте почту или запросите новое письмо.'
      );
    }
    if (!user.isActive) {
      throw new ForbiddenException('Аккаунт не активирован');
    }
    const memberships = user.companyMembers.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      role: m.role,
    }));
    const requiresCompany = memberships.length === 0;
    let activeCompanyId: string | undefined;
    if (memberships.length === 1) {
      activeCompanyId = memberships[0].companyId;
    }
    return {
      ...this.toUserResponse(user, activeCompanyId),
      memberships,
      ...(requiresCompany && { requiresCompany: true }),
    };
  }

  private resolveActiveCompany(
    user: { companyMembers: { companyId: string }[] },
    companyId?: string
  ): string | null {
    const ids = user.companyMembers.map((m) => m.companyId);
    if (companyId && ids.includes(companyId)) {
      return companyId;
    }
    return ids[0] ?? null;
  }

  private toUserResponse(
    user: { id: string; email: string },
    activeCompanyId?: string | null
  ): UserResponse {
    return {
      id: user.id,
      email: user.email,
      activeCompanyId: activeCompanyId ?? undefined,
    };
  }
}

export interface UserResponse {
  id: string;
  email: string;
  activeCompanyId?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserResponse;
  memberships: { companyId: string; companyName: string; role: string }[];
  requiresCompany?: boolean;
}

export interface MeResponse extends UserResponse {
  memberships: { companyId: string; companyName: string; role: string }[];
  requiresCompany?: boolean;
}
