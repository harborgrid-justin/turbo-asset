/**
 * Enterprise Process Management & Graceful Shutdown
 * Production-grade process lifecycle management
 */

import { logger } from '@/config/enterprise-logger';
import { EventEmitter } from 'events';

export interface ProcessHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  pid: number;
  memory: NodeJS.MemoryUsage;
  cpu: {
    user: number;
    system: number;
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  gc?: {
    collections: number;
    duration: number;
  };
  handles: {
    active: number;
  };
  dependencies: {
    database: boolean;
    redis?: boolean;
    external?: Record<string, boolean>;
  };
}

export interface GracefulShutdownConfig {
  shutdownTimeout: number;
  healthCheckInterval: number;
  enableGCMonitoring: boolean;
  memoryThreshold: number;
  cpuThreshold: number;
  eventLoopLagThreshold: number;
}

class ProcessManager extends EventEmitter {
  private static instance: ProcessManager;
  private readonly startTime: number = Date.now();
  private shutdownTimeout: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private gcStats: { collections: number; duration: number } | null = null;
  private config: GracefulShutdownConfig;
  private readonly shutdownCallbacks: Array<() => Promise<void>> = [];

  private constructor() {
    super();
    
    this.config = {
      shutdownTimeout: 30000, // 30 seconds
      healthCheckInterval: 10000, // 10 seconds
      enableGCMonitoring: true,
      memoryThreshold: 0.9, // 90% of heap
      cpuThreshold: 0.8, // 80% CPU usage
      eventLoopLagThreshold: 100, // 100ms
    };

    this.setupProcessHandlers();
    this.setupHealthMonitoring();
    this.setupGCMonitoring();
  }

