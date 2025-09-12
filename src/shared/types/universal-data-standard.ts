/**
 * Universal Data Standard for Turbo Asset NAPI-RS Modules
 * This interface defines the common data structures and patterns used across all NAPI-RS packages
 */

// Base entity interface that all entities should implement
export interface BaseEntity {
  id: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  version: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

// Standard response structure for all API operations
export interface StandardResponse<T = any> {
  success: boolean;
  data?: T | null;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    timestamp?: Date;
    requestId: string;
    executionTime: number;
    apiVersion?: string;
    attempt?: number;
    attempts?: number;
    [key: string]: any;
  };
}

// Standard pagination interface
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends StandardResponse<T[]> {
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Standard filter interface
export interface BaseFilter {
  organizationId?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  search?: string;
  customFilters?: Record<string, any>;
}

// Standard validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  value?: any;
}

// Standard audit trail interface
export interface AuditTrail {
  entityId: string;
  entityType: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'IMPORT';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  organizationId: string;
}

// Standard notification interface
export interface NotificationPayload {
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'WORKFLOW' | 'SYSTEM' | 'MAINTENANCE';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  data?: Record<string, any>;
  recipientId: string;
  organizationId: string;
  expiresAt?: Date;
}

// Standard configuration interface for all modules
export interface ModuleConfiguration {
  moduleId: string;
  organizationId: string;
  isEnabled: boolean;
  settings: Record<string, any>;
  version: string;
  lastConfiguredAt: Date;
  lastConfiguredBy: string;
}

// Standard integration interface
export interface IntegrationPayload {
  sourceSystem: string;
  targetSystem: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC';
  data: Record<string, any>;
  correlationId: string;
  timestamp: Date;
  organizationId: string;
  retryCount?: number;
  maxRetries?: number;
}

// Standard event interface for inter-module communication
export interface ModuleEvent {
  eventId: string;
  eventType: string;
  sourceModule: string;
  targetModule?: string;
  payload: Record<string, any>;
  timestamp: Date;
  organizationId: string;
  correlationId?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

// Standard caching interface
export interface CacheOptions {
  key: string;
  ttl?: number; // Time to live in seconds
  organizationId: string;
  tags?: string[];
}

// Standard metrics interface
export interface ModuleMetrics {
  moduleId: string;
  operationName: string;
  executionTime: number;
  success: boolean;
  errorCode?: string;
  timestamp: Date;
  organizationId: string;
  additionalMetrics?: Record<string, number>;
}

// Standard file handling interface
export interface FileMetadata {
  fileId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  storageLocation: string;
  uploadedBy: string;
  uploadedAt: Date;
  organizationId: string;
  tags?: string[];
  isPublic: boolean;
}

// Standard workflow interface
export interface WorkflowContext {
  workflowId: string;
  instanceId: string;
  currentStep: string;
  data: Record<string, any>;
  userId: string;
  organizationId: string;
  startedAt: Date;
  lastActivityAt: Date;
}

// Standard bulk operation interface
export interface BulkOperation<T> {
  operationType: 'CREATE' | 'UPDATE' | 'DELETE';
  items: T[];
  batchSize?: number;
  continueOnError?: boolean;
  organizationId: string;
  userId: string;
}

export interface BulkOperationResult<T> {
  operationId: string;
  totalItems: number;
  successCount: number;
  errorCount: number;
  results: BulkItemResult<T>[];
  startedAt: Date;
  completedAt: Date;
}

export interface BulkItemResult<T> {
  index: number;
  success: boolean;
  data?: T;
  error?: ValidationError;
}

// Standard search interface
export interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  facets?: string[];
  pagination: PaginationParams;
  organizationId: string;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  facets?: Record<string, SearchFacet[]>;
  suggestions?: string[];
  executionTime: number;
}

export interface SearchFacet {
  value: string;
  count: number;
}

// Standard export/import interfaces
export interface ExportRequest {
  format: 'CSV' | 'EXCEL' | 'JSON' | 'XML' | 'PDF';
  filters?: Record<string, any>;
  fields?: string[];
  organizationId: string;
  userId: string;
  includeHeaders?: boolean;
  compression?: 'NONE' | 'ZIP' | 'GZIP';
}

export interface ImportRequest {
  format: 'CSV' | 'EXCEL' | 'JSON' | 'XML';
  fileData: Buffer | string;
  mapping?: Record<string, string>;
  validationMode: 'STRICT' | 'LENIENT' | 'SKIP_INVALID';
  organizationId: string;
  userId: string;
  batchSize?: number;
}