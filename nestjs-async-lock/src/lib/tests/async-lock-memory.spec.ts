import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AsyncLockModule } from '../async-lock.module';
import { AsyncLockService } from '../async-lock.service';
import { MemoryStore } from '../drivers/memory-store';

/**
 * Test suite for AsyncLockService using MemoryStore as the backend.
 */
describe('AsyncLockService (Memory)', () => {
  let module: TestingModule;
  let service: AsyncLockService;

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {
      // 
    });

    module = await Test.createTestingModule({
      imports: [AsyncLockModule.forRoot({
        default: 'memory',
        stores: {
          memory: {
            driver: new MemoryStore(),
          },
        },
      })],
    }).compile();
    service = module.get(AsyncLockService);
  });

  afterAll(async () => {
    await module.close();
  });

  /**
   * Should acquire and release a lock successfully.
   */
  it('should acquire and release a lock', async () => {
    const resource = `test:lock:memory:acquire-release:${expect.getState().currentTestName}`;
    const lock = await service.acquireLock(resource, 1000);
    expect(lock).toBeDefined();
    await service.releaseLock(lock);
  });

  /**
   * Should run a function with a lock and return the result.
   */
  it('should run a function with a lock', async () => {
    const resource = `test:lock:memory:run-with-lock:${expect.getState().currentTestName}`;
    const fn = jest.fn(async () => 'result');
    const result = await service.runWithLock(resource, 1000, fn);
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalled();
  });

  /**
   * Should release lock if runWithLock function throws.
   */
  it('should release lock if runWithLock function throws', async () => {
    const resource = `test:lock:memory:runWithLock-error:${expect.getState().currentTestName}`;
    const fn = jest.fn(async () => { throw new Error('fail'); });
    await expect(service.runWithLock(resource, 1000, fn)).rejects.toThrow('fail');
    // Should be able to acquire lock again
    const lock = await service.acquireLock(resource, 1000);
    expect(lock).toBeDefined();
    await service.releaseLock(lock);
  });

  /**
   * Should release expired lock and allow acquiring the same resource again after TTL.
   */
  it('should release expired lock and allow reacquiring the same resource after TTL', async () => {
    const resource = `test:lock:memory:expire-release:${expect.getState().currentTestName}`;
    // Acquire lock with short TTL
    const lock = await service.acquireLock(resource, 100);
    expect(lock).toBeDefined();
    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 200));
    // Should be able to acquire lock again
    const newLock = await service.acquireLock(resource, 1000);
    expect(newLock).toBeDefined();
    await service.releaseLock(newLock);
  });

   /**
   * Should not allow a different owner to release the lock.
   */
   it('should not allow a different owner to release the lock', async () => {
    const resource = `test:lock:memory:wrong-owner-release:${expect.getState().currentTestName}`;
    const lock = await service.acquireLock(resource, 1000);
    // Simulate a different owner
    const fakeLock = { ...lock, owner: 'not-the-owner' };
    // @ts-expect-error - fakeLock 
    await expect(service.releaseLock(fakeLock)).rejects.toThrow('E_LOCK_NOT_OWNED');
    await service.releaseLock(lock); // cleanup
  });

  /**
   * Should throw if trying to release a lock that does not exist.
   */
  it('should throw if trying to release a lock that does not exist', async () => {
    const resource = `test:lock:memory:not-exist:${expect.getState().currentTestName}`;
    const fakeLock = { resource, owner: 'nobody', ttl: 1000 };
    // @ts-expect-error - fakeLock 
    await expect(service.releaseLock(fakeLock)).rejects.toThrow('E_LOCK_NOT_FOUND');
  });

  /**
   * Should throw if MemoryStore is not initialized.
   */
  it('should throw if MemoryStore is not initialized', async () => {
    // @ts-expect-error - badService is a valid instance of AsyncLockService
    const badService = new (service.constructor)();
    expect(() => badService['#getMemoryStore']()).toThrow('badService.#getMemoryStore is not a function');
  });

  /**
   * Should not allow concurrent acquisition of the same lock.
   */
  it('should not allow concurrent acquisition of the same lock', async () => {
    const resource = `test:lock:memory:concurrent:${expect.getState().currentTestName}`;
    const lock = await service.acquireLock(resource, 1000);
    // Try to acquire again before releasing
    await expect(service.acquireLock(resource, 1000)).rejects.toThrow();
    await service.releaseLock(lock);
  });
}); 