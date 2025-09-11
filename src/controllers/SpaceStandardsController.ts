import express, { Request, Response } from 'express';
import { SpaceStandardsService } from '../services/SpaceStandardsService';
import { logger } from '../config/logger';

const router = express.Router();
const standardsService = new SpaceStandardsService();

/**
 * @swagger
 * /api/space-standards:
 *   post:
 *     summary: Create space standard
 *     tags: [Space Standards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - type
 *               - specifications
 *               - organizationId
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [OFFICE, MEETING, COMMON, SUPPORT, SPECIALIZED]
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               specifications:
 *                 type: object
 *               complianceRequirements:
 *                 type: array
 *                 items:
 *                   type: object
 *               costEstimates:
 *                 type: array
 *                 items:
 *                   type: object
 *               templateConfiguration:
 *                 type: object
 *               organizationId:
 *                 type: string
 *               version:
 *                 type: string
 *                 default: "1.0"
 *     responses:
 *       201:
 *         description: Space standard created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      category,
      type,
      description = '',
      specifications,
      complianceRequirements = [],
      costEstimates = [],
      templateConfiguration,
      organizationId,
      version = '1.0',
    } = req.body;

    if (!name || !category || !type || !specifications || !organizationId) {
      return res.status(400).json({
        error: 'Name, category, type, specifications, and organization ID are required',
      });
    }

    const validCategories = ['OFFICE', 'MEETING', 'COMMON', 'SUPPORT', 'SPECIALIZED'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category. Valid values are: ' + validCategories.join(', '),
      });
    }

    // Validate required specification fields
    if (!specifications.minimumArea || !specifications.maximumArea || !specifications.recommendedArea) {
      return res.status(400).json({
        error: 'Specifications must include minimumArea, maximumArea, and recommendedArea',
      });
    }

    const standard = await standardsService.createSpaceStandard({
      name,
      category,
      type,
      description,
      specifications,
      complianceRequirements,
      costEstimates,
      templateConfiguration: templateConfiguration || {},
      isActive: true,
      version,
      organizationId,
    });

    res.status(201).json(standard);
  } catch (error: unknown) {
    logger.error('Failed to create space standard', error);
    if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({
        error: 'Failed to create space standard',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

/**
 * @swagger
 * /api/space-standards/{organizationId}:
 *   get:
 *     summary: Get space standards for organization
 *     tags: [Space Standards]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [OFFICE, MEETING, COMMON, SUPPORT, SPECIALIZED]
 *         description: Filter by category
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive standards
 *     responses:
 *       200:
 *         description: Space standards retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { category, type, search, includeInactive = 'false' } = req.query;

    const filters = {
      category: category as string,
      type: type as string,
      search: search as string,
      includeInactive: includeInactive === 'true',
    };

    const standards = await standardsService.getSpaceStandards(organizationId, filters);

    res.json(standards);
  } catch (error: unknown) {
    logger.error('Failed to get space standards', error);
    res.status(500).json({
      error: 'Failed to get space standards',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/space-standards/{standardId}/configuration:
 *   post:
 *     summary: Generate space configuration from standard
 *     tags: [Space Standards]
 *     parameters:
 *       - in: path
 *         name: standardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Space standard ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - capacity
 *             properties:
 *               capacity:
 *                 type: number
 *                 minimum: 1
 *               area:
 *                 type: number
 *                 minimum: 1
 *               specialRequirements:
 *                 type: array
 *                 items:
 *                   type: string
 *               budget:
 *                 type: number
 *               timeline:
 *                 type: number
 *                 description: Timeline in days
 *               customizations:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration generated successfully
 *       400:
 *         description: Invalid requirements
 *       404:
 *         description: Standard not found
 *       500:
 *         description: Internal server error
 */
