import { Router, Request, Response } from 'express';
import { DocumentService } from '../../services/DocumentService';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import Joi from 'joi';
import multer from 'multer';

const router = Router();
const documentService = new DocumentService();

// Configure multer for file uploads
const upload = documentService.getUploadMiddleware();

// Validation schemas
const uploadDocumentSchema = Joi.object({
  title: Joi.string().required().min(1).max(255),
  description: Joi.string().allow('').max(1000),
  category: Joi.string().allow('').max(100),
  tags: Joi.array().items(Joi.string()),
  entityType: Joi.string().required(),
  entityId: Joi.string().required(),
  isPublic: Joi.boolean().default(false),
  expiresAt: Joi.date().allow(null),
  customFields: Joi.object().unknown(true),
});

const updateDocumentSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  description: Joi.string().allow('').max(1000),
  category: Joi.string().allow('').max(100),
  tags: Joi.array().items(Joi.string()),
  isPublic: Joi.boolean(),
  expiresAt: Joi.date().allow(null),
  customFields: Joi.object().unknown(true),
});

const shareDocumentSchema = Joi.object({
  userIds: Joi.array().items(Joi.string()).required(),
  permissions: Joi.string().valid('READ', 'WRITE', 'DELETE').default('READ'),
  expiresAt: Joi.date().allow(null),
  message: Joi.string().allow('').max(500),
});

export class DocumentController {
  /**
   * Get documents with filtering and pagination
   */
  async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        page = 1,
        limit = 20,
        category,
        entityType,
        entityId,
        search,
        tags,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeVersions = 'false'
      } = req.query;

      const filters = {
        organizationId,
        category: category as string,
        entityType: entityType as string,
        entityId: entityId as string,
        search: search as string,
        tags: tags ? (tags as string).split(',') : undefined,
      };

      const result = await documentService.getDocuments(filters, {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        includeVersions: includeVersions === 'true',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get documents', error);
      res.status(500).json({ error: 'Failed to get documents' });
    }
  }

  /**
   * Upload a new document
   */
  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { error, value } = uploadDocumentSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const documentId = await documentService.createDocument({
        ...value,
        organizationId,
        file: req.file,
        uploadedBy: req.user?.id || 'system',
      });

      res.status(201).json({
        success: true,
        data: { id: documentId },
        message: 'Document uploaded successfully',
      });
    } catch (error) {
      logger.error('Failed to upload document', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }

  /**
   * Upload a new version of an existing document
   */
  async uploadVersion(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { changeNotes } = req.body;

      const versionId = await documentService.createVersion(
        organizationId,
        documentId,
        req.file,
        changeNotes,
        req.user?.id || 'system'
      );

      res.status(201).json({
        success: true,
        data: { versionId },
        message: 'Document version uploaded successfully',
      });
    } catch (error) {
      logger.error('Failed to upload document version', error);
      res.status(500).json({ error: 'Failed to upload document version' });
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      const { includeVersions = 'false', includePermissions = 'false' } = req.query;

      const document = await documentService.getDocument(
        organizationId,
        documentId,
        {
          includeVersions: includeVersions === 'true',
          includePermissions: includePermissions === 'true',
        }
      );

      if (!document) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      logger.error('Failed to get document', error);
      res.status(500).json({ error: 'Failed to get document' });
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      
      const { error, value } = updateDocumentSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      await documentService.updateDocument(organizationId, documentId, value);

      res.json({
        success: true,
        message: 'Document updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update document', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }

  /**
   * Download document
   */
  async downloadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      const { versionId } = req.query;

      const downloadInfo = await documentService.getDownloadInfo(
        organizationId,
        documentId,
        versionId as string
      );

      if (!downloadInfo) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      // Set appropriate headers
      res.setHeader('Content-Type', downloadInfo.mimeType);
      res.setHeader('Content-Length', downloadInfo.fileSize);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);

      // Stream file
      const fileStream = await documentService.getFileStream(downloadInfo.filePath);
      fileStream.pipe(res);

      // Log download
      await documentService.logAccess(
        organizationId,
        documentId,
        req.user?.id || 'anonymous',
        'DOWNLOAD'
      );
    } catch (error) {
      logger.error('Failed to download document', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  }

  /**
   * Preview document (for supported file types)
   */
  async previewDocument(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      const { versionId } = req.query;

      const previewInfo = await documentService.generatePreview(
        organizationId,
        documentId,
        versionId as string
      );

      if (!previewInfo) {
        res.status(404).json({ error: 'Preview not available' });
        return;
      }

      res.json({
        success: true,
        data: previewInfo,
      });

      // Log access
      await documentService.logAccess(
        organizationId,
        documentId,
        req.user?.id || 'anonymous',
        'PREVIEW'
      );
    } catch (error) {
      logger.error('Failed to generate document preview', error);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      const { permanent = 'false' } = req.query;

      await documentService.deleteDocument(
        organizationId,
        documentId,
        permanent === 'true'
      );

      res.json({
        success: true,
        message: permanent === 'true' ? 'Document permanently deleted' : 'Document moved to trash',
      });
    } catch (error) {
      logger.error('Failed to delete document', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  /**
   * Restore document from trash
   */
  async restoreDocument(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;

      await documentService.restoreDocument(organizationId, documentId);

      res.json({
        success: true,
        message: 'Document restored successfully',
      });
    } catch (error) {
      logger.error('Failed to restore document', error);
      res.status(500).json({ error: 'Failed to restore document' });
    }
  }

  /**
   * Share document with users
   */
  async shareDocument(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      
      const { error, value } = shareDocumentSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const shareResults = await documentService.shareDocument(
        organizationId,
        documentId,
        value.userIds,
        {
          permissions: value.permissions,
          expiresAt: value.expiresAt,
          message: value.message,
          sharedBy: req.user?.id || 'system',
        }
      );

      res.json({
        success: true,
        data: shareResults,
        message: 'Document shared successfully',
      });
    } catch (error) {
      logger.error('Failed to share document', error);
      res.status(500).json({ error: 'Failed to share document' });
    }
  }

  /**
   * Get document permissions
   */
  async getDocumentPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;

      const permissions = await documentService.getDocumentPermissions(
        organizationId,
        documentId
      );

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      logger.error('Failed to get document permissions', error);
      res.status(500).json({ error: 'Failed to get document permissions' });
    }
  }

  /**
   * Update document permissions
   */
  async updateDocumentPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      const { permissions } = req.body;

      if (!permissions || !Array.isArray(permissions)) {
        res.status(400).json({ error: 'Permissions array is required' });
        return;
      }

      await documentService.updateDocumentPermissions(
        organizationId,
        documentId,
        permissions
      );

      res.json({
        success: true,
        message: 'Document permissions updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update document permissions', error);
      res.status(500).json({ error: 'Failed to update document permissions' });
    }
  }

  /**
   * Get document versions
   */
  async getDocumentVersions(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;

      const versions = await documentService.getDocumentVersions(
        organizationId,
        documentId
      );

      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      logger.error('Failed to get document versions', error);
      res.status(500).json({ error: 'Failed to get document versions' });
    }
  }

  /**
   * Compare document versions
   */
  async compareVersions(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      const { version1, version2 } = req.query;

      if (!version1 || !version2) {
        res.status(400).json({ error: 'Both version1 and version2 are required' });
        return;
      }

      const comparison = await documentService.compareVersions(
        organizationId,
        documentId,
        version1 as string,
        version2 as string
      );

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error('Failed to compare document versions', error);
      res.status(500).json({ error: 'Failed to compare versions' });
    }
  }

  /**
   * Get document access history
   */
  async getAccessHistory(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, documentId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const history = await documentService.getAccessHistory(
        organizationId,
        documentId,
        {
          page: Number(page),
          limit: Number(limit),
        }
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Failed to get document access history', error);
      res.status(500).json({ error: 'Failed to get access history' });
    }
  }

  /**
   * Generate document analytics
   */
  async getDocumentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { period = '30d', entityType } = req.query;

      const analytics = await documentService.getDocumentAnalytics(
        organizationId,
        period as string,
        entityType as string
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get document analytics', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        query,
        page = 1,
        limit = 20,
        filters = {},
        includeContent = 'false'
      } = req.body;

      if (!query || query.trim() === '') {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const results = await documentService.searchDocuments(
        organizationId,
        query,
        filters,
        {
          page: Number(page),
          limit: Number(limit),
          includeContent: includeContent === 'true',
        }
      );

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Failed to search documents', error);
      res.status(500).json({ error: 'Failed to search documents' });
    }
  }

  /**
   * Bulk operations on documents
   */
  async bulkOperation(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { operation, documentIds, data } = req.body;

      if (!operation || !documentIds || !Array.isArray(documentIds)) {
        res.status(400).json({ error: 'operation and documentIds array are required' });
        return;
      }

      const results = await documentService.bulkOperation(
        organizationId,
        operation,
        documentIds,
        data
      );

      res.json({
        success: true,
        data: results,
        message: `Bulk ${operation} completed`,
      });
    } catch (error) {
      logger.error('Failed to perform bulk operation', error);
      res.status(500).json({ error: 'Failed to perform bulk operation' });
    }
  }
}

