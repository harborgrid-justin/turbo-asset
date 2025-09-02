/**
 * Business Operations Domain Constants
 * 
 * Configuration constants, validation rules, and settings for the
 * Business Operations domain services.
 */

// === CAPITAL PROJECT CONSTANTS ===

export const PROJECT_CONFIG = {
  CATEGORIES: [
    'INFRASTRUCTURE',
    'EXPANSION', 
    'RENOVATION',
    'UPGRADE',
    'REPLACEMENT',
    'OTHER'
  ] as const,

  PRIORITIES: [
    'CRITICAL',
    'HIGH', 
    'MEDIUM',
    'LOW'
  ] as const,

  RISK_LEVELS: [
    'HIGH',
    'MEDIUM', 
    'LOW'
  ] as const,

  STATUSES: [
    'PLANNING',
    'APPROVED',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED'
  ] as const,

  APPROVAL_STATUSES: [
    'PENDING',
    'APPROVED',
    'REJECTED'
  ] as const,

  TASK_STATUSES: [
    'NOT_STARTED',
    'IN_PROGRESS', 
    'COMPLETED',
    'ON_HOLD',
    'CANCELLED'
  ] as const,

  MILESTONE_STATUSES: [
    'PENDING',
    'COMPLETED',
    'OVERDUE'
  ] as const,

  DOCUMENT_TYPES: [
    'PLAN',
    'CONTRACT',
    'PERMIT',
    'DESIGN',
    'SPECIFICATION', 
    'OTHER'
  ] as const,

  RISK_TYPES: [
    'BUDGET',
    'SCHEDULE',
    'TECHNICAL',
    'REGULATORY',
    'VENDOR',
    'OTHER'
  ] as const,

  VALIDATION: {
    PROJECT_NAME_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 2000,
    PROJECT_NUMBER_PATTERN: /^PRJ-\d{4}-\d{4}$/,
    MIN_BUDGET: 1000,
    MAX_BUDGET: 100000000,
    MAX_DURATION_DAYS: 3650, // 10 years
    MAX_STAKEHOLDERS: 50,
    MAX_TASKS_PER_PROJECT: 1000,
    MAX_MILESTONES_PER_PROJECT: 50
  }
};

// === CONTRACT LIFECYCLE CONSTANTS ===

export const CONTRACT_CONFIG = {
  TYPES: [
    'LEASE',
    'SERVICE_AGREEMENT',
    'MAINTENANCE',
    'CONSTRUCTION', 
    'CONSULTING',
    'SUPPLY',
    'OTHER'
  ] as const,

  STATUSES: [
    'DRAFT',
    'UNDER_REVIEW',
    'APPROVED',
    'EXECUTED',
    'ACTIVE',
    'EXPIRED',
    'TERMINATED'
  ] as const,

  PARTY_ROLES: [
    'LESSOR',
    'LESSEE', 
    'VENDOR',
    'CLIENT',
    'GUARANTOR',
    'OTHER'
  ] as const,

  MILESTONE_TYPES: [
    'DELIVERABLE',
    'PAYMENT',
    'APPROVAL',
    'INSPECTION',
    'COMPLIANCE',
    'DEADLINE',
    'OTHER'
  ] as const,

  MILESTONE_STATUSES: [
    'PENDING',
    'COMPLETED',
    'OVERDUE',
    'WAIVED'
  ] as const,

  DOCUMENT_TYPES: [
    'CONTRACT',
    'AMENDMENT',
    'ADDENDUM',
    'EXHIBIT',
    'SCHEDULE',
    'OTHER'
  ] as const,

  RENEWAL_PERIODS: [
    { label: '30 Days', value: 30, unit: 'DAYS' },
    { label: '60 Days', value: 60, unit: 'DAYS' },
    { label: '90 Days', value: 90, unit: 'DAYS' },
    { label: '6 Months', value: 6, unit: 'MONTHS' },
    { label: '1 Year', value: 1, unit: 'YEARS' },
    { label: '2 Years', value: 2, unit: 'YEARS' },
    { label: '3 Years', value: 3, unit: 'YEARS' },
    { label: '5 Years', value: 5, unit: 'YEARS' }
  ],

  PAYMENT_SCHEDULES: [
    'MONTHLY',
    'QUARTERLY',
    'ANNUALLY',
    'ON_DELIVERY',
    'MILESTONE',
    'OTHER'
  ] as const,

  TERMINATION_TYPES: [
    'CONVENIENCE',
    'CAUSE',
    'NON_PAYMENT',
    'BREACH',
    'OTHER'
  ] as const,

  COMPLIANCE_TYPES: [
    'INSURANCE',
    'LICENSES',
    'CERTIFICATIONS',
    'REPORTING',
    'AUDIT',
    'OTHER'
  ] as const,

  VALIDATION: {
    CONTRACT_NUMBER_PATTERN: /^CNT-\d{4}-\d{4}$/,
    VERSION_PATTERN: /^\d+\.\d+$/,
    MIN_CONTRACT_VALUE: 0,
    MAX_CONTRACT_VALUE: 1000000000,
    MAX_CONTRACT_TERM_YEARS: 50,
    MAX_PARTIES: 20,
    MAX_MILESTONES: 100
  }
};

