/** Passport JWT strategy — извлекает payload в req.user */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/** Payload JWT — userId, email, activeCompanyId */
export interface JwtPayload {
  sub: string;
  email: string;
  activeCompanyId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me'),
    });
  }

  validate(payload: { sub: string; email: string; activeCompanyId?: string }) {
    return {
      userId: payload.sub,
      email: payload.email,
      activeCompanyId: payload.activeCompanyId,
    };
  }
}