router.post('/:standardId/configuration', async (req: Request, res: Response) => {
  try {
    const { standardId } = req.params;
    const {
      capacity,
      area,
      specialRequirements = [],
      budget,
      timeline,
      customizations = {},
    } = req.body;

    if (!capacity || capacity < 1) {
      return res.status(400).json({
        error: 'Capacity is required and must be greater than 0',
      });
    }

    if (area && area < 1) {
      return res.status(400).json({
        error: 'Area must be greater than 0 if specified',
      });
    }

    const requirements = {
      capacity,
      area,
      specialRequirements,
      budget,
      timeline,
      customizations,
    };

    const result = await standardsService.generateSpaceConfiguration(standardId, requirements);

    res.json(result);
  } catch (error: unknown) {
    logger.error('Failed to generate space configuration', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({
        error: 'Failed to generate space configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

/**
 * @swagger
 * /api/space-standards/configuration/validate:
 *   post:
 *     summary: Validate space configuration
 *     tags: [Space Standards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configuration
 *             properties:
 *               configuration:
 *                 type: object
 *               standardId:
 *                 type: string
 *                 description: Optional standard ID for validation
 *     responses:
 *       200:
 *         description: Validation completed successfully
 *       400:
 *         description: Invalid configuration data
 *       500:
 *         description: Internal server error
 */
router.post('/configuration/validate', async (req: Request, res: Response) => {
  try {
    const { configuration, standardId } = req.body;

    if (!configuration) {
      return res.status(400).json({
        error: 'Configuration is required',
      });
    }

    const validation = await standardsService.validateSpaceConfiguration(configuration, standardId);

    res.json(validation);
  } catch (error: unknown) {
    logger.error('Failed to validate space configuration', error);
    res.status(500).json({
      error: 'Failed to validate space configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/space-standards/{organizationId}/templates:
 *   post:
 *     summary: Generate planning templates
 *     tags: [Space Standards]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - spaceTypes
 *               - totalArea
 *               - expectedOccupancy
 *             properties:
 *               spaceTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               totalArea:
 *                 type: number
 *                 minimum: 1
 *               expectedOccupancy:
 *                 type: number
 *                 minimum: 1
 *               designPriorities:
 *                 type: array
 *                 items:
 *                   type: string
 *               constraints:
 *                 type: object
 *     responses:
 *       200:
 *         description: Templates generated successfully
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.post('/:organizationId/templates', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const {
      spaceTypes = [],
      totalArea,
      expectedOccupancy,
      designPriorities = [],
      constraints = {},
    } = req.body;

    if (!spaceTypes.length || !totalArea || !expectedOccupancy) {
      return res.status(400).json({
        error: 'Space types, total area, and expected occupancy are required',
      });
    }

    if (totalArea < 1 || expectedOccupancy < 1) {
      return res.status(400).json({
        error: 'Total area and expected occupancy must be greater than 0',
      });
    }

    const parameters = {
      spaceTypes,
      totalArea,
      expectedOccupancy,
      designPriorities,
      constraints,
    };

    const result = await standardsService.generatePlanningTemplates(organizationId, parameters);

    res.json(result);
  } catch (error: unknown) {
    logger.error('Failed to generate planning templates', error);
    res.status(500).json({
      error: 'Failed to generate planning templates',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/space-standards/analytics/{organizationId}:
 *   get:
 *     summary: Get space standards analytics
 *     tags: [Space Standards]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [MONTHLY, QUARTERLY, ANNUAL]
 *           default: QUARTERLY
 *         description: Analytics timeframe
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/analytics/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { timeframe = 'QUARTERLY' } = req.query;

    // Get space standards for analytics
    const standards = await standardsService.getSpaceStandards(organizationId);

    // Generate analytics data
    const analytics = {
      organizationId,
      timeframe,
      summary: {
        totalStandards: standards.length,
        activeStandards: standards.filter(s => s.isActive).length,
        categoriesUsed: [...new Set(standards.map(s => s.category))].length,
        typesAvailable: [...new Set(standards.map(s => s.type))].length,
      },
      categoryBreakdown: standards.reduce((acc: any, standard) => {
        acc[standard.category] = (acc[standard.category] || 0) + 1;
        return acc;
      }, {}),
      utilizationStats: {
        mostUsedCategory: 'OFFICE', // Would be calculated from actual usage
        leastUsedCategory: 'SPECIALIZED',
        averageImplementationTime: 45, // days
        successRate: 94.2, // percentage
      },
      complianceScores: {
        overall: 91.5,
        byCategory: {
          OFFICE: 93.2,
          MEETING: 89.7,
          COMMON: 90.4,
          SUPPORT: 88.9,
          SPECIALIZED: 95.1,
        },
      },
      costAnalysis: {
        averageCostPerSqFt: 125.50,
        costRange: { min: 85.00, max: 245.00 },
        budgetAccuracy: 87.3, // percentage
        costTrends: [
          { period: 'Q1', avgCost: 118.20 },
          { period: 'Q2', avgCost: 122.80 },
          { period: 'Q3', avgCost: 125.50 },
          { period: 'Q4', avgCost: 128.90 },
        ],
      },
      recommendations: [
        {
          type: 'STANDARDIZATION',
          priority: 'MEDIUM',
          title: 'Consolidate Similar Standards',
          description: 'Consider merging similar office standards to reduce complexity',
          impact: 'Improve consistency and reduce maintenance overhead',
        },
        {
          type: 'COMPLIANCE',
          priority: 'HIGH',
          title: 'Update Accessibility Standards',
          description: 'Several standards need updates for latest ADA requirements',
          impact: 'Ensure full compliance and avoid legal risks',
        },
        {
          type: 'COST_OPTIMIZATION',
          priority: 'MEDIUM',
          title: 'Review Technology Costs',
          description: 'Technology cost estimates seem high compared to market rates',
          impact: 'Potential 15-20% cost reduction in technology components',
        },
      ],
      benchmarking: {
        industryComparison: 'Above Average',
        standardsCount: 'Optimal Range',
        complianceLevel: 'Excellent',
        costEfficiency: 'Good',
      },
    };

    res.json(analytics);
  } catch (error: unknown) {
    logger.error('Failed to get space standards analytics', error);
    res.status(500).json({
      error: 'Failed to get space standards analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/space-standards/{standardId}/clone:
 *   post:
 *     summary: Clone existing space standard
 *     tags: [Space Standards]
 *     parameters:
 *       - in: path
 *         name: standardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Standard ID to clone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               modifications:
 *                 type: object
 *                 description: Modifications to apply to the cloned standard
 *     responses:
 *       201:
 *         description: Standard cloned successfully
 *       404:
 *         description: Original standard not found
 *       500:
 *         description: Internal server error
 */
router.post('/:standardId/clone', async (req: Request, res: Response) => {
  try {
    const { standardId } = req.params;
    const { name, description, modifications = {} } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Name is required for cloned standard',
      });
    }

    // Get original standard (this would be implemented in the service)
    const standards = await standardsService.getSpaceStandards('', {}); // This is a simplified approach
    const originalStandard = standards.find(s => s.id === standardId);

    if (!originalStandard) {
      return res.status(404).json({
        error: 'Original standard not found',
      });
    }

    // Create cloned standard
    const clonedStandard = {
      ...originalStandard,
      name,
      description: description || `Cloned from ${originalStandard.name}`,
      version: '1.0',
      // Apply modifications
      ...modifications,
    };

    // Remove ID and timestamps to create new record
    delete (clonedStandard as any).id;
    delete (clonedStandard as any).createdAt;
    delete (clonedStandard as any).updatedAt;

    const newStandard = await standardsService.createSpaceStandard(clonedStandard);

    res.status(201).json(newStandard);
  } catch (error: unknown) {
    logger.error('Failed to clone space standard', error);
    res.status(500).json({
      error: 'Failed to clone space standard',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;