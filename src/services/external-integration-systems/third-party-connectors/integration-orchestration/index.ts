/**
 * External Integration Systems Operations Manager
 * 
 * Main orchestrator service for external integration systems domain, coordinating
 * Microsoft 365, Salesforce, calendar integrations, API management, and legacy
 * system integrations with comprehensive orchestration and cross-service coordination.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../../config/logger';

// Import sub-services
import { Microsoft365IntegrationService } from './Microsoft365IntegrationService';
import { SalesforceIntegrationService } from './SalesforceIntegrationService';
import { CalendarIntegrationService } from './CalendarIntegrationService';
import { APIManagementService } from './APIManagementService';
import { Phase3IntegrationService } from './Phase3IntegrationService';

export interface IntegrationContext {
  organizationId: string;
  userId: string;
  permissions: string[];
}

export interface IntegrationProvisioningOptions {
  organizationId: string;
  integrations: string[];
  config: Record<string, any>;
  createdBy: string;
}

export class ExternalIntegrationSystemsManager extends EventEmitter {
  // Full sub-services for comprehensive integration management
  private microsoft365Service: Microsoft365IntegrationService;
  private salesforceService: SalesforceIntegrationService;
  private calendarService: CalendarIntegrationService;
  private apiManagementService: APIManagementService;
  private phase3Service: Phase3IntegrationService;
  
  private integrationCache: Map<string, any> = new Map();

  constructor(private context?: IntegrationContext) {
    super();
    
    // Initialize all sub-services with context
    this.microsoft365Service = new Microsoft365IntegrationService(
      this.getServiceConfig('microsoft365'), 
      context
    );
    this.salesforceService = new SalesforceIntegrationService(
      this.getServiceConfig('salesforce'), 
      context
    );
    this.calendarService = new CalendarIntegrationService(context);
    this.apiManagementService = new APIManagementService(context);
    this.phase3Service = new Phase3IntegrationService(context);
    
    this.setupEventHandlers();
    this.setupServiceCoordination();
    logger.info('External Integration Systems Manager initialized with full sub-services', {
      organizationId: context?.organizationId
    });
  }

  /**
   * Setup cross-service event coordination
   */
  private setupEventHandlers(): void {
    // Coordinate calendar events with Microsoft 365
    this.calendarService.on('event:created', (data) => {
      if (this.shouldSyncWithMicrosoft365(data)) {
        this.microsoft365Service.createCalendarEvent(data.startTime, data.endTime);
      }
    });

    // Sync Salesforce contacts with calendar attendees
    this.salesforceService.on('contact:created', (data) => {
      this.emit('integration:contact_sync_needed', data);
    });

    // API usage monitoring
    this.apiManagementService.on('metrics:recorded', (data) => {
      this.phase3Service.emit('api:usage_recorded', data);
    });

    // Cross-platform authentication events
    this.on('auth:token_expired', this.handleTokenExpiration.bind(this));
    this.on('auth:refresh_needed', this.handleTokenRefresh.bind(this));
  }

  /**
   * Setup service coordination and event forwarding
   */
  private setupServiceCoordination(): void {
    // Forward events from sub-services to main orchestrator
    this.microsoft365Service.on('authenticated', (data) => {
      this.emit('microsoft365:authenticated', data);
    });
    
    this.salesforceService.on('sync:completed', (data) => {
      this.emit('salesforce:sync_completed', data);
    });
    
    this.calendarService.on('sync:completed', (data) => {
      this.emit('calendar:sync_completed', data);
    });

    this.apiManagementService.on('endpoint:created', (data) => {
      this.emit('api:endpoint_created', data);
    });

    this.phase3Service.on('workflow:completed', (data) => {
      this.emit('phase3:workflow_completed', data);
    });
  }

  /**
   * Provision integration systems for organization
   */
  async provisionIntegrations(options: IntegrationProvisioningOptions): Promise<void> {
    try {
      logger.info('Provisioning integration systems', {
        organizationId: options.organizationId,
        integrations: options.integrations
      });

      const results = [];

      for (const integration of options.integrations) {
        try {
          switch (integration) {
            case 'microsoft365':
              await this.setupMicrosoft365Integration(options);
              break;
            case 'salesforce':
              await this.setupSalesforceIntegration(options);
              break;
            case 'calendar':
              await this.setupCalendarIntegration(options);
              break;
            case 'api_management':
              await this.setupAPIManagement(options);
              break;
            case 'legacy_systems':
              await this.setupLegacySystemsIntegration(options);
              break;
          }
          results.push({ integration, status: 'success' });
        } catch (error) {
          logger.error(`Failed to provision ${integration}`, { error });
          results.push({ 
            integration, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      this.emit('integrations:provisioned', {
        organizationId: options.organizationId,
        results
      });

      logger.info('Integration systems provisioning completed', {
        organizationId: options.organizationId,
        successCount: results.filter(r => r.status === 'success').length,
        failureCount: results.filter(r => r.status === 'failed').length
      });
    } catch (error) {
      logger.error('Integration systems provisioning failed', {
        organizationId: options.organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get service instances for direct access
   */
  getServices() {
    return {
      microsoft365Service: this.microsoft365Service,
      salesforceService: this.salesforceService,
      calendarService: this.calendarService,
      apiManagementService: this.apiManagementService,
      phase3Service: this.phase3Service
    };
  }

  /**
   * Comprehensive integration health check
   */
  async checkIntegrationsHealth(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    services: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'error';
      details: any;
    }>;
    lastChecked: Date;
  }> {
    try {
      const healthChecks = await Promise.all([
        this.checkMicrosoft365Health(),
        this.checkSalesforceHealth(),
        this.checkCalendarHealth(),
        this.checkAPIManagementHealth(),
        this.checkPhase3Health()
      ]);

      const services = [
        { name: 'Microsoft 365', status: healthChecks[0].status, details: healthChecks[0] },
        { name: 'Salesforce', status: healthChecks[1].status, details: healthChecks[1] },
        { name: 'Calendar', status: healthChecks[2].status, details: healthChecks[2] },
        { name: 'API Management', status: healthChecks[3].status, details: healthChecks[3] },
        { name: 'Phase3 Integration', status: healthChecks[4].status, details: healthChecks[4] }
      ];

      const healthyCount = services.filter(s => s.status === 'healthy').length;
      const errorCount = services.filter(s => s.status === 'error').length;

      let overall: 'healthy' | 'warning' | 'critical';
      if (errorCount > 2) overall = 'critical';
      else if (errorCount > 0 || healthyCount < services.length) overall = 'warning';
      else overall = 'healthy';

      return {
        overall,
        services,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Integration health check failed', { error });
      return {
        overall: 'critical',
        services: [],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Sync all integrations
   */
  async syncAllIntegrations(): Promise<{
    syncId: string;
    startedAt: Date;
    completedAt?: Date;
    results: Array<{
      service: string;
      status: 'success' | 'failed';
      recordsProcessed?: number;
      errors?: string[];
    }>;
  }> {
    const syncId = `integration-sync-${Date.now()}`;
    const syncOperation = {
      syncId,
      startedAt: new Date(),
      results: [] as Array<{
        service: string;
        status: 'success' | 'failed';
        recordsProcessed?: number;
        errors?: string[];
      }>
    };

    try {
      logger.info('Starting comprehensive integration sync', { syncId });

      // Sync Microsoft 365
      try {
        const m365Sync = await this.microsoft365Service.syncAllData();
        syncOperation.results.push({
          service: 'Microsoft 365',
          status: m365Sync.status === 'completed' ? 'success' : 'failed',
          recordsProcessed: Object.values(m365Sync.results).reduce((sum, count) => sum + count, 0),
          errors: m365Sync.errors
        });
      } catch (error) {
        syncOperation.results.push({
          service: 'Microsoft 365',
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }

      // Sync Salesforce
      try {
        const salesforceSync = await this.salesforceService.syncAllData();
        syncOperation.results.push({
          service: 'Salesforce',
          status: salesforceSync.status === 'completed' ? 'success' : 'failed',
          recordsProcessed: Object.values(salesforceSync.results).reduce((sum, count) => sum + count, 0),
          errors: salesforceSync.errors
        });
      } catch (error) {
        syncOperation.results.push({
          service: 'Salesforce',
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }

      // Sync Calendar
      try {
        const calendarSync = await this.calendarService.syncCalendars();
        syncOperation.results.push({
          service: 'Calendar',
          status: calendarSync.status === 'completed' ? 'success' : 'failed',
          recordsProcessed: calendarSync.eventsProcessed,
          errors: calendarSync.errors
        });
      } catch (error) {
        syncOperation.results.push({
          service: 'Calendar',
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }

      syncOperation.completedAt = new Date();

      this.emit('sync:completed', {
        syncId,
        results: syncOperation.results,
        organizationId: this.context?.organizationId
      });

      logger.info('Comprehensive integration sync completed', {
        syncId,
        successCount: syncOperation.results.filter(r => r.status === 'success').length,
        failureCount: syncOperation.results.filter(r => r.status === 'failed').length
      });

    } catch (error) {
      syncOperation.completedAt = new Date();
      logger.error('Comprehensive integration sync failed', { syncId, error });
    }

    return syncOperation;
  }

  // Private setup methods for each integration
  private async setupMicrosoft365Integration(options: IntegrationProvisioningOptions): Promise<void> {
    const config = options.config.microsoft365 || {};
    
    // Configure Microsoft 365 service
    await this.microsoft365Service.authenticate(config.authCode, config.refreshToken);
    
    logger.info('Microsoft 365 integration setup completed', {
      organizationId: options.organizationId
    });
  }

  private async setupSalesforceIntegration(options: IntegrationProvisioningOptions): Promise<void> {
    const config = options.config.salesforce || {};
    
    // Configure Salesforce service
    await this.salesforceService.authenticate();
    
    logger.info('Salesforce integration setup completed', {
      organizationId: options.organizationId
    });
  }

  private async setupCalendarIntegration(options: IntegrationProvisioningOptions): Promise<void> {
    const config = options.config.calendar || {};
    
    // Add calendar providers based on configuration
    if (config.providers) {
      for (const provider of config.providers) {
        await this.calendarService.addCalendarProvider(provider);
      }
    }
    
    logger.info('Calendar integration setup completed', {
      organizationId: options.organizationId,
      providersCount: config.providers?.length || 0
    });
  }

  private async setupAPIManagement(options: IntegrationProvisioningOptions): Promise<void> {
    const config = options.config.apiManagement || {};
    
    // Create default API endpoints if configured
    if (config.endpoints) {
      for (const endpoint of config.endpoints) {
        await this.apiManagementService.createEndpoint(endpoint);
      }
    }
    
    // Create API keys if configured
    if (config.apiKeys) {
      for (const keyConfig of config.apiKeys) {
        await this.apiManagementService.createAPIKey({
          ...keyConfig,
          organizationId: options.organizationId
        });
      }
    }
    
    logger.info('API Management setup completed', {
      organizationId: options.organizationId,
      endpointsCount: config.endpoints?.length || 0,
      apiKeysCount: config.apiKeys?.length || 0
    });
  }

  private async setupLegacySystemsIntegration(options: IntegrationProvisioningOptions): Promise<void> {
    const config = options.config.legacySystems || {};
    
    // Create integration rules if configured
    if (config.integrationRules) {
      for (const rule of config.integrationRules) {
        await this.phase3Service.createIntegrationRule(rule);
      }
    }
    
    // Create workflows if configured
    if (config.workflows) {
      for (const workflow of config.workflows) {
        await this.phase3Service.createWorkflow(workflow);
      }
    }
    
    logger.info('Legacy systems integration setup completed', {
      organizationId: options.organizationId,
      rulesCount: config.integrationRules?.length || 0,
      workflowsCount: config.workflows?.length || 0
    });
  }

  // Health check methods for each service
  private async checkMicrosoft365Health(): Promise<any> {
    try {
      return await this.microsoft365Service.checkIntegrationHealth();
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkSalesforceHealth(): Promise<any> {
    try {
      return await this.salesforceService.checkIntegrationHealth();
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkCalendarHealth(): Promise<any> {
    try {
      return await this.calendarService.checkIntegrationHealth();
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkAPIManagementHealth(): Promise<any> {
    try {
      return await this.apiManagementService.healthCheck();
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkPhase3Health(): Promise<any> {
    try {
      return this.phase3Service.getServiceHealth();
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Event handlers
  private shouldSyncWithMicrosoft365(data: any): boolean {
    // Logic to determine if calendar event should sync with Microsoft 365
    return data.provider !== 'OUTLOOK'; // Avoid loops
  }

  private async handleTokenExpiration(data: any): Promise<void> {
    logger.warn('Token expiration detected', { service: data.service });
    
    switch (data.service) {
      case 'microsoft365':
        // Attempt to refresh Microsoft 365 token
        break;
      case 'salesforce':
        // Re-authenticate with Salesforce
        await this.salesforceService.authenticate();
        break;
    }
  }

  private async handleTokenRefresh(data: any): Promise<void> {
    logger.info('Token refresh initiated', { service: data.service });
    
    // Handle token refresh logic
  }

  // Helper methods
  private getServiceConfig(service: string): any {
    // In real implementation, would load from configuration store
    const configs: Record<string, any> = {
      microsoft365: {
        clientId: process.env.MICROSOFT365_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT365_CLIENT_SECRET || '',
        tenantId: process.env.MICROSOFT365_TENANT_ID || '',
        redirectUri: process.env.MICROSOFT365_REDIRECT_URI || '',
        scopes: ['https://graph.microsoft.com/calendars.readwrite', 'https://graph.microsoft.com/mail.send']
      },
      salesforce: {
        clientId: process.env.SALESFORCE_CLIENT_ID || '',
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
        username: process.env.SALESFORCE_USERNAME || '',
        password: process.env.SALESFORCE_PASSWORD || '',
        securityToken: process.env.SALESFORCE_SECURITY_TOKEN || '',
        loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
        version: '58.0'
      }
    };

    return configs[service] || {};
  }

  /**
   * Generate comprehensive integration dashboard
   */
  async generateIntegrationDashboard(): Promise<{
    summary: {
      totalIntegrations: number;
      activeIntegrations: number;
      healthyIntegrations: number;
      lastSyncTime: Date;
    };
    services: Array<{
      name: string;
      status: string;
      lastActivity: Date;
      metrics: any;
    }>;
    recentActivity: Array<{
      timestamp: Date;
      service: string;
      action: string;
      details: any;
    }>;
  }> {
    try {
      const health = await this.checkIntegrationsHealth();
      
      return {
        summary: {
          totalIntegrations: health.services.length,
          activeIntegrations: health.services.filter(s => s.status !== 'error').length,
          healthyIntegrations: health.services.filter(s => s.status === 'healthy').length,
          lastSyncTime: new Date()
        },
        services: health.services.map(service => ({
          name: service.name,
          status: service.status,
          lastActivity: new Date(),
          metrics: service.details
        })),
        recentActivity: [] // Would be populated from activity log
      };
    } catch (error) {
      logger.error('Failed to generate integration dashboard', { error });
      throw error;
    }
  }

  /**
   * Clear all service caches
   */
  clearCaches(): void {
    this.integrationCache.clear();
    this.microsoft365Service.clearCache();
    this.salesforceService.clearCache();
    this.calendarService.clearCache();
    this.apiManagementService.clearCaches();
    
    logger.info('All external integration caches cleared');
  }
}

// Export the main orchestrator and individual services for flexibility
export { ExternalIntegrationSystemsManager };
export { Microsoft365IntegrationService } from './Microsoft365IntegrationService';
export { SalesforceIntegrationService } from './SalesforceIntegrationService';
export { CalendarIntegrationService } from './CalendarIntegrationService';
export { APIManagementService } from './APIManagementService';
export { Phase3IntegrationService } from './Phase3IntegrationService';