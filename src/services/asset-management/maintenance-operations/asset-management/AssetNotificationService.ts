import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../config/logger';
import { AssetNotificationSettings, NotificationEscalationRule } from './types/AssetTypes';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

/**
 * AssetNotificationService - Handles all asset-related notifications and alerts
 * Manages stakeholder communications, escalation rules, and notification preferences
 * Part of the Asset Management domain within Turbo Asset IWMS
 */
export class AssetNotificationService extends EventEmitter {
  
  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Send notifications for new asset creation
   */
  async notifyAssetCreation(
    asset: any,
    settings: AssetNotificationSettings
  ): Promise<void> {
    try {
      const notifications = [];

      // Prepare notification data
      const notificationData = {
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.assetName,
        category: asset.category,
        location: asset.location,
        criticality: asset.criticality,
        value: asset.currentValue || asset.purchasePrice,
        createdAt: asset.createdAt,
      };

      // Facilities team notification
      if (settings.notifyFacilitiesTeam) {
        notifications.push(
          this.sendFacilitiesTeamNotification('ASSET_CREATED', notificationData)
        );
      }

      // Maintenance team notification for critical assets
      if (settings.notifyMaintenanceTeam) {
        notifications.push(
          this.sendMaintenanceTeamNotification('ASSET_CREATED', notificationData)
        );
      }

      // Finance team notification for high-value assets
      if (settings.notifyFinanceTeam) {
        notifications.push(
          this.sendFinanceTeamNotification('ASSET_CREATED', notificationData)
        );
      }

      // Custom recipients
      if (settings.customRecipients && settings.customRecipients.length > 0) {
        notifications.push(
          this.sendCustomNotifications('ASSET_CREATED', notificationData, settings.customRecipients)
        );
      }

      // Execute all notifications
      await Promise.allSettled(notifications);

      logger.info('Asset creation notifications sent', {
        assetId: asset.id,
        notificationsSent: notifications.length,
      });

    } catch (error) {
      logger.error('Failed to send asset creation notifications', {
        assetId: asset.id,
        error: error.message,
      });
      // Don't throw - notifications shouldn't fail asset creation
    }
  }

