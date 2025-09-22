import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

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
    totalAssets: number;
    totalLiabilities: number;
    netIncome: number;
  };
}

/**
 * Financial Consolidation Service - Handles financial statement consolidation
 * 
 * This service manages:
 * - Financial statement consolidation across entities
 * - Consolidation rule management
 * - Intercompany eliminations
 * - Multi-level consolidation (property, building, portfolio, regional, global)
 * - Consolidated reporting and analytics
 */
export class FinancialConsolidationService {
  /**
   * Create consolidation rule
   */
  async createConsolidationRule(
    organizationId: string,
    data: ConsolidationRuleData
  ): Promise<any> {
    try {
      logger.info('Creating consolidation rule', { 
        organizationId, 
        ruleName: data.ruleName,
        ruleType: data.ruleType
      });

      const rule = await prisma.consolidationRule.create({
        data: {
          organizationId,
          ruleName: data.ruleName,
          ruleType: data.ruleType,
          sourceEntities: data.sourceEntities,
          targetEntity: data.targetEntity,
          mappingRules: data.mappingRules,
          calculationMethod: data.calculationMethod,
          weights: data.weights,
          adjustments: data.adjustments,
          intercompanyEliminations: data.intercompanyEliminations,
          effectiveDate: data.effectiveDate,
          expiryDate: data.expiryDate,
          status: 'ACTIVE',
          createdAt: new Date()
        }
      });

      logger.info('Consolidation rule created successfully', { ruleId: rule.id });
      return rule;
    } catch (error: unknown) {
      logger.error('Failed to create consolidation rule', error);
      throw error;
    }
  }

  /**
   * Create financial statement
   */
  async createFinancialStatement(
    organizationId: string,
    data: FinancialStatementData
  ): Promise<any> {
    try {
      logger.info('Creating financial statement', { 
        organizationId, 
        statementType: data.statementType,
        period: data.period,
        consolidationLevel: data.consolidationLevel
      });

      const statement = await prisma.financialStatement.create({
        data: {
          organizationId,
          statementType: data.statementType,
          period: data.period,
          fiscalYear: data.fiscalYear,
          fiscalPeriod: data.fiscalPeriod,
          consolidationLevel: data.consolidationLevel,
          entityId: data.entityId,
          entityType: data.entityType,
          preparedBy: data.preparedBy,
          notes: data.notes,
          status: 'DRAFT',
          totalRevenue: data.lineItems
            .filter(item => item.lineType === 'REVENUE')
            .reduce((sum, item) => sum + item.actualAmount, 0),
          totalExpenses: data.lineItems
            .filter(item => item.lineType === 'EXPENSE')
            .reduce((sum, item) => sum + item.actualAmount, 0),
          totalAssets: data.lineItems
            .filter(item => item.lineType === 'ASSET')
            .reduce((sum, item) => sum + item.actualAmount, 0),
          totalLiabilities: data.lineItems
            .filter(item => item.lineType === 'LIABILITY')
            .reduce((sum, item) => sum + item.actualAmount, 0),
          lineItems: {
            create: data.lineItems.map(item => ({
              lineNumber: item.lineNumber,
              accountCode: item.accountCode,
              accountName: item.accountName,
              lineType: item.lineType,
              budgetAmount: item.budgetAmount,
              actualAmount: item.actualAmount,
              priorYearAmount: item.priorYearAmount,
              category: item.category,
              subCategory: item.subCategory,
              glAccount: item.glAccount,
              costCenter: item.costCenter,
              department: item.department,
              notes: item.notes
            }))
          }
        },
        include: {
          lineItems: true
        }
      });

      logger.info('Financial statement created successfully', { statementId: statement.id });
      return statement;
    } catch (error: unknown) {
      logger.error('Failed to create financial statement', error);
      throw error;
    }
  }

