/**
 * Business Logic Integration Service
 * This service provides seamless integration between existing TypeScript business logic
 * and the new NAPI-RS performance-optimized services
 */

import { logger } from '../config/logger';
import { napiRegistry } from './napi-integration';
import type { 
  BaseEntity, 
  StandardResponse, 
  PaginationParams,
  PaginatedResponse 
} from '../types/universal-data-standard';

// Import business domain managers
import { BusinessOperationsManager } from './business-operations/project-management/business-coordination';
import { FinancialOperationsManager } from './financial-management/cost-accounting/financial-operations';
import { ComplianceManagementOperationsManager } from './compliance-governance/regulatory-operations/compliance-management';
import { ExternalIntegrationSystemsManager } from './external-integration-systems/third-party-connectors/integration-orchestration';
import { InfrastructureTechnologyOperationsManager } from './infrastructure-technology/smart-systems/infrastructure-operations';
import { DocumentLifecycleService } from './document-management/content-operations/document-lifecycle';
import { SpaceOperationsManager } from './space-management/utilization-analytics/space-operations';
import { AssetOperationsManager } from './asset-management/maintenance-operations/asset-management';

export interface BusinessLogicBridge {
  napiServiceName: string;
  businessLogicService: any;
  integrationMethods: string[];
  fallbackEnabled: boolean;
  healthCheck?: () => Promise<boolean>;
  metrics?: {
    callCount: number;
    successCount: number;
    failureCount: number;
    avgResponseTime: number;
    lastHealthCheck?: Date;
  };
  rateLimit?: {
    maxRequestsPerMinute: number;
    requestWindow: Map<number, number>;
  };
}

