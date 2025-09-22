/**
 * Enterprise Utilities Index
 * Central export for all enterprise-grade utility modules
 */

// Core utilities
export * from './error-handling';
export * from './base-service';
export * from './dependency-injection';

// Data and persistence
export * from './repository';
export * from './database';
export * from './caching';

// Performance and monitoring
export * from './monitoring';
export * from './async-utils';
export * from './memory-management';

// Security and configuration
export * from './security';
export * from './configuration';

// Documentation
export * from './documentation';

// Constants
export * from '../constants';

// Types
export * from '../types/enterprise';

/**
 * Enterprise System Bootstrap
 * Provides a single entry point to initialize all enterprise systems
 */
import { logger } from '../config/logger';
import { configManager } from './configuration';
import { container } from './dependency-injection';
import { cacheManager } from './caching';
import { monitoring } from './monitoring';
import { memoryMonitor } from './memory-management';
import { databaseManager } from './database';

export class EnterpriseSystem {
  private static instance: EnterpriseSystem;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): EnterpriseSystem {
    if (EnterpriseSystem.instance === undefined) {
      EnterpriseSystem.instance = new EnterpriseSystem();
    }
    return EnterpriseSystem.instance;
  }

  /**
   * Initialize all enterprise systems
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Enterprise system already initialized');
      return;
    }

    logger.info('Initializing Enterprise System...');

    try {
      // 1. Load configuration
      logger.info('Loading configuration...');
      const config = await configManager.load();

      // 2. Initialize database
      logger.info('Initializing database...');
      await databaseManager.initialize({
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        username: config.database.username,
        password: config.database.password,
        ssl: config.database.ssl,
        poolMin: config.database.poolMin,
        poolMax: config.database.poolMax,
        timeout: config.database.timeout,
        idleTimeout: 300000, // 5 minutes
        connectionTimeout: config.database.timeout
      });

      // 3. Start monitoring
      if (config.monitoring.enabled) {
        logger.info('Starting monitoring system...');
        monitoring.start(config.monitoring.interval);
        
        // Start memory monitoring
        memoryMonitor.startMonitoring(60000); // 1 minute
      }

      // 4. Initialize services through DI container
      logger.info('Initializing dependency injection container...');
      this.initializeServices();

      // 5. Setup graceful shutdown
      this.setupGracefulShutdown();

      this.initialized = true;
      logger.info('Enterprise System initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Enterprise System:', error);
      throw error;
    }
  }

  /**
   * Shutdown all enterprise systems gracefully
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    logger.info('Shutting down Enterprise System...');

    try {
      // Stop monitoring
      monitoring.stop();
      memoryMonitor.stopMonitoring();

      // Close database connections
      await databaseManager.close();

      // Clear caches
      await cacheManager.clear();

      // Run final memory cleanup
      await memoryMonitor.runCleanup();

      this.initialized = false;
      logger.info('Enterprise System shutdown completed');

    } catch (error) {
      logger.error('Error during Enterprise System shutdown:', error);
      throw error;
    }
  }

  /**
   * Check if system is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get system health status
   */
  public async getHealthStatus(): Promise<{
    readonly system: 'healthy' | 'degraded' | 'unhealthy';
    readonly components: Record<string, boolean>;
    readonly timestamp: Date;
  }> {
    const components = {
      configuration: configManager.isLoaded(),
      database: databaseManager.isConnected(),
      monitoring: monitoring.getActiveAlerts().length === 0,
      memory: true // Always true for now
    };

    const healthyComponents = Object.values(components).filter(Boolean).length;
    const totalComponents = Object.keys(components).length;
    
    let systemHealth: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyComponents === totalComponents) {
      systemHealth = 'healthy';
    } else if (healthyComponents > totalComponents / 2) {
      systemHealth = 'degraded';
    } else {
      systemHealth = 'unhealthy';
    }

    return {
      system: systemHealth,
      components,
      timestamp: new Date()
    };
  }

  /**
   * Initialize core services in the DI container
   */
  private initializeServices(): void {
    // Core enterprise services are automatically registered via @Service decorators
    logger.debug('Core services registered in DI container');
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);
      
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', async () => await shutdownHandler('SIGTERM'));
    process.on('SIGINT', async () => await shutdownHandler('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdownHandler('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason);
      shutdownHandler('UNHANDLED_REJECTION');
    });
  }
}

// Export singleton instance
export const enterpriseSystem = EnterpriseSystem.getInstance();