import { Provider } from '@nestjs/common';
import { AsyncLockModuleOptions } from '../async-lock.types';
import { ASYNC_LOCK_OPTIONS, ASYNC_LOCK_REDIS_PROVIDER } from '../consts';

/**
 * Provider for the Redis lock driver.
 */
export const RedisProvider: Provider = {
  provide: ASYNC_LOCK_REDIS_PROVIDER,
  useFactory: (options: AsyncLockModuleOptions) => {
    if (options.default !== 'redis') return;
    if (!options.stores.redis) throw new Error('Redis store options are not set. Please provide redis store configuration.');
    return options.stores.redis.driver;
  },
  inject: [ASYNC_LOCK_OPTIONS],
};