/**
 * Enterprise Dependency Injection Container
 * 
 * Production-grade IoC container following Google Guice and Facebook React patterns
 * with advanced features like lifecycle management, configuration injection,
 * and comprehensive service discovery
 */

import { EventEmitter } from 'events';
import { logger } from '@/config/logger';

export type ServiceScope = 'SINGLETON' | 'TRANSIENT' | 'REQUEST' | 'SESSION';
export type ServiceLifecycle = 'LAZY' | 'EAGER';

export interface ServiceDefinition<T = any> {
  id: string;
  name: string;
  factory: ServiceFactory<T>;
  dependencies: string[];
  scope: ServiceScope;
  lifecycle: ServiceLifecycle;
  tags: string[];
  configuration?: Record<string, any>;
  healthCheck?: () => Promise<boolean>;
  dispose?: (instance: T) => Promise<void>;
  metadata: {
    version: string;
    author: string;
    description: string;
    createdAt: Date;
    lastModified: Date;
  };
}

export interface ServiceFactory<T = any> {
  create(container: EnterpriseContainer, dependencies: Record<string, any>, config?: Record<string, any>): T | Promise<T>;
}

export interface ServiceInstance<T = any> {
  service: T;
  definition: ServiceDefinition<T>;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  requestContext?: string;
  sessionContext?: string;
}

export interface ContainerConfiguration {
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  enableMetrics: boolean;
  enableCircularDependencyDetection: boolean;
  maxRecursionDepth: number;
  enableServiceDiscovery: boolean;
  serviceDiscoveryPort?: number;
  enableHotReload: boolean;
  enableAuditLogging: boolean;
}

export interface ServiceRegistry {
  register<T>(definition: ServiceDefinition<T>): void;
  unregister(serviceId: string): boolean;
  get<T>(serviceId: string): ServiceDefinition<T> | undefined;
  list(): ServiceDefinition[];
  findByTag(tag: string): ServiceDefinition[];
  findByPattern(pattern: string): ServiceDefinition[];
}

export class EnterpriseContainer extends EventEmitter {
  private static instance: EnterpriseContainer;
  private readonly serviceRegistry: Map<string, ServiceDefinition> = new Map();
  private readonly singletonInstances: Map<string, ServiceInstance> = new Map();
  private readonly requestInstances: Map<string, Map<string, ServiceInstance>> = new Map();
  private readonly sessionInstances: Map<string, Map<string, ServiceInstance>> = new Map();
  private readonly dependencyGraph: Map<string, string[]> = new Map();
  private readonly circularDependencyCache: Set<string> = new Set();
  private readonly healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly configuration: ContainerConfiguration;
  private isShuttingDown: boolean = false;
  
  // Metrics and monitoring
  private readonly serviceMetrics: Map<string, {
    creationCount: number;
    accessCount: number;
    lastAccessed: Date;
    averageCreationTime: number;
    errorCount: number;
    healthCheckFailures: number;
  }> = new Map();

  private constructor(config: Partial<ContainerConfiguration> = {}) {
    super();
    this.configuration = {
      enableHealthChecks: true,
      healthCheckInterval: 60000, // 1 minute
      enableMetrics: true,
      enableCircularDependencyDetection: true,
      maxRecursionDepth: 10,
      enableServiceDiscovery: false,
      enableHotReload: false,
      enableAuditLogging: true,
      ...config
    };

    this.initializeContainer();
    this.setupGracefulShutdown();
  }

  public static getInstance(config?: Partial<ContainerConfiguration>): EnterpriseContainer {
    if (!EnterpriseContainer.instance) {
      EnterpriseContainer.instance = new EnterpriseContainer(config);
    }
    return EnterpriseContainer.instance;
  }

