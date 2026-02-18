import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { logger } from '@seller/shared';

/** Адаптер Winston → NestJS LoggerService. */
@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: unknown, ...optionalParams: unknown[]) {
    logger.info(String(message), ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    logger.error(String(message), ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    logger.warn(String(message), ...optionalParams);
  }

  debug?(message: unknown, ...optionalParams: unknown[]) {
    logger.debug(String(message), ...optionalParams);
  }

  verbose?(message: unknown, ...optionalParams: unknown[]) {
    logger.verbose(String(message), ...optionalParams);
  }
}
