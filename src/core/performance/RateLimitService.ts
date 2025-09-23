/**
 * Enterprise Rate Limiting System
 * Advanced rate limiting with sliding windows, user tiers, and dynamic limits
 */

import { logger } from '../../config/logger';
import { UserRole } from '../../types/enums-constants';

/**
 * Rate limiting strategy
 */
export enum RateLimitStrategy {
  FIXED_WINDOW = 'FIXED_WINDOW',
  SLIDING_WINDOW = 'SLIDING_WINDOW',
  TOKEN_BUCKET = 'TOKEN_BUCKET',
  LEAKY_BUCKET = 'LEAKY_BUCKET'
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  readonly strategy: RateLimitStrategy;
  readonly windowSizeMs: number;
  readonly maxRequests: number;
  readonly burstLimit?: number;
  readonly refillRate?: number;
  readonly skipSuccessfulRequests?: boolean;
  readonly skipFailedRequests?: boolean;
  readonly keyGenerator?: string;
  readonly message?: string;
  readonly headers?: boolean;
  readonly onLimitReached?: string;
}

/**
 * Rate limit tier configuration
 */
export interface RateLimitTier {
  readonly name: string;
  readonly description: string;
  readonly userRoles: readonly UserRole[];
  readonly organizationTypes?: readonly string[];
  readonly limits: readonly RateLimitRule[];
  readonly priority: number;
}

/**
 * Rate limit rule
 */
export interface RateLimitRule {
  readonly path: string;
  readonly method?: string;
  readonly config: RateLimitConfig;
  readonly enabled: boolean;
  readonly description: string;
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  readonly key: string;
  readonly requestCount: number;
  readonly windowStart: Date;
  readonly lastRequest: Date;
  readonly tokensRemaining?: number;
  readonly isBlocked: boolean;
  readonly resetTime: Date;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetTime: Date;
  readonly retryAfter?: number;
  readonly tier: string;
  readonly rule: string;
}

/**
 * Rate limit store interface
 */
export interface IRateLimitStore {
  get(key: string): Promise<RateLimitState | null>;
  set(key: string, state: RateLimitState, ttl: number): Promise<boolean>;
  increment(key: string, ttl: number): Promise<number>;
  reset(key: string): Promise<boolean>;
  cleanup(): Promise<number>;
}

/**
 * Request context for rate limiting
 */
export interface RequestContext {
  readonly ip: string;
  readonly userId?: string;
  readonly organizationId?: string;
  readonly userRole?: UserRole;
  readonly path: string;
  readonly method: string;
  readonly userAgent?: string;
  readonly apiKey?: string;
}

/**
 * In-memory rate limit store implementation
 */
