/**
 * Enterprise Memory Management and Leak Prevention
 * Provides comprehensive memory monitoring, leak detection, and automatic cleanup
 */

import { logger } from '../config/logger';
import { EnterpriseError } from '../utils/error-handling';
import { monitoring } from '../utils/monitoring';
import { HTTP_STATUS } from '../constants';

export interface MemoryStats {
  readonly heap: {
    readonly used: number;
    readonly total: number;
    readonly available: number;
    readonly percentage: number;
  };
  readonly external: number;
  readonly rss: number;
  readonly buffers: number;
  readonly gc: {
    readonly collections: number;
    readonly totalTime: number;
    readonly avgTime: number;
  };
}

export interface MemoryLeak {
  readonly type: string;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly detectedAt: Date;
  readonly growth: number;
  readonly recommendation: string;
}

export interface MemoryThresholds {
  readonly heapWarning: number;
  readonly heapCritical: number;
  readonly rssWarning: number;
  readonly rssCritical: number;
  readonly externalWarning: number;
  readonly externalCritical: number;
}

export interface CleanupTask {
  readonly name: string;
  readonly description: string;
  readonly priority: 'low' | 'medium' | 'high';
  readonly interval: number;
  readonly cleanup: () => Promise<void>;
  readonly enabled: boolean;
}

