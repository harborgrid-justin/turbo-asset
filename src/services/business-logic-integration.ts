/**
 * Business Logic Integration Service
 * This service provides seamless integration between existing TypeScript business logic
 * and the new NAPI-RS performance-optimized services
 */

import { logger } from '../../config/logger';
import { napiRegistry } from '../napi-integration';
import type { 
  BaseEntity, 
  StandardResponse, 
  PaginationParams,
  PaginatedResponse 
} from '../../types/universal-data-standard';

// Import business domain managers
import { BusinessOperationsManager } from '../business-operations/project-management/business-coordination';
import { FinancialOperationsManager } from '../financial-management/cost-accounting/financial-operations';
import { ComplianceManagementOperationsManager } from '../compliance-governance/regulatory-operations/compliance-management';
import { ExternalIntegrationSystemsManager } from '../external-integration-systems/third-party-connectors/integration-orchestration';
import { InfrastructureTechnologyOperationsManager } from '../infrastructure-technology/smart-systems/infrastructure-operations';
import { DocumentLifecycleService } from '../document-management/content-operations/document-lifecycle';
import { SpaceOperationsManager } from '../space-management/utilization-analytics/space-operations';
import { AssetOperationsManager } from '../asset-operations/lifecycle-management/asset-coordination';

export interface BusinessLogicBridge {
  napiServiceName: string;
  businessLogicService: any;
  integrationMethods: string[];
  fallbackEnabled: boolean;
}

export class BusinessLogicIntegrationService {
  private static instance: BusinessLogicIntegrationService;
  private bridges: Map<string, BusinessLogicBridge> = new Map();
  private initialized = false;

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

    this.initialized = true;
    logger.info('Business Logic Integration Service initialized successfully');
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

  private generateRequestId(): string {
    return `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const businessLogicIntegration = BusinessLogicIntegrationService.getInstance();