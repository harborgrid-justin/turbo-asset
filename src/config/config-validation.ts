/**
 * Configuration Validation Types and Utilities
 * Enterprise-grade configuration management with type safety
 */

/**
 * Environment enumeration
 */
export enum Environment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  readonly url: string;
  readonly maxConnections: number;
  readonly connectionTimeout: number;
  readonly queryTimeout: number;
  readonly ssl: boolean;
}

/**
 * Redis configuration interface
 */
export interface RedisConfig {
  readonly url: string;
  readonly maxRetriesPerRequest: number;
  readonly connectTimeout: number;
  readonly lazyConnect: boolean;
}

/**
 * JWT configuration interface
 */
export interface JwtConfig {
  readonly secret: string;
  readonly expiresIn: string;
  readonly refreshExpiresIn: string;
  readonly issuer: string;
}

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly skipSuccessfulRequests: boolean;
  readonly skipFailedRequests: boolean;
}

/**
 * Application configuration interface
 */
export interface AppConfig {
  readonly environment: Environment;
  readonly port: number;
  readonly host: string;
  readonly apiVersion: string;
  readonly database: DatabaseConfig;
  readonly redis: RedisConfig;
  readonly jwt: JwtConfig;
  readonly rateLimit: RateLimitConfig;
  readonly corsOrigins: readonly string[];
  readonly logLevel: 'error' | 'warn' | 'info' | 'debug';
  readonly enableSwagger: boolean;
  readonly enableMetrics: boolean;
}

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(message: string, public readonly field: string) {
    super(`Configuration validation failed for field '${field}': ${message}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validates required environment variable
 */
function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new ConfigValidationError(`Missing required environment variable: ${key}`, key);
  }
  return value;
}

/**
 * Validates and parses integer environment variable
 */
function requireEnvInt(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new ConfigValidationError(`Missing required environment variable: ${key}`, key);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigValidationError(`Invalid integer value for ${key}: ${value}`, key);
  }
  return parsed;
}

/**
 * Validates and parses boolean environment variable
 */
function requireEnvBool(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new ConfigValidationError(`Missing required environment variable: ${key}`, key);
    }
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Validates environment value against enum
 */
function requireEnvEnum<T extends string>(key: string, enumValues: readonly T[], defaultValue?: T): T {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new ConfigValidationError(`Missing required environment variable: ${key}`, key);
  }
  if (!enumValues.includes(value as T)) {
    throw new ConfigValidationError(
      `Invalid value for ${key}: ${value}. Must be one of: ${enumValues.join(', ')}`,
      key
    );
  }
  return value as T;
}

/**
 * Validates and creates application configuration
 */
export function validateAndCreateConfig(): AppConfig {
  try {
    const config: AppConfig = {
      environment: requireEnvEnum('NODE_ENV', Object.values(Environment), Environment.DEVELOPMENT),
      port: requireEnvInt('PORT', 3000),
      host: requireEnv('HOST', '0.0.0.0'),
      apiVersion: requireEnv('API_VERSION', 'v1'),
      database: {
        url: requireEnv('DATABASE_URL'),
        maxConnections: requireEnvInt('DB_MAX_CONNECTIONS', 10),
        connectionTimeout: requireEnvInt('DB_CONNECTION_TIMEOUT', 30000),
        queryTimeout: requireEnvInt('DB_QUERY_TIMEOUT', 15000),
        ssl: requireEnvBool('DB_SSL', false),
      },
      redis: {
        url: requireEnv('REDIS_URL', 'redis://localhost:6379'),
        maxRetriesPerRequest: requireEnvInt('REDIS_MAX_RETRIES', 3),
        connectTimeout: requireEnvInt('REDIS_CONNECT_TIMEOUT', 10000),
        lazyConnect: requireEnvBool('REDIS_LAZY_CONNECT', true),
      },
      jwt: {
        secret: requireEnv('JWT_SECRET'),
        expiresIn: requireEnv('JWT_EXPIRES_IN', '1h'),
        refreshExpiresIn: requireEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
        issuer: requireEnv('JWT_ISSUER', 'turbo-asset'),
      },
      rateLimit: {
        windowMs: requireEnvInt('RATE_LIMIT_WINDOW_MS', 60000),
        maxRequests: requireEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),
        skipSuccessfulRequests: requireEnvBool('RATE_LIMIT_SKIP_SUCCESS', false),
        skipFailedRequests: requireEnvBool('RATE_LIMIT_SKIP_FAILED', false),
      },
      corsOrigins: requireEnv('CORS_ORIGINS', 'http://localhost:3000').split(','),
      logLevel: requireEnvEnum('LOG_LEVEL', ['error', 'warn', 'info', 'debug'] as const, 'info'),
      enableSwagger: requireEnvBool('ENABLE_SWAGGER', true),
      enableMetrics: requireEnvBool('ENABLE_METRICS', true),
    };

    // Additional validation
    validateConfig(config);
    
    return config;
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error;
    }
    throw new ConfigValidationError('Unknown configuration error', 'unknown');
  }
}

/**
 * Performs additional business logic validation
 */
function validateConfig(config: AppConfig): void {
  // Validate port range
  if (config.port < 1 || config.port > 65535) {
    throw new ConfigValidationError(`Port must be between 1 and 65535, got: ${config.port}`, 'PORT');
  }

  // Validate JWT secret in production
  if (config.environment === Environment.PRODUCTION && config.jwt.secret.length < 32) {
    throw new ConfigValidationError('JWT secret must be at least 32 characters in production', 'JWT_SECRET');
  }

  // Validate database connection limits
  if (config.database.maxConnections < 1) {
    throw new ConfigValidationError('Database max connections must be at least 1', 'DB_MAX_CONNECTIONS');
  }

  // Validate timeouts
  if (config.database.connectionTimeout < 1000) {
    throw new ConfigValidationError('Database connection timeout must be at least 1000ms', 'DB_CONNECTION_TIMEOUT');
  }
}