import { prisma } from '../config/database';
import { logger } from '@/config/logger';
import { InternationalizationService } from './InternationalizationService';
import { CustomFieldService } from './CustomFieldService';
import csvtojson from 'csvtojson';
import xlsx from 'xlsx';
import fs from 'fs/promises';
import Bull from 'bull';
import redis from '../config/redis';

export interface BulkImportOptions {
  entityType: string;
  organizationId: string;
  userId: string;
  mapping: Record<string, string>; // CSV column -> entity field mapping
  validateOnly?: boolean;
  skipInvalidRows?: boolean;
  updateExisting?: boolean;
}

export interface BulkImportResult {
  jobId: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data: Record<string, any>;
  }>;
}

export interface BulkExportOptions {
  entityType: string;
  organizationId: string;
  filters?: Record<string, any>;
  fields?: string[];
  format: 'csv' | 'xlsx';
  includeCustomFields?: boolean;
}

export class BulkDataService {
  private readonly importQueue: Bull.Queue;
  private readonly exportQueue: Bull.Queue;
  private readonly customFieldService: CustomFieldService;
  private readonly i18nService: InternationalizationService;

  constructor() {
    this.importQueue = new Bull('bulk-import', { redis: redis as any });
    this.exportQueue = new Bull('bulk-export', { redis: redis as any });
    this.customFieldService = new CustomFieldService();
    this.i18nService = InternationalizationService.getInstance();
    
    this.setupQueueProcessors();
  }

  /**
   * Import data from CSV file
   */
  async importFromCSV(
    filePath: string,
    options: BulkImportOptions
  ): Promise<BulkImportResult> {
    try {
      // Parse CSV file
      const csvData = await csvtojson().fromFile(filePath);
      
      // Create import job
      const job = await this.importQueue.add('import', {
        data: csvData,
        options,
      });

      logger.info('Bulk import job created', { 
        jobId: job.id, 
        entityType: options.entityType,
        totalRows: csvData.length 
      });

      return {
        jobId: job.id.toString(),
        total: csvData.length,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
      };
    } catch (error: unknown) {
      logger.error('Failed to import from CSV', error);
      throw error;
    }
  }

