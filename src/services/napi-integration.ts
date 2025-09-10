/**
 * NAPI-RS Integration Layer
 * This module provides a bridge between the existing TypeScript services 
 * and the new high-performance napi-rs packages
 */

import { logger } from '../config/logger';
import type { 
  BaseEntity, 
  StandardResponse, 
  PaginationParams,
  PaginatedResponse,
  ValidationResult,
  ModuleEvent,
  ModuleMetrics
} from '../types/universal-data-standard';

export interface NAPIServiceConfig {
  serviceName: string;
  packageName: string;
  fallbackToTs?: boolean;
  enableMetrics?: boolean;
  enableCaching?: boolean;
}

export class NAPIServiceRegistry {
  private static instance: NAPIServiceRegistry;
  private services: Map<string, any> = new Map();
  private configs: Map<string, NAPIServiceConfig> = new Map();
  private metrics: Map<string, ModuleMetrics[]> = new Map();

  static getInstance(): NAPIServiceRegistry {
    if (!NAPIServiceRegistry.instance) {
      NAPIServiceRegistry.instance = new NAPIServiceRegistry();
    }
    return NAPIServiceRegistry.instance;
  }

  /**
   * Register a napi-rs service
   */
  async registerService(config: NAPIServiceConfig): Promise<boolean> {
    try {
      // Dynamically import the napi-rs package
      const napiPackage = await import(`@turbo-asset/${config.packageName}`);
      
      // Initialize the service
      if (typeof napiPackage.init === 'function') {
        const initResult = napiPackage.init();
        logger.info(`NAPI service initialized: ${initResult}`);
      }

      this.services.set(config.serviceName, napiPackage);
      this.configs.set(config.serviceName, config);
      
      logger.info(`Registered NAPI service: ${config.serviceName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to register NAPI service ${config.serviceName}:`, error);
      
      if (config.fallbackToTs) {
        logger.info(`Falling back to TypeScript implementation for ${config.serviceName}`);
        return this.loadTypeScriptFallback(config);
      }
      
      return false;
    }
  }

  /**
   * Load TypeScript fallback service
   */
  private async loadTypeScriptFallback(config: NAPIServiceConfig): Promise<boolean> {
    try {
      // Map service names to their TypeScript equivalents
      const serviceMapping: Record<string, string> = {
        'asset-lifecycle': '../AssetLifecycleService',
        'notification': '../NotificationService',
        'document': '../DocumentService',
        'bulk-data': '../BulkDataService',
        'business-intelligence': '../BusinessIntelligenceService',
        'cad-integration': '../CADIntegrationService',
        'chargeback': '../ChargebackService',
        'compliance': '../ComplianceService',
        'custom-field': '../CustomFieldService',
        'energy-management': '../EnergyManagementService',
        'inventory': '../InventoryService',
        'iot-device': '../IoTDeviceService',
        'lease-management': '../LeaseManagementService',
        'maintenance': '../MaintenanceService',
        'portfolio': '../PortfolioService',
        'reporting': '../ReportingService',
        'space-utilization': '../SpaceUtilizationService',
        'work-order': '../WorkOrderService',
        'workflow-engine': '../WorkflowEngine',
        'integration': '../IntegrationService'
      };

      const tsModulePath = serviceMapping[config.serviceName];
      if (tsModulePath) {
        const tsModule = await import(tsModulePath);
        this.services.set(config.serviceName, tsModule);
        logger.info(`Loaded TypeScript fallback for ${config.serviceName}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to load TypeScript fallback for ${config.serviceName}:`, error);
      return false;
    }
  }

  /**
   * Get a registered service
   */
  getService<T = any>(serviceName: string): T | null {
    return this.services.get(serviceName) || null;
  }

  /**
   * Execute a service method with error handling and metrics
   */
  async executeServiceMethod<T = any>(
    serviceName: string,
    methodName: string,
    args: any[] = [],
    options: { timeout?: number; retries?: number } = {}
  ): Promise<StandardResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      const service = this.getService(serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      // Check if method exists
      if (typeof service[methodName] !== 'function') {
        throw new Error(`Method ${methodName} not found on service ${serviceName}`);
      }

      // Execute the method
      let result: T;
      if (options.timeout) {
        result = await this.executeWithTimeout(
          service[methodName].bind(service),
          args,
          options.timeout
        );
      } else {
        result = await service[methodName](...args);
      }

      const executionTime = Date.now() - startTime;
      
      // Record metrics
      this.recordMetrics(serviceName, methodName, executionTime, true);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          requestId,
          executionTime,
          apiVersion: '1.0.0'
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Record metrics
      this.recordMetrics(serviceName, methodName, executionTime, false, error.code);

      logger.error(`Error executing ${serviceName}.${methodName}:`, error);

      return {
        success: false,
        error: {
          code: error.code || 'EXECUTION_ERROR',
          message: error.message || 'Unknown error occurred',
          details: { serviceName, methodName, args: JSON.stringify(args) }
        },
        metadata: {
          timestamp: new Date(),
          requestId,
          executionTime,
          apiVersion: '1.0.0'
        }
      };
    }
  }