  /**
   * Register a service with the container
   */
  public register<T>(definition: ServiceDefinition<T>): void {
    try {
      // Validate service definition
      this.validateServiceDefinition(definition);

      // Check for circular dependencies
      if (this.configuration.enableCircularDependencyDetection) {
        const hasCycle = this.detectCircularDependency(definition.id, definition.dependencies);
        if (hasCycle) {
          throw new Error(`Circular dependency detected for service: ${definition.id}`);
        }
      }

      // Register the service
      this.serviceRegistry.set(definition.id, definition);
      this.dependencyGraph.set(definition.id, definition.dependencies);
      
      // Initialize metrics
      if (this.configuration.enableMetrics) {
        this.serviceMetrics.set(definition.id, {
          creationCount: 0,
          accessCount: 0,
          lastAccessed: new Date(),
          averageCreationTime: 0,
          errorCount: 0,
          healthCheckFailures: 0
        });
      }

      // Set up health checks for singleton services
      if (definition.scope === 'SINGLETON' && this.configuration.enableHealthChecks && definition.healthCheck) {
        this.setupHealthCheck(definition);
      }

      // Create eager singletons immediately
      if (definition.scope === 'SINGLETON' && definition.lifecycle === 'EAGER') {
        this.createSingleton(definition.id);
      }

      this.emit('serviceRegistered', { serviceId: definition.id, name: definition.name });
      
      if (this.configuration.enableAuditLogging) {
        logger.info('Service registered', { 
          serviceId: definition.id, 
          name: definition.name, 
          scope: definition.scope,
          lifecycle: definition.lifecycle 
        });
      }

    } catch (error: unknown) {
      logger.error('Failed to register service', { serviceId: definition.id, error });
      throw error;
    }
  }

