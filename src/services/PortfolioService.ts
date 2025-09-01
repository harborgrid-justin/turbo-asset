import { prisma } from '../config/database';
import { logger } from '../config/logger';

interface PortfolioQuery {
  organizationId: string;
  includeInactive?: boolean;
  propertyIds?: string[];
  buildingIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

interface SpaceMetrics {
  totalSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  occupancyRate: number;
  totalArea: number;
  occupiedArea: number;
  availableArea: number;
  utilizationRate: number;
  averageCapacity: number;
  spaceTypes: { [key: string]: number };
}

interface FinancialMetrics {
  totalValue: number;
  acquisitionCost: number;
  appreciationValue: number;
  operatingCosts: number;
  revenue: number;
  netOperatingIncome: number;
  costPerSqFt: number;
  revenuePerSqFt: number;
}

interface PortfolioDashboard {
  summary: {
    totalProperties: number;
    totalBuildings: number;
    totalFloors: number;
    totalSpaces: number;
    totalArea: number;
    totalValue: number;
    occupancyRate: number;
    utilizationRate: number;
  };
  spaceMetrics: SpaceMetrics;
  financialMetrics: FinancialMetrics;
  utilizationTrends: any[];
  costBreakdown: any[];
  spaceAllocation: any[];
  alerts: string[];
  recommendations: string[];
}

export class PortfolioService {
  /**
   * Get comprehensive portfolio dashboard data
   */
  async getPortfolioDashboard(query: PortfolioQuery): Promise<PortfolioDashboard> {
    try {
      const [
        portfolioSummary,
        spaceMetrics,
        financialMetrics,
        utilizationTrends,
        costBreakdown,
        spaceAllocation,
      ] = await Promise.all([
        this.getPortfolioSummary(query),
        this.getSpaceMetrics(query),
        this.getFinancialMetrics(query),
        this.getUtilizationTrends(query),
        this.getCostBreakdown(query),
        this.getSpaceAllocation(query),
      ]);

      const alerts = this.generateAlerts(spaceMetrics, financialMetrics);
      const recommendations = this.generateRecommendations(spaceMetrics, financialMetrics, utilizationTrends);

      return {
        summary: portfolioSummary,
        spaceMetrics,
        financialMetrics,
        utilizationTrends,
        costBreakdown,
        spaceAllocation,
        alerts,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to get portfolio dashboard', error);
      throw error;
    }
  }

  /**
   * Get portfolio summary statistics
   */
  async getPortfolioSummary(query: PortfolioQuery): Promise<any> {
    try {
      const whereClause: any = {
        organizationId: query.organizationId,
        ...(query.includeInactive ? {} : { isActive: true }),
      };

      if (query.propertyIds && query.propertyIds.length > 0) {
        whereClause.id = { in: query.propertyIds };
      }

      // Get properties with all related data
      const properties = await prisma.property.findMany({
        where: whereClause,
        include: {
          buildings: {
            where: query.includeInactive ? {} : { isActive: true },
            include: {
              floors: {
                where: query.includeInactive ? {} : { isActive: true },
                include: {
                  spaces: {
                    where: query.includeInactive ? {} : { isActive: true },
                  },
                },
              },
            },
          },
        },
      });

      const totalProperties = properties.length;
      const totalBuildings = properties.reduce((sum, p) => sum + p.buildings.length, 0);
      const totalFloors = properties.reduce(
        (sum, p) => sum + p.buildings.reduce((bSum, b) => bSum + b.floors.length, 0),
        0
      );
      const totalSpaces = properties.reduce(
        (sum, p) =>
          sum +
          p.buildings.reduce(
            (bSum, b) => bSum + b.floors.reduce((fSum, f) => fSum + f.spaces.length, 0),
            0
          ),
        0
      );

      const totalArea = properties.reduce((sum, p) => sum + (p.totalArea || 0), 0);
      const totalValue = properties.reduce((sum, p) => sum + (p.currentValue || 0), 0);

      // Calculate occupancy rate
      const occupiedSpaces = await this.getOccupiedSpacesCount(query.organizationId);
      const occupancyRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;

      // Calculate utilization rate from recent utilization data
      const utilizationRate = await this.getAverageUtilization(query.organizationId);

      return {
        totalProperties,
        totalBuildings,
        totalFloors,
        totalSpaces,
        totalArea: Math.round(totalArea),
        totalValue: Math.round(totalValue),
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
      };
    } catch (error) {
      logger.error('Failed to get portfolio summary', error);
      throw error;
    }
  }

  /**
   * Get detailed space metrics
   */
  async getSpaceMetrics(query: PortfolioQuery): Promise<SpaceMetrics> {
    try {
      const whereClause: any = {
        floor: {
          building: {
            property: {
              organizationId: query.organizationId,
            },
          },
        },
        ...(query.includeInactive ? {} : { isActive: true }),
      };

      if (query.buildingIds && query.buildingIds.length > 0) {
        whereClause.floor.buildingId = { in: query.buildingIds };
      }

      const spaces = await prisma.space.findMany({
        where: whereClause,
        include: {
          department: true,
        },
      });

      const totalSpaces = spaces.length;
      const occupiedSpaces = spaces.filter(s => s.departmentId).length;
      const availableSpaces = totalSpaces - occupiedSpaces;
      const occupancyRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;

      const totalArea = spaces.reduce((sum, s) => sum + (s.area || 0), 0);
      const occupiedArea = spaces
        .filter(s => s.departmentId)
        .reduce((sum, s) => sum + (s.area || 0), 0);
      const availableArea = totalArea - occupiedArea;

      // Get utilization data for occupied spaces
      const utilizedSpaces = await prisma.spaceUtilization.findMany({
        where: {
          spaceId: { in: spaces.filter(s => s.departmentId).map(s => s.id) },
          utilizationType: 'UTILIZATION',
          recordDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      const utilizationRate = utilizedSpaces.length > 0
        ? utilizedSpaces.reduce((sum, u) => sum + u.value, 0) / utilizedSpaces.length
        : 0;

      const averageCapacity = spaces.length > 0
        ? spaces.reduce((sum, s) => sum + (s.capacity || 0), 0) / spaces.length
        : 0;

      // Space types distribution
      const spaceTypes: { [key: string]: number } = {};
      spaces.forEach(space => {
        spaceTypes[space.type] = (spaceTypes[space.type] || 0) + 1;
      });

      return {
        totalSpaces,
        occupiedSpaces,
        availableSpaces,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        totalArea: Math.round(totalArea),
        occupiedArea: Math.round(occupiedArea),
        availableArea: Math.round(availableArea),
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        averageCapacity: Math.round(averageCapacity * 10) / 10,
        spaceTypes,
      };
    } catch (error) {
      logger.error('Failed to get space metrics', error);
      throw error;
    }
  }

  /**
   * Get financial metrics
   */
  async getFinancialMetrics(query: PortfolioQuery): Promise<FinancialMetrics> {
    try {
      const whereClause: any = {
        organizationId: query.organizationId,
        ...(query.includeInactive ? {} : { isActive: true }),
      };

      if (query.propertyIds && query.propertyIds.length > 0) {
        whereClause.id = { in: query.propertyIds };
      }

      const properties = await prisma.property.findMany({
        where: whereClause,
      });

      const totalValue = properties.reduce((sum, p) => sum + (p.currentValue || 0), 0);
      const acquisitionCost = properties.reduce((sum, p) => sum + (p.acquisitionCost || 0), 0);
      const appreciationValue = totalValue - acquisitionCost;

      // Get cost data from chargeback and move costs
      const chargebacks = await prisma.chargebackAllocation.findMany({
        where: {
          department: {
            organizationId: query.organizationId,
          },
          ...(query.startDate || query.endDate ? {
            createdAt: {
              ...(query.startDate ? { gte: query.startDate } : {}),
              ...(query.endDate ? { lte: query.endDate } : {}),
            },
          } : {}),
        },
      });

      const operatingCosts = chargebacks.reduce((sum, c) => sum + c.totalCost, 0);

      // For this implementation, we'll assume revenue is based on space allocation
      // In a real system, this would come from actual revenue data
      const revenue = operatingCosts * 1.2; // Assuming 20% margin as placeholder
      const netOperatingIncome = revenue - operatingCosts;

      const totalArea = properties.reduce((sum, p) => sum + (p.totalArea || 0), 0);
      const costPerSqFt = totalArea > 0 ? operatingCosts / totalArea : 0;
      const revenuePerSqFt = totalArea > 0 ? revenue / totalArea : 0;

      return {
        totalValue: Math.round(totalValue),
        acquisitionCost: Math.round(acquisitionCost),
        appreciationValue: Math.round(appreciationValue),
        operatingCosts: Math.round(operatingCosts),
        revenue: Math.round(revenue),
        netOperatingIncome: Math.round(netOperatingIncome),
        costPerSqFt: Math.round(costPerSqFt * 100) / 100,
        revenuePerSqFt: Math.round(revenuePerSqFt * 100) / 100,
      };
    } catch (error) {
      logger.error('Failed to get financial metrics', error);
      throw error;
    }
  }

  /**
   * Get utilization trends over time
   */
  async getUtilizationTrends(query: PortfolioQuery): Promise<any[]> {
    try {
      const endDate = query.endDate || new Date();
      const startDate = query.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      const utilizationData = await prisma.spaceUtilization.findMany({
        where: {
          space: {
            floor: {
              building: {
                property: {
                  organizationId: query.organizationId,
                },
              },
            },
          },
          recordDate: {
            gte: startDate,
            lte: endDate,
          },
          utilizationType: 'UTILIZATION',
        },
        orderBy: {
          recordDate: 'asc',
        },
      });

      // Group by day and calculate average
      const dailyUtilization = new Map<string, number[]>();
      
      utilizationData.forEach(record => {
        const dateKey = record.recordDate.toISOString().split('T')[0];
        if (!dailyUtilization.has(dateKey)) {
          dailyUtilization.set(dateKey, []);
        }
        dailyUtilization.get(dateKey)!.push(record.value);
      });

      const trends = Array.from(dailyUtilization.entries()).map(([date, values]) => ({
        date,
        averageUtilization: values.reduce((sum, val) => sum + val, 0) / values.length,
        recordCount: values.length,
      })).sort((a, b) => a.date.localeCompare(b.date));

      return trends;
    } catch (error) {
      logger.error('Failed to get utilization trends', error);
      throw error;
    }
  }

  /**
   * Get cost breakdown by category
   */
  async getCostBreakdown(query: PortfolioQuery): Promise<any[]> {
    try {
      const chargebacks = await prisma.chargebackAllocation.findMany({
        where: {
          department: {
            organizationId: query.organizationId,
          },
          ...(query.startDate || query.endDate ? {
            createdAt: {
              ...(query.startDate ? { gte: query.startDate } : {}),
              ...(query.endDate ? { lte: query.endDate } : {}),
            },
          } : {}),
        },
        include: {
          rule: true,
        },
      });

      const costByCategory = new Map<string, number>();
      
      chargebacks.forEach(chargeback => {
        const category = chargeback.rule.costCategory;
        costByCategory.set(
          category,
          (costByCategory.get(category) || 0) + chargeback.totalCost
        );
      });

      return Array.from(costByCategory.entries()).map(([category, cost]) => ({
        category,
        cost: Math.round(cost),
      })).sort((a, b) => b.cost - a.cost);
    } catch (error) {
      logger.error('Failed to get cost breakdown', error);
      throw error;
    }
  }

  /**
   * Get space allocation by department
   */
  async getSpaceAllocation(query: PortfolioQuery): Promise<any[]> {
    try {
      const spaceAllocations = await prisma.space.findMany({
        where: {
          floor: {
            building: {
              property: {
                organizationId: query.organizationId,
              },
            },
          },
          departmentId: { not: null },
          ...(query.includeInactive ? {} : { isActive: true }),
        },
        include: {
          department: true,
        },
      });

      const allocationMap = new Map<string, { count: number; area: number; department: string }>();
      
      spaceAllocations.forEach(space => {
        const departmentId = space.departmentId!;
        const departmentName = space.department?.name || 'Unknown Department';
        
        if (!allocationMap.has(departmentId)) {
          allocationMap.set(departmentId, {
            count: 0,
            area: 0,
            department: departmentName,
          });
        }
        
        const allocation = allocationMap.get(departmentId)!;
        allocation.count += 1;
        allocation.area += space.area || 0;
      });

      return Array.from(allocationMap.entries()).map(([departmentId, data]) => ({
        departmentId,
        departmentName: data.department,
        spaceCount: data.count,
        totalArea: Math.round(data.area),
      })).sort((a, b) => b.totalArea - a.totalArea);
    } catch (error) {
      logger.error('Failed to get space allocation', error);
      throw error;
    }
  }

  /**
   * Get property drill-down data
   */
  async getPropertyDrillDown(propertyId: string, organizationId: string): Promise<any> {
    try {
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          organizationId,
          isActive: true,
        },
        include: {
          buildings: {
            where: { isActive: true },
            include: {
              floors: {
                where: { isActive: true },
                include: {
                  spaces: {
                    where: { isActive: true },
                    include: {
                      department: true,
                      bookings: {
                        where: {
                          status: 'CONFIRMED',
                          startDateTime: { gte: new Date() },
                        },
                        take: 5,
                      },
                      utilization: {
                        where: {
                          recordDate: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                          },
                        },
                        orderBy: { recordDate: 'desc' },
                        take: 10,
                      },
                    },
                  },
                },
              },
              assets: {
                where: { isActive: true },
                take: 10,
              },
            },
          },
        },
      });

      if (!property) {
        throw new Error('Property not found');
      }

      // Calculate property-level metrics
      const totalSpaces = property.buildings.reduce(
        (sum, b) => sum + b.floors.reduce((fSum, f) => fSum + f.spaces.length, 0),
        0
      );
      
      const occupiedSpaces = property.buildings.reduce(
        (sum, b) => sum + b.floors.reduce(
          (fSum, f) => fSum + f.spaces.filter(s => s.departmentId).length,
          0
        ),
        0
      );

      const totalBookings = property.buildings.reduce(
        (sum, b) => sum + b.floors.reduce(
          (fSum, f) => fSum + f.spaces.reduce((sSum, s) => sSum + s.bookings.length, 0),
          0
        ),
        0
      );

      return {
        property,
        metrics: {
          totalBuildings: property.buildings.length,
          totalFloors: property.buildings.reduce((sum, b) => sum + b.floors.length, 0),
          totalSpaces,
          occupiedSpaces,
          occupancyRate: totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0,
          upcomingBookings: totalBookings,
        },
      };
    } catch (error) {
      logger.error('Failed to get property drill-down', error);
      throw error;
    }
  }

