/**
 * Enhanced NAPI-RS Business Logic Integration Demo Application
 * Complete demonstration of production-grade features and frontend-backend integration
 */

import express from 'express';
import cors from 'cors';
import { 
  enhancedBusinessLogicService,
  ProductionBusinessLogicBridge 
} from './enhanced-napi-business-logic-demo';
import enhancedBusinessLogicRoutes from '../routes/enhanced-business-logic-routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Mount the enhanced business logic routes
app.use('/api/enhanced-business-logic-integration', enhancedBusinessLogicRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Enhanced NAPI-RS Business Logic Integration',
    uptime: process.uptime()
  });
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Enhanced NAPI-RS Business Logic Integration API',
    version: '2.0.0',
    documentation: {
      endpoints: {
        dashboard: 'GET /api/enhanced-business-logic-integration/dashboard',
        health: 'GET /api/enhanced-business-logic-integration/health',
        metrics: 'GET /api/enhanced-business-logic-integration/metrics',
        bridges: 'GET /api/enhanced-business-logic-integration/bridges',
        execute: 'POST /api/enhanced-business-logic-integration/execute',
        analytics: 'GET /api/enhanced-business-logic-integration/analytics'
      },
      features: [
        '40 Production-Grade NAPI-RS Service Integrations',
        'Circuit Breaker Pattern Implementation',
        'Advanced Rate Limiting',
        'Input Validation & Sanitization',
        'Intelligent TypeScript Fallback',
        'Comprehensive Metrics & Monitoring',
        'Real-time Health Status',
        'Advanced Business Rules Engine',
        'Data Standardization Engine',
        'Complete Frontend-Backend Integration'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// Demo endpoints for testing various scenarios
app.get('/demo', (req, res) => {
  res.json({
    message: 'Enhanced NAPI-RS Demo Endpoints',
    available_demos: [
      {
        name: 'Asset Lifecycle Management',
        endpoint: '/demo/asset-lifecycle',
        description: 'Demonstrates asset depreciation calculations and lifecycle tracking'
      },
      {
        name: 'Financial Consolidation',
        endpoint: '/demo/financial-consolidation', 
        description: 'Multi-entity financial consolidation with currency conversion'
      },
      {
        name: 'Space Utilization Analytics',
        endpoint: '/demo/space-analytics',
        description: 'Space utilization analysis and optimization recommendations'
      },
      {
        name: 'Advanced Intelligence',
        endpoint: '/demo/predictive-analysis',
        description: 'Predictive analytics and anomaly detection'
      },
      {
        name: 'Production Load Test',
        endpoint: '/demo/load-test',
        description: 'Simulates production load across multiple services'
      }
    ]
  });
});

// Asset Lifecycle Management Demo
app.get('/demo/asset-lifecycle', async (req, res) => {
  try {
    console.log('\n=== Asset Lifecycle Management Demo ===');
    
    // Demo 1: Asset Depreciation Calculation
    const assetDepreciationResult = await enhancedBusinessLogicService.executeWithEnhancedLogic(
      'asset-lifecycle', 
      'calculateDepreciation',
      [{
        id: 'HVAC-001',
        initialValue: 75000,
        currentAge: 3,
        usefulLife: 15,
        depreciationMethod: 'straight-line'
      }]
    );

    // Demo 2: Asset Lifecycle Tracking
    const lifecycleTrackingResult = await enhancedBusinessLogicService.executeWithEnhancedLogic(
      'asset-lifecycle',
      'trackLifecycle',
      [{ assetId: 'HVAC-001' }]
    );

    const demoResults = {
      scenario: 'Asset Lifecycle Management',
      description: 'Complete asset management workflow from depreciation to lifecycle tracking',
      results: {
        depreciation: {
          success: assetDepreciationResult.success,
          data: assetDepreciationResult.data.depreciation,
          executionTime: `${assetDepreciationResult.metadata.responseTime  }ms`
        },
        lifecycle: {
          success: lifecycleTrackingResult.success,
          data: lifecycleTrackingResult.data.lifecycle,
          executionTime: `${lifecycleTrackingResult.metadata.responseTime  }ms`
        }
      },
      insights: {
        currentValue: assetDepreciationResult.data.depreciation?.currentValue,
        healthScore: lifecycleTrackingResult.data.lifecycle?.healthScore,
        recommendations: assetDepreciationResult.data.recommendations
      }
    };

    console.log('Asset Lifecycle Demo Results:', JSON.stringify(demoResults, null, 2));
    res.json(demoResults);

  } catch (error: unknown) {
    console.error('Asset Lifecycle Demo Error:', error);
    res.status(500).json({
      error: 'Asset Lifecycle Demo Failed',
      details: error instanceof Error ? (error).message : 'Unknown error'
    });

    return;
  }
});

// Financial Consolidation Demo
app.get('/demo/financial-consolidation', async (req, res) => {
  try {
    console.log('\n=== Financial Consolidation Demo ===');

    const consolidationData = {
      entities: [
        {
          id: 'us-ops',
          name: 'US Operations',
          currency: 'USD',
          financials: { 
            revenue: 3200000, 
            expenses: 2600000, 
            assets: 8000000, 
            liabilities: 1500000, 
            cashFlow: 600000 
          },
          intercompanyTransactions: [
            { counterpartyId: 'eu-ops', amount: 200000, type: 'receivable' }
          ]
        },
        {
          id: 'eu-ops',
          name: 'European Operations',
          currency: 'EUR',
          financials: { 
            revenue: 2100000, 
            expenses: 1700000, 
            assets: 4500000, 
            liabilities: 900000, 
            cashFlow: 400000 
          },
          intercompanyTransactions: [
            { counterpartyId: 'us-ops', amount: 180000, type: 'payable' }
          ]
        },
        {
          id: 'asia-ops',
          name: 'Asia Pacific Operations',
          currency: 'JPY',
          financials: { 
            revenue: 180000000, 
            expenses: 150000000, 
            assets: 420000000, 
            liabilities: 80000000, 
            cashFlow: 30000000 
          },
          intercompanyTransactions: []
        }
      ],
      baseCurrency: 'USD',
      exchangeRates: { EUR: 1.08, JPY: 0.0067, USD: 1.0 },
      consolidationDate: new Date().toISOString()
    };

    const consolidationResult = await enhancedBusinessLogicService.executeWithEnhancedLogic(
      'financial-consolidation',
      'consolidateFinancials',
      [consolidationData]
    );

    const demoResults = {
      scenario: 'Multi-Entity Financial Consolidation',
      description: 'Consolidated financial statements across 3 entities with currency conversion',
      input: {
        entities: consolidationData.entities.length,
        currencies: Object.keys(consolidationData.exchangeRates),
        baseCurrency: consolidationData.baseCurrency
      },
      results: {
        consolidation: consolidationResult.data.consolidation,
        exchangeRates: consolidationResult.data.exchangeRates,
        executionTime: `${consolidationResult.metadata.responseTime  }ms`
      },
      insights: {
        totalRevenue: consolidationResult.data.consolidation?.totalRevenue,
        netIncome: consolidationResult.data.consolidation?.netIncome,
        profitMargin: consolidationResult.data.consolidation?.totalRevenue > 0 ?
          `${((consolidationResult.data.consolidation.netIncome / consolidationResult.data.consolidation.totalRevenue) * 100).toFixed(2)}%` : '0%'
      }
    };

    console.log('Financial Consolidation Demo Results:', JSON.stringify(demoResults, null, 2));
    res.json(demoResults);

  } catch (error: unknown) {
    console.error('Financial Consolidation Demo Error:', error);
    res.status(500).json({
      error: 'Financial Consolidation Demo Failed',
      details: error instanceof Error ? (error).message : 'Unknown error'
    });

    return;
  }
});

// Space Analytics Demo
app.get('/demo/space-analytics', async (req, res) => {
  try {
    console.log('\n=== Space Utilization Analytics Demo ===');

    const spaceData = {
      spaceId: 'conference-room-alpha',
      timeRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      includeWeekends: false,
      granularity: 'daily'
    };

    // Calculate utilization
    const utilizationResult = await enhancedBusinessLogicService.executeWithEnhancedLogic(
      'space-utilization',
      'calculateUtilization',
      [spaceData]
    );

    // Get optimization recommendations
    const optimizationResult = await enhancedBusinessLogicService.executeWithEnhancedLogic(
      'space-utilization',
      'optimizeSpaceAllocation',
      [spaceData]
    );

    const demoResults = {
      scenario: 'Space Utilization Analytics & Optimization',
      description: 'Analysis of space usage patterns with AI-driven optimization recommendations',
      spaceInfo: {
        spaceId: spaceData.spaceId,
        analysisPeriod: '30 days',
        granularity: spaceData.granularity
      },
      results: {
        utilization: {
          success: utilizationResult.success,
          data: utilizationResult.data.utilization,
          executionTime: `${utilizationResult.metadata.responseTime  }ms`
        },
        optimization: {
          success: optimizationResult.success,
          data: optimizationResult.data.optimization,
          executionTime: `${optimizationResult.metadata.responseTime  }ms`
        }
      },
      insights: {
        utilizationRate: `${(utilizationResult.data.utilization?.rate * 100).toFixed(1)}%`,
        efficiencyScore: utilizationResult.data.utilization?.efficiencyScore,
        potentialSavings: optimizationResult.data.optimization?.potentialSavings,
        recommendations: optimizationResult.data.optimization?.recommendations
      }
    };

    console.log('Space Analytics Demo Results:', JSON.stringify(demoResults, null, 2));
    res.json(demoResults);

  } catch (error: unknown) {
    console.error('Space Analytics Demo Error:', error);
    res.status(500).json({
      error: 'Space Analytics Demo Failed',
      details: error instanceof Error ? (error).message : 'Unknown error'
    });

    return;
  }
});

// Predictive Analysis Demo
app.get('/demo/predictive-analysis', async (req, res) => {
  try {
    console.log('\n=== Advanced Predictive Analysis Demo ===');

    const analysisData = {
      dataSet: 'building-equipment-telemetry',
      analysisType: 'predictive-maintenance',
      timeframe: '90-days',
      equipment: ['HVAC-A1', 'HVAC-B2', 'Elevator-Main', 'Generator-Backup']
    };

    const anomalyData = {
      systemId: 'building-management-system',
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      sensitivity: 'medium'
    };

    // Run predictive analysis
    const predictiveResult = await enhancedBusinessLogicService.executeWithEnhancedLogic(
      'advanced-intelligence',
      'runPredictiveAnalysis',
      [analysisData]
    );

    // Detect anomalies
    const anomalyResult = await enhancedBusinessLogicService.executeWithEnhancedLogic(
      'advanced-intelligence',
      'detectAnomalies',
      [anomalyData]
    );

    const demoResults = {
      scenario: 'Advanced Predictive Intelligence',
      description: 'ML-powered predictive maintenance and anomaly detection for building systems',
      analysis: {
        dataSet: analysisData.dataSet,
        equipment: analysisData.equipment,
        timeframe: analysisData.timeframe
      },
      results: {
        predictive: {
          success: predictiveResult.success,
          prediction: predictiveResult.data.analysis?.prediction,
          confidence: `${(predictiveResult.data.analysis?.confidence * 100).toFixed(1)}%`,
          recommendations: predictiveResult.data.analysis?.recommendations,
          executionTime: `${predictiveResult.metadata.responseTime  }ms`
        },
        anomalies: {
          success: anomalyResult.success,
          detected: anomalyResult.data.anomalies?.detected,
          severity: anomalyResult.data.anomalies?.severity,
          affectedSystems: anomalyResult.data.anomalies?.affectedSystems,
          executionTime: `${anomalyResult.metadata.responseTime  }ms`
        }
      },
      insights: {
        riskLevel: predictiveResult.data.analysis?.confidence > 0.8 ? 'High Confidence' : 'Medium Confidence',
        actionRequired: anomalyResult.data.anomalies?.detected > 0,
        maintenanceWindow: 'Next 14-30 days recommended'
      }
    };

    console.log('Predictive Analysis Demo Results:', JSON.stringify(demoResults, null, 2));
    res.json(demoResults);

  } catch (error: unknown) {
    console.error('Predictive Analysis Demo Error:', error);
    res.status(500).json({
      error: 'Predictive Analysis Demo Failed',
      details: error instanceof Error ? (error).message : 'Unknown error'
    });

    return;
  }
});

// Production Load Test Demo
app.get('/demo/load-test', async (req, res) => {
  try {
    console.log('\n=== Production Load Test Demo ===');

    const services = [
      'asset-lifecycle',
      'financial-consolidation', 
      'space-utilization',
      'work-order-management',
      'energy-management',
      'contract-lifecycle',
      'advanced-intelligence',
      'iot-device-management'
    ];

    const methods = [
      'trackLifecycle',
      'consolidateFinancials',
      'calculateUtilization', 
      'createWorkOrder',
      'trackConsumption',
      'trackMilestones',
      'runPredictiveAnalysis',
      'collectData'
    ];

    // Execute concurrent requests across multiple services
    const concurrentRequests = 20;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      const serviceIndex = i % services.length;
      const serviceName = services[serviceIndex];
      const methodName = methods[serviceIndex];

      requests.push(
        enhancedBusinessLogicService.executeWithEnhancedLogic(
          serviceName,
          methodName,
          [{ testId: `load-test-${i}`, timestamp: new Date() }]
        ).catch(error => ({ 
          error: (error as Error).message, 
          serviceName, 
          methodName 
        }))
      );
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(requests);
    const endTime = Date.now();

    const successful = results.filter(result => 
      result.status === 'fulfilled' && 
      result.value.success === true
    );

    const failed = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && result.value.error)
    );

    // Get current system health and metrics
    const healthStatus = await enhancedBusinessLogicService.getComprehensiveHealthStatus();
    const metrics = enhancedBusinessLogicService.getProductionMetrics();

    const loadTestResults = {
      scenario: 'Production Load Testing',
      description: `Concurrent execution of ${concurrentRequests} requests across ${services.length} services`,
      testParameters: {
        concurrentRequests,
        servicesUnderTest: services.length,
        testDuration: `${endTime - startTime}ms`
      },
      results: {
        successful: successful.length,
        failed: failed.length,
        successRate: `${((successful.length / concurrentRequests) * 100).toFixed(2)}%`,
        averageResponseTime: `${((endTime - startTime) / concurrentRequests).toFixed(2)}ms`
      },
      systemHealth: {
        overallHealth: `${(healthStatus.overallHealth * 100).toFixed(1)}%`,
        healthyServices: `${healthStatus.healthyServices}/${healthStatus.totalServices}`,
        uptime: healthStatus.uptimeFormatted
      },
      productionMetrics: {
        totalRequests: metrics.totalRequests,
        totalSuccessRate: metrics.totalRequests > 0 ? 
          `${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%` : '0%',
        circuitBreakerTrips: metrics.circuitBreakerTrips,
        rateLimitedRequests: metrics.rateLimitedRequests
      },
      insights: {
        performanceStatus: successful.length / concurrentRequests > 0.8 ? 'Excellent' : 
                          successful.length / concurrentRequests > 0.6 ? 'Good' : 'Needs Attention',
        systemStability: healthStatus.overallHealth > 0.9 ? 'Stable' : 
                        healthStatus.overallHealth > 0.7 ? 'Acceptable' : 'Unstable',
        recommendedActions: failed.length > 0 ? 
          ['Review failed requests', 'Check circuit breaker status', 'Monitor system resources'] :
          ['System performing well', 'Continue monitoring']
      }
    };

    console.log('Load Test Demo Results:', JSON.stringify(loadTestResults, null, 2));
    res.json(loadTestResults);

  } catch (error: unknown) {
    console.error('Load Test Demo Error:', error);
    res.status(500).json({
      error: 'Load Test Demo Failed',
      details: error instanceof Error ? (error).message : 'Unknown error'
    });

    return;
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });

  return;
});

