import { prisma } from '../../config/database';
import { logger } from '@/config/logger';

/**
 * Document Analytics Service - Handles document analytics and reporting
 * 
 * This service manages:
 * - Document usage analytics
 * - Storage analytics and metrics
 * - User activity analytics
 * - Performance dashboards
 */
export class DocumentAnalyticsService {
  /**
   * Get document analytics for organization
   */
  async getDocumentAnalytics(
    organizationId: string,
    options: {
      dateRange?: { start: Date; end: Date };
      includeUsers?: boolean;
      includeCategories?: boolean;
      includeActivity?: boolean;
    } = {}
  ): Promise<{
    totalDocuments: number;
    totalStorage: number;
    averageFileSize: number;
    documentsByCategory: { [key: string]: number };
    documentsByType: { [key: string]: number };
    userActivity?: any[];
    recentActivity?: any[];
    storageBreakdown: {
      totalUsed: number;
      byCategory: { [key: string]: number };
      byUser: { [key: string]: number };
    };
  }> {
    try {
      const {
        dateRange,
        includeUsers = false,
        includeCategories = true,
        includeActivity = true,
      } = options;

      // Base where clause
      const where: any = {
        organizationId,
        isActive: true,
        status: 'ACTIVE',
      };

      if (dateRange) {
        where.createdAt = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      }

      // Get basic metrics
      const documents = await prisma.document.findMany({
        where,
        select: {
          id: true,
          fileSize: true,
          category: true,
          mimeType: true,
          uploadedById: true,
          createdAt: true,
        },
      });

      const totalDocuments = documents.length;
      const totalStorage = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
      const averageFileSize = totalDocuments > 0 ? totalStorage / totalDocuments : 0;

      // Documents by category
      const documentsByCategory: { [key: string]: number } = {};
      documents.forEach(doc => {
        const category = doc.category || 'Uncategorized';
        documentsByCategory[category] = (documentsByCategory[category] || 0) + 1;
      });

      // Documents by file type
      const documentsByType: { [key: string]: number } = {};
      documents.forEach(doc => {
        const type = doc.mimeType;
        documentsByType[type] = (documentsByType[type] || 0) + 1;
      });

      // Storage breakdown
      const storageBreakdown = {
        totalUsed: totalStorage,
        byCategory: {} as { [key: string]: number },
        byUser: {} as { [key: string]: number },
      };

      documents.forEach(doc => {
        const category = doc.category || 'Uncategorized';
        storageBreakdown.byCategory[category] = (storageBreakdown.byCategory[category] || 0) + doc.fileSize;
        storageBreakdown.byUser[doc.uploadedById] = (storageBreakdown.byUser[doc.uploadedById] || 0) + doc.fileSize;
      });

      const analytics: any = {
        totalDocuments,
        totalStorage,
        averageFileSize,
        documentsByCategory,
        documentsByType,
        storageBreakdown,
      };

      // Include user activity if requested
      if (includeUsers) {
        const userActivity = await this.getUserActivity(organizationId, dateRange);
        analytics.userActivity = userActivity;
      }

      // Include recent activity if requested
      if (includeActivity) {
        const recentActivity = await this.getRecentActivity(organizationId, 50);
        analytics.recentActivity = recentActivity;
      }

      return analytics;
    } catch (error: unknown) {
      logger.error('Failed to get document analytics', error);
      throw error;
    }
  }

  /**
   * Get user activity analytics
   */
  private async getUserActivity(
    organizationId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any[]> {
    try {
      const where: any = {
        document: {
          organizationId,
        },
      };

      if (dateRange) {
        where.accessedAt = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      }

      const activities = await prisma.documentAccess.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Aggregate by user
      const userActivityMap = new Map();
      activities.forEach(activity => {
        const userId = activity.userId;
        if (!userActivityMap.has(userId)) {
          userActivityMap.set(userId, {
            user: activity.user,
            totalAccess: 0,
            actions: {},
            lastAccess: activity.accessedAt,
          });
        }

        const userData = userActivityMap.get(userId);
        userData.totalAccess++;
        userData.actions[activity.action] = (userData.actions[activity.action] || 0) + 1;
        
        if (activity.accessedAt > userData.lastAccess) {
          userData.lastAccess = activity.accessedAt;
        }
      });

      return Array.from(userActivityMap.values()).sort((a, b) => b.totalAccess - a.totalAccess);
    } catch (error: unknown) {
      logger.error('Failed to get user activity', error);
      return [];
    }
  }

  /**
   * Get recent document activity
   */
  private async getRecentActivity(
    organizationId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const activities = await prisma.documentAccess.findMany({
        where: {
          document: {
            organizationId,
          },
        },
        take: limit,
        orderBy: { accessedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          document: {
            select: {
              id: true,
              name: true,
              fileName: true,
            },
          },
        },
      });

      return activities.map(activity => ({
        id: activity.id,
        action: activity.action,
        accessedAt: activity.accessedAt,
        details: activity.details,
        user: activity.user,
        document: activity.document,
      }));
    } catch (error: unknown) {
      logger.error('Failed to get recent activity', error);
      return [];
    }
  }

  /**
   * Check document permission for user
   */
  async checkDocumentPermission(
    documentId: string,
    userId: string,
    action: 'READ' | 'WRITE' | 'DELETE'
  ): Promise<boolean> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { permissions: true },
      });

      if (!document) {
        return false;
      }

      // Document owner has all permissions
      if (document.uploadedById === userId) {
        return true;
      }

      // Check explicit permissions
      const permission = document.permissions.find(p => p.userId === userId);
      if (permission) {
        // Check if permission is expired
        if (permission.expiresAt && permission.expiresAt < new Date()) {
          return false;
        }

        switch (action) {
          case 'READ':
            return ['READ', 'WRITE', 'DELETE'].includes(permission.permission);
          case 'WRITE':
            return ['WRITE', 'DELETE'].includes(permission.permission);
          case 'DELETE':
            return permission.permission === 'DELETE';
          default:
            return false;
        }
      }

      // Check if document is public for read access
      if (action === 'READ' && document.isPublic) {
        return true;
      }

      return false;
    } catch (error: unknown) {
      logger.error('Failed to check document permission', error);
      return false;
    }
  }

  /**
   * Log document access for audit trail
   */
  async logAccess(
    documentId: string,
    userId: string,
    action: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.documentAccess.create({
        data: {
          documentId,
          userId,
          action,
          details: details || {},
          accessedAt: new Date(),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to log document access', error);
      // Don't throw, access logging is not critical
    }
  }
}