// === VENDOR BROKER CONSTANTS ===

export const VENDOR_CONFIG = {
  TYPES: [
    'SERVICE',
    'CONTRACTOR',
    'SUPPLIER',
    'CONSULTANT',
    'BROKER',
    'LEGAL',
    'FINANCIAL',
    'TECHNOLOGY',
    'OTHER'
  ] as const,

  STATUSES: [
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'TERMINATED'
  ] as const,

  BUSINESS_TYPES: [
    'CORPORATION',
    'LLC',
    'PARTNERSHIP', 
    'SOLE_PROPRIETORSHIP',
    'OTHER'
  ] as const,

  INSURANCE_TYPES: [
    'GENERAL_LIABILITY',
    'WORKERS_COMP',
    'PROFESSIONAL',
    'AUTO',
    'OTHER'
  ] as const,

  RATE_TYPES: [
    'HOURLY',
    'DAILY',
    'PROJECT',
    'UNIT'
  ] as const,

  CERTIFICATION_STATUSES: [
    'ACTIVE',
    'EXPIRED',
    'SUSPENDED'
  ] as const,

  RATING_TYPES: [
    'QUALITY',
    'TIMELINESS', 
    'COMMUNICATION',
    'VALUE',
    'OVERALL'
  ] as const,

  PERFORMANCE_THRESHOLDS: {
    EXCELLENT: 4.5,
    GOOD: 3.5,
    SATISFACTORY: 2.5,
    POOR: 1.5
  },

  VALIDATION: {
    VENDOR_CODE_PATTERN: /^VND-\d{6}$/,
    RATING_MIN: 1,
    RATING_MAX: 5,
    ANNUAL_REVENUE_MIN: 0,
    ANNUAL_REVENUE_MAX: 10000000000,
    EMPLOYEE_COUNT_MAX: 100000
  }
};

