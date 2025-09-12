import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { logger } from '@/config/logger';

/**
 * In-memory cache store
 * In production, this should be replaced with Redis
 */
class MemoryCacheStore {
  private cache: Map<string, {
    value: any;
    expiresAt: number;
    tags: string[];
    hitCount: number;
    createdAt: number;
  }> = new Map();

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {return null;}

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hitCount++;
    return entry.value;
  }

  set(key: string, value: any, ttlSeconds: number = 300, tags: string[] = []): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, {
      value,
      expiresAt,
      tags,
      hitCount: 0,
      createdAt: Date.now(),
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Delete all cache entries with specific tags
   */
  deleteByTags(tags: string[]): number {
    let deleted = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: { key: string; hitCount: number; age: number; tags: string[] }[];
    hitRate: number;
  } {
    const entries: { key: string; hitCount: number; age: number; tags: string[] }[] = [];
    let totalHits = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      const age = Math.floor((Date.now() - entry.createdAt) / 1000);
      entries.push({
        key,
        hitCount: entry.hitCount,
        age,
        tags: entry.tags,
      });
      totalHits += entry.hitCount;
    }

    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      entries: entries.sort((a, b) => b.hitCount - a.hitCount),
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  keyGenerator?: (req: Request) => string; // Custom key generator
  condition?: (req: Request, res: Response) => boolean; // Cache condition
  vary?: string[]; // Vary headers
  skipMethods?: string[]; // HTTP methods to skip caching
  skipStatusCodes?: number[]; // Status codes to skip caching
}

/**
 * Advanced caching middleware
 */
export class CacheManager {
  private store: MemoryCacheStore;
  private defaultTTL: number = 300; // 5 minutes

  constructor(defaultTTL: number = 300) {
    this.store = new MemoryCacheStore();
    this.defaultTTL = defaultTTL;

    // Start periodic cleanup
    setInterval(() => {
      const removed = this.store.cleanup();
      if (removed > 0) {
        logger.debug('Cache cleanup completed', { removed });
      }
    }, 60000); // Every minute
  }

