/**
 * Workflow Approval Service - Manages approval processes within workflows
 * 
 * Handles approval requests, responses, and delegation
 * Part of the Workflow Management domain within Turbo Asset IWMS
 */

import { prisma } from '../../../../../src/config/database';
import { logger } from '../../../../../src/config/logger';
import { ApprovalData } from '../types/WorkflowTypes';
import { WORKFLOW_CONSTANTS } from '../constants/WorkflowConstants';

export class WorkflowApprovalService {
  /**
   * Create approval request
   */
  async createApprovalRequest(
    workflowInstanceId: string,
    stepId: string,
    approverId: string,
    dueDate?: Date
  ): Promise<string> {
    try {
      const approval = await prisma.approval.create({
        data: {
          workflowId: workflowInstanceId,
          stepId,
          approverId,
          status: WORKFLOW_CONSTANTS.APPROVAL_STATUS.PENDING,
          dueDate,
        },
      });

      logger.info('Approval request created', { 
        approvalId: approval.id, 
        workflowInstanceId, 
        approverId 
      });

      return approval.id;
    } catch (error) {
      logger.error('Failed to create approval request', { 
        error, 
        workflowInstanceId, 
        approverId 
      });
      throw error;
    }
  }

  /**
   * Process approval decision
   */
  async processApproval(
    approvalId: string,
    approverId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string
  ): Promise<{ allApprovalsComplete: boolean; workflowInstanceId: string }> {
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
      const allStepApprovals = await prisma.approval.findMany({
        where: {
          workflowId: approval.workflowId,
          stepId: approval.stepId,
        },
      });

      const pendingApprovals = allStepApprovals.filter(
        a => a.status === WORKFLOW_CONSTANTS.APPROVAL_STATUS.PENDING
      );

      const allApprovalsComplete = pendingApprovals.length === 0;

      logger.info('Approval processed', { 
        approvalId, 
        decision, 
        approverId,
        allApprovalsComplete
      });

      return {
        allApprovalsComplete,
        workflowInstanceId: approval.workflowId
      };
    } catch (error) {
      logger.error('Failed to process approval', { error, approvalId });
      throw error;
    }
  }

  /**
   * Delegate approval to another user
   */
  async delegateApproval(
    approvalId: string,
    fromUserId: string,
    toUserId: string,
    comments?: string
  ): Promise<void> {
    try {
      await prisma.approval.update({
        where: { id: approvalId },
        data: {
          approverId: toUserId,
          status: WORKFLOW_CONSTANTS.APPROVAL_STATUS.DELEGATED,
          comments: comments || `Delegated from ${fromUserId} to ${toUserId}`,
          updatedAt: new Date()
        }
      });

      logger.info('Approval delegated', { 
        approvalId, 
        fromUserId, 
        toUserId 
      });
    } catch (error) {
      logger.error('Failed to delegate approval', { error, approvalId });
      throw error;
    }
  }

  /**
   * Get approval details
   */
  async getApproval(approvalId: string): Promise<ApprovalData | null> {
    try {
      const approval = await prisma.approval.findUnique({
        where: { id: approvalId }
      });

      if (!approval) {
        return null;
      }

      return {
        id: approval.id,
        workflowInstanceId: approval.workflowId,
        stepId: approval.stepId,
        approverId: approval.approverId,
        status: approval.status as ApprovalData['status'],
        comments: approval.comments || undefined,
        approvedAt: approval.approvedAt || undefined,
        dueDate: approval.dueDate || undefined,
      };
    } catch (error) {
      logger.error('Failed to get approval', { error, approvalId });
      throw error;
    }
  }

  /**
   * List approvals for a user
   */
  async getApprovalsPendingForUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      priority?: string[];
    } = {}
  ): Promise<{ approvals: ApprovalData[]; total: number }> {
    try {
      const { page = 1, limit = 20, priority } = options;
      const skip = (page - 1) * limit;

      const where: any = {
        approverId: userId,
        status: WORKFLOW_CONSTANTS.APPROVAL_STATUS.PENDING
      };

      if (priority?.length) {
        where.workflow = {
          priority: { in: priority }
        };
      }

      const [approvals, total] = await Promise.all([
        prisma.approval.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            workflow: true
          }
        }),
        prisma.approval.count({ where })
      ]);

      return {
        approvals: approvals.map(approval => ({
          id: approval.id,
          workflowInstanceId: approval.workflowId,
          stepId: approval.stepId,
          approverId: approval.approverId,
          status: approval.status as ApprovalData['status'],
          comments: approval.comments || undefined,
          approvedAt: approval.approvedAt || undefined,
          dueDate: approval.dueDate || undefined,
        })),
        total
      };
    } catch (error) {
      logger.error('Failed to get pending approvals for user', { error, userId });
      throw error;
    }
  }

  /**
   * Check if step has any pending approvals
   */
  async hasStepPendingApprovals(workflowInstanceId: string, stepId: string): Promise<boolean> {
    try {
      const pendingCount = await prisma.approval.count({
        where: {
          workflowId: workflowInstanceId,
          stepId,
          status: WORKFLOW_CONSTANTS.APPROVAL_STATUS.PENDING
        }
      });

      return pendingCount > 0;
    } catch (error) {
      logger.error('Failed to check pending approvals', { error, workflowInstanceId, stepId });
      throw error;
    }
  }

  /**
   * Get approval statistics for workflow instance
   */
  async getApprovalStats(workflowInstanceId: string): Promise<{
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    delegated: number;
  }> {
    try {
      const approvals = await prisma.approval.findMany({
        where: { workflowId: workflowInstanceId }
      });

      return {
        total: approvals.length,
        approved: approvals.filter(a => a.status === WORKFLOW_CONSTANTS.APPROVAL_STATUS.APPROVED).length,
        rejected: approvals.filter(a => a.status === WORKFLOW_CONSTANTS.APPROVAL_STATUS.REJECTED).length,
        pending: approvals.filter(a => a.status === WORKFLOW_CONSTANTS.APPROVAL_STATUS.PENDING).length,
        delegated: approvals.filter(a => a.status === WORKFLOW_CONSTANTS.APPROVAL_STATUS.DELEGATED).length,
      };
    } catch (error) {
      logger.error('Failed to get approval stats', { error, workflowInstanceId });
      throw error;
    }
  }
}