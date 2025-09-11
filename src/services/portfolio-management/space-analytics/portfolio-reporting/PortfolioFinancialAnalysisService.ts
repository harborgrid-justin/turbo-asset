import { prisma } from '../../../../config/database';
import { logger } from '../../../../config/logger';

/**
 * Portfolio Financial Analysis Service - Financial metrics and analysis for portfolio management
 * Handles revenue tracking, cost analysis, ROI calculations, and financial forecasting
 * Part of the Portfolio Management domain within Turbo Asset IWMS
 */
export class PortfolioFinancialAnalysisService {

  /**
   * Get comprehensive financial metrics for portfolio
   */
  async getFinancialMetrics(query: PortfolioQuery): Promise<FinancialMetrics> {
    try {
      const startTime = Date.now();
      const whereClause = this.buildWhereClause(query);

      // Execute parallel queries for financial data
      const [
        totalValue,
        acquisitionCost,
        operatingCosts,
        revenue,
        depreciationData,
        taxData,
        insuranceData,
        maintenanceCosts
      ] = await Promise.all([
        this.calculateTotalValue(whereClause),
        this.calculateAcquisitionCost(whereClause),
        this.calculateOperatingCosts(query.organizationId, query.startDate, query.endDate),
        this.calculateRevenue(query.organizationId, query.startDate, query.endDate),
        this.getDepreciationData(whereClause),
        this.getTaxData(query.organizationId, query.startDate, query.endDate),
        this.getInsuranceData(query.organizationId, query.startDate, query.endDate),
        this.getMaintenanceCosts(query.organizationId, query.startDate, query.endDate)
      ]);

      // Calculate derived metrics
      const netOperatingIncome = revenue - operatingCosts;
      const appreciationValue = totalValue - acquisitionCost;
      const totalArea = await this.getTotalArea(whereClause);
      const costPerSqFt = totalArea > 0 ? operatingCosts / totalArea : 0;
      const revenuePerSqFt = totalArea > 0 ? revenue / totalArea : 0;
      const netIncomePerSqFt = totalArea > 0 ? netOperatingIncome / totalArea : 0;
      const capRate = totalValue > 0 ? (netOperatingIncome / totalValue) * 100 : 0;
      const cashOnCashReturn = acquisitionCost > 0 ? (netOperatingIncome / acquisitionCost) * 100 : 0;

      const metrics: FinancialMetrics = {
        totalValue,
        acquisitionCost,
        appreciationValue,
        operatingCosts,
        revenue,
        netOperatingIncome,
        costPerSqFt: Math.round(costPerSqFt * 100) / 100,
        revenuePerSqFt: Math.round(revenuePerSqFt * 100) / 100,
        netIncomePerSqFt: Math.round(netIncomePerSqFt * 100) / 100,
        capRate: Math.round(capRate * 100) / 100,
        cashOnCashReturn: Math.round(cashOnCashReturn * 100) / 100,
        grossMargin: revenue > 0 ? ((revenue - operatingCosts) / revenue) * 100 : 0,
        totalDepreciation: depreciationData.totalDepreciation,
        annualDepreciation: depreciationData.annualDepreciation,
        taxExpenses: taxData.totalTaxes,
        insuranceExpenses: insuranceData.totalInsurance,
        maintenanceExpenses: maintenanceCosts,
        executionTimeMs: Date.now() - startTime,
      };

      logger.info('Financial metrics calculated', {
        organizationId: query.organizationId,
        totalValue,
        netOperatingIncome,
        capRate: metrics.capRate,
        executionTimeMs: metrics.executionTimeMs,
      });

      return metrics;

    } catch (error) {
      logger.error('Failed to calculate financial metrics', {
        query,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get detailed cost breakdown analysis
   */
  async getCostBreakdown(query: PortfolioQuery): Promise<CostBreakdown[]> {
    try {
      const [
        utilityCosts,
        maintenanceCosts,
        securityCosts,
        cleaningCosts,
        insuranceCosts,
        taxCosts,
        managementCosts,
        capitalExpenses
      ] = await Promise.all([
        this.getUtilityCosts(query),
        this.getMaintenanceCostsByCategory(query),
        this.getSecurityCosts(query),
        this.getCleaningCosts(query),
        this.getInsuranceCostsByProperty(query),
        this.getTaxCostsByProperty(query),
        this.getManagementCosts(query),
        this.getCapitalExpenses(query)
      ]);

      const breakdown: CostBreakdown[] = [
        {
          category: 'Utilities',
          amount: utilityCosts.total,
          percentage: 0, // Will be calculated later
          subcategories: utilityCosts.breakdown,
          trend: utilityCosts.trend,
          variance: utilityCosts.variance,
        },
        {
          category: 'Maintenance',
          amount: maintenanceCosts.total,
          percentage: 0,
          subcategories: maintenanceCosts.breakdown,
          trend: maintenanceCosts.trend,
          variance: maintenanceCosts.variance,
        },
        {
          category: 'Security',
          amount: securityCosts.total,
          percentage: 0,
          subcategories: securityCosts.breakdown,
          trend: securityCosts.trend,
          variance: securityCosts.variance,
        },
        {
          category: 'Cleaning',
          amount: cleaningCosts.total,
          percentage: 0,
          subcategories: cleaningCosts.breakdown,
          trend: cleaningCosts.trend,
          variance: cleaningCosts.variance,
        },
        {
          category: 'Insurance',
          amount: insuranceCosts.total,
          percentage: 0,
          subcategories: insuranceCosts.breakdown,
          trend: insuranceCosts.trend,
          variance: insuranceCosts.variance,
        },
        {
          category: 'Taxes',
          amount: taxCosts.total,
          percentage: 0,
          subcategories: taxCosts.breakdown,
          trend: taxCosts.trend,
          variance: taxCosts.variance,
        },
        {
          category: 'Management',
          amount: managementCosts.total,
          percentage: 0,
          subcategories: managementCosts.breakdown,
          trend: managementCosts.trend,
          variance: managementCosts.variance,
        },
        {
          category: 'Capital Expenses',
          amount: capitalExpenses.total,
          percentage: 0,
          subcategories: capitalExpenses.breakdown,
          trend: capitalExpenses.trend,
          variance: capitalExpenses.variance,
        }
      ];

      // Calculate percentages
      const totalCosts = breakdown.reduce((sum, item) => sum + item.amount, 0);
      breakdown.forEach(item => {
        item.percentage = totalCosts > 0 ? (item.amount / totalCosts) * 100 : 0;
      });

      return breakdown;

    } catch (error) {
      logger.error('Failed to get cost breakdown', {
        query,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get revenue analysis and trends
   */
  async getRevenueAnalysis(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueAnalysis> {
    try {
      const [
        rentalRevenue,
        serviceRevenue,
        parkingRevenue,
        otherRevenue,
        revenueTrends,
        revenueByProperty,
        revenueByTenant
      ] = await Promise.all([
        this.getRentalRevenue(organizationId, startDate, endDate),
        this.getServiceRevenue(organizationId, startDate, endDate),
        this.getParkingRevenue(organizationId, startDate, endDate),
        this.getOtherRevenue(organizationId, startDate, endDate),
        this.getRevenueTrends(organizationId, startDate, endDate),
        this.getRevenueByProperty(organizationId, startDate, endDate),
        this.getRevenueByTenant(organizationId, startDate, endDate)
      ]);

      const totalRevenue = rentalRevenue + serviceRevenue + parkingRevenue + otherRevenue;

      const analysis: RevenueAnalysis = {
        totalRevenue,
        rentalRevenue,
        serviceRevenue,
        parkingRevenue,
        otherRevenue,
        revenueBreakdown: {
          rental: { amount: rentalRevenue, percentage: (rentalRevenue / totalRevenue) * 100 },
          service: { amount: serviceRevenue, percentage: (serviceRevenue / totalRevenue) * 100 },
          parking: { amount: parkingRevenue, percentage: (parkingRevenue / totalRevenue) * 100 },
          other: { amount: otherRevenue, percentage: (otherRevenue / totalRevenue) * 100 },
        },
        monthlyTrends: revenueTrends,
        revenueByProperty,
        revenueByTenant,
        averageRevenuePerProperty: revenueByProperty.length > 0 ? totalRevenue / revenueByProperty.length : 0,
        averageRevenuePerTenant: revenueByTenant.length > 0 ? totalRevenue / revenueByTenant.length : 0,
        revenueGrowthRate: await this.calculateRevenueGrowthRate(organizationId, startDate, endDate),
      };

      return analysis;

    } catch (error) {
      logger.error('Failed to get revenue analysis', {
        organizationId,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get return on investment analysis
   */
  async getROIAnalysis(organizationId: string): Promise<ROIAnalysis> {
    try {
      const properties = await prisma.property.findMany({
        where: { organizationId },
        include: {
          transactions: true,
          leases: {
            where: { status: 'ACTIVE' }
          }
        }
      });

      const roiData = await Promise.all(
        properties.map(async (property) => {
          const acquisitionCost = this.getPropertyAcquisitionCost(property);
          const currentValue = property.currentValue || property.purchasePrice || 0;
          const annualRevenue = await this.getPropertyAnnualRevenue(property.id);
          const annualExpenses = await this.getPropertyAnnualExpenses(property.id);
          const netIncome = annualRevenue - annualExpenses;
          
          const totalReturn = (currentValue + netIncome) - acquisitionCost;
          const roiPercentage = acquisitionCost > 0 ? (totalReturn / acquisitionCost) * 100 : 0;
          const capRate = currentValue > 0 ? (netIncome / currentValue) * 100 : 0;
          const cashOnCashReturn = acquisitionCost > 0 ? (netIncome / acquisitionCost) * 100 : 0;

          return {
            propertyId: property.id,
            propertyName: property.name,
            acquisitionCost,
            currentValue,
            annualRevenue,
            annualExpenses,
            netIncome,
            totalReturn,
            roiPercentage,
            capRate,
            cashOnCashReturn,
            yearsSinceAcquisition: this.calculateYearsSinceAcquisition(property.purchaseDate),
            annualizedROI: this.calculateAnnualizedROI(roiPercentage, property.purchaseDate),
          };
        })
      );

      const analysis: ROIAnalysis = {
        properties: roiData,
        portfolioSummary: {
          totalAcquisitionCost: roiData.reduce((sum, p) => sum + p.acquisitionCost, 0),
          totalCurrentValue: roiData.reduce((sum, p) => sum + p.currentValue, 0),
          totalAnnualRevenue: roiData.reduce((sum, p) => sum + p.annualRevenue, 0),
          totalAnnualExpenses: roiData.reduce((sum, p) => sum + p.annualExpenses, 0),
          totalNetIncome: roiData.reduce((sum, p) => sum + p.netIncome, 0),
          averageROI: roiData.length > 0 ? roiData.reduce((sum, p) => sum + p.roiPercentage, 0) / roiData.length : 0,
          averageCapRate: roiData.length > 0 ? roiData.reduce((sum, p) => sum + p.capRate, 0) / roiData.length : 0,
          averageCashOnCashReturn: roiData.length > 0 ? roiData.reduce((sum, p) => sum + p.cashOnCashReturn, 0) / roiData.length : 0,
        },
        topPerformers: roiData.sort((a, b) => b.roiPercentage - a.roiPercentage).slice(0, 5),
        underPerformers: roiData.sort((a, b) => a.roiPercentage - b.roiPercentage).slice(0, 5),
      };

      return analysis;

    } catch (error) {
      logger.error('Failed to get ROI analysis', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get financial forecasting data
   */
  async getFinancialForecast(
    organizationId: string,
    forecastPeriodMonths: number = 12
  ): Promise<FinancialForecast> {
    try {
      const historicalData = await this.getHistoricalFinancialData(organizationId, 24); // 2 years
      const currentMetrics = await this.getCurrentFinancialMetrics(organizationId);
      
      // Generate monthly forecasts
      const monthlyForecasts = [];
      for (let i = 1; i <= forecastPeriodMonths; i++) {
        const forecastDate = new Date();
        forecastDate.setMonth(forecastDate.getMonth() + i);
        
        const forecast = await this.calculateMonthlyForecast(
          organizationId,
          forecastDate,
          historicalData,
          currentMetrics
        );
        
        monthlyForecasts.push({
          month: forecastDate.toISOString().substring(0, 7),
          revenue: forecast.revenue,
          expenses: forecast.expenses,
          netIncome: forecast.netIncome,
          occupancyRate: forecast.occupancyRate,
          confidence: forecast.confidence,
        });
      }

      // Calculate scenario forecasts
      const scenarios = await this.calculateScenarioForecasts(organizationId, monthlyForecasts);

      const forecast: FinancialForecast = {
        organizationId,
        forecastPeriodMonths,
        generatedAt: new Date(),
        monthlyForecasts,
        scenarios,
        assumptions: {
          occupancyGrowthRate: 2, // 2% annual growth
          rentGrowthRate: 3, // 3% annual growth
          expenseInflationRate: 2.5, // 2.5% annual inflation
          marketConcitions: 'stable',
        },
        riskFactors: await this.identifyFinancialRiskFactors(organizationId),
        recommendations: await this.generateFinancialRecommendations(organizationId, monthlyForecasts),
      };

      return forecast;

    } catch (error) {
      logger.error('Failed to get financial forecast', {
        organizationId,
        forecastPeriodMonths,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get budget variance analysis
   */
  async getBudgetVarianceAnalysis(
    organizationId: string,
    budgetPeriod: string,
    actualStartDate: Date,
    actualEndDate: Date
  ): Promise<BudgetVarianceAnalysis> {
    try {
      // Get budget data
      const budget = await prisma.budget.findFirst({
        where: {
          organizationId,
          period: budgetPeriod,
          status: 'APPROVED'
        },
        include: {
          lineItems: true,
        }
      });

      if (!budget) {
        throw new Error(`No approved budget found for period ${budgetPeriod}`);
      }

      // Get actual financial data
      const actualData = await this.getActualFinancialData(
        organizationId,
        actualStartDate,
        actualEndDate
      );

      // Calculate variances
      const variances = budget.lineItems.map(item => {
        const actualAmount = actualData[item.category] || 0;
        const budgetAmount = item.amount;
        const variance = actualAmount - budgetAmount;
        const variancePercentage = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;

        return {
          category: item.category,
          budgetAmount,
          actualAmount,
          variance,
          variancePercentage,
          status: Math.abs(variancePercentage) > 10 ? 'SIGNIFICANT' : 'NORMAL',
          explanation: this.generateVarianceExplanation(item.category, variancePercentage),
        };
      });

      const analysis: BudgetVarianceAnalysis = {
        budgetPeriod,
        analyzedPeriod: {
          start: actualStartDate,
          end: actualEndDate,
        },
        totalBudgeted: budget.totalAmount,
        totalActual: Object.values(actualData).reduce((sum, amount) => sum + amount, 0),
        totalVariance: 0, // Calculated below
        totalVariancePercentage: 0, // Calculated below
        variances,
        significantVariances: variances.filter(v => v.status === 'SIGNIFICANT'),
        summary: {
          categoriesOverBudget: variances.filter(v => v.variance > 0).length,
          categoriesUnderBudget: variances.filter(v => v.variance < 0).length,
          largestPositiveVariance: Math.max(...variances.map(v => v.variance)),
          largestNegativeVariance: Math.min(...variances.map(v => v.variance)),
        },
      };

      // Calculate totals
      analysis.totalVariance = analysis.totalActual - analysis.totalBudgeted;
      analysis.totalVariancePercentage = analysis.totalBudgeted > 0 
        ? (analysis.totalVariance / analysis.totalBudgeted) * 100 
        : 0;

      return analysis;

    } catch (error) {
      logger.error('Failed to get budget variance analysis', {
        organizationId,
        budgetPeriod,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private buildWhereClause(query: PortfolioQuery): any {
    return {
      organizationId: query.organizationId,
      ...(query.propertyIds && { id: { in: query.propertyIds } }),
      ...(query.buildingIds && { buildings: { some: { id: { in: query.buildingIds } } } }),
    };
  }

  private async calculateTotalValue(whereClause: any): Promise<number> {
    const result = await prisma.property.aggregate({
      where: whereClause,
      _sum: { currentValue: true }
    });
    return result._sum.currentValue || 0;
  }

  private async calculateAcquisitionCost(whereClause: any): Promise<number> {
    const result = await prisma.property.aggregate({
      where: whereClause,
      _sum: { purchasePrice: true }
    });
    return result._sum.purchasePrice || 0;
  }

  private async calculateOperatingCosts(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const currentYear = new Date().getFullYear();
    const start = startDate || new Date(currentYear, 0, 1);
    const end = endDate || new Date(currentYear, 11, 31);

    const result = await prisma.expense.aggregate({
      where: {
        organizationId,
        date: {
          gte: start,
          lte: end,
        },
        category: {
          in: ['UTILITIES', 'MAINTENANCE', 'SECURITY', 'CLEANING', 'INSURANCE', 'TAXES', 'MANAGEMENT']
        }
      },
      _sum: { amount: true }
    });

    return result._sum.amount || 0;
  }

  private async calculateRevenue(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const currentYear = new Date().getFullYear();
    const start = startDate || new Date(currentYear, 0, 1);
    const end = endDate || new Date(currentYear, 11, 31);

    const result = await prisma.revenue.aggregate({
      where: {
        organizationId,
        date: {
          gte: start,
          lte: end,
        }
      },
      _sum: { amount: true }
    });

    return result._sum.amount || 0;
  }

  private async getDepreciationData(whereClause: any): Promise<any> {
    // Implementation for depreciation data
    return { totalDepreciation: 0, annualDepreciation: 0 };
  }

  private async getTaxData(organizationId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Implementation for tax data
    return { totalTaxes: 0 };
  }

  private async getInsuranceData(organizationId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Implementation for insurance data
    return { totalInsurance: 0 };
  }

  private async getMaintenanceCosts(organizationId: string, startDate?: Date, endDate?: Date): Promise<number> {
    // Implementation for maintenance costs
    return 0;
  }

  private async getTotalArea(whereClause: any): Promise<number> {
    const result = await prisma.property.aggregate({
      where: whereClause,
      _sum: { totalArea: true }
    });
    return result._sum.totalArea || 0;
  }

  private async getUtilityCosts(query: PortfolioQuery): Promise<any> {
    // Implementation for utility costs
    return { total: 0, breakdown: [], trend: 'stable', variance: 0 };
  }

  private async getMaintenanceCostsByCategory(query: PortfolioQuery): Promise<any> {
    // Implementation for maintenance costs by category
    return { total: 0, breakdown: [], trend: 'stable', variance: 0 };
  }

  private async getSecurityCosts(query: PortfolioQuery): Promise<any> {
    // Implementation for security costs
    return { total: 0, breakdown: [], trend: 'stable', variance: 0 };
  }

  private async getCleaningCosts(query: PortfolioQuery): Promise<any> {
    // Implementation for cleaning costs
    return { total: 0, breakdown: [], trend: 'stable', variance: 0 };
  }

  private async getInsuranceCostsByProperty(query: PortfolioQuery): Promise<any> {
    // Implementation for insurance costs by property
    return { total: 0, breakdown: [], trend: 'stable', variance: 0 };
  }

  private async getTaxCostsByProperty(query: PortfolioQuery): Promise<any> {
    // Implementation for tax costs by property
    return { total: 0, breakdown: [], trend: 'stable', variance: 0 };
  }

  private async getManagementCosts(query: PortfolioQuery): Promise<any> {
    // Implementation for management costs
    return { total: 0, breakdown: [], trend: 'stable', variance: 0 };
  }

  private async getCapitalExpenses(query: PortfolioQuery): Promise<any> {
    // Implementation for capital expenses
    return { total: 0, breakdown: [], trend: 'stable', variance: 0 };
  }

  private async getRentalRevenue(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    // Implementation for rental revenue
    return 0;
  }

  private async getServiceRevenue(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    // Implementation for service revenue
    return 0;
  }

  private async getParkingRevenue(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    // Implementation for parking revenue
    return 0;
  }

  private async getOtherRevenue(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    // Implementation for other revenue
    return 0;
  }

  private async getRevenueTrends(organizationId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for revenue trends
    return [];
  }

  private async getRevenueByProperty(organizationId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for revenue by property
    return [];
  }

  private async getRevenueByTenant(organizationId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for revenue by tenant
    return [];
  }

  private async calculateRevenueGrowthRate(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    // Implementation for revenue growth rate calculation
    return 0;
  }

  private getPropertyAcquisitionCost(property: any): number {
    return property.purchasePrice || 0;
  }

  private async getPropertyAnnualRevenue(propertyId: string): Promise<number> {
    // Implementation for property annual revenue
    return 0;
  }

  private async getPropertyAnnualExpenses(propertyId: string): Promise<number> {
    // Implementation for property annual expenses
    return 0;
  }

  private calculateYearsSinceAcquisition(purchaseDate: Date | null): number {
    if (!purchaseDate) {return 0;}
    const now = new Date();
    const diff = now.getTime() - purchaseDate.getTime();
    return diff / (1000 * 60 * 60 * 24 * 365.25);
  }

  private calculateAnnualizedROI(roiPercentage: number, purchaseDate: Date | null): number {
    const years = this.calculateYearsSinceAcquisition(purchaseDate);
    return years > 0 ? roiPercentage / years : 0;
  }

  private async getHistoricalFinancialData(organizationId: string, months: number): Promise<any> {
    // Implementation for historical financial data
    return {};
  }

  private async getCurrentFinancialMetrics(organizationId: string): Promise<any> {
    // Implementation for current financial metrics
    return {};
  }

  private async calculateMonthlyForecast(
    organizationId: string,
    forecastDate: Date,
    historicalData: any,
    currentMetrics: any
  ): Promise<any> {
    // Implementation for monthly forecast calculation
    return { revenue: 0, expenses: 0, netIncome: 0, occupancyRate: 0, confidence: 0.8 };
  }

  private async calculateScenarioForecasts(organizationId: string, monthlyForecasts: any[]): Promise<any> {
    // Implementation for scenario forecasts
    return {};
  }

  private async identifyFinancialRiskFactors(organizationId: string): Promise<string[]> {
    // Implementation for identifying financial risk factors
    return [];
  }

  private async generateFinancialRecommendations(organizationId: string, monthlyForecasts: any[]): Promise<string[]> {
    // Implementation for generating financial recommendations
    return [];
  }

  private async getActualFinancialData(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ [category: string]: number }> {
    // Implementation for actual financial data
    return {};
  }

  private generateVarianceExplanation(category: string, variancePercentage: number): string {
    if (Math.abs(variancePercentage) < 5) {
      return 'Within expected range';
    } else if (variancePercentage > 0) {
      return `${variancePercentage.toFixed(1)}% over budget`;
    } else {
      return `${Math.abs(variancePercentage).toFixed(1)}% under budget`;
    }
  }
}

// Type definitions for this service
interface PortfolioQuery {
  organizationId: string;
  includeInactive?: boolean;
  propertyIds?: string[];
  buildingIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

interface FinancialMetrics {
  totalValue: number;
  acquisitionCost: number;
  appreciationValue: number;
  operatingCosts: number;
  revenue: number;
  netOperatingIncome: number;
  costPerSqFt: number;
  revenuePerSqFt: number;
  netIncomePerSqFt: number;
  capRate: number;
  cashOnCashReturn: number;
  grossMargin: number;
  totalDepreciation: number;
  annualDepreciation: number;
  taxExpenses: number;
  insuranceExpenses: number;
  maintenanceExpenses: number;
  executionTimeMs: number;
}

interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  subcategories: any[];
  trend: 'up' | 'down' | 'stable';
  variance: number;
}

interface RevenueAnalysis {
  totalRevenue: number;
  rentalRevenue: number;
  serviceRevenue: number;
  parkingRevenue: number;
  otherRevenue: number;
  revenueBreakdown: {
    rental: { amount: number; percentage: number };
    service: { amount: number; percentage: number };
    parking: { amount: number; percentage: number };
    other: { amount: number; percentage: number };
  };
  monthlyTrends: any[];
  revenueByProperty: any[];
  revenueByTenant: any[];
  averageRevenuePerProperty: number;
  averageRevenuePerTenant: number;
  revenueGrowthRate: number;
}

interface ROIAnalysis {
  properties: PropertyROI[];
  portfolioSummary: {
    totalAcquisitionCost: number;
    totalCurrentValue: number;
    totalAnnualRevenue: number;
    totalAnnualExpenses: number;
    totalNetIncome: number;
    averageROI: number;
    averageCapRate: number;
    averageCashOnCashReturn: number;
  };
  topPerformers: PropertyROI[];
  underPerformers: PropertyROI[];
}

interface PropertyROI {
  propertyId: string;
  propertyName: string;
  acquisitionCost: number;
  currentValue: number;
  annualRevenue: number;
  annualExpenses: number;
  netIncome: number;
  totalReturn: number;
  roiPercentage: number;
  capRate: number;
  cashOnCashReturn: number;
  yearsSinceAcquisition: number;
  annualizedROI: number;
}

interface FinancialForecast {
  organizationId: string;
  forecastPeriodMonths: number;
  generatedAt: Date;
  monthlyForecasts: MonthlyForecast[];
  scenarios: any;
  assumptions: {
    occupancyGrowthRate: number;
    rentGrowthRate: number;
    expenseInflationRate: number;
    marketConcitions: string;
  };
  riskFactors: string[];
  recommendations: string[];
}

interface MonthlyForecast {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  occupancyRate: number;
  confidence: number;
}

interface BudgetVarianceAnalysis {
  budgetPeriod: string;
  analyzedPeriod: {
    start: Date;
    end: Date;
  };
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercentage: number;
  variances: BudgetVariance[];
  significantVariances: BudgetVariance[];
  summary: {
    categoriesOverBudget: number;
    categoriesUnderBudget: number;
    largestPositiveVariance: number;
    largestNegativeVariance: number;
  };
}

interface BudgetVariance {
  category: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  status: 'SIGNIFICANT' | 'NORMAL';
  explanation: string;
}