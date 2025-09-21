/**
 * Enterprise Async/Await Utilities
 * Provides advanced async patterns, retry mechanisms, and concurrent processing utilities
 */

import { logger } from '../config/logger';
import { EnterpriseError } from '../utils/error-handling';
import { HTTP_STATUS } from '../constants';

export interface RetryOptions {
  readonly maxAttempts: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly jitter: boolean;
  readonly retryCondition?: (error: Error) => boolean;
  readonly onRetry?: (error: Error, attempt: number) => void;
}

export interface TimeoutOptions {
  readonly timeoutMs: number;
  readonly timeoutMessage?: string;
}

export interface ConcurrencyOptions {
  readonly concurrency: number;
  readonly preserveOrder: boolean;
  readonly failFast: boolean;
}

export interface CircuitBreakerOptions {
  readonly failureThreshold: number;
  readonly recoveryTimeout: number;
  readonly monitoringWindow: number;
  readonly halfOpenMaxCalls: number;
}

export interface BatchProcessingOptions<T> {
  readonly batchSize: number;
  readonly maxConcurrency: number;
  readonly delayBetweenBatches: number;
  readonly onProgress?: (processed: number, total: number, batch: readonly T[]) => void;
  readonly onError?: (error: Error, item: T, batchIndex: number) => void;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Retry utility with exponential backoff and jitter
 */
export class RetryUtils {
  /**
   * Retry an async operation with configurable backoff strategy
   */
  public static async retry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: () => true,
      ...options
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry this error
        if (config.retryCondition && !config.retryCondition(lastError)) {
          throw lastError;
        }

        // Don't retry if this is the last attempt
        if (attempt === config.maxAttempts) {
          throw lastError;
        }

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(lastError, attempt);
        }

        // Calculate delay with exponential backoff
        let delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        // Add jitter if enabled
        if (config.jitter) {
          delay = delay + (Math.random() * delay * 0.1);
        }

        logger.debug(`Retrying operation (attempt ${attempt}/${config.maxAttempts}) after ${delay}ms delay:`, lastError.message);
        await AsyncUtils.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Retry with custom backoff function
   */
  public static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    backoffFunction: (attempt: number) => number,
    maxAttempts: number = 3,
    retryCondition?: (error: Error) => boolean
  ): Promise<T> {
    return this.retry(operation, {
      maxAttempts,
      baseDelay: 0, // Not used with custom backoff
      backoffMultiplier: 1, // Not used with custom backoff
      retryCondition,
      onRetry: async (error, attempt) => {
        const delay = backoffFunction(attempt);
        if (delay > 0) {
          await AsyncUtils.delay(delay);
        }
      }
    });
  }
}

/**
 * Timeout utilities
 */
export class TimeoutUtils {
  /**
   * Add timeout to any promise
   */
  public static withTimeout<T>(
    promise: Promise<T>,
    options: TimeoutOptions
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new EnterpriseError(
          'TIMEOUT_ERROR',
          options.timeoutMessage ?? `Operation timed out after ${options.timeoutMs}ms`,
          HTTP_STATUS.GATEWAY_TIMEOUT,
          { timeoutMs: options.timeoutMs }
        ));
      }, options.timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Create a timeout promise that rejects after specified time
   */
  public static createTimeout(timeoutMs: number, message?: string): Promise<never> {
    return new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new EnterpriseError(
          'TIMEOUT_ERROR',
          message ?? `Timeout after ${timeoutMs}ms`,
          HTTP_STATUS.GATEWAY_TIMEOUT,
          { timeoutMs }
        ));
      }, timeoutMs);
    });
  }
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private readonly metrics: Array<{ timestamp: number; success: boolean }> = [];

  constructor(private readonly options: CircuitBreakerOptions) {}

  /**
   * Execute operation through circuit breaker
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new EnterpriseError(
          'CIRCUIT_BREAKER_OPEN',
          'Circuit breaker is open',
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          { state: this.state, nextAttempt: new Date(this.nextAttempt) }
        );
      } else {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }

    if (this.state === 'HALF_OPEN' && this.successCount >= this.options.halfOpenMaxCalls) {
      throw new EnterpriseError(
        'CIRCUIT_BREAKER_HALF_OPEN_LIMIT',
        'Circuit breaker half-open call limit reached',
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        { state: this.state, successCount: this.successCount }
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker status
   */
  public getStatus(): {
    readonly state: CircuitBreakerState;
    readonly failureCount: number;
    readonly successCount: number;
    readonly nextAttempt?: Date;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt > 0 ? new Date(this.nextAttempt) : undefined
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
    this.metrics.length = 0;
  }

  private onSuccess(): void {
    this.recordMetric(true);
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.recordMetric(false);
    this.failureCount++;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.recoveryTimeout;
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.recoveryTimeout;
    }
  }

  private recordMetric(success: boolean): void {
    const now = Date.now();
    this.metrics.push({ timestamp: now, success });

    // Clean old metrics outside the monitoring window
    const cutoff = now - this.options.monitoringWindow;
    while (this.metrics.length > 0 && this.metrics[0].timestamp < cutoff) {
      this.metrics.shift();
    }
  }
}

