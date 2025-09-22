import { prisma } from '../config/database';
import { logger } from '@/config/logger';
import { WorkflowDefinition, WorkflowInstanceData, ApprovalData, WorkflowStep } from '../types/workflow';
import { NotificationService } from './NotificationService';
import cron from 'node-cron';

export class WorkflowEngine {
  private readonly notificationService: NotificationService;

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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    const allApprovers = [...approvers];
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
    const {nextSteps} = currentStep;
    
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
    if (!step.sla) {return null;}

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
    } catch (error: unknown) {
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

  /**
   * Get workflow metrics and analytics
   */
  async getWorkflowMetrics(organizationId: string, timeframe: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' = 'MONTH'): Promise<WorkflowMetrics> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'DAY':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'WEEK':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'MONTH':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'QUARTER':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
      }

      // Get workflow instances within timeframe
      const instances = await prisma.workflowInstance.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          definition: true,
          approvals: true,
        },
      });

      // Calculate metrics
      const totalInstances = instances.length;
      const completedInstances = instances.filter(i => i.status === 'COMPLETED').length;
      const pendingInstances = instances.filter(i => i.status === 'PENDING' || i.status === 'IN_PROGRESS').length;
      const cancelledInstances = instances.filter(i => i.status === 'CANCELLED').length;
      const expiredInstances = instances.filter(i => i.status === 'EXPIRED').length;

      // Calculate average completion time
      const completedWithTimes = instances.filter(i => i.status === 'COMPLETED' && i.completedAt);
      const avgCompletionTime = completedWithTimes.length > 0 
        ? completedWithTimes.reduce((sum, i) => sum + (i.completedAt!.getTime() - i.createdAt.getTime()), 0) / completedWithTimes.length
        : 0;

      // Get workflow definitions performance
      const workflowPerformance = await this.calculateWorkflowPerformance(organizationId, instances);

      // Get approval metrics
      const approvalMetrics = await this.calculateApprovalMetrics(instances);

      // Get SLA compliance
      const slaCompliance = await this.calculateSLACompliance(instances);

      return {
        period: { start: startDate, end: endDate },
        totalInstances,
        completedInstances,
        pendingInstances,
        cancelledInstances,
        expiredInstances,
        completionRate: totalInstances > 0 ? (completedInstances / totalInstances) * 100 : 0,
        avgCompletionTime: avgCompletionTime / (1000 * 60 * 60), // Convert to hours
        workflowPerformance,
        approvalMetrics,
        slaCompliance,
      };
    } catch (error: unknown) {
      logger.error('Failed to get workflow metrics', error);
      throw error;
    }
  }

  /**
   * Calculate workflow performance by definition
   */
  private async calculateWorkflowPerformance(organizationId: string, instances: any[]): Promise<WorkflowPerformance[]> {
    const performanceMap = new Map<string, {
      definitionId: string;
      name: string;
      total: number;
      completed: number;
      avgTime: number;
      completionTimes: number[];
    }>();

    instances.forEach(instance => {
      const key = instance.definitionId;
      if (!performanceMap.has(key)) {
        performanceMap.set(key, {
          definitionId: instance.definitionId,
          name: instance.definition.name,
          total: 0,
          completed: 0,
          avgTime: 0,
          completionTimes: [],
        });
      }

      const perf = performanceMap.get(key)!;
      perf.total++;

      if (instance.status === 'COMPLETED' && instance.completedAt) {
        perf.completed++;
        const completionTime = instance.completedAt.getTime() - instance.createdAt.getTime();
        perf.completionTimes.push(completionTime);
      }
    });

    return Array.from(performanceMap.values()).map(perf => ({
      definitionId: perf.definitionId,
      definitionName: perf.name,
      totalInstances: perf.total,
      completedInstances: perf.completed,
      completionRate: perf.total > 0 ? (perf.completed / perf.total) * 100 : 0,
      avgCompletionTime: perf.completionTimes.length > 0 
        ? perf.completionTimes.reduce((sum, time) => sum + time, 0) / perf.completionTimes.length / (1000 * 60 * 60)
        : 0,
    }));
  }

  /**
   * Calculate approval metrics
   */
  private async calculateApprovalMetrics(instances: any[]): Promise<ApprovalMetrics> {
    const approvals = instances.flatMap(i => i.approvals || []);
    
    const totalApprovals = approvals.length;
    const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
    const rejectedCount = approvals.filter(a => a.status === 'REJECTED').length;
    const pendingCount = approvals.filter(a => a.status === 'PENDING').length;
    const delegatedCount = approvals.filter(a => a.status === 'DELEGATED').length;

    // Calculate average approval time
    const approvedWithTimes = approvals.filter(a => a.status === 'APPROVED' && a.approvedAt);
    const avgApprovalTime = approvedWithTimes.length > 0
      ? approvedWithTimes.reduce((sum, a) => sum + (a.approvedAt.getTime() - a.createdAt.getTime()), 0) / approvedWithTimes.length
      : 0;

    return {
      totalApprovals,
      approvedCount,
      rejectedCount,
      pendingCount,
      delegatedCount,
      approvalRate: totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0,
      rejectionRate: totalApprovals > 0 ? (rejectedCount / totalApprovals) * 100 : 0,
      avgApprovalTime: avgApprovalTime / (1000 * 60 * 60), // Convert to hours
    };
  }

  /**
   * Calculate SLA compliance
   */
  private async calculateSLACompliance(instances: any[]): Promise<SLACompliance> {
    let totalWithSLA = 0;
    let withinSLA = 0;
    let breachedSLA = 0;

    instances.forEach(instance => {
      if (instance.dueDate) {
        totalWithSLA++;
        const completedAt = instance.completedAt || new Date();
        
        if (completedAt <= instance.dueDate) {
          withinSLA++;
        } else {
          breachedSLA++;
        }
      }
    });

    return {
      totalWithSLA,
      withinSLA,
      breachedSLA,
      complianceRate: totalWithSLA > 0 ? (withinSLA / totalWithSLA) * 100 : 0,
      breachRate: totalWithSLA > 0 ? (breachedSLA / totalWithSLA) * 100 : 0,
    };
  }

  /**
   * Create workflow from template
   */
  async createWorkflowFromTemplate(
    organizationId: string,
    templateId: string,
    data: Record<string, any> = {}
  ): Promise<string> {
    try {
      const template = await prisma.workflowTemplate.findUnique({
        where: { id: templateId },
        include: { steps: true }
      });

      if (!template) {
        throw new Error('Workflow template not found');
      }

      // Generate workflow definition from template
      const workflowDefinition: Omit<WorkflowDefinition, 'id'> = {
        name: template.name,
        description: template.description,
        version: '1.0',
        startStep: template.steps[0]?.id || '',
        steps: template.steps.map(step => ({
          id: step.id,
          name: step.name,
          type: step.type,
          approvers: step.approvers,
          roles: step.roles,
          condition: step.condition,
          sla: step.slaHours ? {
            duration: step.slaHours,
            unit: 'hours' as const,
          } : undefined,
          nextSteps: step.nextStepIds,
        })),
        variables: data,
      };

      return await this.createWorkflowDefinition(organizationId, workflowDefinition);
    } catch (error: unknown) {
      logger.error('Failed to create workflow from template', error);
      throw error;
    }
  }

  /**
   * Clone workflow definition
   */
  async cloneWorkflowDefinition(
    organizationId: string,
    sourceDefinitionId: string,
    newName: string
  ): Promise<string> {
    try {
      const sourceDefinition = await prisma.workflowDefinition.findUnique({
        where: { id: sourceDefinitionId },
      });

      if (!sourceDefinition) {
        throw new Error('Source workflow definition not found');
      }

      const definition = sourceDefinition.definition as WorkflowDefinition;
      
      const clonedDefinition: Omit<WorkflowDefinition, 'id'> = {
        ...definition,
        name: newName,
        version: '1.0',
      };

      return await this.createWorkflowDefinition(organizationId, clonedDefinition);
    } catch (error: unknown) {
      logger.error('Failed to clone workflow definition', error);
      throw error;
    }
  }

  /**
   * Bulk update workflow instances
   */
  async bulkUpdateWorkflowInstances(
    organizationId: string,
    instanceIds: string[],
    updates: Partial<WorkflowInstanceData>
  ): Promise<{ updated: number; failed: string[] }> {
    const results = { updated: 0, failed: [] as string[] };

    for (const instanceId of instanceIds) {
      try {
        await prisma.workflowInstance.update({
          where: { 
            id: instanceId,
            organizationId,
          },
          data: updates,
        });
        results.updated++;
      } catch (error: unknown) {
        results.failed.push(instanceId);
        logger.error('Failed to update workflow instance', { instanceId, error });
      }
    }

    return results;
  }

  /**
   * Get workflow history for an entity
   */
  async getEntityWorkflowHistory(
    organizationId: string,
    entityType: string,
    entityId: string
  ): Promise<WorkflowHistoryEntry[]> {
    try {
      const instances = await prisma.workflowInstance.findMany({
        where: {
          organizationId,
          data: {
            path: ['entityType'],
            equals: entityType,
          },
        },
        include: {
          definition: true,
          approvals: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Filter by entity ID in the data field
      const filteredInstances = instances.filter(instance => 
        (instance.data as any)?.entityId === entityId
      );

      return filteredInstances.map(instance => ({
        instanceId: instance.id,
        definitionName: (instance.definition as any).name,
        status: instance.status,
        initiatedBy: instance.initiatedById,
        startedAt: instance.createdAt,
        completedAt: instance.completedAt,
        approvals: instance.approvals.map((approval: any) => ({
          id: approval.id,
          approver: approval.user ? `${approval.user.firstName} ${approval.user.lastName}` : 'Unknown',
          status: approval.status,
          comments: approval.comments,
          approvedAt: approval.approvedAt,
        })),
      }));
    } catch (error: unknown) {
      logger.error('Failed to get entity workflow history', error);
      throw error;
    }
  }
}

// Additional types for enhanced workflow features
interface WorkflowMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totalInstances: number;
  completedInstances: number;
  pendingInstances: number;
  cancelledInstances: number;
  expiredInstances: number;
  completionRate: number;
  avgCompletionTime: number;
  workflowPerformance: WorkflowPerformance[];
  approvalMetrics: ApprovalMetrics;
  slaCompliance: SLACompliance;
}

interface WorkflowPerformance {
  definitionId: string;
  definitionName: string;
  totalInstances: number;
  completedInstances: number;
  completionRate: number;
  avgCompletionTime: number;
}

interface ApprovalMetrics {
  totalApprovals: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  delegatedCount: number;
  approvalRate: number;
  rejectionRate: number;
  avgApprovalTime: number;
}

interface SLACompliance {
  totalWithSLA: number;
  withinSLA: number;
  breachedSLA: number;
  complianceRate: number;
  breachRate: number;
}

interface WorkflowHistoryEntry {
  instanceId: string;
  definitionName: string;
  status: string;
  initiatedBy: string;
  startedAt: Date;
  completedAt?: Date;
  approvals: Array<{
    id: string;
    approver: string;
    status: string;
    comments?: string;
    approvedAt?: Date;
  }>;
}