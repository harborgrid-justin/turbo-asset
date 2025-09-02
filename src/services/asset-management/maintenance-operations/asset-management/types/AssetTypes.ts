/**
 * Asset Types - Comprehensive type definitions for asset management
 * Part of the Asset Management domain within Turbo Asset IWMS
 * Contains all interfaces, enums, and type definitions for asset operations
 */

export interface AssetMaintenanceData {
  assetId?: string;
  assetTag: string;
  assetName: string;
  description?: string;
  category: string;
  subcategory?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location: string;
  building?: string;
  floor?: string;
  room?: string;
  status: AssetStatus;
  condition: AssetCondition;
  criticality: AssetCriticality;
  purchasePrice?: number;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  depreciationMethod?: DepreciationMethod;
  usefulLife?: number;
  salvageValue?: number;
  currentValue?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceInterval?: number; // days
  organizationId: string;
  createdBy: string;
  skipMaintenanceCloning?: boolean; // Used for cloning operations
}

export interface AssetSearchFilters {
  category?: string;
  status?: AssetStatus | AssetStatus[];
  condition?: AssetCondition | AssetCondition[];
  criticality?: AssetCriticality | AssetCriticality[];
  location?: string;
  building?: string;
  manufacturer?: string;
  model?: string;
  maintenanceDue?: boolean;
  warrantyExpiring?: boolean;
  purchaseDateRange?: {
    start: Date;
    end: Date;
  };
  valueRange?: {
    min: number;
    max: number;
  };
  organizationId: string;
}

export interface AssetUpdateData {
  assetName?: string;
  description?: string;
  location?: string;
  building?: string;
  floor?: string;
  room?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  criticality?: AssetCriticality;
  currentValue?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceInterval?: number;
  updatedBy: string;
  updateReason?: string;
}

export interface AssetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AssetAuditRecord {
  id: string;
  assetId: string;
  action: AssetAuditAction;
  userId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface AssetDepreciationRecord {
  id: string;
  assetId: string;
  depreciationDate: Date;
  bookValue: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  remainingValue: number;
  method: DepreciationMethod;
  calculatedBy: string;
}

export interface AssetWorkOrderRequest {
  assetId: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  description: string;
  scheduledDate?: Date;
  estimatedDuration?: number; // minutes
  assignedTo?: string;
  requiredSkills?: string[];
  requiredParts?: AssetPartRequirement[];
}

export interface AssetPartRequirement {
  partNumber: string;
  partName: string;
  quantity: number;
  estimatedCost?: number;
  isStocked?: boolean;
  leadTimedays?: number;
}

export interface AssetMaintenanceSchedule {
  id: string;
  assetId: string;
  interval: number; // days
  nextDue: Date;
  type: MaintenanceType;
  priority: WorkOrderPriority;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface AssetNotificationSettings {
  notifyFacilitiesTeam: boolean;
  notifyMaintenanceTeam: boolean;
  notifyFinanceTeam: boolean;
  customRecipients?: string[];
  escalationRules?: NotificationEscalationRule[];
}

export interface NotificationEscalationRule {
  triggerAfterHours: number;
  escalateTo: string[];
  escalationMessage?: string;
}

export interface BulkAssetOperationResult {
  successful: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
    assetTag?: string;
    identifier?: string;
  }>;
  warnings: Array<{
    index: number;
    warning: string;
    assetTag?: string;
  }>;
}

export interface AssetMetrics {
  totalAssets: number;
  assetsByStatus: Record<AssetStatus, number>;
  assetsByCondition: Record<AssetCondition, number>;
  assetsByCriticality: Record<AssetCriticality, number>;
  totalValue: number;
  averageAge: number; // days
  maintenanceDueCount: number;
  warrantyExpiringCount: number;
  depreciationRate: number;
  utilizationRate?: number;
}

// Enums for asset management

export enum AssetStatus {
  OPERATIONAL = 'OPERATIONAL',
  DOWN = 'DOWN',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
  DISPOSED = 'DISPOSED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  IN_TRANSIT = 'IN_TRANSIT',
  STORAGE = 'STORAGE',
  TESTING = 'TESTING'
}

export enum AssetCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  CRITICAL = 'CRITICAL',
  NEW = 'NEW',
  REFURBISHED = 'REFURBISHED',
  UNKNOWN = 'UNKNOWN'
}

