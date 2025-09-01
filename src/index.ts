import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config';
import { logger } from './config/logger';
import { connectRedis } from './config/redis';
import { InternationalizationService } from './services/InternationalizationService';

// Import routes
import propertyRoutes from './controllers/PropertyController';
import assetRoutes from './controllers/AssetController';
import workflowRoutes from './controllers/WorkflowController';
import documentRoutes from './controllers/DocumentController';
import bulkDataRoutes from './controllers/BulkDataController';
import customFieldRoutes from './controllers/CustomFieldController';
import integrationRoutes from './controllers/IntegrationController';
import notificationRoutes from './controllers/NotificationController';

// Phase 3: Space Management & Portfolio Tracking routes
import spaceBookingRoutes from './controllers/SpaceBookingController';
import moveManagementRoutes from './controllers/MoveManagementController';
import portfolioRoutes from './controllers/PortfolioController';

// Phase 4: Lease Administration & Financial Management routes
import { LeaseManagementController } from './controllers/LeaseManagementController';
import { ComplianceController } from './controllers/ComplianceController';
import { CriticalDateController } from './controllers/CriticalDateController';
import { FinancialConsolidationController } from './controllers/FinancialConsolidationController';

// Phase 5: Maintenance & Asset Management routes
import MaintenanceController from './controllers/MaintenanceController';
import WorkOrderController from './controllers/WorkOrderController';

// Phase 6: Enterprise Integrations & Reporting routes
import { EnterpriseIntegrationController } from './controllers/EnterpriseIntegrationController';
import { DataWarehouseController } from './controllers/DataWarehouseController';
import { BusinessIntelligenceController } from './controllers/BusinessIntelligenceController';
import { DataGovernanceController } from './controllers/DataGovernanceController';
import { APIManagementController } from './controllers/APIManagementController';
import { WhiteLabelController } from './controllers/WhiteLabelController';

