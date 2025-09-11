/**
 * Integration Management Sub-Service - Enterprise system integrations
 * 
 * This sub-service handles all external system integrations including:
 * - Microsoft 365 integration
 * - Salesforce CRM integration  
 * - Calendar system integration
 * - CAD system integration
 * - Enterprise service bus coordination
 * 
 * Part of the Integration Management domain within Turbo Asset IWMS
 */

// Import existing services to orchestrate them
import { Microsoft365IntegrationService } from '@/../Microsoft365IntegrationService';
import { SalesforceIntegrationService } from '@/../SalesforceIntegrationService';
import { CalendarIntegrationService } from '@/../CalendarIntegrationService';
import { CADIntegrationService } from '@/../CADIntegrationService';
import { IntegrationService } from '@/../IntegrationService';

/**
 * Main Enterprise Connectors Service - Orchestrates all integration operations
 * 
 * This class provides a unified interface to all enterprise system integrations,
 * coordinating between various external system connectors.
 */
export class EnterpriseConnectorsService {
  private microsoft365Service: Microsoft365IntegrationService;
  private salesforceService: SalesforceIntegrationService;
  private calendarService: CalendarIntegrationService;
  private cadService: CADIntegrationService;
  private integrationService: IntegrationService;

  constructor() {
    // Initialize all integration services
    this.microsoft365Service = new Microsoft365IntegrationService();
    this.salesforceService = new SalesforceIntegrationService();
    this.calendarService = new CalendarIntegrationService();
    this.cadService = new CADIntegrationService();
    this.integrationService = new IntegrationService();
  }

  // Expose service getters for direct access when needed
  get microsoft365() { return this.microsoft365Service; }
  get salesforce() { return this.salesforceService; }
  get calendar() { return this.calendarService; }
  get cad() { return this.cadService; }
  get integration() { return this.integrationService; }

  // Convenience methods that orchestrate across services
  
  /**
   * Sync data across all integrated systems
   */
  async syncAllSystems(organizationId: string, options: {
    includeM365?: boolean;
    includeSalesforce?: boolean;
    includeCalendar?: boolean;
    includeCAD?: boolean;
  } = {}): Promise<{
    m365?: any;
    salesforce?: any;
    calendar?: any;
    cad?: any;
    summary: {
      successful: number;
      failed: number;
      totalSynced: number;
    };
  }> {
    const results: any = {};
    let successful = 0;
    let failed = 0;

    try {
      if (options.includeM365 !== false) {
        try {
          results.m365 = await this.microsoft365Service.syncData(organizationId);
          successful++;
        } catch (error: unknown) {
          failed++;
          results.m365 = { error: error.message };
        }
      }

      if (options.includeSalesforce !== false) {
        try {
          results.salesforce = await this.salesforceService.syncContacts(organizationId);
          successful++;
        } catch (error: unknown) {
          failed++;
          results.salesforce = { error: error.message };
        }
      }

      if (options.includeCalendar !== false) {
        try {
          results.calendar = await this.calendarService.syncCalendarEvents(organizationId);
          successful++;
        } catch (error: unknown) {
          failed++;
          results.calendar = { error: error.message };
        }
      }

      if (options.includeCAD !== false) {
        try {
          results.cad = await this.cadService.syncDrawings(organizationId);
          successful++;
        } catch (error: unknown) {
          failed++;
          results.cad = { error: error.message };
        }
      }
    } catch (error: unknown) {
      failed++;
    }

    results.summary = {
      successful,
      failed,
      totalSynced: successful + failed,
    };

    return results;
  }

  /**
   * Get integration health status
   */
  async getIntegrationHealth(organizationId: string): Promise<{
    overall: 'healthy' | 'degraded' | 'failed';
    services: {
      m365: 'healthy' | 'degraded' | 'failed';
      salesforce: 'healthy' | 'degraded' | 'failed';
      calendar: 'healthy' | 'degraded' | 'failed';
      cad: 'healthy' | 'degraded' | 'failed';
    };
    lastChecked: Date;
  }> {
    const health = {
      overall: 'healthy' as const,
      services: {
        m365: 'healthy' as const,
        salesforce: 'healthy' as const,
        calendar: 'healthy' as const,
        cad: 'healthy' as const,
      },
      lastChecked: new Date(),
    };

    try {
      // Check each service health
      const healthChecks = await Promise.allSettled([
        this.checkServiceHealth('m365', organizationId),
        this.checkServiceHealth('salesforce', organizationId),
        this.checkServiceHealth('calendar', organizationId),
        this.checkServiceHealth('cad', organizationId),
      ]);

      const serviceNames = ['m365', 'salesforce', 'calendar', 'cad'] as const;
      let degradedCount = 0;
      let failedCount = 0;

      healthChecks.forEach((result, index) => {
        const serviceName = serviceNames[index];
        if (result.status === 'fulfilled') {
          health.services[serviceName] = result.value;
        } else {
          health.services[serviceName] = 'failed';
          failedCount++;
        }

        if (health.services[serviceName] === 'degraded') {
          degradedCount++;
        } else if (health.services[serviceName] === 'failed') {
          failedCount++;
        }
      });

      // Determine overall health
      if (failedCount > 2) {
        health.overall = 'failed';
      } else if (failedCount > 0 || degradedCount > 1) {
        health.overall = 'degraded';
      }

      return health;
    } catch (error: unknown) {
      return {
        ...health,
        overall: 'failed',
      };
    }
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(service: string, organizationId: string): Promise<'healthy' | 'degraded' | 'failed'> {
    try {
      switch (service) {
        case 'm365':
          // Basic health check - try to get user info
          await this.microsoft365Service.getUserProfile?.(organizationId);
          return 'healthy';
        case 'salesforce':
          // Basic health check
          await this.salesforceService.testConnection?.(organizationId);
          return 'healthy';
        case 'calendar':
          // Basic health check
          await this.calendarService.getCalendarEvents?.(organizationId, new Date(), new Date());
          return 'healthy';
        case 'cad':
          // Basic health check
          await this.cadService.getDrawings?.(organizationId);
          return 'healthy';
        default:
          return 'failed';
      }
    } catch (error: unknown) {
      // If methods don't exist or fail, consider it degraded rather than failed
      return 'degraded';
    }
  }
}