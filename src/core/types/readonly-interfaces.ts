/**
 * Enterprise-grade readonly interfaces for immutable data structures
 * Ensures data integrity and prevents accidental mutations in business logic
 */

import { 
  UserId, 
  AssetId, 
  WorkOrderId, 
  ProjectId, 
  SpaceId,
  MonetaryAmount,
  CurrencyCode,
  IsoDateString,
  EmailAddress,
  Percentage
} from './branded-types';

/**
 * Base readonly entity interface
 */
export interface ReadonlyEntity {
  readonly id: string;
  readonly createdAt: IsoDateString;
  readonly updatedAt: IsoDateString;
  readonly version: number;
}

/**
 * Asset domain readonly interfaces
 */
export interface ReadonlyAsset extends ReadonlyEntity {
  readonly id: AssetId;
  readonly name: string;
  readonly description?: string;
  readonly assetType: 'equipment' | 'furniture' | 'vehicle' | 'building' | 'infrastructure';
  readonly status: 'active' | 'inactive' | 'maintenance' | 'disposed';
  readonly serialNumber?: string;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly purchaseDate?: IsoDateString;
  readonly purchasePrice?: ReadonlyMoney;
  readonly currentValue?: ReadonlyMoney;
  readonly depreciationRate?: Percentage;
  readonly locationId?: SpaceId;
  readonly ownerId: UserId;
  readonly tags: readonly string[];
  readonly customFields: ReadonlyRecord<string, unknown>;
  readonly maintenanceHistory: readonly ReadonlyMaintenanceRecord[];
}

export interface ReadonlyAssetMetrics {
  readonly totalAssets: number;
  readonly activeAssets: number;
  readonly inactiveAssets: number;
  readonly maintenanceAssets: number;
  readonly disposedAssets: number;
  readonly totalValue: ReadonlyMoney;
  readonly averageAge: number; // in days
  readonly utilizationRate: Percentage;
  readonly maintenanceFrequency: number; // per year
}

/**
 * Work Order domain readonly interfaces
 */
export interface ReadonlyWorkOrder extends ReadonlyEntity {
  readonly id: WorkOrderId;
  readonly title: string;
  readonly description: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly type: 'maintenance' | 'repair' | 'installation' | 'inspection' | 'emergency';
  readonly status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  readonly assetId?: AssetId;
  readonly locationId: SpaceId;
  readonly assignedTo?: UserId;
  readonly requestedBy: UserId;
  readonly scheduledDate?: IsoDateString;
  readonly completedDate?: IsoDateString;
  readonly estimatedHours?: number;
  readonly actualHours?: number;
  readonly estimatedCost?: ReadonlyMoney;
  readonly actualCost?: ReadonlyMoney;
  readonly materials: readonly ReadonlyMaterial[];
  readonly attachments: readonly ReadonlyAttachment[];
  readonly resolution?: string;
  readonly feedback?: ReadonlyWorkOrderFeedback;
}

export interface ReadonlyWorkOrderMetrics {
  readonly totalWorkOrders: number;
  readonly openWorkOrders: number;
  readonly inProgressWorkOrders: number;
  readonly completedWorkOrders: number;
  readonly averageCompletionTime: number; // in hours
  readonly completionRate: Percentage;
  readonly customerSatisfactionScore: number; // 0-10
  readonly costVariance: Percentage;
  readonly scheduleVariance: Percentage;
}

/**
 * Space Management readonly interfaces
 */
export interface ReadonlySpace extends ReadonlyEntity {
  readonly id: SpaceId;
  readonly name: string;
  readonly description?: string;
  readonly spaceType: 'office' | 'conference' | 'common' | 'storage' | 'utility' | 'outdoor';
  readonly floor: string;
  readonly building: string;
  readonly area: number; // square meters
  readonly capacity?: number;
  readonly status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  readonly amenities: readonly string[];
  readonly accessibility: ReadonlyAccessibilityFeatures;
  readonly coordinates?: ReadonlyCoordinates;
  readonly occupancy: ReadonlyOccupancyInfo;
  readonly utilization: ReadonlyUtilizationStats;
}

