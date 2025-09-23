import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './errorHandler';
import { logger } from '@/config/logger';

/**
 * In-memory rate limiter store
 * In production, this should be replaced with Redis
 */
class MemoryStore {
  private readonly store: Map<string, { count: number; resetTime: number }> = new Map();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const data = this.store.get(key);
    if (!data) {return null;}

    // Check if the window has expired
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return null;
    }

    return data;
  }

  async set(key: string, count: number, windowMs: number): Promise<void> {
    this.store.set(key, {
      count,
      resetTime: Date.now() + windowMs,
    });
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const existing = await this.get(key);
    
    if (existing) {
      const newData = { ...existing, count: existing.count + 1 };
      this.store.set(key, newData);
      return newData;
    } else {
      const newData = { count: 1, resetTime: Date.now() + windowMs };
      this.store.set(key, newData);
      return newData;
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

export interface RateLimitConfig {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Maximum requests per window
  message?: string; // Custom error message
  standardHeaders?: boolean; // Add standard rate limit headers
  legacyHeaders?: boolean; // Add legacy X-RateLimit headers
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
  skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
  onLimitReached?: (req: Request) => void; // Callback when limit is reached
}

/**
 * Advanced rate limiter with multiple strategies
 */
export class RateLimiter {
  private readonly store: MemoryStore;
  private readonly config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig = {}) {
    this.store = new MemoryStore();
    this.config = {
      windowMs: config.windowMs ?? 60 * 1000, // 1 minute
      max: config.max ?? 100, // 100 requests per window
      message: config.message ?? 'Too many requests, please try again later',
      standardHeaders: config.standardHeaders ?? true,
      legacyHeaders: config.legacyHeaders ?? false,
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      skipFailedRequests: config.skipFailedRequests ?? false,
      keyGenerator: config.keyGenerator ?? this.defaultKeyGenerator,
      skip: config.skip ?? (() => false),
      onLimitReached: config.onLimitReached ?? (() => {}),
    };

    // Start cleanup interval
    setInterval(() => { this.store.cleanup(); }, this.config.windowMs);
  }

  private defaultKeyGenerator(req: Request): string {
    return req.ip || 'anonymous';
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Skip if configured to skip this request
        if (this.config.skip(req)) {
          next(); return;
        }

        const key = this.config.keyGenerator(req);
        const { count, resetTime } = await this.store.increment(key, this.config.windowMs);

        // Add standard rate limit headers
        if (this.config.standardHeaders) {
          res.setHeader('RateLimit-Limit', this.config.max);
          res.setHeader('RateLimit-Remaining', Math.max(0, this.config.max - count));
          res.setHeader('RateLimit-Reset', new Date(resetTime).toISOString());
        }

        // Add legacy headers for backward compatibility
        if (this.config.legacyHeaders) {
          res.setHeader('X-RateLimit-Limit', this.config.max);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.max - count));
          res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
        }

        // Check if limit exceeded
        if (count > this.config.max) {
          this.config.onLimitReached(req);
          
          logger.warn('Rate limit exceeded', {
            ip: req.ip,
            key,
            count,
            limit: this.config.max,
            url: req.url,
            userAgent: req.get('User-Agent'),
          });

          throw new RateLimitError(this.config.message);
        }

        // Handle request completion for conditional counting
        const originalJson = res.json;
        const originalSend = res.send;
        let responseSent = false;

        const handleResponse = () => {
          if (responseSent) {return;}
          responseSent = true;

          // Skip counting based on response status
          if (this.config.skipSuccessfulRequests && res.statusCode < 400) {
            // Decrement counter for successful requests if configured
            this.store.increment(key, this.config.windowMs).then((data) => {
              this.store.set(key, Math.max(0, data.count - 1), this.config.windowMs);
            });
          } else if (this.config.skipFailedRequests && res.statusCode >= 400) {
            // Decrement counter for failed requests if configured
            this.store.increment(key, this.config.windowMs).then((data) => {
              this.store.set(key, Math.max(0, data.count - 1), this.config.windowMs);
            });
          }
        };

        // Override response methods to track completion
        res.json = function(...args: any[]) {
          handleResponse();
          return originalJson.apply(this, args);
        };

        res.send = function(...args: any[]) {
          handleResponse();
          return originalSend.apply(this, args);
        };

        next();
      } catch (error: unknown) {
        next(error);
      }
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetKey(key: string): Promise<void> {
    await this.store.reset(key);
  }

  /**
   * Get current status for a key
   */
  async getStatus(key: string): Promise<{ count: number; remaining: number; resetTime: Date } | null> {
    const data = await this.store.get(key);
    if (!data) {return null;}

    return {
      count: data.count,
      remaining: Math.max(0, this.config.max - data.count),
      resetTime: new Date(data.resetTime),
    };
  }
}

/**
 * Pre-configured rate limiters for different use cases
 */

// General API rate limiter - 1000 requests per hour
export const apiRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: 'API rate limit exceeded. Maximum 1000 requests per hour.',
  standardHeaders: true,
});

// Strict rate limiter for sensitive operations - 10 requests per minute
export const strictRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Rate limit exceeded for sensitive operation. Maximum 10 requests per minute.',
  standardHeaders: true,
});

// Authentication rate limiter - 5 attempts per 15 minutes
export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
});

// File upload rate limiter - 50 uploads per hour
export const uploadRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Upload rate limit exceeded. Maximum 50 uploads per hour.',
  standardHeaders: true,
});

// Search rate limiter - 100 searches per 10 minutes
export const searchRateLimit = new RateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100,
  message: 'Search rate limit exceeded. Maximum 100 searches per 10 minutes.',
  standardHeaders: true,
});

// Report generation rate limiter - 20 reports per hour
export const reportRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Report generation rate limit exceeded. Maximum 20 reports per hour.',
  standardHeaders: true,
});

/**
 * Dynamic rate limiter that adjusts limits based on user tier
 */
export const createTieredRateLimit = (getTier: (req: Request) => 'free' | 'premium' | 'enterprise') => {
  const tierLimits = {
    free: { windowMs: 60 * 60 * 1000, max: 100 }, // 100/hour
    premium: { windowMs: 60 * 60 * 1000, max: 1000 }, // 1000/hour
    enterprise: { windowMs: 60 * 60 * 1000, max: 10000 }, // 10000/hour
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    const tier = getTier(req);
    const config = tierLimits[tier];
    
    const rateLimiter = new RateLimiter({
      ...config,
      keyGenerator: (req) => `${req.ip}-${tier}`,
      message: `Rate limit exceeded for ${tier} tier. Upgrade for higher limits.`,
    });

    await rateLimiter.middleware()(req, res, next);
  };
};

/**
 * Rate limiter based on API key
 */
export const createAPIKeyRateLimit = (getAPIKeyLimits: (apiKey: string) => { windowMs: number; max: number }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      next(); return;
    }

    try {
      const limits = getAPIKeyLimits(apiKey);
      const rateLimiter = new RateLimiter({
        ...limits,
        keyGenerator: () => `api-key-${apiKey}`,
        message: 'API key rate limit exceeded.',
      });

      await rateLimiter.middleware()(req, res, next); return;
    } catch (error: unknown) {
      // If we can't get limits, use default
      await apiRateLimit.middleware()(req, res, next); return;
    }
  };
};