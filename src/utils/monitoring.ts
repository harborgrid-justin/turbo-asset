/**
 * Enterprise Monitoring and Metrics System
 * Provides comprehensive application monitoring, performance metrics, and observability
 */

import { logger } from '../config/logger';
import { EnterpriseError } from '../utils/error-handling';
import { HTTP_STATUS, PERFORMANCE } from '../constants';

export interface MetricData {
  readonly name: string;
  readonly value: number;
  readonly timestamp: Date;
  readonly tags: Record<string, string>;
  readonly type: MetricType;
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export interface PerformanceMetric {
  readonly operation: string;
  readonly duration: number;
  readonly status: 'success' | 'error';
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly timestamp: Date;
  readonly services: Record<string, ServiceHealth>;
  readonly system: SystemMetrics;
}

export interface ServiceHealth {
  readonly name: string;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly responseTime: number;
  readonly errorRate: number;
  readonly requestsPerSecond: number;
  readonly lastCheck: Date;
  readonly uptime: number;
}

export interface SystemMetrics {
  readonly cpu: number;
  readonly memory: {
    readonly used: number;
    readonly free: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly disk: {
    readonly used: number;
    readonly free: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly network: {
    readonly inbound: number;
    readonly outbound: number;
  };
}

export interface AlertRule {
  readonly name: string;
  readonly condition: AlertCondition;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly enabled: boolean;
  readonly cooldown: number;
}

export interface AlertCondition {
  readonly metric: string;
  readonly operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  readonly threshold: number;
  readonly duration: number;
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  readonly id: string;
  readonly rule: AlertRule;
  readonly triggeredAt: Date;
  readonly resolvedAt?: Date;
  readonly status: 'active' | 'resolved';
  readonly value: number;
}

/**
 * Base Metrics Collector
 */
export abstract class BaseMetricsCollector {
  protected readonly name: string;
  protected readonly metrics = new Map<string, MetricData>();
  
  constructor(name: string) {
    this.name = name;
  }

  public abstract collect(): Promise<readonly MetricData[]>;
  
  protected createMetric(
    name: string, 
    value: number, 
    type: MetricType, 
    tags: Record<string, string> = {}
  ): MetricData {
    return {
      name: `${this.name}.${name}`,
      value,
      timestamp: new Date(),
      tags,
      type
    };
  }
}

/**
 * Performance Metrics Collector
 */
export class PerformanceMetricsCollector extends BaseMetricsCollector {
  private readonly performanceData = new Map<string, PerformanceMetric[]>();
  private readonly windowSize = 1000; // Keep last 1000 metrics per operation

  constructor() {
    super('performance');
  }

  /**
   * Record performance metric
   */
  public recordMetric(metric: PerformanceMetric): void {
    const existing = this.performanceData.get(metric.operation) ?? [];
    existing.push(metric);

    // Keep only recent metrics
    if (existing.length > this.windowSize) {
      existing.splice(0, existing.length - this.windowSize);
    }

    this.performanceData.set(metric.operation, existing);
  }

  /**
   * Collect performance metrics
   */
  public async collect(): Promise<readonly MetricData[]> {
    const metrics: MetricData[] = [];
    const now = Date.now();

    for (const [operation, data] of this.performanceData) {
      // Filter metrics from last minute
      const recentMetrics = data.filter(m => now - m.timestamp.getTime() < 60000);
      
      if (recentMetrics.length === 0) continue;

      // Calculate statistics
      const durations = recentMetrics.map(m => m.duration);
      const successCount = recentMetrics.filter(m => m.status === 'success').length;
      const errorCount = recentMetrics.length - successCount;

      metrics.push(
        this.createMetric(`${operation}.count`, recentMetrics.length, 'counter', { operation }),
        this.createMetric(`${operation}.success_count`, successCount, 'counter', { operation }),
        this.createMetric(`${operation}.error_count`, errorCount, 'counter', { operation }),
        this.createMetric(`${operation}.error_rate`, errorCount / recentMetrics.length, 'gauge', { operation }),
        this.createMetric(`${operation}.avg_duration`, durations.reduce((a, b) => a + b, 0) / durations.length, 'gauge', { operation }),
        this.createMetric(`${operation}.min_duration`, Math.min(...durations), 'gauge', { operation }),
        this.createMetric(`${operation}.max_duration`, Math.max(...durations), 'gauge', { operation }),
        this.createMetric(`${operation}.p95_duration`, this.percentile(durations, 0.95), 'gauge', { operation }),
        this.createMetric(`${operation}.p99_duration`, this.percentile(durations, 0.99), 'gauge', { operation })
      );
    }

    return Object.freeze(metrics);
  }

  private percentile(values: readonly number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] ?? 0;
  }
}

/**
 * System Metrics Collector
 */
export class SystemMetricsCollector extends BaseMetricsCollector {
  constructor() {
    super('system');
  }