  /**
   * Generate cache key from request
   */
  private generateKey(req: Request, keyGenerator?: (req: Request) => string): string {
    if (keyGenerator) {
      return keyGenerator(req);
    }

    // Default key generation
    const url = req.originalUrl || req.url;
    const method = req.method;
    const userId = (req as any).user?.id || 'anonymous';
    const organizationId = req.params?.organizationId || 'no-org';
    
    // Include relevant headers in key
    const relevantHeaders = ['accept', 'accept-language', 'x-api-version'];
    const headerString = relevantHeaders
      .map(header => `${header}:${req.headers[header] || ''}`)
      .join('|');

    const keyString = `${method}:${url}:${userId}:${organizationId}:${headerString}`;
    
    // Hash the key to keep it manageable
    return createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Cache middleware
   */
  middleware(options: CacheOptions = {}) {
    const {
      ttl = this.defaultTTL,
      tags = [],
      keyGenerator,
      condition,
      vary = [],
      skipMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
      skipStatusCodes = [400, 401, 403, 404, 500, 502, 503],
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip caching for certain methods
      if (skipMethods.includes(req.method)) {
        return next();
      }

      // Skip if condition returns false
      if (condition && !condition(req, res)) {
        return next();
      }

      const cacheKey = this.generateKey(req, keyGenerator);
      
      // Try to get from cache
      const cachedResponse = this.store.get(cacheKey);
      if (cachedResponse) {
        logger.debug('Cache hit', { key: cacheKey, url: req.url });
        
        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        
        // Set vary headers
        if (vary.length > 0) {
          res.setHeader('Vary', vary.join(', '));
        }
        
        // Send cached response
        return res.status(cachedResponse.statusCode)
          .set(cachedResponse.headers)
          .send(cachedResponse.body);
      }

      logger.debug('Cache miss', { key: cacheKey, url: req.url });
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      // Capture response for caching
      const originalSend = res.send;
      const originalJson = res.json;
      let responseBody: any;
      let responseSent = false;

      const captureResponse = (body: any) => {
        if (responseSent) {return;}
        responseSent = true;

        // Only cache successful responses
        if (!skipStatusCodes.includes(res.statusCode)) {
          const responseToCache = {
            statusCode: res.statusCode,
            headers: { ...res.getHeaders() },
            body,
          };

          // Remove cache headers from cached response
          delete responseToCache.headers['x-cache'];
          delete responseToCache.headers['x-cache-key'];

          this.store.set(cacheKey, responseToCache, ttl, tags);
          
          logger.debug('Response cached', { 
            key: cacheKey, 
            ttl, 
            statusCode: res.statusCode,
            tags 
          });
        }
      };

      // Override response methods
      res.send = function(body: any) {
        responseBody = body;
        captureResponse(body);
        return originalSend.call(this, body);
      };

      res.json = function(body: any) {
        responseBody = body;
        captureResponse(body);
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Invalidate cache by key
   */
  invalidate(key: string): boolean {
    logger.debug('Cache invalidation', { key });
    return this.store.delete(key);
  }

  /**
   * Invalidate cache by tags
   */
  invalidateByTags(tags: string[]): number {
    logger.debug('Cache invalidation by tags', { tags });
    return this.store.deleteByTags(tags);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    logger.debug('Cache clear all');
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.store.getStats();
  }

  /**
   * Warm cache with data
   */
  warm(key: string, data: any, ttl: number = this.defaultTTL, tags: string[] = []): void {
    this.store.set(key, {
      statusCode: 200,
      headers: {},
      body: data,
    }, ttl, tags);
    logger.debug('Cache warmed', { key, ttl, tags });
  }
}

// Create global cache manager instance
export const cacheManager = new CacheManager();

/**
 * Pre-configured cache middleware for different use cases
 */

// Short-term cache for frequently accessed data (5 minutes)
export const shortCache = cacheManager.middleware({
  ttl: 300,
  tags: ['short-term'],
});

// Medium-term cache for moderately changing data (30 minutes)
export const mediumCache = cacheManager.middleware({
  ttl: 1800,
  tags: ['medium-term'],
});

// Long-term cache for rarely changing data (2 hours)
export const longCache = cacheManager.middleware({
  ttl: 7200,
  tags: ['long-term'],
});

// User-specific cache
export const userCache = cacheManager.middleware({
  ttl: 900, // 15 minutes
  tags: ['user-specific'],
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || 'anonymous';
    const url = req.originalUrl || req.url;
    return createHash('md5').update(`user:${userId}:${url}`).digest('hex');
  },
});

// Organization-specific cache
export const orgCache = cacheManager.middleware({
  ttl: 1800, // 30 minutes
  tags: ['organization-specific'],
  keyGenerator: (req) => {
    const orgId = req.params?.organizationId || 'no-org';
    const url = req.originalUrl || req.url;
    return createHash('md5').update(`org:${orgId}:${url}`).digest('hex');
  },
});

// Public data cache (longer TTL, no user-specific data)
export const publicCache = cacheManager.middleware({
  ttl: 3600, // 1 hour
  tags: ['public'],
  condition: (req) => {
    // Only cache if no user-specific data
    return !(req as any).user;
  },
});

// Report cache (for expensive report generation)
export const reportCache = cacheManager.middleware({
  ttl: 3600, // 1 hour
  tags: ['reports'],
  condition: (req, res) => {
    // Only cache GET requests for reports
    return req.method === 'GET' && req.path.includes('/reports');
  },
});

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate user-specific cache
   */
  user: (userId: string) => {
    return cacheManager.invalidateByTags([`user:${userId}`]);
  },

  /**
   * Invalidate organization-specific cache
   */
  organization: (organizationId: string) => {
    return cacheManager.invalidateByTags([`org:${organizationId}`]);
  },

  /**
   * Invalidate by resource type
   */
  resource: (resourceType: string) => {
    return cacheManager.invalidateByTags([resourceType]);
  },

  /**
   * Invalidate all reports
   */
  reports: () => {
    return cacheManager.invalidateByTags(['reports']);
  },

  /**
   * Invalidate all short-term cache
   */
  shortTerm: () => {
    return cacheManager.invalidateByTags(['short-term']);
  },
};

/**
 * Cache warming helpers
 */
export const CacheWarming = {
  /**
   * Warm frequently accessed endpoints
   */
  async warmFrequentEndpoints(): Promise<void> {
    // This would typically make requests to frequently accessed endpoints
    // to populate the cache during application startup
    logger.info('Cache warming started');
    
    // TODO: Implement actual cache warming logic
    // Examples:
    // - Warm user dashboard data
    // - Warm common report queries
    // - Warm organization settings
    
    logger.info('Cache warming completed');
  },

  /**
   * Warm specific organization data
   */
  async warmOrganizationData(organizationId: string): Promise<void> {
    logger.info('Warming organization cache', { organizationId });
    
    // TODO: Implement organization-specific cache warming
    
    logger.info('Organization cache warming completed', { organizationId });
  },
};

/**
 * Cache health check
 */
export const getCacheHealth = () => {
  const stats = cacheManager.getStats();
  
  return {
    status: 'healthy',
    size: stats.size,
    hitRate: stats.hitRate,
    topEntries: stats.entries.slice(0, 10),
    memoryUsage: process.memoryUsage(),
  };
};