export interface ReadonlySpaceMetrics {
  readonly totalSpaces: number;
  readonly availableSpaces: number;
  readonly occupiedSpaces: number;
  readonly maintenanceSpaces: number;
  readonly reservedSpaces: number;
  readonly totalArea: number;
  readonly occupiedArea: number;
  readonly utilizationRate: Percentage;
  readonly averageOccupancyDuration: number; // in days
  readonly spaceEfficiency: Percentage;
}

/**
 * Financial domain readonly interfaces
 */
export interface ReadonlyMoney {
  readonly amount: MonetaryAmount;
  readonly currency: CurrencyCode;
  readonly exchangeRate?: number;
  readonly baseCurrency?: CurrencyCode;
  readonly timestamp: IsoDateString;
}

export interface ReadonlyBudget extends ReadonlyEntity {
  readonly name: string;
  readonly description?: string;
  readonly fiscalYear: number;
  readonly totalAmount: ReadonlyMoney;
  readonly allocatedAmount: ReadonlyMoney;
  readonly spentAmount: ReadonlyMoney;
  readonly remainingAmount: ReadonlyMoney;
  readonly categories: readonly ReadonlyBudgetCategory[];
  readonly approvedBy: UserId;
  readonly status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'closed';
  readonly variance: Percentage;
}

export interface ReadonlyBudgetCategory {
  readonly name: string;
  readonly allocatedAmount: ReadonlyMoney;
  readonly spentAmount: ReadonlyMoney;
  readonly remainingAmount: ReadonlyMoney;
  readonly variance: Percentage;
  readonly transactions: readonly ReadonlyTransaction[];
}

export interface ReadonlyTransaction extends ReadonlyEntity {
  readonly description: string;
  readonly amount: ReadonlyMoney;
  readonly transactionDate: IsoDateString;
  readonly category: string;
  readonly vendor?: string;
  readonly reference?: string;
  readonly approvedBy?: UserId;
  readonly budgetId?: string;
  readonly workOrderId?: WorkOrderId;
  readonly projectId?: ProjectId;
  readonly receiptUrl?: string;
  readonly taxAmount?: ReadonlyMoney;
  readonly status: 'pending' | 'approved' | 'rejected' | 'paid';
}

/**
 * User and Organization readonly interfaces
 */
export interface ReadonlyUser extends ReadonlyEntity {
  readonly id: UserId;
  readonly email: EmailAddress;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly phone?: string;
  readonly role: 'admin' | 'manager' | 'user' | 'technician' | 'viewer';
  readonly department?: string;
  readonly title?: string;
  readonly managerId?: UserId;
  readonly isActive: boolean;
  readonly lastLoginAt?: IsoDateString;
  readonly permissions: readonly string[];
  readonly preferences: ReadonlyUserPreferences;
  readonly profile: ReadonlyUserProfile;
}

export interface ReadonlyUserPreferences {
  readonly language: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly currency: CurrencyCode;
  readonly notifications: ReadonlyNotificationSettings;
  readonly dashboard: ReadonlyDashboardSettings;
}

export interface ReadonlyOrganization extends ReadonlyEntity {
  readonly name: string;
  readonly description?: string;
  readonly industry: string;
  readonly size: 'small' | 'medium' | 'large' | 'enterprise';
  readonly headquarters: ReadonlyAddress;
  readonly website?: string;
  readonly contactEmail: EmailAddress;
  readonly settings: ReadonlyOrganizationSettings;
  readonly subscription: ReadonlySubscription;
  readonly usage: ReadonlyUsageMetrics;
}

/**
 * Supporting readonly interfaces
 */
export interface ReadonlyMaintenanceRecord {
  readonly id: string;
  readonly workOrderId: WorkOrderId;
  readonly performedBy: UserId;
  readonly performedAt: IsoDateString;
  readonly description: string;
  readonly cost: ReadonlyMoney;
  readonly partsUsed: readonly ReadonlyMaterial[];
  readonly timeSpent: number; // hours
  readonly nextMaintenanceDue?: IsoDateString;
}

export interface ReadonlyMaterial {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly quantity: number;
  readonly unitOfMeasure: string;
  readonly unitCost?: ReadonlyMoney;
  readonly totalCost?: ReadonlyMoney;
  readonly supplier?: string;
  readonly partNumber?: string;
}

