import { prisma } from '../config/database';
import { logger } from '@/config/logger';

export interface BudgetCreationData {
  organizationId: string;
  propertyId?: string;
  budgetName: string;
  budgetType: 'OPERATING' | 'CAPITAL' | 'CASH_FLOW' | 'REVENUE' | 'EXPENSE' | 'CONSOLIDATED';
  budgetPeriod: string; // YYYY for annual, YYYY-QQ for quarterly
  fiscalYear: number;
  effectiveFrom: Date;
  effectiveTo: Date;
  assumptions?: any;
  lineItems: Array<{
    category: string;
    subCategory?: string;
    description: string;
    annualAmount: number;
    q1Amount?: number;
    q2Amount?: number;
    q3Amount?: number;
    q4Amount?: number;
    monthlyAmounts?: number[];
    calculationMethod?: string;
    unitRate?: number;
    units?: number;
    escalationRate?: number;
  }>;
}

export interface ForecastCreationData {
  budgetId?: string;
  forecastName: string;
  forecastType: 'REVENUE' | 'EXPENSE' | 'CASH_FLOW' | 'OCCUPANCY' | 'MARKET_RENT';
  forecastPeriod: string; // YYYY-MM or YYYY-QQ format
  forecastAmount: number;
  confidence?: number; // 0-1
  budgetAmount?: number;
  forecastMethod: 'HISTORICAL' | 'TREND_ANALYSIS' | 'REGRESSION' | 'MOVING_AVERAGE' | 'SEASONAL' | 'EXPERT_JUDGMENT' | 'MONTE_CARLO';
  dataPoints?: any[];
  assumptions?: any;
  periodStart: Date;
  periodEnd: Date;
}

export interface BudgetSummary {
  totalBudgets: number;
  totalBudgetAmount: number;
  approvedBudgets: number;
  pendingApprovals: number;
  budgetsByType: { [key: string]: number };
  budgetsByProperty: Array<{
    propertyId: string;
    propertyName: string;
    budgetCount: number;
    totalAmount: number;
  }>;
  varianceAnalysis: {
    totalVariance: number;
    favorableVariances: number;
    unfavorableVariances: number;
    varianceByCategory: Array<{
      category: string;
      budgetAmount: number;
      actualAmount: number;
      variance: number;
      variancePercent: number;
    }>;
  };
  upcomingBudgetCycles: Array<{
    budgetId: string;
    budgetName: string;
    dueDate: Date;
    status: string;
  }>;
}

export interface ForecastAnalysis {
  forecastAccuracy: {
    averageAccuracy: number;
    accuracyByMethod: { [key: string]: number };
    accuracyTrend: Array<{
      period: string;
      accuracy: number;
    }>;
  };
  forecastsByType: { [key: string]: number };
  confidenceLevels: {
    high: number; // >80%
    medium: number; // 60-80%
    low: number; // <60%
  };
  forecastVariance: {
    totalVariance: number;
    averageVariance: number;
    varianceByMethod: { [key: string]: number };
  };
}

export interface BudgetScenario {
  scenarioName: string;
  description: string;
  assumptions: any;
  baseCase: boolean;
  adjustments: Array<{
    lineItemId: string;
    adjustmentType: 'PERCENTAGE' | 'ABSOLUTE' | 'FORMULA';
    adjustmentValue: number;
    reason: string;
  }>;
  results: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    cashFlow: number;
    roi: number;
  };
}

/**
 * BudgetForecastService handles budget planning, forecasting, and variance reporting
 * Provides comprehensive financial planning and analysis capabilities
 */
export class BudgetForecastService {

