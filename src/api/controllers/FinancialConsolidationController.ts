import { Router, Request, Response } from 'express';
import { FinancialConsolidationService } from '@/services/FinancialConsolidationService';
import { logger } from '@/config/logger';

const router = Router();
const financialConsolidationService = new FinancialConsolidationService();

/**
 * Create financial statement
 * POST /api/financial-consolidation/statements
 */
router.post('/statements', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      statementType,
      period,
      fiscalYear,
      fiscalPeriod,
      consolidationLevel,
      entityId,
      entityType,
      lineItems,
      preparedBy,
      notes
    } = req.body;

    // Validate required fields
    if (!statementType || !period || !fiscalYear || !fiscalPeriod || !consolidationLevel || !entityId || !entityType || !lineItems) {
      res.status(400).json({
        error: 'Required fields missing: statementType, period, fiscalYear, fiscalPeriod, consolidationLevel, entityId, entityType, lineItems'
      });

      return;
      return;
    }

    const validStatementTypes = ['INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW', 'BUDGET_VARIANCE', 'CONSOLIDATED'];
    if (!validStatementTypes.includes(statementType)) {
      res.status(400).json({
        error: `Invalid statementType. Must be one of: ${validStatementTypes.join(', ')}`
      });

      return;
      return;
    }

    const validConsolidationLevels = ['PROPERTY', 'BUILDING', 'PORTFOLIO', 'REGIONAL', 'GLOBAL'];
    if (!validConsolidationLevels.includes(consolidationLevel)) {
      res.status(400).json({
        error: `Invalid consolidationLevel. Must be one of: ${validConsolidationLevels.join(', ')}`
      });

      return;
      return;
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      res.status(400).json({
        error: 'lineItems must be a non-empty array'
      });

      return;
      return;
    }

    // Validate and format line items
    const formattedLineItems = lineItems.map((item: any, index: number) => {
      const validLineTypes = ['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY'];
      if (!validLineTypes.includes(item.lineType)) {
        throw new Error(`Invalid lineType at index ${index}. Must be one of: ${validLineTypes.join(', ')}`);
      }

      return {
        lineNumber: item.lineNumber || index + 1,
        accountCode: item.accountCode,
        accountName: item.accountName,
        lineType: item.lineType,
        budgetAmount: item.budgetAmount ? parseFloat(item.budgetAmount) : undefined,
        actualAmount: parseFloat(item.actualAmount),
        priorYearAmount: item.priorYearAmount ? parseFloat(item.priorYearAmount) : undefined,
        category: item.category,
        subCategory: item.subCategory,
        glAccount: item.glAccount,
        costCenter: item.costCenter,
        department: item.department,
        notes: item.notes
      };
    });

    const statementData = {
      statementType,
      period,
      fiscalYear: parseInt(fiscalYear),
      fiscalPeriod: parseInt(fiscalPeriod),
      consolidationLevel,
      entityId,
      entityType,
      lineItems: formattedLineItems,
      preparedBy,
      notes
    };

    const statement = await financialConsolidationService.createFinancialStatement(statementData);

    res.status(201).json({
      success: true,
      data: statement
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to create financial statement', error);
    res.status(500).json({
      error: 'Failed to create financial statement',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Create consolidation rule
 * POST /api/financial-consolidation/rules
 */
router.post('/rules', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ruleName,
      ruleType,
      sourceEntities,
      targetEntity,
      mappingRules,
      calculationMethod,
      weights,
      adjustments,
      intercompanyEliminations,
      effectiveDate,
      expiryDate
    } = req.body;

    // Validate required fields
    if (!ruleName || !ruleType || !sourceEntities || !targetEntity || !mappingRules || !calculationMethod || !effectiveDate) {
      res.status(400).json({
        error: 'Required fields missing: ruleName, ruleType, sourceEntities, targetEntity, mappingRules, calculationMethod, effectiveDate'
      });

      return;
      return;
    }

    const validRuleTypes = ['AGGREGATION', 'ELIMINATION', 'ADJUSTMENT', 'MAPPING', 'CALCULATION'];
    if (!validRuleTypes.includes(ruleType)) {
      res.status(400).json({
        error: `Invalid ruleType. Must be one of: ${validRuleTypes.join(', ')}`
      });

      return;
      return;
    }

    if (!Array.isArray(sourceEntities) || sourceEntities.length === 0) {
      res.status(400).json({
        error: 'sourceEntities must be a non-empty array'
      });

      return;
      return;
    }

    const ruleData = {
      ruleName,
      ruleType,
      sourceEntities,
      targetEntity,
      mappingRules,
      calculationMethod,
      weights,
      adjustments,
      intercompanyEliminations,
      effectiveDate: new Date(effectiveDate),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined
    };

    const rule = await financialConsolidationService.createConsolidationRule(ruleData);

    res.status(201).json({
      success: true,
      data: rule
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to create consolidation rule', error);
    res.status(500).json({
      error: 'Failed to create consolidation rule',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Perform consolidation
 * POST /api/financial-consolidation/consolidate
 */
router.post('/consolidate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, consolidationLevel, period, entityIds } = req.body;

    // Validate required fields
    if (!organizationId || !consolidationLevel || !period) {
      res.status(400).json({
        error: 'Required fields missing: organizationId, consolidationLevel, period'
      });

      return;
      return;
    }

    const validConsolidationLevels = ['PROPERTY', 'BUILDING', 'PORTFOLIO', 'REGIONAL', 'GLOBAL'];
    if (!validConsolidationLevels.includes(consolidationLevel)) {
      res.status(400).json({
        error: `Invalid consolidationLevel. Must be one of: ${validConsolidationLevels.join(', ')}`
      });

      return;
      return;
    }

    const result = await financialConsolidationService.performConsolidation(
      organizationId,
      consolidationLevel,
      period,
      entityIds
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    logger.error('Failed to perform consolidation', error);
    res.status(500).json({
      error: 'Failed to perform consolidation',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Get consolidation summary
 * GET /api/financial-consolidation/summary/:organizationId
 */
router.get('/summary/:organizationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const { period } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required'
      });

      return;
      return;
    }

    const summary = await financialConsolidationService.getConsolidationSummary(
      organizationId,
      period as string
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error: unknown) {
    logger.error('Failed to get consolidation summary', error);
    res.status(500).json({
      error: 'Failed to get consolidation summary',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Analyze entity contribution
 * GET /api/financial-consolidation/entity-contribution/:organizationId/:entityId
 */
router.get('/entity-contribution/:organizationId/:entityId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, entityId } = req.params;
    const { period } = req.query;

    if (!organizationId || !entityId) {
      res.status(400).json({
        error: 'Organization ID and Entity ID are required'
      });

      return;
      return;
    }

    if (!period) {
      res.status(400).json({
        error: 'Period is required (YYYY-MM format)'
      });

      return;
      return;
    }

    const analysis = await financialConsolidationService.analyzeEntityContribution(
      organizationId,
      entityId,
      period as string
    );

    res.json({
      success: true,
      data: analysis
    });
  } catch (error: unknown) {
    logger.error('Failed to analyze entity contribution', error);
    res.status(500).json({
      error: 'Failed to analyze entity contribution',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Generate global consolidation report
 * GET /api/financial-consolidation/global-report/:organizationId
 */
router.get('/global-report/:organizationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const { reportingPeriod } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required'
      });

      return;
      return;
    }

    if (!reportingPeriod) {
      res.status(400).json({
        error: 'Reporting period is required (YYYY-MM format)'
      });

      return;
      return;
    }

    const report = await financialConsolidationService.generateGlobalConsolidationReport(
      organizationId,
      reportingPeriod as string
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error: unknown) {
    logger.error('Failed to generate global consolidation report', error);
    res.status(500).json({
      error: 'Failed to generate global consolidation report',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Generate consolidated reports
 * POST /api/financial-consolidation/reports/:organizationId
 */
router.post('/reports/:organizationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const { reportType, filters } = req.body;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required'
      });

      return;
      return;
    }

    if (!reportType) {
      res.status(400).json({
        error: 'Report type is required'
      });

      return;
      return;
    }

    const validReportTypes = [
      'CONSOLIDATED_INCOME_STATEMENT',
      'CONSOLIDATED_BALANCE_SHEET',
      'CASH_FLOW_STATEMENT',
      'ENTITY_CONTRIBUTION'
    ];

    if (!validReportTypes.includes(reportType)) {
      res.status(400).json({
        error: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
      });

      return;
      return;
    }

    const report = await financialConsolidationService.generateConsolidatedReport(
      organizationId,
      reportType,
      filters || {}
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error: unknown) {
    logger.error('Failed to generate consolidated report', error);
    res.status(500).json({
      error: 'Failed to generate consolidated report',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Get financial statements with filtering
 * GET /api/financial-consolidation/statements
 */
router.get('/statements', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      organizationId,
      statementType,
      period,
      fiscalYear,
      consolidationLevel,
      entityId,
      status,
      limit,
      offset
    } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required'
      });

      return;
      return;
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Get financial statements endpoint - implementation pending',
      filters: {
        organizationId,
        statementType,
        period,
        fiscalYear,
        consolidationLevel,
        entityId,
        status,
        limit: limit || 50,
        offset: offset || 0
      }
    });
  } catch (error: unknown) {
    logger.error('Failed to get financial statements', error);
    res.status(500).json({
      error: 'Failed to get financial statements',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Get consolidation rules
 * GET /api/financial-consolidation/rules
 */
router.get('/rules', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ruleType, isActive, limit, offset } = req.query;

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Get consolidation rules endpoint - implementation pending',
      filters: {
        ruleType,
        isActive,
        limit: limit || 50,
        offset: offset || 0
      }
    });
  } catch (error: unknown) {
    logger.error('Failed to get consolidation rules', error);
    res.status(500).json({
      error: 'Failed to get consolidation rules',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Update financial statement status
 * PUT /api/financial-consolidation/statements/:statementId/status
 */
router.put('/statements/:statementId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { statementId } = req.params;
    const { status, reviewedBy, approvedBy, notes } = req.body;

    if (!statementId) {
      res.status(400).json({
        error: 'Statement ID is required'
      });

      return;
      return;
    }

    if (!status) {
      res.status(400).json({
        error: 'Status is required'
      });

      return;
      return;
    }

    const validStatuses = ['DRAFT', 'CALCULATED', 'REVIEW', 'APPROVED', 'PUBLISHED', 'FINAL'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });

      return;
      return;
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Update statement status endpoint - implementation pending',
      data: { statementId, status, reviewedBy, approvedBy, notes }
    });
  } catch (error: unknown) {
    logger.error('Failed to update statement status', error);
    res.status(500).json({
      error: 'Failed to update statement status',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Update consolidation rule
 * PUT /api/financial-consolidation/rules/:ruleId
 */
router.put('/rules/:ruleId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    if (!ruleId) {
      res.status(400).json({
        error: 'Rule ID is required'
      });

      return;
      return;
    }

    // Convert date fields
    if (updates.effectiveDate) {
      updates.effectiveDate = new Date(updates.effectiveDate);
    }
    if (updates.expiryDate) {
      updates.expiryDate = new Date(updates.expiryDate);
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Update consolidation rule endpoint - implementation pending',
      data: { ruleId, updates }
    });
  } catch (error: unknown) {
    logger.error('Failed to update consolidation rule', error);
    res.status(500).json({
      error: 'Failed to update consolidation rule',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Get consolidation dashboard
 * GET /api/financial-consolidation/dashboard/:organizationId
 */
router.get('/dashboard/:organizationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const { period } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required'
      });

      return;
      return;
    }

    // Get consolidation summary and global report for dashboard
    const [summary, globalReport] = await Promise.all([
      financialConsolidationService.getConsolidationSummary(organizationId, period as string),
      period ? 
        financialConsolidationService.generateGlobalConsolidationReport(organizationId, period as string) :
        null
    ]);

    const dashboardData = {
      summary,
      globalMetrics: globalReport ? {
        totalRevenue: globalReport.keyMetrics.totalConsolidatedRevenue,
        totalExpenses: globalReport.keyMetrics.totalConsolidatedExpenses,
        netIncome: globalReport.keyMetrics.consolidatedNetIncome,
        profitMargin: globalReport.keyMetrics.profitMargin,
        operatingMargin: globalReport.keyMetrics.operatingMargin
      } : null,
      consolidationHierarchy: globalReport?.consolidationHierarchy || [],
      alerts: [
        summary.consolidationMetrics.totalRevenue < summary.periodComparison.priorPeriod.revenue ? 
          'Revenue decline compared to prior period' : null,
        summary.consolidationMetrics.netOperatingIncome < 0 ? 
          'Negative net operating income requires attention' : null,
        summary.activeRules < summary.consolidationRules * 0.8 ? 
          'Many consolidation rules are inactive - review rule effectiveness' : null
      ].filter(alert => alert !== null),
      entityPerformance: summary.entityBreakdown.slice(0, 10) // Top 10 entities
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error: unknown) {
    logger.error('Failed to get consolidation dashboard', error);
    res.status(500).json({
      error: 'Failed to get consolidation dashboard',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

/**
 * Delete financial statement
 * DELETE /api/financial-consolidation/statements/:statementId
 */
router.delete('/statements/:statementId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { statementId } = req.params;

    if (!statementId) {
      res.status(400).json({
        error: 'Statement ID is required'
      });

      return;
      return;
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Delete financial statement endpoint - implementation pending'
    });
  } catch (error: unknown) {
    logger.error('Failed to delete financial statement', error);
    res.status(500).json({
      error: 'Failed to delete financial statement',
      message: error instanceof Error ? (error as Error).message : 'Unknown error'
    });

    return;
  }
});

export { router as FinancialConsolidationController };