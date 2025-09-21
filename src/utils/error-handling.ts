/**
 * Enterprise Error Handling System
 * Provides comprehensive error management and type safety
 */

import { HTTP_STATUS, ERROR_CODES, type HttpStatus, type ErrorCode } from '../constants';

export interface ErrorDetails {
  readonly code: ErrorCode;
  readonly message: string;
  readonly statusCode: HttpStatus;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
  readonly stack?: string;
}

export interface ValidationErrorDetails {
  readonly field: string;
  readonly value: unknown;
  readonly constraint: string;
  readonly message: string;
}

export class EnterpriseError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: HttpStatus;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    context?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'EnterpriseError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date();
    this.context = context;
    this.isOperational = isOperational;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, EnterpriseError.prototype);
  }

  public toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }
}

export class ValidationError extends EnterpriseError {
  public readonly validationErrors: readonly ValidationErrorDetails[];

  constructor(
    message: string,
    validationErrors: ValidationErrorDetails[],
    context?: Record<string, unknown>
  ) {
    super(ERROR_CODES.VALIDATION_ERROR, message, HTTP_STATUS.BAD_REQUEST, context);
    this.name = 'ValidationError';
    this.validationErrors = Object.freeze(validationErrors);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends EnterpriseError {
  constructor(message: string = 'Authentication failed', context?: Record<string, unknown>) {
    super(ERROR_CODES.AUTHENTICATION_ERROR, message, HTTP_STATUS.UNAUTHORIZED, context);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends EnterpriseError {
  constructor(message: string = 'Access denied', context?: Record<string, unknown>) {
    super(ERROR_CODES.AUTHORIZATION_ERROR, message, HTTP_STATUS.FORBIDDEN, context);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends EnterpriseError {
  constructor(resource: string, id?: string | number, context?: Record<string, unknown>) {
    const message = id !== undefined ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(ERROR_CODES.RESOURCE_NOT_FOUND, message, HTTP_STATUS.NOT_FOUND, context);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BusinessRuleViolationError extends EnterpriseError {
  constructor(rule: string, message: string, context?: Record<string, unknown>) {
    super(ERROR_CODES.BUSINESS_RULE_VIOLATION, `Business rule violation (${rule}): ${message}`, HTTP_STATUS.UNPROCESSABLE_ENTITY, context);
    this.name = 'BusinessRuleViolationError';
    Object.setPrototypeOf(this, BusinessRuleViolationError.prototype);
  }
}

export class SystemError extends EnterpriseError {
  constructor(message: string, context?: Record<string, unknown>, originalError?: Error) {
    super(ERROR_CODES.SYSTEM_ERROR, message, HTTP_STATUS.INTERNAL_SERVER_ERROR, context, false);
    this.name = 'SystemError';
    
    if (originalError !== undefined) {
      this.stack = originalError.stack;
      this.context = { ...context, originalError: originalError.message };
    }
    
    Object.setPrototypeOf(this, SystemError.prototype);
  }
}

/**
 * Type-safe error handling utilities
 */
export class ErrorHandler {
  /**
   * Safely handle async operations with proper error typing
   */
  public static async safeAsync<T>(
    operation: () => Promise<T>
  ): Promise<[T | null, EnterpriseError | null]> {
    try {
      const result = await operation();
      return [result, null];
    } catch (error) {
      if (error instanceof EnterpriseError) {
        return [null, error];
      }
      
      return [null, new SystemError('Unexpected error occurred', { originalError: String(error) })];
    }
  }

  /**
   * Safely handle sync operations with proper error typing
   */
  public static safe<T>(operation: () => T): [T | null, EnterpriseError | null] {
    try {
      const result = operation();
      return [result, null];
    } catch (error) {
      if (error instanceof EnterpriseError) {
        return [null, error];
      }
      
      return [null, new SystemError('Unexpected error occurred', { originalError: String(error) })];
    }
  }

  /**
   * Type guard to check if error is operational
   */
  public static isOperationalError(error: Error): error is EnterpriseError {
    return error instanceof EnterpriseError && error.isOperational;
  }

  /**
   * Create standardized error response
   */
  public static createErrorResponse(error: EnterpriseError): {
    readonly success: false;
    readonly error: ErrorDetails;
  } {
    return {
      success: false,
      error: error.toJSON()
    };
  }
}

/**
 * Input validation utilities
 */
export class ValidationUtils {
  /**
   * Validate required string field
   */
  public static validateRequiredString(
    value: unknown,
    fieldName: string,
    minLength: number = 1,
    maxLength: number = 255
  ): string {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, [{
        field: fieldName,
        value,
        constraint: 'type',
        message: 'Must be a string'
      }]);
    }

    if (value.length < minLength) {
      throw new ValidationError(`${fieldName} is too short`, [{
        field: fieldName,
        value,
        constraint: 'minLength',
        message: `Must be at least ${minLength} characters`
      }]);
    }

    if (value.length > maxLength) {
      throw new ValidationError(`${fieldName} is too long`, [{
        field: fieldName,
        value,
        constraint: 'maxLength',
        message: `Must be no more than ${maxLength} characters`
      }]);
    }

    return value;
  }

  /**
   * Validate required number field
   */
  public static validateRequiredNumber(
    value: unknown,
    fieldName: string,
    min?: number,
    max?: number
  ): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ValidationError(`${fieldName} must be a valid number`, [{
        field: fieldName,
        value,
        constraint: 'type',
        message: 'Must be a valid number'
      }]);
    }

    if (min !== undefined && value < min) {
      throw new ValidationError(`${fieldName} is below minimum`, [{
        field: fieldName,
        value,
        constraint: 'min',
        message: `Must be at least ${min}`
      }]);
    }

    if (max !== undefined && value > max) {
      throw new ValidationError(`${fieldName} is above maximum`, [{
        field: fieldName,
        value,
        constraint: 'max',
        message: `Must be no more than ${max}`
      }]);
    }

    return value;
  }

  /**
   * Validate email format
   */
  public static validateEmail(value: unknown, fieldName: string = 'email'): string {
    const email = ValidationUtils.validateRequiredString(value, fieldName);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new ValidationError(`${fieldName} has invalid format`, [{
        field: fieldName,
        value,
        constraint: 'format',
        message: 'Must be a valid email address'
      }]);
    }

    return email;
  }

  /**
   * Validate UUID format
   */
  public static validateUUID(value: unknown, fieldName: string = 'id'): string {
    const id = ValidationUtils.validateRequiredString(value, fieldName);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      throw new ValidationError(`${fieldName} has invalid format`, [{
        field: fieldName,
        value,
        constraint: 'format',
        message: 'Must be a valid UUID'
      }]);
    }

    return id;
  }
}