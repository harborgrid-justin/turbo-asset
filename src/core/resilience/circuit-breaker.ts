/**
 * Enterprise-grade Circuit Breaker Pattern Implementation
 * Provides resilience and fault tolerance for external service calls
 */

import { EventEmitter } from 'events';
import { getLogger, LogContext, createTimer, createCorrelationId } from '../config/enterprise-logger';

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing fast
  HALF_OPEN = 'half_open' // Testing if service is back
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  readonly failureThreshold: number;      // Number of failures before opening
  readonly successThreshold: number;      // Number of successes to close from half-open
  readonly timeout: number;               // Time in ms before trying half-open
  readonly resetTimeout: number;          // Time in ms to reset failure count
  readonly monitoringWindow: number;      // Time window for failure rate calculation
  readonly slowCallThreshold: number;     // Threshold for slow calls in ms
  readonly slowCallRateThreshold: number; // Percentage of slow calls before opening
  readonly minimumThroughput: number;     // Minimum calls before calculating failure rate
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  readonly state: CircuitBreakerState;
  readonly totalCalls: number;
  readonly successCalls: number;
  readonly failureCalls: number;
  readonly rejectedCalls: number;
  readonly slowCalls: number;
  readonly failureRate: number;
  readonly slowCallRate: number;
  readonly lastFailureTime?: number;
  readonly lastSuccessTime?: number;
  readonly stateTransitions: number;
  readonly uptimePercentage: number;
}

/**
 * Circuit breaker call result
 */
export interface CircuitBreakerResult<TResult> {
  readonly success: boolean;
  readonly result?: TResult;
  readonly error?: Error;
  readonly duration: number;
  readonly fromCache?: boolean;
  readonly circuitState: CircuitBreakerState;
}

/**
 * Circuit breaker error class
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitBreakerState,
    public readonly stats: CircuitBreakerStats
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Call record for tracking within monitoring window
 */
interface CallRecord {
  readonly timestamp: number;
  readonly success: boolean;
  readonly duration: number;
  readonly slow: boolean;
}

/**
 * Enterprise Circuit Breaker implementation
 */
export class EnterpriseCircuitBreaker<TResult = any> extends EventEmitter {
  private readonly logger = getLogger();
  private readonly config: CircuitBreakerConfig;
  private readonly serviceName: string;
  
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private nextAttemptTime = 0;
  private stateTransitionCount = 0;
  
  private readonly callHistory: CallRecord[] = [];

  constructor(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
    super();
    
    this.serviceName = serviceName;
    this.config = {
      failureThreshold: 50,          // 50 failures
      successThreshold: 10,          // 10 successes to close
      timeout: 60000,                // 60 seconds
      resetTimeout: 300000,          // 5 minutes
      monitoringWindow: 120000,      // 2 minutes
      slowCallThreshold: 5000,       // 5 seconds
      slowCallRateThreshold: 50,     // 50% slow calls
      minimumThroughput: 10,         // Minimum 10 calls
      ...config
    };

    this.logger.info('Circuit breaker initialized', {
      serviceName: this.serviceName,
      config: this.config
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T = TResult>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    const timer = createTimer(`circuit-breaker-${this.serviceName}`);
    const startTime = Date.now();

    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        timer.end();
        
        if (fallback) {
          try {
            const fallbackResult = await fallback();
            return {
              success: true,
              result: fallbackResult,
              duration: Date.now() - startTime,
              fromCache: true,
              circuitState: this.state
            };
          } catch (fallbackError) {
            throw new CircuitBreakerError(
              `Circuit breaker is OPEN for service ${this.serviceName} and fallback failed`,
              this.state,
              this.getStatistics()
            );
          }
        }
        
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for service ${this.serviceName}`,
          this.state,
          this.getStatistics()
        );
      } else {
        this.transitionToHalfOpen();
      }
    }

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.recordSuccessfulCall(duration);
      timer.end();

      return {
        success: true,
        result,
        duration,
        circuitState: this.state
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordFailedCall(duration);
      timer.end();

      if (fallback) {
        try {
          const fallbackResult = await fallback();
          return {
            success: true,
            result: fallbackResult,
            duration,
            fromCache: true,
            circuitState: this.state
          };
        } catch (fallbackError) {
          // Fallback also failed, throw original error
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        duration,
        circuitState: this.state
      };
    }
  }

  /**
   * Get current statistics
   */
  getStatistics(): CircuitBreakerStats {
    const recentCalls = this.getRecentCalls();
    const totalCalls = recentCalls.length;
    const successCalls = recentCalls.filter(call => call.success).length;
    const failureCalls = totalCalls - successCalls;
    const slowCalls = recentCalls.filter(call => call.slow).length;

    return {
      state: this.state,
      totalCalls,
      successCalls,
      failureCalls,
      rejectedCalls: 0, // Would track this in full implementation
      slowCalls,
      failureRate: this.calculateFailureRate(recentCalls),
      slowCallRate: this.calculateSlowCallRate(recentCalls),
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateTransitions: this.stateTransitionCount,
      uptimePercentage: totalCalls > 0 ? (successCalls / totalCalls) * 100 : 100
    };
  }

  private recordSuccessfulCall(duration: number): void {
    const now = Date.now();
    const isSlow = duration > this.config.slowCallThreshold;
    
    this.callHistory.push({
      timestamp: now,
      success: true,
      duration,
      slow: isSlow
    });

    this.lastSuccessTime = now;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  private recordFailedCall(duration: number): void {
    const now = Date.now();
    const isSlow = duration > this.config.slowCallThreshold;
    
    this.callHistory.push({
      timestamp: now,
      success: false,
      duration,
      slow: isSlow
    });

    this.failureCount++;
    this.lastFailureTime = now;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.timeout;
    this.stateTransitionCount++;
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0;
    this.stateTransitionCount++;
  }

  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.stateTransitionCount++;
  }

  private getRecentCalls(): CallRecord[] {
    const cutoff = Date.now() - this.config.monitoringWindow;
    return this.callHistory.filter(call => call.timestamp > cutoff);
  }

  private calculateFailureRate(calls: CallRecord[]): number {
    if (calls.length === 0) {return 0;}
    const failures = calls.filter(call => !call.success).length;
    return (failures / calls.length) * 100;
  }

  private calculateSlowCallRate(calls: CallRecord[]): number {
    if (calls.length === 0) {return 0;}
    const slowCalls = calls.filter(call => call.slow).length;
    return (slowCalls / calls.length) * 100;
  }
}

/**
 * Circuit breaker registry for managing multiple instances
 */
export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, EnterpriseCircuitBreaker>();

  getCircuitBreaker(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>
  ): EnterpriseCircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const breaker = new EnterpriseCircuitBreaker(serviceName, config);
      this.breakers.set(serviceName, breaker);
    }

    return this.breakers.get(serviceName)!;
  }
}

// Singleton registry instance
const circuitBreakerRegistry = new CircuitBreakerRegistry();

export function getCircuitBreakerRegistry(): CircuitBreakerRegistry {
  return circuitBreakerRegistry;
}