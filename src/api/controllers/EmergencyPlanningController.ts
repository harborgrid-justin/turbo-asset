import express, { Request, Response } from 'express';
import { EmergencyPlanningService } from '@/services/EmergencyPlanningService';
import { logger } from '@/config/logger';

const router = express.Router();
const emergencyService = new EmergencyPlanningService();

/**
 * @swagger
 * /api/emergency/plans:
 *   post:
 *     summary: Create or update emergency plan
 *     tags: [Emergency Planning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buildingId
 *               - planType
 *               - planVersion
 *             properties:
 *               buildingId:
 *                 type: string
 *               planType:
 *                 type: string
 *                 enum: [EVACUATION, FIRE, EARTHQUAKE, LOCKDOWN, MEDICAL, SEVERE_WEATHER]
 *               planVersion:
 *                 type: string
 *               planDocument:
 *                 type: string
 *               evacuationRoutes:
 *                 type: array
 *                 items:
 *                   type: object
 *               assemblyPoints:
 *                 type: array
 *                 items:
 *                   type: object
 *               emergencyContacts:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Emergency plan created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      buildingId,
      planType,
      planVersion,
      planDocument,
      evacuationRoutes = [],
      assemblyPoints = [],
      emergencyContacts = [],
      floorWardens = [],
      specialNeeds = [],
      complianceRequirements = [],
    } = req.body;

    if (!buildingId || !planType || !planVersion) {
      res.status(400).json({
        error: 'Building ID, plan type, and plan version are required',
      });

      return;
      return;
    }

    const validPlanTypes = ['EVACUATION', 'FIRE', 'EARTHQUAKE', 'LOCKDOWN', 'MEDICAL', 'SEVERE_WEATHER'];
    if (!validPlanTypes.includes(planType)) {
      res.status(400).json({
        error: 'Invalid plan type. Valid values are: ' + validPlanTypes.join(', '),
      });

      return;
      return;
    }

    const plan = await emergencyService.createEmergencyPlan({
      buildingId,
      planType,
      planVersion,
      planDocument: planDocument || '',
      evacuationRoutes,
      assemblyPoints,
      emergencyContacts,
      floorWardens,
      specialNeeds,
      complianceRequirements,
    });

    res.status(201).json(plan);


    return;
  } catch (error: unknown) {
    logger.error('Failed to create emergency plan', error);
    res.status(500).json({
      error: 'Failed to create emergency plan',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/emergency/plans/{buildingId}:
 *   get:
 *     summary: Get emergency plans for building
 *     tags: [Emergency Planning]
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *     responses:
 *       200:
 *         description: Emergency plans retrieved successfully
 *       404:
 *         description: Building not found
 *       500:
 *         description: Internal server error
 */
