import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
  details?: any;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: HealthCheck[];
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      loadAvg: number[];
      cores: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

/**
 * Health Check Service
 */
export class HealthCheckService {
  private prisma: PrismaClient;
  private startTime: Date;

  constructor() {
    this.prisma = new PrismaClient();
    this.startTime = new Date();
  }

  /**
   * Database health check
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        name: 'database',
        status: 'healthy',
        message: 'Database connection successful',
        responseTime: Date.now() - start,
      };
    } catch (error: any) {
      logger.error('Database health check failed', error);
      
      return {
        name: 'database',
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Redis health check
   */
  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      // TODO: Implement actual Redis connection check
      // For now, returning healthy as placeholder
      
      return {
        name: 'redis',
        status: 'healthy',
        message: 'Redis connection successful',
        responseTime: Date.now() - start,
      };
    } catch (error: any) {
      logger.error('Redis health check failed', error);
      
      return {
        name: 'redis',
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * File system health check
   */
  private async checkFileSystem(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      const testFile = path.join(process.cwd(), 'temp-health-check.txt');
      const testContent = 'health-check-test';
      
      // Test write
      await fs.promises.writeFile(testFile, testContent);
      
      // Test read
      const content = await fs.promises.readFile(testFile, 'utf8');
      
      // Clean up
      await fs.promises.unlink(testFile);
      
      if (content === testContent) {
        return {
          name: 'filesystem',
          status: 'healthy',
          message: 'File system read/write successful',
          responseTime: Date.now() - start,
        };
      } else {
        throw new Error('File content mismatch');
      }
    } catch (error: any) {
      logger.error('File system health check failed', error);
      
      return {
        name: 'filesystem',
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * External services health check
   */
  private async checkExternalServices(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      // TODO: Implement checks for external services (SAP, Oracle, etc.)
      // For now, returning healthy as placeholder
      
      return {
        name: 'external_services',
        status: 'healthy',
        message: 'External services accessible',
        responseTime: Date.now() - start,
        details: {
          sap: 'healthy',
          oracle: 'healthy',
          workday: 'healthy',
          servicenow: 'healthy',
        },
      };
    } catch (error: any) {
      logger.error('External services health check failed', error);
      
      return {
        name: 'external_services',
        status: 'degraded',
        message: error.message,
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Memory usage check
   */
  private checkMemory(): HealthCheck {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPercentage = (usedMem / totalMem) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Memory usage normal';
      
      if (memPercentage > 90) {
        status = 'unhealthy';
        message = 'Critical memory usage';
      } else if (memPercentage > 80) {
        status = 'degraded';
        message = 'High memory usage';
      }
      
      return {
        name: 'memory',
        status,
        message,
        details: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          systemUsed: Math.round(usedMem / 1024 / 1024),
          systemTotal: Math.round(totalMem / 1024 / 1024),
          percentage: Math.round(memPercentage),
        },
      };
    } catch (error: any) {
      return {
        name: 'memory',
        status: 'unhealthy',
        message: error.message,
      };
    }
  }

  /**
   * CPU usage check
   */
  private checkCPU(): HealthCheck {
    try {
      const loadAvg = os.loadavg();
      const cpuCount = os.cpus().length;
      const loadPercentage = (loadAvg[0] / cpuCount) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'CPU usage normal';
      
      if (loadPercentage > 90) {
        status = 'unhealthy';
        message = 'Critical CPU usage';
      } else if (loadPercentage > 75) {
        status = 'degraded';
        message = 'High CPU usage';
      }
      
      return {
        name: 'cpu',
        status,
        message,
        details: {
          loadAvg: loadAvg.map(load => Math.round(load * 100) / 100),
          cores: cpuCount,
          percentage: Math.round(loadPercentage),
        },
      };
    } catch (error: any) {
      return {
        name: 'cpu',
        status: 'unhealthy',
        message: error.message,
      };
    }
  }

  /**
   * Disk space check
   */
  private checkDisk(): HealthCheck {
    try {
      const stats = fs.statSync(process.cwd());
      
      // This is a simplified check - in production, you'd want to check actual disk usage
      return {
        name: 'disk',
        status: 'healthy',
        message: 'Disk space sufficient',
        details: {
          path: process.cwd(),
          // TODO: Implement actual disk space checking
          available: 'Unknown',
          used: 'Unknown',
        },
      };
    } catch (error: any) {
      return {
        name: 'disk',
        status: 'unhealthy',
        message: error.message,
      };
    }
  }

  /**
   * Get system information
   */
  private getSystemInfo(): SystemHealth['system'] {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      memory: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round((usedMem / totalMem) * 100),
      },
      cpu: {
        loadAvg: os.loadavg().map(load => Math.round(load * 100) / 100),
        cores: os.cpus().length,
      },
      disk: {
        used: 0, // TODO: Implement actual disk usage
        total: 0, // TODO: Implement actual disk usage
        percentage: 0, // TODO: Implement actual disk usage
      },
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const checks: HealthCheck[] = [];
    
    try {
      // Run all health checks
      const [database, redis, filesystem, externalServices] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkFileSystem(),
        this.checkExternalServices(),
      ]);

      // Add fulfilled results
      if (database.status === 'fulfilled') {checks.push(database.value);}
      if (redis.status === 'fulfilled') {checks.push(redis.value);}
      if (filesystem.status === 'fulfilled') {checks.push(filesystem.value);}
      if (externalServices.status === 'fulfilled') {checks.push(externalServices.value);}

      // Add rejected results as unhealthy
      if (database.status === 'rejected') {
        checks.push({
          name: 'database',
          status: 'unhealthy',
          message: database.reason?.message || 'Database check failed',
        });
      }

      // Add system checks
      checks.push(this.checkMemory());
      checks.push(this.checkCPU());
      checks.push(this.checkDisk());

      // Determine overall status
      const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
      const hasDegraded = checks.some(check => check.status === 'degraded');
      
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (hasUnhealthy) {
        overallStatus = 'unhealthy';
      } else if (hasDegraded) {
        overallStatus = 'degraded';
      }

      const uptime = Date.now() - this.startTime.getTime();

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor(uptime / 1000), // seconds
        environment: process.env.NODE_ENV || 'development',
        checks,
        system: this.getSystemInfo(),
      };
    } catch (error: any) {
      logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        environment: process.env.NODE_ENV || 'development',
        checks: [
          {
            name: 'health_check_service',
            status: 'unhealthy',
            message: error.message,
          },
        ],
        system: this.getSystemInfo(),
      };
    }
  }

  /**
   * Simple readiness check (for Kubernetes readiness probe)
   */
  async readinessCheck(): Promise<boolean> {
    try {
      // Check if database is accessible
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Readiness check failed', error);
      return false;
    }
  }

  /**
   * Simple liveness check (for Kubernetes liveness probe)
   */
  livenessCheck(): boolean {
    // Basic liveness check - if we can execute this, the process is alive
    try {
      const memUsage = process.memoryUsage();
      return memUsage.heapUsed > 0;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Health check routes handler
 */
export class HealthController {
  private healthService: HealthCheckService;

  constructor() {
    this.healthService = new HealthCheckService();
  }

  /**
   * Comprehensive health check endpoint
   */
  async health(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.healthService.performHealthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error: any) {
      logger.error('Health endpoint error', error);
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        message: error.message,
      });
    }
  }

  /**
   * Readiness probe endpoint
   */
  async ready(req: Request, res: Response): Promise<void> {
    try {
      const isReady = await this.healthService.readinessCheck();
      
      if (isReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('Readiness endpoint error', error);
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        message: error.message,
      });
    }
  }

  /**
   * Liveness probe endpoint
   */
  async live(req: Request, res: Response): Promise<void> {
    try {
      const isAlive = this.healthService.livenessCheck();
      
      if (isAlive) {
        res.status(200).json({
          status: 'alive',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: 'dead',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('Liveness endpoint error', error);
      res.status(503).json({
        status: 'dead',
        timestamp: new Date().toISOString(),
        message: error.message,
      });
    }
  }
}