import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger } from '@seller/shared';

const logApi = createLogger('API');

/** Адаптер Winston → NestJS LoggerService. */
@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: unknown, ...optionalParams: unknown[]) {
    logApi.i(String(message), ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    logApi.e(String(message), ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    logApi.w(String(message), ...optionalParams);
  }

  debug?(message: unknown, ...optionalParams: unknown[]) {
    logApi.d(String(message), ...optionalParams);
  }

  verbose?(message: unknown, ...optionalParams: unknown[]) {
    logApi.i(String(message), ...optionalParams);
  }
}
