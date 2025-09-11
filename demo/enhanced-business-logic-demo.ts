/**
 * Enhanced Business Logic Integration Demo
 * Demonstrates production-grade business logic calculations and data standardization
 */

import { 
  ProductionGradeBusinessLogic,
  advancedBusinessRules,
  dataStandardizationEngine
} from '../src/services/enhanced-business-logic-integration';

// Demo configuration
const demoConfig = {
  verbose: true,
  skipNapiExecution: true, // Skip NAPI execution for demo purposes
};

async function runDemo() {
  console.log('🚀 Enhanced Business Logic Integration Demo\n');
  console.log('=' .repeat(60));

  // 1. Asset Depreciation Demo
  console.log('\n📊 1. Asset Depreciation Calculations (Multiple Methods)');
  console.log('-'.repeat(50));
  
  const assetData = {
    initialValue: 100000,
    salvageValue: 10000,
    usefulLifeYears: 5,
    currentAge: 2,
  };

  // Straight-line depreciation
  const straightLineResult = advancedBusinessRules.calculateAssetDepreciation({
    ...assetData,
    depreciationMethod: 'straight-line',
  });

  console.log('Straight-Line Depreciation:');
  console.log(`  Initial Value: $${assetData.initialValue.toLocaleString()}`);
  console.log(`  Annual Depreciation: $${straightLineResult.annualDepreciation.toLocaleString()}`);
  console.log(`  Accumulated Depreciation: $${straightLineResult.accumulatedDepreciation.toLocaleString()}`);
  console.log(`  Current Book Value: $${straightLineResult.bookValue.toLocaleString()}`);

  // Double declining balance
  const decliningResult = advancedBusinessRules.calculateAssetDepreciation({
    ...assetData,
    depreciationMethod: 'double-declining',
    acceleratedRatePercent: 200,
  });

  console.log('\nDouble Declining Balance:');
  console.log(`  Current Annual Depreciation: $${decliningResult.annualDepreciation.toLocaleString()}`);
  console.log(`  Accumulated Depreciation: $${decliningResult.accumulatedDepreciation.toLocaleString()}`);
  console.log(`  Current Book Value: $${decliningResult.bookValue.toLocaleString()}`);

  // 2. Lease Accounting Demo (ASC 842/IFRS 16)
  console.log('\n🏢 2. Lease Accounting (ASC 842/IFRS 16)');
  console.log('-'.repeat(50));

  const leaseData = {
    monthlyPayment: 5000,
    leaseTerm: 36, // 3 years
    incrementalBorrowingRate: 6, // 6% annual
    initialDirectCosts: 2000,
    prepaidLease: 5000,
    leaseIncentives: 1000,
  };

  const leaseResult = advancedBusinessRules.calculateLeaseAccounting(leaseData);

  console.log('Lease Accounting Results:');
  console.log(`  Present Value of Lease Payments: $${leaseResult.presentValueOfLeasePayments.toLocaleString()}`);
  console.log(`  Right-of-Use Asset: $${leaseResult.rightOfUseAsset.toLocaleString()}`);
  console.log(`  Initial Lease Liability: $${leaseResult.leaseLIABILITY.toLocaleString()}`);
  console.log(`  Monthly Amortization: $${leaseResult.monthlyAmortization.toLocaleString()}`);
  console.log(`  Average Monthly Interest: $${leaseResult.interestExpense.toLocaleString()}`);
  console.log(`  Payment Schedule Length: ${leaseResult.paymentSchedule.length} months`);

  // 3. Space Utilization Optimization Demo
  console.log('\n🏗️ 3. Space Utilization Optimization');
  console.log('-'.repeat(50));

  const spaceData = {
    spaces: [
      {
        id: 'office-floor-3',
        name: 'Office Floor 3',
        area: 2000,
        capacity: 100,
        currentOccupancy: 45,
        costPerSqFt: 25,
        utilizationHistory: [45, 47, 42, 50, 48, 44, 46, 45, 49, 47, 43, 46],
        spaceType: 'office' as const,
      },
      {
        id: 'conference-room-a',
        name: 'Large Conference Room A',
        area: 300,
        capacity: 20,
        currentOccupancy: 18,
        costPerSqFt: 35,
        utilizationHistory: [85, 88, 82, 90, 87, 89, 86, 88, 91, 89, 84, 87],
        spaceType: 'meeting' as const,
      },
    ],
    occupancyTargets: {
      office: 0.85,
      meeting: 0.80,
      common: 0.60,
      storage: 0.90,
      specialized: 0.75,
    },
    constraints: {
      minSpacePerPerson: 150,
      maxCapacityUtilization: 0.95,
    },
  };

  const spaceOptimization = advancedBusinessRules.optimizeSpaceUtilization(spaceData);

  console.log('Space Optimization Results:');
  console.log(`  Total Potential Savings: $${spaceOptimization.totalPotentialSavings.toLocaleString()}`);
  console.log(`  Required Investment: $${spaceOptimization.totalRequiredInvestment.toLocaleString()}`);
  console.log(`  Overall ROI: ${spaceOptimization.overallROI.toFixed(2)}%`);
  console.log(`  Consolidation Opportunities: ${spaceOptimization.consolidationOpportunities.length}`);

  spaceOptimization.recommendations.forEach((rec, index) => {
    console.log(`  Space ${index + 1} (${rec.spaceId}):`);
    console.log(`    Recommendation: ${rec.recommendedAction}`);
    console.log(`    Current Utilization: ${(rec.currentUtilization * 100).toFixed(1)}%`);
    console.log(`    Potential Savings: $${rec.potentialSavings.toLocaleString()}`);
    console.log(`    ROI: ${rec.roi.toFixed(1)}%`);
  });

  // 4. Financial Consolidation Demo
  console.log('\n💰 4. Multi-Currency Financial Consolidation');
  console.log('-'.repeat(50));

  const financialData = {
    entities: [
      {
        id: 'us-operations',
        name: 'US Operations',
        currency: 'USD',
        financials: {
          revenue: 2000000,
          expenses: 1400000,
          assets: 10000000,
          liabilities: 4000000,
          cashFlow: 500000,
        },
        intercompanyTransactions: [
          { counterpartyId: 'eu-operations', amount: 100000, type: 'receivable' as const },
        ],
      },
      {
        id: 'eu-operations',
        name: 'EU Operations',
        currency: 'EUR',
        financials: {
          revenue: 1600000,
          expenses: 1200000,
          assets: 6000000,
          liabilities: 3000000,
          cashFlow: 360000,
        },
        intercompanyTransactions: [
          { counterpartyId: 'us-operations', amount: 92000, type: 'payable' as const }, // ~100k USD at 1.08 rate
        ],
      },
    ],
    exchangeRates: {
      'EUR': 1.08, // EUR to USD
    },
    baseCurrency: 'USD',
    consolidationDate: '2024-12-31',
  };

  const consolidation = advancedBusinessRules.performFinancialConsolidation(financialData);

  console.log('Financial Consolidation Results (USD):');
  console.log(`  Total Revenue: $${consolidation.consolidatedFinancials.totalRevenue.toLocaleString()}`);
  console.log(`  Total Expenses: $${consolidation.consolidatedFinancials.totalExpenses.toLocaleString()}`);
  console.log(`  Net Income: $${consolidation.consolidatedFinancials.netIncome.toLocaleString()}`);
  console.log(`  Total Assets: $${consolidation.consolidatedFinancials.totalAssets.toLocaleString()}`);
  console.log(`  Total Liabilities: $${consolidation.consolidatedFinancials.totalLiabilities.toLocaleString()}`);

  console.log('\nIntercompany Eliminations:');
  console.log(`  Eliminated Receivables: $${consolidation.intercompanyEliminations.eliminatedReceivables.toLocaleString()}`);
  console.log(`  Eliminated Payables: $${consolidation.intercompanyEliminations.eliminatedPayables.toLocaleString()}`);

  console.log('\nCurrency Exposure:');
  Object.entries(consolidation.currencyExposure).forEach(([currency, amount]) => {
    console.log(`  ${currency}: $${amount.toLocaleString()}`);
  });

  // 5. Data Standardization Demo
  console.log('\n🔧 5. Data Standardization Engine');
  console.log('-'.repeat(50));

  const rawAssetData = {
    id: 'hvac_unit_001',
    name: '  HVAC System - Building A Floor 3  ',
    type: 'hvac system',
    manufacturer: 'Carrier Corporation',
    model: 'WeatherExpert 48TJD',
    serialNumber: 'SN-2024-001-HVAC',
    acquisitionCost: '$45,250.00',
    installationDate: '2020-03-15',
    building: 'Building-A',
    floor: '3rd Floor',
    room: 'Mechanical Room 301',
    criticality: 'high',
  };

  const standardizationResult = dataStandardizationEngine.standardizeAssetData(rawAssetData, 'CMMS');

  console.log('Asset Data Standardization:');
  console.log(`  Original ID: "${rawAssetData.id}" → Standardized: "${standardizationResult.standardizedAsset.id}"`);
  console.log(`  Original Name: "${rawAssetData.name}" → Standardized: "${standardizationResult.standardizedAsset.name}"`);
  console.log(`  Original Type: "${rawAssetData.type}" → Standardized: "${standardizationResult.standardizedAsset.type}"`);
  console.log(`  Category: ${standardizationResult.standardizedAsset.category}`);
  console.log(`  Financial Data:`);
  console.log(`    Acquisition Cost: $${standardizationResult.standardizedAsset.financial.acquisitionCost.toLocaleString()}`);
  console.log(`    Currency: ${standardizationResult.standardizedAsset.financial.currency}`);
  console.log(`  Data Quality Score: ${standardizationResult.dataQualityScore}/100`);
  console.log(`  Transformations Applied: ${standardizationResult.transformationLog.length}`);
  console.log(`  Issues Found: ${standardizationResult.standardizationIssues.length}`);

  // 6. Production Monitoring Demo
  console.log('\n📊 6. Production Monitoring & Health Status');
  console.log('-'.repeat(50));

  const healthStatus = await ProductionGradeBusinessLogic.getComprehensiveHealthStatus();
  const metrics = await ProductionGradeBusinessLogic.getProductionMetrics();

  console.log('System Health Status:');
  console.log(`  Overall Health: ${healthStatus.overallHealth}`);
  console.log(`  Total Services: ${healthStatus.systemMetrics.totalServices}`);
  console.log(`  Healthy Services: ${healthStatus.systemMetrics.healthyServices}`);
  console.log(`  Circuit Breakers Open: ${healthStatus.systemMetrics.circuitBreakersOpen}`);

  console.log('\nProduction Metrics:');
  console.log(`  Total Requests: ${metrics.totalRequests}`);
  console.log(`  Successful Requests: ${metrics.successfulRequests}`);
  console.log(`  Failed Requests: ${metrics.failedRequests}`);
  console.log(`  Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);

  console.log('\nAvailable Services:');
  const services = ProductionGradeBusinessLogic.listAvailableServices();
  services.forEach((service, index) => {
    console.log(`  ${index + 1}. ${service}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Enhanced Business Logic Integration Demo Complete');
  console.log('\nKey Features Demonstrated:');
  console.log('  ✓ Advanced asset depreciation calculations');
  console.log('  ✓ ASC 842/IFRS 16 lease accounting');
  console.log('  ✓ Space utilization optimization algorithms');
  console.log('  ✓ Multi-currency financial consolidation');
  console.log('  ✓ Production-grade data standardization');
  console.log('  ✓ Real-time monitoring and health checks');
  console.log('\n💡 Ready for production deployment with enterprise-grade reliability!');
}

// Run demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };