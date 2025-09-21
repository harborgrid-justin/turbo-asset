/**
 * Enterprise-grade database connection pooling and query optimization
 * Provides high-performance database access with monitoring and optimization
 */

import { Pool, PoolConfig, PoolClient, QueryResult } from 'pg';
import { getLogger, LogContext, createTimer, createCorrelationId } from '../config/enterprise-logger';
import { getEnvironmentConfig } from '../config/environment-validation';
import { EnterpriseCircuitBreaker, getCircuitBreakerRegistry } from '../resilience/circuit-breaker';

/**
 * Database configuration interface
 */
export interface DatabaseConfig extends PoolConfig {
  readonly maxConnections: number;
  readonly minConnections: number;
  readonly acquireTimeoutMillis: number;
  readonly createTimeoutMillis: number;
  readonly idleTimeoutMillis: number;
  readonly reapIntervalMillis: number;
  readonly createRetryIntervalMillis: number;
  readonly propagateCreateError: boolean;
  readonly enableQueryLogging: boolean;
  readonly slowQueryThreshold: number; // milliseconds
  readonly enableStatistics: boolean;
  readonly enableOptimization: boolean;
  readonly maxQueryComplexity: number;
  readonly queryTimeout: number;
}

/**
 * Query statistics interface
 */
export interface QueryStatistics {
  readonly query: string;
  readonly queryHash: string;
  readonly executionCount: number;
  readonly totalExecutionTime: number;
  readonly averageExecutionTime: number;
  readonly minExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly lastExecuted: Date;
  readonly errorCount: number;
  readonly slowQueryCount: number;
  readonly rowsAffected: number;
}

/**
 * Database pool statistics interface
 */
export interface PoolStatistics {
  readonly totalConnections: number;
  readonly idleConnections: number;
  readonly activeConnections: number;
  readonly waitingConnections: number;
  readonly totalQueries: number;
  readonly successfulQueries: number;
  readonly failedQueries: number;
  readonly slowQueries: number;
  readonly averageQueryTime: number;
  readonly connectionErrors: number;
  readonly poolErrors: number;
  readonly uptime: number;
}

/**
 * Query execution context
 */
export interface QueryContext {
  readonly correlationId?: string;
  readonly userId?: string;
  readonly operation?: string;
  readonly timeout?: number;
  readonly priority?: 'low' | 'normal' | 'high';
  readonly readOnly?: boolean;
}

/**
 * Query optimization hints
 */
export interface QueryOptimizationHints {
  readonly useIndex?: string;
  readonly forceSeqScan?: boolean;
  readonly enableHashJoin?: boolean;
  readonly enableMergeJoin?: boolean;
  readonly enableNestLoop?: boolean;
  readonly workMem?: string;
  readonly enablePartitioning?: boolean;
}

/**
 * Prepared statement interface
 */
export interface PreparedStatement {
  readonly name: string;
  readonly query: string;
  readonly parameterTypes: readonly string[];
  readonly createdAt: Date;
  readonly executionCount: number;
  readonly averageExecutionTime: number;
}

/**
 * Transaction isolation levels
 */
export enum TransactionIsolation {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE'
}

/**
 * Enterprise Database Connection Pool
 */
export class EnterpriseDatabasePool {
  private readonly logger = getLogger();
  private readonly config: DatabaseConfig;
  private pool: Pool | null = null;
  private circuitBreaker: EnterpriseCircuitBreaker;
  private queryStatistics = new Map<string, QueryStatistics>();
  private preparedStatements = new Map<string, PreparedStatement>();
  private isInitialized = false;
  private startTime = Date.now();

  // Pool statistics tracking
  private poolStats: PoolStatistics = {
    totalConnections: 0,
    idleConnections: 0,
    activeConnections: 0,
    waitingConnections: 0,
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    slowQueries: 0,
    averageQueryTime: 0,
    connectionErrors: 0,
    poolErrors: 0,
    uptime: 0
  };

