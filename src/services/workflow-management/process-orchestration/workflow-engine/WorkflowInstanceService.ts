/**
 * Workflow Instance Service - Manages workflow execution instances
 * 
 * Handles starting, tracking, and controlling workflow instances
 * Part of the Workflow Management domain within Turbo Asset IWMS
 */

import { prisma } from '../../../../../src/config/database';
import { logger } from '../../../../../src/config/logger';
import { WorkflowDefinition, WorkflowInstanceData } from '../types/WorkflowTypes';
import { WORKFLOW_CONSTANTS } from '../constants/WorkflowConstants';

export class WorkflowInstanceService {
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
          status: WORKFLOW_CONSTANTS.WORKFLOW_STATUS.IN_PROGRESS,
        },
      });

      logger.info('Workflow instance started', { 
        instanceId: instance.id, 
        definitionId,
        initiatedById 
      });

      return instance.id;
    } catch (error) {
      logger.error('Failed to start workflow', { error, definitionId });
      throw error;
    }
  }

  /**
   * Get workflow instance
   */
  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstanceData | null> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          definition: true,
          initiatedBy: true,
        },
      });

      if (!instance) {
        return null;
      }

      return {
        instanceId: instance.id,
        definitionId: instance.definitionId,
        status: instance.status as WorkflowInstanceData['status'],
        currentStepId: instance.currentStep,
        data: instance.data as Record<string, any>,
        startedAt: instance.createdAt,
        completedAt: instance.completedAt || undefined,
        dueDate: instance.dueDate || undefined,
        priority: instance.priority as WorkflowInstanceData['priority'],
        initiatedById: instance.initiatedById
      };
    } catch (error) {
      logger.error('Failed to get workflow instance', { error, instanceId });
      throw error;
    }
  }

  /**
   * Update workflow instance status
   */
  async updateWorkflowStatus(
    instanceId: string,
    status: WorkflowInstanceData['status'],
    currentStepId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (currentStepId) {
        updateData.currentStep = currentStepId;
      }

      if (status === WORKFLOW_CONSTANTS.WORKFLOW_STATUS.COMPLETED) {
        updateData.completedAt = new Date();
      }

      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: updateData
      });

      logger.info('Workflow instance status updated', { 
        instanceId, 
        status, 
        currentStepId 
      });
    } catch (error) {
      logger.error('Failed to update workflow status', { error, instanceId });
      throw error;
    }
  }

  /**
   * Cancel workflow instance
   */
  async cancelWorkflow(instanceId: string, reason?: string): Promise<void> {
    try {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: WORKFLOW_CONSTANTS.WORKFLOW_STATUS.CANCELLED,
          completedAt: new Date(),
          // Store cancellation reason in data if provided
          data: reason ? {
            ...(await this.getWorkflowInstanceData(instanceId)),
            cancellationReason: reason
          } as any : undefined
        }
      });

      // Cancel any pending approvals
      await prisma.approval.updateMany({
        where: {
          workflowId: instanceId,
          status: WORKFLOW_CONSTANTS.APPROVAL_STATUS.PENDING
        },
        data: {
          status: 'CANCELLED' as any
        }
      });

      logger.info('Workflow instance cancelled', { instanceId, reason });
    } catch (error) {
      logger.error('Failed to cancel workflow', { error, instanceId });
      throw error;
    }
  }

  /**
   * List workflow instances
   */
  async listWorkflowInstances(
    organizationId: string,
    filters: {
      status?: WorkflowInstanceData['status'][];
      priority?: WorkflowInstanceData['priority'][];
      definitionId?: string;
      initiatedById?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ instances: WorkflowInstanceData[]; total: number }> {
    try {
      const { 
        status, 
        priority, 
        definitionId, 
        initiatedById,
        page = 1, 
        limit = 20 
      } = filters;
      const skip = (page - 1) * limit;

      const where: any = {
        definition: { organizationId }
      };

      if (status) where.status = { in: status };
      if (priority) where.priority = { in: priority };
      if (definitionId) where.definitionId = definitionId;
      if (initiatedById) where.initiatedById = initiatedById;

      const [instances, total] = await Promise.all([
        prisma.workflowInstance.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            definition: true,
            initiatedBy: true,
          }
        }),
        prisma.workflowInstance.count({ where })
      ]);

      return {
        instances: instances.map(instance => ({
          instanceId: instance.id,
          definitionId: instance.definitionId,
          status: instance.status as WorkflowInstanceData['status'],
          currentStepId: instance.currentStep,
          data: instance.data as Record<string, any>,
          startedAt: instance.createdAt,
          completedAt: instance.completedAt || undefined,
          dueDate: instance.dueDate || undefined,
          priority: instance.priority as WorkflowInstanceData['priority'],
          initiatedById: instance.initiatedById
        })),
        total
      };
    } catch (error) {
      logger.error('Failed to list workflow instances', { error, organizationId });
      throw error;
    }
  }

  /**
   * Calculate due date for workflow step
   */
  private calculateDueDate(step: any): Date | null {
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
   * Get workflow instance data only
   */
  private async getWorkflowInstanceData(instanceId: string): Promise<Record<string, any>> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      select: { data: true }
    });
    
    return (instance?.data as Record<string, any>) || {};
  }
}