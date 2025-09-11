/**
 * Business Intelligence Service - Enhanced domain implementation
 * 
 * Migrated from legacy BusinessIntelligenceService with comprehensive domain architecture.
 * Provides advanced analytics, reporting, dashboards, and data visualization capabilities
 * within the Infrastructure & Technology operations framework.
 */

import { EventEmitter } from 'events';
import { prisma } from '../../../../../config/database';
import { logger } from '../../../../../config/logger';
import { 
  InfrastructureContext,
  BIDashboard,
  BIReport,
  BIWidget
} from './types/InfrastructureTypes';
import { 
  INFRASTRUCTURE_CONSTANTS,
  EVENTS,
  ERROR_CODES
} from './constants/InfrastructureConstants';

export interface ChartConfiguration {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'heatmap' | 'gauge' | 'table';
  xAxis?: {
    field: string;
    label?: string;
    type?: 'category' | 'datetime' | 'numeric';
  };
  yAxis?: {
    field: string;
    label?: string;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  };
  series?: Array<{
    field: string;
    label?: string;
    color?: string;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }>;
  filters?: FilterConfiguration[];
  styling?: {
    colors?: string[];
    theme?: 'light' | 'dark' | 'corporate';
    height?: number;
    width?: number;
  };
}

export interface FilterConfiguration {
  field: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'range';
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in';
  value?: any;
  options?: Array<{ label: string; value: any }>;
}

export interface ReportBuilder {
  dataSource: string;
  columns: ColumnConfiguration[];
  filters: FilterConfiguration[];
  groupBy?: string[];
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
}

export interface ColumnConfiguration {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface DashboardLayout {
  grid: {
    columns: number;
    rows: number;
  };
  widgets: WidgetConfiguration[];
}

export interface WidgetConfiguration {
  id: string;
  type: 'chart' | 'kpi' | 'table' | 'text' | 'iframe';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  configuration: any;
  refreshRate?: number; // in seconds
}

export interface KPIConfiguration {
  title: string;
  value: number | string;
  target?: number;
  format?: 'number' | 'currency' | 'percentage';
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    period: string;
  };
  color?: string;
  icon?: string;
}

export class BusinessIntelligenceService extends EventEmitter {
  private dashboardCache: Map<string, any> = new Map();
  private reportCache: Map<string, any> = new Map();
  private context?: InfrastructureContext;

  constructor(context?: InfrastructureContext) {
    super();
    this.context = context;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('dashboard:created', this.handleDashboardCreated.bind(this));
    this.on('report:generated', this.handleReportGenerated.bind(this));
    this.on('widget:updated', this.handleWidgetUpdated.bind(this));
  }

