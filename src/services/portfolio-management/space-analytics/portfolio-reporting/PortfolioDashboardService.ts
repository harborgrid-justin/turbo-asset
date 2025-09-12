import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

/**
 * Portfolio Dashboard Service - Executive and operational portfolio dashboards
 * Handles portfolio summary reports, KPI calculations, and executive dashboards
 * Part of the Portfolio Management domain within Turbo Asset IWMS
 */
export class PortfolioDashboardService {

  /**
   * Get comprehensive portfolio dashboard data
   */
  async getPortfolioDashboard(query: PortfolioQuery): Promise<PortfolioDashboard> {
    try {
      const startTime = Date.now();

      // Execute parallel queries for dashboard components
      const [
        summary,
        spaceMetrics,
        financialMetrics,
        utilizationTrends,
        recentActivity,
        alerts,
        performanceIndicators
      ] = await Promise.all([
        this.getPortfolioSummary(query),
        this.getSpaceMetricsForDashboard(query),
        this.getFinancialMetricsForDashboard(query),
        this.getUtilizationTrendsForDashboard(query),
        this.getRecentActivityForDashboard(query),
        this.getPortfolioAlertsForDashboard(query),
        this.getPerformanceIndicatorsForDashboard(query)
      ]);

      const executionTime = Date.now() - startTime;

      const dashboard: PortfolioDashboard = {
        summary,
        spaceMetrics,
        financialMetrics,
        utilizationTrends,
        recentActivity,
        alerts,
        performanceIndicators,
        metadata: {
          generatedAt: new Date(),
          executionTimeMs: executionTime,
          organizationId: query.organizationId,
          includeInactive: query.includeInactive || false,
        }
      };

      logger.info('Portfolio dashboard generated', {
        organizationId: query.organizationId,
        executionTime,
        totalProperties: summary.totalProperties,
      });

      return dashboard;

    } catch (error: unknown) {
      logger.error('Failed to generate portfolio dashboard', {
        query,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get portfolio summary statistics
   */
  async getPortfolioSummary(query: PortfolioQuery): Promise<PortfolioSummary> {
    try {
      const whereClause = this.buildWhereClause(query);

      // Get basic counts
      const [
        totalProperties,
        totalBuildings,
        totalFloors,
        totalSpaces,
        activeLeases,
        totalArea,
        occupiedSpaces
      ] = await Promise.all([
        prisma.property.count({ where: whereClause }),
        prisma.building.count({ 
          where: {
            property: whereClause,
            ...(!query.includeInactive && { status: 'ACTIVE' })
          }
        }),
        prisma.floor.count({
          where: {
            building: {
              property: whereClause,
              ...(!query.includeInactive && { status: 'ACTIVE' })
            }
          }
        }),
        prisma.space.count({
          where: {
            floor: {
              building: {
                property: whereClause,
                ...(!query.includeInactive && { status: 'ACTIVE' })
              }
            }
          }
        }),
        this.getActiveLeaseCount(query.organizationId),
        this.getTotalAreaSum(whereClause),
        this.getOccupiedSpacesCount(query.organizationId)
      ]);

      // Calculate derived metrics
      const occupancyRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;
      const averageSpacesPerBuilding = totalBuildings > 0 ? totalSpaces / totalBuildings : 0;
      const averageAreaPerProperty = totalProperties > 0 ? totalArea / totalProperties : 0;

      const summary: PortfolioSummary = {
        totalProperties,
        totalBuildings,
        totalFloors,
        totalSpaces,
        activeLeases,
        totalArea: Math.round(totalArea),
        occupiedSpaces,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        averageSpacesPerBuilding: Math.round(averageSpacesPerBuilding * 100) / 100,
        averageAreaPerProperty: Math.round(averageAreaPerProperty * 100) / 100,
        utilizationRate: await this.calculatePortfolioUtilizationRate(query.organizationId),
        totalValue: await this.calculateTotalPortfolioValue(whereClause),
      };

      return summary;

    } catch (error: unknown) {
      logger.error('Failed to get portfolio summary', {
        query,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get executive dashboard with high-level KPIs
   */
  async getExecutiveDashboard(
    organizationId: string,
    timeFrame: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ExecutiveDashboard> {
    try {
      const startDate = this.getTimeFrameStartDate(timeFrame);
      const endDate = new Date();

      const [
        kpis,
        performanceTrends,
        costAnalysis,
        riskAssessment,
        recommendations
      ] = await Promise.all([
        this.calculateExecutiveKPIs(organizationId, startDate, endDate),
        this.getPerformanceTrends(organizationId, startDate, endDate),
        this.getCostAnalysisForExecutive(organizationId, startDate, endDate),
        this.getRiskAssessmentForExecutive(organizationId),
        this.getExecutiveRecommendations(organizationId, startDate, endDate)
      ]);

      const dashboard: ExecutiveDashboard = {
        organizationId,
        timeFrame,
        generatedAt: new Date(),
        kpis,
        performanceTrends,
        costAnalysis,
        riskAssessment,
        recommendations,
        summary: {
          totalRevenue: kpis.totalRevenue,
          totalCosts: kpis.totalCosts,
          netOperatingIncome: kpis.netOperatingIncome,
          portfolioValue: kpis.portfolioValue,
          occupancyRate: kpis.occupancyRate,
          utilizationRate: kpis.utilizationRate,
          costPerSqFt: kpis.costPerSqFt,
          revenuePerSqFt: kpis.revenuePerSqFt,
        }
      };

      logger.info('Executive dashboard generated', {
        organizationId,
        timeFrame,
        totalRevenue: kpis.totalRevenue,
        netOperatingIncome: kpis.netOperatingIncome,
      });

      return dashboard;

    } catch (error: unknown) {
      logger.error('Failed to generate executive dashboard', {
        organizationId,
        timeFrame,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get portfolio performance indicators
   */
  async getPortfolioPerformanceIndicators(
    organizationId: string
  ): Promise<PerformanceIndicators> {
    try {
      const [
        occupancyTrend,
        revenueTrend,
        costTrend,
        utilizationTrend,
        sustainabilityMetrics,
        complianceStatus
      ] = await Promise.all([
        this.calculateOccupancyTrend(organizationId),
        this.calculateRevenueTrend(organizationId),
        this.calculateCostTrend(organizationId),
        this.calculateUtilizationTrend(organizationId),
        this.getSustainabilityMetrics(organizationId),
        this.getComplianceStatus(organizationId)
      ]);

      const indicators: PerformanceIndicators = {
        occupancy: {
          current: occupancyTrend.current,
          trend: occupancyTrend.trend,
          changePercent: occupancyTrend.changePercent,
          status: this.determineIndicatorStatus(occupancyTrend.changePercent, 'higher_is_better'),
        },
        revenue: {
          current: revenueTrend.current,
          trend: revenueTrend.trend,
          changePercent: revenueTrend.changePercent,
          status: this.determineIndicatorStatus(revenueTrend.changePercent, 'higher_is_better'),
        },
        costs: {
          current: costTrend.current,
          trend: costTrend.trend,
          changePercent: costTrend.changePercent,
          status: this.determineIndicatorStatus(costTrend.changePercent, 'lower_is_better'),
        },
        utilization: {
          current: utilizationTrend.current,
          trend: utilizationTrend.trend,
          changePercent: utilizationTrend.changePercent,
          status: this.determineIndicatorStatus(utilizationTrend.changePercent, 'higher_is_better'),
        },
        sustainability: sustainabilityMetrics,
        compliance: complianceStatus,
        overallScore: this.calculateOverallPerformanceScore([
          occupancyTrend.changePercent,
          revenueTrend.changePercent,
          -costTrend.changePercent, // Negative because lower cost is better
          utilizationTrend.changePercent
        ]),
      };

      return indicators;

    } catch (error: unknown) {
      logger.error('Failed to get portfolio performance indicators', {
        organizationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get portfolio alerts and notifications
   */
  async getPortfolioAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    try {
      const [
        leaseExpirations,
        occupancyIssues,
        maintenanceAlerts,
        complianceIssues,
        financialAnomalies
      ] = await Promise.all([
        this.getLeaseExpirationAlerts(organizationId),
        this.getOccupancyAlerts(organizationId),
        this.getMaintenanceAlerts(organizationId),
        this.getComplianceAlerts(organizationId),
        this.getFinancialAnomalyAlerts(organizationId)
      ]);

      const allAlerts = [
        ...leaseExpirations,
        ...occupancyIssues,
        ...maintenanceAlerts,
        ...complianceIssues,
        ...financialAnomalies
      ];

      // Sort by priority and date
      allAlerts.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return allAlerts;

    } catch (error: unknown) {
      logger.error('Failed to get portfolio alerts', {
        organizationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get portfolio benchmarking data
   */
  async getPortfolioBenchmarks(
    organizationId: string,
    benchmarkType: 'industry' | 'market' | 'internal'
  ): Promise<PortfolioBenchmarks> {
    try {
      const currentMetrics = await this.getCurrentPortfolioMetrics(organizationId);

      let benchmarkData: any;
      switch (benchmarkType) {
        case 'industry':
          benchmarkData = await this.getIndustryBenchmarks(organizationId);
          break;
        case 'market':
          benchmarkData = await this.getMarketBenchmarks(organizationId);
          break;
        case 'internal':
          benchmarkData = await this.getInternalBenchmarks(organizationId);
          break;
        default:
          throw new Error(`Invalid benchmark type: ${benchmarkType}`);
      }

      const benchmarks: PortfolioBenchmarks = {
        benchmarkType,
        generatedAt: new Date(),
        metrics: {
          occupancyRate: {
            current: currentMetrics.occupancyRate,
            benchmark: benchmarkData.occupancyRate,
            variance: currentMetrics.occupancyRate - benchmarkData.occupancyRate,
            performance: this.calculateBenchmarkPerformance(
              currentMetrics.occupancyRate, 
              benchmarkData.occupancyRate, 
              'higher_is_better'
            ),
          },
          costPerSqFt: {
            current: currentMetrics.costPerSqFt,
            benchmark: benchmarkData.costPerSqFt,
            variance: currentMetrics.costPerSqFt - benchmarkData.costPerSqFt,
            performance: this.calculateBenchmarkPerformance(
              currentMetrics.costPerSqFt, 
              benchmarkData.costPerSqFt, 
              'lower_is_better'
            ),
          },
          revenuePerSqFt: {
            current: currentMetrics.revenuePerSqFt,
            benchmark: benchmarkData.revenuePerSqFt,
            variance: currentMetrics.revenuePerSqFt - benchmarkData.revenuePerSqFt,
            performance: this.calculateBenchmarkPerformance(
              currentMetrics.revenuePerSqFt, 
              benchmarkData.revenuePerSqFt, 
              'higher_is_better'
            ),
          },
          utilizationRate: {
            current: currentMetrics.utilizationRate,
            benchmark: benchmarkData.utilizationRate,
            variance: currentMetrics.utilizationRate - benchmarkData.utilizationRate,
            performance: this.calculateBenchmarkPerformance(
              currentMetrics.utilizationRate, 
              benchmarkData.utilizationRate, 
              'higher_is_better'
            ),
          },
        },
        overallScore: 0, // Calculated below
        insights: [],
      };

      // Calculate overall benchmark score
      const performanceScores = Object.values(benchmarks.metrics).map(m => m.performance);
      benchmarks.overallScore = performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length;

      // Generate insights
      benchmarks.insights = this.generateBenchmarkInsights(benchmarks.metrics);

      return benchmarks;

    } catch (error: unknown) {
      logger.error('Failed to get portfolio benchmarks', {
        organizationId,
        benchmarkType,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private buildWhereClause(query: PortfolioQuery): any {
    const where: any = {
      organizationId: query.organizationId,
    };

    if (!query.includeInactive) {
      where.status = 'ACTIVE';
    }

    if (query.propertyIds && query.propertyIds.length > 0) {
      where.id = { in: query.propertyIds };
    }

    return where;
  }

  private async getSpaceMetricsForDashboard(query: PortfolioQuery): Promise<any> {
    const whereClause = this.buildWhereClause(query);
    
    return {
      totalSpaces: await prisma.space.count({
        where: {
          floor: {
            building: {
              property: whereClause
            }
          }
        }
      }),
      occupiedSpaces: await this.getOccupiedSpacesCount(query.organizationId),
      availableSpaces: await this.getAvailableSpacesCount(query.organizationId),
    };
  }

  private async getFinancialMetricsForDashboard(query: PortfolioQuery): Promise<any> {
    return {
      totalValue: await this.calculateTotalPortfolioValue(this.buildWhereClause(query)),
      monthlyRevenue: await this.calculateMonthlyRevenue(query.organizationId),
      monthlyExpenses: await this.calculateMonthlyExpenses(query.organizationId),
      netOperatingIncome: await this.calculateNetOperatingIncome(query.organizationId),
    };
  }

  private async getUtilizationTrendsForDashboard(query: PortfolioQuery): Promise<any[]> {
    // Implementation for utilization trends
    return [];
  }

  private async getRecentActivityForDashboard(query: PortfolioQuery): Promise<any[]> {
    // Implementation for recent activity
    return [];
  }

  private async getPortfolioAlertsForDashboard(query: PortfolioQuery): Promise<any[]> {
    return this.getPortfolioAlerts(query.organizationId);
  }

  private async getPerformanceIndicatorsForDashboard(query: PortfolioQuery): Promise<any> {
    return this.getPortfolioPerformanceIndicators(query.organizationId);
  }

  private async getActiveLeaseCount(organizationId: string): Promise<number> {
    return prisma.lease.count({
      where: {
        organizationId,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      }
    });
  }

  private async getTotalAreaSum(whereClause: any): Promise<number> {
    const result = await prisma.property.aggregate({
      where: whereClause,
      _sum: { totalArea: true }
    });
    return result._sum.totalArea || 0;
  }

  private async getOccupiedSpacesCount(organizationId: string): Promise<number> {
    return prisma.space.count({
      where: {
        organizationId,
        status: 'OCCUPIED'
      }
    });
  }

  private async getAvailableSpacesCount(organizationId: string): Promise<number> {
    return prisma.space.count({
      where: {
        organizationId,
        status: 'AVAILABLE'
      }
    });
  }

  private async calculatePortfolioUtilizationRate(organizationId: string): Promise<number> {
    // Implementation for portfolio utilization rate
    return 0;
  }

  private async calculateTotalPortfolioValue(whereClause: any): Promise<number> {
    const result = await prisma.property.aggregate({
      where: whereClause,
      _sum: { currentValue: true }
    });
    return result._sum.currentValue || 0;
  }

  private async calculateMonthlyRevenue(organizationId: string): Promise<number> {
    // Implementation for monthly revenue calculation
    return 0;
  }

  private async calculateMonthlyExpenses(organizationId: string): Promise<number> {
    // Implementation for monthly expenses calculation
    return 0;
  }

  private async calculateNetOperatingIncome(organizationId: string): Promise<number> {
    const revenue = await this.calculateMonthlyRevenue(organizationId);
    const expenses = await this.calculateMonthlyExpenses(organizationId);
    return revenue - expenses;
  }

  private getTimeFrameStartDate(timeFrame: string): Date {
    const now = new Date();
    switch (timeFrame) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  private async calculateExecutiveKPIs(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    // Implementation for executive KPI calculations
    return {};
  }

  private async getPerformanceTrends(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any[]> {
    // Implementation for performance trends
    return [];
  }

  private async getCostAnalysisForExecutive(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    // Implementation for cost analysis
    return {};
  }

  private async getRiskAssessmentForExecutive(organizationId: string): Promise<any> {
    // Implementation for risk assessment
    return {};
  }

  private async getExecutiveRecommendations(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any[]> {
    // Implementation for executive recommendations
    return [];
  }

  private async calculateOccupancyTrend(organizationId: string): Promise<any> {
    // Implementation for occupancy trend calculation
    return { current: 0, trend: 'stable', changePercent: 0 };
  }

  private async calculateRevenueTrend(organizationId: string): Promise<any> {
    // Implementation for revenue trend calculation
    return { current: 0, trend: 'stable', changePercent: 0 };
  }

  private async calculateCostTrend(organizationId: string): Promise<any> {
    // Implementation for cost trend calculation
    return { current: 0, trend: 'stable', changePercent: 0 };
  }

  private async calculateUtilizationTrend(organizationId: string): Promise<any> {
    // Implementation for utilization trend calculation
    return { current: 0, trend: 'stable', changePercent: 0 };
  }

  private async getSustainabilityMetrics(organizationId: string): Promise<any> {
    // Implementation for sustainability metrics
    return {};
  }

  private async getComplianceStatus(organizationId: string): Promise<any> {
    // Implementation for compliance status
    return {};
  }

  private determineIndicatorStatus(changePercent: number, direction: 'higher_is_better' | 'lower_is_better'): string {
    const threshold = 5; // 5% change threshold
    
    if (Math.abs(changePercent) < threshold) {
      return 'stable';
    }
    
    if (direction === 'higher_is_better') {
      return changePercent > 0 ? 'positive' : 'negative';
    } else {
      return changePercent < 0 ? 'positive' : 'negative';
    }
  }

  private calculateOverallPerformanceScore(scores: number[]): number {
    const validScores = scores.filter(score => !isNaN(score));
    if (validScores.length === 0) {return 0;}
    
    const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    return Math.round(average * 100) / 100;
  }

  private async getLeaseExpirationAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    // Implementation for lease expiration alerts
    return [];
  }

  private async getOccupancyAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    // Implementation for occupancy alerts
    return [];
  }

  private async getMaintenanceAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    // Implementation for maintenance alerts
    return [];
  }

  private async getComplianceAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    // Implementation for compliance alerts
    return [];
  }

  private async getFinancialAnomalyAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    // Implementation for financial anomaly alerts
    return [];
  }

  private async getCurrentPortfolioMetrics(organizationId: string): Promise<any> {
    // Implementation for current portfolio metrics
    return {};
  }

  private async getIndustryBenchmarks(organizationId: string): Promise<any> {
    // Implementation for industry benchmarks
    return {};
  }

  private async getMarketBenchmarks(organizationId: string): Promise<any> {
    // Implementation for market benchmarks
    return {};
  }

  private async getInternalBenchmarks(organizationId: string): Promise<any> {
    // Implementation for internal benchmarks
    return {};
  }

  private calculateBenchmarkPerformance(current: number, benchmark: number, direction: string): number {
    if (benchmark === 0) {return 0;}
    
    const variance = ((current - benchmark) / benchmark) * 100;
    
    if (direction === 'higher_is_better') {
      return variance;
    } else {
      return -variance;
    }
  }

  private generateBenchmarkInsights(metrics: any): string[] {
    const insights: string[] = [];
    
    Object.entries(metrics).forEach(([key, metric]: [string, any]) => {
      if (metric.performance > 10) {
        insights.push(`${key} is performing ${metric.performance.toFixed(1)}% above benchmark`);
      } else if (metric.performance < -10) {
        insights.push(`${key} is performing ${Math.abs(metric.performance).toFixed(1)}% below benchmark`);
      }
    });
    
    return insights;
  }
}

// Type definitions
interface PortfolioQuery {
  organizationId: string;
  includeInactive?: boolean;
  propertyIds?: string[];
  buildingIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

interface PortfolioSummary {
  totalProperties: number;
  totalBuildings: number;
  totalFloors: number;
  totalSpaces: number;
  activeLeases: number;
  totalArea: number;
  occupiedSpaces: number;
  occupancyRate: number;
  averageSpacesPerBuilding: number;
  averageAreaPerProperty: number;
  utilizationRate: number;
  totalValue: number;
}

interface PortfolioDashboard {
  summary: PortfolioSummary;
  spaceMetrics: any;
  financialMetrics: any;
  utilizationTrends: any[];
  recentActivity: any[];
  alerts: any[];
  performanceIndicators: any;
  metadata: {
    generatedAt: Date;
    executionTimeMs: number;
    organizationId: string;
    includeInactive: boolean;
  };
}

interface ExecutiveDashboard {
  organizationId: string;
  timeFrame: string;
  generatedAt: Date;
  kpis: any;
  performanceTrends: any[];
  costAnalysis: any;
  riskAssessment: any;
  recommendations: any[];
  summary: {
    totalRevenue: number;
    totalCosts: number;
    netOperatingIncome: number;
    portfolioValue: number;
    occupancyRate: number;
    utilizationRate: number;
    costPerSqFt: number;
    revenuePerSqFt: number;
  };
}

interface PerformanceIndicators {
  occupancy: PerformanceIndicator;
  revenue: PerformanceIndicator;
  costs: PerformanceIndicator;
  utilization: PerformanceIndicator;
  sustainability: any;
  compliance: any;
  overallScore: number;
}

interface PerformanceIndicator {
  current: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  status: 'positive' | 'negative' | 'stable';
}

interface PortfolioAlert {
  id: string;
  type: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  createdAt: Date;
  propertyId?: string;
  buildingId?: string;
  actionRequired: boolean;
}

interface PortfolioBenchmarks {
  benchmarkType: 'industry' | 'market' | 'internal';
  generatedAt: Date;
  metrics: {
    occupancyRate: BenchmarkMetric;
    costPerSqFt: BenchmarkMetric;
    revenuePerSqFt: BenchmarkMetric;
    utilizationRate: BenchmarkMetric;
  };
  overallScore: number;
  insights: string[];
}

interface BenchmarkMetric {
  current: number;
  benchmark: number;
  variance: number;
  performance: number;
}