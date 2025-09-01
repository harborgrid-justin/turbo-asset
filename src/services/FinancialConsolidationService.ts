import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface ConsolidationRuleData {
  ruleName: string;
  ruleType: 'AGGREGATION' | 'ELIMINATION' | 'ADJUSTMENT' | 'MAPPING' | 'CALCULATION';
  sourceEntities: string[]; // Entity IDs to consolidate from
  targetEntity: string; // Target entity ID
  mappingRules: any; // Account mapping rules
  calculationMethod: string; // SUM, AVERAGE, WEIGHTED_AVERAGE, etc.
  weights?: any; // Weighting factors if applicable
  adjustments?: any; // Consolidation adjustments
  intercompanyEliminations?: any; // Intercompany eliminations
  effectiveDate: Date;
  expiryDate?: Date;
}

export interface FinancialStatementData {
  statementType: 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW' | 'BUDGET_VARIANCE' | 'CONSOLIDATED';
  period: string; // YYYY-MM or YYYY-QQ format
  fiscalYear: number;
  fiscalPeriod: number;
  consolidationLevel: 'PROPERTY' | 'BUILDING' | 'PORTFOLIO' | 'REGIONAL' | 'GLOBAL';
  entityId: string; // Property, building, or organization ID
  entityType: string; // property, building, organization
  lineItems: Array<{
    lineNumber: number;
    accountCode: string;
    accountName: string;
    lineType: 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';
    budgetAmount?: number;
    actualAmount: number;
    priorYearAmount?: number;
    category: string;
    subCategory?: string;
    glAccount?: string;
    costCenter?: string;
    department?: string;
    notes?: string;
  }>;
  preparedBy?: string;
  notes?: string;
}

export interface ConsolidationSummary {
  totalStatements: number;
  statementsByType: { [key: string]: number };
  statementsByLevel: { [key: string]: number };
  consolidationMetrics: {
    totalRevenue: number;
    totalExpenses: number;
    netOperatingIncome: number;
    totalAssets: number;
    totalLiabilities: number;
    equity: number;
  };
  consolidationRules: number;
  activeRules: number;
  entityBreakdown: Array<{
    entityId: string;
    entityName: string;
    entityType: string;
    statementCount: number;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  }>;
  periodComparison: {
    currentPeriod: any;
    priorPeriod: any;
    variance: any;
    variancePercent: any;
  };
}

export interface ConsolidationAnalysis {
  entityId: string;
  entityName: string;
  entityType: string;
  consolidationLevel: string;
  contributionAnalysis: {
    revenueContribution: number;
    expenseContribution: number;
    netIncomeContribution: number;
    percentOfTotal: number;
  };
  performanceMetrics: {
    profitMargin: number;
    operatingMargin: number;
    costRatio: number;
    revenuePerSqFt?: number;
    expensePerSqFt?: number;
  };
  trends: {
    revenueGrowth: number;
    expenseGrowth: number;
    marginTrend: number;
  };
  benchmarks: {
    industryBenchmark?: number;
    peerComparison?: number;
    internalBenchmark?: number;
  };
}

export interface GlobalConsolidationReport {
  reportingPeriod: string;
  consolidationHierarchy: Array<{
    level: string;
    entities: Array<{
      entityId: string;
      entityName: string;
      revenue: number;
      expenses: number;
      netIncome: number;
      assets?: number;
      liabilities?: number;
    }>;
    totalRevenue: number;
    totalExpenses: number;
    totalNetIncome: number;
  }>;
  intercompanyEliminations: Array<{
    description: string;
    amount: number;
    entities: string[];
  }>;
  consolidationAdjustments: Array<{
    description: string;
    amount: number;
    justification: string;
  }>;
  keyMetrics: {
    totalConsolidatedRevenue: number;
    totalConsolidatedExpenses: number;
    consolidatedNetIncome: number;
    profitMargin: number;
    operatingMargin: number;
  };
  varianceAnalysis: Array<{
    category: string;
    budgetAmount: number;
    actualAmount: number;
    variance: number;
    variancePercent: number;
    explanation: string;
  }>;
}

/**
 * FinancialConsolidationService handles financial consolidation and reporting across global entities
 * Provides comprehensive financial statement consolidation and multi-entity reporting
 */
