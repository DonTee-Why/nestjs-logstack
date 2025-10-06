# @dontee-why/nestjs-logstack

NestJS integration package for LogStack centralized logging service.

## Installation

```bash
npm install @dontee-why/nestjs-logstack
```

## Quick Start

### 1. Configure the module

```typescript
// app.module.ts
import { LogStackModule } from '@dontee-why/nestjs-logstack';

@Module({
  imports: [
    LogStackModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        url: configService.get('LOGSTACK_URL'),
        token: configService.get('LOGSTACK_TOKEN'),
        serviceName: configService.get('SERVICE_NAME'),
        environment: configService.get('NODE_ENV'),
        async: true, // Fire-and-forget HTTP requests
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```


### 2. Use in services (no code changes needed!)

```typescript
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async createUser(data: any) {
    // This automatically goes to both console AND LogStack
    this.logger.log('Creating user', { userId: data.id });
    
    try {
      // Your business logic
      this.logger.log('User created successfully');
    } catch (error) {
      this.logger.error('User creation failed', error.message);
    }
  }
}
```

### 3. Environment Variables

```env
LOGSTACK_URL=https://your-logstack-service.com
LOGSTACK_TOKEN=your-service-token
SERVICE_NAME=your-service-name
NODE_ENV=production
```

## Features

- ✅ **Zero breaking changes** - existing logging continues to work
- ✅ **Single-entry processing** - LogStack handles batching via WAL
- ✅ **Async logging** - fire-and-forget HTTP requests
- ✅ **Retry logic** - Built-in retry with exponential backoff
- ✅ **Automatic fallback** - logs to console if LogStack fails
- ✅ **DataDog integration** - automatic trace_id/span_id extraction
- ✅ **Health checks** - LogStack connectivity monitoring
- ✅ **HTTP interceptor** - automatic request/response logging

## Configuration Options

```typescript
interface LogStackConfig {
  // Required
  url: string;                    // LogStack service URL
  token: string;                  // Bearer token
  serviceName: string;            // Service identifier
  environment: string;            // Environment (dev, prod, etc.)
  
  // Optional
  async?: boolean;                // Default: true
  defaultLabels?: Record<string, string>;
  enableInterceptor?: boolean;    // Default: false
  fallbackToConsole?: boolean;    // Default: true
  timeout?: number;               // Default: 30000ms
  retryAttempts?: number;         // Default: 3
  retryDelayMs?: number[];        // Default: [1000, 2000, 4000]
  
  // Queue options (when useQueue=true)
  useQueue?: boolean;             // Default: false
  queueName?: string;             // Default: 'logstack'
  queueOptions?: {
    redis?: {
      host?: string;              // Default: 'localhost'
      port?: number;              // Default: 6379
      password?: string;
      db?: number;
    };
    defaultJobOptions?: {
      attempts?: number;          // Default: 3
      backoff?: {
        type: 'fixed' | 'exponential';
        delay: number;            // Default: 2000ms
      };
      removeOnComplete?: number;  // Default: 10
      removeOnFail?: number;      // Default: 5
    };
  };
}
```

## Advanced Usage

### HTTP Request Logging

```typescript
// Enable automatic HTTP request logging
app.useGlobalInterceptors(app.get(LogStackInterceptor));
```

### Queue vs Fire-and-Forget

**Fire-and-Forget Mode** (`useQueue: false`):
- ✅ Lower latency - immediate HTTP requests
- ✅ Simple setup - no Redis required
- ❌ Potential log loss during outages
- ❌ No guaranteed delivery

**Queue Mode** (`useQueue: true`):
- ✅ Guaranteed delivery - Redis persistence
- ✅ Automatic retries with exponential backoff
- ✅ Survives application restarts
- ✅ Better for high-traffic applications
- ❌ Requires Redis infrastructure
- ❌ Slight latency increase

### Integration with Existing Projects

For projects like Sendova backend that already have Redis/queue infrastructure:

```typescript
// Use existing Redis connection
LogStackModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    // ... other config
    useQueue: true,
    queueOptions: {
      redis: {
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // Use existing Redis instance
      },
    },
  }),
  inject: [ConfigService],
}),
```

<!-- ### Health Checks -->

<!-- ```typescript
// Add LogStack to health checks
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private logStackHealth: LogStackHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.logStackHealth.isHealthy('logstack'),
    ]);
  }
}
``` -->
