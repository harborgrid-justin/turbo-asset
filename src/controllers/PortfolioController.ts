import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';
import { PortfolioService } from '../services/PortfolioService';
import { SpaceUtilizationService } from '../services/SpaceUtilizationService';
import { MoveManagementService } from '../services/MoveManagementService';
import { ChargebackService } from '../services/ChargebackService';

const router = Router();
const portfolioService = new PortfolioService();
const utilizationService = new SpaceUtilizationService();
const moveService = new MoveManagementService();
const chargebackService = new ChargebackService();

/**
 * Get comprehensive portfolio dashboard
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { 
      organizationId,
      propertyIds,
      buildingIds,
      startDate,
      endDate,
      includeInactive = false
    } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
    }

    const query = {
      organizationId: organizationId as string,
      includeInactive: includeInactive === 'true',
      propertyIds: propertyIds ? (Array.isArray(propertyIds) ? propertyIds : [propertyIds]) as string[] : undefined,
      buildingIds: buildingIds ? (Array.isArray(buildingIds) ? buildingIds : [buildingIds]) as string[] : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const dashboard = await portfolioService.getPortfolioDashboard(query);

    res.json(dashboard);
  } catch (error: unknown) {
    logger.error('Failed to get portfolio dashboard', error);
    res.status(500).json({
      error: 'Failed to get portfolio dashboard',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Get property drill-down data
 */
router.get('/properties/:id/drilldown', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
    }

    const drillDown = await portfolioService.getPropertyDrillDown(
      id,
      organizationId as string
    );

    res.json(drillDown);
  } catch (error: unknown) {
    logger.error('Failed to get property drill-down', error);
    res.status(500).json({
      error: 'Failed to get property drill-down',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Get space utilization analytics
 */
router.get('/utilization/analytics', async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      spaceIds,
      buildingIds,
      floorIds,
      startDate,
      endDate,
      utilizationType,
      dataSource,
    } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
    }

    const query = {
      organizationId: organizationId as string,
      spaceIds: spaceIds ? (Array.isArray(spaceIds) ? spaceIds : [spaceIds]) as string[] : undefined,
      buildingIds: buildingIds ? (Array.isArray(buildingIds) ? buildingIds : [buildingIds]) as string[] : undefined,
      floorIds: floorIds ? (Array.isArray(floorIds) ? floorIds : [floorIds]) as string[] : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      utilizationType: utilizationType as string,
      dataSource: dataSource as string,
    };

    const analytics = await utilizationService.getUtilizationAnalytics(query);

    res.json(analytics);
  } catch (error: unknown) {
    logger.error('Failed to get utilization analytics', error);
    res.status(500).json({
      error: 'Failed to get utilization analytics',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Get real-time occupancy data
 */
router.get('/occupancy/realtime', async (req: Request, res: Response) => {
  try {
    const { organizationId, spaceIds } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
    }

    const spaceIdArray = spaceIds 
      ? (Array.isArray(spaceIds) ? spaceIds : [spaceIds]) as string[]
      : undefined;

    const realTimeData = await utilizationService.getRealTimeOccupancy(
      organizationId as string,
      spaceIdArray
    );

    res.json(realTimeData);
  } catch (error: unknown) {
    logger.error('Failed to get real-time occupancy', error);
    res.status(500).json({
      error: 'Failed to get real-time occupancy',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Get move analytics
 */
router.get('/moves/analytics', async (req: Request, res: Response) => {
  try {
    const { organizationId, startDate, endDate } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

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

/**
 * Get chargeback analytics
 */
router.get('/chargeback/analytics', async (req: Request, res: Response) => {
  try {
    const { organizationId, periodCount = 12 } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
    }

    const analytics = await chargebackService.getChargebackAnalytics(
      organizationId as string,
      Number(periodCount)
    );

    res.json(analytics);
  } catch (error: unknown) {
    logger.error('Failed to get chargeback analytics', error);
    res.status(500).json({
      error: 'Failed to get chargeback analytics',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Generate chargeback report
 */
router.get('/chargeback/report', async (req: Request, res: Response) => {
  try {
    const { organizationId, period, departmentId } = req.query;

    if (!organizationId || !period) {
      res.status(400).json({
        error: 'Organization ID and period are required',
      });

      return;
    }

    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period as string)) {
      res.status(400).json({
        error: 'Period must be in YYYY-MM format',
      });

      return;
    }

    const report = await chargebackService.generateChargebackReport(
      organizationId as string,
      period as string,
      departmentId as string
    );

    res.json(report);
  } catch (error: unknown) {
    logger.error('Failed to generate chargeback report', error);
    res.status(500).json({
      error: 'Failed to generate chargeback report',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Get utilization report
 */
router.get('/utilization/report', async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      spaceIds,
      buildingIds,
      floorIds,
      startDate,
      endDate,
      utilizationType,
      dataSource,
    } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
    }

    const query = {
      organizationId: organizationId as string,
      spaceIds: spaceIds ? (Array.isArray(spaceIds) ? spaceIds : [spaceIds]) as string[] : undefined,
      buildingIds: buildingIds ? (Array.isArray(buildingIds) ? buildingIds : [buildingIds]) as string[] : undefined,
      floorIds: floorIds ? (Array.isArray(floorIds) ? floorIds : [floorIds]) as string[] : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      utilizationType: utilizationType as string,
      dataSource: dataSource as string,
    };

    const report = await utilizationService.generateUtilizationReport(query);

    res.json(report);
  } catch (error: unknown) {
    logger.error('Failed to get utilization report', error);
    res.status(500).json({
      error: 'Failed to get utilization report',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Record utilization data (for sensor integration)
 */
router.post('/utilization/record', async (req: Request, res: Response) => {
  try {
    const { organizationId, records } = req.body;

    if (!organizationId || !records || !Array.isArray(records)) {
      res.status(400).json({
        error: 'Organization ID and records array are required',
      });

      return;
    }

    await utilizationService.recordUtilization(records);

    res.status(201).json({
      message: 'Utilization data recorded successfully',
      recordCount: records.length,
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to record utilization data', error);
    res.status(500).json({
      error: 'Failed to record utilization data',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Process sensor data
 */
router.post('/utilization/sensor-data', async (req: Request, res: Response) => {
  try {
    const { organizationId, sensorData } = req.body;

    if (!organizationId || !sensorData || !Array.isArray(sensorData)) {
      res.status(400).json({
        error: 'Organization ID and sensor data array are required',
      });

      return;
    }

    // Validate sensor data format
    for (const sensor of sensorData) {
      if (!sensor.sensorId || !sensor.spaceId || !sensor.data || !sensor.timestamp) {
        res.status(400).json({
          error: 'Each sensor data record must have sensorId, spaceId, data, and timestamp',
        });

        return;
      }
    }

    await utilizationService.processSensorData(sensorData);

    res.status(201).json({
      message: 'Sensor data processed successfully',
      sensorCount: sensorData.length,
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to process sensor data', error);
    res.status(500).json({
      error: 'Failed to process sensor data',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Get portfolio summary statistics
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { 
      organizationId,
      propertyIds,
      includeInactive = false
    } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
    }

    const query = {
      organizationId: organizationId as string,
      includeInactive: includeInactive === 'true',
      propertyIds: propertyIds ? (Array.isArray(propertyIds) ? propertyIds : [propertyIds]) as string[] : undefined,
    };

    const summary = await portfolioService.getPortfolioSummary(query);

    res.json(summary);
  } catch (error: unknown) {
    logger.error('Failed to get portfolio summary', error);
    res.status(500).json({
      error: 'Failed to get portfolio summary',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

export default router;