export class FinancialConsolidationService {

  /**
   * Create financial statement record
   */
  async createFinancialStatement(data: FinancialStatementData): Promise<any> {
    try {
      // Calculate totals from line items
      const revenue = data.lineItems
        .filter(item => item.lineType === 'REVENUE')
        .reduce((sum, item) => sum + item.actualAmount, 0);
      
      const operatingExpenses = data.lineItems
        .filter(item => item.lineType === 'EXPENSE' && item.category === 'OPERATING')
        .reduce((sum, item) => sum + item.actualAmount, 0);
      
      const netOperatingIncome = revenue - operatingExpenses;
      
      const totalExpenses = data.lineItems
        .filter(item => item.lineType === 'EXPENSE')
        .reduce((sum, item) => sum + item.actualAmount, 0);
      
      const netIncome = revenue - totalExpenses;
      
      const assets = data.lineItems
        .filter(item => item.lineType === 'ASSET')
        .reduce((sum, item) => sum + item.actualAmount, 0);
      
      const liabilities = data.lineItems
        .filter(item => item.lineType === 'LIABILITY')
        .reduce((sum, item) => sum + item.actualAmount, 0);
      
      const equity = data.lineItems
        .filter(item => item.lineType === 'EQUITY')
        .reduce((sum, item) => sum + item.actualAmount, 0);

      // Create financial statement
      const statement = await prisma.financialStatement.create({
        data: {
          organizationId: data.entityType === 'organization' ? data.entityId : 'default-org-id',
          statementType: data.statementType,
          period: data.period,
          fiscalYear: data.fiscalYear,
          fiscalPeriod: data.fiscalPeriod,
          consolidationLevel: data.consolidationLevel,
          entityId: data.entityId,
          entityType: data.entityType,
          revenue,
          operatingExpenses,
          netOperatingIncome,
          netIncome,
          assets: assets || null,
          liabilities: liabilities || null,
          equity: equity || null,
          status: 'DRAFT',
          preparedBy: data.preparedBy,
          preparedAt: new Date(),
          version: '1.0',
          isConsolidated: data.consolidationLevel !== 'PROPERTY'
        }
      });

      // Create line items
      const lineItemPromises = data.lineItems.map((item, index) => {
        const variance = item.budgetAmount ? item.actualAmount - item.budgetAmount : null;
        const variancePercent = item.budgetAmount && item.budgetAmount !== 0 ? 
          (variance! / item.budgetAmount) * 100 : null;

        return prisma.financialLineItem.create({
          data: {
            statementId: statement.id,
            lineNumber: item.lineNumber || index + 1,
            accountCode: item.accountCode,
            accountName: item.accountName,
            lineType: item.lineType,
            budgetAmount: item.budgetAmount,
            actualAmount: item.actualAmount,
            priorYearAmount: item.priorYearAmount,
            variance,
            variancePercent,
            category: item.category,
            subCategory: item.subCategory,
            glAccount: item.glAccount,
            costCenter: item.costCenter,
            department: item.department,
            notes: item.notes
          }
        });
      });

      await Promise.all(lineItemPromises);

      logger.info('Financial statement created', {
        statementId: statement.id,
        statementType: data.statementType,
        period: data.period,
        revenue,
        netIncome,
        lineItemCount: data.lineItems.length
      });

      return statement;
    } catch (error) {
      logger.error('Failed to create financial statement', error);
      throw error;
    }
  }