  constructor(config?: Partial<DatabaseConfig>) {
    const env = getEnvironmentConfig();
    
    this.config = {
      connectionString: env.DATABASE_URL,
      max: config?.maxConnections || 20,
      min: config?.minConnections || 5,
      idleTimeoutMillis: config?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config?.acquireTimeoutMillis || 5000,
      maxConnections: config?.maxConnections || 20,
      minConnections: config?.minConnections || 5,
      acquireTimeoutMillis: config?.acquireTimeoutMillis || 5000,
      createTimeoutMillis: config?.createTimeoutMillis || 5000,
      reapIntervalMillis: config?.reapIntervalMillis || 1000,
      createRetryIntervalMillis: config?.createRetryIntervalMillis || 200,
      propagateCreateError: config?.propagateCreateError || false,
      enableQueryLogging: config?.enableQueryLogging ?? (env.NODE_ENV !== 'production'),
      slowQueryThreshold: config?.slowQueryThreshold || 1000,
      enableStatistics: config?.enableStatistics ?? true,
      enableOptimization: config?.enableOptimization ?? true,
      maxQueryComplexity: config?.maxQueryComplexity || 100,
      queryTimeout: config?.queryTimeout || 30000,
      ...config
    };

    // Initialize circuit breaker for database operations
    this.circuitBreaker = getCircuitBreakerRegistry().getCircuitBreaker('database', {
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 30000,
      slowCallThreshold: this.config.slowQueryThreshold * 2
    });

    this.logger.info('Enterprise database pool configured', {
      maxConnections: this.config.maxConnections,
      minConnections: this.config.minConnections,
      slowQueryThreshold: this.config.slowQueryThreshold
    });
  }

