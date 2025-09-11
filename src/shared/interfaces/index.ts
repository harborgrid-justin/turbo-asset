/**
 * Shared interfaces following enterprise patterns
 * Based on Facebook, Google, and Oracle architectural standards
 */

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    field?: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

/**
 * Service interface that all services should implement
 */
export interface BaseService {
  readonly serviceName: string;
  initialize?(): Promise<void>;
  destroy?(): Promise<void>;
  getStatus(): ServiceStatus;
}

/**
 * Service status enumeration
 */
export enum ServiceStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  SHUTDOWN = 'shutdown'
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Sorting parameters
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter parameters
 */
export interface FilterParams {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin';
  value: any;
}

/**
 * Query parameters combining pagination, sorting, and filtering
 */
export interface QueryParams extends PaginationParams {
  sort?: SortParams[];
  filters?: FilterParams[];
  search?: string;
}

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Organization context interface
 */
export interface OrganizationContext {
  organizationId: string;
  organizationName?: string;
  tenantId?: string;
}

/**
 * User context interface
 */
export interface UserContext {
  userId: string;
  username?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Request context combining organization and user information
 */
export interface RequestContext extends OrganizationContext {
  user?: UserContext;
  correlationId?: string;
  requestId?: string;
}

/**
 * Configuration interface for services
 */
export interface ServiceConfig {
  enabled: boolean;
  timeout?: number;
  retries?: number;
  rateLimit?: {
    requests: number;
    window: number;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  duration: number;
  checks: {
    [service: string]: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      message?: string;
      duration?: number;
    };
  };
}

/**
 * Event interface for domain events
 */
export interface DomainEvent {
  eventId: string;
  eventType: string;
  eventVersion: string;
  timestamp: Date;
  aggregateId: string;
  aggregateType: string;
  data: any;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    organizationId?: string;
  };
}

/**
 * Command interface for CQRS pattern
 */
export interface Command {
  commandId: string;
  commandType: string;
  timestamp: Date;
  payload: any;
  metadata?: {
    correlationId?: string;
    userId?: string;
    organizationId?: string;
  };
}

/**
 * Query interface for CQRS pattern
 */
export interface Query {
  queryId?: string;
  queryType: string;
  parameters: any;
  context?: RequestContext;
}

/**
 * Metrics interface for monitoring
 */
export interface ServiceMetrics {
  name: string;
  timestamp: Date;
  metrics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}