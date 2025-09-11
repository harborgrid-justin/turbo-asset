/**
 * Document Management Type Definitions
 * 
 * Comprehensive types for the document management domain
 */

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
  uploadedById: string;
}

export interface Document {
  id: string;
  name: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  category: string;
  tags: string[];
  customFields: Record<string, any>;
  status: DocumentStatus;
  version: string;
  isActive: boolean;
  isPublic: boolean;
  isDeleted: boolean;
  organizationId: string;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  expiresAt?: Date;
}

export interface DocumentPermission {
  userId: string;
  permission: 'READ' | 'WRITE' | 'DELETE';
  expiresAt?: Date;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface DocumentSharingRequest {
  userIds: string[];
  permissions: 'READ' | 'WRITE' | 'DELETE';
  expiresAt?: Date;
  message?: string;
}

export interface DocumentAccessLog {
  id: string;
  documentId: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  accessedAt: Date;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface DocumentSearchCriteria {
  query?: string;
  category?: string;
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  fileTypes?: string[];
  sizeRange?: { min: number; max: number };
  uploadedById?: string;
  status?: DocumentStatus;
}

export interface DocumentSearchResult {
  documents: Document[];
  total: number;
  page: number;
  totalPages: number;
  aggregations: {
    categories: { [key: string]: number };
    tags: { [key: string]: number };
    fileTypes: { [key: string]: number };
  };
}

export interface DocumentAnalytics {
  totalDocuments: number;
  totalStorage: number;
  averageFileSize: number;
  documentsByCategory: { [key: string]: number };
  documentsByType: { [key: string]: number };
  userActivity?: UserActivity[];
  recentActivity?: DocumentAccessLog[];
  storageBreakdown: {
    totalUsed: number;
    byCategory: { [key: string]: number };
    byUser: { [key: string]: number };
  };
}

export interface UserActivity {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  totalAccess: number;
  actions: { [key: string]: number };
  lastAccess: Date;
}

export interface DocumentDownloadInfo {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiresAt: Date;
}

export interface DocumentComparisonResult {
  document1: {
    id: string;
    name: string;
    version: string;
    size: number;
    lastModified: Date;
  };
  document2: {
    id: string;
    name: string;
    version: string;
    size: number;
    lastModified: Date;
  };
  differences: {
    metadata: boolean;
    content: boolean;
    size: boolean;
    checksum: boolean;
  };
  details: string;
}

export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED' | 'EXPIRED' | 'PENDING_REVIEW';

export type DocumentCategory = 
  | 'GENERAL'
  | 'CONTRACT'
  | 'FINANCIAL'
  | 'TECHNICAL'
  | 'LEGAL'
  | 'MARKETING'
  | 'HR'
  | 'COMPLIANCE'
  | 'PROJECT'
  | 'MAINTENANCE';

export type DocumentAction = 
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'VIEW'
  | 'EDIT'
  | 'DELETE'
  | 'RESTORE'
  | 'SHARE'
  | 'PREVIEW'
  | 'DOWNLOAD_INFO'
  | 'VERSION_CREATE'
  | 'PERMISSION_CHANGE';

export interface BulkDocumentOperation {
  action: 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'UPDATE_CATEGORY' | 'ADD_TAGS' | 'REMOVE_TAGS';
  documentIds: string[];
  parameters?: {
    category?: string;
    tags?: string[];
    permanent?: boolean;
  };
}

export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    documentId: string;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}