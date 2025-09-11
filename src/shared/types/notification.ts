export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  category?: string;
  status: NotificationStatus;
  isRead: boolean;
  recipientId: string;
  recipientType: 'USER' | 'ROLE' | 'DEPARTMENT' | 'ORGANIZATION';
  senderId?: string;
  metadata?: NotificationMetadata;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = 
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'WORKFLOW'
  | 'SYSTEM'
  | 'REMINDER'
  | 'ALERT'
  | 'ANNOUNCEMENT'
  | 'TASK'
  | 'MESSAGE'
  | 'MARKETING';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export interface NotificationMetadata {
  workflowId?: string;
  documentId?: string;
  assetId?: string;
  propertyId?: string;
  leaseId?: string;
  maintenanceId?: string;
  entityType?: string;
  entityId?: string;
  customData?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  type: NotificationType;
  category: string;
  subject: string;
  content: string;
  contentType: 'TEXT' | 'HTML' | 'MARKDOWN';
  variables: NotificationVariable[];
  channels: NotificationChannel[];
  isActive: boolean;
  isSystemDefined: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationVariable {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object';
  description?: string;
  defaultValue?: any;
  isRequired: boolean;
  format?: string;
}

export type NotificationChannel = 
  | 'IN_APP'
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'WEBHOOK'
  | 'SLACK'
  | 'TEAMS'
  | 'TELEGRAM';

export interface NotificationPreferences {
  id: string;
  userId: string;
  channels: NotificationChannelPreference[];
  categories: NotificationCategoryPreference[];
  quietHours?: QuietHoursConfig;
  timezone: string;
  language: string;
  frequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  digestEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationChannelPreference {
  channel: NotificationChannel;
  enabled: boolean;
  settings?: ChannelSettings;
}

export interface NotificationCategoryPreference {
  category: string;
  enabled: boolean;
  priority?: NotificationPriority[];
  channels?: NotificationChannel[];
}

export interface QuietHoursConfig {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  daysOfWeek: number[]; // 0-6, Sunday = 0
  allowUrgent: boolean;
}

export interface ChannelSettings {
  email?: EmailSettings;
  sms?: SMSSettings;
  push?: PushSettings;
  webhook?: WebhookSettings;
  slack?: SlackSettings;
  teams?: TeamsSettings;
}

export interface EmailSettings {
  address: string;
  format: 'TEXT' | 'HTML';
  includeAttachments: boolean;
  customSignature?: string;
}

export interface SMSSettings {
  phoneNumber: string;
  carrier?: string;
  maxLength: number;
}

export interface PushSettings {
  deviceTokens: string[];
  sound: string;
  badge: boolean;
  showPreview: boolean;
}

export interface WebhookSettings {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  secret?: string;
  timeout: number;
  retryAttempts: number;
}

export interface SlackSettings {
  workspaceId: string;
  channelId: string;
  webhookUrl: string;
  mention?: boolean;
}

export interface TeamsSettings {
  tenantId: string;
  channelId: string;
  webhookUrl: string;
  mention?: boolean;
}

export interface NotificationQueue {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  recipientAddress: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  recipientAddress: string;
  status: NotificationStatus;
  attempts: number;
  deliveredAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface NotificationBatch {
  id: string;
  name?: string;
  templateId: string;
  recipients: NotificationRecipient[];
  variables: Record<string, any>;
  status: 'PREPARING' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalCount: number;
  sentCount: number;
  failedCount: number;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdById: string;
}

export interface NotificationRecipient {
  id: string;
  type: 'USER' | 'ROLE' | 'DEPARTMENT' | 'EMAIL' | 'PHONE';
  identifier: string;
  variables?: Record<string, any>;
  channels?: NotificationChannel[];
}

export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  eventType: string;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  isActive: boolean;
  priority: number;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface NotificationAction {
  type: 'SEND_NOTIFICATION' | 'CREATE_TASK' | 'TRIGGER_WORKFLOW' | 'WEBHOOK' | 'DELAY';
  templateId?: string;
  recipients?: NotificationRecipient[];
  delay?: number;
  delayUnit?: 'MINUTES' | 'HOURS' | 'DAYS';
  webhookUrl?: string;
  workflowId?: string;
}

export interface NotificationAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  totals: {
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
  };
  byChannel: Array<{
    channel: NotificationChannel;
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  byCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  byRecipient: Array<{
    userId: string;
    userName: string;
    received: number;
    opened: number;
    openRate: number;
  }>;
  trends: Array<{
    date: Date;
    sent: number;
    delivered: number;
    failed: number;
  }>;
  topFailureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export interface NotificationDigest {
  id: string;
  userId: string;
  type: 'HOURLY' | 'DAILY' | 'WEEKLY';
  status: 'PENDING' | 'SENT' | 'FAILED';
  notificationIds: string[];
  summary: NotificationSummary;
  sentAt?: Date;
  createdAt: Date;
}

export interface NotificationSummary {
  totalCount: number;
  byType: Record<NotificationType, number>;
  byCategory: Record<string, number>;
  highPriorityCount: number;
  unreadCount: number;
  actionRequiredCount: number;
}