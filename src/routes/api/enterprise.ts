/**
 * Enterprise Business Logic API Routes
 * Comprehensive RESTful API for the 48 enterprise business features
 */

import { Router } from 'express';
import EnterpriseBusinessLogicAPIController from '../../controllers/api/EnterpriseBusinessLogicAPIController';
import { logger } from '../../config/logger';

const router = Router();
const controller = EnterpriseBusinessLogicAPIController.getInstance();

// Middleware for request logging and analytics
const requestLogger = (req: any, res: any, next: any) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  
  logger.info(`API Request: ${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent'],
    timestamp: new Date()
  });
  
  next();
};

// Apply request logging middleware
router.use(requestLogger);

// === ENTERPRISE FEATURES ENDPOINTS ===

router.get('/features', async (req, res) => {
  await controller.getAllFeatures(req, res);
});

router.get('/features/:category', async (req, res) => {
  await controller.getFeaturesByCategory(req, res);
});

router.get('/feature/:featureId', async (req, res) => {
  await controller.getFeature(req, res);
});

// === BUSINESS LOGIC EXECUTION ENDPOINTS ===

router.post('/execute', async (req, res) => {
  await controller.executeOperation(req, res);
});

router.post('/validate', async (req, res) => {
  await controller.validateOperation(req, res);
});

// === MONITORING AND ANALYTICS ENDPOINTS ===

router.get('/metrics', async (req, res) => {
  await controller.getMetrics(req, res);
});

router.get('/health', async (req, res) => {
  await controller.getHealthStatus(req, res);
});

router.get('/analytics', async (req, res) => {
  await controller.getAnalytics(req, res);
});

// === DEVELOPMENT AND TESTING ENDPOINTS ===

router.get('/demo', async (req, res) => {
  try {
    const demoData = {
      message: 'Enterprise 48 Features API - Demo Mode',
      features: [
        {
          id: 'demo-capital-project',
          name: 'Demo Capital Project Management',
          status: 'ACTIVE',
          operations: ['createProject', 'trackProgress', 'calculateROI']
        },
        {
          id: 'demo-financial-consolidation',
          name: 'Demo Financial Consolidation',
          status: 'ACTIVE',
          operations: ['consolidateFinancials', 'convertCurrency']
        }
      ],
      sampleOperations: {
        'demo-capital-project': {
          'createProject': {
            params: [{ name: 'New Office Building', budget: 2000000 }],
            expectedResult: 'Project created with ID CAP-123456'
          },
          'calculateROI': {
            params: [{ investment: 2000000, expectedReturns: 2500000 }],
            expectedResult: 'ROI: 25%'
          }
        }
      },
      apiEndpoints: [
        'GET /api/enterprise/features',
        'GET /api/enterprise/features/:category',
        'POST /api/enterprise/execute',
        'GET /api/enterprise/metrics',
        'GET /api/enterprise/health'
      ],
      timestamp: new Date(),
      version: '1.0.0'
    };

    res.json({
      success: true,
      data: demoData,
      metadata: {
        endpoint: 'demo',
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    logger.error('API: Error in demo endpoint', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DEMO_ERROR',
        message: 'Demo endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// === ERROR HANDLING MIDDLEWARE ===

router.use((error: any, req: any, res: any, next: any) => {
  logger.error('API: Unhandled error in enterprise routes', {
    error: error.message,
    stack: error.stack,
    requestId: req.headers['x-request-id'],
    method: req.method,
    path: req.path
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      requestId: req.headers['x-request-id'],
      timestamp: new Date()
    }
  });
});

export default router;