  /**
   * Create a new budget with line items
   */
  async createBudget(data: BudgetCreationData): Promise<any> {
    try {
      // Validate organization and property (if specified)
      const organization = await prisma.organization.findUnique({
        where: { id: data.organizationId }
      });
      
      if (!organization) {
        throw new Error('Organization not found');
      }

      if (data.propertyId) {
        const property = await prisma.property.findUnique({
          where: { id: data.propertyId }
        });
        
        if (!property) {
          throw new Error('Property not found');
        }
      }

      // Calculate total budget amount
      const totalBudget = data.lineItems.reduce((sum, item) => sum + item.annualAmount, 0);

      // Create budget record
      const budget = await prisma.budget.create({
        data: {
          organizationId: data.organizationId,
          propertyId: data.propertyId,
          budgetName: data.budgetName,
          budgetType: data.budgetType,
          budgetPeriod: data.budgetPeriod,
          fiscalYear: data.fiscalYear,
          totalBudget,
          approvedBudget: null, // Will be set upon approval
          status: 'DRAFT',
          version: '1.0',
          effectiveFrom: data.effectiveFrom,
          effectiveTo: data.effectiveTo,
          assumptions: data.assumptions,
          preparedAt: new Date(),
          preparedBy: 'system' // Would be actual user ID
        }
      });

      // Create budget line items
      const lineItemPromises = data.lineItems.map((item, index) => {
        return prisma.budgetLineItem.create({
          data: {
            budgetId: budget.id,
            lineNumber: index + 1,
            category: item.category,
            subCategory: item.subCategory,
            description: item.description,
            annualAmount: item.annualAmount,
            q1Amount: item.q1Amount,
            q2Amount: item.q2Amount,
            q3Amount: item.q3Amount,
            q4Amount: item.q4Amount,
            monthlyAmounts: item.monthlyAmounts,
            calculationMethod: item.calculationMethod,
            unitRate: item.unitRate,
            units: item.units,
            escalationRate: item.escalationRate,
            isActive: true
          }
        });
      });

      await Promise.all(lineItemPromises);

      logger.info('Budget created successfully', {
        budgetId: budget.id,
        budgetName: data.budgetName,
        totalAmount: totalBudget,
        lineItemCount: data.lineItems.length
      });

      return budget;
    } catch (error: unknown) {
      logger.error('Failed to create budget', error);
      throw error;
    }
  }

  /**
   * Create forecast record
   */
  async createForecast(data: ForecastCreationData): Promise<any> {
    try {
      // Validate budget if specified
      if (data.budgetId) {
        const budget = await prisma.budget.findUnique({
          where: { id: data.budgetId }
        });
        
        if (!budget) {
          throw new Error('Budget not found');
        }
      }

      // Calculate variance from budget if applicable
      let variance = null;
      let variancePercent = null;
      if (data.budgetAmount) {
        variance = data.forecastAmount - data.budgetAmount;
        variancePercent = data.budgetAmount > 0 ? (variance / data.budgetAmount) * 100 : 0;
      }

      const forecast = await prisma.forecast.create({
        data: {
          budgetId: data.budgetId,
          forecastName: data.forecastName,
          forecastType: data.forecastType,
          forecastPeriod: data.forecastPeriod,
          forecastAmount: data.forecastAmount,
          confidence: data.confidence,
          budgetAmount: data.budgetAmount,
          variance,
          variancePercent,
          forecastMethod: data.forecastMethod,
          dataPoints: data.dataPoints,
          assumptions: data.assumptions,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          forecastDate: new Date(),
          status: 'PRELIMINARY'
        }
      });

      logger.info('Forecast created successfully', {
        forecastId: forecast.id,
        forecastType: data.forecastType,
        amount: data.forecastAmount,
        method: data.forecastMethod
      });

      return forecast;
    } catch (error: unknown) {
      logger.error('Failed to create forecast', error);
      throw error;
    }
  }

