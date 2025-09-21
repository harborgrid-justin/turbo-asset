/**
 * Enterprise-Grade Logging System
 * Advanced logging with correlation IDs, structured formats, and performance metrics
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { getEnvironmentConfig } from '@/config/environment-validation';
import path from 'path';
import fs from 'fs';

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  organizationId?: string;
  service?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a correlation ID for tracking requests across services
 */
export function createCorrelationId(): string {
  return uuidv4();
}

/**
 * Enhanced logger with enterprise features
 */
class EnterpriseLogger {
  private winston: winston.Logger;
  private config = getEnvironmentConfig();
  private performanceMetrics: PerformanceMetrics[] = [];
  private readonly maxMetricsBuffer = 1000;

  constructor() {
    this.ensureLogDirectory();
    this.winston = this.createWinstonLogger();
    this.setupPerformanceMetricsCleanup();
  }

  private ensureLogDirectory(): void {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private createWinstonLogger(): winston.Logger {
    const formats = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    ];

    // Add different formats for different environments
    if (this.config.NODE_ENV === 'production') {
      formats.push(winston.format.json());
    } else {
      formats.push(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, metadata }) => {
          const metaStr = Object.keys(metadata).length > 0 ? 
            '\n' + JSON.stringify(metadata, null, 2) : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      );
    }