  /**
   * Collect system metrics
   */
  public async collect(): Promise<readonly MetricData[]> {
    const metrics: MetricData[] = [];

    try {
      // Memory metrics
      const memUsage = process.memoryUsage();
      metrics.push(
        this.createMetric('memory.rss', memUsage.rss, 'gauge'),
        this.createMetric('memory.heap_used', memUsage.heapUsed, 'gauge'),
        this.createMetric('memory.heap_total', memUsage.heapTotal, 'gauge'),
        this.createMetric('memory.external', memUsage.external, 'gauge')
      );

      // CPU metrics (simplified - in real implementation use process.cpuUsage())
      const cpuUsage = process.cpuUsage();
      metrics.push(
        this.createMetric('cpu.user', cpuUsage.user, 'gauge'),
        this.createMetric('cpu.system', cpuUsage.system, 'gauge')
      );

      // Process metrics
      metrics.push(
        this.createMetric('process.uptime', process.uptime(), 'gauge'),
        this.createMetric('process.pid', process.pid, 'gauge')
      );

      // Event loop lag (simplified)
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
        metrics.push(this.createMetric('event_loop.lag', lag, 'gauge'));
      });

    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }

    return Object.freeze(metrics);
  }
}

/**
 * Database Metrics Collector
 */
export class DatabaseMetricsCollector extends BaseMetricsCollector {
  private connectionCount = 0;
  private activeQueries = 0;
  private queryMetrics = new Map<string, { count: number; totalTime: number }>();

  constructor() {
    super('database');
  }

  /**
   * Record database connection
   */
  public recordConnection(active: boolean): void {
    this.connectionCount += active ? 1 : -1;
  }

  /**
   * Record query execution
   */
  public recordQuery(query: string, duration: number): void {
    const existing = this.queryMetrics.get(query) ?? { count: 0, totalTime: 0 };
    existing.count++;
    existing.totalTime += duration;
    this.queryMetrics.set(query, existing);
  }

  /**
   * Collect database metrics
   */
  public async collect(): Promise<readonly MetricData[]> {
    const metrics: MetricData[] = [];

    metrics.push(
      this.createMetric('connections.active', this.connectionCount, 'gauge'),
      this.createMetric('queries.active', this.activeQueries, 'gauge')
    );

    // Query statistics
    let totalQueries = 0;
    let totalQueryTime = 0;

    for (const [, stats] of this.queryMetrics) {
      totalQueries += stats.count;
      totalQueryTime += stats.totalTime;
    }

    if (totalQueries > 0) {
      metrics.push(
        this.createMetric('queries.total', totalQueries, 'counter'),
        this.createMetric('queries.avg_duration', totalQueryTime / totalQueries, 'gauge')
      );
    }

    return Object.freeze(metrics);
  }
}

/**
 * Alert Manager
 */
export class AlertManager {
  private readonly rules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<string, Alert>();
  private readonly alertHistory: Alert[] = [];