  /**
   * Get comprehensive budget summary for organization
   */
  async getBudgetSummary(organizationId: string, fiscalYear?: number): Promise<BudgetSummary> {
    try {
      const whereClause: any = { organizationId };
      if (fiscalYear) {
        whereClause.fiscalYear = fiscalYear;
      }

      const budgets = await prisma.budget.findMany({
        where: whereClause,
        include: {
          property: {
            select: { id: true, name: true }
          },
          lineItems: true,
          variances: true
        }
      });

      // Calculate summary statistics
      const totalBudgets = budgets.length;
      const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.totalBudget, 0);
      const approvedBudgets = budgets.filter(b => b.status === 'APPROVED').length;
      const pendingApprovals = budgets.filter(b => b.status === 'REVIEW').length;

      // Budget breakdown by type
      const budgetsByType = budgets.reduce((acc, budget) => {
        acc[budget.budgetType] = (acc[budget.budgetType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Budget breakdown by property
      const propertyMap = new Map<string, {
        propertyId: string;
        propertyName: string;
        budgetCount: number;
        totalAmount: number;
      }>();

      budgets.forEach(budget => {
        if (budget.property) {
          const propertyId = budget.property.id;
          if (!propertyMap.has(propertyId)) {
            propertyMap.set(propertyId, {
              propertyId,
              propertyName: budget.property.name,
              budgetCount: 0,
              totalAmount: 0
            });
          }
          const property = propertyMap.get(propertyId)!;
          property.budgetCount++;
          property.totalAmount += budget.totalBudget;
        }
      });

      // Calculate variance analysis (simplified - would normally pull actual data)
      const varianceAnalysis = await this.calculateVarianceAnalysis(budgets);

      // Get upcoming budget cycles
      const upcomingBudgetCycles = await this.getUpcomingBudgetCycles(organizationId);

      return {
        totalBudgets,
        totalBudgetAmount: Math.round(totalBudgetAmount),
        approvedBudgets,
        pendingApprovals,
        budgetsByType,
        budgetsByProperty: Array.from(propertyMap.values()),
        varianceAnalysis,
        upcomingBudgetCycles
      };
    } catch (error: unknown) {
      logger.error('Failed to get budget summary', error);
      throw error;
    }
  }

  /**
   * Generate forecast analysis
   */
  async getForecastAnalysis(organizationId: string, timeframe?: string): Promise<ForecastAnalysis> {
    try {
      const whereClause: any = {
        budget: { organizationId }
      };

      if (timeframe) {
        whereClause.forecastPeriod = { startsWith: timeframe };
      }

      const forecasts = await prisma.forecast.findMany({
        where: whereClause,
        include: {
          budget: {
            select: { organizationId: true }
          }
        }
      });

      // Calculate forecast accuracy (simplified - would compare with actual results)
      const accuracyMetrics = this.calculateForecastAccuracy(forecasts);

      // Forecasts by type
      const forecastsByType = forecasts.reduce((acc, forecast) => {
        acc[forecast.forecastType] = (acc[forecast.forecastType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Confidence level distribution
      const confidenceLevels = {
        high: forecasts.filter(f => (f.confidence || 0) > 0.8).length,
        medium: forecasts.filter(f => (f.confidence || 0) >= 0.6 && (f.confidence || 0) <= 0.8).length,
        low: forecasts.filter(f => (f.confidence || 0) < 0.6).length
      };

      // Variance analysis
      const forecastVariance = this.calculateForecastVariance(forecasts);

      return {
        forecastAccuracy: accuracyMetrics,
        forecastsByType,
        confidenceLevels,
        forecastVariance
      };
    } catch (error: unknown) {
      logger.error('Failed to get forecast analysis', error);
      throw error;
    }
  }

  /**
   * Process budget variance analysis
   */
  async processBudgetVariances(budgetId: string, actualData: any[]): Promise<any> {
    try {
      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: { lineItems: true }
      });

      if (!budget) {
        throw new Error('Budget not found');
      }

      const variances = [];
      for (const actual of actualData) {
        const lineItem = budget.lineItems.find(li => li.category === actual.category);
        if (lineItem) {
          const variance = actual.actualAmount - lineItem.annualAmount;
          const variancePercent = lineItem.annualAmount > 0 ? 
            (variance / lineItem.annualAmount) * 100 : 0;

          // Create variance record for significant variances
          if (Math.abs(variancePercent) > 10 || Math.abs(variance) > 5000) {
            const varianceRecord = await prisma.budgetVariance.create({
              data: {
                budgetId,
                variancePeriod: new Date().toISOString().substring(0, 7), // YYYY-MM
                category: actual.category,
                description: `Budget variance in ${actual.category}`,
                budgetAmount: lineItem.annualAmount,
                actualAmount: actual.actualAmount,
                variance,
                variancePercent,
                varianceType: variance > 0 ? 'UNFAVORABLE' : 'FAVORABLE',
                explanation: this.generateVarianceExplanation(actual.category, variancePercent),
                status: 'OPEN'
              }
            });

            variances.push(varianceRecord);
          }
        }
      }

      logger.info('Budget variance analysis completed', {
        budgetId,
        variancesCreated: variances.length
      });

      return variances;
    } catch (error: unknown) {
      logger.error('Failed to process budget variances', error);
      throw error;
    }
  }

  /**
   * Generate scenario analysis for budget planning
   */
  async generateScenarioAnalysis(
    budgetId: string, 
    scenarios: BudgetScenario[]
  ): Promise<any> {
    try {
      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: { lineItems: true }
      });

      if (!budget) {
        throw new Error('Budget not found');
      }

      const scenarioResults = [];
      
      for (const scenario of scenarios) {
        const adjustedLineItems = budget.lineItems.map(lineItem => {
          const adjustment = scenario.adjustments.find(adj => 
            adj.lineItemId === lineItem.id
          );
          
          let adjustedAmount = lineItem.annualAmount;
          if (adjustment) {
            switch (adjustment.adjustmentType) {
              case 'PERCENTAGE':
                adjustedAmount = lineItem.annualAmount * (1 + adjustment.adjustmentValue / 100);
                break;
              case 'ABSOLUTE':
                adjustedAmount = lineItem.annualAmount + adjustment.adjustmentValue;
                break;
              case 'FORMULA':
                // Custom formula logic would go here
                adjustedAmount = lineItem.annualAmount * adjustment.adjustmentValue;
                break;
            }
          }
          
          return {
            ...lineItem,
            adjustedAmount,
            variance: adjustedAmount - lineItem.annualAmount
          };
        });

        // Calculate scenario results
        const revenueItems = adjustedLineItems.filter(li => 
          li.category.toLowerCase().includes('revenue')
        );
        const expenseItems = adjustedLineItems.filter(li => 
          !li.category.toLowerCase().includes('revenue')
        );

        const totalRevenue = revenueItems.reduce((sum, item) => sum + item.adjustedAmount, 0);
        const totalExpenses = expenseItems.reduce((sum, item) => sum + item.adjustedAmount, 0);
        const netIncome = totalRevenue - totalExpenses;
        const cashFlow = netIncome; // Simplified calculation
        const roi = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

        scenarioResults.push({
          ...scenario,
          results: {
            totalRevenue: Math.round(totalRevenue),
            totalExpenses: Math.round(totalExpenses),
            netIncome: Math.round(netIncome),
            cashFlow: Math.round(cashFlow),
            roi: Math.round(roi * 100) / 100
          },
          lineItemDetails: adjustedLineItems
        });
      }

      logger.info('Scenario analysis completed', {
        budgetId,
        scenarioCount: scenarios.length
      });

      return scenarioResults;
    } catch (error: unknown) {
      logger.error('Failed to generate scenario analysis', error);
      throw error;
    }
  }

  /**
   * Generate automated forecasts based on historical data
   */
  async generateAutomatedForecasts(
    organizationId: string,
    forecastPeriods: string[],
    methods: string[] = ['HISTORICAL', 'TREND_ANALYSIS']
  ): Promise<any> {
    try {
      logger.info('Starting automated forecast generation', {
        organizationId,
        periods: forecastPeriods.length,
        methods
      });

      const results = [];
      
      // Get relevant budget data for historical analysis
      const budgets = await prisma.budget.findMany({
        where: { organizationId },
        include: { lineItems: true },
        orderBy: { fiscalYear: 'desc' },
        take: 5 // Last 5 years for historical analysis
      });

      if (budgets.length === 0) {
        throw new Error('No historical budget data available for forecasting');
      }

      for (const period of forecastPeriods) {
        for (const method of methods) {
          try {
            const forecast = await this.generateForecastForPeriod(
              budgets,
              period,
              method as any
            );
            
            if (forecast) {
              results.push(forecast);
            }
          } catch (error: unknown) {
            logger.error('Failed to generate forecast', {
              period,
              method,
              error: error instanceof Error ? (error).message : 'Unknown error'
            });
          }
        }
      }

      logger.info('Automated forecast generation completed', {
        organizationId,
        forecastsGenerated: results.length
      });

      return {
        summary: {
          periodsProcessed: forecastPeriods.length,
          methodsUsed: methods.length,
          forecastsGenerated: results.length
        },
        forecasts: results
      };
    } catch (error: unknown) {
      logger.error('Failed to generate automated forecasts', error);
      throw error;
    }
  }

  /**
   * Generate budget report with multiple views
   */
  async generateBudgetReport(
    organizationId: string,
    reportType: string,
    filters: any = {}
  ): Promise<any> {
    try {
      switch (reportType) {
        case 'BUDGET_SUMMARY':
          return await this.generateBudgetSummaryReport(organizationId, filters);
        case 'VARIANCE_ANALYSIS':
          return await this.generateVarianceAnalysisReport(organizationId, filters);
        case 'FORECAST_ACCURACY':
          return await this.generateForecastAccuracyReport(organizationId, filters);
        case 'CASH_FLOW_PROJECTION':
          return await this.generateCashFlowProjectionReport(organizationId, filters);
        default:
          throw new Error('Invalid report type');
      }
    } catch (error: unknown) {
      logger.error('Failed to generate budget report', error);
      throw error;
    }
  }

  /**
   * Update budget with revisions
   */
  async updateBudget(
    budgetId: string,
    updates: {
      lineItemChanges?: Array<{
        lineItemId: string;
        changes: any;
        reason: string;
      }>;
      statusChange?: string;
      notes?: string;
    }
  ): Promise<any> {
    try {
      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: { lineItems: true }
      });

      if (!budget) {
        throw new Error('Budget not found');
      }

      // Process line item changes
      if (updates.lineItemChanges) {
        for (const change of updates.lineItemChanges) {
          await prisma.budgetLineItem.update({
            where: { id: change.lineItemId },
            data: {
              ...change.changes,
              notes: change.reason
            }
          });
        }

        // Recalculate total budget
        const updatedLineItems = await prisma.budgetLineItem.findMany({
          where: { budgetId }
        });
        const newTotalBudget = updatedLineItems.reduce((sum, item) => sum + item.annualAmount, 0);

        await prisma.budget.update({
          where: { id: budgetId },
          data: {
            totalBudget: newTotalBudget,
            revisedBudget: newTotalBudget,
            version: this.incrementVersion(budget.version)
          }
        });
      }

      // Update status if requested
      if (updates.statusChange) {
        await prisma.budget.update({
          where: { id: budgetId },
          data: {
            status: updates.statusChange as any,
            ...(updates.statusChange === 'APPROVED' && { 
              approvedAt: new Date(),
              approvedBy: 'system' // Would be actual user
            }),
            ...(updates.statusChange === 'REVIEW' && {
              reviewedAt: new Date(),
              reviewedBy: 'system'
            })
          }
        });
      }

      logger.info('Budget updated successfully', {
        budgetId,
        lineItemChanges: updates.lineItemChanges?.length || 0,
        statusChange: updates.statusChange
      });

      return await prisma.budget.findUnique({
        where: { id: budgetId },
        include: { lineItems: true }
      });
    } catch (error: unknown) {
      logger.error('Failed to update budget', error);
      throw error;
    }
  }

  // Private helper methods

  private async calculateVarianceAnalysis(budgets: any[]): Promise<any> {
    // Simplified variance analysis - would normally compare with actual financial data
    const categories = new Map<string, {
      budgetAmount: number;
      actualAmount: number;
      variance: number;
      variancePercent: number;
    }>();

    budgets.forEach(budget => {
      budget.lineItems.forEach((lineItem: any) => {
        if (!categories.has(lineItem.category)) {
          categories.set(lineItem.category, {
            budgetAmount: 0,
            actualAmount: 0,
            variance: 0,
            variancePercent: 0
          });
        }
        const category = categories.get(lineItem.category)!;
        category.budgetAmount += lineItem.annualAmount;
        // For demo purposes, generate simulated actual amounts
        category.actualAmount += lineItem.annualAmount * (0.9 + Math.random() * 0.2);
      });
    });

    // Calculate variances
    categories.forEach((category) => {
      category.variance = category.actualAmount - category.budgetAmount;
      category.variancePercent = category.budgetAmount > 0 ? 
        (category.variance / category.budgetAmount) * 100 : 0;
    });

    const varianceByCategory = Array.from(categories.entries()).map(([category, data]) => ({
      category,
      ...data,
      budgetAmount: Math.round(data.budgetAmount),
      actualAmount: Math.round(data.actualAmount),
      variance: Math.round(data.variance),
      variancePercent: Math.round(data.variancePercent * 100) / 100
    }));

    const totalVariance = varianceByCategory.reduce((sum, cat) => sum + cat.variance, 0);
    const favorableVariances = varianceByCategory.filter(cat => cat.variance < 0).length;
    const unfavorableVariances = varianceByCategory.filter(cat => cat.variance > 0).length;

    return {
      totalVariance: Math.round(totalVariance),
      favorableVariances,
      unfavorableVariances,
      varianceByCategory
    };
  }

  private async getUpcomingBudgetCycles(organizationId: string): Promise<any[]> {
    const nextYear = new Date().getFullYear() + 1;
    const budgetDueDate = new Date(new Date().getFullYear(), 10, 1); // November 1st

    return [
      {
        budgetId: 'upcoming-1',
        budgetName: `FY${nextYear} Operating Budget`,
        dueDate: budgetDueDate,
        status: 'PLANNING'
      },
      {
        budgetId: 'upcoming-2',
        budgetName: `FY${nextYear} Capital Budget`,
        dueDate: budgetDueDate,
        status: 'NOT_STARTED'
      }
    ];
  }

  private calculateForecastAccuracy(forecasts: any[]): any {
    // Simplified accuracy calculation - would normally compare with actual results
    const averageAccuracy = 85; // Demo value
    
    const accuracyByMethod = forecasts.reduce((acc, forecast) => {
      const method = forecast.forecastMethod;
      acc[method] = acc[method] || [];
      // Generate demo accuracy based on method
      const accuracy = this.getMethodAccuracy(method);
      acc[method].push(accuracy);
      return acc;
    }, {} as { [key: string]: number[] });

    // Calculate average accuracy by method
    Object.keys(accuracyByMethod).forEach(method => {
      const accuracies = accuracyByMethod[method];
      accuracyByMethod[method] = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    });

    return {
      averageAccuracy,
      accuracyByMethod,
      accuracyTrend: this.generateAccuracyTrend() // Demo data
    };
  }

  private getMethodAccuracy(method: string): number {
    const accuracyMap: { [key: string]: number } = {
      'HISTORICAL': 82,
      'TREND_ANALYSIS': 78,
      'REGRESSION': 85,
      'MOVING_AVERAGE': 80,
      'SEASONAL': 88,
      'EXPERT_JUDGMENT': 75,
      'MONTE_CARLO': 90
    };
    return accuracyMap[method] || 80;
  }

  private generateAccuracyTrend(): any[] {
    // Generate demo accuracy trend data
    const periods = ['2023-Q1', '2023-Q2', '2023-Q3', '2023-Q4', '2024-Q1'];
    return periods.map(period => ({
      period,
      accuracy: 75 + Math.random() * 20 // 75-95% accuracy
    }));
  }

  private calculateForecastVariance(forecasts: any[]): any {
    const variances = forecasts
      .filter(f => f.budgetAmount && f.forecastAmount)
      .map(f => Math.abs(f.forecastAmount - f.budgetAmount!));

    const totalVariance = variances.reduce((sum, variance) => sum + variance, 0);
    const averageVariance = variances.length > 0 ? totalVariance / variances.length : 0;

    const varianceByMethod = forecasts.reduce((acc, forecast) => {
      if (forecast.budgetAmount && forecast.forecastAmount) {
        const method = forecast.forecastMethod;
        const variance = Math.abs(forecast.forecastAmount - forecast.budgetAmount);
        acc[method] = acc[method] || [];
        acc[method].push(variance);
      }
      return acc;
    }, {} as { [key: string]: number[] });

    // Calculate average variance by method
    Object.keys(varianceByMethod).forEach(method => {
      const variances = varianceByMethod[method];
      varianceByMethod[method] = variances.reduce((sum, variance) => sum + variance, 0) / variances.length;
    });

    return {
      totalVariance: Math.round(totalVariance),
      averageVariance: Math.round(averageVariance),
      varianceByMethod
    };
  }

  private generateVarianceExplanation(category: string, variancePercent: number): string {
    if (Math.abs(variancePercent) > 25) {
      return `Significant variance in ${category} requires detailed investigation`;
    } else if (Math.abs(variancePercent) > 15) {
      return `Notable variance in ${category} - review assumptions and actuals`;
    } else if (category.toLowerCase().includes('revenue') && variancePercent < -10) {
      return 'Revenue shortfall - review market conditions and leasing activity';
    } else if (category.toLowerCase().includes('maintenance') && variancePercent > 15) {
      return 'Higher than expected maintenance costs - review asset condition and service contracts';
    } else {
      return 'Variance within acceptable range but should be monitored';
    }
  }

  private async generateForecastForPeriod(
    budgets: any[],
    period: string,
    method: 'HISTORICAL' | 'TREND_ANALYSIS' | 'REGRESSION' | 'MOVING_AVERAGE' | 'SEASONAL' | 'EXPERT_JUDGMENT' | 'MONTE_CARLO'
  ): Promise<any> {
    if (budgets.length === 0) {return null;}

    const latestBudget = budgets[0];
    const totalBudgetAmount = latestBudget.totalBudget;
    
    // Apply forecasting method
    let forecastAmount = totalBudgetAmount;
    let confidence = 0.7;

    switch (method) {
      case 'HISTORICAL':
        // Use average of historical data
        const avgBudget = budgets.reduce((sum, b) => sum + b.totalBudget, 0) / budgets.length;
        forecastAmount = avgBudget * 1.03; // 3% growth assumption
        confidence = 0.8;
        break;
      case 'TREND_ANALYSIS':
        // Calculate trend from historical data
        const trend = this.calculateTrend(budgets.map(b => b.totalBudget));
        forecastAmount = totalBudgetAmount + trend;
        confidence = 0.75;
        break;
      case 'MOVING_AVERAGE':
        // 3-period moving average
        const recentBudgets = budgets.slice(0, 3);
        forecastAmount = recentBudgets.reduce((sum, b) => sum + b.totalBudget, 0) / recentBudgets.length;
        confidence = 0.7;
        break;
      default:
        forecastAmount = totalBudgetAmount * 1.05; // 5% growth default
        confidence = 0.6;
    }

    return await this.createForecast({
      forecastName: `${method} Forecast - ${period}`,
      forecastType: 'REVENUE',
      forecastPeriod: period,
      forecastAmount,
      confidence,
      budgetAmount: totalBudgetAmount,
      forecastMethod: method,
      dataPoints: budgets.map(b => ({
        year: b.fiscalYear,
        amount: b.totalBudget
      })),
      periodStart: new Date(parseInt(period), 0, 1),
      periodEnd: new Date(parseInt(period), 11, 31)
    });
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) {return 0;}
    
    // Simple linear trend calculation
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const minor = parseInt(parts[1] || '0') + 1;
    return `${parts[0]}.${minor}`;
  }