export const BROKER_CONFIG = {
  LICENSE_TYPES: [
    'REAL_ESTATE',
    'COMMERCIAL',
    'RESIDENTIAL',
    'OTHER'
  ] as const,

  LICENSE_STATUSES: [
    'ACTIVE',
    'EXPIRED',
    'SUSPENDED'
  ] as const,

  PROPERTY_TYPES: [
    'OFFICE',
    'RETAIL',
    'INDUSTRIAL',
    'WAREHOUSE',
    'MULTIFAMILY',
    'HOSPITALITY',
    'HEALTHCARE',
    'EDUCATION',
    'MIXED_USE',
    'LAND',
    'OTHER'
  ] as const,

  DEAL_TYPES: [
    'LEASE',
    'PURCHASE',
    'SALE',
    'RENEWAL',
    'OTHER'
  ] as const,

  DEAL_STATUSES: [
    'ACTIVE',
    'CLOSED',
    'CANCELLED'
  ] as const,

  COMMISSION_RATES: {
    OFFICE: { min: 0.02, max: 0.06, default: 0.04 },
    RETAIL: { min: 0.03, max: 0.08, default: 0.05 },
    INDUSTRIAL: { min: 0.02, max: 0.05, default: 0.03 }
  },

  VALIDATION: {
    BROKER_CODE_PATTERN: /^BRK-\d{6}$/,
    LICENSE_NUMBER_PATTERN: /^[A-Z0-9]{6,12}$/,
    COMMISSION_MIN: 0.01,
    COMMISSION_MAX: 0.15
  }
};

// === LEASE MANAGEMENT CONSTANTS ===

export const LEASE_CONFIG = {
  TYPES: [
    'OFFICE',
    'RETAIL',
    'INDUSTRIAL',
    'STORAGE',
    'PARKING',
    'OTHER'
  ] as const,

  STATUSES: [
    'ACTIVE',
    'EXPIRED',
    'TERMINATED',
    'PENDING_RENEWAL',
    'DRAFT'
  ] as const,

  RENT_ESCALATION_TYPES: [
    'FIXED',
    'PERCENTAGE',
    'CPI',
    'OTHER'
  ] as const,

  FREE_RENT_TYPES: [
    'FULL',
    'PARTIAL'
  ] as const,

  ADDITIONAL_RENT_TYPES: [
    'CAM',
    'TAXES',
    'INSURANCE', 
    'UTILITIES',
    'PARKING',
    'OTHER'
  ] as const,

  RENT_DETERMINATION_METHODS: [
    'FIXED',
    'MARKET',
    'PERCENTAGE_INCREASE',
    'CPI'
  ] as const,

  CONSENT_REQUIREMENTS: [
    'REQUIRED',
    'NOT_UNREASONABLY_WITHHELD',
    'NOT_REQUIRED'
  ] as const,

  CRITICAL_DATE_TYPES: [
    'RENT_COMMENCEMENT',
    'LEASE_EXPIRATION',
    'OPTION_EXERCISE',
    'RENEWAL_NOTICE',
    'TERMINATION_NOTICE',
    'OTHER'
  ] as const,

  PAYMENT_TYPES: [
    'BASE_RENT',
    'CAM',
    'TAXES',
    'INSURANCE',
    'OTHER'
  ] as const,

  PAYMENT_STATUSES: [
    'PENDING',
    'PAID',
    'PARTIAL',
    'OVERDUE'
  ] as const,

  DOCUMENT_TYPES: [
    'LEASE',
    'AMENDMENT',
    'ADDENDUM',
    'ABSTRACT',
    'CERTIFICATE',
    'OTHER'
  ] as const,

  NOTIFICATION_PERIODS: [
    { label: '30 Days', value: 30 },
    { label: '60 Days', value: 60 },
    { label: '90 Days', value: 90 },
    { label: '6 Months', value: 180 },
    { label: '1 Year', value: 365 }
  ],

  VALIDATION: {
    LEASE_NUMBER_PATTERN: /^LSE-\d{4}-\d{4}$/,
    MIN_RENTABLE_AREA: 1,
    MAX_RENTABLE_AREA: 10000000,
    MIN_RENT: 0,
    MAX_RENT: 1000000,
    MAX_LEASE_TERM_YEARS: 99,
    MIN_SECURITY_DEPOSIT: 0
  }
};

// === CAM RECONCILIATION CONSTANTS ===

