import { prisma } from '../config/database';
import { logger } from '../config/logger';

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

export interface DrillDownConfiguration {
  level: number;
  field: string;
  label: string;
  query?: string;
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

export class BusinessIntelligenceService {
  /**
   * Create BI report
   */
  async createReport(
    organizationId: string,
    warehouseId: string,
    name: string,
    description: string,
    reportType: 'TABLE' | 'CHART' | 'PIVOT' | 'KPI_CARD' | 'GAUGE' | 'MAP' | 'TIMELINE' | 'CUSTOM',
    sqlQuery: string,
    chartConfig: ChartConfiguration,
    filters: FilterConfiguration[] = [],
    isPublic: boolean = false,
    createdBy: string
  ): Promise<any> {
    try {
      const report = await prisma.bIReport.create({
        data: {
          name,
          description,
          warehouseId,
          organizationId,
          reportType,
          sqlQuery,
          chartConfig,
          filters,
          isPublic,
          createdBy,
        },
      });

      logger.info('BI report created', {
        reportId: report.id,
        name,
        reportType,
      });

      return report;
    } catch (error: unknown) {
      logger.error('Failed to create BI report', { name, error });
      throw error;
    }
  }

  /**
   * Execute report query and return data
   */
  async executeReport(reportId: string, parameters: Record<string, any> = {}): Promise<any> {
    try {
      const report = await prisma.bIReport.findUnique({
        where: { id: reportId },
        include: { warehouse: true },
      });

      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // Replace parameters in SQL query
      let sqlQuery = report.sqlQuery;
      for (const [key, value] of Object.entries(parameters)) {
        sqlQuery = sqlQuery.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
      }

      // Execute query against warehouse
      const data = await this.executeQuery(report.warehouse.connectionString, sqlQuery);

      // Apply post-processing based on chart configuration
      const processedData = this.processReportData(data, report.chartConfig);

      logger.info('Report executed successfully', {
        reportId,
        recordCount: processedData.length,
      });

      return {
        metadata: {
          reportId,
          name: report.name,
          executedAt: new Date(),
          recordCount: processedData.length,
        },
        data: processedData,
        chartConfig: report.chartConfig,
      };
    } catch (error: unknown) {
      logger.error('Report execution failed', { reportId, error });
      throw error;
    }
  }

  /**
   * Create dashboard
   */
  async createDashboard(
    organizationId: string,
    name: string,
    description: string,
    dashboardType: 'EXECUTIVE' | 'OPERATIONAL' | 'ANALYTICAL' | 'REAL_TIME' | 'COMPLIANCE' | 'FINANCIAL' | 'MAINTENANCE' | 'SPACE_UTILIZATION' | 'PORTFOLIO',
    layout: DashboardLayout,
    isPublic: boolean = false,
    refreshRate: number = 300,
    createdBy: string
  ): Promise<any> {
    try {
      const dashboard = await prisma.dashboard.create({
        data: {
          name,
          description,
          organizationId,
          dashboardType,
          layout,
          isPublic,
          refreshRate,
          createdBy,
        },
      });

      logger.info('Dashboard created', {
        dashboardId: dashboard.id,
        name,
        dashboardType,
        widgetCount: layout.widgets.length,
      });

      return dashboard;
    } catch (error: unknown) {
      logger.error('Failed to create dashboard', { name, error });
      throw error;
    }
  }

  /**
   * Get dashboard with real-time data
   */
  async getDashboardData(dashboardId: string, parameters: Record<string, any> = {}): Promise<any> {
    try {
      const dashboard = await prisma.dashboard.findUnique({
        where: { id: dashboardId },
        include: { reports: true },
      });

      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      const widgets = dashboard.layout.widgets || [];
      const widgetData: Record<string, any> = {};

      // Execute each widget's data source
      for (const widget of widgets) {
        try {
          if (widget.type === 'chart' || widget.type === 'table') {
            const reportId = widget.configuration.reportId;
            if (reportId) {
              const reportData = await this.executeReport(reportId, parameters);
              widgetData[widget.id] = reportData;
            }
          } else if (widget.type === 'kpi') {
            const kpiData = await this.calculateKPI(widget.configuration, parameters);
            widgetData[widget.id] = kpiData;
          } else if (widget.type === 'text') {
            widgetData[widget.id] = widget.configuration;
          }
        } catch (error: unknown) {
          logger.warn(`Widget data loading failed: ${widget.id}`, { error });
          widgetData[widget.id] = { error: (error as Error).message };
        }
      }

      return {
        dashboard,
        widgetData,
        refreshedAt: new Date(),
      };
    } catch (error: unknown) {
      logger.error('Dashboard data retrieval failed', { dashboardId, error });
      throw error;
    }
  }

