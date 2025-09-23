import express, { Request, Response } from 'express';
import { SpaceUtilizationService } from '../services/SpaceUtilizationService';
import { PortfolioService } from '../services/PortfolioService';
import { logger } from '@/config/logger';

const router = express.Router();
const utilizationService = new SpaceUtilizationService();
const portfolioService = new PortfolioService();

/**
 * @swagger
 * /api/space-analytics/utilization/{organizationId}/predictive:
 *   get:
 *     summary: Get predictive space planning analytics
 *     tags: [Space Analytics]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: timeHorizon
 *         schema:
 *           type: number
 *           default: 90
 *         description: Prediction time horizon in days
 *     responses:
 *       200:
 *         description: Predictive analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/utilization/:organizationId/predictive', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { timeHorizon = '90' } = req.query;

    const analytics = await utilizationService.getPredictiveSpacePlanning(
      organizationId,
      parseInt(timeHorizon as string)
    );

    res.json(analytics);
  } catch (error: unknown) {
    logger.error('Failed to get predictive space analytics', error);
    res.status(500).json({
      error: 'Failed to get predictive space analytics',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/space-analytics/sensor-data:
 *   post:
 *     summary: Process real-time sensor data
 *     tags: [Space Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sensorData:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     sensorId:
 *                       type: string
 *                     spaceId:
 *                       type: string
 *                     sensorType:
 *                       type: string
 *                       enum: [OCCUPANCY, TEMPERATURE, CO2, FOOT_TRAFFIC, NOISE]
 *                     value:
 *                       type: number
 *                     unit:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     metadata:
 *                       type: object
 *     responses:
 *       200:
 *         description: Sensor data processed successfully
 *       400:
 *         description: Invalid sensor data
 *       500:
 *         description: Internal server error
 */
