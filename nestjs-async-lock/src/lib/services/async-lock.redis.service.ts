import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Redis } from 'ioredis';
import Redlock, { Lock as RedlockLock } from 'redlock';
import { ASYNC_LOCK_OPTIONS } from '../consts';
import { LockService } from '../interfaces/lock.service';

/**
 * Service for managing distributed locks using Redis and Redlock.
 */
@Injectable()
export class AsyncLockRedisService implements LockService<RedlockLock> {
  private readonly logger = new Logger(AsyncLockRedisService.name);
  private client: Redis;
  private redlock?: Redlock;

  constructor(
    @Optional()
    @Inject(ASYNC_LOCK_OPTIONS) private readonly options?: any,
  ) {
    this.client = this.options?.stores?.redis?.driver;
    this.redlock = new Redlock([
      this.client as any
    ],  {
      retryCount: 0,
      retryDelay: 0,
      retryJitter: 0,
    });

    this.redlock.on('clientError', (err) => {
      this.logger.error('Redlock client error:', err);
    });
    this.client.on('error', (err) => {
      this.logger.error('Redis client error:', err);
    });
  }

  /**
   * Get the underlying Redlock instance.
   */
  #getRedlock() {
    if (!this.redlock) throw new Error('Redlock is not initialized');
    return this.redlock;
  }

  /**
   * Acquire a lock for a given resource.
   * @param resource The resource to lock.
   * @param ttl Time-to-live for the lock in ms.
   */
  async acquireLock(resource: string, ttl = 10000): Promise<RedlockLock> {
    try {
      const lock = await this.#getRedlock().acquire([resource], ttl);
      if (!lock) throw new Error('Unable to acquire lock');
      return lock;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to acquire lock for resource: ${resource}`, error.stack);
      } else {
        this.logger.error(`Failed to acquire lock for resource: ${resource} (non-Error thrown)`);
      }
      throw error;
    }
  }

  /**
   * Run a function with a lock held for the duration.
   * @param resource The resource to lock.
   * @param ttl Time-to-live for the lock in ms.
   * @param fn The function to run.
   */
  async runWithLock<T>(resource: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const lock = await this.acquireLock(resource, ttl);
    try {
      return await fn();
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Release a previously acquired lock.
   * @param lock The lock to release.
   */
  async releaseLock(lock: RedlockLock): Promise<void> {
    try {
      await this.#getRedlock().release(lock);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Failed to release lock', error.stack);
      } else {
        this.logger.error('Failed to release lock (non-Error thrown)');
      }
      throw error;
    }
  }

  /**
   * Cleanup resources on module destroy.
   */
  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}