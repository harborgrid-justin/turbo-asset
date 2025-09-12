import { Request, Response } from 'express';
import { BusinessIntelligenceService } from '../services/BusinessIntelligenceService';
import { ReportingService } from '../services/ReportingService';
import { logger } from '@/config/logger';
import { prisma } from '../config/database';

const biService = new BusinessIntelligenceService();
const reportingService = new ReportingService();

export class BusinessIntelligenceController {
  /**
   * Get all BI reports
   */
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 20, type } = req.query;

      const where: any = { organizationId };
      if (type) {
        where.reportType = type;
      }

      const reports = await prisma.bIReport.findMany({
        where,
        include: { warehouse: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.bIReport.count({ where });

      res.json({
        reports,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to get BI reports', { error });
      res.status(500).json({ error: 'Failed to get BI reports' });

      return;
    }
  }

  /**
   * Create BI report
   */
  async createReport(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        warehouseId,
        name,
        description,
        reportType,
        sqlQuery,
        chartConfig,
        filters,
        isPublic,
      } = req.body;

      const report = await biService.createReport(
        organizationId,
        warehouseId,
        name,
        description,
        reportType,
        sqlQuery,
        chartConfig,
        filters,
        isPublic,
        req.user?.id || 'system'
      );

      res.status(201).json(report);


      return;
    } catch (error: unknown) {
      logger.error('Failed to create BI report', { error });
      res.status(500).json({ error: 'Failed to create BI report' });

      return;
    }
  }

  /**
   * Execute BI report
   */
  async executeReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { parameters = {} } = req.body;

      const result = await biService.executeReport(reportId, parameters);
      res.json(result);
    } catch (error: unknown) {
      logger.error('Failed to execute BI report', { error });
      res.status(500).json({ error: 'Failed to execute BI report' });

      return;
    }
  }

  /**
   * Update BI report
   */
  async updateReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const updates = req.body;

      const report = await prisma.bIReport.update({
        where: { id: reportId },
        data: updates,
      });

      res.json(report);
    } catch (error: unknown) {
      logger.error('Failed to update BI report', { error });
      res.status(500).json({ error: 'Failed to update BI report' });

      return;
    }
  }

  /**
   * Delete BI report
   */
  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;

      await prisma.bIReport.delete({
        where: { id: reportId },
      });

      res.status(204).send();
    } catch (error: unknown) {
      logger.error('Failed to delete BI report', { error });
      res.status(500).json({ error: 'Failed to delete BI report' });

      return;
    }
  }

  /**
   * Get dashboards
   */
  async getDashboards(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 20, type } = req.query;

      const where: any = { organizationId };
      if (type) {
        where.dashboardType = type;
      }

      const dashboards = await prisma.dashboard.findMany({
        where,
        include: { reports: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.dashboard.count({ where });

      res.json({
        dashboards,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to get dashboards', { error });
      res.status(500).json({ error: 'Failed to get dashboards' });

      return;
    }
  }

  /**
   * Create dashboard
   */
  async createDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        name,
        description,
        dashboardType,
        layout,
        isPublic,
        refreshRate,
      } = req.body;

      const dashboard = await biService.createDashboard(
        organizationId,
        name,
        description,
        dashboardType,
        layout,
        isPublic,
        refreshRate,
        req.user?.id || 'system'
      );

      res.status(201).json(dashboard);


      return;
    } catch (error: unknown) {
      logger.error('Failed to create dashboard', { error });
      res.status(500).json({ error: 'Failed to create dashboard' });

      return;
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;
      const { parameters = {} } = req.query;

      const parsedParams = typeof parameters === 'string' 
        ? JSON.parse(parameters) 
        : parameters;

      const data = await biService.getDashboardData(dashboardId, parsedParams);
      res.json(data);
    } catch (error: unknown) {
      logger.error('Failed to get dashboard data', { error });
      res.status(500).json({ error: 'Failed to get dashboard data' });

      return;
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;
      const updates = req.body;

      const dashboard = await prisma.dashboard.update({
        where: { id: dashboardId },
        data: updates,
      });

      res.json(dashboard);
    } catch (error: unknown) {
      logger.error('Failed to update dashboard', { error });
      res.status(500).json({ error: 'Failed to update dashboard' });

      return;
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { dashboardId } = req.params;

      await prisma.dashboard.delete({
        where: { id: dashboardId },
      });

      res.status(204).send();
    } catch (error: unknown) {
      logger.error('Failed to delete dashboard', { error });
      res.status(500).json({ error: 'Failed to delete dashboard' });

      return;
    }
  }

  /**
   * Build report using drag-and-drop interface
   */
  async buildReport(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;
      const { builder } = req.body;

      const result = await biService.buildReport(warehouseId, builder);
      res.json(result);
    } catch (error: unknown) {
      logger.error('Failed to build report', { error });
      res.status(500).json({ error: 'Failed to build report' });

      return;
    }
  }

  /**
   * Get data sources for report building
   */
  async getDataSources(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;

      const dataSources = await biService.getDataSources(warehouseId);
      res.json(dataSources);
    } catch (error: unknown) {
      logger.error('Failed to get data sources', { error });
      res.status(500).json({ error: 'Failed to get data sources' });

      return;
    }
  }

  /**
   * Get suggested visualizations
   */
  async getSuggestedVisualizations(req: Request, res: Response): Promise<void> {
    try {
      const { columns } = req.body;

      const suggestions = biService.getSuggestedVisualizations(columns);
      res.json(suggestions);
    } catch (error: unknown) {
      logger.error('Failed to get suggested visualizations', { error });
      res.status(500).json({ error: 'Failed to get suggested visualizations' });

      return;
    }
  }

  /**
   * Export report
   */
  async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { format = 'csv', parameters = {} } = req.query;

      const buffer = await biService.exportReport(
        reportId,
        format as 'csv' | 'excel' | 'pdf' | 'json',
        typeof parameters === 'string' ? JSON.parse(parameters) : parameters
      );

      const contentTypes = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        json: 'application/json',
      };

      res.setHeader('Content-Type', contentTypes[format as keyof typeof contentTypes]);
      res.setHeader('Content-Disposition', `attachment; filename=report.${format}`);
      res.send(buffer);
    } catch (error: unknown) {
      logger.error('Failed to export report', { error });
      res.status(500).json({ error: 'Failed to export report' });

      return;
    }
  }

  /**
   * Generate executive dashboard
   */
  async getExecutiveDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const dashboard = await reportingService.generateExecutiveDashboard(
        organizationId,
        start,
        end
      );

      res.json(dashboard);
    } catch (error: unknown) {
      logger.error('Failed to generate executive dashboard', { error });
      res.status(500).json({ error: 'Failed to generate executive dashboard' });

      return;
    }
  }

  /**
   * Generate benchmarking report
   */
  async getBenchmarkingReport(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { industryCode, metrics } = req.query;

      const metricsArray = Array.isArray(metrics) ? metrics : [metrics];
      const report = await reportingService.generateBenchmarkingReport(
        organizationId,
        industryCode as string,
        metricsArray as string[]
      );

      res.json(report);
    } catch (error: unknown) {
      logger.error('Failed to generate benchmarking report', { error });
      res.status(500).json({ error: 'Failed to generate benchmarking report' });

      return;
    }
  }

  /**
   * Create report schedule
   */
  async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { name, config } = req.body;

      const schedule = await reportingService.createReportSchedule(
        reportId,
        name,
        config,
        req.user?.id || 'system'
      );

      res.status(201).json(schedule);


      return;
    } catch (error: unknown) {
      logger.error('Failed to create report schedule', { error });
      res.status(500).json({ error: 'Failed to create report schedule' });

      return;
    }
  }

  /**
   * Get report schedules
   */
  async getSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const schedules = await prisma.reportSchedule.findMany({
        where: {
          report: { organizationId },
        },
        include: { report: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json(schedules);
    } catch (error: unknown) {
      logger.error('Failed to get report schedules', { error });
      res.status(500).json({ error: 'Failed to get report schedules' });

      return;
    }
  }

  /**
   * Update report schedule
   */
  async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;
      const updates = req.body;

      const schedule = await prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: updates,
      });

      res.json(schedule);
    } catch (error: unknown) {
      logger.error('Failed to update report schedule', { error });
      res.status(500).json({ error: 'Failed to update report schedule' });

      return;
    }
  }

  /**
   * Delete report schedule
   */
  async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      await prisma.reportSchedule.delete({
        where: { id: scheduleId },
      });

      res.status(204).send();
    } catch (error: unknown) {
      logger.error('Failed to delete report schedule', { error });
      res.status(500).json({ error: 'Failed to delete report schedule' });

      return;
    }
  }

  /**
   * Create custom report template
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { template } = req.body;

      const createdTemplate = await reportingService.createReportTemplate(
        organizationId,
        template,
        req.user?.id || 'system'
      );

      res.status(201).json(createdTemplate);


      return;
    } catch (error: unknown) {
      logger.error('Failed to create report template', { error });
      res.status(500).json({ error: 'Failed to create report template' });

      return;
    }
  }

  /**
   * Generate report from template
   */
  async generateFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { parameters = {} } = req.body;

      const report = await reportingService.generateReportFromTemplate(
        templateId,
        parameters
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report_${templateId}.pdf`);
      res.send(report);
    } catch (error: unknown) {
      logger.error('Failed to generate report from template', { error });
      res.status(500).json({ error: 'Failed to generate report from template' });

      return;
    }
  }

  /**
   * Get BI analytics
   */
  async getBIAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const reports = await prisma.bIReport.findMany({
        where: { organizationId },
      });

      const dashboards = await prisma.dashboard.findMany({
        where: { organizationId },
      });

      const schedules = await prisma.reportSchedule.findMany({
        where: {
          report: { organizationId },
        },
      });

      const analytics = {
        totalReports: reports.length,
        publicReports: reports.filter(r => r.isPublic).length,
        privateReports: reports.filter(r => !r.isPublic).length,
        reportsByType: reports.reduce((acc, report) => {
          acc[report.reportType] = (acc[report.reportType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalDashboards: dashboards.length,
        dashboardsByType: dashboards.reduce((acc, dashboard) => {
          acc[dashboard.dashboardType] = (acc[dashboard.dashboardType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalSchedules: schedules.length,
        activeSchedules: schedules.filter(s => s.isActive).length,
        schedulesByFrequency: schedules.reduce((acc, schedule) => {
          acc[schedule.frequency] = (acc[schedule.frequency] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      res.json(analytics);
    } catch (error: unknown) {
      logger.error('Failed to get BI analytics', { error });
      res.status(500).json({ error: 'Failed to get BI analytics' });

      return;
    }
  }
}