/**
 * Enterprise Constants - Centralized Constants Management
 * Eliminates magic numbers and improves maintainability
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// Cache TTL Values (in milliseconds)
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,    // 30 minutes
  LONG: 60 * 60 * 1000,      // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000  // 24 hours
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  DEFAULT_REQUESTS_PER_MINUTE: 1000,
  BURST_LIMIT: 1500,
  WINDOW_MS: 60 * 1000,      // 1 minute
  API_CALLS_PER_HOUR: 10000
} as const;

// Database Configuration
export const DATABASE = {
  CONNECTION_POOL_MIN: 5,
  CONNECTION_POOL_MAX: 50,
  QUERY_TIMEOUT: 30000,      // 30 seconds
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  IDLE_TIMEOUT: 300000       // 5 minutes
} as const;

// Business Rules
export const BUSINESS_RULES = {
  MAX_FILE_SIZE_MB: 50,
  MAX_BATCH_SIZE: 1000,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  AUDIT_RETENTION_DAYS: 2555, // 7 years
  SESSION_TIMEOUT_MINUTES: 30
} as const;

// Feature Configuration
export const FEATURES = {
  TOTAL_ENTERPRISE_FEATURES: 48,
  MAX_CONCURRENT_OPERATIONS: 1000,
  HEALTH_CHECK_INTERVAL_MS: 30000,
  METRICS_RETENTION_DAYS: 90
} as const;

// Performance Thresholds
export const PERFORMANCE = {
  MAX_RESPONSE_TIME_MS: 200,
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: 50,
  CIRCUIT_BREAKER_RECOVERY_TIMEOUT_MS: 30000,
  MONITORING_WINDOW_MS: 60000
} as const;

// Security Constants
export const SECURITY = {
  JWT_EXPIRES_IN: '24h',
  BCRYPT_SALT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15
} as const;

// Error Codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;

export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
export type CacheTTL = typeof CACHE_TTL[keyof typeof CACHE_TTL];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];