/**
 * Financial Management Sub-Service - Complete financial operations management
 * 
 * This sub-service handles all financial management operations including:
 * - Budget creation, forecasting, and variance analysis
 * - Cost allocation and chargeback operations
 * - Financial statement consolidation
 * - Multi-level financial reporting and analytics
 * - Rate management and billing operations
 * 
 * Part of the Financial Management domain within Turbo Asset IWMS
 */

// Core financial management services
export { BudgetForecastService } from './BudgetForecastService';
export { ChargebackAllocationService } from './ChargebackAllocationService';
export { FinancialConsolidationService } from './FinancialConsolidationService';

// Import services for internal use
import { BudgetForecastService } from './BudgetForecastService';
import { ChargebackAllocationService } from './ChargebackAllocationService';
import { FinancialConsolidationService } from './FinancialConsolidationService';

// Type definitions and constants
export interface FinancialMetrics {
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercentage: number;
  totalAllocations: number;
  consolidatedRevenue: number;
  consolidatedExpenses: number;
  netIncome: number;
}

export interface FinancialSummary {
  period: string;
  budgetSummary: any;
  allocationSummary: any;
  consolidationSummary: any;
  metrics: FinancialMetrics;
  alerts: Array<{
    type: 'BUDGET_VARIANCE' | 'ALLOCATION_ISSUE' | 'CONSOLIDATION_ERROR';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    entityId?: string;
  }>;
}

/**
 * Main Financial Management Service - Orchestrates all financial operations
 * 
 * This class provides a unified interface to all financial management capabilities,
 * coordinating between budget/forecast, chargeback, and consolidation services to provide
 * comprehensive financial operations management.
 */
export class FinancialOperationsManager {
  private budgetForecastService: BudgetForecastService;
  private chargebackService: ChargebackAllocationService;
  private consolidationService: FinancialConsolidationService;

  constructor() {
    // Initialize all sub-services
    this.budgetForecastService = new BudgetForecastService();
    this.chargebackService = new ChargebackAllocationService();
    this.consolidationService = new FinancialConsolidationService();
  }

  // Expose service getters for direct access when needed
  get budgetForecast() { return this.budgetForecastService; }
  get chargeback() { return this.chargebackService; }
  get consolidation() { return this.consolidationService; }

  /**
   * Get comprehensive financial overview
   */
  async getFinancialOverview(
    organizationId: string, 
    period: string, 
    options: {
      includeBudgets?: boolean;
      includeChargebacks?: boolean;
      includeConsolidation?: boolean;
      fiscalYear?: number;
    } = {}
  ): Promise<FinancialSummary> {
    const {
      includeBudgets = true,
      includeChargebacks = true,
      includeConsolidation = true,
      fiscalYear
    } = options;

    // Get budget summary if requested
    let budgetSummary = null;
    if (includeBudgets) {
      budgetSummary = await this.budgetForecastService.getBudgetSummary(organizationId, fiscalYear);
    }

    // Get chargeback reports if requested
    let allocationSummary = null;
    if (includeChargebacks) {
      const chargebackReports = await this.chargebackService.generateChargebackReport(
        organizationId, 
        period
      );
      allocationSummary = {
        totalReports: chargebackReports.length,
        totalAllocated: chargebackReports.reduce((sum, report) => sum + report.totalAllocated, 0),
        reportsByDepartment: chargebackReports.length
      };
    }

    // Get consolidation summary if requested
    let consolidationSummary = null;
    if (includeConsolidation) {
      consolidationSummary = await this.consolidationService.getConsolidationSummary(
        organizationId, 
        period
      );
    }

    // Calculate combined metrics
    const metrics: FinancialMetrics = {
      totalBudget: budgetSummary?.totalBudgetAmount || 0,
      totalActual: consolidationSummary?.consolidationMetrics.totalRevenue || 0,
      variance: (budgetSummary?.variance.totalVariance || 0),
      variancePercentage: (budgetSummary?.variance.variancePercentage || 0),
      totalAllocations: allocationSummary?.totalAllocated || 0,
      consolidatedRevenue: consolidationSummary?.consolidationMetrics.totalRevenue || 0,
      consolidatedExpenses: consolidationSummary?.consolidationMetrics.totalExpenses || 0,
      netIncome: consolidationSummary?.consolidationMetrics.netIncome || 0
    };

    // Generate alerts based on financial metrics
    const alerts = this.generateFinancialAlerts(metrics, budgetSummary, allocationSummary);

    return {
      period,
      budgetSummary,
      allocationSummary,
      consolidationSummary,
      metrics,
      alerts
    };
  }

