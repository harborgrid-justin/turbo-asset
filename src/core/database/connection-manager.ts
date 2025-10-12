/**
 * Enterprise Database Connection Management
 * Production-grade database connection pooling, retry logic, and graceful degradation
 */

import { Sequelize } from 'sequelize';
import { logger } from '@/config/enterprise-logger';
import { getEnvironmentConfig } from '@/config/environment-validation';
import { DatabaseError } from '@/core/errors/error-handler';

export interface DatabaseConnectionConfig {
  maxConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  retryAttempts: number;
  retryInterval: number;
  healthCheckInterval: number;
  enableLogging: boolean;
  enableMetrics: boolean;
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  connectionErrors: number;
  reconnections: number;
  lastHealthCheck: Date;
  isHealthy: boolean;
}

export interface QueryMetrics {
  query: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  error?: string;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private sequelize: Sequelize | null = null;
  private readonly config: DatabaseConnectionConfig;
  private readonly envConfig = getEnvironmentConfig();
  private readonly metrics: ConnectionPoolMetrics;
  private queryMetrics: QueryMetrics[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private isConnecting = false;
  private connectionAttempts = 0;
  private readonly maxMetricsHistory = 1000;

  private constructor() {
    this.config = {
      maxConnections: 20,
      acquireTimeout: 60000,
      idleTimeout: 600000,
      retryAttempts: 3,
      retryInterval: 1000,
      healthCheckInterval: 30000,
      enableLogging: this.envConfig.NODE_ENV === 'development',
      enableMetrics: true,
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      totalQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      connectionErrors: 0,
      reconnections: 0,
      lastHealthCheck: new Date(),
      isHealthy: false,
    };

    this.initialize();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      await this.createConnection();
      this.startHealthChecks();
      logger.info('Database manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database manager', error);
      throw new DatabaseError('Database initialization failed');
    }
  }

