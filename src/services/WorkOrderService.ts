import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface WorkOrderData {
  workOrderNumber?: string;
  title: string;
  description?: string;
  priority: string;
  type: string;
  category?: string;
  assetId?: string;
  location: string;
  building?: string;
  floor?: string;
  room?: string;
  requestedDate: Date;
  scheduledDate?: Date;
  dueDate?: Date;
  assignedTo?: string;
  assignedTechnician?: string;
  assignedTeam?: string;
  estimatedHours?: number;
  estimatedCost?: number;
  requiresApproval?: boolean;
  preventiveMaintenanceId?: string;
  parentWorkOrderId?: string;
  organizationId: string;
  createdBy: string;
}

export interface WorkOrderTaskData {
  workOrderId: string;
  taskNumber: number;
  title: string;
  description?: string;
  priority: string;
  assignedTo?: string;
  estimatedHours?: number;
  startDate?: Date;
  dueDate?: Date;
  dependsOnTaskId?: string;
  instructions?: string;
  safetyNotes?: string;
  skillsRequired: string[];
  toolsRequired: string[];
}

export interface WorkOrderMaterialData {
  workOrderId: string;
  inventoryItemId?: string;
  itemName: string;
  description?: string;
  quantity: number;
  unitOfMeasure: string;
  unitCost: number;
  requestedDate: Date;
}

export interface WorkOrderFilters {
  status?: string;
  priority?: string;
  type?: string;
  assignedTo?: string;
  assetId?: string;
  location?: string;
  building?: string;
  dateFrom?: Date;
  dateTo?: Date;
  overdueOnly?: boolean;
  organizationId: string;
}

export interface WorkOrderMetrics {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  overdueWorkOrders: number;
  avgCompletionTime: number;
  workOrdersByPriority: { [priority: string]: number };
  workOrdersByStatus: { [status: string]: number };
  workOrdersByType: { [type: string]: number };
  avgCostPerWorkOrder: number;
  totalLaborHours: number;
  technicianWorkload: Array<{
    technicianId: string;
    technicianName: string;
    activeWorkOrders: number;
    totalHours: number;
    utilizationRate: number;
  }>;
}

export interface TechnicianSchedule {
  technicianId: string;
  technicianName: string;
  workOrders: Array<{
    workOrderId: string;
    title: string;
    priority: string;
    scheduledDate: Date;
    estimatedHours: number;
    location: string;
    status: string;
  }>;
  totalScheduledHours: number;
  availableHours: number;
  utilizationRate: number;
}

/**
 * WorkOrderService - Comprehensive work order management system
 * Handles work order lifecycle, task management, and technician scheduling
 * Supports mobile technician app integration
 */
export class WorkOrderService {

  /**
   * Create a new work order
   */
  async createWorkOrder(workOrderData: WorkOrderData): Promise<any> {
    try {
      // Generate work order number if not provided
      if (!workOrderData.workOrderNumber) {
        workOrderData.workOrderNumber = await this.generateWorkOrderNumber(workOrderData.organizationId);
      }

      const workOrder = await prisma.workOrder.create({
        data: {
          workOrderNumber: workOrderData.workOrderNumber,
          title: workOrderData.title,
          description: workOrderData.description,
          priority: workOrderData.priority as any,
          status: 'DRAFT',
          type: workOrderData.type as any,
          category: workOrderData.category,
          assetId: workOrderData.assetId,
          location: workOrderData.location,
          building: workOrderData.building,
          floor: workOrderData.floor,
          room: workOrderData.room,
          requestedDate: workOrderData.requestedDate,
          scheduledDate: workOrderData.scheduledDate,
          dueDate: workOrderData.dueDate,
          assignedTo: workOrderData.assignedTo,
          assignedTechnician: workOrderData.assignedTechnician,
          assignedTeam: workOrderData.assignedTeam,
          estimatedHours: workOrderData.estimatedHours,
          estimatedCost: workOrderData.estimatedCost,
          requiresApproval: workOrderData.requiresApproval || false,
          preventiveMaintenanceId: workOrderData.preventiveMaintenanceId,
          parentWorkOrderId: workOrderData.parentWorkOrderId,
          organizationId: workOrderData.organizationId,
          createdBy: workOrderData.createdBy,
        },
        include: {
          asset: true,
          preventiveMaintenance: true,
        },
      });

      // Auto-submit if no approval required
      if (!workOrder.requiresApproval) {
        await this.updateWorkOrderStatus(workOrder.id, 'SUBMITTED', workOrderData.createdBy);
      }

      logger.info('Work order created', { 
        workOrderId: workOrder.id, 
        workOrderNumber: workOrder.workOrderNumber 
      });
      
      return workOrder;
    } catch (error: unknown) {
      logger.error('Failed to create work order', error);
      throw error;
    }
  }

