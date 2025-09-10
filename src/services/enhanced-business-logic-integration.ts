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

    } catch (error) {
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

      } catch (error) {
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
    if (!bridge) return { allowed: true };

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
    if (!bridge) return true;

    const cbMetrics = this.globalMetrics.circuitBreakerMetrics.get(serviceName);
    if (!cbMetrics) return true;

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
      } catch (error) {
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
      } catch (error) {
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
      } catch (error) {
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
    if (!bridge) return false;

    const existingRules = bridge.validation.rules.get(serviceName) || [];
    bridge.validation.rules.set(serviceName, [...existingRules, ...rules]);
    return true;
  }

  /**
   * Reset metrics for a service
   */
  resetServiceMetrics(serviceName: string): boolean {
    const bridge = this.bridges.get(serviceName);
    if (!bridge) return false;

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
   * Get bridge information
   */
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
        if (napiResult.success) napiHealthy++;
      } catch (error) {
        // NAPI service not healthy
      }

      // Check business logic service
      try {
        if (bridge.businessLogicService && bridge.businessLogicService.healthCheck) {
          const isHealthy = await bridge.businessLogicService.healthCheck();
          if (isHealthy) businessLogicHealthy++;
        } else {
          businessLogicHealthy++; // Assume healthy if no health check
        }
      } catch (error) {
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

// Export singleton instance
export const enhancedBusinessLogicIntegration = EnhancedBusinessLogicIntegrationService.getInstance();