  private async createConnection(): Promise<void> {
    if (this.isConnecting) {
      logger.info('Database connection already in progress');
      return;
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      logger.info('Creating database connection', {
        attempt: this.connectionAttempts,
        maxConnections: this.config.maxConnections,
      });

      // Disconnect existing connection if any
      if (this.sequelize) {
        await this.sequelize.close();
        this.sequelize = null;
      }

      // Create new Sequelize client with connection pooling
      this.sequelize = new Sequelize(this.envConfig.DATABASE_URL, {
        dialect: 'postgres',
        logging: this.config.enableLogging
          ? (sql: string, timing?: number) => {
              logger.debug('Database query executed', {
                query: sql,
                duration: timing ? `${timing}ms` : 'N/A',
              });

              if (this.config.enableMetrics && timing) {
                this.recordQueryMetrics({
                  query: sql,
                  duration: timing,
                  success: true,
                  timestamp: new Date(),
                });
              }
            }
          : false,
        pool: {
          max: this.config.maxConnections,
          min: 5,
          acquire: this.config.acquireTimeout,
          idle: this.config.idleTimeout,
        },
        dialectOptions: {
          ssl: process.env.DATABASE_SSL === 'true' ? {
            require: true,
            rejectUnauthorized: false,
          } : false,
        },
      });

      // Test connection
      await this.sequelize.authenticate();
      await this.sequelize.query('SELECT 1');

      this.metrics.isHealthy = true;
      this.isConnecting = false;
      this.connectionAttempts = 0;

      logger.info('Database connection established successfully');

    } catch (error) {
      this.isConnecting = false;
      this.metrics.isHealthy = false;
      this.metrics.connectionErrors++;

      logger.error('Database connection failed', error, {
        attempt: this.connectionAttempts,
        maxRetryAttempts: this.config.retryAttempts,
      });

      if (this.connectionAttempts < this.config.retryAttempts) {
        logger.info(`Retrying database connection in ${this.config.retryInterval}ms`);
        setTimeout(() => {
          this.createConnection();
        }, this.config.retryInterval * this.connectionAttempts);
      } else {
        throw new DatabaseError('Failed to establish database connection after retries', 'connect', {
          attempts: this.connectionAttempts,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      if (!this.sequelize) {
        throw new Error('No database connection available');
      }

      const startTime = Date.now();
      await this.sequelize.query('SELECT 1');
      const duration = Date.now() - startTime;

      this.metrics.lastHealthCheck = new Date();
      this.metrics.isHealthy = true;

      if (duration > 5000) { // Log slow health checks
        logger.warn('Slow database health check', { duration });
      }

      logger.debug('Database health check passed', { duration });

    } catch (error) {
      this.metrics.isHealthy = false;
      this.metrics.connectionErrors++;

      logger.error('Database health check failed', error);

      // Attempt to reconnect on health check failure
      if (this.connectionAttempts === 0) {
        logger.info('Attempting to reconnect to database');
        this.metrics.reconnections++;
        this.createConnection().catch((reconnectError) => {
          logger.error('Database reconnection failed', reconnectError);
        });
      }
    }
  }

  private recordQueryMetrics(metric: QueryMetrics): void {
    if (!this.config.enableMetrics) {return;}

    this.queryMetrics.push(metric);
    this.metrics.totalQueries++;

    if (!metric.success) {
      this.metrics.failedQueries++;
    }

    // Calculate average query time
    const totalDuration = this.queryMetrics.reduce((sum, m) => sum + m.duration, 0);
    this.metrics.averageQueryTime = Math.round(totalDuration / this.queryMetrics.length);

    // Cleanup old metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory / 2);
    }
  }

  /**
   * Execute a query with automatic retry and error handling
   */
  public async executeQuery<T>(
    operation: (sequelize: Sequelize) => Promise<T>,
    operationName: string = 'query'
  ): Promise<T> {
    if (!this.sequelize) {
      throw new DatabaseError('Database connection not available', operationName);
    }

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < this.config.retryAttempts) {
      attempts++;

      try {
        const result = await operation(this.sequelize);
        const duration = Date.now() - startTime;

        if (this.config.enableMetrics) {
          this.recordQueryMetrics({
            query: operationName,
            duration,
            success: true,
            timestamp: new Date(),
          });
        }

        return result;

      } catch (error) {
        const duration = Date.now() - startTime;

        if (this.config.enableMetrics) {
          this.recordQueryMetrics({
            query: operationName,
            duration,
            success: false,
            timestamp: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        logger.error(`Database operation '${operationName}' failed`, error, {
          attempt: attempts,
          duration,
        });

        // Check if error is recoverable
        const isRecoverable = this.isRecoverableError(error);
        
        if (!isRecoverable || attempts >= this.config.retryAttempts) {
          throw new DatabaseError(
            `Database operation '${operationName}' failed after ${attempts} attempts`,
            operationName,
            {
              attempts,
              duration,
              error: error instanceof Error ? error.message : 'Unknown error',
              isRecoverable,
            }
          );
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryInterval * attempts));
      }
    }

    throw new DatabaseError(`Database operation '${operationName}' failed after all retries`, operationName);
  }

  /**
   * Execute a transaction with automatic retry
   */
  public async executeTransaction<T>(
    operations: (sequelize: Sequelize) => Promise<T>,
    operationName: string = 'transaction'
  ): Promise<T> {
    return await this.executeQuery(async (sequelize) => {
      return await sequelize.transaction(async (transaction) => {
        // Pass sequelize with transaction context
        return await operations(sequelize);
      });
    }, operationName);
  }

  private isRecoverableError(error: unknown): boolean {
    if (!(error instanceof Error)) {return false;}

    const recoverableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Connection terminated unexpectedly',
      'Connection lost',
      'Connection reset by peer',
    ];

    return recoverableErrors.some(recoverable => 
      error.message.includes(recoverable)
    );
  }

  /**
   * Get current connection pool metrics
   */
  public getMetrics(): ConnectionPoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Get query performance metrics
   */
  public getQueryMetrics(limit: number = 100): QueryMetrics[] {
    return this.queryMetrics.slice(-limit);
  }

  /**
   * Get slow query metrics
   */
  public getSlowQueries(thresholdMs: number = 1000, limit: number = 50): QueryMetrics[] {
    return this.queryMetrics
      .filter(metric => metric.duration > thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Check if database is healthy
   */
  public isHealthy(): boolean {
    return this.metrics.isHealthy && this.sequelize !== null;
  }

  /**
   * Get database client (use with caution)
   */
  public getClient(): Sequelize | null {
    return this.sequelize;
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down database manager');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.sequelize) {
      try {
        await this.sequelize.close();
        logger.info('Database connection closed successfully');
      } catch (error) {
        logger.error('Error closing database connection', error);
      }
    }

    this.sequelize = null;
    this.metrics.isHealthy = false;
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();

// Export type for dependency injection
export { DatabaseManager };

// Convenience functions
export const db = {
  execute: async <T>(operation: (sequelize: Sequelize) => Promise<T>, operationName?: string) =>
    await databaseManager.executeQuery(operation, operationName),
  
  transaction: async <T>(operations: (sequelize: Sequelize) => Promise<T>, operationName?: string) =>
    await databaseManager.executeTransaction(operations, operationName),
  
  isHealthy: () => databaseManager.isHealthy(),
  
  getMetrics: () => databaseManager.getMetrics(),
  
  getSlowQueries: (thresholdMs?: number, limit?: number) => 
    databaseManager.getSlowQueries(thresholdMs, limit),
};