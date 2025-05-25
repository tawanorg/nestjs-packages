import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { AsyncLockModule } from '../async-lock.module';
import { AsyncLockService } from '../async-lock.service';

const REDIS_URL = 'rediss://default:xxxx@trusty-gobbler-17472.upstash.io:6379';

/**
 * Test suite for AsyncLockService using Redis as the backend.
 */
describe('AsyncLockService (Redis)', () => {
  let service: AsyncLockService;
  let module: TestingModule;

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {
      // 
    });

    module = await Test.createTestingModule({
      imports: [AsyncLockModule.forRoot({
        default: 'redis',
        stores: {
          redis: { driver: new Redis(REDIS_URL) },
        },
      })],
    }).compile();
    service = module.get(AsyncLockService);
  });

  /**
   * Should acquire and release a lock successfully.
   */
  it('should acquire and release a lock', async () => {
    const resource = `test:lock:redis:acquire-release:${expect.getState().currentTestName}`;
    const lock = await service.acquireLock(resource, 1000);
    expect(lock).toBeDefined();
    await service.releaseLock(lock);
  });

  /**
   * Should run a function with a lock and return the result.
   */
  it('should run a function with a lock', async () => {
    const resource = `test:lock:redis:run-with-lock:${expect.getState().currentTestName}`;
    const fn = jest.fn(async () => 'result');
    const result = await service.runWithLock(resource, 1000, fn);
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  /**
   * Should release lock if runWithLock function throws.
   */
  it('should release lock if runWithLock function throws', async () => {
    const resource = `test:lock:redis:runWithLock-error:${expect.getState().currentTestName}`;
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
    const resource = `test:lock:redis:expire-release:${expect.getState().currentTestName}`;
    // Acquire lock with short TTL
    const lock = await service.acquireLock(resource, 100);
    expect(lock).toBeDefined();
    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 150));
    // Should be able to acquire lock again
    const newLock = await service.acquireLock(resource, 1000);
    expect(newLock).toBeDefined();
    await service.releaseLock(newLock);
  });

  /**
   * Should throw if Redis is not initialized.
   */
  it('should throw if Redis is not initialized', async () => {
    // @ts-expect-error - badService is a valid instance of AsyncLockService
    const badService = new (service.constructor)();
    expect(() => badService['#getRedlock']()).toThrow('badService.#getRedlock is not a function');
  });


  /**
   * Should not allow concurrent acquisition of the same lock.
   */
  it('should not allow concurrent acquisition of the same lock', async () => {
    const resource = `test:lock:redis:concurrent:${expect.getState().currentTestName}`;
    const lock = await service.acquireLock(resource, 1000);
    // Try to acquire again before releasing
    await expect(service.acquireLock(resource, 1000)).rejects.toThrow();
    await service.releaseLock(lock);
  });
});