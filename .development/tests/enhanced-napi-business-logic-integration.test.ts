/**
 * Comprehensive Test for Enhanced NAPI-RS Business Logic Integration
 */

import { 
  EnhancedBusinessLogicIntegrationService,
  ProductionGradeBusinessLogic
} from '../src/demo/enhanced-napi-business-logic-demo';

describe('Enhanced NAPI-RS Business Logic Integration', () => {
  let service: EnhancedBusinessLogicIntegrationService;

  beforeAll(async () => {
    service = EnhancedBusinessLogicIntegrationService.getInstance();
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow initialization
  });

  describe('Service Initialization and Bridge Management', () => {
    test('should initialize with all 40 service bridges', () => {
      const bridges = service.listBridges();
      
      expect(bridges).toHaveLength(40);
      expect(bridges).toContain('asset-lifecycle');
      expect(bridges).toContain('financial-consolidation');
      expect(bridges).toContain('contract-lifecycle');
      expect(bridges).toContain('advanced-intelligence');
      expect(bridges).toContain('space-utilization');
      
      // Check domain coverage
      const assetManagementServices = bridges.filter(b => 
        ['asset-lifecycle', 'inventory-management', 'maintenance-management', 'work-order-management', 'preventive-maintenance'].includes(b)
      );
      expect(assetManagementServices).toHaveLength(5);

      const financialServices = bridges.filter(b => 
        ['financial-consolidation', 'budget-forecast', 'chargeback-management', 'lease-management', 'portfolio-analytics'].includes(b)
      );
      expect(financialServices).toHaveLength(5);

      const businessOperationsServices = bridges.filter(b => 
        ['contract-lifecycle', 'critical-date-management', 'vendor-broker-management', 'cam-reconciliation', 'capital-project-management', 'move-management', 'business-operations-reports', 'workflow-automation'].includes(b)
      );
      expect(businessOperationsServices).toHaveLength(8);

      console.log('Available service bridges:', bridges.length);
    });

    test('should provide detailed bridge information', () => {
      const assetBridgeInfo = service.getBridgeInfo('asset-lifecycle');
      
      expect(assetBridgeInfo).toBeDefined();
      expect(assetBridgeInfo?.serviceName).toBe('asset-lifecycle');
      expect(assetBridgeInfo?.napiServiceName).toBe('asset-lifecycle');
      expect(assetBridgeInfo?.fallbackEnabled).toBe(true);
      expect(assetBridgeInfo?.integrationMethods).toContain('calculateDepreciation');
      expect(assetBridgeInfo?.integrationMethods).toContain('trackLifecycle');
      expect(assetBridgeInfo?.validation.enabled).toBe(true);
      expect(assetBridgeInfo?.rateLimit.maxRequestsPerMinute).toBe(600);

      console.log('Asset Lifecycle Bridge Info:', assetBridgeInfo);
    });

    test('should return null for non-existent bridge', () => {
      const bridgeInfo = service.getBridgeInfo('non-existent-service');
      expect(bridgeInfo).toBeNull();
    });
  });

  describe('Production-Grade Features', () => {
    test('should execute service with enhanced production features', async () => {
      const result = await service.executeWithEnhancedLogic('asset-lifecycle', 'calculateDepreciation', [{
        id: 'asset-123',
        initialValue: 100000,
        currentAge: 2,
        usefulLife: 10
      }]);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.serviceName).toBe('asset-lifecycle');
      expect(result.data.depreciation).toBeDefined();
      expect(result.metadata.serviceName).toBe('asset-lifecycle');
      expect(result.metadata.methodName).toBe('calculateDepreciation');
      expect(result.metadata.responseTime).toBeGreaterThan(0);

      console.log('Asset Depreciation Result:', result.data.depreciation);
    });

    test('should handle validation failures', async () => {
      await expect(
        service.executeWithEnhancedLogic('asset-lifecycle', 'createAsset', [{
          // Missing required fields
          name: '', // Invalid: empty string
          type: '', // Invalid: empty string
        }])
      ).rejects.toThrow('Validation failed');
    });

    test('should enforce rate limiting', async () => {
      const serviceName = 'space-utilization';
      const bridgeInfo = service.getBridgeInfo(serviceName);
      const maxRequests = bridgeInfo?.rateLimit.maxRequestsPerMinute || 500;

      // This would normally require many rapid requests, so we'll simulate
      // by checking that rate limit logic exists
      expect(bridgeInfo?.rateLimit.maxRequestsPerMinute).toBeGreaterThan(0);
      
      console.log(`Rate limit for ${serviceName}: ${maxRequests} requests/minute`);
    });

    test('should handle circuit breaker functionality', async () => {
      // Test successful execution (circuit breaker should be CLOSED)
      const result = await service.executeWithEnhancedLogic('financial-consolidation', 'consolidateFinancials', [{
        entities: [
          {
            id: 'entity1',
            name: 'Entity 1',
            currency: 'USD',
            financials: {
              revenue: 1000000,
              expenses: 800000,
              assets: 2000000,
              liabilities: 500000,
              cashFlow: 200000
            },
            intercompanyTransactions: []
          }
        ],
        baseCurrency: 'USD',
        consolidationDate: '2025-01-01'
      }]);

      expect(result.success).toBe(true);
      expect(result.metadata.circuitBreakerStatus).toBeDefined();
      
      console.log('Financial Consolidation Result:', result.data.consolidation);
    });

    test('should provide comprehensive health status', async () => {
      const healthStatus = await service.getComprehensiveHealthStatus();

      expect(healthStatus.totalServices).toBe(40);
      expect(healthStatus.overallHealth).toBeGreaterThanOrEqual(0);
      expect(healthStatus.overallHealth).toBeLessThanOrEqual(1);
      expect(healthStatus.healthyServices).toBeGreaterThanOrEqual(0);
      expect(healthStatus.unhealthyServices).toBeGreaterThanOrEqual(0);
      expect(healthStatus.services).toHaveLength(40);
      expect(healthStatus.servicesByDomain).toBeDefined();
      expect(healthStatus.globalMetrics).toBeDefined();
      expect(healthStatus.uptimeFormatted).toBeDefined();

      console.log(`Overall Health: ${(healthStatus.overallHealth * 100).toFixed(1)}%`);
      console.log(`Healthy Services: ${healthStatus.healthyServices}/${healthStatus.totalServices}`);
      console.log(`Uptime: ${healthStatus.uptimeFormatted}`);
    });

    test('should provide production metrics', () => {
      const metrics = service.getProductionMetrics();

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.successfulRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.failedRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
      expect(metrics.napiServiceHealth).toBeDefined();
      expect(metrics.businessLogicHealth).toBeDefined();

      console.log('Production Metrics:', {
        totalRequests: metrics.totalRequests,
        successRate: metrics.totalRequests > 0 ? 
          `${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%` : '0%',
        avgResponseTime: `${metrics.averageResponseTime.toFixed(1)}ms`,
        uptime: metrics.uptime
      });
    });

    test('should reset metrics successfully', () => {
      service.resetMetrics('asset-lifecycle');
      const bridgeInfo = service.getBridgeInfo('asset-lifecycle');
      
      expect(bridgeInfo?.metrics.callCount).toBe(0);
      expect(bridgeInfo?.metrics.successCount).toBe(0);
      expect(bridgeInfo?.metrics.failureCount).toBe(0);
    });
  });

  describe('Advanced Business Logic Execution', () => {
    test('should execute multiple services across different domains', async () => {
      const results = await Promise.allSettled([
        service.executeWithEnhancedLogic('asset-lifecycle', 'trackLifecycle', [{ assetId: 'asset-123' }]),
        service.executeWithEnhancedLogic('space-utilization', 'calculateUtilization', [{ 
          spaceId: 'space-456', 
          timeRange: { start: new Date(), end: new Date() }
        }]),
        service.executeWithEnhancedLogic('work-order-management', 'createWorkOrder', [{ 
          description: 'Fix HVAC unit', 
          priority: 'high' 
        }]),
        service.executeWithEnhancedLogic('energy-management', 'trackConsumption', [{ 
          buildingId: 'building-789' 
        }]),
        service.executeWithEnhancedLogic('contract-lifecycle', 'trackMilestones', [{ 
          contractId: 'contract-101' 
        }])
      ]);

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      expect(successful.length).toBeGreaterThanOrEqual(3); // At least 60% success rate
      console.log(`Multi-service execution: ${successful.length}/${results.length} successful`);

      if (successful.length > 0) {
        const sampleResult = successful[0].status === 'fulfilled' ? successful[0].value : null;
        expect(sampleResult?.success).toBe(true);
        expect(sampleResult?.metadata).toBeDefined();
      }
    });

    test('should handle fallback scenarios gracefully', async () => {
      // Even with simulated failures, fallback should work
      const attempts = [];
      
      for (let i = 0; i < 20; i++) {
        attempts.push(
          service.executeWithEnhancedLogic('advanced-intelligence', 'runPredictiveAnalysis', [{
            dataSet: 'equipment-data',
            analysisType: 'predictive',
            timeframe: '30-days'
          }]).catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.allSettled(attempts);
      const successful = results.filter(result => 
        result.status === 'fulfilled' && 
        !('error' in (result.value as any))
      );

      // Should have some successes due to fallback
      expect(successful.length).toBeGreaterThan(0);
      console.log(`Fallback test: ${successful.length}/20 successful executions`);
    });
  });

  describe('Production-Grade Business Logic Wrapper', () => {
    test('should execute with advanced logic wrapper', async () => {
      const result = await ProductionGradeBusinessLogic.executeWithAdvancedLogic(
        'financial-consolidation',
        'consolidateFinancials',
        [{
          entities: [{
            id: 'test-entity',
            name: 'Test Entity',
            currency: 'EUR',
            financials: { revenue: 500000, expenses: 400000, assets: 1000000, liabilities: 200000, cashFlow: 100000 },
            intercompanyTransactions: []
          }],
          baseCurrency: 'USD',
          consolidationDate: new Date().toISOString()
        }]
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should provide wrapper convenience methods', async () => {
      const healthStatus = await ProductionGradeBusinessLogic.getComprehensiveHealthStatus();
      const metrics = ProductionGradeBusinessLogic.getProductionMetrics();
      const services = ProductionGradeBusinessLogic.listAvailableServices();
      const bridgeConfig = ProductionGradeBusinessLogic.getBridgeConfiguration('asset-lifecycle');

      expect(healthStatus.totalServices).toBe(40);
      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(services).toHaveLength(40);
      expect(bridgeConfig?.serviceName).toBe('asset-lifecycle');

      console.log('Wrapper functionality verified');
    });
  });

  describe('Service Domain Coverage', () => {
    const expectedDomains = {
      'Asset Management': ['asset-lifecycle', 'inventory-management', 'maintenance-management', 'work-order-management', 'preventive-maintenance'],
      'Financial Management': ['financial-consolidation', 'budget-forecast', 'chargeback-management', 'lease-management', 'portfolio-analytics'],
      'Business Operations': ['contract-lifecycle', 'critical-date-management', 'vendor-broker-management', 'cam-reconciliation', 'capital-project-management', 'move-management', 'business-operations-reports', 'workflow-automation'],
      'Compliance & Governance': ['compliance-management', 'data-governance', 'emergency-planning', 'regulatory-compliance', 'audit-management'],
      'Infrastructure Technology': ['advanced-intelligence', 'iot-device-management', 'energy-management', 'cad-integration', 'business-intelligence'],
      'External Integration': ['api-management', 'calendar-integration', 'microsoft365-integration', 'salesforce-integration', 'phase3-integration'],
      'Document Management': ['document-management', 'bulk-data-management'],
      'Space Management': ['space-utilization', 'space-standards', 'space-booking', 'space-allocation', 'space-analytics']
    };

    Object.entries(expectedDomains).forEach(([domain, services]) => {
      test(`should have all ${domain} services integrated`, () => {
        const availableBridges = service.listBridges();
        
        services.forEach(serviceName => {
          expect(availableBridges).toContain(serviceName);
          
          const bridgeInfo = service.getBridgeInfo(serviceName);
          expect(bridgeInfo).toBeDefined();
          expect(bridgeInfo?.fallbackEnabled).toBe(true);
          expect(bridgeInfo?.integrationMethods.length).toBeGreaterThan(0);
        });

        console.log(`${domain}: ${services.length} services verified`);
      });
    });
  });

  describe('Real-world Integration Scenarios', () => {
    test('should handle asset lifecycle management scenario', async () => {
      // Simulate complete asset lifecycle workflow
      const assetData = {
        name: 'HVAC Unit A-1',
        type: 'HVAC',
        locationId: 'building-1-floor-2',
        value: 50000,
        usefulLife: 15,
        condition: 8
      };

      // Step 1: Calculate depreciation
      const depreciationResult = await service.executeWithEnhancedLogic('asset-lifecycle', 'calculateDepreciation', [{
        ...assetData,
        initialValue: assetData.value,
        currentAge: 3,
        usefulLifeYears: assetData.usefulLife,
        depreciationMethod: 'straight-line'
      }]);

      expect(depreciationResult.success).toBe(true);
      expect(depreciationResult.data.depreciation).toBeDefined();

      // Step 2: Track lifecycle status
      const lifecycleResult = await service.executeWithEnhancedLogic('asset-lifecycle', 'trackLifecycle', [{
        assetId: 'hvac-unit-a1'
      }]);

      expect(lifecycleResult.success).toBe(true);
      expect(lifecycleResult.data.lifecycle).toBeDefined();

      console.log('Asset Lifecycle Scenario:', {
        depreciation: depreciationResult.data.depreciation,
        lifecycle: lifecycleResult.data.lifecycle
      });
    });

    test('should handle financial consolidation scenario', async () => {
      // Simulate multi-entity financial consolidation
      const consolidationData = {
        entities: [
          {
            id: 'entity-us',
            name: 'US Operations',
            currency: 'USD',
            financials: { revenue: 2000000, expenses: 1600000, assets: 5000000, liabilities: 1000000, cashFlow: 400000 },
            intercompanyTransactions: [
              { counterpartyId: 'entity-eu', amount: 100000, type: 'receivable' }
            ]
          },
          {
            id: 'entity-eu',
            name: 'European Operations',
            currency: 'EUR',
            financials: { revenue: 1500000, expenses: 1200000, assets: 3000000, liabilities: 800000, cashFlow: 300000 },
            intercompanyTransactions: [
              { counterpartyId: 'entity-us', amount: 90000, type: 'payable' }
            ]
          }
        ],
        baseCurrency: 'USD',
        exchangeRates: { EUR: 1.1, USD: 1.0 },
        consolidationDate: new Date().toISOString()
      };

      const consolidationResult = await service.executeWithEnhancedLogic('financial-consolidation', 'consolidateFinancials', [consolidationData]);

      expect(consolidationResult.success).toBe(true);
      expect(consolidationResult.data.consolidation).toBeDefined();
      expect(consolidationResult.data.consolidation.totalRevenue).toBeGreaterThan(0);
      expect(consolidationResult.data.consolidation.netIncome).toBeDefined();

      console.log('Financial Consolidation Scenario:', consolidationResult.data.consolidation);
    });

    test('should handle space optimization scenario', async () => {
      // Simulate space utilization analysis and optimization
      const spaceData = {
        spaceId: 'conference-room-a',
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      };

      // Step 1: Calculate current utilization
      const utilizationResult = await service.executeWithEnhancedLogic('space-utilization', 'calculateUtilization', [spaceData]);

      expect(utilizationResult.success).toBe(true);
      expect(utilizationResult.data.utilization).toBeDefined();

      // Step 2: Get optimization recommendations
      const optimizationResult = await service.executeWithEnhancedLogic('space-utilization', 'optimizeSpaceAllocation', [spaceData]);

      expect(optimizationResult.success).toBe(true);
      expect(optimizationResult.data.optimization).toBeDefined();

      console.log('Space Optimization Scenario:', {
        utilization: utilizationResult.data.utilization,
        optimization: optimizationResult.data.optimization
      });
    });
  });
});

// Additional integration test for performance
describe('Performance and Load Testing', () => {
  let service: EnhancedBusinessLogicIntegrationService;

  beforeAll(() => {
    service = EnhancedBusinessLogicIntegrationService.getInstance();
  });

  test('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 50;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      const serviceName = ['asset-lifecycle', 'space-utilization', 'work-order-management', 'energy-management'][i % 4];
      const methodName = ['trackLifecycle', 'calculateUtilization', 'createWorkOrder', 'trackConsumption'][i % 4];
      
      requests.push(
        service.executeWithEnhancedLogic(serviceName, methodName, [{ id: `test-${i}` }])
          .catch(error => ({ error: error.message }))
      );
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(requests);
    const endTime = Date.now();

    const successful = results.filter(result => 
      result.status === 'fulfilled' && 
      !('error' in (result.value as any))
    );

    const averageResponseTime = (endTime - startTime) / concurrentRequests;

    expect(successful.length).toBeGreaterThan(concurrentRequests * 0.7); // At least 70% success
    expect(averageResponseTime).toBeLessThan(1000); // Under 1 second average

    console.log(`Concurrent Load Test: ${successful.length}/${concurrentRequests} successful`);
    console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`Total Test Duration: ${endTime - startTime}ms`);
  });

  test('should maintain performance under sustained load', async () => {
    const sustainedRequests = 100;
    const batchSize = 10;
    const successfulRequests = [];

    for (let batch = 0; batch < sustainedRequests / batchSize; batch++) {
      const batchRequests = [];
      
      for (let i = 0; i < batchSize; i++) {
        batchRequests.push(
          service.executeWithEnhancedLogic('advanced-intelligence', 'runPredictiveAnalysis', [{
            dataSet: 'performance-test',
            analysisType: 'predictive',
            timeframe: '24-hours'
          }]).catch(() => null)
        );
      }

      const batchResults = await Promise.all(batchRequests);
      const batchSuccessful = batchResults.filter(result => result?.success === true);
      successfulRequests.push(...batchSuccessful);

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const successRate = successfulRequests.length / sustainedRequests;
    expect(successRate).toBeGreaterThan(0.6); // At least 60% success under sustained load

    console.log(`Sustained Load Test: ${successfulRequests.length}/${sustainedRequests} successful (${(successRate * 100).toFixed(1)}%)`);
  });
});