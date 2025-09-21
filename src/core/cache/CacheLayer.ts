/**
 * Enterprise Caching Layer
 * Multi-tier caching with Redis backend, compression, and metrics
 */

import { logger } from '../../config/logger';

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  readonly defaultTTL: number;
  readonly maxMemorySize: number;
  readonly compressionEnabled: boolean;
  readonly compressionThreshold: number;
  readonly enableMetrics: boolean;
  readonly keyPrefix: string;
  readonly enableL1Cache: boolean;
  readonly l1CacheSize: number;
  readonly enableSerialization: boolean;
}

/**
 * Cache entry interface
 */
export interface CacheEntry<T = unknown> {
  readonly key: string;
  readonly value: T;
  readonly ttl: number;
  readonly createdAt: Date;
  readonly lastAccessed: Date;
  readonly accessCount: number;
  readonly size: number;
  readonly compressed: boolean;
}

/**
 * Cache metrics interface
 */
export interface CacheMetrics {
  readonly hits: number;
  readonly misses: number;
  readonly sets: number;
  readonly deletes: number;
  readonly evictions: number;
  readonly totalSize: number;
  readonly entryCount: number;
  readonly hitRate: number;
  readonly averageAccessTime: number;
  readonly l1HitRate: number;
  readonly compressionRatio: number;
}

/**
 * Cache operation result
 */
export interface CacheResult<T = unknown> {
  readonly success: boolean;
  readonly value?: T;
  readonly cached: boolean;
  readonly ttl?: number;
  readonly fromL1?: boolean;
  readonly executionTime: number;
}

/**
 * Serialization interface
 */
export interface ISerializer {
  serialize(value: unknown): Promise<Buffer>;
  deserialize<T>(data: Buffer): Promise<T>;
}

/**
 * Compression interface
 */
export interface ICompressor {
  compress(data: Buffer): Promise<Buffer>;
  decompress(data: Buffer): Promise<Buffer>;
}

/**
 * Redis-like cache backend interface
 */
export interface ICacheBackend {
  get(key: string): Promise<Buffer | null>;
  set(key: string, value: Buffer, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  flushall(): Promise<boolean>;
  ping(): Promise<boolean>;
}

/**
 * L1 (in-memory) cache implementation
 */
class L1Cache<T = unknown> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private accessOrder: string[] = [];

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check TTL
    if (entry.ttl > 0 && Date.now() - entry.createdAt.getTime() > entry.ttl * 1000) {
      this.cache.delete(key);
      this.updateAccessOrder(key, true);
      return null;
    }

    // Update access information
    const updatedEntry: CacheEntry<T> = {
      ...entry,
      lastAccessed: new Date(),
      accessCount: entry.accessCount + 1
    };
    
    this.cache.set(key, updatedEntry);
    this.updateAccessOrder(key);
    
    return updatedEntry;
  }

  set(key: string, value: T, ttl: number = 0): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      size: this.estimateSize(value),
      compressed: false
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateAccessOrder(key, true);
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  getSize(): number {
    return this.cache.size;
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift()!;
      this.cache.delete(oldestKey);
    }
  }

  private updateAccessOrder(key: string, remove: boolean = false): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    if (!remove) {
      this.accessOrder.push(key);
    }
  }

  private estimateSize(value: unknown): number {
    return JSON.stringify(value).length * 2; // Rough estimate in bytes
  }
}

/**
 * Enterprise multi-tier cache implementation
 */
export class EnterpriseCacheLayer {
  private readonly config: CacheConfig;
  private readonly backend: ICacheBackend;
  private readonly serializer: ISerializer;
  private readonly compressor: ICompressor;
  private readonly l1Cache: L1Cache;

