import { Injectable } from '@nestjs/common';
import { ThrottleByEmailGuard } from './throttle-by-email.guard.js';

@Injectable()
export class ThrottleForgotGuard extends ThrottleByEmailGuard {
  protected readonly keyPrefix = 'forgot';
}
