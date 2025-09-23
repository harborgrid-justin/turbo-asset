/**
 * Connection Pool Configuration
 * Enterprise-grade database connection pooling with health monitoring
 */

import { logger } from '../../config/logger';

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  readonly min: number;
  readonly max: number;
  readonly acquireTimeoutMillis: number;
  readonly createTimeoutMillis: number;
  readonly destroyTimeoutMillis: number;
  readonly idleTimeoutMillis: number;
  readonly reapIntervalMillis: number;
  readonly createRetryIntervalMillis: number;
  readonly propagateCreateError: boolean;
  readonly maxRetries: number;
  readonly validateOnBorrow: boolean;
  readonly testOnBorrow: boolean;
}

/**
 * Connection pool metrics
 */
export interface ConnectionPoolMetrics {
  readonly totalConnections: number;
  readonly activeConnections: number;
  readonly idleConnections: number;
  readonly pendingCreates: number;
  readonly pendingAcquires: number;
  readonly totalCreated: number;
  readonly totalDestroyed: number;
  readonly totalAcquired: number;
  readonly totalReleased: number;
  readonly totalTimedOut: number;
  readonly totalErrors: number;
  readonly averageAcquireTime: number;
  readonly averageCreateTime: number;
}

/**
 * Connection health check interface
 */
export interface ConnectionHealthCheck {
  readonly isHealthy: boolean;
  readonly lastChecked: Date;
  readonly responseTime: number;
  readonly error?: Error;
}

/**
 * Database connection interface
 */
export interface IPooledConnection {
  readonly id: string;
  readonly createdAt: Date;
  readonly lastUsed: Date;
  readonly usageCount: number;
  readonly isActive: boolean;
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number; insertId?: string }>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

/**
 * Connection factory interface
 */
export interface IConnectionFactory {
  create(): Promise<IPooledConnection>;
  validate(connection: IPooledConnection): Promise<boolean>;
  destroy(connection: IPooledConnection): Promise<void>;
}

/**
 * Pool events
 */
export interface PoolEvents {
  'connection.created': { connectionId: string };
  'connection.destroyed': { connectionId: string; reason: string };
  'connection.acquired': { connectionId: string; waitTime: number };
  'connection.released': { connectionId: string; usageTime: number };
  'connection.timeout': { waitTime: number };
  'connection.error': { error: Error; operation: string };
  'pool.depleted': { activeConnections: number; pendingAcquires: number };
  'pool.healthy': { metrics: ConnectionPoolMetrics };
}

/**
 * Enterprise connection pool implementation
 */
export class EnterpriseConnectionPool {
  private readonly config: ConnectionPoolConfig;
  private readonly factory: IConnectionFactory;
  private readonly connections = new Set<IPooledConnection>();
  private readonly availableConnections: IPooledConnection[] = [];
  private readonly pendingAcquires: Array<{
    resolve: (connection: IPooledConnection) => void;
    reject: (error: Error) => void;
    acquireTime: number;
  }> = [];

