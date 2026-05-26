import { Router, Request, Response } from 'express';
import { InventoryService } from '@/services/InventoryService';
import { logger } from '@/config/logger';

const router = Router();
const inventoryService = new InventoryService();

/** Organization scope comes from the query (?organizationId=) or the token. */
const resolveOrgId = (req: Request): string | undefined =>
  (req.query.organizationId as string | undefined) ?? req.user?.organizationId;

/**
 * GET /api/inventory
 * Search/list inventory items for an organization with optional filters.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = resolveOrgId(req);
    if (!organizationId) {
      res.status(400).json({ error: 'organizationId is required' });
      return;
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);
    const filters = {
      organizationId,
      category: req.query.category as string | undefined,
      status: req.query.status as string | undefined,
      location: req.query.location as string | undefined,
      warehouse: req.query.warehouse as string | undefined,
    };

    const result = await inventoryService.searchInventoryItems(filters, page, limit);
    res.json(result);
  } catch (error: unknown) {
    logger.error('Failed to search inventory', error);
    res.status(500).json({
      error: 'Failed to search inventory',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/inventory/metrics
 * Aggregate inventory metrics (stock levels, reorder alerts, turnover) for an org.
 */
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = resolveOrgId(req);
    if (!organizationId) {
      res.status(400).json({ error: 'organizationId is required' });
      return;
    }

    const metrics = await inventoryService.getInventoryMetrics(organizationId);
    res.json(metrics);
  } catch (error: unknown) {
    logger.error('Failed to get inventory metrics', error);
    res.status(500).json({
      error: 'Failed to get inventory metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
