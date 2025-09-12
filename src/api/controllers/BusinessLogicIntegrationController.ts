import { Request, Response } from 'express';
import { logger } from '@/config/logger';
import { businessLogicIntegration } from '@/services/business-logic-integration';

/**
 * BusinessLogicIntegrationController - Production monitoring endpoints
 * Provides API access to business logic integration metrics and health status
 */
export class BusinessLogicIntegrationController {

  /**
   * Get comprehensive production metrics
   */
  static async getProductionMetrics(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching production metrics for business logic integration');

      const metrics = businessLogicIntegration.getProductionMetrics();

      res.json({
        success: true,
        data: metrics,
        metadata: {
          timestamp: new Date(),
          requestId: `metrics-${Date.now()}`,
          apiVersion: '1.0.0'
        }
      });
    } catch (error: unknown) {
      logger.error('Error fetching production metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_FETCH_ERROR',
          message: 'Failed to fetch production metrics',
          details: error instanceof Error ? (error as Error).message : 'Unknown error'
        }
      });

      return;
    }
  }

  /**
   * Get comprehensive health check status
   */
  static async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Performing comprehensive health check');

      const healthStatus = await businessLogicIntegration.comprehensiveHealthCheck();

      res.json({
        success: true,
        data: healthStatus,
        metadata: {
          timestamp: new Date(),
          requestId: `health-${Date.now()}`,
          apiVersion: '1.0.0'
        }
      });
    } catch (error: unknown) {
      logger.error('Error performing health check:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Failed to perform health check',
          details: error instanceof Error ? (error as Error).message : 'Unknown error'
        }
      });

      return;
    }
  }

  /**
   * Execute a production operation with enhanced monitoring
   */
  static async executeProductionOperation(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName, methodName, args = [], options = {} } = req.body;

      if (!serviceName || !methodName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'serviceName and methodName are required'
          }
        });

        return;
        return;
      }

      logger.info(`Executing production operation: ${serviceName}.${methodName}`, {
        serviceName,
        methodName,
        argsCount: args.length
      });

      const result = await businessLogicIntegration.executeProductionOperation(
        serviceName,
        methodName,
        args,
        {
          validateInput: true,
          retryOnFailure: true,
          circuitBreaker: true,
          ...options
        }
      );

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (error: unknown) {
      logger.error('Error executing production operation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Failed to execute production operation',
          details: error instanceof Error ? (error as Error).message : 'Unknown error'
        }
      });

      return;
    }
  }

  /**
   * Get list of available service bridges
   */
  static async getAvailableBridges(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching available service bridges');

      const bridges = businessLogicIntegration.listBridges();
      const bridgeDetails = bridges.map(serviceName => {
        const bridgeInfo = businessLogicIntegration.getBridgeInfo(serviceName);
        return {
          serviceName,
          ...bridgeInfo
        };
      });

      res.json({
        success: true,
        data: {
          bridges: bridgeDetails,
          totalCount: bridges.length
        },
        metadata: {
          timestamp: new Date(),
          requestId: `bridges-${Date.now()}`,
          apiVersion: '1.0.0'
        }
      });
    } catch (error: unknown) {
      logger.error('Error fetching available bridges:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BRIDGES_FETCH_ERROR',
          message: 'Failed to fetch available bridges',
          details: error instanceof Error ? (error as Error).message : 'Unknown error'
        }
      });

      return;
    }
  }

  /**
   * Add validation rule for a service method
   */
  static async addValidationRule(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName, methodName, rules } = req.body;

      if (!serviceName || !methodName || !rules || !Array.isArray(rules)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'serviceName, methodName, and rules array are required'
          }
        });

        return;
        return;
      }

      logger.info(`Adding validation rule for ${serviceName}.${methodName}`, {
        serviceName,
        methodName,
        rulesCount: rules.length
      });

      businessLogicIntegration.addValidationRule(serviceName, methodName, rules);

      res.json({
        success: true,
        data: {
          message: `Validation rules added for ${serviceName}.${methodName}`,
          serviceName,
          methodName,
          rulesAdded: rules.length
        },
        metadata: {
          timestamp: new Date(),
          requestId: `validation-${Date.now()}`,
          apiVersion: '1.0.0'
        }
      });
    } catch (error: unknown) {
      logger.error('Error adding validation rule:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_RULE_ERROR',
          message: 'Failed to add validation rule',
          details: error instanceof Error ? (error as Error).message : 'Unknown error'
        }
      });

      return;
    }
  }

  /**
   * Get service-specific metrics
   */
  static async getServiceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;

      if (!serviceName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'serviceName parameter is required'
          }
        });

        return;
        return;
      }

      logger.info(`Fetching metrics for service: ${serviceName}`);

      const bridgeInfo = businessLogicIntegration.getBridgeInfo(serviceName);
      const allMetrics = businessLogicIntegration.getProductionMetrics();
      
      const serviceMetrics = allMetrics.detailedMetrics.find(
        m => m.serviceName === serviceName
      );

      if (!bridgeInfo || !serviceMetrics) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: `Service ${serviceName} not found`
          }
        });

        return;
        return;
      }

      res.json({
        success: true,
        data: {
          serviceName,
          bridgeInfo,
          metrics: serviceMetrics
        },
        metadata: {
          timestamp: new Date(),
          requestId: `service-metrics-${Date.now()}`,
          apiVersion: '1.0.0'
        }
      });
    } catch (error: unknown) {
      logger.error(`Error fetching service metrics for ${req.params.serviceName}:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_METRICS_ERROR',
          message: 'Failed to fetch service metrics',
          details: error instanceof Error ? (error as Error).message : 'Unknown error'
        }
      });

      return;
    }
  }

  /**
   * Reset metrics for testing/maintenance
   */
  static async resetMetrics(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Resetting production metrics (admin operation)');

      // In a production environment, you'd want proper authentication/authorization here
      // For now, we'll just log the operation
      
      res.json({
        success: true,
        data: {
          message: 'Metrics reset operation logged (not implemented for safety)',
          timestamp: new Date()
        },
        metadata: {
          timestamp: new Date(),
          requestId: `reset-${Date.now()}`,
          apiVersion: '1.0.0'
        }
      });
    } catch (error: unknown) {
      logger.error('Error resetting metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RESET_ERROR',
          message: 'Failed to reset metrics',
          details: error instanceof Error ? (error as Error).message : 'Unknown error'
        }
      });

      return;
    }
  }
}