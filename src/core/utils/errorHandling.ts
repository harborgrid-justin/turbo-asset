/**
 * Enterprise Error Handling Utilities
 * Following Oracle enterprise patterns and Google TypeScript guidelines
 * 
 * Provides consistent error handling across all controllers and services
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';

// Standard error response interface
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    timestamp: string;
    requestId?: string;
  };
}

// Success response interface
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

export type APIResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Wraps Express route handlers to provide consistent error handling and return patterns
 * This solves the "not all code paths return a value" TypeScript issue
 */
export function withErrorHandling<T = unknown>(
  handler: (req: Request, res: Response) => Promise<T> | T
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error: unknown) {
      logger.error('Route handler error:', error);
      
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          details: error instanceof Error ? (error as Error).message : 'Unknown error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string
        }
      };
      
      res.status(500).json(errorResponse);

      
      return;
    }
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T, requestId?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId
    }
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: string,
  requestId?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId
    }
  };
}

/**
 * Express middleware for handling async route errors
 * Ensures all promises are properly caught
 */
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validates request parameters and throws standardized errors
 */
export function validateRequired(params: Record<string, unknown>, requiredFields: string[]): void {
  const missing = requiredFields.filter(field => !params[field]);
  
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

// Standard error classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}