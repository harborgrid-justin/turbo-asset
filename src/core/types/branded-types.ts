/**
 * Enterprise-grade branded types for type safety
 * Prevents accidental type confusion and provides semantic meaning
 */

/**
 * Brand type utility for creating nominal types
 */
declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

/**
 * Entity identifier types
 */
export type UserId = Brand<string, 'UserId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type AssetId = Brand<string, 'AssetId'>;
export type WorkOrderId = Brand<string, 'WorkOrderId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type SpaceId = Brand<string, 'SpaceId'>;
export type LocationId = Brand<string, 'LocationId'>;
export type VendorId = Brand<string, 'VendorId'>;
export type ContractId = Brand<string, 'ContractId'>;
export type BudgetId = Brand<string, 'BudgetId'>;

/**
 * Financial types
 */
export type MonetaryAmount = Brand<number, 'MonetaryAmount'>;
export type TaxAmount = Brand<number, 'TaxAmount'>;
export type Percentage = Brand<number, 'Percentage'>;
export type CurrencyCode = Brand<string, 'CurrencyCode'>;

/**
 * Measurement types
 */
export type SquareMeters = Brand<number, 'SquareMeters'>;
export type SquareFeet = Brand<number, 'SquareFeet'>;
export type Capacity = Brand<number, 'Capacity'>;
export type Duration = Brand<number, 'Duration'>;

/**
 * Time and date types
 */
export type Timestamp = Brand<number, 'Timestamp'>;
export type IsoDateString = Brand<string, 'IsoDateString'>;
export type FiscalYear = Brand<number, 'FiscalYear'>;

/**
 * Security types
 */
export type HashedPassword = Brand<string, 'HashedPassword'>;
export type JwtToken = Brand<string, 'JwtToken'>;
export type ApiKey = Brand<string, 'ApiKey'>;
export type EncryptedData = Brand<string, 'EncryptedData'>;

/**
 * Business logic types
 */
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'active' | 'inactive' | 'pending' | 'archived';
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

/**
 * Semantic string types
 */
export type EmailAddress = Brand<string, 'EmailAddress'>;
export type PhoneNumber = Brand<string, 'PhoneNumber'>;
export type Url = Brand<string, 'Url'>;
export type IpAddress = Brand<string, 'IpAddress'>;
export type MacAddress = Brand<string, 'MacAddress'>;

/**
 * File and document types
 */
export type FilePath = Brand<string, 'FilePath'>;
export type MimeType = Brand<string, 'MimeType'>;
export type FileSize = Brand<number, 'FileSize'>;
export type DocumentVersion = Brand<string, 'DocumentVersion'>;

/**
 * Type guard utilities for branded types
 */
export const createBrandedType = {
  /**
   * Create a UserId from a validated string
   */
  userId: (value: string): UserId => {
    if (!value || typeof value !== 'string') {
      throw new Error('Invalid user ID');
    }
    return value as UserId;
  },

  /**
   * Create a MonetaryAmount from a validated number
   */
  monetaryAmount: (value: number): MonetaryAmount => {
    if (typeof value !== 'number' || value < 0 || !isFinite(value)) {
      throw new Error('Invalid monetary amount');
    }
    return value as MonetaryAmount;
  },

  /**
   * Create a Percentage from a validated number (0-100)
   */
  percentage: (value: number): Percentage => {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    return value as Percentage;
  },

  /**
   * Create an EmailAddress from a validated string
   */
  emailAddress: (value: string): EmailAddress => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value || !emailRegex.test(value)) {
      throw new Error('Invalid email address');
    }
    return value as EmailAddress;
  },

  /**
   * Create a CurrencyCode from a validated string
   */
  currencyCode: (value: string): CurrencyCode => {
    if (!value || value.length !== 3 || !/^[A-Z]{3}$/.test(value)) {
      throw new Error('Currency code must be a 3-letter uppercase string');
    }
    return value as CurrencyCode;
  }
};

/**
 * Common entity interfaces with branded types
 */
export interface BaseEntity {
  readonly id: UserId | AssetId | WorkOrderId | ProjectId | SpaceId;
  readonly createdAt: IsoDateString;
  readonly updatedAt: IsoDateString;
  readonly createdBy: UserId;
  readonly updatedBy: UserId;
}

/**
 * Export utility to convert regular types to branded types safely
 */
export const toBranded = createBrandedType;