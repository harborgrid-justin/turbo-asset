/**
 * Enterprise-grade caching layer with Redis integration
 * Provides high-performance caching with TTL, invalidation, and statistics
 */

import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import { getLogger, LogContext, createTimer } from '../config/enterprise-logger';
import { getEnvironmentConfig } from '../config/environment-validation';
import { Request, Response, NextFunction } from 'express';

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  readonly defaultTTL: number; // seconds
  readonly maxMemory: string;
  readonly keyPrefix: string;
  readonly compressionThreshold: number; // bytes
  readonly enableCompression: boolean;
  readonly enableStatistics: boolean;
}

/**
 * Cache key interface for type safety
 */
export interface CacheKey {
  readonly namespace: string;
  readonly identifier: string;
  readonly version?: string;
  readonly tags?: readonly string[];
}

/**
 * Cache entry interface
 */
export interface CacheEntry<TData = unknown> {
  readonly data: TData;
  readonly metadata: {
    readonly createdAt: number;
    readonly expiresAt: number;
    readonly hits: number;
    readonly size: number;
    readonly tags?: readonly string[];
  };
}

/**
 * Cache statistics interface
 */
export interface CacheStatistics {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly totalKeys: number;
  readonly memoryUsage: number;
  readonly evictions: number;
  readonly operations: {
    readonly get: number;
    readonly set: number;
    readonly delete: number;
    readonly clear: number;
  };
}

/**
 * Enterprise Redis cache service
 */
