/**
 * Enterprise-grade performance monitoring and metrics collection
 * Provides comprehensive observability for production systems
 */

import { EventEmitter } from 'events';
import { getLogger, LogContext, createCorrelationId } from '../config/enterprise-logger';
import { getEnvironmentConfig } from '../config/environment-validation';
import { Request, Response, NextFunction } from 'express';

/**
 * Metric types enumeration
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

/**
 * Metric data interface
 */
export interface MetricData {
  readonly name: string;
  readonly type: MetricType;
  readonly value: number;
  readonly labels: Record<string, string>;
  readonly timestamp: number;
  readonly help?: string;
}

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  readonly operation: string;
  readonly duration: number;
  readonly success: boolean;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * System metrics interface
 */
export interface SystemMetrics {
  readonly cpu: {
    readonly usage: number;
    readonly loadAverage: readonly number[];
  };
  readonly memory: {
    readonly used: number;
    readonly free: number;
    readonly total: number;
    readonly heapUsed: number;
    readonly heapTotal: number;
    readonly external: number;
  };
  readonly process: {
    readonly pid: number;
    readonly uptime: number;
    readonly version: string;
    readonly nodeVersion: string;
  };
}

/**
 * Enterprise Performance Monitor
 */
export class EnterprisePerformanceMonitor extends EventEmitter {
  private readonly logger = getLogger();
  private readonly metrics = new Map<string, MetricData[]>();
  private readonly performanceMetrics: PerformanceMetric[] = [];
  
  private systemStatsInterval?: NodeJS.Timeout;
  private metricsCleanupInterval?: NodeJS.Timeout;
  private isRunning = false;
  
  private readonly retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxMetricsPerType = 10000;

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.logger.info('Starting performance monitoring');
    
