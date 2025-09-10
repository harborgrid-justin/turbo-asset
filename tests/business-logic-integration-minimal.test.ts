/**
 * Minimal Business Logic Integration Test
 * Tests core functionality without dependencies on broken services
 */

import { BusinessLogicIntegrationService } from '../src/services/business-logic-integration';

describe('Business Logic Integration Service - Core Functionality', () => {
  let service: BusinessLogicIntegrationService;

  beforeAll(async () => {
    // Initialize service
    service = BusinessLogicIntegrationService.getInstance();
  });

  describe('Service Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeInstanceOf(BusinessLogicIntegrationService);
    });

    it('should list available bridges', () => {
      const bridges = service.listBridges();
      expect(Array.isArray(bridges)).toBe(true);
      console.log('Available bridges:', bridges);
    });

    it('should provide service health check', async () => {
      const health = await service.healthCheck();
      expect(health).toHaveProperty('bridgeCount');
      expect(health).toHaveProperty('napiHealthy');
      expect(health).toHaveProperty('businessLogicHealthy');
    });
  });

  describe('Production Features', () => {
    it('should have production metrics capabilities', () => {
      const metrics = service.getProductionMetrics();
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('failedRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
    });

    it('should support comprehensive health checks', async () => {
      const healthStatus = await service.comprehensiveHealthCheck();
      expect(healthStatus).toHaveProperty('overallHealth');
      expect(healthStatus).toHaveProperty('serviceDetails');
    });
  });

  describe('Bridge Configuration', () => {
    it('should provide bridge information', () => {
      const bridges = service.listBridges();
      if (bridges.length > 0) {
        const firstBridge = bridges[0];
        const bridgeInfo = service.getBridgeInfo(firstBridge);
        expect(bridgeInfo).toHaveProperty('napiServiceName');
        expect(bridgeInfo).toHaveProperty('fallbackEnabled');
        expect(bridgeInfo).toHaveProperty('integrationMethods');
      }
    });
  });
});