  /**
   * Get a service instance from the container
   */
  public async get<T>(serviceId: string, context?: { requestId?: string; sessionId?: string }): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('Container is shutting down, cannot create new instances');
    }

    const definition = this.serviceRegistry.get(serviceId);
    if (!definition) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    try {
      const startTime = Date.now();
      let instance: T;

      switch (definition.scope) {
        case 'SINGLETON':
          instance = await this.getSingleton<T>(serviceId);
          break;
        case 'REQUEST':
          if (!context?.requestId) {
            throw new Error(`Request context required for service: ${serviceId}`);
          }
          instance = await this.getRequestScoped<T>(serviceId, context.requestId);
          break;
        case 'SESSION':
          if (!context?.sessionId) {
            throw new Error(`Session context required for service: ${serviceId}`);
          }
          instance = await this.getSessionScoped<T>(serviceId, context.sessionId);
          break;
        case 'TRANSIENT':
        default:
          instance = await this.createTransient<T>(serviceId, context);
          break;
      }

      // Update metrics
      if (this.configuration.enableMetrics) {
        this.updateAccessMetrics(serviceId, Date.now() - startTime);
      }

      this.emit('serviceAccessed', { serviceId, scope: definition.scope, context });

      return instance;

    } catch (error: unknown) {
      if (this.configuration.enableMetrics) {
        const metrics = this.serviceMetrics.get(serviceId);
        if (metrics) {
          metrics.errorCount++;
        }
      }

      logger.error('Failed to get service instance', { serviceId, error });
      this.emit('serviceError', { serviceId, error });
      throw error;
    }
  }

  /**
   * Get multiple services by tag
   */
  public async getByTag<T>(tag: string, context?: { requestId?: string; sessionId?: string }): Promise<T[]> {
    const definitions = Array.from(this.serviceRegistry.values()).filter(def => def.tags.includes(tag));
    const instances = await Promise.all(definitions.map(async def => await this.get<T>(def.id, context)));
    return instances;
  }

  /**
   * Check if a service is registered
   */
  public has(serviceId: string): boolean {
    return this.serviceRegistry.has(serviceId);
  }

  /**
   * List all registered services
   */
  public listServices(): ServiceDefinition[] {
    return Array.from(this.serviceRegistry.values());
  }

  /**
   * Get container health status
   */
  public async getHealthStatus(): Promise<{
    overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    services: Array<{
      id: string;
      name: string;
      status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
      lastCheck: Date;
      details?: any;
    }>;
    metrics: {
      totalServices: number;
      activeInstances: number;
      healthyServices: number;
      unhealthyServices: number;
      memoryUsage: NodeJS.MemoryUsage;
    };
  }> {
    const services = [];
    let healthyCount = 0;
    let unhealthyCount = 0;

    // Check health of all singleton services
    for (const [serviceId, instance] of this.singletonInstances.entries()) {
      const definition = this.serviceRegistry.get(serviceId);
      if (definition?.healthCheck) {
        try {
          const isHealthy = await definition.healthCheck();
          const status = isHealthy ? 'HEALTHY' : 'UNHEALTHY';
          if (isHealthy) {healthyCount++;}
          else {unhealthyCount++;}

          services.push({
            id: serviceId,
            name: definition.name,
            status,
            lastCheck: new Date()
          });
        } catch (error: unknown) {
          unhealthyCount++;
          services.push({
            id: serviceId,
            name: definition.name,
            status: 'UNHEALTHY' as const,
            lastCheck: new Date(),
            details: { error: (error as Error).message }
          });
        }
      } else {
        services.push({
          id: serviceId,
          name: definition?.name || serviceId,
          status: 'UNKNOWN' as const,
          lastCheck: new Date()
        });
      }
    }

    const overall = unhealthyCount > 0 ? (healthyCount > unhealthyCount ? 'DEGRADED' : 'UNHEALTHY') : 'HEALTHY';

    return {
      overall,
      services,
      metrics: {
        totalServices: this.serviceRegistry.size,
        activeInstances: this.singletonInstances.size + 
                          Array.from(this.requestInstances.values()).reduce((sum, map) => sum + map.size, 0) +
                          Array.from(this.sessionInstances.values()).reduce((sum, map) => sum + map.size, 0),
        healthyServices: healthyCount,
        unhealthyServices: unhealthyCount,
        memoryUsage: process.memoryUsage()
      }
    };
  }

  /**
   * Get service metrics
   */
  public getMetrics(): Record<string, any> {
    if (!this.configuration.enableMetrics) {
      return { message: 'Metrics disabled' };
    }

    const metrics: Record<string, any> = {};
    
    for (const [serviceId, serviceMetrics] of this.serviceMetrics.entries()) {
      const definition = this.serviceRegistry.get(serviceId);
      metrics[serviceId] = {
        name: definition?.name || serviceId,
        scope: definition?.scope,
        ...serviceMetrics
      };
    }

    return metrics;
  }

  /**
   * Gracefully shutdown the container
   */
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    logger.info('Starting container shutdown');

    // Clear all health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }

    // Dispose of all singleton instances
    const disposePromises = [];
    
    for (const [serviceId, instance] of this.singletonInstances.entries()) {
      const definition = this.serviceRegistry.get(serviceId);
      if (definition?.dispose) {
        disposePromises.push(definition.dispose(instance.service));
      }
    }

    // Wait for all disposals to complete
    await Promise.allSettled(disposePromises);

    // Clear all instances
    this.singletonInstances.clear();
    this.requestInstances.clear();
    this.sessionInstances.clear();

    this.emit('containerShutdown');
    logger.info('Container shutdown completed');
  }

  // Private helper methods
  private initializeContainer(): void {
    // Set up periodic cleanup for request/session scoped instances
    setInterval(() => {
      this.cleanupExpiredInstances();
    }, 300000); // 5 minutes

    logger.info('Enterprise Container initialized', { 
      configuration: this.configuration 
    });
  }

  private validateServiceDefinition(definition: ServiceDefinition): void {
    if (!definition.id) {
      throw new Error('Service definition must have an id');
    }
    if (!definition.name) {
      throw new Error('Service definition must have a name');
    }
    if (!definition.factory) {
      throw new Error('Service definition must have a factory');
    }
    if (!definition.dependencies) {
      definition.dependencies = [];
    }
    if (!definition.tags) {
      definition.tags = [];
    }
  }

  private detectCircularDependency(serviceId: string, dependencies: string[], visited: Set<string> = new Set()): boolean {
    if (visited.has(serviceId)) {
      return true;
    }

    visited.add(serviceId);

    for (const depId of dependencies) {
      const depDefinition = this.serviceRegistry.get(depId);
      if (depDefinition && this.detectCircularDependency(depId, depDefinition.dependencies, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  private async getSingleton<T>(serviceId: string): Promise<T> {
    let instance = this.singletonInstances.get(serviceId);
    
    if (!instance) {
      instance = await this.createSingleton<T>(serviceId);
    }

    instance.lastAccessed = new Date();
    instance.accessCount++;

    return instance.service as T;
  }

  private async createSingleton<T>(serviceId: string): Promise<ServiceInstance<T>> {
    const definition = this.serviceRegistry.get(serviceId);
    if (!definition) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const dependencies = await this.resolveDependencies(definition.dependencies);
    const service = await definition.factory.create(this, dependencies, definition.configuration);

    const instance: ServiceInstance<T> = {
      service,
      definition,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      healthStatus: 'UNKNOWN'
    };

    this.singletonInstances.set(serviceId, instance);
    
    if (this.configuration.enableMetrics) {
      const metrics = this.serviceMetrics.get(serviceId);
      if (metrics) {
        metrics.creationCount++;
      }
    }

    return instance;
  }

  private async getRequestScoped<T>(serviceId: string, requestId: string): Promise<T> {
    let requestMap = this.requestInstances.get(requestId);
    if (!requestMap) {
      requestMap = new Map();
      this.requestInstances.set(requestId, requestMap);
    }

    let instance = requestMap.get(serviceId);
    if (!instance) {
      instance = await this.createRequestScoped<T>(serviceId, requestId);
      requestMap.set(serviceId, instance);
    }

    instance.lastAccessed = new Date();
    instance.accessCount++;

    return instance.service as T;
  }

  private async createRequestScoped<T>(serviceId: string, requestId: string): Promise<ServiceInstance<T>> {
    const definition = this.serviceRegistry.get(serviceId);
    if (!definition) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const dependencies = await this.resolveDependencies(definition.dependencies, { requestId });
    const service = await definition.factory.create(this, dependencies, definition.configuration);

    const instance: ServiceInstance<T> = {
      service,
      definition,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      healthStatus: 'UNKNOWN',
      requestContext: requestId
    };

    return instance;
  }

  private async getSessionScoped<T>(serviceId: string, sessionId: string): Promise<T> {
    // Similar to request-scoped but for session context
    let sessionMap = this.sessionInstances.get(sessionId);
    if (!sessionMap) {
      sessionMap = new Map();
      this.sessionInstances.set(sessionId, sessionMap);
    }

    let instance = sessionMap.get(serviceId);
    if (!instance) {
      instance = await this.createSessionScoped<T>(serviceId, sessionId);
      sessionMap.set(serviceId, instance);
    }

    instance.lastAccessed = new Date();
    instance.accessCount++;

    return instance.service as T;
  }

  private async createSessionScoped<T>(serviceId: string, sessionId: string): Promise<ServiceInstance<T>> {
    const definition = this.serviceRegistry.get(serviceId);
    if (!definition) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const dependencies = await this.resolveDependencies(definition.dependencies, { sessionId });
    const service = await definition.factory.create(this, dependencies, definition.configuration);

    const instance: ServiceInstance<T> = {
      service,
      definition,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      healthStatus: 'UNKNOWN',
      sessionContext: sessionId
    };

    return instance;
  }

  private async createTransient<T>(serviceId: string, context?: { requestId?: string; sessionId?: string }): Promise<T> {
    const definition = this.serviceRegistry.get(serviceId);
    if (!definition) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const dependencies = await this.resolveDependencies(definition.dependencies, context);
    const service = await definition.factory.create(this, dependencies, definition.configuration);

    if (this.configuration.enableMetrics) {
      const metrics = this.serviceMetrics.get(serviceId);
      if (metrics) {
        metrics.creationCount++;
      }
    }

    return service;
  }

  private async resolveDependencies(dependencies: string[], context?: { requestId?: string; sessionId?: string }): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};

    for (const depId of dependencies) {
      resolved[depId] = await this.get(depId, context);
    }

    return resolved;
  }

  private setupHealthCheck(definition: ServiceDefinition): void {
    if (!definition.healthCheck || !this.configuration.enableHealthChecks) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const isHealthy = await definition.healthCheck!();
        const instance = this.singletonInstances.get(definition.id);
        if (instance) {
          instance.healthStatus = isHealthy ? 'HEALTHY' : 'UNHEALTHY';
        }

        if (!isHealthy) {
          this.emit('serviceUnhealthy', { serviceId: definition.id, name: definition.name });
        }
      } catch (error: unknown) {
        const instance = this.singletonInstances.get(definition.id);
        if (instance) {
          instance.healthStatus = 'UNHEALTHY';
        }

        if (this.configuration.enableMetrics) {
          const metrics = this.serviceMetrics.get(definition.id);
          if (metrics) {
            metrics.healthCheckFailures++;
          }
        }

        this.emit('healthCheckError', { serviceId: definition.id, error });
      }
    }, this.configuration.healthCheckInterval);

    this.healthCheckIntervals.set(definition.id, interval);
  }

  private updateAccessMetrics(serviceId: string, responseTime: number): void {
    const metrics = this.serviceMetrics.get(serviceId);
    if (metrics) {
      metrics.accessCount++;
      metrics.lastAccessed = new Date();
      
      // Update average creation time (simple moving average)
      const currentAvg = metrics.averageCreationTime;
      const count = metrics.creationCount;
      metrics.averageCreationTime = count > 0 ? ((currentAvg * count) + responseTime) / (count + 1) : responseTime;
    }
  }

  private cleanupExpiredInstances(): void {
    const cutoffTime = new Date(Date.now() - 3600000); // 1 hour ago

    try {
      // Clean up request-scoped instances
      for (const [requestId, requestMap] of this.requestInstances.entries()) {
        const expiredServices = Array.from(requestMap.entries()).filter(
          ([_, instance]) => instance.lastAccessed < cutoffTime
        );

        for (const [serviceId, instance] of expiredServices) {
          // Critical fix: Properly dispose of expired instances
          try {
            const definition = this.serviceRegistry.get(serviceId);
            if (definition?.dispose) {
              definition.dispose(instance.service);
            }
          } catch (error) {
            logger.warn(`Error disposing service ${serviceId}:`, error);
          }
          requestMap.delete(serviceId);
        }

        if (requestMap.size === 0) {
          this.requestInstances.delete(requestId);
        }
      }

      // Clean up session-scoped instances (longer timeout)
      const sessionCutoffTime = new Date(Date.now() - 86400000); // 24 hours ago
      for (const [sessionId, sessionMap] of this.sessionInstances.entries()) {
        const expiredServices = Array.from(sessionMap.entries()).filter(
          ([_, instance]) => instance.lastAccessed < sessionCutoffTime
        );

        for (const [serviceId, instance] of expiredServices) {
          // Critical fix: Properly dispose of expired session instances
          try {
            const definition = this.serviceRegistry.get(serviceId);
            if (definition?.dispose) {
              definition.dispose(instance.service);
            }
          } catch (error) {
            logger.warn(`Error disposing session service ${serviceId}:`, error);
          }
          sessionMap.delete(serviceId);
        }

        if (sessionMap.size === 0) {
          this.sessionInstances.delete(sessionId);
        }
      }
    } catch (error) {
      logger.error('Error during instance cleanup:', error);
    }
  }

  private setupGracefulShutdown(): void {
    process.on('SIGINT', () => {
      this.shutdown().then(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      this.shutdown().then(() => process.exit(0));
    });
  }
}

// Utility decorators and helpers for service registration
export function Injectable(config: Partial<ServiceDefinition> = {}) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const serviceId = config.id || constructor.name;
    const definition: ServiceDefinition = {
      id: serviceId,
      name: config.name || constructor.name,
      factory: {
        create: async (container, dependencies, serviceConfig) => {
          return new constructor(dependencies, serviceConfig);
        }
      },
      dependencies: config.dependencies || [],
      scope: config.scope || 'SINGLETON',
      lifecycle: config.lifecycle || 'LAZY',
      tags: config.tags || [],
      configuration: config.configuration,
      healthCheck: config.healthCheck,
      dispose: config.dispose,
      metadata: {
        version: config.metadata?.version || '1.0.0',
        author: config.metadata?.author || 'Unknown',
        description: config.metadata?.description || `Service: ${constructor.name}`,
        createdAt: new Date(),
        lastModified: new Date()
      }
    };

    // Auto-register with container
    const container = EnterpriseContainer.getInstance();
    container.register(definition);

    return constructor;
  };
}

// Export container instance
export const container = EnterpriseContainer.getInstance();