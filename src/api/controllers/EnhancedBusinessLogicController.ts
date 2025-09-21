/**
 * Enhanced Business Logic Controller
 * API endpoints for production-grade business logic integration
 */

import { Request, Response } from 'express';
import { logger } from '@/config/logger';
import {
  ProductionGradeAnalyticsService,
  ProductionGradeHelpService,
  ProductionGradeRealtimeSyncService,
  ProductionGradeAPIGateway
} from '@/services/advanced-business-logic';

export class EnhancedBusinessLogicController {
  /**
   * Execute business logic with advanced features
   */
  static async executeAdvancedBusinessLogic(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName, methodName, params = [], options = {} } = req.body as {
        serviceName?: string;
        methodName?: string;
        params?: unknown[];
        options?: Record<string, unknown>;
      };

      if (!serviceName || !methodName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'serviceName and methodName are required',
          },
        });
        return; // Critical fix: Missing return statement
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

      res.json(result);
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
    }
  }

  /**
   * Get comprehensive system health status
   */
  static async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await ProductionGradeBusinessLogic.getComprehensiveHealthStatus();
      res.json(healthStatus);
    } catch (error: unknown) {
      logger.error('Error getting health status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Failed to get health status',
        },
      });
    }
  }

  /**
   * Get production metrics
   */
  static async getMetrics(req: Request, res: Response): Promise<void> {
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

      res.json(serializedMetrics);
    } catch (error: unknown) {
      logger.error('Error getting production metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to get production metrics',
        },
      });

    }
  }

  /**
   * Calculate asset depreciation using advanced business rules
   */
  static async calculateAssetDepreciation(req: Request, res: Response): Promise<void> {
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

      }

      const depreciationResult = advancedBusinessRules.calculateAssetDepreciation({
        initialValue: assetData.initialValue,
        salvageValue: assetData.salvageValue || 0,
        usefulLifeYears: assetData.usefulLifeYears,
        depreciationMethod: assetData.depreciationMethod || 'straight-line',
        currentAge: assetData.currentAge || 0,
        acceleratedRatePercent: assetData.acceleratedRatePercent,
      });

      res.json({
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

    }
  }

  /**
   * Calculate lease accounting (ASC 842/IFRS 16)
   */
  static async calculateLeaseAccounting(req: Request, res: Response): Promise<void> {
    try {
      const { leaseData } = req.body as {
        leaseData?: {
          monthlyPayment: number;
          leaseTerm: number;
          incrementalBorrowingRate: number;
          initialDirectCosts?: number;
          prepaidLease?: number;
          leaseIncentives?: number;
          variablePayments?: number;
          currency?: string;
        };
      };

      if (!leaseData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'leaseData is required',
          },
        });
        return; // Critical fix: Missing return statement
      }

      // Critical fix: Validate required fields
      if (typeof leaseData.monthlyPayment !== 'number' || 
          typeof leaseData.leaseTerm !== 'number' || 
          typeof leaseData.incrementalBorrowingRate !== 'number') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LEASE_DATA',
            message: 'monthlyPayment, leaseTerm, and incrementalBorrowingRate must be numbers',
          },
        });
        return;
      }

      const leaseAccountingResult = advancedBusinessRules.calculateLeaseAccounting({
        monthlyPayment: leaseData.monthlyPayment,
        leaseTerm: leaseData.leaseTerm,
        incrementalBorrowingRate: leaseData.incrementalBorrowingRate,
        initialDirectCosts: leaseData.initialDirectCosts ?? 0,
        prepaidLease: leaseData.prepaidLease ?? 0,
        leaseIncentives: leaseData.leaseIncentives ?? 0,
        variablePayments: leaseData.variablePayments ?? 0,
      });

      res.json({
        success: true,
        data: leaseAccountingResult,
        metadata: {
          timestamp: new Date().toISOString(),
          standard: 'ASC 842/IFRS 16',
          currency: leaseData.currency ?? 'USD',
        },
      });
    } catch (error: unknown) {
      logger.error('Error calculating lease accounting:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: 'Failed to calculate lease accounting',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Optimize space utilization
   */
  static async optimizeSpaceUtilization(req: Request, res: Response): Promise<void> {
    try {
      const { spaceData } = req.body as {
        spaceData?: {
          spaces: Array<{
            id: string;
            area: number;
            currentOccupancy: number;
            capacity: number;
          }>;
          optimizationGoals?: string[];
        };
      };

      if (!spaceData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'spaceData is required',
          },
        });
        return; // Critical fix: Missing return statement
      }

      // Critical fix: Validate spaces array exists and has valid structure
      if (!Array.isArray(spaceData.spaces) || spaceData.spaces.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SPACE_DATA',
            message: 'spaceData.spaces must be a non-empty array',
          },
        });
        return;
      }

      const optimizationResult = advancedBusinessRules.optimizeSpaceUtilization(spaceData);

      res.json({
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
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Optimize maintenance costs
   */
  static async optimizeMaintenanceCosts(req: Request, res: Response): Promise<void> {
    try {
      const { maintenanceData } = req.body as {
        maintenanceData?: {
          assets: Array<{
            id: string;
            type: string;
            age: number;
            maintenanceCost: number;
            condition: string;
          }>;
          budget?: number;
          timeHorizon?: number;
        };
      };

      if (!maintenanceData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'maintenanceData is required',
          },
        });
        return; // Critical fix: Missing return statement
      }

      // Critical fix: Validate assets array exists
      if (!Array.isArray(maintenanceData.assets) || maintenanceData.assets.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MAINTENANCE_DATA',
            message: 'maintenanceData.assets must be a non-empty array',
          },
        });
        return;
      }

      const optimizationResult = advancedBusinessRules.optimizeMaintenanceCosts(maintenanceData);

      res.json({
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
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Perform financial consolidation
   */
  static async performFinancialConsolidation(req: Request, res: Response): Promise<void> {
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

      }

      const consolidationResult = advancedBusinessRules.performFinancialConsolidation(financialData);

      res.json({
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

    }
  }

  /**
   * Standardize asset data
   */
  static async standardizeAssetData(req: Request, res: Response): Promise<void> {
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

      }

      const standardizationResult = dataStandardizationEngine.standardizeAssetData(rawAssetData, sourceSystem);

      res.json({
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

    }
  }

  /**
   * Standardize space data
   */
  static async standardizeSpaceData(req: Request, res: Response): Promise<void> {
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

      }

      const standardizationResult = dataStandardizationEngine.standardizeSpaceData(rawSpaceData, sourceSystem);

      res.json({
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

    }
  }

  /**
   * Add validation rules
   */
  static async addValidationRules(req: Request, res: Response): Promise<void> {
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

      }

      const result = ProductionGradeBusinessLogic.addValidationRule(serviceName, methodName, rules);

      res.json({
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

    }
  }

  /**
   * Reset service metrics
   */
  static async resetServiceMetrics(req: Request, res: Response): Promise<void> {
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

      }

      const result = ProductionGradeBusinessLogic.resetServiceMetrics(serviceName);

      res.json({
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

    }
  }

  /**
   * List available services
   */
  static async listServices(req: Request, res: Response): Promise<void> {
    try {
      const services = ProductionGradeBusinessLogic.listAvailableServices();

      res.json({
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

    }
  }

  // New production-grade competitive business logic methods
  private static analyticsService = new ProductionGradeAnalyticsService();
  private static helpService = new ProductionGradeHelpService();
  private static syncService = new ProductionGradeRealtimeSyncService();
  private static apiGateway = new ProductionGradeAPIGateway();

  /**
   * Get advanced lease renewal predictions
   */
  static async getLeaseRenewalPrediction(req: Request, res: Response): Promise<void> {
    try {
      const { leaseId } = req.params;
      const { organizationId } = req.user!;

      const prediction = await EnhancedBusinessLogicController.analyticsService.predictLeaseRenewal(leaseId);

      logger.info('Lease renewal prediction generated', {
        leaseId,
        organizationId,
        probability: prediction.probability,
        confidence: prediction.confidence
      });

      res.json({
        success: true,
        data: prediction,
        metadata: {
          generatedAt: new Date(),
          requestId: req.context?.requestId
        }
      });
    } catch (error) {
      logger.error('Failed to get lease renewal prediction', { error, leaseId: req.params.leaseId });
      res.status(500).json({
        success: false,
        error: 'Failed to generate lease renewal prediction'
      });
    }
  }

  /**
   * Perform competitive market analysis
   */
  static async performMarketAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;

      const analysis = await EnhancedBusinessLogicController.analyticsService.performMarketAnalysis(organizationId);

      logger.info('Market analysis completed', {
        organizationId,
        marketPosition: analysis.marketPosition,
        opportunitiesCount: analysis.opportunities.length
      });

      res.json({
        success: true,
        data: analysis,
        metadata: {
          analysisType: 'competitive_market',
          generatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to perform market analysis', { error, organizationId: req.user?.organizationId });
      res.status(500).json({
        success: false,
        error: 'Failed to perform market analysis'
      });
    }
  }

  /**
   * Get personalized help content
   */
  static async getPersonalizedHelp(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user!;
      const { page, section, userAction, errorCode } = req.query;

      const context = {
        page: page as string,
        section: section as string,
        userAction: userAction as string,
        errorCode: errorCode as string
      };

      const helpContent = await EnhancedBusinessLogicController.helpService.getPersonalizedHelp(userId, context);

      res.json({
        success: true,
        data: helpContent,
        metadata: {
          personalizedFor: userId,
          contextProvided: Object.keys(context).filter(k => context[k as keyof typeof context])
        }
      });
    } catch (error) {
      logger.error('Failed to get personalized help', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve personalized help'
      });
    }
  }

  /**
   * Get advanced utilization insights
   */
  static async getUtilizationInsights(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { timeframe = '30d' } = req.query;

      const insights = await EnhancedBusinessLogicController.analyticsService.generateUtilizationInsights(
        organizationId,
        timeframe as string
      );

      res.json({
        success: true,
        data: insights,
        metadata: {
          timeframe,
          generatedAt: new Date(),
          insightTypes: ['trends', 'patterns', 'recommendations', 'cost-optimization']
        }
      });
    } catch (error) {
      logger.error('Failed to get utilization insights', { error, organizationId: req.user?.organizationId });
      res.status(500).json({
        success: false,
        error: 'Failed to generate utilization insights'
      });
    }
  }

  /**
   * Get comprehensive health status
   */
  static async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await EnhancedBusinessLogicController.apiGateway.getHealthStatus();

      res.status(health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503).json({
        success: health.status !== 'unhealthy',
        data: health,
        metadata: {
          checkedAt: new Date(),
          comprehensive: true,
          services: health.services.length
        }
      });
    } catch (error) {
      logger.error('Failed to get health status', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve health status'
      });
    }
  }
}