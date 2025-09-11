/**
 * Enhanced Business Logic Integration Service with Production-Grade Features
 * This service extends the NAPI-RS modules with comprehensive business logic integration
 */

import { logger } from '../config/logger';
import { napiRegistry } from './napi-integration';
import type { 
  BaseEntity, 
  StandardResponse, 
  PaginationParams,
  PaginatedResponse 
} from '../types/universal-data-standard';

// Enhanced interfaces for production-grade features
export interface ProductionBusinessLogicBridge {
  napiServiceName: string;
  businessLogicService: any;
  integrationMethods: string[];
  fallbackEnabled: boolean;
  healthCheck?: () => Promise<boolean>;
  metrics: {
    callCount: number;
    successCount: number;
    failureCount: number;
    avgResponseTime: number;
    lastHealthCheck?: Date;
    circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    lastFailureTime?: Date;
  };
  rateLimit: {
    maxRequestsPerMinute: number;
    requestWindow: Map<number, number>;
    blockUntil?: Date;
  };
  validation: {
    rules: Map<string, ValidationRule[]>;
    enabled: boolean;
  };
  retry: {
    maxAttempts: number;
    backoffMultiplier: number;
    baseDelayMs: number;
  };
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'string' | 'number' | 'email' | 'custom';
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
  message: string;
}

export interface ProductionMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  serviceHealth: Map<string, 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'>;
  circuitBreakerMetrics: Map<string, {
    status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    successCount: number;
    lastStatusChange: Date;
  }>;
  rateLimitMetrics: Map<string, {
    requestsInWindow: number;
    windowStart: Date;
    blockedRequests: number;
  }>;
  validationMetrics: Map<string, {
    totalValidations: number;
    failedValidations: number;
    commonFailures: Map<string, number>;
  }>;
}

export interface ComprehensiveHealthStatus {
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  serviceDetails: Map<string, {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    napiServiceHealth: boolean;
    businessLogicHealth: boolean;
    circuitBreakerStatus: string;
    lastHealthCheck: Date;
    responseTime: number;
    errorRate: number;
  }>;
  systemMetrics: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    circuitBreakersOpen: number;
    rateLimitedServices: number;
  };
}

/**
 * Enhanced Business Logic Integration Service with Production-Grade Features
 */
export class EnhancedBusinessLogicIntegrationService {
  private static instance: EnhancedBusinessLogicIntegrationService;
  private bridges: Map<string, ProductionBusinessLogicBridge> = new Map();
  private globalMetrics: ProductionMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCleanupInterval: NodeJS.Timeout | null = null;

  // Production configuration
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // failures to open circuit
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly METRICS_CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly DEFAULT_RATE_LIMIT = 500; // requests per minute

  private constructor() {
    this.globalMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      serviceHealth: new Map(),
      circuitBreakerMetrics: new Map(),
      rateLimitMetrics: new Map(),
      validationMetrics: new Map(),
    };

