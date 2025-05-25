import { Provider } from '@nestjs/common';

import { AsyncLockModuleOptions } from '../async-lock.types';
import { ASYNC_LOCK_MEMORY_PROVIDER, ASYNC_LOCK_OPTIONS } from '../consts';

/**
 * Provider for the in-memory lock driver.
 */
export const MemoryProvider: Provider = {
  provide: ASYNC_LOCK_MEMORY_PROVIDER,
  useFactory: (options: AsyncLockModuleOptions) => {
    if (options.default !== 'memory') return;
    if (!options.stores.memory) throw new Error('Memory store options are not set. Please provide memory store configuration.');
    return options.stores.memory.driver;
  },
  inject: [ASYNC_LOCK_OPTIONS],
};