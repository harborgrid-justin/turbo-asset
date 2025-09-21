/**
 * Base Service Abstract Class
 * Enterprise-grade service layer foundation with logging, metrics, and error handling
 */

import { EventEmitter } from 'events';
import { logger } from '../config/logger';

/**
 * Service health status enumeration
 */
export enum ServiceStatus {
  INITIALIZING = 'initializing',
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  MAINTENANCE = 'maintenance'
}

/**
 * Service metrics interface
 */
export interface ServiceMetrics {
  readonly totalOperations: number;
  readonly successfulOperations: number;
  readonly failedOperations: number;
  readonly averageResponseTime: number;
  readonly lastOperation: Date | null;
  readonly status: ServiceStatus;
  readonly uptime: number;
}

/**
 * Service configuration interface
 */
export interface ServiceConfig {
  readonly name: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Service operation result interface
 */
export interface ServiceResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: Error;
  readonly executionTime: number;
  readonly timestamp: Date;
}

/**
 * Base service class with enterprise features
 */
export abstract class BaseService extends EventEmitter {
  protected readonly config: ServiceConfig;
  protected metrics: ServiceMetrics;
  protected isInitialized: boolean = false;
  protected startTime: Date = new Date();

  constructor(config: ServiceConfig) {
    super();
    this.config = config;
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      lastOperation: null,
      status: ServiceStatus.INITIALIZING,
      uptime: 0
    };
  }

  /**
   * Initialize the service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info(`Initializing service: ${this.config.name}`);
      await this.onInitialize();
      this.isInitialized = true;
      this.metrics = { ...this.metrics, status: ServiceStatus.HEALTHY };
      this.emit('initialized');
      logger.info(`Service initialized successfully: ${this.config.name}`);
    } catch (error) {
      this.metrics = { ...this.metrics, status: ServiceStatus.UNHEALTHY };
      this.emit('error', error);
      logger.error(`Service initialization failed: ${this.config.name}`, { error });
      throw error;
    }
  }

  /**
   * Execute a service operation with metrics and error handling
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    const timestamp = new Date();

    if (!this.isInitialized) {
      throw new Error(`Service not initialized: ${this.config.name}`);
    }

    try {
      this.incrementMetric('totalOperations');
      
      logger.debug(`Starting operation: ${operationName}`, {
        service: this.config.name,
        operation: operationName
      });

      const data = await operation();
      const executionTime = Date.now() - startTime;

      this.incrementMetric('successfulOperations');
      this.updateAverageResponseTime(executionTime);
      this.metrics = { ...this.metrics, lastOperation: timestamp };

      logger.debug(`Operation completed successfully: ${operationName}`, {
        service: this.config.name,
        operation: operationName,
        executionTime
      });

      this.emit('operationSuccess', { operationName, executionTime, data });

      return {
        success: true,
        data,
        executionTime,
        timestamp
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const operationError = error instanceof Error ? error : new Error(String(error));

      this.incrementMetric('failedOperations');
      this.metrics = { ...this.metrics, lastOperation: timestamp };

      logger.error(`Operation failed: ${operationName}`, {
        service: this.config.name,
        operation: operationName,
        error: operationError,
        executionTime
      });

      this.emit('operationError', { operationName, error: operationError, executionTime });

      return {
        success: false,
        error: operationError,
        executionTime,
        timestamp
      };
    }
  }

  /**
   * Get service health information
   */
  public getHealthInfo(): ServiceMetrics & { name: string; version: string; isInitialized: boolean } {
    const now = Date.now();
    const uptime = now - this.startTime.getTime();

    return {
      ...this.metrics,
      uptime,
      name: this.config.name,
      version: this.config.version,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Shutdown the service gracefully
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info(`Shutting down service: ${this.config.name}`);
      this.metrics = { ...this.metrics, status: ServiceStatus.MAINTENANCE };
      await this.onShutdown();
      this.emit('shutdown');
      logger.info(`Service shutdown completed: ${this.config.name}`);
    } catch (error) {
      logger.error(`Service shutdown failed: ${this.config.name}`, { error });
      throw error;
    }
  }

  /**
   * Update service status
   */
  protected updateStatus(status: ServiceStatus): void {
    const previousStatus = this.metrics.status;
    this.metrics = { ...this.metrics, status };
    
    if (previousStatus !== status) {
      logger.info(`Service status changed: ${this.config.name}`, {
        previousStatus,
        newStatus: status
      });
      this.emit('statusChanged', { previousStatus, newStatus: status });
    }
  }

  /**
   * Increment a metric counter
   */
  private incrementMetric(metric: 'totalOperations' | 'successfulOperations' | 'failedOperations'): void {
    this.metrics = {
      ...this.metrics,
      [metric]: this.metrics[metric] + 1
    };
  }

  /**
   * Update average response time using exponential moving average
   */
  private updateAverageResponseTime(responseTime: number): void {
    const alpha = 0.1; // Smoothing factor
    const previousAverage = this.metrics.averageResponseTime;
    const newAverage = previousAverage === 0 ? responseTime : alpha * responseTime + (1 - alpha) * previousAverage;
    
    this.metrics = {
      ...this.metrics,
      averageResponseTime: Math.round(newAverage)
    };
  }

  /**
   * Abstract method for service-specific initialization
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Abstract method for service-specific shutdown logic
   */
  protected abstract onShutdown(): Promise<void>;
}

/**
 * Service factory interface
 */
export interface ServiceFactory<T extends BaseService> {
  create(config: ServiceConfig): T;
}

/**
 * Service registry for dependency injection
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, BaseService> = new Map();

  private constructor() {}

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Register a service
   */
  public register<T extends BaseService>(name: string, service: T): void {
    if (this.services.has(name)) {
      throw new Error(`Service already registered: ${name}`);
    }
    this.services.set(name, service);
    logger.info(`Service registered: ${name}`);
  }

  /**
   * Get a registered service
   */
  public get<T extends BaseService>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    return service as T;
  }

  /**
   * Check if service is registered
   */
  public has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Initialize all registered services
   */
  public async initializeAll(): Promise<void> {
    const services = Array.from(this.services.values());
    await Promise.all(services.map(service => service.initialize()));
  }

  /**
   * Shutdown all registered services
   */
  public async shutdownAll(): Promise<void> {
    const services = Array.from(this.services.values());
    await Promise.all(services.map(service => service.shutdown()));
  }
}