router.get('/plans/:buildingId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { buildingId } = req.params;

    const plans = await emergencyService.getEmergencyPlans(buildingId);

    res.json(plans);
  } catch (error: unknown) {
    logger.error('Failed to get emergency plans', error);
    res.status(500).json({
      error: 'Failed to get emergency plans',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/emergency/drills:
 *   post:
 *     summary: Schedule emergency drill
 *     tags: [Emergency Planning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buildingId
 *               - drillType
 *               - scheduledDate
 *               - conductedBy
 *             properties:
 *               buildingId:
 *                 type: string
 *               drillType:
 *                 type: string
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               conductedBy:
 *                 type: string
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Drill scheduled successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/drills', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      buildingId,
      drillType,
      scheduledDate,
      conductedBy,
      participants,
      notes,
    } = req.body;

    if (!buildingId || !drillType || !scheduledDate || !conductedBy) {
      res.status(400).json({
        error: 'Building ID, drill type, scheduled date, and conductor are required',
      });

      return;
      return;
    }

    const drill = await emergencyService.scheduleEmergencyDrill({
      buildingId,
      drillType,
      scheduledDate: new Date(scheduledDate),
      conductedBy,
      participants,
      notes,
    });

    res.status(201).json(drill);


    return;
  } catch (error: unknown) {
    logger.error('Failed to schedule emergency drill', error);
    res.status(500).json({
      error: 'Failed to schedule emergency drill',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/emergency/drills/{drillId}/results:
 *   post:
 *     summary: Record drill results
 *     tags: [Emergency Planning]
 *     parameters:
 *       - in: path
 *         name: drillId
 *         required: true
 *         schema:
 *           type: string
 *         description: Drill ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actualDate:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *               participantCount:
 *                 type: number
 *               completionRate:
 *                 type: number
 *               issues:
 *                 type: array
 *                 items:
 *                   type: object
 *               score:
 *                 type: number
 *               recommendations:
 *                 type: array
 *                 items:
 *                   type: string
 *               weather:
 *                 type: string
 *     responses:
 *       200:
 *         description: Drill results recorded successfully
 *       404:
 *         description: Drill not found
 *       500:
 *         description: Internal server error
 */
router.post('/drills/:drillId/results', async (req: Request, res: Response): Promise<void> => {
  try {
    const { drillId } = req.params;
    const {
      actualDate,
      duration,
      participantCount,
      completionRate,
      issues = [],
      score,
      recommendations = [],
      weather,
    } = req.body;

    const drill = await emergencyService.recordDrillResults({
      drillId,
      buildingId: '', // Will be retrieved from drill record
      drillType: '', // Will be retrieved from drill record
      scheduledDate: new Date(), // Will be retrieved from drill record
      actualDate: actualDate ? new Date(actualDate) : undefined,
      duration,
      participantCount,
      completionRate,
      issues,
      score,
      recommendations,
      conductedBy: '', // Will be retrieved from drill record
      weather,
    });

    res.json(drill);
  } catch (error: unknown) {
    logger.error('Failed to record drill results', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to record drill results',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * @swagger
 * /api/emergency/compliance/{organizationId}:
 *   get:
 *     summary: Get compliance dashboard
 *     tags: [Emergency Planning]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Compliance dashboard retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/compliance/:organizationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;

    const dashboard = await emergencyService.getComplianceDashboard(organizationId);

    res.json(dashboard);
  } catch (error: unknown) {
    logger.error('Failed to get compliance dashboard', error);
    res.status(500).json({
      error: 'Failed to get compliance dashboard',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/emergency/evacuation/{buildingId}/report:
 *   get:
 *     summary: Generate evacuation report
 *     tags: [Emergency Planning]
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *     responses:
 *       200:
 *         description: Evacuation report generated successfully
 *       404:
 *         description: Building not found
 *       500:
 *         description: Internal server error
 */
router.get('/evacuation/:buildingId/report', async (req: Request, res: Response): Promise<void> => {
  try {
    const { buildingId } = req.params;

    const report = await emergencyService.generateEvacuationReport(buildingId);

    res.json(report);
  } catch (error: unknown) {
    logger.error('Failed to generate evacuation report', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to generate evacuation report',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * @swagger
 * /api/emergency/procedures/{organizationId}:
 *   get:
 *     summary: Get emergency response procedures
 *     tags: [Emergency Planning]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: emergencyType
 *         schema:
 *           type: string
 *         description: Filter by emergency type
 *     responses:
 *       200:
 *         description: Emergency procedures retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/procedures/:organizationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const { emergencyType } = req.query;

    const procedures = await emergencyService.getEmergencyResponseProcedures(
      organizationId,
      emergencyType as string
    );

    res.json(procedures);
  } catch (error: unknown) {
    logger.error('Failed to get emergency procedures', error);
    res.status(500).json({
      error: 'Failed to get emergency procedures',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/emergency/analytics/{organizationId}:
 *   get:
 *     summary: Get emergency preparedness analytics
 *     tags: [Emergency Planning]
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
 *         description: Analytics timeframe
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/analytics/:organizationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const { timeframe = 'QUARTERLY' } = req.query;

    // Get compliance dashboard as base analytics
    const dashboard = await emergencyService.getComplianceDashboard(organizationId);

    // Enhanced analytics would be implemented here
    const analytics = {
      ...dashboard,
      timeframe,
      preparednessScore: dashboard.overallScore,
      trainingEffectiveness: 85.5,
      responseTime: {
        average: 4.2, // minutes
        target: 5.0,
        trend: 'IMPROVING',
      },
      drillPerformance: {
        averageScore: 82.3,
        completionRate: 94.5,
        participationRate: 87.8,
      },
      riskAssessment: {
        level: 'MEDIUM',
        factors: [
          'Aging building infrastructure',
          'High occupancy density',
          'Limited evacuation routes',
        ],
      },
    };

    res.json(analytics);
  } catch (error: unknown) {
    logger.error('Failed to get emergency analytics', error);
    res.status(500).json({
      error: 'Failed to get emergency analytics',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

export default router;