  public static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }

  private setupProcessHandlers(): void {
    // Graceful shutdown signals
    process.on('SIGTERM', this.handleShutdownSignal('SIGTERM'));
    process.on('SIGINT', this.handleShutdownSignal('SIGINT'));
    process.on('SIGUSR2', this.handleShutdownSignal('SIGUSR2')); // Nodemon restart

    // Error handlers
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception - Process will exit', error, {
        pid: process.pid,
        timestamp: new Date().toISOString(),
        stack: error.stack,
      });

      // Give some time to log the error, then exit
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Promise Rejection', reason, {
        pid: process.pid,
        timestamp: new Date().toISOString(),
        promise: promise.toString(),
      });

      // For production, you might want to exit the process
      // For now, we'll just log and continue
      this.emit('unhandledRejection', reason, promise);
    });

    // Memory warnings
    process.on('warning', (warning: Error) => {
      logger.warn('Process warning', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
      });

      if (warning.name === 'MaxListenersExceededWarning') {
        this.emit('memoryLeak', warning);
      }
    });

    // Process exit handler
    process.on('exit', (code: number) => {
      logger.info('Process exiting', {
        code,
        uptime: Date.now() - this.startTime,
        pid: process.pid,
      });
    });
  }

  private handleShutdownSignal(signal: string) {
    return async () => {
      if (this.isShuttingDown) {
        logger.warn(`Received ${signal} during shutdown, forcing exit`);
        process.exit(1);
      }

      logger.info(`Received ${signal}, initiating graceful shutdown`);
      await this.gracefulShutdown();
    };
  }

  private setupHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getProcessHealth();
        
        // Check for critical conditions
        if (health.status === 'unhealthy') {
          logger.error('Process health critical', health);
          this.emit('healthCritical', health);
        } else if (health.status === 'degraded') {
          logger.warn('Process health degraded', health);
          this.emit('healthDegraded', health);
        }

        // Check memory usage
        const memoryUsage = health.memory.heapUsed / health.memory.heapTotal;
        if (memoryUsage > this.config.memoryThreshold) {
          logger.warn('High memory usage detected', {
            usage: `${Math.round(memoryUsage * 100)}%`,
            heapUsed: `${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(health.memory.heapTotal / 1024 / 1024)}MB`,
          });
          this.emit('memoryWarning', health.memory);
        }

        // Check event loop lag
        if (health.eventLoop.lag > this.config.eventLoopLagThreshold) {
          logger.warn('High event loop lag detected', {
            lag: `${health.eventLoop.lag}ms`,
            threshold: `${this.config.eventLoopLagThreshold}ms`,
          });
          this.emit('eventLoopLag', health.eventLoop);
        }

        this.emit('healthCheck', health);

      } catch (error) {
        logger.error('Health check failed', error);
      }
    }, this.config.healthCheckInterval);
  }

  private setupGCMonitoring(): void {
    if (!this.config.enableGCMonitoring) {return;}

    try {
      // Try to enable GC monitoring if perf_hooks is available
      const perfHooks = require('perf_hooks');
      if (perfHooks.PerformanceObserver) {
        const obs = new perfHooks.PerformanceObserver((list: any) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === 'gc') {
              if (!this.gcStats) {
                this.gcStats = { collections: 0, duration: 0 };
              }
              this.gcStats.collections++;
              this.gcStats.duration += entry.duration;

              if (entry.duration > 100) { // Log slow GC
                logger.warn('Slow garbage collection detected', {
                  duration: `${entry.duration.toFixed(2)}ms`,
                  kind: entry.detail?.kind || 'unknown',
                });
              }
            }
          }
        });

        obs.observe({ entryTypes: ['gc'] });
        logger.info('GC monitoring enabled');
      }
    } catch (error) {
      logger.warn('Failed to enable GC monitoring', error);
    }
  }

  /**
   * Get comprehensive process health status
   */
  public async getProcessHealth(): Promise<ProcessHealthStatus> {
    // Measure event loop lag
    const eventLoopLag = await this.measureEventLoopLag();
    
    // Check dependencies - simplified for now
    const dependencies = {
      database: true, // Will be enhanced when database manager is integrated
    };

    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!dependencies.database) {
      status = 'unhealthy';
    } else if (
      eventLoopLag > this.config.eventLoopLagThreshold ||
      (memory.heapUsed / memory.heapTotal) > this.config.memoryThreshold
    ) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      pid: process.pid,
      memory,
      cpu: {
        user: cpuUsage.user / 1000, // Convert to milliseconds
        system: cpuUsage.system / 1000,
      },
      eventLoop: {
        lag: eventLoopLag,
        utilization: this.calculateEventLoopUtilization(),
      },
      gc: this.gcStats ? { ...this.gcStats } : undefined,
      handles: {
        active: (process as any)._getActiveHandles()?.length || 0,
      },
      dependencies,
    };
  }

  private async measureEventLoopLag(): Promise<number> {
    return await new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        resolve(lag);
      });
    });
  }

  private calculateEventLoopUtilization(): number {
    try {
      // Try to use perf_hooks if available
      const perfHooks = require('perf_hooks');
      if (perfHooks.performance.eventLoopUtilization) {
        const elu = perfHooks.performance.eventLoopUtilization();
        return elu.utilization || 0;
      }
    } catch (error) {
      // Fallback or ignore if not available
    }
    return 0;
  }

  /**
   * Register a callback to be called during graceful shutdown
   */
  public registerShutdownCallback(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Perform graceful shutdown
   */
  public async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    const shutdownStart = Date.now();

    logger.info('Starting graceful shutdown process');

    // Set a timeout to force exit if shutdown takes too long
    this.shutdownTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, this.config.shutdownTimeout);

    try {
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Execute shutdown callbacks in parallel
      logger.info(`Executing ${this.shutdownCallbacks.length} shutdown callbacks`);
      await Promise.all(
        this.shutdownCallbacks.map(async (callback, index) => {
          try {
            await callback();
            logger.debug(`Shutdown callback ${index + 1} completed`);
          } catch (error) {
            logger.error(`Shutdown callback ${index + 1} failed`, error);
          }
        })
      );

      // Final log
      const shutdownDuration = Date.now() - shutdownStart;
      logger.info('Graceful shutdown completed', {
        duration: `${shutdownDuration}ms`,
        uptime: Date.now() - this.startTime,
      });

      // Clear the timeout since we're shutting down gracefully
      if (this.shutdownTimeout) {
        clearTimeout(this.shutdownTimeout);
      }

      // Exit successfully
      process.exit(0);

    } catch (error) {
      const shutdownDuration = Date.now() - shutdownStart;
      logger.error('Graceful shutdown failed', error, {
        duration: `${shutdownDuration}ms`,
      });

      // Clear timeout and force exit
      if (this.shutdownTimeout) {
        clearTimeout(this.shutdownTimeout);
      }

      process.exit(1);
    }
  }

  /**
   * Force process restart (for development)
   */
  public async restart(): Promise<void> {
    logger.info('Restarting process');
    await this.gracefulShutdown();
  }

  /**
   * Get process uptime in milliseconds
   */
  public getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Check if process is shutting down
   */
  public isShuttingDownProcess(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Trigger manual health check
   */
  public async triggerHealthCheck(): Promise<ProcessHealthStatus> {
    return await this.getProcessHealth();
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<GracefulShutdownConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Process manager configuration updated', config);
  }
}

// Export singleton instance
export const processManager = ProcessManager.getInstance();

// Export types
export { ProcessManager };

// Health check middleware for HTTP endpoints
export function processHealthMiddleware() {
  return async (req: any, res: any, next: any) => {
    try {
      const health = await processManager.getProcessHealth();
      
      if (health.status === 'unhealthy') {
        return res.status(503).json({
          status: 'unhealthy',
          message: 'Process is unhealthy',
          health,
        });
      }

      req.processHealth = health;
      next();
    } catch (error) {
      logger.error('Process health check failed', error);
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
      });
    }
  };
}