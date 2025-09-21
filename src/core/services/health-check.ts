/**
 * Enterprise-grade health check service
 * Provides comprehensive health monitoring for production deployments
 */

import { Request, Response } from 'express';
import { getLogger, LogContext, createTimer, CorrelationId } from '../config/enterprise-logger';
import { getEnvironmentConfig } from '../config/environment-validation';

/**
 * Health check status enum
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly duration: number;
  readonly details?: Record<string, unknown>;
  readonly error?: string;
}

/**
 * Component health check interface
 */
export interface ComponentHealthCheck {
  readonly name: string;
  readonly critical: boolean;
  check(): Promise<HealthCheckResult>;
}

/**
 * Overall system health response
 */
export interface SystemHealthResponse {
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly version: string;
  readonly environment: string;
  readonly uptime: number;
  readonly components: Record<string, HealthCheckResult>;
  readonly summary: {
    readonly total: number;
    readonly healthy: number;
    readonly degraded: number;
    readonly unhealthy: number;
  };
}

/**
 * Database health check
 */
class DatabaseHealthCheck implements ComponentHealthCheck {
  readonly name = 'database';
  readonly critical = true;

  async check(): Promise<HealthCheckResult> {
    const timer = createTimer('health-check-database');
    const startTime = Date.now();
    
    try {
      // Mock database connection check - replace with actual database client
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const duration = timer.end();
      
      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date().toISOString(),
        duration,
        details: {
          connection: 'active',
          pool: {
            active: 5,
            idle: 10,
            total: 15
          }
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        duration,
        error: errorMessage
      };
    }
  }
}

/**
 * Redis health check
 */
class RedisHealthCheck implements ComponentHealthCheck {
  readonly name = 'redis';
  readonly critical = false;

  async check(): Promise<HealthCheckResult> {
    const timer = createTimer('health-check-redis');
    const startTime = Date.now();
    
    try {
      // Mock Redis connection check - replace with actual Redis client
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const duration = timer.end();
      
      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date().toISOString(),
        duration,
        details: {
          connection: 'active',
          memory: '128MB',
          keys: 1024
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
      
      return {
        status: HealthStatus.DEGRADED, // Non-critical component
        timestamp: new Date().toISOString(),
        duration,
        error: errorMessage
      };
    }
  }
}

/**
 * External service health check
 */
class ExternalServiceHealthCheck implements ComponentHealthCheck {
  readonly name: string;
  readonly critical: boolean;
  private readonly serviceUrl: string;

  constructor(name: string, serviceUrl: string, critical: boolean = false) {
    this.name = name;
    this.serviceUrl = serviceUrl;
    this.critical = critical;
  }

  async check(): Promise<HealthCheckResult> {
    const timer = createTimer(`health-check-${this.name}`);
    const startTime = Date.now();
    
    try {
      // Mock external service check - replace with actual HTTP client
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const duration = timer.end();
      
      return {
        status: HealthStatus.HEALTHY,
        timestamp: new Date().toISOString(),
        duration,
        details: {
          url: this.serviceUrl,
          responseTime: `${duration}ms`
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown service error';
      
      return {
        status: this.critical ? HealthStatus.UNHEALTHY : HealthStatus.DEGRADED,
        timestamp: new Date().toISOString(),
        duration,
        error: errorMessage
      };
    }
  }
}

/**
 * Memory health check
 */
class MemoryHealthCheck implements ComponentHealthCheck {
  readonly name = 'memory';
  readonly critical = true;
  private readonly thresholds = {
    warning: 0.8,  // 80%
    critical: 0.95 // 95%
  };

  async check(): Promise<HealthCheckResult> {
    const timer = createTimer('health-check-memory');
    
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUtilization = usedMemory / totalMemory;
      
      let status = HealthStatus.HEALTHY;
      
      if (memoryUtilization >= this.thresholds.critical) {
        status = HealthStatus.UNHEALTHY;
      } else if (memoryUtilization >= this.thresholds.warning) {
        status = HealthStatus.DEGRADED;
      }
      
      const duration = timer.end();
      
      return {
        status,
        timestamp: new Date().toISOString(),
        duration,
        details: {
          heapUsed: `${Math.round(usedMemory / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(totalMemory / 1024 / 1024)}MB`,
          utilization: `${Math.round(memoryUtilization * 100)}%`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
        }
      };
    } catch (error) {
      const duration = timer.end();
      const errorMessage = error instanceof Error ? error.message : 'Unknown memory error';
      
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        duration,
        error: errorMessage
      };
    }
  }
}

/**
 * Enterprise health check service
 */
export class EnterpriseHealthCheckService {
  private readonly logger = getLogger();
  private readonly components: ComponentHealthCheck[] = [];
  private readonly startTime = Date.now();

  constructor() {
    this.registerDefaultComponents();
  }

  /**
   * Register default health check components
   */
  private registerDefaultComponents(): void {
    this.components.push(
      new DatabaseHealthCheck(),
      new RedisHealthCheck(),
      new MemoryHealthCheck(),
      new ExternalServiceHealthCheck('external-api', 'https://api.example.com/health')
    );
  }

