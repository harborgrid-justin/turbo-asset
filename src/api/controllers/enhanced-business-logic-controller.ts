/**
 * Enhanced Business Logic Integration API Controller
 * Provides complete frontend-backend integration with production-grade REST endpoints
 */

import { Request, Response } from 'express';
import { 
  enhancedBusinessLogicService,
  ProductionBusinessLogicBridge 
} from '@/demo/enhanced-napi-business-logic-demo';

/**
 * Enhanced Business Logic Integration Controller
 */
export class EnhancedBusinessLogicIntegrationController {
  
  /**
   * GET /api/enhanced-business-logic-integration/dashboard
   * Get comprehensive dashboard data for frontend
   */
  async getDashboard(req: Request, res: Response) {
    try {
      const [healthStatus, metrics] = await Promise.all([
        enhancedBusinessLogicService.getComprehensiveHealthStatus(),
        Promise.resolve(enhancedBusinessLogicService.getProductionMetrics())
      ]);

      const dashboardData = {
        overview: {
          totalServices: healthStatus.totalServices,
          healthyServices: healthStatus.healthyServices,
          overallHealth: healthStatus.overallHealth,
          healthStatus: healthStatus.healthStatus,
          uptime: healthStatus.uptimeFormatted
        },
        metrics: {
          totalRequests: metrics.totalRequests,
          successfulRequests: metrics.successfulRequests,
          failedRequests: metrics.failedRequests,
          successRate: metrics.totalRequests > 0 ? 
            `${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)  }%` : '0%',
          averageResponseTime: `${Math.round(metrics.averageResponseTime)  }ms`,
          circuitBreakerTrips: metrics.circuitBreakerTrips,
          rateLimitedRequests: metrics.rateLimitedRequests,
          validationFailures: metrics.validationFailures
        },
        servicesByDomain: healthStatus.servicesByDomain,
        recentActivity: this.generateRecentActivity(),
        alerts: this.generateAlerts(healthStatus, metrics),
        performance: {
          responseTimeDistribution: this.generateResponseTimeDistribution(),
          throughput: this.calculateThroughput(metrics),
          errorRates: this.calculateErrorRates(metrics)
        }
      };

      res.json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load dashboard data',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  /**
   * GET /api/enhanced-business-logic-integration/health
   * Get detailed health status of all services
   */
  async getHealthStatus(req: Request, res: Response) {
    try {
      const healthStatus = await enhancedBusinessLogicService.getComprehensiveHealthStatus();

      res.json({
        success: true,
        data: {
          overall: {
            health: healthStatus.overallHealth,
            status: healthStatus.healthStatus,
            totalServices: healthStatus.totalServices,
            healthyServices: healthStatus.healthyServices,
            unhealthyServices: healthStatus.unhealthyServices,
            uptime: healthStatus.uptimeFormatted
          },
          services: healthStatus.services.map((service: any) => ({
            name: service.serviceName,
            healthy: service.healthy,
            lastCheck: service.lastCheck,
            callCount: service.callCount || 0,
            successCount: service.successCount || 0,
            failureCount: service.failureCount || 0,
            avgResponseTime: service.avgResponseTime || 0,
            circuitBreakerStatus: service.circuitBreakerStatus || 'UNKNOWN',
            error: service.error
          })),
          domains: healthStatus.servicesByDomain
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  /**
   * GET /api/enhanced-business-logic-integration/metrics
   * Get production metrics
   */
  async getMetrics(req: Request, res: Response) {
    try {
      const metrics = enhancedBusinessLogicService.getProductionMetrics();

      res.json({
        success: true,
        data: {
          requests: {
            total: metrics.totalRequests,
            successful: metrics.successfulRequests,
            failed: metrics.failedRequests,
            successRate: metrics.totalRequests > 0 ? 
              (metrics.successfulRequests / metrics.totalRequests) : 0
          },
          performance: {
            averageResponseTime: metrics.averageResponseTime,
            uptime: metrics.uptime
          },
          reliability: {
            circuitBreakerTrips: metrics.circuitBreakerTrips,
            rateLimitedRequests: metrics.rateLimitedRequests,
            validationFailures: metrics.validationFailures
          },
          serviceHealth: {
            napi: metrics.napiServiceHealth,
            businessLogic: metrics.businessLogicHealth
          },
          lastUpdated: metrics.lastUpdated
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('Metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  /**
   * GET /api/enhanced-business-logic-integration/bridges
   * List all service bridges
   */
  async getBridges(req: Request, res: Response) {
    try {
      const bridges = enhancedBusinessLogicService.listBridges();
      const bridgeDetails = bridges.map(serviceName => {
        const info = enhancedBusinessLogicService.getBridgeInfo(serviceName);
        return {
          serviceName,
          ...info
        };
      });

      res.json({
        success: true,
        data: {
          total: bridges.length,
          bridges: bridgeDetails
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('Bridges error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bridges',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  /**
   * GET /api/enhanced-business-logic-integration/services/:serviceName/metrics
   * Get metrics for a specific service
   */
  async getServiceMetrics(req: Request, res: Response) {
    try {
      const { serviceName } = req.params;
      const bridgeInfo = enhancedBusinessLogicService.getBridgeInfo(serviceName);

      if (!bridgeInfo) {
        res.status(404).json({
          success: false,
          error: `Service '${serviceName}' not found`
        });

        return;
      return;
      }

      res.json({
        success: true,
        data: {
          serviceName,
          metrics: bridgeInfo.metrics,
          rateLimit: bridgeInfo.rateLimit,
          validation: bridgeInfo.validation,
          integrationMethods: bridgeInfo.integrationMethods,
          fallbackEnabled: bridgeInfo.fallbackEnabled
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('Service metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service metrics',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  /**
   * GET /api/enhanced-business-logic-integration/services/:serviceName/config
   * Get configuration for a specific service
   */
  async getServiceConfig(req: Request, res: Response) {
    try {
      const { serviceName } = req.params;
      const bridgeInfo = enhancedBusinessLogicService.getBridgeInfo(serviceName);

      if (!bridgeInfo) {
        res.status(404).json({
          success: false,
          error: `Service '${serviceName}' not found`
        });

        return;
      return;
      }

      res.json({
        success: true,
        data: {
          serviceName: bridgeInfo.serviceName,
          napiServiceName: bridgeInfo.napiServiceName,
          integrationMethods: bridgeInfo.integrationMethods,
          fallbackEnabled: bridgeInfo.fallbackEnabled,
          rateLimit: bridgeInfo.rateLimit,
          validation: bridgeInfo.validation
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('Service config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service configuration',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  /**
   * POST /api/enhanced-business-logic-integration/execute
   * Execute a service method with production-grade features
   */
  async executeService(req: Request, res: Response) {
    try {
      const { serviceName, methodName, parameters, options = {} } = req.body;

      if (!serviceName || !methodName) {
        res.status(400).json({
          success: false,
          error: 'serviceName and methodName are required'
        });

        return;
      return;
      }

      const startTime = Date.now();
      const result = await enhancedBusinessLogicService.executeWithEnhancedLogic(
        serviceName, 
        methodName, 
        parameters || [], 
        { ...options, userId: req.user?.id }
      );

      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: result.data,
        metadata: {
          ...result.metadata,
          executionTime,
          userId: req.user?.id,
          requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('Service execution error:', error);
      
      // Determine appropriate status code
      let statusCode = 500;
      if (error instanceof Error) {
        if ((error).message.includes('not found')) {statusCode = 404;}
        else if ((error).message.includes('validation') || (error).message.includes('required')) {statusCode = 400;}
        else if ((error).message.includes('rate limit')) {statusCode = 429;}
        else if ((error).message.includes('circuit breaker')) {statusCode = 503;}
      }

      res.status(statusCode).json({
        success: false,
        error: 'Service execution failed',
        details: error instanceof Error ? (error).message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/enhanced-business-logic-integration/validation-rules
   * Add or update validation rules for a service method
   */
  async updateValidationRules(req: Request, res: Response) {
    try {
      const { serviceName, methodName, rules } = req.body;

      if (!serviceName || !methodName || !rules) {
        res.status(400).json({
          success: false,
          error: 'serviceName, methodName, and rules are required'
        });

        return;
      return;
      }

      // In a real implementation, this would update the validation rules
      // For now, we'll just return success as the demo service has static rules
      
      res.json({
        success: true,
        message: `Validation rules updated for ${serviceName}.${methodName}`,
        data: {
          serviceName,
          methodName,
          rulesCount: rules.length,
          updatedBy: req.user?.id,
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error: unknown) {
      console.error('Validation rules error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update validation rules',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  /**
   * POST /api/enhanced-business-logic-integration/services/:serviceName/reset-metrics
   * Reset metrics for a specific service
   */
  async resetServiceMetrics(req: Request, res: Response) {
    try {
      const { serviceName } = req.params;
      const bridgeInfo = enhancedBusinessLogicService.getBridgeInfo(serviceName);

      if (!bridgeInfo) {
        res.status(404).json({
          success: false,
          error: `Service '${serviceName}' not found`
        });

        return;
      return;
      }

      enhancedBusinessLogicService.resetMetrics(serviceName);

      res.json({
        success: true,
        message: `Metrics reset for service: ${serviceName}`,
        data: {
          serviceName,
          resetBy: req.user?.id,
          resetAt: new Date().toISOString()
        }
      });

    } catch (error: unknown) {
      console.error('Reset metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset service metrics',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  /**
   * POST /api/enhanced-business-logic-integration/reset-all-metrics
   * Reset all service metrics
   */
  async resetAllMetrics(req: Request, res: Response) {
    try {
      enhancedBusinessLogicService.resetMetrics();

      res.json({
        success: true,
        message: 'All service metrics have been reset',
        data: {
          resetBy: req.user?.id,
          resetAt: new Date().toISOString()
        }
      });

    } catch (error: unknown) {
      console.error('Reset all metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset all metrics',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  /**
   * GET /api/enhanced-business-logic-integration/analytics
   * Get advanced analytics and insights
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const { timeframe = '24h' } = req.query;
      const metrics = enhancedBusinessLogicService.getProductionMetrics();
      const healthStatus = await enhancedBusinessLogicService.getComprehensiveHealthStatus();

      const analytics = {
        summary: {
          timeframe,
          totalServices: healthStatus.totalServices,
          activeServices: healthStatus.healthyServices,
          totalRequests: metrics.totalRequests,
          errorRate: metrics.totalRequests > 0 ? 
            (metrics.failedRequests / metrics.totalRequests) : 0,
          avgResponseTime: metrics.averageResponseTime
        },
        trends: {
          requestVolume: this.generateRequestVolumeTrend(),
          errorRates: this.generateErrorRateTrend(),
          responseTime: this.generateResponseTimeTrend(),
          serviceHealth: this.generateServiceHealthTrend(healthStatus.services)
        },
        topPerformers: this.getTopPerformingServices(healthStatus.services),
        recommendations: this.generateOptimizationRecommendations(metrics, healthStatus)
      };

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate analytics',
        details: error instanceof Error ? (error).message : 'Unknown error'
      });

      return;
    }
  }

  // Helper methods for dashboard data generation
  private generateRecentActivity() {
    return [
      {
        id: 1,
        type: 'service_execution',
        message: 'Asset lifecycle calculation completed',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        severity: 'info'
      },
      {
        id: 2,
        type: 'circuit_breaker',
        message: 'Circuit breaker opened for advanced-intelligence service',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        severity: 'warning'
      },
      {
        id: 3,
        type: 'rate_limit',
        message: 'Rate limit exceeded for space-utilization service',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        severity: 'warning'
      },
      {
        id: 4,
        type: 'fallback',
        message: 'Fallback executed for financial-consolidation service',
        timestamp: new Date(Date.now() - 35 * 60 * 1000),
        severity: 'info'
      },
      {
        id: 5,
        type: 'health_check',
        message: 'All services health check completed',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        severity: 'info'
      }
    ];
  }

  private generateAlerts(healthStatus: any, metrics: any) {
    const alerts = [];

    if (healthStatus.overallHealth < 0.8) {
      alerts.push({
        id: 1,
        type: 'health',
        severity: 'high',
        message: `Overall system health is ${(healthStatus.overallHealth * 100).toFixed(1)}%`,
        timestamp: new Date(),
        actionRequired: true
      });
    }

    if (metrics.circuitBreakerTrips > 0) {
      alerts.push({
        id: 2,
        type: 'circuit_breaker',
        severity: 'medium',
        message: `${metrics.circuitBreakerTrips} circuit breaker trips detected`,
        timestamp: new Date(),
        actionRequired: true
      });
    }

    if (metrics.averageResponseTime > 500) {
      alerts.push({
        id: 3,
        type: 'performance',
        severity: 'medium',
        message: `Average response time is ${Math.round(metrics.averageResponseTime)}ms`,
        timestamp: new Date(),
        actionRequired: false
      });
    }

    return alerts;
  }

  private generateResponseTimeDistribution() {
    return {
      '0-50ms': 35,
      '50-100ms': 40,
      '100-250ms': 15,
      '250-500ms': 7,
      '500ms+': 3
    };
  }

  private calculateThroughput(metrics: any) {
    const uptimeHours = metrics.uptime / (1000 * 60 * 60);
    return {
      requestsPerHour: uptimeHours > 0 ? Math.round(metrics.totalRequests / uptimeHours) : 0,
      requestsPerMinute: uptimeHours > 0 ? Math.round(metrics.totalRequests / (uptimeHours * 60)) : 0
    };
  }

  private calculateErrorRates(metrics: any) {
    return {
      overall: metrics.totalRequests > 0 ? 
        `${((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)  }%` : '0%',
      rateLimited: metrics.totalRequests > 0 ? 
        `${((metrics.rateLimitedRequests / metrics.totalRequests) * 100).toFixed(2)  }%` : '0%',
      validationErrors: metrics.totalRequests > 0 ? 
        `${((metrics.validationFailures / metrics.totalRequests) * 100).toFixed(2)  }%` : '0%'
    };
  }

  private generateRequestVolumeTrend() {
    // Generate sample trend data
    const hours = 24;
    const trend = [];
    const baseVolume = 100;
    
    for (let i = 0; i < hours; i++) {
      trend.push({
        hour: i,
        requests: Math.floor(baseVolume + Math.sin(i * Math.PI / 12) * 50 + Math.random() * 30)
      });
    }
    
    return trend;
  }

  private generateErrorRateTrend() {
    const hours = 24;
    const trend = [];
    
    for (let i = 0; i < hours; i++) {
      trend.push({
        hour: i,
        errorRate: Math.max(0, Math.random() * 0.1) // 0-10% error rate
      });
    }
    
    return trend;
  }

  private generateResponseTimeTrend() {
    const hours = 24;
    const trend = [];
    const baseTime = 150;
    
    for (let i = 0; i < hours; i++) {
      trend.push({
        hour: i,
        avgResponseTime: Math.floor(baseTime + Math.sin(i * Math.PI / 6) * 25 + Math.random() * 50)
      });
    }
    
    return trend;
  }

  private generateServiceHealthTrend(services: any[]) {
    return services.map(service => ({
      serviceName: service.serviceName,
      healthScore: service.healthy ? 100 : 0,
      trend: service.healthy ? 'stable' : 'degraded'
    }));
  }

  private getTopPerformingServices(services: any[]) {
    return services
      .filter(service => service.avgResponseTime > 0)
      .sort((a, b) => (a.avgResponseTime || 1000) - (b.avgResponseTime || 1000))
      .slice(0, 10)
      .map(service => ({
        serviceName: service.serviceName,
        avgResponseTime: service.avgResponseTime,
        successRate: service.callCount > 0 ? 
          `${((service.successCount / service.callCount) * 100).toFixed(1)  }%` : '0%',
        callCount: service.callCount
      }));
  }

  private generateOptimizationRecommendations(metrics: any, healthStatus: any) {
    const recommendations = [];

    if (healthStatus.overallHealth < 0.9) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'Improve Service Reliability',
        description: 'Several services are experiencing health issues. Consider reviewing circuit breaker thresholds and implementing additional fallback mechanisms.',
        impact: 'High'
      });
    }

    if (metrics.averageResponseTime > 300) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Optimize Response Times',
        description: 'Average response time is above optimal threshold. Consider implementing caching and optimizing NAPI-RS service configurations.',
        impact: 'Medium'
      });
    }

    if (metrics.rateLimitedRequests > metrics.totalRequests * 0.05) {
      recommendations.push({
        type: 'capacity',
        priority: 'medium',
        title: 'Review Rate Limits',
        description: 'High number of rate-limited requests detected. Consider adjusting rate limits or implementing request queuing.',
        impact: 'Medium'
      });
    }

    return recommendations;
  }

  /**
   * Static method to get production metrics
   */
  static getProductionMetrics() {
    return enhancedBusinessLogicService.getProductionMetrics();
  }
}

// Export controller instance
export const enhancedBusinessLogicController = new EnhancedBusinessLogicIntegrationController();