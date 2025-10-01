import { Injectable, Logger, Inject } from '@nestjs/common';
import { LogStackService } from './logstack.service';
import { LogEntry, LogStackConfig } from './interfaces';

@Injectable()
export class LogStackLogger extends Logger {
  constructor(
    private readonly logStackService: LogStackService,
    @Inject('LOGSTACK_CONFIG') private readonly config: LogStackConfig,
  ) {
    super('LogStack');
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: any, context?: string, metadata?: Record<string, any>): void {
    super.log(message, context);
    this.sendToLogStack('INFO', message, context, metadata);
  }

  error(message: any, trace?: string, context?: string, metadata?: Record<string, any>): void {
    super.error(message, trace, context);
    this.sendToLogStack('ERROR', message, context, { ...metadata, trace });
  }

  warn(message: any, context?: string, metadata?: Record<string, any>): void {
    super.warn(message, context);
    this.sendToLogStack('WARN', message, context, metadata);
  }

  debug(message: any, context?: string, metadata?: Record<string, any>): void {
    super.debug(message, context);
    this.sendToLogStack('DEBUG', message, context, metadata);
  }

  verbose(message: any, context?: string, metadata?: Record<string, any>): void {
    super.verbose(message, context);
    this.sendToLogStack('DEBUG', message, context, metadata);
  }

  private sendToLogStack(
    level: LogEntry['level'],
    message: any,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.formatMessage(message),
      service: this.config.serviceName,
      env: this.config.environment,
      labels: {
        ...this.config.defaultLabels,
        ...(context && { context }),
      },
      metadata: metadata || {},
    };

    // Extract trace information if available (from DataDog or other tracing)
    try {
      if (typeof global !== 'undefined' && global.dd && global.dd.trace) {
        const span = global.dd.trace.getActiveSpan();
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

  private formatMessage(message: any): string {
    if (typeof message === 'string') {
      return message;
    }
    if (typeof message === 'object') {
      return JSON.stringify(message);
    }
    return String(message);
  }
}
