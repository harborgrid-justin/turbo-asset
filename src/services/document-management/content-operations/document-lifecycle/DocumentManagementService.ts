import { prisma } from '../../config/database';
import { logger } from '@/config/logger';

/**
 * Document Management Service - Handles document updates and lifecycle operations
 * 
 * This service manages:
 * - Document updates and modifications
 * - Document deletion (soft/hard)
 * - Document restoration
 * - Document status management
 */
export class DocumentManagementService {
  /**
   * Update document metadata
   */
  async updateDocument(
    organizationId: string,
    documentId: string,
    updates: {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      customFields?: Record<string, any>;
    }
  ): Promise<any> {
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

      const updatedDocument = await prisma.document.update({
        where: { id: documentId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      logger.info('Document updated', { documentId, organizationId });
      return updatedDocument;
    } catch (error: unknown) {
      logger.error('Failed to update document', error);
      throw error;
    }
  }

  /**
   * Delete or soft delete document
   */
  async deleteDocument(
    organizationId: string,
    documentId: string,
    permanent: boolean = false
  ): Promise<void> {
    try {
      if (permanent) {
        // Delete file versions from storage
        const versions = await prisma.documentVersion.findMany({
          where: {
            document: {
              id: documentId,
              organizationId,
            },
          },
        });

        const fs = await import('fs/promises');
        for (const version of versions) {
          try {
            await fs.unlink(version.filePath);
          } catch (error: unknown) {
            logger.warn('Failed to delete file', { filePath: version.filePath, error });
          }
        }

        // Delete from database
        await prisma.document.deleteMany({
          where: {
            id: documentId,
            organizationId,
          },
        });

        logger.info('Document permanently deleted', { documentId, organizationId });
      } else {
        // Soft delete
        await prisma.document.updateMany({
          where: {
            id: documentId,
            organizationId,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });

        logger.info('Document soft deleted', { documentId, organizationId });
      }
    } catch (error: unknown) {
      logger.error('Failed to delete document', error);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted document
   */
  async restoreDocument(organizationId: string, documentId: string): Promise<void> {
    try {
      const result = await prisma.document.updateMany({
        where: {
          id: documentId,
          organizationId,
          isDeleted: true,
        },
        data: {
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new Error('Document not found or not deleted');
      }

      logger.info('Document restored', { documentId, organizationId });
    } catch (error: unknown) {
      logger.error('Failed to restore document', error);
      throw error;
    }
  }

  /**
   * Get file stream for document
   */
  async getFileStream(filePath: string): Promise<any> {
    const fs = await import('fs');
    return fs.createReadStream(filePath);
  }

  /**
   * Generate document preview (for supported file types)
   */
  async generatePreview(
    documentId: string,
    options: {
      width?: number;
      height?: number;
      page?: number;
    } = {}
  ): Promise<string | null> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // For now, return placeholder preview URL
      // In production, implement actual preview generation
      const previewUrl = `/api/documents/${documentId}/preview`;

      logger.info('Document preview generated', { documentId });
      return previewUrl;
    } catch (error: unknown) {
      logger.error('Failed to generate document preview', error);
      return null;
    }
  }
}