  private readonly metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0,
    averageAccessTime: 0,
    l1HitRate: 0,
    compressionRatio: 0
  };

  constructor(
    config: CacheConfig,
    backend: ICacheBackend,
    serializer: ISerializer,
    compressor: ICompressor
  ) {
    this.config = config;
    this.backend = backend;
    this.serializer = serializer;
    this.compressor = compressor;
    this.l1Cache = new L1Cache(config.l1CacheSize);
  }

  /**
   * Get value from cache with multi-tier fallback
   */
  async get<T = unknown>(key: string): Promise<CacheResult<T>> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key);

    try {
      // Try L1 cache first
      if (this.config.enableL1Cache) {
        const l1Entry = this.l1Cache.get(fullKey);
        if (l1Entry) {
          this.metrics.hits++;
          this.updateHitRates();
          
          const executionTime = Date.now() - startTime;
          this.updateAverageAccessTime(executionTime);

          logger.debug('Cache hit (L1)', { key, executionTime });

          return {
            success: true,
            value: l1Entry.value as T,
            cached: true,
            ttl: l1Entry.ttl,
            fromL1: true,
            executionTime
          };
        }
      }

      // Try L2 (Redis) cache
      const data = await this.backend.get(fullKey);
      if (data) {
        let value: T;
        
        // Decompress if needed
        let processedData = data;
        if (this.config.compressionEnabled) {
          try {
            processedData = await this.compressor.decompress(data);
          } catch {
            // Data might not be compressed, use as-is
            processedData = data;
          }
        }

        // Deserialize
        if (this.config.enableSerialization) {
          value = await this.serializer.deserialize<T>(processedData);
        } else {
          value = JSON.parse(processedData.toString()) as T;
        }

        // Store in L1 cache for future hits
        if (this.config.enableL1Cache) {
          this.l1Cache.set(fullKey, value, this.config.defaultTTL);
        }

        this.metrics.hits++;
        this.updateHitRates();

        const executionTime = Date.now() - startTime;
        this.updateAverageAccessTime(executionTime);

        logger.debug('Cache hit (L2)', { key, executionTime });

        return {
          success: true,
          value,
          cached: true,
          fromL1: false,
          executionTime
        };
      }

      // Cache miss
      this.metrics.misses++;
      this.updateHitRates();

      const executionTime = Date.now() - startTime;
      logger.debug('Cache miss', { key, executionTime });

      return {
        success: true,
        cached: false,
        executionTime
      };

    } catch (error) {
      logger.error('Cache get error', { key, error });
      
      return {
        success: false,
        cached: false,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Set value in cache with compression and serialization
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<CacheResult<boolean>> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key);
    const effectiveTTL = ttl ?? this.config.defaultTTL;

    try {
      let data: Buffer;
      
      // Serialize
      if (this.config.enableSerialization) {
        data = await this.serializer.serialize(value);
      } else {
        data = Buffer.from(JSON.stringify(value));
      }

      const originalSize = data.length;

      // Compress if enabled and above threshold
      if (this.config.compressionEnabled && data.length > this.config.compressionThreshold) {
        const compressedData = await this.compressor.compress(data);
        if (compressedData.length < data.length) {
          data = compressedData;
        }
      }

      // Store in L2 (Redis)
      const success = await this.backend.set(fullKey, data, effectiveTTL);
      
      if (success) {
        // Store in L1 cache
        if (this.config.enableL1Cache) {
          this.l1Cache.set(fullKey, value, effectiveTTL);
        }

        this.metrics.sets++;
        this.metrics.totalSize += data.length;
        this.updateCompressionRatio(originalSize, data.length);

        const executionTime = Date.now() - startTime;
        logger.debug('Cache set successful', { 
          key, 
          originalSize, 
          compressedSize: data.length,
          executionTime 
        });

        return {
          success: true,
          value: success,
          cached: true,
          ttl: effectiveTTL,
          executionTime
        };
      }

      return {
        success: false,
        cached: false,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Cache set error', { key, error });
      
      return {
        success: false,
        cached: false,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<CacheResult<boolean>> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key);

    try {
      // Remove from L1
      if (this.config.enableL1Cache) {
        this.l1Cache.delete(fullKey);
      }

      // Remove from L2
      const success = await this.backend.del(fullKey);
      
      this.metrics.deletes++;

      const executionTime = Date.now() - startTime;
      logger.debug('Cache delete', { key, success, executionTime });

      return {
        success: true,
        value: success,
        cached: false,
        executionTime
      };

    } catch (error) {
      logger.error('Cache delete error', { key, error });
      
      return {
        success: false,
        cached: false,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<CacheResult<boolean>> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key);

    try {
      // Check L1 first
      if (this.config.enableL1Cache) {
        const l1Entry = this.l1Cache.get(fullKey);
        if (l1Entry) {
          return {
            success: true,
            value: true,
            cached: true,
            fromL1: true,
            executionTime: Date.now() - startTime
          };
        }
      }

      // Check L2
      const exists = await this.backend.exists(fullKey);

      return {
        success: true,
        value: exists,
        cached: exists,
        fromL1: false,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Cache exists error', { key, error });
      
      return {
        success: false,
        value: false,
        cached: false,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<CacheResult<boolean>> {
    const startTime = Date.now();

    try {
      // Clear L1
      if (this.config.enableL1Cache) {
        this.l1Cache.clear();
      }

      // Clear L2
      const success = await this.backend.flushall();
      
      // Reset metrics
      Object.assign(this.metrics, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        totalSize: 0,
        entryCount: 0,
        hitRate: 0,
        averageAccessTime: 0,
        l1HitRate: 0,
        compressionRatio: 0
      });

      const executionTime = Date.now() - startTime;
      logger.info('Cache cleared', { success, executionTime });

      return {
        success: true,
        value: success,
        cached: false,
        executionTime
      };

    } catch (error) {
      logger.error('Cache clear error', { error });
      
      return {
        success: false,
        value: false,
        cached: false,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return {
      ...this.metrics,
      entryCount: this.l1Cache.getSize()
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: Error }> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.backend.ping();
      return {
        healthy: isHealthy,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Cache-aside pattern helper
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<CacheResult<T>> {
    const getResult = await this.get<T>(key);
    
    if (getResult.cached && getResult.value !== undefined) {
      return getResult;
    }

    try {
      const value = await factory();
      await this.set(key, value, ttl);
      
      return {
        success: true,
        value,
        cached: false,
        executionTime: getResult.executionTime
      };
    } catch (error) {
      logger.error('Cache factory error', { key, error });
      
      return {
        success: false,
        cached: false,
        executionTime: getResult.executionTime
      };
    }
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  /**
   * Update hit rates
   */
  private updateHitRates(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  /**
   * Update average access time
   */
  private updateAverageAccessTime(accessTime: number): void {
    const alpha = 0.1;
    this.metrics.averageAccessTime = this.metrics.averageAccessTime === 0
      ? accessTime
      : alpha * accessTime + (1 - alpha) * this.metrics.averageAccessTime;
  }

  /**
   * Update compression ratio
   */
  private updateCompressionRatio(originalSize: number, compressedSize: number): void {
    if (originalSize > 0) {
      const ratio = compressedSize / originalSize;
      const alpha = 0.1;
      this.metrics.compressionRatio = this.metrics.compressionRatio === 0
        ? ratio
        : alpha * ratio + (1 - alpha) * this.metrics.compressionRatio;
    }
  }
}