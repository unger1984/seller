import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger } from '@seller/shared';

/** Адаптер Winston → NestJS LoggerService. */
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger = createLogger(LoggerService.name);

  log(message: unknown, ...optionalParams: unknown[]) {
    this.logger.i(String(message), ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.logger.e(String(message), ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.logger.w(String(message), ...optionalParams);
  }

  debug?(message: unknown, ...optionalParams: unknown[]) {
    this.logger.d(String(message), ...optionalParams);
  }

  verbose?(message: unknown, ...optionalParams: unknown[]) {
    this.logger.i(String(message), ...optionalParams);
  }
}