    const transports: winston.transport[] = [
      // Error logs
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),
      // Combined logs
      new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
      }),
      // Performance logs
      new winston.transports.File({
        filename: path.join('logs', 'performance.log'),
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format((info) => {
            return info.operation ? info : false;
          })()
        ),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),
      // Audit logs
      new winston.transports.File({
        filename: path.join('logs', 'audit.log'),
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format((info) => {
            return info.audit ? info : false;
          })()
        ),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
      }),
    ];

    // Add console transport for non-production environments
    if (this.config.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(...formats),
        })
      );
    }

    return winston.createLogger({
      level: this.config.LOG_LEVEL,
      format: winston.format.combine(...formats),
      defaultMeta: { 
        service: 'turbo-asset',
        environment: this.config.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        pid: process.pid,
      },
      transports,
      exitOnError: false,
    });
  }

  /**
   * Enhanced logging methods with context support
   */
  public debug(message: string, context?: LogContext): void {
    this.winston.debug(message, this.enrichContext(context));
  }

  public info(message: string, context?: LogContext): void {
    this.winston.info(message, this.enrichContext(context));
  }

  public warn(message: string, context?: LogContext): void {
    this.winston.warn(message, this.enrichContext(context));
  }

  public error(message: string, error?: Error | unknown, context?: LogContext): void {
    const enrichedContext = this.enrichContext(context);
    
    if (error instanceof Error) {
      enrichedContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      enrichedContext.error = error;
    }

    this.winston.error(message, enrichedContext);
  }

  /**
   * Performance logging
   */
  public performance(operation: string, duration: number, success: boolean = true, context?: LogContext): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      success,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId,
      metadata: context?.metadata,
    };

    // Log the performance metric
    this.winston.info('Performance metric', {
      ...this.enrichContext(context),
      operation,
      duration,
      success,
      performance: true,
    });

    // Store in buffer for analytics
    this.performanceMetrics.push(metric);
    
    // Cleanup buffer if it gets too large
    if (this.performanceMetrics.length > this.maxMetricsBuffer) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsBuffer / 2);
    }
  }

  /**
   * Audit logging for compliance and security
   */
  public audit(action: string, resource: string, userId?: string, context?: LogContext): void {
    this.winston.info('Audit event', {
      ...this.enrichContext(context),
      audit: true,
      action,
      resource,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * HTTP request logging
   */
  public http(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this.winston.log(level, 'HTTP request', {
      ...this.enrichContext(context),
      http: true,
      method,
      url,
      statusCode,
      duration,
    });
  }

  /**
   * Database operation logging
   */
  public database(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    context?: LogContext
  ): void {
    this.winston.info('Database operation', {
      ...this.enrichContext(context),
      database: true,
      operation,
      table,
      duration,
      success,
    });
  }

  /**
   * External service call logging
   */
  public external(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    context?: LogContext
  ): void {
    this.winston.info('External service call', {
      ...this.enrichContext(context),
      external: true,
      service,
      operation,
      duration,
      success,
    });
  }

  /**
   * Business logic event logging
   */
  public business(
    event: string,
    entityType: string,
    entityId: string,
    context?: LogContext
  ): void {
    this.winston.info('Business event', {
      ...this.enrichContext(context),
      business: true,
      event,
      entityType,
      entityId,
    });
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Clear performance metrics
   */
  public clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    operations: Record<string, {
      count: number;
      averageDuration: number;
      successRate: number;
    }>;
  } {
    const total = this.performanceMetrics.length;
    if (total === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        operations: {},
      };
    }

    const totalDuration = this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0);
    const successCount = this.performanceMetrics.filter(m => m.success).length;
    
    const operationStats: Record<string, {
      count: number;
      averageDuration: number;
      successRate: number;
    }> = {};

    const operationGroups = this.performanceMetrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetrics[]>);

    for (const [operation, metrics] of Object.entries(operationGroups)) {
      const count = metrics.length;
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / count;
      const successRate = metrics.filter(m => m.success).length / count;
      
      operationStats[operation] = {
        count,
        averageDuration: Math.round(avgDuration * 100) / 100,
        successRate: Math.round(successRate * 10000) / 100,
      };
    }

    return {
      totalOperations: total,
      averageDuration: Math.round((totalDuration / total) * 100) / 100,
      successRate: Math.round((successCount / total) * 10000) / 100,
      operations: operationStats,
    };
  }

  private enrichContext(context?: LogContext): LogContext & { hostname: string; timestamp: string } {
    return {
      hostname: require('os').hostname(),
      timestamp: new Date().toISOString(),
      ...context,
    };
  }

  private setupPerformanceMetricsCleanup(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.performanceMetrics = this.performanceMetrics.filter(
        metric => new Date(metric.timestamp) > oneHourAgo
      );
    }, 60 * 60 * 1000);
  }

  /**
   * Create a child logger with persistent context
   */
  public child(context: LogContext): EnterpriseLogger {
    const childLogger = new EnterpriseLogger();
    
    // Override the enrichContext method to always include the base context
    const originalEnrichContext = childLogger.enrichContext.bind(childLogger);
    childLogger.enrichContext = (additionalContext?: LogContext) => {
      return originalEnrichContext({ ...context, ...additionalContext });
    };

    return childLogger;
  }

  /**
   * Flush all logs (useful for graceful shutdown)
   */
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }

  /**
   * Health check for logging system
   */
  public getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    details: Record<string, unknown>;
  } {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const logFiles = fs.readdirSync(logsDir);
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          level: this.config.LOG_LEVEL,
          environment: this.config.NODE_ENV,
          logFiles: logFiles.length,
          performanceMetricsCount: this.performanceMetrics.length,
          transports: this.winston.transports.length,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

// Create and export logger instance
export const logger = new EnterpriseLogger();

// Export types and utilities
export { EnterpriseLogger, LogContext, PerformanceMetrics };

// Performance timing utility
export function createPerformanceTimer(operation: string, context?: LogContext): {
  end: (success?: boolean) => void;
} {
  const startTime = Date.now();
  
  return {
    end: (success: boolean = true) => {
      const duration = Date.now() - startTime;
      logger.performance(operation, duration, success, context);
    },
  };
}

// Request logging middleware helper
export function createRequestLogger(baseContext?: LogContext) {
  return {
    info: (message: string, additionalContext?: LogContext) => 
      logger.info(message, { ...baseContext, ...additionalContext }),
    warn: (message: string, additionalContext?: LogContext) => 
      logger.warn(message, { ...baseContext, ...additionalContext }),
    error: (message: string, error?: Error | unknown, additionalContext?: LogContext) => 
      logger.error(message, error, { ...baseContext, ...additionalContext }),
    debug: (message: string, additionalContext?: LogContext) => 
      logger.debug(message, { ...baseContext, ...additionalContext }),
  };
}