/**
 * Types - Central Type Definitions
 * Following Facebook/Meta and Google TypeScript best practices
 * 
 * This provides a centralized export for all type definitions used across the application.
 * Organized by domain to maintain clear boundaries and prevent circular dependencies.
 */

// Core application types
export * from './express';

// Domain-specific types
export * from './document';
export * from './workflow';
export * from './integration';
export * from './notification';

// Custom field types
export * from './customField';
export * from './customFields';

// Advanced features
export * from './machinelearning';
export * from './universal-data-standard';

// Re-export commonly used Node.js and library types for convenience
export type { Request, Response, NextFunction } from 'express';
export type { Logger } from 'winston';

// Common utility types following Google TypeScript style guide
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// API response patterns following Oracle enterprise standards
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: ResponseMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: string;
  timestamp?: string;
}

export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  version: string;
  pagination?: PaginationMetadata;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Database entity base interface following domain-driven design
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number;
}

// Audit trail interface for enterprise compliance
export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
  deletedAt?: Date;
  deletedBy?: string;
}

// Organization context for multi-tenant architecture
export interface OrganizationContext {
  organizationId: string;
  tenantId?: string;
  permissions: string[];
  roles: string[];
}

// User context for authentication and authorization
export interface UserContext {
  userId: string;
  email: string;
  name: string;
  organization: OrganizationContext;
  preferences?: Record<string, unknown>;
}