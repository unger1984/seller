/** Сервис аутентификации — регистрация, вход, JWT */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginInput, RegisterInput } from '@seller/shared-types';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  /** Регистрация пользователя (без компании) */
  async register(data: RegisterInput) {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
      },
    });
    return this.toUserResponse(user);
  }

  /** Вход: проверка пароля, выдача JWT. companyId — для active company в токене */
  async login(
    data: LoginInput,
    companyId?: string
  ): Promise<{ accessToken: string; user: UserResponse }> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
      include: { companyMembers: { include: { company: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const activeCompanyId = this.resolveActiveCompany(user, companyId);
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

  /** Сменить активную компанию — проверка CompanyMember, выдача нового JWT */
  async setActiveCompany(
    userId: string,
    companyId: string
  ): Promise<{ accessToken: string; user: UserResponse }> {
    const member = await this.prisma.companyMember.findUnique({
      where: { userId_companyId: { userId, companyId } },
      include: { user: true, company: true },
    });
    if (!member) {
      throw new UnauthorizedException('Not a member of this company');
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

  /** Текущий пользователь по JWT */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyMembers: { include: { company: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const memberships = user.companyMembers.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      role: m.role,
    }));
    let activeCompanyId: string | null = null;
    if (memberships.length === 1) {
      activeCompanyId = memberships[0].companyId;
    }
    return {
      ...this.toUserResponse(user, activeCompanyId),
      memberships,
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
    user: { id: string; email: string; name: string | null },
    activeCompanyId?: string | null
  ): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      activeCompanyId: activeCompanyId ?? undefined,
    };
  }
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  activeCompanyId?: string;
}