  /**
   * Create consolidation rule
   */
  async createConsolidationRule(data: ConsolidationRuleData): Promise<any> {
    try {
      // For demonstration, we'll create a placeholder consolidated statement
      // In practice, this would reference an existing statement
      const placeholderStatement = await prisma.financialStatement.create({
        data: {
          organizationId: 'default-org-id',
          statementType: 'CONSOLIDATED',
          period: new Date().toISOString().substring(0, 7),
          fiscalYear: new Date().getFullYear(),
          fiscalPeriod: new Date().getMonth() + 1,
          consolidationLevel: 'GLOBAL',
          entityId: data.targetEntity,
          entityType: 'consolidated',
          revenue: 0,
          operatingExpenses: 0,
          netOperatingIncome: 0,
          netIncome: 0,
          status: 'DRAFT',
          version: '1.0',
          isConsolidated: true
        }
      });

      const rule = await prisma.consolidationRule.create({
        data: {
          statementId: placeholderStatement.id,
          ruleName: data.ruleName,
          ruleType: data.ruleType,
          sourceEntities: data.sourceEntities,
          targetEntity: data.targetEntity,
          mappingRules: data.mappingRules,
          calculationMethod: data.calculationMethod,
          weights: data.weights,
          adjustments: data.adjustments,
          intercompanyEliminations: data.intercompanyEliminations,
          isActive: true,
          effectiveDate: data.effectiveDate,
          expiryDate: data.expiryDate
        }
      });

      logger.info('Consolidation rule created', {
        ruleId: rule.id,
        ruleName: data.ruleName,
        ruleType: data.ruleType,
        sourceEntityCount: data.sourceEntities.length
      });

      return rule;
    } catch (error) {
      logger.error('Failed to create consolidation rule', error);
      throw error;
    }
  }