/**
 * Concurrent processing utilities
 */
export class ConcurrencyUtils {
  /**
   * Process items with controlled concurrency
   */
  public static async mapWithConcurrency<T, R>(
    items: readonly T[],
    mapper: (item: T, index: number) => Promise<R>,
    options: Partial<ConcurrencyOptions> = {}
  ): Promise<R[]> {
    const config: ConcurrencyOptions = {
      concurrency: 5,
      preserveOrder: true,
      failFast: true,
      ...options
    };

    if (config.preserveOrder) {
      return this.mapWithConcurrencyPreserveOrder(items, mapper, config);
    } else {
      return this.mapWithConcurrencyUnordered(items, mapper, config);
    }
  }

  /**
   * Process items in batches with controlled concurrency
   */
  public static async processBatches<T, R>(
    items: readonly T[],
    processor: (batch: readonly T[], batchIndex: number) => Promise<R[]>,
    options: Partial<BatchProcessingOptions<T>> = {}
  ): Promise<R[]> {
    const config: BatchProcessingOptions<T> = {
      batchSize: 100,
      maxConcurrency: 3,
      delayBetweenBatches: 0,
      ...options
    };

    const batches = this.createBatches(items, config.batchSize);
    const results: R[] = [];
    let processed = 0;

    // Process batches with controlled concurrency
    await this.mapWithConcurrency(
      batches,
      async (batch, batchIndex) => {
        try {
          const batchResults = await processor(batch, batchIndex);
          results.push(...batchResults);
          processed += batch.length;

          if (config.onProgress) {
            config.onProgress(processed, items.length, batch);
          }

          // Add delay between batches if specified
          if (config.delayBetweenBatches > 0 && batchIndex < batches.length - 1) {
            await AsyncUtils.delay(config.delayBetweenBatches);
          }

          return batchResults;
        } catch (error) {
          if (config.onError) {
            for (const item of batch) {
              config.onError(error instanceof Error ? error : new Error(String(error)), item, batchIndex);
            }
          }
          throw error;
        }
      },
      { concurrency: config.maxConcurrency, preserveOrder: true, failFast: false }
    );

    return results;
  }

