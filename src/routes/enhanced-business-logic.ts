/**
 * Enhanced Business Logic Routes
 * API routes for production-grade business logic integration
 */

import { Router } from 'express';
import { EnhancedBusinessLogicController } from '../controllers/EnhancedBusinessLogicController';

const router = Router();

// Core business logic execution
router.post('/execute', EnhancedBusinessLogicController.executeAdvancedBusinessLogic);

// Health and monitoring
router.get('/health', EnhancedBusinessLogicController.getHealthStatus);
router.get('/metrics', EnhancedBusinessLogicController.getMetrics);

// Advanced business rule calculations
router.post('/calculations/asset-depreciation', EnhancedBusinessLogicController.calculateAssetDepreciation);
router.post('/calculations/lease-accounting', EnhancedBusinessLogicController.calculateLeaseAccounting);
router.post('/calculations/space-optimization', EnhancedBusinessLogicController.optimizeSpaceUtilization);
router.post('/calculations/maintenance-optimization', EnhancedBusinessLogicController.optimizeMaintenanceCosts);
router.post('/calculations/financial-consolidation', EnhancedBusinessLogicController.performFinancialConsolidation);

// Data standardization
router.post('/standardization/asset-data', EnhancedBusinessLogicController.standardizeAssetData);
router.post('/standardization/space-data', EnhancedBusinessLogicController.standardizeSpaceData);

// Configuration and management
router.post('/validation-rules', EnhancedBusinessLogicController.addValidationRules);
router.post('/metrics/:serviceName/reset', EnhancedBusinessLogicController.resetServiceMetrics);
router.get('/services', EnhancedBusinessLogicController.listServices);

export default router;