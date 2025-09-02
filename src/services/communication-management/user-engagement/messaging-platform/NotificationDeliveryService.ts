/**
 * Notification Delivery Service - Handles notification delivery across channels
 * 
 * Manages sending notifications via email, SMS, push, websocket, and other channels
 * Part of the Communication Management domain within Turbo Asset IWMS
 */

import { prisma } from '../../../../../src/config/database';
import { logger } from '../../../../../src/config/logger';
import { NotificationData, NotificationChannel, NotificationDeliveryStatus } from './types/CommunicationTypes';
import { COMMUNICATION_CONSTANTS } from './constants/CommunicationConstants';
import { EventEmitter } from 'events';
import Bull, { Queue } from 'bull';

export class NotificationDeliveryService extends EventEmitter {
  private notificationQueue: Queue;
  private emailQueue: Queue;
  private smsQueue: Queue;
  private pushQueue: Queue;

  constructor() {
    super();
    
    // Initialize queues
    this.notificationQueue = new Bull(COMMUNICATION_CONSTANTS.QUEUE_NAMES.NOTIFICATIONS);
    this.emailQueue = new Bull(COMMUNICATION_CONSTANTS.QUEUE_NAMES.EMAIL);
    this.smsQueue = new Bull(COMMUNICATION_CONSTANTS.QUEUE_NAMES.SMS);
    this.pushQueue = new Bull(COMMUNICATION_CONSTANTS.QUEUE_NAMES.PUSH);

    this.setupQueueProcessors();
  }

