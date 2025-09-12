import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

/**
 * Document Retrieval Service - Handles document querying and access operations
 * 
 * This service manages:
 * - Document queries and searches
 * - Document access and permissions
 * - Document versions retrieval
 * - Download and preview operations
 */
export class DocumentRetrievalService {
  /**
   * Get document versions
   */
  async getDocumentVersions(organizationId: string, documentId: string): Promise<any[]> {
    try {
      const versions = await prisma.documentVersion.findMany({
        where: {
          document: {
            id: documentId,
            organizationId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          document: {
            select: {
              name: true,
              description: true,
            },
          },
        },
      });

      return versions.map(version => ({
        id: version.id,
        version: version.version,
        fileName: version.fileName,
        fileSize: version.fileSize,
        changeNotes: version.changeNotes,
        uploadedById: version.uploadedById,
        createdAt: version.createdAt,
        documentName: version.document.name,
        documentDescription: version.document.description,
      }));
    } catch (error: unknown) {
      logger.error('Failed to get document versions', error);
      throw error;
    }
  }

  /**
   * Download document by ID and version
   */
  async downloadDocument(documentId: string, userId: string, version?: string): Promise<string> {
    try {
      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'READ');
      if (!hasPermission) {
        throw new Error('Access denied');
      }

      let filePath: string;

      if (version) {
        const documentVersion = await prisma.documentVersion.findFirst({
          where: { documentId, version },
        });
        
        if (!documentVersion) {
          throw new Error('Document version not found');
        }
        
        filePath = documentVersion.filePath;
      } else {
        const document = await prisma.document.findUnique({
          where: { id: documentId },
        });
        
        if (!document) {
          throw new Error('Document not found');
        }
        
        filePath = document.filePath;
      }

      // Log access
      await this.logAccess(documentId, userId, 'DOWNLOAD');

      return filePath;
    } catch (error: unknown) {
      logger.error('Failed to download document', error);
      throw error;
    }
  }

  /**
   * Get documents list with filtering and pagination
   */
  async getDocuments(
    organizationId: string,
    filters: {
      category?: string;
      tags?: string[];
      status?: string;
      uploadedById?: string;
      dateRange?: { start: Date; end: Date };
      search?: string;
    } = {},
    pagination: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    documents: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        category,
        tags,
        status = 'ACTIVE',
        uploadedById,
        dateRange,
        search,
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pagination;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        organizationId,
        status,
        isActive: true,
      };

      if (category) {
        where.category = category;
      }

      if (tags && tags.length > 0) {
        where.tags = {
          hasSome: tags,
        };
      }

      if (uploadedById) {
        where.uploadedById = uploadedById;
      }

      if (dateRange) {
        where.createdAt = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { hasSome: [search] } },
        ];
      }

      // Get total count
      const total = await prisma.document.count({ where });

      // Get documents
      const documents = await prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          permissions: true,
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        documents,
        total,
        page,
        totalPages,
      };
    } catch (error: unknown) {
      logger.error('Failed to get documents', error);
      throw error;
    }
  }

  /**
   * Get single document by ID
   */
  async getDocument(organizationId: string, documentId: string): Promise<any> {
    try {
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          organizationId,
        },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
          },
          permissions: true,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      return document;
    } catch (error: unknown) {
      logger.error('Failed to get document', error);
      throw error;
    }
  }

  /**
   * Search documents with advanced filtering
   */
  async searchDocuments(
    organizationId: string,
    searchCriteria: {
      query?: string;
      category?: string;
      tags?: string[];
      dateRange?: { start: Date; end: Date };
      fileTypes?: string[];
      sizeRange?: { min: number; max: number };
    },
    pagination: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    documents: any[];
    total: number;
    page: number;
    totalPages: number;
    aggregations: {
      categories: { [key: string]: number };
      tags: { [key: string]: number };
      fileTypes: { [key: string]: number };
    };
  }> {
    try {
      const {
        query,
        category,
        tags,
        dateRange,
        fileTypes,
        sizeRange,
      } = searchCriteria;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pagination;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        organizationId,
        status: 'ACTIVE',
        isActive: true,
      };

      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { fileName: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      if (dateRange) {
        where.createdAt = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      }

      if (fileTypes && fileTypes.length > 0) {
        where.mimeType = { in: fileTypes };
      }

      if (sizeRange) {
        where.fileSize = {
          gte: sizeRange.min,
          lte: sizeRange.max,
        };
      }

      // Get total count
      const total = await prisma.document.count({ where });

      // Get documents
      const documents = await prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      // Get aggregations for faceted search
      const allDocuments = await prisma.document.findMany({
        where: { organizationId, status: 'ACTIVE', isActive: true },
        select: {
          category: true,
          tags: true,
          mimeType: true,
        },
      });

      const aggregations = {
        categories: {} as { [key: string]: number },
        tags: {} as { [key: string]: number },
        fileTypes: {} as { [key: string]: number },
      };

      allDocuments.forEach(doc => {
        // Count categories
        if (doc.category) {
          aggregations.categories[doc.category] = (aggregations.categories[doc.category] || 0) + 1;
        }

        // Count tags
        doc.tags.forEach(tag => {
          aggregations.tags[tag] = (aggregations.tags[tag] || 0) + 1;
        });

        // Count file types
        if (doc.mimeType) {
          aggregations.fileTypes[doc.mimeType] = (aggregations.fileTypes[doc.mimeType] || 0) + 1;
        }
      });

      const totalPages = Math.ceil(total / limit);

      return {
        documents,
        total,
        page,
        totalPages,
        aggregations,
      };
    } catch (error: unknown) {
      logger.error('Failed to search documents', error);
      throw error;
    }
  }

  /**
   * Get download information for a document
   */
  async getDownloadInfo(organizationId: string, documentId: string, userId: string): Promise<{
    downloadUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    expiresAt: Date;
  }> {
    try {
      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'READ');
      if (!hasPermission) {
        throw new Error('Access denied');
      }

      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          organizationId,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Generate secure download URL (in production, use signed URLs)
      const downloadUrl = `/api/documents/${documentId}/download`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Log access
      await this.logAccess(documentId, userId, 'DOWNLOAD_INFO');

      return {
        downloadUrl,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        expiresAt,
      };
    } catch (error: unknown) {
      logger.error('Failed to get download info', error);
      throw error;
    }
  }

  /**
   * Check document permission for user
   */
  private async checkDocumentPermission(
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
  private async logAccess(
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

  /**
   * Calculate file checksum for integrity verification
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    try {
      const fs = await import('fs/promises');
      const crypto = await import('crypto');
      const data = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error: unknown) {
      logger.error('Failed to calculate file checksum', { filePath, error });
      throw error;
    }
  }
}