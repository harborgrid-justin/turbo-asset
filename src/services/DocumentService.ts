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
   * Get document by ID
   */
  async getDocument(documentId: string, userId: string): Promise<any> {
    try {
      // Check permissions
      const hasPermission = await this.checkDocumentPermission(documentId, userId, 'READ');
      if (!hasPermission) {
        throw new Error('Access denied');
      }

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
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
    } catch (error) {
      logger.error('Failed to get document', error);
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
      const accessibleDocuments = [];
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
}