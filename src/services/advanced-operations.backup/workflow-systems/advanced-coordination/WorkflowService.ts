/**
 * Workflow Service - Advanced Domain Sub-Service
 * 
 * Comprehensive workflow engine providing workflow definition management,
 * instance execution, approval workflows, escalation handling, and automation.
 * Refactored from flat WorkflowEngine.ts into domain architecture.
 */

import { EventEmitter } from 'events';
import { logger } from '@/../../../config/logger';
import { prisma } from '@/../../../config/database';
import cron from 'node-cron';
import {
  AdvancedOperationsContext,
  WorkflowDefinition,
  WorkflowInstanceData,
  WorkflowStep,
  ApprovalData,
  EscalationRule,
  WorkflowTransition,
  WorkflowAssignment,
} from './types';
import {
  ADVANCED_OPERATIONS_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CACHE_KEYS,
  EVENT_TYPES,
} from './constants';

export class WorkflowService extends EventEmitter {
  private context: AdvancedOperationsContext;
  private schedulerInitialized: boolean = false;

  constructor(context: AdvancedOperationsContext) {
    super();
    this.context = context;
    this.initializeScheduler();
  }

  /**
   * Create a new workflow definition
   */
  async createWorkflowDefinition(
    workflow: Omit<WorkflowDefinition, 'id'>
  ): Promise<string> {
    try {
      this.validateWorkflowDefinition(workflow);

      const result = await prisma.workflowDefinition.create({
        data: {
          name: workflow.name,
          description: workflow.description,
          version: workflow.version,
          definition: workflow as any,
          organizationId: this.context.organizationId,
          createdBy: this.context.userId,
        },
      });

      logger.info('Workflow definition created', { 
        id: result.id, 
        name: workflow.name,
        organizationId: this.context.organizationId 
      });

      this.emit(EVENT_TYPES.WORKFLOW_STARTED, {
        type: 'WORKFLOW_DEFINITION_CREATED',
        definitionId: result.id,
        organizationId: this.context.organizationId,
        userId: this.context.userId,
        timestamp: new Date(),
      });

      return result.id;
    } catch (error: unknown) {
      logger.error('Failed to create workflow definition', error);
      throw error;
    }
  }

  /**
   * Get workflow definition
   */
  async getWorkflowDefinition(definitionId: string): Promise<WorkflowDefinition | null> {
    try {
      const definition = await prisma.workflowDefinition.findUnique({
        where: { 
          id: definitionId,
          organizationId: this.context.organizationId 
        }
      });

      if (!definition) {
        return null;
      }

      return definition.definition as WorkflowDefinition;
    } catch (error: unknown) {
      logger.error('Failed to get workflow definition', error);
      throw error;
    }
  }

  /**
   * Start a new workflow instance
   */
  async startWorkflow(
    definitionId: string,
    data: Record<string, any>,
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL'
  ): Promise<string> {
    try {
      // Get workflow definition
      const definition = await this.getWorkflowDefinition(definitionId);
      if (!definition) {
        throw new Error(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
      }

      const dueDate = this.calculateDueDate(definition.steps.find(s => s.id === definition.startStep));

      // Create workflow instance
      const instance = await prisma.workflowInstance.create({
        data: {
          definitionId,
          initiatedById: this.context.userId,
          currentStep: definition.startStep,
          data: data as any,
          priority,
          dueDate,
          status: 'IN_PROGRESS',
          organizationId: this.context.organizationId,
        },
      });

      // Process the first step
      await this.processStep(instance.id, definition.startStep);

      logger.info('Workflow instance started', { 
        instanceId: instance.id, 
        definitionId,
        initiatedById: this.context.userId 
      });

      this.emit(EVENT_TYPES.WORKFLOW_STARTED, {
        type: 'WORKFLOW_STARTED',
        instanceId: instance.id,
        definitionId,
        organizationId: this.context.organizationId,
        userId: this.context.userId,
        timestamp: new Date(),
      });

      return instance.id;
    } catch (error: unknown) {
      logger.error('Failed to start workflow', error);
      throw error;
    }
  }

  /**
   * Process a workflow step
   */
  async processStep(instanceId: string, stepId: string): Promise<void> {
    try {
      const instance = await this.getWorkflowInstance(instanceId);
      if (!instance) {
        throw new Error(ERROR_MESSAGES.WORKFLOW_INSTANCE_NOT_FOUND);
      }

      const definition = await this.getWorkflowDefinition(instance.definitionId);
      if (!definition) {
        throw new Error(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
      }

      const step = definition.steps.find(s => s.id === stepId);
      if (!step) {
        throw new Error(ERROR_MESSAGES.STEP_NOT_FOUND);
      }

      // Update current step
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { 
          currentStep: stepId,
          lastActivityAt: new Date(),
        }
      });

      // Process based on step type
      switch (step.type) {
        case 'TASK':
          await this.processTaskStep(instanceId, step);
          break;
        case 'DECISION':
          await this.processDecisionStep(instanceId, step);
          break;
        case 'PARALLEL':
          await this.processParallelStep(instanceId, step);
          break;
        case 'SUB_PROCESS':
          await this.processSubProcessStep(instanceId, step);
          break;
        case 'TIMER':
          await this.processTimerStep(instanceId, step);
          break;
        case 'END':
          await this.completeWorkflow(instanceId);
          break;
      }

      this.emit(EVENT_TYPES.WORKFLOW_STEP_COMPLETED, {
        instanceId,
        stepId,
        stepType: step.type,
        timestamp: new Date(),
      });
    } catch (error: unknown) {
      logger.error('Failed to process workflow step', error);
      throw error;
    }
  }

