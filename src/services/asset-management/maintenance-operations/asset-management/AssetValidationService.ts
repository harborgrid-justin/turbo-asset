import { PrismaClient } from '@prisma/client';
import { logger } from '@/config/logger';
import { 
  AssetMaintenanceData, 
  AssetValidationResult,
  AssetValidationError,
  DuplicateAssetError,
  AssetStatus,
  AssetCondition,
  AssetCriticality,
  DepreciationMethod
} from './types/AssetTypes';

const prisma = new PrismaClient();

/**
 * AssetValidationService - Comprehensive validation for asset data and business rules
 * Handles data integrity, business rule validation, and duplicate detection
 * Part of the Asset Management domain within Turbo Asset IWMS
 */
export class AssetValidationService {
  
  /**
   * Validate complete asset data against all business rules and constraints
   */
  async validateAssetData(assetData: AssetMaintenanceData): Promise<AssetValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required field validation
      this.validateRequiredFields(assetData, errors);

      // Format and structure validation
      this.validateFieldFormats(assetData, errors);

      // Business rule validation
      this.validateBusinessRules(assetData, errors, warnings);

      // Enum value validation
      this.validateEnumValues(assetData, errors);

      // Financial data validation
      this.validateFinancialData(assetData, errors, warnings);

      // Date validation
      this.validateDates(assetData, errors, warnings);

      // Cross-field validation
      this.validateCrossFieldLogic(assetData, errors, warnings);

      // Organizational validation
      await this.validateOrganizationalConstraints(assetData, errors);

