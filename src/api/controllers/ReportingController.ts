import { Request, Response } from 'express';
import { ReportingService } from '@/services/ReportingService';
import { logger } from '@/config/logger';

export class ReportingController {
  private reportingService: ReportingService;

  constructor() {
    this.reportingService = new ReportingService();
  }

  /**
   * Generate standard reports
   */
  generateReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.params;
      const { reportType, parameters, format } = req.body;

      const report = await this.reportingService.generateReport(
        organizationId,
        reportType,
        parameters,
        format
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error: unknown) {
      logger.error('Failed to generate report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
  };

  /**
   * Get scheduled reports
   */
  getScheduledReports = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.params;

      const schedules = await this.reportingService.getScheduledReports(organizationId);

      res.json({
        success: true,
        data: schedules
      });
    } catch (error: unknown) {
      logger.error('Failed to get scheduled reports', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scheduled reports'
      });
    }
  };

  /**
   * Schedule a report
   */
  scheduleReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.params;
      const scheduleData = req.body;

      const schedule = await this.reportingService.scheduleReport(
        organizationId,
        scheduleData
      );

      res.status(201).json({
        success: true,
        data: schedule
      });
    } catch (error: unknown) {
      logger.error('Failed to schedule report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule report'
      });
    }
  };

  /**
   * Export report
   */
  exportReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId, reportId } = req.params;
      const { format } = req.query;

      const exportedReport = await this.reportingService.exportReport(
        organizationId,
        reportId,
        format as string
      );

      res.json({
        success: true,
        data: exportedReport
      });
    } catch (error: unknown) {
      logger.error('Failed to export report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export report'
      });
    }
  };

  /**
   * Get report templates
   */
  getReportTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.params;

      const templates = await this.reportingService.getReportTemplates(organizationId);

      res.json({
        success: true,
        data: templates
      });
    } catch (error: unknown) {
      logger.error('Failed to get report templates', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get report templates'
      });
    }
  };

  /**
   * Create report template
   */
  createReportTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.params;
      const templateData = req.body;

      const template = await this.reportingService.createReportTemplate(
        organizationId,
        templateData
      );

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error: unknown) {
      logger.error('Failed to create report template', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create report template'
      });
    }
  };

  /**
   * Get report history
   */
  getReportHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.params;
      const { limit, offset } = req.query;

      const history = await this.reportingService.getReportHistory(
        organizationId,
        Number(limit) || 50,
        Number(offset) || 0
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error: unknown) {
      logger.error('Failed to get report history', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get report history'
      });
    }
  };

  /**
   * Get report analytics
   */
  getReportAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.params;

      const analytics = await this.reportingService.getReportAnalytics(organizationId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: unknown) {
      logger.error('Failed to get report analytics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get report analytics'
      });
    }
  };

  /**
   * Delete scheduled report
   */
  deleteScheduledReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId, scheduleId } = req.params;

      await this.reportingService.deleteScheduledReport(organizationId, scheduleId);

      res.json({
        success: true,
        message: 'Scheduled report deleted successfully'
      });
    } catch (error: unknown) {
      logger.error('Failed to delete scheduled report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete scheduled report'
      });
    }
  };

  /**
   * Update scheduled report
   */
  updateScheduledReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId, scheduleId } = req.params;
      const updateData = req.body;

      const updatedSchedule = await this.reportingService.updateScheduledReport(
        organizationId,
        scheduleId,
        updateData
      );

      res.json({
        success: true,
        data: updatedSchedule
      });
    } catch (error: unknown) {
      logger.error('Failed to update scheduled report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update scheduled report'
      });
    }
  };
}