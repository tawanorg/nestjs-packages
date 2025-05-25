import { OnModuleDestroy } from "@nestjs/common";

/**
 * Interface for lock service implementations.
 * @template T The type of lock object returned by the service.
 */
export interface LockService<T> extends OnModuleDestroy {
  /**
   * Acquires a lock on the given resource.
   * @param resource - The resource to lock.
   * @param ttl - The time-to-live (TTL) of the lock in milliseconds.
   * @returns A promise that resolves to the lock object.
   */
  acquireLock(resource: string, ttl: number): Promise<T>;
  /**
   * Releases a lock on the given resource.
   * @param lock - The lock object to release.
   */
  releaseLock(lock: T): Promise<void>;
  /**
   * Runs a function with a lock on the given resource.
   * @param resource - The resource to lock.
   * @param ttl - The time-to-live (TTL) of the lock in milliseconds.
   * @param fn - The function to run with the lock.
   * @returns A promise that resolves to the result of the function.
   */
  runWithLock<T>(resource: string, ttl: number, fn: () => Promise<T>): Promise<T>;
  /**
   * Called when the module is destroyed.
   */
  onModuleDestroy(): Promise<void>;
}
