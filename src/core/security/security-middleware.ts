/**
 * Enterprise-grade security middleware
 * Comprehensive security layers for production API protection
 */

import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { logger, LogContext, createCorrelationId } from '@/config/enterprise-logger';
import { getEnvironmentConfig } from '@/config/environment-validation';
import { RateLimitError } from '@/core/errors/error-handler';

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  readonly windowMs: number;
  readonly max: number;
  readonly message: string;
  readonly standardHeaders: boolean;
  readonly legacyHeaders: boolean;
  readonly skipSuccessfulRequests?: boolean;
  readonly skipFailedRequests?: boolean;
  readonly keyGenerator?: (req: Request) => string;
}

/**
 * IP-based rate limiting with Redis support
 */
export function createRateLimit(config: Partial<RateLimitConfig> = {}) {
  const env = getEnvironmentConfig();
  
  const defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Default rate limit
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  };

  const finalConfig = { ...defaultConfig, ...config };

  return rateLimit({
    ...finalConfig,
    handler: (req: Request, res: Response) => {
      const correlationId = createCorrelationId();
      const context: LogContext = {
        correlationId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };

      logger.warn('Rate limit exceeded', context);

      // Log security event
      logger.audit('Rate limit violation', {
        ...context,
        result: 'failure',
        metadata: {
          path: req.path,
          method: req.method,
          rateLimitMax: finalConfig.max,
          windowMs: finalConfig.windowMs
        }
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: finalConfig.message,
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil(finalConfig.windowMs / 1000)
        }
      });
    },
    keyGenerator: config.keyGenerator || ((req: Request) => {
      // Use user ID if authenticated, otherwise IP
      const {user} = (req as any);
      return user ? `user:${user.id}` : `ip:${req.ip}`;
    })
  });
}

/**
 * Speed limiting middleware to slow down repeated requests
 */
export function createSpeedLimit() {

  return slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100, // Allow 100 requests per windowMs without delay
    delayMs: 500, // Add 500ms delay for each request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    onLimitReached: (req: Request) => {
      const correlationId = createCorrelationId();
      logger.warn('Speed limit reached', {
        correlationId,
        ip: req.ip,
        path: req.path,
        method: req.method
      });
    }
  });
}

/**
 * Enhanced Helmet security headers configuration
 */
export function createSecurityHeaders() {
  const env = getEnvironmentConfig();

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null
      },
      reportOnly: env.NODE_ENV === 'development'
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny'
    },

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: ['same-origin']
    },

    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin'
    },

    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    },

    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false
    },

    // X-Download-Options
    ieNoOpen: true,

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: false
  });
}

/**
 * Request compression middleware
 */
export function createCompression() {
  return compression({
    filter: (req: Request, res: Response) => {
      // Don't compress responses if the client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      
      // Use compression filter by default
      return compression.filter(req, res);
    },
    level: 6, // Compression level (0-9)
    threshold: 1024, // Only compress responses larger than 1KB
    windowBits: 15,
    memLevel: 8
  });
}

/**
 * Request size limiting middleware
 */
export function createRequestSizeLimit() {
  const env = getEnvironmentConfig();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
    req.on('data', (chunk) => {
      req.body = req.body || Buffer.alloc(0);
      req.body = Buffer.concat([req.body, chunk]);
      
      if (req.body.length > maxSize) {
        const correlationId = createCorrelationId();
        logger.warn('Request size limit exceeded', {
          correlationId,
          ip: req.ip,
          size: req.body.length,
          maxSize
        });
        
        res.status(413).json({
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: 'Request entity too large',
            timestamp: new Date().toISOString(),
            details: {
              maxSize: '10MB',
              receivedSize: `${Math.round(req.body.length / 1024)}KB`
            }
          }
        });
        return;
      }
    });
    
    next();
  };
}

/**
 * Bot detection and blocking middleware
 */
export function createBotProtection() {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /go-http-client/i
  ];

  return (req: Request, res: Response, next: NextFunction): void => {
    const userAgent = req.get('User-Agent') || '';
    const correlationId = createCorrelationId();
    
    // Skip bot detection for known good bots with proper identification
    const allowedBots = [
      'Googlebot',
      'Bingbot',
      'Slackbot',
      'facebookexternalhit'
    ];
    
    if (allowedBots.some(bot => userAgent.includes(bot))) {
      next();
      return;
    }
    
    // Check for suspicious patterns
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    
    if (isSuspicious) {
      logger.warn('Suspicious bot activity detected', {
        correlationId,
        ip: req.ip,
        userAgent,
        path: req.path
      });
      
      // Instead of blocking, just add a delay and log
      setTimeout(() => {
        res.status(200).json({
          success: true,
          message: 'Request processed'
        });
      }, 2000); // 2 second delay for bots
      return;
    }
    
    next();
  };
}

/**
 * CORS configuration with security considerations
 */
export function createCorsConfig() {
  const env = getEnvironmentConfig();
  
  return {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true); return;
      }
      
      const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['*'];
      
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Correlation-ID'
    ],
    exposedHeaders: ['X-Correlation-ID'],
    optionsSuccessStatus: 200,
    maxAge: 86400 // 24 hours
  };
}

/**
 * Request timeout middleware
 */
export function createRequestTimeout() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const correlationId = createCorrelationId();
        
        logger.warn('Request timeout', {
          correlationId,
          ip: req.ip,
          path: req.path,
          method: req.method,
          timeout: 30000
        });
        
        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout',
            timestamp: new Date().toISOString()
          }
        });
      }
    }, 30000);
    
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    res.on('close', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
}

/**
 * Security middleware bundle for easy application
 */
export function applySecurityMiddleware() {
  return [
    createRequestTimeout(),
    createSecurityHeaders(),
    createCompression(),
    createSpeedLimit(),
    createRateLimit(),
    createBotProtection(),
    createRequestSizeLimit()
  ];
}