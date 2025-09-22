import { PrismaClient } from '@prisma/client';
import { logger } from '@/config/logger';
import { 
  AssetWorkOrderRequest,
  AssetMaintenanceSchedule,
  WorkOrderType,
  WorkOrderPriority,
  MaintenanceType
} from './types/AssetTypes';

const prisma = new PrismaClient();

/**
 * AssetWorkOrderService - Manages work orders and maintenance scheduling for assets
 * Handles work order creation, scheduling, and maintenance lifecycle management
 * Part of the Asset Management domain within Turbo Asset IWMS
 */
export class AssetWorkOrderService {

  /**
   * Schedule initial maintenance for newly created assets
   */
  async scheduleInitialMaintenance(
    assetId: string,
    schedule: {
      interval: number;
      nextDue: Date;
      type: MaintenanceType;
      priority: WorkOrderPriority;
    }
  ): Promise<AssetMaintenanceSchedule> {
    try {
      const maintenanceSchedule = await prisma.preventiveMaintenance.create({
        data: {
          assetId,
          interval: schedule.interval,
          nextDue: schedule.nextDue,
          type: schedule.type,
          priority: schedule.priority,
          description: `Initial ${schedule.type.toLowerCase()} maintenance schedule`,
          status: 'ACTIVE',
          createdBy: 'SYSTEM',
        },
        include: {
          asset: {
            select: {
              assetTag: true,
              assetName: true,
              criticality: true,
            }
          }
        }
      });

      logger.info('Initial maintenance scheduled for asset', {
        assetId,
        scheduleId: maintenanceSchedule.id,
        nextDue: schedule.nextDue,
        interval: schedule.interval,
      });

      return this.mapToMaintenanceSchedule(maintenanceSchedule);

    } catch (error: unknown) {
      logger.error('Failed to schedule initial maintenance', {
        assetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create work order for asset maintenance
   */
  async createWorkOrder(workOrderRequest: AssetWorkOrderRequest): Promise<any> {
    try {
      const workOrder = await prisma.workOrder.create({
        data: {
          assetId: workOrderRequest.assetId,
          type: workOrderRequest.type,
          priority: workOrderRequest.priority,
          description: workOrderRequest.description,
          status: 'PENDING',
          scheduledDate: workOrderRequest.scheduledDate,
          estimatedDuration: workOrderRequest.estimatedDuration,
          assignedTo: workOrderRequest.assignedTo,
          requiredSkills: workOrderRequest.requiredSkills || [],
          createdBy: 'SYSTEM',
          createdAt: new Date(),
        },
        include: {
          asset: {
            select: {
              assetTag: true,
              assetName: true,
              location: true,
              criticality: true,
            }
          }
        }
      });

      // Create parts requirements if specified
      if (workOrderRequest.requiredParts && workOrderRequest.requiredParts.length > 0) {
        await this.createPartsRequirements(workOrder.id, workOrderRequest.requiredParts);
      }

      // Auto-assign based on skills and availability if not specified
      if (!workOrderRequest.assignedTo && workOrderRequest.requiredSkills) {
        await this.autoAssignTechnician(workOrder.id, workOrderRequest.requiredSkills);
      }

      logger.info('Work order created for asset', {
        workOrderId: workOrder.id,
        assetId: workOrderRequest.assetId,
        type: workOrderRequest.type,
        priority: workOrderRequest.priority,
      });

      return workOrder;

    } catch (error: unknown) {
      logger.error('Failed to create work order', {
        assetId: workOrderRequest.assetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create emergency work order for urgent issues
   */
  async createEmergencyWorkOrder(
    assetId: string,
    description: string,
    createdBy: string,
    urgentIssues: string[] = []
  ): Promise<any[]> {
    try {
      const workOrders = [];

      // Create main emergency work order
      const mainWorkOrder = await this.createWorkOrder({
        assetId,
        type: WorkOrderType.EMERGENCY,
        priority: WorkOrderPriority.EMERGENCY,
        description: `EMERGENCY: ${description}`,
        assignedTo: undefined, // Will be auto-assigned
        requiredSkills: ['emergency_response', 'troubleshooting'],
        requiredParts: [],
      });

      workOrders.push(mainWorkOrder);

      // Create additional work orders for specific urgent issues
      for (let i = 0; i < urgentIssues.length; i++) {
        const issue = urgentIssues[i];
        const additionalWorkOrder = await this.createWorkOrder({
          assetId,
          type: WorkOrderType.CORRECTIVE,
          priority: WorkOrderPriority.URGENT,
          description: `Urgent Issue ${i + 1}: ${issue}`,
          assignedTo: undefined,
          requiredSkills: ['troubleshooting', 'repair'],
          requiredParts: [],
        });
        workOrders.push(additionalWorkOrder);
      }

      // Create asset incident record
      await this.createAssetIncident(assetId, description, urgentIssues, createdBy);

      logger.info('Emergency work orders created', {
        assetId,
        mainWorkOrderId: mainWorkOrder.id,
        totalWorkOrders: workOrders.length,
        urgentIssuesCount: urgentIssues.length,
      });

      return workOrders;

    } catch (error: unknown) {
      logger.error('Failed to create emergency work orders', {
        assetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Clone maintenance schedules from one asset to another
   */
  async cloneMaintenanceSchedules(
    sourceAssetId: string,
    targetAssetId: string,
    createdBy: string
  ): Promise<AssetMaintenanceSchedule[]> {
    try {
      // Get all active maintenance schedules from source asset
      const sourceSchedules = await prisma.preventiveMaintenance.findMany({
        where: {
          assetId: sourceAssetId,
          status: 'ACTIVE',
        }
      });

      const clonedSchedules = [];

      for (const sourceSchedule of sourceSchedules) {
        // Calculate next due date for the cloned schedule
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + sourceSchedule.interval);

        const clonedSchedule = await prisma.preventiveMaintenance.create({
          data: {
            assetId: targetAssetId,
            interval: sourceSchedule.interval,
            nextDue,
            type: sourceSchedule.type,
            priority: sourceSchedule.priority,
            description: `${sourceSchedule.description} (Cloned)`,
            status: 'ACTIVE',
            createdBy,
          },
          include: {
            asset: {
              select: {
                assetTag: true,
                assetName: true,
              }
            }
          }
        });

        clonedSchedules.push(this.mapToMaintenanceSchedule(clonedSchedule));
      }

      logger.info('Maintenance schedules cloned', {
        sourceAssetId,
        targetAssetId,
        schedulesCloned: clonedSchedules.length,
      });

      return clonedSchedules;

    } catch (error: unknown) {
      logger.error('Failed to clone maintenance schedules', {
        sourceAssetId,
        targetAssetId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update work order status and handle lifecycle events
   */
  async updateWorkOrderStatus(
    workOrderId: string,
    status: string,
    updatedBy: string,
    completionNotes?: string,
    actualDuration?: number,
    actualCost?: number
  ): Promise<any> {
    try {
      const workOrder = await prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
          status,
          updatedBy,
          updatedAt: new Date(),
          completionNotes,
          actualDuration,
          actualCost,
          completedAt: status === 'COMPLETED' ? new Date() : undefined,
        },
        include: {
          asset: true,
        }
      });

      // Handle status-specific logic
      await this.handleWorkOrderStatusChange(workOrder, status, updatedBy);

      logger.info('Work order status updated', {
        workOrderId,
        status,
        assetId: workOrder.assetId,
      });

      return workOrder;

    } catch (error: unknown) {
      logger.error('Failed to update work order status', {
        workOrderId,
        status,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate recurring maintenance work orders based on schedules
   */
  async generateScheduledWorkOrders(organizationId: string): Promise<any[]> {
    try {
      // Find all preventive maintenance schedules that are due
      const dueSchedules = await prisma.preventiveMaintenance.findMany({
        where: {
          status: 'ACTIVE',
          nextDue: {
            lte: new Date(),
          },
          asset: {
            organizationId,
            status: 'OPERATIONAL',
          },
        },
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              assetName: true,
              criticality: true,
              location: true,
            }
          }
        }
      });

      const generatedWorkOrders = [];

      for (const schedule of dueSchedules) {
        // Create work order for this maintenance schedule
        const workOrder = await this.createWorkOrder({
          assetId: schedule.assetId,
          type: WorkOrderType.PREVENTIVE,
          priority: this.mapCriticalityToPriority(schedule.asset.criticality),
          description: `Scheduled ${schedule.type.toLowerCase()} maintenance: ${schedule.description}`,
          assignedTo: undefined, // Will be auto-assigned
          requiredSkills: this.getRequiredSkillsForMaintenanceType(schedule.type),
          requiredParts: [],
        });

        generatedWorkOrders.push(workOrder);

        // Update the schedule's next due date
        const nextDue = new Date(schedule.nextDue);
        nextDue.setDate(nextDue.getDate() + schedule.interval);

        await prisma.preventiveMaintenance.update({
          where: { id: schedule.id },
          data: { nextDue },
        });

        logger.debug('Scheduled work order generated', {
          workOrderId: workOrder.id,
          assetId: schedule.assetId,
          scheduleId: schedule.id,
          nextDue,
        });
      }

      logger.info('Scheduled work orders generated', {
        organizationId,
        workOrdersGenerated: generatedWorkOrders.length,
      });

      return generatedWorkOrders;

    } catch (error: unknown) {
      logger.error('Failed to generate scheduled work orders', {
        organizationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create parts requirements for work order
   */
  private async createPartsRequirements(workOrderId: string, parts: any[]): Promise<void> {
    const partsData = parts.map(part => ({
      workOrderId,
      partNumber: part.partNumber,
      partName: part.partName,
      quantity: part.quantity,
      estimatedCost: part.estimatedCost,
      isStocked: part.isStocked || false,
      status: 'REQUESTED',
    }));

    await prisma.workOrderPart.createMany({
      data: partsData,
    });
  }

  /**
   * Auto-assign technician based on skills and availability
   */
  private async autoAssignTechnician(workOrderId: string, requiredSkills: string[]): Promise<void> {
    try {
      // Find available technicians with required skills
      // This would typically query a technician/user table with skills
      // For now, we'll implement a basic assignment strategy
      
      // TODO: Implement sophisticated technician assignment algorithm
      // considering skills, workload, location, etc.
      
    } catch (error: unknown) {
      logger.warn('Auto-assignment failed, work order remains unassigned', {
        workOrderId,
        requiredSkills,
      });
    }
  }

  /**
   * Create asset incident record for emergency situations
   */
  private async createAssetIncident(
    assetId: string,
    description: string,
    urgentIssues: string[],
    reportedBy: string
  ): Promise<void> {
    await prisma.assetIncident.create({
      data: {
        assetId,
        title: 'Emergency Incident',
        description,
        severity: 'CRITICAL',
        status: 'OPEN',
        reportedBy,
        reportedAt: new Date(),
        urgentIssues: urgentIssues.join('; '),
      },
    });
  }

  /**
   * Handle work order status change events
   */
  private async handleWorkOrderStatusChange(
    workOrder: any,
    status: string,
    updatedBy: string
  ): Promise<void> {
    switch (status) {
      case 'COMPLETED':
        await this.handleWorkOrderCompletion(workOrder, updatedBy);
        break;
      case 'CANCELLED':
        await this.handleWorkOrderCancellation(workOrder, updatedBy);
        break;
      case 'IN_PROGRESS':
        await this.handleWorkOrderStart(workOrder, updatedBy);
        break;
    }
  }

  /**
   * Handle work order completion
   */
  private async handleWorkOrderCompletion(workOrder: any, completedBy: string): Promise<void> {
    // Update asset's last maintenance date
    await prisma.maintenanceAsset.update({
      where: { id: workOrder.assetId },
      data: {
        lastMaintenanceDate: new Date(),
        condition: this.determinePostMaintenanceCondition(workOrder),
        status: 'OPERATIONAL', // Assuming maintenance fixes issues
      },
    });

    // Create maintenance history record
    await prisma.maintenanceHistory.create({
      data: {
        assetId: workOrder.assetId,
        workOrderId: workOrder.id,
        maintenanceType: workOrder.type,
        completedDate: new Date(),
        completedBy,
        duration: workOrder.actualDuration,
        cost: workOrder.actualCost,
        notes: workOrder.completionNotes,
      },
    });
  }

  /**
   * Handle work order cancellation
   */
  private async handleWorkOrderCancellation(workOrder: any, cancelledBy: string): Promise<void> {
    // Log cancellation reason and reschedule if necessary
    logger.info('Work order cancelled', {
      workOrderId: workOrder.id,
      assetId: workOrder.assetId,
      cancelledBy,
    });

    // If this was a preventive maintenance, may need to reschedule
    if (workOrder.type === WorkOrderType.PREVENTIVE) {
      // Logic to reschedule could go here
    }
  }

  /**
   * Handle work order start
   */
  private async handleWorkOrderStart(workOrder: any, startedBy: string): Promise<void> {
    // Update asset status to maintenance if needed
    if (workOrder.type === WorkOrderType.EMERGENCY || workOrder.priority === WorkOrderPriority.EMERGENCY) {
      await prisma.maintenanceAsset.update({
        where: { id: workOrder.assetId },
        data: { status: 'MAINTENANCE' },
      });
    }
  }

  /**
   * Map database record to maintenance schedule interface
   */
  private mapToMaintenanceSchedule(record: any): AssetMaintenanceSchedule {
    return {
      id: record.id,
      assetId: record.assetId,
      interval: record.interval,
      nextDue: record.nextDue,
      type: record.type,
      priority: record.priority,
      description: record.description,
      isActive: record.status === 'ACTIVE',
      createdBy: record.createdBy,
      createdAt: record.createdAt,
    };
  }

  /**
   * Map asset criticality to work order priority
   */
  private mapCriticalityToPriority(criticality: string): WorkOrderPriority {
    switch (criticality.toUpperCase()) {
      case 'CRITICAL':
        return WorkOrderPriority.HIGH;
      case 'HIGH':
        return WorkOrderPriority.HIGH;
      case 'MEDIUM':
        return WorkOrderPriority.MEDIUM;
      case 'LOW':
        return WorkOrderPriority.LOW;
      default:
        return WorkOrderPriority.MEDIUM;
    }
  }

  /**
   * Get required skills for maintenance type
   */
  private getRequiredSkillsForMaintenanceType(type: string): string[] {
    switch (type.toUpperCase()) {
      case 'PREVENTIVE':
        return ['preventive_maintenance', 'inspection'];
      case 'PREDICTIVE':
        return ['predictive_analysis', 'condition_monitoring'];
      case 'CONDITION_BASED':
        return ['condition_assessment', 'diagnostics'];
      default:
        return ['general_maintenance'];
    }
  }

  /**
   * Determine post-maintenance asset condition
   */
  private determinePostMaintenanceCondition(workOrder: any): string {
    // This would typically be more sophisticated
    if (workOrder.type === WorkOrderType.EMERGENCY) {
      return 'FAIR'; // Emergency repairs usually restore to fair condition
    }
    if (workOrder.type === WorkOrderType.PREVENTIVE) {
      return 'GOOD'; // Preventive maintenance maintains good condition
    }
    return 'GOOD'; // Default assumption
  }
}