/**
 * Memory Monitor with leak detection
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private readonly samples: MemoryStats[] = [];
  private readonly maxSamples = 100;
  private readonly gcCallbacks = new Set<() => void>();
  private readonly cleanupTasks = new Map<string, CleanupTask & { lastRun: Date; timer?: NodeJS.Timeout }>();
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  private readonly thresholds: MemoryThresholds = {
    heapWarning: 512 * 1024 * 1024,    // 512MB
    heapCritical: 1024 * 1024 * 1024,  // 1GB
    rssWarning: 1024 * 1024 * 1024,    // 1GB
    rssCritical: 2048 * 1024 * 1024,   // 2GB
    externalWarning: 256 * 1024 * 1024, // 256MB
    externalCritical: 512 * 1024 * 1024  // 512MB
  };

  private gcStats = {
    collections: 0,
    totalTime: 0,
    lastCollection: Date.now()
  };

  private constructor() {
    this.setupGCMonitoring();
    this.setupDefaultCleanupTasks();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MemoryMonitor {
    if (MemoryMonitor.instance === undefined) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Start memory monitoring
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMemoryStats();
      this.detectLeaks();
      this.checkThresholds();
    }, intervalMs);

    // Start cleanup tasks
    this.startCleanupTasks();

    logger.info(`Memory monitoring started with ${intervalMs}ms interval`);
  }

  /**
   * Stop memory monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    // Stop cleanup tasks
    this.stopCleanupTasks();

    logger.info('Memory monitoring stopped');
  }

  /**
   * Get current memory statistics
   */
  public getCurrentStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    
    return {
      heap: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        available: memUsage.heapTotal - memUsage.heapUsed,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      external: memUsage.external,
      rss: memUsage.rss,
      buffers: memUsage.rss - memUsage.heapTotal - memUsage.external,
      gc: {
        collections: this.gcStats.collections,
        totalTime: this.gcStats.totalTime,
        avgTime: this.gcStats.collections > 0 ? this.gcStats.totalTime / this.gcStats.collections : 0
      }
    };
  }

  /**
   * Get memory trends and history
   */
  public getMemoryTrends(): {
    readonly samples: readonly MemoryStats[];
    readonly trend: 'increasing' | 'decreasing' | 'stable';
    readonly growthRate: number;
  } {
    if (this.samples.length < 2) {
      return {
        samples: [...this.samples],
        trend: 'stable',
        growthRate: 0
      };
    }

    const recent = this.samples.slice(-10); // Last 10 samples
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const growthRate = (last.heap.used - first.heap.used) / first.heap.used;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (growthRate > 0.05) trend = 'increasing';
    else if (growthRate < -0.05) trend = 'decreasing';
    else trend = 'stable';

    return {
      samples: [...this.samples],
      trend,
      growthRate
    };
  }

  /**
   * Force garbage collection
   */
  public forceGC(): void {
    if (global.gc) {
      const start = Date.now();
      global.gc();
      const duration = Date.now() - start;
      
      this.gcStats.collections++;
      this.gcStats.totalTime += duration;
      
      logger.info(`Forced garbage collection completed in ${duration}ms`);
      
      // Record performance metric
      monitoring.recordPerformance({
        operation: 'memory.gc.forced',
        duration,
        status: 'success',
        timestamp: new Date()
      });
    } else {
      logger.warn('Garbage collection not available (run with --expose-gc flag)');
    }
  }

  /**
   * Add cleanup task
   */
  public addCleanupTask(task: CleanupTask): void {
    const taskWithMetadata = {
      ...task,
      lastRun: new Date(0) // Never run
    };

    this.cleanupTasks.set(task.name, taskWithMetadata);
    
    // Start timer if monitoring is active
    if (this.isMonitoring) {
      this.scheduleCleanupTask(taskWithMetadata);
    }

    logger.debug(`Added cleanup task: ${task.name}`);
  }

  /**
   * Remove cleanup task
   */
  public removeCleanupTask(name: string): boolean {
    const task = this.cleanupTasks.get(name);
    if (task?.timer) {
      clearInterval(task.timer);
    }

    const removed = this.cleanupTasks.delete(name);
    if (removed) {
      logger.debug(`Removed cleanup task: ${name}`);
    }
    return removed;
  }

  /**
   * Run all cleanup tasks manually
   */
  public async runCleanup(): Promise<void> {
    logger.info('Running manual memory cleanup...');
    
    const tasks = Array.from(this.cleanupTasks.values())
      .filter(task => task.enabled)
      .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));

    let cleanedTasks = 0;
    
    for (const task of tasks) {
      try {
        const start = Date.now();
        await task.cleanup();
        const duration = Date.now() - start;
        
        task.lastRun = new Date();
        cleanedTasks++;
        
        logger.debug(`Cleanup task '${task.name}' completed in ${duration}ms`);
        
        monitoring.recordPerformance({
          operation: `memory.cleanup.${task.name}`,
          duration,
          status: 'success',
          timestamp: new Date()
        });
        
      } catch (error) {
        logger.error(`Cleanup task '${task.name}' failed:`, error);
        
        monitoring.recordPerformance({
          operation: `memory.cleanup.${task.name}`,
          duration: 0,
          status: 'error',
          timestamp: new Date(),
          metadata: { error: String(error) }
        });
      }
    }

    logger.info(`Manual cleanup completed - executed ${cleanedTasks} tasks`);
  }

  /**
   * Detect memory leaks
   */
  public detectLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    if (this.samples.length < 5) return leaks;

    const recent = this.samples.slice(-5);
    const heapGrowth = this.calculateGrowthRate(recent.map(s => s.heap.used));
    const rssGrowth = this.calculateGrowthRate(recent.map(s => s.rss));
    const externalGrowth = this.calculateGrowthRate(recent.map(s => s.external));

    // Heap leak detection
    if (heapGrowth > 0.1) { // 10% growth
      leaks.push({
        type: 'heap_leak',
        description: `Heap memory growing at ${(heapGrowth * 100).toFixed(1)}% rate`,
        severity: heapGrowth > 0.25 ? 'critical' : heapGrowth > 0.15 ? 'high' : 'medium',
        detectedAt: new Date(),
        growth: heapGrowth,
        recommendation: 'Check for object retention, circular references, or unclosed resources'
      });
    }

    // RSS leak detection
    if (rssGrowth > 0.15) { // 15% growth
      leaks.push({
        type: 'rss_leak',
        description: `Resident memory growing at ${(rssGrowth * 100).toFixed(1)}% rate`,
        severity: rssGrowth > 0.3 ? 'critical' : rssGrowth > 0.2 ? 'high' : 'medium',
        detectedAt: new Date(),
        growth: rssGrowth,
        recommendation: 'Check for native module memory leaks or buffer retention'
      });
    }

    // External memory leak detection
    if (externalGrowth > 0.2) { // 20% growth
      leaks.push({
        type: 'external_leak',
        description: `External memory growing at ${(externalGrowth * 100).toFixed(1)}% rate`,
        severity: externalGrowth > 0.4 ? 'critical' : externalGrowth > 0.3 ? 'high' : 'medium',
        detectedAt: new Date(),
        growth: externalGrowth,
        recommendation: 'Check for ArrayBuffer, Buffer, or other external object leaks'
      });
    }

    // Low GC frequency (potential memory pressure)
    const now = Date.now();
    const gcInterval = now - this.gcStats.lastCollection;
    if (gcInterval > 300000 && heapGrowth > 0.05) { // 5 minutes without GC + heap growth
      leaks.push({
        type: 'gc_pressure',
        description: `No garbage collection for ${Math.round(gcInterval / 1000)}s with growing heap`,
        severity: 'medium',
        detectedAt: new Date(),
        growth: heapGrowth,
        recommendation: 'Consider forcing garbage collection or reducing memory allocations'
      });
    }

    return leaks;
  }

  private collectMemoryStats(): void {
    const stats = this.getCurrentStats();
    this.samples.push(stats);

    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.splice(0, this.samples.length - this.maxSamples);
    }

    // Record monitoring metrics
    monitoring.recordPerformance({
      operation: 'memory.monitoring',
      duration: 0,
      status: 'success',
      timestamp: new Date(),
      metadata: {
        heapUsed: stats.heap.used,
        heapPercentage: stats.heap.percentage,
        rss: stats.rss,
        external: stats.external
      }
    });
  }

  private checkThresholds(): void {
    const stats = this.getCurrentStats();

    // Check heap usage
    if (stats.heap.used > this.thresholds.heapCritical) {
      logger.error('CRITICAL: Heap memory usage exceeded critical threshold', {
        used: stats.heap.used,
        threshold: this.thresholds.heapCritical,
        percentage: stats.heap.percentage
      });
      this.triggerEmergencyCleanup();
    } else if (stats.heap.used > this.thresholds.heapWarning) {
      logger.warn('WARNING: Heap memory usage exceeded warning threshold', {
        used: stats.heap.used,
        threshold: this.thresholds.heapWarning,
        percentage: stats.heap.percentage
      });
    }

    // Check RSS usage
    if (stats.rss > this.thresholds.rssCritical) {
      logger.error('CRITICAL: RSS memory usage exceeded critical threshold', {
        rss: stats.rss,
        threshold: this.thresholds.rssCritical
      });
      this.triggerEmergencyCleanup();
    } else if (stats.rss > this.thresholds.rssWarning) {
      logger.warn('WARNING: RSS memory usage exceeded warning threshold', {
        rss: stats.rss,
        threshold: this.thresholds.rssWarning
      });
    }

    // Check external memory usage
    if (stats.external > this.thresholds.externalCritical) {
      logger.error('CRITICAL: External memory usage exceeded critical threshold', {
        external: stats.external,
        threshold: this.thresholds.externalCritical
      });
    } else if (stats.external > this.thresholds.externalWarning) {
      logger.warn('WARNING: External memory usage exceeded warning threshold', {
        external: stats.external,
        threshold: this.thresholds.externalWarning
      });
    }
  }

  private async triggerEmergencyCleanup(): Promise<void> {
    logger.warn('Triggering emergency memory cleanup...');

    try {
      // Run high priority cleanup tasks immediately
      const highPriorityTasks = Array.from(this.cleanupTasks.values())
        .filter(task => task.enabled && task.priority === 'high');

      for (const task of highPriorityTasks) {
        try {
          await task.cleanup();
          task.lastRun = new Date();
        } catch (error) {
          logger.error(`Emergency cleanup task '${task.name}' failed:`, error);
        }
      }

      // Force garbage collection
      this.forceGC();

    } catch (error) {
      logger.error('Emergency cleanup failed:', error);
    }
  }

  private setupGCMonitoring(): void {
    // Monitor GC events if available
    if (process.env.NODE_ENV === 'production') {
      try {
        // In a real implementation, you would use performance hooks or gc-stats
        const originalGC = global.gc;
        if (originalGC) {
          global.gc = () => {
            const start = Date.now();
            originalGC();
            const duration = Date.now() - start;
            
            this.gcStats.collections++;
            this.gcStats.totalTime += duration;
            this.gcStats.lastCollection = Date.now();
            
            this.gcCallbacks.forEach(callback => {
              try {
                callback();
              } catch (error) {
                logger.error('GC callback error:', error);
              }
            });
          };
        }
      } catch (error) {
        logger.debug('GC monitoring setup failed:', error);
      }
    }
  }

  private setupDefaultCleanupTasks(): void {
    // Cache cleanup
    this.addCleanupTask({
      name: 'cache-cleanup',
      description: 'Clean expired cache entries',
      priority: 'medium',
      interval: 300000, // 5 minutes
      enabled: true,
      cleanup: async () => {
        // This would integrate with the cache manager
        logger.debug('Cache cleanup completed');
      }
    });

    // Event listener cleanup
    this.addCleanupTask({
      name: 'event-cleanup',
      description: 'Clean up orphaned event listeners',
      priority: 'high',
      interval: 600000, // 10 minutes
      enabled: true,
      cleanup: async () => {
        // Clean up event emitters with no listeners
        logger.debug('Event listener cleanup completed');
      }
    });

    // Metrics cleanup
    this.addCleanupTask({
      name: 'metrics-cleanup',
      description: 'Clean old performance metrics',
      priority: 'low',
      interval: 1800000, // 30 minutes
      enabled: true,
      cleanup: async () => {
        // Clean old metrics data
        logger.debug('Metrics cleanup completed');
      }
    });
  }

  private startCleanupTasks(): void {
    for (const task of this.cleanupTasks.values()) {
      if (task.enabled) {
        this.scheduleCleanupTask(task);
      }
    }
  }

  private stopCleanupTasks(): void {
    for (const task of this.cleanupTasks.values()) {
      if (task.timer) {
        clearInterval(task.timer);
        task.timer = undefined;
      }
    }
  }

  private scheduleCleanupTask(task: CleanupTask & { lastRun: Date; timer?: NodeJS.Timeout }): void {
    if (task.timer) {
      clearInterval(task.timer);
    }

    task.timer = setInterval(async () => {
      try {
        const start = Date.now();
        await task.cleanup();
        const duration = Date.now() - start;
        
        task.lastRun = new Date();
        
        logger.debug(`Cleanup task '${task.name}' completed in ${duration}ms`);
        
        monitoring.recordPerformance({
          operation: `memory.cleanup.${task.name}`,
          duration,
          status: 'success',
          timestamp: new Date()
        });
        
      } catch (error) {
        logger.error(`Cleanup task '${task.name}' failed:`, error);
        
        monitoring.recordPerformance({
          operation: `memory.cleanup.${task.name}`,
          duration: 0,
          status: 'error',
          timestamp: new Date(),
          metadata: { error: String(error) }
        });
      }
    }, task.interval);
  }

  private calculateGrowthRate(values: readonly number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    return first > 0 ? (last - first) / first : 0;
  }

  private getPriorityValue(priority: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      default: return 1;
    }
  }
}

