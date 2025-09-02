/**
 * Workflow Definition Service - Manages workflow templates and definitions
 * 
 * Handles CRUD operations for workflow definitions, versioning, and validation
 * Part of the Workflow Management domain within Turbo Asset IWMS
 */

import { prisma } from '../../../../../src/config/database';
import { logger } from '../../../../../src/config/logger';
import { WorkflowDefinition } from '../types/WorkflowTypes';

export class WorkflowDefinitionService {
  /**
   * Create a new workflow definition
   */
  async createWorkflowDefinition(
    organizationId: string,
    workflow: Omit<WorkflowDefinition, 'id'>
  ): Promise<string> {
    try {
      // Validate workflow definition
      this.validateWorkflowDefinition(workflow);

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
      logger.error('Failed to create workflow definition', { error, organizationId });
      throw error;
    }
  }

  /**
   * Get workflow definition by ID
   */
  async getWorkflowDefinition(definitionId: string): Promise<WorkflowDefinition | null> {
    try {
      const definition = await prisma.workflowDefinition.findUnique({
        where: { id: definitionId }
      });

      if (!definition) {
        return null;
      }

      return definition.definition as WorkflowDefinition;
    } catch (error) {
      logger.error('Failed to get workflow definition', { error, definitionId });
      throw error;
    }
  }

  /**
   * Update workflow definition
   */
  async updateWorkflowDefinition(
    definitionId: string,
    updates: Partial<Omit<WorkflowDefinition, 'id'>>
  ): Promise<void> {
    try {
      const current = await prisma.workflowDefinition.findUnique({
        where: { id: definitionId }
      });

      if (!current) {
        throw new Error('Workflow definition not found');
      }

      const updated = { ...(current.definition as WorkflowDefinition), ...updates };
      this.validateWorkflowDefinition(updated);

      await prisma.workflowDefinition.update({
        where: { id: definitionId },
        data: {
          name: updated.name,
          description: updated.description,
          version: updated.version,
          definition: updated as any,
          updatedAt: new Date()
        }
      });

      logger.info('Workflow definition updated', { definitionId });
    } catch (error) {
      logger.error('Failed to update workflow definition', { error, definitionId });
      throw error;
    }
  }

  /**
   * Delete workflow definition
   */
  async deleteWorkflowDefinition(definitionId: string): Promise<void> {
    try {
      // Check if there are active instances
      const activeInstances = await prisma.workflowInstance.count({
        where: {
          definitionId,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      });

      if (activeInstances > 0) {
        throw new Error('Cannot delete workflow definition with active instances');
      }

      await prisma.workflowDefinition.delete({
        where: { id: definitionId }
      });

      logger.info('Workflow definition deleted', { definitionId });
    } catch (error) {
      logger.error('Failed to delete workflow definition', { error, definitionId });
      throw error;
    }
  }

  /**
   * List workflow definitions for an organization
   */
  async listWorkflowDefinitions(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
    } = {}
  ): Promise<{ definitions: WorkflowDefinition[]; total: number }> {
    try {
      const { page = 1, limit = 20, search } = options;
      const skip = (page - 1) * limit;

      const where: any = { organizationId };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [definitions, total] = await Promise.all([
        prisma.workflowDefinition.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.workflowDefinition.count({ where })
      ]);

      return {
        definitions: definitions.map(d => d.definition as WorkflowDefinition),
        total
      };
    } catch (error) {
      logger.error('Failed to list workflow definitions', { error, organizationId });
      throw error;
    }
  }

  /**
   * Validate workflow definition structure
   */
  private validateWorkflowDefinition(workflow: Omit<WorkflowDefinition, 'id'>): void {
    if (!workflow.name || !workflow.startStep || !workflow.steps) {
      throw new Error('Invalid workflow definition: missing required fields');
    }

    if (!workflow.steps.find(s => s.id === workflow.startStep)) {
      throw new Error('Invalid workflow definition: start step not found in steps');
    }

    // Validate step references
    for (const step of workflow.steps) {
      if (step.nextSteps) {
        for (const nextStepId of step.nextSteps) {
          if (!workflow.steps.find(s => s.id === nextStepId)) {
            throw new Error(`Invalid workflow definition: step ${nextStepId} referenced but not found`);
          }
        }
      }
    }
  }
}