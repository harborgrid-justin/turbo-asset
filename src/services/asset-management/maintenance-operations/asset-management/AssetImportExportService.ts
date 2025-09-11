import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../config/logger';
import { AssetExportOptions, AssetImportMapping, BulkAssetOperationResult } from './types/AssetTypes';
import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';
import csvParser from 'csvtojson';

const prisma = new PrismaClient();

/**
 * AssetImportExportService - Handles asset data import and export operations
 * Manages CSV/Excel imports, data mapping, validation, and export generation
 * Part of the Asset Management domain within Turbo Asset IWMS
 */
export class AssetImportExportService {

  /**
   * Import assets from CSV file
   */
  async importAssetsFromCSV(
    filePath: string,
    organizationId: string,
    userId: string,
    mappingConfig: AssetImportMapping[]
  ): Promise<BulkAssetOperationResult> {
    try {
      // Parse CSV file
      const csvData = await csvParser().fromFile(filePath);
      
      return await this.processImportData(csvData, organizationId, userId, mappingConfig);
      
    } catch (error) {
      logger.error('Failed to import assets from CSV', {
        filePath,
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Import assets from Excel file
   */
  async importAssetsFromExcel(
    filePath: string,
    organizationId: string,
    userId: string,
    mappingConfig: AssetImportMapping[],
    sheetName?: string
  ): Promise<BulkAssetOperationResult> {
    try {
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const sheet = sheetName || workbook.SheetNames[0];
      const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
      
      return await this.processImportData(excelData, organizationId, userId, mappingConfig);
      
    } catch (error) {
      logger.error('Failed to import assets from Excel', {
        filePath,
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Export assets to CSV
   */
  async exportAssetsToCSV(
    organizationId: string,
    options: AssetExportOptions
  ): Promise<string> {
    try {
      // Get assets based on filters
      const assets = await this.getAssetsForExport(organizationId, options);
      
      // Transform data for CSV
      const csvData = await this.transformAssetsForExport(assets, options);
      
      // Generate CSV content
      const csvContent = this.generateCSVContent(csvData);
      
      // Save to file
      const fileName = `assets_export_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = path.join(process.cwd(), 'exports', fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, csvContent, 'utf8');
      
      logger.info('Assets exported to CSV', {
        organizationId,
        fileName,
        assetCount: assets.length,
      });
      
      return filePath;
      
    } catch (error) {
      logger.error('Failed to export assets to CSV', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Export assets to Excel
   */
  async exportAssetsToExcel(
    organizationId: string,
    options: AssetExportOptions
  ): Promise<string> {
    try {
      // Get assets based on filters
      const assets = await this.getAssetsForExport(organizationId, options);
      
      // Transform data for Excel
      const excelData = await this.transformAssetsForExport(assets, options);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
      
      // Add additional sheets if requested
      if (options.includeMaintenanceHistory) {
        await this.addMaintenanceHistorySheet(workbook, organizationId, options);
      }
      
      if (options.includeFinancialData) {
        await this.addFinancialDataSheet(workbook, organizationId, options);
      }
      
      // Save to file
      const fileName = `assets_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const filePath = path.join(process.cwd(), 'exports', fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      XLSX.writeFile(workbook, filePath);
      
      logger.info('Assets exported to Excel', {
        organizationId,
        fileName,
        assetCount: assets.length,
      });
      
      return filePath;
      
    } catch (error) {
      logger.error('Failed to export assets to Excel', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate asset template for import
   */
  async generateImportTemplate(
    format: 'CSV' | 'XLSX',
    includeExamples: boolean = true
  ): Promise<string> {
    try {
      const templateData = this.getTemplateData(includeExamples);
      
      let filePath: string;
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (format === 'CSV') {
        const csvContent = this.generateCSVContent(templateData);
        const fileName = `asset_import_template_${timestamp}.csv`;
        filePath = path.join(process.cwd(), 'templates', fileName);
        
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, csvContent, 'utf8');
        
      } else {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // Add data validation and formatting
        this.addTemplateFormatting(worksheet, templateData);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
        
        // Add instructions sheet
        const instructionsData = this.getImportInstructions();
        const instructionsWorksheet = XLSX.utils.json_to_sheet(instructionsData);
        XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, 'Instructions');
        
        const fileName = `asset_import_template_${timestamp}.xlsx`;
        filePath = path.join(process.cwd(), 'templates', fileName);
        
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        XLSX.writeFile(workbook, filePath);
      }
      
      logger.info('Import template generated', {
        format,
        fileName: path.basename(filePath),
        includeExamples,
      });
      
      return filePath;
      
    } catch (error) {
      logger.error('Failed to generate import template', {
        format,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate import file before processing
   */
  async validateImportFile(
    filePath: string,
    mappingConfig: AssetImportMapping[]
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    previewData: any[];
    totalRows: number;
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check file exists and is readable
      try {
        await fs.access(filePath);
      } catch {
        errors.push('File not found or not accessible');
        return { isValid: false, errors, warnings, previewData: [], totalRows: 0 };
      }
      
      // Parse file based on extension
      let data: any[] = [];
      const extension = path.extname(filePath).toLowerCase();
      
      if (extension === '.csv') {
        data = await csvParser().fromFile(filePath);
      } else if (extension === '.xlsx' || extension === '.xls') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
        errors.push('Unsupported file format. Only CSV and Excel files are supported.');
        return { isValid: false, errors, warnings, previewData: [], totalRows: 0 };
      }
      
      if (data.length === 0) {
        errors.push('File is empty or contains no data rows');
        return { isValid: false, errors, warnings, previewData: [], totalRows: 0 };
      }
      
      // Validate headers
      const fileHeaders = Object.keys(data[0]);
      const requiredMappings = mappingConfig.filter(mapping => mapping.required);
      
      for (const mapping of requiredMappings) {
        if (!fileHeaders.includes(mapping.sourceField)) {
          errors.push(`Required column '${mapping.sourceField}' not found in file`);
        }
      }
      
      // Validate sample data
      const sampleSize = Math.min(10, data.length);
      for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        for (const mapping of mappingConfig) {
          const value = row[mapping.sourceField];
          
          if (mapping.required && (!value || value.toString().trim() === '')) {
            errors.push(`Row ${i + 2}: Required field '${mapping.sourceField}' is empty`);
          }
          
          if (value && mapping.validation && !mapping.validation(value)) {
            warnings.push(`Row ${i + 2}: Value '${value}' in column '${mapping.sourceField}' may be invalid`);
          }
        }
      }
      
      // Check for duplicates
      const duplicateCheck = this.checkForDuplicates(data, ['assetTag', 'serialNumber']);
      if (duplicateCheck.length > 0) {
        warnings.push(`Found ${duplicateCheck.length} rows with duplicate asset tags or serial numbers`);
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        previewData: data.slice(0, 5), // First 5 rows for preview
        totalRows: data.length,
      };
      
    } catch (error) {
      logger.error('Failed to validate import file', {
        filePath,
        error: error.message,
      });
      
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
        previewData: [],
        totalRows: 0,
      };
    }
  }

  /**
   * Process import data
   */
  private async processImportData(
    data: any[],
    organizationId: string,
    userId: string,
    mappingConfig: AssetImportMapping[]
  ): Promise<BulkAssetOperationResult> {
    const results: BulkAssetOperationResult = {
      successful: 0,
      failed: 0,
      errors: [],
      warnings: [],
    };
    
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        const assetData = this.mapRowToAssetData(row, mappingConfig, organizationId, userId);
        
        // Create asset
        await prisma.maintenanceAsset.create({ data: assetData });
        results.successful++;
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i + 1,
          error: error.message,
          assetTag: data[i]?.assetTag || `Row ${i + 1}`,
        });
      }
    }
    
    logger.info('Asset import completed', {
      organizationId,
      totalRows: data.length,
      successful: results.successful,
      failed: results.failed,
    });
    
    return results;
  }

  /**
   * Map row data to asset data structure
   */
  private mapRowToAssetData(
    row: any,
    mappingConfig: AssetImportMapping[],
    organizationId: string,
    userId: string
  ): any {
    const assetData: any = {
      organizationId,
      createdBy: userId,
      createdAt: new Date(),
    };
    
    for (const mapping of mappingConfig) {
      let value = row[mapping.sourceField];
      
      // Apply transformation if provided
      if (value && mapping.transformation) {
        value = mapping.transformation(value);
      }
      
      // Set the value in asset data
      assetData[mapping.targetField] = value;
    }
    
    // Set defaults for required fields if not provided
    if (!assetData.status) {assetData.status = 'OPERATIONAL';}
    if (!assetData.condition) {assetData.condition = 'GOOD';}
    if (!assetData.criticality) {assetData.criticality = 'MEDIUM';}
    
    return assetData;
  }

  /**
   * Get assets for export based on filters
   */
  private async getAssetsForExport(
    organizationId: string,
    options: AssetExportOptions
  ): Promise<any[]> {
    const where: any = { organizationId };
    
    // Apply date range filter
    if (options.dateRange) {
      where.createdAt = {
        gte: options.dateRange.start,
        lte: options.dateRange.end,
      };
    }
    
    // Apply additional filters
    if (options.filters) {
      Object.assign(where, this.buildWhereClause(options.filters));
    }
    
    // Determine what to include
    const include: any = {};
    
    if (options.includeMaintenanceHistory) {
      include.maintenanceHistory = {
        orderBy: { completedDate: 'desc' },
        take: 10,
      };
    }
    
    if (options.includeFinancialData) {
      include.depreciations = {
        orderBy: { depreciationDate: 'desc' },
        take: 5,
      };
    }
    
    const assets = await prisma.maintenanceAsset.findMany({
      where,
      include: Object.keys(include).length > 0 ? include : undefined,
      orderBy: { assetTag: 'asc' },
    });
    
    return assets;
  }

  /**
   * Transform assets for export
   */
  private async transformAssetsForExport(
    assets: any[],
    options: AssetExportOptions
  ): Promise<any[]> {
    return assets.map(asset => {
      const exportData = {
        'Asset Tag': asset.assetTag,
        'Asset Name': asset.assetName,
        'Description': asset.description || '',
        'Category': asset.category,
        'Subcategory': asset.subcategory || '',
        'Manufacturer': asset.manufacturer || '',
        'Model': asset.model || '',
        'Serial Number': asset.serialNumber || '',
        'Location': asset.location,
        'Building': asset.building || '',
        'Floor': asset.floor || '',
        'Room': asset.room || '',
        'Status': asset.status,
        'Condition': asset.condition,
        'Criticality': asset.criticality,
        'Purchase Price': asset.purchasePrice || '',
        'Current Value': asset.currentValue || '',
        'Purchase Date': asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
        'Warranty Expiry': asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : '',
        'Useful Life': asset.usefulLife || '',
        'Depreciation Method': asset.depreciationMethod || '',
        'Maintenance Interval': asset.maintenanceInterval || '',
        'Last Maintenance': asset.lastMaintenanceDate ? asset.lastMaintenanceDate.toISOString().split('T')[0] : '',
        'Next Maintenance': asset.nextMaintenanceDate ? asset.nextMaintenanceDate.toISOString().split('T')[0] : '',
        'Created Date': asset.createdAt.toISOString().split('T')[0],
        'Updated Date': asset.updatedAt ? asset.updatedAt.toISOString().split('T')[0] : '',
      };
      
      return exportData;
    });
  }

  /**
   * Generate CSV content from data
   */
  private generateCSVContent(data: any[]): string {
    if (data.length === 0) {return '';}
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Get template data for imports
   */
  private getTemplateData(includeExamples: boolean): any[] {
    const template = [
      {
        'Asset Tag': '',
        'Asset Name': '',
        'Description': '',
        'Category': '',
        'Subcategory': '',
        'Manufacturer': '',
        'Model': '',
        'Serial Number': '',
        'Location': '',
        'Building': '',
        'Floor': '',
        'Room': '',
        'Status': 'OPERATIONAL',
        'Condition': 'GOOD',
        'Criticality': 'MEDIUM',
        'Purchase Price': '',
        'Purchase Date': '',
        'Warranty Expiry': '',
        'Useful Life': '',
        'Depreciation Method': 'STRAIGHT_LINE',
        'Maintenance Interval': '90',
      }
    ];
    
    if (includeExamples) {
      template.push(
        {
          'Asset Tag': 'HVAC-001',
          'Asset Name': 'Main Building HVAC Unit',
          'Description': 'Primary heating and cooling system for main building',
          'Category': 'HVAC',
          'Subcategory': 'Central Air',
          'Manufacturer': 'Carrier',
          'Model': 'WeatherExpert 48TCED',
          'Serial Number': 'WE48001234',
          'Location': 'Main Building Roof',
          'Building': 'Main Building',
          'Floor': 'Roof',
          'Room': 'HVAC Room 1',
          'Status': 'OPERATIONAL',
          'Condition': 'GOOD',
          'Criticality': 'HIGH',
          'Purchase Price': '15000',
          'Purchase Date': '2022-01-15',
          'Warranty Expiry': '2025-01-15',
          'Useful Life': '15',
          'Depreciation Method': 'STRAIGHT_LINE',
          'Maintenance Interval': '60',
        },
        {
          'Asset Tag': 'COMP-001',
          'Asset Name': 'Reception Desk Computer',
          'Description': 'Desktop computer for reception area',
          'Category': 'IT Equipment',
          'Subcategory': 'Desktop Computer',
          'Manufacturer': 'Dell',
          'Model': 'OptiPlex 7090',
          'Serial Number': 'DL7090001',
          'Location': 'Reception Area',
          'Building': 'Main Building',
          'Floor': '1st Floor',
          'Room': 'Reception',
          'Status': 'OPERATIONAL',
          'Condition': 'EXCELLENT',
          'Criticality': 'MEDIUM',
          'Purchase Price': '1200',
          'Purchase Date': '2023-03-01',
          'Warranty Expiry': '2026-03-01',
          'Useful Life': '5',
          'Depreciation Method': 'STRAIGHT_LINE',
          'Maintenance Interval': '180',
        }
      );
    }
    
    return template;
  }

  /**
   * Get import instructions
   */
  private getImportInstructions(): any[] {
    return [
      { Field: 'Asset Tag', Required: 'Yes', Description: 'Unique identifier for the asset', Example: 'HVAC-001' },
      { Field: 'Asset Name', Required: 'Yes', Description: 'Descriptive name of the asset', Example: 'Main Building HVAC Unit' },
      { Field: 'Category', Required: 'Yes', Description: 'Asset category', Example: 'HVAC, IT Equipment, Furniture' },
      { Field: 'Location', Required: 'Yes', Description: 'Physical location of the asset', Example: 'Main Building Roof' },
      { Field: 'Status', Required: 'No', Description: 'Asset operational status', Example: 'OPERATIONAL, DOWN, MAINTENANCE, RETIRED' },
      { Field: 'Condition', Required: 'No', Description: 'Physical condition of the asset', Example: 'EXCELLENT, GOOD, FAIR, POOR, CRITICAL' },
      { Field: 'Criticality', Required: 'No', Description: 'Business criticality', Example: 'LOW, MEDIUM, HIGH, CRITICAL' },
      { Field: 'Purchase Price', Required: 'No', Description: 'Original purchase price', Example: '15000' },
      { Field: 'Purchase Date', Required: 'No', Description: 'Date of purchase (YYYY-MM-DD)', Example: '2022-01-15' },
      { Field: 'Maintenance Interval', Required: 'No', Description: 'Days between maintenance', Example: '90' },
    ];
  }

  /**
   * Add template formatting to Excel worksheet
   */
  private addTemplateFormatting(worksheet: any, data: any[]): void {
    // This would add data validation, formatting, etc. to the Excel template
    // Implementation would depend on specific Excel formatting requirements
  }

  /**
   * Add maintenance history sheet to workbook
   */
  private async addMaintenanceHistorySheet(
    workbook: any,
    organizationId: string,
    options: AssetExportOptions
  ): Promise<void> {
    // Implementation for adding maintenance history data
  }

  /**
   * Add financial data sheet to workbook
   */
  private async addFinancialDataSheet(
    workbook: any,
    organizationId: string,
    options: AssetExportOptions
  ): Promise<void> {
    // Implementation for adding financial data
  }

  /**
   * Build where clause from filters
   */
  private buildWhereClause(filters: any): any {
    // Implementation to convert filters to Prisma where clause
    return {};
  }

  /**
   * Check for duplicates in import data
   */
  private checkForDuplicates(data: any[], fields: string[]): any[] {
    const duplicates: any[] = [];
    const seen = new Set();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (const field of fields) {
        const value = row[field];
        if (value && seen.has(`${field}:${value}`)) {
          duplicates.push({ row: i + 1, field, value });
        }
        if (value) {seen.add(`${field}:${value}`);}
      }
    }
    
    return duplicates;
  }
}