router.post('/sensor-data', async (req: Request, res: Response) => {
  try {
    const { sensorData = [] } = req.body;

    if (!Array.isArray(sensorData) || sensorData.length === 0) {
      res.status(400).json({
        error: 'Sensor data array is required and cannot be empty',
      });

      return;
    }

    // Validate sensor data structure
    for (const data of sensorData) {
      if (!data.sensorId || !data.spaceId || !data.sensorType || typeof data.value !== 'number') {
        res.status(400).json({
          error: 'Each sensor data entry must have sensorId, spaceId, sensorType, and value',
        });

        return;
      }
    }

    // Transform data to match service interface
    const processedData = sensorData.map((data: any) => ({
      sensorId: data.sensorId,
      spaceId: data.spaceId,
      sensorType: data.sensorType,
      value: data.value,
      unit: data.unit || 'COUNT',
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      metadata: data.metadata,
    }));

    const result = await utilizationService.processRealtimeSensorData(processedData);

    res.json(result);
  } catch (error: unknown) {
    logger.error('Failed to process sensor data', error);
    res.status(500).json({
      error: 'Failed to process sensor data',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/space-analytics/enterprise/{organizationId}/insights:
 *   get:
 *     summary: Get enterprise-scale occupancy insights
 *     tags: [Space Analytics]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: includeSubsidiaries
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include subsidiary data
 *       - in: query
 *         name: aggregationLevel
 *         schema:
 *           type: string
 *           enum: [SPACE, FLOOR, BUILDING, PROPERTY]
 *           default: BUILDING
 *         description: Data aggregation level
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [REAL_TIME, DAILY, WEEKLY, MONTHLY]
 *           default: DAILY
 *         description: Time range for analysis
 *     responses:
 *       200:
 *         description: Enterprise insights retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/enterprise/:organizationId/insights', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const {
      includeSubsidiaries = 'false',
      aggregationLevel = 'BUILDING',
      timeRange = 'DAILY',
    } = req.query;

    const options = {
      includeSubsidiaries: includeSubsidiaries === 'true',
      aggregationLevel: aggregationLevel as 'SPACE' | 'FLOOR' | 'BUILDING' | 'PROPERTY',
      timeRange: timeRange as 'REAL_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
    };

    const insights = await utilizationService.getEnterpriseOccupancyInsights(organizationId, options);

    res.json(insights);
  } catch (error: unknown) {
    logger.error('Failed to get enterprise insights', error);
    res.status(500).json({
      error: 'Failed to get enterprise insights',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/space-analytics/portfolio/{organizationId}/executive:
 *   get:
 *     summary: Get executive dashboard with KPIs and benchmarking
 *     tags: [Space Analytics]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: includeSubsidiaries
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include subsidiary data
 *       - in: query
 *         name: benchmarkIndustry
 *         schema:
 *           type: string
 *         description: Industry for benchmarking
 *       - in: query
 *         name: timeFrame
 *         schema:
 *           type: string
 *           enum: [QUARTER, YEAR, YTD]
 *           default: QUARTER
 *         description: Time frame for analysis
 *     responses:
 *       200:
 *         description: Executive dashboard retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/portfolio/:organizationId/executive', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const {
      includeSubsidiaries = 'false',
      benchmarkIndustry,
      timeFrame = 'QUARTER',
    } = req.query;

    const options = {
      includeSubsidiaries: includeSubsidiaries === 'true',
      benchmarkIndustry: benchmarkIndustry as string,
      timeFrame: timeFrame as 'QUARTER' | 'YEAR' | 'YTD',
    };

    const dashboard = await portfolioService.getExecutiveDashboard(organizationId, options);

    res.json(dashboard);
  } catch (error: unknown) {
    logger.error('Failed to get executive dashboard', error);
    res.status(500).json({
      error: 'Failed to get executive dashboard',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/space-analytics/portfolio/{organizationId}/advanced:
 *   get:
 *     summary: Get advanced portfolio analytics with predictive insights
 *     tags: [Space Analytics]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: includeForecasting
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include forecasting analysis
 *       - in: query
 *         name: riskAnalysis
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include risk analysis
 *       - in: query
 *         name: optimizationSuggestions
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include optimization suggestions
 *     responses:
 *       200:
 *         description: Advanced analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/portfolio/:organizationId/advanced', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const {
      includeForecasting = 'true',
      riskAnalysis = 'true',
      optimizationSuggestions = 'true',
    } = req.query;

    const options = {
      includeForecasting: includeForecasting === 'true',
      riskAnalysis: riskAnalysis === 'true',
      optimizationSuggestions: optimizationSuggestions === 'true',
    };

    const analytics = await portfolioService.getAdvancedPortfolioAnalytics(organizationId, options);

    res.json(analytics);
  } catch (error: unknown) {
    logger.error('Failed to get advanced portfolio analytics', error);
    res.status(500).json({
      error: 'Failed to get advanced portfolio analytics',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/space-analytics/portfolio/{organizationId}/realtime:
 *   get:
 *     summary: Get real-time portfolio monitoring
 *     tags: [Space Analytics]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Real-time monitoring data retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/portfolio/:organizationId/realtime', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const monitoring = await portfolioService.getRealTimePortfolioMonitoring(organizationId);

    res.json(monitoring);
  } catch (error: unknown) {
    logger.error('Failed to get real-time portfolio monitoring', error);
    res.status(500).json({
      error: 'Failed to get real-time portfolio monitoring',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/space-analytics/esg/{organizationId}:
 *   get:
 *     summary: Get ESG (Environmental, Social, Governance) reporting
 *     tags: [Space Analytics]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: reportingPeriod
 *         schema:
 *           type: string
 *           enum: [MONTHLY, QUARTERLY, ANNUAL]
 *           default: QUARTERLY
 *         description: Reporting period
 *     responses:
 *       200:
 *         description: ESG report retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/esg/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { reportingPeriod = 'QUARTERLY' } = req.query;

    const esgReport = await portfolioService.getESGReporting(
      organizationId,
      reportingPeriod as 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
    );

    res.json(esgReport);
  } catch (error: unknown) {
    logger.error('Failed to get ESG reporting', error);
    res.status(500).json({
      error: 'Failed to get ESG reporting',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/space-analytics/benchmarking/{organizationId}:
 *   get:
 *     summary: Get space utilization benchmarking
 *     tags: [Space Analytics]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Industry for comparison
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Geographic region
 *       - in: query
 *         name: companySize
 *         schema:
 *           type: string
 *           enum: [SMALL, MEDIUM, LARGE, ENTERPRISE]
 *         description: Company size category
 *     responses:
 *       200:
 *         description: Benchmarking data retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/benchmarking/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { industry, region, companySize } = req.query;

    // This would be implemented with actual benchmarking logic
    const benchmarking = {
      organizationId,
      benchmarkCriteria: {
        industry: industry || 'Technology',
        region: region || 'North America',
        companySize: companySize || 'ENTERPRISE',
      },
      currentMetrics: {
        occupancyRate: 78.5,
        utilizationRate: 65.2,
        costPerSqFt: 42.30,
        employeePerSqFt: 185,
        meetingRoomUtilization: 71.8,
        deskUtilization: 68.4,
      },
      industryBenchmarks: {
        occupancyRate: {
          average: 82.1,
          percentile25: 75.3,
          percentile50: 81.8,
          percentile75: 88.9,
          percentile90: 93.2,
        },
        utilizationRate: {
          average: 69.8,
          percentile25: 58.7,
          percentile50: 69.1,
          percentile75: 79.6,
          percentile90: 87.4,
        },
        costPerSqFt: {
          average: 38.50,
          percentile25: 32.10,
          percentile50: 37.80,
          percentile75: 44.20,
          percentile90: 52.30,
        },
      },
      ranking: {
        occupancyRate: 35, // Percentile rank
        utilizationRate: 28,
        costPerSqFt: 85, // Higher cost = lower rank
        overall: 49,
      },
      gapAnalysis: [
        {
          metric: 'Occupancy Rate',
          gap: -3.6,
          impact: 'MEDIUM',
          recommendation: 'Improve space allocation and reduce vacant spaces',
        },
        {
          metric: 'Cost per Sq Ft',
          gap: 3.80,
          impact: 'HIGH',
          recommendation: 'Review vendor contracts and optimize space efficiency',
        },
      ],
      recommendations: [
        'Implement hot-desking to improve desk utilization',
        'Optimize meeting room booking policies to reduce unused reservations',
        'Consider space consolidation in underutilized areas',
        'Invest in space management technology for better monitoring',
      ],
    };

    res.json(benchmarking);
  } catch (error: unknown) {
    logger.error('Failed to get benchmarking data', error);
    res.status(500).json({
      error: 'Failed to get benchmarking data',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/space-analytics/optimization/{organizationId}:
 *   post:
 *     summary: Generate space optimization recommendations
 *     tags: [Space Analytics]
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
 *             properties:
 *               targetUtilization:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 80
 *               constraints:
 *                 type: object
 *                 properties:
 *                   budget:
 *                     type: number
 *                   timeline:
 *                     type: string
 *                   priorities:
 *                     type: array
 *                     items:
 *                       type: string
 *               scenarios:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [CURRENT, GROWTH, CONSOLIDATION, HYBRID_WORK]
 *     responses:
 *       200:
 *         description: Optimization recommendations generated successfully
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.post('/optimization/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const {
      targetUtilization = 80,
      constraints = {},
      scenarios = ['CURRENT'],
    } = req.body;

    if (targetUtilization < 0 || targetUtilization > 100) {
      res.status(400).json({
        error: 'Target utilization must be between 0 and 100',
      });

      return;
    }

    // This would be implemented with actual optimization algorithms
    const optimization = {
      organizationId,
      parameters: {
        targetUtilization,
        constraints,
        scenarios,
      },
      recommendations: [
        {
          scenario: 'CURRENT',
          recommendations: [
            {
              type: 'SPACE_CONSOLIDATION',
              priority: 'HIGH',
              description: 'Consolidate underutilized conference rooms',
              impact: {
                spaceSaved: 2400, // sq ft
                costSavings: 120000, // annual
                utilizationImprovement: 12.5, // percentage points
              },
              implementation: {
                effort: 'MEDIUM',
                duration: '6-8 weeks',
                budget: 45000,
              },
            },
            {
              type: 'LAYOUT_OPTIMIZATION',
              priority: 'MEDIUM',
              description: 'Implement activity-based working zones',
              impact: {
                capacityIncrease: 35, // additional workstations
                utilizationImprovement: 8.3,
                employeeSatisfaction: 15, // improvement percentage
              },
              implementation: {
                effort: 'HIGH',
                duration: '12-16 weeks',
                budget: 125000,
              },
            },
            {
              type: 'TECHNOLOGY_ENHANCEMENT',
              priority: 'MEDIUM',
              description: 'Deploy smart booking system with occupancy sensors',
              impact: {
                bookingEfficiency: 25, // improvement percentage
                utilizationImprovement: 6.7,
                adminTimeSaved: 40, // hours per week
              },
              implementation: {
                effort: 'MEDIUM',
                duration: '8-10 weeks',
                budget: 75000,
              },
            },
          ],
          totalImpact: {
            costSavings: 195000, // annual
            spaceSavings: 2400, // sq ft
            utilizationImprovement: 27.5, // percentage points
            roi: 2.3, // return on investment multiple
            paybackPeriod: 15, // months
          },
        },
      ],
      implementationPlan: {
        phase1: {
          duration: '6-8 weeks',
          budget: 45000,
          actions: ['Space consolidation', 'Quick wins implementation'],
        },
        phase2: {
          duration: '8-10 weeks',
          budget: 75000,
          actions: ['Technology deployment', 'System integration'],
        },
        phase3: {
          duration: '12-16 weeks',
          budget: 125000,
          actions: ['Layout optimization', 'Change management'],
        },
      },
      riskAssessment: {
        overall: 'MEDIUM',
        factors: [
          'Employee resistance to change',
          'Technology adoption challenges',
          'Budget approval delays',
        ],
        mitigationStrategies: [
          'Comprehensive change management program',
          'Phased implementation approach',
          'Regular stakeholder communication',
        ],
      },
    };

    res.json(optimization);
  } catch (error: unknown) {
    logger.error('Failed to generate optimization recommendations', error);
    res.status(500).json({
      error: 'Failed to generate optimization recommendations',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

export default router;