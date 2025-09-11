import { Router, Request, Response } from 'express';
import { CriticalDateService } from '@/services/CriticalDateService';
import { logger } from '@/config/logger';

const router = Router();
const criticalDateService = new CriticalDateService();

/**
 * Create a new critical date
 * POST /api/critical-dates
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      entityType,
      entityId,
      dateType,
      dateValue,
      description,
      importance,
      alertDays,
      escalationRules,
      actionRequired,
      responsibleParty,
      notes
    } = req.body;

    // Validate required fields
    if (!entityType || !entityId || !dateType || !dateValue || !description || !importance) {
      return res.status(400).json({
        error: 'Required fields missing: entityType, entityId, dateType, dateValue, description, importance'
      });
    }

    if (!['lease', 'contract', 'property', 'compliance'].includes(entityType)) {
      return res.status(400).json({
        error: 'Invalid entityType. Must be one of: lease, contract, property, compliance'
      });
    }

    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(importance)) {
      return res.status(400).json({
        error: 'Invalid importance. Must be one of: LOW, MEDIUM, HIGH, CRITICAL'
      });
    }

    if (!Array.isArray(alertDays) || alertDays.length === 0) {
      return res.status(400).json({
        error: 'alertDays must be a non-empty array of numbers'
      });
    }

    const criticalDateData = {
      entityType,
      entityId,
      dateType,
      dateValue: new Date(dateValue),
      description,
      importance,
      alertDays: alertDays.map((days: any) => parseInt(days)),
      escalationRules,
      actionRequired,
      responsibleParty,
      notes
    };

    const criticalDate = await criticalDateService.createCriticalDate(criticalDateData);

    res.status(201).json({
      success: true,
      data: criticalDate
    });
  } catch (error: unknown) {
    logger.error('Failed to create critical date', error);
    res.status(500).json({
      error: 'Failed to create critical date',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get critical date dashboard
 * GET /api/critical-dates/dashboard/:organizationId
 */
