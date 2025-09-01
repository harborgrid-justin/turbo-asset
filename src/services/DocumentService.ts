import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

export interface DocumentMetadata {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface DocumentVersion {
  id: string;
  version: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  changeNotes?: string;
  createdAt: Date;
}

export class DocumentService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory', error);
    }
  }

  /**
   * Get multer configuration for file uploads
   */
  getUploadMiddleware(): multer.Multer {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(6).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}-${randomId}${ext}`);
      },
    });

    return multer({
      storage,
      fileFilter: (req, file, cb) => {
        // Basic file type validation
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ];

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('File type not supported'));
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    });
  }

  /**
   * Upload a document
   */
  async uploadDocument(
    file: Express.Multer.File,
    uploadedById: string,
    metadata: DocumentMetadata = {}
  ): Promise<string> {
    try {
      const checksum = await this.calculateFileChecksum(file.path);

      const document = await prisma.document.create({
        data: {
          name: metadata.title || file.originalname,
          description: metadata.description,
          fileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          checksum,
          metadata: metadata as any,
          tags: metadata.tags || [],
          uploadedById,
        },
      });

      // Create initial version
      await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          version: '1.0',
          fileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          checksum,
        },
      });

      logger.info('Document uploaded', { 
        id: document.id, 
        name: document.name,
        uploadedById 
      });

      return document.id;
    } catch (error) {
      logger.error('Failed to upload document', error);
      throw error;
    }
  }

  /**
   * Upload a new version of an existing document
   */
  async uploadDocumentVersion(
    documentId: string,
    file: Express.Multer.File,
    changeNotes?: string
  ): Promise<string> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { versions: true },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      const checksum = await this.calculateFileChecksum(file.path);
      const nextVersion = this.calculateNextVersion(document.versions.map((v: any) => v.version));

      // Update document
      await prisma.document.update({
        where: { id: documentId },
        data: {
          fileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          checksum,
          version: nextVersion,
        },
      });

      // Create new version
      const version = await prisma.documentVersion.create({
        data: {
          documentId,
          version: nextVersion,
          fileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          checksum,
          changeNotes,
        },
      });

      logger.info('Document version uploaded', { 
        documentId, 
        version: nextVersion,
        changeNotes 
      });

      return version.id;
    } catch (error) {
      logger.error('Failed to upload document version', error);
      throw error;
    }
  }

  /**
   * Create a new document (alias for uploadDocument for controller compatibility)
   */
  async createDocument(data: {
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    entityType: string;
    entityId: string;
    isPublic?: boolean;
    expiresAt?: Date;
    customFields?: Record<string, any>;
    organizationId: string;
    file: any;
    uploadedBy: string;
  }): Promise<string> {
    return this.uploadDocument(data.file, {
      title: data.title,
      description: data.description,
      category: data.category,
      tags: data.tags,
      customFields: data.customFields,
    }, data.uploadedBy, data.organizationId, data.entityType, data.entityId);
  }

  /**
   * Create new version (alias for uploadVersion for controller compatibility)
   */
  async createVersion(
    organizationId: string,
    documentId: string,
    file: any,
    changeNotes?: string,
    uploadedBy?: string
  ): Promise<string> {
    return this.uploadVersion(documentId, file, changeNotes, uploadedBy || 'system');
  }

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
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return versions;
    } catch (error) {
      logger.error('Failed to get document versions', error);
      throw error;
    }
  }

  /**
   * Download document
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
          where: {
            documentId,
            version,
          },
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

      // Verify file exists
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        throw new Error('File not found on disk');
      }
    } catch (error) {
      logger.error('Failed to download document', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'DELETE');
      if (!hasPermission) {
        throw new Error('Access denied');
      }

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { versions: true },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Delete physical files
      try {
        await fs.unlink(document.filePath);
      } catch (error) {
        logger.warn('Failed to delete main document file', { 
          filePath: document.filePath, 
          error 
        });
      }

      for (const version of document.versions) {
        try {
          await fs.unlink(version.filePath);
        } catch (error) {
          logger.warn('Failed to delete version file', { 
            filePath: version.filePath, 
            error 
          });
        }
      }

      // Delete from database
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'DELETED',
          isActive: false,
        },
      });

      logger.info('Document deleted', { documentId, userId });
    } catch (error) {
      logger.error('Failed to delete document', error);
      throw error;
    }
  }

  /**
   * Set document permissions
   */
  async setDocumentPermission(
    documentId: string,
    entityType: 'user' | 'role' | 'department',
    entityId: string,
    permission: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN',
    userId: string
  ): Promise<void> {
    try {
      // Check admin permission
      const hasAdminPermission = await this.checkDocumentPermission(documentId, userId, 'ADMIN');
      if (!hasAdminPermission) {
        throw new Error('Admin access required');
      }

      // Remove existing permission if any
      await prisma.documentPermission.deleteMany({
        where: {
          documentId,
          entityType,
          entityId,
        },
      });

      // Create new permission
      await prisma.documentPermission.create({
        data: {
          documentId,
          entityType,
          entityId,
          permission,
        },
      });

      logger.info('Document permission set', { 
        documentId, 
        entityType, 
        entityId, 
        permission 
      });
    } catch (error) {
      logger.error('Failed to set document permission', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(
    query: string,
    userId: string,
    filters?: {
      mimeType?: string;
      tags?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<{ documents: any[]; total: number }> {
    try {
      const whereClause: any = {
        isActive: true,
        status: { not: 'DELETED' },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      };

      if (filters?.mimeType) {
        whereClause.mimeType = filters.mimeType;
      }

      if (filters?.tags && filters.tags.length > 0) {
        whereClause.tags = { hasSome: filters.tags };
      }

      if (filters?.dateFrom || filters?.dateTo) {
        whereClause.createdAt = {};
        if (filters.dateFrom) {
          whereClause.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          whereClause.createdAt.lte = filters.dateTo;
        }
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: whereClause,
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.document.count({
          where: whereClause,
        }),
      ]);

      // Filter by permissions
      const accessibleDocuments: any[] = [];
      for (const doc of documents) {
        if (await this.checkDocumentPermission(doc.id, userId, 'READ')) {
          accessibleDocuments.push(doc);
        }
      }

      return {
        documents: accessibleDocuments,
        total: accessibleDocuments.length,
      };
    } catch (error) {
      logger.error('Failed to search documents', error);
      throw error;
    }
  }

  /**
   * Check document permission
   */
  private async checkDocumentPermission(
    documentId: string,
    userId: string,
    requiredPermission: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN'
  ): Promise<boolean> {
    try {
      // Document owner has all permissions
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { uploadedById: true },
      });

      if (document?.uploadedById === userId) {
        return true;
      }

      // Check explicit permissions
      const permission = await prisma.documentPermission.findFirst({
        where: {
          documentId,
          OR: [
            { entityType: 'user', entityId: userId },
            // Add role and department checks here based on user
          ],
        },
      });

      if (!permission) {
        return false;
      }

      // Permission hierarchy: ADMIN > DELETE > WRITE > READ
      const permissionLevels = { READ: 1, WRITE: 2, DELETE: 3, ADMIN: 4 };
      const userLevel = permissionLevels[permission.permission as keyof typeof permissionLevels];
      const requiredLevel = permissionLevels[requiredPermission];

      return userLevel >= requiredLevel;
    } catch (error) {
      logger.error('Failed to check document permission', error);
      return false;
    }
  }

  /**
   * Calculate file checksum
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256');
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      logger.error('Failed to calculate file checksum', error);
      return '';
    }
  }

  /**
   * Calculate next version number
   */
  private calculateNextVersion(existingVersions: string[]): string {
    const versions = existingVersions
      .map(v => v.split('.').map(Number))
      .sort((a, b) => {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          const aVal = a[i] || 0;
          const bVal = b[i] || 0;
          if (aVal !== bVal) return bVal - aVal;
        }
        return 0;
      });

    if (versions.length === 0) {
      return '1.0';
    }

    const latest = versions[0];
    return `${latest[0]}.${latest[1] + 1}`;
  }

  /**
   * Get documents with filtering and pagination
   */
  async getDocuments(
    filters: {
      organizationId: string;
      category?: string;
      entityType?: string;
      entityId?: string;
      search?: string;
      tags?: string[];
    },
    options: {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
      includeVersions?: boolean;
    }
  ): Promise<{
    documents: any[];
    total: number;
    hasMore: boolean;
    page: number;
    totalPages: number;
  }> {
    try {
      const where: any = {
        organizationId: filters.organizationId,
        isDeleted: false,
      };

      if (filters.category) where.category = filters.category;
      if (filters.entityType) where.entityType = filters.entityType;
      if (filters.entityId) where.entityId = filters.entityId;
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          include: {
            versions: options.includeVersions ? {
              orderBy: { createdAt: 'desc' },
              take: 5,
            } : false,
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          skip: (options.page - 1) * options.limit,
          take: options.limit,
          orderBy: { [options.sortBy]: options.sortOrder },
        }),
        prisma.document.count({ where }),
      ]);

      const totalPages = Math.ceil(total / options.limit);

      return {
        documents,
        total,
        hasMore: options.page < totalPages,
        page: options.page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to get documents', error);
      throw error;
    }
  }

  /**
   * Get document with options
   */
  async getDocument(
    organizationId: string,
    documentId: string,
    options: {
      includeVersions?: boolean;
      includePermissions?: boolean;
    } = {}
  ): Promise<any> {
    try {
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          organizationId,
          isDeleted: false,
        },
        include: {
          versions: options.includeVersions ? {
            orderBy: { createdAt: 'desc' },
          } : false,
          permissions: options.includePermissions ? {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          } : false,
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return document;
    } catch (error) {
      logger.error('Failed to get document', error);
      throw error;
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    organizationId: string,
    documentId: string,
    updates: any
  ): Promise<void> {
    try {
      await prisma.document.updateMany({
        where: {
          id: documentId,
          organizationId,
          isDeleted: false,
        },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      logger.info('Document updated', { documentId, organizationId });
    } catch (error) {
      logger.error('Failed to update document', error);
      throw error;
    }
  }

  /**
   * Get download information for document
   */
  async getDownloadInfo(
    organizationId: string,
    documentId: string,
    versionId?: string
  ): Promise<any> {
    try {
      let version;
      if (versionId) {
        version = await prisma.documentVersion.findFirst({
          where: { id: versionId },
        });
      } else {
        version = await prisma.documentVersion.findFirst({
          where: {
            document: {
              id: documentId,
              organizationId,
              isDeleted: false,
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!version) return null;

      return {
        fileName: version.fileName,
        filePath: version.filePath,
        fileSize: version.fileSize,
        mimeType: version.mimeType,
      };
    } catch (error) {
      logger.error('Failed to get download info', error);
      throw error;
    }
  }

  /**
   * Get file stream
   */
  async getFileStream(filePath: string): Promise<any> {
    const fs = await import('fs');
    return fs.createReadStream(filePath);
  }

  /**
   * Log document access
   */
  async logAccess(
    organizationId: string,
    documentId: string,
    userId: string,
    action: string
  ): Promise<void> {
    try {
      await prisma.documentAccess.create({
        data: {
          documentId,
          userId,
          action,
          ipAddress: '0.0.0.0', // Would be populated from request
          userAgent: 'System', // Would be populated from request
        },
      });
    } catch (error) {
      logger.error('Failed to log document access', error);
      // Don't throw - logging access shouldn't fail the main operation
    }
  }

  /**
   * Generate document preview
   */
  async generatePreview(
    organizationId: string,
    documentId: string,
    versionId?: string
  ): Promise<any> {
    try {
      const downloadInfo = await this.getDownloadInfo(organizationId, documentId, versionId);
      if (!downloadInfo) return null;

      // This is a simplified preview generation
      // In production, you'd integrate with preview services for different file types
      const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf'];
      
      if (!supportedTypes.includes(downloadInfo.mimeType)) {
        return {
          type: 'unsupported',
          message: 'Preview not available for this file type',
        };
      }

      return {
        type: 'basic',
        fileName: downloadInfo.fileName,
        fileSize: downloadInfo.fileSize,
        mimeType: downloadInfo.mimeType,
        previewUrl: `/api/documents/${organizationId}/documents/${documentId}/download`,
      };
    } catch (error) {
      logger.error('Failed to generate preview', error);
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

        for (const version of versions) {
          try {
            await fs.unlink(version.filePath);
          } catch (error) {
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
    } catch (error) {
      logger.error('Failed to delete document', error);
      throw error;
    }
  }

  /**
   * Restore document from trash
   */
  async restoreDocument(organizationId: string, documentId: string): Promise<void> {
    try {
      await prisma.document.updateMany({
        where: {
          id: documentId,
          organizationId,
          isDeleted: true,
        },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      logger.info('Document restored', { documentId, organizationId });
    } catch (error) {
      logger.error('Failed to restore document', error);
      throw error;
    }
  }

  /**
   * Share document with users
   */
  async shareDocument(
    organizationId: string,
    documentId: string,
    userIds: string[],
    options: {
      permissions: string;
      expiresAt?: Date;
      message?: string;
      sharedBy: string;
    }
  ): Promise<any> {
    try {
      const shareResults = [];

      for (const userId of userIds) {
        try {
          const permission = await prisma.documentPermission.upsert({
            where: {
              documentId_userId: {
                documentId,
                userId,
              },
            },
            create: {
              documentId,
              userId,
              permissions: [options.permissions],
              grantedBy: options.sharedBy,
              expiresAt: options.expiresAt,
            },
            update: {
              permissions: [options.permissions],
              grantedBy: options.sharedBy,
              expiresAt: options.expiresAt,
              updatedAt: new Date(),
            },
          });

          shareResults.push({
            userId,
            success: true,
            permissionId: permission.id,
          });
        } catch (error) {
          shareResults.push({
            userId,
            success: false,
            error: error.message,
          });
        }
      }

      logger.info('Document shared', { documentId, userIds: userIds.length, organizationId });
      return shareResults;
    } catch (error) {
      logger.error('Failed to share document', error);
      throw error;
    }
  }

  /**
   * Get document permissions
   */
  async getDocumentPermissions(organizationId: string, documentId: string): Promise<any[]> {
    try {
      const permissions = await prisma.documentPermission.findMany({
        where: { documentId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          grantedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return permissions;
    } catch (error) {
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
    permissions: any[]
  ): Promise<void> {
    try {
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
            permissions: p.permissions,
            grantedBy: p.grantedBy,
            expiresAt: p.expiresAt,
          })),
        });
      }

      logger.info('Document permissions updated', { documentId, organizationId });
    } catch (error) {
      logger.error('Failed to update document permissions', error);
      throw error;
    }
  }

  /**
   * Compare document versions
   */
  async compareVersions(
    organizationId: string,
    documentId: string,
    version1Id: string,
    version2Id: string
  ): Promise<any> {
    try {
      const [v1, v2] = await Promise.all([
        prisma.documentVersion.findFirst({ where: { id: version1Id } }),
        prisma.documentVersion.findFirst({ where: { id: version2Id } }),
      ]);

      if (!v1 || !v2) {
        throw new Error('One or both versions not found');
      }

      // Basic comparison - in production, implement more sophisticated diff
      return {
        version1: {
          id: v1.id,
          version: v1.version,
          fileName: v1.fileName,
          fileSize: v1.fileSize,
          createdAt: v1.createdAt,
          changeNotes: v1.changeNotes,
        },
        version2: {
          id: v2.id,
          version: v2.version,
          fileName: v2.fileName,
          fileSize: v2.fileSize,
          createdAt: v2.createdAt,
          changeNotes: v2.changeNotes,
        },
        differences: {
          fileName: v1.fileName !== v2.fileName,
          fileSize: v1.fileSize !== v2.fileSize,
          sizeChange: v2.fileSize - v1.fileSize,
        },
      };
    } catch (error) {
      logger.error('Failed to compare versions', error);
      throw error;
    }
  }

  /**
   * Get document access history
   */
  async getAccessHistory(
    organizationId: string,
    documentId: string,
    options: { page: number; limit: number }
  ): Promise<any> {
    try {
      const [history, total] = await Promise.all([
        prisma.documentAccess.findMany({
          where: { documentId },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { accessedAt: 'desc' },
          skip: (options.page - 1) * options.limit,
          take: options.limit,
        }),
        prisma.documentAccess.count({ where: { documentId } }),
      ]);

      return {
        history,
        total,
        page: options.page,
        hasMore: options.page * options.limit < total,
      };
    } catch (error) {
      logger.error('Failed to get access history', error);
      throw error;
    }
  }

  /**
   * Get document analytics
   */
  async getDocumentAnalytics(
    organizationId: string,
    period: string,
    entityType?: string
  ): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const where: any = {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      };

      if (entityType) where.entityType = entityType;

      const [
        totalDocuments,
        totalViews,
        totalDownloads,
        categoryStats,
        recentUploads,
        topDocuments,
      ] = await Promise.all([
        prisma.document.count({ where }),
        prisma.documentAccess.count({
          where: {
            action: 'VIEW',
            accessedAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.documentAccess.count({
          where: {
            action: 'DOWNLOAD',
            accessedAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.document.groupBy({
          by: ['category'],
          where,
          _count: { id: true },
        }),
        prisma.document.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            uploadedBy: {
              select: { firstName: true, lastName: true },
            },
          },
        }),
        prisma.documentAccess.groupBy({
          by: ['documentId'],
          where: {
            accessedAt: { gte: startDate, lte: endDate },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        period,
        dateRange: { start: startDate, end: endDate },
        totals: {
          documents: totalDocuments,
          views: totalViews,
          downloads: totalDownloads,
        },
        categories: categoryStats.map(c => ({
          category: c.category || 'Uncategorized',
          count: c._count.id,
        })),
        recentUploads,
        topDocuments,
      };
    } catch (error) {
      logger.error('Failed to get document analytics', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(
    organizationId: string,
    query: string,
    filters: any,
    options: {
      page: number;
      limit: number;
      includeContent?: boolean;
    }
  ): Promise<any> {
    try {
      const where: any = {
        organizationId,
        isDeleted: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        ...filters,
      };

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            versions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          skip: (options.page - 1) * options.limit,
          take: options.limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.document.count({ where }),
      ]);

      return {
        documents,
        total,
        page: options.page,
        hasMore: options.page * options.limit < total,
        query,
      };
    } catch (error) {
      logger.error('Failed to search documents', error);
      throw error;
    }
  }

  /**
   * Bulk operations on documents
   */
  async bulkOperation(
    organizationId: string,
    operation: string,
    documentIds: string[],
    data?: any
  ): Promise<any> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    try {
      for (const documentId of documentIds) {
        try {
          switch (operation) {
            case 'delete':
              await this.deleteDocument(organizationId, documentId, data?.permanent || false);
              break;
            case 'restore':
              await this.restoreDocument(organizationId, documentId);
              break;
            case 'update':
              await this.updateDocument(organizationId, documentId, data);
              break;
            case 'share':
              await this.shareDocument(organizationId, documentId, data.userIds, data.options);
              break;
            default:
              throw new Error(`Unsupported operation: ${operation}`);
          }
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            documentId,
            error: error.message,
          });
        }
      }

      logger.info('Bulk operation completed', {
        operation,
        organizationId,
        success: results.success,
        failed: results.failed,
      });

      return results;
    } catch (error) {
      logger.error('Failed to perform bulk operation', error);
      throw error;
    }
  }
}