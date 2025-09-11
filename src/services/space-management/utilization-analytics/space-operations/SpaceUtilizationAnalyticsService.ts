import { prisma } from '../../../../config/database';
import { logger } from '../../../../config/logger';

interface UtilizationRecord {
  spaceId: string;
  utilizationType: string;
  value: number;
  unit: string;
  dataSource?: string;
  sensorId?: string;
  metadata?: any;
  recordDate?: Date;
}

interface UtilizationQuery {
  organizationId: string;
  spaceIds?: string[];
  buildingIds?: string[];
  floorIds?: string[];
  startDate?: Date;
  endDate?: Date;
  utilizationType?: string;
  dataSource?: string;
}

interface UtilizationReport {
  spaceId: string;
  spaceName: string;
  spaceType: string;
  totalRecords: number;
  averageUtilization: number;
  peakUtilization: number;
  utilizationTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  records: any[];
}

interface SpaceOptimizationRecommendation {
  spaceId: string;
  spaceName: string;
  currentUtilization: number;
  optimalUtilization: number;
  recommendationType: 'RIGHTSIZING' | 'REPURPOSING' | 'CONSOLIDATION' | 'EXPANSION';
  potentialSavings: number;
  implementation: {
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    timeframe: string;
    cost: number;
  };
  reasoning: string;
}

/**
 * Space Utilization Analytics Service - Comprehensive space utilization tracking and analysis
 * 
 * This service manages:
 * - Space utilization data collection and recording
 * - Utilization analytics and reporting
 * - Space optimization recommendations
 * - Occupancy trend analysis
 * - Space efficiency metrics and benchmarking
 */
export class SpaceUtilizationAnalyticsService {
  /**
   * Record space utilization data
   */
  async recordUtilization(records: UtilizationRecord[]): Promise<void> {
    try {
      logger.info('Recording space utilization data', { recordCount: records.length });

      // Validate spaces exist
      const spaceIds = records.map(r => r.spaceId);
      const existingSpaces = await prisma.space.findMany({
        where: {
          id: { in: spaceIds },
          isActive: true,
        },
      });

      const existingSpaceIds = new Set(existingSpaces.map(s => s.id));
      const validRecords = records.filter(r => existingSpaceIds.has(r.spaceId));

      if (validRecords.length === 0) {
        throw new Error('No valid spaces found for utilization records');
      }

      // Create utilization records
      await prisma.spaceUtilization.createMany({
        data: validRecords.map(record => ({
          spaceId: record.spaceId,
          utilizationType: record.utilizationType,
          value: record.value,
          unit: record.unit,
          dataSource: record.dataSource || 'MANUAL',
          sensorId: record.sensorId,
          metadata: record.metadata,
          recordDate: record.recordDate || new Date(),
          createdAt: new Date()
        }))
      });

      logger.info('Space utilization data recorded successfully', { 
        validRecords: validRecords.length,
        skippedRecords: records.length - validRecords.length
      });
    } catch (error: unknown) {
      logger.error('Failed to record space utilization data', error);
      throw error;
    }
  }

