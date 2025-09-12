/**
 * Real-World Phase 3 Business Logic Routes
 * REST API routes for comprehensive enterprise scenarios
 */

import { Router } from 'express';
import { RealWorldPhase3Controller } from '@/controllers/RealWorldPhase3Controller';

const router = Router();
const controller = new RealWorldPhase3Controller();

// Corporate Real Estate Management Routes
router.get('/corporate-real-estate/portfolio-analysis/:organizationId', 
  controller.getCorporatePortfolioAnalysis.bind(controller));
router.post('/corporate-real-estate/workplace-transformation', 
  controller.planWorkplaceTransformation.bind(controller));

// Enterprise Move Management Routes  
router.post('/move-management/global-project/:organizationId', 
  controller.planGlobalMoveProject.bind(controller));
router.post('/move-management/execute/:organizationId/:projectId', 
  controller.executeMoveOperation.bind(controller));

// Advanced Chargeback and Cost Allocation Routes
router.post('/chargeback/design-model', 
  controller.designChargebackModel.bind(controller));
router.post('/chargeback/execute-allocation', 
  controller.executeCostAllocation.bind(controller));

// Phase 3 Integration and Orchestration Routes
router.post('/integration/enterprise-transformation', 
  controller.executeEnterpriseTransformation.bind(controller));
router.get('/integration/enterprise-insights/:organizationId', 
  controller.generateEnterpriseInsights.bind(controller));
router.post('/integration/ai-portfolio-optimization', 
  controller.executeAIPortfolioOptimization.bind(controller));
router.post('/integration/simulate-scenarios', 
  controller.simulateRealWorldScenarios.bind(controller));

// Health and Status Routes
router.get('/health', controller.getHealthStatus.bind(controller));

export default router;