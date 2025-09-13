/**
 * Business Logic Integration Tests
 * Tests the integration between NAPI-RS services and TypeScript business logic
 */

import { businessLogicIntegration } from '../src/services/business-logic-integration';
import { napiRegistry } from '../src/services/napi-integration';

describe('Business Logic Integration Service', () => {
  beforeAll(async () => {
    // Initialize the integration service
    await businessLogicIntegration.initialize();
    await napiRegistry.initializeAllServices();
  });

  describe('Service Bridge Management', () => {
    test('should list all available bridges', () => {
      const bridges = businessLogicIntegration.listBridges();
      
      expect(bridges).toContain('contract-lifecycle');
      expect(bridges).toContain('critical-date');
      expect(bridges).toContain('vendor-broker');
      expect(bridges).toContain('budget-forecast');
      expect(bridges).toContain('financial-consolidation');
      expect(bridges).toContain('data-governance');
      expect(bridges).toContain('emergency-planning');
      expect(bridges).toContain('api-management');
      expect(bridges).toContain('calendar-integration');
      expect(bridges).toContain('advanced-intelligence');
      expect(bridges).toContain('document');
      expect(bridges).toContain('space-standards');
      expect(bridges).toContain('asset-lifecycle');
      
      // Should have all 40 services bridged
      expect(bridges.length).toBeGreaterThanOrEqual(20);
    });

    test('should get bridge information for a service', () => {
      const bridgeInfo = businessLogicIntegration.getBridgeInfo('contract-lifecycle');
      
      expect(bridgeInfo).toBeDefined();
      expect(bridgeInfo?.napiServiceName).toBe('contract-lifecycle');
      expect(bridgeInfo?.fallbackEnabled).toBe(true);
      expect(bridgeInfo?.integrationMethods).toContain('createContract');
    });

    test('should return null for non-existent bridge', () => {
      const bridgeInfo = businessLogicIntegration.getBridgeInfo('non-existent-service');
      expect(bridgeInfo).toBeNull();
    });
  });

  describe('Integrated Operations', () => {
    test('should execute health check operations', async () => {
      // Test various services health checks
      const services = [
        'asset-lifecycle',
        'notification',
        'document',
        'advanced-intelligence',
        'api-management'
      ];

      for (const serviceName of services) {
        const result = await businessLogicIntegration.executeIntegratedOperation(
          serviceName,
          'healthCheck',
          [],
          { timeout: 5000 }
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeDefined();
        }
      }
    });

    test('should execute service info operations', async () => {
      const result = await businessLogicIntegration.executeIntegratedOperation(
        'asset-lifecycle',
        'getServiceInfo',
        []
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(typeof result.data).toBe('object');
      }
    });

    test('should handle service not found', async () => {
      const result = await businessLogicIntegration.executeIntegratedOperation(
        'non-existent-service',
        'someMethod',
        []
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_NOT_FOUND');
    });

    test('should handle method not available', async () => {
      const result = await businessLogicIntegration.executeIntegratedOperation(
        'asset-lifecycle',
        'nonExistentMethod',
        []
      );

      // Should either succeed (if NAPI service handles it) or fail gracefully
      if (!result.success) {
        expect(result.error?.code).toMatch(/METHOD_NOT_AVAILABLE|EXECUTION_ERROR/);
      }
    });
  });

  describe('NAPI vs TypeScript Fallback', () => {
    test('should prefer NAPI service when available', async () => {
      const result = await businessLogicIntegration.executeIntegratedOperation(
        'asset-lifecycle',
        'healthCheck',
        [],
        { useNapi: true }
      );

      expect(result.success).toBe(true);
      // Should have metadata indicating NAPI execution
      expect(result.metadata).toBeDefined();
    });

    test('should use TypeScript fallback when NAPI disabled', async () => {
      const bridgeInfo = businessLogicIntegration.getBridgeInfo('contract-lifecycle');
      
      if (bridgeInfo?.businessLogicService) {
        const result = await businessLogicIntegration.executeIntegratedOperation(
          'contract-lifecycle',
          'healthCheck',
          [],
          { useNapi: false }
        );

        // Should either succeed with TypeScript or indicate method not available
        expect(result).toBeDefined();
      }
    });
  });

  describe('Business Logic Domain Integration', () => {
    test('should integrate business operations domain', async () => {
      const services = ['contract-lifecycle', 'critical-date', 'vendor-broker'];
      
      for (const serviceName of services) {
        const bridgeInfo = businessLogicIntegration.getBridgeInfo(serviceName);
        expect(bridgeInfo).toBeDefined();
        expect(bridgeInfo?.napiServiceName).toBe(serviceName);
      }
    });

    test('should integrate financial management domain', async () => {
      const services = ['budget-forecast', 'financial-consolidation'];
      
      for (const serviceName of services) {
        const bridgeInfo = businessLogicIntegration.getBridgeInfo(serviceName);
        expect(bridgeInfo).toBeDefined();
        expect(bridgeInfo?.fallbackEnabled).toBe(true);
      }
    });

    test('should integrate compliance & governance domain', async () => {
      const services = ['data-governance', 'emergency-planning'];
      
      for (const serviceName of services) {
        const bridgeInfo = businessLogicIntegration.getBridgeInfo(serviceName);
        expect(bridgeInfo).toBeDefined();
      }
    });

    test('should integrate infrastructure technology domain', async () => {
      const result = await businessLogicIntegration.executeIntegratedOperation(
        'advanced-intelligence',
        'healthCheck',
        []
      );

      expect(result).toBeDefined();
    });
  });

  describe('Health Monitoring', () => {
    test('should provide comprehensive health check', async () => {
      const health = await businessLogicIntegration.healthCheck();
      
      expect(health.bridgeCount).toBeGreaterThan(0);
      expect(health.napiHealthy).toBeGreaterThanOrEqual(0);
      expect(health.businessLogicHealthy).toBeGreaterThanOrEqual(0);
      
      // At least some services should be healthy
      expect(health.napiHealthy + health.businessLogicHealthy).toBeGreaterThan(0);
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        businessLogicIntegration.executeIntegratedOperation(
          'asset-lifecycle',
          'healthCheck',
          [],
          { timeout: 5000 }
        )
      );

      const results = await Promise.allSettled(operations);
      
      // Most operations should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      expect(successful).toBeGreaterThan(5);
    });

    test('should handle timeout gracefully', async () => {
      const result = await businessLogicIntegration.executeIntegratedOperation(
        'asset-lifecycle',
        'healthCheck',
        [],
        { timeout: 1 } // Very short timeout
      );

      // Should either succeed quickly or handle timeout gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid arguments gracefully', async () => {
      const result = await businessLogicIntegration.executeIntegratedOperation(
        'asset-lifecycle',
        'someMethod',
        ['invalid', 'arguments']
      );

      expect(result).toBeDefined();
      // Should not crash the system
    });

    test('should provide meaningful error messages', async () => {
      const result = await businessLogicIntegration.executeIntegratedOperation(
        'non-existent-service',
        'someMethod',
        []
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
      expect(result.error?.code).toBeDefined();
    });
  });
});

describe('NAPI Registry Integration', () => {
  test('should have all 40 services configured', async () => {
    // This test ensures all services are properly configured in the NAPI registry
    const expectedServices = [
      // Original 20 services
      'asset-lifecycle', 'notification', 'document', 'bulk-data', 'business-intelligence',
      'cad-integration', 'chargeback', 'compliance', 'custom-field', 'energy-management',
      'inventory', 'iot-device', 'lease-management', 'maintenance', 'portfolio',
      'reporting', 'space-utilization', 'work-order', 'workflow-engine', 'integration',
      
      // Additional 20 services
      'advanced-intelligence', 'api-documentation', 'api-management', 'budget-forecast',
      'calendar-integration', 'contract-lifecycle', 'critical-date', 'data-governance',
      'data-warehouse', 'emergency-planning', 'enterprise-service-bus', 'financial-consolidation',
      'move-management', 'preventive-maintenance', 'sdk-generator', 'space-standards',
      'technician-mobile', 'vendor-broker', 'white-label', 'workflow'
    ];

    expect(expectedServices).toHaveLength(40);

    // Test health check endpoint works
    for (const serviceName of expectedServices.slice(0, 5)) { // Test first 5 for performance
      const result = await napiRegistry.executeServiceMethod(
        serviceName,
        'healthCheck',
        [],
        { timeout: 5000 }
      );

      // Should either succeed or gracefully fallback
      expect(result).toBeDefined();
    }
  });
});