  /**
   * Add alert rule
   */
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.name, rule);
    logger.info(`Added alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  public removeRule(name: string): boolean {
    const removed = this.rules.delete(name);
    if (removed) {
      logger.info(`Removed alert rule: ${name}`);
    }
    return removed;
  }

  /**
   * Evaluate metrics against alert rules
   */
  public evaluateMetrics(metrics: readonly MetricData[]): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const relevantMetrics = metrics.filter(m => m.name === rule.condition.metric);
      
      for (const metric of relevantMetrics) {
        this.evaluateRule(rule, metric);
      }
    }
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): readonly Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit: number = 100): readonly Alert[] {
    return this.alertHistory.slice(-limit);
  }

  private evaluateRule(rule: AlertRule, metric: MetricData): void {
    const isTriggered = this.checkCondition(rule.condition, metric.value);
    const alertId = `${rule.name}:${metric.name}`;
    const existingAlert = this.activeAlerts.get(alertId);

    if (isTriggered && existingAlert === undefined) {
      // New alert
      const alert: Alert = {
        id: alertId,
        rule,
        triggeredAt: new Date(),
        status: 'active',
        value: metric.value
      };

      this.activeAlerts.set(alertId, alert);
      this.alertHistory.push(alert);
      this.notifyAlert(alert);

    } else if (!isTriggered && existingAlert !== undefined) {
      // Resolve alert
      const resolvedAlert: Alert = {
        ...existingAlert,
        resolvedAt: new Date(),
        status: 'resolved'
      };

      this.activeAlerts.delete(alertId);
      this.alertHistory.push(resolvedAlert);
      this.notifyAlert(resolvedAlert);
    }
  }

  private checkCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'greater_than':
        return value > condition.threshold;
      case 'less_than':
        return value < condition.threshold;
      case 'equals':
        return value === condition.threshold;
      case 'not_equals':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  private notifyAlert(alert: Alert): void {
    const message = alert.status === 'active' 
      ? `🚨 Alert Triggered: ${alert.rule.name} - ${alert.rule.message} (Value: ${alert.value})`
      : `✅ Alert Resolved: ${alert.rule.name}`;

    switch (alert.rule.severity) {
      case 'critical':
        logger.error(message, { alert });
        break;
      case 'error':
        logger.error(message, { alert });
        break;
      case 'warning':
        logger.warn(message, { alert });
        break;
      case 'info':
        logger.info(message, { alert });
        break;
    }
  }
}

/**
 * Main Monitoring System
 */
export class MonitoringSystem {
  private static instance: MonitoringSystem;
  private readonly collectors: BaseMetricsCollector[] = [];
  private readonly alertManager = new AlertManager();
  private readonly performanceCollector = new PerformanceMetricsCollector();
  private collectionInterval?: NodeJS.Timeout;

  private constructor() {
    this.collectors.push(
      this.performanceCollector,
      new SystemMetricsCollector(),
      new DatabaseMetricsCollector()
    );

    this.setupDefaultAlerts();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MonitoringSystem {
    if (MonitoringSystem.instance === undefined) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  /**
   * Start monitoring
   */
  public start(intervalMs: number = 60000): void {
    if (this.collectionInterval !== undefined) {
      this.stop();
    }

    this.collectionInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalMs);

    logger.info(`Monitoring system started with ${intervalMs}ms interval`);
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.collectionInterval !== undefined) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
    logger.info('Monitoring system stopped');
  }

  /**
   * Record performance metric
   */
  public recordPerformance(metric: PerformanceMetric): void {
    this.performanceCollector.recordMetric(metric);
  }

  /**
   * Add alert rule
   */
  public addAlert(rule: AlertRule): void {
    this.alertManager.addRule(rule);
  }

  /**
   * Get system health
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const metrics = await this.collectAllMetrics();
    const services = this.calculateServiceHealth(metrics);
    
    const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
    const degradedServices = Object.values(services).filter(s => s.status === 'degraded').length;
    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy').length;

    let overallStatus: SystemHealth['status'] = 'healthy';
    if (unhealthyServices > 0) overallStatus = 'unhealthy';
    else if (degradedServices > 0) overallStatus = 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date(),
      services,
      system: this.getSystemMetricsFromData(metrics)
    };
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): readonly Alert[] {
    return this.alertManager.getActiveAlerts();
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.collectAllMetrics();
      this.alertManager.evaluateMetrics(metrics);
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  private async collectAllMetrics(): Promise<readonly MetricData[]> {
    const allMetrics: MetricData[] = [];
    
    await Promise.all(
      this.collectors.map(async (collector) => {
        try {
          const metrics = await collector.collect();
          allMetrics.push(...metrics);
        } catch (error) {
          logger.error(`Error collecting metrics from ${collector.constructor.name}:`, error);
        }
      })
    );

    return Object.freeze(allMetrics);
  }

  private calculateServiceHealth(metrics: readonly MetricData[]): Record<string, ServiceHealth> {
    const services: Record<string, ServiceHealth> = {};
    
    // Group metrics by service
    const serviceMetrics = new Map<string, MetricData[]>();
    for (const metric of metrics) {
      const serviceName = metric.tags.service ?? metric.name.split('.')[0];
      const existing = serviceMetrics.get(serviceName) ?? [];
      existing.push(metric);
      serviceMetrics.set(serviceName, existing);
    }

    // Calculate health for each service
    for (const [serviceName, serviceMetricsList] of serviceMetrics) {
      const errorRateMetric = serviceMetricsList.find(m => m.name.includes('error_rate'));
      const responseTimeMetric = serviceMetricsList.find(m => m.name.includes('avg_duration'));
      const requestCountMetric = serviceMetricsList.find(m => m.name.includes('count'));

      const errorRate = errorRateMetric?.value ?? 0;
      const responseTime = responseTimeMetric?.value ?? 0;
      const requestsPerSecond = requestCountMetric?.value ?? 0;

      let status: ServiceHealth['status'] = 'healthy';
      if (errorRate > 0.1 || responseTime > PERFORMANCE.MAX_RESPONSE_TIME_MS) status = 'degraded';
      if (errorRate > 0.5 || responseTime > PERFORMANCE.MAX_RESPONSE_TIME_MS * 5) status = 'unhealthy';

      services[serviceName] = {
        name: serviceName,
        status,
        responseTime,
        errorRate,
        requestsPerSecond: requestsPerSecond / 60, // Convert per minute to per second
        lastCheck: new Date(),
        uptime: process.uptime()
      };
    }

    return services;
  }

  private getSystemMetricsFromData(metrics: readonly MetricData[]): SystemMetrics {
    const getMetricValue = (name: string): number => {
      return metrics.find(m => m.name.includes(name))?.value ?? 0;
    };

    const heapUsed = getMetricValue('memory.heap_used');
    const heapTotal = getMetricValue('memory.heap_total');

    return {
      cpu: getMetricValue('cpu.user') + getMetricValue('cpu.system'),
      memory: {
        used: heapUsed,
        free: heapTotal - heapUsed,
        total: heapTotal,
        percentage: heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0
      },
      disk: {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0
      },
      network: {
        inbound: 0,
        outbound: 0
      }
    };
  }

  private setupDefaultAlerts(): void {
    // High error rate alert
    this.addAlert({
      name: 'high_error_rate',
      condition: {
        metric: 'error_rate',
        operator: 'greater_than',
        threshold: 0.1,
        duration: 300000 // 5 minutes
      },
      severity: 'error',
      message: 'Error rate is above 10%',
      enabled: true,
      cooldown: 300000 // 5 minutes
    });

    // High response time alert
    this.addAlert({
      name: 'high_response_time',
      condition: {
        metric: 'avg_duration',
        operator: 'greater_than',
        threshold: PERFORMANCE.MAX_RESPONSE_TIME_MS,
        duration: 300000 // 5 minutes
      },
      severity: 'warning',
      message: 'Average response time is above threshold',
      enabled: true,
      cooldown: 300000 // 5 minutes
    });

    // High memory usage alert
    this.addAlert({
      name: 'high_memory_usage',
      condition: {
        metric: 'system.memory.heap_used',
        operator: 'greater_than',
        threshold: 1024 * 1024 * 1024, // 1GB
        duration: 300000 // 5 minutes
      },
      severity: 'warning',
      message: 'Memory usage is above 1GB',
      enabled: true,
      cooldown: 600000 // 10 minutes
    });
  }
}

// Export singleton instance
export const monitoring = MonitoringSystem.getInstance();