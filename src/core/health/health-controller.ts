/**
 * Enterprise-Grade Health Check System
 * Comprehensive health monitoring for production readiness
 */

import { Request, Response } from 'express';
import { logger } from '@/config/logger';
import { getEnvironmentConfig } from '@/config/environment-validation';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, CheckResult>;
  metadata?: Record<string, unknown>;
}

export interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthChecker {
  name: string;
  check(): Promise<CheckResult>;
  timeout?: number;
  critical?: boolean;
}

export class HealthController {
  private readonly checkers: Map<string, HealthChecker> = new Map();
  private readonly startTime = Date.now();
  private readonly config = getEnvironmentConfig();

  constructor() {
    this.registerDefaultCheckers();
  }

  /**
   * Register a health checker
   */
  public registerChecker(checker: HealthChecker): void {
    this.checkers.set(checker.name, checker);
  }

  /**
   * Unregister a health checker
   */
  public unregisterChecker(name: string): void {
    this.checkers.delete(name);
  }

  /**
   * Perform all health checks
   */
  public async performHealthChecks(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: Record<string, CheckResult> = {};
    const promises: Array<Promise<void>> = [];

    for (const [name, checker] of this.checkers) {
      const promise = this.executeChecker(name, checker)
        .then(result => {
          checks[name] = result;
        })
        .catch(error => {
          checks[name] = {
            status: 'fail',
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        });

      promises.push(promise);
    }

    await Promise.all(promises);

    const overallStatus = this.determineOverallStatus(checks);
    const duration = Date.now() - startTime;

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: this.config.NODE_ENV,
      checks,
      metadata: {
        totalChecks: this.checkers.size,
        duration,
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        memory: process.memoryUsage(),
        pid: process.pid,
      },
    };

    return result;
  }

  /**
   * Health endpoint handler
   */
  public async health(req: Request, res: Response): Promise<void> {
    try {
      const healthResult = await this.performHealthChecks();
      
      const statusCode = healthResult.status === 'healthy' ? 200 :
                        healthResult.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(healthResult);

      if (healthResult.status !== 'healthy') {
        logger.warn('Health check failed', {
          status: healthResult.status,
          failedChecks: Object.entries(healthResult.checks)
            .filter(([, result]) => result.status === 'fail')
            .map(([name]) => name),
        });
      }
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check system failure',
      });
    }
  }

  /**
   * Readiness endpoint handler
   */
  public async ready(req: Request, res: Response): Promise<void> {
    try {
      const healthResult = await this.performHealthChecks();
      
      // Readiness check focuses on critical dependencies
      const criticalChecks = Object.entries(healthResult.checks)
        .filter(([name]) => this.checkers.get(name)?.critical !== false);

      const readyStatus = criticalChecks.every(([, result]) => result.status !== 'fail');

      if (readyStatus) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          checks: Object.fromEntries(criticalChecks),
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          checks: Object.fromEntries(criticalChecks),
        });
      }
    } catch (error) {
      logger.error('Readiness check error:', error);
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Readiness check system failure',
      });
    }
  }

  /**
   * Liveness endpoint handler
   */
  public async live(req: Request, res: Response): Promise<void> {
    // Liveness check should be lightweight - just verify the process is responsive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      pid: process.pid,
    });
  }

  private async executeChecker(name: string, checker: HealthChecker): Promise<CheckResult> {
    const startTime = Date.now();
    const timeout = checker.timeout || 5000;

    const timeoutPromise = new Promise<CheckResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check '${name}' timed out after ${timeout}ms`));
      }, timeout);
    });

    const checkPromise = checker.check();

    try {
      const result = await Promise.race([checkPromise, timeoutPromise]);
      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private determineOverallStatus(checks: Record<string, CheckResult>): 'healthy' | 'degraded' | 'unhealthy' {
    const results = Object.values(checks);
    
    if (results.length === 0) {
      return 'healthy';
    }

    const hasFailure = results.some(result => result.status === 'fail');
    const hasWarning = results.some(result => result.status === 'warn');

    if (hasFailure) {
      return 'unhealthy';
    } else if (hasWarning) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private registerDefaultCheckers(): void {
    // Database health checker
    this.registerChecker({
      name: 'database',
      critical: true,
      timeout: 10000,
      async check(): Promise<CheckResult> {
        try {
          const { PrismaClient } = await import('@prisma/client');
          const prisma = new PrismaClient();
          
          const startTime = Date.now();
          await prisma.$queryRaw`SELECT 1`;
          await prisma.$disconnect();
          
          return {
            status: 'pass',
            duration: Date.now() - startTime,
            metadata: {
              connected: true,
            },
          };
        } catch (error) {
          return {
            status: 'fail',
            duration: 0,
            error: error instanceof Error ? error.message : 'Database connection failed',
          };
        }
      },
    });

    // Redis health checker
    this.registerChecker({
      name: 'redis',
      critical: true,
      timeout: 5000,
      async check(): Promise<CheckResult> {
        try {
          const redis = await import('redis');
          const client = redis.createClient({ url: this.config.REDIS_URL });
          
          const startTime = Date.now();
          await client.connect();
          await client.ping();
          await client.disconnect();
          
          return {
            status: 'pass',
            duration: Date.now() - startTime,
            metadata: {
              connected: true,
            },
          };
        } catch (error) {
          return {
            status: 'fail',
            duration: 0,
            error: error instanceof Error ? error.message : 'Redis connection failed',
          };
        }
      },
    });

    // Memory usage checker
    this.registerChecker({
      name: 'memory',
      critical: false,
      async check(): Promise<CheckResult> {
        const usage = process.memoryUsage();
        const totalMB = usage.heapTotal / 1024 / 1024;
        const usedMB = usage.heapUsed / 1024 / 1024;
        const usagePercent = (usedMB / totalMB) * 100;

        let status: 'pass' | 'warn' | 'fail' = 'pass';
        if (usagePercent > 90) {
          status = 'fail';
        } else if (usagePercent > 75) {
          status = 'warn';
        }

        return {
          status,
          duration: 0,
          metadata: {
            heapUsed: Math.round(usedMB),
            heapTotal: Math.round(totalMB),
            usagePercent: Math.round(usagePercent),
            external: Math.round(usage.external / 1024 / 1024),
          },
        };
      },
    });

    // Disk space checker (logs directory)
    this.registerChecker({
      name: 'disk_space',
      critical: false,
      async check(): Promise<CheckResult> {
        try {
          const fs = await import('fs');
          const path = await import('path');
          
          const logsDir = path.join(process.cwd(), 'logs');
          
          if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
          }
          
          const stats = fs.statSync(logsDir);
          
          return {
            status: 'pass',
            duration: 0,
            metadata: {
              path: logsDir,
              accessible: true,
            },
          };
        } catch (error) {
          return {
            status: 'warn',
            duration: 0,
            error: error instanceof Error ? error.message : 'Disk space check failed',
          };
        }
      },
    });
  }
}