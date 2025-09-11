import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface AssetMaintenanceData {
  assetId: string;
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
  status: string;
  condition: string;
  criticality: string;
  purchasePrice?: number;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  depreciationMethod?: string;
  usefulLife?: number;
  salvageValue?: number;
  currentValue?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceInterval?: number;
  organizationId: string;
  createdBy: string;
}

export interface AssetSearchFilters {
  category?: string;
  status?: string;
  condition?: string;
  criticality?: string;
  location?: string;
  building?: string;
  manufacturer?: string;
  model?: string;
  maintenanceDue?: boolean;
  warrantyExpiring?: boolean;
  organizationId: string;
}

export interface MaintenanceMetrics {
  totalAssets: number;
  assetsByCategory: { [category: string]: number };
  assetsByStatus: { [status: string]: number };
  assetsByCondition: { [condition: string]: number };
  assetsByCriticality: { [criticality: string]: number };
  maintenanceDueCount: number;
  overdueMaintenanceCount: number;
  warrantyExpiringCount: number;
  totalMaintenanceCost: number;
  averageAssetAge: number;
  averageAssetValue: number;
  utilizationRate: number;
  availabilityRate: number;
}

export interface AssetConditionSummary {
  assetId: string;
  currentCondition: string;
  lastAssessmentDate: Date;
  overallScore: number;
  mechanicalScore?: number;
  electricalScore?: number;
  structuralScore?: number;
  riskLevel: string;
  recommendedActions: string[];
  nextInspectionDue?: Date;
}

export interface AssetLifecycleAnalysis {
  assetId: string;
  ageInYears: number;
  remainingUsefulLife: number;
  currentValue: number;
  depreciationRate: number;
  replacementCost: number;
  replacementRecommendation: 'IMMEDIATE' | 'WITHIN_YEAR' | 'WITHIN_2_YEARS' | 'FUTURE' | 'NOT_REQUIRED';
  costOfOwnership: number;
  roi: number;
}

/**
 * MaintenanceService - Core CMMS functionality
 * Handles asset tracking, maintenance management, and lifecycle analysis
 * Supports 500,000+ asset tracking capability
 */
export class MaintenanceService {
  
  /**
   * Create a new maintenance asset
   */
  async createMaintenanceAsset(assetData: AssetMaintenanceData): Promise<any> {
    try {
      const asset = await prisma.maintenanceAsset.create({
        data: {
          assetId: assetData.assetId,
          assetTag: assetData.assetTag,
          assetName: assetData.assetName,
          description: assetData.description,
          category: assetData.category as any,
          subcategory: assetData.subcategory,
          manufacturer: assetData.manufacturer,
          model: assetData.model,
          serialNumber: assetData.serialNumber,
          location: assetData.location,
          building: assetData.building,
          floor: assetData.floor,
          room: assetData.room,
          status: assetData.status as any,
          condition: assetData.condition as any,
          criticality: assetData.criticality as any,
          purchasePrice: assetData.purchasePrice,
          purchaseDate: assetData.purchaseDate,
          warrantyExpiry: assetData.warrantyExpiry,
          depreciationMethod: assetData.depreciationMethod as any,
          usefulLife: assetData.usefulLife,
          salvageValue: assetData.salvageValue,
          currentValue: assetData.currentValue,
          lastMaintenanceDate: assetData.lastMaintenanceDate,
          nextMaintenanceDate: assetData.nextMaintenanceDate,
          maintenanceInterval: assetData.maintenanceInterval,
          organizationId: assetData.organizationId,
          createdBy: assetData.createdBy,
        },
      });

      logger.info('Maintenance asset created', { assetId: asset.id });
      return asset;
    } catch (error) {
      logger.error('Failed to create maintenance asset', error);
      throw error;
    }
  }

