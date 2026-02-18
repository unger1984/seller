import winston from 'winston';

/** Логирование для API и Worker. */
export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: 'silly',
      handleExceptions: true,
      format: winston.format.combine(
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
      ),
    }),
  ],
  exitOnError: false,
});
