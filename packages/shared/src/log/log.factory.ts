import { Logger } from './logger.js';
import { baseWinston, LoggerWinston } from './logger.winston.js';

/** Создаёт labeled Logger для модуля/сервиса. */
export function createLogger(label: string): Logger {
  return new LoggerWinston(baseWinston.child({ label }));
}
