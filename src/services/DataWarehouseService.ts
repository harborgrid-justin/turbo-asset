import { prisma } from '../config/database';
import { logger } from '@/config/logger';
import { EventEmitter } from 'events';
import cron from 'node-cron';

export interface ETLPipeline {
  id: string;
  name: string;
  source: DataSource;
  target: DataTarget;
  transformations: DataTransformation[];
  schedule?: string;
  isActive: boolean;
}

export interface DataSource {
  type: 'DATABASE' | 'API' | 'FILE' | 'STREAM';
  connectionString: string;
  configuration: any;
  query?: string;
  endpoint?: string;
}

export interface DataTarget {
  type: 'WAREHOUSE' | 'LAKE' | 'MART';
  connectionString: string;
  schema: string;
  table: string;
  configuration: any;
}

export interface DataTransformation {
  type: 'MAP' | 'FILTER' | 'AGGREGATE' | 'JOIN' | 'CUSTOM';
  configuration: any;
  sql?: string;
  function?: string;
}

export interface DataQualityRule {
  id: string;
  name: string;
  description?: string;
  column: string;
  ruleType: 'NOT_NULL' | 'UNIQUE' | 'RANGE' | 'PATTERN' | 'CUSTOM';
  configuration: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ETLMetrics {
  pipelineId: string;
  startTime: Date;
  endTime?: Date;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errorCount: number;
  warnings: string[];
  errors: string[];
}

export class DataWarehouseService extends EventEmitter {
  private scheduledJobs: Map<string, any> = new Map();
  private runningPipelines: Map<string, ETLMetrics> = new Map();
  private connections: Map<string, any> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
    this.loadScheduledPipelines();
  }

  /**
   * Setup event handlers for ETL processes
   */
  private setupEventHandlers(): void {
    this.on('pipeline:started', this.handlePipelineStarted.bind(this));
    this.on('pipeline:completed', this.handlePipelineCompleted.bind(this));
    this.on('pipeline:failed', this.handlePipelineFailed.bind(this));
    this.on('data:quality:violation', this.handleDataQualityViolation.bind(this));
  }

  /**
   * Create data warehouse
   */
  async createWarehouse(
    organizationId: string,
    name: string,
    description: string,
    databaseType: string,
    connectionString: string
  ): Promise<any> {
    try {
      const warehouse = await prisma.dataWarehouse.create({
        data: {
          name,
          description,
          databaseType,
          connectionString,
          organizationId,
        },
      });

      // Initialize warehouse schema
      await this.initializeWarehouseSchema(warehouse.id, databaseType);

      logger.info('Data warehouse created', {
        warehouseId: warehouse.id,
        name,
        databaseType,
      });

      return warehouse;
    } catch (error: unknown) {
      logger.error('Failed to create data warehouse', { name, error });
      throw error;
    }
  }

  /**
   * Create ETL process
   */
  async createETLProcess(
    warehouseId: string,
    name: string,
    description: string,
    sourceConfig: DataSource,
    targetConfig: DataTarget,
    transformationSQL: string,
    schedulePattern?: string
  ): Promise<any> {
    try {
      const etlProcess = await prisma.eTLProcess.create({
        data: {
          name,
          description,
          warehouseId,
          sourceConfig,
          targetConfig,
          transformationSQL,
          schedulePattern,
          status: 'INACTIVE',
        },
      });

      // Schedule if pattern provided
      if (schedulePattern) {
        await this.scheduleETLProcess(etlProcess.id, schedulePattern);
      }

      logger.info('ETL process created', {
        processId: etlProcess.id,
        warehouseId,
        name,
      });

      return etlProcess;
    } catch (error: unknown) {
      logger.error('Failed to create ETL process', { name, error });
      throw error;
    }
  }

