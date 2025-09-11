/**
 * Common API Response interface following REST standards
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  pagination?: PaginationInfo;
  meta?: Record<string, unknown>;
}

/**
 * Error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp?: string;
  requestId?: string;
}

/**
 * Pagination information for list responses
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Standard request pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Standard sorting parameters
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Standard filtering parameters
 */
export interface FilterParams {
  search?: string;
  filters?: Record<string, unknown>;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Combined query parameters for list endpoints
 */
export interface QueryParams extends PaginationParams, SortParams, FilterParams {
  include?: string[];
  fields?: string[];
}

/**
 * User context for authenticated requests
 */
export interface UserContext {
  id: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

/**
 * Request context with user information
 */
export interface RequestContext {
  user: UserContext;
  organizationId: string;
  requestId: string;
  timestamp: Date;
}

/**
 * File upload information
 */
export interface FileInfo {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
}

/**
 * Audit trail information
 */
export interface AuditInfo {
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  version?: number;
}

/**
 * Status enumeration for various entities
 */
export enum EntityStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * Priority levels
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Generic database entity base interface
 */
export interface BaseEntity {
  id: string;
  organizationId: string;
  status: EntityStatus;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  version: number;
}

/**
 * Service response wrapper for consistent error handling
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  code?: string;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult<T = unknown> {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: ValidationError[];
  results: T[];
}

/**
 * Configuration interface for services
 */
export interface ServiceConfig {
  enableCache?: boolean;
  cacheTimeout?: number;
  enableAudit?: boolean;
  enableValidation?: boolean;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  version: string;
  dependencies: {
    database: 'connected' | 'disconnected' | 'error';
    redis: 'connected' | 'disconnected' | 'error';
    external: Record<string, 'connected' | 'disconnected' | 'error'>;
  };
}

/**
 * Workflow status enumeration
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

/**
 * Asset status enumeration
 */
export enum AssetStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
  DISPOSED = 'disposed'
}

/**
 * Space status enumeration
 */
export enum SpaceStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline'
}