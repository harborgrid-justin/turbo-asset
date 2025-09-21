/**
 * Environment Variables Validation for Production Readiness
 * Validates all required environment variables and provides secure defaults
 */

import { z } from 'zod';
import { logger } from './logger';

// Define the schema for environment variables
const environmentSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1000).max(65535)).default('3000'),
  
  // Database Configuration
  DATABASE_URL: z.string().url('Database URL must be a valid URL'),
  
  // Redis Configuration
  REDIS_URL: z.string().url('Redis URL must be a valid URL').default('redis://localhost:6379'),
  
  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_ROUNDS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(10).max(15)).default('12'),
  
  // File Storage Configuration
  STORAGE_TYPE: z.enum(['local', 's3', 'azure', 'gcp']).default('local'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  
  // External API Configuration
  CURRENCY_API_KEY: z.string().optional(),
  SAP_API_URL: z.string().url().optional(),
  SAP_API_KEY: z.string().optional(),
  ORACLE_API_URL: z.string().url().optional(),
  ORACLE_API_KEY: z.string().optional(),
  WORKDAY_API_URL: z.string().url().optional(),
  WORKDAY_API_KEY: z.string().optional(),
  SERVICENOW_API_URL: z.string().url().optional(),
  SERVICENOW_API_KEY: z.string().optional(),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'verbose', 'debug', 'silly']).default('info'),
  LOG_FILE: z.string().default('logs/turbo-asset.log'),
  
  // Email Configuration
  EMAIL_SERVICE: z.enum(['smtp', 'sendgrid', 'ses']).default('smtp'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(65535)).default('587'),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  
  // Default Configuration
  DEFAULT_LANGUAGE: z.string().length(2).default('en'),
  DEFAULT_CURRENCY: z.string().length(3).default('USD'),
  DEFAULT_TIMEZONE: z.string().default('America/New_York'),
  
  // CORS Configuration
  ALLOWED_ORIGINS: z.string().optional(),
  
  // Mock Data Configuration
  MOCK_ASSET_COUNT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).default('100'),
  MOCK_WORK_ORDER_COUNT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).default('50'),
  MOCK_SPACE_COUNT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).default('50'),
  MOCK_MAINTENANCE_COUNT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).default('200'),
  MOCK_AUDIT_ENTRY_COUNT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).default('20'),
  MOCK_ENABLE_RANDOMIZATION: z.string().transform(val => val !== 'false').default('true'),
  MOCK_SEED: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).default('12345'),
});

export type EnvironmentConfig = z.infer<typeof environmentSchema>;

/**
 * Validates environment variables and returns validated configuration
 */
export function validateEnvironment(): EnvironmentConfig {
  try {
    // Special handling for production environment
    if (process.env.NODE_ENV === 'production') {
      // Ensure critical secrets are set in production
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET must be set in production environment');
      }
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL must be set in production environment');
      }
      if (!process.env.REDIS_URL) {
        throw new Error('REDIS_URL must be set in production environment');
      }
    }

    const config = environmentSchema.parse(process.env);
    
    // Additional production validations
    if (config.NODE_ENV === 'production') {
      if (config.JWT_SECRET.length < 64) {
        logger.warn('JWT_SECRET should be at least 64 characters for production');
      }
      if (config.BCRYPT_ROUNDS < 12) {
        logger.warn('BCRYPT_ROUNDS should be at least 12 for production');
      }
    }

    logger.info('Environment validation successful', {
      environment: config.NODE_ENV,
      port: config.PORT,
      logLevel: config.LOG_LEVEL,
      storageType: config.STORAGE_TYPE,
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.input,
      }));
      
      logger.error('Environment validation failed:', formattedErrors);
      throw new Error(`Environment validation failed: ${JSON.stringify(formattedErrors, null, 2)}`);
    }
    
    logger.error('Environment validation error:', error);
    throw error;
  }
}

/**
 * Gets a validated environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return validateEnvironment();
}

/**
 * Checks if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Checks if running in development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Checks if running in test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// Export validated configuration as default
export const environmentConfig = validateEnvironment();