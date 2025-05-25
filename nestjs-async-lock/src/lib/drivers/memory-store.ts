import { Logger } from '@nestjs/common';
import type { MutexInterface } from 'async-mutex';
import { Mutex, withTimeout } from 'async-mutex';

export type MemoryLock = {
  resource: string;
  owner: string;
  ttl: number;
  expiresAt?: number;
  mutex: MutexInterface;

};

/**
 * In-memory lock store for managing resource locks using mutexes.
 */
export class MemoryStore {
  #locks = new Map<string, MemoryLock>();
  private readonly logger = new Logger(MemoryStore.name);

  /**
   * For a given key, get or create a new lock.
   */
  getOrCreateForKey(key: string, owner: string, ttl: number): MemoryLock {
    let lock = this.#locks.get(key);
    if (!lock) {
      lock = { mutex: withTimeout(new Mutex(), ttl), owner, resource: key, ttl };
      lock.expiresAt = this.#computeExpiresAt(ttl);
      lock.mutex.acquire()
      this.#locks.set(key, lock);
    }
    return lock;
  }

  /**
   * Get the lock entry for a given key.
   */
  #getLockEntry(key: string) {
    const lock = this.#locks.get(key);
    if (!lock) return null;
    return lock;
  }

  /**
   * Compute the expiration date of a lock.
   */
  #computeExpiresAt(ttl: number | null) {
    return ttl ? Date.now() + ttl : Number.POSITIVE_INFINITY;
  }

  /**
   * Check if lock is expired.
   */
  #isLockEntryExpired(lock: MemoryLock) {
    return lock.expiresAt && lock.expiresAt < Date.now();
  }

  /**
   * Extend the lock expiration. Throws an error if the lock is not owned by the owner.
   * Duration is in milliseconds.
   */
  async extend(key: string, owner: string, duration: number) {
    const lock = this.#locks.get(key);
    if (!lock || lock.owner !== owner) throw new Error('E_LOCK_NOT_OWNED');
    lock.expiresAt = this.#computeExpiresAt(duration);
  }

  /**
   * Save the lock in the store if not already locked by another owner.
   */
  async save(key: string, owner: string, ttl: number): Promise<MemoryLock> {
    try {
      const existing = await this.exists(key);
      if (existing) throw new Error('E_LOCK_ALREADY_EXISTS');
      return this.getOrCreateForKey(key, owner, ttl);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to save lock for key: ${key}`, error.stack);
      } else {
        this.logger.error(`Failed to save lock for key: ${key} (non-Error thrown)`);
      }
      throw error;
    }
  }

  /**
   * Delete the lock from the store if it is owned by the owner.
   * Otherwise throws a E_LOCK_NOT_OWNED error.
   */
  async delete(key: string, owner: string) {
    const mutex = this.#locks.get(key);
    if (!mutex) throw new Error('E_LOCK_NOT_FOUND');
    // check owner
    if (mutex.owner !== owner) throw new Error('E_LOCK_NOT_OWNED');
    // release and delete
    mutex.mutex.release();
    this.#locks.delete(key);
  }

  /**
   * Force delete the lock from the store. No check is made on the owner.
   */
  async forceDelete(key: string) {
    const lock = this.#locks.get(key);
    if (!lock) return;
    lock.mutex.release();
    this.#locks.delete(key);
  }

  /**
   * Check if the lock exists.
   */
  async exists(key: string) {
    const lock = this.#locks.get(key);
    if (!lock || this.#isLockEntryExpired(lock)) return false;
    return lock.mutex.isLocked();
  }

  /**
   * Get the lock.
   */
  async get(key: string): Promise<MemoryLock | null> {
    const lock = this.#getLockEntry(key);
    if (!lock || this.#isLockEntryExpired(lock)) return null;
    return lock;
  }

  /**
   * Clear all locks.
   */
  async clear() {
    this.#locks.clear();
  }
}