export class MemoryRateLimitStore implements IRateLimitStore {
  private readonly store = new Map<string, RateLimitState & { ttl: number }>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    this.startCleanup(cleanupIntervalMs);
  }

  async get(key: string): Promise<RateLimitState | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.ttl) {
      this.store.delete(key);
      return null;
    }
    
    return {
      key: entry.key,
      requestCount: entry.requestCount,
      windowStart: entry.windowStart,
      lastRequest: entry.lastRequest,
      tokensRemaining: entry.tokensRemaining,
      isBlocked: entry.isBlocked,
      resetTime: entry.resetTime
    };
  }

  async set(key: string, state: RateLimitState, ttl: number): Promise<boolean> {
    this.store.set(key, {
      ...state,
      ttl: Date.now() + ttl
    });
    return true;
  }

  async increment(key: string, ttl: number): Promise<number> {
    const existing = this.store.get(key);
    const now = Date.now();
    
    if (existing && now <= existing.ttl) {
      existing.requestCount++;
      existing.lastRequest = new Date();
      return existing.requestCount;
    } else {
      const newState: RateLimitState & { ttl: number } = {
        key,
        requestCount: 1,
        windowStart: new Date(),
        lastRequest: new Date(),
        isBlocked: false,
        resetTime: new Date(now + ttl),
        ttl: now + ttl
      };
      this.store.set(key, newState);
      return 1;
    }
  }

  async reset(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.ttl) {
        this.store.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(async () => {
      const cleaned = await this.cleanup();
      if (cleaned > 0) {
        logger.debug('Rate limit store cleanup', { cleanedEntries: cleaned });
      }
    }, intervalMs);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Enterprise rate limiting service
 */
export class EnterpriseRateLimitService {
  private static instance: EnterpriseRateLimitService;
  private readonly store: IRateLimitStore;
  private readonly tiers: Map<string, RateLimitTier> = new Map();
  private readonly globalRules: RateLimitRule[] = [];

  private constructor(store: IRateLimitStore) {
    this.store = store;
    this.initializeDefaultTiers();
  }

  static getInstance(store?: IRateLimitStore): EnterpriseRateLimitService {
    if (!EnterpriseRateLimitService.instance) {
      if (!store) {
        store = new MemoryRateLimitStore();
      }
      EnterpriseRateLimitService.instance = new EnterpriseRateLimitService(store);
    }
    return EnterpriseRateLimitService.instance;
  }

  /**
   * Check if request is allowed under rate limits
   */
  async checkLimit(context: RequestContext): Promise<RateLimitResult> {
    try {
      // Find applicable tier and rule
      const { tier, rule } = this.findApplicableRule(context);
      
      if (!rule || !rule.enabled) {
        // No rate limit applies
        return {
          allowed: true,
          limit: Infinity,
          remaining: Infinity,
          resetTime: new Date(Date.now() + 3600000), // 1 hour from now
          tier: tier.name,
          rule: 'none'
        };
      }

      // Generate rate limit key
      const key = this.generateKey(context, rule);
      
      // Check rate limit based on strategy
      const result = await this.checkRateLimit(key, rule.config);
      
      logger.debug('Rate limit check', {
        key,
        allowed: result.allowed,
        tier: tier.name,
        rule: rule.path,
        remaining: result.remaining
      });

      // Log if limit exceeded
      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          key,
          tier: tier.name,
          rule: rule.path,
          limit: result.limit,
          userId: context.userId,
          ip: context.ip
        });
      }

      return {
        ...result,
        tier: tier.name,
        rule: rule.path
      };

    } catch (error) {
      logger.error('Rate limit check error', { error, context });
      
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetTime: new Date(),
        tier: 'error',
        rule: 'error'
      };
    }
  }

  /**
   * Register rate limit tier
   */
  registerTier(tier: RateLimitTier): void {
    this.tiers.set(tier.name, tier);
    
    // Sort tiers by priority (higher priority first)
    const sortedTiers = Array.from(this.tiers.values())
      .sort((a, b) => b.priority - a.priority);
    
    this.tiers.clear();
    for (const sortedTier of sortedTiers) {
      this.tiers.set(sortedTier.name, sortedTier);
    }
    
    logger.info('Rate limit tier registered', { 
      tierName: tier.name,
      priority: tier.priority,
      rulesCount: tier.limits.length 
    });
  }

  /**
   * Add global rate limit rule
   */
  addGlobalRule(rule: RateLimitRule): void {
    this.globalRules.push(rule);
    logger.info('Global rate limit rule added', { 
      path: rule.path,
      method: rule.method,
      enabled: rule.enabled 
    });
  }

  /**
   * Reset rate limit for key
   */
  async resetLimit(context: RequestContext): Promise<boolean> {
    const { rule } = this.findApplicableRule(context);
    
    if (rule) {
      const key = this.generateKey(context, rule);
      const success = await this.store.reset(key);
      
      logger.info('Rate limit reset', { 
        key, 
        success, 
        rule: rule.path 
      });
      
      return success;
    }
    
    return false;
  }

  /**
   * Get current rate limit state
   */
  async getState(context: RequestContext): Promise<RateLimitState | null> {
    const { rule } = this.findApplicableRule(context);
    
    if (rule) {
      const key = this.generateKey(context, rule);
      return await this.store.get(key);
    }
    
    return null;
  }

  /**
   * Cleanup expired rate limit entries
   */
  async cleanup(): Promise<number> {
    return await this.store.cleanup();
  }

  /**
   * Find applicable tier and rule for request
   */
  private findApplicableRule(context: RequestContext): { tier: RateLimitTier; rule?: RateLimitRule } {
    // Check user-specific tiers first
    for (const tier of this.tiers.values()) {
      if (this.tierApplies(tier, context)) {
        const rule = this.findMatchingRule(tier.limits, context);
        if (rule) {
          return { tier, rule };
        }
      }
    }
    
    // Check global rules
    const globalRule = this.findMatchingRule(this.globalRules, context);
    if (globalRule) {
      return { 
        tier: { 
          name: 'global', 
          description: 'Global rules', 
          userRoles: [], 
          limits: [],
          priority: 0 
        }, 
        rule: globalRule 
      };
    }
    
    // Return default tier with no rules
    return { 
      tier: { 
        name: 'default', 
        description: 'Default tier', 
        userRoles: [], 
        limits: [],
        priority: 0 
      } 
    };
  }

  /**
   * Check if tier applies to request context
   */
  private tierApplies(tier: RateLimitTier, context: RequestContext): boolean {
    // Check user role
    if ((context.userRole != null) && tier.userRoles.includes(context.userRole)) {
      return true;
    }
    
    return false;
  }

  /**
   * Find matching rule for request
   */
  private findMatchingRule(rules: readonly RateLimitRule[], context: RequestContext): RateLimitRule | undefined {
    return rules.find(rule => {
      if (!rule.enabled) {
        return false;
      }
      
      // Check path match (supports wildcards)
      if (!this.pathMatches(rule.path, context.path)) {
        return false;
      }
      
      // Check method match
      if (rule.method && rule.method !== context.method) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Check if path matches rule pattern
   */
  private pathMatches(pattern: string, path: string): boolean {
    if (pattern === '*' || pattern === path) {
      return true;
    }
    
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Generate unique key for rate limiting
   */
  private generateKey(context: RequestContext, rule: RateLimitRule): string {
    const parts = [
      rule.path,
      rule.method || 'ANY'
    ];
    
    // Add user-specific identifier if available
    if (context.userId) {
      parts.push(`user:${context.userId}`);
    } else if (context.apiKey) {
      parts.push(`api:${context.apiKey}`);
    } else {
      parts.push(`ip:${context.ip}`);
    }
    
    return parts.join(':');
  }

  /**
   * Check rate limit based on strategy
   */
  private async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    switch (config.strategy) {
      case RateLimitStrategy.FIXED_WINDOW:
        return await this.checkFixedWindow(key, config);
      
      case RateLimitStrategy.SLIDING_WINDOW:
        return await this.checkSlidingWindow(key, config);
      
      case RateLimitStrategy.TOKEN_BUCKET:
        return await this.checkTokenBucket(key, config);
      
      case RateLimitStrategy.LEAKY_BUCKET:
        return await this.checkLeakyBucket(key, config);
      
      default:
        return await this.checkFixedWindow(key, config);
    }
  }

  /**
   * Fixed window rate limiting
   */
  private async checkFixedWindow(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowSizeMs) * config.windowSizeMs;
    const windowKey = `${key}:${windowStart}`;
    
    const count = await this.store.increment(windowKey, config.windowSizeMs);
    const allowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    const resetTime = new Date(windowStart + config.windowSizeMs);
    
    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime.getTime() - now) / 1000)
    };
  }

  /**
   * Sliding window rate limiting
   */
  private async checkSlidingWindow(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowSizeMs;
    
    // This is a simplified implementation
    // In production, you'd want to maintain a more detailed sliding window
    const state = await this.store.get(key);
    
    if (!state || state.windowStart.getTime() < windowStart) {
      // Start new window
      const newState: RateLimitState = {
        key,
        requestCount: 1,
        windowStart: new Date(now),
        lastRequest: new Date(now),
        isBlocked: false,
        resetTime: new Date(now + config.windowSizeMs)
      };
      
      await this.store.set(key, newState, config.windowSizeMs);
      
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: newState.resetTime
      };
    } else {
      // Update existing window
      const newCount = state.requestCount + 1;
      const allowed = newCount <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - newCount);
      
      const updatedState: RateLimitState = {
        ...state,
        requestCount: newCount,
        lastRequest: new Date(now),
        isBlocked: !allowed
      };
      
      await this.store.set(key, updatedState, config.windowSizeMs);
      
      return {
        allowed,
        limit: config.maxRequests,
        remaining,
        resetTime: state.resetTime,
        retryAfter: allowed ? undefined : Math.ceil((state.resetTime.getTime() - now) / 1000)
      };
    }
  }

  /**
   * Token bucket rate limiting
   */
  private async checkTokenBucket(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const state = await this.store.get(key);
    const refillRate = config.refillRate || 1;
    const bucketSize = config.maxRequests;
    
    let tokens = bucketSize; // Start with full bucket
    let lastRefill = now;
    
    if (state?.tokensRemaining !== undefined) {
      tokens = state.tokensRemaining;
      lastRefill = state.lastRequest.getTime();
      
      // Add tokens based on time elapsed
      const timePassed = now - lastRefill;
      const tokensToAdd = Math.floor(timePassed / 1000 * refillRate);
      tokens = Math.min(bucketSize, tokens + tokensToAdd);
    }
    
    const allowed = tokens >= 1;
    const newTokens = allowed ? tokens - 1 : tokens;
    
    const newState: RateLimitState = {
      key,
      requestCount: (state?.requestCount || 0) + (allowed ? 1 : 0),
      windowStart: state?.windowStart || new Date(now),
      lastRequest: new Date(now),
      tokensRemaining: newTokens,
      isBlocked: !allowed,
      resetTime: new Date(now + (bucketSize - newTokens) * 1000 / refillRate)
    };
    
    await this.store.set(key, newState, config.windowSizeMs);
    
    return {
      allowed,
      limit: bucketSize,
      remaining: newTokens,
      resetTime: newState.resetTime,
      retryAfter: allowed ? undefined : Math.ceil((1000 / refillRate))
    };
  }

  /**
   * Leaky bucket rate limiting (simplified implementation)
   */
  private async checkLeakyBucket(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // This is a simplified implementation of leaky bucket
    // In production, you'd want a more sophisticated approach
    return await this.checkTokenBucket(key, config);
  }

  /**
   * Initialize default rate limit tiers
   */
  private initializeDefaultTiers(): void {
    // Free tier
    this.registerTier({
      name: 'free',
      description: 'Free tier with basic limits',
      userRoles: [UserRole.EMPLOYEE, UserRole.READONLY],
      limits: [
        {
          path: '/api/*',
          config: {
            strategy: RateLimitStrategy.FIXED_WINDOW,
            windowSizeMs: 60000, // 1 minute
            maxRequests: 100,
            message: 'Too many requests from this user'
          },
          enabled: true,
          description: 'General API limit for free tier'
        }
      ],
      priority: 1
    });

    // Professional tier
    this.registerTier({
      name: 'professional',
      description: 'Professional tier with higher limits',
      userRoles: [UserRole.FACILITY_MANAGER, UserRole.TECHNICIAN],
      limits: [
        {
          path: '/api/*',
          config: {
            strategy: RateLimitStrategy.SLIDING_WINDOW,
            windowSizeMs: 60000, // 1 minute
            maxRequests: 1000,
            message: 'Too many requests from this user'
          },
          enabled: true,
          description: 'General API limit for professional tier'
        }
      ],
      priority: 2
    });

    // Enterprise tier
    this.registerTier({
      name: 'enterprise',
      description: 'Enterprise tier with high limits',
      userRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      limits: [
        {
          path: '/api/*',
          config: {
            strategy: RateLimitStrategy.TOKEN_BUCKET,
            windowSizeMs: 60000, // 1 minute
            maxRequests: 10000,
            refillRate: 100, // tokens per second
            message: 'Too many requests from this user'
          },
          enabled: true,
          description: 'General API limit for enterprise tier'
        }
      ],
      priority: 3
    });
  }
}

/**
 * Rate limiting middleware function
 */
export function createRateLimitMiddleware(
  path?: string,
  config?: Partial<RateLimitConfig>
): (req: any, res: any, next: any) => Promise<void> {
  const rateLimitService = EnterpriseRateLimitService.getInstance();

  return async (req: any, res: any, next: any) => {
    try {
      const context: RequestContext = {
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        userRole: req.user?.role,
        path: path || req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        apiKey: req.get('X-API-Key')
      };

      const result = await rateLimitService.checkLimit(context);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
        'X-RateLimit-Tier': result.tier
      });

      if (!result.allowed) {
        if (result.retryAfter) {
          res.set('Retry-After', result.retryAfter.toString());
        }
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: config?.message || 'Rate limit exceeded',
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime.toISOString(),
          retryAfter: result.retryAfter
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting middleware error', { error });
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Global rate limit service instance
 */
export const rateLimitService = EnterpriseRateLimitService.getInstance();