/**
 * Reporting Service - Advanced Domain Sub-Service
 * 
 * Comprehensive reporting engine providing template management, report generation,
 * scheduling, executive dashboards, and benchmarking capabilities.
 * Refactored from flat ReportingService.ts into domain architecture.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../../config/logger';
import { prisma } from '../../../../../config/database';
import cron from 'node-cron';
import {
  AdvancedOperationsContext,
  ReportTemplate,
  ReportParameter,
  ReportScheduleConfig,
  ExecutiveDashboardMetrics,
  BenchmarkingData,
} from './types';
import {
  ADVANCED_OPERATIONS_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CACHE_KEYS,
  EVENT_TYPES,
} from './constants';

export class ReportingService extends EventEmitter {
  private context: AdvancedOperationsContext;
  private schedulerInitialized: boolean = false;
  private reportQueue: Map<string, any> = new Map();

  constructor(context: AdvancedOperationsContext) {
    super();
    this.context = context;
    this.initializeScheduler();
  }

  /**
   * Create a new report template
   */
  async createReportTemplate(template: Omit<ReportTemplate, 'id'>): Promise<string> {
    try {
      this.validateReportTemplate(template);

      const result = await prisma.reportTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          category: template.category,
          type: template.type,
          dataSource: template.dataSource as any,
          parameters: template.parameters as any,
          layout: template.layout as any,
          scheduling: template.scheduling as any,
          permissions: template.permissions as any,
          isPublic: template.isPublic,
          organizationId: this.context.organizationId,
          createdBy: this.context.userId,
        },
      });

      logger.info('Report template created', { 
        id: result.id, 
        name: template.name,
        organizationId: this.context.organizationId 
      });

      return result.id;
    } catch (error: unknown) {
      logger.error('Failed to create report template', error);
      throw error;
    }
  }

  /**
   * Generate a report from template
   */
  async generateReport(
    templateId: string,
    parameters: Record<string, any> = {},
    format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON' = 'PDF'
  ): Promise<{
    reportId: string;
    downloadUrl: string;
    expiresAt: Date;
  }> {
    try {
      const template = await this.getReportTemplate(templateId);
      if (!template) {
        throw new Error(ERROR_MESSAGES.REPORT_TEMPLATE_NOT_FOUND);
      }

      // Validate parameters
      this.validateReportParameters(template.parameters, parameters);

      // Generate unique report ID
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Queue report generation
      this.reportQueue.set(reportId, {
        templateId,
        parameters,
        format,
        status: 'QUEUED',
        createdAt: new Date(),
        organizationId: this.context.organizationId,
        userId: this.context.userId,
      });

      // Start generation process
      this.processReportGeneration(reportId);

      // Create report record
      const report = await prisma.generatedReport.create({
        data: {
          id: reportId,
          templateId,
          parameters: parameters as any,
          format,
          status: 'GENERATING',
          organizationId: this.context.organizationId,
          generatedBy: this.context.userId,
        },
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      logger.info('Report generation started', { 
        reportId, 
        templateId,
        format 
      });

      this.emit(EVENT_TYPES.REPORT_GENERATION_STARTED, {
        reportId,
        templateId,
        organizationId: this.context.organizationId,
        userId: this.context.userId,
        timestamp: new Date(),
      });

      return {
        reportId,
        downloadUrl: `/api/v1/reports/${reportId}/download`,
        expiresAt,
      };
    } catch (error: unknown) {
      logger.error('Failed to generate report', error);
      throw error;
    }
  }

  /**
   * Get report template
   */
  async getReportTemplate(templateId: string): Promise<ReportTemplate | null> {
    try {
      const template = await prisma.reportTemplate.findUnique({
        where: { 
          id: templateId,
          organizationId: this.context.organizationId 
        }
      });

      if (!template) {
        return null;
      }

      return {
        id: template.id,
        name: template.name,
        description: template.description || undefined,
        category: template.category as any,
        type: template.type as any,
        dataSource: template.dataSource as any,
        parameters: template.parameters as any,
        layout: template.layout as any,
        scheduling: template.scheduling as any,
        permissions: template.permissions as any,
        createdBy: template.createdBy,
        isPublic: template.isPublic,
      };
    } catch (error: unknown) {
      logger.error('Failed to get report template', error);
      throw error;
    }
  }

  /**
   * Schedule a report
   */
  async scheduleReport(
    templateId: string,
    schedule: ReportScheduleConfig,
    parameters: Record<string, any> = {}
  ): Promise<string> {
    try {
      const template = await this.getReportTemplate(templateId);
      if (!template) {
        throw new Error(ERROR_MESSAGES.REPORT_TEMPLATE_NOT_FOUND);
      }

      const result = await prisma.reportSchedule.create({
        data: {
          templateId,
          schedule: schedule as any,
          parameters: parameters as any,
          isActive: true,
          organizationId: this.context.organizationId,
          createdBy: this.context.userId,
        },
      });

      // Set up cron job for scheduled report
      this.setupScheduledReport(result.id, schedule);

      logger.info('Report scheduled', { 
        scheduleId: result.id, 
        templateId,
        frequency: schedule.frequency 
      });

      this.emit(EVENT_TYPES.REPORT_SCHEDULED, {
        scheduleId: result.id,
        templateId,
        frequency: schedule.frequency,
        timestamp: new Date(),
      });

      return result.id;
    } catch (error: unknown) {
      logger.error('Failed to schedule report', error);
      throw error;
    }
  }

  /**
   * Get executive dashboard metrics
   */
  async getExecutiveDashboardMetrics(): Promise<ExecutiveDashboardMetrics> {
    try {
      const [portfolioData, occupancyData, noiData, costData, maintenanceData, sustainabilityData] = 
        await Promise.all([
          this.getPortfolioValue(),
          this.getOccupancyRate(),
          this.getNOIData(),
          this.getCostPerSqft(),
          this.getMaintenanceKPIs(),
          this.getSustainabilityMetrics(),
        ]);

      const metrics: ExecutiveDashboardMetrics = {
        portfolioValue: portfolioData,
        occupancyRate: occupancyData,
        noi: noiData,
        costPerSqft: costData,
        maintenanceKPIs: maintenanceData,
        sustainabilityMetrics: sustainabilityData,
      };

      return metrics;
    } catch (error: unknown) {
      logger.error('Failed to get executive dashboard metrics', error);
      throw error;
    }
  }

  /**
   * Get benchmarking data
   */
  async getBenchmarkingData(metrics: string[]): Promise<BenchmarkingData[]> {
    try {
      const benchmarkData: BenchmarkingData[] = [];

      for (const metric of metrics) {
        const data = await this.getBenchmarkForMetric(metric);
        if (data) {
          benchmarkData.push(data);
        }
      }

      return benchmarkData;
    } catch (error: unknown) {
      logger.error('Failed to get benchmarking data', error);
      throw error;
    }
  }

  /**
   * Get report history
   */
  async getReportHistory(limit: number = 50): Promise<any[]> {
    try {
      const reports = await prisma.generatedReport.findMany({
        where: {
          organizationId: this.context.organizationId,
        },
        include: {
          template: true,
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
      });

      return reports.map(report => ({
        id: report.id,
        templateName: report.template.name,
        format: report.format,
        status: report.status,
        createdAt: report.createdAt,
        completedAt: report.completedAt,
        downloadUrl: report.status === 'COMPLETED' ? `/api/v1/reports/${report.id}/download` : null,
        errorMessage: report.errorMessage,
      }));
    } catch (error: unknown) {
      logger.error('Failed to get report history', error);
      throw error;
    }
  }

  /**
   * Get report analytics
   */
  async getReportAnalytics(): Promise<{
    totalGenerated: number;
    generationSuccess: number;
    averageGenerationTime: number;
    mostUsedTemplates: Array<{ templateId: string; templateName: string; count: number }>;
    formatDistribution: Record<string, number>;
  }> {
    try {
      const [totalGenerated, successCount, avgTime, topTemplates, formatDist] = await Promise.all([
        this.getTotalGeneratedCount(),
        this.getSuccessfulGenerationCount(),
        this.getAverageGenerationTime(),
        this.getMostUsedTemplates(),
        this.getFormatDistribution(),
      ]);

      return {
        totalGenerated,
        generationSuccess: successCount,
        averageGenerationTime: avgTime,
        mostUsedTemplates: topTemplates,
        formatDistribution: formatDist,
      };
    } catch (error: unknown) {
      logger.error('Failed to get report analytics', error);
      throw error;
    }
  }

  // Private methods

  private validateReportTemplate(template: Omit<ReportTemplate, 'id'>): void {
    if (!template.name || template.name.length < 3) {
      throw new Error('Report template name must be at least 3 characters');
    }

    if (!template.category || !ADVANCED_OPERATIONS_CONFIG.REPORTING.REPORT_CATEGORIES.includes(template.category)) {
      throw new Error('Invalid report category');
    }

    if (!template.type || !ADVANCED_OPERATIONS_CONFIG.REPORTING.REPORT_TYPES.includes(template.type)) {
      throw new Error('Invalid report type');
    }

    if (!template.dataSource || !template.dataSource.type) {
      throw new Error('Data source must be specified');
    }
  }

  private validateReportParameters(
    templateParams: ReportParameter[], 
    providedParams: Record<string, any>
  ): void {
    for (const param of templateParams) {
      if (param.required && !(param.name in providedParams)) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      if (param.name in providedParams) {
        const value = providedParams[param.name];
        
        // Basic type validation
        switch (param.type) {
          case 'NUMBER':
            if (typeof value !== 'number') {
              throw new Error(`Parameter '${param.name}' must be a number`);
            }
            break;
          case 'BOOLEAN':
            if (typeof value !== 'boolean') {
              throw new Error(`Parameter '${param.name}' must be a boolean`);
            }
            break;
          case 'DATE':
            if (!(value instanceof Date) && !Date.parse(value)) {
              throw new Error(`Parameter '${param.name}' must be a valid date`);
            }
            break;
        }
      }
    }
  }

  private async processReportGeneration(reportId: string): Promise<void> {
    try {
      const reportData = this.reportQueue.get(reportId);
      if (!reportData) return;

      // Update status to generating
      await prisma.generatedReport.update({
        where: { id: reportId },
        data: { 
          status: 'GENERATING',
          startedAt: new Date(),
        }
      });

      // Simulate report generation (in real implementation, this would query data sources)
      const generationTime = Math.random() * 10000 + 5000; // 5-15 seconds
      await new Promise(resolve => setTimeout(resolve, generationTime));

      // In real implementation, generate actual report content here
      const reportContent = await this.generateReportContent(reportData);

      // Update status to completed
      await prisma.generatedReport.update({
        where: { id: reportId },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date(),
          filePath: `/reports/${reportId}.${reportData.format.toLowerCase()}`,
          fileSize: Math.floor(Math.random() * 1000000) + 100000, // Random size
        }
      });

      // Clean up queue
      this.reportQueue.delete(reportId);

      logger.info('Report generation completed', { 
        reportId, 
        generationTime: generationTime / 1000 
      });

      this.emit(EVENT_TYPES.REPORT_GENERATED, {
        reportId,
        generationTime,
        timestamp: new Date(),
      });
    } catch (error: unknown) {
      // Update status to failed
      await prisma.generatedReport.update({
        where: { id: reportId },
        data: { 
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        }
      });

      this.reportQueue.delete(reportId);

      logger.error('Report generation failed', { reportId, error });

      this.emit(EVENT_TYPES.REPORT_GENERATION_FAILED, {
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  private async generateReportContent(reportData: any): Promise<Buffer> {
    // Placeholder implementation - in real system would generate actual report
    const content = JSON.stringify({
      reportId: reportData.reportId,
      templateId: reportData.templateId,
      parameters: reportData.parameters,
      generatedAt: new Date(),
      data: {
        placeholder: true,
        message: 'This is a placeholder report content'
      }
    }, null, 2);

    return Buffer.from(content, 'utf-8');
  }

  private setupScheduledReport(scheduleId: string, schedule: ReportScheduleConfig): void {
    let cronPattern: string;

    switch (schedule.frequency) {
      case 'HOURLY':
        cronPattern = '0 * * * *';
        break;
      case 'DAILY':
        cronPattern = '0 8 * * *'; // 8 AM daily
        break;
      case 'WEEKLY':
        cronPattern = '0 8 * * 1'; // 8 AM Monday
        break;
      case 'MONTHLY':
        cronPattern = '0 8 1 * *'; // 8 AM first day of month
        break;
      case 'QUARTERLY':
        cronPattern = '0 8 1 1,4,7,10 *'; // 8 AM first day of quarter
        break;
      case 'YEARLY':
        cronPattern = '0 8 1 1 *'; // 8 AM January 1st
        break;
      case 'CUSTOM':
        cronPattern = schedule.cronPattern || '0 8 * * *';
        break;
      default:
        cronPattern = '0 8 * * *';
    }

    cron.schedule(cronPattern, async () => {
      await this.executeScheduledReport(scheduleId);
    });
  }

  private async executeScheduledReport(scheduleId: string): Promise<void> {
    try {
      const schedule = await prisma.reportSchedule.findUnique({
        where: { id: scheduleId },
        include: { template: true }
      });

      if (!schedule || !schedule.isActive) {
        return;
      }

      // Generate the report
      const result = await this.generateReport(
        schedule.templateId,
        schedule.parameters as any,
        schedule.schedule.format as any
      );

      // Send to recipients if configured
      if (schedule.schedule.recipients && schedule.schedule.recipients.length > 0) {
        await this.deliverReport(result.reportId, schedule.schedule.recipients, schedule.schedule.deliveryMethod);
      }

      logger.info('Scheduled report executed', { 
        scheduleId, 
        reportId: result.reportId 
      });
    } catch (error: unknown) {
      logger.error('Failed to execute scheduled report', { scheduleId, error });
    }
  }

  private async deliverReport(
    reportId: string, 
    recipients: any[], 
    deliveryMethod: string
  ): Promise<void> {
    // Placeholder implementation for report delivery
    logger.info('Report delivered', { 
      reportId, 
      recipients: recipients.length,
      deliveryMethod 
    });

    this.emit(EVENT_TYPES.REPORT_DELIVERED, {
      reportId,
      recipients: recipients.length,
      deliveryMethod,
      timestamp: new Date(),
    });
  }

  private initializeScheduler(): void {
    if (this.schedulerInitialized) return;

    // Cleanup old reports daily
    cron.schedule('0 3 * * *', async () => {
      await this.cleanupOldReports();
    });

    this.schedulerInitialized = true;
  }

  private async cleanupOldReports(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ADVANCED_OPERATIONS_CONFIG.REPORTING.RETENTION_DAYS);

      await prisma.generatedReport.deleteMany({
        where: {
          organizationId: this.context.organizationId,
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info('Old reports cleaned up', { 
        cutoffDate,
        organizationId: this.context.organizationId 
      });
    } catch (error: unknown) {
      logger.error('Failed to cleanup old reports', error);
    }
  }

  // Dashboard data methods

  private async getPortfolioValue(): Promise<ExecutiveDashboardMetrics['portfolioValue']> {
    // Mock data - in real implementation would query actual portfolio data
    return {
      total: 150000000, // $150M
      trend: { value: 5.2, direction: 'up', period: '30 days' },
    };
  }

  private async getOccupancyRate(): Promise<ExecutiveDashboardMetrics['occupancyRate']> {
    return {
      current: 0.92, // 92%
      target: 0.95, // 95%
      trend: { value: 2.1, direction: 'up', period: '30 days' },
    };
  }

  private async getNOIData(): Promise<ExecutiveDashboardMetrics['noi']> {
    return {
      current: 12500000, // $12.5M
      budgeted: 12000000, // $12M
      variance: 4.2, // 4.2% positive variance
      trend: { value: 3.5, direction: 'up', period: '90 days' },
    };
  }

  private async getCostPerSqft(): Promise<ExecutiveDashboardMetrics['costPerSqft']> {
    return {
      current: 15.25,
      benchmark: 16.50,
      variance: -7.6, // 7.6% below benchmark (good)
    };
  }

  private async getMaintenanceKPIs(): Promise<ExecutiveDashboardMetrics['maintenanceKPIs']> {
    return {
      completionRate: 0.94, // 94%
      avgResponseTime: 4.5, // 4.5 hours
      budgetVariance: -2.3, // 2.3% under budget
    };
  }

  private async getSustainabilityMetrics(): Promise<ExecutiveDashboardMetrics['sustainabilityMetrics']> {
    return {
      energyEfficiency: 0.87, // 87% efficiency
      carbonFootprint: 1250, // metric tons CO2
      sustainabilityScore: 0.82, // 82% sustainability score
    };
  }

  private async getBenchmarkForMetric(metric: string): Promise<BenchmarkingData | null> {
    // Mock benchmarking data - in real implementation would query industry databases
    const mockBenchmarks: Record<string, BenchmarkingData> = {
      occupancy: {
        metric: 'Occupancy Rate',
        currentValue: 0.92,
        industryAverage: 0.88,
        percentile: 75,
        trend: 'improving',
        benchmark: 'above',
      },
      noi: {
        metric: 'Net Operating Income',
        currentValue: 12500000,
        industryAverage: 11800000,
        percentile: 68,
        trend: 'improving',
        benchmark: 'above',
      },
      cost_per_sqft: {
        metric: 'Cost per Square Foot',
        currentValue: 15.25,
        industryAverage: 16.50,
        percentile: 72,
        trend: 'stable',
        benchmark: 'below',
      },
    };

    return mockBenchmarks[metric] || null;
  }

  // Analytics methods

  private async getTotalGeneratedCount(): Promise<number> {
    return await prisma.generatedReport.count({
      where: {
        organizationId: this.context.organizationId,
      }
    });
  }

  private async getSuccessfulGenerationCount(): Promise<number> {
    return await prisma.generatedReport.count({
      where: {
        organizationId: this.context.organizationId,
        status: 'COMPLETED',
      }
    });
  }

  private async getAverageGenerationTime(): Promise<number> {
    // Placeholder - would calculate from actual data
    return 8.5; // seconds
  }

  private async getMostUsedTemplates(): Promise<Array<{ templateId: string; templateName: string; count: number }>> {
    // Placeholder - would query actual usage data
    return [
      { templateId: 'template1', templateName: 'Executive Dashboard', count: 45 },
      { templateId: 'template2', templateName: 'Financial Summary', count: 32 },
      { templateId: 'template3', templateName: 'Occupancy Report', count: 28 },
    ];
  }

  private async getFormatDistribution(): Promise<Record<string, number>> {
    return {
      PDF: 65,
      EXCEL: 25,
      CSV: 8,
      JSON: 2,
    };
  }
}