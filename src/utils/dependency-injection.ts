/**
 * Enterprise Dependency Injection Container
 * Provides type-safe dependency injection with lifecycle management
 */

import { logger } from '../config/logger';
import { EnterpriseError } from '../utils/error-handling';
import { HTTP_STATUS } from '../constants';

export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped';

export interface ServiceDescriptor<T = unknown> {
  readonly name: string;
  readonly factory: ServiceFactory<T>;
  readonly lifecycle: ServiceLifecycle;
  readonly dependencies: readonly string[];
}

export interface ServiceInstance<T = unknown> {
  readonly descriptor: ServiceDescriptor<T>;
  readonly instance: T;
  readonly createdAt: Date;
  readonly accessCount: number;
  readonly lastAccessed: Date;
}

export type ServiceFactory<T> = (...dependencies: readonly unknown[]) => T;

/**
 * Dependency Injection Container
 */
export class DIContainer {
  private static instance: DIContainer;
  private readonly services = new Map<string, ServiceDescriptor>();
  private readonly singletonInstances = new Map<string, ServiceInstance>();
  private readonly scopedInstances = new Map<string, Map<string, ServiceInstance>>();
  private readonly resolutionStack: string[] = [];

  private constructor() {
    logger.info('DIContainer initialized');
  }

