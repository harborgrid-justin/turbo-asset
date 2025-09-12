import { Application } from 'express';
import { Router } from 'express';

// Import API controllers
import PropertyController from '@/controllers/PropertyController';
import AssetController from '@/controllers/AssetController';
import WorkflowController from '@/controllers/WorkflowController';
import DocumentController from '@/controllers/DocumentController';
import BulkDataController from '@/controllers/BulkDataController';
import { CustomFieldController } from '@/controllers/CustomFieldController';
import IntegrationController from '@/controllers/IntegrationController';
import NotificationController from '@/controllers/NotificationController';

// Phase 3: Space Management & Portfolio Tracking controllers
import SpaceBookingController from '@/controllers/SpaceBookingController';
import MoveManagementController from '@/controllers/MoveManagementController';
import PortfolioController from '@/controllers/PortfolioController';
import SpaceAnalyticsController from '@/controllers/SpaceAnalyticsController';
import SpaceStandardsController from '@/controllers/SpaceStandardsController';

// Phase 4: Lease Administration & Financial Management controllers
import { LeaseManagementController } from '@/controllers/LeaseManagementController';
import { FinancialConsolidationController } from '@/controllers/FinancialConsolidationController';
import { CriticalDateController } from '@/controllers/CriticalDateController';

// Phase 5: Maintenance & Asset Management controllers
import MaintenanceController from '@/controllers/MaintenanceController';
import WorkOrderController from '@/controllers/WorkOrderController';

// Additional enterprise controllers
import { ReportingController } from '@/controllers/ReportingController';
import { BusinessIntelligenceController } from '@/controllers/BusinessIntelligenceController';
import { ComplianceController } from '@/controllers/ComplianceController';
import { DataGovernanceController } from '@/controllers/DataGovernanceController';
import EmergencyPlanningController from '@/controllers/EmergencyPlanningController';
import CADIntegrationController from '@/controllers/CADIntegrationController';
import { WhiteLabelController } from '@/controllers/WhiteLabelController';

// Machine Learning and Analytics controllers
import { MLAnalyticsController } from '@/controllers/ml/MLAnalyticsController';

// Middleware
import { authenticate, optionalAuth } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rateLimiter';

/**
 * Setup all API routes with proper organization and middleware
 */
export function setupRoutes(app: Application): void {
  const apiRouter = Router();

  // Health check route (no authentication required)
  apiRouter.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });

    return;
  });

  // API Documentation route (no authentication required)
  apiRouter.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });

  // Core IWMS routes
  apiRouter.use('/properties', authenticate, PropertyController);
  apiRouter.use('/assets', authenticate, AssetController);
  apiRouter.use('/workflows', authenticate, WorkflowController);
  apiRouter.use('/documents', authenticate, DocumentController);
  apiRouter.use('/custom-fields', authenticate, CustomFieldController);
  apiRouter.use('/integrations', authenticate, IntegrationController);
  apiRouter.use('/notifications', authenticate, NotificationController);

  // Bulk data operations (with special rate limiting)
  apiRouter.use('/bulk', authenticate, BulkDataController);

  // Phase 3: Space Management & Portfolio Tracking
  apiRouter.use('/space-bookings', authenticate, SpaceBookingController);
  apiRouter.use('/move-management', authenticate, MoveManagementController);
  apiRouter.use('/portfolio', authenticate, PortfolioController);
  apiRouter.use('/space-analytics', authenticate, SpaceAnalyticsController);
  apiRouter.use('/space-standards', authenticate, SpaceStandardsController);

  // Phase 4: Lease Administration & Financial Management
  apiRouter.use('/lease-management', authenticate, LeaseManagementController);
  apiRouter.use('/financial-consolidation', authenticate, FinancialConsolidationController);
  apiRouter.use('/critical-dates', authenticate, CriticalDateController);

  // Phase 5: Maintenance & Asset Management
  apiRouter.use('/maintenance', authenticate, MaintenanceController);
  apiRouter.use('/work-orders', authenticate, WorkOrderController);

  // Enterprise Analytics & Reporting
  apiRouter.use('/reporting', authenticate, ReportingController);
  apiRouter.use('/business-intelligence', authenticate, BusinessIntelligenceController);
  apiRouter.use('/ml-analytics', authenticate, MLAnalyticsController);

  // Compliance & Governance
  apiRouter.use('/compliance', authenticate, ComplianceController);
  apiRouter.use('/data-governance', authenticate, DataGovernanceController);
  apiRouter.use('/emergency-planning', authenticate, EmergencyPlanningController);

  // CAD & Spatial Integration
  apiRouter.use('/cad-integration', authenticate, CADIntegrationController);

  // Multi-tenant & White Label
  apiRouter.use('/white-label', authenticate, WhiteLabelController);

  // Public routes (optional authentication)
  apiRouter.use('/public', optionalAuth, (req, res) => {
    res.json({ message: 'Public API endpoint' });
  });

  // Mount the API router
  app.use('/api', apiRateLimit, apiRouter);

  // Default route
  app.get('/', (req, res) => {
    res.json({
      name: 'Turbo Asset - Enterprise IWMS Platform',
      version: process.env.npm_package_version || '1.0.0',
      status: 'running',
      documentation: '/api/docs',
      health: '/api/health'
    });
  });

  // Catch-all route for undefined endpoints
  app.all('*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      message: `Cannot ${req.method} ${req.path}`,
      suggestion: 'Check the API documentation at /api/docs'
    });

    return;
  });
}