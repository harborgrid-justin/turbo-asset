import { prisma } from '../config/database';
import { logger } from '@/config/logger';
import { EventEmitter } from 'events';
// Note: In production, install nodemailer with: npm install nodemailer @types/nodemailer
// import { createTransport } from 'nodemailer';
import { Server as SocketIOServer } from 'socket.io';
import Bull, { Queue } from 'bull';
import Redis from 'redis';

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

export interface NotificationChannel {
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBSOCKET' | 'SLACK' | 'TEAMS' | 'WEBHOOK';
  address?: string;
  config?: Record<string, any>;
  isEnabled: boolean;
}

export interface NotificationPreferences {
  userId: string;
  channels: NotificationChannel[];
  categories: {
    [key: string]: {
      enabled: boolean;
      channels: Array<NotificationChannel['type']>;
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

export interface MessageQueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  queues: {
    notifications: {
      concurrency: number;
      retryAttempts: number;
      retryDelay: number;
    };
    email: {
      concurrency: number;
      retryAttempts: number;
      retryDelay: number;
    };
    sms: {
      concurrency: number;
      retryAttempts: number;
      retryDelay: number;
    };
  };
}

export class NotificationService extends EventEmitter {
  private readonly emailTransporter: any;
  private readonly socketServer?: SocketIOServer;
  private readonly notificationQueue: Queue;
  private readonly emailQueue: Queue;
  private readonly smsQueue: Queue;
  private readonly redis: any;
  private readonly activeConnections: Map<string, any> = new Map();

  constructor(config?: {
    email?: any;
    sms?: any;
    socketServer?: SocketIOServer;
    messageQueue?: MessageQueueConfig;
  }) {
    super();
    
    // Initialize email transporter
    if (config?.email) {
      // this.emailTransporter = createTransport(config.email);
      this.emailTransporter = config.email; // Placeholder until nodemailer is installed
    }
    
    // Set socket server
    if (config?.socketServer) {
      this.socketServer = config.socketServer;
      this.initializeSocketHandlers();
    }

    // Initialize message queues
    const queueConfig = config?.messageQueue || this.getDefaultQueueConfig();
    this.redis = Redis.createClient(queueConfig.redis);
    
    this.notificationQueue = new Bull('notifications', {
      redis: queueConfig.redis,
      defaultJobOptions: {
        attempts: queueConfig.queues.notifications.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: queueConfig.queues.notifications.retryDelay,
        },
      },
    });

    this.emailQueue = new Bull('email', {
      redis: queueConfig.redis,
      defaultJobOptions: {
        attempts: queueConfig.queues.email.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: queueConfig.queues.email.retryDelay,
        },
      },
    });

    this.smsQueue = new Bull('sms', {
      redis: queueConfig.redis,
      defaultJobOptions: {
        attempts: queueConfig.queues.sms.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: queueConfig.queues.sms.retryDelay,
        },
      },
    });

