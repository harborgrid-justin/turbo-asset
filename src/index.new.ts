import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

// Core imports
import { config } from '@/config';
import { logger } from '@/config/logger';
import { connectDatabase } from '@/database';
import { connectRedis } from '@/config/redis';

// Middleware
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
import { apiVersionManager } from '@/middleware/versioning';
import { HealthController } from '@/middleware/health';

// API Routes
import { setupRoutes } from '@/routes';

// Services
import { InternationalizationService } from '@/services/tenant/InternationalizationService';

/**
 * Main application class following enterprise architecture patterns
 */
class TurboAssetApplication {
  private readonly _app: express.Application;
  private readonly _server: ReturnType<typeof createServer>;
  private readonly _io: SocketServer;
  private readonly _healthController: HealthController;

  constructor() {
    this._app = express();
    this._server = createServer(this._app);
    this._io = new SocketServer(this._server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this._healthController = new HealthController();

    this._setupMiddleware();
    this._setupRoutes();
    this._setupErrorHandling();
    this._setupSocketIO();
  }

  /**
   * Configure Express middleware following security best practices
   */
  private _setupMiddleware(): void {
    // Security middleware
    this._app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    this._app.use(cors({
      origin: config.cors.origin,
      methods: config.cors.methods,
      allowedHeaders: config.cors.allowedHeaders,
      credentials: config.cors.credentials
    }));

    // Request parsing middleware
    this._app.use(express.json({ limit: '10mb' }));
    this._app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // API versioning
    this._app.use(apiVersionManager);

    // Request timeout
    this._app.use(timeoutHandler);

    // Health check endpoint (should be accessible without auth)
    this._app.use('/health', this._healthController.getRouter());

    // Rate limiting
    this._app.use('/api/', apiRateLimit);
    this._app.use('/api/auth/', authRateLimit);
    this._app.use('/api/bulk/', uploadRateLimit);
    this._app.use('/api/reports/', reportRateLimit);

    // Request logging middleware
    this._app.use((req, res, next) => {
      logger.info('API Request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  /**
   * Setup API routes with proper organization
   */
  private _setupRoutes(): void {
    setupRoutes(this._app);
  }

  /**
   * Configure error handling middleware
   */
  private _setupErrorHandling(): void {
    // 404 handler
    this._app.use(notFoundHandler);

    // Global error handler
    this._app.use(errorHandler);

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
      this._gracefulShutdown();
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error });
      this._gracefulShutdown();
    });
  }

  /**
   * Configure Socket.IO for real-time features
   */
  private _setupSocketIO(): void {
    this._io.on('connection', (socket) => {
      logger.info('Socket.IO client connected', { socketId: socket.id });

      socket.on('disconnect', () => {
        logger.info('Socket.IO client disconnected', { socketId: socket.id });
      });

      // Add more socket event handlers as needed
    });
  }

  /**
   * Initialize application dependencies
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize database connection
      await connectDatabase();
      logger.info('Database connected successfully');

      // Initialize Redis connection
      await connectRedis();
      logger.info('Redis connected successfully');

      // Initialize internationalization service
      await InternationalizationService.initialize();
      logger.info('Internationalization service initialized');

      // Initialize health checks
      await this._healthController.initialize();
      logger.info('Health check service initialized');

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', { error });
      throw error;
    }
  }

  /**
   * Start the application server
   */
  public async start(): Promise<void> {
    await this.initialize();

    const port = config.server.port;
    const host = config.server.host || '0.0.0.0';

    this._server.listen(port, host, () => {
      logger.info(`Server started successfully`, {
        port,
        host,
        environment: config.server.env,
        nodeVersion: process.version,
        pid: process.pid
      });
    });

    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => this._gracefulShutdown());
    process.on('SIGINT', () => this._gracefulShutdown());
  }

  /**
   * Graceful shutdown handler
   */
  private async _gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown...');

    try {
      // Close server
      this._server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close Socket.IO
      this._io.close(() => {
        logger.info('Socket.IO server closed');
      });

      // Close database connections, Redis, etc.
      // Add cleanup logic here

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  }

  /**
   * Get the Express application instance
   */
  public get app(): express.Application {
    return this._app;
  }

  /**
   * Get the Socket.IO server instance
   */
  public get io(): SocketServer {
    return this._io;
  }
}

// Create and start the application
const application = new TurboAssetApplication();

// Start the application if this file is run directly
if (require.main === module) {
  application.start().catch((error) => {
    logger.error('Failed to start application', { error });
    process.exit(1);
  });
}

export { application };
export default application;