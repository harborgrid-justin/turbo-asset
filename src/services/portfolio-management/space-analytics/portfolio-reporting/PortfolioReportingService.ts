import { prisma } from '@/../../config/database';
import { logger } from '@/../../config/logger';

/**
 * Portfolio Reporting Service - Generate comprehensive reports for portfolio management
 * Handles report generation, scheduling, distribution, and customization
 * Part of the Portfolio Management domain within Turbo Asset IWMS
 */
export class PortfolioReportingService {

  /**
   * Generate comprehensive portfolio report
   */
  async generatePortfolioReport(
    organizationId: string,
    reportType: ReportType,
    options: ReportOptions
  ): Promise<PortfolioReport> {
    try {
      const startTime = Date.now();

      // Get report configuration
      const reportConfig = await this.getReportConfiguration(organizationId, reportType);
      const reportData = await this.gatherReportData(organizationId, reportType, options);

      // Generate report sections
      const sections = await this.generateReportSections(reportData, reportConfig, options);

      // Create report metadata
      const report: PortfolioReport = {
        id: this.generateReportId(),
        organizationId,
        reportType,
        title: this.getReportTitle(reportType, options),
        generatedAt: new Date(),
        generatedBy: options.generatedBy || 'SYSTEM',
        period: {
          start: options.startDate,
          end: options.endDate,
        },
        sections,
        summary: this.generateExecutiveSummary(reportData, sections),
        metadata: {
          version: '1.0',
          format: options.format || 'PDF',
          totalPages: this.calculateTotalPages(sections),
          executionTimeMs: Date.now() - startTime,
          dataAsOf: new Date(),
        },
        filters: options.filters || {},
        customizations: options.customizations || {},
      };

      // Save report to database
      await this.saveReportToDatabase(report);

      // Generate report file
      if (options.generateFile !== false) {
        report.filePath = await this.generateReportFile(report, options.format || 'PDF');
      }

      logger.info('Portfolio report generated', {
        reportId: report.id,
        organizationId,
        reportType,
        executionTime: report.metadata.executionTimeMs,
        totalPages: report.metadata.totalPages,
      });

      return report;

    } catch (error: unknown) {
      logger.error('Failed to generate portfolio report', {
        organizationId,
        reportType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummaryReport(
    organizationId: string,
    timeframe: 'monthly' | 'quarterly' | 'annual'
  ): Promise<ExecutiveSummaryReport> {
    try {
      const period = this.getReportingPeriod(timeframe);
      
      const [
        portfolioOverview,
        financialHighlights,
        performanceMetrics,
        keyInsights,
        riskFactors,
        recommendations,
        marketComparison
      ] = await Promise.all([
        this.getPortfolioOverview(organizationId, period),
        this.getFinancialHighlights(organizationId, period),
        this.getPerformanceMetrics(organizationId, period),
        this.getKeyInsights(organizationId, period),
        this.getRiskFactors(organizationId),
        this.getStrategicRecommendations(organizationId, period),
        this.getMarketComparison(organizationId, period)
      ]);

      const report: ExecutiveSummaryReport = {
        organizationId,
        timeframe,
        period,
        generatedAt: new Date(),
        portfolioOverview,
        financialHighlights,
        performanceMetrics,
        keyInsights,
        riskFactors,
        recommendations,
        marketComparison,
        executiveHighlights: this.generateExecutiveHighlights([
          portfolioOverview,
          financialHighlights,
          performanceMetrics
        ]),
      };

      return report;

    } catch (error: unknown) {
      logger.error('Failed to generate executive summary report', {
        organizationId,
        timeframe,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate lease expiration report
   */
  async generateLeaseExpirationReport(
    organizationId: string,
    lookaheadMonths: number = 12
  ): Promise<LeaseExpirationReport> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() + lookaheadMonths);

      // Get expiring leases
      const expiringLeases = await prisma.lease.findMany({
        where: {
          organizationId,
          endDate: {
            gte: new Date(),
            lte: cutoffDate,
          },
          status: 'ACTIVE',
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              creditRating: true,
            }
          },
          space: {
            select: {
              id: true,
              name: true,
              area: true,
              floor: {
                select: {
                  name: true,
                  building: {
                    select: {
                      name: true,
                      property: {
                        select: {
                          name: true,
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { endDate: 'asc' },
      });

      // Categorize leases by time to expiration
      const now = new Date();
      const categorizedLeases = {
        immediate: expiringLeases.filter(lease => {
          const daysToExpiration = Math.ceil((lease.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysToExpiration <= 30;
        }),
        within3Months: expiringLeases.filter(lease => {
          const daysToExpiration = Math.ceil((lease.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysToExpiration > 30 && daysToExpiration <= 90;
        }),
        within6Months: expiringLeases.filter(lease => {
          const daysToExpiration = Math.ceil((lease.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysToExpiration > 90 && daysToExpiration <= 180;
        }),
        within12Months: expiringLeases.filter(lease => {
          const daysToExpiration = Math.ceil((lease.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysToExpiration > 180 && daysToExpiration <= 365;
        }),
      };

      // Calculate financial impact
      const financialImpact = {
        totalRentalIncome: expiringLeases.reduce((sum, lease) => sum + (lease.monthlyRent * 12), 0),
        immediateRisk: categorizedLeases.immediate.reduce((sum, lease) => sum + (lease.monthlyRent * 12), 0),
        nearTermRisk: categorizedLeases.within3Months.reduce((sum, lease) => sum + (lease.monthlyRent * 12), 0),
      };

      // Generate renewal probabilities and recommendations
      const leaseAnalysis = expiringLeases.map(lease => {
        const renewalProbability = this.calculateRenewalProbability(lease);
        const recommendation = this.generateLeaseRecommendation(lease, renewalProbability);
        
        return {
          leaseId: lease.id,
          tenantName: lease.tenant.name,
          spaceName: lease.space.name,
          location: `${lease.space.floor.building.property.name} - ${lease.space.floor.building.name}`,
          expirationDate: lease.expirationDate,
          monthlyRent: lease.monthlyRent,
          area: lease.space.area,
          renewalProbability,
          recommendation,
          actionItems: this.generateActionItems(lease, renewalProbability),
          daysToExpiration: Math.ceil((lease.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        };
      });

      const report: LeaseExpirationReport = {
        organizationId,
        generatedAt: new Date(),
        lookaheadMonths,
        cutoffDate,
        totalExpiringLeases: expiringLeases.length,
        categorizedLeases,
        financialImpact,
        leaseAnalysis,
        summary: {
          highRiskLeases: leaseAnalysis.filter(l => l.renewalProbability < 0.3).length,
          mediumRiskLeases: leaseAnalysis.filter(l => l.renewalProbability >= 0.3 && l.renewalProbability < 0.7).length,
          lowRiskLeases: leaseAnalysis.filter(l => l.renewalProbability >= 0.7).length,
          totalAreaAtRisk: leaseAnalysis.reduce((sum, l) => sum + l.area, 0),
          averageRenewalProbability: leaseAnalysis.reduce((sum, l) => sum + l.renewalProbability, 0) / leaseAnalysis.length,
        },
        recommendations: this.generatePortfolioLeaseRecommendations(leaseAnalysis),
      };

      return report;

    } catch (error: unknown) {
      logger.error('Failed to generate lease expiration report', {
        organizationId,
        lookaheadMonths,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate occupancy analytics report
   */
  async generateOccupancyAnalyticsReport(
    organizationId: string,
    timeframe: 'monthly' | 'quarterly' | 'annual'
  ): Promise<OccupancyAnalyticsReport> {
    try {
      const period = this.getReportingPeriod(timeframe);
      
      // Get occupancy data
      const occupancyData = await this.getOccupancyData(organizationId, period);
      const trends = await this.getOccupancyTrends(organizationId, period);
      const byProperty = await this.getOccupancyByProperty(organizationId, period);
      const bySpaceType = await this.getOccupancyBySpaceType(organizationId, period);
      const utilization = await this.getSpaceUtilizationData(organizationId, period);

      // Calculate key metrics
      const metrics = {
        currentOccupancyRate: occupancyData.currentOccupancyRate,
        averageOccupancyRate: occupancyData.averageOccupancyRate,
        occupancyTrend: trends.overallTrend,
        bestPerformingProperty: byProperty.sort((a, b) => b.occupancyRate - a.occupancyRate)[0],
        worstPerformingProperty: byProperty.sort((a, b) => a.occupancyRate - b.occupancyRate)[0],
        totalOccupiedSpace: occupancyData.totalOccupiedSpace,
        totalAvailableSpace: occupancyData.totalAvailableSpace,
        averageLeaseLength: occupancyData.averageLeaseLength,
      };

      // Generate insights and recommendations
      const insights = this.generateOccupancyInsights(occupancyData, trends, byProperty);
      const recommendations = this.generateOccupancyRecommendations(metrics, insights);

      const report: OccupancyAnalyticsReport = {
        organizationId,
        timeframe,
        period,
        generatedAt: new Date(),
        occupancyData,
        trends,
        byProperty,
        bySpaceType,
        utilization,
        metrics,
        insights,
        recommendations,
        charts: this.generateOccupancyChartData(occupancyData, trends, byProperty),
      };

      return report;

    } catch (error: unknown) {
      logger.error('Failed to generate occupancy analytics report', {
        organizationId,
        timeframe,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate scheduled reports
   */
  async generateScheduledReports(organizationId: string): Promise<ScheduledReportResult[]> {
    try {
      // Get all scheduled reports for the organization
      const scheduledReports = await prisma.scheduledReport.findMany({
        where: {
          organizationId,
          isActive: true,
          nextRunDate: { lte: new Date() },
        },
        include: {
          recipients: true,
        }
      });

      const results: ScheduledReportResult[] = [];

      for (const scheduledReport of scheduledReports) {
        try {
          // Generate the report
          const report = await this.generatePortfolioReport(
            organizationId,
            scheduledReport.reportType as ReportType,
            {
              startDate: this.calculateReportStartDate(scheduledReport.frequency),
              endDate: new Date(),
              format: scheduledReport.format as ReportFormat,
              generatedBy: 'SCHEDULED_SYSTEM',
            }
          );

          // Distribute the report
          await this.distributeReport(report, scheduledReport.recipients);

          // Update next run date
          await this.updateNextRunDate(scheduledReport.id, scheduledReport.frequency);

          results.push({
            scheduledReportId: scheduledReport.id,
            reportId: report.id,
            status: 'SUCCESS',
            generatedAt: report.generatedAt,
            recipientCount: scheduledReport.recipients.length,
          });

          logger.info('Scheduled report generated successfully', {
            scheduledReportId: scheduledReport.id,
            reportId: report.id,
            reportType: scheduledReport.reportType,
          });

        } catch (error: unknown) {
          results.push({
            scheduledReportId: scheduledReport.id,
            reportId: null,
            status: 'FAILED',
            error: error.message,
            generatedAt: new Date(),
            recipientCount: 0,
          });

          logger.error('Failed to generate scheduled report', {
            scheduledReportId: scheduledReport.id,
            reportType: scheduledReport.reportType,
            error: error.message,
          });
        }
      }

      return results;

    } catch (error: unknown) {
      logger.error('Failed to generate scheduled reports', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get report history
   */
  async getReportHistory(
    organizationId: string,
    filters?: ReportHistoryFilters
  ): Promise<ReportHistoryItem[]> {
    try {
      const whereClause: any = { organizationId };

      if (filters?.reportType) {
        whereClause.reportType = filters.reportType;
      }

      if (filters?.generatedBy) {
        whereClause.generatedBy = filters.generatedBy;
      }

      if (filters?.startDate || filters?.endDate) {
        whereClause.generatedAt = {};
        if (filters.startDate) {whereClause.generatedAt.gte = filters.startDate;}
        if (filters.endDate) {whereClause.generatedAt.lte = filters.endDate;}
      }

      const reports = await prisma.portfolioReport.findMany({
        where: whereClause,
        select: {
          id: true,
          reportType: true,
          title: true,
          generatedAt: true,
          generatedBy: true,
          filePath: true,
          metadata: true,
        },
        orderBy: { generatedAt: 'desc' },
        take: filters?.limit || 50,
      });

      return reports.map(report => ({
        id: report.id,
        reportType: report.reportType,
        title: report.title,
        generatedAt: report.generatedAt,
        generatedBy: report.generatedBy,
        filePath: report.filePath,
        fileSize: this.getFileSize(report.filePath),
        downloadCount: this.getDownloadCount(report.id),
        metadata: report.metadata,
      }));

    } catch (error: unknown) {
      logger.error('Failed to get report history', {
        organizationId,
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async getReportConfiguration(organizationId: string, reportType: ReportType): Promise<any> {
    // Get organization-specific report configuration
    return {};
  }

  private async gatherReportData(organizationId: string, reportType: ReportType, options: ReportOptions): Promise<any> {
    // Gather all necessary data for the report
    return {};
  }

  private async generateReportSections(reportData: any, reportConfig: any, options: ReportOptions): Promise<ReportSection[]> {
    // Generate report sections based on report type and configuration
    return [];
  }

  private getReportTitle(reportType: ReportType, options: ReportOptions): string {
    const titles = {
      PORTFOLIO_OVERVIEW: 'Portfolio Overview Report',
      FINANCIAL_SUMMARY: 'Financial Summary Report',
      LEASE_EXPIRATION: 'Lease Expiration Report',
      OCCUPANCY_ANALYTICS: 'Occupancy Analytics Report',
      MAINTENANCE_SUMMARY: 'Maintenance Summary Report',
      EXECUTIVE_DASHBOARD: 'Executive Dashboard Report',
    };

    return titles[reportType] || 'Portfolio Report';
  }

  private generateExecutiveSummary(reportData: any, sections: ReportSection[]): ExecutiveSummary {
    // Generate executive summary from report data and sections
    return {
      keyFindings: [],
      criticalActions: [],
      performanceHighlights: [],
      riskAlerts: [],
    };
  }

  private calculateTotalPages(sections: ReportSection[]): number {
    return sections.reduce((total, section) => total + (section.pageCount || 1), 0);
  }

  private generateReportId(): string {
    return `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveReportToDatabase(report: PortfolioReport): Promise<void> {
    await prisma.portfolioReport.create({
      data: {
        id: report.id,
        organizationId: report.organizationId,
        reportType: report.reportType,
        title: report.title,
        generatedAt: report.generatedAt,
        generatedBy: report.generatedBy,
        metadata: report.metadata,
        filePath: report.filePath,
      },
    });
  }

  private async generateReportFile(report: PortfolioReport, format: ReportFormat): Promise<string> {
    // Generate report file in specified format
    const fileName = `${report.id}.${format.toLowerCase()}`;
    const filePath = `reports/${report.organizationId}/${fileName}`;
    
    // File generation logic would go here
    
    return filePath;
  }

  private getReportingPeriod(timeframe: string): ReportingPeriod {
    const now = new Date();
    
    switch (timeframe) {
      case 'monthly':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
        };
      case 'quarterly':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3 - 3;
        return {
          start: new Date(now.getFullYear(), quarterStart, 1),
          end: new Date(now.getFullYear(), quarterStart + 3, 0),
        };
      case 'annual':
        return {
          start: new Date(now.getFullYear() - 1, 0, 1),
          end: new Date(now.getFullYear() - 1, 11, 31),
        };
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
        };
    }
  }

  private async getPortfolioOverview(organizationId: string, period: ReportingPeriod): Promise<any> {
    // Get portfolio overview data
    return {};
  }

  private async getFinancialHighlights(organizationId: string, period: ReportingPeriod): Promise<any> {
    // Get financial highlights
    return {};
  }

  private async getPerformanceMetrics(organizationId: string, period: ReportingPeriod): Promise<any> {
    // Get performance metrics
    return {};
  }

  private async getKeyInsights(organizationId: string, period: ReportingPeriod): Promise<string[]> {
    // Generate key insights
    return [];
  }

  private async getRiskFactors(organizationId: string): Promise<string[]> {
    // Identify risk factors
    return [];
  }

  private async getStrategicRecommendations(organizationId: string, period: ReportingPeriod): Promise<string[]> {
    // Generate strategic recommendations
    return [];
  }

  private async getMarketComparison(organizationId: string, period: ReportingPeriod): Promise<any> {
    // Get market comparison data
    return {};
  }

  private generateExecutiveHighlights(data: any[]): string[] {
    // Generate executive highlights from data
    return [];
  }

  private calculateRenewalProbability(lease: any): number {
    // Calculate probability of lease renewal based on various factors
    const probability = 0.5; // Base probability
    
    // Adjust based on lease history, tenant credit rating, market conditions, etc.
    
    return Math.min(Math.max(probability, 0), 1);
  }

  private generateLeaseRecommendation(lease: any, renewalProbability: number): string {
    if (renewalProbability < 0.3) {
      return 'HIGH_RISK - Begin marketing space immediately';
    } else if (renewalProbability < 0.7) {
      return 'MEDIUM_RISK - Initiate renewal discussions';
    } else {
      return 'LOW_RISK - Monitor and prepare renewal terms';
    }
  }

  private generateActionItems(lease: any, renewalProbability: number): string[] {
    const items = [];
    
    if (renewalProbability < 0.5) {
      items.push('Schedule tenant meeting to discuss renewal');
      items.push('Begin marketing the space to prospective tenants');
      items.push('Review competitive rental rates in the area');
    }
    
    return items;
  }

  private generatePortfolioLeaseRecommendations(leaseAnalysis: any[]): string[] {
    const recommendations = [];
    
    const highRiskCount = leaseAnalysis.filter(l => l.renewalProbability < 0.3).length;
    if (highRiskCount > 0) {
      recommendations.push(`Immediately focus on ${highRiskCount} high-risk lease renewals`);
    }
    
    return recommendations;
  }

  private async getOccupancyData(organizationId: string, period: ReportingPeriod): Promise<any> {
    // Get occupancy data for the specified period
    return {};
  }

  private async getOccupancyTrends(organizationId: string, period: ReportingPeriod): Promise<any> {
    // Get occupancy trends
    return {};
  }

  private async getOccupancyByProperty(organizationId: string, period: ReportingPeriod): Promise<any[]> {
    // Get occupancy data by property
    return [];
  }

  private async getOccupancyBySpaceType(organizationId: string, period: ReportingPeriod): Promise<any[]> {
    // Get occupancy data by space type
    return [];
  }

  private async getSpaceUtilizationData(organizationId: string, period: ReportingPeriod): Promise<any> {
    // Get space utilization data
    return {};
  }

  private generateOccupancyInsights(occupancyData: any, trends: any, byProperty: any[]): string[] {
    // Generate insights from occupancy data
    return [];
  }

  private generateOccupancyRecommendations(metrics: any, insights: string[]): string[] {
    // Generate recommendations based on occupancy metrics and insights
    return [];
  }

  private generateOccupancyChartData(occupancyData: any, trends: any, byProperty: any[]): any {
    // Generate chart data for occupancy visualization
    return {};
  }

  private calculateReportStartDate(frequency: string): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'DAILY':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case 'QUARTERLY':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private async distributeReport(report: PortfolioReport, recipients: any[]): Promise<void> {
    // Distribute report to recipients via email or other channels
    for (const recipient of recipients) {
      // Send report to recipient
    }
  }

  private async updateNextRunDate(scheduledReportId: string, frequency: string): Promise<void> {
    const nextRunDate = this.calculateNextRunDate(frequency);
    
    await prisma.scheduledReport.update({
      where: { id: scheduledReportId },
      data: { nextRunDate },
    });
  }

  private calculateNextRunDate(frequency: string): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'DAILY':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'QUARTERLY':
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private getFileSize(filePath: string | null): number {
    // Get file size in bytes
    return 0;
  }

  private getDownloadCount(reportId: string): number {
    // Get download count from database
    return 0;
  }
}

// Type definitions
type ReportType = 'PORTFOLIO_OVERVIEW' | 'FINANCIAL_SUMMARY' | 'LEASE_EXPIRATION' | 'OCCUPANCY_ANALYTICS' | 'MAINTENANCE_SUMMARY' | 'EXECUTIVE_DASHBOARD';
type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'HTML';

interface ReportOptions {
  startDate?: Date;
  endDate?: Date;
  format?: ReportFormat;
  generatedBy?: string;
  filters?: any;
  customizations?: any;
  generateFile?: boolean;
}

interface PortfolioReport {
  id: string;
  organizationId: string;
  reportType: ReportType;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  period: {
    start?: Date;
    end?: Date;
  };
  sections: ReportSection[];
  summary: ExecutiveSummary;
  metadata: {
    version: string;
    format: ReportFormat;
    totalPages: number;
    executionTimeMs: number;
    dataAsOf: Date;
  };
  filters: any;
  customizations: any;
  filePath?: string;
}

interface ReportSection {
  id: string;
  title: string;
  content: any;
  pageCount?: number;
  charts?: any[];
  tables?: any[];
}

interface ExecutiveSummary {
  keyFindings: string[];
  criticalActions: string[];
  performanceHighlights: string[];
  riskAlerts: string[];
}

interface ExecutiveSummaryReport {
  organizationId: string;
  timeframe: string;
  period: ReportingPeriod;
  generatedAt: Date;
  portfolioOverview: any;
  financialHighlights: any;
  performanceMetrics: any;
  keyInsights: string[];
  riskFactors: string[];
  recommendations: string[];
  marketComparison: any;
  executiveHighlights: string[];
}

interface LeaseExpirationReport {
  organizationId: string;
  generatedAt: Date;
  lookaheadMonths: number;
  cutoffDate: Date;
  totalExpiringLeases: number;
  categorizedLeases: any;
  financialImpact: any;
  leaseAnalysis: any[];
  summary: any;
  recommendations: string[];
}

interface OccupancyAnalyticsReport {
  organizationId: string;
  timeframe: string;
  period: ReportingPeriod;
  generatedAt: Date;
  occupancyData: any;
  trends: any;
  byProperty: any[];
  bySpaceType: any[];
  utilization: any;
  metrics: any;
  insights: string[];
  recommendations: string[];
  charts: any;
}

interface ReportingPeriod {
  start: Date;
  end: Date;
}

interface ScheduledReportResult {
  scheduledReportId: string;
  reportId: string | null;
  status: 'SUCCESS' | 'FAILED';
  generatedAt: Date;
  recipientCount: number;
  error?: string;
}

interface ReportHistoryFilters {
  reportType?: ReportType;
  generatedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface ReportHistoryItem {
  id: string;
  reportType: string;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  filePath: string | null;
  fileSize: number;
  downloadCount: number;
  metadata: any;
}