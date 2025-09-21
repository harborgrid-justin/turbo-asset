import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';

/**
 * Request context interface for error logging
 */
interface RequestContext {
  readonly method: string;
  readonly url: string;
  readonly ip: string;
  readonly userAgent: string | undefined;
  readonly userId: string | undefined;
  readonly organizationId: string | undefined;
}

/**
 * Error response interface
 */
interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    readonly timestamp: string;
    readonly path: string;
    readonly stack?: string;
    readonly name?: string;
  };
}

/**
 * Authenticated request interface
 */
interface AuthenticatedRequest extends Request {
  readonly user?: {
    readonly id: string;
  };
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Custom API Error class for structured error handling
 */
export class CustomApiError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'CustomApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where the error was thrown
    Error.captureStackTrace(this, CustomApiError);
  }
}

/**
 * Validation Error for request validation failures
 */
export class ValidationError extends CustomApiError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Authorization Error for access control failures  
 */
export class AuthorizationError extends CustomApiError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Authentication Error for authentication failures
 */
export class AuthenticationError extends CustomApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Not Found Error for resource not found cases
 */
export class NotFoundError extends CustomApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error for resource conflicts
 */
export class ConflictError extends CustomApiError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

/**
 * Rate Limit Error for rate limiting
 */
export class RateLimitError extends CustomApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Database Error for database-related failures
 */
export class DatabaseError extends CustomApiError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

/**
 * External Service Error for third-party service failures
 */
export class ExternalServiceError extends CustomApiError {
  constructor(message: string, statusCode: number = 502, details?: any) {
    super(message, statusCode, 'EXTERNAL_SERVICE_ERROR', details);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Request timeout error
 */
export class TimeoutError extends CustomApiError {
  constructor(message: string = 'Request timeout') {
    super(message, 408, 'REQUEST_TIMEOUT');
    this.name = 'TimeoutError';
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends CustomApiError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Extract request context for error logging
 */
function extractRequestContext(req: Request): RequestContext {
  const authReq = req as AuthenticatedRequest;
  return {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: authReq.user?.id,
    organizationId: req.params?.organizationId,
  };
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  const requestInfo = extractRequestContext(req);

  if (error instanceof CustomApiError) {
    logger.warn('API Error', {
      ...requestInfo,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        path: req.path,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
    };

    res.status(error.statusCode).json(errorResponse);
  } else {
    // Handle unexpected errors
    logger.error('Unhandled Error', {
      ...requestInfo,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
        timestamp: new Date().toISOString(),
        path: req.path,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error.stack,
          name: error.name 
        }),
      },
    };

    res.status(500).json(errorResponse);
  }
};

/**
 * Async error wrapper to catch promise rejections
 */
/**
 * Async error wrapper to catch promise rejections
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  
  logger.warn('Route Not Found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };

  res.status(404).json(errorResponse);
};

/**
 * Request timeout middleware
 */
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new TimeoutError();
        next(error);
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
};
