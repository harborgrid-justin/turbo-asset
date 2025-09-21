/**
 * Repository Pattern Implementation
 * Enterprise-grade data access layer with type safety and error handling
 */

import { logger } from '../../config/logger';

/**
 * Base entity interface
 */
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy?: string;
  readonly updatedBy?: string;
}

/**
 * Repository query options
 */
export interface QueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
  readonly filters?: Record<string, unknown>;
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

/**
 * Repository operation result
 */
export interface RepositoryResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: Error;
  readonly affectedRows?: number;
}

/**
 * Base repository interface
 */
export interface IRepository<T extends BaseEntity> {
  findById(id: string): Promise<RepositoryResult<T | null>>;
  findMany(options?: QueryOptions): Promise<RepositoryResult<PaginatedResult<T>>>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<RepositoryResult<T>>;
  update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RepositoryResult<T>>;
  delete(id: string): Promise<RepositoryResult<boolean>>;
  count(filters?: Record<string, unknown>): Promise<RepositoryResult<number>>;
  exists(id: string): Promise<RepositoryResult<boolean>>;
}

/**
 * Database connection interface
 */
export interface IDatabaseConnection {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number; insertId?: string }>;
  transaction<T>(callback: (connection: IDatabaseConnection) => Promise<T>): Promise<T>;
}

/**
 * Repository error types
 */
export class RepositoryError extends Error {
  constructor(message: string, public readonly operation: string, public readonly entity: string) {
    super(`Repository Error [${entity}.${operation}]: ${message}`);
    this.name = 'RepositoryError';
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entity: string, id: string) {
    super(`Entity with id '${id}' not found`, 'findById', entity);
    this.name = 'EntityNotFoundError';
  }
}

export class DuplicateEntityError extends RepositoryError {
  constructor(entity: string, field: string, value: string) {
    super(`Entity with ${field} '${value}' already exists`, 'create', entity);
    this.name = 'DuplicateEntityError';
  }
}

/**
 * Base repository implementation
 */
export abstract class BaseRepository<T extends BaseEntity> implements IRepository<T> {
  protected abstract readonly tableName: string;
  protected abstract readonly entityName: string;