  /**
   * Perform financial consolidation
   */
  async performConsolidation(
    organizationId: string,
    consolidationLevel: 'PROPERTY' | 'BUILDING' | 'PORTFOLIO' | 'REGIONAL' | 'GLOBAL',
    period: string,
    entityIds?: string[]
  ): Promise<any> {
    try {
      logger.info('Starting financial consolidation', {
        organizationId,
        consolidationLevel,
        period,
        entityCount: entityIds?.length || 'all'
      });

      // Get consolidation rules for this level
      const consolidationRules = await prisma.consolidationRule.findMany({
        where: {
          isActive: true,
          effectiveDate: { lte: new Date() },
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: new Date() } }
          ]
        }
      });

      // Get source financial statements
      const whereClause: any = {
        organizationId,
        period: { startsWith: period.substring(0, 7) }, // Match YYYY-MM
        status: { in: ['APPROVED', 'FINAL'] }
      };

      if (entityIds?.length) {
        whereClause.entityId = { in: entityIds };
      }

      const sourceStatements = await prisma.financialStatement.findMany({
        where: whereClause,
        include: {
          lineItems: true
        }
      });

      if (sourceStatements.length === 0) {
        throw new Error('No source statements found for consolidation');
      }

      // Perform consolidation based on rules
      const consolidatedData = this.consolidateStatements(sourceStatements, consolidationRules);

      // Create consolidated financial statement
      const consolidatedStatement = await this.createFinancialStatement({
        statementType: 'CONSOLIDATED',
        period,
        fiscalYear: parseInt(period.substring(0, 4)),
        fiscalPeriod: parseInt(period.substring(5, 7)),
        consolidationLevel,
        entityId: `consolidated-${consolidationLevel.toLowerCase()}-${Date.now()}`,
        entityType: 'consolidated',
        lineItems: consolidatedData.lineItems,
        preparedBy: 'system'
      });

      // Apply intercompany eliminations
      const eliminations = await this.applyIntercompanyEliminations(
        consolidatedStatement.id,
        sourceStatements,
        consolidationRules
      );

      // Apply consolidation adjustments
      const adjustments = await this.applyConsolidationAdjustments(
        consolidatedStatement.id,
        consolidatedData
      );

      logger.info('Financial consolidation completed', {
        consolidatedStatementId: consolidatedStatement.id,
        sourceStatementCount: sourceStatements.length,
        eliminationCount: eliminations.length,
        adjustmentCount: adjustments.length
      });

      return {
        consolidatedStatement,
        sourceStatements: sourceStatements.length,
        eliminations,
        adjustments,
        summary: {
          totalRevenue: consolidatedData.totals.revenue,
          totalExpenses: consolidatedData.totals.expenses,
          netIncome: consolidatedData.totals.netIncome
        }
      };
    } catch (error) {
      logger.error('Failed to perform consolidation', error);
      throw error;
    }
  }

  /**
   * Get consolidation summary
   */
  async getConsolidationSummary(organizationId: string, period?: string): Promise<ConsolidationSummary> {
    try {
      const whereClause: any = { organizationId };
      if (period) {
        whereClause.period = { startsWith: period.substring(0, 7) };
      }

      const statements = await prisma.financialStatement.findMany({
        where: whereClause,
        include: {
          lineItems: true
        }
      });

      const totalStatements = statements.length;

      // Breakdown by type
      const statementsByType = statements.reduce((acc, statement) => {
        acc[statement.statementType] = (acc[statement.statementType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Breakdown by consolidation level
      const statementsByLevel = statements.reduce((acc, statement) => {
        acc[statement.consolidationLevel] = (acc[statement.consolidationLevel] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Calculate consolidated metrics
      const consolidationMetrics = {
        totalRevenue: statements.reduce((sum, s) => sum + s.revenue, 0),
        totalExpenses: statements.reduce((sum, s) => sum + s.operatingExpenses, 0),
        netOperatingIncome: statements.reduce((sum, s) => sum + s.netOperatingIncome, 0),
        totalAssets: statements.reduce((sum, s) => sum + (s.assets || 0), 0),
        totalLiabilities: statements.reduce((sum, s) => sum + (s.liabilities || 0), 0),
        equity: statements.reduce((sum, s) => sum + (s.equity || 0), 0)
      };

      // Get consolidation rules count
      const consolidationRules = await prisma.consolidationRule.count();
      const activeRules = await prisma.consolidationRule.count({
        where: { isActive: true }
      });

      // Entity breakdown
      const entityMap = new Map<string, {
        entityId: string;
        entityName: string;
        entityType: string;
        statementCount: number;
        totalRevenue: number;
        totalExpenses: number;
        netIncome: number;
      }>();

      statements.forEach(statement => {
        if (!entityMap.has(statement.entityId)) {
          entityMap.set(statement.entityId, {
            entityId: statement.entityId,
            entityName: this.getEntityDisplayName(statement.entityId, statement.entityType),
            entityType: statement.entityType,
            statementCount: 0,
            totalRevenue: 0,
            totalExpenses: 0,
            netIncome: 0
          });
        }
        const entity = entityMap.get(statement.entityId)!;
        entity.statementCount++;
        entity.totalRevenue += statement.revenue;
        entity.totalExpenses += statement.operatingExpenses;
        entity.netIncome += statement.netIncome;
      });

      const entityBreakdown = Array.from(entityMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Period comparison (simplified - would compare actual periods)
      const periodComparison = this.generatePeriodComparison(statements);

      return {
        totalStatements,
        statementsByType,
        statementsByLevel,
        consolidationMetrics: {
          totalRevenue: Math.round(consolidationMetrics.totalRevenue),
          totalExpenses: Math.round(consolidationMetrics.totalExpenses),
          netOperatingIncome: Math.round(consolidationMetrics.netOperatingIncome),
          totalAssets: Math.round(consolidationMetrics.totalAssets),
          totalLiabilities: Math.round(consolidationMetrics.totalLiabilities),
          equity: Math.round(consolidationMetrics.equity)
        },
        consolidationRules,
        activeRules,
        entityBreakdown,
        periodComparison
      };
    } catch (error) {
      logger.error('Failed to get consolidation summary', error);
      throw error;
    }
  }

  /**
   * Analyze entity contribution to consolidated results
   */
  async analyzeEntityContribution(
    organizationId: string,
    entityId: string,
    period: string
  ): Promise<ConsolidationAnalysis> {
    try {
      // Get entity statement
      const entityStatement = await prisma.financialStatement.findFirst({
        where: {
          organizationId,
          entityId,
          period: { startsWith: period.substring(0, 7) }
        },
        include: {
          lineItems: true
        }
      });

      if (!entityStatement) {
        throw new Error('Entity statement not found');
      }

      // Get total consolidated figures for comparison
      const consolidatedStatements = await prisma.financialStatement.findMany({
        where: {
          organizationId,
          period: { startsWith: period.substring(0, 7) },
          statementType: 'CONSOLIDATED'
        }
      });

      const totalConsolidatedRevenue = consolidatedStatements.reduce((sum, s) => sum + s.revenue, 0);
      const totalConsolidatedExpenses = consolidatedStatements.reduce((sum, s) => sum + s.operatingExpenses, 0);
      const totalConsolidatedNetIncome = consolidatedStatements.reduce((sum, s) => sum + s.netIncome, 0);

      // Calculate contribution analysis
      const contributionAnalysis = {
        revenueContribution: entityStatement.revenue,
        expenseContribution: entityStatement.operatingExpenses,
        netIncomeContribution: entityStatement.netIncome,
        percentOfTotal: totalConsolidatedRevenue > 0 ? 
          (entityStatement.revenue / totalConsolidatedRevenue) * 100 : 0
      };

      // Calculate performance metrics
      const performanceMetrics = {
        profitMargin: entityStatement.revenue > 0 ? 
          (entityStatement.netIncome / entityStatement.revenue) * 100 : 0,
        operatingMargin: entityStatement.revenue > 0 ? 
          (entityStatement.netOperatingIncome / entityStatement.revenue) * 100 : 0,
        costRatio: entityStatement.revenue > 0 ? 
          (entityStatement.operatingExpenses / entityStatement.revenue) * 100 : 0,
        revenuePerSqFt: await this.calculateRevenuePerSqFt(entityId, entityStatement.revenue),
        expensePerSqFt: await this.calculateExpensePerSqFt(entityId, entityStatement.operatingExpenses)
      };

      // Calculate trends (simplified - would need historical data)
      const trends = {
        revenueGrowth: 5.2, // Demo value
        expenseGrowth: 3.8, // Demo value
        marginTrend: 1.4 // Demo value
      };

      // Benchmarks (simplified - would come from industry data)
      const benchmarks = {
        industryBenchmark: performanceMetrics.profitMargin * 0.9,
        peerComparison: performanceMetrics.profitMargin * 1.1,
        internalBenchmark: performanceMetrics.profitMargin * 0.95
      };

      return {
        entityId,
        entityName: this.getEntityDisplayName(entityId, entityStatement.entityType),
        entityType: entityStatement.entityType,
        consolidationLevel: entityStatement.consolidationLevel,
        contributionAnalysis,
        performanceMetrics: {
          ...performanceMetrics,
          profitMargin: Math.round(performanceMetrics.profitMargin * 100) / 100,
          operatingMargin: Math.round(performanceMetrics.operatingMargin * 100) / 100,
          costRatio: Math.round(performanceMetrics.costRatio * 100) / 100
        },
        trends,
        benchmarks: {
          industryBenchmark: Math.round((benchmarks.industryBenchmark || 0) * 100) / 100,
          peerComparison: Math.round((benchmarks.peerComparison || 0) * 100) / 100,
          internalBenchmark: Math.round((benchmarks.internalBenchmark || 0) * 100) / 100
        }
      };
    } catch (error) {
      logger.error('Failed to analyze entity contribution', error);
      throw error;
    }
  }

  /**
   * Generate global consolidation report
   */
  async generateGlobalConsolidationReport(
    organizationId: string,
    reportingPeriod: string
  ): Promise<GlobalConsolidationReport> {
    try {
      // Get all statements for the period
      const statements = await prisma.financialStatement.findMany({
        where: {
          organizationId,
          period: { startsWith: reportingPeriod.substring(0, 7) }
        },
        include: {
          lineItems: true
        }
      });

      // Build consolidation hierarchy
      const consolidationHierarchy = this.buildConsolidationHierarchy(statements);

      // Calculate intercompany eliminations
      const intercompanyEliminations = this.calculateIntercompanyEliminations(statements);

      // Calculate consolidation adjustments
      const consolidationAdjustments = this.calculateConsolidationAdjustments(statements);

      // Calculate key metrics
      const totalRevenue = statements.reduce((sum, s) => sum + s.revenue, 0);
      const totalExpenses = statements.reduce((sum, s) => sum + s.operatingExpenses, 0);
      const netIncome = totalRevenue - totalExpenses;

      const keyMetrics = {
        totalConsolidatedRevenue: Math.round(totalRevenue),
        totalConsolidatedExpenses: Math.round(totalExpenses),
        consolidatedNetIncome: Math.round(netIncome),
        profitMargin: totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 10000) / 100 : 0,
        operatingMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 10000) / 100 : 0
      };

      // Generate variance analysis
      const varianceAnalysis = this.generateVarianceAnalysis(statements);

      return {
        reportingPeriod,
        consolidationHierarchy,
        intercompanyEliminations,
        consolidationAdjustments,
        keyMetrics,
        varianceAnalysis
      };
    } catch (error) {
      logger.error('Failed to generate global consolidation report', error);
      throw error;
    }
  }

  /**
   * Generate financial reports with consolidation
   */
  async generateConsolidatedReport(
    organizationId: string,
    reportType: string,
    filters: any = {}
  ): Promise<any> {
    try {
      switch (reportType) {
        case 'CONSOLIDATED_INCOME_STATEMENT':
          return await this.generateConsolidatedIncomeStatement(organizationId, filters);
        case 'CONSOLIDATED_BALANCE_SHEET':
          return await this.generateConsolidatedBalanceSheet(organizationId, filters);
        case 'CASH_FLOW_STATEMENT':
          return await this.generateCashFlowStatement(organizationId, filters);
        case 'ENTITY_CONTRIBUTION':
          return await this.generateEntityContributionReport(organizationId, filters);
        default:
          throw new Error('Invalid report type');
      }
    } catch (error) {
      logger.error('Failed to generate consolidated report', error);
      throw error;
    }
  }

  // Private helper methods

  private consolidateStatements(statements: any[], rules: any[]): any {
    const consolidatedLineItems = new Map<string, any>();

    statements.forEach(statement => {
      statement.lineItems.forEach((lineItem: any) => {
        const key = `${lineItem.accountCode}-${lineItem.category}`;
        
        if (!consolidatedLineItems.has(key)) {
          consolidatedLineItems.set(key, {
            lineNumber: lineItem.lineNumber,
            accountCode: lineItem.accountCode,
            accountName: lineItem.accountName,
            lineType: lineItem.lineType,
            budgetAmount: 0,
            actualAmount: 0,
            priorYearAmount: 0,
            category: lineItem.category,
            subCategory: lineItem.subCategory
          });
        }

        const consolidated = consolidatedLineItems.get(key)!;
        consolidated.budgetAmount += lineItem.budgetAmount || 0;
        consolidated.actualAmount += lineItem.actualAmount || 0;
        consolidated.priorYearAmount += lineItem.priorYearAmount || 0;
      });
    });

    const lineItems = Array.from(consolidatedLineItems.values());
    
    const totals = {
      revenue: lineItems.filter(item => item.lineType === 'REVENUE').reduce((sum, item) => sum + item.actualAmount, 0),
      expenses: lineItems.filter(item => item.lineType === 'EXPENSE').reduce((sum, item) => sum + item.actualAmount, 0),
      netIncome: 0
    };
    
    totals.netIncome = totals.revenue - totals.expenses;

    return { lineItems, totals };
  }

  private async applyIntercompanyEliminations(
    statementId: string,
    sourceStatements: any[],
    rules: any[]
  ): Promise<any[]> {
    const eliminations = [];

    // Sample intercompany elimination
    const intercompanyRevenue = sourceStatements.reduce((sum, statement) => {
      return sum + (statement.lineItems || [])
        .filter((item: any) => item.accountCode.includes('INTERCOMPANY'))
        .reduce((itemSum: number, item: any) => itemSum + (item.actualAmount || 0), 0);
    }, 0);

    if (intercompanyRevenue > 0) {
      eliminations.push({
        description: 'Intercompany revenue elimination',
        amount: intercompanyRevenue,
        entities: sourceStatements.map(s => s.entityId)
      });
    }

    return eliminations;
  }

  private async applyConsolidationAdjustments(
    statementId: string,
    consolidatedData: any
  ): Promise<any[]> {
    const adjustments = [];

    // Sample consolidation adjustment
    if (consolidatedData.totals.revenue > 10000000) { // Large revenue threshold
      adjustments.push({
        description: 'Large enterprise adjustment',
        amount: consolidatedData.totals.revenue * 0.001, // 0.1% adjustment
        justification: 'Standard large enterprise consolidation adjustment'
      });
    }

    return adjustments;
  }

  private getEntityDisplayName(entityId: string, entityType: string): string {
    // In practice, this would lookup entity names from the database
    return `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId.substring(0, 8)}`;
  }

  private generatePeriodComparison(statements: any[]): any {
    // Simplified period comparison - would need actual period data
    const currentRevenue = statements.reduce((sum, s) => sum + s.revenue, 0);
    const currentExpenses = statements.reduce((sum, s) => sum + s.operatingExpenses, 0);
    const currentNetIncome = currentRevenue - currentExpenses;

    // Demo prior period data (would come from actual prior period)
    const priorRevenue = currentRevenue * 0.95; // 5% less
    const priorExpenses = currentExpenses * 0.97; // 3% less
    const priorNetIncome = priorRevenue - priorExpenses;

    const revenueVariance = currentRevenue - priorRevenue;
    const expenseVariance = currentExpenses - priorExpenses;
    const netIncomeVariance = currentNetIncome - priorNetIncome;

    return {
      currentPeriod: {
        revenue: Math.round(currentRevenue),
        expenses: Math.round(currentExpenses),
        netIncome: Math.round(currentNetIncome)
      },
      priorPeriod: {
        revenue: Math.round(priorRevenue),
        expenses: Math.round(priorExpenses),
        netIncome: Math.round(priorNetIncome)
      },
      variance: {
        revenue: Math.round(revenueVariance),
        expenses: Math.round(expenseVariance),
        netIncome: Math.round(netIncomeVariance)
      },
      variancePercent: {
        revenue: priorRevenue > 0 ? Math.round((revenueVariance / priorRevenue) * 10000) / 100 : 0,
        expenses: priorExpenses > 0 ? Math.round((expenseVariance / priorExpenses) * 10000) / 100 : 0,
        netIncome: priorNetIncome > 0 ? Math.round((netIncomeVariance / priorNetIncome) * 10000) / 100 : 0
      }
    };
  }

  private async calculateRevenuePerSqFt(entityId: string, revenue: number): Promise<number | undefined> {
    // Would lookup actual square footage from property/building data
    // For demo, assuming 10,000 sq ft
    const assumedSqFt = 10000;
    return revenue / assumedSqFt;
  }

  private async calculateExpensePerSqFt(entityId: string, expenses: number): Promise<number | undefined> {
    // Would lookup actual square footage from property/building data
    // For demo, assuming 10,000 sq ft
    const assumedSqFt = 10000;
    return expenses / assumedSqFt;
  }

  private buildConsolidationHierarchy(statements: any[]): any[] {
    const hierarchy = [];
    
    // Group by consolidation level
    const byLevel = statements.reduce((acc, statement) => {
      const level = statement.consolidationLevel;
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level].push(statement);
      return acc;
    }, {} as { [key: string]: any[] });

    // Build hierarchy structure
    Object.entries(byLevel).forEach(([level, levelStatements]) => {
      const entities = (levelStatements as any[]).map(statement => ({
        entityId: statement.entityId,
        entityName: this.getEntityDisplayName(statement.entityId, statement.entityType),
        revenue: statement.revenue,
        expenses: statement.operatingExpenses,
        netIncome: statement.netIncome,
        assets: statement.assets,
        liabilities: statement.liabilities
      }));

      hierarchy.push({
        level,
        entities,
        totalRevenue: entities.reduce((sum, e) => sum + e.revenue, 0),
        totalExpenses: entities.reduce((sum, e) => sum + e.expenses, 0),
        totalNetIncome: entities.reduce((sum, e) => sum + e.netIncome, 0)
      });
    });

    return hierarchy;
  }

  private calculateIntercompanyEliminations(statements: any[]): any[] {
    // Simplified intercompany elimination calculation
    return [
      {
        description: 'Intercompany service charges',
        amount: 50000,
        entities: statements.slice(0, 2).map(s => s.entityId)
      },
      {
        description: 'Intercompany rent charges',
        amount: 25000,
        entities: statements.slice(1, 3).map(s => s.entityId)
      }
    ];
  }

  private calculateConsolidationAdjustments(statements: any[]): any[] {
    const totalRevenue = statements.reduce((sum, s) => sum + s.revenue, 0);
    
    return [
      {
        description: 'Currency translation adjustment',
        amount: totalRevenue * 0.002,
        justification: 'Foreign exchange rate adjustments for international entities'
      },
      {
        description: 'Fair value adjustment',
        amount: totalRevenue * 0.001,
        justification: 'Mark-to-market adjustments for investment properties'
      }
    ];
  }

  private generateVarianceAnalysis(statements: any[]): any[] {
    // Aggregate line items by category for variance analysis
    const categoryTotals = new Map<string, { budget: number; actual: number }>();

    statements.forEach(statement => {
      statement.lineItems?.forEach((item: any) => {
        if (!categoryTotals.has(item.category)) {
          categoryTotals.set(item.category, { budget: 0, actual: 0 });
        }
        const category = categoryTotals.get(item.category)!;
        category.budget += item.budgetAmount || 0;
        category.actual += item.actualAmount || 0;
      });
    });

    return Array.from(categoryTotals.entries()).map(([category, totals]) => {
      const variance = totals.actual - totals.budget;
      const variancePercent = totals.budget > 0 ? (variance / totals.budget) * 100 : 0;

      return {
        category,
        budgetAmount: Math.round(totals.budget),
        actualAmount: Math.round(totals.actual),
        variance: Math.round(variance),
        variancePercent: Math.round(variancePercent * 100) / 100,
        explanation: this.generateVarianceExplanation(category, variancePercent)
      };
    });
  }

  private generateVarianceExplanation(category: string, variancePercent: number): string {
    if (Math.abs(variancePercent) > 15) {
      return `Significant variance in ${category} requires investigation`;
    } else if (Math.abs(variancePercent) > 10) {
      return `Notable variance in ${category} should be monitored`;
    } else {
      return `Variance in ${category} is within acceptable range`;
    }
  }

  private async generateConsolidatedIncomeStatement(organizationId: string, filters: any): Promise<any> {
    const period = filters.period || new Date().toISOString().substring(0, 7);
    
    const statements = await prisma.financialStatement.findMany({
      where: {
        organizationId,
        period: { startsWith: period },
        statementType: { in: ['INCOME_STATEMENT', 'CONSOLIDATED'] }
      },
      include: {
        lineItems: true
      }
    });

    // Consolidate income statement data
    const consolidatedData = this.consolidateStatements(statements, []);

    return {
      reportType: 'CONSOLIDATED_INCOME_STATEMENT',
      generatedDate: new Date(),
      reportingPeriod: period,
      summary: {
        totalRevenue: consolidatedData.totals.revenue,
        totalExpenses: consolidatedData.totals.expenses,
        netIncome: consolidatedData.totals.netIncome,
        profitMargin: consolidatedData.totals.revenue > 0 ? 
          (consolidatedData.totals.netIncome / consolidatedData.totals.revenue) * 100 : 0
      },
      lineItems: consolidatedData.lineItems
    };
  }

  private async generateConsolidatedBalanceSheet(organizationId: string, filters: any): Promise<any> {
    // Implementation for consolidated balance sheet
    return {
      reportType: 'CONSOLIDATED_BALANCE_SHEET',
      generatedDate: new Date(),
      // ... detailed balance sheet implementation
    };
  }

  private async generateCashFlowStatement(organizationId: string, filters: any): Promise<any> {
    // Implementation for cash flow statement
    return {
      reportType: 'CASH_FLOW_STATEMENT',
      generatedDate: new Date(),
      // ... detailed cash flow implementation
    };
  }

  private async generateEntityContributionReport(organizationId: string, filters: any): Promise<any> {
    const period = filters.period || new Date().toISOString().substring(0, 7);
    
    // Get all entity statements
    const statements = await prisma.financialStatement.findMany({
      where: {
        organizationId,
        period: { startsWith: period }
      }
    });

    const entityContributions = [];
    for (const statement of statements) {
      if (filters.entityId && statement.entityId !== filters.entityId) continue;
      
      try {
        const analysis = await this.analyzeEntityContribution(organizationId, statement.entityId, period);
        entityContributions.push(analysis);
      } catch (error) {
        // Skip entities that can't be analyzed
        continue;
      }
    }

    return {
      reportType: 'ENTITY_CONTRIBUTION',
      generatedDate: new Date(),
      reportingPeriod: period,
      entityCount: entityContributions.length,
      contributions: entityContributions.sort((a, b) => b.contributionAnalysis.percentOfTotal - a.contributionAnalysis.percentOfTotal)
    };
  }
}