  private async generateBudgetSummaryReport(organizationId: string, filters: any): Promise<any> {
    const summary = await this.getBudgetSummary(organizationId, filters.fiscalYear);
    
    return {
      reportType: 'BUDGET_SUMMARY',
      generatedDate: new Date(),
      parameters: { organizationId, fiscalYear: filters.fiscalYear },
      summary,
      insights: [
        summary.totalBudgetAmount > 10000000 ? 
          'Large budget portfolio requires enhanced oversight' : 
          'Budget size appropriate for organization scale',
        summary.pendingApprovals > 5 ? 
          'Multiple budgets pending approval - expedite review process' : 
          'Approval process on track',
        'Monitor variance trends for early identification of budget issues'
      ]
    };
  }

  private async generateVarianceAnalysisReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for variance analysis report
    return {
      reportType: 'VARIANCE_ANALYSIS',
      generatedDate: new Date(),
      // ... detailed variance analysis
    };
  }

  private async generateForecastAccuracyReport(organizationId: string, filters: any): Promise<any> {
    const forecastAnalysis = await this.getForecastAnalysis(organizationId, filters.timeframe);
    
    return {
      reportType: 'FORECAST_ACCURACY',
      generatedDate: new Date(),
      analysis: forecastAnalysis,
      recommendations: [
        'Continue using methods with highest accuracy rates',
        'Improve data quality for better forecast precision',
        'Consider ensemble forecasting for critical projections'
      ]
    };
  }

  private async generateCashFlowProjectionReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for cash flow projection report
    return {
      reportType: 'CASH_FLOW_PROJECTION',
      generatedDate: new Date(),
      // ... detailed cash flow projections
    };
  }
}