import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { logger } from '@seller/shared';

/** Логирует HTTP‑запросы: method, url, statusCode, duration. */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') ?? '-';

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = res.statusCode;
          const duration = Date.now() - start;
          logger.http(`${method} ${url} ${statusCode} ${duration}ms`, {
            method,
            url,
            statusCode,
            durationMs: duration,
            ip,
            userAgent,
          });
        },
        error: (err: unknown) => {
          const statusCode = err && typeof err === 'object' && 'status' in err
            ? (err as { status?: number }).status ?? 500
            : 500;
          const duration = Date.now() - start;
          logger.http(`${method} ${url} ${statusCode} ${duration}ms`, {
            method,
            url,
            statusCode,
            durationMs: duration,
            ip,
            userAgent,
            error: err instanceof Error ? err.message : String(err),
          });
        },
      }),
    );
  }
}