const controller = new DocumentController();

// Document routes
router.get('/:organizationId/documents', controller.getDocuments.bind(controller));
router.post('/:organizationId/documents/upload', upload.single('file'), controller.uploadDocument.bind(controller));
router.get('/:organizationId/documents/:documentId', controller.getDocument.bind(controller));
router.put('/:organizationId/documents/:documentId', controller.updateDocument.bind(controller));
router.delete('/:organizationId/documents/:documentId', controller.deleteDocument.bind(controller));

// Document versions
router.post('/:organizationId/documents/:documentId/versions', upload.single('file'), controller.uploadVersion.bind(controller));
router.get('/:organizationId/documents/:documentId/versions', controller.getDocumentVersions.bind(controller));
router.get('/:organizationId/documents/:documentId/versions/compare', controller.compareVersions.bind(controller));

// Document access
router.get('/:organizationId/documents/:documentId/download', controller.downloadDocument.bind(controller));
router.get('/:organizationId/documents/:documentId/preview', controller.previewDocument.bind(controller));
router.post('/:organizationId/documents/:documentId/restore', controller.restoreDocument.bind(controller));

// Document sharing and permissions
router.post('/:organizationId/documents/:documentId/share', controller.shareDocument.bind(controller));
router.get('/:organizationId/documents/:documentId/permissions', controller.getDocumentPermissions.bind(controller));
router.put('/:organizationId/documents/:documentId/permissions', controller.updateDocumentPermissions.bind(controller));

// Document history and analytics
router.get('/:organizationId/documents/:documentId/access-history', controller.getAccessHistory.bind(controller));
router.get('/:organizationId/analytics/documents', controller.getDocumentAnalytics.bind(controller));

// Document search and bulk operations
router.post('/:organizationId/documents/search', controller.searchDocuments.bind(controller));
router.post('/:organizationId/documents/bulk', controller.bulkOperation.bind(controller));

export default router;