  /**
   * Approve a workflow step
   */
  async approveStep(
    instanceId: string,
    stepId: string,
    approval: ApprovalData
  ): Promise<void> {
    try {
      const instance = await this.getWorkflowInstance(instanceId);
      if (!instance) {
        throw new Error(ERROR_MESSAGES.WORKFLOW_INSTANCE_NOT_FOUND);
      }

      if (instance.status !== 'IN_PROGRESS') {
        throw new Error(ERROR_MESSAGES.WORKFLOW_ALREADY_COMPLETED);
      }

      // Record approval
      await prisma.workflowApproval.create({
        data: {
          instanceId,
          stepId,
          approved: approval.approved,
          comments: approval.comments,
          approvedBy: approval.approvedBy,
          approvedAt: approval.approvedAt,
          signature: approval.signature,
        }
      });

      if (approval.approved) {
        // Move to next step
        await this.moveToNextStep(instanceId, stepId);
      } else {
        // Handle rejection logic (could be configured per workflow)
        await this.handleRejection(instanceId, stepId, approval);
      }

      logger.info('Workflow step approved', { 
        instanceId, 
        stepId, 
        approved: approval.approved,
        approvedBy: approval.approvedBy 
      });
    } catch (error: unknown) {
      logger.error('Failed to approve workflow step', error);
      throw error;
    }
  }