  /**
   * Consolidate financial statements
   */
  async consolidateStatements(
    organizationId: string,
    consolidationRuleId: string,
    period: string,
    sourceStatementIds: string[]
  ): Promise<any> {
    try {
      logger.info('Consolidating financial statements', { 
        organizationId, 
        consolidationRuleId, 
        period,
        sourceStatements: sourceStatementIds.length
      });

      // Get consolidation rule
      const rule = await prisma.consolidationRule.findUnique({
        where: { id: consolidationRuleId }
      });

      if (!rule) {
        throw new Error('Consolidation rule not found');
      }

      // Get source statements
      const sourceStatements = await prisma.financialStatement.findMany({
        where: {
          id: { in: sourceStatementIds },
          period
        },
        include: {
          lineItems: true
        }
      });

      if (sourceStatements.length === 0) {
        throw new Error('No source statements found');
      }

      // Perform consolidation based on rule type
      let consolidatedData: any;

      switch (rule.ruleType) {
        case 'AGGREGATION':
          consolidatedData = await this.performAggregation(sourceStatements, rule);
          break;
        case 'ELIMINATION':
          consolidatedData = await this.performElimination(sourceStatements, rule);
          break;
        case 'ADJUSTMENT':
          consolidatedData = await this.performAdjustment(sourceStatements, rule);
          break;
        case 'MAPPING':
          consolidatedData = await this.performMapping(sourceStatements, rule);
          break;
        case 'CALCULATION':
          consolidatedData = await this.performCalculation(sourceStatements, rule);
          break;
        default:
          throw new Error(`Unsupported consolidation rule type: ${rule.ruleType}`);
      }

      // Create consolidated statement
      const consolidatedStatement = await prisma.financialStatement.create({
        data: {
          organizationId,
          statementType: 'CONSOLIDATED',
          period,
          fiscalYear: sourceStatements[0].fiscalYear,
          fiscalPeriod: sourceStatements[0].fiscalPeriod,
          consolidationLevel: this.determineConsolidationLevel(sourceStatements),
          entityId: rule.targetEntity,
          entityType: 'CONSOLIDATED',
          preparedBy: 'SYSTEM',
          notes: `Consolidated using rule: ${rule.ruleName}`,
          status: 'DRAFT',
          totalRevenue: consolidatedData.totalRevenue,
          totalExpenses: consolidatedData.totalExpenses,
          totalAssets: consolidatedData.totalAssets,
          totalLiabilities: consolidatedData.totalLiabilities,
          sourceStatements: sourceStatementIds,
          consolidationRuleId,
          lineItems: {
            create: consolidatedData.lineItems
          }
        },
        include: {
          lineItems: true
        }
      });

      logger.info('Financial statements consolidated successfully', { 
        consolidatedStatementId: consolidatedStatement.id,
        lineItems: consolidatedStatement.lineItems.length
      });

      return consolidatedStatement;
    } catch (error: unknown) {
      logger.error('Failed to consolidate financial statements', error);
      throw error;
    }
  }