  /**
   * Send notification through specified channels
   */
  async sendNotification(notification: NotificationData): Promise<string> {
    try {
      // Store notification in database
      const notificationRecord = await prisma.notification.create({
        data: {
          recipientId: notification.recipientId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          data: notification.data as any,
          scheduledFor: notification.scheduledFor,
          expiresAt: notification.expiresAt,
          organizationId: notification.organizationId,
        },
      });

      // Queue delivery for each channel
      const channels = notification.channels || [
        { type: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL, isEnabled: true }
      ];

      for (const channel of channels) {
        if (channel.isEnabled) {
          await this.queueChannelDelivery(notificationRecord.id, channel, notification);
        }
      }

      logger.info('Notification queued for delivery', { 
        notificationId: notificationRecord.id,
        recipientId: notification.recipientId,
        channels: channels.map(c => c.type)
      });

      return notificationRecord.id;
    } catch (error) {
      logger.error('Failed to send notification', { error, notification });
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications: NotificationData[]): Promise<string[]> {
    const results: string[] = [];

    for (const notification of notifications) {
      try {
        const notificationId = await this.sendNotification(notification);
        results.push(notificationId);
      } catch (error) {
        logger.error('Failed to send bulk notification', { error, notification });
        // Continue with other notifications
      }
    }

    return results;
  }

  /**
   * Get notification delivery status
   */
  async getDeliveryStatus(notificationId: string): Promise<NotificationDeliveryStatus[]> {
    try {
      const deliveryRecords = await prisma.notificationDelivery.findMany({
        where: { notificationId }
      });

      return deliveryRecords.map(record => ({
        notificationId: record.notificationId,
        channel: record.channel as NotificationDeliveryStatus['channel'],
        status: record.status as NotificationDeliveryStatus['status'],
        attempts: record.attempts,
        lastAttemptAt: record.lastAttemptAt || undefined,
        deliveredAt: record.deliveredAt || undefined,
        errorMessage: record.errorMessage || undefined,
        metadata: record.metadata as Record<string, any> || undefined
      }));
    } catch (error) {
      logger.error('Failed to get delivery status', { error, notificationId });
      throw error;
    }
  }

  /**
   * Retry failed notification delivery
   */
  async retryDelivery(notificationId: string, channel?: string): Promise<void> {
    try {
      const whereClause: any = { notificationId };
      if (channel) {
        whereClause.channel = channel;
      }

      const failedDeliveries = await prisma.notificationDelivery.findMany({
        where: {
          ...whereClause,
          status: COMMUNICATION_CONSTANTS.DELIVERY_STATUS.FAILED,
          attempts: { lt: COMMUNICATION_CONSTANTS.DEFAULT_RETRY_ATTEMPTS }
        }
      });

      for (const delivery of failedDeliveries) {
        await this.requeueDelivery(delivery.id);
      }

      logger.info('Notification delivery retries queued', { 
        notificationId, 
        channel, 
        retryCount: failedDeliveries.length 
      });
    } catch (error) {
      logger.error('Failed to retry notification delivery', { error, notificationId });
      throw error;
    }
  }

  /**
   * Queue notification for specific channel
   */
  private async queueChannelDelivery(
    notificationId: string,
    channel: NotificationChannel,
    notification: NotificationData
  ): Promise<void> {
    // Create delivery record
    const deliveryRecord = await prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel: channel.type,
        status: COMMUNICATION_CONSTANTS.DELIVERY_STATUS.PENDING,
        attempts: 0,
        metadata: channel.config as any
      }
    });

    // Queue for appropriate channel
    const jobData = {
      deliveryId: deliveryRecord.id,
      notificationId,
      channel: channel.type,
      notification,
      channelConfig: channel.config
    };

    switch (channel.type) {
      case COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL:
        await this.emailQueue.add('send-email', jobData, {
          attempts: COMMUNICATION_CONSTANTS.DEFAULT_RETRY_ATTEMPTS,
          backoff: { type: 'exponential', delay: 2000 },
          delay: notification.scheduledFor ? 
            notification.scheduledFor.getTime() - Date.now() : 0
        });
        break;

      case COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS:
        await this.smsQueue.add('send-sms', jobData, {
          attempts: COMMUNICATION_CONSTANTS.DEFAULT_RETRY_ATTEMPTS,
          backoff: { type: 'exponential', delay: 2000 },
          delay: notification.scheduledFor ? 
            notification.scheduledFor.getTime() - Date.now() : 0
        });
        break;

      case COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH:
        await this.pushQueue.add('send-push', jobData, {
          attempts: COMMUNICATION_CONSTANTS.DEFAULT_RETRY_ATTEMPTS,
          backoff: { type: 'exponential', delay: 2000 },
          delay: notification.scheduledFor ? 
            notification.scheduledFor.getTime() - Date.now() : 0
        });
        break;

      case COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WEBSOCKET:
        // WebSocket notifications are sent immediately
        await this.processWebSocketDelivery(jobData);
        break;

      default:
        logger.warn('Unknown notification channel type', { channelType: channel.type });
    }
  }

  /**
   * Setup queue processors for different channels
   */
  private setupQueueProcessors(): void {
    // Email processor
    this.emailQueue.process('send-email', async (job) => {
      return await this.processEmailDelivery(job.data);
    });

    // SMS processor  
    this.smsQueue.process('send-sms', async (job) => {
      return await this.processSMSDelivery(job.data);
    });

    // Push notification processor
    this.pushQueue.process('send-push', async (job) => {
      return await this.processPushDelivery(job.data);
    });

    // Error handlers
    this.emailQueue.on('failed', (job, err) => {
      logger.error('Email delivery failed', { jobId: job.id, error: err });
    });

    this.smsQueue.on('failed', (job, err) => {
      logger.error('SMS delivery failed', { jobId: job.id, error: err });
    });

    this.pushQueue.on('failed', (job, err) => {
      logger.error('Push notification delivery failed', { jobId: job.id, error: err });
    });
  }

  /**
   * Process email delivery
   */
  private async processEmailDelivery(jobData: any): Promise<void> {
    try {
      // Update delivery record
      await this.updateDeliveryStatus(
        jobData.deliveryId,
        COMMUNICATION_CONSTANTS.DELIVERY_STATUS.SENT
      );

      // In a real implementation, this would send via email service
      logger.info('Email notification processed', { 
        deliveryId: jobData.deliveryId,
        notificationId: jobData.notificationId
      });

      this.emit('notification.delivered', {
        notificationId: jobData.notificationId,
        channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.EMAIL,
        deliveredAt: new Date()
      });
    } catch (error) {
      await this.updateDeliveryStatus(
        jobData.deliveryId,
        COMMUNICATION_CONSTANTS.DELIVERY_STATUS.FAILED,
        error.message
      );
      throw error;
    }
  }

  /**
   * Process SMS delivery
   */
  private async processSMSDelivery(jobData: any): Promise<void> {
    try {
      // Update delivery record
      await this.updateDeliveryStatus(
        jobData.deliveryId,
        COMMUNICATION_CONSTANTS.DELIVERY_STATUS.SENT
      );

      // In a real implementation, this would send via SMS service
      logger.info('SMS notification processed', { 
        deliveryId: jobData.deliveryId,
        notificationId: jobData.notificationId
      });

      this.emit('notification.delivered', {
        notificationId: jobData.notificationId,
        channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.SMS,
        deliveredAt: new Date()
      });
    } catch (error) {
      await this.updateDeliveryStatus(
        jobData.deliveryId,
        COMMUNICATION_CONSTANTS.DELIVERY_STATUS.FAILED,
        error.message
      );
      throw error;
    }
  }

  /**
   * Process push notification delivery
   */
  private async processPushDelivery(jobData: any): Promise<void> {
    try {
      // Update delivery record
      await this.updateDeliveryStatus(
        jobData.deliveryId,
        COMMUNICATION_CONSTANTS.DELIVERY_STATUS.SENT
      );

      // In a real implementation, this would send via push service
      logger.info('Push notification processed', { 
        deliveryId: jobData.deliveryId,
        notificationId: jobData.notificationId
      });

      this.emit('notification.delivered', {
        notificationId: jobData.notificationId,
        channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.PUSH,
        deliveredAt: new Date()
      });
    } catch (error) {
      await this.updateDeliveryStatus(
        jobData.deliveryId,
        COMMUNICATION_CONSTANTS.DELIVERY_STATUS.FAILED,
        error.message
      );
      throw error;
    }
  }

  /**
   * Process WebSocket delivery
   */
  private async processWebSocketDelivery(jobData: any): Promise<void> {
    try {
      // Update delivery record
      await this.updateDeliveryStatus(
        jobData.deliveryId,
        COMMUNICATION_CONSTANTS.DELIVERY_STATUS.DELIVERED
      );

      // In a real implementation, this would emit via WebSocket
      logger.info('WebSocket notification processed', { 
        deliveryId: jobData.deliveryId,
        notificationId: jobData.notificationId
      });

      this.emit('notification.delivered', {
        notificationId: jobData.notificationId,
        channel: COMMUNICATION_CONSTANTS.CHANNEL_TYPES.WEBSOCKET,
        deliveredAt: new Date()
      });
    } catch (error) {
      await this.updateDeliveryStatus(
        jobData.deliveryId,
        COMMUNICATION_CONSTANTS.DELIVERY_STATUS.FAILED,
        error.message
      );
      throw error;
    }
  }

  /**
   * Update delivery status
   */
  private async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      lastAttemptAt: new Date(),
      attempts: { increment: 1 }
    };

    if (status === COMMUNICATION_CONSTANTS.DELIVERY_STATUS.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: updateData
    });
  }

  /**
   * Requeue failed delivery
   */
  private async requeueDelivery(deliveryId: string): Promise<void> {
    // Implementation for requeuing failed deliveries
    logger.info('Requeuing delivery', { deliveryId });
  }
}