  /**
   * Import data from Excel file
   */
  async importFromExcel(
    filePath: string,
    options: BulkImportOptions,
    sheetName?: string
  ): Promise<BulkImportResult> {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(sheet);

      // Create import job
      const job = await this.importQueue.add('import', {
        data: jsonData,
        options,
      });

      logger.info('Bulk import job created from Excel', { 
        jobId: job.id, 
        entityType: options.entityType,
        totalRows: jsonData.length 
      });

      return {
        jobId: job.id.toString(),
        total: jsonData.length,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
      };
    } catch (error: unknown) {
      logger.error('Failed to import from Excel', error);
      throw error;
    }
  }

  /**
   * Export data to file
   */
  async exportData(options: BulkExportOptions): Promise<{ jobId: string; filePath?: string }> {
    try {
      const job = await this.exportQueue.add('export', { options });

      logger.info('Bulk export job created', { 
        jobId: job.id, 
        entityType: options.entityType,
        format: options.format 
      });

      return {
        jobId: job.id.toString(),
      };
    } catch (error: unknown) {
      logger.error('Failed to create export job', error);
      throw error;
    }
  }

  /**
   * Get import job status
   */
  async getImportJobStatus(jobId: string): Promise<BulkImportResult | null> {
    try {
      const job = await this.importQueue.getJob(jobId);
      if (!job) {return null;}

      const result = job.returnvalue || {
        jobId,
        total: 0,
        processed: job.progress() || 0,
        successful: 0,
        failed: 0,
        errors: [],
      };

      return result;
    } catch (error: unknown) {
      logger.error('Failed to get import job status', error);
      throw error;
    }
  }

  /**
   * Get export job status
   */
  async getExportJobStatus(jobId: string): Promise<{ status: string; filePath?: string } | null> {
    try {
      const job = await this.exportQueue.getJob(jobId);
      if (!job) {return null;}

      return {
        status: await job.getState(),
        filePath: job.returnvalue?.filePath,
      };
    } catch (error: unknown) {
      logger.error('Failed to get export job status', error);
      throw error;
    }
  }

  /**
   * Setup queue processors
   */
  private setupQueueProcessors(): void {
    this.importQueue.process('import', async (job) => {
      return await this.processImportJob(job.data);
    });

    this.exportQueue.process('export', async (job) => {
      return await this.processExportJob(job.data);
    });

    // Error handling
    this.importQueue.on('failed', (job, err) => {
      logger.error('Import job failed', { jobId: job.id, error: err.message });
    });

    this.exportQueue.on('failed', (job, err) => {
      logger.error('Export job failed', { jobId: job.id, error: err.message });
    });
  }

  /**
   * Process import job
   */
  private async processImportJob(jobData: { data: any[]; options: BulkImportOptions }): Promise<BulkImportResult> {
    const { data, options } = jobData;
    const result: BulkImportResult = {
      jobId: '',
      total: data.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    const customFields = await this.customFieldService.getFieldDefinitions(
      options.organizationId,
      options.entityType
    );

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      result.processed++;

      try {
        // Transform row data using mapping
        const transformedData = this.transformRowData(row, options.mapping);

        // Validate data
        const validation = await this.validateRowData(
          transformedData,
          options.entityType,
          options.organizationId,
          customFields
        );

        if (!validation.isValid) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            message: 'Validation failed',
            data: transformedData,
          });
          
          if (!options.skipInvalidRows) {
            continue;
          }
        }

        if (!options.validateOnly) {
          // Insert or update data
          await this.insertOrUpdateEntity(
            transformedData,
            options.entityType,
            options.organizationId,
            options.updateExisting || false
          );
        }

        result.successful++;
      } catch (error: unknown) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          message: error instanceof Error ? (error).message : 'Unknown error',
          data: row,
        });
      }
    }

    logger.info('Bulk import completed', { 
      entityType: options.entityType,
      total: result.total,
      successful: result.successful,
      failed: result.failed 
    });

    return result;
  }

  /**
   * Process export job
   */
  private async processExportJob(jobData: { options: BulkExportOptions }): Promise<{ filePath: string }> {
    const { options } = jobData;

    // Fetch data
    const data = await this.fetchEntityData(options);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `export-${options.entityType}-${timestamp}.${options.format}`;
    const filePath = `exports/${fileName}`;

    // Ensure exports directory exists
    await fs.mkdir('exports', { recursive: true });

    // Generate file
    if (options.format === 'csv') {
      await this.generateCSV(data, filePath);
    } else {
      await this.generateExcel(data, filePath);
    }

    logger.info('Bulk export completed', { 
      entityType: options.entityType,
      filePath,
      recordCount: data.length 
    });

    return { filePath };
  }

  /**
   * Transform row data using field mapping
   */
  private transformRowData(row: any, mapping: Record<string, string>): Record<string, any> {
    const transformed: Record<string, any> = {};

    for (const [csvColumn, entityField] of Object.entries(mapping)) {
      if (row[csvColumn] !== undefined) {
        transformed[entityField] = row[csvColumn];
      }
    }

    return transformed;
  }

  /**
   * Validate row data
   */
  private async validateRowData(
    data: Record<string, any>,
    entityType: string,
    organizationId: string,
    customFields: any[]
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation based on entity type
    switch (entityType) {
      case 'property':
        if (!data.name) {errors.push('Name is required');}
        if (!data.type) {errors.push('Type is required');}
        break;
      case 'asset':
        if (!data.name) {errors.push('Name is required');}
        if (!data.assetTag) {errors.push('Asset tag is required');}
        break;
      case 'user':
        if (!data.email) {errors.push('Email is required');}
        if (!data.firstName) {errors.push('First name is required');}
        if (!data.lastName) {errors.push('Last name is required');}
        break;
    }

    // Custom field validation
    const customFieldValidation = await this.customFieldService.validateEntityFields(
      organizationId,
      entityType,
      data
    );

    if (!customFieldValidation.isValid) {
      errors.push(...Object.values(customFieldValidation.errors));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Insert or update entity
   */
  private async insertOrUpdateEntity(
    data: Record<string, any>,
    entityType: string,
    organizationId: string,
    updateExisting: boolean
  ): Promise<void> {
    switch (entityType) {
      case 'property':
        await this.handlePropertyImport(data, organizationId, updateExisting);
        break;
      case 'asset':
        await this.handleAssetImport(data, organizationId, updateExisting);
        break;
      case 'user':
        await this.handleUserImport(data, organizationId, updateExisting);
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Handle property import
   */
  private async handlePropertyImport(
    data: Record<string, any>,
    organizationId: string,
    updateExisting: boolean
  ): Promise<void> {
    const propertyData = {
      name: data.name,
      type: data.type,
      address: data.address ? JSON.parse(data.address) : {},
      totalArea: data.totalArea ? parseFloat(data.totalArea) : null,
      usableArea: data.usableArea ? parseFloat(data.usableArea) : null,
      acquisitionCost: data.acquisitionCost ? parseFloat(data.acquisitionCost) : null,
      currentValue: data.currentValue ? parseFloat(data.currentValue) : null,
      acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
      organizationId,
    };

    if (updateExisting && data.id) {
      await prisma.property.update({
        where: { id: data.id },
        data: propertyData,
      });
    } else {
      await prisma.property.create({
        data: propertyData,
      });
    }
  }

  /**
   * Handle asset import
   */
  private async handleAssetImport(
    data: Record<string, any>,
    organizationId: string,
    updateExisting: boolean
  ): Promise<void> {
    const assetData = {
      name: data.name,
      assetTag: data.assetTag,
      type: data.type,
      category: data.category,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serialNumber,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
      condition: data.condition || 'GOOD',
      status: data.status || 'ACTIVE',
    };

    if (updateExisting && data.assetTag) {
      await prisma.asset.updateMany({
        where: { assetTag: data.assetTag },
        data: assetData,
      });
    } else {
      await prisma.asset.create({
        data: assetData,
      });
    }
  }

  /**
   * Handle user import
   */
  private async handleUserImport(
    data: Record<string, any>,
    organizationId: string,
    updateExisting: boolean
  ): Promise<void> {
    const userData = {
      email: data.email,
      username: data.username || data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: data.passwordHash || 'temp-password-hash',
      role: data.role || 'USER',
      language: data.language || 'en',
      currency: data.currency || 'USD',
      organizationId,
    };

    if (updateExisting && data.email) {
      await prisma.user.updateMany({
        where: { email: data.email },
        data: userData,
      });
    } else {
      await prisma.user.create({
        data: userData,
      });
    }
  }

  /**
   * Fetch entity data for export
   */
  private async fetchEntityData(options: BulkExportOptions): Promise<any[]> {
    const { entityType, organizationId, filters, fields } = options;

    let whereClause: any = {};
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    if (filters) {
      whereClause = { ...whereClause, ...filters };
    }

    let selectClause: any = undefined;
    if (fields && fields.length > 0) {
      selectClause = {};
      for (const field of fields) {
        selectClause[field] = true;
      }
    }

    switch (entityType) {
      case 'property':
        return await prisma.property.findMany({
          where: whereClause,
          select: selectClause,
        });
      case 'asset':
        return await prisma.asset.findMany({
          where: whereClause,
          select: selectClause,
        });
      case 'user':
        return await prisma.user.findMany({
          where: whereClause,
          select: selectClause,
        });
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Generate CSV file
   */
  private async generateCSV(data: any[], filePath: string): Promise<void> {
    if (data.length === 0) {return;}

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    await fs.writeFile(filePath, csvContent, 'utf8');
  }

  /**
   * Generate Excel file
   */
  private async generateExcel(data: any[], filePath: string): Promise<void> {
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(data);
    
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Data');
    xlsx.writeFile(workbook, filePath);
  }
}