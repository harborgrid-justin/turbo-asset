import { Router } from 'express';
import { mlAnalyticsController } from '../controllers/ml/MLAnalyticsController';

const router = Router();

/**
 * ML Analytics Routes
 * Provides RESTful API endpoints for all machine learning and analytics capabilities
 */

// Service status and capabilities
router.get('/status', mlAnalyticsController.getMLServiceStatus.bind(mlAnalyticsController));

// Predictive Analytics Routes
router.post('/organizations/:organizationId/predictions/space-optimization', 
  mlAnalyticsController.predictSpaceOptimization.bind(mlAnalyticsController)
);

router.post('/organizations/:organizationId/predictions/cost-forecast', 
  mlAnalyticsController.forecastCosts.bind(mlAnalyticsController)
);

// Anomaly Detection Routes  
router.post('/organizations/:organizationId/anomalies/energy', 
  mlAnalyticsController.detectEnergyAnomalies.bind(mlAnalyticsController)
);

router.post('/organizations/:organizationId/anomalies/utilization', 
  mlAnalyticsController.detectUtilizationAnomalies.bind(mlAnalyticsController)
);

router.get('/organizations/:organizationId/anomalies/dashboard', 
  mlAnalyticsController.getAnomalyDashboard.bind(mlAnalyticsController)
);

// Computer Vision Routes
router.post('/facilities/:facilityId/assessment', 
  mlAnalyticsController.assessFacilityCondition.bind(mlAnalyticsController)
);

router.post('/spaces/:spaceId/occupancy-detection', 
  mlAnalyticsController.detectOccupancy.bind(mlAnalyticsController)
);

// NLP Routes
router.post('/tickets/:ticketId/classify', 
  mlAnalyticsController.classifyTicket.bind(mlAnalyticsController)
);

router.post('/tickets/batch-classify', 
  mlAnalyticsController.batchClassifyTickets.bind(mlAnalyticsController)
);

// Recommendation Engine Routes
router.post('/organizations/:organizationId/recommendations/vendors', 
  mlAnalyticsController.recommendVendors.bind(mlAnalyticsController)
);

router.post('/organizations/:organizationId/properties/:propertyId/recommendations/lease', 
  mlAnalyticsController.recommendLeaseStrategies.bind(mlAnalyticsController)
);

// Digital Twin Routes
router.post('/entities/:entityId/digital-twin', 
  mlAnalyticsController.createDigitalTwin.bind(mlAnalyticsController)
);

router.post('/digital-twins/:twinId/simulations', 
  mlAnalyticsController.runSimulation.bind(mlAnalyticsController)
);

// Advanced Forecasting Routes
router.post('/organizations/:organizationId/forecasts/portfolio', 
  mlAnalyticsController.generatePortfolioForecast.bind(mlAnalyticsController)
);

router.post('/organizations/:organizationId/forecasts/budget', 
  mlAnalyticsController.generateBudgetForecast.bind(mlAnalyticsController)
);

// Sentiment Analysis Routes
router.post('/feedback/:feedbackId/analyze', 
  mlAnalyticsController.analyzeFeedback.bind(mlAnalyticsController)
);

router.post('/organizations/:organizationId/sentiment/trends', 
  mlAnalyticsController.analyzeSentimentTrends.bind(mlAnalyticsController)
);

router.get('/organizations/:organizationId/sentiment/dashboard', 
  mlAnalyticsController.getSentimentDashboard.bind(mlAnalyticsController)
);

export default router;