  /**
   * Register a custom health check component
   */
  registerComponent(component: ComponentHealthCheck): void {
    this.components.push(component);
    this.logger.info('Health check component registered', { component: component.name });
  }

  /**
   * Perform health check for a specific component
   */
  async checkComponent(componentName: string): Promise<HealthCheckResult | null> {
    const component = this.components.find(c => c.name === componentName);
    if (!component) {
      return null;
    }

    try {
      return await component.check();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Health check failed for component: ${componentName}`, undefined, error instanceof Error ? error : new Error(errorMessage));
      
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        duration: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Perform comprehensive system health check
   */
  async checkSystemHealth(): Promise<SystemHealthResponse> {
    const env = getEnvironmentConfig();
    const correlationId = `health-${Date.now()}` as CorrelationId;
    const context: LogContext = { correlationId };
    
    const timer = createTimer('system-health-check', context);
    
    this.logger.info('Starting system health check', context);

    // Run all component health checks in parallel
    const componentChecks = await Promise.allSettled(
      this.components.map(async (component) => ({
        name: component.name,
        result: await component.check()
      }))
    );

    // Process results
    const componentResults: Record<string, HealthCheckResult> = {};
    let overallStatus = HealthStatus.HEALTHY;
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;

    for (const check of componentChecks) {
      if (check.status === 'fulfilled') {
        const { name, result } = check.value;
        componentResults[name] = result;
        
        // Determine overall system status based on critical components
        const component = this.components.find(c => c.name === name);
        const isCritical = component?.critical ?? false;
        
        switch (result.status) {
          case HealthStatus.HEALTHY:
            healthyCount++;
            break;
          case HealthStatus.DEGRADED:
            degradedCount++;
            if (isCritical && overallStatus === HealthStatus.HEALTHY) {
              overallStatus = HealthStatus.DEGRADED;
            }
            break;
          case HealthStatus.UNHEALTHY:
            unhealthyCount++;
            if (isCritical) {
              overallStatus = HealthStatus.UNHEALTHY;
            } else if (overallStatus === HealthStatus.HEALTHY) {
              overallStatus = HealthStatus.DEGRADED;
            }
            break;
        }
      } else {
        // Handle rejected promise
        const errorName = `unknown-component-${unhealthyCount}`;
        componentResults[errorName] = {
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date().toISOString(),
          duration: 0,
          error: check.reason?.message || 'Unknown error'
        };
        unhealthyCount++;
        overallStatus = HealthStatus.UNHEALTHY;
      }
    }

    timer.end();

    const response: SystemHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      uptime: Date.now() - this.startTime,
      components: componentResults,
      summary: {
        total: this.components.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount
      }
    };

    this.logger.info('System health check completed', { 
      ...context, 
      status: overallStatus,
      summary: response.summary 
    });

    return response;
  }
}

// Singleton instance
let healthServiceInstance: EnterpriseHealthCheckService | null = null;

/**
 * Get the singleton health check service instance
 */
export function getHealthCheckService(): EnterpriseHealthCheckService {
  if (!healthServiceInstance) {
    healthServiceInstance = new EnterpriseHealthCheckService();
  }
  return healthServiceInstance;
}

/**
 * Health check endpoint handlers
 */
export const healthCheckHandlers = {
  /**
   * Basic health check endpoint
   */
  async basic(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  },

  /**
   * Detailed health check endpoint
   */
  async detailed(req: Request, res: Response): Promise<void> {
    try {
      const healthService = getHealthCheckService();
      const healthData = await healthService.checkSystemHealth();
      
      const statusCode = healthData.status === HealthStatus.HEALTHY ? 200 :
                        healthData.status === HealthStatus.DEGRADED ? 200 : 503;
      
      res.status(statusCode).json(healthData);
    } catch (error) {
      const logger = getLogger();
      logger.error('Health check endpoint error', undefined, error instanceof Error ? error : new Error('Unknown error'));
      
      res.status(503).json({
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        error: 'Health check service unavailable'
      });
    }
  },

  /**
   * Component-specific health check endpoint
   */
  async component(req: Request, res: Response): Promise<void> {
    const { component } = req.params;
    
    try {
      const healthService = getHealthCheckService();
      const result = await healthService.checkComponent(component);
      
      if (!result) {
        res.status(404).json({
          status: 'not_found',
          timestamp: new Date().toISOString(),
          error: `Component '${component}' not found`
        });
        return;
      }
      
      const statusCode = result.status === HealthStatus.HEALTHY ? 200 :
                        result.status === HealthStatus.DEGRADED ? 200 : 503;
      
      res.status(statusCode).json(result);
    } catch (error) {
      const logger = getLogger();
      logger.error(`Component health check error: ${component}`, undefined, error instanceof Error ? error : new Error('Unknown error'));
      
      res.status(503).json({
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        error: 'Component health check failed'
      });
    }
  }
};