  /**
   * Get utilization report for spaces
   */
  async getUtilizationReport(query: UtilizationQuery): Promise<UtilizationReport[]> {
    try {
      logger.info('Generating utilization report', query);

      // Build where clause for spaces
      const spaceWhere: any = { organizationId: query.organizationId };
      
      if (query.spaceIds && query.spaceIds.length > 0) {
        spaceWhere.id = { in: query.spaceIds };
      }
      
      if (query.buildingIds && query.buildingIds.length > 0) {
        spaceWhere.buildingId = { in: query.buildingIds };
      }
      
      if (query.floorIds && query.floorIds.length > 0) {
        spaceWhere.floorId = { in: query.floorIds };
      }

      // Get spaces
      const spaces = await prisma.space.findMany({
        where: spaceWhere,
        include: {
          building: true,
          floor: true
        }
      });

      const spaceIds = spaces.map(s => s.id);
      
      // Build where clause for utilization records
      const utilizationWhere: any = { spaceId: { in: spaceIds } };
      
      if (query.startDate && query.endDate) {
        utilizationWhere.recordDate = {
          gte: query.startDate,
          lte: query.endDate
        };
      }
      
      if (query.utilizationType) {
        utilizationWhere.utilizationType = query.utilizationType;
      }
      
      if (query.dataSource) {
        utilizationWhere.dataSource = query.dataSource;
      }

      // Get utilization records
      const utilizationRecords = await prisma.spaceUtilization.findMany({
        where: utilizationWhere,
        orderBy: { recordDate: 'asc' }
      });

      // Group records by space
      const recordsBySpace = utilizationRecords.reduce((groups, record) => {
        if (!groups[record.spaceId]) {
          groups[record.spaceId] = [];
        }
        groups[record.spaceId].push(record);
        return groups;
      }, {} as { [key: string]: any[] });

      // Generate reports for each space
      const reports: UtilizationReport[] = spaces.map(space => {
        const spaceRecords = recordsBySpace[space.id] || [];
        const utilizationValues = spaceRecords.map(r => r.value);
        
        const averageUtilization = utilizationValues.length > 0 
          ? utilizationValues.reduce((sum, val) => sum + val, 0) / utilizationValues.length 
          : 0;
        
        const peakUtilization = utilizationValues.length > 0 
          ? Math.max(...utilizationValues) 
          : 0;

        // Calculate trend (simplified)
        const utilizationTrend = this.calculateUtilizationTrend(spaceRecords);

        return {
          spaceId: space.id,
          spaceName: space.name,
          spaceType: space.spaceType,
          totalRecords: spaceRecords.length,
          averageUtilization,
          peakUtilization,
          utilizationTrend,
          records: spaceRecords.slice(0, 100) // Limit to recent records
        };
      });

      logger.info('Utilization report generated successfully', { 
        spacesAnalyzed: reports.length,
        totalRecords: utilizationRecords.length
      });

      return reports;
    } catch (error: unknown) {
      logger.error('Failed to generate utilization report', error);
      throw error;
    }
  }

  /**
   * Generate space optimization recommendations
   */
  async generateOptimizationRecommendations(
    organizationId: string,
    options: {
      minUtilizationThreshold?: number;
      maxUtilizationThreshold?: number;
      analysisPeriod?: number; // days
      includeFinancialAnalysis?: boolean;
    } = {}
  ): Promise<SpaceOptimizationRecommendation[]> {
    try {
      const {
        minUtilizationThreshold = 30,
        maxUtilizationThreshold = 85,
        analysisPeriod = 90,
        includeFinancialAnalysis = true
      } = options;

      logger.info('Generating space optimization recommendations', { 
        organizationId, 
        thresholds: { min: minUtilizationThreshold, max: maxUtilizationThreshold },
        analysisPeriod
      });

      // Get recent utilization data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (analysisPeriod * 24 * 60 * 60 * 1000));

      const utilizationReport = await this.getUtilizationReport({
        organizationId,
        startDate,
        endDate
      });

      const recommendations: SpaceOptimizationRecommendation[] = [];

      for (const report of utilizationReport) {
        const currentUtilization = report.averageUtilization;
        let recommendation: SpaceOptimizationRecommendation | null = null;

        // Under-utilized spaces
        if (currentUtilization < minUtilizationThreshold) {
          const potentialSavings = includeFinancialAnalysis 
            ? await this.calculatePotentialSavings(report.spaceId, 'CONSOLIDATION')
            : 0;

          recommendation = {
            spaceId: report.spaceId,
            spaceName: report.spaceName,
            currentUtilization,
            optimalUtilization: 70,
            recommendationType: currentUtilization < 10 ? 'REPURPOSING' : 'CONSOLIDATION',
            potentialSavings,
            implementation: {
              effort: currentUtilization < 10 ? 'HIGH' : 'MEDIUM',
              timeframe: currentUtilization < 10 ? '3-6 months' : '1-3 months',
              cost: currentUtilization < 10 ? 50000 : 15000
            },
            reasoning: `Space is ${currentUtilization.toFixed(1)}% utilized, well below optimal range. ${
              currentUtilization < 10 
                ? 'Consider repurposing for different use or combining with adjacent spaces.' 
                : 'Consider consolidating with nearby similar spaces.'
            }`
          };
        }
        
        // Over-utilized spaces
        else if (currentUtilization > maxUtilizationThreshold) {
          const potentialSavings = includeFinancialAnalysis 
            ? await this.calculatePotentialSavings(report.spaceId, 'EXPANSION')
            : 0;

          recommendation = {
            spaceId: report.spaceId,
            spaceName: report.spaceName,
            currentUtilization,
            optimalUtilization: 75,
            recommendationType: currentUtilization > 95 ? 'EXPANSION' : 'RIGHTSIZING',
            potentialSavings: -potentialSavings, // Negative because it's a cost, not saving
            implementation: {
              effort: currentUtilization > 95 ? 'HIGH' : 'MEDIUM',
              timeframe: currentUtilization > 95 ? '6-12 months' : '2-4 months',
              cost: currentUtilization > 95 ? 75000 : 25000
            },
            reasoning: `Space is ${currentUtilization.toFixed(1)}% utilized, above optimal range. ${
              currentUtilization > 95 
                ? 'Consider expanding space or adding similar spaces to reduce congestion.' 
                : 'Consider minor adjustments to improve space efficiency.'
            }`
          };
        }

        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      // Sort recommendations by potential impact
      recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);

      logger.info('Space optimization recommendations generated', { 
        totalRecommendations: recommendations.length,
        spacesAnalyzed: utilizationReport.length
      });

      return recommendations;
    } catch (error: unknown) {
      logger.error('Failed to generate optimization recommendations', error);
      throw error;
    }
  }

