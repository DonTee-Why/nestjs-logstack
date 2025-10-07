import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LogEntry, IngestRequest, LogStackConfig, LogStackStats } from './interfaces';

@Injectable()
export class LogStackService {
  private stats: LogStackStats = {
    totalLogs: 0,
    successfulLogs: 0,
    failedLogs: 0,
  };

  constructor(
    @Inject('LOGSTACK_CONFIG') private readonly config: LogStackConfig,
    private readonly httpService: HttpService,
  ) { }

  async log(entry: LogEntry): Promise<void> {
    if (this.config.async !== false) {
      this.sendToLogStack(entry).catch((error) => {
        this.handleLogError(error, entry);
      });
    } else {
      try {
        await this.sendToLogStack(entry);
      } catch (error) {
        this.handleLogError(error, entry);
      }
    }
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.httpService.axiosRef.get(
        `${this.config.url}/healthz`,
        {
          timeout: this.config.timeout || 5000,
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
          },
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getStats(): LogStackStats {
    return { ...this.stats };
  }

  private async sendToLogStack(entry: LogEntry): Promise<void> {
    this.stats.totalLogs++;
    
    // Validate and normalize the entry for LogStack requirements
    const normalizedEntry = this.normalizeLogEntry(entry);
    
    const request: IngestRequest = {
      entries: [normalizedEntry],
    };

    const maxRetries = this.config.retryAttempts || 3;
    const retryDelays = this.config.retryDelayMs || [1000, 2000, 4000];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.httpService.axiosRef.post(
          `${this.config.url}/v1/logs:ingest`,
          request,
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json',
            },
            timeout: this.config.timeout || 30000,
          }
        );

        this.stats.successfulLogs++;
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        const delay = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private normalizeLogEntry(entry: LogEntry): LogEntry {
    // Ensure service name is lowercase and matches LogStack pattern ^[a-z0-9-]+$
    const normalizedService = entry.service.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Ensure environment is lowercase and matches LogStack pattern ^[a-z0-9-]+$
    const normalizedEnv = entry.env.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Ensure timestamp is in RFC3339 format (convert to ISO string if needed)
    const normalizedTimestamp = entry.timestamp.includes('T') 
      ? entry.timestamp 
      : new Date(entry.timestamp).toISOString();
    
    // Filter labels to only include allowed keys
    const allowedLabelKeys = new Set(['service', 'env', 'level', 'schema_version', 'region', 'tenant']);
    const normalizedLabels = entry.labels 
      ? Object.fromEntries(
          Object.entries(entry.labels).filter(([key]) => allowedLabelKeys.has(key))
        )
      : undefined;
    
    return {
      ...entry,
      service: normalizedService,
      env: normalizedEnv,
      timestamp: normalizedTimestamp,
      labels: normalizedLabels,
    };
  }

  private handleLogError(error: any, entry: LogEntry): void {
    this.stats.failedLogs++;
    this.stats.lastError = error.message;

    if (this.config.fallbackToConsole !== false) {
      console.error('LogStack failed:', error.message);
      console.error('Error details:', error.response?.data || 'No response data');
      console.log(`[${entry.level}] ${entry.message}`, entry.metadata);
    }
  }
}