  /**
   * Get consolidation summary
   */
  async getConsolidationSummary(
    organizationId: string,
    period?: string,
    level?: string
  ): Promise<ConsolidationSummary> {
    try {
      const whereClause: any = { organizationId };
      if (period) {
        whereClause.period = period;
      }
      if (level) {
        whereClause.consolidationLevel = level;
      }

      const statements = await prisma.financialStatement.findMany({
        where: whereClause,
        include: {
          lineItems: true
        }
      });

      const statementsByType = statements.reduce((acc, stmt) => {
        acc[stmt.statementType] = (acc[stmt.statementType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const statementsByLevel = statements.reduce((acc, stmt) => {
        acc[stmt.consolidationLevel] = (acc[stmt.consolidationLevel] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const consolidationMetrics = {
        totalRevenue: statements.reduce((sum, stmt) => sum + (stmt.totalRevenue || 0), 0),
        totalExpenses: statements.reduce((sum, stmt) => sum + (stmt.totalExpenses || 0), 0),
        totalAssets: statements.reduce((sum, stmt) => sum + (stmt.totalAssets || 0), 0),
        totalLiabilities: statements.reduce((sum, stmt) => sum + (stmt.totalLiabilities || 0), 0),
        netIncome: 0
      };

      consolidationMetrics.netIncome = consolidationMetrics.totalRevenue - consolidationMetrics.totalExpenses;

      return {
        totalStatements: statements.length,
        statementsByType,
        statementsByLevel,
        consolidationMetrics
      };
    } catch (error: unknown) {
      logger.error('Failed to get consolidation summary', error);
      throw error;
    }
  }

  /**
   * Perform aggregation consolidation
   */
  private async performAggregation(statements: any[], rule: any): Promise<any> {
    const consolidatedLineItems = new Map();

    // Aggregate line items by account code
    statements.forEach(statement => {
      statement.lineItems.forEach((lineItem: any) => {
        const key = `${lineItem.accountCode}-${lineItem.lineType}`;
        
        if (consolidatedLineItems.has(key)) {
          const existing = consolidatedLineItems.get(key);
          existing.actualAmount += lineItem.actualAmount;
          existing.budgetAmount = (existing.budgetAmount || 0) + (lineItem.budgetAmount || 0);
          existing.priorYearAmount = (existing.priorYearAmount || 0) + (lineItem.priorYearAmount || 0);
        } else {
          consolidatedLineItems.set(key, {
            lineNumber: lineItem.lineNumber,
            accountCode: lineItem.accountCode,
            accountName: lineItem.accountName,
            lineType: lineItem.lineType,
            actualAmount: lineItem.actualAmount,
            budgetAmount: lineItem.budgetAmount,
            priorYearAmount: lineItem.priorYearAmount,
            category: lineItem.category,
            subCategory: lineItem.subCategory
          });
        }
      });
    });

    const lineItems = Array.from(consolidatedLineItems.values());

    return {
      lineItems,
      totalRevenue: lineItems
        .filter(item => item.lineType === 'REVENUE')
        .reduce((sum, item) => sum + item.actualAmount, 0),
      totalExpenses: lineItems
        .filter(item => item.lineType === 'EXPENSE')
        .reduce((sum, item) => sum + item.actualAmount, 0),
      totalAssets: lineItems
        .filter(item => item.lineType === 'ASSET')
        .reduce((sum, item) => sum + item.actualAmount, 0),
      totalLiabilities: lineItems
        .filter(item => item.lineType === 'LIABILITY')
        .reduce((sum, item) => sum + item.actualAmount, 0)
    };
  }

  /**
   * Perform elimination consolidation
   */
  private async performElimination(statements: any[], rule: any): Promise<any> {
    // Start with aggregation
    const aggregated = await this.performAggregation(statements, rule);
    
    // Apply intercompany eliminations
    if (rule.intercompanyEliminations) {
      // Eliminate intercompany transactions based on elimination rules
      // This is a simplified implementation
      aggregated.lineItems = aggregated.lineItems.filter((item: any) => {
        return !rule.intercompanyEliminations.some((elimination: any) => 
          item.accountCode === elimination.accountCode
        );
      });
    }

    // Recalculate totals after eliminations
    return {
      ...aggregated,
      totalRevenue: aggregated.lineItems
        .filter((item: any) => item.lineType === 'REVENUE')
        .reduce((sum: number, item: any) => sum + item.actualAmount, 0),
      totalExpenses: aggregated.lineItems
        .filter((item: any) => item.lineType === 'EXPENSE')
        .reduce((sum: number, item: any) => sum + item.actualAmount, 0),
      totalAssets: aggregated.lineItems
        .filter((item: any) => item.lineType === 'ASSET')
        .reduce((sum: number, item: any) => sum + item.actualAmount, 0),
      totalLiabilities: aggregated.lineItems
        .filter((item: any) => item.lineType === 'LIABILITY')
        .reduce((sum: number, item: any) => sum + item.actualAmount, 0)
    };
  }

  /**
   * Perform adjustment consolidation
   */
  private async performAdjustment(statements: any[], rule: any): Promise<any> {
    // Start with aggregation
    const aggregated = await this.performAggregation(statements, rule);
    
    // Apply adjustments
    if (rule.adjustments) {
      rule.adjustments.forEach((adjustment: any) => {
        const lineItem = aggregated.lineItems.find((item: any) => 
          item.accountCode === adjustment.accountCode
        );
        
        if (lineItem) {
          lineItem.actualAmount += adjustment.adjustmentAmount;
        }
      });
    }

    // Recalculate totals after adjustments
    return {
      ...aggregated,
      totalRevenue: aggregated.lineItems
        .filter((item: any) => item.lineType === 'REVENUE')
        .reduce((sum: number, item: any) => sum + item.actualAmount, 0),
      totalExpenses: aggregated.lineItems
        .filter((item: any) => item.lineType === 'EXPENSE')
        .reduce((sum: number, item: any) => sum + item.actualAmount, 0),
      totalAssets: aggregated.lineItems
        .filter((item: any) => item.lineType === 'ASSET')
        .reduce((sum: number, item: any) => sum + item.actualAmount, 0),
      totalLiabilities: aggregated.lineItems
        .filter((item: any) => item.lineType === 'LIABILITY')
        .reduce((sum: number, item: any) => sum + item.actualAmount, 0)
    };
  }

  /**
   * Perform mapping consolidation
   */
  private async performMapping(statements: any[], rule: any): Promise<any> {
    // Apply account mapping before aggregation
    statements.forEach(statement => {
      statement.lineItems.forEach((lineItem: any) => {
        if (rule.mappingRules?.[lineItem.accountCode]) {
          lineItem.accountCode = rule.mappingRules[lineItem.accountCode];
        }
      });
    });

    return await this.performAggregation(statements, rule);
  }

  /**
   * Perform calculation consolidation
   */
  private async performCalculation(statements: any[], rule: any): Promise<any> {
    const aggregated = await this.performAggregation(statements, rule);
    
    // Apply calculation method with weights if provided
    if (rule.calculationMethod === 'WEIGHTED_AVERAGE' && rule.weights) {
      aggregated.lineItems.forEach((item: any) => {
        if (rule.weights[item.accountCode]) {
          item.actualAmount *= rule.weights[item.accountCode];
        }
      });
    }

    return aggregated;
  }

  /**
   * Determine consolidation level based on source statements
   */
  private determineConsolidationLevel(statements: any[]): string {
    const levels = statements.map(s => s.consolidationLevel);
    const uniqueLevels = Array.from(new Set(levels));
    
    if (uniqueLevels.length === 1) {
      // If all statements are at the same level, go one level up
      const level = uniqueLevels[0];
      switch (level) {
        case 'PROPERTY': return 'BUILDING';
        case 'BUILDING': return 'PORTFOLIO';
        case 'PORTFOLIO': return 'REGIONAL';
        case 'REGIONAL': return 'GLOBAL';
        default: return 'GLOBAL';
      }
    }
    
    // If mixed levels, return the highest level
    const levelOrder = ['PROPERTY', 'BUILDING', 'PORTFOLIO', 'REGIONAL', 'GLOBAL'];
    return levelOrder[Math.max(...uniqueLevels.map(l => levelOrder.indexOf(l)))];
  }
}