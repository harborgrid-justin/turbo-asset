import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../config/logger';
import { 
  AssetAuditRecord,
  AssetAuditAction
} from './types/AssetTypes';

const prisma = new PrismaClient();

/**
 * AssetAuditService - Comprehensive audit trail and compliance tracking for assets
 * Handles audit logging, compliance reporting, and change tracking
 * Part of the Asset Management domain within Turbo Asset IWMS
 */
export class AssetAuditService {

  /**
   * Log asset creation audit record
   */
  async logAssetCreation(
    assetId: string,
    details: {
      action: string;
      userId: string;
      details: Record<string, any>;
      timestamp: Date;
    }
  ): Promise<AssetAuditRecord> {
    try {
      const auditRecord = await prisma.assetAudit.create({
        data: {
          assetId,
          action: AssetAuditAction.ASSET_CREATED,
          userId: details.userId,
          details: details.details,
          timestamp: details.timestamp,
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
        include: {
          asset: {
            select: {
              assetTag: true,
              assetName: true,
            }
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      });

      logger.info('Asset creation audit logged', {
        assetId,
        auditId: auditRecord.id,
        userId: details.userId,
      });

      return this.mapToAuditRecord(auditRecord);

    } catch (error: unknown) {
      logger.error('Failed to log asset creation audit', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log asset cloning audit record
   */
  async logAssetCloning(
    sourceAssetId: string,
    clonedAssetId: string,
    userId: string
  ): Promise<AssetAuditRecord> {
    try {
      const auditRecord = await prisma.assetAudit.create({
        data: {
          assetId: clonedAssetId,
          action: AssetAuditAction.ASSET_CLONED,
          userId,
          details: {
            sourceAssetId,
            action: 'Asset cloned from existing asset',
            clonedAt: new Date(),
          },
          timestamp: new Date(),
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
      });

      // Also log on source asset
      await prisma.assetAudit.create({
        data: {
          assetId: sourceAssetId,
          action: AssetAuditAction.ASSET_CLONED,
          userId,
          details: {
            clonedAssetId,
            action: 'Asset was cloned to create new asset',
            clonedAt: new Date(),
          },
          timestamp: new Date(),
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
      });

      logger.info('Asset cloning audit logged', {
        sourceAssetId,
        clonedAssetId,
        userId,
      });

      return this.mapToAuditRecord(auditRecord);

    } catch (error: unknown) {
      logger.error('Failed to log asset cloning audit', {
        sourceAssetId,
        clonedAssetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log asset update audit record
   */
  async logAssetUpdate(
    assetId: string,
    userId: string,
    changes: Record<string, { from: any; to: any }>,
    reason?: string
  ): Promise<AssetAuditRecord> {
    try {
      const auditRecord = await prisma.assetAudit.create({
        data: {
          assetId,
          action: AssetAuditAction.ASSET_UPDATED,
          userId,
          details: {
            changes,
            reason: reason || 'Asset information updated',
            updatedFields: Object.keys(changes),
            changeCount: Object.keys(changes).length,
          },
          timestamp: new Date(),
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
        include: {
          asset: {
            select: {
              assetTag: true,
              assetName: true,
            }
          }
        }
      });

      logger.info('Asset update audit logged', {
        assetId,
        userId,
        changedFields: Object.keys(changes),
      });

      return this.mapToAuditRecord(auditRecord);

    } catch (error: unknown) {
      logger.error('Failed to log asset update audit', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log asset status change audit record
   */
  async logStatusChange(
    assetId: string,
    userId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string
  ): Promise<AssetAuditRecord> {
    try {
      const auditRecord = await prisma.assetAudit.create({
        data: {
          assetId,
          action: AssetAuditAction.STATUS_CHANGED,
          userId,
          details: {
            fromStatus,
            toStatus,
            reason: reason || 'Asset status changed',
            statusChangeDate: new Date(),
          },
          timestamp: new Date(),
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
      });

      logger.info('Asset status change audit logged', {
        assetId,
        fromStatus,
        toStatus,
        userId,
      });

      return this.mapToAuditRecord(auditRecord);

    } catch (error: unknown) {
      logger.error('Failed to log status change audit', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log asset condition change audit record
   */
  async logConditionChange(
    assetId: string,
    userId: string,
    fromCondition: string,
    toCondition: string,
    assessmentNotes?: string
  ): Promise<AssetAuditRecord> {
    try {
      const auditRecord = await prisma.assetAudit.create({
        data: {
          assetId,
          action: AssetAuditAction.CONDITION_CHANGED,
          userId,
          details: {
            fromCondition,
            toCondition,
            assessmentNotes: assessmentNotes || 'Asset condition assessment updated',
            conditionChangeDate: new Date(),
            degradation: this.isConditionWorsened(fromCondition, toCondition),
          },
          timestamp: new Date(),
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
      });

      logger.info('Asset condition change audit logged', {
        assetId,
        fromCondition,
        toCondition,
        userId,
      });

      return this.mapToAuditRecord(auditRecord);

    } catch (error: unknown) {
      logger.error('Failed to log condition change audit', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log maintenance scheduled audit record
   */
  async logMaintenanceScheduled(
    assetId: string,
    userId: string,
    maintenanceDetails: {
      workOrderId?: string;
      maintenanceType: string;
      scheduledDate: Date;
      priority: string;
      assignedTo?: string;
    }
  ): Promise<AssetAuditRecord> {
    try {
      const auditRecord = await prisma.assetAudit.create({
        data: {
          assetId,
          action: AssetAuditAction.MAINTENANCE_SCHEDULED,
          userId,
          details: {
            workOrderId: maintenanceDetails.workOrderId,
            maintenanceType: maintenanceDetails.maintenanceType,
            scheduledDate: maintenanceDetails.scheduledDate,
            priority: maintenanceDetails.priority,
            assignedTo: maintenanceDetails.assignedTo,
            scheduledBy: userId,
            scheduledAt: new Date(),
          },
          timestamp: new Date(),
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
      });

      logger.info('Maintenance scheduled audit logged', {
        assetId,
        workOrderId: maintenanceDetails.workOrderId,
        maintenanceType: maintenanceDetails.maintenanceType,
      });

      return this.mapToAuditRecord(auditRecord);

    } catch (error: unknown) {
      logger.error('Failed to log maintenance scheduled audit', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log maintenance completed audit record
   */
  async logMaintenanceCompleted(
    assetId: string,
    userId: string,
    maintenanceDetails: {
      workOrderId: string;
      completedDate: Date;
      duration?: number;
      cost?: number;
      notes?: string;
    }
  ): Promise<AssetAuditRecord> {
    try {
      const auditRecord = await prisma.assetAudit.create({
        data: {
          assetId,
          action: AssetAuditAction.MAINTENANCE_COMPLETED,
          userId,
          details: {
            workOrderId: maintenanceDetails.workOrderId,
            completedDate: maintenanceDetails.completedDate,
            duration: maintenanceDetails.duration,
            cost: maintenanceDetails.cost,
            notes: maintenanceDetails.notes,
            completedBy: userId,
          },
          timestamp: new Date(),
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
      });

      logger.info('Maintenance completed audit logged', {
        assetId,
        workOrderId: maintenanceDetails.workOrderId,
        cost: maintenanceDetails.cost,
      });

      return this.mapToAuditRecord(auditRecord);

    } catch (error: unknown) {
      logger.error('Failed to log maintenance completed audit', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log asset move/transfer audit record
   */
  async logAssetMove(
    assetId: string,
    userId: string,
    moveDetails: {
      fromLocation: string;
      toLocation: string;
      fromBuilding?: string;
      toBuilding?: string;
      fromRoom?: string;
      toRoom?: string;
      reason?: string;
    }
  ): Promise<AssetAuditRecord> {
    try {
      const auditRecord = await prisma.assetAudit.create({
        data: {
          assetId,
          action: AssetAuditAction.ASSET_MOVED,
          userId,
          details: {
            fromLocation: moveDetails.fromLocation,
            toLocation: moveDetails.toLocation,
            fromBuilding: moveDetails.fromBuilding,
            toBuilding: moveDetails.toBuilding,
            fromRoom: moveDetails.fromRoom,
            toRoom: moveDetails.toRoom,
            reason: moveDetails.reason || 'Asset relocated',
            movedBy: userId,
            movedAt: new Date(),
          },
          timestamp: new Date(),
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
      });

      logger.info('Asset move audit logged', {
        assetId,
        fromLocation: moveDetails.fromLocation,
        toLocation: moveDetails.toLocation,
      });

      return this.mapToAuditRecord(auditRecord);

    } catch (error: unknown) {
      logger.error('Failed to log asset move audit', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log depreciation calculation audit record
   */
  async logDepreciationCalculation(
    assetId: string,
    calculatedBy: string,
    depreciationDetails: {
      previousValue: number;
      newValue: number;
      depreciationAmount: number;
      method: string;
      calculationDate: Date;
    }
  ): Promise<AssetAuditRecord> {
    try {
      const auditRecord = await prisma.assetAudit.create({
        data: {
          assetId,
          action: AssetAuditAction.DEPRECIATION_CALCULATED,
          userId: calculatedBy,
          details: {
            previousValue: depreciationDetails.previousValue,
            newValue: depreciationDetails.newValue,
            depreciationAmount: depreciationDetails.depreciationAmount,
            method: depreciationDetails.method,
            calculationDate: depreciationDetails.calculationDate,
            calculatedBy,
          },
          timestamp: new Date(),
          ipAddress: this.getCurrentIPAddress(),
          userAgent: this.getCurrentUserAgent(),
        },
      });

      return this.mapToAuditRecord(auditRecord);

    } catch (error: unknown) {
      logger.error('Failed to log depreciation calculation audit', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get audit trail for specific asset
   */
  async getAssetAuditTrail(
    assetId: string,
    startDate?: Date,
    endDate?: Date,
    actions?: AssetAuditAction[]
  ): Promise<AssetAuditRecord[]> {
    try {
      const whereClause: any = { assetId };

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) {whereClause.timestamp.gte = startDate;}
        if (endDate) {whereClause.timestamp.lte = endDate;}
      }

      if (actions && actions.length > 0) {
        whereClause.action = { in: actions };
      }

      const auditRecords = await prisma.assetAudit.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        },
        orderBy: { timestamp: 'desc' },
      });

      return auditRecords.map(record => this.mapToAuditRecord(record));

    } catch (error: unknown) {
      logger.error('Failed to get asset audit trail', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate audit compliance report
   */
  async generateComplianceReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalAudits: number;
    auditsByAction: Record<string, number>;
    auditsByUser: Record<string, number>;
    complianceMetrics: {
      assetsWithAudits: number;
      totalAssets: number;
      auditCoveragePercentage: number;
      averageAuditsPerAsset: number;
    };
    riskIndicators: {
      assetsWithoutRecentAudits: number;
      unauthorizedChanges: number;
      highRiskActivities: number;
    };
  }> {
    try {
      // Get all audit records for the period
      const auditRecords = await prisma.assetAudit.findMany({
        where: {
          asset: { organizationId },
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          asset: {
            select: {
              assetTag: true,
              assetName: true,
            }
          }
        }
      });

      // Get total asset count
      const totalAssets = await prisma.maintenanceAsset.count({
        where: { organizationId }
      });

      // Calculate metrics
      const auditsByAction: Record<string, number> = {};
      const auditsByUser: Record<string, number> = {};
      const auditedAssets = new Set<string>();

      auditRecords.forEach(record => {
        // Count by action
        auditsByAction[record.action] = (auditsByAction[record.action] || 0) + 1;

        // Count by user
        const userName = record.user ? `${record.user.firstName} ${record.user.lastName}` : 'Unknown';
        auditsByUser[userName] = (auditsByUser[userName] || 0) + 1;

        // Track audited assets
        auditedAssets.add(record.assetId);
      });

      // Calculate compliance metrics
      const auditCoveragePercentage = totalAssets > 0 ? (auditedAssets.size / totalAssets) * 100 : 0;
      const averageAuditsPerAsset = auditedAssets.size > 0 ? auditRecords.length / auditedAssets.size : 0;

      // Calculate risk indicators
      const assetsWithoutRecentAudits = totalAssets - auditedAssets.size;
      const unauthorizedChanges = this.countUnauthorizedChanges(auditRecords);
      const highRiskActivities = this.countHighRiskActivities(auditRecords);

      const report = {
        totalAudits: auditRecords.length,
        auditsByAction,
        auditsByUser,
        complianceMetrics: {
          assetsWithAudits: auditedAssets.size,
          totalAssets,
          auditCoveragePercentage: Math.round(auditCoveragePercentage * 100) / 100,
          averageAuditsPerAsset: Math.round(averageAuditsPerAsset * 100) / 100,
        },
        riskIndicators: {
          assetsWithoutRecentAudits,
          unauthorizedChanges,
          highRiskActivities,
        },
      };

      logger.info('Audit compliance report generated', {
        organizationId,
        totalAudits: auditRecords.length,
        auditCoveragePercentage: report.complianceMetrics.auditCoveragePercentage,
      });

      return report;

    } catch (error: unknown) {
      logger.error('Failed to generate compliance report', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search audit records with advanced filtering
   */
  async searchAuditRecords(
    organizationId: string,
    filters: {
      assetIds?: string[];
      userIds?: string[];
      actions?: AssetAuditAction[];
      startDate?: Date;
      endDate?: Date;
      searchTerm?: string;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{
    records: AssetAuditRecord[];
    totalCount: number;
    totalPages: number;
  }> {
    try {
      const whereClause: any = {
        asset: { organizationId }
      };

      // Apply filters
      if (filters.assetIds && filters.assetIds.length > 0) {
        whereClause.assetId = { in: filters.assetIds };
      }

      if (filters.userIds && filters.userIds.length > 0) {
        whereClause.userId = { in: filters.userIds };
      }

      if (filters.actions && filters.actions.length > 0) {
        whereClause.action = { in: filters.actions };
      }

      if (filters.startDate || filters.endDate) {
        whereClause.timestamp = {};
        if (filters.startDate) {whereClause.timestamp.gte = filters.startDate;}
        if (filters.endDate) {whereClause.timestamp.lte = filters.endDate;}
      }

      if (filters.searchTerm) {
        whereClause.OR = [
          {
            asset: {
              OR: [
                { assetTag: { contains: filters.searchTerm, mode: 'insensitive' } },
                { assetName: { contains: filters.searchTerm, mode: 'insensitive' } },
              ]
            }
          },
          {
            details: {
              path: ['reason'],
              string_contains: filters.searchTerm,
            }
          }
        ];
      }

      // Get total count
      const totalCount = await prisma.assetAudit.count({ where: whereClause });

      // Get records with pagination
      const skip = (page - 1) * limit;
      const auditRecords = await prisma.assetAudit.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          asset: {
            select: {
              assetTag: true,
              assetName: true,
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      });

      return {
        records: auditRecords.map(record => this.mapToAuditRecord(record)),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      };

    } catch (error: unknown) {
      logger.error('Failed to search audit records', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Helper methods
   */

  private getCurrentIPAddress(): string {
    // This would get the actual IP address from the request context
    return '0.0.0.0';
  }

  private getCurrentUserAgent(): string {
    // This would get the actual user agent from the request context
    return 'Turbo Asset System';
  }

  private isConditionWorsened(fromCondition: string, toCondition: string): boolean {
    const conditionOrder = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'];
    const fromIndex = conditionOrder.indexOf(fromCondition);
    const toIndex = conditionOrder.indexOf(toCondition);
    return toIndex > fromIndex;
  }

  private countUnauthorizedChanges(auditRecords: any[]): number {
    // Logic to identify unauthorized changes
    // This would check against role permissions, time-based rules, etc.
    return auditRecords.filter(record => 
      record.action === AssetAuditAction.ASSET_UPDATED && 
      !record.details.reason
    ).length;
  }

  private countHighRiskActivities(auditRecords: any[]): number {
    const highRiskActions = [
      AssetAuditAction.ASSET_DELETED,
      AssetAuditAction.VALUE_ADJUSTED,
    ];
    
    return auditRecords.filter(record => 
      highRiskActions.includes(record.action as AssetAuditAction)
    ).length;
  }

  private mapToAuditRecord(record: any): AssetAuditRecord {
    return {
      id: record.id,
      assetId: record.assetId,
      action: record.action,
      userId: record.userId,
      details: record.details,
      timestamp: record.timestamp,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
    };
  }
}