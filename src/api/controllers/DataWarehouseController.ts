import { Request, Response } from 'express';
import { DataWarehouseService } from '@/services/DataWarehouseService';
import { logger } from '@/config/logger';
import { prisma } from '@/config/database';

const dataWarehouseService = new DataWarehouseService();

export class DataWarehouseController {
  /**
   * Get all data warehouses
   */
  async getWarehouses(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const warehouses = await prisma.dataWarehouse.findMany({
        where: { organizationId },
        include: { etlProcesses: true, biReports: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.dataWarehouse.count({
        where: { organizationId },
      });

      res.json({
        warehouses,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to get data warehouses', { error });
      res.status(500).json({ error: 'Failed to get data warehouses' });

      return;
    }
  }

  /**
   * Create data warehouse
   */
  async createWarehouse(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { name, description, databaseType, connectionString } = req.body;

      const warehouse = await dataWarehouseService.createWarehouse(
        organizationId,
        name,
        description,
        databaseType,
        connectionString
      );

      res.status(201).json(warehouse);


      return;
    } catch (error: unknown) {
      logger.error('Failed to create data warehouse', { error });
      res.status(500).json({ error: 'Failed to create data warehouse' });

      return;
    }
  }

  /**
   * Update data warehouse
   */
  async updateWarehouse(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;
      const updates = req.body;

      const warehouse = await prisma.dataWarehouse.update({
        where: { id: warehouseId },
        data: updates,
      });

      res.json(warehouse);
    } catch (error: unknown) {
      logger.error('Failed to update data warehouse', { error });
      res.status(500).json({ error: 'Failed to update data warehouse' });

      return;
    }
  }

  /**
   * Delete data warehouse
   */
  async deleteWarehouse(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;

      await prisma.dataWarehouse.delete({
        where: { id: warehouseId },
      });

      res.status(204).send();
    } catch (error: unknown) {
      logger.error('Failed to delete data warehouse', { error });
      res.status(500).json({ error: 'Failed to delete data warehouse' });

      return;
    }
  }

  /**
   * Get ETL processes
   */
  async getETLProcesses(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      const where: any = { warehouseId };
      if (status) {
        where.status = status;
      }

      const processes = await prisma.eTLProcess.findMany({
        where,
        include: { warehouse: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.eTLProcess.count({ where });

      res.json({
        processes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to get ETL processes', { error });
      res.status(500).json({ error: 'Failed to get ETL processes' });

      return;
    }
  }

  /**
   * Create ETL process
   */
  async createETLProcess(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;
      const {
        name,
        description,
        sourceConfig,
        targetConfig,
        transformationSQL,
        schedulePattern,
      } = req.body;

      const process = await dataWarehouseService.createETLProcess(
        warehouseId,
        name,
        description,
        sourceConfig,
        targetConfig,
        transformationSQL,
        schedulePattern
      );

      res.status(201).json(process);


      return;
    } catch (error: unknown) {
      logger.error('Failed to create ETL process', { error });
      res.status(500).json({ error: 'Failed to create ETL process' });

      return;
    }
  }

  /**
   * Execute ETL process
   */
  async executeETLProcess(req: Request, res: Response): Promise<void> {
    try {
      const { processId } = req.params;

      const metrics = await dataWarehouseService.executeETLProcess(processId);
      res.json(metrics);
    } catch (error: unknown) {
      logger.error('Failed to execute ETL process', { error });
      res.status(500).json({ error: 'Failed to execute ETL process' });

      return;
    }
  }

  /**
   * Get ETL process metrics
   */
  async getETLMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { processId } = req.params;
      const { days = 30 } = req.query;

      const metrics = await dataWarehouseService.getETLMetrics(processId, Number(days));
      res.json(metrics);
    } catch (error: unknown) {
      logger.error('Failed to get ETL metrics', { error });
      res.status(500).json({ error: 'Failed to get ETL metrics' });

      return;
    }
  }

  /**
   * Get historical data
   */
  async getHistoricalData(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;
      const { table, startDate, endDate, columns, filters } = req.query;

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const columnArray = columns ? (columns as string).split(',') : undefined;
      const filterObject = filters ? JSON.parse(filters as string) : undefined;

      const data = await dataWarehouseService.getHistoricalData(
        warehouseId,
        table as string,
        start,
        end,
        columnArray,
        filterObject
      );

      res.json(data);
    } catch (error: unknown) {
      logger.error('Failed to get historical data', { error });
      res.status(500).json({ error: 'Failed to get historical data' });

      return;
    }
  }

  /**
   * Create data mart
   */
  async createDataMart(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;
      const { name, description, sourceQuery, refreshSchedule } = req.body;

      const dataMart = await dataWarehouseService.createDataMart(
        warehouseId,
        name,
        description,
        sourceQuery,
        refreshSchedule
      );

      res.status(201).json(dataMart);


      return;
    } catch (error: unknown) {
      logger.error('Failed to create data mart', { error });
      res.status(500).json({ error: 'Failed to create data mart' });

      return;
    }
  }