  /**
   * Get space efficiency metrics
   */
  async getSpaceEfficiencyMetrics(
    organizationId: string,
    period?: { startDate: Date; endDate: Date }
  ): Promise<{
    organizationMetrics: {
      totalSpaces: number;
      totalArea: number;
      averageUtilization: number;
      utilizationTrend: string;
      efficiencyScore: number;
    };
    spaceTypeMetrics: Array<{
      spaceType: string;
      count: number;
      totalArea: number;
      averageUtilization: number;
      efficiencyRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    }>;
    buildingMetrics: Array<{
      buildingId: string;
      buildingName: string;
      totalSpaces: number;
      averageUtilization: number;
      efficiencyScore: number;
    }>;
  }> {
    try {
      logger.info('Calculating space efficiency metrics', { organizationId, period });

      // Get all spaces for organization
      const spaces = await prisma.space.findMany({
        where: { organizationId },
        include: {
          building: true,
          floor: true
        }
      });

      // Get utilization data for the period
      let utilizationQuery: UtilizationQuery = { organizationId };
      if (period) {
        utilizationQuery = {
          ...utilizationQuery,
          startDate: period.startDate,
          endDate: period.endDate
        };
      }

      const utilizationReport = await this.getUtilizationReport(utilizationQuery);
      const utilizationBySpace = utilizationReport.reduce((map, report) => {
        map[report.spaceId] = report.averageUtilization;
        return map;
      }, {} as { [key: string]: number });

      // Calculate organization-level metrics
      const totalArea = spaces.reduce((sum, space) => sum + (space.area || 0), 0);
      const utilizationValues = Object.values(utilizationBySpace);
      const averageUtilization = utilizationValues.length > 0 
        ? utilizationValues.reduce((sum, val) => sum + val, 0) / utilizationValues.length 
        : 0;
      
      const efficiencyScore = this.calculateEfficiencyScore(averageUtilization, spaces.length);
      const utilizationTrend = this.calculateOverallTrend(utilizationReport);

      const organizationMetrics = {
        totalSpaces: spaces.length,
        totalArea,
        averageUtilization,
        utilizationTrend,
        efficiencyScore
      };

      // Calculate space type metrics
      const spaceTypeGroups = spaces.reduce((groups, space) => {
        if (!groups[space.spaceType]) {
          groups[space.spaceType] = [];
        }
        groups[space.spaceType].push(space);
        return groups;
      }, {} as { [key: string]: any[] });

      const spaceTypeMetrics = Object.entries(spaceTypeGroups).map(([spaceType, typeSpaces]) => {
        const totalArea = typeSpaces.reduce((sum, space) => sum + (space.area || 0), 0);
        const typeUtilizations = typeSpaces
          .map(space => utilizationBySpace[space.id] || 0)
          .filter(util => util > 0);
        
        const averageUtilization = typeUtilizations.length > 0
          ? typeUtilizations.reduce((sum, val) => sum + val, 0) / typeUtilizations.length
          : 0;

        return {
          spaceType,
          count: typeSpaces.length,
          totalArea,
          averageUtilization,
          efficiencyRating: this.getEfficiencyRating(averageUtilization)
        };
      });

      // Calculate building metrics
      const buildingGroups = spaces.reduce((groups, space) => {
        if (space.buildingId) {
          if (!groups[space.buildingId]) {
            groups[space.buildingId] = [];
          }
          groups[space.buildingId].push(space);
        }
        return groups;
      }, {} as { [key: string]: any[] });

      const buildingMetrics = Object.entries(buildingGroups).map(([buildingId, buildingSpaces]) => {
        const buildingUtilizations = buildingSpaces
          .map(space => utilizationBySpace[space.id] || 0)
          .filter(util => util > 0);
        
        const averageUtilization = buildingUtilizations.length > 0
          ? buildingUtilizations.reduce((sum, val) => sum + val, 0) / buildingUtilizations.length
          : 0;

        const building = buildingSpaces[0]?.building;

        return {
          buildingId,
          buildingName: building?.name || 'Unknown Building',
          totalSpaces: buildingSpaces.length,
          averageUtilization,
          efficiencyScore: this.calculateEfficiencyScore(averageUtilization, buildingSpaces.length)
        };
      });

      return {
        organizationMetrics,
        spaceTypeMetrics,
        buildingMetrics
      };
    } catch (error: unknown) {
      logger.error('Failed to calculate space efficiency metrics', error);
      throw error;
    }
  }