  /**
   * Send maintenance due notifications
   */
  async notifyMaintenanceDue(assetIds: string[]): Promise<void> {
    try {
      // Get assets with maintenance due
      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          id: { in: assetIds },
          nextMaintenanceDate: { lte: new Date() },
        },
        include: {
          preventiveMaintenance: {
            where: { status: 'ACTIVE' }
          }
        }
      });

      for (const asset of assets) {
        await this.sendMaintenanceDueNotification(asset);
      }

      logger.info('Maintenance due notifications processed', {
        assetsProcessed: assets.length,
      });

    } catch (error) {
      logger.error('Failed to send maintenance due notifications', {
        error: error.message,
      });
    }
  }

  /**
   * Send warranty expiration alerts
   */
  async notifyWarrantyExpiring(daysAhead: number = 30): Promise<void> {
    try {
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + daysAhead);

      const assets = await prisma.maintenanceAsset.findMany({
        where: {
          warrantyExpiry: {
            gte: new Date(),
            lte: alertDate,
          },
          status: 'OPERATIONAL',
        },
        select: {
          id: true,
          assetTag: true,
          assetName: true,
          manufacturer: true,
          model: true,
          warrantyExpiry: true,
          purchasePrice: true,
          organizationId: true,
        }
      });

      for (const asset of assets) {
        await this.sendWarrantyExpirationNotification(asset);
      }

      logger.info('Warranty expiration notifications sent', {
        assetsNotified: assets.length,
        daysAhead,
      });

    } catch (error) {
      logger.error('Failed to send warranty expiration notifications', {
        error: error.message,
      });
    }
  }

  /**
   * Send asset condition alerts
   */
  async notifyConditionChange(
    assetId: string,
    previousCondition: string,
    newCondition: string,
    changedBy: string
  ): Promise<void> {
    try {
      const asset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId },
        include: {
          organization: {
            select: { name: true }
          }
        }
      });

      if (!asset) {return;}

      const notificationData = {
        assetId,
        assetTag: asset.assetTag,
        assetName: asset.assetName,
        location: asset.location,
        previousCondition,
        newCondition,
        changedBy,
        criticality: asset.criticality,
        organizationName: asset.organization.name,
      };

      // Send to maintenance team if condition worsened
      if (this.isConditionWorsened(previousCondition, newCondition)) {
        await this.sendMaintenanceTeamNotification('CONDITION_DEGRADED', notificationData);
      }

      // Send to facilities team for any condition change
      await this.sendFacilitiesTeamNotification('CONDITION_CHANGED', notificationData);

      // Send urgent alerts for critical condition
      if (newCondition === 'CRITICAL') {
        await this.sendCriticalConditionAlert(notificationData);
      }

      logger.info('Condition change notifications sent', {
        assetId,
        previousCondition,
        newCondition,
      });

    } catch (error) {
      logger.error('Failed to send condition change notifications', {
        assetId,
        error: error.message,
      });
    }
  }

  /**
   * Send asset emergency notifications
   */
  async notifyEmergency(
    assetId: string,
    emergencyType: string,
    description: string,
    reportedBy: string
  ): Promise<void> {
    try {
      const asset = await prisma.maintenanceAsset.findUnique({
        where: { id: assetId },
        include: {
          organization: {
            select: { name: true }
          }
        }
      });

      if (!asset) {return;}

      const notificationData = {
        assetId,
        assetTag: asset.assetTag,
        assetName: asset.assetName,
        location: asset.location,
        criticality: asset.criticality,
        emergencyType,
        description,
        reportedBy,
        reportedAt: new Date(),
        organizationName: asset.organization.name,
      };

      // Immediate notifications to all relevant parties
      const emergencyNotifications = [
        this.sendEmergencyAlert(notificationData),
        this.sendMaintenanceTeamNotification('EMERGENCY', notificationData),
        this.sendFacilitiesTeamNotification('EMERGENCY', notificationData),
        this.notifyEmergencyContacts(notificationData),
      ];

      await Promise.allSettled(emergencyNotifications);

      // Set up escalation if needed
      await this.setupEmergencyEscalation(notificationData);

      logger.info('Emergency notifications sent', {
        assetId,
        emergencyType,
      });

    } catch (error) {
      logger.error('Failed to send emergency notifications', {
        assetId,
        emergencyType,
        error: error.message,
      });
    }
  }

  /**
   * Send bulk operation notifications
   */
  async notifyBulkOperation(
    operationType: string,
    results: {
      successful: number;
      failed: number;
      errors: any[];
    },
    organizationId: string,
    performedBy: string
  ): Promise<void> {
    try {
      const notificationData = {
        operationType,
        successful: results.successful,
        failed: results.failed,
        totalErrors: results.errors.length,
        performedBy,
        performedAt: new Date(),
      };

      // Send to system administrators
      await this.sendSystemAdminNotification('BULK_OPERATION', notificationData);

      // Send to facilities team if significant failures
      if (results.failed > 0 || results.errors.length > 0) {
        await this.sendFacilitiesTeamNotification('BULK_OPERATION_ISSUES', notificationData);
      }

      logger.info('Bulk operation notification sent', {
        operationType,
        organizationId,
        successful: results.successful,
        failed: results.failed,
      });

    } catch (error) {
      logger.error('Failed to send bulk operation notifications', {
        operationType,
        organizationId,
        error: error.message,
      });
    }
  }

  /**
   * Setup event handlers for asset events
   */
  private setupEventHandlers(): void {
    this.on('assetCreated', this.handleAssetCreated.bind(this));
    this.on('maintenanceDue', this.handleMaintenanceDue.bind(this));
    this.on('warrantyExpiring', this.handleWarrantyExpiring.bind(this));
    this.on('conditionChanged', this.handleConditionChanged.bind(this));
    this.on('emergency', this.handleEmergency.bind(this));
  }

  /**
   * Send notification to facilities team
   */
  private async sendFacilitiesTeamNotification(
    type: string,
    data: any
  ): Promise<void> {
    // Get facilities team members
    const facilitiesTeam = await this.getFacilitiesTeamMembers(data.organizationId || 'default');
    
    const message = this.formatNotificationMessage(type, data);
    
    for (const member of facilitiesTeam) {
      await this.sendNotification(member.email, message.subject, message.body, type);
    }
  }

  /**
   * Send notification to maintenance team
   */
  private async sendMaintenanceTeamNotification(
    type: string,
    data: any
  ): Promise<void> {
    const maintenanceTeam = await this.getMaintenanceTeamMembers(data.organizationId || 'default');
    
    const message = this.formatNotificationMessage(type, data);
    
    for (const member of maintenanceTeam) {
      await this.sendNotification(member.email, message.subject, message.body, type);
    }
  }

  /**
   * Send notification to finance team
   */
  private async sendFinanceTeamNotification(
    type: string,
    data: any
  ): Promise<void> {
    const financeTeam = await this.getFinanceTeamMembers(data.organizationId || 'default');
    
    const message = this.formatNotificationMessage(type, data);
    
    for (const member of financeTeam) {
      await this.sendNotification(member.email, message.subject, message.body, type);
    }
  }

  /**
   * Send notifications to custom recipients
   */
  private async sendCustomNotifications(
    type: string,
    data: any,
    recipients: string[]
  ): Promise<void> {
    const message = this.formatNotificationMessage(type, data);
    
    for (const recipient of recipients) {
      await this.sendNotification(recipient, message.subject, message.body, type);
    }
  }

  /**
   * Send maintenance due notification
   */
  private async sendMaintenanceDueNotification(asset: any): Promise<void> {
    const message = {
      subject: `Maintenance Due: ${asset.assetTag} - ${asset.assetName}`,
      body: `
        Asset: ${asset.assetName} (${asset.assetTag})
        Location: ${asset.location}
        Next Maintenance: ${asset.nextMaintenanceDate}
        Criticality: ${asset.criticality}
        
        Please schedule maintenance for this asset as soon as possible.
      `,
    };

    const maintenanceTeam = await this.getMaintenanceTeamMembers(asset.organizationId);
    for (const member of maintenanceTeam) {
      await this.sendNotification(member.email, message.subject, message.body, 'MAINTENANCE_DUE');
    }
  }

  /**
   * Send warranty expiration notification
   */
  private async sendWarrantyExpirationNotification(asset: any): Promise<void> {
    const daysUntilExpiry = Math.ceil(
      (asset.warrantyExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const message = {
      subject: `Warranty Expiring Soon: ${asset.assetTag}`,
      body: `
        Asset: ${asset.assetName} (${asset.assetTag})
        Manufacturer: ${asset.manufacturer}
        Model: ${asset.model}
        Warranty Expires: ${asset.warrantyExpiry}
        Days Remaining: ${daysUntilExpiry}
        Purchase Price: $${asset.purchasePrice?.toLocaleString() || 'N/A'}
        
        Please consider extended warranty or replacement options.
      `,
    };

    const financeTeam = await this.getFinanceTeamMembers(asset.organizationId);
    for (const member of financeTeam) {
      await this.sendNotification(member.email, message.subject, message.body, 'WARRANTY_EXPIRING');
    }
  }

  /**
   * Send critical condition alert
   */
  private async sendCriticalConditionAlert(data: any): Promise<void> {
    const message = {
      subject: `URGENT: Asset in Critical Condition - ${data.assetTag}`,
      body: `
        URGENT ATTENTION REQUIRED
        
        Asset: ${data.assetName} (${data.assetTag})
        Location: ${data.location}
        Previous Condition: ${data.previousCondition}
        Current Condition: CRITICAL
        Changed By: ${data.changedBy}
        
        This asset requires immediate attention to prevent further deterioration or safety hazards.
      `,
    };

    // Send to multiple teams for critical conditions
    const teams = [
      await this.getMaintenanceTeamMembers(data.organizationId),
      await this.getFacilitiesTeamMembers(data.organizationId),
      await this.getEmergencyContacts(data.organizationId),
    ].flat();

    for (const member of teams) {
      await this.sendNotification(member.email, message.subject, message.body, 'CRITICAL_CONDITION');
    }
  }

  /**
   * Send emergency alert
   */
  private async sendEmergencyAlert(data: any): Promise<void> {
    const message = {
      subject: `EMERGENCY: ${data.emergencyType} - ${data.assetTag}`,
      body: `
        EMERGENCY SITUATION
        
        Asset: ${data.assetName} (${data.assetTag})
        Location: ${data.location}
        Emergency Type: ${data.emergencyType}
        Description: ${data.description}
        Reported By: ${data.reportedBy}
        Reported At: ${data.reportedAt}
        
        Immediate response required.
      `,
    };

    const emergencyContacts = await this.getEmergencyContacts(data.organizationId);
    for (const contact of emergencyContacts) {
      await this.sendNotification(contact.email, message.subject, message.body, 'EMERGENCY', true);
    }
  }

  /**
   * Get facilities team members
   */
  private async getFacilitiesTeamMembers(organizationId: string): Promise<any[]> {
    try {
      return await prisma.user.findMany({
        where: {
          organizationId,
          roles: {
            some: {
              name: { in: ['facilities_manager', 'facilities_technician'] }
            }
          },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }
      });
    } catch (error) {
      logger.warn('Could not retrieve facilities team members', { organizationId });
      return [];
    }
  }

  /**
   * Get maintenance team members
   */
  private async getMaintenanceTeamMembers(organizationId: string): Promise<any[]> {
    try {
      return await prisma.user.findMany({
        where: {
          organizationId,
          roles: {
            some: {
              name: { in: ['maintenance_manager', 'maintenance_technician', 'technician'] }
            }
          },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }
      });
    } catch (error) {
      logger.warn('Could not retrieve maintenance team members', { organizationId });
      return [];
    }
  }

  /**
   * Get finance team members
   */
  private async getFinanceTeamMembers(organizationId: string): Promise<any[]> {
    try {
      return await prisma.user.findMany({
        where: {
          organizationId,
          roles: {
            some: {
              name: { in: ['finance_manager', 'finance_analyst', 'accountant'] }
            }
          },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }
      });
    } catch (error) {
      logger.warn('Could not retrieve finance team members', { organizationId });
      return [];
    }
  }

  /**
   * Get emergency contacts
   */
  private async getEmergencyContacts(organizationId: string): Promise<any[]> {
    try {
      return await prisma.user.findMany({
        where: {
          organizationId,
          roles: {
            some: {
              name: { in: ['emergency_contact', 'facility_manager', 'operations_manager'] }
            }
          },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }
      });
    } catch (error) {
      logger.warn('Could not retrieve emergency contacts', { organizationId });
      return [];
    }
  }

  /**
   * Format notification message based on type and data
   */
  private formatNotificationMessage(type: string, data: any): { subject: string; body: string } {
    switch (type) {
      case 'ASSET_CREATED':
        return {
          subject: `New Asset Added: ${data.assetTag}`,
          body: `A new asset has been added to the system:\n\nAsset: ${data.assetName} (${data.assetTag})\nCategory: ${data.category}\nLocation: ${data.location}\nCriticality: ${data.criticality}\nValue: $${data.value?.toLocaleString() || 'N/A'}`
        };
      default:
        return {
          subject: `Asset Notification: ${type}`,
          body: `Asset notification of type ${type} for asset ${data.assetTag || data.assetId}`
        };
    }
  }

  /**
   * Send actual notification (email, SMS, etc.)
   */
  private async sendNotification(
    recipient: string,
    subject: string,
    body: string,
    type: string,
    urgent: boolean = false
  ): Promise<void> {
    try {
      // This would integrate with actual notification services
      // For now, we'll log the notification
      logger.info('Notification sent', {
        recipient,
        subject,
        type,
        urgent,
      });

      // TODO: Integrate with email service, SMS service, etc.
      
    } catch (error) {
      logger.error('Failed to send notification', {
        recipient,
        subject,
        type,
        error: error.message,
      });
    }
  }

  /**
   * Check if condition worsened
   */
  private isConditionWorsened(previous: string, current: string): boolean {
    const conditionOrder = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'];
    const prevIndex = conditionOrder.indexOf(previous);
    const currIndex = conditionOrder.indexOf(current);
    return currIndex > prevIndex;
  }

  /**
   * Event handlers
   */
  private async handleAssetCreated(data: any): Promise<void> {
    await this.notifyAssetCreation(data.asset, data.settings);
  }

  private async handleMaintenanceDue(data: any): Promise<void> {
    await this.notifyMaintenanceDue(data.assetIds);
  }

  private async handleWarrantyExpiring(data: any): Promise<void> {
    await this.notifyWarrantyExpiring(data.daysAhead);
  }

  private async handleConditionChanged(data: any): Promise<void> {
    await this.notifyConditionChange(
      data.assetId,
      data.previousCondition,
      data.newCondition,
      data.changedBy
    );
  }

  private async handleEmergency(data: any): Promise<void> {
    await this.notifyEmergency(
      data.assetId,
      data.emergencyType,
      data.description,
      data.reportedBy
    );
  }

  /**
   * Setup emergency escalation
   */
  private async setupEmergencyEscalation(data: any): Promise<void> {
    // This would set up escalation timers and rules
    // For now, we'll just log the escalation setup
    logger.info('Emergency escalation setup', {
      assetId: data.assetId,
      emergencyType: data.emergencyType,
    });
  }

  /**
   * Notify emergency contacts
   */
  private async notifyEmergencyContacts(data: any): Promise<void> {
    const contacts = await this.getEmergencyContacts(data.organizationId);
    const message = {
      subject: `EMERGENCY: ${data.emergencyType} - ${data.assetTag}`,
      body: `Emergency situation requires immediate attention.\n\nAsset: ${data.assetName}\nLocation: ${data.location}\nType: ${data.emergencyType}\nDescription: ${data.description}`,
    };

    for (const contact of contacts) {
      await this.sendNotification(contact.email, message.subject, message.body, 'EMERGENCY', true);
    }
  }

  /**
   * Send system admin notification
   */
  private async sendSystemAdminNotification(type: string, data: any): Promise<void> {
    // This would send notifications to system administrators
    logger.info('System admin notification', { type, data });
  }
}