router.get('/dashboard/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    const dashboard = await criticalDateService.getCriticalDateDashboard(organizationId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error: unknown) {
    logger.error('Failed to get critical date dashboard', error);
    res.status(500).json({
      error: 'Failed to get critical date dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process daily alerts
 * POST /api/critical-dates/process-alerts/:organizationId
 */
router.post('/process-alerts/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    const result = await criticalDateService.processDailyAlerts(organizationId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    logger.error('Failed to process daily alerts', error);
    res.status(500).json({
      error: 'Failed to process daily alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Search alerts with filters
 * GET /api/critical-dates/alerts/search
 */
router.get('/alerts/search', async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      status,
      priority,
      dateType,
      dueWithin,
      overdue,
      acknowledged,
      escalationLevel,
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
      status: status ? (status as string).split(',') : undefined,
      priority: priority ? (priority as string).split(',') : undefined,
      dateType: dateType ? (dateType as string).split(',') : undefined,
      dueWithin: dueWithin ? parseInt(dueWithin as string) : undefined,
      overdue: overdue ? overdue === 'true' : undefined,
      acknowledged: acknowledged ? acknowledged === 'true' : undefined,
      escalationLevel: escalationLevel ? parseInt(escalationLevel as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    };

    const alerts = await criticalDateService.searchAlerts(query);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        limit: query.limit || 100,
        offset: query.offset || 0,
        total: alerts.length
      }
    });
  } catch (error: unknown) {
    logger.error('Failed to search alerts', error);
    res.status(500).json({
      error: 'Failed to search alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Acknowledge an alert
 * POST /api/critical-dates/alerts/:alertId/acknowledge
 */
router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy, notes } = req.body;

    if (!alertId) {
      return res.status(400).json({
        error: 'Alert ID is required'
      });
    }

    if (!acknowledgedBy) {
      return res.status(400).json({
        error: 'acknowledgedBy is required'
      });
    }

    const alert = await criticalDateService.acknowledgeAlert(alertId, acknowledgedBy, notes);

    res.json({
      success: true,
      data: alert
    });
  } catch (error: unknown) {
    logger.error('Failed to acknowledge alert', error);
    res.status(500).json({
      error: 'Failed to acknowledge alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Mark critical date as completed
 * POST /api/critical-dates/:criticalDateId/complete
 */
router.post('/:criticalDateId/complete', async (req: Request, res: Response) => {
  try {
    const { criticalDateId } = req.params;
    const { completedBy, completionNotes } = req.body;

    if (!criticalDateId) {
      return res.status(400).json({
        error: 'Critical Date ID is required'
      });
    }

    if (!completedBy) {
      return res.status(400).json({
        error: 'completedBy is required'
      });
    }

    const criticalDate = await criticalDateService.completeCriticalDate(
      criticalDateId,
      completedBy,
      completionNotes
    );

    res.json({
      success: true,
      data: criticalDate
    });
  } catch (error: unknown) {
    logger.error('Failed to complete critical date', error);
    res.status(500).json({
      error: 'Failed to complete critical date',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update critical date
 * PUT /api/critical-dates/:criticalDateId
 */
router.put('/:criticalDateId', async (req: Request, res: Response) => {
  try {
    const { criticalDateId } = req.params;
    const updates = req.body;

    if (!criticalDateId) {
      return res.status(400).json({
        error: 'Critical Date ID is required'
      });
    }

    // Convert date fields
    if (updates.dateValue) {
      updates.dateValue = new Date(updates.dateValue);
    }

    // Convert alert days to integers
    if (updates.alertDays && Array.isArray(updates.alertDays)) {
      updates.alertDays = updates.alertDays.map((days: any) => parseInt(days));
    }

    const updatedDate = await criticalDateService.updateCriticalDate(criticalDateId, updates);

    res.json({
      success: true,
      data: updatedDate
    });
  } catch (error: unknown) {
    logger.error('Failed to update critical date', error);
    res.status(500).json({
      error: 'Failed to update critical date',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate critical date reports
 * POST /api/critical-dates/reports/:organizationId
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

    const validReportTypes = [
      'UPCOMING_DEADLINES',
      'OVERDUE_ITEMS',
      'ESCALATION_SUMMARY',
      'COMPLETION_ANALYSIS'
    ];

    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        error: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
      });
    }

    const report = await criticalDateService.generateCriticalDateReport(
      organizationId,
      reportType,
      filters || {}
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error: unknown) {
    logger.error('Failed to generate critical date report', error);
    res.status(500).json({
      error: 'Failed to generate critical date report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Bulk update critical dates
 * POST /api/critical-dates/bulk-update/:organizationId
 */
router.post('/bulk-update/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { updates } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        error: 'Updates array is required'
      });
    }

    // Validate updates format
    for (const update of updates) {
      if (!update.criticalDateId || !update.changes) {
        return res.status(400).json({
          error: 'Each update must have criticalDateId and changes'
        });
      }
    }

    // Format date fields in changes
    const formattedUpdates = updates.map((update: any) => ({
      ...update,
      changes: {
        ...update.changes,
        ...(update.changes.dateValue && {
          dateValue: new Date(update.changes.dateValue)
        }),
        ...(update.changes.alertDays && Array.isArray(update.changes.alertDays) && {
          alertDays: update.changes.alertDays.map((days: any) => parseInt(days))
        })
      }
    }));

    const result = await criticalDateService.bulkUpdateCriticalDates(
      organizationId,
      formattedUpdates
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    logger.error('Failed to bulk update critical dates', error);
    res.status(500).json({
      error: 'Failed to bulk update critical dates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get critical date by ID
 * GET /api/critical-dates/:criticalDateId
 */
router.get('/:criticalDateId', async (req: Request, res: Response) => {
  try {
    const { criticalDateId } = req.params;

    if (!criticalDateId) {
      return res.status(400).json({
        error: 'Critical Date ID is required'
      });
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Get critical date by ID endpoint - implementation pending'
    });
  } catch (error: unknown) {
    logger.error('Failed to get critical date', error);
    res.status(500).json({
      error: 'Failed to get critical date',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete critical date
 * DELETE /api/critical-dates/:criticalDateId
 */
router.delete('/:criticalDateId', async (req: Request, res: Response) => {
  try {
    const { criticalDateId } = req.params;

    if (!criticalDateId) {
      return res.status(400).json({
        error: 'Critical Date ID is required'
      });
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Delete critical date endpoint - implementation pending'
    });
  } catch (error: unknown) {
    logger.error('Failed to delete critical date', error);
    res.status(500).json({
      error: 'Failed to delete critical date',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get alert statistics
 * GET /api/critical-dates/statistics/:organizationId
 */
router.get('/statistics/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { timeframe } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    // Get dashboard data which includes statistics
    const dashboard = await criticalDateService.getCriticalDateDashboard(organizationId);

    const statistics = {
      alertsOverview: {
        totalActive: dashboard.summary.totalCriticalDates,
        upcoming: dashboard.summary.upcomingAlerts,
        overdue: dashboard.summary.overdueItems,
        critical: dashboard.summary.criticalItems,
        completed: dashboard.summary.completedThisMonth
      },
      alertsByType: dashboard.alertsByType,
      alertsByImportance: dashboard.alertsByImportance,
      escalationBreakdown: dashboard.escalationStatistics,
      trends: {
        completionRate: dashboard.summary.completedThisMonth > 0 ? 
          Math.round((dashboard.summary.completedThisMonth / dashboard.summary.totalCriticalDates) * 100) : 0,
        overdueRate: dashboard.summary.totalCriticalDates > 0 ? 
          Math.round((dashboard.summary.overdueItems / dashboard.summary.totalCriticalDates) * 100) : 0
      }
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error: unknown) {
    logger.error('Failed to get alert statistics', error);
    res.status(500).json({
      error: 'Failed to get alert statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as CriticalDateController };