  /**
   * Execute method with timeout
   */
  private async executeWithTimeout<T>(
    method: Function,
    args: any[],
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Method execution timed out after ${timeout}ms`));
      }, timeout);

      method(...args)
        .then((result: T) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Record service metrics
   */
  private recordMetrics(
    serviceName: string,
    methodName: string,
    executionTime: number,
    success: boolean,
    errorCode?: string
  ): void {
    const config = this.configs.get(serviceName);
    if (!config?.enableMetrics) return;

    const metric: ModuleMetrics = {
      moduleId: serviceName,
      operationName: methodName,
      executionTime,
      success,
      errorCode,
      timestamp: new Date(),
      organizationId: 'default', // This should come from context
    };

    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, []);
    }
    
    this.metrics.get(serviceName)!.push(metric);

    // Keep only last 1000 metrics per service
    const serviceMetrics = this.metrics.get(serviceName)!;
    if (serviceMetrics.length > 1000) {
      serviceMetrics.splice(0, serviceMetrics.length - 1000);
    }
  }

  /**
   * Get service metrics
   */
  getServiceMetrics(serviceName: string): ModuleMetrics[] {
    return this.metrics.get(serviceName) || [];
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize all NAPI services
   */
  async initializeAllServices(): Promise<void> {
    const serviceConfigs: NAPIServiceConfig[] = [
      {
        serviceName: 'asset-lifecycle',
        packageName: 'asset-lifecycle-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'notification',
        packageName: 'notification-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: true
      },
      {
        serviceName: 'document',
        packageName: 'document-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'bulk-data',
        packageName: 'bulk-data-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'business-intelligence',
        packageName: 'business-intelligence-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: true
      },
      {
        serviceName: 'cad-integration',
        packageName: 'cad-integration-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'chargeback',
        packageName: 'chargeback-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'compliance',
        packageName: 'compliance-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'custom-field',
        packageName: 'custom-field-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: true
      },
      {
        serviceName: 'energy-management',
        packageName: 'energy-management-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'inventory',
        packageName: 'inventory-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'iot-device',
        packageName: 'iot-device-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'lease-management',
        packageName: 'lease-management-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'maintenance',
        packageName: 'maintenance-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'portfolio',
        packageName: 'portfolio-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: true
      },
      {
        serviceName: 'reporting',
        packageName: 'reporting-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: true
      },
      {
        serviceName: 'space-utilization',
        packageName: 'space-utilization-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: true
      },
      {
        serviceName: 'work-order',
        packageName: 'work-order-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'workflow-engine',
        packageName: 'workflow-engine',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      },
      {
        serviceName: 'integration',
        packageName: 'integration-service',
        fallbackToTs: true,
        enableMetrics: true,
        enableCaching: false
      }
    ];

    logger.info('Initializing NAPI services...');
    
    const results = await Promise.allSettled(
      serviceConfigs.map(config => this.registerService(config))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;

    logger.info(`NAPI service initialization complete: ${successful} successful, ${failed} failed`);
  }

  /**
   * Get all registered services status
   */
  getServicesStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [serviceName, config] of this.configs.entries()) {
      const service = this.services.get(serviceName);
      status[serviceName] = {
        registered: !!service,
        config,
        metrics: this.getServiceMetrics(serviceName).length
      };
    }
    
    return status;
  }
}

// Export singleton instance
export const napiRegistry = NAPIServiceRegistry.getInstance();