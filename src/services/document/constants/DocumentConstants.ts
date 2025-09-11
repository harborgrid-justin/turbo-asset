/**
 * Document Management Constants
 * 
 * Configuration constants for the document management domain
 */

export const DOCUMENT_CONSTANTS = {
  // File size limits (in bytes)
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_PREVIEW_SIZE: 50 * 1024 * 1024, // 50MB
  
  // Supported file types
  ALLOWED_MIME_TYPES: [
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
  ],

  // Document categories
  CATEGORIES: [
    'GENERAL',
    'CONTRACT',
    'FINANCIAL',
    'TECHNICAL',
    'LEGAL',
    'MARKETING',
    'HR',
    'COMPLIANCE',
    'PROJECT',
    'MAINTENANCE',
  ] as const,

  // Document statuses
  STATUSES: [
    'ACTIVE',
    'ARCHIVED',
    'DELETED',
    'EXPIRED',
    'PENDING_REVIEW',
  ] as const,

  // Permission types
  PERMISSIONS: [
    'READ',
    'WRITE',
    'DELETE',
  ] as const,

  // Actions for audit logging
  ACTIONS: [
    'UPLOAD',
    'DOWNLOAD',
    'VIEW',
    'EDIT',
    'DELETE',
    'RESTORE',
    'SHARE',
    'PREVIEW',
    'DOWNLOAD_INFO',
    'VERSION_CREATE',
    'PERMISSION_CHANGE',
  ] as const,

  // Default pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // File extensions mapping
  FILE_EXTENSIONS: {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
  } as const,
} as const;