  private readonly metrics: ConnectionPoolMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    pendingCreates: 0,
    pendingAcquires: 0,
    totalCreated: 0,
    totalDestroyed: 0,
    totalAcquired: 0,
    totalReleased: 0,
    totalTimedOut: 0,
    totalErrors: 0,
    averageAcquireTime: 0,
    averageCreateTime: 0
  };

  private healthCheckInterval?: NodeJS.Timeout;
  private reapInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: ConnectionPoolConfig, factory: IConnectionFactory) {
    this.config = config;
    this.factory = factory;
    this.startHealthCheck();
    this.startConnectionReaper();
  }

  /**
   * Initialize pool with minimum connections
   */
  async initialize(): Promise<void> {
    logger.info('Initializing connection pool', { config: this.config });
    
    try {
      const initPromises = Array.from({ length: this.config.min }, async () => await this.createConnection());
      await Promise.all(initPromises);
      
      logger.info('Connection pool initialized successfully', {
        totalConnections: this.connections.size,
        availableConnections: this.availableConnections.length
      });
    } catch (error) {
      logger.error('Failed to initialize connection pool', { error });
      throw error;
    }
  }

  /**
   * Acquire connection from pool
   */
  async acquire(): Promise<IPooledConnection> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    const acquireStartTime = Date.now();

    // Try to get available connection
    const availableConnection = this.availableConnections.pop();
    if (availableConnection) {
      this.metrics.totalAcquired++;
      this.updateAverageAcquireTime(Date.now() - acquireStartTime);
      
      logger.debug('Connection acquired from pool', { 
        connectionId: availableConnection.id,
        acquireTime: Date.now() - acquireStartTime 
      });
      
      return availableConnection;
    }

    // Create new connection if under max limit
    if (this.connections.size < this.config.max) {
      try {
        const connection = await this.createConnection();
        this.metrics.totalAcquired++;
        this.updateAverageAcquireTime(Date.now() - acquireStartTime);
        
        logger.debug('New connection created and acquired', { 
          connectionId: connection.id,
          acquireTime: Date.now() - acquireStartTime 
        });
        
        return connection;
      } catch (error) {
        this.metrics.totalErrors++;
        logger.error('Failed to create new connection', { error });
        throw error;
      }
    }

    // Wait for available connection
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pendingAcquires.findIndex(pending => pending.resolve === resolve);
        if (index > -1) {
          this.pendingAcquires.splice(index, 1);
        }
        
        this.metrics.totalTimedOut++;
        reject(new Error(`Connection acquire timeout after ${this.config.acquireTimeoutMillis}ms`));
      }, this.config.acquireTimeoutMillis);

      this.pendingAcquires.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          this.metrics.totalAcquired++;
          this.updateAverageAcquireTime(Date.now() - acquireStartTime);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.metrics.totalErrors++;
          reject(error);
        },
        acquireTime: acquireStartTime
      });

      this.metrics.pendingAcquires = this.pendingAcquires.length;
    });
  }

  /**
   * Release connection back to pool
   */
  async release(connection: IPooledConnection): Promise<void> {
    if (!this.connections.has(connection)) {
      logger.warn('Attempted to release unknown connection', { connectionId: connection.id });
      return;
    }

    // Validate connection before releasing
    if (this.config.validateOnBorrow) {
      try {
        const isValid = await this.factory.validate(connection);
        if (!isValid) {
          logger.warn('Connection failed validation, destroying', { connectionId: connection.id });
          await this.destroyConnection(connection);
          return;
        }
      } catch (error) {
        logger.error('Connection validation error, destroying', { connectionId: connection.id, error });
        await this.destroyConnection(connection);
        return;
      }
    }

    // Handle pending acquire requests
    const pending = this.pendingAcquires.shift();
    if (pending) {
      this.metrics.pendingAcquires = this.pendingAcquires.length;
      pending.resolve(connection);
      return;
    }

    // Return to available connections
    this.availableConnections.push(connection);
    this.metrics.totalReleased++;
    this.updateMetrics();

    logger.debug('Connection released to pool', { connectionId: connection.id });
  }

  /**
   * Get pool metrics
   */
  getMetrics(): ConnectionPoolMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Shutdown pool gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down connection pool');
    
    this.isShuttingDown = true;
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.reapInterval) {
      clearInterval(this.reapInterval);
    }

    // Reject pending acquires
    while (this.pendingAcquires.length > 0) {
      const pending = this.pendingAcquires.shift()!;
      pending.reject(new Error('Connection pool is shutting down'));
    }

    // Destroy all connections
    const destroyPromises = Array.from(this.connections, async connection => 
      { await this.destroyConnection(connection); }
    );
    
    await Promise.allSettled(destroyPromises);
    
    logger.info('Connection pool shutdown complete');
  }

  /**
   * Create new connection
   */
  private async createConnection(): Promise<IPooledConnection> {
    const createStartTime = Date.now();
    this.metrics.pendingCreates++;

    try {
      const connection = await this.factory.create();
      
      this.connections.add(connection);
      this.metrics.totalCreated++;
      this.metrics.pendingCreates = Math.max(0, this.metrics.pendingCreates - 1);
      
      const createTime = Date.now() - createStartTime;
      this.updateAverageCreateTime(createTime);
      this.updateMetrics();

      logger.debug('Connection created', { 
        connectionId: connection.id,
        createTime,
        totalConnections: this.connections.size 
      });

      return connection;
    } catch (error) {
      this.metrics.pendingCreates = Math.max(0, this.metrics.pendingCreates - 1);
      this.metrics.totalErrors++;
      
      logger.error('Failed to create connection', { 
        error, 
        createTime: Date.now() - createStartTime 
      });
      
      throw error;
    }
  }

  /**
   * Destroy connection
   */
  private async destroyConnection(connection: IPooledConnection): Promise<void> {
    try {
      this.connections.delete(connection);
      
      const index = this.availableConnections.indexOf(connection);
      if (index > -1) {
        this.availableConnections.splice(index, 1);
      }

      await this.factory.destroy(connection);
      
      this.metrics.totalDestroyed++;
      this.updateMetrics();

      logger.debug('Connection destroyed', { 
        connectionId: connection.id,
        remainingConnections: this.connections.size 
      });
    } catch (error) {
      logger.error('Error destroying connection', { connectionId: connection.id, error });
    }
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start connection reaper for idle connections
   */
  private startConnectionReaper(): void {
    this.reapInterval = setInterval(() => {
      this.reapIdleConnections();
    }, this.config.reapIntervalMillis);
  }

  /**
   * Perform health check on available connections
   */
  private async performHealthCheck(): Promise<void> {
    const healthCheckPromises = this.availableConnections.map(async (connection) => {
      try {
        const isHealthy = await connection.ping();
        if (!isHealthy) {
          logger.warn('Unhealthy connection detected, removing', { connectionId: connection.id });
          await this.destroyConnection(connection);
        }
      } catch (error) {
        logger.error('Health check failed for connection', { connectionId: connection.id, error });
        await this.destroyConnection(connection);
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Remove idle connections beyond minimum
   */
  private reapIdleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: IPooledConnection[] = [];

    for (const connection of this.availableConnections) {
      if (this.connections.size <= this.config.min) {
        break;
      }

      const idleTime = now - connection.lastUsed.getTime();
      if (idleTime > this.config.idleTimeoutMillis) {
        connectionsToRemove.push(connection);
      }
    }

    for (const connection of connectionsToRemove) {
      this.destroyConnection(connection);
    }

    if (connectionsToRemove.length > 0) {
      logger.debug('Reaped idle connections', { 
        removedCount: connectionsToRemove.length,
        remainingConnections: this.connections.size 
      });
    }
  }

  /**
   * Update pool metrics
   */
  private updateMetrics(): void {
    this.metrics.totalConnections = this.connections.size;
    this.metrics.activeConnections = this.connections.size - this.availableConnections.length;
    this.metrics.idleConnections = this.availableConnections.length;
  }

  /**
   * Update average acquire time
   */
  private updateAverageAcquireTime(acquireTime: number): void {
    const alpha = 0.1;
    this.metrics.averageAcquireTime = this.metrics.averageAcquireTime === 0
      ? acquireTime
      : alpha * acquireTime + (1 - alpha) * this.metrics.averageAcquireTime;
  }

  /**
   * Update average create time
   */
  private updateAverageCreateTime(createTime: number): void {
    const alpha = 0.1;
    this.metrics.averageCreateTime = this.metrics.averageCreateTime === 0
      ? createTime
      : alpha * createTime + (1 - alpha) * this.metrics.averageCreateTime;
  }
}