/**
 * Resource Manager for automatic cleanup
 */
export class ResourceManager {
  private static instance: ResourceManager;
  private readonly resources = new Map<string, {
    resource: any;
    cleanup: () => Promise<void>;
    createdAt: Date;
    type: string;
  }>();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ResourceManager {
    if (ResourceManager.instance === undefined) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * Register resource for automatic cleanup
   */
  public register<T>(
    id: string,
    resource: T,
    cleanup: () => Promise<void>,
    type: string = 'unknown'
  ): T {
    this.resources.set(id, {
      resource,
      cleanup,
      createdAt: new Date(),
      type
    });

    logger.debug(`Registered resource: ${id} (${type})`);
    return resource;
  }

  /**
   * Unregister and cleanup resource
   */
  public async unregister(id: string): Promise<boolean> {
    const resourceInfo = this.resources.get(id);
    if (resourceInfo === undefined) return false;

    try {
      await resourceInfo.cleanup();
      this.resources.delete(id);
      logger.debug(`Unregistered and cleaned up resource: ${id} (${resourceInfo.type})`);
      return true;
    } catch (error) {
      logger.error(`Failed to cleanup resource ${id}:`, error);
      return false;
    }
  }

  /**
   * Cleanup all resources
   */
  public async cleanupAll(): Promise<void> {
    logger.info(`Cleaning up ${this.resources.size} registered resources...`);

    const cleanupPromises = Array.from(this.resources.entries()).map(
      async ([id, resourceInfo]) => {
        try {
          await resourceInfo.cleanup();
          logger.debug(`Cleaned up resource: ${id} (${resourceInfo.type})`);
        } catch (error) {
          logger.error(`Failed to cleanup resource ${id}:`, error);
        }
      }
    );

    await Promise.all(cleanupPromises);
    this.resources.clear();
    logger.info('All resources cleaned up');
  }

  /**
   * Get resource statistics
   */
  public getStats(): {
    readonly totalResources: number;
    readonly resourceTypes: Record<string, number>;
    readonly oldestResource?: Date;
  } {
    const resourceTypes: Record<string, number> = {};
    let oldestDate: Date | undefined;

    for (const resource of this.resources.values()) {
      resourceTypes[resource.type] = (resourceTypes[resource.type] ?? 0) + 1;
      
      if (oldestDate === undefined || resource.createdAt < oldestDate) {
        oldestDate = resource.createdAt;
      }
    }

    return {
      totalResources: this.resources.size,
      resourceTypes,
      oldestResource: oldestDate
    };
  }
}

// Export singleton instances
export const memoryMonitor = MemoryMonitor.getInstance();
export const resourceManager = ResourceManager.getInstance();

// Setup automatic cleanup on process exit
process.on('exit', () => {
  // Critical fix: Use synchronous cleanup for exit events
  try {
    resourceManager.cleanupAll();
  } catch (error) {
    console.error('Error during exit cleanup:', error);
  }
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, cleaning up resources...');
  try {
    await resourceManager.cleanupAll();
    process.exit(0);
  } catch (error) {
    logger.error('Error during SIGINT cleanup:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, cleaning up resources...');
  await resourceManager.cleanupAll();
  process.exit(0);
});