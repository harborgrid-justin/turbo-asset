/**
 * Workflow Engine Service - Main orchestrator for workflow management
 * 
 * Coordinates between all workflow sub-services and manages workflow lifecycle
 * Part of the Workflow Management domain within Turbo Asset IWMS
 */

import { WorkflowDefinitionService } from './WorkflowDefinitionService';
import { WorkflowInstanceService } from './WorkflowInstanceService';
import { WorkflowApprovalService } from './WorkflowApprovalService';
import { WorkflowStepProcessor } from './WorkflowStepProcessor';
import { WorkflowDefinition, WorkflowInstanceData, ApprovalData, WorkflowMetrics } from './types/WorkflowTypes';
import { logger } from '../../../../../src/config/logger';
import cron from 'node-cron';

export class WorkflowEngineService {
  private definitionService: WorkflowDefinitionService;
  private instanceService: WorkflowInstanceService;
  private approvalService: WorkflowApprovalService;
  private stepProcessorService: WorkflowStepProcessor;

  constructor() {
    this.definitionService = new WorkflowDefinitionService();
    this.instanceService = new WorkflowInstanceService();
    this.approvalService = new WorkflowApprovalService();
    this.stepProcessorService = new WorkflowStepProcessor();

    this.setupEventHandlers();
    this.initializeScheduler();
  }

  // Expose service getters for direct access when needed
  get definitions() { return this.definitionService; }
  get instances() { return this.instanceService; }
  get approvals() { return this.approvalService; }
  get stepProcessor() { return this.stepProcessorService; }

  /**
   * Create a new workflow definition
   */
  async createWorkflowDefinition(
    organizationId: string,
    workflow: Omit<WorkflowDefinition, 'id'>
  ): Promise<string> {
    return await this.definitionService.createWorkflowDefinition(organizationId, workflow);
  }

  /**
   * Start a new workflow instance
   */
  async startWorkflow(
    definitionId: string,
    initiatedById: string,
    data: Record<string, any>,
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL'
  ): Promise<string> {
    const instanceId = await this.instanceService.startWorkflow(
      definitionId,
      initiatedById,
      data,
      priority
    );

    // Process the first step
    const definition = await this.definitionService.getWorkflowDefinition(definitionId);
    if (definition) {
      await this.stepProcessorService.processStep(instanceId, definition.startStep);
    }

    return instanceId;
  }

  /**
   * Process approval decision
   */
  async processApproval(
    approvalId: string,
    approverId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string
  ): Promise<void> {
    const result = await this.approvalService.processApproval(
      approvalId,
      approverId,
      decision,
      comments
    );

    // If all approvals are complete, move to next step
    if (result.allApprovalsComplete) {
      await this.moveToNextStep(result.workflowInstanceId);
    }
  }

  /**
   * Get workflow instance
   */
  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstanceData | null> {
    return await this.instanceService.getWorkflowInstance(instanceId);
  }

  /**
   * Cancel workflow instance
   */
  async cancelWorkflow(instanceId: string, reason?: string): Promise<void> {
    await this.instanceService.cancelWorkflow(instanceId, reason);
  }

  /**
   * Get pending approvals for user
   */
  async getApprovalsPendingForUser(
    userId: string,
    options?: { page?: number; limit?: number; priority?: string[] }
  ): Promise<{ approvals: ApprovalData[]; total: number }> {
    return await this.approvalService.getApprovalsPendingForUser(userId, options);
  }

  /**
   * List workflow instances with filters
   */
  async listWorkflowInstances(
    organizationId: string,
    filters?: {
      status?: WorkflowInstanceData['status'][];
      priority?: WorkflowInstanceData['priority'][];
      definitionId?: string;
      initiatedById?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ instances: WorkflowInstanceData[]; total: number }> {
    return await this.instanceService.listWorkflowInstances(organizationId, filters);
  }

  /**
   * Get workflow metrics for an organization
   */
  async getWorkflowMetrics(organizationId: string): Promise<WorkflowMetrics> {
    // This would be implemented with proper aggregation queries
    return {
      totalWorkflows: 0,
      completedWorkflows: 0,
      pendingWorkflows: 0,
      overduWorkflows: 0,
      averageCompletionTime: 0,
      approvalRate: 0
    };
  }

  /**
   * Move workflow to next step
   */
  private async moveToNextStep(instanceId: string): Promise<void> {
    try {
      const instance = await this.instanceService.getWorkflowInstance(instanceId);
      if (!instance || !instance.currentStepId) {
        return;
      }

      const definition = await this.definitionService.getWorkflowDefinition(instance.definitionId);
      if (!definition) {
        throw new Error('Workflow definition not found');
      }

      const currentStep = definition.steps.find(s => s.id === instance.currentStepId);
      if (!currentStep || !currentStep.nextSteps || currentStep.nextSteps.length === 0) {
        // No next steps - complete the workflow
        await this.instanceService.updateWorkflowStatus(instanceId, 'COMPLETED');
        logger.info('Workflow completed', { instanceId });
        return;
      }

      // For simplicity, take the first next step
      // In a full implementation, this would handle conditional routing
      const nextStepId = currentStep.nextSteps[0];
      
      await this.instanceService.updateWorkflowStatus(instanceId, 'IN_PROGRESS', nextStepId);
      await this.stepProcessorService.processStep(instanceId, nextStepId);

    } catch (error) {
      logger.error('Failed to move to next step', { error, instanceId });
      throw error;
    }
  }

  /**
   * Setup event handlers for step processor
   */
  private setupEventHandlers(): void {
    this.stepProcessorService.on('step.auto_complete', async ({ instanceId }) => {
      await this.moveToNextStep(instanceId);
    });

    this.stepProcessorService.on('approval.requested', (notificationData) => {
      // In a full implementation, this would send actual notifications
      logger.info('Approval requested notification', notificationData);
    });

    this.stepProcessorService.on('notification.send', (notificationData) => {
      // In a full implementation, this would send actual notifications
      logger.info('Workflow notification', notificationData);
    });

    this.stepProcessorService.on('condition.evaluated', async ({ instanceId, result }) => {
      if (result) {
        await this.moveToNextStep(instanceId);
      } else {
        // Handle false condition - might need different routing or completion
        logger.info('Condition evaluated to false', { instanceId });
      }
    });
  }

  /**
   * Initialize scheduled tasks
   */
  private initializeScheduler(): void {
    // Check for overdue workflows every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.checkOverdueWorkflows();
      } catch (error) {
        logger.error('Failed to check overdue workflows', error);
      }
    });

    logger.info('Workflow scheduler initialized');
  }

  /**
   * Check for overdue workflows and send notifications
   */
  private async checkOverdueWorkflows(): Promise<void> {
    // This would be implemented with proper queries
    logger.info('Checking overdue workflows...');
  }
}