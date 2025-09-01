import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface NotificationData {
  recipientId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'WORKFLOW' | 'SYSTEM' | 'MAINTENANCE';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(notificationData: NotificationData): Promise<string> {
    try {
      const notification = await prisma.notification.create({
        data: {
          recipientId: notificationData.recipientId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          priority: notificationData.priority,
          data: notificationData.data as any,
        },
      });

      logger.info('Notification created', { 
        id: notification.id, 
        recipientId: notificationData.recipientId,
        type: notificationData.type 
      });

      return notification.id;
    } catch (error) {
      logger.error('Failed to create notification', error);
      throw error;
    }
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

      logger.info('Notification marked as read', { 
        notificationId, 
        userId 
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<any[]> {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          recipientId: userId,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return notifications;
    } catch (error) {
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
        },
      });

      return count;
    } catch (error) {
      logger.error('Failed to get unread notification count', error);
      throw error;
    }
  }
}