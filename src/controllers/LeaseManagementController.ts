import { Router, Request, Response } from 'express';
import { LeaseManagementService } from '../services/LeaseManagementService';
import { logger } from '../config/logger';

const router = Router();
const leaseManagementService = new LeaseManagementService();

/**
 * Create a new lease
 * POST /api/lease-management/leases
 */
router.post('/leases', async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      propertyId,
      tenantId,
      leaseNumber,
      leaseName,
      leaseType,
      startDate,
      endDate,
      originalTerm,
      baseLease,
      percentage,
      currency,
      securityDeposit,
      leasableArea,
      usableArea,
      unitType,
      useType,
      commencement,
      rentCommencement,
      expirationDate,
      optionDeadline,
      renewalNotice,
      renewalOptions,
      escalationRules,
      exclusiveRights,
      capex,
      personalProperty,
      notes
    } = req.body;

    // Validate required fields
    if (!organizationId || !propertyId || !tenantId || !leaseNumber || !leaseName || !startDate || !endDate || !originalTerm || !baseLease || !expirationDate) {
      return res.status(400).json({
        error: 'Required fields missing: organizationId, propertyId, tenantId, leaseNumber, leaseName, startDate, endDate, originalTerm, baseLease, expirationDate'
      });
    }

    const leaseData = {
      organizationId,
      propertyId,
      tenantId,
      leaseNumber,
      leaseName,
      leaseType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      originalTerm: parseInt(originalTerm),
      baseLease: parseFloat(baseLease),
      percentage: percentage ? parseFloat(percentage) : undefined,
      currency,
      securityDeposit: securityDeposit ? parseFloat(securityDeposit) : undefined,
      leasableArea: leasableArea ? parseFloat(leasableArea) : undefined,
      usableArea: usableArea ? parseFloat(usableArea) : undefined,
      unitType,
      useType,
      commencement: commencement ? new Date(commencement) : undefined,
      rentCommencement: rentCommencement ? new Date(rentCommencement) : undefined,
      expirationDate: new Date(expirationDate),
      optionDeadline: optionDeadline ? new Date(optionDeadline) : undefined,
      renewalNotice: renewalNotice ? new Date(renewalNotice) : undefined,
      renewalOptions,
      escalationRules,
      exclusiveRights,
      capex: capex ? parseFloat(capex) : undefined,
      personalProperty: personalProperty ? parseFloat(personalProperty) : undefined,
      notes
    };

    const lease = await leaseManagementService.createLease(leaseData);

    res.status(201).json({
      success: true,
      data: lease
    });
  } catch (error) {
    logger.error('Failed to create lease', error);
    res.status(500).json({
      error: 'Failed to create lease',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get lease portfolio summary
 * GET /api/lease-management/portfolio/summary/:organizationId
 */
router.get('/portfolio/summary/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    const summary = await leaseManagementService.getPortfolioSummary(organizationId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Failed to get portfolio summary', error);
    res.status(500).json({
      error: 'Failed to get portfolio summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Search leases with filters
 * GET /api/lease-management/leases/search
 */
router.get('/leases/search', async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      propertyIds,
      tenantIds,
      status,
      startDate,
      endDate,
      expiringWithin,
      renewalNoticeRequired,
      limit,
      offset
    } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    const query = {
      organizationId: organizationId as string,
      propertyIds: propertyIds ? (propertyIds as string).split(',') : undefined,
      tenantIds: tenantIds ? (tenantIds as string).split(',') : undefined,
      status: status ? (status as string).split(',') : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      expiringWithin: expiringWithin ? parseInt(expiringWithin as string) : undefined,
      renewalNoticeRequired: renewalNoticeRequired === 'true',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    };

    const leases = await leaseManagementService.searchLeases(query);

    res.json({
      success: true,
      data: leases,
      pagination: {
        limit: query.limit || 100,
        offset: query.offset || 0,
        total: leases.length
      }
    });
  } catch (error) {
    logger.error('Failed to search leases', error);
    res.status(500).json({
      error: 'Failed to search leases',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get lease metrics and analytics
 * GET /api/lease-management/metrics/:organizationId
 */
router.get('/metrics/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { propertyIds } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    const propertyIdArray = propertyIds ? (propertyIds as string).split(',') : undefined;
    const metrics = await leaseManagementService.getLeaseMetrics(organizationId, propertyIdArray);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get lease metrics', error);
    res.status(500).json({
      error: 'Failed to get lease metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze renewal opportunities
 * GET /api/lease-management/renewals/analyze/:organizationId
 */
router.get('/renewals/analyze/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { monthsAhead } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    const months = monthsAhead ? parseInt(monthsAhead as string) : 18;
    const renewalAnalyses = await leaseManagementService.analyzeRenewalOpportunities(organizationId, months);

    res.json({
      success: true,
      data: renewalAnalyses,
      summary: {
        totalLeases: renewalAnalyses.length,
        highRenewalProbability: renewalAnalyses.filter(r => r.renewalProbability > 70).length,
        lowRenewalProbability: renewalAnalyses.filter(r => r.renewalProbability < 40).length,
        averageRenewalProbability: renewalAnalyses.length > 0 ? 
          Math.round(renewalAnalyses.reduce((sum, r) => sum + r.renewalProbability, 0) / renewalAnalyses.length) : 0
      }
    });
  } catch (error) {
    logger.error('Failed to analyze renewal opportunities', error);
    res.status(500).json({
      error: 'Failed to analyze renewal opportunities',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update lease
 * PUT /api/lease-management/leases/:leaseId
 */
router.put('/leases/:leaseId', async (req: Request, res: Response) => {
  try {
    const { leaseId } = req.params;
    const { amendmentReason, ...updates } = req.body;
    
    if (!leaseId) {
      return res.status(400).json({
        error: 'Lease ID is required'
      });
    }

    if (!amendmentReason) {
      return res.status(400).json({
        error: 'Amendment reason is required'
      });
    }

    // Convert date strings to Date objects
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    if (updates.expirationDate) updates.expirationDate = new Date(updates.expirationDate);
    if (updates.commencement) updates.commencement = new Date(updates.commencement);
    if (updates.rentCommencement) updates.rentCommencement = new Date(updates.rentCommencement);
    if (updates.optionDeadline) updates.optionDeadline = new Date(updates.optionDeadline);
    if (updates.renewalNotice) updates.renewalNotice = new Date(updates.renewalNotice);

    // Convert numeric strings to numbers
    if (updates.baseLease) updates.baseLease = parseFloat(updates.baseLease);
    if (updates.percentage) updates.percentage = parseFloat(updates.percentage);
    if (updates.securityDeposit) updates.securityDeposit = parseFloat(updates.securityDeposit);
    if (updates.leasableArea) updates.leasableArea = parseFloat(updates.leasableArea);
    if (updates.usableArea) updates.usableArea = parseFloat(updates.usableArea);
    if (updates.capex) updates.capex = parseFloat(updates.capex);
    if (updates.personalProperty) updates.personalProperty = parseFloat(updates.personalProperty);
    if (updates.originalTerm) updates.originalTerm = parseInt(updates.originalTerm);

    const updatedLease = await leaseManagementService.updateLease(leaseId, updates, amendmentReason);

    res.json({
      success: true,
      data: updatedLease
    });
  } catch (error) {
    logger.error('Failed to update lease', error);
    res.status(500).json({
      error: 'Failed to update lease',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate lease report
 * POST /api/lease-management/reports/:organizationId
 */
router.post('/reports/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { reportType, filters } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    if (!reportType) {
      return res.status(400).json({
        error: 'Report type is required'
      });
    }

    const validReportTypes = ['EXPIRATION_REPORT', 'RENT_ROLL', 'TENANT_ANALYSIS', 'RENEWAL_PIPELINE'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        error: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
      });
    }

    const report = await leaseManagementService.generateLeaseReport(organizationId, reportType, filters);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Failed to generate lease report', error);
    res.status(500).json({
      error: 'Failed to generate lease report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get single lease by ID
 * GET /api/lease-management/leases/:leaseId
 */
router.get('/leases/:leaseId', async (req: Request, res: Response) => {
  try {
    const { leaseId } = req.params;
    
    if (!leaseId) {
      return res.status(400).json({
        error: 'Lease ID is required'
      });
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Get lease by ID endpoint - implementation pending'
    });
  } catch (error) {
    logger.error('Failed to get lease', error);
    res.status(500).json({
      error: 'Failed to get lease',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete lease (soft delete)
 * DELETE /api/lease-management/leases/:leaseId
 */
router.delete('/leases/:leaseId', async (req: Request, res: Response) => {
  try {
    const { leaseId } = req.params;
    
    if (!leaseId) {
      return res.status(400).json({
        error: 'Lease ID is required'
      });
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Delete lease endpoint - implementation pending'
    });
  } catch (error) {
    logger.error('Failed to delete lease', error);
    res.status(500).json({
      error: 'Failed to delete lease',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get lease dashboard data
 * GET /api/lease-management/dashboard/:organizationId
 */
router.get('/dashboard/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    // Get comprehensive dashboard data
    const [summary, metrics] = await Promise.all([
      leaseManagementService.getPortfolioSummary(organizationId),
      leaseManagementService.getLeaseMetrics(organizationId)
    ]);

    const dashboardData = {
      summary,
      metrics,
      alertsAndNotifications: {
        expiringLeases: summary.expiringLeases.next30Days + summary.expiringLeases.next60Days,
        renewalNoticesRequired: summary.renewalPipeline.filter((lease: any) => 
          lease.renewalStatus === 'URGENT_REVIEW' || lease.renewalStatus === 'NOTICE_OVERDUE'
        ).length,
        criticalActions: summary.alerts?.length || 0
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Failed to get lease dashboard', error);
    res.status(500).json({
      error: 'Failed to get lease dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as LeaseManagementController };