  /**
   * Create drag-and-drop report builder query
   */
  async buildReport(
    warehouseId: string,
    builder: ReportBuilder
  ): Promise<{ sql: string; data: any[] }> {
    try {
      const warehouse = await prisma.dataWarehouse.findUnique({
        where: { id: warehouseId },
      });

      if (!warehouse) {
        throw new Error(`Warehouse not found: ${warehouseId}`);
      }

      // Build SQL query from report builder configuration
      const sql = this.generateSQLFromBuilder(builder);

      // Execute the generated query
      const data = await this.executeQuery(warehouse.connectionString, sql);

      logger.info('Report built successfully', {
        warehouseId,
        recordCount: data.length,
      });

      return { sql, data };
    } catch (error: unknown) {
      logger.error('Report building failed', { warehouseId, builder, error });
      throw error;
    }
  }

  /**
   * Generate SQL from report builder configuration
   */
  private generateSQLFromBuilder(builder: ReportBuilder): string {
    let sql = 'SELECT ';

    // Build SELECT clause
    const selectColumns = builder.columns.map(col => {
      if (col.aggregation && builder.groupBy && builder.groupBy.includes(col.field)) {
        return `${col.aggregation.toUpperCase()}(${col.field}) as ${col.field}_${col.aggregation}`;
      }
      return col.field;
    });

    sql += selectColumns.join(', ');
    sql += ` FROM ${builder.dataSource}`;

    // Build WHERE clause
    if (builder.filters && builder.filters.length > 0) {
      const whereConditions = builder.filters.map(filter => 
        this.buildFilterCondition(filter)
      ).filter(Boolean);

      if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
      }
    }

    // Build GROUP BY clause
    if (builder.groupBy && builder.groupBy.length > 0) {
      sql += ' GROUP BY ' + builder.groupBy.join(', ');
    }

    // Build ORDER BY clause
    if (builder.orderBy && builder.orderBy.length > 0) {
      const orderClauses = builder.orderBy.map(order => 
        `${order.field} ${order.direction.toUpperCase()}`
      );
      sql += ' ORDER BY ' + orderClauses.join(', ');
    }

    // Add LIMIT clause
    if (builder.limit) {
      sql += ` LIMIT ${builder.limit}`;
    }

    return sql;
  }

  /**
   * Build filter condition for SQL
   */
  private buildFilterCondition(filter: FilterConfiguration): string {
    const { field, operator, value, type } = filter;

    switch (operator) {
      case 'equals':
        return type === 'text' ? `${field} = '${value}'` : `${field} = ${value}`;
      case 'contains':
        return `${field} ILIKE '%${value}%'`;
      case 'greater':
        return `${field} > ${type === 'text' ? `'${value}'` : value}`;
      case 'less':
        return `${field} < ${type === 'text' ? `'${value}'` : value}`;
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return `${field} BETWEEN ${value[0]} AND ${value[1]}`;
        }
        break;
      case 'in':
        if (Array.isArray(value)) {
          const values = type === 'text' 
            ? value.map(v => `'${v}'`).join(', ')
            : value.join(', ');
          return `${field} IN (${values})`;
        }
        break;
    }

