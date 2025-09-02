/**
 * Tenant Branding Constants
 * 
 * Configuration constants and default values for tenant branding domain services.
 */

export const TENANT_BRANDING_CONSTANTS = {
  // Default theme colors
  DEFAULT_COLORS: {
    PRIMARY: '#007bff',
    SECONDARY: '#6c757d',
    SUCCESS: '#28a745',
    WARNING: '#ffc107',
    ERROR: '#dc3545',
    INFO: '#17a2b8',
    NEUTRAL: '#f8f9fa',
    BACKGROUND: '#ffffff',
    SURFACE: '#f5f5f5',
  },

  // Default typography
  DEFAULT_TYPOGRAPHY: {
    FONT_FAMILY: 'Inter, system-ui, -apple-system, sans-serif',
    HEADING_FONT_FAMILY: 'Inter, system-ui, -apple-system, sans-serif',
    FONT_SIZE: '14px',
    LINE_HEIGHT: '1.5',
    HEADING_SIZES: {
      H1: '2.5rem',
      H2: '2rem',
      H3: '1.75rem',
      H4: '1.5rem',
      H5: '1.25rem',
      H6: '1rem',
    },
  },

  // Domain verification settings
  DOMAIN_VERIFICATION: {
    VERIFICATION_CODE_LENGTH: 32,
    VERIFICATION_CODE_PREFIX: 'turboasset-verify',
    TXT_RECORD_PREFIX: '_turboasset-verification',
    DEFAULT_TTL: 3600,
    VERIFICATION_TIMEOUT_HOURS: 72,
    MAX_VERIFICATION_ATTEMPTS: 5,
    CNAME_TARGET_SUFFIX: '.turboasset.com',
  },

  // Email template defaults
  EMAIL_TEMPLATES: {
    DEFAULT_VARIABLES: [
      'organizationName',
      'userName',
      'userEmail',
      'currentDate',
      'currentTime',
      'supportEmail',
      'loginUrl',
      'logoUrl',
      'primaryColor',
      'brandName',
    ],
    MAX_TEMPLATE_SIZE: 1024 * 1024, // 1MB
    ALLOWED_CONTENT_TYPES: ['text/html', 'text/plain'],
  },

  // Localization defaults
  LOCALIZATION: {
    DEFAULT_LANGUAGE: 'en',
    FALLBACK_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'no', 'da',
      'fi', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'et',
      'lv', 'lt', 'ru', 'uk', 'be', 'ja', 'ko', 'zh', 'th', 'vi',
      'hi', 'bn', 'ur', 'ar', 'he', 'tr', 'el', 'ka', 'am', 'sw',
    ],
    DEFAULT_CURRENCY: 'USD',
    DEFAULT_TIMEZONE: 'UTC',
    DEFAULT_DATE_FORMAT: 'MM/DD/YYYY',
    DEFAULT_TIME_FORMAT: '12h',
    DEFAULT_NUMBER_FORMAT: 'US',
    RTL_LANGUAGES: ['ar', 'he', 'fa', 'ur'],
  },

  // Feature flags defaults
  FEATURE_FLAGS: {
    DEFAULT_ROLLOUT_PERCENTAGE: 100,
    MAX_ROLLOUT_DURATION_DAYS: 90,
    ALLOWED_CONDITIONS: [
      'user_role',
      'organization_tier',
      'geographic_region',
      'user_count',
      'subscription_level',
      'beta_participant',
    ],
  },

  // Custom field validation
  CUSTOM_FIELDS: {
    MAX_FIELD_NAME_LENGTH: 50,
    MAX_FIELD_LABEL_LENGTH: 100,
    MAX_HELP_TEXT_LENGTH: 500,
    MAX_PLACEHOLDER_LENGTH: 100,
    MAX_OPTIONS_COUNT: 100,
    MAX_FILE_SIZE_MB: 50,
    ALLOWED_FILE_TYPES: [
      '.jpg', '.jpeg', '.png', '.gif', '.svg',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx',
      '.txt', '.csv', '.zip', '.rar',
    ],
    TEXT_FIELD_MAX_LENGTH: 1000,
    TEXTAREA_MAX_LENGTH: 5000,
    NUMBER_MIN_VALUE: -999999999,
    NUMBER_MAX_VALUE: 999999999,
  },

  // Access configuration
  ACCESS_CONFIG: {
    DEFAULT_SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in ms
    MAX_SESSION_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    MIN_SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutes in ms
    DEFAULT_PASSWORD_POLICY: {
      MIN_LENGTH: 8,
      MAX_LENGTH: 128,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SYMBOLS: false,
      MAX_AGE: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
      PREVENT_REUSE: 5,
      LOCKOUT_THRESHOLD: 5,
      LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes in ms
    },
    MAX_CONCURRENT_SESSIONS: 5,
    SUPPORTED_SSO_PROVIDERS: ['SAML', 'OAUTH2', 'LDAP', 'OPENID'],
    SUPPORTED_MFA_METHODS: ['totp', 'sms', 'email', 'push', 'hardware'],
  },

  // Branding validation
  BRANDING_VALIDATION: {
    COLOR_REGEX: /^#([0-9A-F]{3}){1,2}$/i,
    URL_REGEX: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    MAX_CSS_SIZE: 100 * 1024, // 100KB
    MAX_JS_SIZE: 50 * 1024, // 50KB
    MAX_LOGO_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_LOGO_FORMATS: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
    MAX_BRAND_NAME_LENGTH: 100,
    MAX_BRAND_DESCRIPTION_LENGTH: 500,
    MAX_FOOTER_CONTENT_LENGTH: 2000,
  },

  // PWA manifest defaults
  PWA_MANIFEST: {
    DEFAULT_DISPLAY: 'standalone' as const,
    DEFAULT_ORIENTATION: 'any' as const,
    REQUIRED_ICON_SIZES: ['192x192', '512x512'],
    RECOMMENDED_ICON_SIZES: ['72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'],
    MAX_SCREENSHOTS: 10,
    MAX_CATEGORIES: 5,
  },

  // Caching settings
  CACHE_CONFIG: {
    BRANDING_TTL: 15 * 60, // 15 minutes
    THEME_TTL: 30 * 60, // 30 minutes
    DOMAIN_MAPPING_TTL: 60 * 60, // 1 hour
    FEATURE_FLAGS_TTL: 5 * 60, // 5 minutes
    LOCALIZATION_TTL: 60 * 60, // 1 hour
    EMAIL_TEMPLATES_TTL: 30 * 60, // 30 minutes
  },

  // API rate limiting
  RATE_LIMITS: {
    DOMAIN_VERIFICATION: {
      MAX_ATTEMPTS: 5,
      WINDOW_MINUTES: 15,
    },
    BRANDING_UPDATES: {
      MAX_ATTEMPTS: 20,
      WINDOW_MINUTES: 60,
    },
    TEMPLATE_RENDERING: {
      MAX_ATTEMPTS: 100,
      WINDOW_MINUTES: 60,
    },
  },

  // Event types
  EVENTS: {
    BRANDING_UPDATED: 'branding:updated',
    DOMAIN_VERIFIED: 'domain:verified',
    DOMAIN_VERIFICATION_FAILED: 'domain:verification_failed',
    THEME_APPLIED: 'theme:applied',
    SUBSIDIARY_CREATED: 'subsidiary:created',
    SUBSIDIARY_UPDATED: 'subsidiary:updated',
    EMAIL_TEMPLATE_CREATED: 'email_template:created',
    EMAIL_TEMPLATE_UPDATED: 'email_template:updated',
    FEATURE_FLAG_TOGGLED: 'feature_flag:toggled',
    CUSTOM_FIELD_CREATED: 'custom_field:created',
    CUSTOM_FIELD_UPDATED: 'custom_field:updated',
    TENANT_ACTIVATED: 'tenant:activated',
    TENANT_SUSPENDED: 'tenant:suspended',
  },

  // Error codes
  ERROR_CODES: {
    INVALID_DOMAIN: 'INVALID_DOMAIN',
    DOMAIN_VERIFICATION_FAILED: 'DOMAIN_VERIFICATION_FAILED',
    INVALID_BRANDING_CONFIG: 'INVALID_BRANDING_CONFIG',
    THEME_NOT_FOUND: 'THEME_NOT_FOUND',
    TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
    CUSTOM_FIELD_EXISTS: 'CUSTOM_FIELD_EXISTS',
    TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
    SUBSIDIARY_LIMIT_EXCEEDED: 'SUBSIDIARY_LIMIT_EXCEEDED',
    FEATURE_FLAG_NOT_FOUND: 'FEATURE_FLAG_NOT_FOUND',
    INVALID_LOCALIZATION_CONFIG: 'INVALID_LOCALIZATION_CONFIG',
    SSO_CONFIG_INVALID: 'SSO_CONFIG_INVALID',
    PASSWORD_POLICY_VIOLATION: 'PASSWORD_POLICY_VIOLATION',
  },
} as const;

// Export individual constant groups for convenience
export const {
  DEFAULT_COLORS,
  DEFAULT_TYPOGRAPHY,
  DOMAIN_VERIFICATION,
  EMAIL_TEMPLATES,
  LOCALIZATION,
  FEATURE_FLAGS,
  CUSTOM_FIELDS,
  ACCESS_CONFIG,
  BRANDING_VALIDATION,
  PWA_MANIFEST,
  CACHE_CONFIG,
  RATE_LIMITS,
  EVENTS,
  ERROR_CODES,
} = TENANT_BRANDING_CONSTANTS;