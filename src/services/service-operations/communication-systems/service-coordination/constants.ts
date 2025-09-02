/**
 * Service Operations Domain - Configuration Constants
 * 
 * Centralized configuration and constants for notification services,
 * integration services, mobile services, SDK generation, API documentation,
 * and bulk data operations.
 */

export const SERVICE_OPERATIONS_CONFIG = {
  // Domain configuration
  DOMAIN: {
    NAME: 'Service Operations',
    VERSION: '1.0.0',
    CACHE_TTL: 300000, // 5 minutes
    MAX_RETRY_ATTEMPTS: 3,
    DEFAULT_TIMEOUT: 30000, // 30 seconds
  },

  // Notification Service Configuration
  NOTIFICATIONS: {
    MAX_BATCH_SIZE: 1000,
    DEFAULT_PRIORITY: 'NORMAL' as const,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 60000, // 1 minute
    TEMPLATE_CACHE_TTL: 600000, // 10 minutes
    SUPPORTED_CHANNELS: ['EMAIL', 'SMS', 'PUSH', 'WEBSOCKET', 'SLACK', 'TEAMS', 'WEBHOOK'] as const,
    PRIORITY_LEVELS: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const,
    TYPES: ['INFO', 'WARNING', 'ERROR', 'SUCCESS', 'WORKFLOW', 'SYSTEM', 'MAINTENANCE'] as const,
    DELIVERY_TIMEOUT: 300000, // 5 minutes
  },

  // Integration Service Configuration
  INTEGRATIONS: {
    MAX_CONCURRENT_RUNS: 10,
    DEFAULT_BATCH_SIZE: 500,
    MAX_RETRY_ATTEMPTS: 5,
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    SUPPORTED_ENDPOINTS: ['REST_API', 'SOAP_API', 'DATABASE', 'SFTP', 'FILE_SYSTEM', 'WEBHOOK'] as const,
    SCHEDULE_FREQUENCIES: ['REAL_TIME', 'MINUTELY', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] as const,
    BACKOFF_STRATEGIES: ['FIXED', 'LINEAR', 'EXPONENTIAL'] as const,
    MAX_RECORDS_PER_RUN: 100000,
  },

  // Mobile Service Configuration
  MOBILE: {
    SYNC_INTERVAL: 300000, // 5 minutes
    MAX_OFFLINE_HOURS: 72,
    PHOTO_MAX_SIZE: 10485760, // 10MB
    MAX_ATTACHMENTS_PER_TASK: 20,
    GPS_UPDATE_INTERVAL: 60000, // 1 minute
    SUPPORTED_PHOTO_FORMATS: ['JPEG', 'PNG', 'WEBP'] as const,
    WORK_ORDER_STATUSES: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] as const,
    TASK_STATUSES: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const,
    TECHNICIAN_AVAILABILITY: ['AVAILABLE', 'BUSY', 'OFF_DUTY', 'EMERGENCY'] as const,
  },

  // SDK Generator Configuration
  SDK: {
    SUPPORTED_LANGUAGES: ['JAVASCRIPT', 'TYPESCRIPT', 'PYTHON', 'JAVA', 'CSHARP', 'GO', 'PHP'] as const,
    OUTPUT_FORMATS: ['PACKAGE', 'SOURCE', 'BOTH'] as const,
    AUTH_TYPES: ['API_KEY', 'OAUTH2', 'BASIC_AUTH', 'BEARER_TOKEN'] as const,
    HTTP_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const,
    GENERATION_TIMEOUT: 600000, // 10 minutes
    MAX_ENDPOINTS: 500,
    CACHE_EXPIRY: 3600000, // 1 hour
  },

  // API Documentation Configuration
  DOCUMENTATION: {
    SUPPORTED_FORMATS: ['OPENAPI', 'SWAGGER', 'POSTMAN', 'INSOMNIA'] as const,
    THEMES: ['LIGHT', 'DARK', 'AUTO'] as const,
    MAX_EXAMPLES_PER_ENDPOINT: 10,
    CHANGELOG_TYPES: ['ADDED', 'CHANGED', 'DEPRECATED', 'REMOVED', 'FIXED', 'SECURITY'] as const,
    PARAMETER_LOCATIONS: ['query', 'path', 'header', 'cookie'] as const,
    RESPONSE_CODES: [200, 201, 204, 400, 401, 403, 404, 409, 422, 500, 502, 503] as const,
  },

  // Bulk Data Service Configuration
  BULK_DATA: {
    MAX_FILE_SIZE: 1073741824, // 1GB
    DEFAULT_CHUNK_SIZE: 10000,
    MAX_WORKERS: 8,
    SUPPORTED_FORMATS: ['CSV', 'JSON', 'XML', 'EXCEL', 'PARQUET', 'AVRO'] as const,
    COMPRESSION_TYPES: ['GZIP', 'ZIP', 'NONE'] as const,
    OPERATION_TYPES: ['IMPORT', 'EXPORT', 'TRANSFORM'] as const,
    SOURCE_TYPES: ['FILE', 'DATABASE', 'API', 'STREAM'] as const,
    VALIDATION_TYPES: ['REQUIRED', 'TYPE', 'FORMAT', 'RANGE', 'ENUM', 'CUSTOM'] as const,
    MAX_ERROR_RATE: 0.05, // 5%
  },

  // Health Check Configuration
  HEALTH_CHECK: {
    INTERVAL: 300000, // 5 minutes
    TIMEOUT: 10000, // 10 seconds
    THRESHOLDS: {
      RESPONSE_TIME: 2000, // 2 seconds
      ERROR_RATE: 0.05, // 5%
      CPU_USAGE: 0.8, // 80%
      MEMORY_USAGE: 0.85, // 85%
    },
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Common Errors
  INVALID_ORGANIZATION_ID: 'Invalid organization ID provided',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation',
  OPERATION_TIMEOUT: 'Operation timed out',
  SERVICE_UNAVAILABLE: 'Service is currently unavailable',

  // Notification Service Errors
  NOTIFICATION_TEMPLATE_NOT_FOUND: 'Notification template not found',
  INVALID_NOTIFICATION_CHANNEL: 'Invalid notification channel',
  NOTIFICATION_DELIVERY_FAILED: 'Notification delivery failed',
  BATCH_TOO_LARGE: 'Notification batch exceeds maximum size',
  RECIPIENT_NOT_FOUND: 'Notification recipient not found',

  // Integration Service Errors
  INTEGRATION_CONFIG_NOT_FOUND: 'Integration configuration not found',
  ENDPOINT_CONNECTION_FAILED: 'Failed to connect to integration endpoint',
  DATA_MAPPING_ERROR: 'Data mapping error occurred',
  TRANSFORMATION_FAILED: 'Data transformation failed',
  SYNC_ALREADY_RUNNING: 'Synchronization is already running',

  // Mobile Service Errors
  TECHNICIAN_NOT_FOUND: 'Technician not found',
  WORK_ORDER_NOT_FOUND: 'Work order not found',
  INVALID_MOBILE_DATA: 'Invalid mobile synchronization data',
  PHOTO_TOO_LARGE: 'Photo exceeds maximum size limit',
  OFFLINE_SYNC_FAILED: 'Offline synchronization failed',

  // SDK Generator Errors
  SDK_CONFIG_NOT_FOUND: 'SDK configuration not found',
  UNSUPPORTED_LANGUAGE: 'Unsupported programming language',
  GENERATION_FAILED: 'SDK generation failed',
  INVALID_API_SPEC: 'Invalid API specification',
  DOWNLOAD_EXPIRED: 'SDK download link has expired',

  // Documentation Service Errors
  DOCUMENTATION_NOT_FOUND: 'API documentation not found',
  INVALID_OPENAPI_SPEC: 'Invalid OpenAPI specification',
  ENDPOINT_NOT_DOCUMENTED: 'Endpoint is not documented',
  EXAMPLE_GENERATION_FAILED: 'Example generation failed',

  // Bulk Data Service Errors
  OPERATION_NOT_FOUND: 'Bulk data operation not found',
  UNSUPPORTED_FORMAT: 'Unsupported data format',
  FILE_TOO_LARGE: 'File exceeds maximum size limit',
  VALIDATION_FAILED: 'Data validation failed',
  IMPORT_FAILED: 'Data import failed',
  EXPORT_FAILED: 'Data export failed',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  // Notification Service
  NOTIFICATION_SENT: 'Notification sent successfully',
  TEMPLATE_CREATED: 'Notification template created successfully',
  BATCH_PROCESSED: 'Notification batch processed successfully',
  PREFERENCES_UPDATED: 'Notification preferences updated successfully',

  // Integration Service
  INTEGRATION_COMPLETED: 'Data integration completed successfully',
  CONFIG_SAVED: 'Integration configuration saved successfully',
  SYNC_STARTED: 'Data synchronization started successfully',
  ENDPOINT_TESTED: 'Integration endpoint tested successfully',

  // Mobile Service
  WORK_ORDER_SYNCED: 'Work order synchronized successfully',
  PHOTOS_UPLOADED: 'Photos uploaded successfully',
  OFFLINE_DATA_SYNCED: 'Offline data synchronized successfully',
  TECHNICIAN_UPDATED: 'Technician profile updated successfully',

  // SDK Generator
  SDK_GENERATED: 'SDK generated successfully',
  SDK_PUBLISHED: 'SDK published successfully',
  CONFIG_VALIDATED: 'SDK configuration validated successfully',

  // Documentation Service
  DOCUMENTATION_UPDATED: 'API documentation updated successfully',
  EXAMPLES_GENERATED: 'API examples generated successfully',
  CHANGELOG_UPDATED: 'Changelog updated successfully',

  // Bulk Data Service
  OPERATION_COMPLETED: 'Bulk data operation completed successfully',
  FILE_PROCESSED: 'Data file processed successfully',
  VALIDATION_PASSED: 'Data validation passed successfully',
  SCHEDULE_CREATED: 'Bulk data schedule created successfully',
} as const;