    return '';
  }

  /**
   * Calculate KPI values
   */
  private async calculateKPI(kpiConfig: KPIConfiguration, parameters: Record<string, any>): Promise<any> {
    try {
      // This would typically execute a specific query to calculate the KPI
      // For now, return a mock KPI calculation
      const kpi = {
        ...kpiConfig,
        calculatedAt: new Date(),
        status: kpiConfig.target && kpiConfig.value 
          ? (Number(kpiConfig.value) >= kpiConfig.target ? 'success' : 'warning')
          : 'info',
      };

      return kpi;
    } catch (error: unknown) {
      logger.error('KPI calculation failed', { kpiConfig, error });
      throw error;
    }
  }

  /**
   * Execute SQL query against data warehouse
   */
  private async executeQuery(connectionString: string, sql: string): Promise<any[]> {
    try {
      // This would connect to the actual data warehouse
      // For now, return mock data
      const mockData = this.generateMockData(sql);
      return mockData;
    } catch (error: unknown) {
      logger.error('Query execution failed', { sql, error });
      throw error;
    }
  }

  /**
   * Process report data based on chart configuration
   */
  private processReportData(data: any[], chartConfig: ChartConfiguration): any[] {
    try {
      let processedData = [...data];

      // Apply filters
      if (chartConfig.filters) {
        chartConfig.filters.forEach(filter => {
          processedData = processedData.filter(row => 
            this.evaluateFilter(row, filter)
          );
        });
      }

      // Apply aggregations if needed
      if (chartConfig.yAxis?.aggregation || chartConfig.series) {
        processedData = this.applyAggregations(processedData, chartConfig);
      }

      // Sort data for better visualization
      if (chartConfig.xAxis?.field) {
        processedData.sort((a, b) => {
          const aVal = a[chartConfig.xAxis.field];
          const bVal = b[chartConfig.xAxis.field];
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        });
      }

      return processedData;
    } catch (error: unknown) {
      logger.error('Data processing failed', { chartConfig, error });
      return data; // Return original data if processing fails
    }
  }

  /**
   * Evaluate filter condition on data row
   */
  private evaluateFilter(row: any, filter: FilterConfiguration): boolean {
    const fieldValue = row[filter.field];
    const filterValue = filter.value;

    switch (filter.operator) {
      case 'equals':
        return fieldValue === filterValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'greater':
        return fieldValue > filterValue;
      case 'less':
        return fieldValue < filterValue;
      case 'between':
        if (Array.isArray(filterValue) && filterValue.length === 2) {
          return fieldValue >= filterValue[0] && fieldValue <= filterValue[1];
        }
        return true;
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue);
      default:
        return true;
    }
  }

  /**
   * Apply aggregations to data
   */
  private applyAggregations(data: any[], chartConfig: ChartConfiguration): any[] {
    if (!chartConfig.xAxis?.field) {return data;}

    const groupedData = data.reduce((acc, row) => {
      const key = row[chartConfig.xAxis.field];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(groupedData).map(([key, rows]) => {
      const aggregated: any = { [chartConfig.xAxis.field]: key };

      if (chartConfig.yAxis) {
        aggregated[chartConfig.yAxis.field] = this.calculateAggregation(
          (rows as any[]).map(row => row[chartConfig.yAxis.field]),
          chartConfig.yAxis.aggregation || 'sum'
        );
      }

      if (chartConfig.series) {
        chartConfig.series.forEach(series => {
          aggregated[series.field] = this.calculateAggregation(
            (rows as any[]).map(row => row[series.field]),
            series.aggregation || 'sum'
          );
        });
      }

      return aggregated;
    });
  }

  /**
   * Calculate aggregation value
   */
  private calculateAggregation(values: any[], aggregation: string): number {
    const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));

    switch (aggregation) {
      case 'sum':
        return numericValues.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return numericValues.length > 0 
          ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length 
          : 0;
      case 'count':
        return values.length;
      case 'min':
        return numericValues.length > 0 ? Math.min(...numericValues) : 0;
      case 'max':
        return numericValues.length > 0 ? Math.max(...numericValues) : 0;
      default:
        return 0;
    }
  }

  /**
   * Generate mock data for development/testing
   */
  private generateMockData(sql: string): any[] {
    // Generate appropriate mock data based on the SQL query
    if (sql.toLowerCase().includes('asset')) {
      return this.generateAssetMockData();
    } else if (sql.toLowerCase().includes('space')) {
      return this.generateSpaceMockData();
    } else if (sql.toLowerCase().includes('maintenance')) {
      return this.generateMaintenanceMockData();
    } else {
      return this.generateGenericMockData();
    }
  }

  /**
   * Generate mock asset data
   */
  private generateAssetMockData(): any[] {
    const categories = ['Office Equipment', 'HVAC', 'Lighting', 'Security', 'Furniture'];
    const statuses = ['Active', 'Maintenance', 'Retired'];
    const data = [];

    for (let i = 0; i < 100; i++) {
      data.push({
        id: `asset_${i + 1}`,
        name: `Asset ${i + 1}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        purchase_price: Math.floor(Math.random() * 10000) + 1000,
        purchase_date: new Date(2020, Math.floor(Math.random() * 48), 1),
        maintenance_cost: Math.floor(Math.random() * 1000),
        utilization: Math.floor(Math.random() * 100),
      });
    }

    return data;
  }

  /**
   * Generate mock space data
   */
  private generateSpaceMockData(): any[] {
    const spaceTypes = ['Office', 'Conference Room', 'Lobby', 'Storage', 'Kitchen'];
    const data = [];

    for (let i = 0; i < 50; i++) {
      data.push({
        id: `space_${i + 1}`,
        name: `Space ${i + 1}`,
        type: spaceTypes[Math.floor(Math.random() * spaceTypes.length)],
        square_footage: Math.floor(Math.random() * 1000) + 100,
        capacity: Math.floor(Math.random() * 50) + 5,
        occupancy_rate: Math.floor(Math.random() * 100),
        monthly_cost: Math.floor(Math.random() * 5000) + 500,
        utilization_score: Math.floor(Math.random() * 100),
      });
    }

    return data;
  }

  /**
   * Generate mock maintenance data
   */
  private generateMaintenanceMockData(): any[] {
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    const statuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
    const data = [];

    for (let i = 0; i < 200; i++) {
      const createdDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      data.push({
        id: `wo_${i + 1}`,
        work_order_number: `WO-2024-${String(i + 1).padStart(4, '0')}`,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        created_date: createdDate,
        estimated_cost: Math.floor(Math.random() * 5000) + 100,
        actual_cost: Math.floor(Math.random() * 6000) + 100,
        estimated_hours: Math.floor(Math.random() * 40) + 1,
        actual_hours: Math.floor(Math.random() * 50) + 1,
        completion_rate: Math.floor(Math.random() * 100),
      });
    }

    return data;
  }

  /**
   * Generate generic mock data
   */
  private generateGenericMockData(): any[] {
    const data = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 12; i++) {
      data.push({
        month: months[i],
        revenue: Math.floor(Math.random() * 100000) + 50000,
        expenses: Math.floor(Math.random() * 80000) + 30000,
        profit: Math.floor(Math.random() * 50000) + 10000,
        occupancy: Math.floor(Math.random() * 30) + 70,
        satisfaction: Math.floor(Math.random() * 20) + 80,
      });
    }

    return data;
  }

  /**
   * Get available data sources for report building
   */
  async getDataSources(warehouseId: string): Promise<any[]> {
    try {
      const warehouse = await prisma.dataWarehouse.findUnique({
        where: { id: warehouseId },
      });

      if (!warehouse) {
        throw new Error(`Warehouse not found: ${warehouseId}`);
      }

      // This would query the warehouse's information schema
      // For now, return mock data sources
      const dataSources = [
        {
          name: 'assets',
          displayName: 'Assets',
          description: 'Asset management data',
          columns: [
            { name: 'id', type: 'string', displayName: 'Asset ID' },
            { name: 'name', type: 'string', displayName: 'Asset Name' },
            { name: 'category', type: 'string', displayName: 'Category' },
            { name: 'status', type: 'string', displayName: 'Status' },
            { name: 'purchase_price', type: 'number', displayName: 'Purchase Price' },
            { name: 'purchase_date', type: 'date', displayName: 'Purchase Date' },
            { name: 'maintenance_cost', type: 'number', displayName: 'Maintenance Cost' },
          ],
        },
        {
          name: 'spaces',
          displayName: 'Spaces',
          description: 'Space utilization data',
          columns: [
            { name: 'id', type: 'string', displayName: 'Space ID' },
            { name: 'name', type: 'string', displayName: 'Space Name' },
            { name: 'type', type: 'string', displayName: 'Space Type' },
            { name: 'square_footage', type: 'number', displayName: 'Square Footage' },
            { name: 'capacity', type: 'number', displayName: 'Capacity' },
            { name: 'occupancy_rate', type: 'number', displayName: 'Occupancy Rate' },
            { name: 'monthly_cost', type: 'number', displayName: 'Monthly Cost' },
          ],
        },
        {
          name: 'work_orders',
          displayName: 'Work Orders',
          description: 'Maintenance work orders',
          columns: [
            { name: 'id', type: 'string', displayName: 'Work Order ID' },
            { name: 'work_order_number', type: 'string', displayName: 'Work Order Number' },
            { name: 'priority', type: 'string', displayName: 'Priority' },
            { name: 'status', type: 'string', displayName: 'Status' },
            { name: 'created_date', type: 'date', displayName: 'Created Date' },
            { name: 'estimated_cost', type: 'number', displayName: 'Estimated Cost' },
            { name: 'actual_cost', type: 'number', displayName: 'Actual Cost' },
            { name: 'estimated_hours', type: 'number', displayName: 'Estimated Hours' },
            { name: 'actual_hours', type: 'number', displayName: 'Actual Hours' },
          ],
        },
      ];

      return dataSources;
    } catch (error: unknown) {
      logger.error('Failed to get data sources', { warehouseId, error });
      throw error;
    }
  }

  /**
   * Get suggested visualizations for data
   */
  getSuggestedVisualizations(columns: ColumnConfiguration[]): ChartConfiguration[] {
    const suggestions: ChartConfiguration[] = [];

    const numericColumns = columns.filter(col => col.type === 'number' || col.type === 'currency');
    const textColumns = columns.filter(col => col.type === 'text');
    const dateColumns = columns.filter(col => col.type === 'date');

    // Suggest bar chart for categorical data with numeric values
    if (textColumns.length > 0 && numericColumns.length > 0) {
      suggestions.push({
        type: 'bar',
        xAxis: { field: textColumns[0].field, label: textColumns[0].label },
        yAxis: { field: numericColumns[0].field, label: numericColumns[0].label, aggregation: 'sum' },
      });
    }

    // Suggest line chart for time series data
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      suggestions.push({
        type: 'line',
        xAxis: { field: dateColumns[0].field, label: dateColumns[0].label, type: 'datetime' },
        yAxis: { field: numericColumns[0].field, label: numericColumns[0].label, aggregation: 'sum' },
      });
    }

    // Suggest pie chart for categorical distribution
    if (textColumns.length > 0) {
      suggestions.push({
        type: 'pie',
        xAxis: { field: textColumns[0].field, label: textColumns[0].label },
        yAxis: { field: textColumns[0].field, aggregation: 'count' },
      });
    }

    // Suggest table for detailed data
    suggestions.push({
      type: 'table',
    });

    return suggestions;
  }

  /**
   * Export report data in various formats
   */
  async exportReport(
    reportId: string,
    format: 'csv' | 'excel' | 'pdf' | 'json',
    parameters: Record<string, any> = {}
  ): Promise<Buffer> {
    try {
      const reportData = await this.executeReport(reportId, parameters);
      
      switch (format) {
        case 'csv':
          return this.exportToCSV(reportData.data);
        case 'excel':
          return this.exportToExcel(reportData);
        case 'pdf':
          return this.exportToPDF(reportData);
        case 'json':
          return Buffer.from(JSON.stringify(reportData, null, 2));
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error: unknown) {
      logger.error('Report export failed', { reportId, format, error });
      throw error;
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(data: any[]): Buffer {
    if (!data.length) {return Buffer.from('');}

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          typeof row[header] === 'string' && row[header].includes(',')
            ? `"${row[header]}"` 
            : row[header]
        ).join(',')
      ),
    ].join('\n');

    return Buffer.from(csvContent);
  }

  /**
   * Export to Excel format
   */
  private exportToExcel(reportData: any): Buffer {
    // This would use a library like xlsx to generate Excel files
    // For now, return CSV format
    return this.exportToCSV(reportData.data);
  }

  /**
   * Export to PDF format
   */
  private exportToPDF(reportData: any): Buffer {
    // This would use a library like PDFKit to generate PDF files
    // For now, return JSON format
    return Buffer.from(JSON.stringify(reportData, null, 2));
  }
}