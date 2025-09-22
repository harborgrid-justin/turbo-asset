/**
 * Enterprise Type System - Comprehensive Type Definitions
 * Eliminates 'any' types and provides strong typing throughout the application
 */

// Base utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends Record<string, unknown>
    ? DeepReadonly<T[P]>
    : T[P];
};

// API Response Types
export interface StandardResponse<TData = unknown> {
  readonly success: boolean;
  readonly data?: TData;
  readonly message?: string;
  readonly timestamp: Date;
  readonly requestId?: string;
}

export interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly timestamp: Date;
  readonly requestId?: string;
}

export interface PaginatedResponse<TData> extends StandardResponse<TData> {
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
    readonly hasNext: boolean;
    readonly hasPrevious: boolean;
  };
}

// Business Entity Types
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly version: number;
}

export interface SoftDeletableEntity extends BaseEntity {
  readonly deletedAt?: Date;
  readonly deletedBy?: string;
  readonly isDeleted: boolean;
}

export interface AuditableEntity extends BaseEntity {
  readonly auditTrail: readonly AuditEntry[];
}

export interface AuditEntry {
  readonly id: string;
  readonly entityId: string;
  readonly action: AuditAction;
  readonly timestamp: Date;
  readonly userId: string;
  readonly changes: Record<string, { before: unknown; after: unknown }>;
  readonly metadata?: Record<string, unknown>;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'ARCHIVE' | 'RESTORE';

// User and Authentication Types
export interface User extends BaseEntity {
  readonly email: string;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
  readonly isActive: boolean;
  readonly lastLoginAt?: Date;
  readonly profileSettings: UserProfileSettings;
}

export interface Role extends BaseEntity {
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly Permission[];
  readonly isSystemRole: boolean;
}

export interface Permission extends BaseEntity {
  readonly name: string;
  readonly resource: string;
  readonly action: string;
  readonly conditions?: Record<string, unknown>;
}

export interface UserProfileSettings {
  readonly language: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly theme: 'light' | 'dark' | 'auto';
  readonly notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  readonly email: boolean;
  readonly sms: boolean;
  readonly inApp: boolean;
  readonly frequency: 'immediate' | 'daily' | 'weekly';
}

// Service Configuration Types
export interface ServiceConfiguration {
  readonly name: string;
  readonly version: string;
  readonly environment: 'development' | 'staging' | 'production';
  readonly features: Record<string, boolean>;
  readonly limits: Record<string, number>;
  readonly endpoints: readonly string[];
}

export interface DatabaseConfiguration {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly ssl: boolean;
  readonly poolSize: number;
  readonly timeout: number;
}

export interface CacheConfiguration {
  readonly provider: 'redis' | 'memory' | 'hybrid';
  readonly ttl: number;
  readonly maxSize: number;
  readonly compressionEnabled: boolean;
}

// Business Logic Types
export interface BusinessRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly condition: BusinessRuleCondition;
  readonly action: BusinessRuleAction;
  readonly priority: number;
  readonly isEnabled: boolean;
  readonly validFrom?: Date;
  readonly validTo?: Date;
}

export interface BusinessRuleCondition {
  readonly type: 'simple' | 'complex' | 'script';
  readonly expression: string;
  readonly parameters: Record<string, unknown>;
}

export interface BusinessRuleAction {
  readonly type: 'validation' | 'transformation' | 'notification' | 'workflow';
  readonly configuration: Record<string, unknown>;
}

// Workflow Types
export interface WorkflowDefinition extends BaseEntity {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly steps: readonly WorkflowStep[];
  readonly triggers: readonly WorkflowTrigger[];
  readonly isActive: boolean;
}

export interface WorkflowStep {
  readonly id: string;
  readonly name: string;
  readonly type: WorkflowStepType;
  readonly configuration: Record<string, unknown>;
  readonly conditions: readonly WorkflowCondition[];
  readonly nextSteps: readonly string[];
}

export type WorkflowStepType = 'manual' | 'automatic' | 'system' | 'approval' | 'notification';

export interface WorkflowTrigger {
  readonly id: string;
  readonly type: 'event' | 'schedule' | 'manual';
  readonly configuration: Record<string, unknown>;
}

export interface WorkflowCondition {
  readonly field: string;
  readonly operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  readonly value: unknown;
}

export interface WorkflowInstance extends BaseEntity {
  readonly workflowId: string;
  readonly status: WorkflowStatus;
  readonly currentStep: string;
  readonly variables: Record<string, unknown>;
  readonly history: readonly WorkflowStepExecution[];
}

export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowStepExecution {
  readonly stepId: string;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  readonly result?: Record<string, unknown>;
  readonly error?: string;
}

// Asset Management Types
export interface Asset extends AuditableEntity, SoftDeletableEntity {
  readonly assetNumber: string;
  readonly name: string;
  readonly description: string;
  readonly category: AssetCategory;
  readonly type: string;
  readonly status: AssetStatus;
  readonly location: Location;
  readonly owner: string;
  readonly custodian: string;
  readonly financials: AssetFinancials;
  readonly maintenance: AssetMaintenance;
  readonly specifications: Record<string, unknown>;
  readonly documents: readonly Document[];
}

