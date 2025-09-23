/**
 * Enterprise Caching System
 * Provides multi-tier caching with TTL, compression, and invalidation strategies
 */

import { logger } from '../config/logger';
import { EnterpriseError } from '../utils/error-handling';
import { CACHE_TTL, HTTP_STATUS } from '../constants';
import type { CacheTTL } from '../constants';

export interface CacheEntry<T = unknown> {
  readonly data: T;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly accessCount: number;
  readonly lastAccessed: Date;
  readonly size: number;
  readonly compressed: boolean;
  readonly tags: readonly string[];
}

export interface CacheStatistics {
  readonly hits: number;
  readonly misses: number;
  readonly hitRatio: number;
  readonly totalEntries: number;
  readonly totalSize: number;
  readonly averageEntrySize: number;
  readonly oldestEntry?: Date;
  readonly newestEntry?: Date;
}

export interface CacheConfiguration {
  readonly maxSize: number;
  readonly defaultTTL: CacheTTL;
  readonly compressionThreshold: number;
  readonly compressionEnabled: boolean;
  readonly evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  readonly cleanupInterval: number;
}

export type CacheInvalidationStrategy = 'time-based' | 'tag-based' | 'dependency-based' | 'manual';

/**
 * Abstract base cache implementation
 */
export abstract class BaseCache {
  protected readonly configuration: CacheConfiguration;
  protected readonly statistics: {
    hits: number;
    misses: number;
    evictions: number;
  };

  constructor(configuration: Partial<CacheConfiguration> = {}) {
    this.configuration = {
      maxSize: 1000,
      defaultTTL: CACHE_TTL.MEDIUM,
      compressionThreshold: 1024, // 1KB
      compressionEnabled: true,
      evictionPolicy: 'LRU',
      cleanupInterval: 60000, // 1 minute
      ...configuration
    };

    this.statistics = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    // Start cleanup process
    this.startCleanupProcess();
  }

  public abstract get<T>(key: string): Promise<T | null>;
  public abstract set<T>(key: string, value: T, ttl?: number, tags?: readonly string[]): Promise<void>;
  public abstract delete(key: string): Promise<boolean>;
  public abstract clear(): Promise<void>;
  public abstract keys(pattern?: string): Promise<readonly string[]>;
  public abstract getStatistics(): CacheStatistics;

  protected abstract cleanup(): Promise<void>;
  protected abstract startCleanupProcess(): void;

  /**
   * Get multiple cache entries
   */
  public async getMultiple<T>(keys: readonly string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value !== null) {
          results.set(key, value);
        }
      })
    );

    return results;
  }

  /**
   * Set multiple cache entries
   */
  public async setMultiple<T>(
    entries: Map<string, T>,
    ttl?: number,
    tags?: readonly string[]
  ): Promise<void> {
    await Promise.all(
      Array.from(entries.entries()).map(async ([key, value]) =>
        { await this.set(key, value, ttl, tags); }
      )
    );
  }

  /**
   * Invalidate cache by tags
   */
  public async invalidateByTags(tags: readonly string[]): Promise<void> {
    const allKeys = await this.keys();
    const keysToDelete: string[] = [];

    for (const key of allKeys) {
      const entry = await this.getCacheEntry(key);
      if (entry !== null && this.hasMatchingTags(entry.tags, tags)) {
        keysToDelete.push(key);
      }
    }

    await Promise.all(keysToDelete.map(async key => await this.delete(key)));
  }

  protected abstract getCacheEntry(key: string): Promise<CacheEntry | null>;

  protected hasMatchingTags(entryTags: readonly string[], searchTags: readonly string[]): boolean {
    return searchTags.some(tag => entryTags.includes(tag));
  }

  protected calculateSize(data: unknown): number {
    return JSON.stringify(data).length;
  }

  protected shouldCompress(size: number): boolean {
    return this.configuration.compressionEnabled && size > this.configuration.compressionThreshold;
  }

  protected compressData(data: unknown): string {
    // Simple compression simulation - in real implementation, use a proper compression library
    const jsonString = JSON.stringify(data);
    return `compressed:${jsonString}`;
  }

  protected decompressData(compressedData: string): unknown {
    // Simple decompression simulation
    if (compressedData.startsWith('compressed:')) {
      return JSON.parse(compressedData.substring(11));
    }
    return JSON.parse(compressedData);
  }

  protected updateHitStatistics(): void {
    this.statistics.hits++;
  }

  protected updateMissStatistics(): void {
    this.statistics.misses++;
  }

  protected updateEvictionStatistics(): void {
    this.statistics.evictions++;
  }
}

