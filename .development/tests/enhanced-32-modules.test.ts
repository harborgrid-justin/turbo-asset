/**
 * Test suite for 32 High-Performance NAPI-RS Business Logic Modules
 * Validates complete frontend integration and production-grade features
 */

import { EnhancedBusinessLogicIntegrationService } from '../src/services/enhanced-business-logic-integration';

describe('32 High-Performance NAPI-RS Business Logic Modules', () => {
  let enhancedService: EnhancedBusinessLogicIntegrationService;

  beforeAll(() => {
    enhancedService = EnhancedBusinessLogicIntegrationService.getInstance();
  });

  afterAll(() => {
    // Cleanup intervals to prevent Jest from hanging
    enhancedService.shutdown();
  });

  test('should initialize exactly 32 high-performance business logic modules', () => {
    const bridges = enhancedService.getServiceBridges();
    expect(bridges.length).toBe(32);
  });

  test('should cover all 8 business domains', () => {
    const bridges = enhancedService.getServiceBridges();
    
    // Business Operations Domain (6 modules)
    const businessOpsModules = bridges.filter((bridge: any) => 
      ['asset-lifecycle', 'contract-lifecycle', 'critical-date', 'vendor-broker', 'lease-management', 'capital-project'].includes(bridge.serviceName)
    );
    expect(businessOpsModules.length).toBe(6);

    // Financial Management Domain (4 modules)
    const financialModules = bridges.filter((bridge: any) => 
      ['budget-forecast', 'financial-consolidation', 'chargeback', 'cam-reconciliation'].includes(bridge.serviceName)
    );
    expect(financialModules.length).toBe(4);

    // Document Management Domain (3 modules)
    const documentModules = bridges.filter((bridge: any) => 
      ['document-management', 'bulk-data', 'custom-field'].includes(bridge.serviceName)
    );
    expect(documentModules.length).toBe(3);

    // Infrastructure Technology Domain (5 modules)
    const infraModules = bridges.filter((bridge: any) => 
      ['advanced-intelligence', 'energy-management', 'cad-integration', 'iot-device', 'business-intelligence'].includes(bridge.serviceName)
    );
    expect(infraModules.length).toBe(5);

    // Space Management Domain (4 modules)
    const spaceModules = bridges.filter((bridge: any) => 
      ['space-standards', 'space-utilization', 'move-management', 'emergency-planning'].includes(bridge.serviceName)
    );
    expect(spaceModules.length).toBe(4);

    // Asset Operations Domain (4 modules)
    const assetModules = bridges.filter((bridge: any) => 
      ['inventory', 'maintenance', 'preventive-maintenance', 'work-order'].includes(bridge.serviceName)
    );
    expect(assetModules.length).toBe(4);

    // Workflow & Automation Domain (3 modules)
    const workflowModules = bridges.filter((bridge: any) => 
      ['workflow-engine', 'notification', 'reporting'].includes(bridge.serviceName)
    );
    expect(workflowModules.length).toBe(3);

    // Compliance & Governance Domain (3 modules including portfolio analytics)
    const complianceModules = bridges.filter((bridge: any) => 
      ['compliance', 'data-governance', 'portfolio-analytics'].includes(bridge.serviceName)
    );
    expect(complianceModules.length).toBe(3);
  });

  test('should have production-grade features enabled for all modules', () => {
    const bridges = enhancedService.getServiceBridges();
    
    bridges.forEach((bridge: any) => {
      // Circuit breaker enabled
      expect(bridge.metrics.circuitBreakerStatus).toBeDefined();
      expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(bridge.metrics.circuitBreakerStatus);
      
      // Rate limiting configured
      expect(bridge.rateLimit.maxRequestsPerMinute).toBeGreaterThan(0);
      expect(bridge.rateLimit.maxRequestsPerMinute).toBeLessThanOrEqual(1000);
      
      // Fallback enabled
      expect(bridge.fallbackEnabled).toBe(true);
      
      // Validation enabled
      expect(bridge.validation.enabled).toBe(true);
      
      // Retry configuration
      expect(bridge.retry.maxAttempts).toBe(3);
      expect(bridge.retry.backoffMultiplier).toBe(2);
      expect(bridge.retry.baseDelayMs).toBe(1000);
    });
  });

  test('should provide comprehensive production metrics', () => {
    const metrics = enhancedService.getProductionMetrics();
    
    expect(metrics.totalRequests).toBeDefined();
    expect(metrics.successfulRequests).toBeDefined();
    expect(metrics.failedRequests).toBeDefined();
    expect(metrics.averageResponseTime).toBeDefined();
    expect(metrics.serviceHealth).toBeDefined();
    expect(metrics.circuitBreakerMetrics).toBeDefined();
    expect(metrics.rateLimitMetrics).toBeDefined();
    expect(metrics.validationMetrics).toBeDefined();
  });

  test('should support operation execution with production features', async () => {
    // Test with asset lifecycle service
    const result = await enhancedService.executeProductionOperation(
      'asset-lifecycle',
      'calculateDepreciation',
      [{ name: 'Test Asset', type: 'Equipment', locationId: 'LOC001' }]
    );
    
    expect(result.success).toBe(true);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.requestId).toBeDefined();
    expect(result.metadata?.executionTime).toBeDefined();
    expect(result.metadata?.apiVersion).toBe('1.0.0');
  });

  test('should handle validation failures appropriately', async () => {
    // Test validation with missing required field
    const result = await enhancedService.executeProductionOperation(
      'contract-lifecycle',
      'processContract',
      [{ title: '', vendorId: '' }] // Missing required fields
    );
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_FAILED');
    expect(result.error?.message).toBe('Input validation failed');
  });

  test('should provide complete health status', () => {
    const health = enhancedService.getComprehensiveHealthStatus();
    
    expect(health.status).toBeDefined();
    expect(['HEALTHY', 'DEGRADED', 'UNHEALTHY']).toContain(health.status);
    expect(health.uptime).toBeDefined();
    expect(health.servicesHealthy).toBeDefined();
    expect(health.servicesTotal).toBe(32);
    expect(health.metrics).toBeDefined();
    expect(health.timestamp).toBeDefined();
  });

  test('should support advanced analytics', () => {
    const analytics = enhancedService.getAdvancedAnalytics();
    
    expect(analytics.performanceMetrics).toBeDefined();
    expect(analytics.businessInsights).toBeDefined();
    expect(analytics.predictiveAnalytics).toBeDefined();
    expect(analytics.systemOptimization).toBeDefined();
    expect(analytics.timestamp).toBeDefined();
  });
});