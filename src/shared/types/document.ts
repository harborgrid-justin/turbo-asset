export interface Document {
  id: string;
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  version: string;
  isActive: boolean;
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  organizationId: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  category?: string;
  department?: string;
  confidentiality?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  expirationDate?: Date;
  reviewDate?: Date;
  customFields?: Record<string, any>;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  fileName: string;
  fileSize: number;
  storageUrl: string;
  changes: string;
  isActive: boolean;
  createdAt: Date;
  createdById: string;
}

export interface DocumentAccess {
  id: string;
  documentId: string;
  userId?: string;
  roleId?: string;
  departmentId?: string;
  permissions: DocumentPermission[];
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentPermission = 'READ' | 'WRITE' | 'DELETE' | 'SHARE' | 'VERSION' | 'ADMIN';

export interface DocumentSearchResult {
  document: Document;
  versions: DocumentVersion[];
  relevanceScore: number;
  matchedFields: string[];
  highlights: Record<string, string[]>;
}

export interface DocumentUploadOptions {
  category?: string;
  department?: string;
  confidentiality?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  metadata?: Partial<DocumentMetadata>;
  tags?: string[];
  expirationDate?: Date;
  reviewDate?: Date;
  autoVersioning?: boolean;
  ocrEnabled?: boolean;
}

export interface DocumentSearchOptions {
  query?: string;
  category?: string;
  department?: string;
  confidentiality?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  dateRange?: {
    from: Date;
    to: Date;
  };
  fileTypes?: string[];
  tags?: string[];
  authorId?: string;
  includeVersions?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'name' | 'createdAt' | 'updatedAt' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentBulkOperation {
  operation: 'MOVE' | 'COPY' | 'DELETE' | 'UPDATE_METADATA' | 'CHANGE_PERMISSIONS';
  documentIds: string[];
  targetCategory?: string;
  targetDepartment?: string;
  metadata?: Partial<DocumentMetadata>;
  permissions?: DocumentAccess[];
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  templateUrl: string;
  category: string;
  fields: DocumentTemplateField[];
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTemplateField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'file';
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  placeholder?: string;
  helpText?: string;
}

export interface DocumentWorkflow {
  id: string;
  documentId: string;
  workflowId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  submittedAt: Date;
  completedAt?: Date;
  reviewers: DocumentReviewer[];
  comments: DocumentComment[];
}

export interface DocumentReviewer {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED';
  reviewedAt?: Date;
  comments?: string;
  delegatedTo?: string;
}

export interface DocumentComment {
  id: string;
  userId: string;
  comment: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface DocumentAnalytics {
  documentId: string;
  views: number;
  downloads: number;
  shares: number;
  lastAccessed: Date;
  topViewers: Array<{
    userId: string;
    userName: string;
    viewCount: number;
  }>;
  accessLog: Array<{
    userId: string;
    action: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'UPDATE' | 'DELETE';
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
  }>;
}