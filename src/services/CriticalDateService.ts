import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface CriticalDateCreationData {
  entityType: 'lease' | 'contract' | 'property' | 'compliance';
  entityId: string;
  dateType: string;
  dateValue: Date;
  description: string;
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertDays: number[];
  escalationRules?: {
    levels: Array<{
      level: number;
      daysOverdue: number;
      recipients: string[];
      channels: string[];
    }>;
  };
  actionRequired?: string;
  responsibleParty?: string;
  notes?: string;
}

export interface AlertQuery {
  organizationId: string;
  status?: string[];
  priority?: string[];
  dateType?: string[];
  dueWithin?: number; // days
  overdue?: boolean;
  acknowledged?: boolean;
  escalationLevel?: number;
  limit?: number;
  offset?: number;
}

export interface CriticalDateDashboard {
  summary: {
    totalCriticalDates: number;
    upcomingAlerts: number;
    overdueItems: number;
    criticalItems: number;
    completedThisMonth: number;
  };
  upcomingDates: Array<{
    id: string;
    dateType: string;
    description: string;
    dateValue: Date;
    daysUntilDue: number;
    importance: string;
    entityType: string;
    entityName: string;
    actionRequired: string;
    responsibleParty: string;
  }>;
  overdueItems: Array<{
    id: string;
    dateType: string;
    description: string;
    dateValue: Date;
    daysOverdue: number;
    importance: string;
    escalationLevel: number;
    lastEscalated: Date;
    entityType: string;
    entityName: string;
  }>;
  alertsByType: { [key: string]: number };
  alertsByImportance: { [key: string]: number };
  escalationStatistics: {
    level0: number;
    level1: number;
    level2: number;
    level3Plus: number;
  };
}

export interface EscalationRule {
  level: number;
  triggerDays: number; // days overdue to trigger this level
  recipients: string[];
  channels: string[];
  message?: string;
  actionRequired?: string;
}

/**
 * CriticalDateService handles critical date tracking with escalating alerts and workflows
 * Provides comprehensive date management for leases, contracts, and compliance requirements
 */
export class CriticalDateService {

  /**
   * Create a new critical date with alert configuration
   */
  async createCriticalDate(data: CriticalDateCreationData): Promise<any> {
    try {
      // Validate entity exists based on type
      await this.validateEntity(data.entityType, data.entityId);

      const criticalDate = await prisma.criticalDate.create({
        data: {
          dateType: data.dateType as any,
          dateValue: data.dateValue,
          description: data.description,
          importance: data.importance as any,
          alertDays: data.alertDays,
          escalationRules: data.escalationRules,
          actionRequired: data.actionRequired,
          notes: data.notes,
          // Connect to appropriate entity
          ...(data.entityType === 'lease' && { leaseId: data.entityId }),
          ...(data.entityType === 'contract' && { contractId: data.entityId }),
        }
      });

      // Schedule initial alerts
      await this.scheduleAlertsForDate(criticalDate);

      logger.info('Critical date created', {
        criticalDateId: criticalDate.id,
        entityType: data.entityType,
        entityId: data.entityId,
        dateType: data.dateType,
        alertCount: data.alertDays.length
      });

      return criticalDate;
    } catch (error: unknown) {
      logger.error('Failed to create critical date', error);
      throw error;
    }
  }

