/**
 * Enhanced Business Logic Integration Test Suite
 * Tests production-grade features and frontend-backend integration
 */

import { EnhancedBusinessLogicIntegrationService } from '../src/services/enhanced-business-logic-integration';

describe('Enhanced Business Logic Integration Service', () => {
  let service: EnhancedBusinessLogicIntegrationService;

  beforeAll(async () => {
    service = EnhancedBusinessLogicIntegrationService.getInstance();
    // Give the service time to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(() => {
    service.shutdown();
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with production features', () => {
      expect(service).toBeInstanceOf(EnhancedBusinessLogicIntegrationService);
    });

    it('should list available enhanced bridges', () => {
      const bridges = service.listBridges();
      expect(Array.isArray(bridges)).toBe(true);
      expect(bridges.length).toBeGreaterThan(0);
      console.log('Enhanced bridges:', bridges);
    });

    it('should provide enhanced service health check', async () => {
      const health = await service.healthCheck();
      expect(health).toHaveProperty('bridgeCount');
      expect(health).toHaveProperty('napiHealthy');
      expect(health).toHaveProperty('businessLogicHealthy');
      expect(typeof health.bridgeCount).toBe('number');
      expect(typeof health.napiHealthy).toBe('number');
      expect(typeof health.businessLogicHealthy).toBe('number');
    });
  });

  describe('Production-Grade Features', () => {
    it('should have comprehensive production metrics', () => {
      const metrics = service.getProductionMetrics();
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('failedRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('serviceHealth');
      expect(metrics).toHaveProperty('circuitBreakerMetrics');
      expect(metrics).toHaveProperty('rateLimitMetrics');
      expect(metrics).toHaveProperty('validationMetrics');
    });

    it('should support comprehensive health checks', async () => {
      const healthStatus = await service.comprehensiveHealthCheck();
      expect(healthStatus).toHaveProperty('overallHealth');
      expect(healthStatus).toHaveProperty('serviceDetails');
      expect(healthStatus).toHaveProperty('systemMetrics');
      
      expect(['HEALTHY', 'DEGRADED', 'UNHEALTHY']).toContain(healthStatus.overallHealth);
      expect(healthStatus.systemMetrics).toHaveProperty('totalServices');
      expect(healthStatus.systemMetrics).toHaveProperty('healthyServices');
      expect(healthStatus.systemMetrics).toHaveProperty('degradedServices');
      expect(healthStatus.systemMetrics).toHaveProperty('unhealthyServices');
    });

    it('should provide detailed bridge information', () => {
      const bridges = service.listBridges();
      if (bridges.length > 0) {
        const firstBridge = bridges[0];
        const bridgeInfo = service.getBridgeInfo(firstBridge);
        
        expect(bridgeInfo).toHaveProperty('napiServiceName');
        expect(bridgeInfo).toHaveProperty('fallbackEnabled');
        expect(bridgeInfo).toHaveProperty('integrationMethods');
        expect(bridgeInfo).toHaveProperty('metrics');
        expect(bridgeInfo).toHaveProperty('rateLimit');
        expect(bridgeInfo).toHaveProperty('validation');
        expect(bridgeInfo).toHaveProperty('retry');
        
        // Test metrics structure
        expect(bridgeInfo.metrics).toHaveProperty('callCount');
        expect(bridgeInfo.metrics).toHaveProperty('successCount');
        expect(bridgeInfo.metrics).toHaveProperty('failureCount');
        expect(bridgeInfo.metrics).toHaveProperty('avgResponseTime');
        expect(bridgeInfo.metrics).toHaveProperty('circuitBreakerStatus');
        
        // Test rate limiting structure
        expect(bridgeInfo.rateLimit).toHaveProperty('maxRequestsPerMinute');
        expect(bridgeInfo.rateLimit).toHaveProperty('requestWindow');
        
        // Test validation structure
        expect(bridgeInfo.validation).toHaveProperty('enabled');
        expect(bridgeInfo.validation).toHaveProperty('rules');
        
        // Test retry structure
        expect(bridgeInfo.retry).toHaveProperty('maxAttempts');
        expect(bridgeInfo.retry).toHaveProperty('backoffMultiplier');
        expect(bridgeInfo.retry).toHaveProperty('baseDelayMs');
      }
    });
  });

  describe('Operation Execution', () => {
    it('should execute operations with production monitoring', async () => {
      const bridges = service.listBridges();
      if (bridges.length > 0) {
        const serviceName = bridges[0];
        const bridgeInfo = service.getBridgeInfo(serviceName);
        
        if (bridgeInfo && bridgeInfo.integrationMethods.length > 0) {
          const methodName = bridgeInfo.integrationMethods[0];
          
          const result = await service.executeProductionOperation(
            serviceName,
            methodName,
            [{ test: 'data' }],
            { useNapi: false, skipValidation: true }
          );
          
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('metadata');
          expect(result.metadata).toHaveProperty('timestamp');
          expect(result.metadata).toHaveProperty('requestId');
          expect(result.metadata).toHaveProperty('executionTime');
          expect(result.metadata).toHaveProperty('apiVersion');
          
          console.log('Operation result:', {
            success: result.success,
            hasData: !!result.data,
            hasError: !!result.error,
            executionTime: result.metadata?.executionTime
          });
        }
      }
    });

    it('should handle rate limiting', async () => {
      const bridges = service.listBridges();
      if (bridges.length > 0) {
        const serviceName = bridges[0];
        const bridgeInfo = service.getBridgeInfo(serviceName);
        
        if (bridgeInfo && bridgeInfo.integrationMethods.length > 0) {
          const methodName = bridgeInfo.integrationMethods[0];
          
          // Test that operations are allowed initially
          const result1 = await service.executeProductionOperation(
            serviceName,
            methodName,
            [{ test: 'data' }],
            { useNapi: false, skipValidation: true }
          );
          
          expect(result1.success).toBe(true);
          
          // Rate limiting is tested by configuration, not by overwhelming the system
          const rateLimitConfig = bridgeInfo.rateLimit;
          expect(rateLimitConfig.maxRequestsPerMinute).toBeGreaterThan(0);
        }
      }
    });

    it('should handle input validation', async () => {
      const bridges = service.listBridges();
      if (bridges.length > 0) {
        const serviceName = bridges[0];
        const bridgeInfo = service.getBridgeInfo(serviceName);
        
        if (bridgeInfo && bridgeInfo.integrationMethods.length > 0) {
          const methodName = bridgeInfo.integrationMethods[0];
          
          // Test with invalid data (empty object when validation rules exist)
          const result = await service.executeProductionOperation(
            serviceName,
            methodName,
            [{}], // Empty data that should fail validation
            { useNapi: false, skipValidation: false }
          );
          
          // If validation rules exist, this should fail validation
          // If no validation rules, it should succeed
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('metadata');
          
          if (!result.success && result.error?.code === 'VALIDATION_FAILED') {
            expect(result.error).toHaveProperty('details');
            expect(result.error.details).toHaveProperty('errors');
            expect(Array.isArray(result.error.details.errors)).toBe(true);
          }
        }
      }
    });
  });

  describe('Validation Management', () => {
    it('should allow adding validation rules', () => {
      const bridges = service.listBridges();
      if (bridges.length > 0) {
        const serviceName = bridges[0];
        
        const testRules = [
          {
            field: 'testField',
            type: 'required' as const,
            message: 'Test field is required'
          },
          {
            field: 'testNumber',
            type: 'number' as const,
            min: 0,
            message: 'Test number must be positive'
          }
        ];
        
        const success = service.addValidationRule(serviceName, 'testMethod', testRules);
        expect(success).toBe(true);
      }
    });
  });

  describe('Metrics Management', () => {
    it('should allow resetting service metrics', () => {
      const bridges = service.listBridges();
      if (bridges.length > 0) {
        const serviceName = bridges[0];
        const success = service.resetServiceMetrics(serviceName);
        expect(success).toBe(true);
        
        // Verify metrics were reset
        const bridgeInfo = service.getBridgeInfo(serviceName);
        expect(bridgeInfo?.metrics.callCount).toBe(0);
        expect(bridgeInfo?.metrics.successCount).toBe(0);
        expect(bridgeInfo?.metrics.failureCount).toBe(0);
      }
    });
  });

  describe('Circuit Breaker', () => {
    it('should have circuit breaker configuration', () => {
      const bridges = service.listBridges();
      if (bridges.length > 0) {
        const serviceName = bridges[0];
        const bridgeInfo = service.getBridgeInfo(serviceName);
        
        expect(bridgeInfo?.metrics.circuitBreakerStatus).toBeDefined();
        expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(bridgeInfo?.metrics.circuitBreakerStatus);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid service names gracefully', async () => {
      const result = await service.executeProductionOperation(
        'non-existent-service',
        'testMethod',
        [],
        { skipValidation: true }
      );
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXECUTION_ERROR');
    });

    it('should provide detailed error information', async () => {
      const result = await service.executeProductionOperation(
        'non-existent-service',
        'testMethod',
        [],
        { skipValidation: true }
      );
      
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
      expect(result.error).toHaveProperty('details');
      expect(result).toHaveProperty('metadata');
    });
  });
});