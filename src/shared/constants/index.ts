/**
 * API Constants following industry best practices
 */
export const API_CONSTANTS = {
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,

  // Rate limiting
  RATE_LIMITS: {
    API: 1000,          // General API calls per hour
    AUTH: 10,           // Authentication attempts per hour
    UPLOAD: 100,        // File uploads per hour
    BULK: 10,           // Bulk operations per hour
    REPORTS: 50,        // Report generation per hour
  },

  // File upload limits
  FILE_LIMITS: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/json'
    ],
  },

  // Cache timeouts (in seconds)
  CACHE_TIMEOUTS: {
    SHORT: 300,         // 5 minutes
    MEDIUM: 1800,       // 30 minutes
    LONG: 3600,         // 1 hour
    VERY_LONG: 86400,   // 24 hours
  },

  // HTTP Status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  // Error codes
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    WORKFLOW_ERROR: 'WORKFLOW_ERROR',
    BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  },

  // API versions
  API_VERSIONS: {
    V1: 'v1',
    V2: 'v2',
    CURRENT: 'v1',
  },

  // Content types
  CONTENT_TYPES: {
    JSON: 'application/json',
    XML: 'application/xml',
    CSV: 'text/csv',
    PDF: 'application/pdf',
    EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },

  // Request timeouts (in milliseconds)
  TIMEOUTS: {
    DEFAULT: 30000,     // 30 seconds
    FILE_UPLOAD: 60000, // 1 minute
    BULK_OPERATION: 300000, // 5 minutes
    REPORT_GENERATION: 120000, // 2 minutes
  },
};

/**
 * Business Logic Constants
 */
export const BUSINESS_CONSTANTS = {
  // Space management
  SPACE_TYPES: [
    'office',
    'meeting_room',
    'conference_room',
    'desk',
    'workstation',
    'common_area',
    'storage',
    'kitchen',
    'bathroom',
    'lobby',
    'parking'
  ],

  // Asset categories
  ASSET_CATEGORIES: [
    'furniture',
    'equipment',
    'vehicle',
    'real_estate',
    'technology',
    'fixtures',
    'machinery',
    'tools',
    'software',
    'license'
  ],

  // Priority levels
  PRIORITY_LEVELS: [
    'low',
    'medium',
    'high',
    'critical'
  ],

  // Workflow states
  WORKFLOW_STATES: [
    'draft',
    'submitted',
    'in_review',
    'approved',
    'rejected',
    'completed',
    'cancelled'
  ],

  // User roles
  USER_ROLES: [
    'admin',
    'facility_manager',
    'property_manager',
    'maintenance_technician',
    'employee',
    'guest',
    'contractor',
    'vendor'
  ],

  // Permissions
  PERMISSIONS: [
    'read',
    'write',
    'delete',
    'admin',
    'approve',
    'assign',
    'report'
  ],

  // Supported currencies
  CURRENCIES: [
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'JPY',
    'CHF',
    'CNY',
    'INR',
    'BRL'
  ],

  // Supported languages
  LANGUAGES: [
    'en',   // English
    'es',   // Spanish
    'fr',   // French
    'de',   // German
    'it',   // Italian
    'pt',   // Portuguese
    'nl',   // Dutch
    'sv',   // Swedish
    'da',   // Danish
    'no',   // Norwegian
    'fi',   // Finnish
    'pl',   // Polish
    'cs',   // Czech
    'hu',   // Hungarian
    'ru',   // Russian
    'ja',   // Japanese
    'ko',   // Korean
    'zh',   // Chinese
    'ar',   // Arabic
    'he',   // Hebrew
    'hi',   // Hindi
    'th',   // Thai
    'vi',   // Vietnamese
    'tr'    // Turkish
  ],

  // Time zones (common ones)
  TIMEZONES: [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'UTC'
  ],

  // Measurement units
  MEASUREMENT_UNITS: {
    AREA: ['sqft', 'sqm'],
    LENGTH: ['ft', 'm', 'in', 'cm'],
    WEIGHT: ['lbs', 'kg', 'oz', 'g'],
    TEMPERATURE: ['F', 'C', 'K'],
    CURRENCY: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
  },

  // Integration types
  INTEGRATION_TYPES: [
    'sap',
    'oracle',
    'workday',
    'servicenow',
    'microsoft365',
    'google_workspace',
    'salesforce',
    'jira',
    'slack',
    'teams'
  ],

  // Notification channels
  NOTIFICATION_CHANNELS: [
    'email',
    'sms',
    'push',
    'in_app',
    'webhook',
    'slack',
    'teams'
  ],

  // Report formats
  REPORT_FORMATS: [
    'pdf',
    'excel',
    'csv',
    'json',
    'xml'
  ],

  // Data export formats
  EXPORT_FORMATS: [
    'csv',
    'excel',
    'json',
    'xml',
    'pdf'
  ],
};

/**
 * Validation Constants
 */
export const VALIDATION_CONSTANTS = {
  // String length limits
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_EMAIL_LENGTH: 254,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_COMMENT_LENGTH: 500,

  // Numeric limits
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 100,
  MIN_PRICE: 0,
  MAX_PRICE: 999999999.99,

  // Regex patterns
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-\(\)]+$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // File validation
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ],
};

/**
 * Database Constants
 */
export const DATABASE_CONSTANTS = {
  // Connection settings
  DEFAULT_CONNECTION_TIMEOUT: 30000,
  DEFAULT_QUERY_TIMEOUT: 60000,
  MAX_CONNECTIONS: 100,
  MIN_CONNECTIONS: 5,

  // Transaction settings
  TRANSACTION_TIMEOUT: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,

  // Query limits
  DEFAULT_BATCH_SIZE: 1000,
  MAX_BATCH_SIZE: 5000,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};