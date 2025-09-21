/**
 * Enterprise Database Connection Management
 * Provides connection pooling, query optimization, and transaction management
 */

import { logger } from '../config/logger';
import { EnterpriseError } from '../utils/error-handling';
import { monitoring } from '../utils/monitoring';
import { RetryUtils } from '../utils/async-utils';
import { DATABASE, HTTP_STATUS } from '../constants';

export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly ssl: boolean;
  readonly poolMin: number;
  readonly poolMax: number;
  readonly timeout: number;
  readonly idleTimeout: number;
  readonly connectionTimeout: number;
}

export interface QueryResult<T = unknown> {
  readonly rows: readonly T[];
  readonly rowCount: number;
  readonly executionTime: number;
  readonly fromCache: boolean;
}

export interface TransactionContext {
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface ConnectionPoolStats {
  readonly total: number;
  readonly idle: number;
  readonly active: number;
  readonly waiting: number;
  readonly totalConnections: number;
  readonly totalQueries: number;
  readonly avgQueryTime: number;
}

/**
 * Database Connection Interface
 */
export interface DatabaseConnection {
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
  transaction<R>(operation: (ctx: TransactionContext) => Promise<R>): Promise<R>;
  close(): Promise<void>;
  isConnected(): boolean;
  getStats(): ConnectionPoolStats;
}

/**
 * Query Optimizer
 */
export class QueryOptimizer {
  private readonly queryCache = new Map<string, {
    optimizedQuery: string;
    params: readonly unknown[];
    createdAt: Date;
  }>();

  private readonly queryStats = new Map<string, {
    executionCount: number;
    totalTime: number;
    avgTime: number;
    lastExecuted: Date;
  }>();

  /**
   * Optimize SQL query
   */
  public optimizeQuery(sql: string, params: readonly unknown[] = []): {
    query: string;
    params: readonly unknown[];
  } {
    const cacheKey = this.generateCacheKey(sql, params);
    const cached = this.queryCache.get(cacheKey);

    if (cached !== undefined && Date.now() - cached.createdAt.getTime() < 3600000) { // 1 hour cache
      return {
        query: cached.optimizedQuery,
        params: cached.params
      };
    }

    // Basic query optimizations
    let optimizedQuery = sql
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/;\s*$/, '');  // Remove trailing semicolon

    // Add query hints based on patterns
    optimizedQuery = this.addQueryHints(optimizedQuery);

    // Optimize WHERE clauses
    optimizedQuery = this.optimizeWhereClauses(optimizedQuery);

    // Cache the optimized query
    this.queryCache.set(cacheKey, {
      optimizedQuery,
      params: Object.freeze([...params]),
      createdAt: new Date()
    });

    return {
      query: optimizedQuery,
      params: Object.freeze([...params])
    };
  }

  /**
   * Record query execution statistics
   */
  public recordQueryExecution(sql: string, executionTime: number): void {
    const queryKey = this.normalizeQueryForStats(sql);
    const existing = this.queryStats.get(queryKey) ?? {
      executionCount: 0,
      totalTime: 0,
      avgTime: 0,
      lastExecuted: new Date()
    };

    existing.executionCount++;
    existing.totalTime += executionTime;
    existing.avgTime = existing.totalTime / existing.executionCount;
    existing.lastExecuted = new Date();

    this.queryStats.set(queryKey, existing);

    // Log slow queries
    if (executionTime > 1000) { // Queries slower than 1 second
      logger.warn(`Slow query detected (${executionTime}ms):`, {
        query: queryKey,
        executionTime,
        avgTime: existing.avgTime,
        executionCount: existing.executionCount
      });
    }
  }

  /**
   * Get query statistics
   */
  public getQueryStats(): ReadonlyMap<string, {
    readonly executionCount: number;
    readonly totalTime: number;
    readonly avgTime: number;
    readonly lastExecuted: Date;
  }> {
    return new Map(this.queryStats);
  }

  /**
   * Clear query cache and statistics
   */
  public clearCache(): void {
    this.queryCache.clear();
    this.queryStats.clear();
    logger.info('Query optimizer cache cleared');
  }

