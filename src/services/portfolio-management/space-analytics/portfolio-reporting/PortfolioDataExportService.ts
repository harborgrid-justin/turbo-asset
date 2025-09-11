import { prisma } from '@/../../config/database';
import { logger } from '@/../../config/logger';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';

/**
 * Portfolio Data Export Service - Handle data export operations for portfolio analytics
 * Manages data extraction, formatting, and export to various formats
 * Part of the Portfolio Management domain within Turbo Asset IWMS
 */
export class PortfolioDataExportService {

  /**
   * Export portfolio data to Excel
   */
  async exportToExcel(
    organizationId: string,
    exportRequest: ExportRequest
  ): Promise<ExportResult> {
    try {
      const startTime = Date.now();
      
      // Get data based on export request
      const data = await this.gatherExportData(organizationId, exportRequest);
      
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Add sheets based on requested data types
      if (exportRequest.includePortfolioSummary) {
        await this.addPortfolioSummarySheet(workbook, data.portfolioSummary);
      }
      
      if (exportRequest.includeProperties) {
        await this.addPropertiesSheet(workbook, data.properties);
      }
      
      if (exportRequest.includeLeases) {
        await this.addLeasesSheet(workbook, data.leases);
      }
      
      if (exportRequest.includeFinancials) {
        await this.addFinancialsSheet(workbook, data.financials);
      }
      
      if (exportRequest.includeOccupancy) {
        await this.addOccupancySheet(workbook, data.occupancy);
      }
      
      if (exportRequest.includeMetrics) {
        await this.addMetricsSheet(workbook, data.metrics);
      }
      
      // Generate file
      const fileName = this.generateFileName(exportRequest, 'xlsx');
      const filePath = path.join(process.cwd(), 'exports', organizationId, fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      XLSX.writeFile(workbook, filePath);
      
      const result: ExportResult = {
        success: true,
        fileName,
        filePath,
        fileSize: await this.getFileSize(filePath),
        recordCount: this.calculateTotalRecords(data),
        executionTimeMs: Date.now() - startTime,
        exportedAt: new Date(),
      };
      
      // Log export activity
      await this.logExportActivity(organizationId, exportRequest, result);
      
      logger.info('Portfolio data exported to Excel', {
        organizationId,
        fileName,
        recordCount: result.recordCount,
        executionTime: result.executionTimeMs,
      });
      
      return result;
      
    } catch (error: unknown) {
      logger.error('Failed to export portfolio data to Excel', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Export portfolio data to CSV
   */
  async exportToCSV(
    organizationId: string,
    exportRequest: ExportRequest
  ): Promise<ExportResult> {
    try {
      const startTime = Date.now();
      
      // Get data based on export request
      const data = await this.gatherExportData(organizationId, exportRequest);
      
      // Create CSV files for each data type
      const files: string[] = [];
      
      if (exportRequest.includeProperties && data.properties) {
        const csvContent = this.convertToCSV(data.properties);
        const fileName = this.generateFileName(exportRequest, 'csv', 'properties');
        const filePath = await this.saveCSVFile(organizationId, fileName, csvContent);
        files.push(filePath);
      }
      
      if (exportRequest.includeLeases && data.leases) {
        const csvContent = this.convertToCSV(data.leases);
        const fileName = this.generateFileName(exportRequest, 'csv', 'leases');
        const filePath = await this.saveCSVFile(organizationId, fileName, csvContent);
        files.push(filePath);
      }
      
      if (exportRequest.includeFinancials && data.financials) {
        const csvContent = this.convertToCSV(data.financials);
        const fileName = this.generateFileName(exportRequest, 'csv', 'financials');
        const filePath = await this.saveCSVFile(organizationId, fileName, csvContent);
        files.push(filePath);
      }
      
      // Create ZIP file if multiple files
      let finalFilePath: string;
      if (files.length > 1) {
        finalFilePath = await this.createZipFile(organizationId, files, exportRequest);
      } else {
        finalFilePath = files[0];
      }
      
      const result: ExportResult = {
        success: true,
        fileName: path.basename(finalFilePath),
        filePath: finalFilePath,
        fileSize: await this.getFileSize(finalFilePath),
        recordCount: this.calculateTotalRecords(data),
        executionTimeMs: Date.now() - startTime,
        exportedAt: new Date(),
        additionalFiles: files.length > 1 ? files.map(f => path.basename(f)) : undefined,
      };
      
      // Log export activity
      await this.logExportActivity(organizationId, exportRequest, result);
      
      logger.info('Portfolio data exported to CSV', {
        organizationId,
        fileName: result.fileName,
        recordCount: result.recordCount,
        executionTime: result.executionTimeMs,
      });
      
      return result;
      
    } catch (error: unknown) {
      logger.error('Failed to export portfolio data to CSV', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Export portfolio data to JSON
   */
  async exportToJSON(
    organizationId: string,
    exportRequest: ExportRequest
  ): Promise<ExportResult> {
    try {
      const startTime = Date.now();
      
      // Get data based on export request
      const data = await this.gatherExportData(organizationId, exportRequest);
      
      // Create JSON structure
      const jsonData = {
        organizationId,
        exportedAt: new Date().toISOString(),
        exportRequest: {
          dateRange: exportRequest.dateRange,
          filters: exportRequest.filters,
        },
        data: data,
      };
      
      // Generate file
      const fileName = this.generateFileName(exportRequest, 'json');
      const filePath = path.join(process.cwd(), 'exports', organizationId, fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
      
      const result: ExportResult = {
        success: true,
        fileName,
        filePath,
        fileSize: await this.getFileSize(filePath),
        recordCount: this.calculateTotalRecords(data),
        executionTimeMs: Date.now() - startTime,
        exportedAt: new Date(),
      };
      
      // Log export activity
      await this.logExportActivity(organizationId, exportRequest, result);
      
      logger.info('Portfolio data exported to JSON', {
        organizationId,
        fileName,
        recordCount: result.recordCount,
        executionTime: result.executionTimeMs,
      });
      
      return result;
      
    } catch (error: unknown) {
      logger.error('Failed to export portfolio data to JSON', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate dashboard data export
   */
  async exportDashboardData(
    organizationId: string,
    dashboardConfig: DashboardExportConfig
  ): Promise<ExportResult> {
    try {
      const startTime = Date.now();
      
      // Get dashboard data
      const dashboardData = await this.getDashboardData(organizationId, dashboardConfig);
      
      // Create structured export
      const exportData = {
        dashboard: dashboardConfig.dashboardName,
        organizationId,
        exportedAt: new Date().toISOString(),
        timeframe: dashboardConfig.timeframe,
        widgets: dashboardData.widgets,
        metrics: dashboardData.metrics,
        charts: dashboardData.charts,
        filters: dashboardConfig.filters,
      };
      
      // Export based on format preference
      let result: ExportResult;
      
      switch (dashboardConfig.format) {
        case 'EXCEL':
          result = await this.exportDashboardToExcel(organizationId, exportData, dashboardConfig);
          break;
        case 'JSON':
          result = await this.exportDashboardToJSON(organizationId, exportData, dashboardConfig);
          break;
        case 'PDF':
          result = await this.exportDashboardToPDF(organizationId, exportData, dashboardConfig);
          break;
        default:
          throw new Error(`Unsupported export format: ${dashboardConfig.format}`);
      }
      
      logger.info('Dashboard data exported', {
        organizationId,
        dashboardName: dashboardConfig.dashboardName,
        format: dashboardConfig.format,
        executionTime: result.executionTimeMs,
      });
      
      return result;
      
    } catch (error: unknown) {
      logger.error('Failed to export dashboard data', {
        organizationId,
        dashboardName: dashboardConfig.dashboardName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get export history
   */
  async getExportHistory(
    organizationId: string,
    filters?: ExportHistoryFilters
  ): Promise<ExportHistoryItem[]> {
    try {
      const whereClause: any = { organizationId };
      
      if (filters?.exportType) {
        whereClause.exportType = filters.exportType;
      }
      
      if (filters?.startDate || filters?.endDate) {
        whereClause.exportedAt = {};
        if (filters.startDate) {whereClause.exportedAt.gte = filters.startDate;}
        if (filters.endDate) {whereClause.exportedAt.lte = filters.endDate;}
      }
      
      const exports = await prisma.portfolioExport.findMany({
        where: whereClause,
        orderBy: { exportedAt: 'desc' },
        take: filters?.limit || 50,
      });
      
      return exports.map(exp => ({
        id: exp.id,
        exportType: exp.exportType,
        format: exp.format,
        fileName: exp.fileName,
        fileSize: exp.fileSize,
        recordCount: exp.recordCount,
        exportedAt: exp.exportedAt,
        exportedBy: exp.exportedBy,
        downloadCount: exp.downloadCount,
        status: exp.status,
      }));
      
    } catch (error: unknown) {
      logger.error('Failed to get export history', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule recurring exports
   */
  async scheduleRecurringExport(
    organizationId: string,
    schedule: ExportSchedule
  ): Promise<ExportSchedule> {
    try {
      const scheduledExport = await prisma.scheduledExport.create({
        data: {
          organizationId,
          name: schedule.name,
          description: schedule.description,
          exportRequest: schedule.exportRequest,
          frequency: schedule.frequency,
          nextRunDate: this.calculateNextRunDate(schedule.frequency),
          recipients: schedule.recipients,
          isActive: schedule.isActive,
          createdBy: schedule.createdBy,
        },
      });
      
      logger.info('Recurring export scheduled', {
        organizationId,
        scheduleId: scheduledExport.id,
        name: schedule.name,
        frequency: schedule.frequency,
      });
      
      return {
        ...schedule,
        id: scheduledExport.id,
        createdAt: scheduledExport.createdAt,
      };
      
    } catch (error: unknown) {
      logger.error('Failed to schedule recurring export', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async gatherExportData(
    organizationId: string,
    exportRequest: ExportRequest
  ): Promise<PortfolioExportData> {
    const data: PortfolioExportData = {};
    
    if (exportRequest.includePortfolioSummary) {
      data.portfolioSummary = await this.getPortfolioSummaryData(organizationId, exportRequest);
    }
    
    if (exportRequest.includeProperties) {
      data.properties = await this.getPropertiesData(organizationId, exportRequest);
    }
    
    if (exportRequest.includeLeases) {
      data.leases = await this.getLeasesData(organizationId, exportRequest);
    }
    
    if (exportRequest.includeFinancials) {
      data.financials = await this.getFinancialsData(organizationId, exportRequest);
    }
    
    if (exportRequest.includeOccupancy) {
      data.occupancy = await this.getOccupancyData(organizationId, exportRequest);
    }
    
    if (exportRequest.includeMetrics) {
      data.metrics = await this.getMetricsData(organizationId, exportRequest);
    }
    
    return data;
  }

  private async addPortfolioSummarySheet(workbook: any, data: any): Promise<void> {
    if (!data) {return;}
    
    const worksheet = XLSX.utils.json_to_sheet([data]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Portfolio Summary');
  }

  private async addPropertiesSheet(workbook: any, data: any[]): Promise<void> {
    if (!data || data.length === 0) {return;}
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Properties');
  }

  private async addLeasesSheet(workbook: any, data: any[]): Promise<void> {
    if (!data || data.length === 0) {return;}
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leases');
  }

  private async addFinancialsSheet(workbook: any, data: any[]): Promise<void> {
    if (!data || data.length === 0) {return;}
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Financials');
  }

  private async addOccupancySheet(workbook: any, data: any[]): Promise<void> {
    if (!data || data.length === 0) {return;}
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Occupancy');
  }

  private async addMetricsSheet(workbook: any, data: any): Promise<void> {
    if (!data) {return;}
    
    const worksheet = XLSX.utils.json_to_sheet([data]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Metrics');
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {return '';}
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  private async saveCSVFile(
    organizationId: string,
    fileName: string,
    content: string
  ): Promise<string> {
    const filePath = path.join(process.cwd(), 'exports', organizationId, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  private async createZipFile(
    organizationId: string,
    files: string[],
    exportRequest: ExportRequest
  ): Promise<string> {
    // Implementation for creating ZIP file
    // This would use a ZIP library like JSZip
    const zipFileName = this.generateFileName(exportRequest, 'zip');
    const zipFilePath = path.join(process.cwd(), 'exports', organizationId, zipFileName);
    
    // ZIP creation logic would go here
    
    return zipFilePath;
  }

  private generateFileName(
    exportRequest: ExportRequest,
    extension: string,
    suffix?: string
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseName = `portfolio_export_${timestamp}`;
    const fullSuffix = suffix ? `_${suffix}` : '';
    return `${baseName}${fullSuffix}.${extension}`;
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error: unknown) {
      return 0;
    }
  }

  private calculateTotalRecords(data: PortfolioExportData): number {
    let total = 0;
    if (data.properties) {total += data.properties.length;}
    if (data.leases) {total += data.leases.length;}
    if (data.financials) {total += data.financials.length;}
    if (data.occupancy) {total += data.occupancy.length;}
    return total;
  }

  private async logExportActivity(
    organizationId: string,
    exportRequest: ExportRequest,
    result: ExportResult
  ): Promise<void> {
    await prisma.portfolioExport.create({
      data: {
        organizationId,
        exportType: 'PORTFOLIO_DATA',
        format: this.getFormatFromFileName(result.fileName),
        fileName: result.fileName,
        filePath: result.filePath,
        fileSize: result.fileSize,
        recordCount: result.recordCount,
        exportedAt: result.exportedAt,
        executionTimeMs: result.executionTimeMs,
        exportRequest: exportRequest as any,
        status: result.success ? 'COMPLETED' : 'FAILED',
      },
    });
  }

  private getFormatFromFileName(fileName: string): string {
    const extension = path.extname(fileName).toLowerCase().substring(1);
    return extension.toUpperCase();
  }

  // Data gathering methods (placeholder implementations)
  private async getPortfolioSummaryData(organizationId: string, exportRequest: ExportRequest): Promise<any> {
    // Implementation for portfolio summary data
    return {};
  }

  private async getPropertiesData(organizationId: string, exportRequest: ExportRequest): Promise<any[]> {
    // Implementation for properties data
    return [];
  }

  private async getLeasesData(organizationId: string, exportRequest: ExportRequest): Promise<any[]> {
    // Implementation for leases data
    return [];
  }

  private async getFinancialsData(organizationId: string, exportRequest: ExportRequest): Promise<any[]> {
    // Implementation for financials data
    return [];
  }

  private async getOccupancyData(organizationId: string, exportRequest: ExportRequest): Promise<any[]> {
    // Implementation for occupancy data
    return [];
  }

  private async getMetricsData(organizationId: string, exportRequest: ExportRequest): Promise<any> {
    // Implementation for metrics data
    return {};
  }

  private async getDashboardData(
    organizationId: string,
    dashboardConfig: DashboardExportConfig
  ): Promise<any> {
    // Implementation for dashboard data
    return {
      widgets: [],
      metrics: {},
      charts: [],
    };
  }

  private async exportDashboardToExcel(
    organizationId: string,
    data: any,
    config: DashboardExportConfig
  ): Promise<ExportResult> {
    // Implementation for dashboard Excel export
    return {
      success: true,
      fileName: '',
      filePath: '',
      fileSize: 0,
      recordCount: 0,
      executionTimeMs: 0,
      exportedAt: new Date(),
    };
  }

  private async exportDashboardToJSON(
    organizationId: string,
    data: any,
    config: DashboardExportConfig
  ): Promise<ExportResult> {
    // Implementation for dashboard JSON export
    return {
      success: true,
      fileName: '',
      filePath: '',
      fileSize: 0,
      recordCount: 0,
      executionTimeMs: 0,
      exportedAt: new Date(),
    };
  }

  private async exportDashboardToPDF(
    organizationId: string,
    data: any,
    config: DashboardExportConfig
  ): Promise<ExportResult> {
    // Implementation for dashboard PDF export
    return {
      success: true,
      fileName: '',
      filePath: '',
      fileSize: 0,
      recordCount: 0,
      executionTimeMs: 0,
      exportedAt: new Date(),
    };
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
}

// Type definitions
interface ExportRequest {
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: any;
  includePortfolioSummary?: boolean;
  includeProperties?: boolean;
  includeLeases?: boolean;
  includeFinancials?: boolean;
  includeOccupancy?: boolean;
  includeMetrics?: boolean;
  format?: 'EXCEL' | 'CSV' | 'JSON' | 'PDF';
  requestedBy: string;
}

interface ExportResult {
  success: boolean;
  fileName: string;
  filePath: string;
  fileSize: number;
  recordCount: number;
  executionTimeMs: number;
  exportedAt: Date;
  error?: string;
  additionalFiles?: string[];
}

interface PortfolioExportData {
  portfolioSummary?: any;
  properties?: any[];
  leases?: any[];
  financials?: any[];
  occupancy?: any[];
  metrics?: any;
}

interface DashboardExportConfig {
  dashboardName: string;
  timeframe: string;
  format: 'EXCEL' | 'JSON' | 'PDF';
  includeCharts: boolean;
  includeMetrics: boolean;
  filters?: any;
  requestedBy: string;
}

interface ExportHistoryFilters {
  exportType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface ExportHistoryItem {
  id: string;
  exportType: string;
  format: string;
  fileName: string;
  fileSize: number;
  recordCount: number;
  exportedAt: Date;
  exportedBy: string;
  downloadCount: number;
  status: string;
}

interface ExportSchedule {
  id?: string;
  name: string;
  description?: string;
  exportRequest: ExportRequest;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  recipients: string[];
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
}