  /**
   * Get singleton instance of DIContainer
   */
  public static getInstance(): DIContainer {
    if (DIContainer.instance === undefined) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Register a service with the container
   */
  public register<T>(
    name: string,
    factory: ServiceFactory<T>,
    options: {
      readonly lifecycle?: ServiceLifecycle;
      readonly dependencies?: readonly string[];
    } = {}
  ): this {
    const descriptor: ServiceDescriptor<T> = {
      name,
      factory,
      lifecycle: options.lifecycle ?? 'singleton',
      dependencies: options.dependencies ?? []
    };

    // Validate dependencies exist
    for (const dependency of descriptor.dependencies) {
      if (!this.services.has(dependency)) {
        throw new EnterpriseError(
          'DEPENDENCY_NOT_FOUND',
          `Dependency '${dependency}' not found for service '${name}'`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    this.services.set(name, descriptor);
    logger.debug(`Registered service '${name}' with lifecycle '${descriptor.lifecycle}'`);
    return this;
  }

  /**
   * Resolve a service by name
   */
  public resolve<T>(name: string, scopeId?: string): T {
    const descriptor = this.services.get(name);
    if (descriptor === undefined) {
      throw new EnterpriseError(
        'SERVICE_NOT_FOUND',
        `Service '${name}' not found in container`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Check for circular dependencies
    if (this.resolutionStack.includes(name)) {
      const cycle = [...this.resolutionStack, name].join(' -> ');
      throw new EnterpriseError(
        'CIRCULAR_DEPENDENCY',
        `Circular dependency detected: ${cycle}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    try {
      this.resolutionStack.push(name);
      return this.createInstance<T>(descriptor, scopeId);
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Check if a service is registered
   */
  public isRegistered(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  public getRegisteredServices(): readonly string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Create a new scope for scoped services
   */
  public createScope(): DIScope {
    return new DIScope(this);
  }

  /**
   * Dispose of all scoped instances for a scope
   */
  public disposeScope(scopeId: string): void {
    const scopedInstances = this.scopedInstances.get(scopeId);
    if (scopedInstances !== undefined) {
      for (const [serviceName, serviceInstance] of scopedInstances) {
        this.disposeInstance(serviceInstance);
      }
      this.scopedInstances.delete(scopeId);
      logger.debug(`Disposed scope '${scopeId}' with ${scopedInstances.size} instances`);
    }
  }

  /**
   * Get container statistics
   */
  public getStatistics(): {
    readonly registeredServices: number;
    readonly singletonInstances: number;
    readonly scopedScopes: number;
    readonly totalScopedInstances: number;
  } {
    let totalScopedInstances = 0;
    for (const scopedInstances of this.scopedInstances.values()) {
      totalScopedInstances += scopedInstances.size;
    }

    return {
      registeredServices: this.services.size,
      singletonInstances: this.singletonInstances.size,
      scopedScopes: this.scopedInstances.size,
      totalScopedInstances
    };
  }

  /**
   * Internal method to create service instances
   */
  internal_createInstance<T>(descriptor: ServiceDescriptor<T>, scopeId?: string): T {
    return this.createInstance<T>(descriptor, scopeId);
  }

  // Private methods

  private createInstance<T>(descriptor: ServiceDescriptor<T>, scopeId?: string): T {
    switch (descriptor.lifecycle) {
      case 'singleton':
        return this.getSingletonInstance<T>(descriptor);
      case 'scoped':
        if (scopeId === undefined) {
          throw new EnterpriseError(
            'SCOPE_REQUIRED',
            `Scoped service '${descriptor.name}' requires a scope ID`,
            HTTP_STATUS.BAD_REQUEST
          );
        }
        return this.getScopedInstance<T>(descriptor, scopeId);
      case 'transient':
        return this.createTransientInstance<T>(descriptor);
      default:
        throw new EnterpriseError(
          'INVALID_LIFECYCLE',
          `Invalid lifecycle '${(descriptor as any).lifecycle}' for service '${descriptor.name}'`,
          HTTP_STATUS.BAD_REQUEST
        );
    }
  }

  private getSingletonInstance<T>(descriptor: ServiceDescriptor<T>): T {
    let serviceInstance = this.singletonInstances.get(descriptor.name);
    
    if (serviceInstance === undefined) {
      const instance = this.createTransientInstance<T>(descriptor);
      serviceInstance = {
        descriptor,
        instance,
        createdAt: new Date(),
        accessCount: 0,
        lastAccessed: new Date()
      };
      this.singletonInstances.set(descriptor.name, serviceInstance);
      logger.debug(`Created singleton instance for service '${descriptor.name}'`);
    }

    // Update access statistics
    serviceInstance.accessCount++;
    serviceInstance.lastAccessed = new Date();

    return serviceInstance.instance as T;
  }

  private getScopedInstance<T>(descriptor: ServiceDescriptor<T>, scopeId: string): T {
    let scopedInstances = this.scopedInstances.get(scopeId);
    if (scopedInstances === undefined) {
      scopedInstances = new Map();
      this.scopedInstances.set(scopeId, scopedInstances);
    }

    let serviceInstance = scopedInstances.get(descriptor.name);
    
    if (serviceInstance === undefined) {
      const instance = this.createTransientInstance<T>(descriptor);
      serviceInstance = {
        descriptor,
        instance,
        createdAt: new Date(),
        accessCount: 0,
        lastAccessed: new Date()
      };
      scopedInstances.set(descriptor.name, serviceInstance);
      logger.debug(`Created scoped instance for service '${descriptor.name}' in scope '${scopeId}'`);
    }

    // Update access statistics
    serviceInstance.accessCount++;
    serviceInstance.lastAccessed = new Date();

    return serviceInstance.instance as T;
  }

  private createTransientInstance<T>(descriptor: ServiceDescriptor<T>): T {
    // Resolve dependencies
    const dependencies = descriptor.dependencies.map(dep => this.resolve(dep));
    
    // Create instance
    const instance = descriptor.factory(...dependencies);
    logger.debug(`Created transient instance for service '${descriptor.name}'`);
    
    return instance;
  }

  private disposeInstance(serviceInstance: ServiceInstance): void {
    // If the instance has a dispose method, call it
    if (typeof (serviceInstance.instance as any).dispose === 'function') {
      try {
        (serviceInstance.instance as any).dispose();
      } catch (error) {
        logger.error(`Error disposing service '${serviceInstance.descriptor.name}':`, error);
      }
    }
  }
}

/**
 * Scoped dependency injection container
 */
export class DIScope {
  private readonly container: DIContainer;
  private readonly scopeId: string;
  private readonly disposed = false;

  constructor(container: DIContainer) {
    this.container = container;
    this.scopeId = `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Resolve a service within this scope
   */
  public resolve<T>(name: string): T {
    if (this.disposed) {
      throw new EnterpriseError(
        'SCOPE_DISPOSED',
        'Cannot resolve services from a disposed scope',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    return this.container.resolve<T>(name, this.scopeId);
  }

  /**
   * Dispose this scope and all scoped instances
   */
  public dispose(): void {
    if (!this.disposed) {
      this.container.disposeScope(this.scopeId);
      Object.defineProperty(this, 'disposed', { value: true });
    }
  }

  /**
   * Get the scope ID
   */
  public getScopeId(): string {
    return this.scopeId;
  }
}

/**
 * Service decorator for automatic registration
 */
export function Service(options: {
  readonly name?: string;
  readonly lifecycle?: ServiceLifecycle;
  readonly dependencies?: readonly string[];
} = {}) {
  return function <T extends new (...args: any[]) => any>(constructor: T): T {
    const serviceName = options.name ?? constructor.name;
    const container = DIContainer.getInstance();

    container.register(
      serviceName,
      (...dependencies) => new constructor(...dependencies),
      {
        lifecycle: options.lifecycle ?? 'singleton',
        dependencies: options.dependencies
      }
    );

    return constructor;
  };
}

/**
 * Inject decorator for automatic dependency injection
 */
export function Inject(serviceName: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // Store metadata for dependency injection
    const existingTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    const existingInjects = Reflect.getMetadata('inject:services', target) || {};
    
    existingInjects[parameterIndex] = serviceName;
    Reflect.defineMetadata('inject:services', existingInjects, target);
  };
}

// Export singleton instance
export const container = DIContainer.getInstance();