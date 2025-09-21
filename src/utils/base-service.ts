/**
 * Abstract Base Service - Foundation for all enterprise services
 * Provides common functionality, error handling, and standardized patterns
 */

import { EventEmitter } from 'events';
import { logger } from '../config/logger';
import { 
  EnterpriseError, 
  ErrorHandler, 
  ValidationUtils,
  type ValidationErrorDetails 
} from '../utils/error-handling';
import { 
  type StandardResponse, 
  type QueryOptions, 
  type BaseEntity,
  type AuditEntry 
} from '../types/enterprise';
import { HTTP_STATUS } from '../constants';

export interface ServiceMetrics {
  readonly operationCount: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly averageResponseTime: number;
  readonly lastOperationTime?: Date;
}

export interface ServiceConfiguration {
  readonly enabled: boolean;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly cacheTTL: number;
  readonly rateLimitPerMinute: number;
}

export interface CircuitBreakerState {
  readonly state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  readonly failureCount: number;
  readonly lastFailureTime?: Date;
  readonly nextAttemptTime?: Date;
}

/**
 * Abstract base class for all enterprise services
 */
export abstract class BaseService extends EventEmitter {
  protected readonly serviceName: string;
  protected readonly version: string;
  private readonly metrics: ServiceMetrics;
  private readonly configuration: ServiceConfiguration;
  private readonly circuitBreaker: CircuitBreakerState;
  private readonly cache: Map<string, { data: unknown; expiry: Date }>;