  /**
   * Get maintenance asset by ID with full details
   */
  async getMaintenanceAsset(assetId: string): Promise<any> {
    try {
      const asset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId },
        include: {
          workOrders: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          preventiveMaintenance: {
            where: { status: 'ACTIVE' },
          },
          assetConditions: {
            orderBy: { assessmentDate: 'desc' },
            take: 5,
          },
          depreciations: {
            orderBy: { depreciationYear: 'desc' },
            take: 5,
          },
          iotDevices: {
            where: { status: 'ACTIVE' },
          },
          energyMeters: {
            where: { isActive: true },
          },
        },
      });

      if (!asset) {
        throw new Error('Maintenance asset not found');
      }

      return asset;
    } catch (error) {
      logger.error('Failed to get maintenance asset', { assetId, error });
      throw error;
    }
  }

  /**
   * Search assets with advanced filtering and pagination
   * Optimized for high-volume asset databases (500k+ assets)
   */
  async searchAssets(
    filters: AssetSearchFilters,
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'assetName',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<{
    assets: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const where: any = {
        organizationId: filters.organizationId,
      };

      // Apply filters
      if (filters.category) {
        where.category = filters.category;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.condition) {
        where.condition = filters.condition;
      }
      if (filters.criticality) {
        where.criticality = filters.criticality;
      }
      if (filters.location) {
        where.location = { contains: filters.location, mode: 'insensitive' };
      }
      if (filters.building) {
        where.building = filters.building;
      }
      if (filters.manufacturer) {
        where.manufacturer = { contains: filters.manufacturer, mode: 'insensitive' };
      }
      if (filters.model) {
        where.model = { contains: filters.model, mode: 'insensitive' };
      }
      if (filters.maintenanceDue) {
        where.nextMaintenanceDate = { lte: new Date() };
      }
      if (filters.warrantyExpiring) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        where.warrantyExpiry = {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        };
      }

      // Get total count for pagination
      const totalCount = await prisma.maintenanceAsset.count({ where });

      // Get assets with pagination and sorting
      const assets = await prisma.maintenanceAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          workOrders: {
            where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
            select: { id: true, status: true, priority: true },
          },
          preventiveMaintenance: {
            where: { status: 'ACTIVE' },
            select: { id: true, nextDue: true },
          },
          _count: {
            select: {
              workOrders: true,
              preventiveMaintenance: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        assets,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      logger.error('Failed to search assets', { filters, error });
      throw error;
    }
  }

  /**
   * Get comprehensive maintenance metrics for dashboard
   */
  async getMaintenanceMetrics(organizationId: string): Promise<MaintenanceMetrics> {
    try {
      // Get all asset statistics in parallel for performance
      const [
        totalAssets,
        assetsByCategory,
        assetsByStatus,
        assetsByCondition,
        assetsByCriticality,
        maintenanceDueAssets,
        overdueMaintenanceAssets,
        warrantyExpiringAssets,
        totalMaintenanceCost,
        avgAge,
        avgValue,
      ] = await Promise.all([
        // Total asset count
        prisma.maintenanceAsset.count({
          where: { organizationId },
        }),
        
        // Assets by category
        prisma.maintenanceAsset.groupBy({
          by: ['category'],
          where: { organizationId },
          _count: true,
        }),
        
        // Assets by status
        prisma.maintenanceAsset.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
        
        // Assets by condition
        prisma.maintenanceAsset.groupBy({
          by: ['condition'],
          where: { organizationId },
          _count: true,
        }),
        
        // Assets by criticality
        prisma.maintenanceAsset.groupBy({
          by: ['criticality'],
          where: { organizationId },
          _count: true,
        }),
        
        // Maintenance due
        prisma.maintenanceAsset.count({
          where: {
            organizationId,
            nextMaintenanceDate: { lte: new Date() },
          },
        }),
        
        // Overdue maintenance
        prisma.maintenanceAsset.count({
          where: {
            organizationId,
            nextMaintenanceDate: { lt: new Date() },
          },
        }),
        
        // Warranty expiring (next 30 days)
        prisma.maintenanceAsset.count({
          where: {
            organizationId,
            warrantyExpiry: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        
        // Total maintenance cost (last 12 months)
        prisma.maintenanceAsset.aggregate({
          where: {
            organizationId,
            workOrders: {
              some: {
                completionDate: {
                  gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
          _sum: { maintenanceCost: true },
        }),
        
        // Average asset age calculation
        prisma.maintenanceAsset.aggregate({
          where: {
            organizationId,
            purchaseDate: { not: null },
          },
          _avg: { purchaseDate: true },
        }),
        
        // Average asset value
        prisma.maintenanceAsset.aggregate({
          where: {
            organizationId,
            currentValue: { not: null },
          },
          _avg: { currentValue: true },
        }),
      ]);

      // Process grouped results into objects
      const categoryBreakdown: { [category: string]: number } = {};
      assetsByCategory.forEach((group) => {
        categoryBreakdown[group.category] = group._count;
      });

      const statusBreakdown: { [status: string]: number } = {};
      assetsByStatus.forEach((group) => {
        statusBreakdown[group.status] = group._count;
      });

      const conditionBreakdown: { [condition: string]: number } = {};
      assetsByCondition.forEach((group) => {
        conditionBreakdown[group.condition] = group._count;
      });

      const criticalityBreakdown: { [criticality: string]: number } = {};
      assetsByCriticality.forEach((group) => {
        criticalityBreakdown[group.criticality] = group._count;
      });

      // Calculate average age in years
      const currentDate = new Date();
      const averageAgeInYears = avgAge._avg.purchaseDate 
        ? (currentDate.getTime() - avgAge._avg.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
        : 0;

      // Calculate utilization and availability rates (simplified)
      const activeAssets = statusBreakdown['ACTIVE'] || 0;
      const utilizationRate = totalAssets > 0 ? (activeAssets / totalAssets) * 100 : 0;
      const availableAssets = activeAssets - (statusBreakdown['UNDER_MAINTENANCE'] || 0);
      const availabilityRate = activeAssets > 0 ? (availableAssets / activeAssets) * 100 : 0;

      return {
        totalAssets,
        assetsByCategory: categoryBreakdown,
        assetsByStatus: statusBreakdown,
        assetsByCondition: conditionBreakdown,
        assetsByCriticality: criticalityBreakdown,
        maintenanceDueCount: maintenanceDueAssets,
        overdueMaintenanceCount: overdueMaintenanceAssets,
        warrantyExpiringCount: warrantyExpiringAssets,
        totalMaintenanceCost: totalMaintenanceCost._sum.maintenanceCost || 0,
        averageAssetAge: averageAgeInYears,
        averageAssetValue: avgValue._avg.currentValue || 0,
        utilizationRate,
        availabilityRate,
      };
    } catch (error) {
      logger.error('Failed to get maintenance metrics', { organizationId, error });
      throw error;
    }
  }

  /**
   * Update asset condition with detailed assessment
   */
  async updateAssetCondition(
    assetId: string,
    conditionData: {
      condition: string;
      assessmentType: string;
      overallScore: number;
      mechanicalScore?: number;
      electricalScore?: number;
      structuralScore?: number;
      aestheticScore?: number;
      findings?: string;
      recommendations: string[];
      urgentIssues: string[];
      estimatedRepairCost?: number;
      riskLevel: string;
      failureProbability?: number;
      impactSeverity: string;
      photoUrls?: string[];
      documentUrls?: string[];
      assessedBy: string;
    }
  ): Promise<any> {
    try {
      // Get current asset condition
      const currentAsset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId },
        select: { condition: true },
      });

      if (!currentAsset) {
        throw new Error('Asset not found');
      }

      // Create condition record
      const conditionRecord = await prisma.assetConditionRecord.create({
        data: {
          assetId,
          condition: conditionData.condition as any,
          previousCondition: currentAsset.condition,
          assessmentDate: new Date(),
          assessedBy: conditionData.assessedBy,
          assessmentType: conditionData.assessmentType as any,
          overallScore: conditionData.overallScore,
          mechanicalScore: conditionData.mechanicalScore,
          electricalScore: conditionData.electricalScore,
          structuralScore: conditionData.structuralScore,
          aestheticScore: conditionData.aestheticScore,
          findings: conditionData.findings,
          recommendations: conditionData.recommendations,
          urgentIssues: conditionData.urgentIssues,
          estimatedRepairCost: conditionData.estimatedRepairCost,
          riskLevel: conditionData.riskLevel as any,
          failureProbability: conditionData.failureProbability,
          impactSeverity: conditionData.impactSeverity as any,
          photoUrls: conditionData.photoUrls || [],
          documentUrls: conditionData.documentUrls || [],
        },
      });

      // Update asset condition
      const updatedAsset = await prisma.maintenanceAsset.update({
        where: { id: assetId },
        data: { condition: conditionData.condition as any },
      });

      // Create urgent work orders for critical issues
      if (conditionData.urgentIssues && conditionData.urgentIssues.length > 0) {
        await this.createUrgentWorkOrders(assetId, conditionData.urgentIssues, conditionData.assessedBy);
      }

      logger.info('Asset condition updated', { assetId, condition: conditionData.condition });
      return { conditionRecord, updatedAsset };
    } catch (error) {
      logger.error('Failed to update asset condition', { assetId, error });
      throw error;
    }
  }

  /**
   * Get asset condition summary for multiple assets
   */
  async getAssetConditionSummary(
    assetIds: string[],
    organizationId: string
  ): Promise<AssetConditionSummary[]> {
    try {
      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          id: { in: assetIds },
          organizationId,
        },
        include: {
          assetConditions: {
            orderBy: { assessmentDate: 'desc' },
            take: 1,
          },
          preventiveMaintenance: {
            where: { status: 'ACTIVE' },
            select: { nextDue: true },
          },
        },
      });

      return assets.map((asset) => {
        const latestCondition = asset.assetConditions[0];
        const nextInspection = asset.preventiveMaintenance.length > 0 
          ? asset.preventiveMaintenance[0].nextDue
          : undefined;

        return {
          assetId: asset.id,
          currentCondition: asset.condition,
          lastAssessmentDate: latestCondition?.assessmentDate || asset.createdAt,
          overallScore: latestCondition?.overallScore || 0,
          mechanicalScore: latestCondition?.mechanicalScore,
          electricalScore: latestCondition?.electricalScore,
          structuralScore: latestCondition?.structuralScore,
          riskLevel: latestCondition?.riskLevel || 'UNKNOWN',
          recommendedActions: latestCondition?.recommendations || [],
          nextInspectionDue: nextInspection,
        };
      });
    } catch (error) {
      logger.error('Failed to get asset condition summary', { assetIds, error });
      throw error;
    }
  }

  /**
   * Perform asset lifecycle analysis for replacement planning
   */
  async performLifecycleAnalysis(
    assetIds: string[],
    organizationId: string
  ): Promise<AssetLifecycleAnalysis[]> {
    try {
      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          id: { in: assetIds },
          organizationId,
        },
        include: {
          depreciations: {
            orderBy: { depreciationYear: 'desc' },
            take: 1,
          },
          workOrders: {
            where: { status: 'COMPLETED' },
            select: { actualCost: true, completionDate: true },
          },
        },
      });

      return assets.map((asset) => {
        const currentDate = new Date();
        const purchaseDate = asset.purchaseDate || asset.createdAt;
        const ageInYears = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        const usefulLife = asset.usefulLife || 10;
        const remainingUsefulLife = Math.max(0, usefulLife - ageInYears);
        
        const currentValue = asset.currentValue || 0;
        const purchasePrice = asset.purchasePrice || currentValue;
        const depreciationRate = purchasePrice > 0 ? (purchasePrice - currentValue) / purchasePrice : 0;
        
        // Calculate replacement cost (assuming 3% annual inflation)
        const inflationRate = 0.03;
        const replacementCost = purchasePrice * Math.pow(1 + inflationRate, ageInYears);
        
        // Calculate total cost of ownership
        const maintenanceCosts = asset.workOrders.reduce((sum, wo) => sum + wo.actualCost, 0);
        const costOfOwnership = purchasePrice + maintenanceCosts;
        
        // Calculate ROI (simplified)
        const roi = purchasePrice > 0 ? ((currentValue + maintenanceCosts) - purchasePrice) / purchasePrice : 0;
        
        // Determine replacement recommendation
        let replacementRecommendation: AssetLifecycleAnalysis['replacementRecommendation'];
        if (remainingUsefulLife <= 0 || currentValue / purchasePrice < 0.1) {
          replacementRecommendation = 'IMMEDIATE';
        } else if (remainingUsefulLife <= 1) {
          replacementRecommendation = 'WITHIN_YEAR';
        } else if (remainingUsefulLife <= 2) {
          replacementRecommendation = 'WITHIN_2_YEARS';
        } else if (remainingUsefulLife <= 5) {
          replacementRecommendation = 'FUTURE';
        } else {
          replacementRecommendation = 'NOT_REQUIRED';
        }

        return {
          assetId: asset.id,
          ageInYears,
          remainingUsefulLife,
          currentValue,
          depreciationRate,
          replacementCost,
          replacementRecommendation,
          costOfOwnership,
          roi,
        };
      });
    } catch (error) {
      logger.error('Failed to perform lifecycle analysis', { assetIds, error });
      throw error;
    }
  }

  /**
   * Bulk update asset data for high-volume operations
   */
  async bulkUpdateAssets(
    updates: Array<{
      assetId: string;
      data: Partial<AssetMaintenanceData>;
    }>,
    organizationId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Process updates in batches for better performance
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < updates.length; i += batchSize) {
        batches.push(updates.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const promises = batch.map(async (update) => {
          try {
            await prisma.maintenanceAsset.update({
              where: {
                id: update.assetId,
                organizationId,
              },
              data: {
                ...update.data,
                updatedAt: new Date(),
              } as any,
            });
            success++;
          } catch (error) {
            failed++;
            errors.push(`Asset ${update.assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        await Promise.all(promises);
      }

      logger.info('Bulk asset update completed', { success, failed, total: updates.length });
      return { success, failed, errors };
    } catch (error) {
      logger.error('Failed to perform bulk asset update', { organizationId, error });
      throw error;
    }
  }

  /**
   * Generate maintenance cost analytics
   */
  async getMaintenanceCostAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCost: number;
    costByCategory: { [category: string]: number };
    costByCriticality: { [criticality: string]: number };
    costTrends: Array<{ month: string; cost: number }>;
    topCostAssets: Array<{ assetId: string; assetName: string; cost: number }>;
    preventiveCost: number;
    correctiveCost: number;
    emergencyCost: number;
  }> {
    try {
      const workOrders = await prisma.workOrder.findMany({
        where: {
          organizationId,
          completionDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'COMPLETED',
        },
        include: {
          asset: {
            select: {
              id: true,
              assetName: true,
              category: true,
              criticality: true,
            },
          },
        },
      });

      const totalCost = workOrders.reduce((sum, wo) => sum + wo.actualCost, 0);

      // Cost by asset category
      const costByCategory: { [category: string]: number } = {};
      workOrders.forEach((wo) => {
        if (wo.asset) {
          const category = wo.asset.category;
          costByCategory[category] = (costByCategory[category] || 0) + wo.actualCost;
        }
      });

      // Cost by asset criticality
      const costByCriticality: { [criticality: string]: number } = {};
      workOrders.forEach((wo) => {
        if (wo.asset) {
          const criticality = wo.asset.criticality;
          costByCriticality[criticality] = (costByCriticality[criticality] || 0) + wo.actualCost;
        }
      });

      // Monthly cost trends
      const costTrends: Array<{ month: string; cost: number }> = [];
      const monthsMap = new Map<string, number>();
      
      workOrders.forEach((wo) => {
        if (wo.completionDate) {
          const monthKey = wo.completionDate.toISOString().substring(0, 7);
          monthsMap.set(monthKey, (monthsMap.get(monthKey) || 0) + wo.actualCost);
        }
      });

      monthsMap.forEach((cost, month) => {
        costTrends.push({ month, cost });
      });

      // Top cost assets
      const assetCosts = new Map<string, { assetId: string; assetName: string; cost: number }>();
      workOrders.forEach((wo) => {
        if (wo.asset) {
          const existing = assetCosts.get(wo.asset.id);
          if (existing) {
            existing.cost += wo.actualCost;
          } else {
            assetCosts.set(wo.asset.id, {
              assetId: wo.asset.id,
              assetName: wo.asset.assetName,
              cost: wo.actualCost,
            });
          }
        }
      });

      const topCostAssets = Array.from(assetCosts.values())
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 10);

      // Cost by work order type
      const preventiveCost = workOrders
        .filter(wo => wo.type === 'PREVENTIVE')
        .reduce((sum, wo) => sum + wo.actualCost, 0);
      
      const correctiveCost = workOrders
        .filter(wo => wo.type === 'CORRECTIVE')
        .reduce((sum, wo) => sum + wo.actualCost, 0);
      
      const emergencyCost = workOrders
        .filter(wo => wo.type === 'EMERGENCY')
        .reduce((sum, wo) => sum + wo.actualCost, 0);

      return {
        totalCost,
        costByCategory,
        costByCriticality,
        costTrends,
        topCostAssets,
        preventiveCost,
        correctiveCost,
        emergencyCost,
      };
    } catch (error) {
      logger.error('Failed to get maintenance cost analytics', { organizationId, error });
      throw error;
    }
  }

  /**
   * Create urgent work orders for critical asset issues
   */
  private async createUrgentWorkOrders(assetId: string, urgentIssues: string[], createdBy: string): Promise<void> {
    try {
      const workOrderPromises = urgentIssues.map(async (issue, index) => {
        const workOrderNumber = `URGENT-${assetId}-${Date.now()}-${index}`;
        
        return prisma.workOrder.create({
          data: {
            workOrderNumber,
            title: `Urgent Issue: ${issue}`,
            description: `Critical issue identified during condition assessment: ${issue}`,
            priority: 'EMERGENCY',
            status: 'SUBMITTED',
            type: 'EMERGENCY',
            assetId,
            location: 'To be determined',
            requestedDate: new Date(),
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            requiresApproval: false,
            organizationId: await this.getAssetOrganizationId(assetId),
            createdBy,
          },
        });
      });

      await Promise.all(workOrderPromises);
      logger.info('Created urgent work orders', { assetId, count: urgentIssues.length });
    } catch (error) {
      logger.error('Failed to create urgent work orders', { assetId, error });
      throw error;
    }
  }

  /**
   * Helper method to get organization ID for an asset
   */
  private async getAssetOrganizationId(assetId: string): Promise<string> {
    const asset = await prisma.maintenanceAsset.findUnique({
      where: { id: assetId },
      select: { organizationId: true },
    });
    
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    return asset.organizationId;
  }
}

export const maintenanceService = new MaintenanceService();