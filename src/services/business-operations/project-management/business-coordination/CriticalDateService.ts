/**
 * Critical Date Service - Enterprise Date Management and Monitoring
 * 
 * Comprehensive service for managing critical dates across all business operations
 * including notifications, escalations, and workflow automation.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../config/logger';
import { prisma } from '../../../../config/database';
import {
  CriticalDate,
  CriticalDateNotification,
  CriticalDateAction,
  ICriticalDateService,
  BusinessOperationsContext
} from './types';
import {
  CRITICAL_DATE_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  BUSINESS_OPERATIONS_CONFIG
} from './constants';

export class CriticalDateService extends EventEmitter implements ICriticalDateService {
  private cache = new Map<string, CriticalDate>();
  private notificationScheduler = new Map<string, NodeJS.Timeout>();
  private readonly cacheTTL = BUSINESS_OPERATIONS_CONFIG.CACHING.CRITICAL_DATE_CACHE_TTL * 1000;

  constructor(private context: BusinessOperationsContext) {
    super();
    logger.info('Critical Date Service initialized', {
      organizationId: context.organizationId,
      userId: context.userId
    });

    // Start background monitoring
    this.startBackgroundMonitoring();
  }

  async createCriticalDate(data: Partial<CriticalDate>): Promise<CriticalDate> {
    try {
      this.validateCriticalDateData(data);
      
      const criticalDate: CriticalDate = {
        id: '',
        organizationId: this.context.organizationId,
        entityType: data.entityType!,
        entityId: data.entityId!,
        entityName: data.entityName!,
        dateType: data.dateType!,
        criticalDate: data.criticalDate!,
        description: data.description!,
        importance: data.importance || 'MEDIUM',
        category: data.category || 'OTHER',
        responsible: data.responsible!,
        backupContact: data.backupContact,
        status: 'UPCOMING',
        notifications: [],
        actions: [],
        dependencies: data.dependencies || [],
        tags: data.tags || [],
        createdBy: this.context.userId,
        createdDate: new Date(),
        lastUpdated: new Date()
      };

      // Generate default notifications based on importance
      criticalDate.notifications = this.generateDefaultNotifications(criticalDate);

      const savedCriticalDate = await this.saveCriticalDate(criticalDate);
      this.cache.set(savedCriticalDate.id, savedCriticalDate);

      // Schedule notifications
      this.scheduleNotifications(savedCriticalDate);

      this.emit('criticalDateCreated', {
        type: 'CRITICAL_DATE_CREATED',
        entityType: 'CRITICAL_DATE',
        entityId: savedCriticalDate.id,
        data: savedCriticalDate,
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Critical date created', {
        criticalDateId: savedCriticalDate.id,
        entityType: savedCriticalDate.entityType,
        criticalDate: savedCriticalDate.criticalDate
      });

      return savedCriticalDate;
      
    } catch (error) {
      logger.error('Failed to create critical date', error);
      throw new Error(`Failed to create critical date: ${(error as Error).message}`);
    }
  }

  async getCriticalDate(id: string): Promise<CriticalDate | null> {
    try {
      const cached = this.cache.get(id);
      if (cached) return cached;

      const criticalDate = await this.loadCriticalDate(id);
      if (criticalDate) {
        this.cache.set(id, criticalDate);
      }
      return criticalDate;
      
    } catch (error) {
      logger.error('Failed to get critical date', { criticalDateId: id, error });
      throw new Error(`Failed to get critical date: ${(error as Error).message}`);
    }
  }

  async updateCriticalDate(id: string, data: Partial<CriticalDate>): Promise<CriticalDate> {
    try {
      const existingCriticalDate = await this.getCriticalDate(id);
      if (!existingCriticalDate) {
        throw new Error('Critical date not found');
      }

      this.validateCriticalDateUpdateData(data, existingCriticalDate);

      const updatedCriticalDate = {
        ...existingCriticalDate,
        ...data,
        lastUpdated: new Date()
      };

      const savedCriticalDate = await this.saveCriticalDate(updatedCriticalDate);
      this.cache.set(id, savedCriticalDate);

      // Reschedule notifications if date changed
      if (data.criticalDate) {
        this.cancelNotifications(id);
        this.scheduleNotifications(savedCriticalDate);
      }

      this.emit('criticalDateUpdated', {
        type: 'CRITICAL_DATE_UPDATED',
        entityType: 'CRITICAL_DATE',
        entityId: id,
        data: savedCriticalDate,
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Critical date updated', { criticalDateId: id });
      return savedCriticalDate;
      
    } catch (error) {
      logger.error('Failed to update critical date', { criticalDateId: id, error });
      throw new Error(`Failed to update critical date: ${(error as Error).message}`);
    }
  }

  async deleteCriticalDate(id: string): Promise<boolean> {
    try {
      const criticalDate = await this.getCriticalDate(id);
      if (!criticalDate) {
        throw new Error('Critical date not found');
      }

      if (criticalDate.status === 'COMPLETED') {
        throw new Error('Cannot delete completed critical date');
      }

      // Cancel scheduled notifications
      this.cancelNotifications(id);

      await this.removeCriticalDate(id);
      this.cache.delete(id);

      this.emit('criticalDateDeleted', {
        type: 'CRITICAL_DATE_DELETED',
        entityType: 'CRITICAL_DATE',
        entityId: id,
        data: { criticalDateId: id },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Critical date deleted', { criticalDateId: id });
      return true;
      
    } catch (error) {
      logger.error('Failed to delete critical date', { criticalDateId: id, error });
      throw new Error(`Failed to delete critical date: ${(error as Error).message}`);
    }
  }

  async getUpcomingDates(days: number): Promise<CriticalDate[]> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const criticalDates = await this.searchCriticalDatesInDatabase({
        organizationId: this.context.organizationId,
        criticalDate: {
          gte: startDate,
          lte: endDate
        },
        status: ['UPCOMING', 'NOTIFIED', 'ACTION_REQUIRED']
      });

      // Sort by date and importance
      const sortedDates = criticalDates.sort((a, b) => {
        const dateCompare = a.criticalDate.getTime() - b.criticalDate.getTime();
        if (dateCompare !== 0) return dateCompare;
        
        // If dates are the same, sort by importance
        const importanceOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        return importanceOrder[a.importance] - importanceOrder[b.importance];
      });

      logger.info('Upcoming critical dates retrieved', {
        days,
        count: sortedDates.length
      });

      return sortedDates;
      
    } catch (error) {
      logger.error('Failed to get upcoming dates', { days, error });
      throw new Error(`Failed to get upcoming dates: ${(error as Error).message}`);
    }
  }

  async getOverdueDates(): Promise<CriticalDate[]> {
    try {
      const today = new Date();

      const overdueDates = await this.searchCriticalDatesInDatabase({
        organizationId: this.context.organizationId,
        criticalDate: {
          lt: today
        },
        status: ['UPCOMING', 'NOTIFIED', 'ACTION_REQUIRED', 'OVERDUE']
      });

      // Update status to OVERDUE if not already
      for (const date of overdueDates) {
        if (date.status !== 'OVERDUE') {
          await this.updateCriticalDate(date.id, { status: 'OVERDUE' });
        }
      }

      logger.info('Overdue critical dates retrieved', {
        count: overdueDates.length
      });

      return overdueDates;
      
    } catch (error) {
      logger.error('Failed to get overdue dates', error);
      throw new Error(`Failed to get overdue dates: ${(error as Error).message}`);
    }
  }

  async sendNotifications(dateId: string): Promise<boolean> {
    try {
      const criticalDate = await this.getCriticalDate(dateId);
      if (!criticalDate) {
        throw new Error('Critical date not found');
      }

      const pendingNotifications = criticalDate.notifications.filter(
        notification => notification.status === 'PENDING' &&
        new Date() >= new Date(criticalDate.criticalDate.getTime() - notification.triggerDays * 24 * 60 * 60 * 1000)
      );

      let successCount = 0;

      for (const notification of pendingNotifications) {
        try {
          await this.sendNotification(notification, criticalDate);
          notification.status = 'SENT';
          notification.sentDate = new Date();
          successCount++;
        } catch (error) {
          logger.error('Failed to send notification', {
            notificationId: notification.id,
            error
          });
          notification.status = 'FAILED';
        }
      }

      if (successCount > 0) {
        // Update critical date status if notifications were sent
        if (criticalDate.status === 'UPCOMING') {
          criticalDate.status = 'NOTIFIED';
        }

        await this.saveCriticalDate(criticalDate);
        this.cache.set(dateId, criticalDate);

        this.emit('notificationsSent', {
          type: 'CRITICAL_DATE_NOTIFICATIONS_SENT',
          entityType: 'CRITICAL_DATE_NOTIFICATION',
          entityId: dateId,
          data: { criticalDateId: dateId, notificationCount: successCount },
          timestamp: new Date(),
          userId: this.context.userId,
          organizationId: this.context.organizationId
        });
      }

      logger.info('Critical date notifications sent', {
        criticalDateId: dateId,
        successCount,
        totalCount: pendingNotifications.length
      });

      return successCount > 0;
      
    } catch (error) {
      logger.error('Failed to send notifications', { dateId, error });
      throw new Error(`Failed to send notifications: ${(error as Error).message}`);
    }
  }

  async escalateOverdue(dateId: string): Promise<boolean> {
    try {
      const criticalDate = await this.getCriticalDate(dateId);
      if (!criticalDate) {
        throw new Error('Critical date not found');
      }

      if (criticalDate.status !== 'OVERDUE') {
        return false; // Not overdue, no escalation needed
      }

      // Create escalation notification
      const escalationNotification: CriticalDateNotification = {
        id: this.generateNotificationId(),
        criticalDateId: dateId,
        notificationType: 'EMAIL',
        trigger: 'ESCALATION',
        triggerDays: 0,
        recipients: this.getEscalationRecipients(criticalDate),
        message: this.generateEscalationMessage(criticalDate),
        status: 'PENDING'
      };

      criticalDate.notifications.push(escalationNotification);
      
      // Send escalation notification
      await this.sendNotification(escalationNotification, criticalDate);
      escalationNotification.status = 'SENT';
      escalationNotification.sentDate = new Date();

      // Create escalation action
      const escalationAction: CriticalDateAction = {
        id: this.generateActionId(),
        criticalDateId: dateId,
        actionType: 'APPROVAL',
        description: 'Escalated overdue critical date requires immediate attention',
        assignedTo: criticalDate.backupContact || 'SYSTEM_ADMIN',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'PENDING',
        priority: 'CRITICAL'
      };

      criticalDate.actions.push(escalationAction);

      await this.saveCriticalDate(criticalDate);
      this.cache.set(dateId, criticalDate);

      this.emit('overdueEscalated', {
        type: 'CRITICAL_DATE_ESCALATED',
        entityType: 'CRITICAL_DATE',
        entityId: dateId,
        data: { criticalDate, escalationAction },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Critical date escalated', { criticalDateId: dateId });
      return true;
      
    } catch (error) {
      logger.error('Failed to escalate overdue date', { dateId, error });
      throw new Error(`Failed to escalate: ${(error as Error).message}`);
    }
  }

  async markCompleted(dateId: string): Promise<CriticalDate> {
    try {
      const criticalDate = await this.getCriticalDate(dateId);
      if (!criticalDate) {
        throw new Error('Critical date not found');
      }

      if (criticalDate.status === 'COMPLETED') {
        return criticalDate; // Already completed
      }

      // Complete all pending actions
      criticalDate.actions.forEach(action => {
        if (action.status === 'PENDING' || action.status === 'IN_PROGRESS') {
          action.status = 'COMPLETED';
          action.completedDate = new Date();
          action.completedBy = this.context.userId;
        }
      });

      // Cancel any pending notifications
      this.cancelNotifications(dateId);

      const updatedCriticalDate = await this.updateCriticalDate(dateId, {
        status: 'COMPLETED'
      });

      this.emit('criticalDateCompleted', {
        type: 'CRITICAL_DATE_COMPLETED',
        entityType: 'CRITICAL_DATE',
        entityId: dateId,
        data: updatedCriticalDate,
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Critical date marked completed', { criticalDateId: dateId });
      return updatedCriticalDate;
      
    } catch (error) {
      logger.error('Failed to mark critical date completed', { dateId, error });
      throw new Error(`Failed to mark completed: ${(error as Error).message}`);
    }
  }

  async addAction(dateId: string, actionData: Partial<CriticalDateAction>): Promise<CriticalDateAction> {
    try {
      const criticalDate = await this.getCriticalDate(dateId);
      if (!criticalDate) {
        throw new Error('Critical date not found');
      }

      this.validateActionData(actionData);

      const action: CriticalDateAction = {
        id: this.generateActionId(),
        criticalDateId: dateId,
        actionType: actionData.actionType!,
        description: actionData.description!,
        assignedTo: actionData.assignedTo!,
        dueDate: actionData.dueDate!,
        status: 'PENDING',
        priority: actionData.priority || 'MEDIUM'
      };

      criticalDate.actions.push(action);
      
      // Update critical date status if needed
      if (criticalDate.status === 'UPCOMING' || criticalDate.status === 'NOTIFIED') {
        criticalDate.status = 'ACTION_REQUIRED';
      }

      await this.saveCriticalDate(criticalDate);
      this.cache.set(dateId, criticalDate);

      this.emit('actionAdded', {
        type: 'CRITICAL_DATE_ACTION_ADDED',
        entityType: 'CRITICAL_DATE_ACTION',
        entityId: action.id,
        data: { criticalDateId: dateId, action },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Action added to critical date', {
        criticalDateId: dateId,
        actionId: action.id
      });

      return action;
      
    } catch (error) {
      logger.error('Failed to add action', { dateId, error });
      throw new Error(`Failed to add action: ${(error as Error).message}`);
    }
  }

  async generateDashboard(): Promise<any> {
    try {
      const today = new Date();
      const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [
        overdueDates,
        thisWeekDates,
        thisMonthDates,
        allUpcoming
      ] = await Promise.all([
        this.getOverdueDates(),
        this.getUpcomingDates(7),
        this.getUpcomingDates(30),
        this.getUpcomingDates(365)
      ]);

      const dashboard = {
        summary: {
          totalUpcoming: allUpcoming.length,
          overdue: overdueDates.length,
          thisWeek: thisWeekDates.length,
          thisMonth: thisMonthDates.length,
          critical: allUpcoming.filter(d => d.importance === 'CRITICAL').length,
          high: allUpcoming.filter(d => d.importance === 'HIGH').length
        },

        byEntityType: this.groupByEntityType(allUpcoming),
        byCategory: this.groupByCategory(allUpcoming),
        byResponsible: this.groupByResponsible(allUpcoming),

        priorityActions: overdueDates
          .concat(allUpcoming.filter(d => d.importance === 'CRITICAL'))
          .slice(0, 10),

        upcomingMilestones: thisWeekDates
          .filter(d => d.category === 'MILESTONE')
          .slice(0, 5),

        trends: {
          overdueRate: allUpcoming.length > 0 ? (overdueDates.length / allUpcoming.length) * 100 : 0,
          completionRate: await this.calculateCompletionRate(),
          averageLeadTime: await this.calculateAverageLeadTime()
        },

        recommendations: this.generateDashboardRecommendations({
          overdue: overdueDates.length,
          thisWeek: thisWeekDates.length,
          critical: allUpcoming.filter(d => d.importance === 'CRITICAL').length
        }),

        generatedAt: new Date(),
        organizationId: this.context.organizationId
      };

      logger.info('Critical dates dashboard generated', {
        totalUpcoming: dashboard.summary.totalUpcoming,
        overdue: dashboard.summary.overdue
      });

      return dashboard;
      
    } catch (error) {
      logger.error('Failed to generate dashboard', error);
      throw new Error(`Failed to generate dashboard: ${(error as Error).message}`);
    }
  }

  // === PRIVATE HELPER METHODS ===

  private validateCriticalDateData(data: Partial<CriticalDate>): void {
    if (!data.entityType) throw new Error('Entity type is required');
    if (!data.entityId) throw new Error('Entity ID is required');
    if (!data.entityName) throw new Error('Entity name is required');
    if (!data.dateType) throw new Error('Date type is required');
    if (!data.criticalDate) throw new Error('Critical date is required');
    if (!data.description) throw new Error('Description is required');
    if (!data.responsible) throw new Error('Responsible person is required');

    if (new Date(data.criticalDate) < new Date()) {
      throw new Error('Critical date cannot be in the past');
    }
  }

  private validateCriticalDateUpdateData(data: Partial<CriticalDate>, existing: CriticalDate): void {
    if (existing.status === 'COMPLETED') {
      throw new Error('Cannot modify completed critical date');
    }
  }

  private validateActionData(data: Partial<CriticalDateAction>): void {
    if (!data.actionType) throw new Error('Action type is required');
    if (!data.description) throw new Error('Action description is required');
    if (!data.assignedTo) throw new Error('Action must be assigned to someone');
    if (!data.dueDate) throw new Error('Action due date is required');
  }

  private generateDefaultNotifications(criticalDate: CriticalDate): CriticalDateNotification[] {
    const notifications: CriticalDateNotification[] = [];
    const notificationPeriods = CRITICAL_DATE_CONFIG.DEFAULT_NOTIFICATION_PERIODS[criticalDate.importance];

    notificationPeriods.forEach(days => {
      notifications.push({
        id: this.generateNotificationId(),
        criticalDateId: criticalDate.id,
        notificationType: 'EMAIL',
        trigger: 'ADVANCE_NOTICE',
        triggerDays: days,
        recipients: [criticalDate.responsible],
        message: this.generateNotificationMessage(criticalDate, days),
        status: 'PENDING'
      });
    });

    return notifications;
  }

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNotificationMessage(criticalDate: CriticalDate, days: number): string {
    const daysText = days === 1 ? 'tomorrow' : `in ${days} days`;
    return `Critical date reminder: ${criticalDate.description} is due ${daysText}. Please review and take necessary action.`;
  }

  private generateEscalationMessage(criticalDate: CriticalDate): string {
    return `ESCALATION: Critical date "${criticalDate.description}" is overdue and requires immediate attention. Original responsible: ${criticalDate.responsible}`;
  }

  private getEscalationRecipients(criticalDate: CriticalDate): string[] {
    const recipients = [criticalDate.responsible];
    
    if (criticalDate.backupContact) {
      recipients.push(criticalDate.backupContact);
    }
    
    // Add management or admin contacts based on importance
    if (criticalDate.importance === 'CRITICAL') {
      recipients.push('SYSTEM_ADMIN'); // Would be actual admin emails
    }
    
    return recipients;
  }

  private async sendNotification(notification: CriticalDateNotification, criticalDate: CriticalDate): Promise<void> {
    // Simplified notification sending - would integrate with actual notification service
    logger.info('Sending notification', {
      notificationId: notification.id,
      type: notification.notificationType,
      recipients: notification.recipients
    });

    // Simulate notification sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private scheduleNotifications(criticalDate: CriticalDate): void {
    criticalDate.notifications
      .filter(notification => notification.status === 'PENDING')
      .forEach(notification => {
        const triggerDate = new Date(
          criticalDate.criticalDate.getTime() - notification.triggerDays * 24 * 60 * 60 * 1000
        );

        if (triggerDate > new Date()) {
          const timeout = setTimeout(() => {
            this.sendNotifications(criticalDate.id);
          }, triggerDate.getTime() - Date.now());

          this.notificationScheduler.set(`${criticalDate.id}_${notification.id}`, timeout);
        }
      });
  }

  private cancelNotifications(dateId: string): void {
    this.notificationScheduler.forEach((timeout, key) => {
      if (key.startsWith(dateId)) {
        clearTimeout(timeout);
        this.notificationScheduler.delete(key);
      }
    });
  }

  private startBackgroundMonitoring(): void {
    // Check for overdue dates every hour
    setInterval(async () => {
      try {
        await this.monitorOverdueDates();
      } catch (error) {
        logger.error('Background monitoring error', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  private async monitorOverdueDates(): Promise<void> {
    const overdueDates = await this.getOverdueDates();
    
    for (const date of overdueDates) {
      // Check if escalation is needed
      const daysSinceOverdue = Math.ceil(
        (Date.now() - date.criticalDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceOverdue >= CRITICAL_DATE_CONFIG.ESCALATION_RULES.OVERDUE_ESCALATION_DAYS) {
        await this.escalateOverdue(date.id);
      }
    }
  }

  private groupByEntityType(dates: CriticalDate[]): any {
    const groups: { [key: string]: number } = {};
    
    dates.forEach(date => {
      groups[date.entityType] = (groups[date.entityType] || 0) + 1;
    });

    return Object.entries(groups).map(([entityType, count]) => ({
      entityType,
      count
    }));
  }

  private groupByCategory(dates: CriticalDate[]): any {
    const groups: { [key: string]: number } = {};
    
    dates.forEach(date => {
      groups[date.category] = (groups[date.category] || 0) + 1;
    });

    return Object.entries(groups).map(([category, count]) => ({
      category,
      count
    }));
  }

  private groupByResponsible(dates: CriticalDate[]): any {
    const groups: { [key: string]: number } = {};
    
    dates.forEach(date => {
      groups[date.responsible] = (groups[date.responsible] || 0) + 1;
    });

    return Object.entries(groups).map(([responsible, count]) => ({
      responsible,
      count
    }));
  }

  private async calculateCompletionRate(): Promise<number> {
    // Simplified - would calculate from actual completion data
    return 85.5;
  }

  private async calculateAverageLeadTime(): Promise<number> {
    // Simplified - would calculate from actual data
    return 15.3; // Average days from creation to due date
  }

  private generateDashboardRecommendations(stats: any): string[] {
    const recommendations: string[] = [];
    
    if (stats.overdue > 5) {
      recommendations.push('High number of overdue items - implement stricter monitoring');
    }
    
    if (stats.thisWeek > 20) {
      recommendations.push('Heavy workload this week - consider resource reallocation');
    }
    
    if (stats.critical > 3) {
      recommendations.push('Multiple critical items pending - prioritize immediate action');
    }
    
    return recommendations;
  }

  // Database operations (simplified for demo)
  private async saveCriticalDate(criticalDate: CriticalDate): Promise<CriticalDate> {
    criticalDate.id = criticalDate.id || `criticaldate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return criticalDate;
  }

  private async loadCriticalDate(id: string): Promise<CriticalDate | null> {
    return null;
  }

  private async removeCriticalDate(id: string): Promise<void> {
    // Would delete from database
  }

  private async searchCriticalDatesInDatabase(criteria: any): Promise<CriticalDate[]> {
    return [];
  }
}