  /**
   * Generate alerts based on metrics
   */
  private generateAlerts(spaceMetrics: SpaceMetrics, financialMetrics: FinancialMetrics): string[] {
    const alerts: string[] = [];

    if (spaceMetrics.occupancyRate > 95) {
      alerts.push('Critical: Space occupancy rate is very high (>95%). Consider adding more spaces.');
    } else if (spaceMetrics.occupancyRate > 85) {
      alerts.push('Warning: High space occupancy rate (>85%). Monitor for potential space shortage.');
    }

    if (spaceMetrics.occupancyRate < 50) {
      alerts.push('Alert: Low space occupancy rate (<50%). Consider space consolidation opportunities.');
    }

    if (spaceMetrics.utilizationRate < 40) {
      alerts.push('Alert: Low space utilization rate (<40%). Review space allocation efficiency.');
    }

    if (financialMetrics.netOperatingIncome < 0) {
      alerts.push('Critical: Negative net operating income. Review cost structure and revenue optimization.');
    }

    if (financialMetrics.costPerSqFt > 50) { // Example threshold
      alerts.push('Warning: High cost per square foot. Consider cost optimization strategies.');
    }

    return alerts;
  }

  /**
   * Generate recommendations based on analytics
   */
  private generateRecommendations(
    spaceMetrics: SpaceMetrics, 
    financialMetrics: FinancialMetrics,
    utilizationTrends: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (spaceMetrics.occupancyRate > 80) {
      recommendations.push('Consider implementing hoteling or desk-sharing to maximize space efficiency.');
    }

    if (spaceMetrics.utilizationRate < 60) {
      recommendations.push('Analyze underutilized spaces for potential repurposing or downsizing.');
    }

    if (utilizationTrends.length > 0) {
      const recentTrend = utilizationTrends.slice(-7); // Last 7 days
      const avgRecent = recentTrend.reduce((sum, t) => sum + t.averageUtilization, 0) / recentTrend.length;
      
      if (avgRecent < 50) {
        recommendations.push('Recent utilization trends show declining usage. Consider flexible workspace strategies.');
      }
    }

    const officeSpaces = spaceMetrics.spaceTypes['OFFICE'] || 0;
    const conferenceRooms = spaceMetrics.spaceTypes['CONFERENCE_ROOM'] || 0;
    
    if (conferenceRooms < officeSpaces * 0.1) {
      recommendations.push('Consider adding more meeting spaces - current ratio suggests potential shortage.');
    }

    if (financialMetrics.costPerSqFt > 30) {
      recommendations.push('Implement cost allocation strategies to optimize space-related expenses.');
    }

    return recommendations;
  }

  /**
   * Helper method to get occupied spaces count
   */
  private async getOccupiedSpacesCount(organizationId: string): Promise<number> {
    const count = await prisma.space.count({
      where: {
        floor: {
          building: {
            property: {
              organizationId,
            },
          },
        },
        departmentId: { not: null },
        isActive: true,
      },
    });

    return count;
  }

  /**
   * Helper method to get average utilization
   */
  private async getAverageUtilization(organizationId: string): Promise<number> {
    const utilizationData = await prisma.spaceUtilization.findMany({
      where: {
        space: {
          floor: {
            building: {
              property: {
                organizationId,
              },
            },
          },
        },
        utilizationType: 'UTILIZATION',
        recordDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    if (utilizationData.length === 0) return 0;
    
    return utilizationData.reduce((sum, u) => sum + u.value, 0) / utilizationData.length;
  }
}