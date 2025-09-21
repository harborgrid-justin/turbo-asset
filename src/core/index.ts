/**
 * Core Module - Barrel Export
 * Following Facebook/Meta and Google best practices for core module organization
 * 
 * This centralizes all core functionality including utilities, configuration, and middleware
 */

// Enhanced production-grade exports
export { HealthController } from '@/core/health/health-controller';
export { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler, 
  timeoutHandler,
  requestContextMiddleware,
  BaseError as CustomApiError,
  ValidationError as CustomValidationError,
  AuthenticationError as CustomAuthenticationError,
  NotFoundError as CustomNotFoundError,
  RateLimitError as CustomRateLimitError
} from '@/core/errors/error-handler';
export { logger, createPerformanceTimer, createRequestLogger } from '@/config/enterprise-logger';
export { 
  validateEnvironment, 
  getEnvironmentConfig, 
  isProduction, 
  isDevelopment 
} from '@/config/environment-validation';
export { applySecurityMiddleware } from '@/core/security/security-middleware';
export { databaseManager, db } from '@/core/database/connection-manager';
export { processManager, processHealthMiddleware } from '@/core/process/process-manager';
export { apiDocumentation, commonValidationSchemas } from '@/core/documentation/api-documentation';
export { businessLogicIntegration } from '@/services/business-logic-integration';

// Core utilities
export * from './utils';

// Core configuration
export * from './config';

// Core middleware
export * from './middleware';

// Re-export commonly used core functionality
export { prisma } from '../config/database';
export { config } from '../config';

// Enterprise patterns for dependency injection
export interface ServiceContainer {
  get<T>(token: string): T;
  register<T>(token: string, instance: T): void;
}

// Factory pattern for service creation
export interface ServiceFactory<T> {
  create(): T;
}

// Repository pattern interface for data access
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// Unit of work pattern for transactional operations
export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// Event-driven architecture interfaces
export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: Date;
  version: number;
  data: Record<string, unknown>;
}

export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface EventStore {
  append(events: DomainEvent[]): Promise<void>;
  getEvents(aggregateId: string): Promise<DomainEvent[]>;
}

// Command and Query Responsibility Segregation (CQRS) patterns
export interface Command {
  commandId: string;
  commandType: string;
  timestamp: Date;
  userId: string;
  data: Record<string, unknown>;
}

export interface CommandHandler<T extends Command> {
  handle(command: T): Promise<void>;
}

export interface Query {
  queryId: string;
  queryType: string;
  parameters: Record<string, unknown>;
}

export interface QueryHandler<T extends Query, R> {
  handle(query: T): Promise<R>;
}