export const CAM_CONFIG = {
  STATUSES: [
    'DRAFT',
    'UNDER_REVIEW',
    'COMPLETED',
    'DISPUTED',
    'FINALIZED'
  ] as const,

  EXPENSE_CATEGORIES: [
    'MAINTENANCE',
    'UTILITIES',
    'INSURANCE',
    'TAXES',
    'MANAGEMENT',
    'SECURITY',
    'LANDSCAPING',
    'OTHER'
  ] as const,

  ALLOCATION_METHODS: [
    'AREA',
    'HEADCOUNT',
    'PERCENTAGE',
    'FIXED',
    'OTHER'
  ] as const,

  ADJUSTMENT_TYPES: [
    'PRIOR_YEAR',
    'AUDIT',
    'DISPUTE_RESOLUTION',
    'ERROR_CORRECTION',
    'OTHER'
  ] as const,

  DISPUTE_TYPES: [
    'EXPENSE_CHALLENGE',
    'CALCULATION_ERROR',
    'DOCUMENTATION',
    'ALLOCATION_METHOD',
    'OTHER'
  ] as const,

  DISPUTE_STATUSES: [
    'SUBMITTED',
    'UNDER_REVIEW',
    'RESOLVED',
    'ESCALATED'
  ] as const,

  DOCUMENT_TYPES: [
    'RECONCILIATION_STATEMENT',
    'SUPPORTING_INVOICE',
    'TENANT_STATEMENT',
    'AUDIT_REPORT',
    'OTHER'
  ] as const,

  DEADLINES: {
    RECONCILIATION_DUE_DAYS: 120, // Days after year end
    TENANT_REVIEW_DAYS: 30,
    DISPUTE_RESPONSE_DAYS: 15,
    FINAL_STATEMENT_DAYS: 30
  },

  VALIDATION: {
    MIN_RECONCILIATION_YEAR: 2000,
    MAX_EXPENSE_AMOUNT: 100000000,
    MAX_TENANTS_PER_PROPERTY: 1000,
    VARIANCE_THRESHOLD_PERCENTAGE: 5
  }
};

// === CRITICAL DATE CONSTANTS ===

export const CRITICAL_DATE_CONFIG = {
  ENTITY_TYPES: [
    'LEASE',
    'CONTRACT',
    'PROJECT',
    'PERMIT',
    'INSURANCE',
    'COMPLIANCE',
    'OTHER'
  ] as const,

  IMPORTANCE_LEVELS: [
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
  ] as const,

  CATEGORIES: [
    'EXPIRATION',
    'RENEWAL',
    'NOTICE',
    'DEADLINE',
    'MILESTONE',
    'COMPLIANCE',
    'OTHER'
  ] as const,

  STATUSES: [
    'UPCOMING',
    'NOTIFIED',
    'ACTION_REQUIRED',
    'COMPLETED',
    'OVERDUE',
    'CANCELLED'
  ] as const,

  NOTIFICATION_TYPES: [
    'EMAIL',
    'SMS',
    'SYSTEM',
    'WORKFLOW'
  ] as const,

  NOTIFICATION_TRIGGERS: [
    'ADVANCE_NOTICE',
    'OVERDUE',
    'COMPLETION',
    'ESCALATION'
  ] as const,

  NOTIFICATION_STATUSES: [
    'PENDING',
    'SENT',
    'FAILED',
    'CANCELLED'
  ] as const,

  ACTION_TYPES: [
    'RENEWAL',
    'TERMINATION',
    'NOTIFICATION',
    'DOCUMENT_REVIEW',
    'APPROVAL',
    'OTHER'
  ] as const,

  ACTION_STATUSES: [
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  ] as const,

  DEFAULT_NOTIFICATION_PERIODS: {
    CRITICAL: [180, 90, 60, 30, 14, 7, 1],
    HIGH: [90, 30, 14, 7, 1],
    MEDIUM: [60, 30, 7],
    LOW: [30, 7]
  },

  ESCALATION_RULES: {
    OVERDUE_ESCALATION_DAYS: 3,
    CRITICAL_ESCALATION_DAYS: 1,
    MAX_ESCALATION_LEVELS: 3
  },

  VALIDATION: {
    DESCRIPTION_MAX_LENGTH: 500,
    MAX_DEPENDENCIES: 20,
    MAX_ACTIONS_PER_DATE: 10,
    MAX_NOTIFICATIONS_PER_DATE: 20,
    FUTURE_DATE_LIMIT_YEARS: 10
  }
};