  private addQueryHints(query: string): string {
    const upperQuery = query.toUpperCase();

    // Add index hints for common patterns
    if (upperQuery.includes('SELECT') && upperQuery.includes('WHERE') && upperQuery.includes('ORDER BY')) {
      // Suggest using indexes for WHERE and ORDER BY clauses
      return query; // In real implementation, add specific database hints
    }

    if (upperQuery.includes('JOIN')) {
      // Suggest join order optimization
      return query; // In real implementation, add join hints
    }

    return query;
  }

  private optimizeWhereClauses(query: string): string {
    // Move more selective conditions to the front
    // This is a simplified example - real implementation would parse the AST
    return query;
  }

  private generateCacheKey(sql: string, params: readonly unknown[]): string {
    return `${sql}:${JSON.stringify(params)}`;
  }

  private normalizeQueryForStats(sql: string): string {
    return sql
      .replace(/\$\d+/g, '$?') // Replace parameters with placeholder
      .replace(/'\w+'/g, "'?'") // Replace string literals
      .replace(/\d+/g, '?') // Replace numbers
      .trim()
      .toLowerCase();
  }
}

/**
 * Connection Pool Implementation
 */
export class ConnectionPool {
  private readonly connections: Connection[] = [];
  private readonly availableConnections: Connection[] = [];
  private readonly busyConnections = new Set<Connection>();
  private readonly waitingClients: Array<{
    resolve: (connection: Connection) => void;
    reject: (error: Error) => void;
    timestamp: Date;
  }> = [];

  private readonly stats = {
    totalConnections: 0,
    totalQueries: 0,
    totalQueryTime: 0
  };

  constructor(private readonly config: DatabaseConfig) {}

  /**
   * Initialize connection pool
   */
  public async initialize(): Promise<void> {
    logger.info(`Initializing connection pool (min: ${this.config.poolMin}, max: ${this.config.poolMax})`);

    // Create minimum connections
    for (let i = 0; i < this.config.poolMin; i++) {
      try {
        const connection = await this.createConnection();
        this.connections.push(connection);
        this.availableConnections.push(connection);
      } catch (error) {
        logger.error(`Failed to create initial connection ${i + 1}:`, error);
        throw error;
      }
    }

    logger.info(`Connection pool initialized with ${this.connections.length} connections`);
  }

  /**
   * Get connection from pool
   */
  public async getConnection(): Promise<Connection> {
    // Return available connection if any
    const available = this.availableConnections.pop();
    if (available !== undefined) {
      this.busyConnections.add(available);
      return available;
    }

    // Create new connection if under max limit
    if (this.connections.length < this.config.poolMax) {
      try {
        const connection = await this.createConnection();
        this.connections.push(connection);
        this.busyConnections.add(connection);
        return connection;
      } catch (error) {
        logger.error('Failed to create new connection:', error);
        throw error;
      }
    }

    // Wait for connection to become available
    return new Promise((resolve, reject) => {
      this.waitingClients.push({
        resolve,
        reject,
        timestamp: new Date()
      });

      // Set timeout for waiting client
      setTimeout(() => {
        const index = this.waitingClients.findIndex(client => client.resolve === resolve);
        if (index >= 0) {
          this.waitingClients.splice(index, 1);
          reject(new EnterpriseError(
            'CONNECTION_TIMEOUT',
            'Timeout waiting for database connection',
            HTTP_STATUS.SERVICE_UNAVAILABLE,
            { timeout: this.config.connectionTimeout }
          ));
        }
      }, this.config.connectionTimeout);
    });
  }

  /**
   * Release connection back to pool
   */
  public releaseConnection(connection: Connection): void {
    if (this.busyConnections.has(connection)) {
      this.busyConnections.delete(connection);

      // Give connection to waiting client if any
      const waitingClient = this.waitingClients.shift();
      if (waitingClient !== undefined) {
        this.busyConnections.add(connection);
        waitingClient.resolve(connection);
      } else {
        // Return connection to available pool
        this.availableConnections.push(connection);
      }
    }
  }