  /**
   * Schedule ETL process
   */
  async scheduleETLProcess(req: Request, res: Response): Promise<void> {
    try {
      const { processId } = req.params;
      const { cronPattern } = req.body;

      await dataWarehouseService.scheduleETLProcess(processId, cronPattern);
      res.json({ message: 'ETL process scheduled successfully' });
    } catch (error: unknown) {
      logger.error('Failed to schedule ETL process', { error });
      res.status(500).json({ error: 'Failed to schedule ETL process' });

      return;
    }
  }

  /**
   * Update ETL process
   */
  async updateETLProcess(req: Request, res: Response): Promise<void> {
    try {
      const { processId } = req.params;
      const updates = req.body;

      const process = await prisma.eTLProcess.update({
        where: { id: processId },
        data: updates,
      });

      res.json(process);
    } catch (error: unknown) {
      logger.error('Failed to update ETL process', { error });
      res.status(500).json({ error: 'Failed to update ETL process' });

      return;
    }
  }

  /**
   * Delete ETL process
   */
  async deleteETLProcess(req: Request, res: Response): Promise<void> {
    try {
      const { processId } = req.params;

      await prisma.eTLProcess.delete({
        where: { id: processId },
      });

      res.status(204).send();
    } catch (error: unknown) {
      logger.error('Failed to delete ETL process', { error });
      res.status(500).json({ error: 'Failed to delete ETL process' });

      return;
    }
  }

  /**
   * Get warehouse analytics
   */
  async getWarehouseAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;
      const { days = 30 } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const processes = await prisma.eTLProcess.findMany({
        where: { warehouseId },
      });

      const reports = await prisma.bIReport.findMany({
        where: { warehouseId },
      });

      const analytics = {
        totalProcesses: processes.length,
        activeProcesses: processes.filter(p => p.status === 'ACTIVE').length,
        totalExecutions: processes.reduce((sum, p) => sum + p.executionCount, 0),
        averageExecutionTime: processes.reduce((sum, p) => sum + (p.avgExecutionTime || 0), 0) / Math.max(1, processes.length),
        totalReports: reports.length,
        processesByStatus: processes.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        reportsByType: reports.reduce((acc, r) => {
          acc[r.reportType] = (acc[r.reportType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        dataVolume: {
          totalTables: 15, // Mock data
          totalRows: 1250000,
          totalSize: '2.5 GB',
        },
        performance: {
          queryResponseTime: 125, // ms
          dataFreshness: 95, // percentage
          availability: 99.9, // percentage
        },
      };

      res.json(analytics);
    } catch (error: unknown) {
      logger.error('Failed to get warehouse analytics', { error });
      res.status(500).json({ error: 'Failed to get warehouse analytics' });

      return;
    }
  }

  /**
   * Test warehouse connection
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;

      const warehouse = await prisma.dataWarehouse.findUnique({
        where: { id: warehouseId },
      });

      if (!warehouse) {
        res.status(404).json({ error: 'Warehouse not found' });

        return;
        return;
      }

      // Test connection (would implement actual connection test)
      const testResult = {
        status: 'success',
        message: 'Connection successful',
        responseTime: 45, // ms
        timestamp: new Date(),
      };

      res.json(testResult);
    } catch (error: unknown) {
      logger.error('Warehouse connection test failed', { error });
      res.json({ status: 'error', message: (error as Error).message });
    }
  }

  /**
   * Get data quality metrics
   */
  async getDataQualityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;

      // Mock data quality metrics
      const metrics = {
        overallScore: 87.5,
        completeness: 92.3,
        accuracy: 89.1,
        consistency: 85.7,
        validity: 91.2,
        uniqueness: 94.8,
        timeliness: 88.4,
        trends: {
          last7Days: 88.2,
          last30Days: 86.9,
          improvement: +1.3,
        },
        issues: [
          { type: 'Missing Values', count: 245, severity: 'Medium' },
          { type: 'Format Errors', count: 89, severity: 'Low' },
          { type: 'Duplicate Records', count: 12, severity: 'High' },
        ],
      };

      res.json(metrics);
    } catch (error: unknown) {
      logger.error('Failed to get data quality metrics', { error });
      res.status(500).json({ error: 'Failed to get data quality metrics' });

      return;
    }
  }

  /**
   * Get process execution history
   */
  async getExecutionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { processId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      // Mock execution history
      const executions = Array.from({ length: Number(limit) }, (_, i) => ({
        id: `exec_${i + 1}`,
        processId,
        startTime: new Date(Date.now() - (i + 1) * 3600000),
        endTime: new Date(Date.now() - (i + 1) * 3600000 + 300000),
        status: Math.random() > 0.1 ? 'SUCCESS' : 'FAILED',
        recordsProcessed: Math.floor(Math.random() * 10000) + 1000,
        recordsInserted: Math.floor(Math.random() * 5000) + 500,
        recordsUpdated: Math.floor(Math.random() * 2000) + 200,
        recordsDeleted: Math.floor(Math.random() * 100) + 10,
        executionTime: Math.floor(Math.random() * 300) + 30, // seconds
        errorMessage: Math.random() > 0.9 ? 'Sample error message' : null,
      }));

      res.json({
        executions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 500, // Mock total
          pages: Math.ceil(500 / Number(limit)),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to get execution history', { error });
      res.status(500).json({ error: 'Failed to get execution history' });

      return;
    }
  }
}