/**
 * Communication Platform Service - Main orchestrator for communication management
 * 
 * Coordinates notification delivery, localization, and template management
 * Part of the Communication Management domain within Turbo Asset IWMS
 */

import { NotificationDeliveryService } from './NotificationDeliveryService';
import { LocalizationService } from './LocalizationService';
import { NotificationData, BulkNotificationRequest, CommunicationMetrics } from './types/CommunicationTypes';
import { logger } from '../../../../../src/config/logger';

export class CommunicationPlatformService {
  private deliveryService: NotificationDeliveryService;
  private localizationService: LocalizationService;

  constructor() {
    this.deliveryService = new NotificationDeliveryService();
    this.localizationService = new LocalizationService();

    this.setupEventHandlers();
    this.initialize();
  }

  // Expose service getters for direct access when needed
  get delivery() { return this.deliveryService; }
  get localization() { return this.localizationService; }

  /**
   * Initialize the communication platform
   */
  private async initialize(): Promise<void> {
    try {
      await this.localizationService.initialize();
      logger.info('Communication platform initialized');
    } catch (error) {
      logger.error('Failed to initialize communication platform', error);
      throw error;
    }
  }

  /**
   * Send a single notification with localization support
   */
  async sendNotification(
    notification: NotificationData,
    options: {
      language?: string;
      translateContent?: boolean;
    } = {}
  ): Promise<string> {
    try {
      let processedNotification = { ...notification };

      // Apply localization if requested
      if (options.translateContent && options.language) {
        processedNotification = await this.localizeNotification(notification, options.language);
      }

      return await this.deliveryService.sendNotification(processedNotification);
    } catch (error) {
      logger.error('Failed to send notification', { error, notification });
      throw error;
    }
  }

  /**
   * Send bulk notifications with localization
   */
  async sendBulkNotifications(request: BulkNotificationRequest): Promise<{
    successful: string[];
    failed: string[];
    totalProcessed: number;
  }> {
    try {
      // Build notifications from template
      const notifications = await this.buildNotificationsFromTemplate(request);

      const results = await this.deliveryService.sendBulkNotifications(notifications);

      return {
        successful: results,
        failed: [],
        totalProcessed: notifications.length
      };
    } catch (error) {
      logger.error('Failed to send bulk notifications', { error, request });
      throw error;
    }
  }

  /**
   * Translate content and get localized string
   */
  async translate(
    key: string,
    options: {
      language?: string;
      interpolation?: Record<string, any>;
      namespace?: string;
    } = {}
  ): Promise<string> {
    return this.localizationService.translate(key, options);
  }

  /**
   * Change user's language preference
   */
  async changeLanguage(language: string): Promise<void> {
    await this.localizationService.changeLanguage(language);
  }

  /**
   * Get communication metrics
   */
  async getCommunicationMetrics(
    organizationId: string,
    timeframe: {
      startDate: Date;
      endDate: Date;
    }
  ): Promise<CommunicationMetrics> {
    // This would be implemented with proper aggregation queries
    return {
      totalNotifications: 0,
      deliveredNotifications: 0,
      failedNotifications: 0,
      deliveryRate: 0,
      averageDeliveryTime: 0,
      channelBreakdown: {
        EMAIL: 0,
        SMS: 0,
        PUSH: 0,
        WEBSOCKET: 0,
        SLACK: 0,
        TEAMS: 0,
        WEBHOOK: 0
      },
      templateUsage: {}
    };
  }

  /**
   * Get notification delivery status
   */
  async getNotificationStatus(notificationId: string) {
    return await this.deliveryService.getDeliveryStatus(notificationId);
  }

  /**
   * Retry failed notification deliveries
   */
  async retryFailedNotifications(
    notificationId: string,
    channel?: string
  ): Promise<void> {
    await this.deliveryService.retryDelivery(notificationId, channel);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.localizationService.getSupportedLanguages();
  }

  /**
   * Detect language from request
   */
  detectLanguage(acceptLanguageHeader?: string): string {
    return this.localizationService.detectLanguageFromHeaders(acceptLanguageHeader);
  }

  /**
   * Format date according to locale
   */
  formatDate(
    date: Date,
    language?: string,
    format?: 'short' | 'medium' | 'long' | 'full'
  ): string {
    return this.localizationService.formatDate(date, { language, format });
  }

  /**
   * Format number according to locale
   */
  formatNumber(
    number: number,
    options: {
      language?: string;
      style?: 'decimal' | 'currency' | 'percent';
      currency?: string;
    } = {}
  ): string {
    return this.localizationService.formatNumber(number, options);
  }

  /**
   * Localize notification content
   */
  private async localizeNotification(
    notification: NotificationData,
    language: string
  ): Promise<NotificationData> {
    const localizedTitle = await this.localizationService.translate(
      notification.title,
      { 
        language,
        interpolation: notification.templateData,
        namespace: 'notifications'
      }
    );

    const localizedMessage = await this.localizationService.translate(
      notification.message,
      {
        language,
        interpolation: notification.templateData,
        namespace: 'notifications'
      }
    );

    return {
      ...notification,
      title: localizedTitle,
      message: localizedMessage
    };
  }

  /**
   * Build notifications from template and recipient list
   */
  private async buildNotificationsFromTemplate(
    request: BulkNotificationRequest
  ): Promise<NotificationData[]> {
    const notifications: NotificationData[] = [];

    for (const recipientId of request.recipients) {
      // In a real implementation, this would load actual template
      const notification: NotificationData = {
        recipientId,
        title: `Bulk notification for ${recipientId}`,
        message: `This is a bulk notification`,
        type: 'INFO',
        priority: request.priority,
        channels: request.channels?.map(type => ({ type, isEnabled: true })),
        templateData: request.templateData,
        scheduledFor: request.scheduledFor,
        organizationId: request.organizationId
      };

      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.deliveryService.on('notification.delivered', (event) => {
      logger.info('Notification delivered', event);
      // Could emit to external systems, update metrics, etc.
    });

    this.deliveryService.on('notification.failed', (event) => {
      logger.error('Notification delivery failed', event);
      // Could trigger retry logic, alerts, etc.
    });
  }
}