  /**
   * Close all connections
   */
  public async closeAll(): Promise<void> {
    logger.info('Closing all database connections...');

    // Critical fix: Reject all waiting clients before closing
    const waitingErrors = this.waitingClients.splice(0);
    for (const client of waitingErrors) {
      client.reject(new EnterpriseError(
        'CONNECTION_POOL_CLOSED',
        'Connection pool is being closed',
        HTTP_STATUS.SERVICE_UNAVAILABLE
      ));
    }

    const closePromises = this.connections.map(async (connection) => {
      try {
        await connection.close();
      } catch (error) {
        logger.error('Error closing connection:', error);
      }
    });

    await Promise.allSettled(closePromises); // Critical fix: Use allSettled to ensure all are processed

    // Critical fix: Clear arrays properly to prevent memory leaks
    this.connections.splice(0);
    this.availableConnections.splice(0);
    this.busyConnections.clear();

    logger.info('All database connections closed');
  }

  /**
   * Get pool statistics
   */
  public getStats(): ConnectionPoolStats {
    return {
      total: this.connections.length,
      idle: this.availableConnections.length,
      active: this.busyConnections.size,
      waiting: this.waitingClients.length,
      totalConnections: this.stats.totalConnections,
      totalQueries: this.stats.totalQueries,
      avgQueryTime: this.stats.totalQueries > 0 ? this.stats.totalQueryTime / this.stats.totalQueries : 0
    };
  }

  private async createConnection(): Promise<Connection> {
    try {
      const connection = new Connection(this.config);
      await connection.connect();
      this.stats.totalConnections++;
      return connection;
    } catch (error) {
      throw new EnterpriseError(
        'CONNECTION_FAILED',
        'Failed to create database connection',
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        { config: { ...this.config, password: '[REDACTED]' }, error: String(error) }
      );
    }
  }
}

/**
 * Individual Database Connection
 */
class Connection {
  private isConnectedFlag = false;
  private client: any = null; // Would be actual database client

  constructor(private readonly config: DatabaseConfig) {}

  /**
   * Establish database connection
   */
  public async connect(): Promise<void> {
    try {
      // Simulate connection - in real implementation, use actual database client
      this.client = {
        connected: true,
        host: this.config.host,
        port: this.config.port,
        database: this.config.database
      };
      
      this.isConnectedFlag = true;
      logger.debug(`Connected to database ${this.config.database}@${this.config.host}:${this.config.port}`);
    } catch (error) {
      throw new EnterpriseError(
        'CONNECTION_FAILED',
        'Failed to connect to database',
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        { config: { ...this.config, password: '[REDACTED]' }, error: String(error) }
      );
    }
  }

