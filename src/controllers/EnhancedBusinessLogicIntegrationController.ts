import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { enhancedBusinessLogicIntegration } from '../services/enhanced-business-logic-integration';

/**
 * Enhanced Business Logic Integration Controller
 * Production-grade API endpoints for frontend-backend integration
 */
export class EnhancedBusinessLogicIntegrationController {

  /**
   * Get comprehensive production metrics
   */
  static async getProductionMetrics(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching enhanced production metrics');

      const metrics = enhancedBusinessLogicIntegration.getProductionMetrics();

      // Convert Map objects to plain objects for JSON serialization
      const serializedMetrics = {
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        averageResponseTime: metrics.averageResponseTime,
        serviceHealth: Object.fromEntries(metrics.serviceHealth),
        circuitBreakerMetrics: Object.fromEntries(
          Array.from(metrics.circuitBreakerMetrics.entries()).map(([key, value]) => [
            key,
            {
              ...value,
              lastStatusChange: value.lastStatusChange.toISOString()
            }
          ])
        ),
        rateLimitMetrics: Object.fromEntries(
          Array.from(metrics.rateLimitMetrics.entries()).map(([key, value]) => [
            key,
            {
              ...value,
              windowStart: value.windowStart.toISOString()
            }
          ])
        ),
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

      res.json({
        success: true,
        data: serializedMetrics,
        metadata: {
          timestamp: new Date(),
          requestId: `metrics-${Date.now()}`,
          apiVersion: '2.0.0',
          source: 'enhanced-business-logic-integration'
        }
      });
    } catch (error: unknown) {
      logger.error('Error fetching enhanced production metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_FETCH_ERROR',
          message: 'Failed to fetch enhanced production metrics',
          details: (error as Error).message
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
      logger.info('Performing enhanced comprehensive health check');

      const healthStatus = await enhancedBusinessLogicIntegration.comprehensiveHealthCheck();

      // Serialize the response
      const serializedHealthStatus = {
        overallHealth: healthStatus.overallHealth,
        serviceDetails: Object.fromEntries(
          Array.from(healthStatus.serviceDetails.entries()).map(([key, value]) => [
            key,
            {
              ...value,
              lastHealthCheck: value.lastHealthCheck.toISOString()
            }
          ])
        ),
        systemMetrics: healthStatus.systemMetrics,
      };

      res.json({
        success: true,
        data: serializedHealthStatus,
        metadata: {
          timestamp: new Date(),
          requestId: `health-${Date.now()}`,
          apiVersion: '2.0.0',
          source: 'enhanced-business-logic-integration'
        }
      });
    } catch (error: unknown) {
      logger.error('Error performing enhanced health check:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Failed to perform enhanced health check',
          details: (error as Error).message
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

      logger.info(`Executing enhanced production operation: ${serviceName}.${methodName}`);

      const result = await enhancedBusinessLogicIntegration.executeProductionOperation(
        serviceName,
        methodName,
        args,
        options
      );

      res.json({
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          ...result.metadata,
          controller: 'enhanced-business-logic-integration',
          features: ['rate-limiting', 'circuit-breaker', 'validation', 'retry-logic']
        }
      });

    } catch (error: unknown) {
      logger.error('Error executing enhanced production operation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Failed to execute enhanced production operation',
          details: (error as Error).message
        }
      });

      return;
    }
  }

  /**
   * Get list of available service bridges with enhanced details
   */
  static async getAvailableBridges(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching enhanced available service bridges');

      const bridges = enhancedBusinessLogicIntegration.listBridges();
      const bridgeDetails = bridges.map(serviceName => {
        const bridgeInfo = enhancedBusinessLogicIntegration.getBridgeInfo(serviceName);
        return {
          serviceName,
          napiServiceName: bridgeInfo?.napiServiceName,
          integrationMethods: bridgeInfo?.integrationMethods,
          fallbackEnabled: bridgeInfo?.fallbackEnabled,
          metrics: bridgeInfo?.metrics ? {
            ...bridgeInfo.metrics,
            lastHealthCheck: bridgeInfo.metrics.lastHealthCheck?.toISOString(),
            lastFailureTime: bridgeInfo.metrics.lastFailureTime?.toISOString(),
          } : null,
          rateLimit: bridgeInfo?.rateLimit ? {
            maxRequestsPerMinute: bridgeInfo.rateLimit.maxRequestsPerMinute,
            currentWindowRequests: bridgeInfo.rateLimit.requestWindow.size,
            blockUntil: bridgeInfo.rateLimit.blockUntil?.toISOString(),
          } : null,
          validation: bridgeInfo?.validation ? {
            enabled: bridgeInfo.validation.enabled,
            rulesCount: bridgeInfo.validation.rules.size,
          } : null,
          retry: bridgeInfo?.retry,
        };
      });

      res.json({
        success: true,
        data: {
          bridges: bridgeDetails,
          totalCount: bridges.length,
          summary: {
            withRateLimit: bridgeDetails.filter(b => b.rateLimit).length,
            withValidation: bridgeDetails.filter(b => b.validation?.enabled).length,
            withRetry: bridgeDetails.filter(b => b.retry).length,
          }
        },
        metadata: {
          timestamp: new Date(),
          requestId: `bridges-${Date.now()}`,
          apiVersion: '2.0.0',
          source: 'enhanced-business-logic-integration'
        }
      });
    } catch (error: unknown) {
      logger.error('Error fetching enhanced available bridges:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BRIDGES_FETCH_ERROR',
          message: 'Failed to fetch enhanced available bridges',
          details: (error as Error).message
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

      logger.info(`Adding enhanced validation rules for ${serviceName}.${methodName}`);

      const success = enhancedBusinessLogicIntegration.addValidationRule(serviceName, methodName, rules);

      if (success) {
        res.json({
          success: true,
          data: {
            serviceName,
            methodName,
            rulesAdded: rules.length,
            rules: rules.map(rule => ({
              field: rule.field,
              type: rule.type,
              message: rule.message
            }))
          },
          metadata: {
            timestamp: new Date(),
            requestId: `validation-${Date.now()}`,
            apiVersion: '2.0.0',
            source: 'enhanced-business-logic-integration'
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: `Service ${serviceName} not found`
          }
        });

        return;
      }

    } catch (error: unknown) {
      logger.error('Error adding enhanced validation rule:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_RULE_ERROR',
          message: 'Failed to add enhanced validation rule',
          details: (error as Error).message
        }
      });

      return;
    }
  }

  /**
   * Reset metrics for a specific service
   */
  static async resetServiceMetrics(req: Request, res: Response): Promise<void> {
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

      logger.info(`Resetting enhanced metrics for service: ${serviceName}`);

      const success = enhancedBusinessLogicIntegration.resetServiceMetrics(serviceName);

      if (success) {
        res.json({
          success: true,
          data: {
            serviceName,
            metricsReset: true,
            resetTimestamp: new Date().toISOString()
          },
          metadata: {
            timestamp: new Date(),
            requestId: `reset-${Date.now()}`,
            apiVersion: '2.0.0',
            source: 'enhanced-business-logic-integration'
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: `Service ${serviceName} not found`
          }
        });

        return;
      }

    } catch (error: unknown) {
      logger.error('Error resetting enhanced service metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_RESET_ERROR',
          message: 'Failed to reset enhanced service metrics',
          details: (error as Error).message
        }
      });

      return;
    }
  }

  /**
   * Get service-specific metrics with enhanced details
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

      logger.info(`Fetching enhanced metrics for service: ${serviceName}`);

      const bridgeInfo = enhancedBusinessLogicIntegration.getBridgeInfo(serviceName);
      const globalMetrics = enhancedBusinessLogicIntegration.getProductionMetrics();

      if (!bridgeInfo) {
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

      const serviceMetrics = {
        serviceName,
        callMetrics: {
          totalCalls: bridgeInfo.metrics.callCount,
          successfulCalls: bridgeInfo.metrics.successCount,
          failedCalls: bridgeInfo.metrics.failureCount,
          successRate: bridgeInfo.metrics.callCount > 0 
            ? ((bridgeInfo.metrics.successCount / bridgeInfo.metrics.callCount) * 100).toFixed(2)
            : '0.00',
          averageResponseTime: bridgeInfo.metrics.avgResponseTime.toFixed(2)
        },
        circuitBreaker: {
          status: bridgeInfo.metrics.circuitBreakerStatus,
          lastFailureTime: bridgeInfo.metrics.lastFailureTime?.toISOString(),
          metrics: globalMetrics.circuitBreakerMetrics.get(serviceName)
        },
        rateLimit: {
          maxRequestsPerMinute: bridgeInfo.rateLimit.maxRequestsPerMinute,
          currentWindowRequests: bridgeInfo.rateLimit.requestWindow.size,
          blockUntil: bridgeInfo.rateLimit.blockUntil?.toISOString(),
          metrics: globalMetrics.rateLimitMetrics.get(serviceName)
        },
        validation: {
          enabled: bridgeInfo.validation.enabled,
          rulesCount: bridgeInfo.validation.rules.size,
          metrics: globalMetrics.validationMetrics.get(serviceName)
        },
        health: {
          status: globalMetrics.serviceHealth.get(serviceName) || 'UNKNOWN',
          lastHealthCheck: bridgeInfo.metrics.lastHealthCheck?.toISOString()
        }
      };

      res.json({
        success: true,
        data: serviceMetrics,
        metadata: {
          timestamp: new Date(),
          requestId: `service-metrics-${Date.now()}`,
          apiVersion: '2.0.0',
          source: 'enhanced-business-logic-integration'
        }
      });

    } catch (error: unknown) {
      logger.error('Error fetching enhanced service metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_METRICS_ERROR',
          message: 'Failed to fetch enhanced service metrics',
          details: (error as Error).message
        }
      });

      return;
    }
  }

  /**
   * Get real-time system dashboard data
   */
  static async getSystemDashboard(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching enhanced system dashboard data');

      const [metrics, healthStatus] = await Promise.all([
        enhancedBusinessLogicIntegration.getProductionMetrics(),
        enhancedBusinessLogicIntegration.comprehensiveHealthCheck()
      ]);

      const dashboardData = {
        overview: {
          totalRequests: metrics.totalRequests,
          successRate: metrics.totalRequests > 0 
            ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)
            : '0.00',
          averageResponseTime: metrics.averageResponseTime.toFixed(2),
          overallHealth: healthStatus.overallHealth
        },
        services: {
          total: healthStatus.systemMetrics.totalServices,
          healthy: healthStatus.systemMetrics.healthyServices,
          degraded: healthStatus.systemMetrics.degradedServices,
          unhealthy: healthStatus.systemMetrics.unhealthyServices
        },
        circuitBreakers: {
          open: healthStatus.systemMetrics.circuitBreakersOpen,
          closed: healthStatus.systemMetrics.totalServices - healthStatus.systemMetrics.circuitBreakersOpen
        },
        rateLimit: {
          servicesWithLimits: healthStatus.systemMetrics.rateLimitedServices,
          totalBlocked: Array.from(metrics.rateLimitMetrics.values())
            .reduce((sum, metric) => sum + metric.blockedRequests, 0)
        },
        validation: {
          totalValidations: Array.from(metrics.validationMetrics.values())
            .reduce((sum, metric) => sum + metric.totalValidations, 0),
          failedValidations: Array.from(metrics.validationMetrics.values())
            .reduce((sum, metric) => sum + metric.failedValidations, 0)
        },
        topServices: Array.from(healthStatus.serviceDetails.entries())
          .map(([name, details]) => ({
            name,
            status: details.status,
            responseTime: details.responseTime,
            errorRate: (details.errorRate * 100).toFixed(2)
          }))
          .sort((a, b) => parseFloat(b.errorRate) - parseFloat(a.errorRate))
          .slice(0, 5)
      };

      res.json({
        success: true,
        data: dashboardData,
        metadata: {
          timestamp: new Date(),
          requestId: `dashboard-${Date.now()}`,
          apiVersion: '2.0.0',
          source: 'enhanced-business-logic-integration',
          refreshInterval: 30000 // 30 seconds
        }
      });

    } catch (error: unknown) {
      logger.error('Error fetching enhanced system dashboard:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to fetch enhanced system dashboard',
          details: (error as Error).message
        }
      });

      return;
    }
  }

  /**
   * Get configuration options for services
   */
  static async getServiceConfiguration(req: Request, res: Response): Promise<void> {
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

      logger.info(`Fetching enhanced configuration for service: ${serviceName}`);

      const bridgeInfo = enhancedBusinessLogicIntegration.getBridgeInfo(serviceName);

      if (!bridgeInfo) {
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

      const configuration = {
        serviceName,
        napiServiceName: bridgeInfo.napiServiceName,
        integrationMethods: bridgeInfo.integrationMethods,
        fallbackEnabled: bridgeInfo.fallbackEnabled,
        rateLimit: {
          maxRequestsPerMinute: bridgeInfo.rateLimit.maxRequestsPerMinute,
          configurable: true
        },
        circuitBreaker: {
          status: bridgeInfo.metrics.circuitBreakerStatus,
          configurable: true
        },
        validation: {
          enabled: bridgeInfo.validation.enabled,
          rules: Array.from(bridgeInfo.validation.rules.entries()).map(([key, rules]) => ({
            service: key,
            rules: rules.map(rule => ({
              field: rule.field,
              type: rule.type,
              constraints: {
                min: rule.min,
                max: rule.max,
                pattern: rule.pattern?.source
              },
              message: rule.message
            }))
          }))
        },
        retry: {
          maxAttempts: bridgeInfo.retry.maxAttempts,
          backoffMultiplier: bridgeInfo.retry.backoffMultiplier,
          baseDelayMs: bridgeInfo.retry.baseDelayMs
        }
      };

      res.json({
        success: true,
        data: configuration,
        metadata: {
          timestamp: new Date(),
          requestId: `config-${Date.now()}`,
          apiVersion: '2.0.0',
          source: 'enhanced-business-logic-integration'
        }
      });

    } catch (error: unknown) {
      logger.error('Error fetching enhanced service configuration:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Failed to fetch enhanced service configuration',
          details: (error as Error).message
        }
      });

      return;
    }
  }
}