export interface ReadonlyAttachment {
  readonly id: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number; // bytes
  readonly url: string;
  readonly uploadedBy: UserId;
  readonly uploadedAt: IsoDateString;
  readonly description?: string;
}

export interface ReadonlyWorkOrderFeedback {
  readonly rating: number; // 1-5
  readonly comments?: string;
  readonly submittedBy: UserId;
  readonly submittedAt: IsoDateString;
  readonly areas: ReadonlyRecord<string, number>; // area -> rating
}

export interface ReadonlyAccessibilityFeatures {
  readonly wheelchairAccessible: boolean;
  readonly hearingLoop: boolean;
  readonly brailleSignage: boolean;
  readonly adjustableHeight: boolean;
  readonly proximitySensors: boolean;
}

export interface ReadonlyCoordinates {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly floor?: string;
  readonly building?: string;
}

export interface ReadonlyOccupancyInfo {
  readonly currentOccupant?: UserId;
  readonly startDate?: IsoDateString;
  readonly endDate?: IsoDateString;
  readonly occupancyType: 'permanent' | 'temporary' | 'shared' | 'hoteling';
  readonly bookings: readonly ReadonlySpaceBooking[];
}

export interface ReadonlySpaceBooking {
  readonly id: string;
  readonly bookedBy: UserId;
  readonly startTime: IsoDateString;
  readonly endTime: IsoDateString;
  readonly purpose: string;
  readonly attendees: number;
  readonly status: 'active' | 'completed' | 'cancelled';
}

export interface ReadonlyUtilizationStats {
  readonly period: 'day' | 'week' | 'month' | 'year';
  readonly utilizationRate: Percentage;
  readonly averageOccupancy: number; // hours per day
  readonly peakHours: readonly number[];
  readonly totalHours: number;
  readonly occupiedHours: number;
}

export interface ReadonlyUserProfile {
  readonly avatar?: string;
  readonly bio?: string;
  readonly skills: readonly string[];
  readonly certifications: readonly ReadonlyCertification[];
  readonly location?: ReadonlyAddress;
  readonly socialLinks: ReadonlyRecord<string, string>;
}

export interface ReadonlyCertification {
  readonly name: string;
  readonly issuingOrganization: string;
  readonly issueDate: IsoDateString;
  readonly expiryDate?: IsoDateString;
  readonly credentialId?: string;
  readonly credentialUrl?: string;
}

export interface ReadonlyAddress {
  readonly street1: string;
  readonly street2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
  readonly coordinates?: ReadonlyCoordinates;
}

export interface ReadonlyNotificationSettings {
  readonly email: boolean;
  readonly sms: boolean;
  readonly push: boolean;
  readonly categories: ReadonlyRecord<string, boolean>;
}

export interface ReadonlyDashboardSettings {
  readonly layout: 'grid' | 'list' | 'card';
  readonly widgets: readonly ReadonlyDashboardWidget[];
  readonly refreshInterval: number; // seconds
  readonly theme: 'light' | 'dark' | 'auto';
}

export interface ReadonlyDashboardWidget {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly position: ReadonlyWidgetPosition;
  readonly settings: ReadonlyRecord<string, unknown>;
  readonly dataSource?: string;
}

export interface ReadonlyWidgetPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ReadonlyOrganizationSettings {
  readonly timezone: string;
  readonly currency: CurrencyCode;
  readonly dateFormat: string;
  readonly fiscalYearStart: string; // MM-DD format
  readonly workingHours: ReadonlyWorkingHours;
  readonly holidays: readonly ReadonlyHoliday[];
  readonly branding: ReadonlyBrandingSettings;
  readonly features: ReadonlyFeatureFlags;
}

export interface ReadonlyWorkingHours {
  readonly monday: ReadonlyDaySchedule;
  readonly tuesday: ReadonlyDaySchedule;
  readonly wednesday: ReadonlyDaySchedule;
  readonly thursday: ReadonlyDaySchedule;
  readonly friday: ReadonlyDaySchedule;
  readonly saturday: ReadonlyDaySchedule;
  readonly sunday: ReadonlyDaySchedule;
}

export interface ReadonlyDaySchedule {
  readonly isWorkingDay: boolean;
  readonly startTime?: string; // HH:MM format
  readonly endTime?: string; // HH:MM format
  readonly breaks: readonly ReadonlyTimeSlot[];
}