export class EnterpriseCacheService {
  private client: RedisClientType | null = null;
  private readonly logger = getLogger();
  private readonly config: CacheConfig;
  private readonly statistics: CacheStatistics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalKeys: 0,
    memoryUsage: 0,
    evictions: 0,
    operations: {
      get: 0,
      set: 0,
      delete: 0,
      clear: 0
    }
  };

  constructor(config?: Partial<CacheConfig>) {
    const defaultConfig: CacheConfig = {
      defaultTTL: 300, // 5 minutes
      maxMemory: '256mb',
      keyPrefix: 'turbo-asset:',
      compressionThreshold: 1024, // 1KB
      enableCompression: true,
      enableStatistics: true
    };

    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    const env = getEnvironmentConfig();
    const timer = createTimer('cache-service-init');

    try {
      const options: RedisClientOptions = {
        url: env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              this.logger.error('Redis connection failed after 3 retries');
              return false; // Stop retrying
            }
            return Math.min(retries * 50, 500); // Exponential backoff
          }
        }
      };

      this.client = createClient(options);

      // Error handling
      this.client.on('error', (error) => {
        this.logger.error('Redis client error', undefined, error);
      });

      this.client.on('connect', () => {
        this.logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        this.logger.info('Redis client ready');
      });

      this.client.on('end', () => {
        this.logger.warn('Redis client connection ended');
      });

      // Connect to Redis
      await this.client.connect();

      // Configure Redis for optimal performance
      await this.configureRedis();

      timer.end();
      this.logger.info('Cache service initialized successfully');
    } catch (error) {
      timer.end();
      this.logger.error('Cache service initialization failed', undefined, error as Error);
      
      // Fall back to in-memory cache if Redis is unavailable
      this.client = null;
      this.logger.warn('Falling back to in-memory cache');
    }
  }

  /**
   * Configure Redis for optimal performance
   */
  private async configureRedis(): Promise<void> {
    if (!this.client) {return;}

    try {
      // Set memory policy
      await this.client.configSet('maxmemory', this.config.maxMemory);
      await this.client.configSet('maxmemory-policy', 'allkeys-lru');
      
      // Enable keyspace notifications for expiration events
      await this.client.configSet('notify-keyspace-events', 'Ex');
      
      this.logger.info('Redis configured for enterprise caching');
    } catch (error) {
      this.logger.warn('Redis configuration failed, using defaults', undefined, error as Error);
    }
  }

  /**
   * Generate cache key from CacheKey interface
   */
  private generateKey(key: CacheKey): string {
    const parts = [this.config.keyPrefix, key.namespace, key.identifier];
    if (key.version) {
      parts.push(`v${key.version}`);
    }
    return parts.join(':');
  }

  /**
   * Compress data if it exceeds threshold
   */
  private async compressData(data: string): Promise<string> {
    if (!this.config.enableCompression || data.length < this.config.compressionThreshold) {
      return data;
    }

    try {
      const zlib = await import('zlib');
      const compressed = zlib.gzipSync(data);
      return `gzip:${compressed.toString('base64')}`;
    } catch (error) {
      this.logger.warn('Data compression failed, storing uncompressed', undefined, error as Error);
      return data;
    }
  }

  /**
   * Decompress data if compressed
   */
  private async decompressData(data: string): Promise<string> {
    if (!data.startsWith('gzip:')) {
      return data;
    }

    try {
      const zlib = await import('zlib');
      const base64Data = data.substring(5); // Remove 'gzip:' prefix
      const compressed = Buffer.from(base64Data, 'base64');
      const decompressed = zlib.gunzipSync(compressed);
      return decompressed.toString();
    } catch (error) {
      this.logger.error('Data decompression failed', undefined, error as Error);
      throw new Error('Cache data corruption detected');
    }
  }

  /**
   * Get value from cache
   */
  async get<TData = unknown>(key: CacheKey): Promise<TData | null> {
    const timer = createTimer('cache-get');
    const cacheKey = this.generateKey(key);

    try {
      let data: string | null = null;

      if (this.client && this.client.isOpen) {
        data = await this.client.get(cacheKey);
      } else {
        // Fallback to in-memory cache would go here
        data = null;
      }

      if (this.config.enableStatistics) {
        this.statistics.operations.get++;
      }

      if (data === null) {
        if (this.config.enableStatistics) {
          this.statistics.misses++;
          this.updateHitRate();
        }
        timer.end();
        return null;
      }

      // Decompress if needed
      const decompressedData = await this.decompressData(data);
      const parsed = JSON.parse(decompressedData) as CacheEntry<TData>;

      if (this.config.enableStatistics) {
        this.statistics.hits++;
        this.updateHitRate();
      }

      timer.end();
      this.logger.debug('Cache hit', { key: cacheKey });
      
      return parsed.data;
    } catch (error) {
      timer.end();
      this.logger.error('Cache get operation failed', { key: cacheKey }, error as Error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<TData = unknown>(
    key: CacheKey, 
    data: TData, 
    ttlSeconds?: number
  ): Promise<boolean> {
    const timer = createTimer('cache-set');
    const cacheKey = this.generateKey(key);
    const ttl = ttlSeconds || this.config.defaultTTL;

    try {
      const now = Date.now();
      const entry: CacheEntry<TData> = {
        data,
        metadata: {
          createdAt: now,
          expiresAt: now + (ttl * 1000),
          hits: 0,
          size: 0,
          tags: key.tags
        }
      };

      const serialized = JSON.stringify(entry);
      entry.metadata.size = Buffer.byteLength(serialized, 'utf8');
      
      const finalData = JSON.stringify(entry);
      const compressedData = await this.compressData(finalData);

      if (this.client && this.client.isOpen) {
        await this.client.setEx(cacheKey, ttl, compressedData);
        
        // Add to tag index if tags are provided
        if (key.tags && key.tags.length > 0) {
          await this.addToTagIndex(key.tags, cacheKey, ttl);
        }
      }

      if (this.config.enableStatistics) {
        this.statistics.operations.set++;
        this.statistics.totalKeys++;
      }

      timer.end();
      this.logger.debug('Cache set', { key: cacheKey, ttl, size: entry.metadata.size });
      
      return true;
    } catch (error) {
      timer.end();
      this.logger.error('Cache set operation failed', { key: cacheKey }, error as Error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: CacheKey): Promise<boolean> {
    const timer = createTimer('cache-delete');
    const cacheKey = this.generateKey(key);

    try {
      let result = false;

      if (this.client && this.client.isOpen) {
        const deleted = await this.client.del(cacheKey);
        result = deleted > 0;
        
        // Remove from tag indexes if tags were provided
        if (key.tags && key.tags.length > 0) {
          await this.removeFromTagIndex(key.tags, cacheKey);
        }
      }

      if (this.config.enableStatistics) {
        this.statistics.operations.delete++;
        if (result) {
          this.statistics.totalKeys = Math.max(0, this.statistics.totalKeys - 1);
        }
      }

      timer.end();
      this.logger.debug('Cache delete', { key: cacheKey, deleted: result });
      
      return result;
    } catch (error) {
      timer.end();
      this.logger.error('Cache delete operation failed', { key: cacheKey }, error as Error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<boolean> {
    const timer = createTimer('cache-clear');

    try {
      if (this.client && this.client.isOpen) {
        await this.client.flushDb();
      }

      if (this.config.enableStatistics) {
        this.statistics.operations.clear++;
        this.statistics.totalKeys = 0;
      }

      timer.end();
      this.logger.info('Cache cleared');
      
      return true;
    } catch (error) {
      timer.end();
      this.logger.error('Cache clear operation failed', undefined, error as Error);
      return false;
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: readonly string[]): Promise<number> {
    if (!this.client || !this.client.isOpen) {
      return 0;
    }

    const timer = createTimer('cache-invalidate-by-tags');
    let deletedCount = 0;

    try {
      for (const tag of tags) {
        const tagKey = `${this.config.keyPrefix}tags:${tag}`;
        const keys = await this.client.sMembers(tagKey);
        
        if (keys.length > 0) {
          deletedCount += await this.client.del(...keys);
          await this.client.del(tagKey); // Remove the tag index
        }
      }

      timer.end();
      this.logger.info('Cache invalidated by tags', { tags, deletedCount });
      
      return deletedCount;
    } catch (error) {
      timer.end();
      this.logger.error('Cache invalidation by tags failed', { tags }, error as Error);
      return 0;
    }
  }

  /**
   * Add keys to tag index
   */
  private async addToTagIndex(tags: readonly string[], key: string, ttl: number): Promise<void> {
    if (!this.client || !this.client.isOpen) {return;}

    for (const tag of tags) {
      const tagKey = `${this.config.keyPrefix}tags:${tag}`;
      await this.client.sAdd(tagKey, key);
      await this.client.expire(tagKey, ttl + 60); // Tag index lives slightly longer
    }
  }

  /**
   * Remove keys from tag index
   */
  private async removeFromTagIndex(tags: readonly string[], key: string): Promise<void> {
    if (!this.client || !this.client.isOpen) {return;}

    for (const tag of tags) {
      const tagKey = `${this.config.keyPrefix}tags:${tag}`;
      await this.client.sRem(tagKey, key);
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.statistics.hits + this.statistics.misses;
    this.statistics.hitRate = total > 0 ? (this.statistics.hits / total) * 100 : 0;
  }

  /**
   * Get cache statistics
   */
  async getStatistics(): Promise<CacheStatistics> {
    if (this.client && this.client.isOpen) {
      try {
        const info = await this.client.memoryUsage('');
        if (info) {
          this.statistics.memoryUsage = info;
        }
      } catch (error) {
        // Memory usage not available, continue with existing stats
      }
    }

    return { ...this.statistics };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      this.logger.info('Cache service connection closed');
    }
  }
}

/**
 * Cache middleware factory for Express
 */
export function createCacheMiddleware(
  cacheService: EnterpriseCacheService,
  options: {
    ttl?: number;
    keyGenerator?: (req: Request) => CacheKey;
    skip?: (req: Request, res: Response) => boolean;
  } = {}
) {
  const logger = getLogger();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip caching if specified
    if (options.skip && options.skip(req, res)) {
      next(); return;
    }

    // Only cache GET requests
    if (req.method !== 'GET') {
      next(); return;
    }

    const keyGenerator = options.keyGenerator || ((req: Request): CacheKey => ({
      namespace: 'http',
      identifier: `${req.method}:${req.originalUrl}`,
      tags: ['http-cache']
    }));

    const cacheKey = keyGenerator(req);
    const timer = createTimer('cache-middleware');

    // Try to get from cache
    cacheService.get(cacheKey)
      .then((cachedData) => {
        if (cachedData) {
          timer.end();
          logger.debug('Serving cached response', { key: cacheKey });
          
          res.setHeader('X-Cache', 'HIT');
          res.json(cachedData);
          return;
        }

        // Not in cache, continue with request
        res.setHeader('X-Cache', 'MISS');
        
        // Intercept the response to cache it
        const originalJson = res.json;
        res.json = function(body: any) {
          // Cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            cacheService.set(cacheKey, body, options.ttl)
              .catch(error => {
                logger.warn('Failed to cache response', { key: cacheKey }, error);
              });
          }
          
          timer.end();
          return originalJson.call(this, body);
        };

        next();
      })
      .catch((error) => {
        timer.end();
        logger.warn('Cache middleware error', { key: cacheKey }, error);
        next(); // Continue without caching on error
      });
  };
}

// Singleton instance
let cacheServiceInstance: EnterpriseCacheService | null = null;

/**
 * Get singleton cache service instance
 */
export function getCacheService(): EnterpriseCacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new EnterpriseCacheService();
  }
  return cacheServiceInstance;
}

/**
 * Initialize cache service
 */
export async function initializeCacheService(): Promise<EnterpriseCacheService> {
  const cacheService = getCacheService();
  await cacheService.initialize();
  return cacheService;
}