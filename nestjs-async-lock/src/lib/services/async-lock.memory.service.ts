import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ASYNC_LOCK_OPTIONS } from '../consts';
import type { MemoryLock, MemoryStore } from '../drivers/memory-store';
import { LockService } from '../interfaces/lock.service';

/**
 * Service for managing in-memory locks using MemoryStore.
 */
@Injectable()
export class AsyncLockMemoryService implements LockService<MemoryLock> {
  private readonly logger = new Logger(AsyncLockMemoryService.name);
  private memoryStore: MemoryStore;

  constructor(
    @Optional()
    @Inject(ASYNC_LOCK_OPTIONS) private readonly options?: any,
  ) {
    this.memoryStore = this.options?.stores?.memory?.driver;
  }

  /**
   * Get the underlying memory store instance.
   */
  #getMemoryStore() {
    if (!this.memoryStore) throw new Error('MemoryStore is not initialized');
    return this.memoryStore;
  }

  /**
   * Acquire a lock for a given resource.
   * @param resource The resource to lock.
   * @param ttl Time-to-live for the lock in ms.
   */
  async acquireLock(resource: string, ttl = 10000): Promise<MemoryLock> {
    const owner = Math.random().toString(36).substring(2);
    try {
      const lock = await this.#getMemoryStore().save(resource, owner, ttl);
      if (!lock) throw new Error('Unable to acquire lock');
      return lock;
    } catch (error: unknown) {
      this.logger.error(`Unexpected error acquiring lock for resource: ${resource}`, error instanceof Error ? error.stack : undefined);
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
  async releaseLock(lock: MemoryLock): Promise<void> {
    try {
      await this.#getMemoryStore().delete(lock.resource, lock.owner);
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
    await this.#getMemoryStore().clear();
  }
} 