import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

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
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  const requestInfo = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    organizationId: req.params?.organizationId,
  };

  if (error instanceof CustomApiError) {
    logger.warn('API Error', {
      ...requestInfo,
      error: {
        name: error.name,
        message: (error as Error).message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: (error as Error).message,
        details: error.details,
        timestamp: new Date().toISOString(),
        path: req.path,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
    });
  } else {
    // Handle unexpected errors
    logger.error('Unhandled Error', {
      ...requestInfo,
      error: {
        name: error.name,
        message: (error as Error).message,
        stack: error.stack,
      },
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : (error as Error).message,
        timestamp: new Date().toISOString(),
        path: req.path,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error.stack,
          name: error.name 
        }),
      },
    });


    return;
  }
};

/**
 * Async error wrapper to catch promise rejections
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
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

  res.status(404).json({
    success: false,
    error: {
      code: error.code,
      message: (error as Error).message,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  });


  return;
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

/**
 * Validation helper function
 */
export const validateRequired = (data: any, fields: string[]): void => {
  const missing: string[] = [];
  
  for (const field of fields) {
    if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
};

/**
 * Sanitize error for client response
 */
export const sanitizeError = (error: any): any => {
  const sanitized: any = {
    message: (error as Error).message,
    code: error.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
  };

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    sanitized.stack = error.stack;
    sanitized.name = error.name;
  }

  // Add details if available
  if (error.details) {
    sanitized.details = error.details;
  }

  return sanitized;
};