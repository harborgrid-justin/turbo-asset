import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { predictiveAnalyticsService } from '../../src/services/ml/PredictiveAnalyticsService';
import { anomalyDetectionService } from '../../src/services/ml/AnomalyDetectionService';
import { nlpService } from '../../src/services/ml/NLPService';
import { sentimentAnalysisService } from '../../src/services/ml/SentimentAnalysisService';

describe('ML Services Integration Tests', () => {
  beforeAll(async () => {
    // Wait for services to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Cleanup resources
  });

  describe('PredictiveAnalyticsService', () => {
    test('should predict space optimization for organization', async () => {
      const organizationId = 'test-org-123';
      const options = {
        spaceIds: ['space-1', 'space-2'],
        forecastHorizon: 30,
        includeRecommendations: true,
        scenarios: ['CURRENT', 'OPTIMIZATION']
      };

      const predictions = await predictiveAnalyticsService.predictSpaceOptimization(
        organizationId,
        options
      );

      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      
      if (predictions.length > 0) {
        const prediction = predictions[0];
        expect(prediction).toHaveProperty('spaceId');
        expect(prediction).toHaveProperty('currentUtilization');
        expect(prediction).toHaveProperty('predictedUtilization');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      }
    }, 10000);

    test('should forecast costs for different categories', async () => {
      const organizationId = 'test-org-123';
      const options = {
        categories: ['MAINTENANCE', 'ENERGY'],
        forecastHorizon: 90,
        includeScenarios: true
      };

      const forecasts = await predictiveAnalyticsService.forecastCosts(
        organizationId,
        options
      );

      expect(forecasts).toBeDefined();
      expect(Array.isArray(forecasts)).toBe(true);

      if (forecasts.length > 0) {
        const forecast = forecasts[0];
        expect(forecast).toHaveProperty('forecastId');
        expect(forecast).toHaveProperty('forecastType');
        expect(forecast).toHaveProperty('predictions');
        expect(forecast).toHaveProperty('confidence');
        expect(Array.isArray(forecast.predictions)).toBe(true);
      }
    }, 10000);
  });

  describe('AnomalyDetectionService', () => {
    test('should detect energy anomalies', async () => {
      const organizationId = 'test-org-123';
      const options = {
        buildingIds: ['building-1'],
        realTime: false,
        includePredictions: false
      };

      const anomalies = await anomalyDetectionService.detectEnergyAnomalies(
        organizationId,
        options
      );

      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);

      if (anomalies.length > 0) {
        const anomaly = anomalies[0];
        expect(anomaly).toHaveProperty('id');
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('timestamp');
        expect(anomaly).toHaveProperty('confidence');
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(anomaly.severity);
      }
    }, 10000);

    test('should detect utilization anomalies', async () => {
      const organizationId = 'test-org-123';
      const options = {
        spaceIds: ['space-1', 'space-2'],
        includeBookingData: true,
        realTime: false
      };

      const anomalies = await anomalyDetectionService.detectUtilizationAnomalies(
        organizationId,
        options
      );

      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);

      if (anomalies.length > 0) {
        const anomaly = anomalies[0];
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('entityId');
        expect(anomaly).toHaveProperty('entityType');
        expect(anomaly.type).toBe('UTILIZATION_ANOMALY');
      }
    }, 10000);

    test('should generate anomaly dashboard', async () => {
      const organizationId = 'test-org-123';

      const dashboard = await anomalyDetectionService.getAnomalyDashboard(
        organizationId,
        {
          timeRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        }
      );

      expect(dashboard).toBeDefined();
      expect(dashboard).toHaveProperty('overview');
      expect(dashboard).toHaveProperty('byType');
      expect(dashboard).toHaveProperty('bySeverity');
      expect(dashboard.overview).toHaveProperty('totalAnomalies');
      expect(dashboard.overview).toHaveProperty('criticalAnomalies');
    }, 10000);
  });

  describe('NLPService', () => {
    test('should classify support ticket', async () => {
      const ticketId = 'ticket-123';
      const content = 'The air conditioning in conference room A is not working properly. It is too hot and uncomfortable for meetings.';
      
      const classification = await nlpService.classifyTicket(
        ticketId,
        content,
        {
          includeEntities: true,
          includeSentiment: true,
          language: 'en'
        }
      );

      expect(classification).toBeDefined();
      expect(classification).toHaveProperty('ticketId');
      expect(classification).toHaveProperty('predictedCategory');
      expect(classification).toHaveProperty('predictedPriority');
      expect(classification).toHaveProperty('confidence');
      expect(classification).toHaveProperty('extractedEntities');
      expect(classification).toHaveProperty('sentiment');

      expect(classification.ticketId).toBe(ticketId);
      expect(classification.predictedCategory).toHaveProperty('category');
      expect(classification.predictedCategory).toHaveProperty('confidence');
      expect(classification.predictedPriority).toHaveProperty('level');
      expect(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).toContain(classification.predictedPriority.level);
    }, 10000);

    test('should analyze sentiment with aspects', async () => {
      const text = 'I love the new workspace design but the lighting is terrible and gives me headaches.';
      
      const sentiment = await nlpService.analyzeSentiment(
        text,
        'en',
        {
          includeAspects: true,
          includeEmotions: false
        }
      );

      expect(sentiment).toBeDefined();
      expect(sentiment).toHaveProperty('overall');
      expect(sentiment).toHaveProperty('positive');
      expect(sentiment).toHaveProperty('negative');
      expect(sentiment).toHaveProperty('neutral');
      expect(sentiment).toHaveProperty('confidence');

      expect(typeof sentiment.overall).toBe('number');
      expect(sentiment.confidence).toBeGreaterThan(0);
      expect(sentiment.confidence).toBeLessThanOrEqual(1);
    }, 10000);

    test('should extract entities from text', async () => {
      const text = 'Please fix the printer in Room 205 on the 3rd floor of Building A.';
      
      const entities = await nlpService.extractEntities(
        text,
        'en',
        {
          entityTypes: ['LOCATION', 'ASSET', 'ISSUE_TYPE'],
          includeCustomEntities: true
        }
      );

      expect(entities).toBeDefined();
      expect(Array.isArray(entities)).toBe(true);

      if (entities.length > 0) {
        const entity = entities[0];
        expect(entity).toHaveProperty('type');
        expect(entity).toHaveProperty('value');
        expect(entity).toHaveProperty('confidence');
        expect(['LOCATION', 'ASSET', 'PERSON', 'ORGANIZATION', 'ISSUE_TYPE']).toContain(entity.type);
      }
    }, 10000);
  });

  describe('SentimentAnalysisService', () => {
    test('should analyze employee feedback', async () => {
      const feedbackId = 'feedback-123';
      const content = 'The new office layout is great and I love the natural light, but the noise level is too high for concentration.';
      
      const analysis = await sentimentAnalysisService.analyzeFeedback(
        feedbackId,
        content,
        'SURVEY',
        {
          includeEmotions: true,
          includeTopics: true,
          includeActionItems: true,
          language: 'en'
        }
      );

      expect(analysis).toBeDefined();
      expect(analysis).toHaveProperty('feedbackId');
      expect(analysis).toHaveProperty('sentiment');
      expect(analysis).toHaveProperty('topics');
      expect(analysis).toHaveProperty('emotions');
      expect(analysis).toHaveProperty('actionItems');
      expect(analysis).toHaveProperty('confidence');

      expect(analysis.feedbackId).toBe(feedbackId);
      expect(analysis.sentiment).toHaveProperty('overall');
      expect(analysis.sentiment.overall).toHaveProperty('label');
      expect(analysis.sentiment.overall).toHaveProperty('score');
      expect(['POSITIVE', 'NEGATIVE', 'NEUTRAL']).toContain(analysis.sentiment.overall.label);
    }, 10000);

    test('should analyze sentiment trends', async () => {
      const organizationId = 'test-org-123';
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };
      
      const trends = await sentimentAnalysisService.analyzeSentimentTrends(
        organizationId,
        period,
        {
          includeInsights: true,
          includeRecommendations: true
        }
      );

      expect(trends).toBeDefined();
      expect(trends).toHaveProperty('organizationId');
      expect(trends).toHaveProperty('period');
      expect(trends).toHaveProperty('overallTrend');
      expect(trends).toHaveProperty('categoryTrends');
      expect(trends).toHaveProperty('insights');
      expect(trends).toHaveProperty('recommendations');

      expect(trends.organizationId).toBe(organizationId);
      expect(['IMPROVING', 'DECLINING', 'STABLE', 'VOLATILE']).toContain(trends.overallTrend);
      expect(Array.isArray(trends.categoryTrends)).toBe(true);
      expect(Array.isArray(trends.insights)).toBe(true);
      expect(Array.isArray(trends.recommendations)).toBe(true);
    }, 10000);

    test('should get sentiment dashboard', async () => {
      const organizationId = 'test-org-123';
      
      const dashboard = await sentimentAnalysisService.getSentimentDashboard(
        organizationId,
        {
          includeRealTime: true,
          includeTrends: true,
          includeBreakdowns: true,
          includeAlerts: true
        }
      );

      expect(dashboard).toBeDefined();
      expect(dashboard).toHaveProperty('organizationId');
      expect(dashboard).toHaveProperty('overallMetrics');
      expect(dashboard).toHaveProperty('topInsights');
      expect(dashboard).toHaveProperty('actionItems');
      expect(dashboard).toHaveProperty('generatedAt');

      expect(dashboard.organizationId).toBe(organizationId);
      expect(dashboard.generatedAt).toBeInstanceOf(Date);
    }, 10000);
  });

  describe('Integration Tests', () => {
    test('should handle cross-service workflows', async () => {
      const organizationId = 'test-org-123';
      
      // Step 1: Analyze feedback to identify issues
      const feedbackAnalysis = await sentimentAnalysisService.analyzeFeedback(
        'test-feedback',
        'The HVAC system is constantly breaking down and making loud noises.',
        'TICKET',
        { includeTopics: true }
      );

      expect(feedbackAnalysis.sentiment.overall.label).toBe('NEGATIVE');

      // Step 2: Classify the ticket
      const ticketClassification = await nlpService.classifyTicket(
        'test-ticket',
        'The HVAC system is constantly breaking down and making loud noises.',
        { includeEntities: true }
      );

      // Should be classified as HVAC-related
      expect(ticketClassification.predictedCategory.category).toBe('HVAC');

      // Step 3: Check for HVAC anomalies
      const anomalies = await anomalyDetectionService.detectEnergyAnomalies(
        organizationId,
        { buildingIds: ['test-building'] }
      );

      expect(Array.isArray(anomalies)).toBe(true);

      // Step 4: Get space optimization predictions
      const predictions = await predictiveAnalyticsService.predictSpaceOptimization(
        organizationId,
        { forecastHorizon: 30 }
      );

      expect(Array.isArray(predictions)).toBe(true);
    }, 15000);
  });

  describe('Performance Tests', () => {
    test('should handle batch processing efficiently', async () => {
      const tickets = Array.from({ length: 10 }, (_, i) => ({
        ticketId: `batch-ticket-${i}`,
        content: `Test ticket content ${i} about HVAC issues in building.`,
        source: 'TICKET' as const,
        language: 'en'
      }));

      const startTime = Date.now();
      const results = await nlpService.batchClassifyTickets(
        tickets,
        {
          maxConcurrency: 5,
          includeEntities: false,
          includeSentiment: false
        }
      );

      const processingTime = Date.now() - startTime;

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(tickets.length);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    }, 35000);

    test('should maintain reasonable response times', async () => {
      const organizationId = 'test-org-123';
      
      const startTime = Date.now();
      const dashboard = await anomalyDetectionService.getAnomalyDashboard(organizationId);
      const responseTime = Date.now() - startTime;

      expect(dashboard).toBeDefined();
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    }, 10000);
  });

  describe('Error Handling', () => {
    test('should handle invalid organization IDs gracefully', async () => {
      const invalidOrgId = 'non-existent-org';
      
      await expect(
        predictiveAnalyticsService.predictSpaceOptimization(invalidOrgId, {})
      ).resolves.toBeDefined(); // Should not throw, but return empty results
    });

    test('should handle malformed input data', async () => {
      await expect(
        nlpService.classifyTicket('test', '', { language: 'en' })
      ).resolves.toBeDefined(); // Should handle empty content gracefully
    });

    test('should handle unsupported languages', async () => {
      const result = await nlpService.analyzeSentiment(
        'Hello world',
        'unsupported-language'
      );
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});