      // Location validation
      await this.validateLocationHierarchy(assetData, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error: unknown) {
      logger.error('Asset validation failed', {
        assetTag: assetData.assetTag,
        error: (error as Error).message
      });
      
      return {
        isValid: false,
        errors: [`Validation process failed: ${(error as Error).message}`],
        warnings: []
      };
    }
  }

  /**
   * Check for duplicate assets by tag and serial number within organization
   */
  async checkAssetDuplication(
    assetTag: string, 
    serialNumber: string | undefined, 
    organizationId: string,
    excludeAssetId?: string
  ): Promise<void> {
    // Check for duplicate asset tag
    const existingByTag = await prisma.maintenanceAsset.findFirst({
      where: {
        assetTag,
        organizationId,
        id: excludeAssetId ? { not: excludeAssetId } : undefined,
      },
      select: { id: true, assetTag: true }
    });

    if (existingByTag) {
      throw new DuplicateAssetError('assetTag', assetTag);
    }

    // Check for duplicate serial number if provided
    if (serialNumber) {
      const existingBySerial = await prisma.maintenanceAsset.findFirst({
        where: {
          serialNumber,
          organizationId,
          id: excludeAssetId ? { not: excludeAssetId } : undefined,
        },
        select: { id: true, serialNumber: true }
      });

      if (existingBySerial) {
        throw new DuplicateAssetError('serialNumber', serialNumber);
      }
    }
  }

  /**
   * Validate asset tag format and uniqueness requirements
   */
  async validateAssetTag(assetTag: string, organizationId: string): Promise<string[]> {
    const errors: string[] = [];

    // Format validation
    if (!assetTag || assetTag.trim().length === 0) {
      errors.push('Asset tag is required');
      return errors;
    }

    if (assetTag.length < 3 || assetTag.length > 50) {
      errors.push('Asset tag must be between 3 and 50 characters');
    }

    // Check for invalid characters
    const validTagPattern = /^[A-Z0-9\-_]+$/i;
    if (!validTagPattern.test(assetTag)) {
      errors.push('Asset tag can only contain letters, numbers, hyphens, and underscores');
    }

    // Check organizational tag format rules
    try {
      const orgSettings = await this.getOrganizationAssetSettings(organizationId);
      if (orgSettings.requiresPrefix && !assetTag.startsWith(orgSettings.requiredPrefix)) {
        errors.push(`Asset tag must start with organizational prefix: ${orgSettings.requiredPrefix}`);
      }

      if (orgSettings.tagPattern && !new RegExp(orgSettings.tagPattern).test(assetTag)) {
        errors.push('Asset tag does not match organizational format requirements');
      }
    } catch (error: unknown) {
      // If we can't get org settings, continue with basic validation
      logger.warn('Could not retrieve organizational asset settings', { organizationId });
    }

    return errors;
  }

  /**
   * Validate serial number format and constraints
   */
  validateSerialNumber(serialNumber: string | undefined): string[] {
    const errors: string[] = [];

    if (serialNumber) {
      if (serialNumber.length > 100) {
        errors.push('Serial number cannot exceed 100 characters');
      }

      // Basic format validation - alphanumeric with some special characters
      const validSerialPattern = /^[A-Z0-9\-_\.\/]+$/i;
      if (!validSerialPattern.test(serialNumber)) {
        errors.push('Serial number contains invalid characters');
      }
    }

    return errors;
  }

  /**
   * Validate asset location hierarchy and consistency
   */
  async validateLocationHierarchy(
    assetData: AssetMaintenanceData, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    try {
      // Location is required
      if (!assetData.location || assetData.location.trim().length === 0) {
        errors.push('Asset location is required');
        return;
      }

      // If building is specified, validate it exists
      if (assetData.building) {
        const buildingExists = await this.validateBuildingExists(
          assetData.building, 
          assetData.organizationId
        );
        if (!buildingExists) {
          warnings.push('Specified building may not exist in the system');
        }

        // If floor is specified with building, validate hierarchy
        if (assetData.floor) {
          const floorExists = await this.validateFloorExists(
            assetData.building,
            assetData.floor,
            assetData.organizationId
          );
          if (!floorExists) {
            warnings.push('Specified floor may not exist in the building');
          }

          // If room is specified, validate it exists on the floor
          if (assetData.room) {
            const roomExists = await this.validateRoomExists(
              assetData.building,
              assetData.floor,
              assetData.room,
              assetData.organizationId
            );
            if (!roomExists) {
              warnings.push('Specified room may not exist on the floor');
            }
          }
        } else if (assetData.room) {
          warnings.push('Room specified without floor - location hierarchy incomplete');
        }
      } else if (assetData.floor || assetData.room) {
        warnings.push('Floor/room specified without building - location hierarchy incomplete');
      }

      // Validate location format
      if (assetData.location.length > 200) {
        errors.push('Location description cannot exceed 200 characters');
      }

    } catch (error: unknown) {
      logger.warn('Location validation failed', { 
        assetTag: assetData.assetTag, 
        error: (error as Error).message 
      });
      warnings.push('Could not fully validate location hierarchy');
    }
  }

  /**
   * Validate required fields are present and not empty
   */
  private validateRequiredFields(assetData: AssetMaintenanceData, errors: string[]): void {
    const requiredFields = [
      { field: 'assetTag', value: assetData.assetTag },
      { field: 'assetName', value: assetData.assetName },
      { field: 'category', value: assetData.category },
      { field: 'location', value: assetData.location },
      { field: 'status', value: assetData.status },
      { field: 'condition', value: assetData.condition },
      { field: 'criticality', value: assetData.criticality },
      { field: 'organizationId', value: assetData.organizationId },
      { field: 'createdBy', value: assetData.createdBy },
    ];

    requiredFields.forEach(({ field, value }) => {
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        errors.push(`${field} is required`);
      }
    });
  }

  /**
   * Validate field formats and data types
   */
  private validateFieldFormats(assetData: AssetMaintenanceData, errors: string[]): void {
    // Name validation
    if (assetData.assetName && assetData.assetName.length > 200) {
      errors.push('Asset name cannot exceed 200 characters');
    }

    // Description validation
    if (assetData.description && assetData.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }

    // Category validation
    if (assetData.category && assetData.category.length > 100) {
      errors.push('Category cannot exceed 100 characters');
    }

    // Manufacturer and model validation
    if (assetData.manufacturer && assetData.manufacturer.length > 100) {
      errors.push('Manufacturer cannot exceed 100 characters');
    }

    if (assetData.model && assetData.model.length > 100) {
      errors.push('Model cannot exceed 100 characters');
    }

    // Numeric field validation
    if (assetData.purchasePrice !== undefined && 
        (assetData.purchasePrice < 0 || assetData.purchasePrice > 99999999.99)) {
      errors.push('Purchase price must be between 0 and 99,999,999.99');
    }

    if (assetData.usefulLife !== undefined && 
        (assetData.usefulLife < 1 || assetData.usefulLife > 100)) {
      errors.push('Useful life must be between 1 and 100 years');
    }

    if (assetData.maintenanceInterval !== undefined && 
        (assetData.maintenanceInterval < 1 || assetData.maintenanceInterval > 3650)) {
      errors.push('Maintenance interval must be between 1 and 3650 days');
    }
  }

  /**
   * Validate business rules and logical constraints
   */
  private validateBusinessRules(
    assetData: AssetMaintenanceData, 
    errors: string[], 
    warnings: string[]
  ): void {
    // Salvage value should be less than purchase price
    if (assetData.purchasePrice && assetData.salvageValue) {
      if (assetData.salvageValue >= assetData.purchasePrice) {
        errors.push('Salvage value must be less than purchase price');
      }
    }

    // Current value validation
    if (assetData.currentValue && assetData.purchasePrice) {
      if (assetData.currentValue > assetData.purchasePrice) {
        warnings.push('Current value exceeds purchase price - possible appreciation');
      }
    }

    // Maintenance interval logic
    if (assetData.criticality === AssetCriticality.CRITICAL && 
        assetData.maintenanceInterval && 
        assetData.maintenanceInterval > 90) {
      warnings.push('Critical assets typically require maintenance intervals of 90 days or less');
    }

    // Status and condition logic
    if (assetData.status === AssetStatus.DOWN && 
        assetData.condition === AssetCondition.EXCELLENT) {
      warnings.push('Asset marked as DOWN but condition is EXCELLENT - verify status');
    }

    if (assetData.status === AssetStatus.OPERATIONAL && 
        assetData.condition === AssetCondition.CRITICAL) {
      errors.push('Asset cannot be OPERATIONAL with CRITICAL condition');
    }
  }

  /**
   * Validate enum values against allowed options
   */
  private validateEnumValues(assetData: AssetMaintenanceData, errors: string[]): void {
    if (assetData.status && !Object.values(AssetStatus).includes(assetData.status as AssetStatus)) {
      errors.push(`Invalid status: ${assetData.status}`);
    }

    if (assetData.condition && !Object.values(AssetCondition).includes(assetData.condition as AssetCondition)) {
      errors.push(`Invalid condition: ${assetData.condition}`);
    }

    if (assetData.criticality && !Object.values(AssetCriticality).includes(assetData.criticality as AssetCriticality)) {
      errors.push(`Invalid criticality: ${assetData.criticality}`);
    }

    if ((assetData.depreciationMethod != null) && 
        !Object.values(DepreciationMethod).includes(assetData.depreciationMethod as DepreciationMethod)) {
      errors.push(`Invalid depreciation method: ${assetData.depreciationMethod}`);
    }
  }

  /**
   * Validate financial data consistency and reasonableness
   */
  private validateFinancialData(
    assetData: AssetMaintenanceData, 
    errors: string[], 
    warnings: string[]
  ): void {
    // Purchase price and date consistency
    if (assetData.purchasePrice && !assetData.purchaseDate) {
      warnings.push('Purchase price provided without purchase date');
    }

    // Depreciation method requires purchase price and useful life
    if ((assetData.depreciationMethod != null) && assetData.depreciationMethod !== DepreciationMethod.STRAIGHT_LINE) {
      if (!assetData.purchasePrice) {
        errors.push('Purchase price required for depreciation calculations');
      }
      if (!assetData.usefulLife) {
        errors.push('Useful life required for depreciation calculations');
      }
    }

    // Current value reasonableness
    if (assetData.currentValue !== undefined) {
      if (assetData.currentValue < 0) {
        errors.push('Current value cannot be negative');
      }

      if (assetData.salvageValue && assetData.currentValue < assetData.salvageValue) {
        warnings.push('Current value is less than salvage value');
      }
    }
  }

  /**
   * Validate date fields and their relationships
   */
  private validateDates(
    assetData: AssetMaintenanceData, 
    errors: string[], 
    warnings: string[]
  ): void {
    const now = new Date();

    // Purchase date validation
    if (assetData.purchaseDate) {
      if (assetData.purchaseDate > now) {
        errors.push('Purchase date cannot be in the future');
      }

      // Check if purchase date is reasonable (not too old)
      const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
      if (assetData.purchaseDate < tenYearsAgo && assetData.status === AssetStatus.OPERATIONAL) {
        warnings.push('Asset purchased over 10 years ago but still operational - verify data');
      }
    }

    // Warranty expiry validation
    if (assetData.warrantyExpiry) {
      if (assetData.purchaseDate && assetData.warrantyExpiry < assetData.purchaseDate) {
        errors.push('Warranty expiry date cannot be before purchase date');
      }

      // Check for expired warranty
      if (assetData.warrantyExpiry < now) {
        warnings.push('Asset warranty has expired');
      }
    }

    // Maintenance date validation
    if (assetData.lastMaintenanceDate) {
      if (assetData.lastMaintenanceDate > now) {
        errors.push('Last maintenance date cannot be in the future');
      }

      if (assetData.purchaseDate && assetData.lastMaintenanceDate < assetData.purchaseDate) {
        errors.push('Last maintenance date cannot be before purchase date');
      }
    }

    if (assetData.nextMaintenanceDate) {
      if (assetData.nextMaintenanceDate < now && assetData.status === AssetStatus.OPERATIONAL) {
        warnings.push('Next maintenance date is overdue');
      }

      if (assetData.lastMaintenanceDate && assetData.nextMaintenanceDate < assetData.lastMaintenanceDate) {
        errors.push('Next maintenance date cannot be before last maintenance date');
      }
    }
  }

  /**
   * Validate cross-field logic and dependencies
   */
  private validateCrossFieldLogic(
    assetData: AssetMaintenanceData, 
    errors: string[], 
    warnings: string[]
  ): void {
    // If room is specified, floor should be specified
    if (assetData.room && !assetData.floor) {
      warnings.push('Room specified without floor - location may be incomplete');
    }

    // If floor is specified, building should be specified
    if (assetData.floor && !assetData.building) {
      warnings.push('Floor specified without building - location may be incomplete');
    }

    // Maintenance interval and next maintenance date consistency
    if (assetData.maintenanceInterval && assetData.nextMaintenanceDate && assetData.lastMaintenanceDate) {
      const expectedNext = new Date(assetData.lastMaintenanceDate);
      expectedNext.setDate(expectedNext.getDate() + assetData.maintenanceInterval);
      
      const daysDifference = Math.abs(expectedNext.getTime() - assetData.nextMaintenanceDate.getTime()) / (1000 * 3600 * 24);
      if (daysDifference > 7) { // Allow 7 days tolerance
        warnings.push('Next maintenance date does not align with maintenance interval');
      }
    }
  }

  /**
   * Validate organizational constraints and settings
   */
  private async validateOrganizationalConstraints(
    assetData: AssetMaintenanceData, 
    errors: string[]
  ): Promise<void> {
    try {
      // Verify organization exists and is active
      const organization = await prisma.organization.findUnique({
        where: { id: assetData.organizationId },
        select: { id: true, status: true, settings: true }
      });

      if (!organization) {
        errors.push('Organization not found');
        return;
      }

      if (organization.status !== 'ACTIVE') {
        errors.push('Cannot create assets for inactive organization');
      }

      // Check organization-specific asset constraints
      const settings = organization.settings as any;
      if (settings?.assetManagement) {
        const assetSettings = settings.assetManagement;
        
        if (assetSettings.maxAssetsPerOrg) {
          const currentCount = await prisma.maintenanceAsset.count({
            where: { organizationId: assetData.organizationId }
          });
          
          if (currentCount >= assetSettings.maxAssetsPerOrg) {
            errors.push('Organization has reached maximum asset limit');
          }
        }

        if (assetSettings.restrictedCategories?.includes(assetData.category)) {
          errors.push(`Asset category '${assetData.category}' is restricted for this organization`);
        }
      }

    } catch (error: unknown) {
      logger.warn('Could not validate organizational constraints', { 
        organizationId: assetData.organizationId,
        error: (error as Error).message 
      });
    }
  }

  /**
   * Get organization-specific asset settings
   */
  private async getOrganizationAssetSettings(organizationId: string): Promise<any> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    const settings = organization?.settings;
    return settings?.assetManagement || {
      requiresPrefix: false,
      requiredPrefix: '',
      tagPattern: null
    };
  }

  /**
   * Validate building exists in organization
   */
  private async validateBuildingExists(building: string, organizationId: string): Promise<boolean> {
    try {
      const count = await prisma.building.count({
        where: {
          name: building,
          organizationId
        }
      });
      return count > 0;
    } catch (error: unknown) {
      return false;
    }
  }

  /**
   * Validate floor exists in building
   */
  private async validateFloorExists(building: string, floor: string, organizationId: string): Promise<boolean> {
    try {
      const count = await prisma.floor.count({
        where: {
          name: floor,
          building: {
            name: building,
            organizationId
          }
        }
      });
      return count > 0;
    } catch (error: unknown) {
      return false;
    }
  }

  /**
   * Validate room exists on floor
   */
  private async validateRoomExists(
    building: string, 
    floor: string, 
    room: string, 
    organizationId: string
  ): Promise<boolean> {
    try {
      const count = await prisma.space.count({
        where: {
          name: room,
          floor: {
            name: floor,
            building: {
              name: building,
              organizationId
            }
          }
        }
      });
      return count > 0;
    } catch (error: unknown) {
      return false;
    }
  }
}