/**
 * Communication Management Constants
 * 
 * Part of the Communication Management domain within Turbo Asset IWMS
 */

export const COMMUNICATION_CONSTANTS = {
  // Notification constants
  NOTIFICATION_TYPES: {
    INFO: 'INFO',
    WARNING: 'WARNING', 
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS',
    WORKFLOW: 'WORKFLOW',
    SYSTEM: 'SYSTEM',
    MAINTENANCE: 'MAINTENANCE'
  } as const,

  PRIORITY_LEVELS: {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH',
    URGENT: 'URGENT'
  } as const,

  CHANNEL_TYPES: {
    EMAIL: 'EMAIL',
    SMS: 'SMS', 
    PUSH: 'PUSH',
    WEBSOCKET: 'WEBSOCKET',
    SLACK: 'SLACK',
    TEAMS: 'TEAMS',
    WEBHOOK: 'WEBHOOK'
  } as const,

  DELIVERY_STATUS: {
    PENDING: 'PENDING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    FAILED: 'FAILED',
    BOUNCED: 'BOUNCED',
    REJECTED: 'REJECTED'
  } as const,

  // Default settings
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY: 5000, // 5 seconds
  MAX_BULK_RECIPIENTS: 1000,
  
  // Queue settings
  QUEUE_NAMES: {
    NOTIFICATIONS: 'notifications',
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push'
  } as const,

  // Internationalization constants
  I18N_DEFAULTS: {
    DEFAULT_LANGUAGE: 'en',
    FALLBACK_LANGUAGE: 'en',
    NAMESPACE: 'common',
    LOAD_PATH: 'locales/{{lng}}/{{ns}}.json'
  } as const,

  SUPPORTED_LANGUAGES: [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar'
  ],

  // Template constants
  TEMPLATE_TYPES: {
    EMAIL: 'EMAIL',
    SMS: 'SMS',
    PUSH: 'PUSH',
    SLACK: 'SLACK',
    TEAMS: 'TEAMS',
    WEBHOOK: 'WEBHOOK'
  } as const,

  TEMPLATE_VARIABLES: {
    USER_NAME: '{{userName}}',
    ORGANIZATION_NAME: '{{organizationName}}',
    DATE: '{{date}}',
    TIME: '{{time}}',
    WORKFLOW_NAME: '{{workflowName}}',
    ASSET_NAME: '{{assetName}}',
    CUSTOM_MESSAGE: '{{customMessage}}'
  } as const
};

export const COMMUNICATION_EVENTS = {
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_DELIVERED: 'notification.delivered',
  NOTIFICATION_FAILED: 'notification.failed',
  TEMPLATE_CREATED: 'template.created',
  TEMPLATE_UPDATED: 'template.updated',
  PREFERENCES_UPDATED: 'preferences.updated',
  LANGUAGE_CHANGED: 'language.changed'
};

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  channels: [
    {
      type: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL,
      isEnabled: true
    },
    {
      type: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WEBSOCKET,
      isEnabled: true
    }
  ],
  categories: {
    [COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.WORKFLOW]: {
      enabled: true,
      channels: [
        COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL,
        COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WEBSOCKET
      ]
    },
    [COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.SYSTEM]: {
      enabled: true,
      channels: [COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WEBSOCKET]
    },
    [COMMUNICATION_CONSTANTS.NOTIFICATION_TYPES.MAINTENANCE]: {
      enabled: true,
      channels: [
        COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL,
        COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS
      ]
    }
  }
};

// Default localization configuration
export const DEFAULT_I18N_CONFIG = {
  defaultLanguage: COMMUNICATION_CONSTANTS.I18N_DEFAULTS.DEFAULT_LANGUAGE,
  supportedLanguages: COMMUNICATION_CONSTANTS.SUPPORTED_LANGUAGES,
  fallbackLanguage: COMMUNICATION_CONSTANTS.I18N_DEFAULTS.FALLBACK_LANGUAGE,
  loadPath: COMMUNICATION_CONSTANTS.I18N_DEFAULTS.LOAD_PATH,
  debug: false
};