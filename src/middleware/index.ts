/**
 * Middleware - Barrel Export
 * Following Facebook/Meta and Google best practices for middleware organization
 * 
 * This centralizes all middleware exports for clean imports across the application
 */

// Authentication and authorization middleware
export {
  authenticate,
  optionalAuth,
  requireOrganizationAccess,
  requireRoles,
  requirePermissions,
  validateJWTToken,
  extractUserFromToken
} from './auth';

// Error handling middleware
export {
  errorHandler,
  notFoundHandler,
  timeoutHandler,
  asyncHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} from './errorHandler';

// Enterprise error handling utilities
export {
  withErrorHandling,
  createSuccessResponse,
  createErrorResponse,
  asyncErrorHandler,
  validateRequired,
  ValidationError as ValidationErrorUtil,
  NotFoundError as NotFoundErrorUtil,
  UnauthorizedError,
  ConflictError
} from '../core/utils/errorHandling';
export type {
  APIResponse,
  SuccessResponse,
  ErrorResponse
} from '../core/utils/errorHandling';

// Rate limiting middleware
export {
  apiRateLimit,
  authRateLimit,
  strictRateLimit,
  uploadRateLimit,
  reportRateLimit,
  createCustomRateLimit
} from './rateLimiter';

// API versioning middleware
export {
  apiVersionManager,
  VersioningStrategy,
  APIVersion
} from './versioning';

// Health check middleware
export {
  HealthController,
  HealthStatus,
  HealthCheckResult
} from './health';

// Cache middleware
export {
  cacheMiddleware,
  invalidateCache,
  setCacheHeaders,
  CacheStrategy
} from './cache';

// Re-export types for external consumption
export type {
  AuthenticatedRequest,
  UserRole,
  Permission,
  RateLimitConfig,
  VersionedRequest
} from './auth';