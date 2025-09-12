import { Request, Response } from 'express';
import { logger } from '@/config/logger';
import { predictiveAnalyticsService } from '@/services/ml/PredictiveAnalyticsService';
import { anomalyDetectionService } from '@/services/ml/AnomalyDetectionService';
import { computerVisionService } from '@/services/ml/ComputerVisionService';
import { nlpService } from '@/services/ml/NLPService';
import { recommendationEngineService } from '@/services/ml/RecommendationEngineService';
import { digitalTwinService } from '@/services/ml/DigitalTwinService';
import { advancedForecastingService } from '@/services/ml/AdvancedForecastingService';
import { sentimentAnalysisService } from '@/services/ml/SentimentAnalysisService';
import { AnomalyType, AnomalySeverity } from '@/types/machinelearning';

/**
 * MLAnalyticsController - Main controller for Machine Learning and Analytics endpoints
 * Provides unified API access to all ML services and capabilities
 */
export class MLAnalyticsController {

  /**
   * Get ML service status and capabilities
   */
  async getMLServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting ML service status');

      const status = {
        services: {
          predictiveAnalytics: 'ACTIVE',
          anomalyDetection: 'ACTIVE',
          computerVision: 'ACTIVE',
          nlp: 'ACTIVE',
          recommendationEngine: 'ACTIVE',
          digitalTwin: 'ACTIVE',
          advancedForecasting: 'ACTIVE',
          sentimentAnalysis: 'ACTIVE'
        },
        capabilities: [
          'Space optimization predictions',
          'Cost forecasting',
          'Anomaly detection for energy and utilization',
          'Computer vision for facility assessment',
          'Automated ticket classification',
          'Vendor recommendation engine',
          'Digital twin simulations',
          'Advanced forecasting models',
          'Employee sentiment analysis'
        ],
        version: '1.0.0',
        lastUpdated: new Date()
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error: unknown) {
      logger.error('Failed to get ML service status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get ML service status'
      });

