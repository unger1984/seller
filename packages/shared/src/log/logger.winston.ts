import winston from 'winston';
import { Logger } from './logger.js';

const logLevel =
  (process.env.LOG_LEVEL as string) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'silly');

const isJsonFormat = process.env.LOG_FORMAT === 'json';

const format = isJsonFormat
  ? winston.format.combine(winston.format.timestamp(), winston.format.json())
  : winston.format.combine(
      winston.format.printf((info) => {
        const { level, message, label, ...args } = info;
        let msg: string;
        if (Array.isArray(message)) {
          const [first, ...other] = message;
          const firstStr =
            typeof first === 'string' || first instanceof String
              ? first
              : first instanceof Error
                ? (first.stack ?? first.message)
                : JSON.stringify(first, null, 2);
          msg = String(
            other
              .map((itm) =>
                typeof itm === 'string' || itm instanceof String
                  ? itm
                  : itm instanceof Error
                    ? (itm.stack ?? itm.message)
                    : JSON.stringify(itm)
              )
              .reduce(
                (prev, next) => (next ? `${prev}, ${next}` : prev),
                firstStr
              )
          );
        } else {
          msg = String(
            typeof message === 'string' || message instanceof String
              ? message
              : message instanceof Error
                ? (message.stack ?? message.message)
                : JSON.stringify(message, null, 2)
          );
        }
        const coloredLevel = winston.format
          .colorize({ all: true })
          .colorize(level, `[${level.substring(0, 1).toUpperCase()}]`);
        return `${coloredLevel}${label ? ` {${label}}` : ''}: ${msg}${Object.keys(args).length ? ` ${JSON.stringify(args, null, 2)}` : ''}`;
      })
    );

function createBaseWinston() {
  return winston.createLogger({
    transports: [
      new winston.transports.Console({
        level: logLevel,
        handleExceptions: true,
        format,
      }),
    ],
    exitOnError: false,
  });
}

/** Реализация Logger через Winston. */
export class LoggerWinston extends Logger {
  constructor(private readonly winstonLogger: winston.Logger) {
    super();
  }

  i(message: string, ...args: unknown[]) {
    this.winstonLogger.info(message, ...args);
  }

  d(message: string, ...args: unknown[]) {
    this.winstonLogger.debug(message, ...args);
  }

  w(message: string, ...args: unknown[]) {
    this.winstonLogger.warn(message, ...args);
  }

  e(message: string, ...args: unknown[]) {
    this.winstonLogger.error(message, ...args);
  }

  h(message: string, meta?: Record<string, unknown>) {
    this.winstonLogger.http(message, meta ?? {});
  }
}

/** Базовый Winston-логгер для создания child. */
export const baseWinston = createBaseWinston();
