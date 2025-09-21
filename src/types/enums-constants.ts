/**
 * Enterprise Enums and Constants
 * Centralized type-safe enums and constants for enterprise operations
 */

/**
 * Asset status enumeration
 */
export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
  DISPOSED = 'DISPOSED'
}

/**
 * Priority levels
 */
export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Work order status
 */
export enum WorkOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Space types
 */
export enum SpaceType {
  OFFICE = 'OFFICE',
  CONFERENCE_ROOM = 'CONFERENCE_ROOM',
  COMMON_AREA = 'COMMON_AREA',
  STORAGE = 'STORAGE',
  RESTROOM = 'RESTROOM',
  KITCHEN = 'KITCHEN',
  SERVER_ROOM = 'SERVER_ROOM',
  PARKING = 'PARKING'
}

/**
 * Lease status
 */
export enum LeaseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  PENDING_RENEWAL = 'PENDING_RENEWAL',
  DRAFT = 'DRAFT'
}

/**
 * Financial periods
 */
export enum FinancialPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  FISCAL_YEAR = 'FISCAL_YEAR'
}

/**
 * Notification types
 */
export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
  SLACK = 'SLACK',
  WEBHOOK = 'WEBHOOK'
}

/**
 * User roles
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FACILITY_MANAGER = 'FACILITY_MANAGER',
  MAINTENANCE_SUPERVISOR = 'MAINTENANCE_SUPERVISOR',
  TECHNICIAN = 'TECHNICIAN',
  EMPLOYEE = 'EMPLOYEE',
  CONTRACTOR = 'CONTRACTOR',
  VENDOR = 'VENDOR',
  READONLY = 'READONLY'
}

/**
 * Report formats
 */
export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON'
}

/**
 * API response status codes
 */
export enum ApiStatusCode {
  SUCCESS = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  RATE_LIMITED = 429,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * System constants
 */
export const SystemConstants = {
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  DEFAULT_TIMEOUT: 30000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'] as const,
  SUPPORTED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'text/plain'] as const,
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  TIMEZONE: 'UTC'
} as const;

/**
 * Validation constants
 */
export const ValidationConstants = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const;

/**
 * Cache constants
 */
export const CacheConstants = {
  DEFAULT_TTL: 300, // 5 minutes
  SHORT_TTL: 60,    // 1 minute
  LONG_TTL: 3600,   // 1 hour
  USER_SESSION_TTL: 86400, // 24 hours
  KEYS: {
    USER_PROFILE: 'user:profile:',
    ASSET_DETAILS: 'asset:details:',
    SPACE_INFO: 'space:info:',
    WORK_ORDER: 'workorder:',
    MAINTENANCE_SCHEDULE: 'maintenance:schedule:'
  }
} as const;

/**
 * Event names for system events
 */
export const SystemEvents = {
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
    LOGIN: 'user.login',
    LOGOUT: 'user.logout',
    PASSWORD_CHANGED: 'user.password.changed'
  },
  ASSET: {
    CREATED: 'asset.created',
    UPDATED: 'asset.updated',
    DELETED: 'asset.deleted',
    STATUS_CHANGED: 'asset.status.changed',
    MAINTENANCE_DUE: 'asset.maintenance.due'
  },
  WORK_ORDER: {
    CREATED: 'workorder.created',
    ASSIGNED: 'workorder.assigned',
    STARTED: 'workorder.started',
    COMPLETED: 'workorder.completed',
    CANCELLED: 'workorder.cancelled'
  },
  SPACE: {
    RESERVED: 'space.reserved',
    RELEASED: 'space.released',
    OCCUPANCY_CHANGED: 'space.occupancy.changed'
  },
  LEASE: {
    CREATED: 'lease.created',
    RENEWED: 'lease.renewed',
    EXPIRED: 'lease.expired',
    TERMINATED: 'lease.terminated'
  }
} as const;

/**
 * Permission constants
 */
export const Permissions = {
  ASSETS: {
    READ: 'assets:read',
    CREATE: 'assets:create',
    UPDATE: 'assets:update',
    DELETE: 'assets:delete',
    MANAGE: 'assets:manage'
  },
  SPACES: {
    READ: 'spaces:read',
    RESERVE: 'spaces:reserve',
    MANAGE: 'spaces:manage'
  },
  WORK_ORDERS: {
    READ: 'workorders:read',
    CREATE: 'workorders:create',
    ASSIGN: 'workorders:assign',
    COMPLETE: 'workorders:complete',
    APPROVE: 'workorders:approve'
  },
  USERS: {
    READ: 'users:read',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    MANAGE_ROLES: 'users:manage_roles'
  },
  REPORTS: {
    VIEW: 'reports:view',
    EXPORT: 'reports:export',
    CREATE: 'reports:create'
  },
  ADMIN: {
    SYSTEM_CONFIG: 'admin:system_config',
    USER_MANAGEMENT: 'admin:user_management',
    AUDIT_LOGS: 'admin:audit_logs'
  }
} as const;