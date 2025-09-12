import { prisma } from '../../config/database';
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
  budgetsByProperty: { [key: string]: number };
  variance: {
    totalVariance: number;
    variancePercentage: number;
  };
}

/**
 * Budget and Forecast Service - Handles budget creation, forecasting, and analysis
 * 
 * This service manages:
 * - Budget creation and management
 * - Financial forecasting and predictions
 * - Variance analysis
 * - Budget approval workflows
 * - Performance tracking
 */
export class BudgetForecastService {
  /**
   * Create a new budget
   */
  async createBudget(data: BudgetCreationData): Promise<any> {
    try {
      logger.info('Creating budget', { 
        organizationId: data.organizationId, 
        budgetName: data.budgetName,
        budgetType: data.budgetType
      });

      const budget = await prisma.budget.create({
        data: {
          organizationId: data.organizationId,
          propertyId: data.propertyId,
          budgetName: data.budgetName,
          budgetType: data.budgetType,
          budgetPeriod: data.budgetPeriod,
          fiscalYear: data.fiscalYear,
          effectiveFrom: data.effectiveFrom,
          effectiveTo: data.effectiveTo,
          assumptions: data.assumptions,
          status: 'DRAFT',
          totalAmount: data.lineItems.reduce((sum, item) => sum + item.annualAmount, 0),
          lineItems: {
            create: data.lineItems.map((item, index) => ({
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
            }))
          }
        },
        include: {
          lineItems: true,
          property: true
        }
      });

      logger.info('Budget created successfully', { budgetId: budget.id });
      return budget;
    } catch (error: unknown) {
      logger.error('Failed to create budget', error);
      throw error;
    }
  }

  /**
   * Create financial forecast
   */
  async createForecast(data: ForecastCreationData): Promise<any> {
    try {
      logger.info('Creating forecast', { 
        forecastName: data.forecastName,
        forecastType: data.forecastType,
        forecastMethod: data.forecastMethod
      });

      const forecast = await prisma.forecast.create({
        data: {
          budgetId: data.budgetId,
          forecastName: data.forecastName,
          forecastType: data.forecastType,
          forecastPeriod: data.forecastPeriod,
          forecastAmount: data.forecastAmount,
          confidence: data.confidence || 0.8,
          budgetAmount: data.budgetAmount,
          forecastMethod: data.forecastMethod,
          dataPoints: data.dataPoints,
          assumptions: data.assumptions,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          status: 'ACTIVE',
          createdAt: new Date()
        }
      });

      logger.info('Forecast created successfully', { forecastId: forecast.id });
      return forecast;
    } catch (error: unknown) {
      logger.error('Failed to create forecast', error);
      throw error;
    }
  }

  /**
   * Get budget summary for organization
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
          lineItems: true,
          property: true
        }
      });

      const totalBudgetAmount = budgets.reduce((sum, budget) => sum + (budget.totalAmount || 0), 0);
      const approvedBudgets = budgets.filter(b => b.status === 'APPROVED').length;
      const pendingApprovals = budgets.filter(b => b.status === 'PENDING_APPROVAL').length;

      const budgetsByType = budgets.reduce((acc, budget) => {
        acc[budget.budgetType] = (acc[budget.budgetType] || 0) + (budget.totalAmount || 0);
        return acc;
      }, {} as { [key: string]: number });

      const budgetsByProperty = budgets.reduce((acc, budget) => {
        if (budget.propertyId) {
          const propertyKey = budget.property?.name || budget.propertyId;
          acc[propertyKey] = (acc[propertyKey] || 0) + (budget.totalAmount || 0);
        }
        return acc;
      }, {} as { [key: string]: number });

      // Calculate variance (simplified - would need actual vs budget comparison)
      const variance = {
        totalVariance: 0,
        variancePercentage: 0
      };

      return {
        totalBudgets: budgets.length,
        totalBudgetAmount,
        approvedBudgets,
        pendingApprovals,
        budgetsByType,
        budgetsByProperty,
        variance
      };
    } catch (error: unknown) {
      logger.error('Failed to get budget summary', error);
      throw error;
    }
  }

  /**
   * Analyze budget variance
   */
  async analyzeBudgetVariance(budgetId: string, actualData: any[]): Promise<any> {
    try {
      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: { lineItems: true }
      });

      if (!budget) {
        throw new Error('Budget not found');
      }

      const varianceAnalysis = budget.lineItems.map(lineItem => {
        const actual = actualData.find(a => a.category === lineItem.category) || { amount: 0 };
        const variance = actual.amount - lineItem.annualAmount;
        const variancePercentage = lineItem.annualAmount > 0 ? (variance / lineItem.annualAmount) * 100 : 0;

        return {
          lineItemId: lineItem.id,
          category: lineItem.category,
          budgetAmount: lineItem.annualAmount,
          actualAmount: actual.amount,
          variance,
          variancePercentage,
          status: Math.abs(variancePercentage) > 10 ? 'SIGNIFICANT' : 'NORMAL'
        };
      });

      return {
        budgetId,
        analysisDate: new Date(),
        totalBudget: budget.totalAmount,
        totalActual: actualData.reduce((sum, item) => sum + item.amount, 0),
        totalVariance: varianceAnalysis.reduce((sum, item) => sum + item.variance, 0),
        lineItemVariances: varianceAnalysis
      };
    } catch (error: unknown) {
      logger.error('Failed to analyze budget variance', error);
      throw error;
    }
  }
}