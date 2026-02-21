/** Сервис аутентификации — регистрация, вход, верификация, сброс пароля */
import { Inject } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { User, CompanyMember } from '@seller/typeorm';
import { ConfigService } from '../../shared/config/config.service.js';
import {
  REDIS_TOKEN,
  type RedisClient,
} from '../../shared/redis/redis.module.js';
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

const RESEND_THROTTLE_TTL = 60;
const RESEND_KEY_PREFIX = 'rate:resend:';
const SALT_ROUNDS = 10;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CompanyMember)
    private readonly memberRepo: Repository<CompanyMember>,
    private readonly jwt: JwtService,
    private readonly tokenStore: AuthTokenStore,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
    @Inject(REDIS_TOKEN) private readonly redis: RedisClient
  ) {}

  /** Регистрация: создаёт User, ставит job на отправку письма верификации */
  async register(data: RegisterInput): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    try {
      const user = this.userRepo.create({ email: data.email, passwordHash });
      await this.userRepo.save(user);
      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(rawToken);
      await this.tokenStore.invalidateEmailVerificationForUser(user.id);
      await this.tokenStore.setEmailVerificationToken(user.id, tokenHash);
      const baseUrl = this.config.cfg.server.frontendUrl;
      const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;
      await this.tokenStore.setPendingVerifyUrl(user.id, verifyUrl);
      await this.emailQueue.addVerifyEmail(user.id, user.email);
      await this.setResendThrottle(user.email);
      return {
        message: 'Проверьте почту. Ссылка для подтверждения отправлена.',
      };
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === '23505') {
        throw new ConflictException('Email уже зарегистрирован');
      }
      throw err;
    }
  }

  /** Верификация email: токен из письма, выдаёт JWT */
  async verifyEmail(data: VerifyEmailInput): Promise<{
    accessToken: string;
    user: UserResponse;
    memberships: MeResponse['memberships'];
    requiresCompany?: boolean;
  }> {
    const tokenHash = hashToken(data.token);
    const userId =
      await this.tokenStore.getUserIdByEmailVerificationToken(tokenHash);
    if (!userId) {
      throw new BadRequestException('Ссылка устарела. Запросите новое письмо.');
    }
    await this.userRepo.update({ id: userId }, { emailVerifiedAt: new Date() });
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { companyMembers: { company: true } },
    });
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    const memberships = user.companyMembers.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      role: m.role,
      isActive: m.company.isActive,
    }));
    const requiresCompany = memberships.length === 0;
    const activeCompanyId = requiresCompany
      ? undefined
      : (this.resolveActiveCompany(user, undefined) ?? undefined);
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      activeCompanyId: activeCompanyId ?? undefined,
    });
    return {
      accessToken,
      user: this.toUserResponse(user, activeCompanyId),
      memberships,
      ...(requiresCompany && { requiresCompany: true }),
    };
  }

  /** Повторная отправка письма верификации */
  async resendVerification(
    data: ResendVerificationInput
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: data.email } });
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

  /** Оставшееся время (сек) до возможности повторной отправки — 0 если можно отправить */
  async getResendCooldown(email: string): Promise<number> {
    const key = `${RESEND_KEY_PREFIX}${email.trim().toLowerCase()}`;
    const ttl = await this.redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  }

  private async setResendThrottle(email: string): Promise<void> {
    const key = `${RESEND_KEY_PREFIX}${email.trim().toLowerCase()}`;
    await this.redis.set(key, '1', 'EX', RESEND_THROTTLE_TTL);
  }

  /** Вход: проверка emailVerifiedAt, выдача JWT с memberships */
  async login(data: LoginInput, companyId?: string): Promise<LoginResponse> {
    const user = await this.userRepo.findOne({
      where: { email: data.email },
      relations: { companyMembers: { company: true } },
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
    const memberships = user.companyMembers.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      role: m.role,
      isActive: m.company.isActive,
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
    const user = await this.userRepo.findOne({
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
    await this.userRepo.update({ id: userId }, { passwordHash });
    return { message: 'Пароль изменён. Войдите в систему.' };
  }

  /** Сменить активную компанию: проверка членства, сохранение lastActiveCompanyId */
  async setActiveCompany(
    userId: string,
    companyId: string
  ): Promise<{
    accessToken: string;
    user: UserResponse;
    memberships: MeResponse['memberships'];
  }> {
    const member = await this.memberRepo.findOne({
      where: { userId, companyId },
      relations: {
        user: { companyMembers: { company: true } },
        company: true,
      },
    });
    if (!member) {
      throw new UnauthorizedException('Вы не состоите в этой компании');
    }
    await this.userRepo.update(
      { id: userId },
      { lastActiveCompanyId: companyId }
    );
    const accessToken = this.jwt.sign({
      sub: member.userId,
      email: member.user.email,
      activeCompanyId: companyId,
    });
    const memberships = member.user.companyMembers.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      role: m.role,
      isActive: m.company.isActive,
    }));
    return {
      accessToken,
      user: this.toUserResponse(member.user, companyId),
      memberships,
    };
  }

  /** Текущий пользователь по JWT — без TenantGuard */
  async me(userId: string): Promise<MeResponse> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { companyMembers: { company: true } },
    });
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Подтвердите email. Проверьте почту или запросите новое письмо.'
      );
    }
    const memberships = user.companyMembers.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      role: m.role,
      isActive: m.company.isActive,
    }));
    const requiresCompany = memberships.length === 0;
    const activeCompanyId = requiresCompany
      ? undefined
      : (this.resolveActiveCompany(user, undefined) ?? undefined);
    const result: MeResponse = {
      ...this.toUserResponse(user, activeCompanyId),
      memberships,
      ...(requiresCompany && { requiresCompany: true }),
    };
    if (activeCompanyId) {
      result.accessToken = this.jwt.sign({
        sub: user.id,
        email: user.email,
        activeCompanyId,
      });
    }
    return result;
  }

  /** Приоритет: companyId из аргумента, lastActiveCompanyId (если в memberships), иначе первая компания */
  private resolveActiveCompany(
    user: {
      companyMembers: { companyId: string }[];
      lastActiveCompanyId: string | null;
    },
    companyId?: string
  ): string | null {
    const ids = user.companyMembers.map((m) => m.companyId);
    if (companyId && ids.includes(companyId)) return companyId;
    if (user.lastActiveCompanyId && ids.includes(user.lastActiveCompanyId)) {
      return user.lastActiveCompanyId;
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
  memberships: {
    companyId: string;
    companyName: string;
    role: string;
    isActive: boolean;
  }[];
  requiresCompany?: boolean;
}

export interface MeResponse extends UserResponse {
  memberships: {
    companyId: string;
    companyName: string;
    role: string;
    isActive: boolean;
  }[];
  requiresCompany?: boolean;
  /** Новый JWT с activeCompanyId — для гидратации, чтобы tenant-запросы проходили */
  accessToken?: string;
}
