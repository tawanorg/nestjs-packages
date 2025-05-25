import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Lock } from 'redlock';
import { ASYNC_LOCK_SERVICE } from './consts';
import { MemoryLock } from './drivers/memory-store';
import type { LockService } from './interfaces/lock.service';

/**
 * AsyncLockService provides a unified interface for distributed and in-memory locks.
 * It delegates to the injected LockService implementation.
 */
@Injectable()
export class AsyncLockService implements LockService<Lock | MemoryLock>, OnModuleDestroy {
  private readonly logger = new Logger(AsyncLockService.name);

  constructor(
    @Inject(ASYNC_LOCK_SERVICE)
    private readonly lockService: LockService<Lock | MemoryLock>,
  ) {}

  /**
   * Acquire a lock for a given resource.
   * @param resource The resource to lock.
   * @param ttl Time-to-live for the lock in ms.
   */
  async acquireLock(resource: string, ttl = 10000): Promise<Lock | MemoryLock> {
    try {
      return await this.lockService.acquireLock(resource, ttl);
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
   * Release a previously acquired lock.
   * @param lock The lock to release.
   */
  async releaseLock(lock: Lock | MemoryLock): Promise<void> {
    try {
      await this.lockService.releaseLock(lock);
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
   * Run a function with a lock held for the duration.
   * @param resource The resource to lock.
   * @param ttl Time-to-live for the lock in ms.
   * @param fn The function to run.
   */
  async runWithLock<T>(resource: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    try {
      return await this.lockService.runWithLock(resource, ttl, fn);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to run with lock for resource: ${resource}`, error.stack);
      } else {
        this.logger.error(`Failed to run with lock for resource: ${resource} (non-Error thrown)`);
      }
      throw error;
    }
  }

  /**
   * Cleanup resources on module destroy.
   */
  async onModuleDestroy(): Promise<void> {
    await this.lockService.onModuleDestroy();
  }
}