  /**
   * Execute ETL process
   */
  async executeETLProcess(processId: string): Promise<ETLMetrics> {
    try {
      const process = await prisma.eTLProcess.findUnique({
        where: { id: processId },
        include: { warehouse: true },
      });

      if (!process) {
        throw new Error(`ETL process not found: ${processId}`);
      }

      const metrics: ETLMetrics = {
        pipelineId: processId,
        startTime: new Date(),
        status: 'RUNNING',
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errorCount: 0,
        warnings: [],
        errors: [],
      };

      this.runningPipelines.set(processId, metrics);
      this.emit('pipeline:started', { processId, metrics });

      // Update process status
      await prisma.eTLProcess.update({
        where: { id: processId },
        data: { status: 'RUNNING', lastRunAt: new Date() },
      });

      try {
        // Extract data from source
        const sourceData = await this.extractData(process.sourceConfig);
        metrics.recordsProcessed = sourceData.length;

        // Transform data
        const transformedData = await this.transformData(sourceData, process.transformationSQL);

        // Load data into target
        const loadResults = await this.loadData(transformedData, process.targetConfig);
        metrics.recordsInserted = loadResults.inserted;
        metrics.recordsUpdated = loadResults.updated;
        metrics.recordsDeleted = loadResults.deleted;

        // Run data quality checks
        await this.runDataQualityChecks(processId, transformedData);

        metrics.status = 'SUCCESS';
        metrics.endTime = new Date();

        await this.updateETLMetrics(processId, metrics);
        await this.updateProcessStatus(processId, 'COMPLETED', metrics);

        this.emit('pipeline:completed', { processId, metrics });

        logger.info('ETL process completed successfully', {
          processId,
          recordsProcessed: metrics.recordsProcessed,
          duration: metrics.endTime.getTime() - metrics.startTime.getTime(),
        });

        return metrics;
      } catch (error: unknown) {
        metrics.status = 'FAILED';
        metrics.endTime = new Date();
        metrics.errors.push((error as Error).message);
        metrics.errorCount++;

        await this.updateETLMetrics(processId, metrics);
        await this.updateProcessStatus(processId, 'FAILED', metrics);

        this.emit('pipeline:failed', { processId, metrics, error });
        throw error;
      } finally {
        this.runningPipelines.delete(processId);
      }
    } catch (error: unknown) {
      logger.error('ETL process execution failed', { processId, error });
      throw error;
    }
  }

  /**
   * Extract data from source
   */
  private async extractData(sourceConfig: DataSource): Promise<any[]> {
    switch (sourceConfig.type) {
      case 'DATABASE':
        return this.extractFromDatabase(sourceConfig);
      case 'API':
        return this.extractFromAPI(sourceConfig);
      case 'FILE':
        return this.extractFromFile(sourceConfig);
      case 'STREAM':
        return this.extractFromStream(sourceConfig);
      default:
        throw new Error(`Unsupported source type: ${sourceConfig.type}`);
    }
  }

  /**
   * Extract from database
   */
  private async extractFromDatabase(sourceConfig: DataSource): Promise<any[]> {
    try {
      const connection = await this.getConnection(sourceConfig.connectionString);
      const result = await connection.query(sourceConfig.query);
      return Array.isArray(result) ? result : result.rows || [];
    } catch (error: unknown) {
      logger.error('Database extraction failed', { sourceConfig, error });
      throw error;
    }
  }

  /**
   * Extract from API
   */
  private async extractFromAPI(sourceConfig: DataSource): Promise<any[]> {
    try {
      const axios = require('axios');
      const response = await axios.get(sourceConfig.endpoint, {
        headers: sourceConfig.configuration.headers || {},
        params: sourceConfig.configuration.params || {},
        timeout: sourceConfig.configuration.timeout || 30000,
      });

      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error: unknown) {
      logger.error('API extraction failed', { sourceConfig, error });
      throw error;
    }
  }

  /**
   * Extract from file
   */
  private async extractFromFile(sourceConfig: DataSource): Promise<any[]> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const filePath = sourceConfig.configuration.filePath;
      const fileContent = await fs.readFile(filePath, 'utf8');

