import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

export interface DocumentPermission {
  userId: string;
  permission: 'READ' | 'WRITE' | 'DELETE';
  expiresAt?: Date;
}

export interface DocumentSharingRequest {
  userIds: string[];
  permissions: 'READ' | 'WRITE' | 'DELETE';
  expiresAt?: Date;
  message?: string;
}

/**
 * Document Permission Service - Handles document access control and sharing
 * 
 * This service manages:
 * - Document permissions and access control
 * - Document sharing with users
 * - Permission validation and enforcement
 * - Access history and audit trails
 */
export class DocumentPermissionService {
  /**
   * Set document permissions for a user
   */
  async setDocumentPermission(
    documentId: string,
    userId: string,
    permission: 'READ' | 'WRITE' | 'DELETE',
    expiresAt?: Date
  ): Promise<void> {
    try {
      await prisma.documentPermission.upsert({
        where: {
          documentId_userId: {
            documentId,
            userId,
          },
        },
        update: {
          permission,
          expiresAt,
          updatedAt: new Date(),
        },
        create: {
          documentId,
          userId,
          permission,
          expiresAt,
        },
      });

      logger.info('Document permission set', { documentId, userId, permission });
    } catch (error: unknown) {
      logger.error('Failed to set document permission', error);
      throw error;
    }
  }

  /**
   * Get document permissions
   */
  async getDocumentPermissions(
    organizationId: string,
    documentId: string
  ): Promise<DocumentPermission[]> {
    try {
      const permissions = await prisma.documentPermission.findMany({
        where: {
          document: {
            id: documentId,
            organizationId,
          },
        },
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

      return permissions.map(p => ({
        userId: p.userId,
        permission: p.permission as 'READ' | 'WRITE' | 'DELETE',
        expiresAt: p.expiresAt,
        user: p.user,
      }));
    } catch (error: unknown) {
      logger.error('Failed to get document permissions', error);
      throw error;
    }
  }

  /**
   * Update document permissions
   */
  async updateDocumentPermissions(
    organizationId: string,
    documentId: string,
    permissions: DocumentPermission[]
  ): Promise<void> {
    try {
      // Verify document exists and belongs to organization
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          organizationId,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Delete existing permissions
      await prisma.documentPermission.deleteMany({
        where: { documentId },
      });

      // Create new permissions
      if (permissions.length > 0) {
        await prisma.documentPermission.createMany({
          data: permissions.map(p => ({
            documentId,
            userId: p.userId,
            permission: p.permission,
            expiresAt: p.expiresAt,
          })),
        });
      }

      logger.info('Document permissions updated', { documentId, organizationId, count: permissions.length });
    } catch (error: unknown) {
      logger.error('Failed to update document permissions', error);
      throw error;
    }
  }

  /**
   * Share document with users
   */
  async shareDocument(
    organizationId: string,
    documentId: string,
    sharingRequest: DocumentSharingRequest
  ): Promise<void> {
    try {
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          organizationId,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Create permissions for all specified users
      const permissions = sharingRequest.userIds.map(userId => ({
        documentId,
        userId,
        permission: sharingRequest.permissions,
        expiresAt: sharingRequest.expiresAt,
      }));

      await prisma.documentPermission.createMany({
        data: permissions,
        skipDuplicates: true,
      });

      // Log sharing activity
      await prisma.documentActivity.createMany({
        data: sharingRequest.userIds.map(userId => ({
          documentId,
          userId,
          action: 'SHARED',
          details: {
            permission: sharingRequest.permissions,
            message: sharingRequest.message,
            expiresAt: sharingRequest.expiresAt,
          },
        })),
      });

      logger.info('Document shared', {
        documentId,
        organizationId,
        userCount: sharingRequest.userIds.length,
        permission: sharingRequest.permissions,
      });
    } catch (error: unknown) {
      logger.error('Failed to share document', error);
      throw error;
    }
  }

  /**
   * Get document access history
   */
  async getAccessHistory(
    organizationId: string,
    documentId: string,
    options: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: string;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<{
    accessHistory: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        action,
        dateRange,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {
        document: {
          id: documentId,
          organizationId,
        },
      };

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = action;
      }

      if (dateRange) {
        where.accessedAt = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      }

      const total = await prisma.documentAccess.count({ where });

      const accessHistory = await prisma.documentAccess.findMany({
        where,
        skip,
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
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        accessHistory,
        total,
        page,
        totalPages,
      };
    } catch (error: unknown) {
      logger.error('Failed to get access history', error);
      throw error;
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
}