  /**
   * Execute multiple promises with a semaphore-like concurrency limit
   */
  public static async semaphore<T>(
    tasks: readonly (() => Promise<T>)[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    const executing: Promise<void>[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      const promise = (async (index: number) => {
        results[index] = await task();
      })(i);

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  private static async mapWithConcurrencyPreserveOrder<T, R>(
    items: readonly T[],
    mapper: (item: T, index: number) => Promise<R>,
    config: ConcurrencyOptions
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    const executing: Promise<void>[] = [];
    let index = 0;

    while (index < items.length || executing.length > 0) {
      // Start new tasks up to concurrency limit
      while (executing.length < config.concurrency && index < items.length) {
        const currentIndex = index++;
        const item = items[currentIndex];
        
        const promise = (async () => {
          try {
            results[currentIndex] = await mapper(item, currentIndex);
          } catch (error) {
            if (config.failFast) {
              throw error;
            }
            results[currentIndex] = error as any; // Mark as error but continue
          }
        })();

        executing.push(promise);
      }

      // Wait for at least one to complete
      if (executing.length > 0) {
        await Promise.race(executing);
        // Remove completed promises
        for (let i = executing.length - 1; i >= 0; i--) {
          if (await this.isPromiseResolved(executing[i])) {
            executing.splice(i, 1);
          }
        }
      }
    }

    return results;
  }

  private static async mapWithConcurrencyUnordered<T, R>(
    items: readonly T[],
    mapper: (item: T, index: number) => Promise<R>,
    config: ConcurrencyOptions
  ): Promise<R[]> {
    const results: R[] = [];
    const promises = items.map((item, index) => 
      mapper(item, index).then(result => {
        results.push(result);
        return result;
      })
    );

    if (config.failFast) {
      await Promise.all(promises);
    } else {
      await Promise.allSettled(promises);
    }

    return results;
  }

  private static createBatches<T>(items: readonly T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push([...items.slice(i, i + batchSize)]);
    }
    return batches;
  }

  private static async isPromiseResolved(promise: Promise<any>): Promise<boolean> {
    try {
      await Promise.race([promise, Promise.resolve()]);
      return true;
    } catch {
      return true;
    }
  }
}

/**
 * General async utilities
 */
export class AsyncUtils {
  /**
   * Create a delay promise
   */
  public static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a cancellable promise
   */
  public static createCancellablePromise<T>(
    executor: (resolve: (value: T) => void, reject: (error: Error) => void) => void
  ): { promise: Promise<T>; cancel: () => void } {
    let cancelled = false;
    let cancelResolve: () => void;

    const cancelPromise = new Promise<void>(resolve => {
      cancelResolve = resolve;
    });

    const promise = new Promise<T>((resolve, reject) => {
      executor(
        (value) => {
          if (!cancelled) resolve(value);
        },
        (error) => {
          if (!cancelled) reject(error);
        }
      );

      cancelPromise.then(() => {
        cancelled = true;
        reject(new EnterpriseError(
          'OPERATION_CANCELLED',
          'Operation was cancelled',
          HTTP_STATUS.BAD_REQUEST
        ));
      });
    });

    return {
      promise,
      cancel: () => {
        cancelled = true;
        cancelResolve();
      }
    };
  }

  /**
   * Debounce an async function
   */
  public static debounce<T extends readonly unknown[], R>(
    func: (...args: T) => Promise<R>,
    delayMs: number
  ): (...args: T) => Promise<R> {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingPromise: Promise<R> | null = null;

    return (...args: T): Promise<R> => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      if (pendingPromise === null) {
        pendingPromise = new Promise<R>((resolve, reject) => {
          timeoutId = setTimeout(async () => {
            try {
              const result = await func(...args);
              resolve(result);
            } catch (error) {
              reject(error);
            } finally {
              pendingPromise = null;
              timeoutId = null;
            }
          }, delayMs);
        });
      }

      return pendingPromise;
    };
  }

  /**
   * Throttle an async function
   */
  public static throttle<T extends readonly unknown[], R>(
    func: (...args: T) => Promise<R>,
    intervalMs: number
  ): (...args: T) => Promise<R | undefined> {
    let lastCallTime = 0;
    let pendingPromise: Promise<R> | null = null;

    return async (...args: T): Promise<R | undefined> => {
      const now = Date.now();
      
      if (now - lastCallTime >= intervalMs) {
        lastCallTime = now;
        return func(...args);
      }

      // If there's already a pending throttled call, return undefined
      if (pendingPromise !== null) {
        return undefined;
      }

      // Schedule the call for the next available time
      const delayTime = intervalMs - (now - lastCallTime);
      pendingPromise = this.delay(delayTime).then(() => func(...args));

      try {
        const result = await pendingPromise;
        lastCallTime = Date.now();
        return result;
      } finally {
        pendingPromise = null;
      }
    };
  }

  /**
   * Create a promise that resolves when a condition becomes true
   */
  public static waitFor(
    condition: () => boolean | Promise<boolean>,
    options: {
      readonly intervalMs?: number;
      readonly timeoutMs?: number;
      readonly timeoutMessage?: string;
    } = {}
  ): Promise<void> {
    const config = {
      intervalMs: 100,
      timeoutMs: 30000,
      timeoutMessage: 'Wait condition timeout',
      ...options
    };

    return new Promise<void>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let intervalId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutId !== null) clearTimeout(timeoutId);
        if (intervalId !== null) clearInterval(intervalId);
      };

      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new EnterpriseError(
          'TIMEOUT_ERROR',
          config.timeoutMessage,
          HTTP_STATUS.GATEWAY_TIMEOUT,
          { timeoutMs: config.timeoutMs }
        ));
      }, config.timeoutMs);

      // Check condition periodically
      const checkCondition = async () => {
        try {
          const result = await condition();
          if (result) {
            cleanup();
            resolve();
          }
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      intervalId = setInterval(checkCondition, config.intervalMs);
      checkCondition(); // Check immediately
    });
  }
}

/**
 * Promise pool for managing a fixed number of concurrent promises
 */
export class PromisePool {
  private readonly running = new Set<Promise<unknown>>();
  
  constructor(private readonly maxConcurrency: number) {}

  /**
   * Add a promise to the pool
   */
  public async add<T>(promiseFactory: () => Promise<T>): Promise<T> {
    // Wait for a slot to become available
    while (this.running.size >= this.maxConcurrency) {
      await Promise.race(this.running);
    }

    const promise = promiseFactory();
    this.running.add(promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.running.delete(promise);
    }
  }

  /**
   * Wait for all running promises to complete
   */
  public async drain(): Promise<void> {
    await Promise.all(this.running);
  }

  /**
   * Get current pool statistics
   */
  public getStats(): {
    readonly running: number;
    readonly available: number;
    readonly maxConcurrency: number;
  } {
    return {
      running: this.running.size,
      available: this.maxConcurrency - this.running.size,
      maxConcurrency: this.maxConcurrency
    };
  }
}