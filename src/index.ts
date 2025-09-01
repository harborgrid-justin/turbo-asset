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