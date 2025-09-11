import { PrismaClient } from '@prisma/client';
import { logger } from '@/../../config/logger';
import { 
  AssetUpdateData,
  AssetValidationResult
} from './types/AssetTypes';
import { AssetValidationService } from './AssetValidationService';
import { AssetNotificationService } from './AssetNotificationService';
import { AssetAuditService } from './AssetAuditService';

const prisma = new PrismaClient();

/**
 * AssetUpdateService - Handles asset data updates and modifications
 * Manages asset updates, status changes, condition assessments, and data corrections
 * Part of the Asset Management domain within Turbo Asset IWMS
 */
export class AssetUpdateService {
  private validationService: AssetValidationService;
  private notificationService: AssetNotificationService;
  private auditService: AssetAuditService;

  constructor() {
    this.validationService = new AssetValidationService();
    this.notificationService = new AssetNotificationService();
    this.auditService = new AssetAuditService();
  }

  /**
   * Update asset information
   */
  async updateAsset(
    assetId: string,
    updateData: AssetUpdateData
  ): Promise<any> {
    try {
      // Get current asset data
      const currentAsset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId }
      });

      if (!currentAsset) {
        throw new Error('Asset not found');
      }

      // Validate update data
      const validationResult = await this.validateUpdateData(updateData, currentAsset);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Track changes for audit
      const changes: Record<string, { from: any; to: any }> = {};
      Object.keys(updateData).forEach(key => {
        const currentValue = (currentAsset as any)[key];
        const newValue = (updateData as any)[key];
        if (currentValue !== newValue) {
          changes[key] = { from: currentValue, to: newValue };
        }
      });

      // Update asset in database transaction
      const updatedAsset = await prisma.$transaction(async (tx) => {
        const updated = await tx.maintenanceAsset.update({
          where: { id: assetId },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
          include: {
            workOrders: {
              where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
              take: 5,
            },
            preventiveMaintenance: {
              where: { status: 'ACTIVE' },
            },
          }
        });

        return updated;
      });

      // Log audit record
      await this.auditService.logAssetUpdate(
        assetId,
        updateData.updatedBy,
        changes,
        updateData.updateReason
      );

      // Send notifications for significant changes
      await this.processUpdateNotifications(currentAsset, updatedAsset, changes, updateData.updatedBy);

      logger.info('Asset updated successfully', {
        assetId,
        changedFields: Object.keys(changes),
        updatedBy: updateData.updatedBy,
      });

      return updatedAsset;

    } catch (error: unknown) {
      logger.error('Failed to update asset', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update asset status
   */
  async updateAssetStatus(
    assetId: string,
    newStatus: string,
    updatedBy: string,
    reason?: string
  ): Promise<any> {
    try {
      const currentAsset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId }
      });

      if (!currentAsset) {
        throw new Error('Asset not found');
      }

      const previousStatus = currentAsset.status;

      // Validate status transition
      this.validateStatusTransition(previousStatus, newStatus);

      // Update status
      const updatedAsset = await prisma.maintenanceAsset.update({
        where: { id: assetId },
        data: {
          status: newStatus,
          updatedBy,
          updatedAt: new Date(),
        },
      });

      // Log audit record
      await this.auditService.logStatusChange(
        assetId,
        updatedBy,
        previousStatus,
        newStatus,
        reason
      );

      // Handle status-specific logic
      await this.handleStatusChangeLogic(assetId, previousStatus, newStatus, updatedBy);

      // Send notifications
      await this.notifyStatusChange(currentAsset, newStatus, updatedBy, reason);

      logger.info('Asset status updated', {
        assetId,
        previousStatus,
        newStatus,
        updatedBy,
      });

      return updatedAsset;

    } catch (error: unknown) {
      logger.error('Failed to update asset status', {
        assetId,
        newStatus,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update asset condition
   */
  async updateAssetCondition(
    assetId: string,
    newCondition: string,
    updatedBy: string,
    assessmentNotes?: string
  ): Promise<any> {
    try {
      const currentAsset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId }
      });

      if (!currentAsset) {
        throw new Error('Asset not found');
      }

      const previousCondition = currentAsset.condition;

      // Update condition
      const updatedAsset = await prisma.maintenanceAsset.update({
        where: { id: assetId },
        data: {
          condition: newCondition,
          updatedBy,
          updatedAt: new Date(),
        },
      });

      // Create condition assessment record
      await this.createConditionAssessment(assetId, newCondition, updatedBy, assessmentNotes);

      // Log audit record
      await this.auditService.logConditionChange(
        assetId,
        updatedBy,
        previousCondition,
        newCondition,
        assessmentNotes
      );

      // Handle condition-specific logic
      await this.handleConditionChangeLogic(assetId, previousCondition, newCondition, updatedBy);

      // Send notifications
      await this.notificationService.notifyConditionChange(
        assetId,
        previousCondition,
        newCondition,
        updatedBy
      );

      logger.info('Asset condition updated', {
        assetId,
        previousCondition,
        newCondition,
        updatedBy,
      });

      return updatedAsset;

    } catch (error: unknown) {
      logger.error('Failed to update asset condition', {
        assetId,
        newCondition,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update asset location
   */
  async updateAssetLocation(
    assetId: string,
    newLocation: {
      location: string;
      building?: string;
      floor?: string;
      room?: string;
    },
    updatedBy: string,
    reason?: string
  ): Promise<any> {
    try {
      const currentAsset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId }
      });

      if (!currentAsset) {
        throw new Error('Asset not found');
      }

      // Validate location hierarchy
      const validationErrors = await this.validationService.validateLocationHierarchy(
        { ...newLocation, organizationId: currentAsset.organizationId } as any,
        [],
        []
      );

      const previousLocation = {
        location: currentAsset.location,
        building: currentAsset.building,
        floor: currentAsset.floor,
        room: currentAsset.room,
      };

      // Update location
      const updatedAsset = await prisma.maintenanceAsset.update({
        where: { id: assetId },
        data: {
          ...newLocation,
          updatedBy,
          updatedAt: new Date(),
        },
      });

      // Create asset move record
      await this.createAssetMoveRecord(assetId, previousLocation, newLocation, updatedBy, reason);

      // Log audit record
      await this.auditService.logAssetMove(assetId, updatedBy, {
        fromLocation: previousLocation.location,
        toLocation: newLocation.location,
        fromBuilding: previousLocation.building,
        toBuilding: newLocation.building,
        fromRoom: previousLocation.room,
        toRoom: newLocation.room,
        reason,
      });

      // Update work orders with new location
      await this.updateWorkOrderLocations(assetId, newLocation);

      logger.info('Asset location updated', {
        assetId,
        previousLocation: previousLocation.location,
        newLocation: newLocation.location,
        updatedBy,
      });

      return updatedAsset;

    } catch (error: unknown) {
      logger.error('Failed to update asset location', {
        assetId,
        newLocation,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update asset financial information
   */
  async updateAssetFinancials(
    assetId: string,
    financialData: {
      currentValue?: number;
      salvageValue?: number;
      usefulLife?: number;
      depreciationMethod?: string;
    },
    updatedBy: string,
    reason?: string
  ): Promise<any> {
    try {
      const currentAsset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId }
      });

      if (!currentAsset) {
        throw new Error('Asset not found');
      }

      // Track financial changes
      const changes: Record<string, { from: any; to: any }> = {};
      if (financialData.currentValue !== undefined && financialData.currentValue !== currentAsset.currentValue) {
        changes.currentValue = { from: currentAsset.currentValue, to: financialData.currentValue };
      }
      if (financialData.salvageValue !== undefined && financialData.salvageValue !== currentAsset.salvageValue) {
        changes.salvageValue = { from: currentAsset.salvageValue, to: financialData.salvageValue };
      }
      if (financialData.usefulLife !== undefined && financialData.usefulLife !== currentAsset.usefulLife) {
        changes.usefulLife = { from: currentAsset.usefulLife, to: financialData.usefulLife };
      }

      // Update financial data
      const updatedAsset = await prisma.maintenanceAsset.update({
        where: { id: assetId },
        data: {
          ...financialData,
          updatedBy,
          updatedAt: new Date(),
        },
      });

      // Log audit record
      await this.auditService.logAssetUpdate(assetId, updatedBy, changes, reason);

      // If current value changed significantly, notify finance team
      if (changes.currentValue && Math.abs(changes.currentValue.to - changes.currentValue.from) > 1000) {
        await this.notifyFinancialChange(currentAsset, changes, updatedBy, reason);
      }

      logger.info('Asset financial information updated', {
        assetId,
        changes: Object.keys(changes),
        updatedBy,
      });

      return updatedAsset;

    } catch (error: unknown) {
      logger.error('Failed to update asset financials', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Bulk update assets
   */
  async bulkUpdateAssets(
    assetIds: string[],
    updateData: Partial<AssetUpdateData>,
    updatedBy: string,
    batchSize: number = 50
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ assetId: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ assetId: string; error: string }>,
    };

    // Process in batches
    for (let i = 0; i < assetIds.length; i += batchSize) {
      const batch = assetIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (assetId) => {
        try {
          await this.updateAsset(assetId, { ...updateData, updatedBy });
          results.successful++;
        } catch (error: unknown) {
          results.failed++;
          results.errors.push({
            assetId,
            error: error.message,
          });
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < assetIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('Bulk asset update completed', {
      totalAssets: assetIds.length,
      successful: results.successful,
      failed: results.failed,
    });

    return results;
  }

  /**
   * Validate update data
   */
  private async validateUpdateData(
    updateData: AssetUpdateData,
    currentAsset: any
  ): Promise<AssetValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate individual fields
    if (updateData.assetName && updateData.assetName.length > 200) {
      errors.push('Asset name cannot exceed 200 characters');
    }

    if (updateData.description && updateData.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }

    if (updateData.currentValue !== undefined) {
      if (updateData.currentValue < 0) {
        errors.push('Current value cannot be negative');
      }

      if (currentAsset.purchasePrice && updateData.currentValue > currentAsset.purchasePrice * 1.5) {
        warnings.push('Current value significantly exceeds purchase price - verify accuracy');
      }
    }

    if (updateData.maintenanceInterval !== undefined) {
      if (updateData.maintenanceInterval < 1 || updateData.maintenanceInterval > 3650) {
        errors.push('Maintenance interval must be between 1 and 3650 days');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(fromStatus: string, toStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'OPERATIONAL': ['DOWN', 'MAINTENANCE', 'RETIRED', 'STORAGE'],
      'DOWN': ['MAINTENANCE', 'OPERATIONAL', 'RETIRED'],
      'MAINTENANCE': ['OPERATIONAL', 'DOWN', 'RETIRED'],
      'RETIRED': ['DISPOSED', 'OPERATIONAL'], // Allow reactivation
      'DISPOSED': [], // Cannot transition from disposed
      'PENDING_APPROVAL': ['OPERATIONAL', 'STORAGE'],
      'IN_TRANSIT': ['OPERATIONAL', 'STORAGE'],
      'STORAGE': ['OPERATIONAL', 'RETIRED'],
      'TESTING': ['OPERATIONAL', 'DOWN'],
    };

    const allowed = validTransitions[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      throw new Error(`Invalid status transition from ${fromStatus} to ${toStatus}`);
    }
  }

  /**
   * Handle status change logic
   */
  private async handleStatusChangeLogic(
    assetId: string,
    previousStatus: string,
    newStatus: string,
    updatedBy: string
  ): Promise<void> {
    switch (newStatus) {
      case 'DOWN':
        // Create urgent work order if asset goes down
        await this.createUrgentWorkOrderForDownAsset(assetId, updatedBy);
        break;
        
      case 'RETIRED':
        // Cancel active maintenance schedules
        await this.cancelActiveMaintenanceSchedules(assetId, updatedBy);
        break;
        
      case 'DISPOSED':
        // Perform disposal cleanup
        await this.performDisposalCleanup(assetId, updatedBy);
        break;
        
      case 'OPERATIONAL':
        // Resume maintenance schedules if coming from retired/down
        if (['RETIRED', 'DOWN', 'MAINTENANCE'].includes(previousStatus)) {
          await this.resumeMaintenanceSchedules(assetId, updatedBy);
        }
        break;
    }
  }

  /**
   * Handle condition change logic
   */
  private async handleConditionChangeLogic(
    assetId: string,
    previousCondition: string,
    newCondition: string,
    updatedBy: string
  ): Promise<void> {
    // If condition worsened to critical, create emergency work order
    if (newCondition === 'CRITICAL') {
      await this.createEmergencyWorkOrderForCriticalCondition(assetId, updatedBy);
    }

    // If condition improved significantly, update maintenance intervals
    if (this.isConditionImproved(previousCondition, newCondition)) {
      await this.optimizeMaintenanceIntervals(assetId, newCondition);
    }
  }

  /**
   * Create condition assessment record
   */
  private async createConditionAssessment(
    assetId: string,
    condition: string,
    assessedBy: string,
    notes?: string
  ): Promise<void> {
    await prisma.conditionAssessment.create({
      data: {
        assetId,
        condition,
        assessedBy,
        assessmentDate: new Date(),
        notes: notes || `Condition updated to ${condition}`,
      },
    });
  }

  /**
   * Create asset move record
   */
  private async createAssetMoveRecord(
    assetId: string,
    fromLocation: any,
    toLocation: any,
    movedBy: string,
    reason?: string
  ): Promise<void> {
    await prisma.assetMove.create({
      data: {
        assetId,
        fromLocation: fromLocation.location,
        toLocation: toLocation.location,
        fromBuilding: fromLocation.building,
        toBuilding: toLocation.building,
        fromFloor: fromLocation.floor,
        toFloor: toLocation.floor,
        fromRoom: fromLocation.room,
        toRoom: toLocation.room,
        movedBy,
        moveDate: new Date(),
        reason: reason || 'Asset location updated',
      },
    });
  }

  /**
   * Update work order locations when asset moves
   */
  private async updateWorkOrderLocations(assetId: string, newLocation: any): Promise<void> {
    await prisma.workOrder.updateMany({
      where: {
        assetId,
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
      },
      data: {
        location: newLocation.location,
        building: newLocation.building,
        floor: newLocation.floor,
        room: newLocation.room,
      },
    });
  }

  /**
   * Process update notifications
   */
  private async processUpdateNotifications(
    currentAsset: any,
    updatedAsset: any,
    changes: Record<string, { from: any; to: any }>,
    updatedBy: string
  ): Promise<void> {
    // Notify for significant changes
    const significantFields = ['status', 'condition', 'criticality', 'location', 'currentValue'];
    const hasSignificantChanges = Object.keys(changes).some(field => significantFields.includes(field));

    if (hasSignificantChanges) {
      // This would send notifications based on the specific changes
      logger.info('Significant asset changes detected', {
        assetId: currentAsset.id,
        changes: Object.keys(changes),
      });
    }
  }

  /**
   * Notify status change
   */
  private async notifyStatusChange(
    asset: any,
    newStatus: string,
    updatedBy: string,
    reason?: string
  ): Promise<void> {
    // This would send status change notifications
    logger.info('Asset status change notification', {
      assetId: asset.id,
      assetTag: asset.assetTag,
      newStatus,
      updatedBy,
    });
  }

  /**
   * Notify financial change
   */
  private async notifyFinancialChange(
    asset: any,
    changes: Record<string, { from: any; to: any }>,
    updatedBy: string,
    reason?: string
  ): Promise<void> {
    // This would notify the finance team of significant value changes
    logger.info('Asset financial change notification', {
      assetId: asset.id,
      changes,
      updatedBy,
    });
  }

  /**
   * Helper methods for status change handling
   */
  private async createUrgentWorkOrderForDownAsset(assetId: string, createdBy: string): Promise<void> {
    // Logic to create urgent work order
  }

  private async cancelActiveMaintenanceSchedules(assetId: string, updatedBy: string): Promise<void> {
    await prisma.preventiveMaintenance.updateMany({
      where: { assetId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', updatedBy, updatedAt: new Date() },
    });
  }

  private async performDisposalCleanup(assetId: string, updatedBy: string): Promise<void> {
    // Logic for disposal cleanup
  }

  private async resumeMaintenanceSchedules(assetId: string, updatedBy: string): Promise<void> {
    // Logic to resume maintenance schedules
  }

  private async createEmergencyWorkOrderForCriticalCondition(assetId: string, createdBy: string): Promise<void> {
    // Logic to create emergency work order
  }

  private async optimizeMaintenanceIntervals(assetId: string, newCondition: string): Promise<void> {
    // Logic to optimize maintenance intervals based on improved condition
  }

  private isConditionImproved(fromCondition: string, toCondition: string): boolean {
    const conditionOrder = ['CRITICAL', 'POOR', 'FAIR', 'GOOD', 'EXCELLENT'];
    const fromIndex = conditionOrder.indexOf(fromCondition);
    const toIndex = conditionOrder.indexOf(toCondition);
    return toIndex > fromIndex;
  }
}