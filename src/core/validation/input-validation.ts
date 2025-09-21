/**
 * Input Validation and Type Guards
 * Enterprise-grade validation with comprehensive type checking
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Validator function type
 */
export type Validator<T> = (value: unknown) => value is T;

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
    public readonly errors: readonly string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * String validation type guards
 */
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNonEmptyString = (value: unknown): value is string => {
  return isString(value) && value.trim().length > 0;
};

export const isEmailString = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

export const isUrlString = (value: unknown): value is string => {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Number validation type guards
 */
export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

export const isPositiveNumber = (value: unknown): value is number => {
  return isNumber(value) && value > 0;
};

export const isNonNegativeNumber = (value: unknown): value is number => {
  return isNumber(value) && value >= 0;
};

export const isIntegerNumber = (value: unknown): value is number => {
  return isNumber(value) && Number.isInteger(value);
};

export const isPositiveInteger = (value: unknown): value is number => {
  return isIntegerNumber(value) && value > 0;
};

/**
 * Boolean validation type guard
 */
export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

/**
 * Date validation type guards
 */
export const isDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isISODateString = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const date = new Date(value);
  return isDate(date) && date.toISOString() === value;
};

/**
 * Array validation type guards
 */
export const isArray = <T>(value: unknown, itemValidator?: Validator<T>): value is T[] => {
  if (!Array.isArray(value)) return false;
  if (!itemValidator) return true;
  return value.every(itemValidator);
};

export const isNonEmptyArray = <T>(value: unknown, itemValidator?: Validator<T>): value is T[] => {
  return isArray(value, itemValidator) && value.length > 0;
};

/**
 * Object validation type guards
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const hasProperty = <K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> => {
  return isObject(obj) && key in obj;
};

export const hasRequiredProperties = <K extends string>(
  obj: unknown,
  keys: readonly K[]
): obj is Record<K, unknown> => {
  if (!isObject(obj)) return false;
  return keys.every(key => key in obj);
};

/**
 * Enum validation type guard
 */
export const isEnumValue = <T extends string | number>(
  value: unknown,
  enumValues: readonly T[]
): value is T => {
  return enumValues.includes(value as T);
};

/**
 * UUID validation type guard
 */
export const isUUID = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Validation schema type
 */
export type ValidationSchema<T> = {
  readonly [K in keyof T]: {
    readonly required: boolean;
    readonly validator: Validator<T[K]>;
    readonly errorMessage?: string;
  };
};

/**
 * Validates an object against a schema
 */
export function validateObject<T extends Record<string, unknown>>(
  obj: unknown,
  schema: ValidationSchema<T>
): ValidationResult & { data?: T } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(obj)) {
    return {
      isValid: false,
      errors: ['Input must be an object'],
      warnings: []
    };
  }

  const result: Partial<T> = {};
  
  // Check required fields and validate types
  for (const [key, config] of Object.entries(schema) as Array<[keyof T, ValidationSchema<T>[keyof T]]>) {
    const value = obj[key as string];
    
    if (config.required && (value === undefined || value === null)) {
      errors.push(config.errorMessage || `Field '${String(key)}' is required`);
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (!config.validator(value)) {
        errors.push(config.errorMessage || `Field '${String(key)}' has invalid type or value`);
      } else {
        result[key] = value;
      }
    }
  }

  // Check for unknown fields
  for (const key of Object.keys(obj)) {
    if (!(key in schema)) {
      warnings.push(`Unknown field '${key}' will be ignored`);
    }
  }

  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    warnings,
    ...(isValid && { data: result as T })
  };
}

/**
 * Creates a validator function from a schema
 */
export function createValidator<T extends Record<string, unknown>>(
  schema: ValidationSchema<T>
): (obj: unknown) => obj is T {
  return (obj: unknown): obj is T => {
    const result = validateObject(obj, schema);
    return result.isValid;
  };
}

/**
 * Validates and throws if invalid
 */
export function validateOrThrow<T extends Record<string, unknown>>(
  obj: unknown,
  schema: ValidationSchema<T>,
  fieldName: string = 'object'
): T {
  const result = validateObject(obj, schema);
  
  if (!result.isValid) {
    throw new ValidationError(
      `Validation failed for ${fieldName}`,
      fieldName,
      obj,
      result.errors
    );
  }
  
  return result.data!;
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /**
   * Pagination parameters schema
   */
  pagination: {
    page: {
      required: false,
      validator: isPositiveInteger,
      errorMessage: 'Page must be a positive integer'
    },
    limit: {
      required: false,
      validator: (value: unknown): value is number => 
        isPositiveInteger(value) && value <= 100,
      errorMessage: 'Limit must be a positive integer not greater than 100'
    },
    sortBy: {
      required: false,
      validator: isNonEmptyString,
      errorMessage: 'SortBy must be a non-empty string'
    },
    sortOrder: {
      required: false,
      validator: (value: unknown): value is 'asc' | 'desc' =>
        isEnumValue(value, ['asc', 'desc'] as const),
      errorMessage: 'SortOrder must be either "asc" or "desc"'
    }
  } as ValidationSchema<{
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }>,

  /**
   * ID parameter schema
   */
  idParam: {
    id: {
      required: true,
      validator: (value: unknown): value is string =>
        isNonEmptyString(value) && (isUUID(value) || /^[a-zA-Z0-9_-]+$/.test(value)),
      errorMessage: 'ID must be a valid UUID or alphanumeric string'
    }
  } as ValidationSchema<{ id: string }>,

  /**
   * Date range schema
   */
  dateRange: {
    startDate: {
      required: false,
      validator: isISODateString,
      errorMessage: 'StartDate must be a valid ISO date string'
    },
    endDate: {
      required: false,
      validator: isISODateString,
      errorMessage: 'EndDate must be a valid ISO date string'
    }
  } as ValidationSchema<{
    startDate?: string;
    endDate?: string;
  }>
} as const;