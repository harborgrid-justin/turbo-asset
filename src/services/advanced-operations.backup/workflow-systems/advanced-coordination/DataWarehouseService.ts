/**
 * Data Warehouse Service - Advanced Domain Sub-Service
 * 
 * Comprehensive data warehouse management providing ETL pipelines, data quality,
 * synchronization, lineage tracking, and multi-platform warehouse support.
 * Refactored from flat DataWarehouseService.ts into domain architecture.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../config/logger';
import { prisma } from '../../../config/database';
import cron from 'node-cron';
import Bull, { Queue, Job } from 'bull';
import {
  AdvancedOperationsContext,
  DataWarehouseConnection,
  ETLJob,
  DataTransformation,
  ETLSchedule,
  DataQualityRule,
  DataLineage,
} from './types';
import {
  ADVANCED_OPERATIONS_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CACHE_KEYS,
  EVENT_TYPES,
  QUEUE_NAMES,
} from './constants';

export class DataWarehouseService extends EventEmitter {
  private context: AdvancedOperationsContext;
  private etlQueue: Queue;
  private qualityQueue: Queue;
  private connections: Map<string, DataWarehouseConnection> = new Map();
  private activeJobs: Map<string, any> = new Map();

  constructor(context: AdvancedOperationsContext) {
    super();
    this.context = context;
    this.initializeQueues();
    this.loadConnections();
    this.initializeScheduler();
  }

  /**
   * Register a data warehouse connection
   */
  async registerConnection(connection: Omit<DataWarehouseConnection, 'id' | 'lastTested'>): Promise<string> {
    try {
      this.validateConnection(connection);

      // Test connection
      const testResult = await this.testConnection(connection);
      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.error}`);
      }

      const result = await prisma.dataWarehouseConnection.create({
        data: {
          name: connection.name,
          type: connection.type,
          connectionString: this.encryptConnectionString(connection.connectionString),
          credentials: this.encryptCredentials(connection.credentials) as any,
          isActive: connection.isActive,
          lastTested: new Date(),
          organizationId: this.context.organizationId,
          createdBy: this.context.userId,
        },
      });

      const fullConnection: DataWarehouseConnection = {
        id: result.id,
        lastTested: result.lastTested,
        ...connection,
      };

      this.connections.set(result.id, fullConnection);

      logger.info('Data warehouse connection registered', { 
        id: result.id, 
        name: connection.name,
        type: connection.type,
        organizationId: this.context.organizationId 
      });

      return result.id;
    } catch (error: unknown) {
      logger.error('Failed to register data warehouse connection', error);
      throw error;
    }
  }

  /**
   * Create an ETL job
   */
  async createETLJob(job: Omit<ETLJob, 'id' | 'lastRun' | 'nextRun'>): Promise<string> {
    try {
      this.validateETLJob(job);

      // Verify source and target connections exist
      const sourceConnection = await this.getConnection(job.sourceConnection);
      const targetConnection = await this.getConnection(job.targetConnection);

      if (!sourceConnection) {
        throw new Error('Source connection not found');
      }

      if (!targetConnection) {
        throw new Error('Target connection not found');
      }

      const nextRun = this.calculateNextRun(job.schedule);

      const result = await prisma.etlJob.create({
        data: {
          name: job.name,
          description: job.description,
          sourceConnection: job.sourceConnection,
          targetConnection: job.targetConnection,
          extractQuery: job.extractQuery,
          transformationRules: job.transformationRules as any,
          loadStrategy: job.loadStrategy,
          schedule: job.schedule as any,
          isActive: job.isActive,
          nextRun,
          organizationId: this.context.organizationId,
          createdBy: this.context.userId,
        },
      });

      // Schedule the job if it's active
      if (job.isActive && job.schedule.frequency !== 'REAL_TIME') {
        this.scheduleETLJob(result.id, job.schedule);
      }

      logger.info('ETL job created', { 
        id: result.id, 
        name: job.name,
        sourceConnection: job.sourceConnection,
        targetConnection: job.targetConnection,
        organizationId: this.context.organizationId 
      });

      return result.id;
    } catch (error: unknown) {
      logger.error('Failed to create ETL job', error);
      throw error;
    }
  }

  /**
   * Execute an ETL job
   */
  async executeETLJob(jobId: string, forceRun: boolean = false): Promise<string> {
    try {
      const job = await this.getETLJob(jobId);
      if (!job) {
        throw new Error(ERROR_MESSAGES.ETL_JOB_NOT_FOUND);
      }

      if (!job.isActive && !forceRun) {
        throw new Error('ETL job is not active');
      }

      // Check if job is already running
      if (this.activeJobs.has(jobId)) {
        throw new Error('ETL job is already running');
      }

      const executionId = `exec_${jobId}_${Date.now()}`;

      // Record job execution start
      await prisma.etlExecution.create({
        data: {
          id: executionId,
          jobId,
          status: 'RUNNING',
          startedAt: new Date(),
          organizationId: this.context.organizationId,
          triggeredBy: this.context.userId,
        },
      });

      // Add to active jobs
      this.activeJobs.set(jobId, {
        executionId,
        startedAt: new Date(),
        jobId,
      });

      // Queue ETL execution
      await this.etlQueue.add('execute-etl', {
        jobId,
        executionId,
        forceRun,
      }, {
        attempts: job.schedule.retryPolicy.maxRetries,
        backoff: {
          type: 'exponential',
          delay: job.schedule.retryPolicy.retryDelay,
        },
      });

      logger.info('ETL job execution started', { 
        jobId, 
        executionId,
        forceRun 
      });

      this.emit(EVENT_TYPES.ETL_STARTED, {
        jobId,
        executionId,
        timestamp: new Date(),
      });

      return executionId;
    } catch (error: unknown) {
      logger.error('Failed to execute ETL job', error);
      throw error;
    }
  }

  /**
   * Create a data quality rule
   */
  async createQualityRule(rule: Omit<DataQualityRule, 'id'>): Promise<string> {
    try {
      this.validateQualityRule(rule);

      const result = await prisma.dataQualityRule.create({
        data: {
          name: rule.name,
          description: rule.description,
          table: rule.table,
          column: rule.column,
          ruleType: rule.ruleType,
          condition: rule.condition,
          severity: rule.severity,
          isActive: rule.isActive,
          organizationId: this.context.organizationId,
          createdBy: this.context.userId,
        },
      });

      logger.info('Data quality rule created', { 
        id: result.id, 
        name: rule.name,
        ruleType: rule.ruleType,
        severity: rule.severity 
      });

      return result.id;
    } catch (error: unknown) {
      logger.error('Failed to create data quality rule', error);
      throw error;
    }
  }

  /**
   * Run data quality checks
   */
  async runQualityChecks(tablePattern?: string): Promise<{
    totalRules: number;
    passedRules: number;
    failedRules: number;
    qualityScore: number;
    issues: Array<{
      ruleId: string;
      ruleName: string;
      severity: string;
      failureCount: number;
      details: string;
    }>;
  }> {
    try {
      const rules = await this.getActiveQualityRules(tablePattern);
      const results = [];
      let passedCount = 0;
      let failedCount = 0;

      for (const rule of rules) {
        const result = await this.executeQualityRule(rule);
        results.push(result);

        if (result.passed) {
          passedCount++;
        } else {
          failedCount++;
        }
      }

      const qualityScore = rules.length > 0 ? passedCount / rules.length : 1.0;
      const issues = results.filter(r => !r.passed).map(r => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        severity: r.severity,
        failureCount: r.failureCount,
        details: r.details,
      }));

      logger.info('Data quality checks completed', { 
        totalRules: rules.length,
        passedRules: passedCount,
        failedRules: failedCount,
        qualityScore: qualityScore.toFixed(3)
      });

      this.emit(EVENT_TYPES.DATA_QUALITY_CHECK, {
        totalRules: rules.length,
        qualityScore,
        issues: issues.length,
        timestamp: new Date(),
      });

      return {
        totalRules: rules.length,
        passedRules: passedCount,
        failedRules: failedCount,
        qualityScore,
        issues,
      };
    } catch (error: unknown) {
      logger.error('Failed to run data quality checks', error);
      throw error;
    }
  }

  /**
   * Synchronize data warehouse
   */
  async synchronizeWarehouse(): Promise<{
    jobsExecuted: number;
    successfulJobs: number;
    failedJobs: number;
    dataVolumeProcessed: number;
    syncDuration: number;
  }> {
    try {
      const startTime = Date.now();
      const activeJobs = await this.getActiveETLJobs();
      const results = [];
      let successCount = 0;
      let failureCount = 0;
      let totalDataVolume = 0;

      for (const job of activeJobs) {
        try {
          const executionId = await this.executeETLJob(job.id);
          const result = await this.waitForETLCompletion(executionId);
          results.push(result);

          if (result.success) {
            successCount++;
            totalDataVolume += result.recordsProcessed || 0;
          } else {
            failureCount++;
          }
        } catch (error: unknown) {
          logger.error('ETL job execution failed during sync', { jobId: job.id, error });
          failureCount++;
        }
      }

      const syncDuration = Date.now() - startTime;

      logger.info('Data warehouse synchronization completed', { 
        jobsExecuted: activeJobs.length,
        successfulJobs: successCount,
        failedJobs: failureCount,
        dataVolumeProcessed: totalDataVolume,
        syncDuration
      });

      this.emit(EVENT_TYPES.SYNC_COMPLETED, {
        jobsExecuted: activeJobs.length,
        successfulJobs: successCount,
        dataVolumeProcessed: totalDataVolume,
        syncDuration,
        timestamp: new Date(),
      });

      return {
        jobsExecuted: activeJobs.length,
        successfulJobs: successCount,
        failedJobs: failureCount,
        dataVolumeProcessed: totalDataVolume,
        syncDuration,
      };
    } catch (error: unknown) {
      logger.error('Failed to synchronize data warehouse', error);
      throw error;
    }
  }

  /**
   * Track data lineage
   */
  async trackDataLineage(lineage: DataLineage): Promise<void> {
    try {
      await prisma.dataLineage.create({
        data: {
          sourceSystem: lineage.sourceSystem,
          sourceTable: lineage.sourceTable,
          sourceColumn: lineage.sourceColumn,
          targetSystem: lineage.targetSystem,
          targetTable: lineage.targetTable,
          targetColumn: lineage.targetColumn,
          transformations: lineage.transformations,
          lastUpdated: lineage.lastUpdated,
          organizationId: this.context.organizationId,
          trackedBy: this.context.userId,
        },
      });

      logger.info('Data lineage tracked', { 
        sourceSystem: lineage.sourceSystem,
        targetSystem: lineage.targetSystem,
        sourceTable: lineage.sourceTable,
        targetTable: lineage.targetTable 
      });
    } catch (error: unknown) {
      logger.error('Failed to track data lineage', error);
      throw error;
    }
  }

  /**
   * Get data warehouse metrics
   */
  async getWarehouseMetrics(): Promise<{
    activeJobs: number;
    dataVolume: number;
    syncStatus: string;
    qualityScore: number;
    lastSyncTime: Date;
  }> {
    try {
      const [activeJobsCount, dataVolume, qualityResult, lastSync] = await Promise.all([
        this.getActiveJobsCount(),
        this.getTotalDataVolume(),
        this.runQualityChecks(),
        this.getLastSyncTime(),
      ]);

      const syncStatus = this.determineSyncStatus(lastSync);

      return {
        activeJobs: activeJobsCount,
        dataVolume,
        syncStatus,
        qualityScore: qualityResult.qualityScore,
        lastSyncTime: lastSync,
      };
    } catch (error: unknown) {
      logger.error('Failed to get data warehouse metrics', error);
      throw error;
    }
  }

  // Private methods

  private validateConnection(connection: Omit<DataWarehouseConnection, 'id' | 'lastTested'>): void {
    if (!connection.name || connection.name.length < 3) {
      throw new Error('Connection name must be at least 3 characters');
    }

    if (!connection.type || !ADVANCED_OPERATIONS_CONFIG.WAREHOUSE.SUPPORTED_CONNECTIONS.includes(connection.type)) {
      throw new Error('Invalid connection type');
    }

    if (!connection.connectionString) {
      throw new Error('Connection string is required');
    }

    if (!connection.credentials) {
      throw new Error('Connection credentials are required');
    }
  }

  private validateETLJob(job: Omit<ETLJob, 'id' | 'lastRun' | 'nextRun'>): void {
    if (!job.name || job.name.length < 3) {
      throw new Error('ETL job name must be at least 3 characters');
    }

    if (!job.sourceConnection) {
      throw new Error('Source connection is required');
    }

    if (!job.targetConnection) {
      throw new Error('Target connection is required');
    }

    if (!job.extractQuery) {
      throw new Error('Extract query is required');
    }

    if (!job.loadStrategy || !ADVANCED_OPERATIONS_CONFIG.WAREHOUSE.LOAD_STRATEGIES.includes(job.loadStrategy)) {
      throw new Error('Invalid load strategy');
    }

    if (job.transformationRules.length > ADVANCED_OPERATIONS_CONFIG.WAREHOUSE.MAX_TRANSFORMATION_RULES) {
      throw new Error(`Too many transformation rules (max: ${ADVANCED_OPERATIONS_CONFIG.WAREHOUSE.MAX_TRANSFORMATION_RULES})`);
    }
  }

  private validateQualityRule(rule: Omit<DataQualityRule, 'id'>): void {
    if (!rule.name || rule.name.length < 3) {
      throw new Error('Quality rule name must be at least 3 characters');
    }

    if (!rule.table) {
      throw new Error('Table name is required');
    }

    if (!rule.ruleType || !ADVANCED_OPERATIONS_CONFIG.WAREHOUSE.QUALITY_RULES.includes(rule.ruleType)) {
      throw new Error('Invalid quality rule type');
    }

    if (!rule.condition) {
      throw new Error('Rule condition is required');
    }

    if (!rule.severity || !ADVANCED_OPERATIONS_CONFIG.WAREHOUSE.SEVERITY_LEVELS.includes(rule.severity)) {
      throw new Error('Invalid severity level');
    }
  }

  private async testConnection(connection: Omit<DataWarehouseConnection, 'id' | 'lastTested'>): Promise<{
    success: boolean;
    error?: string;
    responseTime?: number;
  }> {
    try {
      const startTime = Date.now();
      
      // Simulate connection test - in real implementation would actually test the connection
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500)); // 0.5-1.5s

      const responseTime = Date.now() - startTime;

      // Simulate occasional connection failures
      if (Math.random() < 0.1) { // 10% failure rate
        return {
          success: false,
          error: 'Connection timeout',
          responseTime,
        };
      }

      return {
        success: true,
        responseTime,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? (error as Error).message : 'Unknown connection error',
      };
    }
  }

  private encryptConnectionString(connectionString: string): string {
    // Placeholder encryption - in real implementation would use proper encryption
    return Buffer.from(connectionString).toString('base64');
  }

  private decryptConnectionString(encryptedString: string): string {
    // Placeholder decryption
    return Buffer.from(encryptedString, 'base64').toString('utf8');
  }

  private encryptCredentials(credentials: any): any {
    // Placeholder encryption for credentials
    return {
      ...credentials,
      encrypted: true,
      timestamp: new Date(),
    };
  }

  private decryptCredentials(encryptedCredentials: any): any {
    // Placeholder decryption for credentials
    return encryptedCredentials;
  }

  private calculateNextRun(schedule: ETLSchedule): Date {
    const now = new Date();
    const nextRun = new Date(now);

    switch (schedule.frequency) {
      case 'REAL_TIME':
        return now; // Immediate execution for real-time
      case 'HOURLY':
        nextRun.setHours(nextRun.getHours() + 1);
        break;
      case 'DAILY':
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(2, 0, 0, 0); // 2 AM next day
        break;
      case 'WEEKLY':
        nextRun.setDate(nextRun.getDate() + 7);
        nextRun.setHours(2, 0, 0, 0);
        break;
      case 'MONTHLY':
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(1);
        nextRun.setHours(2, 0, 0, 0);
        break;
      case 'CUSTOM':
        // For custom schedules, would parse the cron pattern
        nextRun.setDate(nextRun.getDate() + 1);
        break;
    }

    return nextRun;
  }

  private scheduleETLJob(jobId: string, schedule: ETLSchedule): void {
    let cronPattern: string;

    switch (schedule.frequency) {
      case 'HOURLY':
        cronPattern = '0 * * * *';
        break;
      case 'DAILY':
        cronPattern = '0 2 * * *'; // 2 AM daily
        break;
      case 'WEEKLY':
        cronPattern = '0 2 * * 0'; // 2 AM Sunday
        break;
      case 'MONTHLY':
        cronPattern = '0 2 1 * *'; // 2 AM first day of month
        break;
      case 'CUSTOM':
        cronPattern = schedule.cronPattern || '0 2 * * *';
        break;
      default:
        return; // No scheduling for real-time jobs
    }

    cron.schedule(cronPattern, async () => {
      try {
        await this.executeETLJob(jobId);
      } catch (error: unknown) {
        logger.error('Scheduled ETL job execution failed', { jobId, error });
      }
    }, {
      timezone: schedule.timezone,
    });
  }

  private async processETL(jobId: string, executionId: string): Promise<void> {
    try {
      const job = await this.getETLJob(jobId);
      if (!job) {
        throw new Error(ERROR_MESSAGES.ETL_JOB_NOT_FOUND);
      }

      logger.info('ETL job processing started', { jobId, executionId });

      // Extract phase
      const extractedData = await this.extractData(job);
      logger.info('ETL extract phase completed', { jobId, recordCount: extractedData.length });

      // Transform phase
      const transformedData = await this.transformData(extractedData, job.transformationRules);
      logger.info('ETL transform phase completed', { jobId, recordCount: transformedData.length });

      // Load phase
      const loadResult = await this.loadData(transformedData, job);
      logger.info('ETL load phase completed', { jobId, ...loadResult });

      // Update execution record
      await prisma.etlExecution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          recordsProcessed: transformedData.length,
          recordsInserted: loadResult.inserted,
          recordsUpdated: loadResult.updated,
          recordsDeleted: loadResult.deleted,
        },
      });

      // Update job last run
      await prisma.etlJob.update({
        where: { id: jobId },
        data: {
          lastRun: new Date(),
          nextRun: this.calculateNextRun(job.schedule),
        },
      });

      // Remove from active jobs
      this.activeJobs.delete(jobId);

      logger.info('ETL job processing completed', { jobId, executionId });

      this.emit(EVENT_TYPES.ETL_COMPLETED, {
        jobId,
        executionId,
        recordsProcessed: transformedData.length,
        timestamp: new Date(),
      });
    } catch (error: unknown) {
      // Update execution record with error
      await prisma.etlExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? (error as Error).message : 'Unknown error',
        },
      });

      // Remove from active jobs
      this.activeJobs.delete(jobId);

      logger.error('ETL job processing failed', { jobId, executionId, error });

      this.emit(EVENT_TYPES.ETL_FAILED, {
        jobId,
        executionId,
        error: error instanceof Error ? (error as Error).message : 'Unknown error',
        timestamp: new Date(),
      });

      throw error;
    }
  }

  private async extractData(job: ETLJob): Promise<any[]> {
    // Simulate data extraction - in real implementation would execute actual queries
    const recordCount = Math.floor(Math.random() * 10000) + 1000; // 1k-11k records
    const data = [];

    for (let i = 0; i < recordCount; i++) {
      data.push({
        id: i + 1,
        timestamp: new Date(),
        value: Math.random() * 100,
        category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
      });
    }

    return data;
  }

  private async transformData(data: any[], transformationRules: DataTransformation[]): Promise<any[]> {
    let transformedData = [...data];

    for (const rule of transformationRules) {
      transformedData = await this.applyTransformation(transformedData, rule);
    }

    return transformedData;
  }

  private async applyTransformation(data: any[], transformation: DataTransformation): Promise<any[]> {
    switch (transformation.type) {
      case 'MAPPING':
        return this.applyMapping(data, transformation.configuration);
      case 'FILTERING':
        return this.applyFiltering(data, transformation.configuration);
      case 'AGGREGATION':
        return this.applyAggregation(data, transformation.configuration);
      case 'VALIDATION':
        return this.applyValidation(data, transformation.configuration);
      case 'ENRICHMENT':
        return this.applyEnrichment(data, transformation.configuration);
      default:
        return data;
    }
  }

  private applyMapping(data: any[], configuration: any): any[] {
    const mappings = configuration.fieldMappings || {};
    
    return data.map(record => {
      const mappedRecord: any = {};
      
      for (const [sourceField, targetField] of Object.entries(mappings)) {
        if (record[sourceField] !== undefined) {
          mappedRecord[targetField] = record[sourceField];
        }
      }
      
      // Include unmapped fields
      for (const [key, value] of Object.entries(record)) {
        if (!mappings[key]) {
          mappedRecord[key] = value;
        }
      }
      
      return mappedRecord;
    });
  }

  private applyFiltering(data: any[], configuration: any): any[] {
    const filters = configuration.filters || [];
    
    return data.filter(record => {
      return filters.every((filter: any) => {
        const fieldValue = record[filter.field];
        
        switch (filter.operator) {
          case 'EQUALS':
            return fieldValue === filter.value;
          case 'GREATER_THAN':
            return fieldValue > filter.value;
          case 'LESS_THAN':
            return fieldValue < filter.value;
          case 'CONTAINS':
            return String(fieldValue).includes(String(filter.value));
          default:
            return true;
        }
      });
    });
  }

  private applyAggregation(data: any[], configuration: any): any[] {
    const groupBy = configuration.groupBy || [];
    const aggregations = configuration.aggregations || [];
    
    if (groupBy.length === 0) {
      return data;
    }
    
    const groups = new Map();
    
    // Group data
    data.forEach(record => {
      const groupKey = groupBy.map((field: string) => record[field]).join('|');
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey).push(record);
    });
    
    // Apply aggregations
    const aggregatedData = [];
    
    groups.forEach((groupRecords, groupKey) => {
      const aggregatedRecord: any = {};
      
      // Add grouping fields
      groupBy.forEach((field: string, index: number) => {
        aggregatedRecord[field] = groupKey.split('|')[index];
      });
      
      // Apply aggregation functions
      aggregations.forEach((agg: any) => {
        const values = groupRecords.map((r: any) => r[agg.field]).filter((v: any) => v != null);
        
        switch (agg.function) {
          case 'SUM':
            aggregatedRecord[agg.alias || `${agg.field}_sum`] = values.reduce((sum: number, val: number) => sum + val, 0);
            break;
          case 'COUNT':
            aggregatedRecord[agg.alias || `${agg.field}_count`] = values.length;
            break;
          case 'AVG':
            aggregatedRecord[agg.alias || `${agg.field}_avg`] = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
            break;
          case 'MAX':
            aggregatedRecord[agg.alias || `${agg.field}_max`] = Math.max(...values);
            break;
          case 'MIN':
            aggregatedRecord[agg.alias || `${agg.field}_min`] = Math.min(...values);
            break;
        }
      });
      
      aggregatedData.push(aggregatedRecord);
    });
    
    return aggregatedData;
  }

  private applyValidation(data: any[], configuration: any): any[] {
    const validationRules = configuration.rules || [];
    
    return data.filter(record => {
      return validationRules.every((rule: any) => {
        const fieldValue = record[rule.field];
        
        switch (rule.type) {
          case 'NOT_NULL':
            return fieldValue != null;
          case 'RANGE':
            return fieldValue >= rule.min && fieldValue <= rule.max;
          case 'PATTERN':
            return new RegExp(rule.pattern).test(String(fieldValue));
          case 'LENGTH':
            return String(fieldValue).length >= rule.minLength && String(fieldValue).length <= rule.maxLength;
          default:
            return true;
        }
      });
    });
  }

  private applyEnrichment(data: any[], configuration: any): any[] {
    const enrichmentFields = configuration.fields || {};
    
    return data.map(record => ({
      ...record,
      ...enrichmentFields,
      enrichedAt: new Date(),
    }));
  }

  private async loadData(data: unknown[], job: ETLJob): Promise<{
    inserted: number;
    updated: number;
    deleted: number;
  }> {
    // Critical fix: Validate data array to prevent memory issues with malformed data
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    // Critical fix: Process large datasets in chunks to prevent memory exhaustion
    const BATCH_SIZE = 1000;
    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const batchResult = this.processBatch(batch, job);
      
      inserted += batchResult.inserted;
      updated += batchResult.updated;
      deleted += batchResult.deleted;

      // Critical fix: Allow garbage collection between batches
      if (i + BATCH_SIZE < data.length) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    // Critical fix: Realistic loading time based on data size
    const loadingTime = Math.min(Math.max(data.length / 1000, 100), 5000);
    await new Promise(resolve => setTimeout(resolve, loadingTime));

    return { inserted, updated, deleted };
  }

  private processBatch(batch: unknown[], job: ETLJob): {
    inserted: number;
    updated: number;
    deleted: number;
  } {
    const batchSize = batch.length;
    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    switch (job.loadStrategy) {
      case 'FULL':
        inserted = batchSize;
        break;
      case 'INCREMENTAL':
        inserted = Math.floor(batchSize * 0.8);
        updated = batchSize - inserted;
        break;
      case 'DELTA':
        inserted = Math.floor(batchSize * 0.6);
        updated = Math.floor(batchSize * 0.3);
        deleted = batchSize - inserted - updated;
        break;
      case 'UPSERT':
        inserted = Math.floor(batchSize * 0.7);
        updated = batchSize - inserted;
        break;
    }

    return { inserted, updated, deleted };
  }

  private async executeQualityRule(rule: DataQualityRule): Promise<{
    ruleId: string;
    ruleName: string;
    passed: boolean;
    severity: string;
    failureCount: number;
    details: string;
  }> {
    // Simulate quality rule execution
    const failureRate = Math.random() * 0.1; // 0-10% failure rate
    const passed = failureRate < 0.05; // Pass if less than 5%
    const failureCount = Math.floor(Math.random() * 100);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      severity: rule.severity,
      failureCount,
      details: passed ? 'Rule passed successfully' : `${failureCount} violations found`,
    };
  }

  private async getActiveQualityRules(tablePattern?: string): Promise<DataQualityRule[]> {
    const whereClause: any = {
      organizationId: this.context.organizationId,
      isActive: true,
    };

    if (tablePattern) {
      whereClause.table = {
        contains: tablePattern,
      };
    }

    const rules = await prisma.dataQualityRule.findMany({
      where: whereClause,
    });

    return rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description || undefined,
      table: rule.table,
      column: rule.column || undefined,
      ruleType: rule.ruleType as any,
      condition: rule.condition,
      severity: rule.severity as any,
      isActive: rule.isActive,
    }));
  }

  private async waitForETLCompletion(executionId: string, timeoutMs: number = 300000): Promise<{
    success: boolean;
    recordsProcessed?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const execution = await prisma.etlExecution.findUnique({
        where: { id: executionId },
      });

      if (!execution) {
        throw new Error('ETL execution not found');
      }

      if (execution.status === 'COMPLETED') {
        return {
          success: true,
          recordsProcessed: execution.recordsProcessed || 0,
        };
      }

      if (execution.status === 'FAILED') {
        return {
          success: false,
          error: execution.errorMessage || 'Unknown error',
        };
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
    }

    throw new Error(ERROR_MESSAGES.SYNC_TIMEOUT);
  }

  private initializeQueues(): void {
    this.etlQueue = new Bull(QUEUE_NAMES.ETL_EXECUTION, {
      redis: { port: 6379, host: 'localhost' },
    });

    this.qualityQueue = new Bull(QUEUE_NAMES.DATA_QUALITY, {
      redis: { port: 6379, host: 'localhost' },
    });

    // Process ETL queue
    this.etlQueue.process('execute-etl', async (job: Job) => {
      const { jobId, executionId } = job.data;
      await this.processETL(jobId, executionId);
    });

    // Process quality queue
    this.qualityQueue.process('quality-check', async (job: Job) => {
      const { ruleId } = job.data;
      // Quality check processing would go here
    });
  }

  private async loadConnections(): Promise<void> {
    try {
      const connections = await prisma.dataWarehouseConnection.findMany({
        where: { 
          organizationId: this.context.organizationId,
          isActive: true,
        }
      });

      for (const conn of connections) {
        this.connections.set(conn.id, {
          id: conn.id,
          name: conn.name,
          type: conn.type as any,
          connectionString: this.decryptConnectionString(conn.connectionString),
          credentials: this.decryptCredentials(conn.credentials),
          isActive: conn.isActive,
          lastTested: conn.lastTested,
        });
      }

      logger.info('Data warehouse connections loaded', { count: this.connections.size });
    } catch (error: unknown) {
      logger.error('Failed to load data warehouse connections', error);
    }
  }

  private initializeScheduler(): void {
    // Test connections daily
    cron.schedule('0 1 * * *', async () => {
      await this.testAllConnections();
    });

    // Run quality checks daily
    cron.schedule('0 3 * * *', async () => {
      await this.runQualityChecks();
    });
  }

  private async testAllConnections(): Promise<void> {
    for (const [connectionId, connection] of this.connections) {
      try {
        const testResult = await this.testConnection(connection);
        
        await prisma.dataWarehouseConnection.update({
          where: { id: connectionId },
          data: { lastTested: new Date() },
        });

        if (!testResult.success) {
          logger.warn('Connection test failed', { 
            connectionId, 
            connectionName: connection.name,
            error: testResult.error 
          });
        }
      } catch (error: unknown) {
        logger.error('Failed to test connection', { connectionId, error });
      }
    }
  }

  // Getter methods for metrics

  private async getConnection(connectionId: string): Promise<DataWarehouseConnection | null> {
    return this.connections.get(connectionId) || null;
  }

  private async getETLJob(jobId: string): Promise<ETLJob | null> {
    const job = await prisma.etlJob.findUnique({
      where: { 
        id: jobId,
        organizationId: this.context.organizationId 
      }
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      description: job.description || undefined,
      sourceConnection: job.sourceConnection,
      targetConnection: job.targetConnection,
      extractQuery: job.extractQuery,
      transformationRules: job.transformationRules as any,
      loadStrategy: job.loadStrategy as any,
      schedule: job.schedule as any,
      isActive: job.isActive,
      lastRun: job.lastRun || undefined,
      nextRun: job.nextRun || undefined,
    };
  }

  private async getActiveETLJobs(): Promise<ETLJob[]> {
    const jobs = await prisma.etlJob.findMany({
      where: {
        organizationId: this.context.organizationId,
        isActive: true,
      }
    });

    return jobs.map(job => ({
      id: job.id,
      name: job.name,
      description: job.description || undefined,
      sourceConnection: job.sourceConnection,
      targetConnection: job.targetConnection,
      extractQuery: job.extractQuery,
      transformationRules: job.transformationRules as any,
      loadStrategy: job.loadStrategy as any,
      schedule: job.schedule as any,
      isActive: job.isActive,
      lastRun: job.lastRun || undefined,
      nextRun: job.nextRun || undefined,
    }));
  }

  private async getActiveJobsCount(): Promise<number> {
    return this.activeJobs.size;
  }

  private async getTotalDataVolume(): Promise<number> {
    // Placeholder implementation - would calculate actual data volume
    return Math.floor(Math.random() * 1000000000) + 100000000; // 100M-1.1B records
  }

  private async getLastSyncTime(): Promise<Date> {
    const lastExecution = await prisma.etlExecution.findFirst({
      where: {
        organizationId: this.context.organizationId,
        status: 'COMPLETED',
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    return lastExecution?.completedAt || new Date(0);
  }

  private determineSyncStatus(lastSyncTime: Date): string {
    const now = new Date();
    const timeDiff = now.getTime() - lastSyncTime.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff < 1) {
      return 'CURRENT';
    } else if (hoursDiff < 24) {
      return 'RECENT';
    } else if (hoursDiff < 168) { // 7 days
      return 'STALE';
    } else {
      return 'OUTDATED';
    }
  }
}