// Start the server
app.listen(PORT, () => {
  console.log('\n🚀 Enhanced NAPI-RS Business Logic Integration Demo Server Started');
  console.log(`📊 Server running on http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`📈 Dashboard API: http://localhost:${PORT}/api/enhanced-business-logic-integration/dashboard`);
  console.log(`🧪 Demo Endpoints: http://localhost:${PORT}/demo`);
  console.log('\n📋 Available Demo Scenarios:');
  console.log(`   • Asset Lifecycle: http://localhost:${PORT}/demo/asset-lifecycle`);
  console.log(`   • Financial Consolidation: http://localhost:${PORT}/demo/financial-consolidation`);
  console.log(`   • Space Analytics: http://localhost:${PORT}/demo/space-analytics`);
  console.log(`   • Predictive Analysis: http://localhost:${PORT}/demo/predictive-analysis`);
  console.log(`   • Load Testing: http://localhost:${PORT}/demo/load-test`);
  console.log('\n✨ Production-Grade Features:');
  console.log('   • 40 NAPI-RS Service Integrations');
  console.log('   • Circuit Breaker Pattern');
  console.log('   • Advanced Rate Limiting');
  console.log('   • Input Validation & Sanitization');
  console.log('   • Intelligent TypeScript Fallback');
  console.log('   • Comprehensive Metrics & Monitoring');
  console.log('   • Real-time Health Status');
  console.log('   • Advanced Business Rules Engine');
  console.log('   • Complete Frontend-Backend Integration');
  console.log('\n🔧 System initialized with all production-grade features enabled.');
});

export default app;