class TurboAssetServer {
  private app: express.Application;
  private server: any;
  private io: SocketServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());

    // Body parsing middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });
  }

  private setupRoutes(): void {
    const apiRouter = express.Router();

    // Mount API routes
    apiRouter.use('/properties', propertyRoutes);
    apiRouter.use('/assets', assetRoutes);
    apiRouter.use('/workflows', workflowRoutes);
    apiRouter.use('/documents', documentRoutes);
    apiRouter.use('/bulk', bulkDataRoutes);
    apiRouter.use('/custom-fields', customFieldRoutes);
    apiRouter.use('/integrations', integrationRoutes);
    apiRouter.use('/notifications', notificationRoutes);

    // Phase 3: Space Management & Portfolio Tracking routes
    apiRouter.use('/space-bookings', spaceBookingRoutes);
    apiRouter.use('/move-management', moveManagementRoutes);
    apiRouter.use('/portfolio', portfolioRoutes);

    // Phase 4: Lease Administration & Financial Management routes
    apiRouter.use('/lease-management', LeaseManagementController);
    apiRouter.use('/compliance', ComplianceController);
    apiRouter.use('/critical-dates', CriticalDateController);
    apiRouter.use('/financial-consolidation', FinancialConsolidationController);

    // Phase 5: Maintenance & Asset Management routes
    apiRouter.use('/maintenance', MaintenanceController);
    apiRouter.use('/work-orders', WorkOrderController);

    // Phase 6: Enterprise Integrations & Reporting routes
    const enterpriseIntegrationController = new EnterpriseIntegrationController();
    const dataWarehouseController = new DataWarehouseController();
    const businessIntelligenceController = new BusinessIntelligenceController();
    const dataGovernanceController = new DataGovernanceController();
    const apiManagementController = new APIManagementController();
    const whiteLabelController = new WhiteLabelController();

    // Enterprise Integration routes
    apiRouter.get('/enterprise-integrations/:organizationId/integrations', enterpriseIntegrationController.getIntegrations);
    apiRouter.post('/enterprise-integrations/:organizationId/integrations', enterpriseIntegrationController.createIntegration);
    apiRouter.put('/enterprise-integrations/:organizationId/integrations/:integrationId', enterpriseIntegrationController.updateIntegration);
    apiRouter.delete('/enterprise-integrations/:organizationId/integrations/:integrationId', enterpriseIntegrationController.deleteIntegration);
    apiRouter.post('/enterprise-integrations/:organizationId/integrations/:integrationId/test', enterpriseIntegrationController.testConnection);
    apiRouter.post('/enterprise-integrations/:organizationId/esb/send', enterpriseIntegrationController.sendMessage);
    apiRouter.get('/enterprise-integrations/:organizationId/esb/metrics', enterpriseIntegrationController.getESBMetrics);
    apiRouter.get('/enterprise-integrations/:organizationId/esb/health', enterpriseIntegrationController.getESBHealth);
    apiRouter.post('/enterprise-integrations/:organizationId/salesforce/sync', enterpriseIntegrationController.syncWithSalesforce);
    apiRouter.get('/enterprise-integrations/:organizationId/salesforce/reports/:reportId', enterpriseIntegrationController.getSalesforceReports);
    apiRouter.post('/enterprise-integrations/:organizationId/outlook/sync/:bookingId', enterpriseIntegrationController.syncBookingToOutlook);
    apiRouter.post('/enterprise-integrations/:organizationId/sharepoint/library', enterpriseIntegrationController.createSharePointLibrary);
    apiRouter.get('/enterprise-integrations/:organizationId/microsoft365/auth', enterpriseIntegrationController.getAuthorizationUrl);
    apiRouter.get('/enterprise-integrations/:organizationId/integrations/:integrationId/flows', enterpriseIntegrationController.getIntegrationFlows);
    apiRouter.post('/enterprise-integrations/:organizationId/integrations/:integrationId/flows', enterpriseIntegrationController.createIntegrationFlow);
    apiRouter.post('/enterprise-integrations/:organizationId/flows/:flowId/execute', enterpriseIntegrationController.executeFlow);
    apiRouter.get('/enterprise-integrations/:organizationId/analytics', enterpriseIntegrationController.getIntegrationAnalytics);

    // Data Warehouse routes
    apiRouter.get('/data-warehouse/:organizationId/warehouses', dataWarehouseController.getWarehouses);
    apiRouter.post('/data-warehouse/:organizationId/warehouses', dataWarehouseController.createWarehouse);
    apiRouter.put('/data-warehouse/:organizationId/warehouses/:warehouseId', dataWarehouseController.updateWarehouse);
    apiRouter.delete('/data-warehouse/:organizationId/warehouses/:warehouseId', dataWarehouseController.deleteWarehouse);
    apiRouter.get('/data-warehouse/:organizationId/warehouses/:warehouseId/etl', dataWarehouseController.getETLProcesses);
    apiRouter.post('/data-warehouse/:organizationId/warehouses/:warehouseId/etl', dataWarehouseController.createETLProcess);
    apiRouter.post('/data-warehouse/:organizationId/etl/:processId/execute', dataWarehouseController.executeETLProcess);
    apiRouter.get('/data-warehouse/:organizationId/etl/:processId/metrics', dataWarehouseController.getETLMetrics);
    apiRouter.get('/data-warehouse/:organizationId/warehouses/:warehouseId/data', dataWarehouseController.getHistoricalData);
    apiRouter.post('/data-warehouse/:organizationId/warehouses/:warehouseId/data-marts', dataWarehouseController.createDataMart);
    apiRouter.post('/data-warehouse/:organizationId/etl/:processId/schedule', dataWarehouseController.scheduleETLProcess);
    apiRouter.put('/data-warehouse/:organizationId/etl/:processId', dataWarehouseController.updateETLProcess);
    apiRouter.delete('/data-warehouse/:organizationId/etl/:processId', dataWarehouseController.deleteETLProcess);
    apiRouter.get('/data-warehouse/:organizationId/warehouses/:warehouseId/analytics', dataWarehouseController.getWarehouseAnalytics);
    apiRouter.post('/data-warehouse/:organizationId/warehouses/:warehouseId/test', dataWarehouseController.testConnection);
    apiRouter.get('/data-warehouse/:organizationId/warehouses/:warehouseId/quality', dataWarehouseController.getDataQualityMetrics);
    apiRouter.get('/data-warehouse/:organizationId/etl/:processId/history', dataWarehouseController.getExecutionHistory);

    // Business Intelligence routes
    apiRouter.get('/business-intelligence/:organizationId/reports', businessIntelligenceController.getReports);
    apiRouter.post('/business-intelligence/:organizationId/reports', businessIntelligenceController.createReport);
    apiRouter.post('/business-intelligence/:organizationId/reports/:reportId/execute', businessIntelligenceController.executeReport);
    apiRouter.put('/business-intelligence/:organizationId/reports/:reportId', businessIntelligenceController.updateReport);
    apiRouter.delete('/business-intelligence/:organizationId/reports/:reportId', businessIntelligenceController.deleteReport);
    apiRouter.get('/business-intelligence/:organizationId/dashboards', businessIntelligenceController.getDashboards);
    apiRouter.post('/business-intelligence/:organizationId/dashboards', businessIntelligenceController.createDashboard);
    apiRouter.get('/business-intelligence/:organizationId/dashboards/:dashboardId/data', businessIntelligenceController.getDashboardData);
    apiRouter.put('/business-intelligence/:organizationId/dashboards/:dashboardId', businessIntelligenceController.updateDashboard);
    apiRouter.delete('/business-intelligence/:organizationId/dashboards/:dashboardId', businessIntelligenceController.deleteDashboard);
    apiRouter.post('/business-intelligence/:organizationId/warehouses/:warehouseId/build', businessIntelligenceController.buildReport);
    apiRouter.get('/business-intelligence/:organizationId/warehouses/:warehouseId/sources', businessIntelligenceController.getDataSources);
    apiRouter.post('/business-intelligence/:organizationId/visualizations/suggest', businessIntelligenceController.getSuggestedVisualizations);
    apiRouter.get('/business-intelligence/:organizationId/reports/:reportId/export', businessIntelligenceController.exportReport);
    apiRouter.get('/business-intelligence/:organizationId/executive-dashboard', businessIntelligenceController.getExecutiveDashboard);
    apiRouter.get('/business-intelligence/:organizationId/benchmarking', businessIntelligenceController.getBenchmarkingReport);
    apiRouter.post('/business-intelligence/:organizationId/reports/:reportId/schedules', businessIntelligenceController.createSchedule);
    apiRouter.get('/business-intelligence/:organizationId/schedules', businessIntelligenceController.getSchedules);
    apiRouter.put('/business-intelligence/:organizationId/schedules/:scheduleId', businessIntelligenceController.updateSchedule);
    apiRouter.delete('/business-intelligence/:organizationId/schedules/:scheduleId', businessIntelligenceController.deleteSchedule);
    apiRouter.post('/business-intelligence/:organizationId/templates', businessIntelligenceController.createTemplate);
    apiRouter.post('/business-intelligence/:organizationId/templates/:templateId/generate', businessIntelligenceController.generateFromTemplate);
    apiRouter.get('/business-intelligence/:organizationId/analytics', businessIntelligenceController.getBIAnalytics);

    // Data Governance routes
    apiRouter.get('/data-governance/:organizationId/rules', dataGovernanceController.getGovernanceRules);
    apiRouter.post('/data-governance/:organizationId/rules', dataGovernanceController.createGovernanceRule);
    apiRouter.put('/data-governance/:organizationId/rules/:ruleId', dataGovernanceController.updateGovernanceRule);
    apiRouter.delete('/data-governance/:organizationId/rules/:ruleId', dataGovernanceController.deleteGovernanceRule);
    apiRouter.get('/data-governance/:organizationId/master-data', dataGovernanceController.getMasterDataRecords);
    apiRouter.post('/data-governance/:organizationId/master-data', dataGovernanceController.createMasterDataRecord);
    apiRouter.post('/data-governance/:organizationId/lineage', dataGovernanceController.trackDataLineage);
    apiRouter.get('/data-governance/:organizationId/lineage/:entityType/:entityId', dataGovernanceController.getDataLineage);
    apiRouter.get('/data-governance/:organizationId/quality', dataGovernanceController.getDataQualityMetrics);
    apiRouter.post('/data-governance/:organizationId/classify', dataGovernanceController.classifyData);
    apiRouter.post('/data-governance/:organizationId/stewards', dataGovernanceController.assignDataSteward);
    apiRouter.post('/data-governance/:organizationId/violations/detect', dataGovernanceController.detectPolicyViolations);
    apiRouter.post('/data-governance/:organizationId/master-data/manage', dataGovernanceController.manageMasterData);
    apiRouter.post('/data-governance/:organizationId/access/audit', dataGovernanceController.auditDataAccess);
    apiRouter.post('/data-governance/:organizationId/retention/monitor', dataGovernanceController.monitorRetentionPolicies);
    apiRouter.get('/data-governance/:organizationId/reports', dataGovernanceController.generateGovernanceReport);
    apiRouter.get('/data-governance/:organizationId/analytics', dataGovernanceController.getGovernanceAnalytics);
    apiRouter.get('/data-governance/:organizationId/stewards', dataGovernanceController.getDataStewards);
    apiRouter.get('/data-governance/:organizationId/catalog', dataGovernanceController.getDataCatalog);
    apiRouter.get('/data-governance/:organizationId/privacy-compliance', dataGovernanceController.getPrivacyComplianceReport);

    // API Management routes
    apiRouter.get('/api-management/:organizationId/keys', apiManagementController.getAPIKeys);
    apiRouter.post('/api-management/:organizationId/keys', apiManagementController.createAPIKey);
    apiRouter.put('/api-management/:organizationId/keys/:keyId', apiManagementController.updateAPIKey);
    apiRouter.delete('/api-management/:organizationId/keys/:keyId/revoke', apiManagementController.revokeAPIKey);
    apiRouter.get('/api-management/:organizationId/keys/:keyId/usage', apiManagementController.getAPIKeyUsage);
    apiRouter.get('/api-management/:organizationId/keys/:keyId/limits', apiManagementController.getRateLimitStatus);
    apiRouter.get('/api-management/:organizationId/analytics', apiManagementController.getUsageAnalytics);
    apiRouter.get('/api-management/:organizationId/health', apiManagementController.getHealthMetrics);
    apiRouter.get('/api-management/:organizationId/documentation', apiManagementController.getAPIDocumentation);
    apiRouter.post('/api-management/:organizationId/endpoints', apiManagementController.registerEndpoint);
    apiRouter.get('/api-management/:organizationId/endpoints/analytics', apiManagementController.getEndpointAnalytics);
    apiRouter.get('/api-management/:organizationId/usage/trends', apiManagementController.getUsageTrends);
    apiRouter.get('/api-management/:organizationId/quotas', apiManagementController.getQuotaStatus);
    apiRouter.get('/api-management/:organizationId/errors', apiManagementController.getErrorAnalysis);
    apiRouter.put('/api-management/:organizationId/keys/:keyId/permissions', apiManagementController.updatePermissions);
    apiRouter.get('/api-management/:organizationId/performance', apiManagementController.getPerformanceMetrics);

    // White Label routes
    apiRouter.get('/white-label/:organizationId/configurations', whiteLabelController.getConfigurations);
    apiRouter.post('/white-label/:organizationId/configurations', whiteLabelController.createConfiguration);
    apiRouter.put('/white-label/:organizationId/branding', whiteLabelController.updateBranding);
    apiRouter.post('/white-label/:organizationId/themes', whiteLabelController.applyTheme);
    apiRouter.post('/white-label/:organizationId/domains', whiteLabelController.setupCustomDomain);
    apiRouter.post('/white-label/:organizationId/domains/verify', whiteLabelController.verifyCustomDomain);
    apiRouter.get('/white-label/domain/:domain/organization', whiteLabelController.getOrganizationByDomain);
    apiRouter.get('/white-label/:organizationId/bundles', whiteLabelController.generateBundle);
    apiRouter.post('/white-label/:organizationId/subsidiaries', whiteLabelController.createSubsidiary);
    apiRouter.get('/white-label/:organizationId/subsidiaries', whiteLabelController.getSubsidiaries);
    apiRouter.post('/white-label/:organizationId/email-templates', whiteLabelController.createEmailTemplate);
    apiRouter.post('/white-label/:organizationId/email-templates/:templateId/render', whiteLabelController.renderEmailTemplate);
    apiRouter.post('/white-label/:organizationId/features', whiteLabelController.setupFeatureFlags);
    apiRouter.get('/white-label/:organizationId/features/:featureName', whiteLabelController.checkFeatureFlag);
    apiRouter.get('/white-label/:organizationId/pwa-manifest', whiteLabelController.generatePWAManifest);
    apiRouter.get('/white-label/:organizationId/themes', whiteLabelController.getAvailableThemes);
    apiRouter.get('/white-label/:organizationId/analytics', whiteLabelController.getBrandingAnalytics);
    apiRouter.put('/white-label/:organizationId/configurations/:configId', whiteLabelController.updateConfiguration);
    apiRouter.delete('/white-label/:organizationId/configurations/:configId', whiteLabelController.deleteConfiguration);
    apiRouter.post('/white-label/:organizationId/logo', whiteLabelController.uploadLogo);
    apiRouter.post('/white-label/:organizationId/themes/preview', whiteLabelController.previewTheme);
    apiRouter.get('/white-label/:organizationId/configurations/:configId/export', whiteLabelController.exportConfiguration);
    apiRouter.post('/white-label/:organizationId/configurations/import', whiteLabelController.importConfiguration);

    this.app.use('/api', apiRouter);

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        title: 'Turbo Asset API',
        version: '1.0.0',
        description: 'Enterprise IWMS Platform API',
        endpoints: {
          properties: '/api/properties',
          assets: '/api/assets',
          workflows: '/api/workflows',
          documents: '/api/documents',
          bulk: '/api/bulk',
          customFields: '/api/custom-fields',
          integrations: '/api/integrations',
          notifications: '/api/notifications',
          // Phase 3: Space Management & Portfolio Tracking
          spaceBookings: '/api/space-bookings',
          moveManagement: '/api/move-management',
          portfolio: '/api/portfolio',
          // Phase 4: Lease Administration & Financial Management
          leaseManagement: '/api/lease-management',
          compliance: '/api/compliance',
          criticalDates: '/api/critical-dates',
          financialConsolidation: '/api/financial-consolidation',
          // Phase 5: Maintenance & Asset Management
          maintenance: '/api/maintenance',
          workOrders: '/api/work-orders',
          preventiveMaintenance: '/api/preventive-maintenance',
          assetLifecycle: '/api/asset-lifecycle',
          inventory: '/api/inventory',
          energyManagement: '/api/energy-management',
          capitalProjects: '/api/capital-projects',
          iotDevices: '/api/iot-devices',
          // Phase 6: Enterprise Integrations & Reporting
          enterpriseIntegrations: '/api/enterprise-integrations',
          dataWarehouse: '/api/data-warehouse',
          businessIntelligence: '/api/business-intelligence',
          dataGovernance: '/api/data-governance',
          apiManagement: '/api/api-management',
          whiteLabel: '/api/white-label',
        },
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
      });
    });

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: config.server.env === 'development' ? error.message : 'Something went wrong',
      });
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      logger.info('Socket.IO client connected', { socketId: socket.id });

      socket.on('join-room', (room: string) => {
        socket.join(room);
        logger.info('Client joined room', { socketId: socket.id, room });
      });

      socket.on('leave-room', (room: string) => {
        socket.leave(room);
        logger.info('Client left room', { socketId: socket.id, room });
      });

      socket.on('disconnect', () => {
        logger.info('Socket.IO client disconnected', { socketId: socket.id });
      });
    });

    // Make io available globally for other services
    (global as any).io = this.io;
  }

  async start(): Promise<void> {
    try {
      // Connect to Redis
      await connectRedis();

      // Initialize internationalization
      const i18nService = InternationalizationService.getInstance();
      await i18nService.initialize();

      // Start server
      this.server.listen(config.server.port, () => {
        logger.info(`Turbo Asset server started on port ${config.server.port}`);
        logger.info(`Environment: ${config.server.env}`);
        logger.info(`API Documentation: http://localhost:${config.server.port}/api/docs`);
        logger.info(`Health Check: http://localhost:${config.server.port}/health`);
      });
    } catch (error) {
      logger.error('Failed to start server', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('Turbo Asset server stopped');
        resolve();
      });
    });
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server if this file is run directly
if (require.main === module) {
  const server = new TurboAssetServer();
  server.start();
}

export default TurboAssetServer;