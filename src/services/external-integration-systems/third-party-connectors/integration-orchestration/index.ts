/**
 * External Integration Systems Operations Manager
 * 
 * Main orchestrator service for external integration systems domain, coordinating
 * Microsoft 365, Salesforce, calendar integrations, API management, and legacy
 * system integrations with comprehensive orchestration and cross-service coordination.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../config/logger';

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
        } catch (error: unknown) {
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
    } catch (error: unknown) {
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
      if (errorCount > 2) {overall = 'critical';}
      else if (errorCount > 0 || healthyCount < services.length) {overall = 'warning';}
      else {overall = 'healthy';}

      return {
        overall,
        services,
        lastChecked: new Date()
      };
    } catch (error: unknown) {
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
      } catch (error: unknown) {
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
      } catch (error: unknown) {
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
      } catch (error: unknown) {
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

    } catch (error: unknown) {
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
    } catch (error: unknown) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkSalesforceHealth(): Promise<any> {
    try {
      return await this.salesforceService.checkIntegrationHealth();
    } catch (error: unknown) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkCalendarHealth(): Promise<any> {
    try {
      return await this.calendarService.checkIntegrationHealth();
    } catch (error: unknown) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkAPIManagementHealth(): Promise<any> {
    try {
      return await this.apiManagementService.healthCheck();
    } catch (error: unknown) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkPhase3Health(): Promise<any> {
    try {
      return this.phase3Service.getServiceHealth();
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      logger.error('Failed to generate integration dashboard', { error });
      throw error;
    }
  }

  /**
   * Advanced batch data synchronization across all platforms
   */
  async executeBatchSynchronization(
    organizationId: string,
    syncOptions: {
      platforms: string[];
      dataTypes: string[];
      direction: 'bidirectional' | 'inbound' | 'outbound';
      conflictResolution: 'source_wins' | 'target_wins' | 'merge' | 'manual';
      batchSize: number;
      maxConcurrency: number;
    }
  ): Promise<{
    totalRecords: number;
    processedRecords: number;
    failedRecords: number;
    conflicts: number;
    executionTime: number;
    results: Array<{
      platform: string;
      dataType: string;
      recordsProcessed: number;
      errors: string[];
    }>;
  }> {
    try {
      const startTime = Date.now();
      logger.info('Starting batch synchronization', { organizationId, syncOptions });

      const results = [];
      let totalRecords = 0;
      let processedRecords = 0;
      let failedRecords = 0;
      let conflicts = 0;

      for (const platform of syncOptions.platforms) {
        for (const dataType of syncOptions.dataTypes) {
          try {
            const result = await this.synchronizePlatformData(
              organizationId,
              platform,
              dataType,
              syncOptions
            );
            
            results.push(result);
            totalRecords += result.totalRecords;
            processedRecords += result.processedRecords;
            failedRecords += result.failedRecords;
            conflicts += result.conflicts;
          } catch (error: unknown) {
            logger.error('Platform sync failed', { platform, dataType, error });
            results.push({
              platform,
              dataType,
              recordsProcessed: 0,
              totalRecords: 0,
              processedRecords: 0,
              failedRecords: 0,
              conflicts: 0,
              errors: [error instanceof Error ? error.message : 'Unknown error']
            });
          }
        }
      }

      const executionTime = Date.now() - startTime;
      
      logger.info('Batch synchronization completed', {
        organizationId,
        totalRecords,
        processedRecords,
        executionTime
      });

      return {
        totalRecords,
        processedRecords,
        failedRecords,
        conflicts,
        executionTime,
        results
      };
    } catch (error: unknown) {
      logger.error('Batch synchronization failed', { organizationId, error });
      throw error;
    }
  }

  /**
   * Advanced integration monitoring and analytics
   */
  async generateAdvancedAnalytics(
    organizationId: string,
    period: { start: Date; end: Date },
    metrics: string[]
  ): Promise<{
    summary: {
      totalApiCalls: number;
      successRate: number;
      averageResponseTime: number;
      dataVolume: number;
      errorRate: number;
      costAnalysis: {
        totalCost: number;
        costByService: Record<string, number>;
        optimizationSuggestions: string[];
      };
    };
    platformMetrics: Record<string, {
      availability: number;
      performance: number;
      reliability: number;
      usage: number;
    }>;
    trends: Array<{
      date: Date;
      metric: string;
      value: number;
      platform: string;
    }>;
    alerts: Array<{
      type: 'performance' | 'error' | 'cost' | 'security';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      platform: string;
      timestamp: Date;
    }>;
  }> {
    try {
      logger.info('Generating advanced integration analytics', { organizationId, period });

      // Get analytics from all services
      const [
        microsoftAnalytics,
        salesforceAnalytics,
        calendarAnalytics,
        apiAnalytics
      ] = await Promise.all([
        this.microsoft365Service.getIntegrationAnalytics(organizationId, period),
        this.salesforceService.getIntegrationAnalytics(organizationId, period),
        this.calendarService.getAnalytics(organizationId, period),
        this.apiManagementService.getApiAnalytics(organizationId, period)
      ]);

      // Aggregate metrics
      const totalApiCalls = microsoftAnalytics.totalCalls + salesforceAnalytics.totalCalls + 
                           calendarAnalytics.totalCalls + apiAnalytics.totalCalls;
      
      const totalSuccess = microsoftAnalytics.successfulCalls + salesforceAnalytics.successfulCalls +
                          calendarAnalytics.successfulCalls + apiAnalytics.successfulCalls;
      
      const successRate = totalApiCalls > 0 ? (totalSuccess / totalApiCalls) * 100 : 0;
      
      const averageResponseTime = (
        microsoftAnalytics.averageResponseTime + 
        salesforceAnalytics.averageResponseTime +
        calendarAnalytics.averageResponseTime +
        apiAnalytics.averageResponseTime
      ) / 4;

      // Calculate cost analysis
      const costAnalysis = {
        totalCost: microsoftAnalytics.cost + salesforceAnalytics.cost + calendarAnalytics.cost + apiAnalytics.cost,
        costByService: {
          microsoft365: microsoftAnalytics.cost,
          salesforce: salesforceAnalytics.cost,
          calendar: calendarAnalytics.cost,
          api: apiAnalytics.cost
        },
        optimizationSuggestions: this.generateCostOptimizationSuggestions({
          microsoftAnalytics,
          salesforceAnalytics,
          calendarAnalytics,
          apiAnalytics
        })
      };

      // Platform-specific metrics
      const platformMetrics = {
        microsoft365: {
          availability: microsoftAnalytics.availability || 99.5,
          performance: this.calculatePerformanceScore(microsoftAnalytics.averageResponseTime),
          reliability: microsoftAnalytics.successRate || 0,
          usage: microsoftAnalytics.totalCalls || 0
        },
        salesforce: {
          availability: salesforceAnalytics.availability || 99.8,
          performance: this.calculatePerformanceScore(salesforceAnalytics.averageResponseTime),
          reliability: salesforceAnalytics.successRate || 0,
          usage: salesforceAnalytics.totalCalls || 0
        },
        calendar: {
          availability: calendarAnalytics.availability || 99.9,
          performance: this.calculatePerformanceScore(calendarAnalytics.averageResponseTime),
          reliability: calendarAnalytics.successRate || 0,
          usage: calendarAnalytics.totalCalls || 0
        },
        api: {
          availability: apiAnalytics.availability || 99.95,
          performance: this.calculatePerformanceScore(apiAnalytics.averageResponseTime),
          reliability: apiAnalytics.successRate || 0,
          usage: apiAnalytics.totalCalls || 0
        }
      };

      // Generate trends and alerts
      const trends = this.generateTrendAnalysis([
        microsoftAnalytics,
        salesforceAnalytics,
        calendarAnalytics,
        apiAnalytics
      ], period);

      const alerts = this.generatePerformanceAlerts(platformMetrics, {
        successRate,
        averageResponseTime,
        totalCost: costAnalysis.totalCost
      });

      return {
        summary: {
          totalApiCalls,
          successRate,
          averageResponseTime,
          dataVolume: totalApiCalls * 1.2, // Estimate based on call volume
          errorRate: 100 - successRate,
          costAnalysis
        },
        platformMetrics,
        trends,
        alerts
      };
    } catch (error: unknown) {
      logger.error('Advanced analytics generation failed', { organizationId, error });
      throw error;
    }
  }

  /**
   * Cross-platform workflow automation
   */
  async executeWorkflowAutomation(
    organizationId: string,
    workflow: {
      name: string;
      triggers: Array<{
        platform: string;
        event: string;
        conditions: Record<string, any>;
      }>;
      actions: Array<{
        platform: string;
        action: string;
        parameters: Record<string, any>;
        dependencies: string[];
      }>;
      errorHandling: {
        retryPolicy: {
          maxRetries: number;
          backoffStrategy: 'linear' | 'exponential';
          initialDelay: number;
        };
        fallbackActions: Array<{
          platform: string;
          action: string;
          parameters: Record<string, any>;
        }>;
      };
    }
  ): Promise<{
    workflowId: string;
    status: 'success' | 'partial' | 'failed';
    executionTime: number;
    results: Array<{
      actionId: string;
      platform: string;
      status: 'success' | 'failed' | 'skipped';
      result?: any;
      error?: string;
    }>;
  }> {
    try {
      const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();
      
      logger.info('Executing workflow automation', { 
        organizationId, 
        workflowId, 
        workflowName: workflow.name 
      });

      const results = [];
      let overallStatus: 'success' | 'partial' | 'failed' = 'success';

      // Execute actions in dependency order
      const sortedActions = this.sortActionsByDependencies(workflow.actions);
      
      for (const action of sortedActions) {
        try {
          const result = await this.executeWorkflowAction(
            organizationId,
            action,
            workflow.errorHandling.retryPolicy
          );
          
          results.push({
            actionId: action.platform + '-' + action.action,
            platform: action.platform,
            status: 'success',
            result
          });
        } catch (error: unknown) {
          logger.error('Workflow action failed', { 
            workflowId, 
            actionId: action.platform + '-' + action.action, 
            error 
          });
          
          results.push({
            actionId: action.platform + '-' + action.action,
            platform: action.platform,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          overallStatus = results.some(r => r.status === 'success') ? 'partial' : 'failed';

          // Try fallback actions
          for (const fallback of workflow.errorHandling.fallbackActions) {
            try {
              await this.executeWorkflowAction(organizationId, fallback, {
                maxRetries: 1,
                backoffStrategy: 'linear',
                initialDelay: 1000
              });
              
              logger.info('Fallback action succeeded', { workflowId, fallbackAction: fallback.action });
              break; // Stop after first successful fallback
            } catch (fallbackError) {
              logger.warn('Fallback action failed', { workflowId, fallbackAction: fallback.action, fallbackError });
            }
          }
        }
      }

      const executionTime = Date.now() - startTime;

      logger.info('Workflow automation completed', {
        organizationId,
        workflowId,
        status: overallStatus,
        executionTime
      });

      return {
        workflowId,
        status: overallStatus,
        executionTime,
        results
      };
    } catch (error: unknown) {
      logger.error('Workflow automation failed', { organizationId, error });
      throw error;
    }
  }

  /**
   * Real-time integration monitoring and health checks
   */
  async startRealTimeMonitoring(
    organizationId: string,
    config: {
      healthCheckInterval: number; // milliseconds
      alertThresholds: {
        responseTime: number;
        errorRate: number;
        availability: number;
      };
      webhookUrls: string[];
      emailAlerts: string[];
    }
  ): Promise<{
    monitoringId: string;
    status: 'started';
  }> {
    try {
      const monitoringId = `monitor-${Date.now()}-${organizationId}`;
      
      logger.info('Starting real-time integration monitoring', {
        organizationId,
        monitoringId,
        config
      });

      // Set up periodic health checks
      const healthCheckTimer = setInterval(async () => {
        try {
          const health = await this.checkIntegrationsHealth();
          await this.evaluateHealthAlerts(organizationId, health, config, monitoringId);
        } catch (error: unknown) {
          logger.error('Health check failed', { monitoringId, error });
        }
      }, config.healthCheckInterval);

      // Store monitoring session (in a real implementation, this would be persisted)
      this.integrationCache.set(`monitoring-${monitoringId}`, {
        organizationId,
        config,
        timer: healthCheckTimer,
        startTime: new Date()
      });

      return {
        monitoringId,
        status: 'started'
      };
    } catch (error: unknown) {
      logger.error('Failed to start real-time monitoring', { organizationId, error });
      throw error;
    }
  }

  /**
   * Private helper methods for advanced functionality
   */
  private async synchronizePlatformData(
    organizationId: string,
    platform: string,
    dataType: string,
    options: any
  ): Promise<{
    platform: string;
    dataType: string;
    totalRecords: number;
    processedRecords: number;
    failedRecords: number;
    conflicts: number;
    recordsProcessed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalRecords = 0;
    let processedRecords = 0;
    let failedRecords = 0;
    let conflicts = 0;

    try {
      switch (platform) {
        case 'microsoft365':
          const msResult = await this.microsoft365Service.syncData(organizationId, dataType, options);
          totalRecords = msResult.totalRecords;
          processedRecords = msResult.processedRecords;
          failedRecords = msResult.failedRecords;
          conflicts = msResult.conflicts || 0;
          break;
          
        case 'salesforce':
          const sfResult = await this.salesforceService.syncData(organizationId, dataType, options);
          totalRecords = sfResult.totalRecords;
          processedRecords = sfResult.processedRecords;
          failedRecords = sfResult.failedRecords;
          conflicts = sfResult.conflicts || 0;
          break;
          
        case 'calendar':
          const calResult = await this.calendarService.syncCalendarData(organizationId, dataType, options);
          totalRecords = calResult.totalRecords || 0;
          processedRecords = calResult.processedRecords || 0;
          failedRecords = calResult.failedRecords || 0;
          conflicts = calResult.conflicts || 0;
          break;
          
        default:
          errors.push(`Unsupported platform: ${platform}`);
      }
    } catch (error: unknown) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      failedRecords = totalRecords;
      processedRecords = 0;
    }

    return {
      platform,
      dataType,
      totalRecords,
      processedRecords,
      failedRecords,
      conflicts,
      recordsProcessed: processedRecords,
      errors
    };
  }

  private generateCostOptimizationSuggestions(analytics: Record<string, any>): string[] {
    const suggestions: string[] = [];
    
    // Analyze usage patterns and suggest optimizations
    Object.entries(analytics).forEach(([service, data]) => {
      if (data.cost > 1000 && data.successRate < 95) {
        suggestions.push(`Consider optimizing ${service} integration - high cost with low success rate`);
      }
      
      if (data.averageResponseTime > 5000) {
        suggestions.push(`${service} response times are high - consider caching or API optimization`);
      }
      
      if (data.totalCalls < 100 && data.cost > 500) {
        suggestions.push(`${service} has low usage but high cost - review necessity or pricing tier`);
      }
    });
    
    return suggestions;
  }

  private calculatePerformanceScore(responseTime: number): number {
    // Convert response time to performance score (0-100)
    if (responseTime < 500) {return 100;}
    if (responseTime < 1000) {return 90;}
    if (responseTime < 2000) {return 75;}
    if (responseTime < 5000) {return 50;}
    return 25;
  }

  private generateTrendAnalysis(analytics: any[], period: { start: Date; end: Date }): Array<{
    date: Date;
    metric: string;
    value: number;
    platform: string;
  }> {
    const trends: Array<{
      date: Date;
      metric: string;
      value: number;
      platform: string;
    }> = [];
    
    // Generate mock trend data - in a real implementation, this would come from historical data
    const platforms = ['microsoft365', 'salesforce', 'calendar', 'api'];
    const metrics = ['api_calls', 'response_time', 'success_rate', 'cost'];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(period.start.getTime() + (i * 24 * 60 * 60 * 1000));
      
      platforms.forEach(platform => {
        metrics.forEach(metric => {
          trends.push({
            date,
            metric,
            value: Math.random() * 100,
            platform
          });
        });
      });
    }
    
    return trends;
  }

  private generatePerformanceAlerts(
    platformMetrics: Record<string, any>,
    summary: any
  ): Array<{
    type: 'performance' | 'error' | 'cost' | 'security';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    platform: string;
    timestamp: Date;
  }> {
    const alerts: Array<{
      type: 'performance' | 'error' | 'cost' | 'security';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      platform: string;
      timestamp: Date;
    }> = [];
    
    Object.entries(platformMetrics).forEach(([platform, metrics]: [string, any]) => {
      if (metrics.availability < 99) {
        alerts.push({
          type: 'performance',
          severity: metrics.availability < 95 ? 'critical' : 'high',
          message: `${platform} availability is ${metrics.availability}%`,
          platform,
          timestamp: new Date()
        });
      }
      
      if (metrics.reliability < 90) {
        alerts.push({
          type: 'error',
          severity: 'high',
          message: `${platform} reliability is below 90%`,
          platform,
          timestamp: new Date()
        });
      }
      
      if (metrics.performance < 50) {
        alerts.push({
          type: 'performance',
          severity: 'medium',
          message: `${platform} performance score is low`,
          platform,
          timestamp: new Date()
        });
      }
    });
    
    if (summary.totalCost > 10000) {
      alerts.push({
        type: 'cost',
        severity: 'medium',
        message: 'Integration costs exceed $10,000',
        platform: 'all',
        timestamp: new Date()
      });
    }
    
    return alerts;
  }

  private sortActionsByDependencies(actions: Array<{
    platform: string;
    action: string;
    parameters: Record<string, any>;
    dependencies: string[];
  }>): Array<{
    platform: string;
    action: string;
    parameters: Record<string, any>;
    dependencies: string[];
  }> {
    // Simple topological sort for dependencies
    const sorted: typeof actions = [];
    const remaining = [...actions];
    
    while (remaining.length > 0) {
      const independent = remaining.filter(action => 
        action.dependencies.every(dep => 
          sorted.some(s => s.platform + '-' + s.action === dep)
        )
      );
      
      if (independent.length === 0) {
        // Circular dependency or missing dependency - add remaining actions anyway
        sorted.push(...remaining);
        break;
      }
      
      sorted.push(...independent);
      independent.forEach(action => {
        const index = remaining.indexOf(action);
        remaining.splice(index, 1);
      });
    }
    
    return sorted;
  }

  private async executeWorkflowAction(
    organizationId: string,
    action: {
      platform: string;
      action: string;
      parameters: Record<string, any>;
    },
    retryPolicy: {
      maxRetries: number;
      backoffStrategy: 'linear' | 'exponential';
      initialDelay: number;
    }
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Calculate delay based on backoff strategy
          const delay = retryPolicy.backoffStrategy === 'exponential' 
            ? retryPolicy.initialDelay * Math.pow(2, attempt - 1)
            : retryPolicy.initialDelay * attempt;
            
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        switch (action.platform) {
          case 'microsoft365':
            return await this.microsoft365Service.executeAction(action.action, action.parameters, organizationId);
          case 'salesforce':
            return await this.salesforceService.executeAction(action.action, action.parameters, organizationId);
          case 'calendar':
            return await this.calendarService.executeAction(action.action, action.parameters, organizationId);
          case 'api':
            return await this.apiManagementService.executeAction(action.action, action.parameters, organizationId);
          default:
            throw new Error(`Unsupported platform: ${action.platform}`);
        }
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Workflow action attempt ${attempt + 1} failed`, {
          platform: action.platform,
          action: action.action,
          error: lastError.message
        });
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  private async evaluateHealthAlerts(
    organizationId: string,
    health: any,
    config: any,
    monitoringId: string
  ): Promise<void> {
    const alerts = [];
    
    health.services.forEach((service: any) => {
      if (service.responseTime > config.alertThresholds.responseTime) {
        alerts.push(`${service.name}: Response time ${service.responseTime}ms exceeds threshold`);
      }
      
      if (service.errorRate > config.alertThresholds.errorRate) {
        alerts.push(`${service.name}: Error rate ${service.errorRate}% exceeds threshold`);
      }
      
      if (service.availability < config.alertThresholds.availability) {
        alerts.push(`${service.name}: Availability ${service.availability}% below threshold`);
      }
    });
    
    if (alerts.length > 0) {
      logger.warn('Integration health alerts triggered', {
        organizationId,
        monitoringId,
        alerts
      });
      
      // In a real implementation, send webhooks and emails
      await this.sendHealthAlerts(organizationId, alerts, config);
    }
  }

  private async sendHealthAlerts(
    organizationId: string,
    alerts: string[],
    config: any
  ): Promise<void> {
    // Mock implementation - would send actual webhooks and emails
    logger.info('Health alerts would be sent', {
      organizationId,
      alertCount: alerts.length,
      webhooks: config.webhookUrls?.length || 0,
      emails: config.emailAlerts?.length || 0
    });
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