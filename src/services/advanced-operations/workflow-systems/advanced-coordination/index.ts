/**
 * Advanced Operations Manager - Enterprise Domain Orchestrator
 * 
 * Main orchestrator for the Advanced Operations domain, coordinating
 * workflow engines, reporting services, enterprise service bus, 
 * data warehouse operations, and portfolio management across the enterprise.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../../config/logger';
import { WorkflowService } from './WorkflowService';
import { ReportingService } from './ReportingService';
import { EnterpriseServiceBusService } from './EnterpriseServiceBusService';
import { DataWarehouseService } from './DataWarehouseService';
import { PortfolioService } from './PortfolioService';
import {
  AdvancedOperationsContext,
  AdvancedOperationsEvent,
  AdvancedOperationsDashboard,
  HealthCheckResult,
  ServiceMetrics,
} from './types';
import {
  ADVANCED_OPERATIONS_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CACHE_KEYS,
  EVENT_TYPES,
} from './constants';

export interface AdvancedOperationsServices {
  workflowService: WorkflowService;
  reportingService: ReportingService;
  enterpriseServiceBusService: EnterpriseServiceBusService;
  dataWarehouseService: DataWarehouseService;
  portfolioService: PortfolioService;
}

export class AdvancedOperationsManager extends EventEmitter {
  private context: AdvancedOperationsContext;
  private services: AdvancedOperationsServices;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCache: Map<string, any> = new Map();

  constructor(context?: AdvancedOperationsContext) {
    super();
    
    // Use provided context or create default
    this.context = context || {
      organizationId: 'default-org',
      userId: 'system-user',
      permissions: ['*'],
    };

    // Initialize services
    this.services = {
      workflowService: new WorkflowService(this.context),
      reportingService: new ReportingService(this.context),
      enterpriseServiceBusService: new EnterpriseServiceBusService(this.context),
      dataWarehouseService: new DataWarehouseService(this.context),
      portfolioService: new PortfolioService(this.context),
    };

    this.setupEventHandlers();
    this.startHealthChecks();
    
    logger.info('Advanced Operations Manager initialized', {
      organizationId: this.context.organizationId,
      userId: this.context.userId,
      services: Object.keys(this.services).length,
    });
  }

  /**
   * Get access to all sub-services
   */
  getServices(): AdvancedOperationsServices {
    return this.services;
  }

  /**
   * Create and start a workflow from template
   */
  async startWorkflowFromTemplate(
    templateName: string,
    data: Record<string, any>,
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL'
  ): Promise<string> {
    try {
      // First, find or create workflow definition for template
      const workflowDef = await this.createWorkflowFromTemplate(templateName, data);
      
      // Start the workflow instance
      const instanceId = await this.services.workflowService.startWorkflow(
        workflowDef.id,
        data,
        priority
      );

      logger.info('Workflow started from template', {
        templateName,
        workflowDefinitionId: workflowDef.id,
        instanceId,
        priority,
      });

      return instanceId;
    } catch (error) {
      logger.error('Failed to start workflow from template', error);
      throw error;
    }
  }

  /**
   * Generate and deliver automated report
   */
  async generateAndDeliverReport(
    templateId: string,
    parameters: Record<string, any>,
    deliveryOptions: {
      format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
      recipients: string[];
      deliveryMethod: 'EMAIL' | 'SFTP' | 'API' | 'WEBHOOK';
    }
  ): Promise<string> {
    try {
      // Generate the report
      const reportResult = await this.services.reportingService.generateReport(
        templateId,
        parameters,
        deliveryOptions.format
      );

      // Trigger delivery through ESB
      if (deliveryOptions.recipients.length > 0) {
        await this.services.enterpriseServiceBusService.sendMessage({
          source: 'reporting-service',
          destination: 'delivery-service',
          messageType: 'REPORT_DELIVERY',
          priority: ADVANCED_OPERATIONS_CONFIG.ESB.MESSAGE_PRIORITIES.NORMAL,
          payload: {
            reportId: reportResult.reportId,
            recipients: deliveryOptions.recipients,
            deliveryMethod: deliveryOptions.deliveryMethod,
            downloadUrl: reportResult.downloadUrl,
          },
          headers: {
            organizationId: this.context.organizationId,
            userId: this.context.userId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.info('Report generated and delivery initiated', {
        reportId: reportResult.reportId,
        templateId,
        format: deliveryOptions.format,
        recipients: deliveryOptions.recipients.length,
      });

      return reportResult.reportId;
    } catch (error) {
      logger.error('Failed to generate and deliver report', error);
      throw error;
    }
  }

  /**
   * Execute data synchronization workflow
   */
  async executeDataSync(syncOptions?: {
    includeQualityChecks?: boolean;
    notifyOnCompletion?: boolean;
    generateReport?: boolean;
  }): Promise<{
    syncId: string;
    jobsExecuted: number;
    successfulJobs: number;
    qualityScore?: number;
    reportId?: string;
  }> {
    try {
      const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const options = {
        includeQualityChecks: true,
        notifyOnCompletion: true,
        generateReport: false,
        ...syncOptions,
      };

      logger.info('Data synchronization started', { syncId, options });

      // Execute warehouse synchronization
      const syncResult = await this.services.dataWarehouseService.synchronizeWarehouse();

      // Run quality checks if requested
      let qualityScore: number | undefined;
      if (options.includeQualityChecks) {
        const qualityResult = await this.services.dataWarehouseService.runQualityChecks();
        qualityScore = qualityResult.qualityScore;
      }

      // Generate report if requested
      let reportId: string | undefined;
      if (options.generateReport) {
        // Create data sync report template if it doesn't exist
        reportId = await this.generateSyncReport(syncId, syncResult, qualityScore);
      }

      // Send notification if requested
      if (options.notifyOnCompletion) {
        await this.sendSyncCompletionNotification(syncId, syncResult, qualityScore);
      }

      logger.info('Data synchronization completed', {
        syncId,
        jobsExecuted: syncResult.jobsExecuted,
        successfulJobs: syncResult.successfulJobs,
        qualityScore,
        reportId,
      });

      this.emit('SYNC_COMPLETED', {
        syncId,
        syncResult,
        qualityScore,
        reportId,
        timestamp: new Date(),
      });

      return {
        syncId,
        jobsExecuted: syncResult.jobsExecuted,
        successfulJobs: syncResult.successfulJobs,
        qualityScore,
        reportId,
      };
    } catch (error) {
      logger.error('Failed to execute data synchronization', error);
      throw error;
    }
  }

  /**
   * Analyze portfolio performance with automated recommendations
   */
  async analyzePortfolioWithActions(portfolioId: string): Promise<{
    analysis: any;
    workflowsStarted: string[];
    reportsGenerated: string[];
    alertsSent: number;
  }> {
    try {
      // Perform portfolio analysis
      const analysis = await this.services.portfolioService.analyzePortfolio(portfolioId);
      const workflowsStarted: string[] = [];
      const reportsGenerated: string[] = [];
      let alertsSent = 0;

      // Process optimization recommendations
      for (const recommendation of analysis.optimization.recommendations) {
        if (recommendation.confidence > 0.7 && recommendation.risk !== 'HIGH') {
          // Start approval workflow for high-confidence, low-risk recommendations
          const workflowId = await this.startWorkflowFromTemplate(
            'portfolio-recommendation-approval',
            {
              portfolioId,
              recommendation,
              requestedBy: this.context.userId,
            }
          );
          workflowsStarted.push(workflowId);
        }
      }

      // Generate detailed analysis report
      const reportId = await this.services.reportingService.generateReport(
        'portfolio-analysis-detailed',
        {
          portfolioId,
          analysis,
          generatedAt: new Date(),
        },
        'PDF'
      );
      reportsGenerated.push(reportId);

      // Send alerts for critical issues
      const criticalIssues = analysis.optimization.recommendations.filter(
        r => r.risk === 'HIGH' || r.expectedReturn < 0
      );

      if (criticalIssues.length > 0) {
        await this.services.enterpriseServiceBusService.sendMessage({
          source: 'portfolio-service',
          destination: 'notification-service',
          messageType: 'PORTFOLIO_ALERT',
          priority: ADVANCED_OPERATIONS_CONFIG.ESB.MESSAGE_PRIORITIES.HIGH,
          payload: {
            portfolioId,
            alertType: 'CRITICAL_ISSUES',
            issues: criticalIssues,
            analysisId: reportId,
          },
          headers: {
            organizationId: this.context.organizationId,
            alertLevel: 'HIGH',
            timestamp: new Date().toISOString(),
          },
        });
        alertsSent++;
      }

      logger.info('Portfolio analysis with actions completed', {
        portfolioId,
        workflowsStarted: workflowsStarted.length,
        reportsGenerated: reportsGenerated.length,
        alertsSent,
        recommendations: analysis.optimization.recommendations.length,
      });

      return {
        analysis,
        workflowsStarted,
        reportsGenerated,
        alertsSent,
      };
    } catch (error) {
      logger.error('Failed to analyze portfolio with actions', error);
      throw error;
    }
  }

  /**
   * Get comprehensive advanced operations dashboard
   */
  async getAdvancedOperationsDashboard(): Promise<AdvancedOperationsDashboard> {
    try {
      // Get metrics from all services
      const [workflowMetrics, reportingMetrics, esbMetrics, warehouseMetrics, portfolioMetrics] = 
        await Promise.all([
          this.services.workflowService.getWorkflowMetrics(),
          this.getReportingMetrics(),
          this.services.enterpriseServiceBusService.getESBMetrics(),
          this.services.dataWarehouseService.getWarehouseMetrics(),
          this.services.portfolioService.getPortfolioDashboard(),
        ]);

      const dashboard: AdvancedOperationsDashboard = {
        workflows: workflowMetrics,
        reporting: {
          scheduledReports: reportingMetrics.scheduledReports || 0,
          generatedToday: reportingMetrics.generatedToday || 0,
          failureRate: reportingMetrics.failureRate || 0,
          averageGenerationTime: reportingMetrics.averageGenerationTime || 0,
          storageUsed: reportingMetrics.storageUsed || 0,
        },
        esb: esbMetrics,
        warehouse: warehouseMetrics,
        portfolio: portfolioMetrics,
      };

      // Cache dashboard for 5 minutes
      this.metricsCache.set('dashboard', dashboard);
      this.metricsCache.set('dashboard_timestamp', Date.now());

      return dashboard;
    } catch (error) {
      logger.error('Failed to get advanced operations dashboard', error);
      throw error;
    }
  }

  /**
   * Perform health checks on all services
   */
  async performHealthCheck(): Promise<{
    overall: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    services: HealthCheckResult[];
    summary: {
      healthy: number;
      warning: number;
      critical: number;
    };
  }> {
    try {
      const healthChecks: HealthCheckResult[] = [];
      
      // Check each service
      const serviceChecks = await Promise.allSettled([
        this.checkWorkflowServiceHealth(),
        this.checkReportingServiceHealth(),
        this.checkESBServiceHealth(),
        this.checkWarehouseServiceHealth(),
        this.checkPortfolioServiceHealth(),
      ]);

      serviceChecks.forEach((check, index) => {
        if (check.status === 'fulfilled') {
          healthChecks.push(check.value);
        } else {
          healthChecks.push({
            service: ['workflow', 'reporting', 'esb', 'warehouse', 'portfolio'][index],
            status: 'CRITICAL',
            message: 'Health check failed',
            lastChecked: new Date(),
          });
        }
      });

      // Calculate summary
      const summary = healthChecks.reduce((acc, check) => {
        switch (check.status) {
          case 'HEALTHY':
            acc.healthy++;
            break;
          case 'WARNING':
            acc.warning++;
            break;
          case 'CRITICAL':
            acc.critical++;
            break;
        }
        return acc;
      }, { healthy: 0, warning: 0, critical: 0 });

      // Determine overall status
      let overall: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
      if (summary.critical > 0) {
        overall = 'CRITICAL';
      } else if (summary.warning > 0) {
        overall = 'WARNING';
      }

      logger.info('Advanced operations health check completed', {
        overall,
        summary,
        servicesChecked: healthChecks.length,
      });

      return {
        overall,
        services: healthChecks,
        summary,
      };
    } catch (error) {
      logger.error('Failed to perform health check', error);
      throw error;
    }
  }

  /**
   * Cross-service workflow coordination
   */
  async coordinateWorkflow(coordinationPlan: {
    name: string;
    steps: Array<{
      service: keyof AdvancedOperationsServices;
      action: string;
      parameters: any;
      dependencies?: string[];
    }>;
  }): Promise<{
    coordinationId: string;
    completedSteps: string[];
    failedSteps: string[];
    results: Record<string, any>;
  }> {
    try {
      const coordinationId = `coord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const completedSteps: string[] = [];
      const failedSteps: string[] = [];
      const results: Record<string, any> = {};

      logger.info('Cross-service workflow coordination started', {
        coordinationId,
        planName: coordinationPlan.name,
        stepsCount: coordinationPlan.steps.length,
      });

      // Execute steps in dependency order
      const sortedSteps = this.sortStepsByDependencies(coordinationPlan.steps);

      for (const step of sortedSteps) {
        const stepId = `${step.service}-${step.action}`;
        
        try {
          // Check dependencies
          if (step.dependencies) {
            const unmetDependencies = step.dependencies.filter(dep => !completedSteps.includes(dep));
            if (unmetDependencies.length > 0) {
              throw new Error(`Unmet dependencies: ${unmetDependencies.join(', ')}`);
            }
          }

          // Execute step
          const result = await this.executeCoordinationStep(step);
          results[stepId] = result;
          completedSteps.push(stepId);

          logger.info('Coordination step completed', { coordinationId, stepId });
        } catch (error) {
          logger.error('Coordination step failed', { coordinationId, stepId, error });
          failedSteps.push(stepId);
          results[stepId] = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }

      logger.info('Cross-service workflow coordination completed', {
        coordinationId,
        completedSteps: completedSteps.length,
        failedSteps: failedSteps.length,
      });

      return {
        coordinationId,
        completedSteps,
        failedSteps,
        results,
      };
    } catch (error) {
      logger.error('Failed to coordinate workflow', error);
      throw error;
    }
  }

  // Private methods

  private setupEventHandlers(): void {
    // Workflow service events
    this.services.workflowService.on(EVENT_TYPES.WORKFLOW_COMPLETED, (event) => {
      this.handleWorkflowCompleted(event);
    });

    this.services.workflowService.on(EVENT_TYPES.WORKFLOW_FAILED, (event) => {
      this.handleWorkflowFailed(event);
    });

    // Reporting service events
    this.services.reportingService.on(EVENT_TYPES.REPORT_GENERATED, (event) => {
      this.handleReportGenerated(event);
    });

    // ESB events
    this.services.enterpriseServiceBusService.on(EVENT_TYPES.MESSAGE_FAILED, (event) => {
      this.handleESBMessageFailed(event);
    });

    // Data warehouse events
    this.services.dataWarehouseService.on(EVENT_TYPES.ETL_FAILED, (event) => {
      this.handleETLFailed(event);
    });

    // Portfolio events
    this.services.portfolioService.on(EVENT_TYPES.PORTFOLIO_UPDATED, (event) => {
      this.handlePortfolioUpdated(event);
    });
  }

  private startHealthChecks(): void {
    // Perform health checks every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Scheduled health check failed', error);
      }
    }, ADVANCED_OPERATIONS_CONFIG.HEALTH_CHECK.INTERVAL);
  }

  private async createWorkflowFromTemplate(
    templateName: string, 
    data: Record<string, any>
  ): Promise<{ id: string }> {
    // Simplified workflow template creation - in real implementation would have template repository
    const templates: Record<string, any> = {
      'portfolio-recommendation-approval': {
        name: 'Portfolio Recommendation Approval',
        description: 'Approval workflow for portfolio optimization recommendations',
        version: '1.0.0',
        startStep: 'review',
        steps: [
          {
            id: 'review',
            name: 'Review Recommendation',
            type: 'TASK',
            configuration: {},
            transitions: [{ id: 'approve', targetStepId: 'approved' }],
            assignments: [{ type: 'ROLE', value: 'portfolio-manager' }],
          },
          {
            id: 'approved',
            name: 'Approved',
            type: 'END',
            configuration: {},
            transitions: [],
          },
        ],
      },
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Workflow template '${templateName}' not found`);
    }

    const definitionId = await this.services.workflowService.createWorkflowDefinition(template);
    return { id: definitionId };
  }

  private async generateSyncReport(
    syncId: string, 
    syncResult: any, 
    qualityScore?: number
  ): Promise<string> {
    return await this.services.reportingService.generateReport(
      'data-sync-summary',
      {
        syncId,
        syncResult,
        qualityScore,
        generatedAt: new Date(),
      },
      'PDF'
    ).then(result => result.reportId);
  }

  private async sendSyncCompletionNotification(
    syncId: string, 
    syncResult: any, 
    qualityScore?: number
  ): Promise<void> {
    await this.services.enterpriseServiceBusService.sendMessage({
      source: 'advanced-operations-manager',
      destination: 'notification-service',
      messageType: 'SYNC_COMPLETION',
      priority: ADVANCED_OPERATIONS_CONFIG.ESB.MESSAGE_PRIORITIES.NORMAL,
      payload: {
        syncId,
        result: syncResult,
        qualityScore,
        organizationId: this.context.organizationId,
      },
      headers: {
        timestamp: new Date().toISOString(),
        notificationType: 'SYNC_COMPLETION',
      },
    });
  }

  private async getReportingMetrics(): Promise<any> {
    // Get reporting analytics from the reporting service
    const analytics = await this.services.reportingService.getReportAnalytics();
    
    return {
      scheduledReports: 15, // Placeholder
      generatedToday: analytics.totalGenerated,
      failureRate: 1 - (analytics.generationSuccess / Math.max(1, analytics.totalGenerated)),
      averageGenerationTime: analytics.averageGenerationTime,
      storageUsed: Math.floor(Math.random() * 1000000000), // Placeholder
    };
  }

  // Health check methods
  
  private async checkWorkflowServiceHealth(): Promise<HealthCheckResult> {
    try {
      const metrics = await this.services.workflowService.getWorkflowMetrics();
      const status = metrics.slaCompliance > 0.9 ? 'HEALTHY' : 
                    metrics.slaCompliance > 0.8 ? 'WARNING' : 'CRITICAL';

      return {
        service: 'workflow',
        status,
        message: `SLA compliance: ${(metrics.slaCompliance * 100).toFixed(1)}%`,
        metrics: {
          activeWorkflows: metrics.active,
          slaCompliance: metrics.slaCompliance,
        },
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        service: 'workflow',
        status: 'CRITICAL',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  private async checkReportingServiceHealth(): Promise<HealthCheckResult> {
    try {
      const analytics = await this.services.reportingService.getReportAnalytics();
      const successRate = analytics.generationSuccess / Math.max(1, analytics.totalGenerated);
      const status = successRate > 0.95 ? 'HEALTHY' : 
                    successRate > 0.9 ? 'WARNING' : 'CRITICAL';

      return {
        service: 'reporting',
        status,
        message: `Success rate: ${(successRate * 100).toFixed(1)}%`,
        metrics: {
          successRate,
          averageGenerationTime: analytics.averageGenerationTime,
        },
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        service: 'reporting',
        status: 'CRITICAL',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  private async checkESBServiceHealth(): Promise<HealthCheckResult> {
    try {
      const metrics = await this.services.enterpriseServiceBusService.getESBMetrics();
      const status = metrics.errorRate < 0.05 ? 'HEALTHY' : 
                    metrics.errorRate < 0.1 ? 'WARNING' : 'CRITICAL';

      return {
        service: 'esb',
        status,
        message: `Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        metrics: {
          errorRate: metrics.errorRate,
          throughput: metrics.throughput,
          latency: metrics.latency,
        },
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        service: 'esb',
        status: 'CRITICAL',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  private async checkWarehouseServiceHealth(): Promise<HealthCheckResult> {
    try {
      const metrics = await this.services.dataWarehouseService.getWarehouseMetrics();
      const status = metrics.syncStatus === 'CURRENT' && metrics.qualityScore > 0.95 ? 'HEALTHY' :
                    metrics.syncStatus === 'RECENT' && metrics.qualityScore > 0.9 ? 'WARNING' : 'CRITICAL';

      return {
        service: 'warehouse',
        status,
        message: `Sync: ${metrics.syncStatus}, Quality: ${(metrics.qualityScore * 100).toFixed(1)}%`,
        metrics: {
          syncStatus: metrics.syncStatus,
          qualityScore: metrics.qualityScore,
          activeJobs: metrics.activeJobs,
        },
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        service: 'warehouse',
        status: 'CRITICAL',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  private async checkPortfolioServiceHealth(): Promise<HealthCheckResult> {
    try {
      const metrics = await this.services.portfolioService.getPortfolioDashboard();
      const status = metrics.performanceScore > 80 ? 'HEALTHY' :
                    metrics.performanceScore > 60 ? 'WARNING' : 'CRITICAL';

      return {
        service: 'portfolio',
        status,
        message: `Performance score: ${metrics.performanceScore.toFixed(1)}`,
        metrics: {
          performanceScore: metrics.performanceScore,
          totalValue: metrics.totalValue,
          propertiesCount: metrics.propertiesCount,
        },
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        service: 'portfolio',
        status: 'CRITICAL',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  // Event handlers

  private handleWorkflowCompleted(event: any): void {
    logger.info('Workflow completed event received', event);
    // Could trigger follow-up actions, notifications, etc.
  }

  private handleWorkflowFailed(event: any): void {
    logger.warn('Workflow failed event received', event);
    // Could trigger error handling, escalation, etc.
  }

  private handleReportGenerated(event: any): void {
    logger.info('Report generated event received', event);
    // Could trigger delivery, archival, etc.
  }

  private handleESBMessageFailed(event: any): void {
    logger.warn('ESB message failed event received', event);
    // Could trigger retry logic, dead letter queue processing, etc.
  }

  private handleETLFailed(event: any): void {
    logger.warn('ETL failed event received', event);
    // Could trigger data quality alerts, retry logic, etc.
  }

  private handlePortfolioUpdated(event: any): void {
    logger.info('Portfolio updated event received', event);
    // Could trigger analysis refresh, reporting, etc.
  }

  // Coordination methods

  private sortStepsByDependencies(steps: any[]): any[] {
    const sorted: any[] = [];
    const remaining = [...steps];
    
    while (remaining.length > 0) {
      const independent = remaining.filter(step => 
        !step.dependencies || 
        step.dependencies.every((dep: string) => 
          sorted.some(s => `${s.service}-${s.action}` === dep)
        )
      );
      
      if (independent.length === 0) {
        // Circular dependency - add remaining steps anyway
        sorted.push(...remaining);
        break;
      }
      
      sorted.push(...independent);
      independent.forEach(step => {
        const index = remaining.indexOf(step);
        if (index !== -1) {
          remaining.splice(index, 1);
        }
      });
    }
    
    return sorted;
  }

  private async executeCoordinationStep(step: any): Promise<any> {
    const service = this.services[step.service];
    
    if (!service) {
      throw new Error(`Service '${step.service}' not found`);
    }

    // Execute the action on the service
    switch (step.action) {
      case 'generateReport':
        return await (service as ReportingService).generateReport(
          step.parameters.templateId,
          step.parameters.parameters,
          step.parameters.format
        );
      
      case 'startWorkflow':
        return await (service as WorkflowService).startWorkflow(
          step.parameters.definitionId,
          step.parameters.data,
          step.parameters.priority
        );
      
      case 'sendMessage':
        return await (service as EnterpriseServiceBusService).sendMessage(step.parameters);
      
      case 'executeETL':
        return await (service as DataWarehouseService).executeETLJob(
          step.parameters.jobId,
          step.parameters.forceRun
        );
      
      case 'analyzePortfolio':
        return await (service as PortfolioService).analyzePortfolio(step.parameters.portfolioId);
      
      default:
        throw new Error(`Action '${step.action}' not supported for service '${step.service}'`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Remove all event listeners
    this.removeAllListeners();
    
    // Remove listeners from services
    Object.values(this.services).forEach(service => {
      if (service.removeAllListeners) {
        service.removeAllListeners();
      }
    });

    logger.info('Advanced Operations Manager destroyed');
  }
}