    // Collect system metrics every 30 seconds
    this.systemStatsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Clean up old metrics every 5 minutes
    this.metricsCleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 5 * 60 * 1000);

    this.isRunning = true;
    this.emit('started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping performance monitoring');

    if (this.systemStatsInterval) {
      clearInterval(this.systemStatsInterval);
      this.systemStatsInterval = undefined;
    }

    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
      this.metricsCleanupInterval = undefined;
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    type: MetricType,
    value: number,
    labels: Record<string, string> = {},
    help?: string
  ): void {
    const metric: MetricData = {
      name,
      type,
      value,
      labels,
      timestamp: Date.now(),
      help
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);

    // Limit memory usage by keeping only recent metrics
    if (metricArray.length > this.maxMetricsPerType) {
      metricArray.splice(0, metricArray.length - this.maxMetricsPerType);
    }

    this.emit('metric', metric);
  }

  /**
   * Record a performance metric
   */
  recordPerformance(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>
  ): void {
    const perfMetric: PerformanceMetric = {
      operation,
      duration,
      success,
      timestamp: Date.now(),
      metadata
    };

    this.performanceMetrics.push(perfMetric);

    // Record as metrics for aggregation
    this.recordMetric(
      'operation_duration_ms',
      MetricType.HISTOGRAM,
      duration,
      { operation, success: success.toString() },
      'Duration of operations in milliseconds'
    );

    this.recordMetric(
      'operation_total',
      MetricType.COUNTER,
      1,
      { operation, success: success.toString() },
      'Total number of operations'
    );

    // Clean up old performance metrics
    const cutoff = Date.now() - this.retentionPeriod;
    while (this.performanceMetrics.length > 0 && 
           this.performanceMetrics[0].timestamp < cutoff) {
      this.performanceMetrics.shift();
    }

    this.emit('performance', perfMetric);
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    this.recordMetric(name, MetricType.COUNTER, value, labels);
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    this.recordMetric(name, MetricType.GAUGE, value, labels);
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    this.recordMetric(name, MetricType.HISTOGRAM, value, labels);
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      cpu: {
        usage: this.calculateCpuUsage(cpuUsage),
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
      },
      memory: {
        used: memUsage.heapUsed,
        free: memUsage.heapTotal - memUsage.heapUsed,
        total: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        nodeVersion: process.versions.node
      }
    };
  }

  /**
   * Get all metrics in Prometheus format
   */
  getMetricsPrometheusFormat(): string {
    let output = '';
    
    for (const [name, metricArray] of this.metrics) {
      if (metricArray.length === 0) {continue;}
      
      const latest = metricArray[metricArray.length - 1];
      
      if (latest.help) {
        output += `# HELP ${name} ${latest.help}\n`;
      }
      output += `# TYPE ${name} ${latest.type}\n`;
      
      for (const metric of metricArray.slice(-100)) { // Last 100 values
        const labels = Object.entries(metric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        
        const labelStr = labels ? `{${labels}}` : '';
        output += `${name}${labelStr} ${metric.value} ${metric.timestamp}\n`;
      }
      
      output += '\n';
    }
    
    return output;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Record<string, unknown> {
    return {
      systemMetrics: this.getSystemMetrics(),
      totalMetrics: this.metrics.size,
      recentOperations: this.performanceMetrics.filter(
        m => m.timestamp > Date.now() - 60000
      ).length
    };
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const systemMetrics = this.getSystemMetrics();
    
    // Record system metrics
    this.setGauge('system_cpu_usage', systemMetrics.cpu.usage);
    this.setGauge('system_memory_used_bytes', systemMetrics.memory.used);
    this.setGauge('system_memory_total_bytes', systemMetrics.memory.total);
    this.setGauge('system_process_uptime_seconds', systemMetrics.process.uptime);
    
    if (systemMetrics.cpu.loadAverage.length > 0) {
      this.setGauge('system_load_average_1m', systemMetrics.cpu.loadAverage[0]);
      this.setGauge('system_load_average_5m', systemMetrics.cpu.loadAverage[1]);
      this.setGauge('system_load_average_15m', systemMetrics.cpu.loadAverage[2]);
    }
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simple CPU usage calculation - would be more sophisticated in production
    const total = cpuUsage.user + cpuUsage.system;
    return (total / 1000000) / process.uptime() * 100;
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.retentionPeriod;
    let totalCleaned = 0;
    
    for (const [name, metricArray] of this.metrics) {
      const initialLength = metricArray.length;
      const filtered = metricArray.filter(m => m.timestamp > cutoff);
      
      if (filtered.length !== initialLength) {
        this.metrics.set(name, filtered);
        totalCleaned += initialLength - filtered.length;
      }
    }
    
    if (totalCleaned > 0) {
      this.logger.debug('Cleaned up old metrics', { cleaned: totalCleaned });
    }
  }
}

/**
 * Express middleware for HTTP request monitoring
 */
export function createMonitoringMiddleware(monitor: EnterprisePerformanceMonitor) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const correlationId = createCorrelationId();
    
    // Add correlation ID to request
    (req as any).correlationId = correlationId;
    
    // Monitor request completion
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Record HTTP metrics
      monitor.incrementCounter('http_requests_total', {
        method: req.method,
        route: req.route?.path || req.path,
        status: res.statusCode.toString()
      });
      
      monitor.recordHistogram('http_request_duration_ms', duration, {
        method: req.method,
        route: req.route?.path || req.path
      });
      
      monitor.recordPerformance(
        `http_${req.method.toLowerCase()}`,
        duration,
        success,
        {
          path: req.path,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      );
    });
    
    next();
  };
}

// Singleton instance
let monitorInstance: EnterprisePerformanceMonitor | null = null;

/**
 * Get singleton performance monitor instance
 */
export function getPerformanceMonitor(): EnterprisePerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new EnterprisePerformanceMonitor();
  }
  return monitorInstance;
}

/**
 * Initialize and start performance monitoring
 */
export function initializePerformanceMonitoring(): EnterprisePerformanceMonitor {
  const monitor = getPerformanceMonitor();
  monitor.start();
  return monitor;
}