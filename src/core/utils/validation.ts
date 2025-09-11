/**
 * Validation utilities following industry best practices
 * Based on Google and Oracle enterprise patterns
 */
import { Request, Response } from 'express';

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Type guard to check if error is an Error instance
 * @param error unknown error object
 * @returns boolean indicating if error is Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely converts unknown error to Error object
 * @param error unknown error object
 * @returns Error object
 */
export function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }
  
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  return new Error('An unknown error occurred');
}

/**
 * Validates and extracts organization ID from request params
 * @param req Express request object
 * @returns validated organization ID
 * @throws ValidationError if organization ID is missing or invalid
 */
export function validateOrganizationId(req: Request): string {
  const { organizationId } = req.params;
  
  if (!organizationId) {
    throw new ValidationError('Organization ID is required', 'organizationId', 'MISSING_ORGANIZATION_ID');
  }
  
  if (typeof organizationId !== 'string' || organizationId.trim().length === 0) {
    throw new ValidationError('Organization ID must be a non-empty string', 'organizationId', 'INVALID_ORGANIZATION_ID');
  }
  
  return organizationId.trim();
}

/**
 * Validates and extracts required string parameter from request params
 * @param req Express request object
 * @param paramName Parameter name to extract
 * @returns validated parameter value
 * @throws ValidationError if parameter is missing or invalid
 */
export function validateRequiredParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  
  if (!value) {
    throw new ValidationError(`${paramName} is required`, paramName, `MISSING_${paramName.toUpperCase()}`);
  }
  
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${paramName} must be a non-empty string`, paramName, `INVALID_${paramName.toUpperCase()}`);
  }
  
  return value.trim();
}

/**
 * Validates optional string parameter from request params
 * @param req Express request object
 * @param paramName Parameter name to extract
 * @returns validated parameter value or undefined
 */
export function validateOptionalParam(req: Request, paramName: string): string | undefined {
  const value = req.params[paramName];
  
  if (!value) {
    return undefined;
  }
  
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }
  
  return value.trim();
}

/**
 * Validates required string field from request body
 * @param body Request body object
 * @param fieldName Field name to extract
 * @returns validated field value
 * @throws ValidationError if field is missing or invalid
 */
export function validateRequiredBodyField(body: any, fieldName: string): string {
  const value = body[fieldName];
  
  if (!value) {
    throw new ValidationError(`${fieldName} is required`, fieldName, `MISSING_${fieldName.toUpperCase()}`);
  }
  
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} must be a non-empty string`, fieldName, `INVALID_${fieldName.toUpperCase()}`);
  }
  
  return value.trim();
}

/**
 * Handles validation errors and sends appropriate response
 * @param error Error object
 * @param res Express response object
 * @returns true if error was handled, false otherwise
 */
export function handleValidationError(error: unknown, res: Response): boolean {
  if (error instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        field: error.field,
        code: error.code,
      },
    });
    return true;
  }
  
  return false;
}

/**
 * Async wrapper that handles validation errors automatically
 * @param handler Async request handler
 * @returns Wrapped handler with error handling
 */
export function withValidation(
  handler: (req: Request, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error: unknown) {
      if (!handleValidationError(error, res)) {
        // Re-throw non-validation errors
        throw error;
      }
    }
  };
}