  /**
   * Get work order by ID with full details
   */
  async getWorkOrder(workOrderId: string): Promise<any> {
    try {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          asset: true,
          tasks: {
            orderBy: { taskNumber: 'asc' },
            include: {
              dependsOnTask: true,
              dependentTasks: true,
            },
          },
          materials: {
            include: {
              inventoryItem: true,
            },
          },
          timeEntries: {
            orderBy: { startTime: 'desc' },
          },
          attachments: true,
          parentWorkOrder: true,
          subWorkOrders: true,
          preventiveMaintenance: true,
        },
      });

      if (!workOrder) {
        throw new Error('Work order not found');
      }

      return workOrder;
    } catch (error: unknown) {
      logger.error('Failed to get work order', { workOrderId, error });
      throw error;
    }
  }

  /**
   * Search work orders with advanced filtering
   */
  async searchWorkOrders(
    filters: WorkOrderFilters,
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{
    workOrders: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const where: any = {
        organizationId: filters.organizationId,
      };

      // Apply filters
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.priority) {
        where.priority = filters.priority;
      }
      if (filters.type) {
        where.type = filters.type;
      }
      if (filters.assignedTo) {
        where.OR = [
          { assignedTo: filters.assignedTo },
          { assignedTechnician: filters.assignedTo },
        ];
      }
      if (filters.assetId) {
        where.assetId = filters.assetId;
      }
      if (filters.location) {
        where.location = { contains: filters.location, mode: 'insensitive' };
      }
      if (filters.building) {
        where.building = filters.building;
      }
      if (filters.dateFrom && filters.dateTo) {
        where.requestedDate = {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        };
      }
      if (filters.overdueOnly) {
        where.dueDate = { lt: new Date() };
        where.status = { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] };
      }

      // Get total count
      const totalCount = await prisma.workOrder.count({ where });

      // Get work orders
      const workOrders = await prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          asset: {
            select: {
              id: true,
              assetName: true,
              assetTag: true,
            },
          },
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              materials: true,
              timeEntries: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        workOrders,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error: unknown) {
      logger.error('Failed to search work orders', { filters, error });
      throw error;
    }
  }

  /**
   * Update work order status with workflow validation
   */
  async updateWorkOrderStatus(
    workOrderId: string,
    newStatus: string,
    updatedBy: string,
    notes?: string
  ): Promise<any> {
    try {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: { status: true, requiresApproval: true, assignedTechnician: true },
      });

      if (!workOrder) {
        throw new Error('Work order not found');
      }

      // Validate status transition
      const isValidTransition = this.validateStatusTransition(workOrder.status, newStatus);
      if (!isValidTransition) {
        throw new Error(`Invalid status transition from ${workOrder.status} to ${newStatus}`);
      }

      // Handle status-specific logic
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      switch (newStatus) {
        case 'APPROVED':
          updateData.approvalStatus = 'APPROVED';
          updateData.approvedBy = updatedBy;
          updateData.approvedDate = new Date();
          break;
        case 'ASSIGNED':
          updateData.status = 'ASSIGNED';
          break;
        case 'IN_PROGRESS':
          updateData.startDate = new Date();
          break;
        case 'COMPLETED':
          updateData.completionDate = new Date();
          break;
        case 'CLOSED':
          // Auto-calculate actual cost if not set
          await this.calculateActualCost(workOrderId);
          break;
      }

      const updatedWorkOrder = await prisma.workOrder.update({
        where: { id: workOrderId },
        data: updateData,
        include: {
          asset: true,
          tasks: true,
        },
      });

      // Update asset maintenance dates if completed
      if (newStatus === 'COMPLETED' && updatedWorkOrder.assetId) {
        await this.updateAssetMaintenanceDate(updatedWorkOrder.assetId);
      }

      logger.info('Work order status updated', { 
        workOrderId, 
        oldStatus: workOrder.status, 
        newStatus,
        updatedBy 
      });

      return updatedWorkOrder;
    } catch (error: unknown) {
      logger.error('Failed to update work order status', { workOrderId, newStatus, error });
      throw error;
    }
  }

  /**
   * Add task to work order
   */
  async addWorkOrderTask(taskData: WorkOrderTaskData): Promise<any> {
    try {
      const task = await prisma.workOrderTask.create({
        data: {
          workOrderId: taskData.workOrderId,
          taskNumber: taskData.taskNumber,
          title: taskData.title,
          description: taskData.description,
          status: 'NOT_STARTED',
          priority: taskData.priority as any,
          assignedTo: taskData.assignedTo,
          estimatedHours: taskData.estimatedHours,
          startDate: taskData.startDate,
          dueDate: taskData.dueDate,
          dependsOnTaskId: taskData.dependsOnTaskId,
          instructions: taskData.instructions,
          safetyNotes: taskData.safetyNotes,
          skillsRequired: taskData.skillsRequired,
          toolsRequired: taskData.toolsRequired,
        },
      });

      logger.info('Work order task added', { taskId: task.id, workOrderId: taskData.workOrderId });
      return task;
    } catch (error: unknown) {
      logger.error('Failed to add work order task', error);
      throw error;
    }
  }

  /**
   * Update task status and track progress
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: string,
    updatedBy: string,
    actualHours?: number,
    notes?: string
  ): Promise<any> {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === 'IN_PROGRESS') {
        updateData.startDate = new Date();
      } else if (newStatus === 'COMPLETED') {
        updateData.completionDate = new Date();
        if (actualHours) {
          updateData.actualHours = actualHours;
        }
      }

      const updatedTask = await prisma.workOrderTask.update({
        where: { id: taskId },
        data: updateData,
      });

      // Check if all tasks are completed to update work order status
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: updatedTask.workOrderId },
        include: {
          tasks: true,
        },
      });

      if (workOrder) {
        const allTasksCompleted = workOrder.tasks.every(task => 
          task.status === 'COMPLETED' || task.status === 'SKIPPED'
        );
        
        if (allTasksCompleted && workOrder.status === 'IN_PROGRESS') {
          await this.updateWorkOrderStatus(workOrder.id, 'COMPLETED', updatedBy);
        }
      }

      logger.info('Task status updated', { taskId, newStatus, updatedBy });
      return updatedTask;
    } catch (error: unknown) {
      logger.error('Failed to update task status', { taskId, newStatus, error });
      throw error;
    }
  }

  /**
   * Add material to work order
   */
  async addWorkOrderMaterial(materialData: WorkOrderMaterialData): Promise<any> {
    try {
      const totalCost = materialData.quantity * materialData.unitCost;

      const material = await prisma.workOrderMaterial.create({
        data: {
          workOrderId: materialData.workOrderId,
          inventoryItemId: materialData.inventoryItemId,
          itemName: materialData.itemName,
          description: materialData.description,
          quantity: materialData.quantity,
          unitOfMeasure: materialData.unitOfMeasure,
          unitCost: materialData.unitCost,
          totalCost,
          status: 'REQUESTED',
          requestedDate: materialData.requestedDate,
        },
      });

      // If linked to inventory item, create inventory reservation
      if (materialData.inventoryItemId) {
        await this.reserveInventoryItem(materialData.inventoryItemId, materialData.quantity);
      }

      logger.info('Work order material added', { materialId: material.id, workOrderId: materialData.workOrderId });
      return material;
    } catch (error: unknown) {
      logger.error('Failed to add work order material', error);
      throw error;
    }
  }

  /**
   * Record time entry for work order
   */
  async recordTimeEntry(timeEntryData: {
    workOrderId: string;
    technicianId: string;
    technicianName: string;
    startTime: Date;
    endTime?: Date;
    hoursWorked?: number;
    hourlyRate?: number;
    description?: string;
    workPerformed?: string;
  }): Promise<any> {
    try {
      // Calculate hours worked if not provided
      let hoursWorked = timeEntryData.hoursWorked;
      if (!hoursWorked && timeEntryData.endTime) {
        const timeDiff = timeEntryData.endTime.getTime() - timeEntryData.startTime.getTime();
        hoursWorked = timeDiff / (1000 * 60 * 60); // Convert to hours
      }

      // Calculate total cost
      const totalCost = hoursWorked && timeEntryData.hourlyRate 
        ? hoursWorked * timeEntryData.hourlyRate 
        : undefined;

      const timeEntry = await prisma.workOrderTimeEntry.create({
        data: {
          workOrderId: timeEntryData.workOrderId,
          technicianId: timeEntryData.technicianId,
          technicianName: timeEntryData.technicianName,
          startTime: timeEntryData.startTime,
          endTime: timeEntryData.endTime,
          hoursWorked,
          hourlyRate: timeEntryData.hourlyRate,
          totalCost,
          description: timeEntryData.description,
          workPerformed: timeEntryData.workPerformed,
          status: 'DRAFT',
        },
      });

      logger.info('Time entry recorded', { timeEntryId: timeEntry.id, workOrderId: timeEntryData.workOrderId });
      return timeEntry;
    } catch (error: unknown) {
      logger.error('Failed to record time entry', error);
      throw error;
    }
  }

  /**
   * Get work order metrics and analytics
   */
  async getWorkOrderMetrics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<WorkOrderMetrics> {
    try {
      const dateFilter = startDate && endDate 
        ? { createdAt: { gte: startDate, lte: endDate } }
        : {};

      const [
        totalWorkOrders,
        activeWorkOrders,
        completedWorkOrders,
        overdueWorkOrders,
        workOrdersByPriority,
        workOrdersByStatus,
        workOrdersByType,
        avgCompletionTime,
        avgCost,
        totalLaborHours,
        technicianStats,
      ] = await Promise.all([
        // Total work orders
        prisma.workOrder.count({
          where: { organizationId, ...dateFilter },
        }),

        // Active work orders
        prisma.workOrder.count({
          where: {
            organizationId,
            status: { in: ['SUBMITTED', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS'] },
            ...dateFilter,
          },
        }),

        // Completed work orders
        prisma.workOrder.count({
          where: { organizationId, status: 'COMPLETED', ...dateFilter },
        }),

        // Overdue work orders
        prisma.workOrder.count({
          where: {
            organizationId,
            dueDate: { lt: new Date() },
            status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELLED'] },
            ...dateFilter,
          },
        }),

        // Work orders by priority
        prisma.workOrder.groupBy({
          by: ['priority'],
          where: { organizationId, ...dateFilter },
          _count: true,
        }),

        // Work orders by status
        prisma.workOrder.groupBy({
          by: ['status'],
          where: { organizationId, ...dateFilter },
          _count: true,
        }),

        // Work orders by type
        prisma.workOrder.groupBy({
          by: ['type'],
          where: { organizationId, ...dateFilter },
          _count: true,
        }),

        // Average completion time
        prisma.workOrder.aggregate({
          where: {
            organizationId,
            status: 'COMPLETED',
            startDate: { not: null },
            completionDate: { not: null },
            ...dateFilter,
          },
          _avg: {
            // This would need a calculated field for completion time in hours
            actualHours: true,
          },
        }),

        // Average cost per work order
        prisma.workOrder.aggregate({
          where: { organizationId, status: 'COMPLETED', ...dateFilter },
          _avg: { actualCost: true },
        }),

        // Total labor hours
        prisma.workOrderTimeEntry.aggregate({
          where: {
            workOrder: {
              organizationId,
              ...dateFilter,
            },
            status: 'APPROVED',
          },
          _sum: { hoursWorked: true },
        }),

        // Technician workload statistics
        prisma.workOrderTimeEntry.groupBy({
          by: ['technicianId', 'technicianName'],
          where: {
            workOrder: {
              organizationId,
              ...dateFilter,
            },
            status: 'APPROVED',
          },
          _sum: { hoursWorked: true },
          _count: { workOrderId: true },
        }),
      ]);

      // Process grouped results
      const priorityBreakdown: { [priority: string]: number } = {};
      workOrdersByPriority.forEach((group) => {
        priorityBreakdown[group.priority] = group._count;
      });

      const statusBreakdown: { [status: string]: number } = {};
      workOrdersByStatus.forEach((group) => {
        statusBreakdown[group.status] = group._count;
      });

      const typeBreakdown: { [type: string]: number } = {};
      workOrdersByType.forEach((group) => {
        typeBreakdown[group.type] = group._count;
      });

      // Calculate technician workload
      const technicianWorkload = await Promise.all(
        technicianStats.map(async (tech) => {
          const activeWorkOrders = await prisma.workOrder.count({
            where: {
              organizationId,
              assignedTechnician: tech.technicianId,
              status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
            },
          });

          // Assume 40 hours per week standard capacity
          const standardHours = 40;
          const utilizationRate = tech._sum.hoursWorked 
            ? (tech._sum.hoursWorked / standardHours) * 100
            : 0;

          return {
            technicianId: tech.technicianId,
            technicianName: tech.technicianName,
            activeWorkOrders,
            totalHours: tech._sum.hoursWorked || 0,
            utilizationRate,
          };
        })
      );

      return {
        totalWorkOrders,
        activeWorkOrders,
        completedWorkOrders,
        overdueWorkOrders,
        avgCompletionTime: avgCompletionTime._avg.actualHours || 0,
        workOrdersByPriority: priorityBreakdown,
        workOrdersByStatus: statusBreakdown,
        workOrdersByType: typeBreakdown,
        avgCostPerWorkOrder: avgCost._avg.actualCost || 0,
        totalLaborHours: totalLaborHours._sum.hoursWorked || 0,
        technicianWorkload,
      };
    } catch (error: unknown) {
      logger.error('Failed to get work order metrics', { organizationId, error });
      throw error;
    }
  }

  /**
   * Get technician schedule with mobile app support
   */
  async getTechnicianSchedule(
    technicianId: string,
    startDate: Date,
    endDate: Date,
    organizationId: string
  ): Promise<TechnicianSchedule> {
    try {
      // Get technician's assigned work orders
      const workOrders = await prisma.workOrder.findMany({
        where: {
          organizationId,
          assignedTechnician: technicianId,
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
        orderBy: { scheduledDate: 'asc' },
        select: {
          id: true,
          title: true,
          priority: true,
          scheduledDate: true,
          estimatedHours: true,
          location: true,
          building: true,
          status: true,
          asset: {
            select: {
              assetName: true,
              location: true,
            },
          },
        },
      });

      // Get technician name
      const technicianName = workOrders.length > 0 
        ? `Technician ${technicianId}` // In a real system, this would come from user management
        : 'Unknown Technician';

      // Calculate total scheduled hours
      const totalScheduledHours = workOrders.reduce((sum, wo) => sum + (wo.estimatedHours || 0), 0);

      // Calculate available hours (assuming 8-hour work days)
      const workDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAvailableHours = workDays * 8;
      const availableHours = Math.max(0, totalAvailableHours - totalScheduledHours);
      const utilizationRate = totalAvailableHours > 0 ? (totalScheduledHours / totalAvailableHours) * 100 : 0;

      // Format work orders for mobile app
      const formattedWorkOrders = workOrders.map(wo => ({
        workOrderId: wo.id,
        title: wo.title,
        priority: wo.priority,
        scheduledDate: wo.scheduledDate || new Date(),
        estimatedHours: wo.estimatedHours || 0,
        location: wo.asset?.location || wo.location,
        status: wo.status,
      }));

      return {
        technicianId,
        technicianName,
        workOrders: formattedWorkOrders,
        totalScheduledHours,
        availableHours,
        utilizationRate,
      };
    } catch (error: unknown) {
      logger.error('Failed to get technician schedule', { technicianId, error });
      throw error;
    }
  }

  /**
   * Assign work order to technician with optimization
   */
  async assignWorkOrder(
    workOrderId: string,
    technicianId: string,
    scheduledDate: Date,
    assignedBy: string
  ): Promise<any> {
    try {
      // Check technician availability
      const conflictingWorkOrders = await prisma.workOrder.count({
        where: {
          assignedTechnician: technicianId,
          scheduledDate,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
      });

      if (conflictingWorkOrders > 0) {
        throw new Error('Technician has conflicting assignments on this date');
      }

      // Update work order
      const updatedWorkOrder = await prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
          assignedTechnician: technicianId,
          scheduledDate,
          status: 'ASSIGNED',
          updatedAt: new Date(),
        },
        include: {
          asset: true,
          tasks: true,
        },
      });

      logger.info('Work order assigned', { 
        workOrderId, 
        technicianId, 
        scheduledDate,
        assignedBy 
      });

      return updatedWorkOrder;
    } catch (error: unknown) {
      logger.error('Failed to assign work order', { workOrderId, technicianId, error });
      throw error;
    }
  }

  /**
   * Generate work order number
   */
  private async generateWorkOrderNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.workOrder.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    return `WO-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    const allowedTransitions: { [status: string]: string[] } = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
      APPROVED: ['ASSIGNED', 'CANCELLED'],
      ASSIGNED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'ON_HOLD', 'CANCELLED'],
      ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
      COMPLETED: ['CLOSED'],
      CLOSED: [],
      CANCELLED: [],
      REJECTED: ['SUBMITTED'],
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Calculate actual cost for completed work order
   */
  private async calculateActualCost(workOrderId: string): Promise<void> {
    try {
      const [laborCost, materialCost] = await Promise.all([
        // Calculate total labor cost
        prisma.workOrderTimeEntry.aggregate({
          where: { 
            workOrderId,
            status: 'APPROVED',
          },
          _sum: { totalCost: true },
        }),
        
        // Calculate total material cost
        prisma.workOrderMaterial.aggregate({
          where: { 
            workOrderId,
            status: 'RECEIVED',
          },
          _sum: { totalCost: true },
        }),
      ]);

      const totalLaborCost = laborCost._sum.totalCost || 0;
      const totalMaterialCost = materialCost._sum.totalCost || 0;
      const actualCost = totalLaborCost + totalMaterialCost;

      await prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
          actualCost,
          laborCost: totalLaborCost,
          materialCost: totalMaterialCost,
        },
      });

      logger.info('Actual cost calculated', { workOrderId, actualCost });
    } catch (error: unknown) {
      logger.error('Failed to calculate actual cost', { workOrderId, error });
    }
  }

  /**
   * Update asset maintenance date when work order completed
   */
  private async updateAssetMaintenanceDate(assetId: string): Promise<void> {
    try {
      await prisma.maintenanceAsset.update({
        where: { id: assetId },
        data: { lastMaintenanceDate: new Date() },
      });
    } catch (error: unknown) {
      logger.error('Failed to update asset maintenance date', { assetId, error });
    }
  }

  /**
   * Reserve inventory item for work order
   */
  private async reserveInventoryItem(inventoryItemId: string, quantity: number): Promise<void> {
    try {
      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantityReserved: { increment: quantity },
          quantityAvailable: { decrement: quantity },
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to reserve inventory item', { inventoryItemId, quantity, error });
    }
  }
}

export const workOrderService = new WorkOrderService();