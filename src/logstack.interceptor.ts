import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogStackService } from './logstack.service';
import { LogEntry, LogStackConfig } from './interfaces';

@Injectable()
export class LogStackInterceptor implements NestInterceptor {
  constructor(
    private readonly logStackService: LogStackService,
    @Inject('LOGSTACK_CONFIG') private readonly config: LogStackConfig,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, response, startTime, 'success');
        },
        error: (error) => {
          this.logRequest(request, response, startTime, 'error', error);
        },
      }),
    );
  }

  private logRequest(
    request: any,
    response: any,
    startTime: number,
    status: 'success' | 'error',
    error?: any,
  ): void {
    const duration = Date.now() - startTime;
    const statusCode = response.statusCode || (error ? 500 : 200);

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: status === 'error' ? 'ERROR' : 'INFO',
      message: `${request.method} ${request.url}`,
      service: this.config.serviceName,
      env: this.config.environment,
      labels: {
        ...this.config.defaultLabels,
        method: request.method,
        endpoint: request.route?.path || request.url,
      },
      metadata: {
        url: request.url,
        method: request.method,
        statusCode,
        duration,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        ...(error && { error: error.message }),
      },
      trace_id: request.headers['x-trace-id'],
    };

    // Extract DataDog trace info if available
    try {
      const globalAny = global as any;
      if (globalAny?.dd?.trace) {
        const span = globalAny.dd.trace.getActiveSpan();
        if (span && span.context) {
          entry.trace_id = span.context().toTraceId();
          entry.span_id = span.context().toSpanId();
        }
      }
    } catch (error) {
      // Silently ignore tracing extraction errors
    }

    this.logStackService.log(entry);
  }
}
