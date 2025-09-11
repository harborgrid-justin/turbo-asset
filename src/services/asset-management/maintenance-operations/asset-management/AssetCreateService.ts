import { PrismaClient } from '@prisma/client';
import { logger } from '@/../../config/logger';
import { AssetMaintenanceData } from './types/AssetTypes';
import { AssetValidationService } from './AssetValidationService';
import { AssetWorkOrderService } from './AssetWorkOrderService';
import { AssetNotificationService } from './AssetNotificationService';
import { AssetDepreciationService } from './AssetDepreciationService';
import { AssetAuditService } from './AssetAuditService';

const prisma = new PrismaClient();

/**
 * AssetCreateService - Handles creation and initial setup of maintenance assets
 * Manages asset registration, validation, initial work orders, and lifecycle setup
 * Part of the Asset Management domain within Turbo Asset IWMS
 */
export class AssetCreateService {
  private validationService: AssetValidationService;
  private workOrderService: AssetWorkOrderService;
  private notificationService: AssetNotificationService;
  private depreciationService: AssetDepreciationService;
  private auditService: AssetAuditService;

  constructor() {
    this.validationService = new AssetValidationService();
    this.workOrderService = new AssetWorkOrderService();
    this.notificationService = new AssetNotificationService();
    this.depreciationService = new AssetDepreciationService();
    this.auditService = new AssetAuditService();
  }