  /**
   * Get critical date dashboard with comprehensive overview
   */
  async getCriticalDateDashboard(organizationId: string): Promise<CriticalDateDashboard> {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all critical dates for the organization
      const criticalDates = await prisma.criticalDate.findMany({
        where: {
          OR: [
            {
              lease: {
                property: {
                  organizationId
                }
              }
            },
            {
              contract: {
                lease: {
                  property: {
                    organizationId
                  }
                }
              }
            }
          ],
          isCompleted: false
        },
        include: {
          lease: {
            select: {
              id: true,
              leaseNumber: true,
              tenant: { select: { name: true } }
            }
          },
          contract: {
            select: {
              id: true,
              contractNumber: true,
              lease: {
                select: {
                  tenant: { select: { name: true } }
                }
              }
            }
          },
          alerts: {
            where: {
              status: { in: ['PENDING', 'SENT'] }
            },
            orderBy: { alertDate: 'desc' },
            take: 1
          }
        }
      });

      // Calculate summary statistics
      const totalCriticalDates = criticalDates.length;
      const upcomingAlerts = criticalDates.filter(cd => 
        cd.dateValue <= thirtyDaysFromNow && cd.dateValue >= now
      ).length;
      const overdueItems = criticalDates.filter(cd => cd.dateValue < now).length;
      const criticalItems = criticalDates.filter(cd => cd.importance === 'CRITICAL').length;

      // Get completed items this month
      const completedThisMonth = await prisma.criticalDate.count({
        where: {
          OR: [
            {
              lease: {
                property: { organizationId }
              }
            },
            {
              contract: {
                lease: {
                  property: { organizationId }
                }
              }
            }
          ],
          isCompleted: true,
          completedAt: {
            gte: startOfMonth
          }
        }
      });

      // Prepare upcoming dates (next 30 days)
      const upcomingDates = criticalDates
        .filter(cd => cd.dateValue <= thirtyDaysFromNow && cd.dateValue >= now)
        .map(cd => ({
          id: cd.id,
          dateType: cd.dateType,
          description: cd.description,
          dateValue: cd.dateValue,
          daysUntilDue: Math.ceil((cd.dateValue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          importance: cd.importance,
          entityType: cd.lease ? 'lease' : 'contract',
          entityName: cd.lease ? 
            `${cd.lease.leaseNumber} - ${cd.lease.tenant?.name}` :
            `${cd.contract?.contractNumber}`,
          actionRequired: cd.actionRequired || 'Review required',
          responsibleParty: 'TBD' // Would be extracted from escalation rules
        }))
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      // Prepare overdue items
      const overdueItemsData = criticalDates
        .filter(cd => cd.dateValue < now)
        .map(cd => {
          const latestAlert = cd.alerts[0];
          return {
            id: cd.id,
            dateType: cd.dateType,
            description: cd.description,
            dateValue: cd.dateValue,
            daysOverdue: Math.ceil((now.getTime() - cd.dateValue.getTime()) / (1000 * 60 * 60 * 24)),
            importance: cd.importance,
            escalationLevel: latestAlert?.escalationLevel || 0,
            lastEscalated: latestAlert?.escalatedAt || cd.dateValue,
            entityType: cd.lease ? 'lease' : 'contract',
            entityName: cd.lease ? 
              `${cd.lease.leaseNumber} - ${cd.lease.tenant?.name}` :
              `${cd.contract?.contractNumber}`
          };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue);

      // Calculate breakdowns
      const alertsByType = criticalDates.reduce((acc, cd) => {
        acc[cd.dateType] = (acc[cd.dateType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const alertsByImportance = criticalDates.reduce((acc, cd) => {
        acc[cd.importance] = (acc[cd.importance] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Calculate escalation statistics
      const escalationStatistics = {
        level0: 0,
        level1: 0,
        level2: 0,
        level3Plus: 0
      };

      criticalDates.forEach(cd => {
        const latestAlert = cd.alerts[0];
        const escalationLevel = latestAlert?.escalationLevel || 0;
        
        if (escalationLevel === 0) {escalationStatistics.level0++;}
        else if (escalationLevel === 1) {escalationStatistics.level1++;}
        else if (escalationLevel === 2) {escalationStatistics.level2++;}
        else if (escalationLevel >= 3) {escalationStatistics.level3Plus++;}
      });

      return {
        summary: {
          totalCriticalDates,
          upcomingAlerts,
          overdueItems,
          criticalItems,
          completedThisMonth
        },
        upcomingDates,
        overdueItems: overdueItemsData,
        alertsByType,
        alertsByImportance,
        escalationStatistics
      };
    } catch (error: unknown) {
      logger.error('Failed to get critical date dashboard', error);
      throw error;
    }
  }

  /**
   * Process daily alert checks and escalations
   */
  async processDailyAlerts(organizationId: string): Promise<any> {
    try {
      logger.info('Starting daily alert processing', { organizationId });

      const now = new Date();
      const results = {
        alertsSent: 0,
        escalationsTriggered: 0,
        errors: 0,
        processedDates: 0
      };

      // Get all active critical dates for the organization
      const criticalDates = await prisma.criticalDate.findMany({
        where: {
          OR: [
            {
              lease: {
                property: { organizationId }
              }
            },
            {
              contract: {
                lease: {
                  property: { organizationId }
                }
              }
            }
          ],
          isCompleted: false
        },
        include: {
          lease: {
            include: {
              tenant: true,
              property: true
            }
          },
          contract: {
            include: {
              lease: {
                include: {
                  tenant: true,
                  property: true
                }
              }
            }
          },
          alerts: {
            orderBy: { alertDate: 'desc' }
          }
        }
      });

      for (const criticalDate of criticalDates) {
        try {
          const alertsProcessed = await this.processAlertsForDate(criticalDate, now);
          results.alertsSent += alertsProcessed.alertsSent;
          results.escalationsTriggered += alertsProcessed.escalations;
          results.processedDates++;
        } catch (error: unknown) {
          logger.error('Failed to process alerts for critical date', {
            criticalDateId: criticalDate.id,
            error: error instanceof Error ? (error as Error).message : 'Unknown error'
          });
          results.errors++;
        }
      }

      logger.info('Daily alert processing completed', {
        organizationId,
        ...results
      });

      return results;
    } catch (error: unknown) {
      logger.error('Failed to process daily alerts', error);
      throw error;
    }
  }

  /**
   * Search and filter alerts with advanced querying
   */
  async searchAlerts(query: AlertQuery): Promise<any[]> {
    try {
      const now = new Date();
      const whereClause: any = {
        criticalDate: {
          OR: [
            {
              lease: {
                property: { organizationId: query.organizationId }
              }
            },
            {
              contract: {
                lease: {
                  property: { organizationId: query.organizationId }
                }
              }
            }
          ]
        }
      };

      if (query.status?.length) {
        whereClause.status = { in: query.status };
      }

      if (query.priority?.length) {
        whereClause.priority = { in: query.priority };
      }

      if (query.dateType?.length) {
        whereClause.criticalDate = {
          ...whereClause.criticalDate,
          dateType: { in: query.dateType }
        };
      }

      if (query.dueWithin) {
        const futureDate = new Date(now.getTime() + query.dueWithin * 24 * 60 * 60 * 1000);
        whereClause.scheduledFor = { lte: futureDate };
      }

      if (query.overdue) {
        whereClause.scheduledFor = { lt: now };
        whereClause.status = { in: ['PENDING', 'SENT'] };
      }

      if (query.acknowledged !== undefined) {
        if (query.acknowledged) {
          whereClause.acknowledgedAt = { not: null };
        } else {
          whereClause.acknowledgedAt = null;
        }
      }

      if (query.escalationLevel !== undefined) {
        whereClause.escalationLevel = query.escalationLevel;
      }

      const alerts = await prisma.dateAlert.findMany({
        where: whereClause,
        include: {
          criticalDate: {
            include: {
              lease: {
                select: {
                  id: true,
                  leaseNumber: true,
                  tenant: { select: { name: true } },
                  property: { select: { name: true } }
                }
              },
              contract: {
                select: {
                  id: true,
                  contractNumber: true,
                  lease: {
                    select: {
                      tenant: { select: { name: true } },
                      property: { select: { name: true } }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledFor: 'asc' }
        ],
        take: query.limit || 100,
        skip: query.offset || 0
      });

      return alerts.map(alert => ({
        ...alert,
        daysUntilDue: Math.ceil(
          (new Date(alert.scheduledFor).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
        entityName: alert.criticalDate.lease ? 
          `${alert.criticalDate.lease.leaseNumber} - ${alert.criticalDate.lease.tenant?.name}` :
          `${alert.criticalDate.contract?.contractNumber}`,
        propertyName: alert.criticalDate.lease?.property?.name || 
          alert.criticalDate.contract?.lease?.property?.name
      }));
    } catch (error: unknown) {
      logger.error('Failed to search alerts', error);
      throw error;
    }
  }

  /**
   * Acknowledge alert and stop further escalations
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string, notes?: string): Promise<any> {
    try {
      const alert = await prisma.dateAlert.findUnique({
        where: { id: alertId },
        include: {
          criticalDate: true
        }
      });

      if (!alert) {
        throw new Error('Alert not found');
      }

      const updatedAlert = await prisma.dateAlert.update({
        where: { id: alertId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedBy,
          ...(notes && { 
            message: `${alert.message}\n\nAcknowledgement Notes: ${notes}` 
          })
        }
      });

      // Cancel any pending escalations for this critical date
      await prisma.dateAlert.updateMany({
        where: {
          criticalDateId: alert.criticalDateId,
          status: 'PENDING',
          scheduledFor: { gt: new Date() }
        },
        data: {
          status: 'DISMISSED'
        }
      });

      logger.info('Alert acknowledged', {
        alertId,
        acknowledgedBy,
        criticalDateId: alert.criticalDateId
      });

      return updatedAlert;
    } catch (error: unknown) {
      logger.error('Failed to acknowledge alert', error);
      throw error;
    }
  }

  /**
   * Mark critical date as completed
   */
  async completeCriticalDate(
    criticalDateId: string, 
    completedBy: string, 
    completionNotes?: string
  ): Promise<any> {
    try {
      const criticalDate = await prisma.criticalDate.update({
        where: { id: criticalDateId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          completedBy,
          notes: completionNotes ? 
            `${completionNotes}` : 
            'Marked as completed'
        }
      });

      // Cancel all pending alerts for this critical date
      await prisma.dateAlert.updateMany({
        where: {
          criticalDateId,
          status: { in: ['PENDING', 'SENT'] }
        },
        data: {
          status: 'DISMISSED'
        }
      });

      logger.info('Critical date completed', {
        criticalDateId,
        completedBy
      });

      return criticalDate;
    } catch (error: unknown) {
      logger.error('Failed to complete critical date', error);
      throw error;
    }
  }

  /**
   * Update critical date with new information
   */
  async updateCriticalDate(
    criticalDateId: string, 
    updates: Partial<CriticalDateCreationData>
  ): Promise<any> {
    try {
      const existingDate = await prisma.criticalDate.findUnique({
        where: { id: criticalDateId }
      });

      if (!existingDate) {
        throw new Error('Critical date not found');
      }

      const updatedDate = await prisma.criticalDate.update({
        where: { id: criticalDateId },
        data: {
          ...(updates.dateValue && { dateValue: updates.dateValue }),
          ...(updates.description && { description: updates.description }),
          ...(updates.importance && { importance: updates.importance as any }),
          ...(updates.alertDays && { alertDays: updates.alertDays }),
          ...(updates.escalationRules && { escalationRules: updates.escalationRules }),
          ...(updates.actionRequired && { actionRequired: updates.actionRequired }),
          ...(updates.notes && { notes: updates.notes }),
          updatedAt: new Date()
        }
      });

      // If date or alert configuration changed, reschedule alerts
      if (updates.dateValue || updates.alertDays || updates.escalationRules) {
        // Cancel existing pending alerts
        await prisma.dateAlert.updateMany({
          where: {
            criticalDateId,
            status: 'PENDING'
          },
          data: {
            status: 'CANCELLED'
          }
        });

        // Schedule new alerts
        await this.scheduleAlertsForDate(updatedDate);
      }

      logger.info('Critical date updated', {
        criticalDateId,
        changedFields: Object.keys(updates).length
      });

      return updatedDate;
    } catch (error: unknown) {
      logger.error('Failed to update critical date', error);
      throw error;
    }
  }

  /**
   * Generate critical date reports
   */
  async generateCriticalDateReport(
    organizationId: string, 
    reportType: string, 
    filters: any = {}
  ): Promise<any> {
    try {
      switch (reportType) {
        case 'UPCOMING_DEADLINES':
          return await this.generateUpcomingDeadlinesReport(organizationId, filters);
        case 'OVERDUE_ITEMS':
          return await this.generateOverdueItemsReport(organizationId, filters);
        case 'ESCALATION_SUMMARY':
          return await this.generateEscalationSummaryReport(organizationId, filters);
        case 'COMPLETION_ANALYSIS':
          return await this.generateCompletionAnalysisReport(organizationId, filters);
        default:
          throw new Error('Invalid report type');
      }
    } catch (error: unknown) {
      logger.error('Failed to generate critical date report', error);
      throw error;
    }
  }

  /**
   * Bulk update critical dates (e.g., for lease renewals)
   */
  async bulkUpdateCriticalDates(
    organizationId: string,
    updates: Array<{
      criticalDateId: string;
      changes: Partial<CriticalDateCreationData>;
    }>
  ): Promise<any> {
    try {
      const results = [];

      for (const update of updates) {
        try {
          const updatedDate = await this.updateCriticalDate(
            update.criticalDateId,
            update.changes
          );
          results.push({
            criticalDateId: update.criticalDateId,
            status: 'SUCCESS',
            updatedDate
          });
        } catch (error: unknown) {
          results.push({
            criticalDateId: update.criticalDateId,
            status: 'ERROR',
            error: error instanceof Error ? (error as Error).message : 'Unknown error'
          });
        }
      }

      logger.info('Bulk critical date update completed', {
        organizationId,
        totalUpdates: updates.length,
        successful: results.filter(r => r.status === 'SUCCESS').length,
        failed: results.filter(r => r.status === 'ERROR').length
      });

      return {
        summary: {
          total: updates.length,
          successful: results.filter(r => r.status === 'SUCCESS').length,
          failed: results.filter(r => r.status === 'ERROR').length
        },
        results
      };
    } catch (error: unknown) {
      logger.error('Failed to bulk update critical dates', error);
      throw error;
    }
  }

  // Private helper methods

  private async validateEntity(entityType: string, entityId: string): Promise<void> {
    switch (entityType) {
      case 'lease':
        const lease = await prisma.lease.findUnique({ where: { id: entityId } });
        if (!lease) {throw new Error('Lease not found');}
        break;
      case 'contract':
        const contract = await prisma.leaseContract.findUnique({ where: { id: entityId } });
        if (!contract) {throw new Error('Contract not found');}
        break;
      case 'property':
        const property = await prisma.property.findUnique({ where: { id: entityId } });
        if (!property) {throw new Error('Property not found');}
        break;
    }
  }

  private async scheduleAlertsForDate(criticalDate: any): Promise<void> {
    const alertDays = criticalDate.alertDays || [];
    const dateValue = new Date(criticalDate.dateValue);
    const alerts = [];

    for (const days of alertDays) {
      const alertDate = new Date(dateValue);
      alertDate.setDate(alertDate.getDate() - days);

      // Only schedule future alerts
      if (alertDate > new Date()) {
        alerts.push({
          criticalDateId: criticalDate.id,
          alertType: 'REMINDER',
          alertDate: new Date(),
          scheduledFor: alertDate,
          title: `Reminder: ${criticalDate.description}`,
          message: this.generateAlertMessage(criticalDate, days),
          priority: this.mapImportanceToPriority(criticalDate.importance),
          recipients: this.getDefaultRecipients(criticalDate),
          channels: ['EMAIL', 'DASHBOARD'],
          status: 'PENDING',
          escalationLevel: 0,
          maxEscalation: 3
        });
      }
    }

    if (alerts.length > 0) {
      await prisma.dateAlert.createMany({
        data: alerts
      });
    }
  }

  private async processAlertsForDate(criticalDate: any, currentDate: Date): Promise<any> {
    let alertsSent = 0;
    let escalations = 0;

    const dateValue = new Date(criticalDate.dateValue);
    const daysDifference = Math.ceil((dateValue.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check for scheduled alerts that need to be sent
    const pendingAlerts = await prisma.dateAlert.findMany({
      where: {
        criticalDateId: criticalDate.id,
        status: 'PENDING',
        scheduledFor: { lte: currentDate }
      },
      orderBy: { scheduledFor: 'asc' }
    });

    for (const alert of pendingAlerts) {
      // Send the alert (in a real system, this would integrate with email/SMS services)
      await prisma.dateAlert.update({
        where: { id: alert.id },
        data: {
          status: 'SENT',
          sentAt: currentDate
        }
      });

      alertsSent++;
      logger.info('Alert sent', {
        alertId: alert.id,
        criticalDateId: criticalDate.id,
        title: alert.title
      });
    }

    // Check for overdue items that need escalation
    if (daysDifference < 0) { // Date has passed
      const daysOverdue = Math.abs(daysDifference);
      const escalationRules = criticalDate.escalationRules as any;
      
      if (escalationRules?.levels) {
        const applicableRule = escalationRules.levels.find((rule: any) => 
          daysOverdue >= rule.daysOverdue
        );

        if (applicableRule) {
          const existingEscalation = await prisma.dateAlert.findFirst({
            where: {
              criticalDateId: criticalDate.id,
              escalationLevel: applicableRule.level,
              alertType: 'ESCALATION'
            }
          });

          if (!existingEscalation) {
            // Create escalation alert
            await prisma.dateAlert.create({
              data: {
                criticalDateId: criticalDate.id,
                alertType: 'ESCALATION',
                alertDate: currentDate,
                scheduledFor: currentDate,
                title: `ESCALATION Level ${applicableRule.level}: ${criticalDate.description}`,
                message: this.generateEscalationMessage(criticalDate, applicableRule.level, daysOverdue),
                priority: 'URGENT',
                recipients: applicableRule.recipients || [],
                channels: applicableRule.channels || ['EMAIL', 'DASHBOARD'],
                status: 'SENT',
                sentAt: currentDate,
                escalationLevel: applicableRule.level,
                escalatedAt: currentDate,
                maxEscalation: 3
              }
            });

            escalations++;
            logger.info('Escalation triggered', {
              criticalDateId: criticalDate.id,
              escalationLevel: applicableRule.level,
              daysOverdue
            });
          }
        }
      }
    }

    return { alertsSent, escalations };
  }

  private generateAlertMessage(criticalDate: any, daysBefore: number): string {
    return `This is a reminder that "${criticalDate.description}" is due in ${daysBefore} days on ${criticalDate.dateValue.toLocaleDateString()}.

${criticalDate.actionRequired ? `Action Required: ${criticalDate.actionRequired}` : ''}

Please ensure all necessary steps are completed before the due date.`;
  }

  private generateEscalationMessage(criticalDate: any, level: number, daysOverdue: number): string {
    return `ESCALATION LEVEL ${level}: The critical date "${criticalDate.description}" was due ${daysOverdue} days ago and remains incomplete.

Original Due Date: ${criticalDate.dateValue.toLocaleDateString()}
Days Overdue: ${daysOverdue}

${criticalDate.actionRequired ? `Required Action: ${criticalDate.actionRequired}` : ''}

Immediate attention is required to resolve this overdue item.`;
  }

  private mapImportanceToPriority(importance: string): string {
    switch (importance) {
      case 'CRITICAL': return 'URGENT';
      case 'HIGH': return 'HIGH';
      case 'MEDIUM': return 'MEDIUM';
      case 'LOW': return 'LOW';
      default: return 'MEDIUM';
    }
  }

  private getDefaultRecipients(criticalDate: any): string[] {
    // In a real system, this would determine recipients based on:
    // - Entity ownership
    // - Organizational hierarchy
    // - Configured notification rules
    return ['property.manager@company.com', 'lease.admin@company.com'];
  }

  private async generateUpcomingDeadlinesReport(organizationId: string, filters: any): Promise<any> {
    const daysAhead = filters.daysAhead || 90;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const upcomingDates = await prisma.criticalDate.findMany({
      where: {
        OR: [
          {
            lease: {
              property: { organizationId }
            }
          },
          {
            contract: {
              lease: {
                property: { organizationId }
              }
            }
          }
        ],
        dateValue: {
          gte: new Date(),
          lte: futureDate
        },
        isCompleted: false
      },
      include: {
        lease: {
          include: {
            tenant: true,
            property: true
          }
        },
        contract: {
          include: {
            lease: {
              include: {
                tenant: true,
                property: true
              }
            }
          }
        }
      },
      orderBy: { dateValue: 'asc' }
    });

    return {
      reportType: 'UPCOMING_DEADLINES',
      generatedDate: new Date(),
      parameters: { daysAhead, organizationId },
      summary: {
        totalUpcoming: upcomingDates.length,
        criticalItems: upcomingDates.filter(d => d.importance === 'CRITICAL').length,
        highPriorityItems: upcomingDates.filter(d => d.importance === 'HIGH').length
      },
      deadlines: upcomingDates.map(cd => ({
        id: cd.id,
        dateType: cd.dateType,
        description: cd.description,
        dateValue: cd.dateValue,
        importance: cd.importance,
        daysUntilDue: Math.ceil(
          (cd.dateValue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
        entityType: cd.lease ? 'lease' : 'contract',
        entityName: cd.lease ? 
          `${cd.lease.leaseNumber} - ${cd.lease.tenant?.name}` :
          `${cd.contract?.contractNumber}`,
        propertyName: cd.lease?.property?.name || cd.contract?.lease?.property?.name,
        actionRequired: cd.actionRequired
      }))
    };
  }

  private async generateOverdueItemsReport(organizationId: string, filters: any): Promise<any> {
    const overdueItems = await prisma.criticalDate.findMany({
      where: {
        OR: [
          {
            lease: {
              property: { organizationId }
            }
          },
          {
            contract: {
              lease: {
                property: { organizationId }
              }
            }
          }
        ],
        dateValue: { lt: new Date() },
        isCompleted: false
      },
      include: {
        lease: {
          include: {
            tenant: true,
            property: true
          }
        },
        contract: {
          include: {
            lease: {
              include: {
                tenant: true,
                property: true
              }
            }
          }
        },
        alerts: {
          where: { alertType: 'ESCALATION' },
          orderBy: { escalationLevel: 'desc' },
          take: 1
        }
      },
      orderBy: { dateValue: 'asc' }
    });

    return {
      reportType: 'OVERDUE_ITEMS',
      generatedDate: new Date(),
      summary: {
        totalOverdue: overdueItems.length,
        escalatedItems: overdueItems.filter(item => item.alerts.length > 0).length,
        averageDaysOverdue: overdueItems.length > 0 ? 
          overdueItems.reduce((sum, item) => {
            const daysOverdue = Math.ceil(
              (new Date().getTime() - item.dateValue.getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + daysOverdue;
          }, 0) / overdueItems.length : 0
      },
      overdueItems: overdueItems.map(cd => ({
        id: cd.id,
        dateType: cd.dateType,
        description: cd.description,
        dateValue: cd.dateValue,
        importance: cd.importance,
        daysOverdue: Math.ceil(
          (new Date().getTime() - cd.dateValue.getTime()) / (1000 * 60 * 60 * 24)
        ),
        currentEscalationLevel: cd.alerts[0]?.escalationLevel || 0,
        entityType: cd.lease ? 'lease' : 'contract',
        entityName: cd.lease ? 
          `${cd.lease.leaseNumber} - ${cd.lease.tenant?.name}` :
          `${cd.contract?.contractNumber}`,
        propertyName: cd.lease?.property?.name || cd.contract?.lease?.property?.name,
        actionRequired: cd.actionRequired
      }))
    };
  }

  private async generateEscalationSummaryReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for escalation summary report
    return {
      reportType: 'ESCALATION_SUMMARY',
      generatedDate: new Date(),
      // ... detailed escalation analysis
    };
  }

  private async generateCompletionAnalysisReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for completion analysis report
    return {
      reportType: 'COMPLETION_ANALYSIS',
      generatedDate: new Date(),
      // ... detailed completion analysis
    };
  }
}