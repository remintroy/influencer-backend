import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Cache options interface
 */
interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

/**
 * Global cache service
 * This service provides centralized caching functionality
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly defaultTtl: number;
  private readonly defaultPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: this.configService.get('REDIS_PORT') || 6379,
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DATABASE') || 0,
      keyPrefix: this.configService.get('REDIS_PREFIX') || '',
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.defaultTtl = this.configService.get('REDIS_TTL') || 3600;
    this.defaultPrefix = this.configService.get('REDIS_PREFIX') || '';

    this.redis.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`, error.stack);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  /**
   * Get a value from cache
   * @param key - The cache key
   * @returns The cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Failed to get from cache: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key - The cache key
   * @param value - The value to cache
   * @param options - The cache options
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTtl;
      const prefix = options.prefix || this.defaultPrefix;
      const fullKey = `${prefix}:${key}`;

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, JSON.stringify(value));
      } else {
        await this.redis.set(fullKey, JSON.stringify(value));
      }
    } catch (error) {
      this.logger.error(`Failed to set in cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Delete a value from cache
   * @param key - The cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(
        `Failed to delete from cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Get multiple values from cache
   * @param keys - The cache keys
   * @returns The cached values
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      this.logger.error(`Failed to mget from cache: ${error.message}`, error.stack);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   * @param entries - The cache entries
   * @param options - The cache options
   */
  async mset(
    entries: { key: string; value: any }[],
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTtl;
      const prefix = options.prefix || this.defaultPrefix;
      const pipeline = this.redis.pipeline();

      entries.forEach(({ key, value }) => {
        const fullKey = `${prefix}:${key}`;
        if (ttl > 0) {
          pipeline.setex(fullKey, ttl, JSON.stringify(value));
        } else {
          pipeline.set(fullKey, JSON.stringify(value));
        }
      });

      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Failed to mset in cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Delete multiple values from cache
   * @param keys - The cache keys
   */
  async mdel(keys: string[]): Promise<void> {
    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(`Failed to mdel from cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Check if a key exists in cache
   * @param key - The cache key
   * @returns True if the key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Failed to check existence in cache: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Get the TTL of a key
   * @param key - The cache key
   * @returns The TTL in seconds
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL from cache: ${error.message}`, error.stack);
      return -1;
    }
  }

  /**
   * Set the TTL of a key
   * @param key - The cache key
   * @param ttl - The TTL in seconds
   */
  async setTtl(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to set TTL in cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Increment a value in cache
   * @param key - The cache key
   * @param amount - The amount to increment by
   * @returns The new value
   */
  async increment(key: string, amount = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      this.logger.error(
        `Failed to increment in cache: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Decrement a value in cache
   * @param key - The cache key
   * @param amount - The amount to decrement by
   * @returns The new value
   */
  async decrement(key: string, amount = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, amount);
    } catch (error) {
      this.logger.error(
        `Failed to decrement in cache: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param pattern - The key pattern
   * @returns The matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(`Failed to get keys from cache: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get the size of the cache
   * @returns The number of keys
   */
  async size(): Promise<number> {
    try {
      return await this.redis.dbsize();
    } catch (error) {
      this.logger.error(
        `Failed to get cache size: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns The cache statistics
   */
  async stats(): Promise<any> {
    try {
      const info = await this.redis.info();
      const stats: any = {};

      info.split('\r\n').forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to get cache stats: ${error.message}`,
        error.stack,
      );
      return {};
    }
  }
} 