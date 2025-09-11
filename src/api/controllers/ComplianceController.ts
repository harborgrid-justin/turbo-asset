import { Router, Request, Response } from 'express';
import { ComplianceService } from '../../services/ComplianceService';
import { logger } from '../../config/logger';

const router = Router();
const complianceService = new ComplianceService();

/**
 * Calculate lease accounting (ASC 842/IFRS 16)
 * POST /api/compliance/calculate-lease-accounting
 */
router.post('/calculate-lease-accounting', async (req: Request, res: Response) => {
  try {
    const {
      leaseId,
      accountingStandard,
      fiscalYear,
      fiscalPeriod,
      incrementalBorrowingRate,
      leasePayments,
      initialDirectCosts,
      prepaidLeasePayments,
      leaseIncentivesReceived,
      residualValueGuarantee,
      purchaseOption,
      terminationPenalty
    } = req.body;

    // Validate required fields
    if (!leaseId || !accountingStandard || !fiscalYear || !fiscalPeriod || !incrementalBorrowingRate || !leasePayments) {
      return res.status(400).json({
        error: 'Required fields missing: leaseId, accountingStandard, fiscalYear, fiscalPeriod, incrementalBorrowingRate, leasePayments'
      });
    }

    if (!['ASC842', 'IFRS16'].includes(accountingStandard)) {
      return res.status(400).json({
        error: 'Invalid accounting standard. Must be ASC842 or IFRS16'
      });
    }

    // Convert lease payments dates
    const formattedLeasePayments = leasePayments.map((payment: any) => ({
      ...payment,
      paymentDate: new Date(payment.paymentDate),
      amount: parseFloat(payment.amount),
      period: parseInt(payment.period),
      isFixed: Boolean(payment.isFixed)
    }));

    const calculationData = {
      leaseId,
      accountingStandard,
      fiscalYear: parseInt(fiscalYear),
      fiscalPeriod: parseInt(fiscalPeriod),
      incrementalBorrowingRate: parseFloat(incrementalBorrowingRate),
      leasePayments: formattedLeasePayments,
      initialDirectCosts: initialDirectCosts ? parseFloat(initialDirectCosts) : undefined,
      prepaidLeasePayments: prepaidLeasePayments ? parseFloat(prepaidLeasePayments) : undefined,
      leaseIncentivesReceived: leaseIncentivesReceived ? parseFloat(leaseIncentivesReceived) : undefined,
      residualValueGuarantee: residualValueGuarantee ? parseFloat(residualValueGuarantee) : undefined,
      purchaseOption,
      terminationPenalty
    };

    const result = await complianceService.calculateLeaseAccounting(calculationData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to calculate lease accounting', error);
    res.status(500).json({
      error: 'Failed to calculate lease accounting',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create lease accounting record with journal entries
 * POST /api/compliance/lease-accounting-records
 */
router.post('/lease-accounting-records', async (req: Request, res: Response) => {
  try {
    const { calculationData, calculationResult, approvalWorkflow } = req.body;

    if (!calculationData || !calculationResult) {
      return res.status(400).json({
        error: 'calculationData and calculationResult are required'
      });
    }

    // Format calculation data
    const formattedCalculationData = {
      ...calculationData,
      fiscalYear: parseInt(calculationData.fiscalYear),
      fiscalPeriod: parseInt(calculationData.fiscalPeriod),
      incrementalBorrowingRate: parseFloat(calculationData.incrementalBorrowingRate),
      leasePayments: calculationData.leasePayments.map((payment: any) => ({
        ...payment,
        paymentDate: new Date(payment.paymentDate),
        amount: parseFloat(payment.amount),
        period: parseInt(payment.period)
      }))
    };

    const record = await complianceService.createLeaseAccountingRecord(
      formattedCalculationData,
      calculationResult,
      Boolean(approvalWorkflow)
    );

    res.status(201).json({
      success: true,
      data: record
    });
  } catch (error) {
    logger.error('Failed to create lease accounting record', error);
    res.status(500).json({
      error: 'Failed to create lease accounting record',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process bulk lease accounting for period-end
 * POST /api/compliance/bulk-lease-accounting
 */
router.post('/bulk-lease-accounting', async (req: Request, res: Response) => {
  try {
    const { organizationId, fiscalYear, fiscalPeriod, accountingStandard } = req.body;

    if (!organizationId || !fiscalYear || !fiscalPeriod) {
      return res.status(400).json({
        error: 'organizationId, fiscalYear, and fiscalPeriod are required'
      });
    }

    const standard = accountingStandard || 'ASC842';
    if (!['ASC842', 'IFRS16'].includes(standard)) {
      return res.status(400).json({
        error: 'Invalid accounting standard. Must be ASC842 or IFRS16'
      });
    }

    const result = await complianceService.processBulkLeaseAccounting(
      organizationId,
      parseInt(fiscalYear),
      parseInt(fiscalPeriod),
      standard
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to process bulk lease accounting', error);
    res.status(500).json({
      error: 'Failed to process bulk lease accounting',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate compliance report
 * GET /api/compliance/reports/:organizationId
 */
router.get('/reports/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { reportingPeriod, accountingStandard } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    if (!reportingPeriod) {
      return res.status(400).json({
        error: 'Reporting period is required (YYYY-MM format)'
      });
    }

    const standard = (accountingStandard as string) || 'ASC842';
    if (!['ASC842', 'IFRS16'].includes(standard)) {
      return res.status(400).json({
        error: 'Invalid accounting standard. Must be ASC842 or IFRS16'
      });
    }

    const report = await complianceService.generateComplianceReport(
      organizationId,
      reportingPeriod as string,
      standard as any
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Failed to generate compliance report', error);
    res.status(500).json({
      error: 'Failed to generate compliance report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update discount rates for lease accounting
 * POST /api/compliance/update-discount-rates
 */
router.post('/update-discount-rates', async (req: Request, res: Response) => {
  try {
    const { organizationId, rateUpdates, effectiveDate } = req.body;

    if (!organizationId || !rateUpdates || !effectiveDate) {
      return res.status(400).json({
        error: 'organizationId, rateUpdates, and effectiveDate are required'
      });
    }

    if (!Array.isArray(rateUpdates)) {
      return res.status(400).json({
        error: 'rateUpdates must be an array'
      });
    }

    // Validate rate updates format
    for (const update of rateUpdates) {
      if (!update.leaseId || typeof update.discountRate !== 'number') {
        return res.status(400).json({
          error: 'Each rate update must have leaseId and discountRate'
        });
      }
    }

    const formattedRateUpdates = rateUpdates.map((update: any) => ({
      leaseId: update.leaseId,
      discountRate: parseFloat(update.discountRate)
    }));

    const result = await complianceService.updateDiscountRates(
      organizationId,
      formattedRateUpdates,
      new Date(effectiveDate)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to update discount rates', error);
    res.status(500).json({
      error: 'Failed to update discount rates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate disclosure notes for financial statements
 * GET /api/compliance/disclosure-notes/:organizationId
 */
router.get('/disclosure-notes/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { fiscalYear, accountingStandard } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    if (!fiscalYear) {
      return res.status(400).json({
        error: 'Fiscal year is required'
      });
    }

    const standard = (accountingStandard as string) || 'ASC842';
    if (!['ASC842', 'IFRS16'].includes(standard)) {
      return res.status(400).json({
        error: 'Invalid accounting standard. Must be ASC842 or IFRS16'
      });
    }

    const disclosureNotes = await complianceService.generateDisclosureNotes(
      organizationId,
      parseInt(fiscalYear as string),
      standard as any
    );

    res.json({
      success: true,
      data: disclosureNotes
    });
  } catch (error) {
    logger.error('Failed to generate disclosure notes', error);
    res.status(500).json({
      error: 'Failed to generate disclosure notes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get lease accounting records with filtering
 * GET /api/compliance/lease-accounting-records
 */
router.get('/lease-accounting-records', async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      leaseId,
      fiscalYear,
      fiscalPeriod,
      accountingStandard,
      status,
      limit,
      offset
    } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Get lease accounting records endpoint - implementation pending',
      filters: {
        organizationId,
        leaseId,
        fiscalYear,
        fiscalPeriod,
        accountingStandard,
        status,
        limit: limit || 50,
        offset: offset || 0
      }
    });
  } catch (error) {
    logger.error('Failed to get lease accounting records', error);
    res.status(500).json({
      error: 'Failed to get lease accounting records',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get journal entries for lease accounting
 * GET /api/compliance/journal-entries
 */
router.get('/journal-entries', async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      leaseAccountingId,
      entryType,
      status,
      startDate,
      endDate,
      limit,
      offset
    } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Get journal entries endpoint - implementation pending',
      filters: {
        organizationId,
        leaseAccountingId,
        entryType,
        status,
        startDate,
        endDate,
        limit: limit || 50,
        offset: offset || 0
      }
    });
  } catch (error) {
    logger.error('Failed to get journal entries', error);
    res.status(500).json({
      error: 'Failed to get journal entries',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update lease accounting record status
 * PUT /api/compliance/lease-accounting-records/:recordId/status
 */
router.put('/lease-accounting-records/:recordId/status', async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const { status, notes } = req.body;

    if (!recordId) {
      return res.status(400).json({
        error: 'Record ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }

    const validStatuses = ['DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'POSTED', 'ADJUSTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Update accounting record status endpoint - implementation pending',
      data: { recordId, status, notes }
    });
  } catch (error) {
    logger.error('Failed to update accounting record status', error);
    res.status(500).json({
      error: 'Failed to update accounting record status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Approve journal entry
 * POST /api/compliance/journal-entries/:entryId/approve
 */
router.post('/journal-entries/:entryId/approve', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const { approvedBy, notes } = req.body;

    if (!entryId) {
      return res.status(400).json({
        error: 'Entry ID is required'
      });
    }

    if (!approvedBy) {
      return res.status(400).json({
        error: 'Approved by is required'
      });
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Approve journal entry endpoint - implementation pending',
      data: { entryId, approvedBy, notes }
    });
  } catch (error) {
    logger.error('Failed to approve journal entry', error);
    res.status(500).json({
      error: 'Failed to approve journal entry',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get compliance dashboard
 * GET /api/compliance/dashboard/:organizationId
 */
router.get('/dashboard/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { fiscalYear } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    // Get compliance report for dashboard metrics
    const currentPeriod = `${fiscalYear || new Date().getFullYear()}-12`; // Year-end
    const complianceReport = await complianceService.generateComplianceReport(
      organizationId,
      currentPeriod,
      'ASC842'
    );

    const dashboardData = {
      summary: {
        totalRightOfUseAssets: complianceReport.totalRightOfUseAssets,
        totalLeaseLiabilities: complianceReport.totalLeaseLiabilities,
        totalLeaseExpense: complianceReport.totalLeaseExpense,
        weightedAverageDiscountRate: complianceReport.weightedAverageDiscountRate,
        weightedAverageRemainingTerm: complianceReport.weightedAverageRemainingTerm
      },
      maturityAnalysis: complianceReport.maturityAnalysis,
      leaseCount: complianceReport.leaseDetails.length,
      alerts: [
        complianceReport.totalLeaseLiabilities > 50000000 ? 
          'Large lease portfolio - ensure adequate internal controls' : null,
        complianceReport.weightedAverageDiscountRate < 0.03 ? 
          'Low discount rates may need review for market conditions' : null,
        complianceReport.newLeaseCommitments > complianceReport.totalLeaseLiabilities * 0.2 ? 
          'High level of new commitments - monitor cash flow impact' : null
      ].filter(alert => alert !== null),
      complianceStatus: 'COMPLIANT' // Would be calculated based on various factors
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Failed to get compliance dashboard', error);
    res.status(500).json({
      error: 'Failed to get compliance dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as ComplianceController };