  /**
   * Execute query
   */
  public async query<T = unknown>(sql: string, params: readonly unknown[] = []): Promise<QueryResult<T>> {
    if (!this.isConnectedFlag) {
      throw new EnterpriseError(
        'CONNECTION_NOT_ESTABLISHED',
        'Database connection not established',
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }

    const startTime = Date.now();

    try {
      // Simulate query execution - in real implementation, use actual database client
      const rows: T[] = [];
      const executionTime = Date.now() - startTime;

      // Record metrics
      monitoring.recordPerformance({
        operation: 'database.query',
        duration: executionTime,
        status: 'success',
        timestamp: new Date(),
        metadata: { sql: sql.substring(0, 100), paramCount: params.length }
      });

      return {
        rows: Object.freeze(rows),
        rowCount: rows.length,
        executionTime,
        fromCache: false
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      monitoring.recordPerformance({
        operation: 'database.query',
        duration: executionTime,
        status: 'error',
        timestamp: new Date(),
        metadata: { sql: sql.substring(0, 100), error: String(error) }
      });

      throw new EnterpriseError(
        'QUERY_EXECUTION_FAILED',
        'Database query execution failed',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { sql: sql.substring(0, 100), params: params.length, error: String(error) }
      );
    }
  }

  /**
   * Close connection
   */
  public async close(): Promise<void> {
    if (this.client) {
      try {
        // Critical fix: Properly close all resources
        if (typeof this.client?.end === 'function') {
          await this.client.end();
        } else if (typeof this.client?.close === 'function') {
          await this.client.close();
        } else if (typeof this.client?.disconnect === 'function') {
          await this.client.disconnect();
        }
        
        // Critical fix: Clear all references to prevent memory leaks
        this.client = null;
        this.isConnectedFlag = false;
        
        logger.debug('Database connection closed and resources released');
      } catch (error) {
        logger.error('Error closing database connection:', error);
        // Critical fix: Still clear the connection even if close fails
        this.client = null;
        this.isConnectedFlag = false;
        throw error;
      }
    }
  }

  /**
   * Check if connection is established
   */
  public isConnected(): boolean {
    return this.isConnectedFlag && this.client !== null;
  }
}

/**
 * Main Database Manager
 */
export class DatabaseManager implements DatabaseConnection {
  private static instance: DatabaseManager;
  private connectionPool?: ConnectionPool;
  private queryOptimizer = new QueryOptimizer();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (DatabaseManager.instance === undefined) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database manager
   */
  public async initialize(config: DatabaseConfig): Promise<void> {
    logger.info('Initializing database manager...');
    
    this.connectionPool = new ConnectionPool(config);
    await this.connectionPool.initialize();
    
    logger.info('Database manager initialized successfully');
  }

  /**
   * Execute query with optimization and retry
   */
  public async query<T = unknown>(sql: string, params: readonly unknown[] = []): Promise<QueryResult<T>> {
    if (this.connectionPool === undefined) {
      throw new EnterpriseError(
        'DATABASE_NOT_INITIALIZED',
        'Database manager not initialized',
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }

    // Optimize query
    const optimized = this.queryOptimizer.optimizeQuery(sql, params);

    // Execute with retry
    return RetryUtils.retry(
      async () => {
        const connection = await this.connectionPool!.getConnection();
        
        try {
          const startTime = Date.now();
          const result = await connection.query<T>(optimized.query, optimized.params);
          const executionTime = Date.now() - startTime;

          // Record query statistics
          this.queryOptimizer.recordQueryExecution(sql, executionTime);

          return result;
        } finally {
          this.connectionPool!.releaseConnection(connection);
        }
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
        retryCondition: (error) => {
          // Only retry on connection or timeout errors
          return error.message.includes('CONNECTION') || error.message.includes('TIMEOUT');
        }
      }
    );
  }

  /**
   * Execute transaction
   */
  public async transaction<R>(operation: (ctx: TransactionContext) => Promise<R>): Promise<R> {
    if (this.connectionPool === undefined) {
      throw new EnterpriseError(
        'DATABASE_NOT_INITIALIZED',
        'Database manager not initialized',
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }

    const connection = await this.connectionPool.getConnection();
    
    try {
      // Begin transaction
      await connection.query('BEGIN');

      const transactionContext: TransactionContext = {
        query: <T>(sql: string, params?: readonly unknown[]) => 
          connection.query<T>(sql, params),
        
        commit: async () => {
          await connection.query('COMMIT');
        },
        
        rollback: async () => {
          await connection.query('ROLLBACK');
        }
      };

      try {
        const result = await operation(transactionContext);
        await transactionContext.commit();
        return result;
      } catch (error) {
        await transactionContext.rollback();
        throw error;
      }

    } finally {
      this.connectionPool.releaseConnection(connection);
    }
  }

  /**
   * Close database manager
   */
  public async close(): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.closeAll();
      this.connectionPool = undefined;
    }
    this.queryOptimizer.clearCache();
  }

  /**
   * Check if database is connected
   */
  public isConnected(): boolean {
    return this.connectionPool !== undefined;
  }

  /**
   * Get database statistics
   */
  public getStats(): ConnectionPoolStats {
    return this.connectionPool?.getStats() ?? {
      total: 0,
      idle: 0,
      active: 0,
      waiting: 0,
      totalConnections: 0,
      totalQueries: 0,
      avgQueryTime: 0
    };
  }

  /**
   * Get query optimizer statistics
   */
  public getQueryStats(): ReadonlyMap<string, {
    readonly executionCount: number;
    readonly totalTime: number;
    readonly avgTime: number;
    readonly lastExecuted: Date;
  }> {
    return this.queryOptimizer.getQueryStats();
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();