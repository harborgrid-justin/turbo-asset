import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { WorkflowDefinition, WorkflowInstanceData, ApprovalData, WorkflowStep } from '../types/workflow';
import { NotificationService } from './NotificationService';
import cron from 'node-cron';

export class WorkflowEngine {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
    this.initializeScheduler();
  }

  /**
   * Create a new workflow definition
   */
  async createWorkflowDefinition(
    organizationId: string,
    workflow: Omit<WorkflowDefinition, 'id'>
  ): Promise<string> {
    try {
      const result = await prisma.workflowDefinition.create({
        data: {
          name: workflow.name,
          description: workflow.description,
          version: workflow.version,
          definition: workflow as any,
          organizationId,
        },
      });

      logger.info('Workflow definition created', { 
        id: result.id, 
        name: workflow.name,
        organizationId 
      });

      return result.id;
    } catch (error) {
      logger.error('Failed to create workflow definition', error);
      throw error;
    }
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
    try {
      // Get workflow definition
      const definition = await prisma.workflowDefinition.findUnique({
        where: { id: definitionId }
      });

      if (!definition) {
        throw new Error('Workflow definition not found');
      }

      const workflowDef = definition.definition as WorkflowDefinition;
      const dueDate = this.calculateDueDate(workflowDef.steps[0]);

      // Create workflow instance
      const instance = await prisma.workflowInstance.create({
        data: {
          definitionId,
          initiatedById,
          currentStep: workflowDef.startStep,
          data: data as any,
          priority,
          dueDate,
          status: 'IN_PROGRESS',
        },
      });

      // Process the first step
      await this.processStep(instance.id, workflowDef.startStep);

      logger.info('Workflow instance started', { 
        instanceId: instance.id, 
        definitionId,
        initiatedById 
      });

      return instance.id;
    } catch (error) {
      logger.error('Failed to start workflow', error);
      throw error;
    }
  }

  /**
   * Process a workflow step
   */
  async processStep(instanceId: string, stepId: string): Promise<void> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          definition: true,
          initiatedBy: true,
        },
      });

      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      const workflowDef = instance.definition.definition as WorkflowDefinition;
      const step = workflowDef.steps.find(s => s.id === stepId);

      if (!step) {
        throw new Error('Workflow step not found');
      }

      switch (step.type) {
        case 'approval':
          await this.processApprovalStep(instance, step);
          break;
        case 'task':
          await this.processTaskStep(instance, step);
          break;
        case 'condition':
          await this.processConditionStep(instance, step);
          break;
        case 'notification':
          await this.processNotificationStep(instance, step);
          break;
      }
    } catch (error) {
      logger.error('Failed to process workflow step', error);
      throw error;
    }
  }

  /**
   * Approve or reject a workflow step
   */
  async processApproval(
    approvalId: string,
    approverId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string
  ): Promise<void> {
    try {
      // Update approval
      const approval = await prisma.approval.update({
        where: { id: approvalId },
        data: {
          status: decision,
          comments,
          approvedAt: new Date(),
        },
        include: {
          workflow: {
            include: {
              definition: true,
            },
          },
        },
      });

      // Check if all approvals for this step are complete
      const workflowDef = approval.workflow.definition.definition as WorkflowDefinition;
      const currentStep = workflowDef.steps.find(s => s.id === approval.workflow.currentStep);
      
      if (currentStep && currentStep.type === 'approval') {
        const allApprovals = await prisma.approval.findMany({
          where: {
            workflowId: approval.workflowId,
            // Add step-specific filtering if needed
          },
        });

        const pendingApprovals = allApprovals.filter((a: any) => a.status === 'PENDING');
        
        if (pendingApprovals.length === 0) {
          // All approvals complete, move to next step
          await this.moveToNextStep(approval.workflow.id, currentStep);
        }
      }

      logger.info('Approval processed', { 
        approvalId, 
        decision, 
        approverId 
      });
    } catch (error) {
      logger.error('Failed to process approval', error);
      throw error;
    }
  }

  /**
   * Process approval step
   */
  private async processApprovalStep(instance: any, step: WorkflowStep): Promise<void> {
    const approvers = step.approvers || [];
    const roles = step.roles || [];

    // Get users by roles if specified
    let allApprovers = [...approvers];
    if (roles.length > 0) {
      const usersByRole = await prisma.user.findMany({
        where: {
          role: { in: roles as any },
          isActive: true,
        },
      });
      allApprovers.push(...usersByRole.map((u: any) => u.id));
    }

    // Create approval records
    for (const approverId of allApprovers) {
      await prisma.approval.create({
        data: {
          workflowId: instance.id,
          approverId,
          status: 'PENDING',
        },
      });

      // Send notification
      await this.notificationService.createNotification({
        recipientId: approverId,
        title: `Approval Required: ${instance.definition.name}`,
        message: `You have a pending approval for ${instance.definition.name}`,
        type: 'WORKFLOW',
        priority: instance.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
        data: { workflowInstanceId: instance.id, stepId: step.id },
      });
    }
  }

  /**
   * Process task step
   */
  private async processTaskStep(instance: any, step: WorkflowStep): Promise<void> {
    // Task steps are automatically completed and move to next step
    await this.moveToNextStep(instance.id, step);
  }

  /**
   * Process condition step
   */
  private async processConditionStep(instance: any, step: WorkflowStep): Promise<void> {
    if (!step.condition) {
      throw new Error('Condition step must have a condition');
    }

    // Evaluate condition (simple implementation)
    const result = this.evaluateCondition(step.condition, instance.data);
    
    if (result && step.nextSteps && step.nextSteps.length > 0) {
      await this.processStep(instance.id, step.nextSteps[0]);
    } else {
      // Move to next step based on condition result
      await this.moveToNextStep(instance.id, step);
    }
  }

  /**
   * Process notification step
   */
  private async processNotificationStep(instance: any, step: WorkflowStep): Promise<void> {
    // Send notifications and move to next step
    await this.notificationService.createNotification({
      recipientId: instance.initiatedById,
      title: `Workflow Update: ${instance.definition.name}`,
      message: `Workflow step "${step.name}" has been processed`,
      type: 'WORKFLOW',
      priority: 'NORMAL',
      data: { workflowInstanceId: instance.id, stepId: step.id },
    });

    await this.moveToNextStep(instance.id, step);
  }

  /**
   * Move workflow to next step
   */
  private async moveToNextStep(instanceId: string, currentStep: WorkflowStep): Promise<void> {
    const nextSteps = currentStep.nextSteps;
    
    if (!nextSteps || nextSteps.length === 0) {
      // Workflow complete
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          currentStep: null,
        },
      });
      return;
    }

    // Move to first next step (simple implementation)
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentStep: nextSteps[0],
      },
    });

    // Process the next step
    await this.processStep(instanceId, nextSteps[0]);
  }

  /**
   * Calculate due date based on SLA
   */
  private calculateDueDate(step: WorkflowStep): Date | null {
    if (!step.sla) return null;

    const now = new Date();
    const { duration, unit } = step.sla;

    switch (unit) {
      case 'minutes':
        return new Date(now.getTime() + duration * 60 * 1000);
      case 'hours':
        return new Date(now.getTime() + duration * 60 * 60 * 1000);
      case 'days':
        return new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  /**
   * Simple condition evaluation
   */
  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    try {
      // This is a simplified implementation
      // In production, you'd want a more robust expression evaluator
      const func = new Function('data', `return ${condition}`);
      return func(data);
    } catch {
      return false;
    }
  }

  /**
   * Initialize scheduler for SLA monitoring
   */
  private initializeScheduler(): void {
    // Run every 5 minutes to check for overdue workflows
    cron.schedule('*/5 * * * *', async () => {
      await this.checkOverdueWorkflows();
    });

    logger.info('Workflow scheduler initialized');
  }

  /**
   * Check for overdue workflows and escalate
   */
  private async checkOverdueWorkflows(): Promise<void> {
    try {
      const overdueInstances = await prisma.workflowInstance.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: {
            lt: new Date(),
          },
        },
        include: {
          definition: true,
          initiatedBy: true,
        },
      });

      for (const instance of overdueInstances) {
        await this.handleOverdueWorkflow(instance);
      }
    } catch (error) {
      logger.error('Failed to check overdue workflows', error);
    }
  }

  /**
   * Handle overdue workflow
   */
  private async handleOverdueWorkflow(instance: any): Promise<void> {
    // Send escalation notifications
    await this.notificationService.createNotification({
      recipientId: instance.initiatedById,
      title: `Overdue Workflow: ${instance.definition.name}`,
      message: `Workflow "${instance.definition.name}" is overdue`,
      type: 'WARNING',
      priority: 'HIGH',
      data: { workflowInstanceId: instance.id },
    });

    logger.warn('Workflow overdue', { 
      instanceId: instance.id, 
      dueDate: instance.dueDate 
    });
  }
}