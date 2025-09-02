/**
 * Workflow Step Processor - Handles execution of different workflow step types
 * 
 * Processes approval, task, condition, and notification steps
 * Part of the Workflow Management domain within Turbo Asset IWMS
 */

import { prisma } from '../../../../../src/config/database';
import { logger } from '../../../../../src/config/logger';
import { WorkflowDefinition, StepExecutionContext, WorkflowNotificationData } from '../types/WorkflowTypes';
import { WORKFLOW_CONSTANTS } from '../constants/WorkflowConstants';
import { WorkflowApprovalService } from './WorkflowApprovalService';
import { EventEmitter } from 'events';

export class WorkflowStepProcessor extends EventEmitter {
  private approvalService: WorkflowApprovalService;

  constructor() {
    super();
    this.approvalService = new WorkflowApprovalService();
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

      const context: StepExecutionContext = {
        instanceId,
        stepId,
        organizationId: instance.definition.organizationId,
        data: instance.data as Record<string, any>,
        variables: workflowDef.variables || {},
        previousSteps: [] // TODO: Track step history
      };

      this.emit('step.started', { instanceId, stepId, step });

      switch (step.type) {
        case WORKFLOW_CONSTANTS.STEP_TYPES.APPROVAL:
          await this.processApprovalStep(context, step);
          break;
        case WORKFLOW_CONSTANTS.STEP_TYPES.TASK:
          await this.processTaskStep(context, step);
          break;
        case WORKFLOW_CONSTANTS.STEP_TYPES.CONDITION:
          await this.processConditionStep(context, step);
          break;
        case WORKFLOW_CONSTANTS.STEP_TYPES.NOTIFICATION:
          await this.processNotificationStep(context, step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      this.emit('step.completed', { instanceId, stepId, step });
    } catch (error) {
      logger.error('Failed to process workflow step', { error, instanceId, stepId });
      this.emit('step.error', { instanceId, stepId, error });
      throw error;
    }
  }

  /**
   * Process approval step
   */
  private async processApprovalStep(context: StepExecutionContext, step: any): Promise<void> {
    try {
      const { instanceId, stepId } = context;
      const approvers = step.approvers || [];
      const dueDate = this.calculateStepDueDate(step);

      // Create approval requests for each approver
      const approvalIds = [];
      for (const approverId of approvers) {
        const approvalId = await this.approvalService.createApprovalRequest(
          instanceId,
          stepId,
          approverId,
          dueDate
        );
        approvalIds.push(approvalId);

        // Emit notification event for approval request
        const notificationData: WorkflowNotificationData = {
          workflowInstanceId: instanceId,
          stepId,
          type: 'APPROVAL_REQUEST',
          recipientId: approverId,
          templateData: {
            stepName: step.name,
            workflowName: 'Workflow', // TODO: Get actual workflow name
            dueDate: dueDate?.toISOString()
          },
          dueDate,
          priority: 'NORMAL' // TODO: Get from workflow instance
        };

        this.emit('approval.requested', notificationData);
      }

      logger.info('Approval step processed', { 
        instanceId, 
        stepId, 
        approversCount: approvers.length 
      });
    } catch (error) {
      logger.error('Failed to process approval step', { error, context });
      throw error;
    }
  }

  /**
   * Process task step
   */
  private async processTaskStep(context: StepExecutionContext, step: any): Promise<void> {
    try {
      const { instanceId, stepId } = context;

      // For now, task steps are automatically completed
      // In a full implementation, this would create task assignments
      logger.info('Task step processed', { instanceId, stepId, taskName: step.name });

      // Automatically move to next step for task steps
      this.emit('step.auto_complete', { instanceId, stepId });
    } catch (error) {
      logger.error('Failed to process task step', { error, context });
      throw error;
    }
  }

  /**
   * Process condition step
   */
  private async processConditionStep(context: StepExecutionContext, step: any): Promise<void> {
    try {
      const { instanceId, stepId, data, variables } = context;
      const condition = step.condition;

      if (!condition) {
        throw new Error('Condition step missing condition expression');
      }

      // Simple condition evaluation - in production, use a proper expression evaluator
      const conditionResult = this.evaluateCondition(condition, data, variables);

      logger.info('Condition step processed', { 
        instanceId, 
        stepId, 
        condition, 
        result: conditionResult 
      });

      // Emit result for workflow engine to handle next step selection
      this.emit('condition.evaluated', { 
        instanceId, 
        stepId, 
        condition, 
        result: conditionResult 
      });
    } catch (error) {
      logger.error('Failed to process condition step', { error, context });
      throw error;
    }
  }

  /**
   * Process notification step
   */
  private async processNotificationStep(context: StepExecutionContext, step: any): Promise<void> {
    try {
      const { instanceId, stepId } = context;
      const recipients = step.recipients || [];

      for (const recipientId of recipients) {
        const notificationData: WorkflowNotificationData = {
          workflowInstanceId: instanceId,
          stepId,
          type: 'COMPLETION',
          recipientId,
          templateData: {
            stepName: step.name,
            message: step.message || 'Workflow step completed'
          },
          priority: 'NORMAL'
        };

        this.emit('notification.send', notificationData);
      }

      logger.info('Notification step processed', { 
        instanceId, 
        stepId, 
        recipientsCount: recipients.length 
      });

      // Auto-complete notification steps
      this.emit('step.auto_complete', { instanceId, stepId });
    } catch (error) {
      logger.error('Failed to process notification step', { error, context });
      throw error;
    }
  }

  /**
   * Calculate due date for step based on SLA
   */
  private calculateStepDueDate(step: any): Date | undefined {
    if (!step.sla) return undefined;

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
        return undefined;
    }
  }

  /**
   * Evaluate simple conditions - in production, use a proper expression evaluator
   */
  private evaluateCondition(
    condition: string, 
    data: Record<string, any>, 
    variables: Record<string, any>
  ): boolean {
    try {
      // Very basic condition evaluation - replace with proper parser in production
      // This is just for demonstration
      const context = { ...data, ...variables };
      
      // Simple string replacement for basic conditions
      let evaluableCondition = condition;
      for (const [key, value] of Object.entries(context)) {
        evaluableCondition = evaluableCondition.replace(
          new RegExp(`\\b${key}\\b`, 'g'), 
          JSON.stringify(value)
        );
      }

      // WARNING: eval is dangerous - use a proper expression parser in production
      return Boolean(eval(evaluableCondition));
    } catch (error) {
      logger.error('Failed to evaluate condition', { error, condition });
      return false;
    }
  }
}