  /**
   * Create a new maintenance asset with full lifecycle initialization
   * Includes validation, depreciation setup, initial maintenance scheduling
   */
  async createMaintenanceAsset(assetData: AssetMaintenanceData): Promise<any> {
    try {
      // Validate asset data integrity and business rules
      await this.validationService.validateAssetData(assetData);

      // Check for duplicate assets by tag and serial number
      await this.validationService.checkAssetDuplication(
        assetData.assetTag,
        assetData.serialNumber,
        assetData.organizationId
      );

      // Begin database transaction for atomic asset creation
      const result = await prisma.$transaction(async (tx) => {
        // Create the main asset record
        const asset = await tx.maintenanceAsset.create({
          data: {
            assetTag: assetData.assetTag,
            assetName: assetData.assetName,
            description: assetData.description,
            category: assetData.category,
            subcategory: assetData.subcategory,
            manufacturer: assetData.manufacturer,
            model: assetData.model,
            serialNumber: assetData.serialNumber,
            location: assetData.location,
            building: assetData.building,
            floor: assetData.floor,
            room: assetData.room,
            status: assetData.status || 'OPERATIONAL',
            condition: assetData.condition || 'GOOD',
            criticality: assetData.criticality || 'MEDIUM',
            purchasePrice: assetData.purchasePrice,
            purchaseDate: assetData.purchaseDate,
            warrantyExpiry: assetData.warrantyExpiry,
            depreciationMethod: assetData.depreciationMethod || 'STRAIGHT_LINE',
            usefulLife: assetData.usefulLife || 10,
            salvageValue: assetData.salvageValue || 0,
            currentValue: assetData.currentValue || assetData.purchasePrice,
            lastMaintenanceDate: assetData.lastMaintenanceDate,
            nextMaintenanceDate: assetData.nextMaintenanceDate,
            maintenanceInterval: assetData.maintenanceInterval || 90,
            organizationId: assetData.organizationId,
            createdBy: assetData.createdBy,
          },
        });

        // Initialize asset depreciation tracking
        if (assetData.purchasePrice && assetData.usefulLife) {
          await this.depreciationService.initializeDepreciation(asset.id, {
            purchasePrice: assetData.purchasePrice,
            usefulLife: assetData.usefulLife,
            salvageValue: assetData.salvageValue || 0,
            method: assetData.depreciationMethod || 'STRAIGHT_LINE',
            purchaseDate: assetData.purchaseDate || new Date(),
          });
        }

        // Create initial maintenance schedule if maintenance interval specified
        if (assetData.maintenanceInterval && assetData.nextMaintenanceDate) {
          await this.workOrderService.scheduleInitialMaintenance(asset.id, {
            interval: assetData.maintenanceInterval,
            nextDue: assetData.nextMaintenanceDate,
            type: 'PREVENTIVE',
            priority: this.determinePriorityByCriticality(assetData.criticality),
          });
        }

        // Log asset creation audit trail
        await this.auditService.logAssetCreation(asset.id, {
          action: 'ASSET_CREATED',
          userId: assetData.createdBy,
          details: {
            assetTag: assetData.assetTag,
            category: assetData.category,
            location: assetData.location,
            initialValue: assetData.purchasePrice,
          },
          timestamp: new Date(),
        });

        return asset;
      });

      // Send notifications to relevant stakeholders
      await this.notificationService.notifyAssetCreation(result, {
        notifyFacilitiesTeam: true,
        notifyMaintenanceTeam: assetData.criticality === 'HIGH',
        notifyFinanceTeam: (assetData.purchasePrice || 0) > 10000,
      });

      // Create asset QR code and documentation package
      await this.generateAssetDocumentation(result);

      logger.info('Maintenance asset created successfully', {
        assetId: result.id,
        assetTag: result.assetTag,
        organizationId: assetData.organizationId,
      });

      return result;
    } catch (error: unknown) {
      logger.error('Failed to create maintenance asset', {
        assetTag: assetData.assetTag,
        organizationId: assetData.organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create multiple assets in bulk with batch processing
   * Optimized for large-scale asset imports and migrations
   */
  async createBulkMaintenanceAssets(
    assetsData: AssetMaintenanceData[],
    batchSize: number = 100
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ index: number; error: string; assetTag?: string }>;
  }> {
    const results = { successful: 0, failed: 0, errors: [] };
    
    // Process assets in batches to manage memory and database load
    for (let i = 0; i < assetsData.length; i += batchSize) {
      const batch = assetsData.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (assetData, batchIndex) => {
        try {
          await this.createMaintenanceAsset(assetData);
          results.successful++;
        } catch (error: unknown) {
          results.failed++;
          results.errors.push({
            index: i + batchIndex,
            error: error.message,
            assetTag: assetData.assetTag,
          });
        }
      });

      // Process batch concurrently but wait for completion before next batch
      await Promise.allSettled(batchPromises);
      
      // Add small delay between batches to prevent database overload
      if (i + batchSize < assetsData.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('Bulk asset creation completed', {
      totalAssets: assetsData.length,
      successful: results.successful,
      failed: results.failed,
    });

    return results;
  }

  /**
   * Clone existing asset with modifications
   * Useful for creating similar assets or replacement assets
   */
  async cloneAsset(
    sourceAssetId: string,
    modifications: Partial<AssetMaintenanceData>,
    createdBy: string
  ): Promise<any> {
    try {
      // Get source asset data
      const sourceAsset = await prisma.maintenanceAsset.findUnique({
        where: { id: sourceAssetId },
        include: {
          depreciations: true,
          preventiveMaintenance: true,
        },
      });

      if (!sourceAsset) {
        throw new Error('Source asset not found');
      }

      // Prepare cloned asset data
      const clonedAssetData: AssetMaintenanceData = {
        assetTag: modifications.assetTag || `${sourceAsset.assetTag}_CLONE`,
        assetName: modifications.assetName || `${sourceAsset.assetName} (Clone)`,
        description: modifications.description || sourceAsset.description,
        category: modifications.category || sourceAsset.category,
        subcategory: modifications.subcategory || sourceAsset.subcategory,
        manufacturer: modifications.manufacturer || sourceAsset.manufacturer,
        model: modifications.model || sourceAsset.model,
        serialNumber: modifications.serialNumber || null, // Don't clone serial number
        location: modifications.location || sourceAsset.location,
        building: modifications.building || sourceAsset.building,
        floor: modifications.floor || sourceAsset.floor,
        room: modifications.room || sourceAsset.room,
        status: modifications.status || 'OPERATIONAL',
        condition: modifications.condition || 'NEW',
        criticality: modifications.criticality || sourceAsset.criticality,
        purchasePrice: modifications.purchasePrice || sourceAsset.purchasePrice,
        purchaseDate: modifications.purchaseDate || new Date(),
        warrantyExpiry: modifications.warrantyExpiry || null,
        depreciationMethod: modifications.depreciationMethod || sourceAsset.depreciationMethod,
        usefulLife: modifications.usefulLife || sourceAsset.usefulLife,
        salvageValue: modifications.salvageValue || sourceAsset.salvageValue,
        currentValue: modifications.currentValue || modifications.purchasePrice || sourceAsset.purchasePrice,
        maintenanceInterval: modifications.maintenanceInterval || sourceAsset.maintenanceInterval,
        organizationId: sourceAsset.organizationId,
        createdBy,
        ...modifications,
      };

      // Create the cloned asset
      const clonedAsset = await this.createMaintenanceAsset(clonedAssetData);

      // Copy preventive maintenance schedules if requested
      if (!modifications.skipMaintenanceCloning && sourceAsset.preventiveMaintenance?.length > 0) {
        await this.workOrderService.cloneMaintenanceSchedules(
          sourceAssetId,
          clonedAsset.id,
          createdBy
        );
      }

      // Log cloning audit trail
      await this.auditService.logAssetCloning(sourceAssetId, clonedAsset.id, createdBy);

      return clonedAsset;
    } catch (error: unknown) {
      logger.error('Failed to clone asset', {
        sourceAssetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate asset documentation package including QR codes, labels, and manuals
   */
  private async generateAssetDocumentation(asset: any): Promise<void> {
    try {
      // Generate QR code for asset
      await this.generateAssetQRCode(asset);

      // Create asset label template
      await this.generateAssetLabel(asset);

      // Initialize asset manual and documentation folder
      await this.initializeAssetDocumentation(asset);

    } catch (error: unknown) {
      logger.warn('Failed to generate asset documentation', {
        assetId: asset.id,
        error: error.message,
      });
      // Don't fail asset creation if documentation generation fails
    }
  }

  /**
   * Generate QR code for asset identification and mobile access
   */
  private async generateAssetQRCode(asset: any): Promise<void> {
    // QR code generation logic would go here
    // This would typically use a QR code library to generate codes
    // that link to the asset's mobile-friendly details page
  }

  /**
   * Generate printable asset label with essential information
   */
  private async generateAssetLabel(asset: any): Promise<void> {
    // Asset label generation logic would go here
    // This would create a printable label with asset tag, name, location, etc.
  }

  /**
   * Initialize asset documentation structure
   */
  private async initializeAssetDocumentation(asset: any): Promise<void> {
    // Documentation initialization logic would go here
    // This would set up folders for manuals, warranties, photos, etc.
  }

  /**
   * Determine maintenance priority based on asset criticality
   */
  private determinePriorityByCriticality(criticality?: string): string {
    switch (criticality?.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }
}