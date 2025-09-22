/**
 * Document Management Sub-Service - Complete document lifecycle management
 * 
 * This sub-service handles all document management operations including:
 * - Document upload and versioning
 * - Document retrieval and search
 * - Document permissions and sharing
 * - Document analytics and reporting
 * - Document lifecycle operations
 * 
 * Part of the Document Management domain within Turbo Asset IWMS
 */

// Core document management services
export { DocumentUploadService } from './DocumentUploadService';
export { DocumentRetrievalService } from './DocumentRetrievalService';
export { DocumentManagementService } from './DocumentManagementService';
export { DocumentPermissionService } from './DocumentPermissionService';
export { DocumentAnalyticsService } from './DocumentAnalyticsService';

// Import services for internal use
import { DocumentUploadService } from './DocumentUploadService';
import { DocumentRetrievalService } from './DocumentRetrievalService';
import { DocumentManagementService } from './DocumentManagementService';
import { DocumentPermissionService } from './DocumentPermissionService';
import { DocumentAnalyticsService } from './DocumentAnalyticsService';

// Type definitions and constants
export * from './types/DocumentTypes';
export * from './constants/DocumentConstants';

/**
 * Main Document Management Service - Orchestrates all document operations
 * 
 * This class provides a unified interface to all document management capabilities,
 * coordinating between the various specialized services to provide comprehensive
 * document lifecycle management.
 */
export class DocumentLifecycleService {
  private readonly uploadService: DocumentUploadService;
  private readonly retrievalService: DocumentRetrievalService;
  private readonly managementService: DocumentManagementService;
  private readonly permissionService: DocumentPermissionService;
  private readonly analyticsService: DocumentAnalyticsService;

  constructor() {
    // Initialize all sub-services
    this.uploadService = new DocumentUploadService();
    this.retrievalService = new DocumentRetrievalService();
    this.managementService = new DocumentManagementService();
    this.permissionService = new DocumentPermissionService();
    this.analyticsService = new DocumentAnalyticsService();
  }

  // Expose service getters for direct access when needed
  get upload() { return this.uploadService; }
  get retrieval() { return this.retrievalService; }
  get management() { return this.managementService; }
  get permissions() { return this.permissionService; }
  get analytics() { return this.analyticsService; }

  // Convenience methods that delegate to appropriate sub-services
  
  /**
   * Upload a new document
   */
  async uploadDocument(file: Express.Multer.File, uploadedById: string, metadata: any = {}) {
    return await this.uploadService.uploadDocument(file, uploadedById, metadata);
  }

  /**
   * Get documents with filtering
   */
  async getDocuments(organizationId: string, filters: any = {}, pagination: any = {}) {
    return await this.retrievalService.getDocuments(organizationId, filters, pagination);
  }

  /**
   * Get document by ID
   */
  async getDocument(organizationId: string, documentId: string) {
    return await this.retrievalService.getDocument(organizationId, documentId);
  }

  /**
   * Update document
   */
  async updateDocument(organizationId: string, documentId: string, updates: any) {
    return await this.managementService.updateDocument(organizationId, documentId, updates);
  }

  /**
   * Delete document
   */
  async deleteDocument(organizationId: string, documentId: string, permanent: boolean = false) {
    await this.managementService.deleteDocument(organizationId, documentId, permanent);
  }

  /**
   * Share document with users
   */
  async shareDocument(organizationId: string, documentId: string, sharingRequest: any) {
    await this.permissionService.shareDocument(organizationId, documentId, sharingRequest);
  }

  /**
   * Get document analytics
   */
  async getDocumentAnalytics(organizationId: string, options: any = {}) {
    return await this.analyticsService.getDocumentAnalytics(organizationId, options);
  }

  /**
   * Search documents
   */
  async searchDocuments(organizationId: string, searchCriteria: any, pagination: any = {}) {
    return await this.retrievalService.searchDocuments(organizationId, searchCriteria, pagination);
  }

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware() {
    return this.uploadService.getUploadMiddleware();
  }

  /**
   * Check document permissions
   */
  async checkDocumentPermission(documentId: string, userId: string, action: 'READ' | 'WRITE' | 'DELETE') {
    return await this.permissionService.checkDocumentPermission(documentId, userId, action);
  }
}