// === COMMON DOMAIN CONSTANTS ===

export const BUSINESS_OPERATIONS_CONFIG = {
  CURRENCIES: [
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'JPY',
    'CHF',
    'SEK',
    'DKK',
    'NOK'
  ] as const,

  TIME_UNITS: [
    'DAYS',
    'MONTHS',
    'YEARS'
  ] as const,

  COUNTRIES: [
    'US',
    'CA',
    'GB',
    'FR',
    'DE',
    'AU',
    'JP',
    'SE',
    'DK',
    'NO'
  ] as const,

  CACHING: {
    DEFAULT_TTL: 300, // 5 minutes
    PROJECT_CACHE_TTL: 600, // 10 minutes  
    CONTRACT_CACHE_TTL: 900, // 15 minutes
    VENDOR_CACHE_TTL: 1800, // 30 minutes
    LEASE_CACHE_TTL: 600, // 10 minutes
    CAM_CACHE_TTL: 1800, // 30 minutes
    CRITICAL_DATE_CACHE_TTL: 300 // 5 minutes
  },

  BATCH_SIZES: {
    DEFAULT_BATCH_SIZE: 100,
    MAX_BATCH_SIZE: 1000,
    EXPORT_BATCH_SIZE: 500,
    NOTIFICATION_BATCH_SIZE: 50
  },

  LIMITS: {
    MAX_SEARCH_RESULTS: 10000,
    MAX_EXPORT_RECORDS: 50000,
    MAX_BULK_OPERATIONS: 1000,
    RATE_LIMIT_REQUESTS_PER_MINUTE: 1000
  },

  FILE_UPLOAD: {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.txt'],
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'text/plain'
    ]
  }
};

// === ERROR MESSAGES ===

export const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_FORMAT: 'Invalid format',
    INVALID_DATE_RANGE: 'End date must be after start date',
    INVALID_AMOUNT: 'Amount must be greater than 0',
    INVALID_PERCENTAGE: 'Percentage must be between 0 and 100',
    DUPLICATE_ENTRY: 'A record with this identifier already exists',
    REFERENCE_NOT_FOUND: 'Referenced record not found'
  },

  BUSINESS_LOGIC: {
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation',
    INVALID_STATUS_TRANSITION: 'Invalid status transition',
    OVERLAPPING_DATES: 'Date ranges cannot overlap',
    DEPENDENCY_EXISTS: 'Cannot delete record with existing dependencies',
    RECONCILIATION_IN_PROGRESS: 'Cannot modify reconciliation in progress',
    CONTRACT_ALREADY_EXECUTED: 'Cannot modify executed contract',
    LEASE_ALREADY_EXPIRED: 'Cannot modify expired lease'
  },

  SYSTEM: {
    DATABASE_ERROR: 'Database operation failed',
    FILE_UPLOAD_ERROR: 'File upload failed',
    NOTIFICATION_ERROR: 'Failed to send notification',
    CACHE_ERROR: 'Cache operation failed',
    EXTERNAL_SERVICE_ERROR: 'External service unavailable'
  }
};

// === SUCCESS MESSAGES ===

export const SUCCESS_MESSAGES = {
  CREATED: 'Record created successfully',
  UPDATED: 'Record updated successfully',
  DELETED: 'Record deleted successfully',
  APPROVED: 'Record approved successfully',
  REJECTED: 'Record rejected successfully',
  NOTIFICATION_SENT: 'Notification sent successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  EXPORT_GENERATED: 'Export file generated successfully'
};