export enum AssetCriticality {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE',
  DOUBLE_DECLINING_BALANCE = 'DOUBLE_DECLINING_BALANCE',
  SUM_OF_YEARS_DIGITS = 'SUM_OF_YEARS_DIGITS',
  UNITS_OF_PRODUCTION = 'UNITS_OF_PRODUCTION'
}

export enum AssetAuditAction {
  ASSET_CREATED = 'ASSET_CREATED',
  ASSET_UPDATED = 'ASSET_UPDATED',
  ASSET_DELETED = 'ASSET_DELETED',
  ASSET_MOVED = 'ASSET_MOVED',
  ASSET_TRANSFERRED = 'ASSET_TRANSFERRED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  CONDITION_CHANGED = 'CONDITION_CHANGED',
  MAINTENANCE_SCHEDULED = 'MAINTENANCE_SCHEDULED',
  MAINTENANCE_COMPLETED = 'MAINTENANCE_COMPLETED',
  DEPRECIATION_CALCULATED = 'DEPRECIATION_CALCULATED',
  VALUE_ADJUSTED = 'VALUE_ADJUSTED',
  ASSET_CLONED = 'ASSET_CLONED'
}

export enum WorkOrderType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  EMERGENCY = 'EMERGENCY',
  INSPECTION = 'INSPECTION',
  CALIBRATION = 'CALIBRATION',
  UPGRADE = 'UPGRADE',
  INSTALLATION = 'INSTALLATION',
  DECOMMISSION = 'DECOMMISSION'
}

export enum WorkOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY'
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  PREDICTIVE = 'PREDICTIVE',
  CONDITION_BASED = 'CONDITION_BASED',
  TIME_BASED = 'TIME_BASED',
  USAGE_BASED = 'USAGE_BASED'
}

// Complex types for advanced operations

export type AssetSortField = 
  | 'assetName' 
  | 'assetTag' 
  | 'category' 
  | 'location' 
  | 'status' 
  | 'condition' 
  | 'criticality' 
  | 'purchaseDate' 
  | 'currentValue' 
  | 'nextMaintenanceDate';

export type SortOrder = 'asc' | 'desc';

export interface AssetSearchResult {
  assets: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  metrics?: AssetMetrics;
}

export interface AssetLocationHierarchy {
  building?: string;
  floor?: string;
  room?: string;
  zone?: string;
  coordinates?: {
    x: number;
    y: number;
    z?: number;
  };
}

export interface AssetFinancialData {
  purchasePrice?: number;
  currentValue?: number;
  accumulatedDepreciation?: number;
  monthlyDepreciation?: number;
  totalMaintenanceCost?: number;
  averageMaintenanceCost?: number;
  roi?: number;
  paybackPeriod?: number;
}

export interface AssetPerformanceMetrics {
  uptimePercentage: number;
  mtbf?: number; // Mean Time Between Failures
  mttr?: number; // Mean Time To Repair
  availabilityPercentage: number;
  reliabilityScore: number;
  maintenanceFrequency: number;
  costPerOperatingHour?: number;
  energyEfficiencyRating?: string;
}

// Integration interfaces

export interface AssetImportMapping {
  sourceField: string;
  targetField: keyof AssetMaintenanceData;
  transformation?: (value: any) => any;
  required: boolean;
  validation?: (value: any) => boolean;
}

export interface AssetExportOptions {
  format: 'CSV' | 'XLSX' | 'PDF' | 'JSON';
  includeImages: boolean;
  includeMaintenanceHistory: boolean;
  includeFinancialData: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: AssetSearchFilters;
}

// Error types

export class AssetValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'AssetValidationError';
  }
}

export class AssetNotFoundError extends Error {
  constructor(public assetId: string) {
    super(`Asset with ID ${assetId} not found`);
    this.name = 'AssetNotFoundError';
  }
}

export class DuplicateAssetError extends Error {
  constructor(public field: string, public value: string) {
    super(`Asset with ${field} '${value}' already exists`);
    this.name = 'DuplicateAssetError';
  }
}