  /**
   * Get workflow instance
   */
  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstanceData | null> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { 
          id: instanceId,
          organizationId: this.context.organizationId 
        },
        include: {
          approvals: true,
        }
      });

      if (!instance) {
        return null;
      }

      return {
        id: instance.id,
        definitionId: instance.definitionId,
        status: instance.status as any,
        currentStep: instance.currentStep,
        data: instance.data as any,
        priority: instance.priority as any,
        initiatedBy: instance.initiatedById,
        assignedTo: instance.assignedTo || undefined,
        startedAt: instance.createdAt,
        completedAt: instance.completedAt || undefined,
        dueDate: instance.dueDate || undefined,
      };
    } catch (error: unknown) {
      logger.error('Failed to get workflow instance', error);
      throw error;
    }
  }

  /**
   * Get active workflows for organization
   */
  async getActiveWorkflows(): Promise<WorkflowInstanceData[]> {
    try {
      const instances = await prisma.workflowInstance.findMany({
        where: {
          organizationId: this.context.organizationId,
          status: 'IN_PROGRESS',
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100,
      });

      return instances.map(instance => ({
        id: instance.id,
        definitionId: instance.definitionId,
        status: instance.status as any,
        currentStep: instance.currentStep,
        data: instance.data as any,
        priority: instance.priority as any,
        initiatedBy: instance.initiatedById,
        assignedTo: instance.assignedTo || undefined,
        startedAt: instance.createdAt,
        completedAt: instance.completedAt || undefined,
        dueDate: instance.dueDate || undefined,
      }));
    } catch (error: unknown) {
      logger.error('Failed to get active workflows', error);
      throw error;
    }
  }

  /**
   * Cancel workflow instance
   */
  async cancelWorkflow(instanceId: string, reason?: string): Promise<void> {
    try {
      const instance = await this.getWorkflowInstance(instanceId);
      if (!instance) {
        throw new Error(ERROR_MESSAGES.WORKFLOW_INSTANCE_NOT_FOUND);
      }

      if (instance.status !== 'IN_PROGRESS') {
        throw new Error(ERROR_MESSAGES.WORKFLOW_ALREADY_COMPLETED);
      }

      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { 
          status: 'CANCELLED',
          completedAt: new Date(),
          completionNotes: reason,
        }
      });

      logger.info('Workflow cancelled', { 
        instanceId, 
        reason,
        cancelledBy: this.context.userId 
      });

      this.emit(EVENT_TYPES.WORKFLOW_FAILED, {
        instanceId,
        reason: 'CANCELLED',
        cancelledBy: this.context.userId,
        timestamp: new Date(),
      });
    } catch (error: unknown) {
      logger.error('Failed to cancel workflow', error);
      throw error;
    }
  }

  /**
   * Get workflow metrics
   */
  async getWorkflowMetrics(): Promise<{
    active: number;
    completed: number;
    failed: number;
    averageCompletionTime: number;
    slaCompliance: number;
  }> {
    try {
      const [activeCount, completedCount, failedCount, avgTime, slaCompliance] = await Promise.all([
        this.getActiveWorkflowCount(),
        this.getCompletedWorkflowCount(),
        this.getFailedWorkflowCount(),
        this.getAverageCompletionTime(),
        this.getSLACompliance(),
      ]);

      return {
        active: activeCount,
        completed: completedCount,
        failed: failedCount,
        averageCompletionTime: avgTime,
        slaCompliance,
      };
    } catch (error: unknown) {
      logger.error('Failed to get workflow metrics', error);
      throw error;
    }
  }

  // Private methods

  private validateWorkflowDefinition(workflow: Omit<WorkflowDefinition, 'id'>): void {
    if (!workflow.name || workflow.name.length < 3) {
      throw new Error('Workflow name must be at least 3 characters');
    }

    if (!workflow.version || !/^\d+\.\d+\.\d+$/.test(workflow.version)) {
      throw new Error('Workflow version must be in semantic version format (x.y.z)');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    if (!workflow.startStep) {
      throw new Error('Workflow must have a start step defined');
    }

    const startStepExists = workflow.steps.some(s => s.id === workflow.startStep);
    if (!startStepExists) {
      throw new Error('Start step must exist in workflow steps');
    }
  }

  private calculateDueDate(step?: WorkflowStep): Date | undefined {
    if (!step || !step.dueDate) {
      return undefined;
    }

    return step.dueDate;
  }

  private async processTaskStep(instanceId: string, step: WorkflowStep): Promise<void> {
    // Create task assignment if needed
    if (step.assignments && step.assignments.length > 0) {
      const assignee = await this.resolveAssignment(step.assignments[0]);
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { assignedTo: assignee }
      });
    }

    // Auto-complete if no assignments (automated task)
    if (!step.assignments || step.assignments.length === 0) {
      await this.moveToNextStep(instanceId, step.id);
    }
  }

  private async processDecisionStep(instanceId: string, step: WorkflowStep): Promise<void> {
    // Decision steps require explicit approval/decision
    // This is handled by the approveStep method
  }

  private async processParallelStep(instanceId: string, step: WorkflowStep): Promise<void> {
    // Handle parallel execution logic
    // For now, move to next step
    await this.moveToNextStep(instanceId, step.id);
  }

  private async processSubProcessStep(instanceId: string, step: WorkflowStep): Promise<void> {
    // Handle sub-process execution
    // For now, move to next step
    await this.moveToNextStep(instanceId, step.id);
  }

  private async processTimerStep(instanceId: string, step: WorkflowStep): Promise<void> {
    // Schedule timer-based progression
    const delay = step.configuration?.delay || 60000; // Default 1 minute
    setTimeout(() => {
      this.moveToNextStep(instanceId, step.id);
    }, delay);
  }

  private async moveToNextStep(instanceId: string, currentStepId: string): Promise<void> {
    const instance = await this.getWorkflowInstance(instanceId);
    if (!instance) return;

    const definition = await this.getWorkflowDefinition(instance.definitionId);
    if (!definition) return;

    const currentStep = definition.steps.find(s => s.id === currentStepId);
    if (!currentStep || !currentStep.transitions || currentStep.transitions.length === 0) {
      // No transitions, complete the workflow
      await this.completeWorkflow(instanceId);
      return;
    }

    // Find the first valid transition (simplified logic)
    const nextTransition = currentStep.transitions[0];
    await this.processStep(instanceId, nextTransition.targetStepId);
  }

  private async completeWorkflow(instanceId: string): Promise<void> {
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date(),
      }
    });

    logger.info('Workflow completed', { instanceId });

    this.emit(EVENT_TYPES.WORKFLOW_COMPLETED, {
      instanceId,
      completedAt: new Date(),
    });
  }

  private async handleRejection(
    instanceId: string, 
    stepId: string, 
    approval: ApprovalData
  ): Promise<void> {
    // Simple rejection handling - could be enhanced based on workflow configuration
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { 
        status: 'FAILED',
        completedAt: new Date(),
        completionNotes: `Rejected: ${approval.comments}`,
      }
    });

    this.emit(EVENT_TYPES.WORKFLOW_FAILED, {
      instanceId,
      reason: 'REJECTED',
      rejectedBy: approval.approvedBy,
      comments: approval.comments,
      timestamp: new Date(),
    });
  }

  private async resolveAssignment(assignment: WorkflowAssignment): Promise<string> {
    switch (assignment.type) {
      case 'USER':
        return assignment.value;
      case 'ROLE':
        // Resolve role to user (simplified)
        return assignment.value;
      case 'GROUP':
        // Resolve group to user (simplified)
        return assignment.value;
      case 'EXPRESSION':
        // Evaluate expression to resolve user (simplified)
        return assignment.value;
      default:
        return this.context.userId;
    }
  }

  private initializeScheduler(): void {
    if (this.schedulerInitialized) return;

    // Check for escalations every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.checkEscalations();
    });

    // Cleanup old workflows daily
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldWorkflows();
    });

    this.schedulerInitialized = true;
  }

  private async checkEscalations(): Promise<void> {
    try {
      const overdueInstances = await prisma.workflowInstance.findMany({
        where: {
          organizationId: this.context.organizationId,
          status: 'IN_PROGRESS',
          dueDate: {
            lt: new Date()
          }
        }
      });

      for (const instance of overdueInstances) {
        await this.handleEscalation(instance.id);
      }
    } catch (error: unknown) {
      logger.error('Failed to check escalations', error);
    }
  }

  private async handleEscalation(instanceId: string): Promise<void> {
    try {
      const instance = await this.getWorkflowInstance(instanceId);
      if (!instance) return;

      // Notify about escalation (simplified implementation)
      logger.warn('Workflow escalation triggered', { 
        instanceId,
        dueDate: instance.dueDate 
      });

      this.emit(EVENT_TYPES.WORKFLOW_ESCALATED, {
        instanceId,
        escalatedAt: new Date(),
      });
    } catch (error: unknown) {
      logger.error('Failed to handle escalation', error);
    }
  }

  private async cleanupOldWorkflows(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ADVANCED_OPERATIONS_CONFIG.WORKFLOW.AUTO_CLEANUP_DAYS);

      await prisma.workflowInstance.deleteMany({
        where: {
          organizationId: this.context.organizationId,
          completedAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info('Old workflows cleaned up', { 
        cutoffDate,
        organizationId: this.context.organizationId 
      });
    } catch (error: unknown) {
      logger.error('Failed to cleanup old workflows', error);
    }
  }

  private async getActiveWorkflowCount(): Promise<number> {
    return await prisma.workflowInstance.count({
      where: {
        organizationId: this.context.organizationId,
        status: 'IN_PROGRESS',
      }
    });
  }

  private async getCompletedWorkflowCount(): Promise<number> {
    return await prisma.workflowInstance.count({
      where: {
        organizationId: this.context.organizationId,
        status: 'COMPLETED',
      }
    });
  }

  private async getFailedWorkflowCount(): Promise<number> {
    return await prisma.workflowInstance.count({
      where: {
        organizationId: this.context.organizationId,
        status: { in: ['FAILED', 'CANCELLED'] },
      }
    });
  }

  private async getAverageCompletionTime(): Promise<number> {
    const result = await prisma.workflowInstance.aggregate({
      where: {
        organizationId: this.context.organizationId,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      _avg: {
        // This would need a calculated field for completion time
        // For now, return a placeholder
      }
    });

    return 0; // Placeholder - would calculate actual average
  }

  private async getSLACompliance(): Promise<number> {
    // Calculate SLA compliance based on due dates
    // Placeholder implementation
    return 0.95; // 95% compliance
  }
}