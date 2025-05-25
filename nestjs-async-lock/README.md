# NestJS Async Lock

A simple, extensible, and framework-agnostic async lock (mutex) solution for NestJS. This package provides atomic locks for synchronizing access to shared resources, supporting both Redis and in-memory stores. In other words, it prevents several processes, or concurrent code, from executing a section of code at the same time.

## Features

- **Atomic locks (mutexes)** for critical section protection
- **Multiple backends**: Redis (distributed) and in-memory (single process)
- **Automatic and manual lock management**
- **NestJS integration**: Injectable, testable, and idiomatic
- **TypeScript support**

---

## Installation

```bash
npm install @tawandotorg/nestjs-async-lock
# or
yarn add @tawandotorg/nestjs-async-lock
```

---

## Quick Start

### 1. Import the Module

```typescript
import { AsyncLockModule, MemoryStore } from '@tawandotorg/nestjs-async-lock';
import Redis from 'ioredis';

@Module({
  imports: [
    AsyncLockModule.forRoot({
      default: 'memory', // or 'redis'
      stores: {
        // choose one
        memory: { driver: new MemoryStore() },
        redis: { driver: new Redis() },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Inject and Use the Lock Service

#### Example

```typescript
import { Injectable } from '@nestjs/common';
import { AsyncLockService } from '@tawandotorg/nestjs-async-lock';

@Injectable()
export class OrderService {
  constructor(private readonly lockService: AsyncLockService) {}

  async processOrder(orderId: string) {
    // Manual locking
    const lock = await this.lockService.acquireLock(`order.processing.${orderId}`);
    try {
      // ...process the order...
    } finally {
      await this.lockService.releaseLock(lock);
    }
  }

  async processOrderAuto(orderId: string) {
    // Automatic locking
    return this.lockService.runWithLock(`order.processing.${orderId}`, 10000, async () => {
      // ...process the order...
      return 'Order processed successfully';
    });
  }
}
```

---

## Configuration

Configure the lock store and options via `AsyncLockModule.forRoot()`.

### Supported Stores

- **redis**: Distributed, recommended for multi-instance deployments. When using Redis, this package uses [Redlock](https://github.com/mike-marcacci/node-redlock) under the hood for distributed locking. See the [Redlock documentation](https://github.com/mike-marcacci/node-redlock) for more details on the algorithm and guarantees.
- **memory**: Fast, for single-process or testing environments.

#### Example: Redis Store

```typescript
import Redis from 'ioredis';

AsyncLockModule.forRoot({
  default: 'redis',
  stores: {
    redis: { driver: new Redis() },
  },
});
```

#### Example: Memory Store

```typescript
import { MemoryStore } from '@tawandotorg/nestjs-async-lock/dist/lib/drivers/memory-store';

AsyncLockModule.forRoot({
  default: 'memory',
  stores: {
    memory: { driver: new MemoryStore() },
  },
});
```

---

## API

### `acquireLock(resource: string, ttl = 10000)`

Acquires a lock for the given resource. Throws if the lock cannot be acquired.

### `runWithLock(resource: string, ttl: number, fn: () => Promise<T>): Promise<T>`

Runs the provided function with a lock held for the resource. Releases the lock automatically after execution.

### `releaseLock(lock)`

Releases the acquired lock.

---
 
## License

MIT

---

## Contributing

Pull requests and issues are welcome! Please open an issue to discuss your ideas or report bugs.

---

## Inspiration

This package is inspired by the [AdonisJS Locks](https://docs.adonisjs.com/guides/digging-deeper/locks) concept, but is a custom implementation for NestJS.
