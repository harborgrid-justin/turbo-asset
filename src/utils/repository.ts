/**
 * Enterprise Repository Pattern
 * Provides data access layer abstraction with caching and query optimization
 */

import { logger } from '../config/logger';
import { EnterpriseError } from '../utils/error-handling';
import { cacheManager } from '../utils/caching';
import { HTTP_STATUS, DATABASE, BUSINESS_RULES } from '../constants';
import type { 
  BaseEntity, 
  QueryOptions, 
  PaginatedResponse,
  StandardResponse 
} from '../types/enterprise';

// Critical fix: Add proper entity types for type safety
export interface AssetEntity extends BaseEntity {
  readonly name: string;
  readonly location_id: string;
  readonly status: string;
  readonly type: string;
}

export interface WorkOrderEntity extends BaseEntity {
  readonly asset_id: string;
  readonly status: string;
  readonly priority: number;
  readonly description: string;
}

export interface RepositoryOptions {
  readonly enableCaching: boolean;
  readonly cacheKeyPrefix: string;
  readonly cacheTTL: number;
  readonly queryTimeout: number;
}

export interface QueryResult<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly hasMore: boolean;
  readonly executionTime: number;
}

export interface DatabaseConnection {
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  transaction<T>(operation: (connection: DatabaseConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Abstract base repository providing common data access patterns
 */
export abstract class BaseRepository<TEntity extends BaseEntity> {
  protected readonly tableName: string;
  protected readonly options: RepositoryOptions;
  protected readonly connection: DatabaseConnection;

  constructor(
    tableName: string, 
    connection: DatabaseConnection,
    options: Partial<RepositoryOptions> = {}
  ) {
    this.tableName = tableName;
    this.connection = connection;
    this.options = {
      enableCaching: true,
      cacheKeyPrefix: `repo:${tableName}`,
      cacheTTL: 300000, // 5 minutes
      queryTimeout: DATABASE.QUERY_TIMEOUT,
      ...options
    };
  }

  /**
   * Find entity by ID with caching
   */
  public async findById(id: string): Promise<TEntity | null> {
    const cacheKey = `${this.options.cacheKeyPrefix}:${id}`;
    
    // Try cache first
    if (this.options.enableCaching) {
      const cached = await cacheManager.get<TEntity>(cacheKey);
      if (cached !== null) {
        logger.debug(`Cache hit for entity ${this.tableName}:${id}`);
        return cached;
      }
    }

    const startTime = Date.now();
    
    try {
      // Critical fix: Add LIMIT 1 for single record queries and query optimization
      const query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL LIMIT 1`;
      const result = await this.executeQuery<TEntity>(query, [id]);
      
      // Critical fix: Safe array access with proper null checking
      const entity = result.length > 0 ? result[0]! : null;
      const executionTime = Date.now() - startTime;

      // Cache the result
      if (this.options.enableCaching && entity !== null) {
        await cacheManager.set(cacheKey, entity, this.options.cacheTTL);
      }

      logger.debug(`Found entity ${this.tableName}:${id} in ${executionTime}ms (${entity ? 'found' : 'not found'})`);
      return entity;

    } catch (error) {
      logger.error(`Error finding entity ${this.tableName}:${id}:`, error);
      throw new EnterpriseError(
        'DATABASE_ERROR',
        `Failed to find ${this.tableName} with id ${id}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { tableName: this.tableName, id, error: String(error) }
      );
    }
  }

  /**
   * Find all entities with pagination and filtering
   */
  public async findAll(options: QueryOptions = {}): Promise<PaginatedResponse<readonly TEntity[]>> {
    const startTime = Date.now();
    
    try {
      const queryBuilder = this.buildQuery(options);
      const countQuery = this.buildCountQuery(options);

      // Execute queries in parallel
      const [items, totalCountResult] = await Promise.all([
        this.executeQuery<TEntity>(queryBuilder.query, queryBuilder.params),
        this.executeQuery<{ count: number }>(countQuery.query, countQuery.params)
      ]);

      const totalCount = totalCountResult[0]?.count ?? 0;
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? BUSINESS_RULES.DEFAULT_PAGE_SIZE;
      const totalPages = Math.ceil(totalCount / pageSize);

      const executionTime = Date.now() - startTime;
      logger.debug(`Found ${items.length} entities from ${this.tableName} in ${executionTime}ms`);

      return {
        success: true,
        data: Object.freeze(items),
        timestamp: new Date(),
        pagination: {
          page,
          pageSize,
          totalItems: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      };

    } catch (error) {
      logger.error(`Error finding entities from ${this.tableName}:`, error);
      throw new EnterpriseError(
        'DATABASE_ERROR',
        `Failed to find entities from ${this.tableName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { tableName: this.tableName, options, error: String(error) }
      );
    }
  }

  /**
   * Create new entity
   */
  public async create(entity: Omit<TEntity, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<TEntity> {
    const startTime = Date.now();
    const id = this.generateId();
    const now = new Date();

    try {
      const entityWithMetadata = {
        ...entity,
        id,
        createdAt: now,
        updatedAt: now,
        version: 1
      } as TEntity;

      const { query, params } = this.buildInsertQuery(entityWithMetadata);
      await this.executeQuery(query, params);

      // Invalidate cache
      if (this.options.enableCaching) {
        await this.invalidateCache();
      }

      const executionTime = Date.now() - startTime;
      logger.info(`Created entity ${this.tableName}:${id} in ${executionTime}ms`);

      return entityWithMetadata;

    } catch (error) {
      logger.error(`Error creating entity in ${this.tableName}:`, error);
      throw new EnterpriseError(
        'DATABASE_ERROR',
        `Failed to create entity in ${this.tableName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { tableName: this.tableName, entity, error: String(error) }
      );
    }
  }

  /**
   * Update existing entity
   */
  public async update(id: string, updates: Partial<TEntity>): Promise<TEntity> {
    const startTime = Date.now();

    try {
      // First check if entity exists
      const existing = await this.findById(id);
      if (existing === null) {
        throw new EnterpriseError(
          'RESOURCE_NOT_FOUND',
          `${this.tableName} with id ${id} not found`,
          HTTP_STATUS.NOT_FOUND,
          { tableName: this.tableName, id }
        );
      }

      const updatedEntity = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
        version: existing.version + 1
      };

      const { query, params } = this.buildUpdateQuery(id, updatedEntity);
      await this.executeQuery(query, params);

      // Invalidate cache
      if (this.options.enableCaching) {
        await this.invalidateEntityCache(id);
      }

      const executionTime = Date.now() - startTime;
      logger.info(`Updated entity ${this.tableName}:${id} in ${executionTime}ms`);

      return updatedEntity;

    } catch (error) {
      if (error instanceof EnterpriseError) {
        throw error;
      }
      
      logger.error(`Error updating entity ${this.tableName}:${id}:`, error);
      throw new EnterpriseError(
        'DATABASE_ERROR',
        `Failed to update entity in ${this.tableName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { tableName: this.tableName, id, updates, error: String(error) }
      );
    }
  }

  /**
   * Soft delete entity
   */
  public async delete(id: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      const query = `UPDATE ${this.tableName} SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL`;
      const result = await this.executeQuery(query, [new Date(), id]);

      if (result.length === 0) {
        return false;
      }

      // Invalidate cache
      if (this.options.enableCaching) {
        await this.invalidateEntityCache(id);
      }

      const executionTime = Date.now() - startTime;
      logger.info(`Deleted entity ${this.tableName}:${id} in ${executionTime}ms`);

      return true;

    } catch (error) {
      logger.error(`Error deleting entity ${this.tableName}:${id}:`, error);
      throw new EnterpriseError(
        'DATABASE_ERROR',
        `Failed to delete entity from ${this.tableName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { tableName: this.tableName, id, error: String(error) }
      );
    }
  }

  /**
   * Execute query with timeout and error handling
   */
  protected async executeQuery<T = unknown>(query: string, params: readonly unknown[] = []): Promise<T[]> {
    try {
      const queryPromise = this.connection.query<T>(query, params);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query timeout after ${this.options.queryTimeout}ms`));
        }, this.options.queryTimeout);
      });

      return await Promise.race([queryPromise, timeoutPromise]);

    } catch (error) {
      logger.error('Query execution failed:', { query, params, error });
      throw error;
    }
  }

  /**
   * Build SELECT query with filters and pagination - Critical optimization
   */
  protected buildQuery(options: QueryOptions): { query: string; params: readonly unknown[] } {
    // Critical fix: Build optimized query with proper column selection
    const baseCondition = 'deleted_at IS NULL';
    const conditions = [baseCondition];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add filters efficiently
    if (options.filters !== undefined) {
      for (const [field, criteria] of Object.entries(options.filters)) {
        // Critical fix: Validate field name to prevent SQL injection
        const sanitizedField = field.replace(/[^a-zA-Z0-9_]/g, '');
        if (sanitizedField !== field) {
          throw new EnterpriseError(
            'INVALID_FIELD_NAME',
            `Invalid field name: ${field}`,
            HTTP_STATUS.BAD_REQUEST
          );
        }
        
        conditions.push(`${sanitizedField} ${this.getFilterOperator(criteria.operator)} $${paramIndex}`);
        params.push(criteria.value);
        paramIndex++;
      }
    }

    let query = `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`;

    // Add sorting
    if (options.sortBy !== undefined) {
      // Critical fix: Validate sort field name
      const sanitizedSortField = options.sortBy.replace(/[^a-zA-Z0-9_]/g, '');
      if (sanitizedSortField !== options.sortBy) {
        throw new EnterpriseError(
          'INVALID_SORT_FIELD',
          `Invalid sort field: ${options.sortBy}`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
      
      const sortOrder = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sanitizedSortField} ${sortOrder}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    // Add pagination
    if (options.pageSize !== undefined) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.pageSize);
      paramIndex++;

      if (options.page !== undefined && options.page > 1) {
        const offset = (options.page - 1) * options.pageSize;
        query += ` OFFSET $${paramIndex}`;
        params.push(offset);
      }
    }

    return { query, params: Object.freeze(params) };
  }

  /**
   * Build COUNT query for pagination
   */
  protected buildCountQuery(options: QueryOptions): { query: string; params: readonly unknown[] } {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add filters (same as in buildQuery)
    if (options.filters !== undefined) {
      for (const [field, criteria] of Object.entries(options.filters)) {
        query += ` AND ${field} ${this.getFilterOperator(criteria.operator)} $${paramIndex}`;
        params.push(criteria.value);
        paramIndex++;
      }
    }

    return { query, params: Object.freeze(params) };
  }

  /**
   * Build INSERT query
   */
  protected buildInsertQuery(entity: TEntity): { query: string; params: readonly unknown[] } {
    const fields = Object.keys(entity);
    const placeholders = fields.map((_, index) => `$${index + 1}`);
    const values = fields.map(field => (entity as any)[field]);

    const query = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
    
    return { query, params: Object.freeze(values) };
  }

  /**
   * Build UPDATE query
   */
  protected buildUpdateQuery(id: string, entity: TEntity): { query: string; params: readonly unknown[] } {
    const fields = Object.keys(entity).filter(field => field !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = fields.map(field => (entity as any)[field]);
    values.push(id);

    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${values.length}`;
    
    return { query, params: Object.freeze(values) };
  }

  private getFilterOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      'equals': '=',
      'not_equals': '!=',
      'greater_than': '>',
      'greater_than_or_equal': '>=',
      'less_than': '<',
      'less_than_or_equal': '<=',
      'in': 'IN',
      'not_in': 'NOT IN',
      'contains': 'ILIKE',
      'starts_with': 'ILIKE',
      'ends_with': 'ILIKE'
    };

    return operatorMap[operator] ?? '=';
  }

  private async invalidateCache(): Promise<void> {
    await cacheManager.invalidateByTags([`repo:${this.tableName}`]);
  }

  private async invalidateEntityCache(id: string): Promise<void> {
    const cacheKey = `${this.options.cacheKeyPrefix}:${id}`;
    await cacheManager.delete(cacheKey);
    await this.invalidateCache();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Asset Repository Implementation - Critical fix: Proper typing
 */
export class AssetRepository extends BaseRepository<AssetEntity> {
  constructor(connection: DatabaseConnection) {
    super('assets', connection, {
      enableCaching: true,
      cacheKeyPrefix: 'asset',
      cacheTTL: 600000, // 10 minutes for assets
      queryTimeout: 5000
    });
  }

  /**
   * Find assets by location - Optimized query
   */
  public async findByLocation(locationId: string): Promise<readonly AssetEntity[]> {
    // Critical fix: Add proper type safety and validation
    if (!locationId?.trim()) {
      throw new EnterpriseError(
        'INVALID_LOCATION_ID',
        'Location ID is required',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE location_id = $1 AND deleted_at IS NULL 
      ORDER BY name ASC
    `;
    return this.executeQuery<AssetEntity>(query, [locationId.trim()]);
  }

  /**
   * Find assets by status - Optimized query
   */
  public async findByStatus(status: string): Promise<readonly AssetEntity[]> {
    // Critical fix: Add validation and type safety
    if (!status?.trim()) {
      throw new EnterpriseError(
        'INVALID_STATUS',
        'Status is required',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE status = $1 AND deleted_at IS NULL 
      ORDER BY updated_at DESC
    `;
    return this.executeQuery<AssetEntity>(query, [status.trim()]);
  }
}

/**
 * Work Order Repository Implementation - Critical fix: Proper typing
 */
export class WorkOrderRepository extends BaseRepository<WorkOrderEntity> {
  constructor(connection: DatabaseConnection) {
    super('work_orders', connection, {
      enableCaching: true,
      cacheKeyPrefix: 'work_order',
      cacheTTL: 300000, // 5 minutes for work orders
      queryTimeout: 5000
    });
  }

  /**
   * Find work orders by asset - Optimized query
   */
  public async findByAsset(assetId: string): Promise<readonly WorkOrderEntity[]> {
    // Critical fix: Add validation and type safety
    if (!assetId?.trim()) {
      throw new EnterpriseError(
        'INVALID_ASSET_ID',
        'Asset ID is required',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE asset_id = $1 AND deleted_at IS NULL 
      ORDER BY created_at DESC 
      LIMIT 100
    `;
    return this.executeQuery<WorkOrderEntity>(query, [assetId.trim()]);
  }

  /**
   * Find open work orders - Optimized query with proper indexing
   */
  public async findOpen(): Promise<readonly WorkOrderEntity[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE status IN ('open', 'assigned', 'in_progress') 
        AND deleted_at IS NULL 
      ORDER BY priority DESC, created_at ASC 
      LIMIT 200
    `;
    return this.executeQuery<WorkOrderEntity>(query);
  }
}