export interface AssetCategory extends BaseEntity {
  readonly name: string;
  readonly code: string;
  readonly parentId?: string;
  readonly level: number;
  readonly path: string;
}

export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'retired' | 'disposed';

export interface Location extends BaseEntity {
  readonly name: string;
  readonly code: string;
  readonly type: LocationType;
  readonly parentId?: string;
  readonly coordinates?: GeoCoordinates;
  readonly address?: Address;
  readonly area?: number;
  readonly capacity?: number;
}

export type LocationType = 'building' | 'floor' | 'room' | 'zone' | 'space';

export interface GeoCoordinates {
  readonly latitude: number;
  readonly longitude: number;
  readonly elevation?: number;
}

export interface Address {
  readonly street1: string;
  readonly street2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
}

export interface AssetFinancials {
  readonly acquisitionCost: number;
  readonly currentValue: number;
  readonly depreciationMethod: DepreciationMethod;
  readonly depreciationRate: number;
  readonly usefulLife: number;
  readonly residualValue: number;
}

export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'sum_of_years' | 'units_of_production';

export interface AssetMaintenance {
  readonly maintenanceSchedule: readonly MaintenanceSchedule[];
  readonly workOrders: readonly WorkOrder[];
  readonly lastMaintenanceDate?: Date;
  readonly nextMaintenanceDate?: Date;
}

export interface MaintenanceSchedule extends BaseEntity {
  readonly assetId: string;
  readonly name: string;
  readonly type: MaintenanceType;
  readonly frequency: MaintenanceFrequency;
  readonly estimatedDuration: number;
  readonly cost: number;
  readonly instructions: string;
  readonly requiredSkills: readonly string[];
  readonly requiredParts: readonly RequiredPart[];
}

export type MaintenanceType = 'preventive' | 'predictive' | 'corrective' | 'emergency';

export interface MaintenanceFrequency {
  readonly type: 'days' | 'weeks' | 'months' | 'years' | 'hours' | 'cycles';
  readonly interval: number;
}

export interface RequiredPart {
  readonly partId: string;
  readonly quantity: number;
  readonly isOptional: boolean;
}

export interface WorkOrder extends AuditableEntity {
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly priority: WorkOrderPriority;
  readonly status: WorkOrderStatus;
  readonly type: MaintenanceType;
  readonly assetId: string;
  readonly requestedBy: string;
  readonly assignedTo?: string;
  readonly scheduledDate?: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly estimatedHours: number;
  readonly actualHours?: number;
  readonly estimatedCost: number;
  readonly actualCost?: number;
  readonly parts: readonly WorkOrderPart[];
  readonly labor: readonly WorkOrderLabor[];
  readonly notes: readonly WorkOrderNote[];
}

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical' | 'emergency';
export type WorkOrderStatus = 'draft' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

export interface WorkOrderPart {
  readonly partId: string;
  readonly quantity: number;
  readonly unitCost: number;
  readonly totalCost: number;
}

export interface WorkOrderLabor {
  readonly technicianId: string;
  readonly hours: number;
  readonly hourlyRate: number;
  readonly totalCost: number;
}

export interface WorkOrderNote {
  readonly id: string;
  readonly content: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

// Document Management Types
export interface Document extends AuditableEntity {
  readonly title: string;
  readonly description: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly category: DocumentCategory;
  readonly tags: readonly string[];
  readonly securityClassification: SecurityClassification;
  readonly retention: DocumentRetention;
  readonly versions: readonly DocumentVersion[];
  readonly permissions: readonly DocumentPermission[];
}

export interface DocumentCategory extends BaseEntity {
  readonly name: string;
  readonly code: string;
  readonly description: string;
  readonly parentId?: string;
  readonly retentionPolicy: DocumentRetention;
}

export type SecurityClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'secret';

export interface DocumentRetention {
  readonly period: number;
  readonly unit: 'days' | 'months' | 'years';
  readonly action: 'delete' | 'archive' | 'review';
}

export interface DocumentVersion {
  readonly version: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly checksum: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly comment?: string;
}

export interface DocumentPermission {
  readonly userId?: string;
  readonly roleId?: string;
  readonly permissions: readonly DocumentPermissionType[];
}

export type DocumentPermissionType = 'read' | 'write' | 'delete' | 'share' | 'approve';

// Event and Integration Types
export interface DomainEvent {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly data: Record<string, unknown>;
  readonly metadata: EventMetadata;
}

export interface EventMetadata {
  readonly userId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly source: string;
  readonly traceId?: string;
}

// Query and Filter Types
export interface QueryOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
  readonly filters?: Record<string, FilterCriteria>;
  readonly includes?: readonly string[];
}

export interface FilterCriteria {
  readonly operator: FilterOperator;
  readonly value: unknown;
}

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'greater_than' 
  | 'greater_than_or_equal' 
  | 'less_than' 
  | 'less_than_or_equal' 
  | 'in' 
  | 'not_in' 
  | 'contains' 
  | 'starts_with' 
  | 'ends_with';