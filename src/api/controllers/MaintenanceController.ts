import express from 'express';
import { maintenanceService } from '@/services/MaintenanceService';
import { logger } from '@/config/logger';

const router = express.Router();

/**
 * @swagger
 * /api/maintenance/assets:
 *   get:
 *     summary: Search maintenance assets
 *     tags: [Maintenance]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Asset category filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Asset status filter
 *     responses:
 *       200:
 *         description: List of maintenance assets
 */
router.get('/assets', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const filters = {
      organizationId,
      category: req.query.category as string,
      status: req.query.status as string,
      condition: req.query.condition as string,
      criticality: req.query.criticality as string,
      location: req.query.location as string,
      building: req.query.building as string,
      manufacturer: req.query.manufacturer as string,
      model: req.query.model as string,
      maintenanceDue: req.query.maintenanceDue === 'true',
      warrantyExpiring: req.query.warrantyExpiring === 'true',
    };

    const result = await maintenanceService.searchAssets(
      filters,
      page,
      limit,
      req.query.sortBy as string,
      req.query.sortOrder as 'asc' | 'desc'
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Failed to search maintenance assets', error);
    res.status(500).json({
      error: 'Failed to search maintenance assets',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/maintenance/assets:
 *   post:
 *     summary: Create maintenance asset
 *     tags: [Maintenance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId:
 *                 type: string
 *               assetName:
 *                 type: string
 *               category:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset created successfully
 */
router.post('/assets', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const createdBy = req.headers['x-user-id'] as string;

    if (!organizationId || !createdBy) {
      return res.status(400).json({ error: 'Organization ID and User ID required' });
    }

    const assetData = {
      ...req.body,
      organizationId,
      createdBy,
    };

    const asset = await maintenanceService.createMaintenanceAsset(assetData);

    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (error: unknown) {
    logger.error('Failed to create maintenance asset', error);
    res.status(500).json({
      error: 'Failed to create maintenance asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/maintenance/assets/{id}:
 *   get:
 *     summary: Get maintenance asset by ID
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Maintenance asset details
 */
router.get('/assets/:id', async (req, res) => {
  try {
    const asset = await maintenanceService.getMaintenanceAsset(req.params.id);
    
    res.json({
      success: true,
      data: asset,
    });
  } catch (error: unknown) {
    logger.error('Failed to get maintenance asset', error);
    res.status(error instanceof Error && error.message === 'Maintenance asset not found' ? 404 : 500).json({
      error: 'Failed to get maintenance asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/maintenance/metrics:
 *   get:
 *     summary: Get maintenance metrics
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Maintenance metrics and analytics
 */
router.get('/metrics', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const metrics = await maintenanceService.getMaintenanceMetrics(organizationId);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error: unknown) {
    logger.error('Failed to get maintenance metrics', error);
    res.status(500).json({
      error: 'Failed to get maintenance metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/maintenance/assets/{id}/condition:
 *   put:
 *     summary: Update asset condition
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               condition:
 *                 type: string
 *               overallScore:
 *                 type: number
 *               assessmentType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asset condition updated
 */
router.put('/assets/:id/condition', async (req, res) => {
  try {
    const assetId = req.params.id;
    const assessedBy = req.headers['x-user-id'] as string;

    if (!assessedBy) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const conditionData = {
      ...req.body,
      assessedBy,
    };

    const result = await maintenanceService.updateAssetCondition(assetId, conditionData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Failed to update asset condition', error);
    res.status(500).json({
      error: 'Failed to update asset condition',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/maintenance/assets/condition-summary:
 *   post:
 *     summary: Get condition summary for multiple assets
 *     tags: [Maintenance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Asset condition summaries
 */
router.post('/assets/condition-summary', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { assetIds } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    if (!Array.isArray(assetIds)) {
      return res.status(400).json({ error: 'Asset IDs array required' });
    }

    const summary = await maintenanceService.getAssetConditionSummary(assetIds, organizationId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: unknown) {
    logger.error('Failed to get asset condition summary', error);
    res.status(500).json({
      error: 'Failed to get asset condition summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/maintenance/assets/lifecycle-analysis:
 *   post:
 *     summary: Perform lifecycle analysis for assets
 *     tags: [Maintenance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Lifecycle analysis results
 */
router.post('/assets/lifecycle-analysis', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { assetIds } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    if (!Array.isArray(assetIds)) {
      return res.status(400).json({ error: 'Asset IDs array required' });
    }

    const analysis = await maintenanceService.performLifecycleAnalysis(assetIds, organizationId);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error: unknown) {
    logger.error('Failed to perform lifecycle analysis', error);
    res.status(500).json({
      error: 'Failed to perform lifecycle analysis',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/maintenance/cost-analytics:
 *   get:
 *     summary: Get maintenance cost analytics
 *     tags: [Maintenance]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis
 *     responses:
 *       200:
 *         description: Cost analytics data
 */
router.get('/cost-analytics', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default: 1 year ago

    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string)
      : new Date(); // Default: now

    const analytics = await maintenanceService.getMaintenanceCostAnalytics(organizationId, startDate, endDate);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: unknown) {
    logger.error('Failed to get maintenance cost analytics', error);
    res.status(500).json({
      error: 'Failed to get maintenance cost analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/maintenance/assets/bulk-update:
 *   put:
 *     summary: Bulk update multiple assets
 *     tags: [Maintenance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     assetId:
 *                       type: string
 *                     data:
 *                       type: object
 *     responses:
 *       200:
 *         description: Bulk update results
 */
router.put('/assets/bulk-update', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { updates } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates array required' });
    }

    const result = await maintenanceService.bulkUpdateAssets(updates, organizationId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Failed to bulk update assets', error);
    res.status(500).json({
      error: 'Failed to bulk update assets',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;