  /**
   * Create comprehensive analytics dashboard
   */
  async createDashboard(
    name: string,
    description: string,
    layout: DashboardLayout,
    organizationId: string,
    isPublic: boolean = false
  ): Promise<any> {
    try {
      const dashboard = {
        id: `dashboard-${Date.now()}`,
        name,
        description,
        layout,
        organizationId,
        isPublic,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.dashboardCache.set(dashboard.id, dashboard);

      this.emit('dashboard:created', {
        dashboardId: dashboard.id,
        name,
        widgetCount: layout.widgets.length,
        organizationId
      });

      logger.info('BI dashboard created', {
        dashboardId: dashboard.id,
        name,
        widgetCount: layout.widgets.length,
        organizationId
      });

      return dashboard;
    } catch (error: unknown) {
      logger.error('Dashboard creation failed', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive business intelligence report
   */
  async generateReport(
    reportBuilder: ReportBuilder,
    organizationId: string
  ): Promise<{
    reportId: string;
    data: any[];
    metadata: {
      totalRecords: number;
      columnCount: number;
      generatedAt: Date;
      executionTime: number;
    };
  }> {
    try {
      const startTime = Date.now();
      const reportId = `report-${Date.now()}`;

      // Build and execute query
      const query = this.buildQuery(reportBuilder);
      const data = await this.executeQuery(query, organizationId);

      const executionTime = Date.now() - startTime;
      
      const report = {
        reportId,
        data,
        metadata: {
          totalRecords: data.length,
          columnCount: reportBuilder.columns.length,
          generatedAt: new Date(),
          executionTime
        }
      };

      // Cache the report
      this.reportCache.set(reportId, report);

      this.emit('report:generated', {
        reportId,
        recordCount: data.length,
        executionTime,
        organizationId
      });

      logger.info('BI report generated', {
        reportId,
        dataSource: reportBuilder.dataSource,
        recordCount: data.length,
        executionTime,
        organizationId
      });

      return report;
    } catch (error: unknown) {
      logger.error('Report generation failed', error);
      throw error;
    }
  }

  /**
   * Generate infrastructure analytics dashboard
   */
  async generateInfrastructureAnalytics(organizationId: string): Promise<any> {
    try {
      const dashboardLayout: DashboardLayout = {
        grid: { columns: 12, rows: 8 },
        widgets: [
          {
            id: 'energy-consumption-kpi',
            type: 'kpi',
            title: 'Total Energy Consumption',
            position: { x: 0, y: 0, width: 3, height: 2 },
            configuration: {
              title: 'Total Energy Consumption',
              value: 1250.5,
              format: 'number',
              color: '#4CAF50',
              icon: 'energy'
            },
            refreshRate: 300
          },
          {
            id: 'iot-devices-count',
            type: 'kpi',
            title: 'Active IoT Devices',
            position: { x: 3, y: 0, width: 3, height: 2 },
            configuration: {
              title: 'Active IoT Devices',
              value: 156,
              format: 'number',
              color: '#2196F3',
              icon: 'devices'
            },
            refreshRate: 600
          },
          {
            id: 'energy-trends',
            type: 'chart',
            title: 'Energy Consumption Trends',
            position: { x: 0, y: 2, width: 6, height: 4 },
            configuration: {
              type: 'line',
              xAxis: { field: 'date', label: 'Date', type: 'datetime' },
              yAxis: { field: 'consumption', label: 'kWh', aggregation: 'sum' }
            },
            refreshRate: 1800
          }
        ]
      };

      return await this.createDashboard(
        'Infrastructure Analytics',
        'Comprehensive infrastructure and technology analytics dashboard',
        dashboardLayout,
        organizationId,
        false
      );
    } catch (error: unknown) {
      logger.error('Infrastructure analytics dashboard generation failed', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private buildQuery(reportBuilder: ReportBuilder): string {
    let query = `SELECT ${reportBuilder.columns.map(col => 
      col.aggregation ? `${col.aggregation.toUpperCase()}(${col.field}) as ${col.field}` : col.field
    ).join(', ')} FROM ${reportBuilder.dataSource}`;

    // Add filters
    if (reportBuilder.filters && reportBuilder.filters.length > 0) {
      const whereClauses = reportBuilder.filters.map(filter => {
        switch (filter.operator) {
          case 'equals':
            return `${filter.field} = '${filter.value}'`;
          case 'contains':
            return `${filter.field} LIKE '%${filter.value}%'`;
          case 'greater':
            return `${filter.field} > ${filter.value}`;
          case 'less':
            return `${filter.field} < ${filter.value}`;
          default:
            return `${filter.field} = '${filter.value}'`;
        }
      });
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    return query;
  }

  private async executeQuery(query: string, organizationId: string): Promise<any[]> {
    try {
      // Mock data for demonstration - would execute actual query
      return [
        { date: '2024-01-01', consumption: 1250.5 },
        { date: '2024-01-02', consumption: 1180.2 },
        { date: '2024-01-03', consumption: 1320.8 }
      ];
    } catch (error: unknown) {
      logger.error('Query execution failed', { query, organizationId, error });
      throw error;
    }
  }

  private handleDashboardCreated(eventData: any): void {
    logger.info('BI dashboard created event processed', eventData);
  }

  private handleReportGenerated(eventData: any): void {
    logger.info('BI report generated event processed', eventData);
  }

  private handleWidgetUpdated(eventData: any): void {
    logger.info('BI widget updated event processed', eventData);
  }

  clearCaches(): void {
    this.dashboardCache.clear();
    this.reportCache.clear();
    logger.info('BusinessIntelligenceService caches cleared');
  }
}