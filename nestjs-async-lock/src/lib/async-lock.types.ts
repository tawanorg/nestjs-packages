import type { Redis } from "ioredis";
import type { MemoryStore } from "./drivers/memory-store";
 
/**
 * Options for configuring the AsyncLockModule.
 */
export interface AsyncLockModuleOptions {
  default: 'redis' | 'memory';
  stores: {
    redis?: { driver: Redis };
    // database?: { connection: Knex, tableName: string };
    memory?: { driver: MemoryStore };
  };
}