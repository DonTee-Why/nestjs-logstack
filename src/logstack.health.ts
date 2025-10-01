import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { LogStackService } from './logstack.service';

@Injectable()
export class LogStackHealthIndicator extends HealthIndicator {
  constructor(private readonly logStackService: LogStackService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const isHealthy = await this.logStackService.ping();
      const stats = this.logStackService.getStats();

      if (isHealthy) {
        return this.getStatus(key, true, {
          stats,
          message: 'LogStack service is reachable',
        });
      } else {
        throw new HealthCheckError(
          'LogStack health check failed',
          this.getStatus(key, false, {
            stats,
            message: 'LogStack service is not reachable',
          }),
        );
      }
    } catch (error) {
      throw new HealthCheckError(
        'LogStack health check failed',
        this.getStatus(key, false, {
          message: error.message,
        }),
      );
    }
  }
}
