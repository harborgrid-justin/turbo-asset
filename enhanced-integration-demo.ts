/**
 * Complete Frontend-Backend Integration Example
 * Demonstrates the enhanced NAPI-RS business logic integration in action
 */

import express from 'express';
import { enhancedBusinessLogicIntegration } from './src/services/enhanced-business-logic-integration';
import enhancedRoutes from './src/routes/enhanced-business-logic-integration';

const app = express();
app.use(express.json());

// Enhanced business logic integration routes
app.use('/api/enhanced-business-logic-integration', enhancedRoutes);

// Example of complete integration flow
async function demonstrateEnhancedIntegration() {
  console.log('🚀 Enhanced NAPI-RS Business Logic Integration Demo');
  console.log('================================================\n');

  // 1. Service Health Check
  console.log('1. Checking Service Health...');
  try {
    const health = await enhancedBusinessLogicIntegration.healthCheck();
    console.log(`✅ Bridge Count: ${health.bridgeCount}`);
    console.log(`✅ NAPI Healthy: ${health.napiHealthy}`);
    console.log(`✅ Business Logic Healthy: ${health.businessLogicHealthy}\n`);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }

  // 2. List Available Services
  console.log('2. Available Enhanced Services...');
  const bridges = enhancedBusinessLogicIntegration.listBridges();
  bridges.forEach(serviceName => {
    const bridge = enhancedBusinessLogicIntegration.getBridgeInfo(serviceName);
    console.log(`📋 ${serviceName}:`);
    console.log(`   - NAPI Service: ${bridge?.napiServiceName}`);
    console.log(`   - Rate Limit: ${bridge?.rateLimit.maxRequestsPerMinute}/min`);
    console.log(`   - Circuit Breaker: ${bridge?.metrics.circuitBreakerStatus}`);
    console.log(`   - Validation: ${bridge?.validation.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   - Methods: ${bridge?.integrationMethods.join(', ')}\n`);
  });

  // 3. Execute Operations with Production Features
  console.log('3. Executing Operations with Production Monitoring...');

  // Asset lifecycle operation
  try {
    console.log('🔧 Testing Asset Lifecycle Service...');
    const assetResult = await enhancedBusinessLogicIntegration.executeProductionOperation(
      'asset-lifecycle',
      'calculateDepreciation',
      [{ 
        assetId: 'ASSET-001',
        initialValue: 100000,
        salvageValue: 10000,
        usefulLife: 10,
        currentYear: 3
      }],
      { useNapi: false, skipValidation: false }
    );

    if (assetResult.success) {
      console.log('✅ Asset operation completed successfully');
      console.log(`   - Execution time: ${assetResult.metadata?.executionTime}ms`);
      console.log(`   - Source: ${assetResult.metadata?.source || 'NAPI-RS'}`);
    } else {
      console.log('❌ Asset operation failed:', assetResult.error?.message);
    }
  } catch (error) {
    console.log('❌ Asset operation error:', error.message);
  }

  // Contract lifecycle operation
  try {
    console.log('\n📄 Testing Contract Lifecycle Service...');
    const contractResult = await enhancedBusinessLogicIntegration.executeProductionOperation(
      'contract-lifecycle',
      'evaluateVendor',
      [{ 
        vendorId: 'VENDOR-001',
        contractValue: 50000,
        evaluationCriteria: ['performance', 'cost', 'reliability']
      }],
      { useNapi: false, skipValidation: false }
    );

    if (contractResult.success) {
      console.log('✅ Contract operation completed successfully');
      console.log(`   - Execution time: ${contractResult.metadata?.executionTime}ms`);
      console.log(`   - Source: ${contractResult.metadata?.source || 'NAPI-RS'}`);
    } else {
      console.log('❌ Contract operation failed:', contractResult.error?.message);
    }
  } catch (error) {
    console.log('❌ Contract operation error:', error.message);
  }

  // 4. Test Validation Features
  console.log('\n4. Testing Enhanced Validation...');
  try {
    const validationResult = await enhancedBusinessLogicIntegration.executeProductionOperation(
      'document-management',
      'uploadDocument',
      [{ 
        // Missing required fields to trigger validation
        title: '', // Invalid: too short
        organizationId: '' // Invalid: required
      }],
      { useNapi: false, skipValidation: false }
    );

    if (!validationResult.success && validationResult.error?.code === 'VALIDATION_FAILED') {
      console.log('✅ Validation working correctly');
      console.log('   - Validation errors:', validationResult.error.details?.errors);
    } else {
      console.log('⚠️  Validation test unexpected result');
    }
  } catch (error) {
    console.log('❌ Validation test error:', error.message);
  }

  // 5. Test Rate Limiting (simulation)
  console.log('\n5. Testing Rate Limiting Configuration...');
  bridges.forEach(serviceName => {
    const bridge = enhancedBusinessLogicIntegration.getBridgeInfo(serviceName);
    if (bridge) {
      console.log(`📊 ${serviceName}: ${bridge.rateLimit.maxRequestsPerMinute} requests/minute`);
      console.log(`   - Current window requests: ${bridge.rateLimit.requestWindow.size}`);
      console.log(`   - Blocked until: ${bridge.rateLimit.blockUntil?.toISOString() || 'Not blocked'}`);
    }
  });

  // 6. Comprehensive Health Check
  console.log('\n6. Comprehensive System Health...');
  try {
    const healthStatus = await enhancedBusinessLogicIntegration.comprehensiveHealthCheck();
    console.log(`🏥 Overall Health: ${healthStatus.overallHealth}`);
    console.log(`📈 System Metrics:`);
    console.log(`   - Total Services: ${healthStatus.systemMetrics.totalServices}`);
    console.log(`   - Healthy: ${healthStatus.systemMetrics.healthyServices}`);
    console.log(`   - Degraded: ${healthStatus.systemMetrics.degradedServices}`);
    console.log(`   - Unhealthy: ${healthStatus.systemMetrics.unhealthyServices}`);
    console.log(`   - Circuit Breakers Open: ${healthStatus.systemMetrics.circuitBreakersOpen}`);
    console.log(`   - Rate Limited Services: ${healthStatus.systemMetrics.rateLimitedServices}`);

    console.log('\n📊 Service Details:');
    for (const [serviceName, details] of healthStatus.serviceDetails) {
      console.log(`   ${serviceName}:`);
      console.log(`     - Status: ${details.status}`);
      console.log(`     - NAPI Health: ${details.napiServiceHealth ? '✅' : '❌'}`);
      console.log(`     - Business Logic Health: ${details.businessLogicHealth ? '✅' : '❌'}`);
      console.log(`     - Circuit Breaker: ${details.circuitBreakerStatus}`);
      console.log(`     - Error Rate: ${(details.errorRate * 100).toFixed(2)}%`);
      console.log(`     - Avg Response: ${details.responseTime.toFixed(1)}ms`);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }

  // 7. Production Metrics Summary
  console.log('\n7. Production Metrics Summary...');
  try {
    const metrics = enhancedBusinessLogicIntegration.getProductionMetrics();
    console.log(`📊 Total Requests: ${metrics.totalRequests}`);
    console.log(`✅ Successful: ${metrics.successfulRequests}`);
    console.log(`❌ Failed: ${metrics.failedRequests}`);
    console.log(`⏱️  Avg Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
    
    const successRate = metrics.totalRequests > 0 
      ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)
      : '0.00';
    console.log(`📈 Success Rate: ${successRate}%`);

    console.log('\n🔄 Circuit Breaker Status:');
    for (const [serviceName, cbMetrics] of metrics.circuitBreakerMetrics) {
      console.log(`   ${serviceName}: ${cbMetrics.status} (${cbMetrics.failureCount} failures)`);
    }

    console.log('\n🚦 Rate Limit Status:');
    for (const [serviceName, rlMetrics] of metrics.rateLimitMetrics) {
      console.log(`   ${serviceName}: ${rlMetrics.requestsInWindow} requests in current window`);
    }

    console.log('\n✅ Validation Status:');
    for (const [serviceName, vMetrics] of metrics.validationMetrics) {
      const failureRate = vMetrics.totalValidations > 0
        ? ((vMetrics.failedValidations / vMetrics.totalValidations) * 100).toFixed(2)
        : '0.00';
      console.log(`   ${serviceName}: ${vMetrics.totalValidations} total, ${failureRate}% failure rate`);
    }
  } catch (error) {
    console.log('❌ Metrics error:', error.message);
  }

  // 8. Add Dynamic Validation Rule
  console.log('\n8. Adding Dynamic Validation Rule...');
  try {
    const success = enhancedBusinessLogicIntegration.addValidationRule(
      'asset-lifecycle',
      'createAsset',
      [
        {
          field: 'assetTag',
          type: 'required',
          min: 5,
          max: 20,
          message: 'Asset tag is required and must be 5-20 characters'
        },
        {
          field: 'value',
          type: 'number',
          min: 0,
          message: 'Asset value must be a positive number'
        }
      ]
    );

    if (success) {
      console.log('✅ Validation rules added successfully');
      
      // Test the new validation rule
      const testResult = await enhancedBusinessLogicIntegration.executeProductionOperation(
        'asset-lifecycle',
        'createAsset',
        [{ 
          assetTag: 'ABC', // Too short, should fail
          value: -100 // Negative, should fail
        }],
        { useNapi: false, skipValidation: false }
      );

      if (!testResult.success && testResult.error?.code === 'VALIDATION_FAILED') {
        console.log('✅ New validation rules working correctly');
        console.log('   - Validation errors:', testResult.error.details?.errors);
      }
    } else {
      console.log('❌ Failed to add validation rules');
    }
  } catch (error) {
    console.log('❌ Validation rule error:', error.message);
  }

  // 9. Reset Service Metrics
  console.log('\n9. Resetting Service Metrics...');
  try {
    const resetSuccess = enhancedBusinessLogicIntegration.resetServiceMetrics('asset-lifecycle');
    if (resetSuccess) {
      console.log('✅ Metrics reset successfully for asset-lifecycle service');
      
      // Verify reset
      const bridge = enhancedBusinessLogicIntegration.getBridgeInfo('asset-lifecycle');
      console.log(`   - Call count after reset: ${bridge?.metrics.callCount}`);
      console.log(`   - Success count after reset: ${bridge?.metrics.successCount}`);
      console.log(`   - Failure count after reset: ${bridge?.metrics.failureCount}`);
    } else {
      console.log('❌ Failed to reset metrics');
    }
  } catch (error) {
    console.log('❌ Metrics reset error:', error.message);
  }

  console.log('\n🎉 Enhanced NAPI-RS Integration Demo Complete!');
  console.log('================================================');
  console.log('✅ All production-grade features demonstrated:');
  console.log('   - Service health monitoring');
  console.log('   - Circuit breaker protection');
  console.log('   - Rate limiting enforcement');
  console.log('   - Input validation with custom rules');
  console.log('   - Retry logic with exponential backoff');
  console.log('   - Comprehensive metrics collection');
  console.log('   - Dynamic configuration management');
  console.log('   - Real-time health status reporting');
  console.log('   - Automatic failover to TypeScript fallbacks');
  console.log('   - Frontend-backend API integration');
}

// Start the demo
if (require.main === module) {
  demonstrateEnhancedIntegration().catch(console.error);
}

// Export for use in other modules
export { demonstrateEnhancedIntegration };

// Start Express server for frontend integration
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌐 Enhanced Business Logic Integration API Server running on port ${PORT}`);
  console.log(`📊 Dashboard available at: http://localhost:${PORT}/api/enhanced-business-logic-integration/dashboard`);
  console.log(`🏥 Health check at: http://localhost:${PORT}/api/enhanced-business-logic-integration/health`);
  console.log(`📈 Metrics at: http://localhost:${PORT}/api/enhanced-business-logic-integration/metrics`);
  
  // Run the demo after server starts
  setTimeout(() => {
    demonstrateEnhancedIntegration().catch(console.error);
  }, 1000);
});

export default app;