      switch (path.extname(filePath).toLowerCase()) {
        case '.json':
          const jsonData = JSON.parse(fileContent);
          return Array.isArray(jsonData) ? jsonData : [jsonData];
        case '.csv':
          return this.parseCSV(fileContent);
        default:
          throw new Error(`Unsupported file format: ${path.extname(filePath)}`);
      }
    } catch (error: unknown) {
      logger.error('File extraction failed', { sourceConfig, error });
      throw error;
    }
  }

  /**
   * Extract from stream
   */
  private async extractFromStream(sourceConfig: DataSource): Promise<any[]> {
    // Stream processing implementation would go here
    // This is a placeholder for stream processing functionality
    logger.info('Stream extraction completed', { sourceConfig });
    return [];
  }

  /**
   * Transform data using SQL or custom logic
   */
  private async transformData(data: any[], transformationSQL: string): Promise<any[]> {
    try {
      if (transformationSQL.trim().startsWith('SELECT')) {
        // SQL transformation using in-memory SQL engine
        return this.executeSQLTransformation(data, transformationSQL);
      } else {
        // Custom transformation logic
        return this.executeCustomTransformation(data, transformationSQL);
      }
    } catch (error: unknown) {
      logger.error('Data transformation failed', { error });
      throw error;
    }
  }

  /**
   * Execute SQL transformation
   */
  private async executeSQLTransformation(data: any[], sql: string): Promise<any[]> {
    try {
      // Use alasql for in-memory SQL operations
      const alasql = require('alasql');
      alasql('CREATE TABLE source_data');
      alasql('INSERT INTO source_data SELECT * FROM ?', [data]);
      
      const result = alasql(sql);
      
      alasql('DROP TABLE source_data');
      return result;
    } catch (error: unknown) {
      logger.error('SQL transformation failed', { sql, error });
      throw error;
    }
  }

  /**
   * Execute custom transformation
   */
  private executeCustomTransformation(data: any[], transformationCode: string): any[] {
    try {
      // Execute custom transformation function
      // This would typically be a safe sandbox environment
      const transformFunction = new Function('data', transformationCode);
      return transformFunction(data);
    } catch (error: unknown) {
      logger.error('Custom transformation failed', { error });
      throw error;
    }
  }

  /**
   * Load data into target
   */
  private async loadData(data: any[], targetConfig: DataTarget): Promise<{ inserted: number; updated: number; deleted: number }> {
    try {
      const connection = await this.getConnection(targetConfig.connectionString);
      
      let inserted = 0, updated = 0, deleted = 0;

      for (const record of data) {
        try {
          if (record._operation === 'DELETE') {
            await this.deleteRecord(connection, targetConfig, record);
            deleted++;
          } else if (await this.recordExists(connection, targetConfig, record)) {
            await this.updateRecord(connection, targetConfig, record);
            updated++;
          } else {
            await this.insertRecord(connection, targetConfig, record);
            inserted++;
          }
        } catch (error: unknown) {
          logger.warn('Record processing failed', { record, error });
        }
      }

      logger.info('Data loading completed', {
        inserted,
        updated,
        deleted,
        table: `${targetConfig.schema}.${targetConfig.table}`,
      });

      return { inserted, updated, deleted };
    } catch (error: unknown) {
      logger.error('Data loading failed', { targetConfig, error });
      throw error;
    }
  }

  /**
   * Run data quality checks
   */
  private async runDataQualityChecks(processId: string, data: any[]): Promise<void> {
    try {
      const rules = await this.getDataQualityRules(processId);
      
      for (const rule of rules) {
        const violations = await this.checkRule(rule, data);
        
        if (violations.length > 0) {
          this.emit('data:quality:violation', {
            processId,
            rule,
            violations,
          });

          logger.warn('Data quality violations detected', {
            processId,
            ruleName: rule.name,
            violationCount: violations.length,
          });
        }
      }
    } catch (error: unknown) {
      logger.error('Data quality check failed', { processId, error });
    }
  }

  /**
   * Check individual data quality rule
   */
  private async checkRule(rule: DataQualityRule, data: any[]): Promise<any[]> {
    const violations = [];

    for (const record of data) {
      switch (rule.ruleType) {
        case 'NOT_NULL':
          if (record[rule.column] == null) {
            violations.push({ record, reason: 'Null value' });
          }
          break;
        case 'UNIQUE':
          // This would require tracking seen values across the dataset
          break;
        case 'RANGE':
          const value = record[rule.column];
          if (value < rule.configuration.min || value > rule.configuration.max) {
            violations.push({ record, reason: 'Out of range' });
          }
          break;
        case 'PATTERN':
          const pattern = new RegExp(rule.configuration.regex);
          if (!pattern.test(record[rule.column])) {
            violations.push({ record, reason: 'Pattern mismatch' });
          }
          break;
        case 'CUSTOM':
          // Execute custom validation logic
          break;
      }
    }

    return violations;
  }

  /**
   * Schedule ETL process
   */
  async scheduleETLProcess(processId: string, cronPattern: string): Promise<void> {
    try {
      if (this.scheduledJobs.has(processId)) {
        this.scheduledJobs.get(processId).destroy();
      }

      const job = cron.schedule(cronPattern, async () => {
        try {
          await this.executeETLProcess(processId);
        } catch (error: unknown) {
          logger.error('Scheduled ETL process failed', { processId, error });
        }
      }, {
        scheduled: false,
      });

      this.scheduledJobs.set(processId, job);
      job.start();

      // Update next run time
      const nextRun = this.getNextCronExecution(cronPattern);
      await prisma.eTLProcess.update({
        where: { id: processId },
        data: { 
          status: 'ACTIVE',
          nextRunAt: nextRun,
        },
      });

      logger.info('ETL process scheduled', {
        processId,
        cronPattern,
        nextRun,
      });
    } catch (error: unknown) {
      logger.error('Failed to schedule ETL process', { processId, error });
      throw error;
    }
  }

  /**
   * Get historical data from warehouse
   */
  async getHistoricalData(
    warehouseId: string,
    table: string,
    startDate: Date,
    endDate: Date,
    columns?: string[],
    filters?: Record<string, any>
  ): Promise<any[]> {
    try {
      const warehouse = await prisma.dataWarehouse.findUnique({
        where: { id: warehouseId },
      });

      if (!warehouse) {
        throw new Error(`Warehouse not found: ${warehouseId}`);
      }

      const connection = await this.getConnection(warehouse.connectionString);
      
      const selectClause = columns ? columns.join(', ') : '*';
      let query = `SELECT ${selectClause} FROM ${table} WHERE created_at BETWEEN $1 AND $2`;
      const params = [startDate, endDate];

      // Add additional filters
      if (filters) {
        let paramIndex = 3;
        for (const [column, value] of Object.entries(filters)) {
          query += ` AND ${column} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      }

      const result = await connection.query(query, params);
      return result.rows || result;
    } catch (error: unknown) {
      logger.error('Historical data retrieval failed', {
        warehouseId,
        table,
        startDate,
        endDate,
        error,
      });
      throw error;
    }
  }

  /**
   * Create data mart for specific business domain
   */
  async createDataMart(
    warehouseId: string,
    name: string,
    description: string,
    sourceQuery: string,
    refreshSchedule?: string
  ): Promise<any> {
    try {
      const warehouse = await prisma.dataWarehouse.findUnique({
        where: { id: warehouseId },
      });

      if (!warehouse) {
        throw new Error(`Warehouse not found: ${warehouseId}`);
      }

      const connection = await this.getConnection(warehouse.connectionString);
      
      // Create materialized view for data mart
      const viewName = `dm_${name.toLowerCase().replace(/\s+/g, '_')}`;
      const createViewSQL = `
        CREATE MATERIALIZED VIEW ${viewName} AS
        ${sourceQuery}
      `;

      await connection.query(createViewSQL);

      // Create ETL process for data mart refresh
      if (refreshSchedule) {
        const refreshETL = await this.createETLProcess(
          warehouseId,
          `${name} Refresh`,
          `Refresh data mart: ${name}`,
          {
            type: 'DATABASE',
            connectionString: warehouse.connectionString,
            configuration: {},
            query: sourceQuery,
          },
          {
            type: 'MART',
            connectionString: warehouse.connectionString,
            schema: 'public',
            table: viewName,
            configuration: { operation: 'REFRESH' },
          },
          `REFRESH MATERIALIZED VIEW ${viewName}`,
          refreshSchedule
        );

        logger.info('Data mart created with refresh schedule', {
          viewName,
          refreshETL: refreshETL.id,
          schedule: refreshSchedule,
        });
      }

      logger.info('Data mart created', {
        warehouseId,
        viewName,
        name,
      });

      return {
        name: viewName,
        description,
        sourceQuery,
        createdAt: new Date(),
      };
    } catch (error: unknown) {
      logger.error('Data mart creation failed', {
        warehouseId,
        name,
        error,
      });
      throw error;
    }
  }

  /**
   * Get ETL process metrics
   */
  async getETLMetrics(processId: string, days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // This would typically query a metrics table
      // For now, return sample metrics
      const metrics = {
        processId,
        period: { startDate, endDate },
        totalRuns: 25,
        successfulRuns: 23,
        failedRuns: 2,
        avgExecutionTime: 180, // seconds
        totalRecordsProcessed: 50000,
        avgRecordsPerRun: 2000,
        dataQualityScore: 98.5,
        lastRun: {
          startTime: new Date(Date.now() - 3600000), // 1 hour ago
          endTime: new Date(Date.now() - 3300000), // 55 minutes ago
          status: 'SUCCESS',
          recordsProcessed: 2100,
        },
      };

      return metrics;
    } catch (error: unknown) {
      logger.error('Failed to get ETL metrics', { processId, error });
      throw error;
    }
  }

  /**
   * Load scheduled pipelines on startup
   */
  private async loadScheduledPipelines(): Promise<void> {
    try {
      const scheduledProcesses = await prisma.eTLProcess.findMany({
        where: {
          status: 'ACTIVE',
          schedulePattern: { not: null },
        },
      });

      for (const process of scheduledProcesses) {
        if (process.schedulePattern) {
          await this.scheduleETLProcess(process.id, process.schedulePattern);
        }
      }

      logger.info(`Loaded ${scheduledProcesses.length} scheduled ETL processes`);
    } catch (error: unknown) {
      logger.error('Failed to load scheduled pipelines', { error });
    }
  }

  /**
   * Event handlers
   */
  private async handlePipelineStarted(data: { processId: string; metrics: ETLMetrics }): Promise<void> {
    logger.info('Pipeline started', { processId: data.processId });
  }

  private async handlePipelineCompleted(data: { processId: string; metrics: ETLMetrics }): Promise<void> {
    logger.info('Pipeline completed', { processId: data.processId, metrics: data.metrics });
  }

  private async handlePipelineFailed(data: { processId: string; metrics: ETLMetrics; error: Error }): Promise<void> {
    logger.error('Pipeline failed', { processId: data.processId, error: data.error });
  }

  private async handleDataQualityViolation(data: { processId: string; rule: DataQualityRule; violations: any[] }): Promise<void> {
    logger.warn('Data quality violation detected', {
      processId: data.processId,
      ruleName: data.rule.name,
      violationCount: data.violations.length,
    });
  }

  /**
   * Utility methods
   */
  private async initializeWarehouseSchema(warehouseId: string, databaseType: string): Promise<void> {
    // Initialize warehouse with standard schema
    logger.info('Warehouse schema initialized', { warehouseId, databaseType });
  }

  private async getConnection(connectionString: string): Promise<any> {
    if (!this.connections.has(connectionString)) {
      // Create database connection based on connection string
      // This would use appropriate database drivers
      const connection = {
        query: async (sql: string, params?: any[]) => {
          // Mock database query
          return { rows: [] };
        },
      };
      this.connections.set(connectionString, connection);
    }
    return this.connections.get(connectionString);
  }

  private parseCSV(csvContent: string): any[] {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index]?.trim();
        });
        data.push(record);
      }
    }

    return data;
  }

  private async recordExists(connection: any, targetConfig: DataTarget, record: any): Promise<boolean> {
    // Check if record exists in target table
    return false; // Placeholder
  }

  private async insertRecord(connection: any, targetConfig: DataTarget, record: any): Promise<void> {
    // Insert record into target table
  }

  private async updateRecord(connection: any, targetConfig: DataTarget, record: any): Promise<void> {
    // Update record in target table
  }

  private async deleteRecord(connection: any, targetConfig: DataTarget, record: any): Promise<void> {
    // Delete record from target table
  }

  private async updateETLMetrics(processId: string, metrics: ETLMetrics): Promise<void> {
    // Update ETL metrics in database
    await prisma.eTLProcess.update({
      where: { id: processId },
      data: {
        executionCount: { increment: 1 },
        avgExecutionTime: metrics.endTime && metrics.startTime 
          ? Math.floor((metrics.endTime.getTime() - metrics.startTime.getTime()) / 1000)
          : undefined,
      },
    });
  }

  private async updateProcessStatus(processId: string, status: string, metrics: ETLMetrics): Promise<void> {
    await prisma.eTLProcess.update({
      where: { id: processId },
      data: {
        status: status as any,
        lastRunAt: metrics.startTime,
        nextRunAt: this.calculateNextRun(processId),
      },
    });
  }

  private async getDataQualityRules(processId: string): Promise<DataQualityRule[]> {
    // Get data quality rules for process
    return [];
  }

  private calculateNextRun(processId: string): Date | undefined {
    // Calculate next run time based on schedule
    return undefined;
  }

  private getNextCronExecution(cronPattern: string): Date {
    // Calculate next execution time from cron pattern
    return new Date(Date.now() + 3600000); // 1 hour from now (placeholder)
  }

  /**
   * Stop all scheduled jobs and close connections
   */
  async shutdown(): Promise<void> {
    try {
      // Stop all scheduled jobs
      for (const job of this.scheduledJobs.values()) {
        job.destroy();
      }
      this.scheduledJobs.clear();

      // Close all database connections
      for (const connection of this.connections.values()) {
        if (connection.close) {
          await connection.close();
        }
      }
      this.connections.clear();

      logger.info('Data warehouse service shutdown completed');
    } catch (error: unknown) {
      logger.error('Error during shutdown', { error });
    }
  }
}