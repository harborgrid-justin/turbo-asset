import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import { logger } from '../config/logger';

const router = Router();
const notificationService = new NotificationService();

/**
 * Get user notifications
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, limit = 50, offset = 0, unreadOnly = false } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    const notifications = await notificationService.getUserNotifications(
      userId as string,
      Number(limit),
      Number(offset),
      unreadOnly === 'true'
    );

    const unreadCount = await notificationService.getUnreadCount(userId as string);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    logger.error('Failed to get notifications', error);
    res.status(500).json({
      error: 'Failed to get notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Mark notification as read
 */
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    await notificationService.markAsRead(id, userId);

    res.json({
      message: 'Notification marked as read',
    });
  } catch (error) {
    logger.error('Failed to mark notification as read', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create notification (for testing/admin purposes)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { recipientId, title, message, type, priority, data } = req.body;

    if (!recipientId || !title || !message || !type) {
      return res.status(400).json({
        error: 'Recipient ID, title, message, and type are required',
      });
    }

    const notificationId = await notificationService.createNotification({
      recipientId,
      title,
      message,
      type,
      priority: priority || 'NORMAL',
      data: data || {},
    });

    res.status(201).json({
      id: notificationId,
      message: 'Notification created successfully',
    });
  } catch (error) {
    logger.error('Failed to create notification', error);
    res.status(500).json({
      error: 'Failed to create notification',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;