  constructor(protected readonly connection: IDatabaseConnection) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<RepositoryResult<T | null>> {
    try {
      logger.debug(`Finding ${this.entityName} by ID: ${id}`);
      
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`;
      const results = await this.connection.query<T>(sql, [id]);
      
      const entity = results.length > 0 ? this.mapToEntity(results[0]) : null;
      
      logger.debug(`Found ${this.entityName}: ${entity ? 'yes' : 'no'}`);
      
      return { success: true, data: entity };
    } catch (error) {
      const repositoryError = new RepositoryError(
        error instanceof Error ? error.message : 'Unknown error',
        'findById',
        this.entityName
      );
      
      logger.error(`Error finding ${this.entityName} by ID`, { id, error: repositoryError });
      
      return { success: false, error: repositoryError };
    }
  }

  /**
   * Find multiple entities with pagination
   */
  async findMany(options: QueryOptions = {}): Promise<RepositoryResult<PaginatedResult<T>>> {
    try {
      const { limit = 25, offset = 0, sortBy = 'createdAt', sortOrder = 'desc', filters = {} } = options;
      
      logger.debug(`Finding ${this.entityName} entities`, { options });
      
      // Build WHERE clause
      const whereConditions: string[] = ['deleted_at IS NULL'];
      const params: unknown[] = [];
      
      Object.entries(filters).forEach(([key, value]) => {
        whereConditions.push(`${key} = ?`);
        params.push(value);
      });
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Count query
      const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
      const countResult = await this.connection.query<{ total: number }>(countSql, params);
      const total = countResult[0]?.total ?? 0;
      
      // Data query
      const dataSql = `
        SELECT * FROM ${this.tableName} 
        ${whereClause} 
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()} 
        LIMIT ? OFFSET ?
      `;
      const dataResults = await this.connection.query<T>(dataSql, [...params, limit, offset]);
      
      const data = dataResults.map(row => this.mapToEntity(row));
      const page = Math.floor(offset / limit) + 1;
      const hasNext = offset + limit < total;
      const hasPrevious = offset > 0;
      
      const paginatedResult: PaginatedResult<T> = {
        data,
        total,
        page,
        pageSize: limit,
        hasNext,
        hasPrevious
      };
      
      logger.debug(`Found ${data.length} ${this.entityName} entities`);
      
      return { success: true, data: paginatedResult };
    } catch (error) {
      const repositoryError = new RepositoryError(
        error instanceof Error ? error.message : 'Unknown error',
        'findMany',
        this.entityName
      );
      
      logger.error(`Error finding ${this.entityName} entities`, { error: repositoryError });
      
      return { success: false, error: repositoryError };
    }
  }

  /**
   * Create new entity
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<RepositoryResult<T>> {
    try {
      logger.debug(`Creating ${this.entityName}`, { data });
      
      const now = new Date();
      const entityData = {
        ...data,
        id: this.generateId(),
        createdAt: now,
        updatedAt: now
      };
      
      const columns = Object.keys(entityData);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(entityData);
      
      const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      await this.connection.execute(sql, values);
      
      const createdEntity = this.mapToEntity(entityData as T);
      
      logger.debug(`Created ${this.entityName} with ID: ${createdEntity.id}`);
      
      return { success: true, data: createdEntity };
    } catch (error) {
      const repositoryError = new RepositoryError(
        error instanceof Error ? error.message : 'Unknown error',
        'create',
        this.entityName
      );
      
      logger.error(`Error creating ${this.entityName}`, { error: repositoryError });
      
      return { success: false, error: repositoryError };
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RepositoryResult<T>> {
    try {
      logger.debug(`Updating ${this.entityName} with ID: ${id}`, { data });
      
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      
      const columns = Object.keys(updateData);
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = [...Object.values(updateData), id];
      
      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ? AND deleted_at IS NULL`;
      const result = await this.connection.execute(sql, values);
      
      if (result.affectedRows === 0) {
        throw new EntityNotFoundError(this.entityName, id);
      }
      
      const updatedEntityResult = await this.findById(id);
      if (!updatedEntityResult.success || !updatedEntityResult.data) {
        throw new Error('Failed to retrieve updated entity');
      }
      
      logger.debug(`Updated ${this.entityName} with ID: ${id}`);
      
      return { success: true, data: updatedEntityResult.data, affectedRows: result.affectedRows };
    } catch (error) {
      const repositoryError = error instanceof RepositoryError 
        ? error 
        : new RepositoryError(
            error instanceof Error ? error.message : 'Unknown error',
            'update',
            this.entityName
          );
      
      logger.error(`Error updating ${this.entityName}`, { id, error: repositoryError });
      
      return { success: false, error: repositoryError };
    }
  }

  /**
   * Delete entity (soft delete)
   */
  async delete(id: string): Promise<RepositoryResult<boolean>> {
    try {
      logger.debug(`Deleting ${this.entityName} with ID: ${id}`);
      
      const sql = `UPDATE ${this.tableName} SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`;
      const result = await this.connection.execute(sql, [new Date(), id]);
      
      if (result.affectedRows === 0) {
        throw new EntityNotFoundError(this.entityName, id);
      }
      
      logger.debug(`Deleted ${this.entityName} with ID: ${id}`);
      
      return { success: true, data: true, affectedRows: result.affectedRows };
    } catch (error) {
      const repositoryError = error instanceof RepositoryError 
        ? error 
        : new RepositoryError(
            error instanceof Error ? error.message : 'Unknown error',
            'delete',
            this.entityName
          );
      
      logger.error(`Error deleting ${this.entityName}`, { id, error: repositoryError });
      
      return { success: false, error: repositoryError };
    }
  }

  /**
   * Count entities
   */
  async count(filters: Record<string, unknown> = {}): Promise<RepositoryResult<number>> {
    try {
      logger.debug(`Counting ${this.entityName} entities`, { filters });
      
      const whereConditions: string[] = ['deleted_at IS NULL'];
      const params: unknown[] = [];
      
      Object.entries(filters).forEach(([key, value]) => {
        whereConditions.push(`${key} = ?`);
        params.push(value);
      });
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const sql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
      
      const result = await this.connection.query<{ total: number }>(sql, params);
      const count = result[0]?.total ?? 0;
      
      logger.debug(`Count result for ${this.entityName}: ${count}`);
      
      return { success: true, data: count };
    } catch (error) {
      const repositoryError = new RepositoryError(
        error instanceof Error ? error.message : 'Unknown error',
        'count',
        this.entityName
      );
      
      logger.error(`Error counting ${this.entityName} entities`, { error: repositoryError });
      
      return { success: false, error: repositoryError };
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<RepositoryResult<boolean>> {
    try {
      const result = await this.findById(id);
      return { success: true, data: result.data !== null };
    } catch (error) {
      const repositoryError = new RepositoryError(
        error instanceof Error ? error.message : 'Unknown error',
        'exists',
        this.entityName
      );
      
      return { success: false, error: repositoryError };
    }
  }

  /**
   * Generate unique ID for new entities
   */
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map database row to entity - must be implemented by concrete repositories
   */
  protected abstract mapToEntity(row: unknown): T;
}