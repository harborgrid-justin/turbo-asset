import { prisma } from '../../../../config/database';
import { logger } from '../../../../config/logger';
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

/**
 * Document Upload Service - Handles document upload and versioning operations
 * 
 * This service manages:
 * - Document file uploads and storage
 * - Document versioning and version management
 * - File validation and checksum calculation
 * - Upload directory management
 */
export class DocumentUploadService {
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
    } catch (error: unknown) {
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, fileName);
      },
    });

    return multer({
      storage,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
      fileFilter: (req, file, cb) => {
        // Allow common document types
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/zip',
          'application/x-zip-compressed',
        ];

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'));
        }
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
          category: metadata.category || 'GENERAL',
          tags: metadata.tags || [],
          customFields: metadata.customFields || {},
          uploadedById,
          organizationId: uploadedById, // This should be passed separately in production
          isActive: true,
          status: 'ACTIVE',
          version: '1.0',
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
          changeNotes: 'Initial upload',
          uploadedById,
        },
      });

      logger.info('Document uploaded successfully', {
        documentId: document.id,
        fileName: file.originalname,
        uploadedById,
      });

      return document.id;
    } catch (error: unknown) {
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
      
      // Generate new version number
      const latestVersion = document.versions.reduce((max, version) => {
        const versionNum = parseFloat(version.version);
        return versionNum > max ? versionNum : max;
      }, 0);
      
      const newVersion = (latestVersion + 0.1).toFixed(1);

      // Create new version
      const version = await prisma.documentVersion.create({
        data: {
          documentId,
          version: newVersion,
          fileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          checksum,
          changeNotes: changeNotes || 'Version update',
          uploadedById: document.uploadedById,
        },
      });

      // Update document with latest version info
      await prisma.document.update({
        where: { id: documentId },
        data: {
          version: newVersion,
          fileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          checksum,
          updatedAt: new Date(),
        },
      });

      logger.info('Document version uploaded', {
        documentId,
        version: newVersion,
        fileName: file.originalname,
      });

      return version.id;
    } catch (error: unknown) {
      logger.error('Failed to upload document version', error);
      throw error;
    }
  }

  /**
   * Calculate file checksum for integrity verification
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    try {
      const data = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error: unknown) {
      logger.error('Failed to calculate file checksum', { filePath, error });
      throw error;
    }
  }

  /**
   * Create a new document (alias for uploadDocument for controller compatibility)
   */
  async createDocument(data: {
    file: Express.Multer.File;
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    uploadedBy: string;
    organizationId: string;
    entityType?: string;
    entityId?: string;
  }): Promise<string> {
    return this.uploadDocument(data.file, data.uploadedBy, {
      title: data.title,
      description: data.description,
      category: data.category,
      tags: data.tags,
      customFields: data.customFields,
    });
  }

  /**
   * Create new version (alias for uploadDocumentVersion for controller compatibility)
   */
  async createVersion(
    organizationId: string,
    documentId: string,
    file: any,
    changeNotes?: string,
    uploadedBy?: string
  ): Promise<string> {
    return this.uploadDocumentVersion(documentId, file, changeNotes);
  }
}