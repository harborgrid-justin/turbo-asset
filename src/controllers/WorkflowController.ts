import { Router, Request, Response } from 'express';
import { WorkflowEngine } from '../services/WorkflowEngine';
import { logger } from '@/config/logger';

const router = Router();
const workflowEngine = new WorkflowEngine();

/**
 * Create workflow definition
 */
router.post('/definitions', async (req: Request, res: Response) => {
  try {
    const { organizationId, name, description, version, steps } = req.body;

    if (!organizationId || !name || !steps) {
      res.status(400).json({
        error: 'Organization ID, name, and steps are required',
      });

      return;
    }

    const workflowDefinition = {
      name,
      description,
      version: version || '1.0',
      startStep: steps[0]?.id,
      steps,
    };

    const definitionId = await workflowEngine.createWorkflowDefinition(
      organizationId,
      workflowDefinition
    );

    res.status(201).json({
      id: definitionId,
      message: 'Workflow definition created successfully',
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to create workflow definition', error);
    res.status(500).json({
      error: 'Failed to create workflow definition',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Start workflow instance
 */
router.post('/instances', async (req: Request, res: Response) => {
  try {
    const { definitionId, initiatedById, data, priority } = req.body;

    if (!definitionId || !initiatedById) {
      res.status(400).json({
        error: 'Definition ID and initiated by ID are required',
      });

      return;
    }

    const instanceId = await workflowEngine.startWorkflow(
      definitionId,
      initiatedById,
      data || {},
      priority || 'NORMAL'
    );

    res.status(201).json({
      id: instanceId,
      message: 'Workflow instance started successfully',
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to start workflow instance', error);
    res.status(500).json({
      error: 'Failed to start workflow instance',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Process approval
 */
router.post('/approvals/:approvalId/process', async (req: Request, res: Response) => {
  try {
    const { approvalId } = req.params;
    const { approverId, decision, comments } = req.body;

    if (!approverId || !decision) {
      res.status(400).json({
        error: 'Approver ID and decision are required',
      });

      return;
    }

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      res.status(400).json({
        error: 'Decision must be APPROVED or REJECTED',
      });

      return;
    }

    await workflowEngine.processApproval(
      approvalId,
      approverId,
      decision,
      comments
    );

    res.json({
      message: 'Approval processed successfully',
    });
  } catch (error: unknown) {
    logger.error('Failed to process approval', error);
    res.status(500).json({
      error: 'Failed to process approval',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

export default router;