/**
 * Enhanced Business Logic Integration Routes
 * Complete REST API endpoints for production-grade frontend-backend integration
 */

import { Router } from 'express';
import { enhancedBusinessLogicController } from '../controllers/enhanced-business-logic-controller';

const router = Router();

/**
 * Core Monitoring Endpoints
 */

// GET /api/enhanced-business-logic-integration/dashboard
// Get comprehensive dashboard data
router.get('/dashboard', async (req, res) => {
  await enhancedBusinessLogicController.getDashboard(req, res);
});

// GET /api/enhanced-business-logic-integration/health  
// Get detailed health status of all services
router.get('/health', async (req, res) => {
  await enhancedBusinessLogicController.getHealthStatus(req, res);
});

// GET /api/enhanced-business-logic-integration/metrics
// Get production metrics
router.get('/metrics', async (req, res) => {
  await enhancedBusinessLogicController.getMetrics(req, res);
});

/**
 * Service Management Endpoints
 */

// GET /api/enhanced-business-logic-integration/bridges
// List all service bridges with details
router.get('/bridges', async (req, res) => {
  await enhancedBusinessLogicController.getBridges(req, res);
});

// GET /api/enhanced-business-logic-integration/services/:serviceName/metrics
// Get metrics for a specific service
router.get('/services/:serviceName/metrics', async (req, res) => {
  await enhancedBusinessLogicController.getServiceMetrics(req, res);
});

// GET /api/enhanced-business-logic-integration/services/:serviceName/config
// Get configuration for a specific service
router.get('/services/:serviceName/config', async (req, res) => {
  await enhancedBusinessLogicController.getServiceConfig(req, res);
});

/**
 * Operations Endpoints
 */

// POST /api/enhanced-business-logic-integration/execute
// Execute a service method with production-grade features
router.post('/execute', async (req, res) => {
  await enhancedBusinessLogicController.executeService(req, res);
});

// POST /api/enhanced-business-logic-integration/validation-rules
// Add or update validation rules for service methods
router.post('/validation-rules', async (req, res) => {
  await enhancedBusinessLogicController.updateValidationRules(req, res);
});

// POST /api/enhanced-business-logic-integration/services/:serviceName/reset-metrics
// Reset metrics for a specific service
router.post('/services/:serviceName/reset-metrics', async (req, res) => {
  await enhancedBusinessLogicController.resetServiceMetrics(req, res);
});

// POST /api/enhanced-business-logic-integration/reset-all-metrics
// Reset all service metrics
router.post('/reset-all-metrics', async (req, res) => {
  await enhancedBusinessLogicController.resetAllMetrics(req, res);
});

/**
 * Analytics and Insights Endpoints
 */

// GET /api/enhanced-business-logic-integration/analytics
// Get advanced analytics and insights
router.get('/analytics', async (req, res) => {
  await enhancedBusinessLogicController.getAnalytics(req, res);
});

/**
 * Additional Management Endpoints
 */

// GET /api/enhanced-business-logic-integration/status
// Quick status check endpoint (lightweight)
router.get('/status', async (req, res) => {
  try {
    const metrics = (enhancedBusinessLogicController.constructor as any).getProductionMetrics?.() || 
      require('../demo/enhanced-napi-business-logic-demo').enhancedBusinessLogicService.getProductionMetrics();
    
    res.json({
      success: true,
      status: 'operational',
      uptime: metrics.uptime,
      totalServices: 40,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      status: 'error',
      error: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

// GET /api/enhanced-business-logic-integration/version
// Get API version and service information
router.get('/version', (req, res) => {
  res.json({
    success: true,
    data: {
      apiVersion: '2.0.0',
      serviceName: 'Enhanced Business Logic Integration',
      napiVersion: '1.0.0',
      features: [
        'Production-Grade Service Integration',
        'Circuit Breaker Pattern',
        'Rate Limiting',
        'Input Validation',
        'Intelligent Fallback',
        'Comprehensive Metrics',
        'Real-time Health Monitoring',
        'Advanced Analytics'
      ],
      totalServices: 40,
      domains: [
        'Asset Management',
        'Financial Management', 
        'Business Operations',
        'Compliance & Governance',
        'Infrastructure Technology',
        'External Integration',
        'Document Management',
        'Space Management'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Bulk Operations Endpoints
 */

// POST /api/enhanced-business-logic-integration/bulk-execute
// Execute multiple service methods in batch
router.post('/bulk-execute', async (req, res) => {
  try {
    const { operations } = req.body;
    
    if (!Array.isArray(operations)) {
      res.status(400).json({
        success: false,
        error: 'operations must be an array'
      });

      return;
    }

    if (operations.length > 20) {
      res.status(400).json({
        success: false,
        error: 'Maximum 20 operations allowed per batch'
      });

      return;
    }

    const { enhancedBusinessLogicService } = require('../demo/enhanced-napi-business-logic-demo');
    const results = [];

    for (const operation of operations) {
      try {
        const result = await enhancedBusinessLogicService.executeWithEnhancedLogic(
          operation.serviceName,
          operation.methodName,
          operation.parameters || []
        );
        
        results.push({
          operationId: operation.id || results.length + 1,
          success: true,
          data: result.data,
          metadata: result.metadata
        });
      } catch (error: unknown) {
        results.push({
          operationId: operation.id || results.length + 1,
          success: false,
          error: error instanceof Error ? (error as Error).message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
          successRate: `${((successCount / results.length) * 100).toFixed(1)}%`
        },
        results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Bulk execute error:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk execution failed',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Real-time Monitoring Endpoints
 */

// GET /api/enhanced-business-logic-integration/monitoring/live
// Get live monitoring data (for real-time dashboards)
router.get('/monitoring/live', async (req, res) => {
  try {
    const { enhancedBusinessLogicService } = require('../demo/enhanced-napi-business-logic-demo');
    
    const [healthStatus, metrics] = await Promise.all([
      enhancedBusinessLogicService.getComprehensiveHealthStatus(),
      Promise.resolve(enhancedBusinessLogicService.getProductionMetrics())
    ]);

    const liveData = {
      timestamp: new Date().toISOString(),
      system: {
        overallHealth: healthStatus.overallHealth,
        totalServices: healthStatus.totalServices,
        healthyServices: healthStatus.healthyServices,
        uptime: healthStatus.uptimeFormatted
      },
      metrics: {
        requestsPerSecond: metrics.totalRequests > 0 ? 
          Math.round(metrics.totalRequests / (metrics.uptime / 1000)) : 0,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        currentErrorRate: metrics.totalRequests > 0 ? 
          ((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2) : 0,
        activeCircuitBreakers: Object.values(healthStatus.services).filter(
          (s: any) => s.circuitBreakerStatus === 'OPEN'
        ).length
      },
      alerts: healthStatus.overallHealth < 0.8 ? [{
        type: 'health',
        severity: 'warning',
        message: `System health at ${(healthStatus.overallHealth * 100).toFixed(1)}%`
      }] : []
    };

    res.json({
      success: true,
      data: liveData
    });

  } catch (error: unknown) {
    console.error('Live monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live monitoring data'
    });

    return;
  }
});

export default router;