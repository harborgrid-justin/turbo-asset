/**
 * Enhanced Business Logic Controller
 * API endpoints for production-grade business logic integration
 */

import { Request, Response } from 'express';
import { logger } from '@/config/logger';
import { 
  ProductionGradeBusinessLogic,
  enhancedBusinessLogicService, 
  advancedBusinessRules,
  dataStandardizationEngine
} from '@/services/enhanced-business-logic-integration';

export class EnhancedBusinessLogicController {
  /**
   * Execute business logic with advanced features
   */
  static async executeAdvancedBusinessLogic(req: Request, res: Response): Promise<Response> {
    try {
      const { serviceName, methodName, params = [], options = {} } = req.body;

      if (!serviceName || !methodName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'serviceName and methodName are required',
          },
        });

        return;
      return;
      }

      const result = await ProductionGradeBusinessLogic.executeWithAdvancedLogic(
        serviceName,
        methodName,
        params,
        {
          standardizeInput: options.standardizeInput || false,
          applyBusinessRules: options.applyBusinessRules || false,
          businessRuleConfig: options.businessRuleConfig || {},
          ...options
        }
      );

      return res.json(result);
    } catch (error: unknown) {
      logger.error('Error executing advanced business logic:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Failed to execute advanced business logic',
          details: error instanceof Error ? (error as Error).message : 'Unknown error',
        },
      });

      return;
      return;
    }
  }

  /**
   * Get comprehensive system health status
   */
  static async getHealthStatus(req: Request, res: Response): Promise<Response> {
    try {
      const healthStatus = await ProductionGradeBusinessLogic.getComprehensiveHealthStatus();
      return res.json(healthStatus);
    } catch (error: unknown) {
      logger.error('Error getting health status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Failed to get health status',
        },
      });

      return;
      return;
    }
  }

  /**
   * Get production metrics
   */
  static async getMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const metrics = await ProductionGradeBusinessLogic.getProductionMetrics();
      
      // Convert Maps to objects for JSON serialization
      const serializedMetrics = {
        ...metrics,
        serviceHealth: Object.fromEntries(metrics.serviceHealth),
        circuitBreakerMetrics: Object.fromEntries(metrics.circuitBreakerMetrics),
        rateLimitMetrics: Object.fromEntries(metrics.rateLimitMetrics),
        validationMetrics: Object.fromEntries(
          Array.from(metrics.validationMetrics.entries()).map(([key, value]) => [
            key,
            {
              ...value,
              commonFailures: Object.fromEntries(value.commonFailures)
            }
          ])
        ),
      };

      return res.json(serializedMetrics);
    } catch (error: unknown) {
      logger.error('Error getting production metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to get production metrics',
        },
      });

      return;
      return;
    }
  }

  /**
   * Calculate asset depreciation using advanced business rules
   */
  static async calculateAssetDepreciation(req: Request, res: Response): Promise<Response> {
    try {
      const { assetData } = req.body;

      if (!assetData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'assetData is required',
          },
        });

        return;
      return;
      }

      const depreciationResult = advancedBusinessRules.calculateAssetDepreciation({
        initialValue: assetData.initialValue,
        salvageValue: assetData.salvageValue || 0,
        usefulLifeYears: assetData.usefulLifeYears,
        depreciationMethod: assetData.depreciationMethod || 'straight-line',
        currentAge: assetData.currentAge || 0,
        acceleratedRatePercent: assetData.acceleratedRatePercent,
      });

      return res.json({
        success: true,
        data: depreciationResult,
        metadata: {
          timestamp: new Date().toISOString(),
          calculationMethod: assetData.depreciationMethod || 'straight-line',
        },
      });
    } catch (error: unknown) {
      logger.error('Error calculating asset depreciation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: 'Failed to calculate asset depreciation',
          details: error instanceof Error ? (error as Error).message : 'Unknown error',
        },
      });

      return;
      return;
    }
  }

  /**
   * Calculate lease accounting (ASC 842/IFRS 16)
   */
  static async calculateLeaseAccounting(req: Request, res: Response): Promise<Response> {
    try {
      const { leaseData } = req.body;

      if (!leaseData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'leaseData is required',
          },
        });

        return;
      return;
      }

      const leaseAccountingResult = advancedBusinessRules.calculateLeaseAccounting({
        monthlyPayment: leaseData.monthlyPayment,
        leaseTerm: leaseData.leaseTerm,
        incrementalBorrowingRate: leaseData.incrementalBorrowingRate,
        initialDirectCosts: leaseData.initialDirectCosts || 0,
        prepaidLease: leaseData.prepaidLease || 0,
        leaseIncentives: leaseData.leaseIncentives || 0,
        variablePayments: leaseData.variablePayments,
      });

      return res.json({
        success: true,
        data: leaseAccountingResult,
        metadata: {
          timestamp: new Date().toISOString(),
          standard: 'ASC 842/IFRS 16',
          currency: leaseData.currency || 'USD',
        },
      });
    } catch (error: unknown) {
      logger.error('Error calculating lease accounting:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: 'Failed to calculate lease accounting',
          details: error instanceof Error ? (error as Error).message : 'Unknown error',
        },
      });

      return;
      return;
    }
  }

  /**
   * Optimize space utilization
   */
  static async optimizeSpaceUtilization(req: Request, res: Response): Promise<Response> {
    try {
      const { spaceData } = req.body;

      if (!spaceData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'spaceData is required',
          },
        });

        return;
      return;
      }

      const optimizationResult = advancedBusinessRules.optimizeSpaceUtilization(spaceData);

      return res.json({
        success: true,
        data: optimizationResult,
        metadata: {
          timestamp: new Date().toISOString(),
          spacesAnalyzed: spaceData.spaces.length,
          algorithm: 'Advanced Space Utilization Optimization',
        },
      });
    } catch (error: unknown) {
      logger.error('Error optimizing space utilization:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OPTIMIZATION_ERROR',
          message: 'Failed to optimize space utilization',
          details: error instanceof Error ? (error as Error).message : 'Unknown error',
        },
      });

      return;
      return;
    }
  }

  /**
   * Optimize maintenance costs
   */
  static async optimizeMaintenanceCosts(req: Request, res: Response): Promise<Response> {
    try {
      const { maintenanceData } = req.body;

      if (!maintenanceData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'maintenanceData is required',
          },
        });

        return;
      return;
      }

      const optimizationResult = advancedBusinessRules.optimizeMaintenanceCosts(maintenanceData);

      return res.json({
        success: true,
        data: optimizationResult,
        metadata: {
          timestamp: new Date().toISOString(),
          assetsAnalyzed: maintenanceData.assets.length,
          algorithm: 'Advanced Maintenance Cost Optimization',
        },
      });
    } catch (error: unknown) {
      logger.error('Error optimizing maintenance costs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OPTIMIZATION_ERROR',
          message: 'Failed to optimize maintenance costs',
          details: error instanceof Error ? (error as Error).message : 'Unknown error',
        },
      });

      return;
      return;
    }
  }

  /**
   * Perform financial consolidation
   */
  static async performFinancialConsolidation(req: Request, res: Response): Promise<Response> {
    try {
      const { financialData } = req.body;

      if (!financialData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'financialData is required',
          },
        });

        return;
      return;
      }

      const consolidationResult = advancedBusinessRules.performFinancialConsolidation(financialData);

      return res.json({
        success: true,
        data: consolidationResult,
        metadata: {
          timestamp: new Date().toISOString(),
          entitiesConsolidated: financialData.entities.length,
          baseCurrency: financialData.baseCurrency,
          consolidationDate: financialData.consolidationDate,
        },
      });
    } catch (error: unknown) {
      logger.error('Error performing financial consolidation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONSOLIDATION_ERROR',
          message: 'Failed to perform financial consolidation',
          details: error instanceof Error ? (error as Error).message : 'Unknown error',
        },
      });

      return;
      return;
    }
  }

  /**
   * Standardize asset data
   */
  static async standardizeAssetData(req: Request, res: Response): Promise<Response> {
    try {
      const { rawAssetData, sourceSystem } = req.body;

      if (!rawAssetData || !sourceSystem) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'rawAssetData and sourceSystem are required',
          },
        });

        return;
      return;
      }

      const standardizationResult = dataStandardizationEngine.standardizeAssetData(rawAssetData, sourceSystem);

      return res.json({
        success: true,
        data: standardizationResult,
        metadata: {
          timestamp: new Date().toISOString(),
          sourceSystem,
          dataQualityScore: standardizationResult.dataQualityScore,
        },
      });
    } catch (error: unknown) {
      logger.error('Error standardizing asset data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STANDARDIZATION_ERROR',
          message: 'Failed to standardize asset data',
          details: error instanceof Error ? (error as Error).message : 'Unknown error',
        },
      });

      return;
      return;
    }
  }

  /**
   * Standardize space data
   */
  static async standardizeSpaceData(req: Request, res: Response): Promise<Response> {
    try {
      const { rawSpaceData, sourceSystem } = req.body;

      if (!rawSpaceData || !sourceSystem) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'rawSpaceData and sourceSystem are required',
          },
        });

        return;
      return;
      }

      const standardizationResult = dataStandardizationEngine.standardizeSpaceData(rawSpaceData, sourceSystem);

      return res.json({
        success: true,
        data: standardizationResult,
        metadata: {
          timestamp: new Date().toISOString(),
          sourceSystem,
          dataQualityScore: standardizationResult.dataQualityScore,
        },
      });
    } catch (error: unknown) {
      logger.error('Error standardizing space data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STANDARDIZATION_ERROR',
          message: 'Failed to standardize space data',
          details: error instanceof Error ? (error as Error).message : 'Unknown error',
        },
      });

      return;
      return;
    }
  }

  /**
   * Add validation rules
   */
  static async addValidationRules(req: Request, res: Response): Promise<Response> {
    try {
      const { serviceName, methodName, rules } = req.body;

      if (!serviceName || !methodName || !rules) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'serviceName, methodName, and rules are required',
          },
        });

        return;
      return;
      }

      const result = ProductionGradeBusinessLogic.addValidationRule(serviceName, methodName, rules);

      return res.json({
        success: result,
        message: result ? 'Validation rules added successfully' : 'Failed to add validation rules',
      });
    } catch (error: unknown) {
      logger.error('Error adding validation rules:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to add validation rules',
        },
      });

      return;
      return;
    }
  }

  /**
   * Reset service metrics
   */
  static async resetServiceMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const { serviceName } = req.params;

      if (!serviceName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'serviceName is required',
          },
        });

        return;
      return;
      }

      const result = ProductionGradeBusinessLogic.resetServiceMetrics(serviceName);

      return res.json({
        success: result,
        message: result ? 'Service metrics reset successfully' : 'Failed to reset service metrics',
      });
    } catch (error: unknown) {
      logger.error('Error resetting service metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to reset service metrics',
        },
      });

      return;
      return;
    }
  }

  /**
   * List available services
   */
  static async listServices(req: Request, res: Response): Promise<Response> {
    try {
      const services = ProductionGradeBusinessLogic.listAvailableServices();

      return res.json({
        success: true,
        data: {
          services,
          count: services.length,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
      logger.error('Error listing services:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to list services',
        },
      });

      return;
      return;
    }
  }
}