// Cache Keys
export const CACHE_KEYS = {
  NOTIFICATION_TEMPLATE: (id: string) => `notification:template:${id}`,
  NOTIFICATION_PREFERENCES: (userId: string) => `notification:prefs:${userId}`,
  INTEGRATION_CONFIG: (id: string) => `integration:config:${id}`,
  INTEGRATION_RUN: (id: string) => `integration:run:${id}`,
  MOBILE_WORK_ORDER: (id: string) => `mobile:workorder:${id}`,
  TECHNICIAN_PROFILE: (id: string) => `mobile:technician:${id}`,
  SDK_CONFIG: (id: string) => `sdk:config:${id}`,
  SDK_GENERATION: (id: string) => `sdk:generation:${id}`,
  DOCUMENTATION: (id: string) => `docs:${id}`,
  BULK_OPERATION: (id: string) => `bulk:operation:${id}`,
  DASHBOARD_METRICS: (orgId: string) => `dashboard:service-ops:${orgId}`,
  HEALTH_STATUS: (service: string) => `health:service-ops:${service}`,
} as const;

// Queue Names
export const QUEUE_NAMES = {
  NOTIFICATION_DELIVERY: 'notification-delivery',
  NOTIFICATION_BATCH: 'notification-batch',
  INTEGRATION_PROCESSING: 'integration-processing',
  MOBILE_SYNC: 'mobile-sync',
  SDK_GENERATION: 'sdk-generation',
  DOCUMENTATION_UPDATE: 'documentation-update',
  BULK_DATA_PROCESSING: 'bulk-data-processing',
} as const;