  /**
   * Helper method to calculate utilization trend
   */
  private calculateUtilizationTrend(records: any[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (records.length < 2) {return 'STABLE';}

    const sortedRecords = records.sort((a, b) => 
      new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime()
    );

    const firstHalf = sortedRecords.slice(0, Math.floor(sortedRecords.length / 2));
    const secondHalf = sortedRecords.slice(Math.floor(sortedRecords.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.value, 0) / secondHalf.length;

    const difference = secondHalfAvg - firstHalfAvg;
    const threshold = firstHalfAvg * 0.1; // 10% threshold

    if (difference > threshold) {return 'INCREASING';}
    if (difference < -threshold) {return 'DECREASING';}
    return 'STABLE';
  }

  /**
   * Calculate overall trend across multiple reports
   */
  private calculateOverallTrend(reports: UtilizationReport[]): string {
    const trendCounts = reports.reduce((counts, report) => {
      counts[report.utilizationTrend] = (counts[report.utilizationTrend] || 0) + 1;
      return counts;
    }, {} as { [key: string]: number });

    const totalReports = reports.length;
    const increasingPct = (trendCounts['INCREASING'] || 0) / totalReports;
    const decreasingPct = (trendCounts['DECREASING'] || 0) / totalReports;

    if (increasingPct > 0.6) {return 'INCREASING';}
    if (decreasingPct > 0.6) {return 'DECREASING';}
    return 'STABLE';
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiencyScore(averageUtilization: number, spaceCount: number): number {
    // Base score from utilization (optimal around 70-80%)
    let utilizationScore = 0;
    if (averageUtilization >= 70 && averageUtilization <= 80) {
      utilizationScore = 100;
    } else if (averageUtilization >= 60 && averageUtilization <= 90) {
      utilizationScore = 85;
    } else if (averageUtilization >= 50 && averageUtilization <= 95) {
      utilizationScore = 70;
    } else {
      utilizationScore = 50;
    }

    // Adjust for space count (more spaces may indicate better distribution)
    const spaceCountFactor = Math.min(spaceCount / 10, 1); // Cap at 10 spaces
    
    return Math.round(utilizationScore * (0.9 + spaceCountFactor * 0.1));
  }

  /**
   * Get efficiency rating based on utilization
   */
  private getEfficiencyRating(utilization: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (utilization >= 70 && utilization <= 85) {return 'EXCELLENT';}
    if (utilization >= 60 && utilization <= 90) {return 'GOOD';}
    if (utilization >= 40 && utilization <= 95) {return 'FAIR';}
    return 'POOR';
  }

  /**
   * Calculate potential savings for optimization
   */
  private async calculatePotentialSavings(spaceId: string, optimizationType: string): Promise<number> {
    try {
      const space = await prisma.space.findUnique({
        where: { id: spaceId },
        include: { building: true }
      });

      if (!space) {return 0;}

      // Simplified calculation - would be more sophisticated in real implementation
      const baseArea = space.area || 100;
      const costPerSqFt = space.building?.avgCostPerSqFt || 25; // Default cost per sq ft per year

      switch (optimizationType) {
        case 'CONSOLIDATION':
          return baseArea * costPerSqFt * 0.3; // 30% savings from consolidation
        case 'REPURPOSING':
          return baseArea * costPerSqFt * 0.5; // 50% savings from repurposing
        case 'EXPANSION':
          return baseArea * costPerSqFt * 0.2; // Cost, not saving
        default:
          return 0;
      }
    } catch (error: unknown) {
      logger.error('Failed to calculate potential savings', error);
      return 0;
    }
  }
}