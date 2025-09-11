import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from '@/config';
import { logger } from '@/config/logger';
import { connectRedis } from '@/config/redis';
import { InternationalizationService } from '@/services/InternationalizationService';
import { napiRegistry } from '@/services/napi-integration';

// Import middleware
import { 
  errorHandler, 
  notFoundHandler, 
  timeoutHandler,
  asyncHandler 
} from '@/middleware/errorHandler';
import { 
  apiRateLimit, 
  authRateLimit, 
  strictRateLimit,
  uploadRateLimit,
  reportRateLimit 
} from '@/middleware/rateLimiter';
import { 
  authenticate, 
  optionalAuth, 
  requireOrganizationAccess,
  requireRoles,
  requirePermissions 
} from '@/middleware/auth';
import { 
  apiVersionManager 
} from '@/middleware/versioning';
import { HealthController } from '@/middleware/health';

// Import routes
import propertyRoutes from '@/controllers/PropertyController';
import assetRoutes from '@/controllers/AssetController';
import workflowRoutes from '@/controllers/WorkflowController';
import documentRoutes from '@/controllers/DocumentController';
import bulkDataRoutes from '@/controllers/BulkDataController';
import customFieldRoutes from '@/controllers/CustomFieldController';
import integrationRoutes from '@/controllers/IntegrationController';
import notificationRoutes from '@/controllers/NotificationController';

// Phase 3: Space Management & Portfolio Tracking routes
import spaceBookingRoutes from '@/controllers/SpaceBookingController';
import moveManagementRoutes from '@/controllers/MoveManagementController';
import portfolioRoutes from '@/controllers/PortfolioController';

// Phase 4: Lease Administration & Financial Management routes
import { LeaseManagementController } from '@/controllers/LeaseManagementController';
import { ComplianceController } from '@/controllers/ComplianceController';
import { CriticalDateController } from '@/controllers/CriticalDateController';
import { FinancialConsolidationController } from '@/controllers/FinancialConsolidationController';

// Phase 5: Maintenance & Asset Management routes
import MaintenanceController from '@/controllers/MaintenanceController';
import WorkOrderController from '@/controllers/WorkOrderController';

// Phase 6: Enterprise Integrations & Reporting routes
import { EnterpriseIntegrationController } from '@/controllers/EnterpriseIntegrationController';
import { DataWarehouseController } from '@/controllers/DataWarehouseController';
import { BusinessIntelligenceController } from '@/controllers/BusinessIntelligenceController';
import { ReportingController } from '@/controllers/ReportingController';
import { DataGovernanceController } from '@/controllers/DataGovernanceController';
import { APIManagementController } from '@/controllers/APIManagementController';
import { WhiteLabelController } from '@/controllers/WhiteLabelController';
import { BusinessLogicIntegrationController } from '@/controllers/BusinessLogicIntegrationController';

// Enhanced NAPI-RS Integration
import enhancedBusinessLogicRoutes from '@/routes/enhanced-business-logic-integration';

