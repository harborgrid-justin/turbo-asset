/**
 * Asset Management Sub-Service - Core asset operations and lifecycle management
 * 
 * This sub-service handles all core asset management operations including:
 * - Asset creation, reading, updating, and deletion
 * - Asset validation and business rule enforcement
 * - Work order management and maintenance scheduling
 * - Asset notifications and stakeholder communications
 * - Asset depreciation calculations and financial tracking
 * - Comprehensive audit trails and compliance reporting
 * - Asset data import/export capabilities
 * 
 * Part of the Asset Management domain within Turbo Asset IWMS
 */

// Core asset management services
export { AssetCreateService } from './AssetCreateService';
export { AssetRetrievalService } from './AssetRetrievalService';
export { AssetUpdateService } from './AssetUpdateService';
export { AssetValidationService } from './AssetValidationService';

// Supporting services
export { AssetWorkOrderService } from './AssetWorkOrderService';
export { AssetNotificationService } from './AssetNotificationService';
export { AssetDepreciationService } from './AssetDepreciationService';
export { AssetAuditService } from './AssetAuditService';
export { AssetImportExportService } from './AssetImportExportService';

// Type definitions
export * from './types/AssetTypes';

/**
 * Main Asset Management Service - Orchestrates all asset operations
 * 
 * This class provides a unified interface to all asset management capabilities,
 * coordinating between the various specialized services to provide comprehensive
 * asset lifecycle management.
 */
export class AssetManagementService {
  private createService: AssetCreateService;
  private retrievalService: AssetRetrievalService;
  private updateService: AssetUpdateService;
  private validationService: AssetValidationService;
  private workOrderService: AssetWorkOrderService;
  private notificationService: AssetNotificationService;
  private depreciationService: AssetDepreciationService;
  private auditService: AssetAuditService;
  private importExportService: AssetImportExportService;

  constructor() {
    // Initialize all sub-services
    this.createService = new AssetCreateService();
    this.retrievalService = new AssetRetrievalService();
    this.updateService = new AssetUpdateService();
    this.validationService = new AssetValidationService();
    this.workOrderService = new AssetWorkOrderService();
    this.notificationService = new AssetNotificationService();
    this.depreciationService = new AssetDepreciationService();
    this.auditService = new AssetAuditService();
    this.importExportService = new AssetImportExportService();
  }

  // Expose service getters for direct access when needed
  get create() { return this.createService; }
  get retrieval() { return this.retrievalService; }
  get update() { return this.updateService; }
  get validation() { return this.validationService; }
  get workOrders() { return this.workOrderService; }
  get notifications() { return this.notificationService; }
  get depreciation() { return this.depreciationService; }
  get audit() { return this.auditService; }
  get importExport() { return this.importExportService; }

  /**
   * Get service health and statistics
   */
  async getServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    statistics: {
      totalAssets?: number;
      recentCreations?: number;
      recentUpdates?: number;
      pendingWorkOrders?: number;
    };
  }> {
    try {
      // Test each service
      const serviceTests = {
        create: true, // Would test service connectivity
        retrieval: true,
        update: true,
        validation: true,
        workOrders: true,
        notifications: true,
        depreciation: true,
        audit: true,
        importExport: true,
      };

      const healthyServices = Object.values(serviceTests).filter(Boolean).length;
      const totalServices = Object.keys(serviceTests).length;
      const healthPercentage = (healthyServices / totalServices) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (healthPercentage < 50) {
        status = 'unhealthy';
      } else if (healthPercentage < 90) {
        status = 'degraded';
      }

      return {
        status,
        services: serviceTests,
        statistics: {
          // Statistics would be gathered from actual services
          totalAssets: 0,
          recentCreations: 0,
          recentUpdates: 0,
          pendingWorkOrders: 0,
        },
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        services: {},
        statistics: {},
      };
    }
  }

  /**
   * Initialize the service and perform any required setup
   */
  async initialize(): Promise<void> {
    // Perform any initialization required for the service
    // This might include database connections, cache warming, etc.
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    // Perform any cleanup required when shutting down
    // This might include closing connections, saving state, etc.
  }
}