  /**
   * Create comprehensive budget with allocation rules
   */
  async createBudgetWithAllocations(
    budgetData: any,
    allocationRules: any[]
  ): Promise<{
    budget: any;
    allocationRules: any[];
  }> {
    // Create the budget
    const budget = await this.budgetForecastService.createBudget(budgetData);

    // Create allocation rules for the budget
    const createdRules = [];
    for (const ruleData of allocationRules) {
      const rule = await this.chargebackService.createChargebackRule({
        ...ruleData,
        organizationId: budgetData.organizationId
      });
      createdRules.push(rule);
    }

    return {
      budget,
      allocationRules: createdRules
    };
  }

  /**
   * Process monthly financial cycle
   */
  async processMonthlyFinancialCycle(
    organizationId: string,
    period: string, // YYYY-MM format
    options: {
      processAllocations?: boolean;
      createConsolidation?: boolean;
      generateReports?: boolean;
    } = {}
  ): Promise<{
    allocations?: any[];
    consolidatedStatement?: any;
    reports?: any[];
    summary: FinancialSummary;
  }> {
    const {
      processAllocations = true,
      createConsolidation = true,
      generateReports = true
    } = options;

    const results: any = {};

    try {
      // Process cost allocations for the period
      if (processAllocations) {
        // Get active chargeback rules
        const activeRules = await this.getActiveChargebackRules(organizationId);
        
        const allocations = [];
        for (const rule of activeRules) {
          // This would typically get actual cost data from the system
          const allocationResult = await this.chargebackService.processAllocation({
            ruleId: rule.id,
            period,
            totalCost: rule.estimatedMonthlyCost || 10000, // Placeholder
            spaceId: rule.defaultSpaceId,
            departmentId: rule.defaultDepartmentId
          });
          allocations.push(allocationResult);
        }
        results.allocations = allocations;
      }

      // Create consolidated financial statements
      if (createConsolidation) {
        const sourceStatements = await this.getMonthlyStatements(organizationId, period);
        if (sourceStatements.length > 0) {
          const consolidationRule = await this.getDefaultConsolidationRule(organizationId);
          if (consolidationRule) {
            results.consolidatedStatement = await this.consolidationService.consolidateStatements(
              organizationId,
              consolidationRule.id,
              period,
              sourceStatements.map(s => s.id)
            );
          }
        }
      }

      // Generate reports
      if (generateReports) {
        results.reports = await this.chargebackService.generateChargebackReport(
          organizationId,
          period
        );
      }

      // Get comprehensive financial summary
      results.summary = await this.getFinancialOverview(organizationId, period);

      return results;
    } catch (error: unknown) {
      throw new Error(`Failed to process monthly financial cycle: ${error.message}`);
    }
  }

  /**
   * Analyze financial performance across services
   */
  async analyzeFinancialPerformance(
    organizationId: string,
    startPeriod: string,
    endPeriod: string
  ): Promise<{
    budgetPerformance: any;
    allocationEfficiency: any;
    consolidationTrends: any;
    recommendations: Array<{
      category: 'BUDGET' | 'ALLOCATION' | 'CONSOLIDATION';
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      recommendation: string;
      expectedImpact: string;
    }>;
  }> {
    // Get budget performance over time
    const budgetPerformance = await this.analyzeBudgetPerformance(
      organizationId, 
      startPeriod, 
      endPeriod
    );

    // Analyze allocation efficiency
    const allocationEfficiency = await this.analyzeAllocationEfficiency(
      organizationId,
      startPeriod,
      endPeriod
    );

    // Get consolidation trends
    const consolidationTrends = await this.analyzeConsolidationTrends(
      organizationId,
      startPeriod,
      endPeriod
    );

    // Generate recommendations
    const recommendations = this.generateFinancialRecommendations(
      budgetPerformance,
      allocationEfficiency,
      consolidationTrends
    );

    return {
      budgetPerformance,
      allocationEfficiency,
      consolidationTrends,
      recommendations
    };
  }