  constructor(
    serviceName: string,
    version: string = '1.0.0',
    configuration: Partial<ServiceConfiguration> = {}
  ) {
    super();
    this.serviceName = serviceName;
    this.version = version;
    
    this.metrics = {
      operationCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0
    };

    this.configuration = {
      enabled: true,
      timeout: 30000,
      retryAttempts: 3,
      cacheTTL: 300000, // 5 minutes
      rateLimitPerMinute: 1000,
      ...configuration
    };

    this.circuitBreaker = {
      state: 'CLOSED',
      failureCount: 0
    };

    this.cache = new Map();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Get service information
   */
  public getServiceInfo(): {
    readonly name: string;
    readonly version: string;
    readonly status: 'healthy' | 'degraded' | 'unhealthy';
    readonly metrics: ServiceMetrics;
    readonly configuration: ServiceConfiguration;
    readonly circuitBreaker: CircuitBreakerState;
  } {
    return {
      name: this.serviceName,
      version: this.version,
      status: this.getHealthStatus(),
      metrics: { ...this.metrics },
      configuration: { ...this.configuration },
      circuitBreaker: { ...this.circuitBreaker }
    };
  }

  /**
   * Health check implementation
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.performHealthCheck();
      return true;
    } catch (error) {
      logger.error(`Health check failed for ${this.serviceName}:`, error);
      return false;
    }
  }

  /**
   * Abstract method for service-specific health checks
   */
  protected abstract performHealthCheck(): Promise<void>;

  /**
   * Execute operation with comprehensive error handling and metrics
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      readonly useCircuitBreaker?: boolean;
      readonly useCache?: boolean;
      readonly cacheKey?: string;
      readonly timeout?: number;
    } = {}
  ): Promise<StandardResponse<T>> {
    const startTime = Date.now();
    const operationId = `${this.serviceName}.${operationName}`;

    try {
      // Check if service is enabled
      if (!this.configuration.enabled) {
        throw new EnterpriseError(
          'SERVICE_DISABLED',
          `Service ${this.serviceName} is currently disabled`,
          HTTP_STATUS.SERVICE_UNAVAILABLE
        );
      }

      // Check circuit breaker
      if (options.useCircuitBreaker !== false && this.isCircuitBreakerOpen()) {
        throw new EnterpriseError(
          'CIRCUIT_BREAKER_OPEN',
          `Circuit breaker is open for ${this.serviceName}`,
          HTTP_STATUS.SERVICE_UNAVAILABLE
        );
      }

      // Check cache
      if (options.useCache === true && options.cacheKey !== undefined) {
        const cached = this.getCachedData<T>(options.cacheKey);
        if (cached !== null) {
          logger.debug(`Cache hit for ${operationId}`);
          return {
            success: true,
            data: cached,
            timestamp: new Date(),
            message: 'Retrieved from cache'
          };
        }
      }

      // Execute operation with timeout
      const timeout = options.timeout ?? this.configuration.timeout;
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise<T>(timeout)
      ]);

      // Cache result if caching is enabled
      if (options.useCache === true && options.cacheKey !== undefined) {
        this.setCachedData(options.cacheKey, result);
      }

      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      this.resetCircuitBreaker();

      // Emit success event
      this.emit('operation:success', {
        operation: operationName,
        duration: Date.now() - startTime,
        timestamp: new Date()
      });

      logger.info(`Operation ${operationId} completed successfully in ${Date.now() - startTime}ms`);

      return {
        success: true,
        data: result,
        timestamp: new Date()
      };

    } catch (error) {
      // Update metrics and circuit breaker
      this.updateMetrics(false, Date.now() - startTime);
      this.updateCircuitBreaker();

      // Emit error event
      this.emit('operation:error', {
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: new Date()
      });

      // Handle known enterprise errors
      if (error instanceof EnterpriseError) {
        logger.error(`Operation ${operationId} failed:`, error.toJSON());
        throw error;
      }

      // Handle unexpected errors
      const systemError = new EnterpriseError(
        'SYSTEM_ERROR',
        `Unexpected error in ${operationName}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { operation: operationName, originalError: String(error) }
      );

      logger.error(`Unexpected error in ${operationId}:`, error);
      throw systemError;
    }
  }

  /**
   * Validate input parameters with comprehensive validation
   */
  protected validateInput<T extends Record<string, unknown>>(
    input: unknown,
    validators: Record<keyof T, (value: unknown) => unknown>
  ): T {
    if (typeof input !== 'object' || input === null) {
      throw new EnterpriseError(
        'VALIDATION_ERROR',
        'Input must be a valid object',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const validationErrors: ValidationErrorDetails[] = [];
    const validatedInput = {} as T;

    for (const [field, validator] of Object.entries(validators)) {
      try {
        const value = (input as Record<string, unknown>)[field];
        validatedInput[field as keyof T] = validator(value) as T[keyof T];
      } catch (error) {
        if (error instanceof EnterpriseError && error.code === 'VALIDATION_ERROR') {
          // Extract validation details from the error
          const validationError = error as any;
          if (validationError.validationErrors) {
            validationErrors.push(...validationError.validationErrors);
          } else {
            validationErrors.push({
              field,
              value: (input as Record<string, unknown>)[field],
              constraint: 'validation',
              message: error.message
            });
          }
        } else {
          validationErrors.push({
            field,
            value: (input as Record<string, unknown>)[field],
            constraint: 'validation',
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    if (validationErrors.length > 0) {
      throw new EnterpriseError(
        'VALIDATION_ERROR',
        `Validation failed for ${validationErrors.length} field(s)`,
        HTTP_STATUS.BAD_REQUEST,
        { validationErrors }
      );
    }

    return validatedInput;
  }

  /**
   * Create audit entry for operations
   */
  protected createAuditEntry(
    entityId: string,
    action: AuditEntry['action'],
    changes: Record<string, { before: unknown; after: unknown }>,
    userId?: string,
    metadata?: Record<string, unknown>
  ): AuditEntry {
    return {
      id: this.generateId(),
      entityId,
      action,
      timestamp: new Date(),
      userId: userId ?? 'system',
      changes,
      metadata
    };
  }

  /**
   * Apply query options to filter and paginate results
   */
  protected applyQueryOptions<T>(
    items: readonly T[],
    options: QueryOptions = {}
  ): {
    readonly items: readonly T[];
    readonly totalCount: number;
    readonly hasMore: boolean;
  } {
    let filteredItems = [...items];

    // Apply sorting
    if (options.sortBy !== undefined) {
      const sortOrder = options.sortOrder === 'desc' ? -1 : 1;
      filteredItems.sort((a, b) => {
        const aValue = (a as any)[options.sortBy!];
        const bValue = (b as any)[options.sortBy!];
        
        if (aValue < bValue) return -1 * sortOrder;
        if (aValue > bValue) return 1 * sortOrder;
        return 0;
      });
    }

    const totalCount = filteredItems.length;

    // Apply pagination
    if (options.page !== undefined && options.pageSize !== undefined) {
      const startIndex = (options.page - 1) * options.pageSize;
      const endIndex = startIndex + options.pageSize;
      filteredItems = filteredItems.slice(startIndex, endIndex);
    }

    return {
      items: filteredItems,
      totalCount,
      hasMore: options.pageSize !== undefined && filteredItems.length === options.pageSize
    };
  }

  // Private helper methods

  private setupEventListeners(): void {
    this.on('error', (error: Error) => {
      logger.error(`Unhandled error in ${this.serviceName}:`, error);
    });

    // Clean up cache periodically
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Every minute
  }

  private getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    if (!this.configuration.enabled) return 'unhealthy';
    if (this.circuitBreaker.state === 'OPEN') return 'unhealthy';
    if (this.circuitBreaker.state === 'HALF_OPEN') return 'degraded';
    
    const errorRate = this.metrics.operationCount > 0 
      ? this.metrics.errorCount / this.metrics.operationCount 
      : 0;
    
    if (errorRate > 0.1) return 'degraded'; // More than 10% error rate
    return 'healthy';
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.operationCount++;
    this.metrics.lastOperationTime = new Date();
    
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }

    // Update average response time using exponential moving average
    const alpha = 0.1;
    this.metrics.averageResponseTime = 
      (alpha * responseTime) + ((1 - alpha) * this.metrics.averageResponseTime);
  }

  private isCircuitBreakerOpen(): boolean {
    return this.circuitBreaker.state === 'OPEN' &&
           (this.circuitBreaker.nextAttemptTime === undefined ||
            new Date() < this.circuitBreaker.nextAttemptTime);
  }

  private updateCircuitBreaker(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    if (this.circuitBreaker.failureCount >= 5) {
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.nextAttemptTime = new Date(Date.now() + 30000); // 30 seconds
    }
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.lastFailureTime = undefined;
    this.circuitBreaker.nextAttemptTime = undefined;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached === undefined) return null;
    
    if (new Date() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCachedData(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      expiry: new Date(Date.now() + this.configuration.cacheTTL)
    });
  }

  private cleanupCache(): void {
    const now = new Date();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiry) {
        this.cache.delete(key);
      }
    }
  }

  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new EnterpriseError(
          'TIMEOUT_ERROR',
          `Operation timed out after ${timeout}ms`,
          HTTP_STATUS.GATEWAY_TIMEOUT
        ));
      }, timeout);
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}