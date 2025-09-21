/**
 * Enterprise-grade environment variable validation
 * Ensures all required configuration is properly set for production deployments
 */

import * as Joi from 'joi';

/**
 * Environment variable schema definition
 */
const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  
  PORT: Joi.number()
    .port()
    .default(3000),
    
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .description('Database connection URL'),
    
  REDIS_URL: Joi.string()
    .uri()
    .optional()
    .description('Redis connection URL for caching'),
    
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().min(64).required(),
      otherwise: Joi.string().min(32).optional()
    })
    .description('JWT signing secret (min 32 chars, 64 for production)'),
    
  JWT_EXPIRES_IN: Joi.string()
    .default('1h')
    .description('JWT token expiration time'),
    
  CORS_ORIGIN: Joi.alternatives()
    .try(
      Joi.string().uri(),
      Joi.array().items(Joi.string().uri()),
      Joi.boolean().valid(false)
    )
    .default('*')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.alternatives().try(
        Joi.string().uri().required(),
        Joi.array().items(Joi.string().uri()).min(1).required()
      ),
      otherwise: Joi.any()
    })
    .description('CORS allowed origins'),
    
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().valid('error', 'warn', 'info'),
      otherwise: Joi.any()
    })
    .description('Application log level'),
    
  API_RATE_LIMIT: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(1000)
    .description('API rate limit per minute'),
    
  SESSION_SECRET: Joi.string()
    .min(32)
    .optional()
    .description('Session cookie secret'),
    
  ENCRYPTION_KEY: Joi.string()
    .length(64)
    .hex()
    .optional()
    .description('Data encryption key (64 hex chars)'),
    
  HEALTH_CHECK_ENDPOINT: Joi.string()
    .default('/health')
    .description('Health check endpoint path'),
    
  METRICS_ENDPOINT: Joi.string()
    .default('/metrics')
    .description('Metrics endpoint path'),
    
  MAX_REQUEST_SIZE: Joi.string()
    .default('10mb')
    .description('Maximum request body size'),
    
  ENABLE_SWAGGER: Joi.boolean()
    .default(true)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().default(false),
      otherwise: Joi.boolean().default(true)
    })
    .description('Enable Swagger API documentation'),
    
  AUDIT_LOG_ENABLED: Joi.boolean()
    .default(false)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().default(true),
      otherwise: Joi.boolean().default(false)
    })
    .description('Enable audit logging'),
    
  REQUEST_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(300000)
    .default(30000)
    .description('Request timeout in milliseconds'),
    
  WORKER_THREADS: Joi.number()
    .integer()
    .min(1)
    .max(64)
    .default(4)
    .description('Number of worker threads for CPU-intensive tasks')
}).unknown(true); // Allow additional environment variables

/**
 * Validated environment configuration interface
 */
export interface ValidatedEnvironment {
  readonly NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  readonly PORT: number;
  readonly DATABASE_URL: string;
  readonly REDIS_URL?: string;
  readonly JWT_SECRET: string;
  readonly JWT_EXPIRES_IN: string;
  readonly CORS_ORIGIN: string | string[] | false;
  readonly LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  readonly API_RATE_LIMIT: number;
  readonly SESSION_SECRET?: string;
  readonly ENCRYPTION_KEY?: string;
  readonly HEALTH_CHECK_ENDPOINT: string;
  readonly METRICS_ENDPOINT: string;
  readonly MAX_REQUEST_SIZE: string;
  readonly ENABLE_SWAGGER: boolean;
  readonly AUDIT_LOG_ENABLED: boolean;
  readonly REQUEST_TIMEOUT: number;
  readonly WORKER_THREADS: number;
}

/**
 * Validate environment variables against the schema
 */
export function validateEnvironment(): ValidatedEnvironment {
  const { error, value } = environmentSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false,
    allowUnknown: true
  });

  if (error) {
    const errorDetails = error.details.map(detail => ({
      key: detail.context?.key || 'unknown',
      message: detail.message,
      value: detail.context?.value
    }));

    throw new Error(
      `Environment validation failed:\n${errorDetails
        .map(({ key, message }) => `  - ${key}: ${message}`)
        .join('\n')}`
    );
  }

  return value as ValidatedEnvironment;
}

/**
 * Get validated environment configuration
 */
export function getEnvironmentConfig(): ValidatedEnvironment {
  try {
    return validateEnvironment();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'development';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'test';
}