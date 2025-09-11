import { Router } from 'express';
import { EnhancedBusinessLogicIntegrationController } from '../controllers/EnhancedBusinessLogicIntegrationController';

const router = Router();

/**
 * Enhanced Business Logic Integration API Routes
 * Production-grade endpoints for NAPI-RS business logic integration
 */

// Core monitoring endpoints
router.get('/metrics', EnhancedBusinessLogicIntegrationController.getProductionMetrics);
router.get('/health', EnhancedBusinessLogicIntegrationController.getHealthStatus);
router.get('/dashboard', EnhancedBusinessLogicIntegrationController.getSystemDashboard);

// Service management endpoints
router.get('/bridges', EnhancedBusinessLogicIntegrationController.getAvailableBridges);
router.get('/services/:serviceName/metrics', EnhancedBusinessLogicIntegrationController.getServiceMetrics);
router.get('/services/:serviceName/config', EnhancedBusinessLogicIntegrationController.getServiceConfiguration);

// Operations endpoints
router.post('/execute', EnhancedBusinessLogicIntegrationController.executeProductionOperation);
router.post('/validation-rules', EnhancedBusinessLogicIntegrationController.addValidationRule);
router.post('/services/:serviceName/reset-metrics', EnhancedBusinessLogicIntegrationController.resetServiceMetrics);

export default router;