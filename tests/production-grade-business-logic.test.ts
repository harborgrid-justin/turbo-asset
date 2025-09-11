/**
 * Production-Grade Business Logic Integration Tests
 * Comprehensive test suite for advanced financial analytics, risk assessment, and compliance features
 */

import {
  advancedFinancialAnalyticsEngine,
  advancedRiskAssessmentEngine,
  advancedComplianceEngine,
  advancedMLIntegrationEngine,
  advancedDataProcessingEngine,
  productionGradeBusinessLogicService
} from '../src/services/enhanced-business-logic-integration';

describe('Production-Grade Business Logic Integration', () => {
  describe('AdvancedFinancialAnalyticsEngine', () => {
    describe('calculateNetPresentValue', () => {
      it('should calculate NPV correctly for a profitable project', () => {
        const result = advancedFinancialAnalyticsEngine.calculateNetPresentValue({
          initialInvestment: 100000,
          cashFlows: [40000, 40000, 40000, 40000, 40000],
          discountRate: 0.08,
          riskFactor: 0.01,
          inflationRate: 0.02,
          taxRate: 0.20
        });

        expect(result.npv).toBeGreaterThan(0);
        expect(result.profitabilityIndex).toBeGreaterThan(1);
        expect(result.paybackPeriod).toBeLessThanOrEqual(5);
        expect(result.riskAnalysis).toBeDefined();
        expect(result.riskAnalysis.expectedValue).toBeGreaterThan(0);
      });

      it('should handle negative NPV projects', () => {
        const result = advancedFinancialAnalyticsEngine.calculateNetPresentValue({
          initialInvestment: 100000,
          cashFlows: [10000, 10000, 10000, 10000, 10000],
          discountRate: 0.15,
          riskFactor: 0.05,
          inflationRate: 0.03,
          taxRate: 0.25
        });

        expect(result.npv).toBeLessThan(0);
        expect(result.profitabilityIndex).toBeLessThan(1);
        expect(result.riskAdjustedNPV).toBeLessThan(result.npv);
      });

      it('should properly adjust for risk factors', () => {
        const lowRiskResult = advancedFinancialAnalyticsEngine.calculateNetPresentValue({
          initialInvestment: 100000,
          cashFlows: [25000, 25000, 25000, 25000, 25000],
          discountRate: 0.08,
          riskFactor: 0.01,
          inflationRate: 0.02,
          taxRate: 0.25
        });

        const highRiskResult = advancedFinancialAnalyticsEngine.calculateNetPresentValue({
          initialInvestment: 100000,
          cashFlows: [25000, 25000, 25000, 25000, 25000],
          discountRate: 0.08,
          riskFactor: 0.10,
          inflationRate: 0.02,
          taxRate: 0.25
        });

        expect(lowRiskResult.riskAdjustedNPV).toBeGreaterThan(highRiskResult.riskAdjustedNPV);
        expect(highRiskResult.riskAnalysis.worstCase).toBeLessThan(lowRiskResult.riskAnalysis.worstCase);
      });
    });

    describe('calculateInternalRateOfReturn', () => {
      it('should calculate IRR for profitable projects', () => {
        const result = advancedFinancialAnalyticsEngine.calculateInternalRateOfReturn(
          100000,
          [30000, 30000, 30000, 30000, 30000]
        );

        expect(result.isValid).toBe(true);
        expect(result.irr).toBeGreaterThan(0.15); // Should be around 15-20%
        expect(result.irr).toBeLessThan(0.35);
        expect(result.iterations).toBeGreaterThan(0);
        expect(result.accuracy).toBeLessThan(0.001);
      });

      it('should handle cases with no valid IRR', () => {
        const result = advancedFinancialAnalyticsEngine.calculateInternalRateOfReturn(
          100000,
          [-10000, -10000, -10000, -10000, -10000]
        );

        // This should either find a very negative IRR or fail to converge
        expect(typeof result.irr).toBe('number');
        expect(result.iterations).toBeGreaterThan(0);
      });
    });

    describe('calculateTotalCostOfOwnership', () => {
      it('should calculate comprehensive TCO', () => {
        const result = advancedFinancialAnalyticsEngine.calculateTotalCostOfOwnership({
          initialCost: 50000,
          operatingCosts: {
            maintenance: [2000, 2200, 2500, 3000, 3500],
            energy: [1500, 1600, 1700, 1800, 1900],
            insurance: [500, 520, 540, 560, 580],
            labor: [3000, 3150, 3300, 3450, 3600],
            other: [1000, 1050, 1100, 1150, 1200]
          },
          oneTimeCosts: {
            training: 5000,
            installation: 3000,
            licensing: 2000,
            migration: 1000
          },
          endOfLifeValue: 5000,
          analysisYears: 5,
          discountRate: 0.08,
          inflationRate: 0.03
        });

        expect(result.totalCost).toBeGreaterThan(50000);
        expect(result.presentValue).toBeLessThan(result.totalCost); // Due to discounting
        expect(result.annualizedCost).toBeGreaterThan(0);
        expect(result.yearlyBreakdown).toHaveLength(5);
        expect(result.costBreakdown.initial).toBe(50000);
        expect(result.costPerCategory.maintenance).toBeGreaterThan(0);
      });
    });
  });

  describe('AdvancedRiskAssessmentEngine', () => {
    describe('performMonteCarloRiskAnalysis', () => {
      it('should perform Monte Carlo simulation correctly', () => {
        const result = advancedRiskAssessmentEngine.performMonteCarloRiskAnalysis({
          baseValue: 1000000,
          volatilityFactors: {
            market: 0.15,
            operational: 0.10,
            regulatory: 0.05,
            technology: 0.12
          },
          correlations: {},
          simulationRuns: 1000,
          timeHorizon: 3
        });

        expect(result.expectedValue).toBeGreaterThan(0);
        expect(result.standardDeviation).toBeGreaterThan(0);
        expect(Math.abs(result.confidenceIntervals.p50 - result.expectedValue)).toBeLessThan(result.expectedValue * 0.1); // Within 10%
        expect(result.confidenceIntervals.p95).toBeGreaterThan(result.confidenceIntervals.p5);
        expect(result.riskMetrics.valueAtRisk95).toBeGreaterThan(0);
        expect(result.riskMetrics.probabilityOfLoss).toBeGreaterThanOrEqual(0);
        expect(result.riskMetrics.probabilityOfLoss).toBeLessThanOrEqual(1);
        expect(result.distributionData).toHaveLength(1000);
      });

      it('should handle extreme volatility scenarios', () => {
        const highVolatilityResult = advancedRiskAssessmentEngine.performMonteCarloRiskAnalysis({
          baseValue: 1000000,
          volatilityFactors: {
            market: 0.50,
            operational: 0.30,
            regulatory: 0.20,
            technology: 0.40
          },
          correlations: {},
          simulationRuns: 500,
          timeHorizon: 2
        });

        const lowVolatilityResult = advancedRiskAssessmentEngine.performMonteCarloRiskAnalysis({
          baseValue: 1000000,
          volatilityFactors: {
            market: 0.05,
            operational: 0.03,
            regulatory: 0.02,
            technology: 0.04
          },
          correlations: {},
          simulationRuns: 500,
          timeHorizon: 2
        });

        expect(highVolatilityResult.standardDeviation).toBeGreaterThan(lowVolatilityResult.standardDeviation);
        expect(highVolatilityResult.riskMetrics.valueAtRisk95).toBeGreaterThan(lowVolatilityResult.riskMetrics.valueAtRisk95);
      });
    });

    describe('calculateOperationalRiskScore', () => {
      it('should calculate risk scores for different asset conditions', () => {
        const goodAssetResult = advancedRiskAssessmentEngine.calculateOperationalRiskScore({
          age: 2,
          condition: 9,
          criticalityLevel: 'medium',
          maintenanceHistory: {
            scheduledCompliance: 0.95,
            emergencyRepairs: 1,
            downtime: 20,
            cost: 5000
          },
          environmentalFactors: {
            temperature: 22,
            humidity: 45,
            vibration: 0.05,
            dustLevel: 0.02
          },
          utilizationRate: 0.75
        });

        const poorAssetResult = advancedRiskAssessmentEngine.calculateOperationalRiskScore({
          age: 15,
          condition: 3,
          criticalityLevel: 'critical',
          maintenanceHistory: {
            scheduledCompliance: 0.60,
            emergencyRepairs: 8,
            downtime: 500,
            cost: 50000
          },
          environmentalFactors: {
            temperature: 35,
            humidity: 80,
            vibration: 0.5,
            dustLevel: 0.8
          },
          utilizationRate: 0.95
        });

        expect(goodAssetResult.overallRiskScore).toBeLessThan(poorAssetResult.overallRiskScore);
        expect(goodAssetResult.riskCategory).toBe('Low');
        expect(poorAssetResult.riskCategory).toMatch(/High|Critical/);
        expect(poorAssetResult.recommendations.length).toBeGreaterThan(goodAssetResult.recommendations.length);
        expect(poorAssetResult.actionPriority).toMatch(/High|Immediate/);
      });

      it('should provide appropriate recommendations based on risk factors', () => {
        const result = advancedRiskAssessmentEngine.calculateOperationalRiskScore({
          age: 12,
          condition: 4,
          criticalityLevel: 'high',
          maintenanceHistory: {
            scheduledCompliance: 0.50,
            emergencyRepairs: 5,
            downtime: 300,
            cost: 30000
          },
          environmentalFactors: {
            temperature: 30,
            humidity: 70,
            vibration: 0.3,
            dustLevel: 0.6
          },
          utilizationRate: 0.40
        });

        expect(result.recommendations).toContain('Consider asset replacement due to age');
        expect(result.recommendations).toContain('Immediate condition assessment and repair needed');
        expect(result.recommendations).toContain('Improve preventive maintenance schedule compliance');
        expect(result.recommendations).toContain('Optimize environmental conditions (temperature, humidity, vibration)');
        expect(result.recommendations).toContain('Review asset utilization patterns and optimize usage');
      });
    });
  });

  describe('AdvancedComplianceEngine', () => {
    describe('calculateESGScore', () => {
      it('should calculate ESG scores correctly', () => {
        const result = advancedComplianceEngine.calculateESGScore({
          environmental: {
            energyEfficiency: 75,
            carbonFootprint: 40,
            waterUsage: 25,
            wasteReduction: 60,
            renewableEnergyUse: 35,
            greenCertifications: ['LEED', 'ENERGY STAR', 'BREEAM']
          },
          social: {
            employeeSafety: 1.2,
            diversityIndex: 65,
            communityInvestment: 3,
            customerSatisfaction: 88,
            employeeEngagement: 82,
            trainingHours: 42
          },
          governance: {
            boardIndependence: 55,
            executiveCompensation: 12,
            auditQuality: 90,
            dataPrivacy: 95,
            ethicsTraining: 98,
            riskManagement: 85
          }
        });

        expect(result.overallESGScore).toBeGreaterThanOrEqual(0);
        expect(result.overallESGScore).toBeLessThanOrEqual(100);
        expect(result.environmentalScore).toBeGreaterThanOrEqual(0);
        expect(result.socialScore).toBeGreaterThanOrEqual(0);
        expect(result.governanceScore).toBeGreaterThanOrEqual(0);
        expect(['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC']).toContain(result.rating);
        expect(['Leading', 'Above Average', 'Average', 'Below Average', 'Lagging']).toContain(result.benchmarkComparison.performanceLevel);
        expect(Array.isArray(result.improvementAreas)).toBe(true);
      });

      it('should provide improvement recommendations', () => {
        const result = advancedComplianceEngine.calculateESGScore({
          environmental: {
            energyEfficiency: 45,
            carbonFootprint: 80,
            waterUsage: 60,
            wasteReduction: 20,
            renewableEnergyUse: 10,
            greenCertifications: []
          },
          social: {
            employeeSafety: 3.5,
            diversityIndex: 35,
            communityInvestment: 0.5,
            customerSatisfaction: 65,
            employeeEngagement: 55,
            trainingHours: 15
          },
          governance: {
            boardIndependence: 30,
            executiveCompensation: 25,
            auditQuality: 70,
            dataPrivacy: 75,
            ethicsTraining: 60,
            riskManagement: 65
          }
        });

        expect(result.overallESGScore).toBeLessThan(60); // Should be poor
        expect(result.improvementAreas.length).toBeGreaterThan(0);
        
        const improvementCategories = result.improvementAreas.map(area => area.category);
        expect(improvementCategories).toContain('Environmental');
        expect(improvementCategories).toContain('Social');
        expect(improvementCategories).toContain('Governance');
      });
    });

    describe('checkFinancialComplianceGAAP', () => {
      it('should identify compliance violations', () => {
        const result = advancedComplianceEngine.checkFinancialComplianceGAAP({
          assets: {
            currentAssets: 100000,
            fixedAssets: 500000,
            intangibleAssets: 50000,
            depreciation: {
              method: 'straight-line',
              rate: 10,
              consistency: false // This should trigger a violation
            }
          },
          liabilities: {
            currentLiabilities: 150000, // This creates poor current ratio
            longTermLiabilities: 200000,
            contingentLiabilities: 25000
          },
          revenue: {
            recognitionMethod: 'cash', // Should be accrual for GAAP compliance
            revenueStreams: [
              { type: 'services', amount: 200000, timing: 'monthly' },
              { type: 'products', amount: 150000, timing: 'quarterly' }
            ]
          },
          expenses: {
            operatingExpenses: 250000,
            depreciation: 50000,
            interestExpense: 15000
          },
          disclosures: {
            relatedPartyTransactions: false, // Should trigger violation
            contingencies: false, // Should trigger violation
            subsequentEvents: true,
            segmentReporting: true
          }
        });

        expect(result.overallCompliance).toBeLessThan(95);
        expect(result.complianceStatus).not.toBe('Compliant');
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.requiredActions.length).toBeGreaterThan(0);
        expect(['Low', 'Medium', 'High']).toContain(result.auditRisk);

        // Check for specific violations
        const violationPrinciples = result.violations.map(v => v.principle);
        expect(violationPrinciples).toContain('Consistency Principle');
        expect(violationPrinciples).toContain('Revenue Recognition Principle');
        expect(violationPrinciples).toContain('Full Disclosure Principle');
        expect(violationPrinciples).toContain('Going Concern Principle');
      });

      it('should recognize compliant financial data', () => {
        const result = advancedComplianceEngine.checkFinancialComplianceGAAP({
          assets: {
            currentAssets: 300000,
            fixedAssets: 500000,
            intangibleAssets: 50000,
            depreciation: {
              method: 'straight-line',
              rate: 10,
              consistency: true
            }
          },
          liabilities: {
            currentLiabilities: 200000,
            longTermLiabilities: 200000,
            contingentLiabilities: 10000
          },
          revenue: {
            recognitionMethod: 'accrual',
            revenueStreams: [
              { type: 'services', amount: 400000, timing: 'monthly' },
              { type: 'products', amount: 300000, timing: 'quarterly' }
            ]
          },
          expenses: {
            operatingExpenses: 500000,
            depreciation: 50000,
            interestExpense: 15000
          },
          disclosures: {
            relatedPartyTransactions: true,
            contingencies: true,
            subsequentEvents: true,
            segmentReporting: true
          }
        });

        expect(result.overallCompliance).toBeGreaterThan(90);
        expect(result.complianceStatus).toMatch(/Compliant|Minor Issues/);
        expect(result.auditRisk).toMatch(/Low|Medium/);
      });
    });
  });

  describe('ProductionGradeBusinessLogicService', () => {
    describe('performComprehensiveAssetAnalysis', () => {
      it('should perform complete asset analysis', async () => {
        const assetData = {
          acquisitionCost: 150000,
          salvageValue: 15000,
          usefulLife: 10,
          depreciationMethod: 'straight-line',
          age: 3,
          condition: 7,
          criticalityLevel: 'high',
          maintenanceHistory: {
            scheduledCompliance: 0.85,
            emergencyRepairs: 2,
            downtime: 80,
            cost: 12000
          },
          environmentalFactors: {
            temperature: 23,
            humidity: 48,
            vibration: 0.1,
            dustLevel: 0.1
          },
          utilizationRate: 0.8,
          plannedInvestment: 50000,
          projectedCashFlows: [15000, 18000, 20000, 22000, 25000]
        };

        const result = await productionGradeBusinessLogicService.performComprehensiveAssetAnalysis(assetData);

        expect(result.depreciation).toBeDefined();
        expect(result.riskScore).toBeDefined();
        expect(result.financialMetrics).toBeDefined();
        expect(Array.isArray(result.recommendations)).toBe(true);

        expect(result.depreciation.bookValue).toBeGreaterThan(0);
        expect(result.riskScore.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore.overallRiskScore).toBeLessThanOrEqual(100);
        expect(result.financialMetrics.npv).toBeDefined();
      });

      it('should handle missing data gracefully', async () => {
        const minimalAssetData = {
          acquisitionCost: 100000
        };

        const result = await productionGradeBusinessLogicService.performComprehensiveAssetAnalysis(minimalAssetData);

        expect(result.depreciation).toBeDefined();
        expect(result.riskScore).toBeDefined();
        expect(result.financialMetrics).toBeNull(); // No planned investment
        expect(Array.isArray(result.recommendations)).toBe(true);
      });
    });

    describe('performOrganizationalAssessment', () => {
      it('should perform comprehensive organizational assessment', async () => {
        const orgData = {
          totalAssetValue: 10000000,
          esgData: {
            environmental: {
              energyEfficiency: 70,
              carbonFootprint: 45,
              waterUsage: 28,
              wasteReduction: 55,
              renewableEnergyUse: 30,
              greenCertifications: ['LEED', 'ENERGY STAR']
            },
            social: {
              employeeSafety: 1.8,
              diversityIndex: 68,
              communityInvestment: 2.5,
              customerSatisfaction: 86,
              employeeEngagement: 79,
              trainingHours: 38
            },
            governance: {
              boardIndependence: 58,
              executiveCompensation: 14,
              auditQuality: 87,
              dataPrivacy: 92,
              ethicsTraining: 96,
              riskManagement: 83
            }
          }
        };

        const result = await productionGradeBusinessLogicService.performOrganizationalAssessment(orgData);

        expect(result.esgScore).toBeDefined();
        expect(result.riskProfile).toBeDefined();
        expect(result.complianceStatus).toBeNull(); // No financial data provided
        expect(Array.isArray(result.recommendations)).toBe(true);

        expect(result.esgScore.overallESGScore).toBeGreaterThanOrEqual(0);
        expect(result.esgScore.overallESGScore).toBeLessThanOrEqual(100);
        expect(result.riskProfile.expectedValue).toBeGreaterThan(0);
        expect(result.riskProfile.riskMetrics).toBeDefined();
      });

      it('should use default values when data is missing', async () => {
        const minimalOrgData = {
          totalAssetValue: 5000000
        };

        const result = await productionGradeBusinessLogicService.performOrganizationalAssessment(minimalOrgData);

        expect(result.esgScore).toBeDefined();
        expect(result.riskProfile).toBeDefined();
        expect(Array.isArray(result.recommendations)).toBe(true);
      });
    });
  });

  describe('AdvancedMLIntegrationEngine', () => {
    describe('predictAssetFailure', () => {
      it('should predict asset failure with ML model', () => {
        const assetData = {
          assetId: 'HVAC-001',
          assetType: 'HVAC',
          age: 8,
          operatingHours: 35000,
          temperature: [70, 72, 75, 80, 85, 90, 85, 80],
          vibration: [0.1, 0.2, 0.15, 0.3, 0.4, 0.5, 0.3, 0.2],
          pressure: [120, 125, 130, 135, 140, 145, 140, 135],
          maintenanceHistory: [
            { date: '2023-01-15', type: 'preventive' as const, cost: 500, downtime: 2 },
            { date: '2023-06-20', type: 'corrective' as const, cost: 1200, downtime: 8 },
            { date: '2024-01-10', type: 'emergency' as const, cost: 2500, downtime: 24 }
          ],
          performanceMetrics: {
            efficiency: [0.95, 0.92, 0.88, 0.85, 0.82, 0.80, 0.78, 0.75],
            throughput: [100, 98, 95, 92, 88, 85, 82, 80],
            errorRate: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08]
          }
        };

        const result = advancedMLIntegrationEngine.predictAssetFailure(assetData);

        expect(result.modelId).toContain(assetData.assetType);
        expect(result.assetType).toBe(assetData.assetType);
        expect(result.accuracy).toBeGreaterThan(0.5);
        expect(result.accuracy).toBeLessThanOrEqual(1);
        expect(result.predictions.failureProbability).toBeGreaterThanOrEqual(0);
        expect(result.predictions.failureProbability).toBeLessThanOrEqual(1);
        expect(result.predictions.timeToFailure).toBeGreaterThan(0);
        expect(['monitor', 'schedule_maintenance', 'immediate_action']).toContain(result.predictions.recommendedAction);
        expect(result.predictions.confidence).toBeGreaterThan(0);
        expect(result.predictions.confidence).toBeLessThanOrEqual(1);
      });
    });

    describe('detectAnomalies', () => {
      it('should detect statistical anomalies in time series data', () => {
        const normalData = [20, 21, 19, 22, 20, 21, 20, 19, 21, 20];
        const dataWithAnomaly = [...normalData, 50]; // Clear outlier
        
        const result = advancedMLIntegrationEngine.detectAnomalies({
          timestamps: dataWithAnomaly.map((_, i) => new Date(Date.now() - (i * 60000)).toISOString()),
          values: dataWithAnomaly,
          metricName: 'temperature',
          assetId: 'TEST-001'
        });

        expect(result.isAnomaly).toBe(true);
        expect(result.anomalyScore).toBeGreaterThan(0.7);
        expect(result.contributingFactors.length).toBeGreaterThan(0);
        expect(result.historicalContext.averageValue).toBeCloseTo(22.3, 1);
        expect(result.historicalContext.standardDeviation).toBeGreaterThan(0);
      });
    });

    describe('forecastDemand', () => {
      it('should forecast demand with trend analysis', () => {
        const historicalData = {
          timestamps: Array.from({length: 48}, (_, i) => 
            new Date(Date.now() - (47 - i) * 24 * 60 * 60 * 1000).toISOString()
          ),
          values: Array.from({length: 48}, (_, i) => 100 + i * 0.5),
          forecastPeriods: 14,
          includeSeasonality: true
        };

        const result = advancedMLIntegrationEngine.forecastDemand(historicalData);

        expect(result.forecastedValues).toHaveLength(14);
        expect(result.forecastedValues.every(val => val >= 0)).toBe(true);
        expect(result.confidenceIntervals.upper).toHaveLength(14);
        expect(result.confidenceIntervals.lower).toHaveLength(14);
        expect(['increasing', 'decreasing', 'stable']).toContain(result.trend.direction);
        expect(result.trend.strength).toBeGreaterThanOrEqual(0);
        expect(result.trend.strength).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('AdvancedDataProcessingEngine', () => {
    describe('configureDataStream', () => {
      it('should configure valid data stream', () => {
        const streamConfig = {
          streamId: 'asset-stream-001',
          organizationId: 'org-123',
          sourceSystem: 'facility-sensors',
          dataType: 'sensor' as const,
          schema: {
            version: '1.0',
            fields: [
              { name: 'deviceId', type: 'string' as const, required: true },
              { name: 'value', type: 'number' as const, required: true, validation: { min: 0, max: 100 } }
            ]
          },
          processingRules: {
            standardization: true,
            validation: true,
            enrichment: true,
            deduplication: false
          }
        };

        const result = advancedDataProcessingEngine.configureDataStream(streamConfig);

        expect(result.success).toBe(true);
        expect(result.streamId).toBe(streamConfig.streamId);
        expect(result.validationResults.schemaValid).toBe(true);
        expect(result.validationResults.rulesValid).toBe(true);
        expect(result.validationResults.errors).toHaveLength(0);
      });
    });
  });
});