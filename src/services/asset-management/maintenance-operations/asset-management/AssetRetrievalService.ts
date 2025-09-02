import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../config/logger';
import { 
  AssetMaintenanceData,
  AssetUpdateData,
  AssetSearchFilters,
  AssetSearchResult,
  AssetSortField,
  SortOrder
} from './types/AssetTypes';

const prisma = new PrismaClient();

/**
 * AssetRetrievalService - Handles asset data retrieval operations
 * Manages asset queries, search, filtering, and data access
 * Part of the Asset Management domain within Turbo Asset IWMS
 */
export class AssetRetrievalService {

  /**
   * Get single asset by ID with full details
   */
  async getAssetById(assetId: string): Promise<any> {
    try {
      const asset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId },
        include: {
          workOrders: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              assignedUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          preventiveMaintenance: {
            where: { status: 'ACTIVE' },
            orderBy: { nextDue: 'asc' },
          },
          depreciations: {
            orderBy: { depreciationDate: 'desc' },
            take: 5,
          },
          incidents: {
            orderBy: { reportedAt: 'desc' },
            take: 5,
          },
          maintenanceHistory: {
            orderBy: { completedDate: 'desc' },
            take: 10,
          },
          organization: {
            select: {
              name: true,
              settings: true,
            }
          }
        }
      });

      if (!asset) {
        throw new Error('Asset not found');
      }

      // Calculate derived metrics
      const derivedMetrics = await this.calculateAssetMetrics(asset);

      return {
        ...asset,
        metrics: derivedMetrics,
      };

    } catch (error) {
      logger.error('Failed to get asset by ID', {
        assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get asset by asset tag
   */
  async getAssetByTag(assetTag: string, organizationId: string): Promise<any> {
    try {
      const asset = await prisma.maintenanceAsset.findFirst({
        where: {
          assetTag,
          organizationId,
        },
        include: {
          workOrders: {
            where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
            orderBy: { priority: 'desc' },
          },
          preventiveMaintenance: {
            where: { status: 'ACTIVE' },
          },
        }
      });

      if (!asset) {
        return null;
      }

      return asset;

    } catch (error) {
      logger.error('Failed to get asset by tag', {
        assetTag,
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search assets with advanced filtering and pagination
   */
  async searchAssets(
    filters: AssetSearchFilters,
    page: number = 1,
    limit: number = 50,
    sortBy: AssetSortField = 'assetName',
    sortOrder: SortOrder = 'asc'
  ): Promise<AssetSearchResult> {
    try {
      // Build where clause
      const where: any = {
        organizationId: filters.organizationId,
      };

      // Apply filters
      if (filters.category) {
        where.category = { contains: filters.category, mode: 'insensitive' };
      }

      if (filters.status) {
        where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
      }

      if (filters.condition) {
        where.condition = Array.isArray(filters.condition) ? { in: filters.condition } : filters.condition;
      }

      if (filters.criticality) {
        where.criticality = Array.isArray(filters.criticality) ? { in: filters.criticality } : filters.criticality;
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

      if (filters.maintenanceDue !== undefined && filters.maintenanceDue) {
        where.nextMaintenanceDate = { lte: new Date() };
      }

      if (filters.warrantyExpiring !== undefined && filters.warrantyExpiring) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        where.warrantyExpiry = {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        };
      }

      if (filters.purchaseDateRange) {
        where.purchaseDate = {
          gte: filters.purchaseDateRange.start,
          lte: filters.purchaseDateRange.end,
        };
      }

      if (filters.valueRange) {
        where.currentValue = {
          gte: filters.valueRange.min,
          lte: filters.valueRange.max,
        };
      }

      // Get total count
      const totalCount = await prisma.maintenanceAsset.count({ where });

      // Calculate pagination
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(totalCount / limit);

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
              incidents: true,
            },
          },
        },
      });

      // Calculate metrics if requested
      const metrics = totalCount <= 1000 ? await this.calculateSearchMetrics(where) : undefined;

      return {
        assets,
        totalCount,
        totalPages,
        currentPage: page,
        metrics,
      };

    } catch (error) {
      logger.error('Failed to search assets', {
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get assets by location hierarchy
   */
  async getAssetsByLocation(
    organizationId: string,
    location: string,
    building?: string,
    floor?: string,
    room?: string
  ): Promise<any[]> {
    try {
      const where: any = {
        organizationId,
        location: { contains: location, mode: 'insensitive' },
      };

      if (building) {
        where.building = building;
      }

      if (floor) {
        where.floor = floor;
      }

      if (room) {
        where.room = room;
      }

      const assets = await prisma.maintenanceAsset.findMany({
        where,
        orderBy: [
          { building: 'asc' },
          { floor: 'asc' },
          { room: 'asc' },
          { assetTag: 'asc' },
        ],
        include: {
          workOrders: {
            where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
            select: { id: true, status: true, priority: true },
          },
        },
      });

      return assets;

    } catch (error) {
      logger.error('Failed to get assets by location', {
        organizationId,
        location,
        building,
        floor,
        room,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get assets due for maintenance
   */
  async getAssetsDueForMaintenance(
    organizationId: string,
    daysAhead: number = 30
  ): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          organizationId,
          status: { in: ['OPERATIONAL', 'MAINTENANCE'] },
          nextMaintenanceDate: {
            lte: cutoffDate,
          },
        },
        include: {
          preventiveMaintenance: {
            where: { status: 'ACTIVE' },
          },
          workOrders: {
            where: {
              status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
              type: 'PREVENTIVE',
            },
          },
        },
        orderBy: [
          { criticality: 'asc' }, // Critical assets first
          { nextMaintenanceDate: 'asc' },
        ],
      });

      // Filter out assets that already have pending preventive work orders
      const filteredAssets = assets.filter(asset => 
        asset.workOrders.length === 0 || // No pending work orders
        !asset.workOrders.some(wo => wo.type === 'PREVENTIVE') // No pending preventive work orders
      );

      return filteredAssets;

    } catch (error) {
      logger.error('Failed to get assets due for maintenance', {
        organizationId,
        daysAhead,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get assets with expiring warranties
   */
  async getAssetsWithExpiringWarranties(
    organizationId: string,
    daysAhead: number = 60
  ): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          organizationId,
          warrantyExpiry: {
            gte: new Date(), // Not already expired
            lte: cutoffDate,  // Expiring within cutoff
          },
          status: { not: 'DISPOSED' },
        },
        orderBy: [
          { warrantyExpiry: 'asc' },
          { purchasePrice: 'desc' }, // Higher value assets first
        ],
        select: {
          id: true,
          assetTag: true,
          assetName: true,
          manufacturer: true,
          model: true,
          warrantyExpiry: true,
          purchasePrice: true,
          currentValue: true,
          location: true,
          criticality: true,
        },
      });

      return assets;

    } catch (error) {
      logger.error('Failed to get assets with expiring warranties', {
        organizationId,
        daysAhead,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get asset summary statistics
   */
  async getAssetSummaryStats(organizationId: string): Promise<{
    totalAssets: number;
    totalValue: number;
    statusBreakdown: Record<string, number>;
    conditionBreakdown: Record<string, number>;
    criticalityBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    maintenanceDueCount: number;
    warrantyExpiringCount: number;
    averageAge: number;
  }> {
    try {
      // Get basic counts
      const [
        totalAssets,
        statusStats,
        conditionStats,
        criticalityStats,
        categoryStats,
        maintenanceDue,
        warrantyExpiring
      ] = await Promise.all([
        // Total asset count
        prisma.maintenanceAsset.count({
          where: { organizationId }
        }),

        // Status breakdown
        prisma.maintenanceAsset.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: { status: true },
        }),

        // Condition breakdown
        prisma.maintenanceAsset.groupBy({
          by: ['condition'],
          where: { organizationId },
          _count: { condition: true },
        }),

        // Criticality breakdown
        prisma.maintenanceAsset.groupBy({
          by: ['criticality'],
          where: { organizationId },
          _count: { criticality: true },
        }),

        // Category breakdown
        prisma.maintenanceAsset.groupBy({
          by: ['category'],
          where: { organizationId },
          _count: { category: true },
        }),

        // Maintenance due count
        prisma.maintenanceAsset.count({
          where: {
            organizationId,
            nextMaintenanceDate: { lte: new Date() },
            status: { in: ['OPERATIONAL', 'MAINTENANCE'] },
          }
        }),

        // Warranty expiring count
        prisma.maintenanceAsset.count({
          where: {
            organizationId,
            warrantyExpiry: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            },
          }
        }),
      ]);

      // Calculate total value and average age
      const valueAndAgeData = await prisma.maintenanceAsset.aggregate({
        where: { organizationId },
        _sum: { currentValue: true, purchasePrice: true },
        _avg: { currentValue: true },
      });

      // Calculate average age in days
      const assetsWithDates = await prisma.maintenanceAsset.findMany({
        where: {
          organizationId,
          purchaseDate: { not: null },
        },
        select: { purchaseDate: true },
      });

      let averageAge = 0;
      if (assetsWithDates.length > 0) {
        const totalAge = assetsWithDates.reduce((sum, asset) => {
          const age = (new Date().getTime() - new Date(asset.purchaseDate!).getTime()) / (1000 * 60 * 60 * 24);
          return sum + age;
        }, 0);
        averageAge = totalAge / assetsWithDates.length;
      }

      // Convert arrays to objects for easier consumption
      const statusBreakdown = statusStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>);

      const conditionBreakdown = conditionStats.reduce((acc, stat) => {
        acc[stat.condition] = stat._count.condition;
        return acc;
      }, {} as Record<string, number>);

      const criticalityBreakdown = criticalityStats.reduce((acc, stat) => {
        acc[stat.criticality] = stat._count.criticality;
        return acc;
      }, {} as Record<string, number>);

      const categoryBreakdown = categoryStats.reduce((acc, stat) => {
        acc[stat.category] = stat._count.category;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalAssets,
        totalValue: valueAndAgeData._sum.currentValue || valueAndAgeData._sum.purchasePrice || 0,
        statusBreakdown,
        conditionBreakdown,
        criticalityBreakdown,
        categoryBreakdown,
        maintenanceDueCount: maintenanceDue,
        warrantyExpiringCount: warrantyExpiring,
        averageAge: Math.round(averageAge),
      };

    } catch (error) {
      logger.error('Failed to get asset summary stats', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get recently created assets
   */
  async getRecentlyCreatedAssets(
    organizationId: string,
    days: number = 7,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          organizationId,
          createdAt: { gte: cutoffDate },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          createdByUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        },
      });

      return assets;

    } catch (error) {
      logger.error('Failed to get recently created assets', {
        organizationId,
        days,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get recently updated assets
   */
  async getRecentlyUpdatedAssets(
    organizationId: string,
    days: number = 7,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          organizationId,
          updatedAt: { gte: cutoffDate },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          updatedByUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        },
      });

      return assets;

    } catch (error) {
      logger.error('Failed to get recently updated assets', {
        organizationId,
        days,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate asset metrics
   */
  private async calculateAssetMetrics(asset: any): Promise<any> {
    const currentDate = new Date();
    const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;

    // Calculate age in days
    const ageInDays = purchaseDate 
      ? Math.floor((currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate maintenance frequency (work orders per year)
    const completedWorkOrders = asset.workOrders?.filter((wo: any) => wo.status === 'COMPLETED') || [];
    const maintenanceFrequency = ageInDays > 0 ? (completedWorkOrders.length / (ageInDays / 365.25)) : 0;

    // Calculate total maintenance cost
    const totalMaintenanceCost = asset.maintenanceHistory?.reduce(
      (sum: number, history: any) => sum + (history.cost || 0), 
      0
    ) || 0;

    // Calculate uptime percentage (simplified)
    const downWorkOrders = asset.workOrders?.filter((wo: any) => 
      wo.type === 'EMERGENCY' || wo.priority === 'EMERGENCY'
    ) || [];
    const estimatedDowntime = downWorkOrders.reduce(
      (sum: number, wo: any) => sum + (wo.actualDuration || wo.estimatedDuration || 0), 
      0
    ); // in minutes

    const totalMinutesInLife = ageInDays * 24 * 60;
    const uptimePercentage = totalMinutesInLife > 0 
      ? ((totalMinutesInLife - estimatedDowntime) / totalMinutesInLife) * 100
      : 100;

    return {
      ageInDays,
      ageInYears: Math.round((ageInDays / 365.25) * 100) / 100,
      maintenanceFrequency: Math.round(maintenanceFrequency * 100) / 100,
      totalMaintenanceCost,
      averageMaintenanceCost: completedWorkOrders.length > 0 
        ? totalMaintenanceCost / completedWorkOrders.length 
        : 0,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      totalWorkOrders: asset.workOrders?.length || 0,
      completedWorkOrders: completedWorkOrders.length,
      pendingWorkOrders: asset.workOrders?.filter((wo: any) => 
        ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(wo.status)
      ).length || 0,
      activeMaintenanceSchedules: asset.preventiveMaintenance?.filter((pm: any) => 
        pm.status === 'ACTIVE'
      ).length || 0,
      incidentCount: asset.incidents?.length || 0,
    };
  }

  /**
   * Calculate search metrics
   */
  private async calculateSearchMetrics(whereClause: any): Promise<any> {
    try {
      const [
        totalValue,
        avgAge,
        statusCounts,
        conditionCounts
      ] = await Promise.all([
        // Total value
        prisma.maintenanceAsset.aggregate({
          where: whereClause,
          _sum: { currentValue: true, purchasePrice: true },
        }),

        // Average age calculation would go here
        // Simplified for now
        Promise.resolve(0),

        // Status counts
        prisma.maintenanceAsset.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true },
        }),

        // Condition counts
        prisma.maintenanceAsset.groupBy({
          by: ['condition'],
          where: whereClause,
          _count: { condition: true },
        }),
      ]);

      return {
        totalValue: totalValue._sum.currentValue || totalValue._sum.purchasePrice || 0,
        averageAge: avgAge,
        statusDistribution: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
        conditionDistribution: conditionCounts.reduce((acc, item) => {
          acc[item.condition] = item._count.condition;
          return acc;
        }, {} as Record<string, number>),
      };

    } catch (error) {
      logger.warn('Failed to calculate search metrics', { error: error.message });
      return {};
    }
  }
}