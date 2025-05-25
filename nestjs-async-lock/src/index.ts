export { Mutex } from 'async-mutex';
export { default as Redlock } from 'redlock';
export * from './lib/async-lock.module';
export * from './lib/services/async-lock.memory.service';
export * from './lib/services/async-lock.redis.service';

export type { LockService as AsyncLockService } from './lib/interfaces/lock.service';

