import { Module, DynamicModule, Provider } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LogStackService } from './logstack.service';
import { LogStackLogger } from './logstack.logger';
import { LogStackInterceptor } from './logstack.interceptor';
import { LogStackHealthIndicator } from './logstack.health';
import { LogStackConfig, LogStackModuleOptions } from './interfaces';

@Module({})
export class LogStackModule {
  static forRoot(config: LogStackConfig): DynamicModule {
    const configProvider: Provider = {
      provide: 'LOGSTACK_CONFIG',
      useValue: config,
    };

    return {
      module: LogStackModule,
      imports: [HttpModule],
      providers: [
        configProvider,
        LogStackService,
        LogStackLogger,
        LogStackInterceptor,
        LogStackHealthIndicator,
      ],
      exports: [
        LogStackService,
        LogStackLogger,
        LogStackInterceptor,
        LogStackHealthIndicator,
      ],
      global: true,
    };
  }

  static forRootAsync(options: LogStackModuleOptions): DynamicModule {
    const configProvider: Provider = {
      provide: 'LOGSTACK_CONFIG',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: LogStackModule,
      imports: [HttpModule],
      providers: [
        configProvider,
        LogStackService,
        LogStackLogger,
        LogStackInterceptor,
        LogStackHealthIndicator,
      ],
      exports: [
        LogStackService,
        LogStackLogger,
        LogStackInterceptor,
        LogStackHealthIndicator,
      ],
      global: true,
    };
  }
}
