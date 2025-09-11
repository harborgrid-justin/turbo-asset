import { prisma } from '../../../../config/database';
import { logger } from '../../../../config/logger';

/**
 * Portfolio Alert Service - Manage alerts and notifications for portfolio events
 * Handles alert generation, notification distribution, and alert management
 * Part of the Portfolio Management domain within Turbo Asset IWMS
 */
export class PortfolioAlertService {

  /**
   * Generate portfolio alerts based on conditions and thresholds
   */
  async generatePortfolioAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    try {
      const alerts: PortfolioAlert[] = [];

      // Check various alert conditions in parallel
      const [
        leaseExpirationAlerts,
        occupancyAlerts,
        financialAlerts,
        maintenanceAlerts,
        complianceAlerts,
        performanceAlerts,
        riskAlerts
      ] = await Promise.all([
        this.checkLeaseExpirationAlerts(organizationId),
        this.checkOccupancyAlerts(organizationId),
        this.checkFinancialAlerts(organizationId),
        this.checkMaintenanceAlerts(organizationId),
        this.checkComplianceAlerts(organizationId),
        this.checkPerformanceAlerts(organizationId),
        this.checkRiskAlerts(organizationId)
      ]);

      alerts.push(
        ...leaseExpirationAlerts,
        ...occupancyAlerts,
        ...financialAlerts,
        ...maintenanceAlerts,
        ...complianceAlerts,
        ...performanceAlerts,
        ...riskAlerts
      );

      // Sort alerts by priority and severity
      alerts.sort((a, b) => {
        const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Store alerts in database
      for (const alert of alerts) {
        await this.storeAlert(alert);
      }

      logger.info('Portfolio alerts generated', {
        organizationId,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.priority === 'CRITICAL').length,
      });

      return alerts;

    } catch (error: unknown) {
      logger.error('Failed to generate portfolio alerts', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get active alerts for organization
   */
  async getActiveAlerts(organizationId: string, filters?: AlertFilters): Promise<PortfolioAlert[]> {
    try {
      const whereClause: any = {
        organizationId,
        status: 'ACTIVE',
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.severity && { severity: filters.severity }),
      };

      if (filters?.startDate || filters?.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) {whereClause.createdAt.gte = filters.startDate;}
        if (filters.endDate) {whereClause.createdAt.lte = filters.endDate;}
      }

      const alerts = await prisma.portfolioAlert.findMany({
        where: whereClause,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: filters?.limit || 100,
      });

      return alerts.map(alert => this.mapToPortfolioAlert(alert));

    } catch (error: unknown) {
      logger.error('Failed to get active alerts', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
    notes?: string
  ): Promise<PortfolioAlert> {
    try {
      const alert = await prisma.portfolioAlert.update({
        where: { id: alertId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedBy,
          acknowledgedAt: new Date(),
          notes,
        },
      });

      // Log alert acknowledgment
      await this.logAlertActivity(alertId, 'ACKNOWLEDGED', acknowledgedBy, notes);

      logger.info('Alert acknowledged', {
        alertId,
        acknowledgedBy,
      });

      return this.mapToPortfolioAlert(alert);

    } catch (error: unknown) {
      logger.error('Failed to acknowledge alert', {
        alertId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolution: string,
    preventiveMeasures?: string
  ): Promise<PortfolioAlert> {
    try {
      const alert = await prisma.portfolioAlert.update({
        where: { id: alertId },
        data: {
          status: 'RESOLVED',
          resolvedBy,
          resolvedAt: new Date(),
          resolution,
          preventiveMeasures,
        },
      });

      // Log alert resolution
      await this.logAlertActivity(alertId, 'RESOLVED', resolvedBy, resolution);

      // Check if this resolution triggers any follow-up actions
      await this.processAlertResolution(alert);

      logger.info('Alert resolved', {
        alertId,
        resolvedBy,
        resolution,
      });

      return this.mapToPortfolioAlert(alert);

    } catch (error: unknown) {
      logger.error('Failed to resolve alert', {
        alertId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get alert statistics and trends
   */
  async getAlertStatistics(
    organizationId: string,
    timeframe: string = 'month'
  ): Promise<AlertStatistics> {
    try {
      const period = this.getStatisticsPeriod(timeframe);
      
      const [
        totalAlerts,
        activeAlerts,
        acknowledgedAlerts,
        resolvedAlerts,
        alertsByPriority,
        alertsByCategory,
        alertTrends,
        responseTimeStats,
        resolutionTimeStats
      ] = await Promise.all([
        this.getTotalAlertsCount(organizationId, period),
        this.getActiveAlertsCount(organizationId),
        this.getAcknowledgedAlertsCount(organizationId, period),
        this.getResolvedAlertsCount(organizationId, period),
        this.getAlertsByPriority(organizationId, period),
        this.getAlertsByCategory(organizationId, period),
        this.getAlertTrends(organizationId, period),
        this.getResponseTimeStatistics(organizationId, period),
        this.getResolutionTimeStatistics(organizationId, period)
      ]);

      const statistics: AlertStatistics = {
        organizationId,
        timeframe,
        period,
        totalAlerts,
        activeAlerts,
        acknowledgedAlerts,
        resolvedAlerts,
        acknowledgedRate: totalAlerts > 0 ? (acknowledgedAlerts / totalAlerts) * 100 : 0,
        resolutionRate: totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 0,
        alertsByPriority,
        alertsByCategory,
        alertTrends,
        responseTimeStats,
        resolutionTimeStats,
        topAlertSources: await this.getTopAlertSources(organizationId, period),
        escalatedAlerts: await this.getEscalatedAlertsCount(organizationId, period),
      };

      return statistics;

    } catch (error: unknown) {
      logger.error('Failed to get alert statistics', {
        organizationId,
        timeframe,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Set up alert rules and thresholds
   */
  async configureAlertRules(
    organizationId: string,
    rules: AlertRule[]
  ): Promise<AlertRule[]> {
    try {
      const configuredRules: AlertRule[] = [];

      for (const rule of rules) {
        // Validate rule configuration
        this.validateAlertRule(rule);

        // Store or update rule in database
        const savedRule = await prisma.portfolioAlertRule.upsert({
          where: {
            organizationId_ruleType_metric: {
              organizationId,
              ruleType: rule.ruleType,
              metric: rule.metric,
            }
          },
          create: {
            organizationId,
            ruleType: rule.ruleType,
            metric: rule.metric,
            threshold: rule.threshold,
            condition: rule.condition,
            priority: rule.priority,
            enabled: rule.enabled,
            notifications: rule.notifications,
            customMessage: rule.customMessage,
            createdBy: rule.createdBy,
          },
          update: {
            threshold: rule.threshold,
            condition: rule.condition,
            priority: rule.priority,
            enabled: rule.enabled,
            notifications: rule.notifications,
            customMessage: rule.customMessage,
            updatedBy: rule.createdBy,
            updatedAt: new Date(),
          },
        });

        configuredRules.push(this.mapToAlertRule(savedRule));
      }

      logger.info('Alert rules configured', {
        organizationId,
        rulesConfigured: configuredRules.length,
      });

      return configuredRules;

    } catch (error: unknown) {
      logger.error('Failed to configure alert rules', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send alert notifications
   */
  async sendAlertNotifications(alert: PortfolioAlert): Promise<void> {
    try {
      // Get notification rules for this alert type
      const notificationRules = await this.getNotificationRules(
        alert.organizationId,
        alert.category,
        alert.priority
      );

      for (const rule of notificationRules) {
        try {
          switch (rule.channel) {
            case 'EMAIL':
              await this.sendEmailNotification(alert, rule);
              break;
            case 'SMS':
              await this.sendSMSNotification(alert, rule);
              break;
            case 'PUSH':
              await this.sendPushNotification(alert, rule);
              break;
            case 'WEBHOOK':
              await this.sendWebhookNotification(alert, rule);
              break;
          }

          // Log successful notification
          await this.logNotificationSent(alert.id, rule.channel, rule.recipients);

        } catch (notificationError) {
          logger.error('Failed to send notification', {
            alertId: alert.id,
            channel: rule.channel,
            error: notificationError.message,
          });
        }
      }

    } catch (error: unknown) {
      logger.error('Failed to send alert notifications', {
        alertId: alert.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Private helper methods for alert checking
   */

  private async checkLeaseExpirationAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    const alerts: PortfolioAlert[] = [];
    
    // Check for leases expiring within 30, 60, and 90 days
    const expirationPeriods = [30, 60, 90];
    
    for (const days of expirationPeriods) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days);
      
      const expiringLeases = await prisma.lease.findMany({
        where: {
          organizationId,
          endDate: {
            gte: new Date(),
            lte: cutoffDate,
          },
          status: 'ACTIVE',
        },
        include: {
          tenant: { select: { name: true } },
          space: { select: { name: true, area: true } },
        },
      });

      for (const lease of expiringLeases) {
        const daysToExpiration = Math.ceil(
          (lease.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        let priority: AlertPriority = 'LOW';
        if (daysToExpiration <= 30) {priority = 'CRITICAL';}
        else if (daysToExpiration <= 60) {priority = 'HIGH';}
        else {priority = 'MEDIUM';}

        alerts.push({
          id: `lease_exp_${lease.id}`,
          organizationId,
          category: 'LEASE_EXPIRATION',
          priority,
          severity: 'MEDIUM',
          title: `Lease Expiring Soon: ${lease.tenant.name}`,
          description: `Lease for ${lease.tenant.name} in ${lease.space.name} expires in ${daysToExpiration} days`,
          source: 'SYSTEM',
          status: 'ACTIVE',
          createdAt: new Date(),
          metadata: {
            leaseId: lease.id,
            tenantName: lease.tenant.name,
            spaceName: lease.space.name,
            expirationDate: lease.endDate,
            daysToExpiration,
            monthlyRent: lease.monthlyRent,
            area: lease.space.area,
          },
          actionRequired: true,
          autoResolve: false,
        });
      }
    }

    return alerts;
  }

  private async checkOccupancyAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    const alerts: PortfolioAlert[] = [];
    
    // Check for low occupancy rates
    const occupancyRate = await this.calculateCurrentOccupancyRate(organizationId);
    const occupancyThreshold = await this.getOccupancyThreshold(organizationId);
    
    if (occupancyRate < occupancyThreshold) {
      alerts.push({
        id: `occupancy_low_${Date.now()}`,
        organizationId,
        category: 'OCCUPANCY',
        priority: 'HIGH',
        severity: 'HIGH',
        title: 'Low Portfolio Occupancy Rate',
        description: `Portfolio occupancy rate of ${occupancyRate.toFixed(1)}% is below threshold of ${occupancyThreshold}%`,
        source: 'SYSTEM',
        status: 'ACTIVE',
        createdAt: new Date(),
        metadata: {
          currentOccupancyRate: occupancyRate,
          threshold: occupancyThreshold,
          deficit: occupancyThreshold - occupancyRate,
        },
        actionRequired: true,
        autoResolve: false,
      });
    }

    return alerts;
  }

  private async checkFinancialAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    const alerts: PortfolioAlert[] = [];
    
    // Check for budget variances
    const budgetVariance = await this.calculateCurrentBudgetVariance(organizationId);
    const varianceThreshold = 10; // 10% variance threshold
    
    if (Math.abs(budgetVariance) > varianceThreshold) {
      const priority: AlertPriority = Math.abs(budgetVariance) > 20 ? 'CRITICAL' : 'HIGH';
      
      alerts.push({
        id: `budget_variance_${Date.now()}`,
        organizationId,
        category: 'FINANCIAL',
        priority,
        severity: priority,
        title: 'Significant Budget Variance',
        description: `Budget variance of ${budgetVariance.toFixed(1)}% exceeds threshold`,
        source: 'SYSTEM',
        status: 'ACTIVE',
        createdAt: new Date(),
        metadata: {
          budgetVariance,
          threshold: varianceThreshold,
          isOverBudget: budgetVariance > 0,
        },
        actionRequired: true,
        autoResolve: false,
      });
    }

    return alerts;
  }

  private async checkMaintenanceAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    const alerts: PortfolioAlert[] = [];
    
    // Check for overdue maintenance
    const overdueCount = await this.getOverdueMaintenanceCount(organizationId);
    
    if (overdueCount > 0) {
      const priority: AlertPriority = overdueCount > 10 ? 'CRITICAL' : 'HIGH';
      
      alerts.push({
        id: `maintenance_overdue_${Date.now()}`,
        organizationId,
        category: 'MAINTENANCE',
        priority,
        severity: 'HIGH',
        title: 'Overdue Maintenance Items',
        description: `${overdueCount} maintenance items are overdue`,
        source: 'SYSTEM',
        status: 'ACTIVE',
        createdAt: new Date(),
        metadata: {
          overdueCount,
        },
        actionRequired: true,
        autoResolve: false,
      });
    }

    return alerts;
  }

  private async checkComplianceAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    const alerts: PortfolioAlert[] = [];
    
    // Check for compliance violations
    const violations = await this.getComplianceViolations(organizationId);
    
    for (const violation of violations) {
      alerts.push({
        id: `compliance_${violation.id}`,
        organizationId,
        category: 'COMPLIANCE',
        priority: 'CRITICAL',
        severity: 'CRITICAL',
        title: `Compliance Violation: ${violation.type}`,
        description: violation.description,
        source: 'SYSTEM',
        status: 'ACTIVE',
        createdAt: new Date(),
        metadata: violation,
        actionRequired: true,
        autoResolve: false,
      });
    }

    return alerts;
  }

  private async checkPerformanceAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    const alerts: PortfolioAlert[] = [];
    
    // Check for performance degradation
    const performanceMetrics = await this.getCurrentPerformanceMetrics(organizationId);
    const thresholds = await this.getPerformanceThresholds(organizationId);
    
    for (const [metric, value] of Object.entries(performanceMetrics)) {
      const threshold = thresholds[metric];
      if (threshold && value < threshold) {
        alerts.push({
          id: `performance_${metric}_${Date.now()}`,
          organizationId,
          category: 'PERFORMANCE',
          priority: 'MEDIUM',
          severity: 'MEDIUM',
          title: `Performance Alert: ${metric}`,
          description: `${metric} performance (${value}) is below threshold (${threshold})`,
          source: 'SYSTEM',
          status: 'ACTIVE',
          createdAt: new Date(),
          metadata: {
            metric,
            currentValue: value,
            threshold,
            deficit: threshold - value,
          },
          actionRequired: true,
          autoResolve: false,
        });
      }
    }

    return alerts;
  }

  private async checkRiskAlerts(organizationId: string): Promise<PortfolioAlert[]> {
    const alerts: PortfolioAlert[] = [];
    
    // Check for identified risks
    const risks = await this.getHighRiskItems(organizationId);
    
    for (const risk of risks) {
      alerts.push({
        id: `risk_${risk.id}`,
        organizationId,
        category: 'RISK',
        priority: risk.severity === 'HIGH' ? 'CRITICAL' : 'HIGH',
        severity: risk.severity,
        title: `Risk Alert: ${risk.type}`,
        description: risk.description,
        source: 'SYSTEM',
        status: 'ACTIVE',
        createdAt: new Date(),
        metadata: risk,
        actionRequired: true,
        autoResolve: false,
      });
    }

    return alerts;
  }

  // Additional helper methods...
  private async storeAlert(alert: PortfolioAlert): Promise<void> {
    await prisma.portfolioAlert.upsert({
      where: { id: alert.id },
      create: {
        id: alert.id,
        organizationId: alert.organizationId,
        category: alert.category,
        priority: alert.priority,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        source: alert.source,
        status: alert.status,
        metadata: alert.metadata,
        actionRequired: alert.actionRequired,
        autoResolve: alert.autoResolve,
        createdAt: alert.createdAt,
      },
      update: {
        priority: alert.priority,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        metadata: alert.metadata,
        updatedAt: new Date(),
      },
    });
  }

  private mapToPortfolioAlert(dbAlert: any): PortfolioAlert {
    return {
      id: dbAlert.id,
      organizationId: dbAlert.organizationId,
      category: dbAlert.category,
      priority: dbAlert.priority,
      severity: dbAlert.severity,
      title: dbAlert.title,
      description: dbAlert.description,
      source: dbAlert.source,
      status: dbAlert.status,
      createdAt: dbAlert.createdAt,
      acknowledgedAt: dbAlert.acknowledgedAt,
      acknowledgedBy: dbAlert.acknowledgedBy,
      resolvedAt: dbAlert.resolvedAt,
      resolvedBy: dbAlert.resolvedBy,
      resolution: dbAlert.resolution,
      metadata: dbAlert.metadata,
      actionRequired: dbAlert.actionRequired,
      autoResolve: dbAlert.autoResolve,
      notes: dbAlert.notes,
    };
  }

  private mapToAlertRule(dbRule: any): AlertRule {
    return {
      id: dbRule.id,
      organizationId: dbRule.organizationId,
      ruleType: dbRule.ruleType,
      metric: dbRule.metric,
      threshold: dbRule.threshold,
      condition: dbRule.condition,
      priority: dbRule.priority,
      enabled: dbRule.enabled,
      notifications: dbRule.notifications,
      customMessage: dbRule.customMessage,
      createdBy: dbRule.createdBy,
      createdAt: dbRule.createdAt,
    };
  }

  // Placeholder implementations for helper methods
  private getStatisticsPeriod(timeframe: string): { start: Date; end: Date } {
    const now = new Date();
    switch (timeframe) {
      case 'week':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      case 'month':
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        return { start: new Date(now.getFullYear(), quarterStart, 1), end: now };
      default:
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    }
  }

  // Additional placeholder methods (implementations would be added)
  private async getTotalAlertsCount(organizationId: string, period: any): Promise<number> { return 0; }
  private async getActiveAlertsCount(organizationId: string): Promise<number> { return 0; }
  private async getAcknowledgedAlertsCount(organizationId: string, period: any): Promise<number> { return 0; }
  private async getResolvedAlertsCount(organizationId: string, period: any): Promise<number> { return 0; }
  private async getAlertsByPriority(organizationId: string, period: any): Promise<any> { return {}; }
  private async getAlertsByCategory(organizationId: string, period: any): Promise<any> { return {}; }
  private async getAlertTrends(organizationId: string, period: any): Promise<any[]> { return []; }
  private async getResponseTimeStatistics(organizationId: string, period: any): Promise<any> { return {}; }
  private async getResolutionTimeStatistics(organizationId: string, period: any): Promise<any> { return {}; }
  private async getTopAlertSources(organizationId: string, period: any): Promise<any[]> { return []; }
  private async getEscalatedAlertsCount(organizationId: string, period: any): Promise<number> { return 0; }
  
  private validateAlertRule(rule: AlertRule): void {
    if (!rule.metric || !rule.threshold || !rule.condition) {
      throw new Error('Invalid alert rule configuration');
    }
  }

  private async logAlertActivity(alertId: string, action: string, userId: string, notes?: string): Promise<void> {
    // Log alert activity
  }

  private async processAlertResolution(alert: any): Promise<void> {
    // Process any follow-up actions after alert resolution
  }

  private async getNotificationRules(organizationId: string, category: string, priority: string): Promise<any[]> {
    return [];
  }

  private async sendEmailNotification(alert: PortfolioAlert, rule: any): Promise<void> {
    // Send email notification
  }

  private async sendSMSNotification(alert: PortfolioAlert, rule: any): Promise<void> {
    // Send SMS notification
  }

  private async sendPushNotification(alert: PortfolioAlert, rule: any): Promise<void> {
    // Send push notification
  }

  private async sendWebhookNotification(alert: PortfolioAlert, rule: any): Promise<void> {
    // Send webhook notification
  }

  private async logNotificationSent(alertId: string, channel: string, recipients: string[]): Promise<void> {
    // Log notification sent
  }

  private async calculateCurrentOccupancyRate(organizationId: string): Promise<number> { return 0; }
  private async getOccupancyThreshold(organizationId: string): Promise<number> { return 80; }
  private async calculateCurrentBudgetVariance(organizationId: string): Promise<number> { return 0; }
  private async getOverdueMaintenanceCount(organizationId: string): Promise<number> { return 0; }
  private async getComplianceViolations(organizationId: string): Promise<any[]> { return []; }
  private async getCurrentPerformanceMetrics(organizationId: string): Promise<any> { return {}; }
  private async getPerformanceThresholds(organizationId: string): Promise<any> { return {}; }
  private async getHighRiskItems(organizationId: string): Promise<any[]> { return []; }
}

// Type definitions
type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
type AlertCategory = 'LEASE_EXPIRATION' | 'OCCUPANCY' | 'FINANCIAL' | 'MAINTENANCE' | 'COMPLIANCE' | 'PERFORMANCE' | 'RISK' | 'SYSTEM';

interface PortfolioAlert {
  id: string;
  organizationId: string;
  category: AlertCategory;
  priority: AlertPriority;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  status: AlertStatus;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  metadata: any;
  actionRequired: boolean;
  autoResolve: boolean;
  notes?: string;
}

interface AlertFilters {
  priority?: AlertPriority;
  category?: AlertCategory;
  severity?: AlertSeverity;
  status?: AlertStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface AlertStatistics {
  organizationId: string;
  timeframe: string;
  period: { start: Date; end: Date };
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  acknowledgedRate: number;
  resolutionRate: number;
  alertsByPriority: any;
  alertsByCategory: any;
  alertTrends: any[];
  responseTimeStats: any;
  resolutionTimeStats: any;
  topAlertSources: any[];
  escalatedAlerts: number;
}

interface AlertRule {
  id?: string;
  organizationId: string;
  ruleType: string;
  metric: string;
  threshold: number;
  condition: string;
  priority: AlertPriority;
  enabled: boolean;
  notifications: any;
  customMessage?: string;
  createdBy: string;
  createdAt?: Date;
}