/**
 * In-memory cache implementation
 */
export class MemoryCache extends BaseCache {
  private readonly cache = new Map<string, CacheEntry>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(configuration?: Partial<CacheConfiguration>) {
    super(configuration);
    logger.debug('MemoryCache initialized');
  }

  public async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (entry === undefined) {
      this.updateMissStatistics();
      return null;
    }

    // Check if entry has expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.updateMissStatistics();
      return null;
    }

    // Update access statistics
    const updatedEntry = {
      ...entry,
      accessCount: entry.accessCount + 1,
      lastAccessed: new Date()
    };
    this.cache.set(key, updatedEntry);

    this.updateHitStatistics();
    return entry.compressed ? this.decompressData(entry.data as string) as T : entry.data as T;
  }

  public async set<T>(
    key: string,
    value: T,
    ttl: number = this.configuration.defaultTTL,
    tags: readonly string[] = []
  ): Promise<void> {
    const now = new Date();
    const size = this.calculateSize(value);
    const shouldCompress = this.shouldCompress(size);

    // Check if we need to evict entries
    await this.evictIfNecessary();

    const entry: CacheEntry<T | string> = {
      data: shouldCompress ? this.compressData(value) : value,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl),
      accessCount: 0,
      lastAccessed: now,
      size,
      compressed: shouldCompress,
      tags
    };

    this.cache.set(key, entry);
    logger.debug(`Cached entry '${key}' (size: ${size}, compressed: ${shouldCompress})`);
  }

  public async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Deleted cache entry '${key}'`);
    }
    return deleted;
  }

  public async clear(): Promise<void> {
    const {size} = this.cache;
    this.cache.clear();
    logger.debug(`Cleared ${size} cache entries`);
  }

  public async keys(pattern?: string): Promise<readonly string[]> {
    const allKeys = Array.from(this.cache.keys());
    
    if (pattern === undefined) {
      return allKeys;
    }

    // Simple pattern matching - in real implementation, use proper regex or glob patterns
    return allKeys.filter(key => key.includes(pattern));
  }

  public getStatistics(): CacheStatistics {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const dates = entries.map(entry => entry.createdAt);

    return {
      hits: this.statistics.hits,
      misses: this.statistics.misses,
      hitRatio: this.statistics.hits / (this.statistics.hits + this.statistics.misses) || 0,
      totalEntries: this.cache.size,
      totalSize,
      averageEntrySize: this.cache.size > 0 ? totalSize / this.cache.size : 0,
      oldestEntry: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined,
      newestEntry: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : undefined
    };
  }

  protected async getCacheEntry(key: string): Promise<CacheEntry | null> {
    return this.cache.get(key) ?? null;
  }

  protected async cleanup(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  protected startCleanupProcess(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('Error during cache cleanup:', error);
      });
    }, this.configuration.cleanupInterval);
  }

  private async evictIfNecessary(): Promise<void> {
    // Critical fix: Evict more aggressively to prevent memory bloat
    if (this.cache.size >= this.configuration.maxSize) {
      const targetEvictionCount = Math.max(1, Math.floor(this.configuration.maxSize * 0.1)); // Evict 10%
      const keysToEvict = this.selectKeysForEviction(targetEvictionCount);
      
      for (const key of keysToEvict) {
        const entry = this.cache.get(key);
        if (entry) {
          // Critical fix: Explicit cleanup for compressed data
          if (entry.compressed && typeof entry.data === 'string') {
            // Clear the compressed data reference
            (entry as { data: string }).data = '';
          }
        }
        this.cache.delete(key);
        this.updateEvictionStatistics();
      }
      
      logger.debug(`Evicted ${keysToEvict.length} cache entries to free memory`);
    }
  }

  private selectKeysForEviction(count: number): string[] {
    // Critical fix: Use a more efficient approach for large caches
    if (this.cache.size <= 100) {
      // For small caches, use the existing approach
      const entries = Array.from(this.cache.entries());
      return this.sortEntriesForEviction(entries).slice(0, count).map(([key]) => key);
    }

    // Critical fix: For large caches, use iterator-based approach to avoid memory spike
    const candidates: Array<[string, CacheEntry]> = [];
    const iterator = this.cache.entries();
    
    // Sample entries for eviction consideration
    const sampleSize = Math.min(this.cache.size, count * 5); // Sample 5x what we need
    
    for (let i = 0; i < sampleSize; i++) {
      const next = iterator.next();
      if (next.done) {break;}
      candidates.push(next.value);
    }

    return this.sortEntriesForEviction(candidates).slice(0, count).map(([key]) => key);
  }

  private sortEntriesForEviction(entries: Array<[string, CacheEntry]>): Array<[string, CacheEntry]> {
    switch (this.configuration.evictionPolicy) {
      case 'LRU': // Least Recently Used
        return entries.sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
      case 'LFU': // Least Frequently Used
        return entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
      case 'FIFO': // First In, First Out
        return entries.sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());
      default:
        return entries;
    }
  }

  public dispose(): void {
    if (this.cleanupTimer !== undefined) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
  }
}

/**
 * Cache Manager - Orchestrates multiple cache layers
 */
export class CacheManager {
  private readonly caches = new Map<string, BaseCache>();
  private readonly defaultCache: BaseCache;

  constructor(defaultConfiguration?: Partial<CacheConfiguration>) {
    this.defaultCache = new MemoryCache(defaultConfiguration);
    this.caches.set('default', this.defaultCache);
  }

  /**
   * Add a named cache layer
   */
  public addCache(name: string, cache: BaseCache): void {
    this.caches.set(name, cache);
  }

  /**
   * Get from cache with fallback to other layers
   */
  public async get<T>(key: string, cacheName: string = 'default'): Promise<T | null> {
    const cache = this.caches.get(cacheName);
    if (cache === undefined) {
      throw new EnterpriseError(
        'CACHE_NOT_FOUND',
        `Cache '${cacheName}' not found`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    return await cache.get<T>(key);
  }

  /**
   * Set in cache
   */
  public async set<T>(
    key: string,
    value: T,
    ttl?: number,
    tags?: readonly string[],
    cacheName: string = 'default'
  ): Promise<void> {
    const cache = this.caches.get(cacheName);
    if (cache === undefined) {
      throw new EnterpriseError(
        'CACHE_NOT_FOUND',
        `Cache '${cacheName}' not found`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    await cache.set(key, value, ttl, tags);
  }

  /**
   * Delete from all caches
   */
  public async delete(key: string): Promise<void> {
    await Promise.all(
      Array.from(this.caches.values()).map(async cache => await cache.delete(key))
    );
  }

  /**
   * Clear all caches
   */
  public async clear(): Promise<void> {
    await Promise.all(
      Array.from(this.caches.values()).map(async cache => { await cache.clear(); })
    );
  }

  /**
   * Get statistics from all caches
   */
  public getStatistics(): Record<string, CacheStatistics> {
    const statistics: Record<string, CacheStatistics> = {};
    
    for (const [name, cache] of this.caches) {
      statistics[name] = cache.getStatistics();
    }
    
    return statistics;
  }

  /**
   * Invalidate by tags across all caches
   */
  public async invalidateByTags(tags: readonly string[]): Promise<void> {
    await Promise.all(
      Array.from(this.caches.values()).map(async cache => { await cache.invalidateByTags(tags); })
    );
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();