  /**
   * Generate financial alerts based on metrics
   */
  private generateFinancialAlerts(
    metrics: FinancialMetrics, 
    budgetSummary: any, 
    allocationSummary: any
  ): Array<any> {
    const alerts = [];

    // Budget variance alerts
    if (Math.abs(metrics.variancePercentage) > 10) {
      alerts.push({
        type: 'BUDGET_VARIANCE',
        severity: Math.abs(metrics.variancePercentage) > 20 ? 'HIGH' : 'MEDIUM',
        message: `Budget variance of ${metrics.variancePercentage.toFixed(1)}% detected`,
        entityId: null
      });
    }

    // Allocation alerts
    if (allocationSummary && allocationSummary.totalAllocated === 0) {
      alerts.push({
        type: 'ALLOCATION_ISSUE',
        severity: 'HIGH',
        message: 'No cost allocations processed for the period',
        entityId: null
      });
    }

    // Net income alerts
    if (metrics.netIncome < 0) {
      alerts.push({
        type: 'CONSOLIDATION_ERROR',
        severity: 'HIGH',
        message: `Negative net income: $${metrics.netIncome.toFixed(2)}`,
        entityId: null
      });
    }

    return alerts;
  }

  /**
   * Helper methods for monthly processing
   */
  private async getActiveChargebackRules(organizationId: string): Promise<any[]> {
    // Placeholder implementation - would query active rules
    return [];
  }

  private async getMonthlyStatements(organizationId: string, period: string): Promise<any[]> {
    // Placeholder implementation - would get statements for the period
    return [];
  }

  private async getDefaultConsolidationRule(organizationId: string): Promise<any> {
    // Placeholder implementation - would get default consolidation rule
    return null;
  }

  /**
   * Performance analysis helper methods
   */
  private async analyzeBudgetPerformance(
    organizationId: string,
    startPeriod: string,
    endPeriod: string
  ): Promise<any> {
    // Placeholder implementation for budget performance analysis
    return {
      averageVariance: 0,
      trendDirection: 'STABLE',
      forecastAccuracy: 85.2,
      budgetUtilization: 92.1
    };
  }

  private async analyzeAllocationEfficiency(
    organizationId: string,
    startPeriod: string,
    endPeriod: string
  ): Promise<any> {
    // Placeholder implementation for allocation efficiency analysis
    return {
      allocationAccuracy: 88.5,
      processTime: 2.3,
      costPerAllocation: 15.50,
      automationRate: 75.2
    };
  }

  private async analyzeConsolidationTrends(
    organizationId: string,
    startPeriod: string,
    endPeriod: string
  ): Promise<any> {
    // Placeholder implementation for consolidation trends
    return {
      averageProcessingTime: 45,
      dataQualityScore: 94.1,
      eliminationAccuracy: 98.2,
      consolidationComplexity: 'MEDIUM'
    };
  }

  private generateFinancialRecommendations(
    budgetPerformance: any,
    allocationEfficiency: any,
    consolidationTrends: any
  ): Array<any> {
    const recommendations = [];

    if (budgetPerformance.forecastAccuracy < 80) {
      recommendations.push({
        category: 'BUDGET',
        priority: 'HIGH',
        recommendation: 'Improve forecasting methodology and data quality',
        expectedImpact: 'Increase forecast accuracy by 10-15%'
      });
    }

    if (allocationEfficiency.automationRate < 70) {
      recommendations.push({
        category: 'ALLOCATION',
        priority: 'MEDIUM',
        recommendation: 'Implement automated allocation rules for common scenarios',
        expectedImpact: 'Reduce processing time by 40% and improve accuracy'
      });
    }

    if (consolidationTrends.dataQualityScore < 90) {
      recommendations.push({
        category: 'CONSOLIDATION',
        priority: 'HIGH',
        recommendation: 'Implement data validation rules and quality checks',
        expectedImpact: 'Improve consolidation accuracy and reduce manual interventions'
      });
    }

    return recommendations;
  }
}