      return;
    }
  }

  /**
   * Generate space optimization predictions
   */
  async predictSpaceOptimization(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        spaceIds,
        forecastHorizon = 90,
        includeRecommendations = true,
        scenarios = ['CURRENT', 'GROWTH', 'OPTIMIZATION']
      } = req.body;

      logger.info('Generating space optimization predictions', {
        organizationId,
        spaceIds: spaceIds?.length || 'all',
        forecastHorizon
      });

      const predictions = await predictiveAnalyticsService.predictSpaceOptimization(
        organizationId,
        {
          spaceIds,
          forecastHorizon,
          includeRecommendations,
          scenarios
        }
      );

      res.json({
        success: true,
        data: predictions,
        metadata: {
          organizationId,
          predictionsCount: predictions.length,
          forecastHorizon,
          generatedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to predict space optimization', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate space optimization predictions'
      });

      return;
    }
  }

  /**
   * Generate cost forecasts
   */
  async forecastCosts(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        categories = ['MAINTENANCE', 'ENERGY', 'LEASE', 'OPERATIONAL'],
        forecastHorizon = 365,
        confidenceInterval = 0.95,
        includeScenarios = true
      } = req.body;

      logger.info('Generating cost forecasts', {
        organizationId,
        categories,
        forecastHorizon
      });

      const forecasts = await predictiveAnalyticsService.forecastCosts(
        organizationId,
        {
          categories,
          forecastHorizon,
          confidenceInterval,
          includeScenarios
        }
      );

      res.json({
        success: true,
        data: forecasts,
        metadata: {
          organizationId,
          forecastsCount: forecasts.length,
          categories,
          forecastHorizon,
          generatedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to forecast costs', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate cost forecasts'
      });

      return;
    }
  }

  /**
   * Detect anomalies in energy consumption
   */
  async detectEnergyAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        buildingIds,
        timeRange,
        realTime = false,
        includePredictions = false
      } = req.body;

      logger.info('Detecting energy anomalies', {
        organizationId,
        buildingIds: buildingIds?.length || 'all',
        realTime
      });

      const anomalies = await anomalyDetectionService.detectEnergyAnomalies(
        organizationId,
        {
          buildingIds,
          timeRange,
          realTime,
          includePredictions
        }
      );

      res.json({
        success: true,
        data: anomalies,
        metadata: {
          organizationId,
          anomaliesCount: anomalies.length,
          criticalCount: anomalies.filter(a => a.severity === 'CRITICAL').length,
          realTime,
          detectedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to detect energy anomalies', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect energy anomalies'
      });

      return;
    }
  }

  /**
   * Detect utilization anomalies
   */
  async detectUtilizationAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        spaceIds,
        timeRange,
        includeBookingData = true,
        realTime = false
      } = req.body;

      logger.info('Detecting utilization anomalies', {
        organizationId,
        spaceIds: spaceIds?.length || 'all',
        realTime
      });

      const anomalies = await anomalyDetectionService.detectUtilizationAnomalies(
        organizationId,
        {
          spaceIds,
          timeRange,
          includeBookingData,
          realTime
        }
      );

      res.json({
        success: true,
        data: anomalies,
        metadata: {
          organizationId,
          anomaliesCount: anomalies.length,
          severityDistribution: this.getAnomalySeverityDistribution(anomalies),
          detectedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to detect utilization anomalies', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect utilization anomalies'
      });

      return;
    }
  }

  /**
   * Get anomaly dashboard
   */
  async getAnomalyDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        timeRange,
        types,
        severityFilter
      } = req.query;

      const parsedTimeRange = timeRange ? JSON.parse(timeRange as string) : undefined;
      const parsedTypes = types ? (types as string).split(',') as AnomalyType[] : undefined;
      const parsedSeverityFilter = severityFilter ? (severityFilter as string).split(',') as AnomalySeverity[] : undefined;

      logger.info('Generating anomaly dashboard', {
        organizationId,
        timeRange: parsedTimeRange,
        types: parsedTypes,
        severityFilter: parsedSeverityFilter
      });

      const dashboard = await anomalyDetectionService.getAnomalyDashboard(
        organizationId,
        {
          timeRange: parsedTimeRange,
          types: parsedTypes,
          severityFilter: parsedSeverityFilter
        }
      );

      res.json({
        success: true,
        data: dashboard,
        metadata: {
          organizationId,
          generatedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to generate anomaly dashboard', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate anomaly dashboard'
      });

      return;
    }
  }

  /**
   * Assess facility condition using computer vision
   */
  async assessFacilityCondition(req: Request, res: Response): Promise<void> {
    try {
      const { facilityId } = req.params;
      const {
        format = 'jpeg',
        includeDetailedAnalysis = true,
        generateReport = false
      } = req.body;

      // In a real implementation, this would handle file upload
      const imageData = req.file?.buffer || Buffer.from('placeholder_image_data');

      logger.info('Assessing facility condition', {
        facilityId,
        format,
        imageSize: imageData.length
      });

      const assessment = await computerVisionService.assessFacilityCondition(
        facilityId,
        imageData,
        {
          format,
          includeDetailedAnalysis,
          generateReport
        }
      );

      res.json({
        success: true,
        data: assessment,
        metadata: {
          facilityId,
          assessmentId: assessment.assessmentId,
          overallScore: assessment.overallCondition.overall,
          issuesFound: assessment.detectedIssues.length,
          assessedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to assess facility condition', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assess facility condition'
      });

      return;
    }
  }

  /**
   * Detect occupancy from images
   */
  async detectOccupancy(req: Request, res: Response): Promise<void> {
    try {
      const { spaceId } = req.params;
      const {
        format = 'jpeg',
        realTime = false,
        privacyMode = true
      } = req.body;

      const imageData = req.file?.buffer || Buffer.from('placeholder_image_data');

      logger.info('Detecting occupancy', {
        spaceId,
        format,
        realTime,
        privacyMode
      });

      const occupancyData = await computerVisionService.detectOccupancy(
        spaceId,
        imageData,
        {
          format,
          realTime,
          privacyMode
        }
      );

      res.json({
        success: true,
        data: occupancyData,
        metadata: {
          spaceId,
          occupancyCount: occupancyData.occupancyCount,
          confidence: occupancyData.confidence,
          detectedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to detect occupancy', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect occupancy'
      });

      return;
    }
  }

  /**
   * Classify support ticket
   */
  async classifyTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const {
        content,
        subject = '',
        userDepartment,
        language = 'en',
        includeEntities = true,
        includeSentiment = true,
        generateSummary = false
      } = req.body;

      logger.info('Classifying ticket', {
        ticketId,
        contentLength: content?.length || 0,
        language
      });

      const classification = await nlpService.classifyTicket(
        ticketId,
        content,
        {
          subject,
          userDepartment,
          language,
          includeEntities,
          includeSentiment,
          generateSummary
        }
      );

      res.json({
        success: true,
        data: classification,
        metadata: {
          ticketId,
          category: classification.predictedCategory.category,
          priority: classification.predictedPriority.level,
          confidence: classification.confidence,
          classifiedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to classify ticket', error);
      res.status(500).json({
        success: false,
        error: 'Failed to classify ticket'
      });

      return;
    }
  }

  /**
   * Batch classify tickets
   */
  async batchClassifyTickets(req: Request, res: Response): Promise<void> {
    try {
      const {
        tickets,
        includeEntities = true,
        includeSentiment = true,
        maxConcurrency = 10
      } = req.body;

      logger.info('Batch classifying tickets', {
        ticketsCount: tickets?.length || 0,
        maxConcurrency
      });

      const classifications = await nlpService.batchClassifyTickets(
        tickets,
        {
          includeEntities,
          includeSentiment,
          maxConcurrency
        }
      );

      res.json({
        success: true,
        data: classifications,
        metadata: {
          totalTickets: tickets?.length || 0,
          successfulClassifications: classifications.length,
          processedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to batch classify tickets', error);
      res.status(500).json({
        success: false,
        error: 'Failed to batch classify tickets'
      });

      return;
    }
  }

  /**
   * Get vendor recommendations
   */
  async recommendVendors(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        serviceCategory,
        requirements = {},
        maxRecommendations = 5,
        includeRiskAssessment = true,
        includeCostAnalysis = true
      } = req.body;

      logger.info('Generating vendor recommendations', {
        organizationId,
        serviceCategory,
        maxRecommendations
      });

      const recommendations = await recommendationEngineService.recommendVendors(
        organizationId,
        serviceCategory,
        requirements,
        {
          maxRecommendations,
          includeRiskAssessment,
          includeCostAnalysis
        }
      );

      res.json({
        success: true,
        data: recommendations,
        metadata: {
          organizationId,
          serviceCategory,
          recommendationsCount: recommendations.length,
          generatedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to generate vendor recommendations', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate vendor recommendations'
      });

      return;
    }
  }

  /**
   * Get lease recommendations
   */
  async recommendLeaseStrategies(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, propertyId } = req.params;
      const {
        currentLease,
        includeMktComparisons = true,
        includeNegotiationTips = true,
        timeHorizon = 24
      } = req.body;

      logger.info('Generating lease recommendations', {
        organizationId,
        propertyId,
        timeHorizon
      });

      const recommendations = await recommendationEngineService.recommendLeaseStrategies(
        organizationId,
        propertyId,
        currentLease,
        {
          includeMktComparisons,
          includeNegotiationTips,
          timeHorizon
        }
      );

      res.json({
        success: true,
        data: recommendations,
        metadata: {
          organizationId,
          propertyId,
          recommendationsCount: recommendations.length,
          generatedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to generate lease recommendations', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate lease recommendations'
      });

      return;
    }
  }

  /**
   * Create digital twin
   */
  async createDigitalTwin(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;
      const {
        entityType,
        includePhysicsModel = true,
        include3DModel = true,
        includeSensorIntegration = true,
        includeRealTimeData = true
      } = req.body;

      logger.info('Creating digital twin', {
        entityId,
        entityType,
        include3DModel,
        includeSensorIntegration
      });

      const digitalTwin = await digitalTwinService.createDigitalTwin(
        entityId,
        entityType,
        {
          includePhysicsModel,
          include3DModel,
          includeSensorIntegration,
          includeRealTimeData
        }
      );

      res.json({
        success: true,
        data: digitalTwin,
        metadata: {
          twinId: digitalTwin.twinId,
          entityId,
          entityType,
          accuracy: digitalTwin.accuracy,
          createdAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to create digital twin', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create digital twin'
      });

      return;
    }
  }

  /**
   * Run digital twin simulation
   */
  async runSimulation(req: Request, res: Response): Promise<void> {
    try {
      const { twinId } = req.params;
      const {
        simulationType,
        parameters,
        realTime = false,
        generateVisualizations = true
      } = req.body;

      logger.info('Running digital twin simulation', {
        twinId,
        simulationType,
        scenariosCount: parameters?.scenarios?.length || 0,
        realTime
      });

      const simulation = await digitalTwinService.runSimulation(
        twinId,
        simulationType,
        parameters,
        {
          realTime,
          generateVisualizations
        }
      );

      res.json({
        success: true,
        data: simulation,
        metadata: {
          simulationId: simulation.simulationId,
          twinId,
          simulationType,
          status: simulation.status,
          startedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to run simulation', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run simulation'
      });

      return;
    }
  }

  /**
   * Generate portfolio forecast
   */
  async generatePortfolioForecast(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        forecastType,
        horizon = 365,
        includeScenarios = true,
        includeUncertainty = true
      } = req.body;

      logger.info('Generating portfolio forecast', {
        organizationId,
        forecastType,
        horizon
      });

      const forecast = await advancedForecastingService.generatePortfolioForecast(
        organizationId,
        forecastType,
        {
          horizon,
          includeScenarios,
          includeUncertainty
        }
      );

      res.json({
        success: true,
        data: forecast,
        metadata: {
          forecastId: forecast.forecastId,
          organizationId,
          forecastType,
          horizon,
          confidence: forecast.confidence,
          generatedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to generate portfolio forecast', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate portfolio forecast'
      });

      return;
    }
  }

  /**
   * Generate budget forecast
   */
  async generateBudgetForecast(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        budgetPeriod,
        categories,
        includeRiskAnalysis = true,
        includeScenarios = true
      } = req.body;

      logger.info('Generating budget forecast', {
        organizationId,
        budgetPeriod,
        categoriesCount: categories?.length || 0
      });

      const budget = await advancedForecastingService.generateBudgetForecast(
        organizationId,
        budgetPeriod,
        {
          categories,
          includeRiskAnalysis,
          includeScenarios
        }
      );

      res.json({
        success: true,
        data: budget,
        metadata: {
          budgetId: budget.budgetId,
          organizationId,
          budgetPeriod,
          totalForecast: budget.totalForecast,
          confidence: budget.confidence,
          generatedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to generate budget forecast', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate budget forecast'
      });

      return;
    }
  }

  /**
   * Analyze employee feedback sentiment
   */
  async analyzeFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { feedbackId } = req.params;
      const {
        content,
        source,
        language = 'en',
        includeEmotions = true,
        includeTopics = true,
        includeActionItems = true,
        employeeContext = {}
      } = req.body;

      logger.info('Analyzing employee feedback', {
        feedbackId,
        source,
        contentLength: content?.length || 0,
        language
      });

      const analysis = await sentimentAnalysisService.analyzeFeedback(
        feedbackId,
        content,
        source,
        {
          language,
          includeEmotions,
          includeTopics,
          includeActionItems,
          employeeContext
        }
      );

      res.json({
        success: true,
        data: analysis,
        metadata: {
          feedbackId,
          sentiment: analysis.sentiment.overall.label,
          confidence: analysis.sentiment.confidence,
          topicsFound: analysis.topics.length,
          actionItems: analysis.actionItems.length,
          analyzedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to analyze feedback', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze feedback'
      });

      return;
    }
  }

  /**
   * Analyze sentiment trends
   */
  async analyzeSentimentTrends(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        period,
        groupBy,
        includeComparisons = true,
        includeInsights = true,
        includeRecommendations = true
      } = req.body;

      logger.info('Analyzing sentiment trends', {
        organizationId,
        period,
        groupBy
      });

      const trends = await sentimentAnalysisService.analyzeSentimentTrends(
        organizationId,
        period,
        {
          groupBy,
          includeComparisons,
          includeInsights,
          includeRecommendations
        }
      );

      res.json({
        success: true,
        data: trends,
        metadata: {
          organizationId,
          overallTrend: trends.overallTrend,
          categoryTrends: trends.categoryTrends.length,
          insights: trends.insights.length,
          recommendations: trends.recommendations.length,
          analyzedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to analyze sentiment trends', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze sentiment trends'
      });

      return;
    }
  }

  /**
   * Get sentiment dashboard
   */
  async getSentimentDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        timeRange,
        includeRealTime = true,
        includeTrends = true,
        includeBreakdowns = true,
        includeAlerts = true
      } = req.query;

      const parsedTimeRange = timeRange ? JSON.parse(timeRange as string) : undefined;

      logger.info('Generating sentiment dashboard', {
        organizationId,
        includeRealTime,
        includeTrends
      });

      const dashboard = await sentimentAnalysisService.getSentimentDashboard(
        organizationId,
        {
          timeRange: parsedTimeRange,
          includeRealTime: includeRealTime === 'true',
          includeTrends: includeTrends === 'true',
          includeBreakdowns: includeBreakdowns === 'true',
          includeAlerts: includeAlerts === 'true'
        }
      );

      res.json({
        success: true,
        data: dashboard,
        metadata: {
          organizationId,
          generatedAt: new Date()
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to generate sentiment dashboard', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate sentiment dashboard'
      });

      return;
    }
  }

  /**
   * Private helper methods
   */
  private getAnomalySeverityDistribution(anomalies: any[]): any {
    const distribution = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    anomalies.forEach(anomaly => {
      if (distribution.hasOwnProperty(anomaly.severity)) {
        distribution[anomaly.severity as keyof typeof distribution]++;
      }
    });

    return distribution;
  }
}

export const mlAnalyticsController = new MLAnalyticsController();