    this.initializeQueueProcessors();
  }

  /**
   * Create a new notification
   */
  async createNotification(notificationData: NotificationData): Promise<string> {
    try {
      // Create the notification record
      const notification = await prisma.notification.create({
        data: {
          recipientId: notificationData.recipientId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          priority: notificationData.priority,
          data: notificationData.data as any,
          templateId: notificationData.templateId,
          scheduledFor: notificationData.scheduledFor,
          expiresAt: notificationData.expiresAt,
          organizationId: notificationData.organizationId,
        },
      });

      // Queue for delivery if not scheduled
      if (!notificationData.scheduledFor || notificationData.scheduledFor <= new Date()) {
        await this.queueNotificationDelivery(notification.id, notificationData);
      } else {
        // Schedule for later delivery
        const delay = notificationData.scheduledFor.getTime() - new Date().getTime();
        await this.notificationQueue.add('scheduled-notification', 
          { notificationId: notification.id, notificationData }, 
          { delay }
        );
      }

      logger.info('Notification created', { 
        id: notification.id, 
        recipientId: notificationData.recipientId,
        type: notificationData.type,
        scheduled: !!notificationData.scheduledFor
      });

      this.emit('notificationCreated', notification);
      return notification.id;
    } catch (error: unknown) {
      logger.error('Failed to create notification', error);
      throw error;
    }
  }

  /**
   * Create and send bulk notifications
   */
  async createBulkNotifications(
    recipients: string[],
    notificationData: Omit<NotificationData, 'recipientId'>
  ): Promise<string[]> {
    try {
      const notificationIds: string[] = [];
      
      // Batch create notifications
      const batchSize = 100;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        const notifications = await prisma.notification.createMany({
          data: batch.map(recipientId => ({
            recipientId,
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type,
            priority: notificationData.priority,
            data: notificationData.data as any,
            templateId: notificationData.templateId,
            scheduledFor: notificationData.scheduledFor,
            expiresAt: notificationData.expiresAt,
            organizationId: notificationData.organizationId,
          })),
        });

        // Get the created notification IDs
        const createdNotifications = await prisma.notification.findMany({
          where: {
            recipientId: { in: batch },
            title: notificationData.title,
            createdAt: { gte: new Date(Date.now() - 5000) }, // Last 5 seconds
          },
          select: { id: true },
        });

        const batchIds = createdNotifications.map(n => n.id);
        notificationIds.push(...batchIds);

        // Queue each notification for delivery
        for (const id of batchIds) {
          await this.queueNotificationDelivery(id, {
            ...notificationData,
            recipientId: recipients[i + batchIds.indexOf(id)],
          });
        }
      }

      logger.info('Bulk notifications created', { 
        count: notificationIds.length,
        type: notificationData.type 
      });

      return notificationIds;
    } catch (error: unknown) {
      logger.error('Failed to create bulk notifications', error);
      throw error;
    }
  }

  /**
   * Queue notification for delivery
   */
  private async queueNotificationDelivery(
    notificationId: string, 
    notificationData: NotificationData
  ): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(notificationData.recipientId);
      
      // Determine delivery channels based on preferences and notification data
      const channels = this.determineDeliveryChannels(notificationData, preferences);
      
      // Queue delivery for each channel
      for (const channel of channels) {
        const jobData = {
          notificationId,
          notificationData,
          channel,
          userId: notificationData.recipientId,
        };

        switch (channel.type) {
          case 'WEBSOCKET':
            await this.deliverWebSocketNotification(jobData);
            break;
          case 'EMAIL':
            await this.emailQueue.add('send-email', jobData);
            break;
          case 'SMS':
            await this.smsQueue.add('send-sms', jobData);
            break;
          case 'PUSH':
            await this.notificationQueue.add('send-push', jobData);
            break;
          case 'SLACK':
            await this.notificationQueue.add('send-slack', jobData);
            break;
          case 'TEAMS':
            await this.notificationQueue.add('send-teams', jobData);
            break;
          case 'WEBHOOK':
            await this.notificationQueue.add('send-webhook', jobData);
            break;
        }
      }
    } catch (error: unknown) {
      logger.error('Failed to queue notification delivery', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await prisma.notificationPreferences.findUnique({
        where: { userId },
      });

      if (preferences) {
        return preferences;
      }

      // Return default preferences
      return {
        userId,
        channels: [
          { type: 'WEBSOCKET', isEnabled: true },
          { type: 'EMAIL', isEnabled: true },
        ],
        categories: {
          WORKFLOW: {
            enabled: true,
            channels: ['WEBSOCKET', 'EMAIL'],
          },
          SYSTEM: {
            enabled: true,
            channels: ['WEBSOCKET'],
          },
          MAINTENANCE: {
            enabled: true,
            channels: ['WEBSOCKET', 'EMAIL'],
          },
        },
      };
    } catch (error: unknown) {
      logger.error('Failed to get user preferences', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      await prisma.notificationPreferences.upsert({
        where: { userId },
        create: {
          userId,
          ...preferences,
        } as any,
        update: preferences as any,
      });

      logger.info('User notification preferences updated', { userId });
      this.emit('preferencesUpdated', { userId, preferences });
    } catch (error: unknown) {
      logger.error('Failed to update user preferences', error);
      throw error;
    }
  }

  /**
   * Determine delivery channels for notification
   */
  private determineDeliveryChannels(
    notificationData: NotificationData, 
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    
    // Use notification-specific channels if provided
    if (notificationData.channels && notificationData.channels.length > 0) {
      return notificationData.channels.filter(c => c.isEnabled);
    }

    // Use category preferences
    const categoryPrefs = preferences.categories[notificationData.type];
    if (categoryPrefs && categoryPrefs.enabled) {
      for (const channelType of categoryPrefs.channels) {
        const userChannel = preferences.channels.find(c => c.type === channelType && c.isEnabled);
        if (userChannel) {
          channels.push(userChannel);
        }
      }
    }

    // Default to websocket if no specific channels
    if (channels.length === 0) {
      const websocketChannel = preferences.channels.find(c => c.type === 'WEBSOCKET' && c.isEnabled);
      if (websocketChannel) {
        channels.push(websocketChannel);
      }
    }

    return channels;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          recipientId: userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Emit to websocket if user is connected
      this.emitToUser(userId, 'notificationRead', { notificationId });

      logger.info('Notification marked as read', { 
        notificationId, 
        userId 
      });
    } catch (error: unknown) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: {
          recipientId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Emit to websocket if user is connected
      this.emitToUser(userId, 'allNotificationsRead', {});

      logger.info('All notifications marked as read', { userId });
    } catch (error: unknown) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination and filtering
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
      priority?: string;
      since?: Date;
      includeExpired?: boolean;
    } = {}
  ): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
  }> {
    try {
      const {
        limit = 50,
        offset = 0,
        unreadOnly = false,
        type,
        priority,
        since,
        includeExpired = false,
      } = options;

      const where: any = {
        recipientId: userId,
        ...(unreadOnly ? { isRead: false } : {}),
        ...(type ? { type } : {}),
        ...(priority ? { priority } : {}),
        ...(since ? { createdAt: { gte: since } } : {}),
        ...(!includeExpired ? {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        } : {}),
      };

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' },
          ],
          take: limit,
          skip: offset,
          include: {
            deliveryStatus: true,
          },
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: {
            recipientId: userId,
            isRead: false,
            ...(!includeExpired ? {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            } : {}),
          },
        }),
      ]);

      return {
        notifications,
        total,
        unreadCount,
        hasMore: offset + limit < total,
      };
    } catch (error: unknown) {
      logger.error('Failed to get user notifications', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          recipientId: userId,
          isRead: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
        },
      });

      return count;
    } catch (error: unknown) {
      logger.error('Failed to get unread notification count', error);
      throw error;
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  async cleanupOldNotifications(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const deleteResult = await prisma.notification.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          isRead: true,
        },
      });

      logger.info('Old notifications cleaned up', { 
        count: deleteResult.count,
        olderThanDays 
      });

      return deleteResult.count;
    } catch (error: unknown) {
      logger.error('Failed to cleanup old notifications', error);
      throw error;
    }
  }

  /**
   * Create notification template
   */
  async createTemplate(templateData: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const template = await prisma.notificationTemplate.create({
        data: templateData as any,
      });

      logger.info('Notification template created', { 
        id: template.id, 
        name: templateData.name 
      });

      return template.id;
    } catch (error: unknown) {
      logger.error('Failed to create notification template', error);
      throw error;
    }
  }

  /**
   * Get notification templates
   */
  async getTemplates(organizationId: string): Promise<NotificationTemplate[]> {
    try {
      const templates = await prisma.notificationTemplate.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      return templates as NotificationTemplate[];
    } catch (error: unknown) {
      logger.error('Failed to get notification templates', error);
      throw error;
    }
  }

  /**
   * Render template with data
   */
  async renderTemplate(
    templateId: string, 
    templateData: Record<string, any>
  ): Promise<{ subject: string; htmlContent: string; textContent: string }> {
    try {
      const template = await prisma.notificationTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      let {subject} = template;
      let {htmlContent} = template;
      let {textContent} = template;

      // Simple template variable replacement
      for (const [key, value] of Object.entries(templateData)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
        textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value));
      }

      return { subject, htmlContent, textContent };
    } catch (error: unknown) {
      logger.error('Failed to render template', error);
      throw error;
    }
  }

  /**
   * Initialize WebSocket handlers
   */
  private initializeSocketHandlers(): void {
    if (!this.socketServer) {return;}

    this.socketServer.on('connection', (socket: any) => {
      socket.on('authenticate', async (data: { userId: string; token: string }) => {
        try {
          // Verify token and associate socket with user
          // This is a simplified implementation
          this.activeConnections.set(data.userId, socket);
          socket.userId = data.userId;
          
          socket.emit('authenticated', { success: true });
          
          // Send pending notifications count
          const unreadCount = await this.getUnreadCount(data.userId);
          socket.emit('unreadCount', { count: unreadCount });

          logger.info('Socket authenticated', { userId: data.userId, socketId: socket.id });
        } catch (error: unknown) {
          socket.emit('authenticated', { success: false, error: 'Authentication failed' });
          logger.error('Socket authentication failed', error);
        }
      });

      socket.on('disconnect', () => {
        if (socket.userId) {
          this.activeConnections.delete(socket.userId);
          logger.info('Socket disconnected', { userId: socket.userId, socketId: socket.id });
        }
      });
    });
  }

  /**
   * Emit event to specific user via WebSocket
   */
  private emitToUser(userId: string, event: string, data: any): void {
    const socket = this.activeConnections.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Deliver WebSocket notification
   */
  private async deliverWebSocketNotification(jobData: any): Promise<void> {
    try {
      const { notificationData, userId, notificationId } = jobData;
      
      this.emitToUser(userId, 'notification', {
        id: notificationId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        priority: notificationData.priority,
        data: notificationData.data,
        timestamp: new Date().toISOString(),
      });

      // Update delivery status
      await this.updateDeliveryStatus(notificationId, 'WEBSOCKET', 'DELIVERED');

      logger.info('WebSocket notification delivered', { 
        notificationId, 
        userId 
      });
    } catch (error: unknown) {
      await this.updateDeliveryStatus(jobData.notificationId, 'WEBSOCKET', 'FAILED', (error as Error).message);
      logger.error('Failed to deliver WebSocket notification', error);
      throw error;
    }
  }

  /**
   * Initialize queue processors
   */
  private initializeQueueProcessors(): void {
    // Email processor
    this.emailQueue.process('send-email', async (job) => {
      const { notificationData, channel, userId, notificationId } = job.data;
      
      try {
        let content = {
          subject: notificationData.title,
          htmlContent: notificationData.message,
          textContent: notificationData.message,
        };

        // Render template if specified
        if (notificationData.templateId) {
          content = await this.renderTemplate(
            notificationData.templateId,
            notificationData.templateData || {}
          );
        }

        // Get user email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (!user?.email) {
          throw new Error('User email not found');
        }

        // Send email
        await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM_ADDRESS || 'noreply@example.com',
          to: user.email,
          subject: content.subject,
          text: content.textContent,
          html: content.htmlContent,
        });

        await this.updateDeliveryStatus(notificationId, 'EMAIL', 'DELIVERED');
        logger.info('Email notification sent', { notificationId, userId, email: user.email });
      } catch (error: unknown) {
        await this.updateDeliveryStatus(notificationId, 'EMAIL', 'FAILED', (error as Error).message);
        logger.error('Failed to send email notification', error);
        throw error;
      }
    });

    // SMS processor
    this.smsQueue.process('send-sms', async (job) => {
      const { notificationData, channel, userId, notificationId } = job.data;
      
      try {
        // Get user phone number
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { phoneNumber: true },
        });

        if (!user?.phoneNumber) {
          throw new Error('User phone number not found');
        }

        // Send SMS (implementation depends on SMS provider)
        // This is a placeholder - integrate with Twilio, AWS SNS, etc.
        await this.sendSMS(user.phoneNumber, notificationData.message);

        await this.updateDeliveryStatus(notificationId, 'SMS', 'DELIVERED');
        logger.info('SMS notification sent', { notificationId, userId, phone: user.phoneNumber });
      } catch (error: unknown) {
        await this.updateDeliveryStatus(notificationId, 'SMS', 'FAILED', (error as Error).message);
        logger.error('Failed to send SMS notification', error);
        throw error;
      }
    });

    // Push notification processor
    this.notificationQueue.process('send-push', async (job) => {
      const { notificationData, userId, notificationId } = job.data;
      
      try {
        // Send push notification (implementation depends on push provider)
        // This is a placeholder - integrate with FCM, APNS, etc.
        await this.sendPushNotification(userId, notificationData);

        await this.updateDeliveryStatus(notificationId, 'PUSH', 'DELIVERED');
        logger.info('Push notification sent', { notificationId, userId });
      } catch (error: unknown) {
        await this.updateDeliveryStatus(notificationId, 'PUSH', 'FAILED', (error as Error).message);
        logger.error('Failed to send push notification', error);
        throw error;
      }
    });
  }

  /**
   * Update delivery status
   */
  private async updateDeliveryStatus(
    notificationId: string,
    channel: NotificationChannel['type'],
    status: NotificationDeliveryStatus['status'],
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.notificationDeliveryStatus.upsert({
        where: {
          notificationId_channel: {
            notificationId,
            channel,
          },
        },
        create: {
          notificationId,
          channel,
          status,
          attempts: 1,
          lastAttemptAt: new Date(),
          deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
          errorMessage,
        },
        update: {
          status,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
          errorMessage,
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to update delivery status', error);
    }
  }

  /**
   * Send SMS (placeholder implementation)
   */
  private async sendSMS(phoneNumber: string, message: string): Promise<void> {
    // Integrate with SMS provider (Twilio, AWS SNS, etc.)
    logger.info('SMS would be sent', { phoneNumber, message });
  }

  /**
   * Send push notification (placeholder implementation)
   */
  private async sendPushNotification(userId: string, notificationData: NotificationData): Promise<void> {
    // Integrate with push notification provider (FCM, APNS, etc.)
    logger.info('Push notification would be sent', { userId, title: notificationData.title });
  }

  /**
   * Get default queue configuration
   */
  private getDefaultQueueConfig(): MessageQueueConfig {
    return {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
      },
      queues: {
        notifications: {
          concurrency: 5,
          retryAttempts: 3,
          retryDelay: 5000,
        },
        email: {
          concurrency: 3,
          retryAttempts: 5,
          retryDelay: 10000,
        },
        sms: {
          concurrency: 2,
          retryAttempts: 3,
          retryDelay: 15000,
        },
      },
    };
  }
}