  /**
   * Initialize the database pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const timer = createTimer('database-pool-init');

    try {
      this.pool = new Pool({
        connectionString: this.config.connectionString,
        max: this.config.max,
        min: this.config.min,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        application_name: 'turbo-asset-enterprise'
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Test connection
      await this.testConnection();

      // Initialize prepared statements
      await this.initializePreparedStatements();

      this.isInitialized = true;
      timer.end();

      this.logger.info('Database pool initialized successfully');
    } catch (error) {
      timer.end();
      this.logger.error('Database pool initialization failed', undefined, error as Error);
      throw error;
    }
  }

  /**
   * Execute a query with optimization and monitoring
   */
  async query<T extends QueryResult = QueryResult>(
    text: string,
    params?: unknown[],
    context?: QueryContext
  ): Promise<T> {
    if (!this.isInitialized || !this.pool) {
      throw new Error('Database pool not initialized');
    }

    const correlationId = context?.correlationId || createCorrelationId();
    const timer = createTimer('database-query', { correlationId });
    const queryHash = this.generateQueryHash(text);

    return this.circuitBreaker.execute(
      async () => {
        const client = await this.acquireConnection(context);
        
        try {
          // Apply query optimization hints
          const optimizedQuery = this.config.enableOptimization 
            ? await this.optimizeQuery(text, client, context)
            : text;

          // Set query timeout if specified
          if (context?.timeout || this.config.queryTimeout) {
            const timeout = context?.timeout || this.config.queryTimeout;
            await client.query(`SET statement_timeout = ${timeout}`);
          }

          // Execute the query
          const startTime = Date.now();
          const result = await client.query(optimizedQuery, params) as T;
          const executionTime = Date.now() - startTime;

          // Update statistics
          this.updateQueryStatistics(queryHash, text, executionTime, result.rowCount || 0);
          
          // Log slow queries
          if (executionTime > this.config.slowQueryThreshold) {
            this.logger.warn('Slow query detected', {
              correlationId,
              query: text.substring(0, 200),
              executionTime,
              rowCount: result.rowCount
            });
            this.poolStats.slowQueries++;
          }

          // Log query if enabled
          if (this.config.enableQueryLogging) {
            this.logger.debug('Query executed', {
              correlationId,
              query: text.substring(0, 100),
              executionTime,
              rowCount: result.rowCount
            });
          }

          this.poolStats.successfulQueries++;
          timer.end();
          
          return result;
          
        } finally {
          client.release();
        }
      },
      async () => {
        // Fallback: return empty result
        this.logger.warn('Database query failed, returning fallback result', { correlationId });
        return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] } as T;
      }
    ).then(result => {
      if (result.success && result.result) {
        return result.result;
      } else {
        this.poolStats.failedQueries++;
        throw result.error || new Error('Database query failed');
      }
    });
  }

  /**
   * Execute a query within a transaction
   */
  async transaction<T>(
    queries: ((client: PoolClient) => Promise<T>),
    isolationLevel?: TransactionIsolation,
    context?: QueryContext
  ): Promise<T> {
    if (!this.isInitialized || !this.pool) {
      throw new Error('Database pool not initialized');
    }

    const correlationId = context?.correlationId || createCorrelationId();
    const timer = createTimer('database-transaction', { correlationId });

    return this.circuitBreaker.execute(
      async () => {
        const client = await this.acquireConnection(context);
        
        try {
          await client.query('BEGIN');
          
          if (isolationLevel) {
            await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
          }

          const result = await queries(client);
          await client.query('COMMIT');
          
          timer.end();
          this.logger.debug('Transaction completed successfully', { correlationId });
          
          return result;
          
        } catch (error) {
          await client.query('ROLLBACK');
          this.logger.error('Transaction rolled back', { correlationId }, error as Error);
          throw error;
        } finally {
          client.release();
        }
      }
    ).then(result => {
      if (result.success && result.result) {
        return result.result;
      } else {
        throw result.error || new Error('Database transaction failed');
      }
    });
  }

  /**
   * Execute a prepared statement
   */
  async executePrepared<T extends QueryResult = QueryResult>(
    statementName: string,
    params?: unknown[],
    context?: QueryContext
  ): Promise<T> {
    const prepared = this.preparedStatements.get(statementName);
    if (!prepared) {
      throw new Error(`Prepared statement not found: ${statementName}`);
    }

    const correlationId = context?.correlationId || createCorrelationId();
    
    return this.query(
      `EXECUTE ${statementName}${params ? `(${params.map((_, i) => `$${i + 1}`).join(', ')})` : ''}`,
      params,
      { ...context, correlationId }
    );
  }

  /**
   * Get pool statistics
   */
  getStatistics(): PoolStatistics {
    this.updatePoolStatistics();
    return { ...this.poolStats, uptime: Date.now() - this.startTime };
  }

  /**
   * Get query statistics
   */
  getQueryStatistics(): QueryStatistics[] {
    return Array.from(this.queryStatistics.values());
  }

  /**
   * Get prepared statements
   */
  getPreparedStatements(): PreparedStatement[] {
    return Array.from(this.preparedStatements.values());
  }

  /**
   * Close the database pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      this.logger.info('Database pool closed');
    }
  }

  /**
   * Acquire a connection from the pool
   */
  private async acquireConnection(context?: QueryContext): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const timeout = context?.timeout || this.config.acquireTimeoutMillis;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection acquisition timeout'));
      }, timeout);

      this.pool!.connect((err, client, done) => {
        clearTimeout(timeoutId);
        
        if (err) {
          this.poolStats.connectionErrors++;
          reject(err);
        } else if (client) {
          // Wrap the done function to track connection release
          const wrappedDone = (releaseError?: Error) => {
            done(releaseError);
          };
          
          (client as any).release = wrappedDone;
          resolve(client);
        } else {
          reject(new Error('No client available'));
        }
      });
    });
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    const result = await this.query('SELECT 1 as test', [], { 
      correlationId: 'connection-test' 
    });
    
    if (!result || result.rows.length === 0 || result.rows[0].test !== 1) {
      throw new Error('Database connection test failed');
    }
  }

  /**
   * Initialize common prepared statements
   */
  private async initializePreparedStatements(): Promise<void> {
    const statements = [
      {
        name: 'get_user_by_id',
        query: 'SELECT * FROM users WHERE id = $1',
        parameterTypes: ['uuid']
      },
      {
        name: 'get_asset_by_id',
        query: 'SELECT * FROM assets WHERE id = $1',
        parameterTypes: ['uuid']
      },
      {
        name: 'get_work_orders_by_status',
        query: 'SELECT * FROM work_orders WHERE status = $1 ORDER BY created_at DESC',
        parameterTypes: ['varchar']
      }
    ];

    for (const stmt of statements) {
      try {
        await this.query(`PREPARE ${stmt.name} AS ${stmt.query}`);
        
        this.preparedStatements.set(stmt.name, {
          name: stmt.name,
          query: stmt.query,
          parameterTypes: stmt.parameterTypes,
          createdAt: new Date(),
          executionCount: 0,
          averageExecutionTime: 0
        });
        
        this.logger.debug('Prepared statement created', { name: stmt.name });
      } catch (error) {
        this.logger.warn('Failed to create prepared statement', { 
          name: stmt.name 
        }, error as Error);
      }
    }
  }

  /**
   * Setup pool event handlers
   */
  private setupEventHandlers(): void {
    if (!this.pool) return;

    this.pool.on('connect', (client) => {
      this.logger.debug('New database connection established');
      this.updatePoolStatistics();
    });

    this.pool.on('error', (error) => {
      this.logger.error('Database pool error', undefined, error);
      this.poolStats.poolErrors++;
    });

    this.pool.on('remove', (client) => {
      this.logger.debug('Database connection removed from pool');
      this.updatePoolStatistics();
    });
  }

  /**
   * Generate hash for query caching
   */
  private generateQueryHash(query: string): string {
    return require('crypto')
      .createHash('md5')
      .update(query.replace(/\s+/g, ' ').trim())
      .digest('hex');
  }

  /**
   * Update query execution statistics
   */
  private updateQueryStatistics(
    queryHash: string,
    query: string,
    executionTime: number,
    rowsAffected: number
  ): void {
    if (!this.config.enableStatistics) return;

    const existing = this.queryStatistics.get(queryHash);
    
    if (existing) {
      const newCount = existing.executionCount + 1;
      const newTotal = existing.totalExecutionTime + executionTime;
      
      this.queryStatistics.set(queryHash, {
        ...existing,
        executionCount: newCount,
        totalExecutionTime: newTotal,
        averageExecutionTime: newTotal / newCount,
        minExecutionTime: Math.min(existing.minExecutionTime, executionTime),
        maxExecutionTime: Math.max(existing.maxExecutionTime, executionTime),
        lastExecuted: new Date(),
        rowsAffected: existing.rowsAffected + rowsAffected,
        slowQueryCount: existing.slowQueryCount + (executionTime > this.config.slowQueryThreshold ? 1 : 0)
      });
    } else {
      this.queryStatistics.set(queryHash, {
        query: query.substring(0, 500), // Limit query text length
        queryHash,
        executionCount: 1,
        totalExecutionTime: executionTime,
        averageExecutionTime: executionTime,
        minExecutionTime: executionTime,
        maxExecutionTime: executionTime,
        lastExecuted: new Date(),
        errorCount: 0,
        slowQueryCount: executionTime > this.config.slowQueryThreshold ? 1 : 0,
        rowsAffected
      });
    }

    this.poolStats.totalQueries++;
  }

  /**
   * Optimize query based on context and hints
   */
  private async optimizeQuery(
    query: string,
    client: PoolClient,
    context?: QueryContext
  ): Promise<string> {
    // Simple query optimization - in production, this would be more sophisticated
    let optimizedQuery = query;

    // Add query hints for read-only operations
    if (context?.readOnly) {
      optimizedQuery = `/*+ READ_ONLY */ ${optimizedQuery}`;
    }

    // Add priority hints
    if (context?.priority === 'high') {
      optimizedQuery = `/*+ HIGH_PRIORITY */ ${optimizedQuery}`;
    }

    return optimizedQuery;
  }

  /**
   * Update pool statistics
   */
  private updatePoolStatistics(): void {
    if (this.pool) {
      this.poolStats.totalConnections = this.pool.totalCount;
      this.poolStats.idleConnections = this.pool.idleCount;
      this.poolStats.waitingConnections = this.pool.waitingCount;
    }
    
    const totalQueries = this.poolStats.successfulQueries + this.poolStats.failedQueries;
    if (totalQueries > 0) {
      // Calculate average query time from statistics
      const totalTime = Array.from(this.queryStatistics.values())
        .reduce((sum, stat) => sum + stat.totalExecutionTime, 0);
      this.poolStats.averageQueryTime = totalTime / totalQueries;
    }
  }
}

// Singleton instance
let databasePoolInstance: EnterpriseDatabasePool | null = null;

/**
 * Get singleton database pool instance
 */
export function getDatabasePool(): EnterpriseDatabasePool {
  if (!databasePoolInstance) {
    databasePoolInstance = new EnterpriseDatabasePool();
  }
  return databasePoolInstance;
}

/**
 * Initialize database pool
 */
export async function initializeDatabasePool(config?: Partial<DatabaseConfig>): Promise<EnterpriseDatabasePool> {
  if (databasePoolInstance) {
    await databasePoolInstance.close();
  }
  
  databasePoolInstance = new EnterpriseDatabasePool(config);
  await databasePoolInstance.initialize();
  return databasePoolInstance;
}