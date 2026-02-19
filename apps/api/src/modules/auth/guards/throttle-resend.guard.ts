import { Injectable } from '@nestjs/common';
import { ThrottleByEmailGuard } from './throttle-by-email.guard.js';

@Injectable()
export class ThrottleResendGuard extends ThrottleByEmailGuard {
  protected readonly keyPrefix = 'resend';
}
