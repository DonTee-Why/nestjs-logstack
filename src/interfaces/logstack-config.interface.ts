export interface LogStackConfig {
  // Required
  url: string;
  token: string;
  serviceName: string;
  environment: string;
  
  // Optional
  async?: boolean;
  defaultLabels?: Record<string, string>;
  enableInterceptor?: boolean;
  fallbackToConsole?: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelayMs?: number[];
}

export interface LogStackStats {
  totalLogs: number;
  successfulLogs: number;
  failedLogs: number;
  lastError?: string;
}

export interface LogStackModuleOptions {
  useFactory: (...args: any[]) => Promise<LogStackConfig> | LogStackConfig;
  inject?: any[];
}
