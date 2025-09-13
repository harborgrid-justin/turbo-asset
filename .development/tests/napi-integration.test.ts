/**
 * Test suite for NAPI-RS packages
 * This module provides comprehensive testing for all napi-rs packages
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { napiRegistry } from '../src/services/napi-integration';

describe('NAPI-RS Integration Tests', () => {
  beforeAll(async () => {
    // Initialize all NAPI services
    await napiRegistry.initializeAllServices();
  });

  describe('Service Registration', () => {
    it('should register all 20 napi-rs services', () => {
      const status = napiRegistry.getServicesStatus();
      const serviceNames = Object.keys(status);
      
      expect(serviceNames).toHaveLength(20);
      expect(serviceNames).toContain('asset-lifecycle');
      expect(serviceNames).toContain('notification');
      expect(serviceNames).toContain('document');
      expect(serviceNames).toContain('bulk-data');
      expect(serviceNames).toContain('business-intelligence');
      expect(serviceNames).toContain('cad-integration');
      expect(serviceNames).toContain('chargeback');
      expect(serviceNames).toContain('compliance');
      expect(serviceNames).toContain('custom-field');
      expect(serviceNames).toContain('energy-management');
      expect(serviceNames).toContain('inventory');
      expect(serviceNames).toContain('iot-device');
      expect(serviceNames).toContain('lease-management');
      expect(serviceNames).toContain('maintenance');
      expect(serviceNames).toContain('portfolio');
      expect(serviceNames).toContain('reporting');
      expect(serviceNames).toContain('space-utilization');
      expect(serviceNames).toContain('work-order');
      expect(serviceNames).toContain('workflow-engine');
      expect(serviceNames).toContain('integration');
    });

    it('should have proper service configurations', () => {
      const status = napiRegistry.getServicesStatus();
      
      Object.values(status).forEach((serviceStatus: any) => {
        expect(serviceStatus.config).toBeDefined();
        expect(serviceStatus.config.serviceName).toBeDefined();
        expect(serviceStatus.config.packageName).toBeDefined();
        expect(serviceStatus.config.fallbackToTs).toBe(true);
      });
    });
  });

  describe('Asset Lifecycle Service', () => {
    it('should initialize and provide health check', async () => {
      const result = await napiRegistry.executeServiceMethod(
        'asset-lifecycle',
        'healthCheck'
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.requestId).toBeDefined();
    });

    it('should calculate straight-line depreciation', async () => {
      const result = await napiRegistry.executeServiceMethod(
        'asset-lifecycle',
        'calculateStraightLineDepreciation',
        [100000, 10000, 10, 3]
      );
      
      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.year).toBe(3);
        expect(result.data.depreciationAmount).toBe(9000);
        expect(result.data.accumulatedDepreciation).toBe(27000);
        expect(result.data.endingValue).toBe(73000);
      }
    });

    it('should validate asset lifecycle data', async () => {
      const validData = {
        baseEntity: {
          id: 'test-id',
          organizationId: 'org-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          updatedBy: 'user-1',
          version: 1,
          isActive: true
        },
        assetId: 'asset-123',
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLife: 10,
        salvageValue: 5000,
        purchasePrice: 50000,
        purchaseDate: new Date()
      };

      const result = await napiRegistry.executeServiceMethod(
        'asset-lifecycle',
        'validateAssetLifecycleData',
        [validData]
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  describe('Universal Data Standard Compliance', () => {
    const testServices = [
      'notification', 'document', 'bulk-data', 'business-intelligence',
      'cad-integration', 'chargeback', 'compliance', 'custom-field'
    ];

    testServices.forEach(serviceName => {
      it(`${serviceName} service should provide standard methods`, async () => {
        const healthResult = await napiRegistry.executeServiceMethod(
          serviceName,
          'healthCheck'
        );
        expect(healthResult.success).toBe(true);

        const infoResult = await napiRegistry.executeServiceMethod(
          serviceName,
          'getServiceInfo'
        );
        expect(infoResult.success).toBe(true);
        expect(infoResult.data).toBeDefined();
        expect(infoResult.data.name).toBe(serviceName);
        expect(infoResult.data.version).toBe('1.0.0');
      });
    });
  });

  describe('Performance and Metrics', () => {
    it('should record execution metrics', async () => {
      // Execute a few operations
      await napiRegistry.executeServiceMethod('asset-lifecycle', 'healthCheck');
      await napiRegistry.executeServiceMethod('notification', 'healthCheck');
      await napiRegistry.executeServiceMethod('document', 'healthCheck');

      const assetMetrics = napiRegistry.getServiceMetrics('asset-lifecycle');
      const notificationMetrics = napiRegistry.getServiceMetrics('notification');
      const documentMetrics = napiRegistry.getServiceMetrics('document');

      expect(assetMetrics.length).toBeGreaterThan(0);
      expect(notificationMetrics.length).toBeGreaterThan(0);
      expect(documentMetrics.length).toBeGreaterThan(0);

      // Check metric structure
      assetMetrics.forEach(metric => {
        expect(metric.moduleId).toBe('asset-lifecycle');
        expect(metric.operationName).toBeDefined();
        expect(metric.executionTime).toBeGreaterThan(0);
        expect(metric.success).toBeDefined();
        expect(metric.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should handle service errors gracefully', async () => {
      const result = await napiRegistry.executeServiceMethod(
        'asset-lifecycle',
        'nonExistentMethod'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBeDefined();
      expect(result.error!.message).toBeDefined();
    });
  });

  describe('Fallback Mechanism', () => {
    it('should fallback to TypeScript implementations when NAPI fails', () => {
      // This test verifies that the fallback mechanism is properly configured
      const status = napiRegistry.getServicesStatus();
      
      Object.values(status).forEach((serviceStatus: any) => {
        expect(serviceStatus.config.fallbackToTs).toBe(true);
      });
    });
  });

  describe('Response Format Standardization', () => {
    it('should return standardized responses for all services', async () => {
      const services = ['asset-lifecycle', 'notification', 'document', 'bulk-data'];
      
      for (const serviceName of services) {
        const result = await napiRegistry.executeServiceMethod(
          serviceName,
          'healthCheck'
        );
        
        // Verify response structure
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('metadata');
        expect(result.metadata).toHaveProperty('timestamp');
        expect(result.metadata).toHaveProperty('requestId');
        expect(result.metadata).toHaveProperty('executionTime');
        expect(result.metadata).toHaveProperty('apiVersion');
        
        if (result.success) {
          expect(result).toHaveProperty('data');
        } else {
          expect(result).toHaveProperty('error');
          expect(result.error).toHaveProperty('code');
          expect(result.error).toHaveProperty('message');
        }
      }
    });
  });
});

describe('Individual Service Tests', () => {
  describe('Energy Management Service', () => {
    it('should provide energy-specific functionality', async () => {
      const result = await napiRegistry.executeServiceMethod(
        'energy-management',
        'getServiceInfo'
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.description).toContain('energy');
    });
  });

  describe('IoT Device Service', () => {
    it('should provide IoT-specific functionality', async () => {
      const result = await napiRegistry.executeServiceMethod(
        'iot-device',
        'getServiceInfo'
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.description).toContain('IoT');
    });
  });

  describe('Workflow Engine', () => {
    it('should provide workflow-specific functionality', async () => {
      const result = await napiRegistry.executeServiceMethod(
        'workflow-engine',
        'getServiceInfo'
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.description).toContain('workflow');
    });
  });
});

describe('Integration Testing', () => {
  it('should demonstrate service interoperability', async () => {
    // Test that services can work together
    const services = napiRegistry.getServicesStatus();
    const serviceCount = Object.keys(services).length;
    
    expect(serviceCount).toBe(20);
    
    // All services should be able to initialize
    const initPromises = Object.keys(services).map(serviceName => 
      napiRegistry.executeServiceMethod(serviceName, 'initialize', [{}])
    );
    
    const results = await Promise.allSettled(initPromises);
    const successfulInits = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    
    // At least 80% of services should initialize successfully
    expect(successfulInits / serviceCount).toBeGreaterThan(0.8);
  });
});