export interface ProductionMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  serviceHealth: Map<string, boolean>;
  napiSuccessRate: number;
  fallbackUsageRate: number;
}

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export class BusinessLogicIntegrationService {
  private static instance: BusinessLogicIntegrationService;
  private bridges: Map<string, BusinessLogicBridge> = new Map();
  private initialized = false;
  private metrics: ProductionMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    serviceHealth: new Map(),
    napiSuccessRate: 0,
    fallbackUsageRate: 0
  };
  private validationRules: Map<string, Map<string, ValidationRule[]>> = new Map();
  private readonly maxRetries = 3;
  private readonly healthCheckInterval = 60000; // 1 minute

  static getInstance(): BusinessLogicIntegrationService {
    if (!BusinessLogicIntegrationService.instance) {
      BusinessLogicIntegrationService.instance = new BusinessLogicIntegrationService();
    }
    return BusinessLogicIntegrationService.instance;
  }

  /**
   * Initialize all business logic bridges
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing Business Logic Integration Service...');

    // Initialize domain managers
    const businessOpsManager = new BusinessOperationsManager();
    const financialOpsManager = new FinancialOperationsManager();
    const complianceManager = new ComplianceManagementOperationsManager();
    const integrationManager = new ExternalIntegrationSystemsManager();
    const infrastructureManager = new InfrastructureTechnologyOperationsManager();
    const documentService = new DocumentLifecycleService();
    const spaceManager = new SpaceOperationsManager();
    const assetManager = new AssetOperationsManager();

    // Set up business logic bridges
    this.setupBridges({
      businessOpsManager,
      financialOpsManager,
      complianceManager,
      integrationManager,
      infrastructureManager,
      documentService,
      spaceManager,
      assetManager
    });

    // Set up additional bridges for remaining services
    this.setupAdditionalBridges();

    // Setup default validation rules for production readiness
    this.setupDefaultValidationRules();

    // Initialize rate limiting for production services
    this.setupProductionRateLimiting();

    // Start health check monitoring
    this.startHealthCheckMonitoring();

    this.initialized = true;
    logger.info('Business Logic Integration Service initialized successfully with production features');
  }

  /**
   * Set up bridges between NAPI services and business logic
   */
  private setupBridges(managers: any): void {
    // Business Operations Domain
    this.bridges.set('contract-lifecycle', {
      napiServiceName: 'contract-lifecycle',
      businessLogicService: managers.businessOpsManager.contractLifecycleService,
      integrationMethods: ['createContract', 'updateContract', 'processRenewal', 'generateReport'],
      fallbackEnabled: true
    });

    this.bridges.set('critical-date', {
      napiServiceName: 'critical-date',
      businessLogicService: managers.businessOpsManager.criticalDateService,
      integrationMethods: ['addCriticalDate', 'updateStatus', 'processAlert', 'generateEscalation'],
      fallbackEnabled: true
    });

    this.bridges.set('vendor-broker', {
      napiServiceName: 'vendor-broker',
      businessLogicService: managers.businessOpsManager.vendorBrokerService,
      integrationMethods: ['evaluateVendor', 'processContract', 'trackPerformance', 'generateReports'],
      fallbackEnabled: true
    });

    // Financial Management Domain
    this.bridges.set('budget-forecast', {
      napiServiceName: 'budget-forecast',
      businessLogicService: managers.financialOpsManager.budgetForecastService,
      integrationMethods: ['createBudget', 'processForecasting', 'calculateVariance', 'generateReports'],
      fallbackEnabled: true
    });

    this.bridges.set('financial-consolidation', {
      napiServiceName: 'financial-consolidation',
      businessLogicService: managers.financialOpsManager.financialConsolidationService,
      integrationMethods: ['consolidateFinancials', 'processReporting', 'handleCurrency', 'generateCompliance'],
      fallbackEnabled: true
    });

    // Compliance & Governance Domain
    this.bridges.set('data-governance', {
      napiServiceName: 'data-governance',
      businessLogicService: managers.complianceManager.dataGovernanceService,
      integrationMethods: ['assessDataQuality', 'enforcePolicy', 'trackCompliance', 'generateAudit'],
      fallbackEnabled: true
    });

    this.bridges.set('emergency-planning', {
      napiServiceName: 'emergency-planning',
      businessLogicService: managers.complianceManager.emergencyPlanningService,
      integrationMethods: ['createEmergencyPlan', 'executeProtocol', 'coordiateResponse', 'trackSafety'],
      fallbackEnabled: true
    });

    // External Integration Domain
    this.bridges.set('api-management', {
      napiServiceName: 'api-management',
      businessLogicService: managers.integrationManager.apiManagementService,
      integrationMethods: ['manageLifecycle', 'controlAccess', 'monitorUsage', 'generateAnalytics'],
      fallbackEnabled: true
    });

    this.bridges.set('calendar-integration', {
      napiServiceName: 'calendar-integration',
      businessLogicService: managers.integrationManager.calendarIntegrationService,
      integrationMethods: ['syncCalendar', 'manageEvents', 'optimizeScheduling', 'trackAvailability'],
      fallbackEnabled: true
    });

    // Infrastructure Technology Domain
    this.bridges.set('advanced-intelligence', {
      napiServiceName: 'advanced-intelligence',
      businessLogicService: managers.infrastructureManager.businessIntelligenceService,
      integrationMethods: ['processML', 'analyzeData', 'generatePredictions', 'optimizeOperations'],
      fallbackEnabled: true
    });

    // Document Management Domain
    this.bridges.set('document', {
      napiServiceName: 'document',
      businessLogicService: managers.documentService,
      integrationMethods: ['uploadDocument', 'processVersion', 'extractMetadata', 'searchContent'],
      fallbackEnabled: true
    });

    // Space Management Domain
    this.bridges.set('space-standards', {
      napiServiceName: 'space-standards',
      businessLogicService: managers.spaceManager.spaceStandardsComplianceService,
      integrationMethods: ['checkCompliance', 'optimizeAllocation', 'enforceStandards', 'generateReports'],
      fallbackEnabled: true
    });

    // Asset Operations Domain
    this.bridges.set('asset-lifecycle', {
      napiServiceName: 'asset-lifecycle',
      businessLogicService: managers.assetManager,
      integrationMethods: ['calculateDepreciation', 'trackLifecycle', 'planReplacement', 'optimizeCosts'],
      fallbackEnabled: true
    });

    // Additional service bridges
    this.setupAdditionalBridges();
  }

  /**
   * Set up additional service bridges for remaining services
   */
  private setupAdditionalBridges(): void {
    // Maintenance and Work Order Services
    this.bridges.set('preventive-maintenance', {
      napiServiceName: 'preventive-maintenance',
      businessLogicService: null, // Direct NAPI implementation
      integrationMethods: ['schedulePreventive', 'optimizeResources', 'trackEquipment', 'generateMetrics'],
      fallbackEnabled: true
    });

    this.bridges.set('technician-mobile', {
      napiServiceName: 'technician-mobile',
      businessLogicService: null, // Direct NAPI implementation
      integrationMethods: ['mobileWorkflow', 'syncOffline', 'manageField', 'trackProgress'],
      fallbackEnabled: true
    });

    // Development and Integration Services
    this.bridges.set('sdk-generator', {
      napiServiceName: 'sdk-generator',
      businessLogicService: null, // Direct NAPI implementation
      integrationMethods: ['generateSDK', 'manageTemplates', 'supportLanguages', 'generateDocs'],
      fallbackEnabled: true
    });

    this.bridges.set('api-documentation', {
      napiServiceName: 'api-documentation',
      businessLogicService: null, // Direct NAPI implementation
      integrationMethods: ['generateOpenAPI', 'autoateDocumentation', 'manageSdk', 'trackVersions'],
      fallbackEnabled: true
    });

    // Enterprise Services
    this.bridges.set('enterprise-service-bus', {
      napiServiceName: 'enterprise-service-bus',
      businessLogicService: null, // Direct NAPI implementation
      integrationMethods: ['routeMessages', 'orchestrateServices', 'translateProtocols', 'integrateSystem'],
      fallbackEnabled: true
    });

    this.bridges.set('white-label', {
      napiServiceName: 'white-label',
      businessLogicService: null, // Direct NAPI implementation
      integrationMethods: ['customizeBranding', 'manageThemes', 'supportTenancy', 'personalizeUI'],
      fallbackEnabled: true
    });

    // Analytics and Reporting
    this.bridges.set('data-warehouse', {
      napiServiceName: 'data-warehouse',
      businessLogicService: null, // Direct NAPI implementation
      integrationMethods: ['aggregateData', 'processETL', 'optimizeAnalytics', 'manageSchema'],
      fallbackEnabled: true
    });

    this.bridges.set('workflow', {
      napiServiceName: 'workflow',
      businessLogicService: null, // Direct NAPI implementation
      integrationMethods: ['automateWorkflow', 'manageApproval', 'modelProcess', 'monitorSLA'],
      fallbackEnabled: true
    });

    // Facilities Management
    this.bridges.set('move-management', {
      napiServiceName: 'move-management',
      businessLogicService: null, // Direct NAPI implementation
      integrationMethods: ['planMove', 'allocateResources', 'coordinateLogistics', 'trackCosts'],
      fallbackEnabled: true
    });
  }

  /**
   * Execute integrated business logic operation
   */
  async executeIntegratedOperation<T = any>(
    serviceName: string,
    methodName: string,
    args: any[] = [],
    options: { useNapi?: boolean; timeout?: number } = {}
  ): Promise<StandardResponse<T>> {
    const bridge = this.bridges.get(serviceName);
    if (!bridge) {
      return {
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: `Business logic bridge not found for service: ${serviceName}`
        }
      };
    }

    const useNapi = options.useNapi !== false; // Default to true

    try {
      // Try NAPI service first if available and requested
      if (useNapi) {
        try {
          const napiResult = await napiRegistry.executeServiceMethod<T>(
            bridge.napiServiceName,
            methodName,
            args,
            { timeout: options.timeout }
          );

          if (napiResult.success) {
            logger.debug(`NAPI service executed successfully: ${serviceName}.${methodName}`);
            return napiResult;
          }
        } catch (napiError) {
          logger.warn(`NAPI service failed, attempting fallback: ${serviceName}.${methodName}`, napiError);
        }
      }

      // Fallback to TypeScript business logic if available
      if (bridge.fallbackEnabled && bridge.businessLogicService) {
        if (typeof bridge.businessLogicService[methodName] === 'function') {
          const startTime = Date.now();
          const result = await bridge.businessLogicService[methodName](...args);
          const executionTime = Date.now() - startTime;

          logger.debug(`TypeScript fallback executed successfully: ${serviceName}.${methodName}`);

          return {
            success: true,
            data: result,
            metadata: {
              timestamp: new Date(),
              requestId: this.generateRequestId(),
              executionTime,
              apiVersion: '1.0.0'
            }
          };
        }
      }

      // If no fallback is available
      return {
        success: false,
        error: {
          code: 'METHOD_NOT_AVAILABLE',
          message: `Method ${methodName} not available for service ${serviceName}`
        }
      };

    } catch (error) {
      logger.error(`Error executing integrated operation ${serviceName}.${methodName}:`, error);
      
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Unknown error occurred',
          details: { serviceName, methodName }
        }
      };
    }
  }

  /**
   * Get bridge information for a service
   */
  getBridgeInfo(serviceName: string): BusinessLogicBridge | null {
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
    const bridgeCount = this.bridges.size;
    let napiHealthy = 0;
    let businessLogicHealthy = 0;

    for (const [serviceName, bridge] of this.bridges) {
      // Check NAPI service health
      try {
        const napiResult = await napiRegistry.executeServiceMethod(
          bridge.napiServiceName,
          'healthCheck',
          [],
          { timeout: 5000 }
        );
        if (napiResult.success) {
          napiHealthy++;
        }
      } catch (error) {
        // NAPI service not available
      }

      // Check business logic service health
      if (bridge.businessLogicService && typeof bridge.businessLogicService.healthCheck === 'function') {
        try {
          await bridge.businessLogicService.healthCheck();
          businessLogicHealthy++;
        } catch (error) {
          // Business logic service not healthy
        }
      }
    }

    return {
      bridgeCount,
      napiHealthy,
      businessLogicHealthy
    };
  }

  /**
   * Production-ready enhanced execution with validation, monitoring, and retry logic
   */
  async executeProductionOperation<T = any>(
    serviceName: string,
    methodName: string,
    args: any[] = [],
    options: { 
      useNapi?: boolean; 
      timeout?: number;
      validateInput?: boolean;
      retryOnFailure?: boolean;
      circuitBreaker?: boolean;
    } = {}
  ): Promise<StandardResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Update metrics
      this.metrics.totalRequests++;
      
      // Input validation
      if (options.validateInput !== false) {
        const validationResult = this.validateInput(serviceName, methodName, args);
        if (!validationResult.isValid) {
          this.metrics.failedRequests++;
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Input validation failed',
              details: validationResult.errors
            },
            metadata: {
              requestId,
              timestamp: new Date(),
              executionTime: Date.now() - startTime,
              apiVersion: '1.0.0'
            }
          };
        }
      }

      // Rate limiting check
      if (!this.checkRateLimit(serviceName)) {
        this.metrics.failedRequests++;
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded for service: ${serviceName}`
          },
          metadata: {
            requestId,
            timestamp: new Date(),
            executionTime: Date.now() - startTime,
            apiVersion: '1.0.0'
          }
        };
      }

      // Circuit breaker check
      if (options.circuitBreaker !== false && this.isCircuitOpen(serviceName)) {
        this.metrics.failedRequests++;
        return {
          success: false,
          error: {
            code: 'CIRCUIT_BREAKER_OPEN',
            message: `Circuit breaker open for service: ${serviceName}`
          },
          metadata: {
            requestId,
            timestamp: new Date(),
            executionTime: Date.now() - startTime,
            apiVersion: '1.0.0'
          }
        };
      }

      // Execute with retry logic
      let lastError: any;
      const maxRetries = options.retryOnFailure !== false ? this.maxRetries : 1;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await this.executeIntegratedOperation<T>(
            serviceName, 
            methodName, 
            args, 
            options
          );
          
          if (result.success) {
            // Update success metrics
            this.metrics.successfulRequests++;
            this.updateBridgeMetrics(serviceName, true, Date.now() - startTime);
            this.updateAverageResponseTime(Date.now() - startTime);
            
            return {
              ...result,
              metadata: {
                ...result.metadata,
                requestId,
                attempt,
                executionTime: Date.now() - startTime
              }
            };
          } else {
            lastError = result.error;
            if (attempt < maxRetries) {
              await this.delay(Math.pow(2, attempt - 1) * 1000); // Exponential backoff
            }
          }
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            await this.delay(Math.pow(2, attempt - 1) * 1000);
          }
        }
      }

      // All retries failed
      this.metrics.failedRequests++;
      this.updateBridgeMetrics(serviceName, false, Date.now() - startTime);
      
      return {
        success: false,
        error: lastError || {
          code: 'MAX_RETRIES_EXCEEDED',
          message: `Operation failed after ${maxRetries} attempts`
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          attempts: maxRetries,
          apiVersion: '1.0.0'
        }
      };

    } catch (error) {
      this.metrics.failedRequests++;
      logger.error(`Production operation failed: ${serviceName}.${methodName}`, error);
      
      return {
        success: false,
        error: {
          code: 'PRODUCTION_EXECUTION_ERROR',
          message: error.message || 'Unknown production error occurred',
          details: { serviceName, methodName, requestId }
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          apiVersion: '1.0.0'
        }
      };
    }
  }

  /**
   * Get comprehensive production metrics
   */
  getProductionMetrics(): ProductionMetrics & { 
    detailedMetrics: Array<{ 
      serviceName: string; 
      callCount: number; 
      successRate: number; 
      avgResponseTime: number;
      isHealthy: boolean; 
    }> 
  } {
    const detailedMetrics = Array.from(this.bridges.entries()).map(([serviceName, bridge]) => ({
      serviceName,
      callCount: bridge.metrics?.callCount || 0,
      successRate: bridge.metrics ? 
        (bridge.metrics.successCount / Math.max(bridge.metrics.callCount, 1)) * 100 : 0,
      avgResponseTime: bridge.metrics?.avgResponseTime || 0,
      isHealthy: this.metrics.serviceHealth.get(serviceName) || false
    }));

    return {
      ...this.metrics,
      detailedMetrics
    };
  }

  /**
   * Comprehensive health check with circuit breaker status
   */
  async comprehensiveHealthCheck(): Promise<{
    overallHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    serviceStatuses: Array<{
      serviceName: string;
      napiStatus: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
      businessLogicStatus: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
      circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
      lastHealthCheck: Date;
    }>;
    metrics: ProductionMetrics;
  }> {
    const serviceStatuses = [];
    let healthyServices = 0;
    
    for (const [serviceName, bridge] of this.bridges) {
      const napiStatus = await this.checkNapiServiceHealth(serviceName);
      const businessLogicStatus = await this.checkBusinessLogicHealth(bridge);
      const circuitBreakerStatus = this.getCircuitBreakerStatus(serviceName);
      
      serviceStatuses.push({
        serviceName,
        napiStatus,
        businessLogicStatus,
        circuitBreakerStatus,
        lastHealthCheck: new Date()
      });
      
      if (napiStatus === 'HEALTHY' || businessLogicStatus === 'HEALTHY') {
        healthyServices++;
      }
      
      // Update service health in metrics
      this.metrics.serviceHealth.set(serviceName, 
        napiStatus === 'HEALTHY' || businessLogicStatus === 'HEALTHY'
      );
    }
    
    const healthPercentage = (healthyServices / this.bridges.size) * 100;
    const overallHealth = healthPercentage >= 80 ? 'HEALTHY' : 
                         healthPercentage >= 50 ? 'DEGRADED' : 'UNHEALTHY';
    
    return {
      overallHealth,
      serviceStatuses,
      metrics: this.metrics
    };
  }

  /**
   * Add validation rules for specific service methods
   */
  addValidationRule(serviceName: string, methodName: string, rules: ValidationRule[]): void {
    if (!this.validationRules.has(serviceName)) {
      this.validationRules.set(serviceName, new Map());
    }
    this.validationRules.get(serviceName)!.set(methodName, rules);
  }

  /**
   * Setup default validation rules for business services
   */
  private setupDefaultValidationRules(): void {
    // Contract Lifecycle validation
    this.addValidationRule('contract-lifecycle', 'createContract', [
      { field: 'title', type: 'string', required: true, minLength: 3, maxLength: 200 },
      { field: 'vendorId', type: 'string', required: true },
      { field: 'amount', type: 'number', required: true, custom: (val) => val > 0 || 'Amount must be positive' },
      { field: 'startDate', type: 'string', required: true }
    ]);

    // Budget Forecast validation
    this.addValidationRule('budget-forecast', 'createBudget', [
      { field: 'organizationId', type: 'string', required: true },
      { field: 'fiscalYear', type: 'number', required: true },
      { field: 'totalBudget', type: 'number', required: true, custom: (val) => val > 0 || 'Budget must be positive' }
    ]);

    // Asset Lifecycle validation
    this.addValidationRule('asset-lifecycle', 'createAsset', [
      { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 100 },
      { field: 'type', type: 'string', required: true },
      { field: 'locationId', type: 'string', required: true }
    ]);

    // Document validation
    this.addValidationRule('document', 'uploadDocument', [
      { field: 'title', type: 'string', required: true, minLength: 1, maxLength: 255 },
      { field: 'content', type: 'object', required: true },
      { field: 'organizationId', type: 'string', required: true }
    ]);
  }

  // Private helper methods for production features
  private validateInput(serviceName: string, methodName: string, args: any[]): { isValid: boolean; errors: string[] } {
    const serviceRules = this.validationRules.get(serviceName);
    if (!serviceRules || !serviceRules.has(methodName)) {
      return { isValid: true, errors: [] };
    }

    const rules = serviceRules.get(methodName)!;
    const errors: string[] = [];
    const input = args[0] || {}; // Assume first argument is the input object

    for (const rule of rules) {
      const value = input[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${rule.field}' is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rule.type === 'string' && typeof value !== 'string') {
          errors.push(`Field '${rule.field}' must be a string`);
        } else if (rule.type === 'number' && typeof value !== 'number') {
          errors.push(`Field '${rule.field}' must be a number`);
        } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Field '${rule.field}' must be a boolean`);
        } else if (rule.type === 'object' && typeof value !== 'object') {
          errors.push(`Field '${rule.field}' must be an object`);
        } else if (rule.type === 'array' && !Array.isArray(value)) {
          errors.push(`Field '${rule.field}' must be an array`);
        }

        if (typeof value === 'string') {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push(`Field '${rule.field}' must be at least ${rule.minLength} characters`);
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(`Field '${rule.field}' must not exceed ${rule.maxLength} characters`);
          }
          if (rule.pattern && !rule.pattern.test(value)) {
            errors.push(`Field '${rule.field}' format is invalid`);
          }
        }

        if (rule.custom) {
          const customResult = rule.custom(value);
          if (typeof customResult === 'string') {
            errors.push(customResult);
          } else if (!customResult) {
            errors.push(`Field '${rule.field}' failed custom validation`);
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private checkRateLimit(serviceName: string): boolean {
    const bridge = this.bridges.get(serviceName);
    if (!bridge?.rateLimit) return true;

    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // Current minute window
    
    if (!bridge.rateLimit.requestWindow.has(windowStart)) {
      bridge.rateLimit.requestWindow.clear(); // Clear old windows
      bridge.rateLimit.requestWindow.set(windowStart, 0);
    }

    const currentCount = bridge.rateLimit.requestWindow.get(windowStart) || 0;
    if (currentCount >= bridge.rateLimit.maxRequestsPerMinute) {
      return false;
    }

    bridge.rateLimit.requestWindow.set(windowStart, currentCount + 1);
    return true;
  }

  private isCircuitOpen(serviceName: string): boolean {
    const bridge = this.bridges.get(serviceName);
    if (!bridge?.metrics) return false;

    const successRate = bridge.metrics.callCount > 0 ? 
      (bridge.metrics.successCount / bridge.metrics.callCount) : 1;
    
    // Open circuit if success rate is below 50% and we have at least 10 calls
    return bridge.metrics.callCount >= 10 && successRate < 0.5;
  }

  private getCircuitBreakerStatus(serviceName: string): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.isCircuitOpen(serviceName) ? 'OPEN' : 'CLOSED';
  }

  private updateBridgeMetrics(serviceName: string, success: boolean, responseTime: number): void {
    const bridge = this.bridges.get(serviceName);
    if (!bridge) return;

    if (!bridge.metrics) {
      bridge.metrics = {
        callCount: 0,
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0
      };
    }

    bridge.metrics.callCount++;
    if (success) {
      bridge.metrics.successCount++;
    } else {
      bridge.metrics.failureCount++;
    }

    // Update average response time
    bridge.metrics.avgResponseTime = 
      (bridge.metrics.avgResponseTime * (bridge.metrics.callCount - 1) + responseTime) / 
      bridge.metrics.callCount;
  }

  private updateAverageResponseTime(responseTime: number): void {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
  }

  private async checkNapiServiceHealth(serviceName: string): Promise<'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN'> {
    try {
      const result = await napiRegistry.executeServiceMethod(
        serviceName,
        'healthCheck',
        [],
        { timeout: 3000 }
      );
      return result.success ? 'HEALTHY' : 'UNHEALTHY';
    } catch (error) {
      return 'UNKNOWN';
    }
  }

  private async checkBusinessLogicHealth(bridge: BusinessLogicBridge): Promise<'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN'> {
    if (!bridge.businessLogicService) return 'UNKNOWN';
    
    try {
      if (typeof bridge.businessLogicService.healthCheck === 'function') {
        await bridge.businessLogicService.healthCheck();
        return 'HEALTHY';
      } else {
        return 'UNKNOWN';
      }
    } catch (error) {
      return 'UNHEALTHY';
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Setup production-grade rate limiting for each service
   */
  private setupProductionRateLimiting(): void {
    for (const [serviceName, bridge] of this.bridges) {
      // Setup rate limiting based on service type
      const isHighFrequency = ['notification', 'reporting', 'search'].some(type => 
        serviceName.includes(type)
      );
      
      bridge.rateLimit = {
        maxRequestsPerMinute: isHighFrequency ? 1000 : 200,
        requestWindow: new Map()
      };
    }
    
    logger.info('Production rate limiting configured for all services');
  }

  /**
   * Start background health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    setInterval(async () => {
      try {
        const healthStatus = await this.comprehensiveHealthCheck();
        
        // Log any unhealthy services
        const unhealthyServices = healthStatus.serviceStatuses.filter(
          s => s.napiStatus === 'UNHEALTHY' && s.businessLogicStatus === 'UNHEALTHY'
        );
        
        if (unhealthyServices.length > 0) {
          logger.warn('Unhealthy services detected:', unhealthyServices.map(s => s.serviceName));
        }
        
        // Update metrics
        this.metrics.napiSuccessRate = this.calculateNapiSuccessRate();
        this.metrics.fallbackUsageRate = this.calculateFallbackUsageRate();
        
      } catch (error) {
        logger.error('Health check monitoring failed:', error);
      }
    }, this.healthCheckInterval);
  }

  private calculateNapiSuccessRate(): number {
    let totalNapiCalls = 0;
    let successfulNapiCalls = 0;
    
    for (const bridge of this.bridges.values()) {
      if (bridge.metrics) {
        totalNapiCalls += bridge.metrics.callCount;
        successfulNapiCalls += bridge.metrics.successCount;
      }
    }
    
    return totalNapiCalls > 0 ? (successfulNapiCalls / totalNapiCalls) * 100 : 0;
  }

  private calculateFallbackUsageRate(): number {
    // This would need to be tracked separately in the actual execution
    // For now, return a calculated estimate based on circuit breaker status
    const openCircuits = Array.from(this.bridges.keys()).filter(serviceName => 
      this.isCircuitOpen(serviceName)
    ).length;
    
    return this.bridges.size > 0 ? (openCircuits / this.bridges.size) * 100 : 0;
  }

  private generateRequestId(): string {
    return `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const businessLogicIntegration = BusinessLogicIntegrationService.getInstance();
export const businessLogicIntegration = BusinessLogicIntegrationService.getInstance();