import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { AsyncLockService } from './async-lock.service';
import { AsyncLockModuleOptions } from './async-lock.types';
import { ASYNC_LOCK_OPTIONS, ASYNC_LOCK_SERVICE } from './consts';
import { MemoryProvider } from './providers/memory.provider';
import { RedisProvider } from './providers/redis.provider';
import { AsyncLockMemoryService } from './services/async-lock.memory.service';
import { AsyncLockRedisService } from './services/async-lock.redis.service';

/**
 * NestJS module for providing distributed and in-memory locking services.
 */
@Global()
@Module({})
export class AsyncLockModule {
  /**
   * Register the AsyncLockModule with the given options.
   * @param options The module options.
   */
  static forRoot(options: AsyncLockModuleOptions): DynamicModule {
    if (!options?.default) {
      throw new Error('AsyncLockModuleOptions.default is required');
    }
    if (!options.stores) {
      throw new Error('AsyncLockModuleOptions.stores is required');
    }
    
    let specificProvider: Provider;
    let specificService: typeof AsyncLockRedisService | typeof AsyncLockMemoryService;

    switch (options.default) {
      case 'redis':
        specificProvider = RedisProvider;
        specificService = AsyncLockRedisService;
        break;
      case 'memory':
        specificProvider = MemoryProvider;
        specificService = AsyncLockMemoryService;
        break;
      default:
        throw new Error(`Unknown lock store type: ${options.default}`);
    }

    const asyncLockServiceProvider: Provider = {
      provide: ASYNC_LOCK_SERVICE,
      useExisting: specificService,
    };

    return {
      global: true,
      module: AsyncLockModule,
      providers: [
        { provide: ASYNC_LOCK_OPTIONS, useValue: options },
        specificProvider,
        AsyncLockService,
        specificService,
        asyncLockServiceProvider,
      ],
      exports: [ASYNC_LOCK_SERVICE],
    };
  }
}