// Event Types
export const EVENT_TYPES = {
  // Notification Events
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  TEMPLATE_CREATED: 'notification.template.created',
  BATCH_COMPLETED: 'notification.batch.completed',

  // Integration Events
  INTEGRATION_STARTED: 'integration.started',
  INTEGRATION_COMPLETED: 'integration.completed',
  INTEGRATION_FAILED: 'integration.failed',
  SYNC_STATUS_CHANGED: 'integration.sync.status',

  // Mobile Events
  MOBILE_SYNC_STARTED: 'mobile.sync.started',
  MOBILE_SYNC_COMPLETED: 'mobile.sync.completed',
  WORK_ORDER_UPDATED: 'mobile.workorder.updated',
  TECHNICIAN_LOCATION_UPDATED: 'mobile.technician.location',

  // SDK Events
  SDK_GENERATION_STARTED: 'sdk.generation.started',
  SDK_GENERATION_COMPLETED: 'sdk.generation.completed',
  SDK_GENERATION_FAILED: 'sdk.generation.failed',
  SDK_DOWNLOADED: 'sdk.downloaded',

  // Documentation Events
  DOCUMENTATION_UPDATED: 'docs.updated',
  ENDPOINT_DOCUMENTED: 'docs.endpoint.added',
  EXAMPLES_GENERATED: 'docs.examples.generated',

  // Bulk Data Events
  BULK_OPERATION_STARTED: 'bulk.operation.started',
  BULK_OPERATION_COMPLETED: 'bulk.operation.completed',
  BULK_OPERATION_FAILED: 'bulk.operation.failed',
  BULK_PROGRESS_UPDATE: 'bulk.progress.update',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  NOTIFICATIONS: {
    BASE: '/api/v1/notifications',
    SEND: '/api/v1/notifications/send',
    BATCH: '/api/v1/notifications/batch',
    TEMPLATES: '/api/v1/notifications/templates',
    PREFERENCES: '/api/v1/notifications/preferences',
  },
  INTEGRATIONS: {
    BASE: '/api/v1/integrations',
    CONFIGS: '/api/v1/integrations/configs',
    RUNS: '/api/v1/integrations/runs',
    SYNC: '/api/v1/integrations/sync',
  },
  MOBILE: {
    BASE: '/api/v1/mobile',
    WORK_ORDERS: '/api/v1/mobile/workorders',
    SYNC: '/api/v1/mobile/sync',
    TECHNICIANS: '/api/v1/mobile/technicians',
    PHOTOS: '/api/v1/mobile/photos',
  },
  SDK: {
    BASE: '/api/v1/sdk',
    GENERATE: '/api/v1/sdk/generate',
    CONFIGS: '/api/v1/sdk/configs',
    DOWNLOAD: '/api/v1/sdk/download',
  },
  DOCUMENTATION: {
    BASE: '/api/v1/docs',
    ENDPOINTS: '/api/v1/docs/endpoints',
    MODELS: '/api/v1/docs/models',
    EXAMPLES: '/api/v1/docs/examples',
  },
  BULK: {
    BASE: '/api/v1/bulk',
    OPERATIONS: '/api/v1/bulk/operations',
    IMPORT: '/api/v1/bulk/import',
    EXPORT: '/api/v1/bulk/export',
  },
} as const;