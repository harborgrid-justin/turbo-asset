import { Router, Request, Response } from 'express';
import { logger } from '@/config/logger';
import { MoveManagementService } from '@/services/MoveManagementService';

const router = Router();
const moveService = new MoveManagementService();

/**
 * Get move requests with filtering and pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      organizationId,
      status,
      moveType,
      requestedById,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
      return;
    }

    const query = {
      organizationId: organizationId as string,
      status: status as string,
      moveType: moveType as string,
      requestedById: requestedById as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: Number(limit),
      offset: Number(offset),
    };

    const moveRequests = await moveService.searchMoveRequests(query);

    res.json(moveRequests);
  } catch (error: unknown) {
    logger.error('Failed to get move requests', error);
    res.status(500).json({
      error: 'Failed to get move requests',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Get move request by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
      return;
    }

    const moveRequest = await moveService.getMoveRequest(
      id,
      organizationId as string
    );

    res.json(moveRequest);
  } catch (error: unknown) {
    logger.error('Failed to get move request', error);
    if (error instanceof Error && (error as Error).message === 'Move request not found') {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to get move request',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * Create new move request
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      organizationId,
      requestedById,
      moveType,
      requestedDate,
      urgency,
      reason,
      description,
      estimatedCost,
      currency,
      moveDetails,
    } = req.body;

    // Validate required fields
    if (!organizationId || !requestedById || !moveType || !requestedDate) {
      res.status(400).json({
        error: 'Organization ID, requested by ID, move type, and requested date are required',
      });

      return;
      return;
    }

    // Validate move type
    const validMoveTypes = ['INTERNAL', 'EXTERNAL', 'NEW_HIRE', 'TERMINATION', 'RENOVATION', 'EXPANSION', 'CONSOLIDATION'];
    if (!validMoveTypes.includes(moveType)) {
      res.status(400).json({
        error: 'Invalid move type. Valid values are: ' + validMoveTypes.join(', '),
      });

      return;
      return;
    }

    // Validate urgency
    if (urgency) {
      const validUrgencies = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
      if (!validUrgencies.includes(urgency)) {
        res.status(400).json({
          error: 'Invalid urgency. Valid values are: ' + validUrgencies.join(', '),
        });

        return;
      return;
      }
    }

    const moveRequest = await moveService.createMoveRequest({
      organizationId,
      requestedById,
      moveType,
      requestedDate: new Date(requestedDate),
      urgency,
      reason,
      description,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      currency,
      moveDetails: moveDetails || [],
    });

    res.status(201).json(moveRequest);


    return;
  } catch (error: unknown) {
    logger.error('Failed to create move request', error);
    res.status(500).json({
      error: 'Failed to create move request',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Approve or reject move request
 */
router.patch('/:id/process', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      organizationId,
      approvedById,
      action,
      rejectionReason,
      scheduledDate,
    } = req.body;

    if (!organizationId || !approvedById || !action) {
      res.status(400).json({
        error: 'Organization ID, approved by ID, and action are required',
      });

      return;
      return;
    }

    // Validate action
    if (!['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({
        error: 'Action must be either APPROVE or REJECT',
      });

      return;
      return;
    }

    if (action === 'REJECT' && !rejectionReason) {
      res.status(400).json({
        error: 'Rejection reason is required when rejecting a move request',
      });

      return;
      return;
    }

    const processedRequest = await moveService.processMoveRequest(
      id,
      organizationId,
      approvedById,
      action,
      rejectionReason,
      scheduledDate ? new Date(scheduledDate) : undefined
    );

    res.json(processedRequest);
  } catch (error: unknown) {
    logger.error('Failed to process move request', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else if (error instanceof Error && (error as Error).message.includes('not authorized')) {
      res.status(403).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to process move request',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * Update move request status
 */
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { organizationId, status, completedDate } = req.body;

    if (!organizationId || !status) {
      res.status(400).json({
        error: 'Organization ID and status are required',
      });

      return;
      return;
    }

    // Validate status
    const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status. Valid values are: ' + validStatuses.join(', '),
      });

      return;
      return;
    }

    const updatedRequest = await moveService.updateMoveStatus(
      id,
      organizationId,
      status,
      completedDate ? new Date(completedDate) : undefined
    );

    res.json(updatedRequest);
  } catch (error: unknown) {
    logger.error('Failed to update move status', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to update move status',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * Add vendor to move request
 */
router.post('/:id/vendors', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      organizationId,
      vendorName,
      contactInfo,
      serviceType,
      quotedCost,
      currency,
      notes,
    } = req.body;

    if (!organizationId || !vendorName || !contactInfo || !serviceType) {
      res.status(400).json({
        error: 'Organization ID, vendor name, contact info, and service type are required',
      });

      return;
      return;
    }

    const vendor = await moveService.addVendor(id, organizationId, {
      vendorName,
      contactInfo,
      serviceType,
      quotedCost: quotedCost ? parseFloat(quotedCost) : undefined,
      currency,
      notes,
    });

    res.status(201).json(vendor);


    return;
  } catch (error: unknown) {
    logger.error('Failed to add vendor', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to add vendor',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * Select vendor for move request
 */
router.patch('/:id/vendors/:vendorId/select', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, vendorId } = req.params;
    const { organizationId, performanceRating } = req.body;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
      return;
    }

    // Validate performance rating if provided
    if (performanceRating && (performanceRating < 1 || performanceRating > 5)) {
      res.status(400).json({
        error: 'Performance rating must be between 1 and 5',
      });

      return;
      return;
    }

    const selectedVendor = await moveService.selectVendor(
      id,
      vendorId,
      organizationId,
      performanceRating ? parseInt(performanceRating) : undefined
    );

    res.json(selectedVendor);
  } catch (error: unknown) {
    logger.error('Failed to select vendor', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to select vendor',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * Add cost to move request
 */
router.post('/:id/costs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      organizationId,
      category,
      description,
      estimatedCost,
      actualCost,
      currency,
      invoiceNumber,
      paidAt,
    } = req.body;

    if (!organizationId || !category || !description) {
      res.status(400).json({
        error: 'Organization ID, category, and description are required',
      });

      return;
      return;
    }

    const cost = await moveService.addCost(id, organizationId, {
      category,
      description,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      actualCost: actualCost ? parseFloat(actualCost) : undefined,
      currency,
      invoiceNumber,
      paidAt: paidAt ? new Date(paidAt) : undefined,
    });

    res.status(201).json(cost);


    return;
  } catch (error: unknown) {
    logger.error('Failed to add cost', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to add cost',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * Get move analytics
 */
router.get('/analytics/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, startDate, endDate } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
      return;
    }

    const period = startDate && endDate ? {
      start: new Date(startDate as string),
      end: new Date(endDate as string),
    } : undefined;

    const analytics = await moveService.getMoveAnalytics(
      organizationId as string,
      period
    );

    res.json(analytics);
  } catch (error: unknown) {
    logger.error('Failed to get move analytics', error);
    res.status(500).json({
      error: 'Failed to get move analytics',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

export default router;