export interface ReadonlyTimeSlot {
  readonly startTime: string; // HH:MM format
  readonly endTime: string; // HH:MM format
  readonly description?: string;
}

export interface ReadonlyHoliday {
  readonly name: string;
  readonly date: string; // YYYY-MM-DD format
  readonly isRecurring: boolean;
  readonly type: 'national' | 'regional' | 'company';
}

export interface ReadonlyBrandingSettings {
  readonly logo?: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly accentColor: string;
  readonly font: string;
  readonly customCSS?: string;
}

export interface ReadonlyFeatureFlags {
  readonly advancedAnalytics: boolean;
  readonly mobileApp: boolean;
  readonly apiAccess: boolean;
  readonly customFields: boolean;
  readonly workflowAutomation: boolean;
  readonly integrations: boolean;
  readonly auditLogging: boolean;
}

export interface ReadonlySubscription {
  readonly plan: 'basic' | 'professional' | 'enterprise';
  readonly status: 'active' | 'cancelled' | 'suspended' | 'trial';
  readonly startDate: IsoDateString;
  readonly endDate?: IsoDateString;
  readonly billing: ReadonlyBillingInfo;
  readonly limits: ReadonlySubscriptionLimits;
  readonly features: readonly string[];
}

export interface ReadonlyBillingInfo {
  readonly interval: 'monthly' | 'yearly';
  readonly amount: ReadonlyMoney;
  readonly nextBillingDate: IsoDateString;
  readonly paymentMethod: 'credit_card' | 'bank_transfer' | 'invoice';
  readonly invoices: readonly ReadonlyInvoice[];
}

export interface ReadonlyInvoice {
  readonly id: string;
  readonly number: string;
  readonly issueDate: IsoDateString;
  readonly dueDate: IsoDateString;
  readonly amount: ReadonlyMoney;
  readonly status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  readonly pdfUrl?: string;
}

export interface ReadonlySubscriptionLimits {
  readonly users: number;
  readonly assets: number;
  readonly workOrders: number;
  readonly spaces: number;
  readonly storage: number; // GB
  readonly apiRequests: number; // per month
}

export interface ReadonlyUsageMetrics {
  readonly period: 'current_month' | 'last_month' | 'year_to_date';
  readonly activeUsers: number;
  readonly totalAssets: number;
  readonly workOrdersCreated: number;
  readonly workOrdersCompleted: number;
  readonly storageUsed: number; // GB
  readonly apiRequestsUsed: number;
  readonly lastUpdated: IsoDateString;
}

/**
 * Utility type for deeply readonly objects
 */
export type ReadonlyRecord<K extends keyof any, T> = {
  readonly [P in K]: T;
};

/**
 * Utility type for deep readonly transformation
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends Array<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T[P] extends Record<any, any>
    ? DeepReadonly<T[P]>
    : T[P];
};

/**
 * Type guard utilities for readonly interfaces
 */
export const ReadonlyTypeGuards = {
  isReadonlyAsset: (obj: unknown): obj is ReadonlyAsset => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'name' in obj &&
      'assetType' in obj &&
      'status' in obj
    );
  },

  isReadonlyWorkOrder: (obj: unknown): obj is ReadonlyWorkOrder => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'title' in obj &&
      'priority' in obj &&
      'type' in obj &&
      'status' in obj
    );
  },

  isReadonlySpace: (obj: unknown): obj is ReadonlySpace => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'name' in obj &&
      'spaceType' in obj &&
      'area' in obj
    );
  },

  isReadonlyUser: (obj: unknown): obj is ReadonlyUser => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'email' in obj &&
      'firstName' in obj &&
      'lastName' in obj &&
      'role' in obj
    );
  }
};

/**
 * Builder pattern for creating readonly objects safely
 */
export class ReadonlyObjectBuilder<T> {
  private data: Partial<T> = {};

  set<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value;
    return this;
  }

  build(): DeepReadonly<T> {
    return Object.freeze(this.data) as DeepReadonly<T>;
  }

  static create<T>(): ReadonlyObjectBuilder<T> {
    return new ReadonlyObjectBuilder<T>();
  }
}