/**
 * Communication Management Types - Core messaging and localization types
 * 
 * Part of the Communication Management domain within Turbo Asset IWMS
 */

// Re-export notification types from original service for backward compatibility
export interface NotificationData {
  recipientId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'WORKFLOW' | 'SYSTEM' | 'MAINTENANCE';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  templateId?: string;
  templateData?: Record<string, any>;
  scheduledFor?: Date;
  expiresAt?: Date;
  organizationId?: string;
}

export interface NotificationChannel {
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBSOCKET' | 'SLACK' | 'TEAMS' | 'WEBHOOK';
  address?: string;
  config?: Record<string, any>;
  isEnabled: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  organizationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  channels: NotificationChannel[];
  categories: {
    [key: string]: {
      enabled: boolean;
      channels: NotificationChannel['type'][];
      quietHours?: {
        start: string;
        end: string;
        timezone: string;
      };
    };
  };
}

export interface NotificationDeliveryStatus {
  notificationId: string;
  channel: NotificationChannel['type'];
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'REJECTED';
  attempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Internationalization types
export interface LocalizationConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
  fallbackLanguage: string;
  loadPath: string;
  debug: boolean;
}

export interface TranslationResource {
  [namespace: string]: {
    [key: string]: string | TranslationResource;
  };
}

export interface I18nConfiguration {
  language: string;
  namespace: string;
  fallbackLanguage?: string;
  interpolation?: {
    prefix?: string;
    suffix?: string;
    escapeValue?: boolean;
  };
}

// Template management types
export interface MessageTemplate {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'SLACK' | 'TEAMS' | 'WEBHOOK';
  subject?: string;
  content: string;
  htmlContent?: string;
  variables: string[];
  language: string;
  organizationId: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface CommunicationMetrics {
  totalNotifications: number;
  deliveredNotifications: number;
  failedNotifications: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  channelBreakdown: Record<NotificationChannel['type'], number>;
  templateUsage: Record<string, number>;
}

export interface BulkNotificationRequest {
  recipients: string[];
  template: string;
  templateData: Record<string, any>;
  channels?: NotificationChannel['type'][];
  scheduledFor?: Date;
  priority: NotificationData['priority'];
  organizationId: string;
}