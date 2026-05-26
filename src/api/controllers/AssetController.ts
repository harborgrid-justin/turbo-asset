import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

const router = Router();

const DEFAULT_LIMIT = 50;

/**
 * List assets. Supports optional buildingId / status / type filters and
 * limit/offset pagination. Queries are flat (the data adapter does not join),
 * and all filter values are passed as bound parameters by the adapter.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { buildingId, status, type, limit, offset } = req.query;

    const where: Record<string, unknown> = { isActive: true };
    if (typeof buildingId === 'string') where.buildingId = buildingId;
    if (typeof status === 'string') where.status = status;
    if (typeof type === 'string') where.type = type;

    const take = Number(limit ?? DEFAULT_LIMIT);
    const skip = Number(offset ?? 0);

    const assets = await prisma.asset.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      assets,
      pagination: { limit: take, offset: skip, total: assets.length },
    });
  } catch (error: unknown) {
    logger.error('Failed to list assets', error);
    res.status(500).json({
      error: 'Failed to list assets',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get a single asset by id.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findFirst({ where: { id } });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    res.json(asset);
  } catch (error: unknown) {
    logger.error('Failed to get asset', error);
    res.status(500).json({
      error: 'Failed to get asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create an asset. name, assetTag and type are required.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { name, assetTag, type } = body;

    if (
      typeof name !== 'string' ||
      typeof assetTag !== 'string' ||
      typeof type !== 'string'
    ) {
      res.status(400).json({ error: 'name, assetTag and type are required' });
      return;
    }

    const data: Record<string, unknown> = {
      name,
      assetTag,
      type,
      isActive: true,
    };
    for (const field of [
      'category',
      'manufacturer',
      'model',
      'serialNumber',
      'purchaseDate',
      'purchasePrice',
      'currency',
      'warrantyExpiry',
      'condition',
      'status',
      'description',
      'buildingId',
      'spaceId',
      'parentAssetId',
    ]) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    const asset = await prisma.asset.create({ data });
    logger.info('Asset created', { assetId: asset?.id, assetTag });
    res.status(201).json(asset);
  } catch (error: unknown) {
    logger.error('Failed to create asset', error);
    res.status(500).json({
      error: 'Failed to create asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update an asset by id (partial update of mutable fields).
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const existing = await prisma.asset.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const data: Record<string, unknown> = {};
    for (const field of [
      'name',
      'category',
      'manufacturer',
      'model',
      'serialNumber',
      'purchaseDate',
      'purchasePrice',
      'currency',
      'warrantyExpiry',
      'condition',
      'status',
      'description',
      'buildingId',
      'spaceId',
      'parentAssetId',
      'isActive',
    ]) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    const asset = await prisma.asset.update({ where: { id }, data });
    logger.info('Asset updated', { assetId: id });
    res.json(asset);
  } catch (error: unknown) {
    logger.error('Failed to update asset', error);
    res.status(500).json({
      error: 'Failed to update asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Soft-delete an asset by id (sets isActive = false).
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.asset.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    await prisma.asset.update({ where: { id }, data: { isActive: false } });
    logger.info('Asset soft-deleted', { assetId: id });
    res.json({ success: true });
  } catch (error: unknown) {
    logger.error('Failed to delete asset', error);
    res.status(500).json({
      error: 'Failed to delete asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