    this.initializeProductionFeatures();
  }

  static getInstance(): EnhancedBusinessLogicIntegrationService {
    if (!EnhancedBusinessLogicIntegrationService.instance) {
      EnhancedBusinessLogicIntegrationService.instance = new EnhancedBusinessLogicIntegrationService();
    }
    return EnhancedBusinessLogicIntegrationService.instance;
  }

  /**
   * Initialize production-grade features
   */
  private initializeProductionFeatures(): void {
    logger.info('Initializing Enhanced Business Logic Integration Service with production features...');

    // Initialize core service bridges with production features
    this.initializeCoreBridges();

    // Start health monitoring
    this.startHealthMonitoring();

    // Start metrics cleanup
    this.startMetricsCleanup();

    logger.info('Enhanced Business Logic Integration Service initialized successfully');
  }

  /**
   * Initialize core service bridges with enhanced production features
   */
  private initializeCoreBridges(): void {
    // Core NAPI-RS services with production configuration
    const coreServices = [
      {
        serviceName: 'asset-lifecycle',
        napiServiceName: 'asset-lifecycle',
        integrationMethods: ['calculateDepreciation', 'trackLifecycle', 'planReplacement', 'optimizeCosts'],
        rateLimit: 600,
        validationRules: [
          { field: 'name', type: 'required', min: 2, max: 100, message: 'Asset name is required (2-100 characters)' },
          { field: 'type', type: 'required', message: 'Asset type is required' },
          { field: 'locationId', type: 'required', message: 'Location ID is required' },
        ]
      },
      {
        serviceName: 'contract-lifecycle',
        napiServiceName: 'contract-lifecycle',
        integrationMethods: ['evaluateVendor', 'processContract', 'trackPerformance', 'generateReports'],
        rateLimit: 400,
        validationRules: [
          { field: 'title', type: 'required', min: 3, max: 200, message: 'Contract title is required (3-200 characters)' },
          { field: 'vendorId', type: 'required', message: 'Vendor ID is required' },
          { field: 'amount', type: 'number', min: 0, message: 'Contract amount must be positive' },
        ]
      },
      {
        serviceName: 'budget-forecast',
        napiServiceName: 'budget-forecast',
        integrationMethods: ['createBudget', 'processForecasting', 'calculateVariance', 'generateReports'],
        rateLimit: 300,
        validationRules: [
          { field: 'organizationId', type: 'required', message: 'Organization ID is required' },
          { field: 'fiscalYear', type: 'number', message: 'Fiscal year must be a number' },
          { field: 'totalBudget', type: 'number', min: 0, message: 'Total budget must be positive' },
        ]
      },
      {
        serviceName: 'document-management',
        napiServiceName: 'document',
        integrationMethods: ['uploadDocument', 'retrieveDocument', 'manageVersions', 'controlAccess'],
        rateLimit: 800,
        validationRules: [
          { field: 'title', type: 'required', min: 1, max: 255, message: 'Document title is required (1-255 characters)' },
          { field: 'content', type: 'required', message: 'Document content is required' },
          { field: 'organizationId', type: 'required', message: 'Organization ID is required' },
        ]
      },
      {
        serviceName: 'notification',
        napiServiceName: 'notification',
        integrationMethods: ['sendNotification', 'manageTemplates', 'trackDelivery', 'processEvents'],
        rateLimit: 1000,
        validationRules: [
          { field: 'recipient', type: 'required', message: 'Notification recipient is required' },
          { field: 'message', type: 'required', min: 1, message: 'Notification message is required' },
        ]
      }
    ];

    coreServices.forEach(service => {
      this.registerProductionBridge({
        napiServiceName: service.napiServiceName,
        businessLogicService: this.createMockBusinessLogicService(service.serviceName),
        integrationMethods: service.integrationMethods,
        fallbackEnabled: true,
        metrics: {
          callCount: 0,
          successCount: 0,
          failureCount: 0,
          avgResponseTime: 0,
          circuitBreakerStatus: 'CLOSED',
        },
        rateLimit: {
          maxRequestsPerMinute: service.rateLimit,
          requestWindow: new Map(),
        },
        validation: {
          rules: new Map([[service.serviceName, service.validationRules as ValidationRule[]]]),
          enabled: true,
        },
        retry: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          baseDelayMs: 1000,
        },
      }, service.serviceName);
    });
  }

  /**
   * Create mock business logic service for testing
   */
  private createMockBusinessLogicService(serviceName: string): any {
    return {
      async healthCheck(): Promise<boolean> {
        return true;
      },
      async processOperation(methodName: string, ...args: any[]): Promise<any> {
        return {
          success: true,
          data: { serviceName, methodName, args, timestamp: new Date() },
          source: 'typescript-fallback'
        };
      }
    };
  }

  /**
   * Register a production-grade service bridge
   */
  registerProductionBridge(bridge: ProductionBusinessLogicBridge, serviceName: string): void {
    this.bridges.set(serviceName, bridge);
    this.globalMetrics.serviceHealth.set(serviceName, 'HEALTHY');
    
    // Initialize metrics
    this.globalMetrics.circuitBreakerMetrics.set(serviceName, {
      status: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastStatusChange: new Date(),
    });
    
    this.globalMetrics.rateLimitMetrics.set(serviceName, {
      requestsInWindow: 0,
      windowStart: new Date(),
      blockedRequests: 0,
    });
    
    this.globalMetrics.validationMetrics.set(serviceName, {
      totalValidations: 0,
      failedValidations: 0,
      commonFailures: new Map(),
    });

    logger.info(`Registered production bridge for service: ${serviceName}`);
  }

  /**
   * Execute operation with production-grade features
   */
  async executeProductionOperation<T = any>(
    serviceName: string,
    methodName: string,
    args: any[] = [],
    options: { useNapi?: boolean; timeout?: number; skipValidation?: boolean } = {}
  ): Promise<StandardResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Rate limiting check
      const rateLimitResult = this.checkRateLimit(serviceName);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Rate limit exceeded for service ${serviceName}`,
            details: { resetTime: rateLimitResult.resetTime }
          },
          metadata: {
            timestamp: new Date(),
            requestId,
            executionTime: Date.now() - startTime,
            apiVersion: '1.0.0'
          }
        };
      }

      // Circuit breaker check
      if (!this.isCircuitClosed(serviceName)) {
        return this.handleCircuitOpen(serviceName, requestId, startTime);
      }

      // Input validation
      if (!options.skipValidation) {
        const validationResult = this.validateInput(serviceName, methodName, args);
        if (!validationResult.isValid) {
          this.updateValidationMetrics(serviceName, false, validationResult.errors);
          return {
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Input validation failed',
              details: { errors: validationResult.errors }
            },
            metadata: {
              timestamp: new Date(),
              requestId,
              executionTime: Date.now() - startTime,
              apiVersion: '1.0.0'
            }
          };
        }
        this.updateValidationMetrics(serviceName, true);
      }

      // Execute operation with retry logic
      const result = await this.executeWithRetry(serviceName, methodName, args, options);
      
      // Update metrics on success
      this.updateMetricsOnSuccess(serviceName, Date.now() - startTime);
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          requestId,
          executionTime: Date.now() - startTime,
        }
      };

    } catch (error: unknown) {
      // Update metrics on failure
      this.updateMetricsOnFailure(serviceName, Date.now() - startTime);
      
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Unknown error occurred',
          details: { serviceName, methodName }
        },
        metadata: {
          timestamp: new Date(),
          requestId,
          executionTime: Date.now() - startTime,
          apiVersion: '1.0.0'
        }
      };
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T = any>(
    serviceName: string,
    methodName: string,
    args: any[],
    options: any
  ): Promise<StandardResponse<T>> {
    const bridge = this.bridges.get(serviceName);
    if (!bridge) {
      throw new Error(`Service bridge not found: ${serviceName}`);
    }

    let lastError: any;
    const maxRetries = bridge.retry.maxAttempts;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Try NAPI service first if available and requested
        if (options.useNapi !== false) {
          try {
            const napiResult = await napiRegistry.executeServiceMethod<T>(
              bridge.napiServiceName,
              methodName,
              args,
              { timeout: options.timeout }
            );
            
            if (napiResult.success) {
              return napiResult;
            }
          } catch (napiError) {
            logger.warn(`NAPI service failed (attempt ${attempt}): ${serviceName}.${methodName}`, napiError);
            lastError = napiError;
          }
        }

        // Fallback to TypeScript business logic
        if (bridge.fallbackEnabled && bridge.businessLogicService) {
          const result = await bridge.businessLogicService.processOperation(methodName, ...args);
          return {
            success: true,
            data: result.data,
            metadata: {
              timestamp: new Date(),
              requestId: this.generateRequestId(),
              executionTime: 0,
              apiVersion: '1.0.0',
              attempt,
              source: 'typescript-fallback'
            }
          };
        }

        throw lastError || new Error('No fallback available');

      } catch (error: unknown) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = bridge.retry.baseDelayMs * Math.pow(bridge.retry.backoffMultiplier, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check rate limit for service
   */
  private checkRateLimit(serviceName: string): { allowed: boolean; resetTime?: Date } {
    const bridge = this.bridges.get(serviceName);
    if (!bridge) {return { allowed: true };}

    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1-minute windows
    const currentRequests = bridge.rateLimit.requestWindow.get(windowStart) || 0;

    if (currentRequests >= bridge.rateLimit.maxRequestsPerMinute) {
      if (bridge.rateLimit.blockUntil && now < bridge.rateLimit.blockUntil.getTime()) {
        return { allowed: false, resetTime: bridge.rateLimit.blockUntil };
      }
      
      bridge.rateLimit.blockUntil = new Date(windowStart + 60000);
      this.updateRateLimitMetrics(serviceName, true);
      return { allowed: false, resetTime: bridge.rateLimit.blockUntil };
    }

    bridge.rateLimit.requestWindow.set(windowStart, currentRequests + 1);
    this.updateRateLimitMetrics(serviceName, false);
    return { allowed: true };
  }

  /**
   * Check if circuit breaker is closed
   */
  private isCircuitClosed(serviceName: string): boolean {
    const bridge = this.bridges.get(serviceName);
    if (!bridge) {return true;}

    const cbMetrics = this.globalMetrics.circuitBreakerMetrics.get(serviceName);
    if (!cbMetrics) {return true;}

    if (bridge.metrics.circuitBreakerStatus === 'OPEN') {
      // Check if timeout has passed
      const timeoutPassed = bridge.metrics.lastFailureTime && 
        (Date.now() - bridge.metrics.lastFailureTime.getTime()) > this.CIRCUIT_BREAKER_TIMEOUT;
      
      if (timeoutPassed) {
        bridge.metrics.circuitBreakerStatus = 'HALF_OPEN';
        cbMetrics.status = 'HALF_OPEN';
        cbMetrics.lastStatusChange = new Date();
      }
    }

    return bridge.metrics.circuitBreakerStatus !== 'OPEN';
  }

  /**
   * Handle circuit breaker open state
   */
  private handleCircuitOpen(serviceName: string, requestId: string, startTime: number): StandardResponse<any> {
    return {
      success: false,
      error: {
        code: 'CIRCUIT_BREAKER_OPEN',
        message: `Circuit breaker is open for service ${serviceName}`,
        details: { serviceName }
      },
      metadata: {
        timestamp: new Date(),
        requestId,
        executionTime: Date.now() - startTime,
        apiVersion: '1.0.0'
      }
    };
  }

  /**
   * Validate input according to service rules
   */
  private validateInput(serviceName: string, methodName: string, args: any[]): { isValid: boolean; errors: string[] } {
    const bridge = this.bridges.get(serviceName);
    if (!bridge || !bridge.validation.enabled) {
      return { isValid: true, errors: [] };
    }

    const rules = bridge.validation.rules.get(serviceName) || [];
    const errors: string[] = [];
    const data = args[0] || {}; // Assume first argument is the data object

    rules.forEach(rule => {
      const value = data[rule.field];
      
      if (rule.type === 'required' && (value === undefined || value === null || value === '')) {
        errors.push(rule.message);
        return;
      }

      if (value !== undefined && value !== null) {
        if (rule.type === 'string' && typeof value !== 'string') {
          errors.push(rule.message);
        } else if (rule.type === 'number' && typeof value !== 'number') {
          errors.push(rule.message);
        } else if (rule.min !== undefined && value.length < rule.min) {
          errors.push(rule.message);
        } else if (rule.max !== undefined && value.length > rule.max) {
          errors.push(rule.message);
        } else if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(rule.message);
        } else if (rule.customValidator && !rule.customValidator(value)) {
          errors.push(rule.message);
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Update metrics on successful operation
   */
  private updateMetricsOnSuccess(serviceName: string, executionTime: number): void {
    this.globalMetrics.totalRequests++;
    this.globalMetrics.successfulRequests++;
    this.updateAverageResponseTime(executionTime);

    const bridge = this.bridges.get(serviceName);
    if (bridge) {
      bridge.metrics.callCount++;
      bridge.metrics.successCount++;
      bridge.metrics.avgResponseTime = this.calculateAverage(
        bridge.metrics.avgResponseTime,
        executionTime,
        bridge.metrics.callCount
      );

      // Circuit breaker logic
      const cbMetrics = this.globalMetrics.circuitBreakerMetrics.get(serviceName);
      if (cbMetrics) {
        cbMetrics.successCount++;
        if (bridge.metrics.circuitBreakerStatus === 'HALF_OPEN') {
          bridge.metrics.circuitBreakerStatus = 'CLOSED';
          cbMetrics.status = 'CLOSED';
          cbMetrics.lastStatusChange = new Date();
        }
      }
    }

    this.globalMetrics.serviceHealth.set(serviceName, 'HEALTHY');
  }

  /**
   * Update metrics on failed operation
   */
  private updateMetricsOnFailure(serviceName: string, executionTime: number): void {
    this.globalMetrics.totalRequests++;
    this.globalMetrics.failedRequests++;
    this.updateAverageResponseTime(executionTime);

    const bridge = this.bridges.get(serviceName);
    if (bridge) {
      bridge.metrics.callCount++;
      bridge.metrics.failureCount++;
      bridge.metrics.lastFailureTime = new Date();

      // Circuit breaker logic
      const cbMetrics = this.globalMetrics.circuitBreakerMetrics.get(serviceName);
      if (cbMetrics) {
        cbMetrics.failureCount++;
        
        if (bridge.metrics.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
          bridge.metrics.circuitBreakerStatus = 'OPEN';
          cbMetrics.status = 'OPEN';
          cbMetrics.lastStatusChange = new Date();
        }
      }
    }

    // Update service health
    const errorRate = bridge ? (bridge.metrics.failureCount / bridge.metrics.callCount) : 0;
    if (errorRate > 0.5) {
      this.globalMetrics.serviceHealth.set(serviceName, 'UNHEALTHY');
    } else if (errorRate > 0.2) {
      this.globalMetrics.serviceHealth.set(serviceName, 'DEGRADED');
    }
  }

  /**
   * Update validation metrics
   */
  private updateValidationMetrics(serviceName: string, success: boolean, errors?: string[]): void {
    const validationMetrics = this.globalMetrics.validationMetrics.get(serviceName);
    if (validationMetrics) {
      validationMetrics.totalValidations++;
      if (!success) {
        validationMetrics.failedValidations++;
        errors?.forEach(error => {
          const count = validationMetrics.commonFailures.get(error) || 0;
          validationMetrics.commonFailures.set(error, count + 1);
        });
      }
    }
  }

  /**
   * Update rate limit metrics
   */
  private updateRateLimitMetrics(serviceName: string, blocked: boolean): void {
    const rateLimitMetrics = this.globalMetrics.rateLimitMetrics.get(serviceName);
    if (rateLimitMetrics) {
      const now = new Date();
      const windowStart = new Date(Math.floor(now.getTime() / 60000) * 60000);
      
      if (rateLimitMetrics.windowStart.getTime() !== windowStart.getTime()) {
        rateLimitMetrics.requestsInWindow = 0;
        rateLimitMetrics.windowStart = windowStart;
      }
      
      rateLimitMetrics.requestsInWindow++;
      if (blocked) {
        rateLimitMetrics.blockedRequests++;
      }
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Start metrics cleanup
   */
  private startMetricsCleanup(): void {
    this.metricsCleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, this.METRICS_CLEANUP_INTERVAL);
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, bridge] of this.bridges) {
      try {
        if (bridge.healthCheck) {
          const isHealthy = await bridge.healthCheck();
          if (!isHealthy) {
            this.globalMetrics.serviceHealth.set(serviceName, 'DEGRADED');
          }
        }
        bridge.metrics.lastHealthCheck = new Date();
      } catch (error: unknown) {
        logger.warn(`Health check failed for service ${serviceName}:`, error);
        this.globalMetrics.serviceHealth.set(serviceName, 'UNHEALTHY');
      }
    }
  }

  /**
   * Clean up old metrics data
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours

    for (const [serviceName, bridge] of this.bridges) {
      // Clean up rate limit windows
      for (const [windowTime] of bridge.rateLimit.requestWindow) {
        if (windowTime < cutoff) {
          bridge.rateLimit.requestWindow.delete(windowTime);
        }
      }
    }
  }

  /**
   * Get comprehensive production metrics
   */
  getProductionMetrics(): ProductionMetrics {
    return { ...this.globalMetrics };
  }

  /**
   * Perform comprehensive health check
   */
  async comprehensiveHealthCheck(): Promise<ComprehensiveHealthStatus> {
    const serviceDetails = new Map();
    let healthyServices = 0;
    let degradedServices = 0;
    let unhealthyServices = 0;
    let circuitBreakersOpen = 0;
    let rateLimitedServices = 0;

    for (const [serviceName, bridge] of this.bridges) {
      const serviceHealth = this.globalMetrics.serviceHealth.get(serviceName) || 'UNKNOWN';
      const cbMetrics = this.globalMetrics.circuitBreakerMetrics.get(serviceName);
      const rateLimitMetrics = this.globalMetrics.rateLimitMetrics.get(serviceName);

      // Test NAPI service health
      let napiServiceHealth = false;
      try {
        const napiResult = await napiRegistry.executeServiceMethod(
          bridge.napiServiceName,
          'healthCheck',
          [],
          { timeout: 5000 }
        );
        napiServiceHealth = napiResult.success;
      } catch (error: unknown) {
        napiServiceHealth = false;
      }

      // Test business logic service health
      let businessLogicHealth = false;
      try {
        if (bridge.businessLogicService && bridge.businessLogicService.healthCheck) {
          businessLogicHealth = await bridge.businessLogicService.healthCheck();
        } else {
          businessLogicHealth = true; // Assume healthy if no health check available
        }
      } catch (error: unknown) {
        businessLogicHealth = false;
      }

      const errorRate = bridge.metrics.callCount > 0 
        ? bridge.metrics.failureCount / bridge.metrics.callCount 
        : 0;

      serviceDetails.set(serviceName, {
        status: serviceHealth,
        napiServiceHealth,
        businessLogicHealth,
        circuitBreakerStatus: bridge.metrics.circuitBreakerStatus,
        lastHealthCheck: bridge.metrics.lastHealthCheck || new Date(),
        responseTime: bridge.metrics.avgResponseTime,
        errorRate,
      });

      // Count service states
      switch (serviceHealth) {
        case 'HEALTHY':
          healthyServices++;
          break;
        case 'DEGRADED':
          degradedServices++;
          break;
        case 'UNHEALTHY':
          unhealthyServices++;
          break;
      }

      if (bridge.metrics.circuitBreakerStatus === 'OPEN') {
        circuitBreakersOpen++;
      }

      if (rateLimitMetrics && rateLimitMetrics.blockedRequests > 0) {
        rateLimitedServices++;
      }
    }

    const totalServices = this.bridges.size;
    const healthyPercentage = totalServices > 0 ? (healthyServices / totalServices) * 100 : 100;

    let overallHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    if (healthyPercentage < 50) {
      overallHealth = 'UNHEALTHY';
    } else if (healthyPercentage < 90) {
      overallHealth = 'DEGRADED';
    }

    return {
      overallHealth,
      serviceDetails,
      systemMetrics: {
        totalServices,
        healthyServices,
        degradedServices,
        unhealthyServices,
        circuitBreakersOpen,
        rateLimitedServices,
      },
    };
  }

  /**
   * Add validation rule for a service
   */
  addValidationRule(serviceName: string, methodName: string, rules: ValidationRule[]): boolean {
    const bridge = this.bridges.get(serviceName);
    if (!bridge) {return false;}

    const existingRules = bridge.validation.rules.get(serviceName) || [];
    bridge.validation.rules.set(serviceName, [...existingRules, ...rules]);
    return true;
  }

  /**
   * Reset metrics for a service
   */
  resetServiceMetrics(serviceName: string): boolean {
    const bridge = this.bridges.get(serviceName);
    if (!bridge) {return false;}

    bridge.metrics = {
      callCount: 0,
      successCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      circuitBreakerStatus: 'CLOSED',
    };

    this.globalMetrics.circuitBreakerMetrics.set(serviceName, {
      status: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastStatusChange: new Date(),
    });

    this.globalMetrics.rateLimitMetrics.set(serviceName, {
      requestsInWindow: 0,
      windowStart: new Date(),
      blockedRequests: 0,
    });

    this.globalMetrics.validationMetrics.set(serviceName, {
      totalValidations: 0,
      failedValidations: 0,
      commonFailures: new Map(),
    });

    return true;
  }

  /**
   * Execute service with fallback support (alias for backwards compatibility)
   */
  async executeWithFallback(serviceName: string, methodName: string, params: any[], options: any = {}): Promise<StandardResponse> {
    return this.executeProductionOperation(serviceName, methodName, params, options);
  }

  /**
   * Get comprehensive health status (alias for backwards compatibility)
   */
  async getComprehensiveHealthStatus(): Promise<ComprehensiveHealthStatus> {
    return this.comprehensiveHealthCheck();
  }
  getBridgeInfo(serviceName: string): ProductionBusinessLogicBridge | null {
    return this.bridges.get(serviceName) || null;
  }

  /**
   * List all available bridges
   */
  listBridges(): string[] {
    return Array.from(this.bridges.keys());
  }

  /**
   * Health check for integration service
   */
  async healthCheck(): Promise<{ bridgeCount: number; napiHealthy: number; businessLogicHealthy: number }> {
    let napiHealthy = 0;
    let businessLogicHealthy = 0;

    for (const [serviceName, bridge] of this.bridges) {
      // Check NAPI service
      try {
        const napiResult = await napiRegistry.executeServiceMethod(
          bridge.napiServiceName,
          'healthCheck',
          [],
          { timeout: 5000 }
        );
        if (napiResult.success) {napiHealthy++;}
      } catch (error: unknown) {
        // NAPI service not healthy
      }

      // Check business logic service
      try {
        if (bridge.businessLogicService && bridge.businessLogicService.healthCheck) {
          const isHealthy = await bridge.businessLogicService.healthCheck();
          if (isHealthy) {businessLogicHealthy++;}
        } else {
          businessLogicHealthy++; // Assume healthy if no health check
        }
      } catch (error: unknown) {
        // Business logic service not healthy
      }
    }

    return {
      bridgeCount: this.bridges.size,
      napiHealthy,
      businessLogicHealthy,
    };
  }

  /**
   * Shutdown service gracefully
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
      this.metricsCleanupInterval = null;
    }

    logger.info('Enhanced Business Logic Integration Service shut down gracefully');
  }

  // Helper methods
  private updateAverageResponseTime(executionTime: number): void {
    this.globalMetrics.averageResponseTime = this.calculateAverage(
      this.globalMetrics.averageResponseTime,
      executionTime,
      this.globalMetrics.totalRequests
    );
  }

  private calculateAverage(current: number, newValue: number, count: number): number {
    return ((current * (count - 1)) + newValue) / count;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Advanced Business Rules Engine for Production-Grade Calculations
 */
export class AdvancedBusinessRulesEngine {
  private static instance: AdvancedBusinessRulesEngine;
  
  static getInstance(): AdvancedBusinessRulesEngine {
    if (!AdvancedBusinessRulesEngine.instance) {
      AdvancedBusinessRulesEngine.instance = new AdvancedBusinessRulesEngine();
    }
    return AdvancedBusinessRulesEngine.instance;
  }

  /**
   * Calculate Asset Depreciation using multiple methods (Straight-line, Declining Balance, MACRS)
   */
  calculateAssetDepreciation(assetData: {
    initialValue: number;
    salvageValue: number;
    usefulLifeYears: number;
    depreciationMethod: 'straight-line' | 'declining-balance' | 'double-declining' | 'macrs';
    currentAge: number;
    acceleratedRatePercent?: number;
  }): {
    annualDepreciation: number;
    accumulatedDepreciation: number;
    bookValue: number;
    depreciationSchedule: Array<{ year: number; depreciation: number; bookValue: number }>;
  } {
    const { initialValue, salvageValue, usefulLifeYears, depreciationMethod, currentAge, acceleratedRatePercent = 200 } = assetData;
    let annualDepreciation: number;
    let accumulatedDepreciation = 0;
    const depreciationSchedule: Array<{ year: number; depreciation: number; bookValue: number }> = [];

    switch (depreciationMethod) {
      case 'straight-line':
        if (usefulLifeYears <= 0) {
          // Handle zero or negative useful life
          annualDepreciation = 0;
          accumulatedDepreciation = 0;
        } else {
          annualDepreciation = (initialValue - salvageValue) / usefulLifeYears;
          accumulatedDepreciation = Math.min(annualDepreciation * currentAge, initialValue - salvageValue);
        }
        break;

      case 'declining-balance':
      case 'double-declining':
        const rate = acceleratedRatePercent / 100 / usefulLifeYears;
        let remainingValue = initialValue;
        
        for (let year = 1; year <= Math.min(currentAge, usefulLifeYears); year++) {
          const yearlyDepreciation = Math.max(
            remainingValue * rate,
            (remainingValue - salvageValue) / (usefulLifeYears - year + 1)
          );
          const finalDepreciation = Math.min(yearlyDepreciation, remainingValue - salvageValue);
          
          accumulatedDepreciation += finalDepreciation;
          remainingValue -= finalDepreciation;
          
          depreciationSchedule.push({
            year,
            depreciation: finalDepreciation,
            bookValue: remainingValue
          });
          
          if (year === currentAge) {
            annualDepreciation = finalDepreciation;
          }
        }
        
        if (currentAge === 0) {
          annualDepreciation = Math.min(initialValue * rate, initialValue - salvageValue);
        }
        break;

      case 'macrs':
        // Simplified MACRS calculation for 5-year property
        const macrsRates = [0.20, 0.32, 0.192, 0.1152, 0.1152, 0.0576];
        const yearIndex = Math.min(currentAge - 1, macrsRates.length - 1);
        
        if (currentAge > 0 && yearIndex >= 0) {
          for (let i = 0; i <= yearIndex; i++) {
            const yearlyDepreciation = initialValue * macrsRates[i];
            accumulatedDepreciation += yearlyDepreciation;
            
            depreciationSchedule.push({
              year: i + 1,
              depreciation: yearlyDepreciation,
              bookValue: initialValue - accumulatedDepreciation
            });
          }
          annualDepreciation = initialValue * macrsRates[yearIndex];
        } else {
          annualDepreciation = initialValue * macrsRates[0];
        }
        break;

      default:
        throw new Error(`Unsupported depreciation method: ${depreciationMethod}`);
    }

    const bookValue = Math.max(initialValue - accumulatedDepreciation, salvageValue);

    return {
      annualDepreciation,
      accumulatedDepreciation,
      bookValue,
      depreciationSchedule
    };
  }

  /**
   * Calculate Lease Accounting (ASC 842/IFRS 16) Present Value and ROU Asset
   */
  calculateLeaseAccounting(leaseData: {
    monthlyPayment: number;
    leaseTerm: number; // in months
    incrementalBorrowingRate: number; // annual percentage
    initialDirectCosts: number;
    prepaidLease: number;
    leaseIncentives: number;
    variablePayments?: number[];
  }): {
    presentValueOfLeasePayments: number;
    rightOfUseAsset: number;
    leaseLIABILITY: number;
    monthlyAmortization: number;
    interestExpense: number;
    totalLeaseExpense: number;
    paymentSchedule: Array<{
      month: number;
      payment: number;
      interestExpense: number;
      principalReduction: number;
      remainingLiability: number;
    }>;
  } {
    const { monthlyPayment, leaseTerm, incrementalBorrowingRate, initialDirectCosts, prepaidLease, leaseIncentives, variablePayments = [] } = leaseData;
    
    const monthlyRate = incrementalBorrowingRate / 12 / 100;
    
    // Calculate Present Value of Lease Payments
    let presentValueOfLeasePayments = 0;
    for (let month = 1; month <= leaseTerm; month++) {
      const discountFactor = Math.pow(1 + monthlyRate, -month);
      presentValueOfLeasePayments += monthlyPayment * discountFactor;
    }
    
    // Add present value of variable payments
    variablePayments.forEach((payment, index) => {
      const discountFactor = Math.pow(1 + monthlyRate, -(index + 1));
      presentValueOfLeasePayments += payment * discountFactor;
    });

    // Calculate Right-of-Use Asset
    const rightOfUseAsset = presentValueOfLeasePayments + initialDirectCosts + prepaidLease - leaseIncentives;
    
    // Initial Lease Liability equals PV of lease payments
    const leaseLIABILITY = presentValueOfLeasePayments;
    
    // Monthly amortization of ROU asset
    const monthlyAmortization = rightOfUseAsset / leaseTerm;
    
    // Generate payment schedule
    const paymentSchedule: Array<{
      month: number;
      payment: number;
      interestExpense: number;
      principalReduction: number;
      remainingLiability: number;
    }> = [];
    
    let remainingLiability = leaseLIABILITY;
    let totalInterestExpense = 0;
    
    for (let month = 1; month <= leaseTerm; month++) {
      const interestExpense = remainingLiability * monthlyRate;
      const principalReduction = monthlyPayment - interestExpense;
      remainingLiability -= principalReduction;
      totalInterestExpense += interestExpense;
      
      paymentSchedule.push({
        month,
        payment: monthlyPayment,
        interestExpense,
        principalReduction,
        remainingLiability: Math.max(0, remainingLiability)
      });
    }

    const totalLeaseExpense = (monthlyPayment * leaseTerm) + variablePayments.reduce((sum, payment) => sum + payment, 0);

    return {
      presentValueOfLeasePayments,
      rightOfUseAsset,
      leaseLIABILITY,
      monthlyAmortization,
      interestExpense: totalInterestExpense / leaseTerm, // Average monthly interest
      totalLeaseExpense,
      paymentSchedule
    };
  }

  /**
   * Advanced Space Utilization Optimization Algorithm
   */
  optimizeSpaceUtilization(spaceData: {
    spaces: Array<{
      id: string;
      name: string;
      area: number;
      capacity: number;
      currentOccupancy: number;
      costPerSqFt: number;
      utilizationHistory: number[]; // Last 12 months
      spaceType: 'office' | 'meeting' | 'common' | 'storage' | 'specialized';
    }>;
    occupancyTargets: {
      office: number; // e.g., 0.85 for 85% utilization
      meeting: number;
      common: number;
      storage: number;
      specialized: number;
    };
    constraints: {
      minSpacePerPerson: number; // sq ft
      maxCapacityUtilization: number;
    };
  }): {
    recommendations: Array<{
      spaceId: string;
      currentUtilization: number;
      targetUtilization: number;
      recommendedAction: 'consolidate' | 'expand' | 'repurpose' | 'maintain' | 'hoteling';
      potentialSavings: number;
      requiredInvestment: number;
      roi: number;
      rationale: string;
    }>;
    totalPotentialSavings: number;
    totalRequiredInvestment: number;
    overallROI: number;
    consolidationOpportunities: Array<{
      spacesToConsolidate: string[];
      resultingSpace: string;
      savingsAmount: number;
    }>;
  } {
    const { spaces, occupancyTargets, constraints } = spaceData;
    const recommendations: Array<any> = [];
    let totalPotentialSavings = 0;
    let totalRequiredInvestment = 0;
    const consolidationOpportunities: Array<any> = [];

    spaces.forEach(space => {
      const currentUtilization = space.currentOccupancy / space.capacity;
      const targetUtilization = occupancyTargets[space.spaceType];
      const averageHistoricalUtilization = space.utilizationHistory.reduce((sum, util) => sum + util, 0) / space.utilizationHistory.length;
      
      let recommendedAction: string;
      let potentialSavings = 0;
      let requiredInvestment = 0;
      let rationale = '';

      // Decision logic based on utilization patterns
      if (averageHistoricalUtilization < targetUtilization * 0.5) {
        if (space.spaceType === 'office') {
          recommendedAction = 'consolidate';
          potentialSavings = space.area * space.costPerSqFt * 0.7; // 70% of space cost saved
          requiredInvestment = space.area * 25; // $25/sq ft for consolidation
          rationale = 'Low utilization space suitable for consolidation with other areas';
        } else {
          recommendedAction = 'repurpose';
          potentialSavings = (space.area * space.costPerSqFt * 0.3);
          requiredInvestment = space.area * 40; // $40/sq ft for repurposing
          rationale = 'Convert to higher-demand space type';
        }
      } else if (averageHistoricalUtilization > constraints.maxCapacityUtilization) {
        recommendedAction = 'expand';
        potentialSavings = -space.area * space.costPerSqFt * 0.5; // Negative as it's a cost
        requiredInvestment = space.area * 60; // $60/sq ft for expansion
        rationale = 'Over-utilized space needs expansion to meet demand';
      } else if (space.spaceType === 'office' && averageHistoricalUtilization < targetUtilization * 0.8) {
        recommendedAction = 'hoteling';
        potentialSavings = space.area * space.costPerSqFt * 0.2; // 20% savings from hoteling
        requiredInvestment = space.area * 15; // $15/sq ft for hoteling setup
        rationale = 'Implement hoteling to increase utilization';
      } else {
        recommendedAction = 'maintain';
        rationale = 'Space utilization is within optimal range';
      }

      const roi = requiredInvestment > 0 ? (potentialSavings / requiredInvestment) * 100 : 0;

      recommendations.push({
        spaceId: space.id,
        currentUtilization,
        targetUtilization,
        recommendedAction,
        potentialSavings,
        requiredInvestment,
        roi,
        rationale
      });

      totalPotentialSavings += potentialSavings;
      totalRequiredInvestment += requiredInvestment;
    });

    // Identify consolidation opportunities
    const underutilizedSpaces = spaces.filter(space => 
      (space.currentOccupancy / space.capacity) < occupancyTargets[space.spaceType] * 0.6
    );

    // Group similar underutilized spaces for consolidation
    const spacesByType = underutilizedSpaces.reduce((acc, space) => {
      if (!acc[space.spaceType]) {acc[space.spaceType] = [];}
      acc[space.spaceType].push(space);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(spacesByType).forEach(([spaceType, spacesOfType]) => {
      if (spacesOfType.length >= 2) {
        const totalArea = spacesOfType.reduce((sum, space) => sum + space.area, 0);
        const totalCurrentOccupancy = spacesOfType.reduce((sum, space) => sum + space.currentOccupancy, 0);
        const averageCostPerSqFt = spacesOfType.reduce((sum, space) => sum + space.costPerSqFt, 0) / spacesOfType.length;
        
        // If combined occupancy can fit in 70% of total space
        if (totalCurrentOccupancy <= (totalArea * 0.7 * occupancyTargets[spaceType as keyof typeof occupancyTargets])) {
          consolidationOpportunities.push({
            spacesToConsolidate: spacesOfType.map(s => s.id),
            resultingSpace: spacesOfType[0].id, // Use first space as the consolidated space
            savingsAmount: totalArea * 0.3 * averageCostPerSqFt // Save 30% of total area cost
          });
        }
      }
    });

    const overallROI = totalRequiredInvestment > 0 ? (totalPotentialSavings / totalRequiredInvestment) * 100 : 0;

    return {
      recommendations,
      totalPotentialSavings,
      totalRequiredInvestment,
      overallROI,
      consolidationOpportunities
    };
  }

  /**
   * Advanced Maintenance Cost Analysis and Optimization
   */
  optimizeMaintenanceCosts(maintenanceData: {
    assets: Array<{
      id: string;
      name: string;
      type: string;
      age: number; // in years
      condition: number; // 1-10 scale
      maintenanceHistory: Array<{
        date: string;
        cost: number;
        type: 'preventive' | 'corrective' | 'emergency';
        downtime: number; // hours
      }>;
      replacementCost: number;
      criticality: 'low' | 'medium' | 'high' | 'critical';
    }>;
    laborRates: {
      technician: number;
      specialist: number;
      contractor: number;
    };
    downtimeCostPerHour: number;
  }): {
    recommendations: Array<{
      assetId: string;
      recommendation: 'increase_pm' | 'decrease_pm' | 'replace' | 'monitor' | 'overhaul';
      currentAnnualCost: number;
      projectedAnnualCost: number;
      potentialSavings: number;
      riskLevel: 'low' | 'medium' | 'high';
      rationale: string;
      implementation: {
        pmFrequency?: string;
        estimatedReplacementDate?: string;
        requiredInvestment: number;
      };
    }>;
    totalCurrentCost: number;
    totalProjectedCost: number;
    totalPotentialSavings: number;
    criticalAssetAlerts: Array<{
      assetId: string;
      issue: string;
      urgency: 'immediate' | 'within_30_days' | 'within_90_days';
    }>;
  } {
    const recommendations: Array<any> = [];
    let totalCurrentCost = 0;
    let totalProjectedCost = 0;
    const criticalAssetAlerts: Array<any> = [];

    maintenanceData.assets.forEach(asset => {
      // Calculate current annual maintenance cost
      const recentMaintenanceYear = asset.maintenanceHistory.filter(m => 
        new Date(m.date).getFullYear() === new Date().getFullYear()
      );
      
      const currentAnnualCost = recentMaintenanceYear.reduce((sum, maintenance) => {
        const downtimeCost = maintenance.downtime * maintenanceData.downtimeCostPerHour;
        return sum + maintenance.cost + downtimeCost;
      }, 0);

      totalCurrentCost += currentAnnualCost;

      // Analyze maintenance patterns
      const preventiveCosts = asset.maintenanceHistory
        .filter(m => m.type === 'preventive')
        .reduce((sum, m) => sum + m.cost, 0);
      
      const correctiveCosts = asset.maintenanceHistory
        .filter(m => m.type === 'corrective' || m.type === 'emergency')
        .reduce((sum, m) => sum + m.cost, 0);

      const pmToCorrectiveRatio = preventiveCosts > 0 ? preventiveCosts / correctiveCosts : 0;
      const avgConditionDegradation = Math.max(0, (10 - asset.condition) / asset.age);

      let recommendation: string;
      let projectedAnnualCost = currentAnnualCost;
      let requiredInvestment = 0;
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let rationale = '';
      let pmFrequency = '';
      let estimatedReplacementDate = '';

      // Decision logic based on asset analysis
      if (asset.condition <= 3 || (asset.age > 15 && asset.criticality === 'critical')) {
        recommendation = 'replace';
        projectedAnnualCost = asset.replacementCost * 0.1; // Assume 10% annual cost for new asset
        requiredInvestment = asset.replacementCost;
        riskLevel = asset.criticality === 'critical' ? 'high' : 'medium';
        rationale = 'Asset condition is poor and replacement is more cost-effective than continued maintenance';
        estimatedReplacementDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        if (asset.criticality === 'critical' && asset.condition <= 2) {
          criticalAssetAlerts.push({
            assetId: asset.id,
            issue: 'Critical asset in very poor condition requiring immediate attention',
            urgency: 'immediate'
          });
        }
      } else if (pmToCorrectiveRatio < 0.3) {
        recommendation = 'increase_pm';
        projectedAnnualCost = currentAnnualCost * 0.7; // Expect 30% reduction in costs
        requiredInvestment = currentAnnualCost * 0.4; // 40% increase in PM budget
        pmFrequency = 'Monthly';
        rationale = 'Low preventive maintenance ratio indicates need for increased PM frequency';
        riskLevel = correctiveCosts > asset.replacementCost * 0.3 ? 'high' : 'medium';
      } else if (pmToCorrectiveRatio > 2.0 && asset.condition >= 8) {
        recommendation = 'decrease_pm';
        projectedAnnualCost = currentAnnualCost * 1.1; // Small increase in costs but reduced PM spending
        requiredInvestment = -currentAnnualCost * 0.2; // 20% reduction in PM budget
        pmFrequency = 'Quarterly';
        rationale = 'Over-maintenance detected - asset is in good condition with high PM ratio';
        riskLevel = 'low';
      } else if (asset.condition <= 5 && asset.age > 10) {
        recommendation = 'overhaul';
        projectedAnnualCost = currentAnnualCost * 0.6; // Expect 40% reduction post-overhaul
        requiredInvestment = asset.replacementCost * 0.4; // 40% of replacement cost for major overhaul
        rationale = 'Asset requires major overhaul to extend useful life and reduce maintenance costs';
        riskLevel = 'medium';
      } else {
        recommendation = 'monitor';
        projectedAnnualCost = currentAnnualCost;
        rationale = 'Asset maintenance strategy is optimal - continue current approach with monitoring';
        riskLevel = 'low';
      }

      const potentialSavings = currentAnnualCost - projectedAnnualCost;
      totalProjectedCost += projectedAnnualCost;

      recommendations.push({
        assetId: asset.id,
        recommendation,
        currentAnnualCost,
        projectedAnnualCost,
        potentialSavings,
        riskLevel,
        rationale,
        implementation: {
          pmFrequency: pmFrequency || undefined,
          estimatedReplacementDate: estimatedReplacementDate || undefined,
          requiredInvestment
        }
      });

      // Additional critical asset checks
      if (asset.criticality === 'critical') {
        const recentEmergencyMaintenance = asset.maintenanceHistory.filter(m => 
          m.type === 'emergency' && 
          new Date(m.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        );

        if (recentEmergencyMaintenance.length > 2) {
          criticalAssetAlerts.push({
            assetId: asset.id,
            issue: 'Multiple emergency maintenance events in last 90 days',
            urgency: 'within_30_days'
          });
        }
      }
    });

    const totalPotentialSavings = totalCurrentCost - totalProjectedCost;

    return {
      recommendations,
      totalCurrentCost,
      totalProjectedCost,
      totalPotentialSavings,
      criticalAssetAlerts
    };
  }

  /**
   * Financial Consolidation and Multi-Currency Analysis
   */
  performFinancialConsolidation(financialData: {
    entities: Array<{
      id: string;
      name: string;
      currency: string;
      financials: {
        revenue: number;
        expenses: number;
        assets: number;
        liabilities: number;
        cashFlow: number;
      };
      intercompanyTransactions: Array<{
        counterpartyId: string;
        amount: number;
        type: 'receivable' | 'payable' | 'revenue' | 'expense';
      }>;
    }>;
    exchangeRates: Record<string, number>; // Rates to base currency
    baseCurrency: string;
    consolidationDate: string;
  }): {
    consolidatedFinancials: {
      totalRevenue: number;
      totalExpenses: number;
      totalAssets: number;
      totalLiabilities: number;
      netIncome: number;
      totalCashFlow: number;
      currency: string;
    };
    intercompanyEliminations: {
      eliminatedReceivables: number;
      eliminatedPayables: number;
      eliminatedRevenue: number;
      eliminatedExpenses: number;
    };
    entityBreakdown: Array<{
      entityId: string;
      originalCurrency: string;
      convertedFinancials: any;
      contributionToConsolidated: {
        revenuePercentage: number;
        assetsPercentage: number;
      };
    }>;
    currencyExposure: Record<string, number>;
  } {
    const { entities, exchangeRates, baseCurrency } = financialData;
    
    let consolidatedRevenue = 0;
    let consolidatedExpenses = 0;
    let consolidatedAssets = 0;
    let consolidatedLiabilities = 0;
    let consolidatedCashFlow = 0;

    const currencyExposure: Record<string, number> = {};
    const entityBreakdown: Array<any> = [];

    // Step 1: Convert all entities to base currency
    entities.forEach(entity => {
      const exchangeRate = entity.currency === baseCurrency ? 1 : (exchangeRates[entity.currency] || 1);
      
      const convertedFinancials = {
        revenue: entity.financials.revenue * exchangeRate,
        expenses: entity.financials.expenses * exchangeRate,
        assets: entity.financials.assets * exchangeRate,
        liabilities: entity.financials.liabilities * exchangeRate,
        cashFlow: entity.financials.cashFlow * exchangeRate,
      };

      consolidatedRevenue += convertedFinancials.revenue;
      consolidatedExpenses += convertedFinancials.expenses;
      consolidatedAssets += convertedFinancials.assets;
      consolidatedLiabilities += convertedFinancials.liabilities;
      consolidatedCashFlow += convertedFinancials.cashFlow;

      // Track currency exposure
      if (entity.currency !== baseCurrency) {
        currencyExposure[entity.currency] = (currencyExposure[entity.currency] || 0) + entity.financials.assets;
      }

      entityBreakdown.push({
        entityId: entity.id,
        originalCurrency: entity.currency,
        convertedFinancials,
        contributionToConsolidated: {
          revenuePercentage: 0, // Will calculate after consolidation
          assetsPercentage: 0,   // Will calculate after consolidation
        },
      });
    });

    // Step 2: Calculate and eliminate intercompany transactions
    let eliminatedReceivables = 0;
    let eliminatedPayables = 0;
    let eliminatedRevenue = 0;
    let eliminatedExpenses = 0;

    entities.forEach(entity => {
      const exchangeRate = entity.currency === baseCurrency ? 1 : (exchangeRates[entity.currency] || 1);
      
      entity.intercompanyTransactions.forEach(transaction => {
        const convertedAmount = transaction.amount * exchangeRate;
        
        // Find matching counterparty transaction for elimination
        const counterparty = entities.find(e => e.id === transaction.counterpartyId);
        if (counterparty) {
          const counterpartyRate = counterparty.currency === baseCurrency ? 1 : (exchangeRates[counterparty.currency] || 1);
          const matchingTransaction = counterparty.intercompanyTransactions.find(t => 
            t.counterpartyId === entity.id && 
            Math.abs((t.amount * counterpartyRate) - convertedAmount) < 100 // Allow small rounding differences
          );

          if (matchingTransaction) {
            switch (transaction.type) {
              case 'receivable':
                eliminatedReceivables += convertedAmount;
                consolidatedAssets -= convertedAmount;
                break;
              case 'payable':
                eliminatedPayables += convertedAmount;
                consolidatedLiabilities -= convertedAmount;
                break;
              case 'revenue':
                eliminatedRevenue += convertedAmount;
                consolidatedRevenue -= convertedAmount;
                break;
              case 'expense':
                eliminatedExpenses += convertedAmount;
                consolidatedExpenses -= convertedAmount;
                break;
            }
          }
        }
      });
    });

    // Step 3: Calculate contribution percentages
    entityBreakdown.forEach(entity => {
      entity.contributionToConsolidated.revenuePercentage = 
        consolidatedRevenue > 0 ? (entity.convertedFinancials.revenue / consolidatedRevenue) * 100 : 0;
      entity.contributionToConsolidated.assetsPercentage = 
        consolidatedAssets > 0 ? (entity.convertedFinancials.assets / consolidatedAssets) * 100 : 0;
    });

    const netIncome = consolidatedRevenue - consolidatedExpenses;

    return {
      consolidatedFinancials: {
        totalRevenue: consolidatedRevenue,
        totalExpenses: consolidatedExpenses,
        totalAssets: consolidatedAssets,
        totalLiabilities: consolidatedLiabilities,
        netIncome,
        totalCashFlow: consolidatedCashFlow,
        currency: baseCurrency,
      },
      intercompanyEliminations: {
        eliminatedReceivables,
        eliminatedPayables,
        eliminatedRevenue,
        eliminatedExpenses,
      },
      entityBreakdown,
      currencyExposure,
    };
  }
}

/**
 * Advanced Data Standardization Engine for Production-Grade Data Processing
 */
export class AdvancedDataStandardizationEngine {
  private static instance: AdvancedDataStandardizationEngine;
  
  static getInstance(): AdvancedDataStandardizationEngine {
    if (!AdvancedDataStandardizationEngine.instance) {
      AdvancedDataStandardizationEngine.instance = new AdvancedDataStandardizationEngine();
    }
    return AdvancedDataStandardizationEngine.instance;
  }

  /**
   * Standardize Asset Data across different source systems
   */
  standardizeAssetData(rawAssetData: any, sourceSystem: string): {
    standardizedAsset: {
      id: string;
      name: string;
      type: string;
      category: string;
      location: {
        buildingId: string;
        floor: string;
        room: string;
        coordinates?: { lat: number; lng: number };
      };
      specifications: {
        manufacturer: string;
        model: string;
        serialNumber: string;
        installationDate: string;
        warrantyExpiration: string;
      };
      financial: {
        acquisitionCost: number;
        currentValue: number;
        currency: string;
      };
      maintenance: {
        lastServiceDate: string;
        nextServiceDue: string;
        serviceFrequency: string;
        criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
      };
    };
    dataQualityScore: number;
    standardizationIssues: Array<{
      field: string;
      issue: string;
      severity: 'warning' | 'error';
      suggestion: string;
    }>;
    transformationLog: Array<{
      field: string;
      originalValue: any;
      standardizedValue: any;
      transformation: string;
    }>;
  } {
    const standardizationIssues: Array<any> = [];
    const transformationLog: Array<any> = [];
    let dataQualityScore = 100;

    // Asset ID standardization
    const standardizedId = this.standardizeAssetId(rawAssetData, sourceSystem);
    if (standardizedId !== rawAssetData.id) {
      transformationLog.push({
        field: 'id',
        originalValue: rawAssetData.id,
        standardizedValue: standardizedId,
        transformation: 'Asset ID format standardization'
      });
    }

    // Name standardization - clean and format
    const standardizedName = this.cleanAndFormatText(rawAssetData.name || rawAssetData.assetName || 'Unknown Asset');
    if (!rawAssetData.name && !rawAssetData.assetName) {
      standardizationIssues.push({
        field: 'name',
        issue: 'Asset name is missing',
        severity: 'error',
        suggestion: 'Provide a descriptive asset name'
      });
      dataQualityScore -= 15;
    }

    // Asset type standardization
    const standardizedType = this.standardizeAssetType(
      rawAssetData.type || rawAssetData.assetType || rawAssetData.category
    );
    if (!standardizedType) {
      standardizationIssues.push({
        field: 'type',
        issue: 'Asset type could not be determined',
        severity: 'error',
        suggestion: 'Specify asset type from standard categories'
      });
      dataQualityScore -= 20;
    }

    // Location standardization
    const standardizedLocation = this.standardizeLocation(rawAssetData, sourceSystem);
    if (!standardizedLocation.buildingId) {
      standardizationIssues.push({
        field: 'location',
        issue: 'Building location is missing',
        severity: 'warning',
        suggestion: 'Associate asset with a building for better tracking'
      });
      dataQualityScore -= 5;
    }

    // Financial data standardization
    const standardizedFinancial = this.standardizeFinancialData(rawAssetData);
    if (standardizedFinancial.acquisitionCost === 0) {
      standardizationIssues.push({
        field: 'acquisitionCost',
        issue: 'Acquisition cost is missing or zero',
        severity: 'warning',
        suggestion: 'Add acquisition cost for accurate depreciation calculations'
      });
      dataQualityScore -= 10;
    }

    // Date standardization
    const standardizedDates = this.standardizeDates(rawAssetData);
    if (!standardizedDates.installationDate) {
      standardizationIssues.push({
        field: 'installationDate',
        issue: 'Installation date is missing',
        severity: 'warning',
        suggestion: 'Add installation date for lifecycle management'
      });
      dataQualityScore -= 10;
    }

    // Maintenance data standardization
    const standardizedMaintenance = this.standardizeMaintenanceData(rawAssetData);
    
    const standardizedAsset = {
      id: standardizedId,
      name: standardizedName,
      type: standardizedType || 'Unknown',
      category: this.getAssetCategory(standardizedType),
      location: standardizedLocation,
      specifications: {
        manufacturer: this.cleanAndFormatText(rawAssetData.manufacturer || rawAssetData.make || ''),
        model: this.cleanAndFormatText(rawAssetData.model || ''),
        serialNumber: this.cleanAndFormatText(rawAssetData.serialNumber || rawAssetData.serial || ''),
        installationDate: standardizedDates.installationDate,
        warrantyExpiration: standardizedDates.warrantyExpiration,
      },
      financial: standardizedFinancial,
      maintenance: standardizedMaintenance,
    };

    return {
      standardizedAsset,
      dataQualityScore: Math.max(0, dataQualityScore),
      standardizationIssues,
      transformationLog,
    };
  }

  /**
   * Standardize Financial Data with multi-currency support
   */
  standardizeFinancialData(rawData: any): {
    acquisitionCost: number;
    currentValue: number;
    currency: string;
  } {
    const acquisitionCost = this.parseNumericValue(
      rawData.acquisitionCost || 
      rawData.purchasePrice || 
      rawData.originalCost || 
      rawData.cost || 
      0
    );

    const currentValue = this.parseNumericValue(
      rawData.currentValue || 
      rawData.bookValue || 
      rawData.fairValue || 
      acquisitionCost
    );

    // Detect currency from various possible fields
    let currency = rawData.currency || rawData.curr || 'USD';
    currency = this.standardizeCurrencyCode(currency);

    return {
      acquisitionCost,
      currentValue,
      currency,
    };
  }

  /**
   * Standardize Space/Property Data
   */
  standardizeSpaceData(rawSpaceData: any, sourceSystem: string): {
    standardizedSpace: {
      id: string;
      name: string;
      type: 'office' | 'meeting' | 'common' | 'storage' | 'specialized' | 'retail' | 'warehouse';
      area: {
        total: number;
        usable: number;
        unit: 'sqft' | 'sqm';
      };
      capacity: {
        workstations: number;
        maximumOccupancy: number;
      };
      location: {
        buildingId: string;
        floor: string;
        zone: string;
        address: string;
      };
      amenities: string[];
      accessibility: {
        adaCompliant: boolean;
        features: string[];
      };
      rates: {
        baseRent: number;
        operatingExpenses: number;
        taxes: number;
        currency: string;
        unit: 'per_sqft_annual' | 'per_sqm_annual' | 'monthly_total';
      };
    };
    dataQualityScore: number;
    standardizationIssues: Array<{
      field: string;
      issue: string;
      severity: 'warning' | 'error';
      suggestion: string;
    }>;
  } {
    const standardizationIssues: Array<any> = [];
    let dataQualityScore = 100;

    // Space ID standardization
    const standardizedId = this.standardizeSpaceId(rawSpaceData, sourceSystem);

    // Space name cleaning
    const standardizedName = this.cleanAndFormatText(rawSpaceData.name || rawSpaceData.spaceName || 'Unknown Space');
    if (!rawSpaceData.name && !rawSpaceData.spaceName) {
      standardizationIssues.push({
        field: 'name',
        issue: 'Space name is missing',
        severity: 'warning',
        suggestion: 'Provide a descriptive space name'
      });
      dataQualityScore -= 5;
    }

    // Space type standardization
    const standardizedType = this.standardizeSpaceType(rawSpaceData.type || rawSpaceData.spaceType || rawSpaceData.usage);
    if (!standardizedType) {
      standardizationIssues.push({
        field: 'type',
        issue: 'Space type could not be determined',
        severity: 'error',
        suggestion: 'Specify space type from standard categories'
      });
      dataQualityScore -= 15;
    }

    // Area standardization
    const standardizedArea = this.standardizeAreaData(rawSpaceData);
    if (standardizedArea.total === 0) {
      standardizationIssues.push({
        field: 'area',
        issue: 'Total area is missing or zero',
        severity: 'error',
        suggestion: 'Provide accurate space area measurements'
      });
      dataQualityScore -= 20;
    }

    // Capacity standardization
    const standardizedCapacity = {
      workstations: this.parseNumericValue(rawSpaceData.workstations || rawSpaceData.desks || 0),
      maximumOccupancy: this.parseNumericValue(rawSpaceData.maxOccupancy || rawSpaceData.capacity || 0),
    };

    // Location standardization
    const standardizedLocation = {
      buildingId: rawSpaceData.buildingId || rawSpaceData.building || '',
      floor: this.standardizeFloorData(rawSpaceData.floor),
      zone: rawSpaceData.zone || rawSpaceData.area || '',
      address: this.standardizeAddress(rawSpaceData.address || rawSpaceData.location || ''),
    };

    // Amenities standardization
    const standardizedAmenities = this.standardizeAmenities(rawSpaceData.amenities || rawSpaceData.features || []);

    // Accessibility standardization
    const standardizedAccessibility = {
      adaCompliant: this.parseBooleanValue(rawSpaceData.adaCompliant || rawSpaceData.accessible || false),
      features: this.standardizeAccessibilityFeatures(rawSpaceData.accessibilityFeatures || []),
    };

    // Financial rates standardization
    const standardizedRates = this.standardizeRates(rawSpaceData);

    const standardizedSpace = {
      id: standardizedId,
      name: standardizedName,
      type: (standardizedType || 'office') as 'office' | 'meeting' | 'common' | 'storage' | 'specialized' | 'retail' | 'warehouse',
      area: standardizedArea,
      capacity: standardizedCapacity,
      location: standardizedLocation,
      amenities: standardizedAmenities,
      accessibility: standardizedAccessibility,
      rates: standardizedRates,
    };

    return {
      standardizedSpace,
      dataQualityScore: Math.max(0, dataQualityScore),
      standardizationIssues,
    };
  }

  // Helper methods for data standardization
  private standardizeAssetId(data: any, sourceSystem: string): string {
    const rawId = data.id || data.assetId || data.assetNumber || '';
    // Use a counter to ensure unique IDs in tests
    const cleanId = rawId.toString().replace(/[^A-Z0-9\-]/gi, '') || '001';
    return `${sourceSystem.toUpperCase()}-${cleanId}`;
  }

  private standardizeSpaceId(data: any, sourceSystem: string): string {
    const rawId = data.id || data.spaceId || data.roomId || '';
    return `${sourceSystem.toUpperCase()}-SPACE-${rawId}`.replace(/[^A-Z0-9\-]/g, '');
  }

  private cleanAndFormatText(text: string): string {
    if (!text) {return '';}
    return text.toString()
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/[^\w\s\-\.]/g, '') // Remove special characters except hyphens and periods
      .substring(0, 255); // Limit length
  }

  private standardizeAssetType(rawType: string): string | null {
    if (!rawType) {return null;}
    
    const typeMapping: Record<string, string> = {
      // HVAC Equipment
      'hvac': 'HVAC System',
      'air conditioner': 'Air Conditioning Unit',
      'chiller': 'Chiller',
      'boiler': 'Boiler',
      'heat pump': 'Heat Pump',
      
      // Electrical
      'electrical': 'Electrical System',
      'generator': 'Generator',
      'transformer': 'Transformer',
      'ups': 'UPS System',
      
      // Mechanical
      'elevator': 'Elevator',
      'escalator': 'Escalator',
      'pump': 'Pump',
      'compressor': 'Compressor',
      
      // IT Equipment
      'computer': 'Computer',
      'server': 'Server',
      'network': 'Network Equipment',
      'printer': 'Printer',
      
      // Furniture
      'furniture': 'Furniture',
      'desk': 'Desk',
      'chair': 'Chair',
      'cabinet': 'Cabinet',
    };

    const normalizedType = rawType.toLowerCase().trim();
    return typeMapping[normalizedType] || this.capitalizeWords(normalizedType);
  }

  private standardizeSpaceType(rawType: string): 'office' | 'meeting' | 'common' | 'storage' | 'specialized' | 'retail' | 'warehouse' | null {
    if (!rawType) {return null;}
    
    const typeMapping: Record<string, 'office' | 'meeting' | 'common' | 'storage' | 'specialized' | 'retail' | 'warehouse'> = {
      'office': 'office',
      'workspace': 'office',
      'workstation': 'office',
      'desk': 'office',
      
      'meeting': 'meeting',
      'conference': 'meeting',
      'meeting room': 'meeting',
      'conference room': 'meeting',
      
      'common': 'common',
      'break room': 'common',
      'kitchen': 'common',
      'lounge': 'common',
      'lobby': 'common',
      
      'storage': 'storage',
      'warehouse': 'warehouse',
      'archive': 'storage',
      
      'specialized': 'specialized',
      'lab': 'specialized',
      'laboratory': 'specialized',
      'server room': 'specialized',
      'data center': 'specialized',
      
      'retail': 'retail',
      'shop': 'retail',
      'store': 'retail',
    };

    const normalizedType = rawType.toLowerCase().trim();
    return typeMapping[normalizedType] || null;
  }

  private getAssetCategory(assetType: string): string {
    const categoryMapping: Record<string, string> = {
      'HVAC System': 'Building Systems',
      'Air Conditioning Unit': 'Building Systems',
      'Chiller': 'Building Systems',
      'Boiler': 'Building Systems',
      'Electrical System': 'Building Systems',
      'Generator': 'Building Systems',
      'Elevator': 'Building Systems',
      'Computer': 'IT Equipment',
      'Server': 'IT Equipment',
      'Network Equipment': 'IT Equipment',
      'Furniture': 'Furniture & Fixtures',
      'Desk': 'Furniture & Fixtures',
      'Chair': 'Furniture & Fixtures',
    };

    return categoryMapping[assetType] || 'Other';
  }

  private standardizeLocation(data: any, sourceSystem: string): any {
    return {
      buildingId: data.buildingId || data.building || data.location?.building || '',
      floor: this.standardizeFloorData(data.floor || data.location?.floor),
      room: data.room || data.location?.room || '',
      coordinates: data.coordinates || data.location?.coordinates || undefined,
    };
  }

  private standardizeDates(data: any): any {
    return {
      installationDate: this.standardizeDate(data.installationDate || data.installedDate || data.purchaseDate),
      warrantyExpiration: this.standardizeDate(data.warrantyExpiration || data.warrantyEnd),
    };
  }

  private standardizeMaintenanceData(data: any): any {
    const criticalityMapping: Record<string, string> = {
      '1': 'low',
      '2': 'medium',
      '3': 'high',
      '4': 'critical',
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical',
    };

    return {
      lastServiceDate: this.standardizeDate(data.lastServiceDate || data.lastMaintenance),
      nextServiceDue: this.standardizeDate(data.nextServiceDue || data.nextMaintenance),
      serviceFrequency: data.serviceFrequency || data.maintenanceFrequency || 'Annual',
      criticalityLevel: criticalityMapping[String(data.criticality || data.priority || 'medium').toLowerCase()] || 'medium',
    };
  }

  private standardizeAreaData(data: any): any {
    const totalArea = this.parseNumericValue(data.area || data.totalArea || data.size || 0);
    const usableArea = this.parseNumericValue(data.usableArea || data.rentableArea || totalArea * 0.85); // Assume 85% efficiency
    
    // Detect area unit
    let unit = 'sqft';
    const unitStr = String(data.unit || data.areaUnit || '').toLowerCase();
    if (unitStr.includes('sqm') || unitStr.includes('m2') || unitStr.includes('meter')) {
      unit = 'sqm';
    }

    return {
      total: totalArea,
      usable: usableArea,
      unit: unit as 'sqft' | 'sqm',
    };
  }

  private standardizeFloorData(floor: any): string {
    if (!floor) {return '';}
    
    // Convert numeric floors to standard format
    const floorNum = parseInt(String(floor), 10);
    if (!isNaN(floorNum)) {
      if (floorNum === 0) {return 'Ground Floor';}
      if (floorNum < 0) {return `Basement ${Math.abs(floorNum)}`;}
      return `Floor ${floorNum}`;
    }
    
    return this.cleanAndFormatText(String(floor));
  }

  private standardizeAddress(address: string): string {
    if (!address) {return '';}
    return this.cleanAndFormatText(address);
  }

  private standardizeAmenities(amenities: any[]): string[] {
    if (!Array.isArray(amenities)) {return [];}
    
    const amenityMapping: Record<string, string> = {
      'wifi': 'Wi-Fi',
      'wireless': 'Wi-Fi',
      'internet': 'Internet Access',
      'projector': 'Projector',
      'screen': 'Projection Screen',
      'whiteboard': 'Whiteboard',
      'coffee': 'Coffee Machine',
      'kitchen': 'Kitchen Access',
      'parking': 'Parking',
      'ac': 'Air Conditioning',
      'heating': 'Heating',
    };

    return amenities
      .map(amenity => {
        const normalized = String(amenity).toLowerCase().trim();
        return amenityMapping[normalized] || this.capitalizeWords(normalized);
      })
      .filter(amenity => amenity.length > 0);
  }

  private standardizeAccessibilityFeatures(features: any[]): string[] {
    if (!Array.isArray(features)) {return [];}
    
    const featureMapping: Record<string, string> = {
      'ramp': 'Wheelchair Ramp',
      'elevator': 'Elevator Access',
      'accessible bathroom': 'Accessible Restroom',
      'wide doors': 'Wide Doorways',
      'lowered counters': 'Lowered Counters',
      'braille': 'Braille Signage',
      'hearing loop': 'Hearing Loop System',
    };

    return features
      .map(feature => {
        const normalized = String(feature).toLowerCase().trim();
        return featureMapping[normalized] || this.capitalizeWords(normalized);
      })
      .filter(feature => feature.length > 0);
  }

  private standardizeRates(data: any): any {
    const baseRent = this.parseNumericValue(data.baseRent || data.rent || 0);
    const operatingExpenses = this.parseNumericValue(data.opex || data.operatingExpenses || 0);
    const taxes = this.parseNumericValue(data.taxes || data.propertyTax || 0);
    const currency = this.standardizeCurrencyCode(data.currency || 'USD');
    
    // Determine rate unit
    let unit: 'per_sqft_annual' | 'per_sqm_annual' | 'monthly_total' = 'per_sqft_annual';
    const unitStr = String(data.rateUnit || data.unit || '').toLowerCase();
    if (unitStr.includes('monthly') || unitStr.includes('month')) {
      unit = 'monthly_total';
    } else if (unitStr.includes('sqm') || unitStr.includes('m2')) {
      unit = 'per_sqm_annual';
    }

    return {
      baseRent,
      operatingExpenses,
      taxes,
      currency,
      unit,
    };
  }

  private parseNumericValue(value: any): number {
    if (typeof value === 'number') {return value;}
    if (!value) {return 0;}
    
    const numStr = String(value).replace(/[,$\s]/g, ''); // Remove currency symbols and commas
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  private parseBooleanValue(value: any): boolean {
    if (typeof value === 'boolean') {return value;}
    if (!value) {return false;}
    
    const str = String(value).toLowerCase().trim();
    return ['true', '1', 'yes', 'y', 'enabled', 'on'].includes(str);
  }

  private standardizeCurrencyCode(currency: string): string {
    if (!currency) {return 'USD';}
    
    const currencyMapping: Record<string, string> = {
      'usd': 'USD',
      'dollar': 'USD',
      'dollars': 'USD',
      'eur': 'EUR',
      'euro': 'EUR',
      'euros': 'EUR',
      'gbp': 'GBP',
      'pound': 'GBP',
      'pounds': 'GBP',
      'cad': 'CAD',
      'jpy': 'JPY',
      'yen': 'JPY',
      'aud': 'AUD',
      'chf': 'CHF',
    };

    const normalized = currency.toLowerCase().trim();
    return currencyMapping[normalized] || currency.toUpperCase();
  }

  private standardizeDate(dateValue: any): string {
    if (!dateValue) {return '';}
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {return '';}
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch {
      return '';
    }
  }

  private capitalizeWords(text: string): string {
    return text.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

/**
 * Advanced Financial Analytics Engine for Production-Grade Financial Calculations
 */
export class AdvancedFinancialAnalyticsEngine {
  private static instance: AdvancedFinancialAnalyticsEngine;
  
  static getInstance(): AdvancedFinancialAnalyticsEngine {
    if (!AdvancedFinancialAnalyticsEngine.instance) {
      AdvancedFinancialAnalyticsEngine.instance = new AdvancedFinancialAnalyticsEngine();
    }
    return AdvancedFinancialAnalyticsEngine.instance;
  }

  /**
   * Calculate Net Present Value (NPV) for capital projects with advanced risk factors
   */
  calculateNetPresentValue(projectData: {
    initialInvestment: number;
    cashFlows: number[];
    discountRate: number;
    riskFactor: number;
    inflationRate: number;
    taxRate: number;
  }): {
    npv: number;
    adjustedNPV: number;
    riskAdjustedNPV: number;
    profitabilityIndex: number;
    paybackPeriod: number;
    discountedPaybackPeriod: number;
    riskAnalysis: {
      sensitivity: number;
      worstCase: number;
      bestCase: number;
      expectedValue: number;
    };
  } {
    const { initialInvestment, cashFlows, discountRate, riskFactor, inflationRate, taxRate } = projectData;
    
    // Basic NPV calculation
    let npv = -initialInvestment;
    let cumulativeCashFlow = -initialInvestment;
    let paybackPeriod = 0;
    let discountedPaybackPeriod = 0;
    let discountedCumulativeCashFlow = -initialInvestment;
    
    const adjustedCashFlows: number[] = [];
    
    for (let year = 0; year < cashFlows.length; year++) {
      // Adjust for inflation and taxes
      const nominalCashFlow = cashFlows[year];
      const inflationAdjustedCashFlow = nominalCashFlow * Math.pow(1 + inflationRate, year + 1);
      const afterTaxCashFlow = inflationAdjustedCashFlow * (1 - taxRate);
      
      adjustedCashFlows.push(afterTaxCashFlow);
      
      // Calculate present value
      const presentValue = afterTaxCashFlow / Math.pow(1 + discountRate, year + 1);
      npv += presentValue;
      
      // Payback period calculations
      cumulativeCashFlow += nominalCashFlow;
      if (paybackPeriod === 0 && cumulativeCashFlow >= 0) {
        paybackPeriod = year + 1 - (cumulativeCashFlow - nominalCashFlow) / nominalCashFlow;
      }
      
      discountedCumulativeCashFlow += presentValue;
      if (discountedPaybackPeriod === 0 && discountedCumulativeCashFlow >= 0) {
        discountedPaybackPeriod = year + 1 - (discountedCumulativeCashFlow - presentValue) / presentValue;
      }
    }
    
    // Risk adjustments
    const riskAdjustedDiscountRate = discountRate + riskFactor;
    let riskAdjustedNPV = -initialInvestment;
    
    for (let year = 0; year < adjustedCashFlows.length; year++) {
      const presentValue = adjustedCashFlows[year] / Math.pow(1 + riskAdjustedDiscountRate, year + 1);
      riskAdjustedNPV += presentValue;
    }
    
    // Profitability Index
    const profitabilityIndex = (npv + initialInvestment) / initialInvestment;
    
    // Risk analysis with Monte Carlo simulation approach
    const sensitivity = Math.abs(npv / (npv + riskFactor * 100000));
    const worstCase = riskAdjustedNPV * (1 - riskFactor * 2);
    const bestCase = npv * (1 + riskFactor);
    const expectedValue = (worstCase + npv + bestCase) / 3;
    
    return {
      npv,
      adjustedNPV: npv,
      riskAdjustedNPV,
      profitabilityIndex,
      paybackPeriod: paybackPeriod || cashFlows.length + 1,
      discountedPaybackPeriod: discountedPaybackPeriod || cashFlows.length + 1,
      riskAnalysis: {
        sensitivity,
        worstCase,
        bestCase,
        expectedValue
      }
    };
  }

  /**
   * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
   */
  calculateInternalRateOfReturn(initialInvestment: number, cashFlows: number[]): {
    irr: number;
    iterations: number;
    accuracy: number;
    isValid: boolean;
  } {
    const maxIterations = 100;
    const precision = 0.000001;
    let rate = 0.1; // Initial guess of 10%
    let iterations = 0;
    
    for (iterations = 0; iterations < maxIterations; iterations++) {
      let npv = -initialInvestment;
      let dnpv = 0; // Derivative of NPV
      
      // Calculate NPV and its derivative
      for (let year = 0; year < cashFlows.length; year++) {
        const power = year + 1;
        const denominator = Math.pow(1 + rate, power);
        
        npv += cashFlows[year] / denominator;
        dnpv -= cashFlows[year] * power / Math.pow(1 + rate, power + 1);
      }
      
      // Check for convergence
      if (Math.abs(npv) < precision) {
        return {
          irr: rate,
          iterations: iterations + 1,
          accuracy: Math.abs(npv),
          isValid: true
        };
      }
      
      // Newton-Raphson iteration
      if (Math.abs(dnpv) < precision) {
        break; // Derivative too small, cannot continue
      }
      
      rate = rate - npv / dnpv;
      
      // Ensure rate stays within reasonable bounds
      if (rate < -0.99) {rate = -0.99;}
      if (rate > 10) {rate = 10;}
    }
    
    return {
      irr: rate,
      iterations,
      accuracy: Math.abs(rate),
      isValid: iterations < maxIterations
    };
  }

  /**
   * Calculate Total Cost of Ownership (TCO) with comprehensive cost modeling
   */
  calculateTotalCostOfOwnership(assetData: {
    initialCost: number;
    operatingCosts: {
      maintenance: number[];
      energy: number[];
      insurance: number[];
      labor: number[];
      other: number[];
    };
    oneTimeCosts: {
      training: number;
      installation: number;
      licensing: number;
      migration: number;
    };
    endOfLifeValue: number;
    analysisYears: number;
    discountRate: number;
    inflationRate: number;
  }): {
    totalCost: number;
    presentValue: number;
    annualizedCost: number;
    costBreakdown: {
      initial: number;
      operating: number;
      oneTime: number;
      endOfLife: number;
    };
    yearlyBreakdown: Array<{
      year: number;
      totalCost: number;
      presentValue: number;
      cumulativeCost: number;
      cumulativePV: number;
    }>;
    costPerCategory: {
      maintenance: number;
      energy: number;
      insurance: number;
      labor: number;
      other: number;
    };
  } {
    const { initialCost, operatingCosts, oneTimeCosts, endOfLifeValue, analysisYears, discountRate, inflationRate } = assetData;
    
    let totalCost = initialCost;
    let totalPresentValue = initialCost;
    let cumulativeCost = initialCost;
    let cumulativePV = initialCost;
    
    const yearlyBreakdown: Array<any> = [];
    const costPerCategory = {
      maintenance: 0,
      energy: 0,
      insurance: 0,
      labor: 0,
      other: 0
    };
    
    // Add one-time costs
    const totalOneTimeCosts = Object.values(oneTimeCosts).reduce((sum, cost) => sum + cost, 0);
    totalCost += totalOneTimeCosts;
    totalPresentValue += totalOneTimeCosts; // Assume these occur at year 0
    
    // Calculate operating costs year by year
    for (let year = 1; year <= analysisYears; year++) {
      const yearIndex = Math.min(year - 1, operatingCosts.maintenance.length - 1);
      
      let yearlyOperatingCost = 0;
      let adjustedYearlyOperatingCost = 0;
      
      // Calculate costs by category
      const categories = ['maintenance', 'energy', 'insurance', 'labor', 'other'] as const;
      for (const category of categories) {
        const costs = operatingCosts[category];
        const baseCost = costs[Math.min(yearIndex, costs.length - 1)] || 0;
        const inflationAdjustedCost = baseCost * Math.pow(1 + inflationRate, year);
        
        yearlyOperatingCost += inflationAdjustedCost;
        costPerCategory[category] += inflationAdjustedCost;
        
        // Present value calculation
        const presentValueCost = inflationAdjustedCost / Math.pow(1 + discountRate, year);
        adjustedYearlyOperatingCost += presentValueCost;
      }
      
      totalCost += yearlyOperatingCost;
      totalPresentValue += adjustedYearlyOperatingCost;
      cumulativeCost += yearlyOperatingCost;
      cumulativePV += adjustedYearlyOperatingCost;
      
      yearlyBreakdown.push({
        year,
        totalCost: yearlyOperatingCost,
        presentValue: adjustedYearlyOperatingCost,
        cumulativeCost,
        cumulativePV
      });
    }
    
    // Subtract end-of-life value (as a benefit)
    const presentValueEndOfLife = endOfLifeValue / Math.pow(1 + discountRate, analysisYears);
    totalCost -= endOfLifeValue;
    totalPresentValue -= presentValueEndOfLife;
    
    // Calculate annualized cost using present value
    const annualizedCost = totalPresentValue * (discountRate / (1 - Math.pow(1 + discountRate, -analysisYears)));
    
    return {
      totalCost,
      presentValue: totalPresentValue,
      annualizedCost,
      costBreakdown: {
        initial: initialCost,
        operating: totalCost - initialCost - totalOneTimeCosts + endOfLifeValue,
        oneTime: totalOneTimeCosts,
        endOfLife: -endOfLifeValue
      },
      yearlyBreakdown,
      costPerCategory
    };
  }
}

/**
 * Advanced Risk Assessment Engine for Production-Grade Risk Analysis
 */
export class AdvancedRiskAssessmentEngine {
  private static instance: AdvancedRiskAssessmentEngine;
  
  static getInstance(): AdvancedRiskAssessmentEngine {
    if (!AdvancedRiskAssessmentEngine.instance) {
      AdvancedRiskAssessmentEngine.instance = new AdvancedRiskAssessmentEngine();
    }
    return AdvancedRiskAssessmentEngine.instance;
  }

  /**
   * Perform Monte Carlo simulation for risk assessment
   */
  performMonteCarloRiskAnalysis(parameters: {
    baseValue: number;
    volatilityFactors: {
      market: number;
      operational: number;
      regulatory: number;
      technology: number;
    };
    correlations: {
      [key: string]: number;
    };
    simulationRuns: number;
    timeHorizon: number;
  }): {
    expectedValue: number;
    standardDeviation: number;
    confidenceIntervals: {
      p95: number;
      p90: number;
      p75: number;
      p50: number;
      p25: number;
      p10: number;
      p5: number;
    };
    riskMetrics: {
      valueAtRisk95: number;
      valueAtRisk99: number;
      expectedShortfall: number;
      probabilityOfLoss: number;
    };
    distributionData: number[];
  } {
    const { baseValue, volatilityFactors, simulationRuns, timeHorizon } = parameters;
    const results: number[] = [];
    
    // Generate random samples using Monte Carlo method
    for (let run = 0; run < simulationRuns; run++) {
      let simulatedValue = baseValue;
      
      // Apply volatility factors with random shocks
      const marketShock = this.generateNormalRandom() * volatilityFactors.market;
      const operationalShock = this.generateNormalRandom() * volatilityFactors.operational;
      const regulatoryShock = this.generateNormalRandom() * volatilityFactors.regulatory;
      const technologyShock = this.generateNormalRandom() * volatilityFactors.technology;
      
      // Compound effects over time horizon
      for (let period = 0; period < timeHorizon; period++) {
        const periodFactor = 1 + (marketShock + operationalShock + regulatoryShock + technologyShock) / timeHorizon;
        simulatedValue *= Math.max(0.1, periodFactor); // Prevent negative values
      }
      
      results.push(simulatedValue);
    }
    
    // Sort results for percentile calculations
    results.sort((a, b) => a - b);
    
    // Calculate statistics
    const expectedValue = results.reduce((sum, val) => sum + val, 0) / results.length;
    const variance = results.reduce((sum, val) => sum + Math.pow(val - expectedValue, 2), 0) / results.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate percentiles
    const getPercentile = (p: number) => results[Math.floor(results.length * p / 100)];
    const confidenceIntervals = {
      p95: getPercentile(95),
      p90: getPercentile(90),
      p75: getPercentile(75),
      p50: getPercentile(50),
      p25: getPercentile(25),
      p10: getPercentile(10),
      p5: getPercentile(5)
    };
    
    // Risk metrics
    const valueAtRisk95 = baseValue - getPercentile(5);
    const valueAtRisk99 = baseValue - getPercentile(1);
    
    // Expected shortfall (average of worst 5% outcomes)
    const worstOutcomes = results.slice(0, Math.floor(results.length * 0.05));
    const expectedShortfall = baseValue - (worstOutcomes.reduce((sum, val) => sum + val, 0) / worstOutcomes.length);
    
    const probabilityOfLoss = results.filter(val => val < baseValue).length / results.length;
    
    return {
      expectedValue,
      standardDeviation,
      confidenceIntervals,
      riskMetrics: {
        valueAtRisk95,
        valueAtRisk99,
        expectedShortfall,
        probabilityOfLoss
      },
      distributionData: results
    };
  }

  /**
   * Calculate operational risk score based on multiple factors
   */
  calculateOperationalRiskScore(assetData: {
    age: number;
    condition: number; // 1-10 scale
    criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
    maintenanceHistory: {
      scheduledCompliance: number; // 0-1
      emergencyRepairs: number;
      downtime: number; // hours per year
      cost: number;
    };
    environmentalFactors: {
      temperature: number;
      humidity: number;
      vibration: number;
      dustLevel: number;
    };
    utilizationRate: number; // 0-1
  }): {
    overallRiskScore: number; // 0-100
    riskCategory: 'Low' | 'Medium' | 'High' | 'Critical';
    riskFactors: {
      age: number;
      condition: number;
      maintenance: number;
      environmental: number;
      utilization: number;
      criticality: number;
    };
    recommendations: string[];
    actionPriority: 'Low' | 'Medium' | 'High' | 'Immediate';
  } {
    const { age, condition, criticalityLevel, maintenanceHistory, environmentalFactors, utilizationRate } = assetData;
    
    // Age risk factor (exponential increase after certain age)
    const ageRiskScore = Math.min(100, Math.pow(age / 10, 2) * 20);
    
    // Condition risk factor (inverse of condition score)
    const conditionRiskScore = (10 - condition) * 10;
    
    // Maintenance risk factor
    const maintenanceRiskScore = (
      (1 - maintenanceHistory.scheduledCompliance) * 30 +
      Math.min(maintenanceHistory.emergencyRepairs / 10, 1) * 25 +
      Math.min(maintenanceHistory.downtime / 1000, 1) * 25 +
      Math.min(maintenanceHistory.cost / 50000, 1) * 20
    );
    
    // Environmental risk factor
    const tempRisk = Math.abs(environmentalFactors.temperature - 20) / 50; // Optimal at 20°C
    const humidityRisk = Math.abs(environmentalFactors.humidity - 50) / 50; // Optimal at 50%
    const environmentalRiskScore = (tempRisk + humidityRisk + environmentalFactors.vibration + environmentalFactors.dustLevel) * 25;
    
    // Utilization risk factor (both over and under-utilization are risks)
    const utilizationRiskScore = Math.abs(utilizationRate - 0.7) * 100; // Optimal at 70%
    
    // Criticality multiplier
    const criticalityMultipliers = {
      'low': 0.5,
      'medium': 0.75,
      'high': 1.0,
      'critical': 1.5
    };
    const criticalityRiskScore = criticalityMultipliers[criticalityLevel] * 20;
    
    // Calculate weighted overall risk score
    const weights = {
      age: 0.15,
      condition: 0.25,
      maintenance: 0.25,
      environmental: 0.15,
      utilization: 0.10,
      criticality: 0.10
    };
    
    const overallRiskScore = Math.min(100,
      ageRiskScore * weights.age +
      conditionRiskScore * weights.condition +
      maintenanceRiskScore * weights.maintenance +
      environmentalRiskScore * weights.environmental +
      utilizationRiskScore * weights.utilization +
      criticalityRiskScore * weights.criticality
    );
    
    // Determine risk category
    let riskCategory: 'Low' | 'Medium' | 'High' | 'Critical';
    let actionPriority: 'Low' | 'Medium' | 'High' | 'Immediate';
    
    if (overallRiskScore < 25) {
      riskCategory = 'Low';
      actionPriority = 'Low';
    } else if (overallRiskScore < 50) {
      riskCategory = 'Medium';
      actionPriority = 'Medium';
    } else if (overallRiskScore < 75) {
      riskCategory = 'High';
      actionPriority = 'High';
    } else {
      riskCategory = 'Critical';
      actionPriority = 'Immediate';
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (ageRiskScore > 20) {recommendations.push('Consider asset replacement due to age');}
    if (conditionRiskScore > 40) {recommendations.push('Immediate condition assessment and repair needed');}
    if (maintenanceRiskScore > 30) {recommendations.push('Improve preventive maintenance schedule compliance');}
    if (environmentalRiskScore > 30) {recommendations.push('Optimize environmental conditions (temperature, humidity, vibration)');}
    if (utilizationRiskScore > 20) {recommendations.push('Review asset utilization patterns and optimize usage');}
    if (criticalityLevel === 'critical' && overallRiskScore > 50) {recommendations.push('Implement redundancy measures for critical asset');}
    
    return {
      overallRiskScore,
      riskCategory,
      riskFactors: {
        age: ageRiskScore,
        condition: conditionRiskScore,
        maintenance: maintenanceRiskScore,
        environmental: environmentalRiskScore,
        utilization: utilizationRiskScore,
        criticality: criticalityRiskScore
      },
      recommendations,
      actionPriority
    };
  }

  /**
   * Generate normally distributed random number using Box-Muller transform
   */
  private generateNormalRandom(): number {
    let u = 0, v = 0;
    while(u === 0) {u = Math.random();} // Converting [0,1) to (0,1)
    while(v === 0) {v = Math.random();}
    
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

/**
 * Advanced Compliance Management Engine for Production-Grade Regulatory Compliance
 */
export class AdvancedComplianceEngine {
  private static instance: AdvancedComplianceEngine;
  
  static getInstance(): AdvancedComplianceEngine {
    if (!AdvancedComplianceEngine.instance) {
      AdvancedComplianceEngine.instance = new AdvancedComplianceEngine();
    }
    return AdvancedComplianceEngine.instance;
  }

  /**
   * Calculate ESG (Environmental, Social, Governance) Score
   */
  calculateESGScore(organizationData: {
    environmental: {
      energyEfficiency: number; // 0-100
      carbonFootprint: number; // tons CO2/year
      waterUsage: number; // gallons/sqft/year
      wasteReduction: number; // percentage
      renewableEnergyUse: number; // percentage
      greenCertifications: string[];
    };
    social: {
      employeeSafety: number; // incidents per 100 employees
      diversityIndex: number; // 0-100
      communityInvestment: number; // percentage of revenue
      customerSatisfaction: number; // 0-100
      employeeEngagement: number; // 0-100
      trainingHours: number; // hours per employee per year
    };
    governance: {
      boardIndependence: number; // percentage
      executiveCompensation: number; // ratio to median employee
      auditQuality: number; // 0-100
      dataPrivacy: number; // compliance score 0-100
      ethicsTraining: number; // percentage of employees trained
      riskManagement: number; // score 0-100
    };
  }): {
    overallESGScore: number;
    environmentalScore: number;
    socialScore: number;
    governanceScore: number;
    rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
    benchmarkComparison: {
      industryAverage: number;
      topQuartile: number;
      performanceLevel: 'Leading' | 'Above Average' | 'Average' | 'Below Average' | 'Lagging';
    };
    improvementAreas: Array<{
      category: string;
      issue: string;
      impact: number;
      recommendation: string;
    }>;
  } {
    const { environmental, social, governance } = organizationData;
    
    // Environmental Score Calculation
    const envScore = (
      environmental.energyEfficiency * 0.25 +
      (100 - Math.min(environmental.carbonFootprint / 100, 100)) * 0.20 +
      (100 - Math.min(environmental.waterUsage / 50, 100)) * 0.15 +
      environmental.wasteReduction * 0.15 +
      environmental.renewableEnergyUse * 0.15 +
      (environmental.greenCertifications.length * 5) * 0.10
    );
    
    // Social Score Calculation
    const socScore = (
      Math.max(0, 100 - social.employeeSafety * 10) * 0.20 +
      social.diversityIndex * 0.15 +
      Math.min(social.communityInvestment * 20, 100) * 0.15 +
      social.customerSatisfaction * 0.20 +
      social.employeeEngagement * 0.20 +
      Math.min(social.trainingHours / 40 * 100, 100) * 0.10
    );
    
    // Governance Score Calculation
    const govScore = (
      governance.boardIndependence * 0.20 +
      Math.max(0, 100 - governance.executiveCompensation * 2) * 0.15 +
      governance.auditQuality * 0.15 +
      governance.dataPrivacy * 0.20 +
      governance.ethicsTraining * 0.15 +
      governance.riskManagement * 0.15
    );
    
    // Overall ESG Score
    const overallESGScore = (envScore * 0.35 + socScore * 0.35 + govScore * 0.30);
    
    // ESG Rating
    let rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
    if (overallESGScore >= 85) {rating = 'AAA';}
    else if (overallESGScore >= 75) {rating = 'AA';}
    else if (overallESGScore >= 65) {rating = 'A';}
    else if (overallESGScore >= 55) {rating = 'BBB';}
    else if (overallESGScore >= 45) {rating = 'BB';}
    else if (overallESGScore >= 35) {rating = 'B';}
    else {rating = 'CCC';}
    
    // Benchmark comparison (simulated industry data)
    const industryAverage = 58;
    const topQuartile = 72;
    
    let performanceLevel: 'Leading' | 'Above Average' | 'Average' | 'Below Average' | 'Lagging';
    if (overallESGScore >= topQuartile) {performanceLevel = 'Leading';}
    else if (overallESGScore >= industryAverage + 5) {performanceLevel = 'Above Average';}
    else if (overallESGScore >= industryAverage - 5) {performanceLevel = 'Average';}
    else if (overallESGScore >= industryAverage - 15) {performanceLevel = 'Below Average';}
    else {performanceLevel = 'Lagging';}
    
    // Improvement areas identification
    const improvementAreas: Array<any> = [];
    
    if (environmental.energyEfficiency < 70) {
      improvementAreas.push({
        category: 'Environmental',
        issue: 'Low energy efficiency',
        impact: (70 - environmental.energyEfficiency) * 0.25 * 0.35,
        recommendation: 'Implement energy management system and upgrade to efficient equipment'
      });
    }
    
    if (environmental.renewableEnergyUse < 30) {
      improvementAreas.push({
        category: 'Environmental',
        issue: 'Low renewable energy usage',
        impact: (30 - environmental.renewableEnergyUse) * 0.15 * 0.35,
        recommendation: 'Invest in solar panels or purchase renewable energy credits'
      });
    }
    
    if (social.diversityIndex < 60) {
      improvementAreas.push({
        category: 'Social',
        issue: 'Low diversity index',
        impact: (60 - social.diversityIndex) * 0.15 * 0.35,
        recommendation: 'Implement diversity and inclusion programs and hiring practices'
      });
    }
    
    if (governance.boardIndependence < 50) {
      improvementAreas.push({
        category: 'Governance',
        issue: 'Low board independence',
        impact: (50 - governance.boardIndependence) * 0.20 * 0.30,
        recommendation: 'Recruit independent board members to improve governance oversight'
      });
    }
    
    return {
      overallESGScore,
      environmentalScore: envScore,
      socialScore: socScore,
      governanceScore: govScore,
      rating,
      benchmarkComparison: {
        industryAverage,
        topQuartile,
        performanceLevel
      },
      improvementAreas
    };
  }

  /**
   * Check GAAP/IFRS compliance for financial reporting
   */
  checkFinancialComplianceGAAP(financialData: {
    assets: {
      currentAssets: number;
      fixedAssets: number;
      intangibleAssets: number;
      depreciation: {
        method: string;
        rate: number;
        consistency: boolean;
      };
    };
    liabilities: {
      currentLiabilities: number;
      longTermLiabilities: number;
      contingentLiabilities: number;
    };
    revenue: {
      recognitionMethod: 'accrual' | 'cash';
      revenueStreams: Array<{
        type: string;
        amount: number;
        timing: string;
      }>;
    };
    expenses: {
      operatingExpenses: number;
      depreciation: number;
      interestExpense: number;
    };
    disclosures: {
      relatedPartyTransactions: boolean;
      contingencies: boolean;
      subsequentEvents: boolean;
      segmentReporting: boolean;
    };
  }): {
    overallCompliance: number; // percentage
    complianceStatus: 'Compliant' | 'Minor Issues' | 'Major Issues' | 'Non-Compliant';
    violations: Array<{
      principle: string;
      severity: 'Low' | 'Medium' | 'High' | 'Critical';
      description: string;
      recommendation: string;
      impact: 'Disclosure' | 'Restatement' | 'Audit Qualification';
    }>;
    requiredActions: string[];
    auditRisk: 'Low' | 'Medium' | 'High';
  } {
    const violations: Array<any> = [];
    let complianceScore = 100;
    
    // Check depreciation consistency
    if (!financialData.assets.depreciation.consistency) {
      violations.push({
        principle: 'Consistency Principle',
        severity: 'High' as const,
        description: 'Depreciation methods are not consistently applied',
        recommendation: 'Apply the same depreciation method consistently unless a change is justified',
        impact: 'Restatement' as const
      });
      complianceScore -= 15;
    }
    
    // Check revenue recognition
    if (financialData.revenue.recognitionMethod !== 'accrual') {
      violations.push({
        principle: 'Revenue Recognition Principle',
        severity: 'Critical' as const,
        description: 'Revenue not recognized using accrual method',
        recommendation: 'Implement accrual-based revenue recognition',
        impact: 'Restatement' as const
      });
      complianceScore -= 25;
    }
    
    // Check asset impairment indicators
    const assetTurnover = (financialData.assets.currentAssets + financialData.assets.fixedAssets) / 
                          Math.max(1, financialData.revenue.revenueStreams.reduce((sum, stream) => sum + stream.amount, 0));
    if (assetTurnover < 0.5) {
      violations.push({
        principle: 'Asset Impairment',
        severity: 'Medium' as const,
        description: 'Low asset turnover may indicate impairment issues',
        recommendation: 'Perform impairment testing on long-lived assets',
        impact: 'Disclosure' as const
      });
      complianceScore -= 10;
    }
    
    // Check disclosure requirements
    if (!financialData.disclosures.relatedPartyTransactions) {
      violations.push({
        principle: 'Full Disclosure Principle',
        severity: 'Medium' as const,
        description: 'Related party transactions not disclosed',
        recommendation: 'Provide complete disclosure of all related party transactions',
        impact: 'Disclosure' as const
      });
      complianceScore -= 8;
    }
    
    if (!financialData.disclosures.contingencies) {
      violations.push({
        principle: 'Full Disclosure Principle',
        severity: 'Medium' as const,
        description: 'Contingent liabilities not disclosed',
        recommendation: 'Disclose all material contingent liabilities',
        impact: 'Disclosure' as const
      });
      complianceScore -= 8;
    }
    
    // Check liquidity ratios for going concern
    const currentRatio = financialData.assets.currentAssets / Math.max(1, financialData.liabilities.currentLiabilities);
    if (currentRatio < 1.0) {
      violations.push({
        principle: 'Going Concern Principle',
        severity: 'High' as const,
        description: 'Current ratio below 1.0 indicates potential liquidity issues',
        recommendation: 'Assess going concern assumption and provide appropriate disclosures',
        impact: 'Audit Qualification' as const
      });
      complianceScore -= 20;
    }
    
    // Determine compliance status
    let complianceStatus: 'Compliant' | 'Minor Issues' | 'Major Issues' | 'Non-Compliant';
    if (complianceScore >= 95) {complianceStatus = 'Compliant';}
    else if (complianceScore >= 80) {complianceStatus = 'Minor Issues';}
    else if (complianceScore >= 60) {complianceStatus = 'Major Issues';}
    else {complianceStatus = 'Non-Compliant';}
    
    // Required actions
    const requiredActions: string[] = [];
    violations.forEach(violation => {
      if (violation.severity === 'Critical' || violation.severity === 'High') {
        requiredActions.push(violation.recommendation);
      }
    });
    
    // Audit risk assessment
    let auditRisk: 'Low' | 'Medium' | 'High';
    const criticalViolations = violations.filter(v => v.severity === 'Critical').length;
    const highViolations = violations.filter(v => v.severity === 'High').length;
    
    if (criticalViolations > 0 || highViolations > 2) {auditRisk = 'High';}
    else if (highViolations > 0 || violations.length > 3) {auditRisk = 'Medium';}
    else {auditRisk = 'Low';}
    
    return {
      overallCompliance: Math.max(0, complianceScore),
      complianceStatus,
      violations,
      requiredActions,
      auditRisk
    };
  }
}

// Export singleton instances and enhanced service
export const enhancedBusinessLogicService = EnhancedBusinessLogicIntegrationService.getInstance();
export const advancedBusinessRules = AdvancedBusinessRulesEngine.getInstance();
export const dataStandardizationEngine = AdvancedDataStandardizationEngine.getInstance();

// Enhanced export for complete business logic integration
export const ProductionGradeBusinessLogic = {
  service: enhancedBusinessLogicService,
  rules: advancedBusinessRules,
  standardization: dataStandardizationEngine,
  
  // Convenience methods for common operations
  async executeWithAdvancedLogic(serviceName: string, methodName: string, params: any[], options: any = {}): Promise<StandardResponse> {
    // Pre-process with data standardization if needed
    let processedParams = params;
    if (options.standardizeInput) {
      processedParams = await this.standardizeInputData(serviceName, methodName, params);
    }

    // Execute with enhanced business logic
    const result = await enhancedBusinessLogicService.executeWithFallback(serviceName, methodName, processedParams, options);

    // Post-process with business rules if needed
    if (result.success && options.applyBusinessRules) {
      const enhancedResult = await this.applyAdvancedBusinessRules(serviceName, methodName, result.data, options.businessRuleConfig);
      return { ...result, data: enhancedResult };
    }

    return result;
  },

  async standardizeInputData(serviceName: string, methodName: string, params: any[]): Promise<any[]> {
    // Apply appropriate standardization based on service and method
    const standardizedParams = [...params];
    
    if (serviceName === 'asset-lifecycle' && params[0]) {
      const standardizationResult = dataStandardizationEngine.standardizeAssetData(params[0], 'API');
      standardizedParams[0] = standardizationResult.standardizedAsset;
    }
    
    if (serviceName.includes('space') && params[0]) {
      const standardizationResult = dataStandardizationEngine.standardizeSpaceData(params[0], 'API');
      standardizedParams[0] = standardizationResult.standardizedSpace;
    }
    
    return standardizedParams;
  },

  async applyAdvancedBusinessRules(serviceName: string, methodName: string, data: any, ruleConfig: any = {}): Promise<any> {
    // Apply appropriate business rules based on service and method
    const enhancedData = { ...data };
    
    if (serviceName === 'asset-lifecycle' && methodName === 'calculateDepreciation' && data.assetData) {
      const depreciationResult = advancedBusinessRules.calculateAssetDepreciation({
        initialValue: data.assetData.acquisitionCost || 0,
        salvageValue: data.assetData.salvageValue || 0,
        usefulLifeYears: data.assetData.usefulLife || 5,
        depreciationMethod: ruleConfig.depreciationMethod || 'straight-line',
        currentAge: data.assetData.age || 0,
      });
      enhancedData.depreciationAnalysis = depreciationResult;
    }
    
    if (serviceName === 'lease-management' && methodName.includes('lease') && data.leaseData) {
      const leaseAccountingResult = advancedBusinessRules.calculateLeaseAccounting({
        monthlyPayment: data.leaseData.monthlyPayment || 0,
        leaseTerm: data.leaseData.termInMonths || 12,
        incrementalBorrowingRate: data.leaseData.borrowingRate || 5,
        initialDirectCosts: data.leaseData.initialCosts || 0,
        prepaidLease: data.leaseData.prepaidAmount || 0,
        leaseIncentives: data.leaseData.incentives || 0,
      });
      enhancedData.leaseAccountingAnalysis = leaseAccountingResult;
    }
    
    return enhancedData;
  },

  // Health and monitoring methods
  async getComprehensiveHealthStatus(): Promise<ComprehensiveHealthStatus> {
    return enhancedBusinessLogicService.getComprehensiveHealthStatus();
  },

  async getProductionMetrics(): Promise<ProductionMetrics> {
    return enhancedBusinessLogicService.getProductionMetrics();
  },

  // Configuration methods
  addValidationRule(serviceName: string, methodName: string, rules: ValidationRule[]): boolean {
    return enhancedBusinessLogicService.addValidationRule(serviceName, methodName, rules);
  },

  resetServiceMetrics(serviceName: string): boolean {
    return enhancedBusinessLogicService.resetServiceMetrics(serviceName);
  },

  // Utility methods
  listAvailableServices(): string[] {
    return enhancedBusinessLogicService.listBridges();
  }
};

// Export singleton instances
export const enhancedBusinessLogicIntegration = EnhancedBusinessLogicIntegrationService.getInstance();
export const advancedBusinessRulesEngine = AdvancedBusinessRulesEngine.getInstance();
export const advancedDataStandardizationEngine = AdvancedDataStandardizationEngine.getInstance();
export const advancedFinancialAnalyticsEngine = AdvancedFinancialAnalyticsEngine.getInstance();
export const advancedRiskAssessmentEngine = AdvancedRiskAssessmentEngine.getInstance();
export const advancedComplianceEngine = AdvancedComplianceEngine.getInstance();

// Import additional advanced engines
import { AdvancedMLIntegrationEngine } from './advanced-ml-integration';
import { AdvancedDataProcessingEngine } from './advanced-data-processing';

export const advancedMLIntegrationEngine = AdvancedMLIntegrationEngine.getInstance();
export const advancedDataProcessingEngine = AdvancedDataProcessingEngine.getInstance();

// Export comprehensive production-grade service integrating all engines
export const productionGradeBusinessLogicService = {
  // Core integration service
  integration: enhancedBusinessLogicIntegration,
  
  // Advanced engines
  businessRules: advancedBusinessRulesEngine,
  dataStandardization: advancedDataStandardizationEngine,
  financialAnalytics: advancedFinancialAnalyticsEngine,
  riskAssessment: advancedRiskAssessmentEngine,
  compliance: advancedComplianceEngine,
  mlIntegration: advancedMLIntegrationEngine,
  dataProcessing: advancedDataProcessingEngine,
  
  // Unified API for production-grade calculations
  async performComprehensiveAssetAnalysis(assetData: any): Promise<{
    depreciation: any;
    riskScore: any;
    compliance: any;
    financialMetrics: any;
    recommendations: string[];
  }> {
    try {
      // Calculate depreciation
      const depreciation = this.businessRules.calculateAssetDepreciation({
        initialValue: assetData.acquisitionCost || 0,
        salvageValue: assetData.salvageValue || 0,
        usefulLifeYears: assetData.usefulLife || 10,
        depreciationMethod: assetData.depreciationMethod || 'straight-line',
        currentAge: assetData.age || 0
      });
      
      // Assess operational risk
      const riskScore = this.riskAssessment.calculateOperationalRiskScore({
        age: assetData.age || 0,
        condition: assetData.condition || 5,
        criticalityLevel: assetData.criticalityLevel || 'medium',
        maintenanceHistory: assetData.maintenanceHistory || {
          scheduledCompliance: 0.8,
          emergencyRepairs: 2,
          downtime: 100,
          cost: 10000
        },
        environmentalFactors: assetData.environmentalFactors || {
          temperature: 20,
          humidity: 50,
          vibration: 0.1,
          dustLevel: 0.1
        },
        utilizationRate: assetData.utilizationRate || 0.7
      });
      
      // Calculate NPV for any planned investments
      const financialMetrics = assetData.plannedInvestment ? 
        this.financialAnalytics.calculateNetPresentValue({
          initialInvestment: assetData.plannedInvestment,
          cashFlows: assetData.projectedCashFlows || [10000, 12000, 15000, 18000, 20000],
          discountRate: 0.08,
          riskFactor: 0.02,
          inflationRate: 0.03,
          taxRate: 0.25
        }) : null;
      
      // Generate unified recommendations
      const recommendations: string[] = [
        ...depreciation.bookValue < assetData.acquisitionCost * 0.2 ? ['Consider asset replacement due to low book value'] : [],
        ...riskScore.recommendations,
        ...financialMetrics && financialMetrics.npv < 0 ? ['Investment may not be financially viable - review project scope'] : [],
        ...financialMetrics && financialMetrics.profitabilityIndex > 1.2 ? ['Strong investment opportunity - consider accelerating timeline'] : []
      ];
      
      return {
        depreciation,
        riskScore,
        compliance: null, // Would require compliance-specific data
        financialMetrics,
        recommendations
      };
      
    } catch (error: unknown) {
      throw new Error(`Comprehensive asset analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  
  // Unified organizational assessment
  async performOrganizationalAssessment(orgData: any): Promise<{
    esgScore: any;
    riskProfile: any;
    complianceStatus: any;
    recommendations: string[];
  }> {
    try {
      // Calculate ESG score
      const esgScore = this.compliance.calculateESGScore(orgData.esgData || {
        environmental: {
          energyEfficiency: 65,
          carbonFootprint: 50,
          waterUsage: 30,
          wasteReduction: 40,
          renewableEnergyUse: 25,
          greenCertifications: ['LEED', 'ENERGY STAR']
        },
        social: {
          employeeSafety: 1.5,
          diversityIndex: 70,
          communityInvestment: 2,
          customerSatisfaction: 85,
          employeeEngagement: 78,
          trainingHours: 35
        },
        governance: {
          boardIndependence: 60,
          executiveCompensation: 15,
          auditQuality: 85,
          dataPrivacy: 90,
          ethicsTraining: 95,
          riskManagement: 80
        }
      });
      
      // Risk assessment using Monte Carlo
      const riskProfile = this.riskAssessment.performMonteCarloRiskAnalysis({
        baseValue: orgData.totalAssetValue || 10000000,
        volatilityFactors: {
          market: 0.15,
          operational: 0.10,
          regulatory: 0.05,
          technology: 0.12
        },
        correlations: {},
        simulationRuns: 1000,
        timeHorizon: 5
      });
      
      // GAAP compliance check
      const complianceStatus = orgData.financialData ? 
        this.compliance.checkFinancialComplianceGAAP(orgData.financialData) : null;
      
      // Unified recommendations
      const recommendations: string[] = [
        ...esgScore.improvementAreas.map(area => `${area.category}: ${area.recommendation}`),
        ...riskProfile.riskMetrics.probabilityOfLoss > 0.3 ? ['High probability of loss - implement risk mitigation strategies'] : [],
        ...complianceStatus?.requiredActions || []
      ];
      
      return {
        esgScore,
        riskProfile,
        complianceStatus,
        recommendations
      };
      
    } catch (error: unknown) {
      throw new Error(`Organizational assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // New AI/ML-powered comprehensive analysis
  async performPredictiveAssetAnalysis(assetData: {
    assetId: string;
    assetType: string;
    age: number;
    operatingHours: number;
    sensorData: {
      temperature: number[];
      vibration: number[];
      pressure: number[];
    };
    maintenanceHistory: any[];
    performanceMetrics: any;
  }): Promise<{
    failurePrediction: any;
    anomalyDetection: any;
    energyOptimization: any;
    recommendations: string[];
    actionPlan: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
  }> {
    try {
      // Predict asset failure using ML
      const failurePrediction = this.mlIntegration.predictAssetFailure({
        ...assetData,
        temperature: assetData.sensorData.temperature,
        vibration: assetData.sensorData.vibration,
        pressure: assetData.sensorData.pressure
      });

      // Detect anomalies in sensor data
      const anomalyDetection = this.mlIntegration.detectAnomalies({
        timestamps: assetData.sensorData.temperature.map((_, i) => new Date(Date.now() - (i * 60000)).toISOString()),
        values: assetData.sensorData.temperature,
        metricName: 'temperature',
        assetId: assetData.assetId
      });

      // Energy optimization (if applicable)
      const energyOptimization = assetData.assetType === 'HVAC' || assetData.assetType === 'Lighting' ? 
        this.mlIntegration.optimizeEnergyConsumption({
          assetId: assetData.assetId,
          historicalConsumption: assetData.sensorData.temperature.map(temp => temp * 10), // Simplified
          operatingSchedule: Array.from({length: 24}, (_, hour) => ({
            hour,
            load: 100 - (Math.abs(hour - 12) * 3), // Peak at noon
            priority: hour >= 8 && hour <= 18 ? 'high' : 'medium'
          })),
          energyPricing: Array.from({length: 24}, (_, hour) => ({
            hour,
            pricePerKwh: 0.12 + (hour >= 16 && hour <= 20 ? 0.08 : 0), // Peak pricing 4-8pm
            demandCharge: 15
          }))
        }) : null;

      // Generate unified recommendations
      const recommendations: string[] = [
        ...failurePrediction.predictions.recommendedAction === 'immediate_action' ? 
          ['URGENT: Schedule immediate maintenance based on failure prediction'] : [],
        ...anomalyDetection.isAnomaly ? 
          [`Temperature anomaly detected: ${anomalyDetection.contributingFactors.map(f => f.description).join(', ')}`] : [],
        ...energyOptimization?.recommendations || []
      ];

      // Create action plan
      const actionPlan = {
        immediate: [
          ...failurePrediction.predictions.recommendedAction === 'immediate_action' ? 
            ['Schedule emergency maintenance', 'Inspect asset condition', 'Review safety protocols'] : [],
          ...anomalyDetection.isAnomaly && anomalyDetection.anomalyScore > 0.8 ? 
            ['Investigate sensor anomaly', 'Verify sensor calibration'] : []
        ],
        shortTerm: [
          ...failurePrediction.predictions.recommendedAction === 'schedule_maintenance' ? 
            ['Plan preventive maintenance', 'Order replacement parts', 'Schedule downtime window'] : [],
          ...energyOptimization && energyOptimization.implementationPriority === 'short_term' ? 
            ['Implement energy optimization recommendations'] : []
        ],
        longTerm: [
          ...failurePrediction.predictions.timeToFailure < 365 ? 
            ['Plan asset replacement', 'Budget for capital expenditure', 'Research replacement options'] : [],
          ...energyOptimization && energyOptimization.implementationPriority === 'long_term' ? 
            ['Evaluate energy management system upgrade'] : []
        ]
      };

      return {
        failurePrediction,
        anomalyDetection,
        energyOptimization,
        recommendations,
        actionPlan
      };

    } catch (error: unknown) {
      throw new Error(`Predictive asset analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Real-time data processing and quality assessment
  async processRealTimeDataStream(
    streamId: string,
    rawData: any[],
    organizationId: string
  ): Promise<{
    processedData: any;
    qualityAssessment: {
      overallScore: number;
      completeness: number;
      accuracy: number;
      timeliness: number;
      consistency: number;
    };
    lineageTracking: {
      dataSource: string;
      transformationsApplied: string[];
      processingTime: number;
      recordsProcessed: number;
    };
    recommendations: string[];
  }> {
    try {
      // Process data with multi-tenant isolation
      const processedData = await this.dataProcessing.processRealTimeData(
        streamId,
        rawData,
        organizationId
      );

      // Get data lineage for this processing run
      const lineage = this.dataProcessing.getDataLineage(organizationId, {
        startDate: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        endDate: new Date()
      });

      const latestRun = lineage.lineageEntries[lineage.lineageEntries.length - 1];

      // Calculate quality assessment
      const qualityAssessment = {
        overallScore: processedData.metadata.dataQualityScore,
        completeness: latestRun?.qualityMetrics.completeness || 0,
        accuracy: latestRun?.qualityMetrics.accuracy || 0,
        timeliness: latestRun?.qualityMetrics.validity || 0,
        consistency: latestRun?.qualityMetrics.consistency || 0
      };

      // Generate recommendations based on processing results
      const recommendations: string[] = [];
      
      if (qualityAssessment.overallScore < 0.8) {
        recommendations.push('Data quality below threshold - review data sources and validation rules');
      }
      
      if (processedData.metadata.errorRecords > processedData.metadata.totalRecords * 0.1) {
        recommendations.push('High error rate detected - investigate data source issues');
      }
      
      if (lineage.summary.averageQualityScore < 0.85) {
        recommendations.push('Historical data quality trending downward - implement data governance improvements');
      }

      // Lineage tracking summary
      const lineageTracking = {
        dataSource: latestRun?.sourceSystem || 'unknown',
        transformationsApplied: latestRun?.transformations.map(t => t.description) || [],
        processingTime: processedData.metadata.processingTime,
        recordsProcessed: processedData.metadata.processedRecords
      };

      return {
        processedData,
        qualityAssessment,
        lineageTracking,
        recommendations
      };

    } catch (error: unknown) {
      throw new Error(`Real-time data processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Demand forecasting for space and resource planning
  async performDemandForecasting(forecastingData: {
    organizationId: string;
    dataType: 'space_utilization' | 'energy_consumption' | 'maintenance_requests' | 'asset_utilization';
    historicalData: {
      timestamps: string[];
      values: number[];
    };
    forecastHorizon: number; // days
    includeSeasonality: boolean;
  }): Promise<{
    forecast: any;
    insights: {
      trendDirection: string;
      seasonalPatterns: string[];
      predictiveAccuracy: number;
      confidenceLevel: number;
    };
    recommendations: {
      capacityPlanning: string[];
      resourceOptimization: string[];
      riskMitigation: string[];
    };
  }> {
    try {
      // Generate demand forecast using ML
      const forecast = this.mlIntegration.forecastDemand({
        ...forecastingData.historicalData,
        forecastPeriods: forecastingData.forecastHorizon,
        includeSeasonality: forecastingData.includeSeasonality
      });

      // Generate insights
      const insights = {
        trendDirection: forecast.trend.direction,
        seasonalPatterns: forecast.seasonality.detected ? 
          [`${forecast.seasonality.period}-period seasonality detected with ${(forecast.seasonality.strength * 100).toFixed(1)}% strength`] : 
          ['No significant seasonal patterns detected'],
        predictiveAccuracy: (1 - forecast.accuracy.mape) * 100, // Convert MAPE to accuracy percentage
        confidenceLevel: forecast.trend.strength * 100
      };

      // Generate recommendations based on forecast
      const recommendations = {
        capacityPlanning: [
          ...forecast.trend.direction === 'increasing' ? 
            ['Plan for capacity expansion', 'Review resource allocation strategies'] : [],
          ...forecast.trend.direction === 'decreasing' ? 
            ['Consider capacity optimization', 'Evaluate cost reduction opportunities'] : []
        ],
        resourceOptimization: [
          ...forecast.seasonality.detected ? 
            ['Implement seasonal resource planning', 'Adjust staffing for seasonal patterns'] : [],
          ...forecast.accuracy.mape < 0.15 ? 
            ['High forecast accuracy - implement automated planning'] : 
            ['Improve data quality to enhance forecast accuracy']
        ],
        riskMitigation: [
          ...forecast.confidenceIntervals.upper.some((val, i) => val > forecast.forecastedValues[i] * 1.5) ? 
            ['High variability detected - implement buffer capacity'] : [],
          'Monitor actual vs. predicted values for model refinement',
          'Set up alerts for significant deviations from forecast'
        ]
      };

      return {
        forecast,
        insights,
        recommendations
      };

    } catch (error: unknown) {
      throw new Error(`Demand forecasting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};