/** Сигнатура совместима с NestJS LoggerService. */
interface ILoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void;
  error(message: unknown, ...optionalParams: unknown[]): void;
  warn(message: unknown, ...optionalParams: unknown[]): void;
  debug?(message: unknown, ...optionalParams: unknown[]): void;
  verbose?(message: unknown, ...optionalParams: unknown[]): void;
  http(message: string, meta?: Record<string, unknown>): void;
}

/** Абстрактный логгер — consumer-код не знает о Winston/Pino. */
export abstract class Logger implements ILoggerService {
  abstract i(message: string, ...args: unknown[]): void;
  abstract d(message: string, ...args: unknown[]): void;
  abstract w(message: string, ...args: unknown[]): void;
  abstract e(message: string, ...args: unknown[]): void;
  abstract h(message: string, meta?: Record<string, unknown>): void;

  log(message: unknown, ...optionalParams: unknown[]) {
    this.i(String(message), ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.e(String(message), ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.w(String(message), ...optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.d(String(message), ...optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.i(String(message), ...optionalParams);
  }

  http(message: string, meta?: Record<string, unknown>) {
    this.h(message, meta);
  }
}
