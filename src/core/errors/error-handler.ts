/**
 * Enterprise-Grade Error Handling System
 * Standardized error responses and comprehensive error boundaries
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';
import { getEnvironmentConfig } from '@/config/environment-validation';
import { v4 as uuidv4 } from 'uuid';

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    status: number;
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
    stack?: string;
    details?: Record<string, unknown>;
    validationErrors?: ValidationError[];
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  constraint?: string;
}

export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  public readonly isOperational: boolean = true;
  public readonly details?: Record<string, unknown>;
  public readonly validationErrors?: ValidationError[];

  constructor(
    message: string,
    details?: Record<string, unknown>,
    validationErrors?: ValidationError[]
  ) {
    super(message);
    this.details = details;
    this.validationErrors = validationErrors;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends BaseError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(
    message: string,
    validationErrors: ValidationError[] = [],
    details?: Record<string, unknown>
  ) {
    super(message, details, validationErrors);
  }
}

export class AuthenticationError extends BaseError {
  readonly statusCode = 401;
  readonly errorCode = 'AUTHENTICATION_ERROR';

  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class AuthorizationError extends BaseError {
  readonly statusCode = 403;
  readonly errorCode = 'AUTHORIZATION_ERROR';

  constructor(message: string = 'Insufficient permissions', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class NotFoundError extends BaseError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND_ERROR';

  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, { resource, id });
  }
}

export class ConflictError extends BaseError {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class RateLimitError extends BaseError {
  readonly statusCode = 429;
  readonly errorCode = 'RATE_LIMIT_ERROR';

  constructor(
    message: string = 'Rate limit exceeded',
    details?: Record<string, unknown>
  ) {
    super(message, details);
  }
}

export class InternalServerError extends BaseError {
  readonly statusCode = 500;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';

  constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class ServiceUnavailableError extends BaseError {
  readonly statusCode = 503;
  readonly errorCode = 'SERVICE_UNAVAILABLE_ERROR';

  constructor(service: string, details?: Record<string, unknown>) {
    super(`Service ${service} is currently unavailable`, { service, ...details });
  }
}

export class DatabaseError extends InternalServerError {
  readonly errorCode = 'DATABASE_ERROR';

  constructor(message: string, operation?: string, details?: Record<string, unknown>) {
    super(message, { operation, ...details });
  }
}

export class ExternalServiceError extends BaseError {
  readonly statusCode = 502;
  readonly errorCode = 'EXTERNAL_SERVICE_ERROR';

  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super(`External service error from ${service}: ${message}`, { service, ...details });
  }
}

export class TimeoutError extends BaseError {
  readonly statusCode = 408;
  readonly errorCode = 'TIMEOUT_ERROR';

  constructor(operation: string, timeout: number, details?: Record<string, unknown>) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, { operation, timeout, ...details });
  }
}

/**
 * Enhanced request context middleware
 */
export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Add request ID to headers
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Store context for error handling
  (req as any).context = {
    requestId,
    startTime: Date.now(),
    correlationId: req.headers['x-correlation-id'] || uuidv4(),
  };
  
  next();
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const config = getEnvironmentConfig();
  const requestId = (req as any).context?.requestId || 'unknown';
  const correlationId = (req as any).context?.correlationId || 'unknown';
  const startTime = (req as any).context?.startTime || Date.now();
  const duration = Date.now() - startTime;

  // Determine if this is an operational error
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';
  let details: Record<string, unknown> | undefined;
  let validationErrors: ValidationError[] | undefined;

  if (error instanceof BaseError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    message = error.message;
    details = error.details;
    validationErrors = error.validationErrors;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID_FORMAT';
    message = 'Invalid ID format';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    errorCode = 'FILE_UPLOAD_ERROR';
    message = `File upload error: ${error.message}`;
  }

  // Log the error
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode,
      errorCode,
    },
    request: {
      id: requestId,
      correlationId,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.get('User-Agent'),
        'x-forwarded-for': req.get('X-Forwarded-For'),
        'x-real-ip': req.get('X-Real-IP'),
      },
      ip: req.ip,
      duration,
    },
    user: (req as any).user ? {
      id: (req as any).user.id,
      email: (req as any).user.email,
      organizationId: (req as any).user.organizationId,
    } : null,
  };

  // Log based on severity
  if (statusCode >= 500) {
    logger.error('Server error occurred', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client error occurred', logData);
  } else {
    logger.info('Request completed with error', logData);
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: {
      message,
      code: errorCode,
      status: statusCode,
      timestamp: new Date().toISOString(),
      requestId,
      path: req.path,
      method: req.method,
      details,
      validationErrors,
    },
  };

  // Include stack trace only in development/test environments
  if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
    errorResponse.error.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Not found handler middleware
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = (req as any).context?.requestId || 'unknown';
  
  logger.warn('Route not found', {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
  });

  const errorResponse: ErrorResponse = {
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND_ERROR',
      status: 404,
      timestamp: new Date().toISOString(),
      requestId,
      path: req.path,
      method: req.method,
    },
  };

  res.status(404).json(errorResponse);
}

/**
 * Async error handler wrapper
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<void>
) {
  return (req: T, res: U, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Timeout handler middleware
 */
export function timeoutHandler(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      const requestId = (req as any).context?.requestId || 'unknown';
      
      logger.warn('Request timeout', {
        requestId,
        method: req.method,
        url: req.url,
        timeout: timeoutMs,
      });

      if (!res.headersSent) {
        const errorResponse: ErrorResponse = {
          error: {
            message: `Request timeout after ${timeoutMs}ms`,
            code: 'REQUEST_TIMEOUT',
            status: 408,
            timestamp: new Date().toISOString(),
            requestId,
            path: req.path,
            method: req.method,
          },
        };

        res.status(408).json(errorResponse);
      }
    }, timeoutMs);

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
 * Health check for error handling system
 */
export function getErrorHandlingHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  details: Record<string, unknown>;
} {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    details: {
      errorTypesRegistered: [
        'ValidationError',
        'AuthenticationError',
        'AuthorizationError',
        'NotFoundError',
        'ConflictError',
        'RateLimitError',
        'InternalServerError',
        'ServiceUnavailableError',
        'DatabaseError',
        'ExternalServiceError',
        'TimeoutError',
      ],
      middlewareComponents: [
        'requestContextMiddleware',
        'errorHandler',
        'notFoundHandler',
        'asyncHandler',
        'timeoutHandler',
      ],
    },
  };
}

// Export all error types for use throughout the application
export {
  BaseError as CustomApiError,
  ValidationError as CustomValidationError,
  AuthenticationError as CustomAuthenticationError,
  AuthorizationError as CustomAuthorizationError,
  NotFoundError as CustomNotFoundError,
  ConflictError as CustomConflictError,
  RateLimitError as CustomRateLimitError,
  InternalServerError as CustomInternalServerError,
  ServiceUnavailableError as CustomServiceUnavailableError,
  DatabaseError as CustomDatabaseError,
  ExternalServiceError as CustomExternalServiceError,
  TimeoutError as CustomTimeoutError,
};