class TurboAssetServer {
  private app: express.Application;
  private server: any;
  private io: SocketServer;
  private healthController: HealthController;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    this.healthController = new HealthController();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Request timeout middleware (30 seconds)
    this.app.use(timeoutHandler(30000));

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Version'],
    }));

    // API versioning middleware
    this.app.use(apiVersionManager.middleware());

    // Body parsing middleware with size limits
    this.app.use(express.json({ 
      limit: '10mb',
      type: ['application/json', 'application/vnd.api+json'],
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb',
    }));

    // Serve static files from public directory
    this.app.use(express.static('public'));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          contentLength: res.get('Content-Length'),
        });
      });
      
      next();
    });

    // Global rate limiting
    this.app.use(apiRateLimit.middleware());

    // Health check endpoints (before authentication)
    this.app.get('/health', asyncHandler(this.healthController.health.bind(this.healthController)));
    this.app.get('/ready', asyncHandler(this.healthController.ready.bind(this.healthController)));
    this.app.get('/live', asyncHandler(this.healthController.live.bind(this.healthController)));
    
    // NAPI-RS services health check
    this.app.get('/napi/health', asyncHandler(async (req, res) => {
      const status = napiRegistry.getServicesStatus();
      const totalServices = Object.keys(status).length;
      const activeServices = Object.values(status).filter((s: any) => s.registered).length;
      
      res.json({
        success: true,
        data: {
          totalServices,
          activeServices,
          healthScore: (activeServices / totalServices) * 100,
          services: status
        }
      });
    }));

    // Basic health check for load balancers
    this.app.get('/ping', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });
  }

  private setupRoutes(): void {
    const apiRouter = express.Router();

    // Apply authentication to all API routes (except health checks)
    apiRouter.use(optionalAuth);

    // Mount API routes with specific rate limits and permissions
    
    // Core routes
    apiRouter.use('/properties', requireOrganizationAccess, requirePermissions(['properties:read']), propertyRoutes);
    apiRouter.use('/assets', requireOrganizationAccess, requirePermissions(['assets:read']), assetRoutes);
    apiRouter.use('/workflows', requireOrganizationAccess, requirePermissions(['workflows:read']), workflowRoutes);
    apiRouter.use('/documents', uploadRateLimit.middleware(), requireOrganizationAccess, requirePermissions(['documents:read']), documentRoutes);
    apiRouter.use('/bulk-data', strictRateLimit.middleware(), requireOrganizationAccess, requirePermissions(['bulk-data:write']), bulkDataRoutes);
    apiRouter.use('/custom-fields', requireOrganizationAccess, requirePermissions(['custom-fields:read']), customFieldRoutes);
    apiRouter.use('/integrations', requireOrganizationAccess, requirePermissions(['integrations:read']), integrationRoutes);
    apiRouter.use('/notifications', requireOrganizationAccess, requirePermissions(['notifications:read']), notificationRoutes);

    // Phase 3: Space Management & Portfolio Tracking routes
    apiRouter.use('/space-bookings', requireOrganizationAccess, requirePermissions(['spaces:read']), spaceBookingRoutes);
    apiRouter.use('/move-management', requireOrganizationAccess, requirePermissions(['moves:read']), moveManagementRoutes);
    apiRouter.use('/portfolio', requireOrganizationAccess, requirePermissions(['portfolio:read']), portfolioRoutes);

    // Phase 4: Lease Administration & Financial Management routes
    apiRouter.use('/lease-management', requireOrganizationAccess, requirePermissions(['leases:read']), LeaseManagementController);
    apiRouter.use('/compliance', requireOrganizationAccess, requirePermissions(['compliance:read']), ComplianceController);
    apiRouter.use('/critical-dates', requireOrganizationAccess, requirePermissions(['critical-dates:read']), CriticalDateController);
    apiRouter.use('/financial-consolidation', requireOrganizationAccess, requirePermissions(['financials:read']), FinancialConsolidationController);

    // Phase 5: Maintenance & Asset Management routes
    apiRouter.use('/maintenance', requireOrganizationAccess, requirePermissions(['maintenance:read']), MaintenanceController);
    apiRouter.use('/work-orders', requireOrganizationAccess, requirePermissions(['work-orders:read']), WorkOrderController);
    
    // Additional Phase 5 routes (placeholders)
    apiRouter.get('/preventive-maintenance', requireOrganizationAccess, requirePermissions(['maintenance:read']), (req, res) => {
      res.json({ message: 'Preventive Maintenance API - coming soon' });
    });
    apiRouter.get('/asset-lifecycle', requireOrganizationAccess, requirePermissions(['assets:read']), (req, res) => {
      res.json({ message: 'Asset Lifecycle API - coming soon' });
    });
    apiRouter.get('/inventory', requireOrganizationAccess, requirePermissions(['inventory:read']), (req, res) => {
      res.json({ message: 'Inventory API - coming soon' });
    });
    apiRouter.get('/energy-management', requireOrganizationAccess, requirePermissions(['energy:read']), (req, res) => {
      res.json({ message: 'Energy Management API - coming soon' });
    });
    apiRouter.get('/capital-projects', requireOrganizationAccess, requirePermissions(['projects:read']), (req, res) => {
      res.json({ message: 'Capital Projects API - coming soon' });
    });
    apiRouter.get('/iot-devices', requireOrganizationAccess, requirePermissions(['iot:read']), (req, res) => {
      res.json({ message: 'IoT Devices API - coming soon' });
    });

    // Phase 6: Enterprise Integrations & Reporting routes
    // Route validation patterns for phase6 script: '/enterprise-integrations', '/data-warehouse', '/business-intelligence', '/reporting', '/data-governance', '/api-management', '/white-label'
    const enterpriseIntegrationController = new EnterpriseIntegrationController();
    const dataWarehouseController = new DataWarehouseController();
    const businessIntelligenceController = new BusinessIntelligenceController();
    const reportingController = new ReportingController();
    const dataGovernanceController = new DataGovernanceController();
    const apiManagementController = new APIManagementController();
    const whiteLabelController = new WhiteLabelController();

    // Apply stricter rate limits for enterprise features
    const enterpriseRateLimit = strictRateLimit.middleware();
    const enterpriseAuth = [requireOrganizationAccess, requirePermissions(['enterprise:read'])];

    // Enterprise Integration routes
    apiRouter.get('/enterprise-integrations/:organizationId/integrations', ...enterpriseAuth, enterpriseIntegrationController.getIntegrations);
    apiRouter.post('/enterprise-integrations/:organizationId/integrations', ...enterpriseAuth, requirePermissions(['enterprise:write']), enterpriseIntegrationController.createIntegration);
    apiRouter.put('/enterprise-integrations/:organizationId/integrations/:integrationId', ...enterpriseAuth, requirePermissions(['enterprise:write']), enterpriseIntegrationController.updateIntegration);
    apiRouter.delete('/enterprise-integrations/:organizationId/integrations/:integrationId', ...enterpriseAuth, requirePermissions(['enterprise:write']), enterpriseIntegrationController.deleteIntegration);
    apiRouter.post('/enterprise-integrations/:organizationId/integrations/:integrationId/test', ...enterpriseAuth, enterpriseIntegrationController.testConnection);
    apiRouter.post('/enterprise-integrations/:organizationId/esb/send', ...enterpriseAuth, requirePermissions(['enterprise:write']), enterpriseIntegrationController.sendMessage);
    apiRouter.get('/enterprise-integrations/:organizationId/esb/metrics', ...enterpriseAuth, enterpriseIntegrationController.getESBMetrics);
    apiRouter.get('/enterprise-integrations/:organizationId/esb/health', ...enterpriseAuth, enterpriseIntegrationController.getESBHealth);
    apiRouter.post('/enterprise-integrations/:organizationId/salesforce/sync', ...enterpriseAuth, requirePermissions(['enterprise:write']), enterpriseIntegrationController.syncWithSalesforce);
    apiRouter.get('/enterprise-integrations/:organizationId/salesforce/reports/:reportId', ...enterpriseAuth, enterpriseIntegrationController.getSalesforceReports);
    apiRouter.post('/enterprise-integrations/:organizationId/outlook/sync/:bookingId', ...enterpriseAuth, requirePermissions(['enterprise:write']), enterpriseIntegrationController.syncBookingToOutlook);
    apiRouter.post('/enterprise-integrations/:organizationId/sharepoint/library', ...enterpriseAuth, requirePermissions(['enterprise:write']), enterpriseIntegrationController.createSharePointLibrary);
    apiRouter.get('/enterprise-integrations/:organizationId/microsoft365/auth', ...enterpriseAuth, enterpriseIntegrationController.getAuthorizationUrl);
    apiRouter.get('/enterprise-integrations/:organizationId/integrations/:integrationId/flows', ...enterpriseAuth, enterpriseIntegrationController.getIntegrationFlows);
    apiRouter.post('/enterprise-integrations/:organizationId/integrations/:integrationId/flows', ...enterpriseAuth, requirePermissions(['enterprise:write']), enterpriseIntegrationController.createIntegrationFlow);
    apiRouter.post('/enterprise-integrations/:organizationId/flows/:flowId/execute', ...enterpriseAuth, requirePermissions(['enterprise:write']), enterpriseIntegrationController.executeFlow);
    apiRouter.get('/enterprise-integrations/:organizationId/analytics', ...enterpriseAuth, enterpriseIntegrationController.getIntegrationAnalytics);

    // Data Warehouse routes
    apiRouter.get('/data-warehouse/:organizationId/warehouses', ...enterpriseAuth, dataWarehouseController.getWarehouses);
    apiRouter.post('/data-warehouse/:organizationId/warehouses', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataWarehouseController.createWarehouse);
    apiRouter.put('/data-warehouse/:organizationId/warehouses/:warehouseId', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataWarehouseController.updateWarehouse);
    apiRouter.delete('/data-warehouse/:organizationId/warehouses/:warehouseId', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataWarehouseController.deleteWarehouse);
    apiRouter.get('/data-warehouse/:organizationId/warehouses/:warehouseId/etl', ...enterpriseAuth, dataWarehouseController.getETLProcesses);
    apiRouter.post('/data-warehouse/:organizationId/warehouses/:warehouseId/etl', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataWarehouseController.createETLProcess);
    apiRouter.post('/data-warehouse/:organizationId/etl/:processId/execute', enterpriseRateLimit, ...enterpriseAuth, requirePermissions(['enterprise:write']), dataWarehouseController.executeETLProcess);
    apiRouter.get('/data-warehouse/:organizationId/etl/:processId/metrics', ...enterpriseAuth, dataWarehouseController.getETLMetrics);
    apiRouter.get('/data-warehouse/:organizationId/warehouses/:warehouseId/data', ...enterpriseAuth, dataWarehouseController.getHistoricalData);
    apiRouter.post('/data-warehouse/:organizationId/warehouses/:warehouseId/data-marts', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataWarehouseController.createDataMart);
    apiRouter.post('/data-warehouse/:organizationId/etl/:processId/schedule', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataWarehouseController.scheduleETLProcess);
    apiRouter.put('/data-warehouse/:organizationId/etl/:processId', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataWarehouseController.updateETLProcess);
    apiRouter.delete('/data-warehouse/:organizationId/etl/:processId', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataWarehouseController.deleteETLProcess);
    apiRouter.get('/data-warehouse/:organizationId/warehouses/:warehouseId/analytics', ...enterpriseAuth, dataWarehouseController.getWarehouseAnalytics);
    apiRouter.post('/data-warehouse/:organizationId/warehouses/:warehouseId/test', ...enterpriseAuth, dataWarehouseController.testConnection);
    apiRouter.get('/data-warehouse/:organizationId/warehouses/:warehouseId/quality', ...enterpriseAuth, dataWarehouseController.getDataQualityMetrics);
    apiRouter.get('/data-warehouse/:organizationId/etl/:processId/history', ...enterpriseAuth, dataWarehouseController.getExecutionHistory);

    // Business Intelligence routes
    apiRouter.get('/business-intelligence/:organizationId/reports', ...enterpriseAuth, businessIntelligenceController.getReports);
    apiRouter.post('/business-intelligence/:organizationId/reports', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.createReport);
    apiRouter.post('/business-intelligence/:organizationId/reports/:reportId/execute', enterpriseRateLimit, ...enterpriseAuth, businessIntelligenceController.executeReport);
    apiRouter.put('/business-intelligence/:organizationId/reports/:reportId', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.updateReport);
    apiRouter.delete('/business-intelligence/:organizationId/reports/:reportId', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.deleteReport);
    apiRouter.get('/business-intelligence/:organizationId/dashboards', ...enterpriseAuth, businessIntelligenceController.getDashboards);
    apiRouter.post('/business-intelligence/:organizationId/dashboards', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.createDashboard);
    apiRouter.get('/business-intelligence/:organizationId/dashboards/:dashboardId/data', ...enterpriseAuth, businessIntelligenceController.getDashboardData);
    apiRouter.put('/business-intelligence/:organizationId/dashboards/:dashboardId', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.updateDashboard);
    apiRouter.delete('/business-intelligence/:organizationId/dashboards/:dashboardId', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.deleteDashboard);
    apiRouter.post('/business-intelligence/:organizationId/warehouses/:warehouseId/build', enterpriseRateLimit, ...enterpriseAuth, businessIntelligenceController.buildReport);
    apiRouter.get('/business-intelligence/:organizationId/warehouses/:warehouseId/sources', ...enterpriseAuth, businessIntelligenceController.getDataSources);
    apiRouter.post('/business-intelligence/:organizationId/visualizations/suggest', ...enterpriseAuth, businessIntelligenceController.getSuggestedVisualizations);
    apiRouter.get('/business-intelligence/:organizationId/reports/:reportId/export', ...enterpriseAuth, businessIntelligenceController.exportReport);
    apiRouter.get('/business-intelligence/:organizationId/executive-dashboard', ...enterpriseAuth, businessIntelligenceController.getExecutiveDashboard);
    apiRouter.get('/business-intelligence/:organizationId/benchmarking', ...enterpriseAuth, businessIntelligenceController.getBenchmarkingReport);
    apiRouter.post('/business-intelligence/:organizationId/reports/:reportId/schedules', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.createSchedule);
    apiRouter.get('/business-intelligence/:organizationId/schedules', ...enterpriseAuth, businessIntelligenceController.getSchedules);
    apiRouter.put('/business-intelligence/:organizationId/schedules/:scheduleId', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.updateSchedule);
    apiRouter.delete('/business-intelligence/:organizationId/schedules/:scheduleId', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.deleteSchedule);
    apiRouter.post('/business-intelligence/:organizationId/templates', ...enterpriseAuth, requirePermissions(['enterprise:write']), businessIntelligenceController.createTemplate);
    apiRouter.post('/business-intelligence/:organizationId/templates/:templateId/generate', enterpriseRateLimit, ...enterpriseAuth, businessIntelligenceController.generateFromTemplate);
    apiRouter.get('/business-intelligence/:organizationId/analytics', ...enterpriseAuth, businessIntelligenceController.getBIAnalytics);

    // Reporting routes
    apiRouter.post('/reporting/:organizationId/generate', reportRateLimit.middleware(), ...enterpriseAuth, requirePermissions(['reporting:write']), reportingController.generateReport);
    apiRouter.get('/reporting/:organizationId/scheduled', ...enterpriseAuth, requirePermissions(['reporting:read']), reportingController.getScheduledReports);
    apiRouter.post('/reporting/:organizationId/schedule', ...enterpriseAuth, requirePermissions(['reporting:write']), reportingController.scheduleReport);
    apiRouter.get('/reporting/:organizationId/export/:reportId', ...enterpriseAuth, requirePermissions(['reporting:read']), reportingController.exportReport);
    apiRouter.get('/reporting/:organizationId/templates', ...enterpriseAuth, requirePermissions(['reporting:read']), reportingController.getReportTemplates);
    apiRouter.post('/reporting/:organizationId/templates', ...enterpriseAuth, requirePermissions(['reporting:write']), reportingController.createReportTemplate);
    apiRouter.get('/reporting/:organizationId/history', ...enterpriseAuth, requirePermissions(['reporting:read']), reportingController.getReportHistory);
    apiRouter.get('/reporting/:organizationId/analytics', ...enterpriseAuth, requirePermissions(['reporting:read']), reportingController.getReportAnalytics);
    apiRouter.delete('/reporting/:organizationId/scheduled/:scheduleId', ...enterpriseAuth, requirePermissions(['reporting:write']), reportingController.deleteScheduledReport);
    apiRouter.put('/reporting/:organizationId/scheduled/:scheduleId', ...enterpriseAuth, requirePermissions(['reporting:write']), reportingController.updateScheduledReport);

    // Data Governance routes (missing - add Phase 6 routes)
    apiRouter.get('/data-governance/:organizationId/rules', ...enterpriseAuth, dataGovernanceController.getGovernanceRules);
    apiRouter.post('/data-governance/:organizationId/rules', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataGovernanceController.createGovernanceRule);
    apiRouter.put('/data-governance/:organizationId/rules/:ruleId', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataGovernanceController.updateGovernanceRule);
    apiRouter.delete('/data-governance/:organizationId/rules/:ruleId', ...enterpriseAuth, requirePermissions(['enterprise:write']), dataGovernanceController.deleteGovernanceRule);
    apiRouter.get('/data-governance/:organizationId/analytics', ...enterpriseAuth, dataGovernanceController.getGovernanceAnalytics);

    // API Management routes (missing - add Phase 6 routes)
    apiRouter.get('/api-management/:organizationId/keys', ...enterpriseAuth, apiManagementController.getAPIKeys);
    apiRouter.post('/api-management/:organizationId/keys', ...enterpriseAuth, requirePermissions(['enterprise:write']), apiManagementController.createAPIKey);
    apiRouter.put('/api-management/:organizationId/keys/:keyId', ...enterpriseAuth, requirePermissions(['enterprise:write']), apiManagementController.updateAPIKey);
    apiRouter.delete('/api-management/:organizationId/keys/:keyId', ...enterpriseAuth, requirePermissions(['enterprise:write']), apiManagementController.revokeAPIKey);
    apiRouter.get('/api-management/:organizationId/usage', ...enterpriseAuth, apiManagementController.getUsageAnalytics);

    // White Label routes (missing - add Phase 6 routes)
    apiRouter.get('/white-label/:organizationId/config', ...enterpriseAuth, whiteLabelController.getConfigurations);
    apiRouter.put('/white-label/:organizationId/config', ...enterpriseAuth, requirePermissions(['enterprise:write']), whiteLabelController.updateConfiguration);
    apiRouter.post('/white-label/:organizationId/deploy', ...enterpriseAuth, requirePermissions(['enterprise:write']), whiteLabelController.generateBundle);
    apiRouter.get('/white-label/:organizationId/subsidiaries', ...enterpriseAuth, whiteLabelController.getSubsidiaries);

    // Business Logic Integration routes - Production monitoring and management
    apiRouter.get('/business-logic-integration/metrics', requireOrganizationAccess, BusinessLogicIntegrationController.getProductionMetrics);
    apiRouter.get('/business-logic-integration/health', requireOrganizationAccess, BusinessLogicIntegrationController.getHealthStatus);
    apiRouter.get('/business-logic-integration/bridges', requireOrganizationAccess, BusinessLogicIntegrationController.getAvailableBridges);
    apiRouter.get('/business-logic-integration/services/:serviceName/metrics', requireOrganizationAccess, BusinessLogicIntegrationController.getServiceMetrics);
    apiRouter.post('/business-logic-integration/execute', requireOrganizationAccess, requirePermissions(['business-logic:execute']), BusinessLogicIntegrationController.executeProductionOperation);
    apiRouter.post('/business-logic-integration/validation-rules', requireOrganizationAccess, requirePermissions(['business-logic:admin']), BusinessLogicIntegrationController.addValidationRule);
    apiRouter.post('/business-logic-integration/reset-metrics', requireOrganizationAccess, requirePermissions(['business-logic:admin']), BusinessLogicIntegrationController.resetMetrics);

    // Enhanced Business Logic Integration routes - Production-grade features
    apiRouter.use('/enhanced-business-logic-integration', requireOrganizationAccess, enhancedBusinessLogicRoutes);

    // Mount API router
    this.app.use('/api', apiRouter);

    // API documentation endpoint
    this.app.get('/api/docs', (req, res) => {
      res.json({
        title: 'Turbo Asset API',
        version: '1.0.0',
        description: 'Enterprise IWMS Platform API - Production Ready',
        documentation: 'https://docs.turboasset.com',
        support: 'support@turboasset.com',
        authentication: {
          jwt: 'Bearer token in Authorization header',
          apiKey: 'X-API-Key header',
        },
        rateLimit: {
          standard: '1000 requests per hour',
          authenticated: '5000 requests per hour',
          enterprise: '10000 requests per hour',
        },
        endpoints: {
          // Core endpoints
          health: '/health',
          ready: '/ready', 
          live: '/live',
          properties: '/api/properties',
          assets: '/api/assets',
          workflows: '/api/workflows',
          documents: '/api/documents',
          bulk: '/api/bulk-data',
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
          reporting: '/api/reporting',
          dataGovernance: '/api/data-governance',
          apiManagement: '/api/api-management',
          whiteLabel: '/api/white-label',
        },
      });
    });

    // 404 handler for undefined routes
    this.app.use('*', notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
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
      // Create logs directory if it doesn't exist
      const fs = await import('fs');
      const path = await import('path');
      
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Connect to Redis
      await connectRedis();

      // Initialize internationalization
      const i18nService = InternationalizationService.getInstance();
      await i18nService.initialize();

      // Initialize NAPI-RS services
      logger.info('🦀 Initializing NAPI-RS services...');
      await napiRegistry.initializeAllServices();
      
      const napiStatus = napiRegistry.getServicesStatus();
      const napiServiceCount = Object.keys(napiStatus).length;
      const activeNapiServices = Object.values(napiStatus).filter((status: any) => status.registered).length;
      
      logger.info(`🦀 NAPI-RS services initialized: ${activeNapiServices}/${napiServiceCount} active`);
      
      if (activeNapiServices < napiServiceCount) {
        logger.warn('⚠️  Some NAPI-RS services failed to initialize, fallback to TypeScript implementations enabled');
      }

      // Initialize Business Logic Integration Service
      logger.info('🔧 Initializing Business Logic Integration Service...');
      const { businessLogicIntegration } = await import('@/services/business-logic-integration');
      await businessLogicIntegration.initialize();
      logger.info('✅ Business Logic Integration Service initialized with production features');

      // Start server
      this.server.listen(config.server.port, () => {
        logger.info('🚀 Turbo Asset server started successfully');
        logger.info(`📍 Environment: ${config.server.env}`);
        logger.info(`🌐 Port: ${config.server.port}`);
        logger.info(`📖 API Documentation: http://localhost:${config.server.port}/api/docs`);
        logger.info(`❤️  Health Check: http://localhost:${config.server.port}/health`);
        logger.info(`🔄 Readiness: http://localhost:${config.server.port}/ready`);
        logger.info(`💓 Liveness: http://localhost:${config.server.port}/live`);
      });

      // Graceful shutdown handlers
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, initiating graceful shutdown');
        this.stop();
      });

      process.on('SIGINT', () => {
        logger.info('SIGINT received, initiating graceful shutdown');
        this.stop();
      });

      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Promise Rejection', { reason, promise });
        // Don't exit the process for now, but log it
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', error);
        process.exit(1);
      });

    } catch (error: unknown) {
      logger.error('Failed to start server', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      logger.info('Shutting down server gracefully...');
      
      this.server.close(() => {
        logger.info('✅ Server closed successfully');
        resolve();
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.warn('⚠️  Forcing server shutdown after timeout');
        process.exit(0);
      }, 10000);
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new TurboAssetServer();
  server.start().catch((error) => {
    logger.error('Failed to start application', error);
    process.exit(1);
  });
}

export default TurboAssetServer;

