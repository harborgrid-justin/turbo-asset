import { PrismaClient } from '@prisma/client';
import { logger } from '@/config/logger';

const prisma = new PrismaClient();

export interface MobileWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  type: string;
  assetInfo?: {
    id: string;
    assetName: string;
    assetTag: string;
    location: string;
    building?: string;
    floor?: string;
  };
  locationInfo: {
    building?: string;
    floor?: string;
    room?: string;
    coordinates?: string;
    directions?: string;
  };
  scheduledDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  taskList: Array<{
    id: string;
    taskNumber: number;
    title: string;
    description?: string;
    status: string;
    instructions?: string;
    safetyNotes?: string;
    skillsRequired: string[];
    toolsRequired: string[];
    estimatedHours?: number;
  }>;
  materialsList: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unitOfMeasure: string;
    status: string;
    description?: string;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    fileType: string;
    url: string;
  }>;
}

export interface MobileTechnicianProfile {
  technicianId: string;
  name: string;
  email?: string;
  phone?: string;
  skills: string[];
  certifications: string[];
  location: {
    current?: { latitude: number; longitude: number; timestamp: Date };
    homeBase: string;
  };
  workSchedule: {
    startTime: string;
    endTime: string;
    workDays: string[];
    timeZone: string;
  };
  equipment: Array<{
    name: string;
    serialNumber?: string;
    lastCalibration?: Date;
  }>;
  preferences: {
    language: string;
    notifications: boolean;
    autoSync: boolean;
    offlineMode: boolean;
  };
}

export interface MobileTimeEntry {
  workOrderId: string;
  technicianId: string;
  startTime: Date;
  endTime?: Date;
  breakTime?: number; // minutes
  travelTime?: number; // minutes
  workDescription: string;
  taskId?: string;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  photos?: string[];
  notes?: string;
}

export interface WorkOrderUpdate {
  workOrderId: string;
  status?: string;
  percentComplete?: number;
  actualHours?: number;
  completionNotes?: string;
  photos?: Array<{
    fileName: string;
    base64Data: string;
    description?: string;
  }>;
  signature?: {
    customerName: string;
    customerSignature: string;
    technicianSignature: string;
    signatureDate: Date;
  };
}

export interface InventoryRequest {
  workOrderId?: string;
  technicianId: string;
  requestType: 'ISSUE' | 'RETURN' | 'TRANSFER' | 'EMERGENCY';
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    reason: string;
  }>;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  justification?: string;
  location: string;
}

export interface MobileDashboard {
  todayStats: {
    assignedWorkOrders: number;
    completedWorkOrders: number;
    hoursWorked: number;
    efficiency: number; // percentage
  };
  upcomingWork: Array<{
    id: string;
    title: string;
    priority: string;
    scheduledTime: Date;
    estimatedDuration: number;
    location: string;
  }>;
  nearbyWork: Array<{
    id: string;
    title: string;
    distance: number; // miles/km
    location: string;
    priority: string;
  }>;
  alerts: Array<{
    type: 'URGENT_WORK' | 'OVERDUE' | 'SAFETY' | 'SYSTEM';
    message: string;
    workOrderId?: string;
    timestamp: Date;
  }>;
  inventory: {
    lowStockItems: number;
    pendingRequests: number;
  };
  performance: {
    weeklyHours: number;
    completionRate: number;
    customerSatisfaction?: number;
    onTimeRate: number;
  };
}

export interface OfflineData {
  workOrders: MobileWorkOrder[];
  inventory: Array<{
    itemId: string;
    itemName: string;
    quantityAvailable: number;
    location: string;
  }>;
  assets: Array<{
    id: string;
    assetName: string;
    assetTag: string;
    location: string;
    condition: string;
  }>;
  lastSyncTime: Date;
}

/**
 * TechnicianMobileService - Mobile app support for field technicians
 * Handles mobile work order management, time tracking, and offline capabilities
 * Supports GPS tracking, photo uploads, and real-time synchronization
 */
export class TechnicianMobileService {

  /**
   * Get technician profile with mobile-optimized data
   */
  async getTechnicianProfile(technicianId: string): Promise<MobileTechnicianProfile> {
    try {
      // In a real system, this would come from user management/HR systems
      // For now, we'll construct a profile based on work order assignments
      const recentAssignments = await prisma.workOrder.findMany({
        where: {
          assignedTechnician: technicianId,
        },
        take: 50,
        include: {
          tasks: {
            select: {
              skillsRequired: true,
              toolsRequired: true,
            },
          },
        },
      });

      // Extract skills from work assignments
      const skills = new Set<string>();
      recentAssignments.forEach(wo => {
        wo.tasks.forEach(task => {
          task.skillsRequired.forEach(skill => skills.add(skill));
        });
      });

      return {
        technicianId,
        name: `Technician ${technicianId}`, // Would come from user table
        skills: Array.from(skills),
        certifications: [], // Would come from certification system
        location: {
          homeBase: 'Main Office', // Default
        },
        workSchedule: {
          startTime: '08:00',
          endTime: '17:00',
          workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          timeZone: 'America/New_York',
        },
        equipment: [], // Would come from equipment assignment system
        preferences: {
          language: 'en',
          notifications: true,
          autoSync: true,
          offlineMode: false,
        },
      };
    } catch (error: unknown) {
      logger.error('Failed to get technician profile', { technicianId, error });
      throw error;
    }
  }

  /**
   * Get mobile dashboard for technician
   */
  async getMobileDashboard(
    technicianId: string,
    currentLocation?: { latitude: number; longitude: number }
  ): Promise<MobileDashboard> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const [
        todayWorkOrders,
        completedToday,
        todayTimeEntries,
        upcomingWorkOrders,
        allAssignedWorkOrders,
      ] = await Promise.all([
        // Today's assigned work orders
        prisma.workOrder.findMany({
          where: {
            assignedTechnician: technicianId,
            scheduledDate: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        }),

        // Completed today
        prisma.workOrder.count({
          where: {
            assignedTechnician: technicianId,
            status: 'COMPLETED',
            completionDate: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        }),

        // Time entries for today
        prisma.workOrderTimeEntry.findMany({
          where: {
            technicianId,
            startTime: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        }),

        // Upcoming work (next 7 days)
        prisma.workOrder.findMany({
          where: {
            assignedTechnician: technicianId,
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
            scheduledDate: {
              gte: endOfDay,
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { scheduledDate: 'asc' },
          take: 10,
          include: {
            asset: {
              select: {
                assetName: true,
                location: true,
              },
            },
          },
        }),

        // All assigned work orders for performance calculation
        prisma.workOrder.findMany({
          where: {
            assignedTechnician: technicianId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
            },
          },
        }),
      ]);

      // Calculate today's stats
      const hoursWorked = todayTimeEntries.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
      const estimatedHours = todayWorkOrders.reduce((sum, wo) => sum + (wo.estimatedHours || 0), 0);
      const efficiency = estimatedHours > 0 ? (hoursWorked / estimatedHours) * 100 : 0;

      // Format upcoming work
      const upcomingWork = upcomingWorkOrders.map(wo => ({
        id: wo.id,
        title: wo.title,
        priority: wo.priority,
        scheduledTime: wo.scheduledDate || wo.dueDate || new Date(),
        estimatedDuration: wo.estimatedHours || 2,
        location: wo.asset?.location || wo.location,
      }));

      // Find nearby work (if location provided)
      let nearbyWork: MobileDashboard['nearbyWork'] = [];
      if (currentLocation) {
        // Simplified - in reality would use proper distance calculation
        const allWorkOrders = await prisma.workOrder.findMany({
          where: {
            status: { in: ['SUBMITTED', 'APPROVED'] },
            assignedTechnician: null, // Unassigned
          },
          take: 10,
          include: {
            asset: {
              select: {
                assetName: true,
                location: true,
              },
            },
          },
        });

        nearbyWork = allWorkOrders.map(wo => ({
          id: wo.id,
          title: wo.title,
          distance: Math.random() * 10, // Placeholder distance calculation
          location: wo.asset?.location || wo.location,
          priority: wo.priority,
        }));
      }

      // Generate alerts
      const alerts: MobileDashboard['alerts'] = [];
      
      // Check for overdue work
      const overdueWork = todayWorkOrders.filter(wo => 
        wo.dueDate && wo.dueDate < new Date() && wo.status !== 'COMPLETED'
      );
      
      if (overdueWork.length > 0) {
        alerts.push({
          type: 'OVERDUE',
          message: `${overdueWork.length} work order(s) are overdue`,
          timestamp: new Date(),
        });
      }

      // Check for urgent work
      const urgentWork = todayWorkOrders.filter(wo => 
        wo.priority === 'EMERGENCY' && wo.status !== 'COMPLETED'
      );

      if (urgentWork.length > 0) {
        alerts.push({
          type: 'URGENT_WORK',
          message: `${urgentWork.length} emergency work order(s) require attention`,
          timestamp: new Date(),
        });
      }

      // Performance calculations
      const weeklyHours = todayTimeEntries.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
      const totalAssigned = allAssignedWorkOrders.length;
      const totalCompleted = allAssignedWorkOrders.filter(wo => wo.status === 'COMPLETED').length;
      const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;
      
      const onTimeWork = allAssignedWorkOrders.filter(wo => 
        wo.status === 'COMPLETED' && wo.completionDate && wo.dueDate && 
        wo.completionDate <= wo.dueDate
      );
      const onTimeRate = totalCompleted > 0 ? (onTimeWork.length / totalCompleted) * 100 : 0;

      return {
        todayStats: {
          assignedWorkOrders: todayWorkOrders.length,
          completedWorkOrders: completedToday,
          hoursWorked,
          efficiency: Math.round(efficiency),
        },
        upcomingWork,
        nearbyWork,
        alerts,
        inventory: {
          lowStockItems: 0, // Would come from inventory alerts
          pendingRequests: 0, // Would come from inventory requests
        },
        performance: {
          weeklyHours,
          completionRate: Math.round(completionRate),
          customerSatisfaction: 85, // Placeholder
          onTimeRate: Math.round(onTimeRate),
        },
      };
    } catch (error: unknown) {
      logger.error('Failed to get mobile dashboard', { technicianId, error });
      throw error;
    }
  }

  /**
   * Get mobile-optimized work orders for technician
   */
  async getMobileWorkOrders(
    technicianId: string,
    filters?: {
      status?: string[];
      priority?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<MobileWorkOrder[]> {
    try {
      const where: any = {
        assignedTechnician: technicianId,
      };

      if (filters?.status) {
        where.status = { in: filters.status };
      }
      if (filters?.priority) {
        where.priority = { in: filters.priority };
      }
      if (filters?.dateFrom && filters?.dateTo) {
        where.scheduledDate = {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        };
      }

      const workOrders = await prisma.workOrder.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { scheduledDate: 'asc' },
        ],
        include: {
          asset: {
            select: {
              id: true,
              assetName: true,
              assetTag: true,
              location: true,
              building: true,
              floor: true,
            },
          },
          tasks: {
            orderBy: { taskNumber: 'asc' },
            select: {
              id: true,
              taskNumber: true,
              title: true,
              description: true,
              status: true,
              instructions: true,
              safetyNotes: true,
              skillsRequired: true,
              toolsRequired: true,
              estimatedHours: true,
            },
          },
          materials: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              unitOfMeasure: true,
              status: true,
              description: true,
            },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              filePath: true,
            },
          },
        },
      });

      return workOrders.map(wo => ({
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        title: wo.title,
        description: wo.description,
        priority: wo.priority,
        status: wo.status,
        type: wo.type,
        assetInfo: wo.asset ? {
          id: wo.asset.id,
          assetName: wo.asset.assetName,
          assetTag: wo.asset.assetTag,
          location: wo.asset.location,
          building: wo.asset.building,
          floor: wo.asset.floor,
        } : undefined,
        locationInfo: {
          building: wo.building,
          floor: wo.floor,
          room: wo.room,
          coordinates: wo.asset?.location, // Could include GPS coordinates
          directions: `Go to ${wo.building || 'building'}, ${wo.floor || 'floor'}, ${wo.room || 'location'}`,
        },
        scheduledDate: wo.scheduledDate,
        dueDate: wo.dueDate,
        estimatedHours: wo.estimatedHours,
        taskList: wo.tasks,
        materialsList: wo.materials,
        attachments: wo.attachments.map(att => ({
          id: att.id,
          fileName: att.fileName,
          fileType: att.mimeType,
          url: `/api/attachments/${att.id}`, // Would be actual file URL
        })),
      }));
    } catch (error: unknown) {
      logger.error('Failed to get mobile work orders', { technicianId, error });
      throw error;
    }
  }

  /**
   * Record time entry from mobile app
   */
  async recordMobileTimeEntry(timeEntry: MobileTimeEntry): Promise<any> {
    try {
      const hoursWorked = timeEntry.endTime 
        ? (timeEntry.endTime.getTime() - timeEntry.startTime.getTime()) / (1000 * 60 * 60)
        : undefined;

      // Adjust for break time and travel time
      const adjustedHours = hoursWorked 
        ? Math.max(0, hoursWorked - ((timeEntry.breakTime || 0) + (timeEntry.travelTime || 0)) / 60)
        : undefined;

      const entry = await prisma.workOrderTimeEntry.create({
        data: {
          workOrderId: timeEntry.workOrderId,
          technicianId: timeEntry.technicianId,
          technicianName: `Technician ${timeEntry.technicianId}`, // Would lookup actual name
          startTime: timeEntry.startTime,
          endTime: timeEntry.endTime,
          hoursWorked: adjustedHours,
          description: timeEntry.workDescription,
          workPerformed: timeEntry.workDescription,
          status: 'DRAFT',
        },
      });

      // Store location data if provided (in a real system, would have location table)
      if (timeEntry.location) {
        logger.info('Location recorded for time entry', {
          timeEntryId: entry.id,
          location: timeEntry.location,
        });
      }

      // Update work order status if time entry indicates completion
      if (timeEntry.endTime && timeEntry.workDescription.toLowerCase().includes('complete')) {
        await prisma.workOrder.update({
          where: { id: timeEntry.workOrderId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      logger.info('Mobile time entry recorded', {
        timeEntryId: entry.id,
        workOrderId: timeEntry.workOrderId,
        technicianId: timeEntry.technicianId,
        hoursWorked: adjustedHours,
      });

      return entry;
    } catch (error: unknown) {
      logger.error('Failed to record mobile time entry', error);
      throw error;
    }
  }

  /**
   * Update work order from mobile app
   */
  async updateWorkOrderFromMobile(update: WorkOrderUpdate): Promise<any> {
    try {
      const updateData: any = {};

      if (update.status) {
        updateData.status = update.status;
      }

      if (update.actualHours) {
        updateData.actualHours = update.actualHours;
      }

      if (update.status === 'COMPLETED') {
        updateData.completionDate = new Date();
      }

      const workOrder = await prisma.workOrder.update({
        where: { id: update.workOrderId },
        data: updateData,
        include: {
          tasks: true,
        },
      });

      // Handle photo uploads
      if (update.photos && update.photos.length > 0) {
        for (const photo of update.photos) {
          // In a real system, would upload to cloud storage
          await prisma.workOrderAttachment.create({
            data: {
              workOrderId: update.workOrderId,
              fileName: photo.fileName,
              originalName: photo.fileName,
              fileSize: photo.base64Data.length,
              mimeType: 'image/jpeg',
              filePath: `/uploads/${photo.fileName}`,
              uploadedBy: 'mobile_app',
            },
          });
        }
      }

      // Handle task updates if percentage complete provided
      if (update.percentComplete !== undefined && workOrder.tasks.length > 0) {
        const completedTasks = Math.floor((workOrder.tasks.length * update.percentComplete) / 100);
        
        for (let i = 0; i < completedTasks; i++) {
          if (workOrder.tasks[i].status !== 'COMPLETED') {
            await prisma.workOrderTask.update({
              where: { id: workOrder.tasks[i].id },
              data: { 
                status: 'COMPLETED',
                percentComplete: 100,
                completionDate: new Date(),
              },
            });
          }
        }
      }

      logger.info('Work order updated from mobile', {
        workOrderId: update.workOrderId,
        status: update.status,
        photosUploaded: update.photos?.length || 0,
      });

      return workOrder;
    } catch (error: unknown) {
      logger.error('Failed to update work order from mobile', error);
      throw error;
    }
  }

  /**
   * Submit inventory request from mobile
   */
  async submitInventoryRequest(request: InventoryRequest): Promise<any> {
    try {
      // In a real system, would create inventory request record
      const requestRecord = {
        id: `INV-REQ-${Date.now()}`,
        workOrderId: request.workOrderId,
        technicianId: request.technicianId,
        requestType: request.requestType,
        items: request.items,
        urgency: request.urgency,
        justification: request.justification,
        location: request.location,
        status: 'PENDING',
        createdAt: new Date(),
      };

      // Create inventory transactions for each item
      for (const item of request.items) {
        if (request.requestType === 'ISSUE' || request.requestType === 'EMERGENCY') {
          // Reserve inventory if available
          const inventoryItem = await prisma.inventoryItem.findUnique({
            where: { id: item.itemId },
          });

          if (inventoryItem && inventoryItem.quantityAvailable >= item.quantity) {
            await prisma.inventoryItem.update({
              where: { id: item.itemId },
              data: {
                quantityReserved: { increment: item.quantity },
                quantityAvailable: { decrement: item.quantity },
              },
            });

            // Create transaction
            await prisma.inventoryTransaction.create({
              data: {
                transactionNumber: `TXN-${Date.now()}-${item.itemId}`,
                inventoryItemId: item.itemId,
                transactionType: 'ISSUE',
                quantity: item.quantity,
                unitCost: inventoryItem.unitCost,
                totalCost: item.quantity * inventoryItem.unitCost,
                reference: request.workOrderId || 'MOBILE_REQUEST',
                notes: item.reason,
                quantityBefore: inventoryItem.quantityOnHand,
                quantityAfter: inventoryItem.quantityOnHand - item.quantity,
                workOrderId: request.workOrderId,
                processedBy: request.technicianId,
              },
            });
          }
        }
      }

      logger.info('Inventory request submitted from mobile', {
        requestId: requestRecord.id,
        technicianId: request.technicianId,
        itemCount: request.items.length,
        urgency: request.urgency,
      });

      return requestRecord;
    } catch (error: unknown) {
      logger.error('Failed to submit inventory request from mobile', error);
      throw error;
    }
  }

  /**
   * Get offline data package for mobile app
   */
  async getOfflineDataPackage(technicianId: string): Promise<OfflineData> {
    try {
      const [workOrders, inventory, assets] = await Promise.all([
        // Get assigned work orders
        this.getMobileWorkOrders(technicianId, {
          status: ['ASSIGNED', 'IN_PROGRESS'],
        }),

        // Get commonly used inventory items
        prisma.inventoryItem.findMany({
          where: {
            status: 'ACTIVE',
            quantityAvailable: { gt: 0 },
          },
          take: 100, // Limit for mobile storage
          orderBy: { itemName: 'asc' },
          select: {
            id: true,
            itemName: true,
            quantityAvailable: true,
            location: true,
          },
        }),

        // Get assets the technician commonly works on
        prisma.maintenanceAsset.findMany({
          where: {
            workOrders: {
              some: {
                assignedTechnician: technicianId,
              },
            },
          },
          take: 50,
          select: {
            id: true,
            assetName: true,
            assetTag: true,
            location: true,
            condition: true,
          },
        }),
      ]);

      const offlineData: OfflineData = {
        workOrders,
        inventory,
        assets,
        lastSyncTime: new Date(),
      };

      logger.info('Offline data package generated', {
        technicianId,
        workOrderCount: workOrders.length,
        inventoryItemCount: inventory.length,
        assetCount: assets.length,
      });

      return offlineData;
    } catch (error: unknown) {
      logger.error('Failed to generate offline data package', { technicianId, error });
      throw error;
    }
  }

  /**
   * Sync mobile app data with server
   */
  async syncMobileData(
    technicianId: string,
    syncData: {
      timeEntries?: MobileTimeEntry[];
      workOrderUpdates?: WorkOrderUpdate[];
      inventoryRequests?: InventoryRequest[];
      lastSyncTime: Date;
    }
  ): Promise<{
    success: boolean;
    syncedItems: {
      timeEntries: number;
      workOrderUpdates: number;
      inventoryRequests: number;
    };
    conflicts: any[];
    newData: OfflineData;
  }> {
    try {
      let syncedTimeEntries = 0;
      let syncedWorkOrderUpdates = 0;
      let syncedInventoryRequests = 0;
      const conflicts: any[] = [];

      // Process time entries
      if (syncData.timeEntries) {
        for (const timeEntry of syncData.timeEntries) {
          try {
            await this.recordMobileTimeEntry(timeEntry);
            syncedTimeEntries++;
          } catch (error: unknown) {
            conflicts.push({
              type: 'TIME_ENTRY',
              data: timeEntry,
              error: error instanceof Error ? (error as Error).message : 'Unknown error',
            });
          }
        }
      }

      // Process work order updates
      if (syncData.workOrderUpdates) {
        for (const update of syncData.workOrderUpdates) {
          try {
            await this.updateWorkOrderFromMobile(update);
            syncedWorkOrderUpdates++;
          } catch (error: unknown) {
            conflicts.push({
              type: 'WORK_ORDER_UPDATE',
              data: update,
              error: error instanceof Error ? (error as Error).message : 'Unknown error',
            });
          }
        }
      }

      // Process inventory requests
      if (syncData.inventoryRequests) {
        for (const request of syncData.inventoryRequests) {
          try {
            await this.submitInventoryRequest(request);
            syncedInventoryRequests++;
          } catch (error: unknown) {
            conflicts.push({
              type: 'INVENTORY_REQUEST',
              data: request,
              error: error instanceof Error ? (error as Error).message : 'Unknown error',
            });
          }
        }
      }

      // Get fresh data for mobile app
      const newData = await this.getOfflineDataPackage(technicianId);

      logger.info('Mobile data sync completed', {
        technicianId,
        syncedItems: {
          timeEntries: syncedTimeEntries,
          workOrderUpdates: syncedWorkOrderUpdates,
          inventoryRequests: syncedInventoryRequests,
        },
        conflicts: conflicts.length,
      });

      return {
        success: conflicts.length === 0,
        syncedItems: {
          timeEntries: syncedTimeEntries,
          workOrderUpdates: syncedWorkOrderUpdates,
          inventoryRequests: syncedInventoryRequests,
        },
        conflicts,
        newData,
      };
    } catch (error: unknown) {
      logger.error('Failed to sync mobile data', { technicianId, error });
      throw error;
    }
  }

  /**
   * Get route optimization for technician's assigned work orders
   */
  async getOptimizedRoute(
    technicianId: string,
    startLocation: { latitude: number; longitude: number },
    date: Date = new Date()
  ): Promise<{
    optimizedRoute: Array<{
      workOrderId: string;
      title: string;
      address: string;
      coordinates: { latitude: number; longitude: number };
      estimatedArrival: Date;
      estimatedDuration: number;
      travelTime: number;
    }>;
    totalDistance: number;
    totalTravelTime: number;
    estimatedCompletion: Date;
  }> {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const workOrders = await prisma.workOrder.findMany({
        where: {
          assignedTechnician: technicianId,
          scheduledDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
        include: {
          asset: {
            select: {
              assetName: true,
              location: true,
            },
          },
        },
        orderBy: { priority: 'desc' },
      });

      // Simple route optimization (in reality would use proper routing algorithms)
      const optimizedRoute = workOrders.map((wo, index) => {
        const estimatedArrival = new Date(startOfDay.getTime() + (index + 1) * 2 * 60 * 60 * 1000); // 2 hours apart
        const travelTime = 30; // 30 minutes travel time (simplified)
        
        return {
          workOrderId: wo.id,
          title: wo.title,
          address: wo.asset?.location || wo.location || 'Unknown location',
          coordinates: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.1, // Simplified NYC area
            longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
          },
          estimatedArrival,
          estimatedDuration: wo.estimatedHours ? wo.estimatedHours * 60 : 120, // minutes
          travelTime,
        };
      });

      const totalTravelTime = optimizedRoute.reduce((sum, stop) => sum + stop.travelTime, 0);
      const totalWorkTime = optimizedRoute.reduce((sum, stop) => sum + stop.estimatedDuration, 0);
      const totalDistance = optimizedRoute.length * 10; // Simplified 10 miles per stop

      const estimatedCompletion = new Date(
        startOfDay.getTime() + (totalTravelTime + totalWorkTime) * 60 * 1000
      );

      logger.info('Route optimized for technician', {
        technicianId,
        stops: optimizedRoute.length,
        totalDistance,
        totalTravelTime,
      });

      return {
        optimizedRoute,
        totalDistance,
        totalTravelTime,
        estimatedCompletion,
      };
    } catch (error: unknown) {
      logger.error('Failed to optimize route', { technicianId, error });
      throw error;
    }
  }

  /**
   * Get technician performance analytics for mobile app
   */
  async getTechnicianPerformanceAnalytics(
    technicianId: string,
    period: 'WEEK' | 'MONTH' | 'QUARTER' = 'MONTH'
  ): Promise<{
    summary: {
      workOrdersCompleted: number;
      totalHoursWorked: number;
      averageCompletionTime: number;
      efficiencyRating: number;
    };
    trends: {
      completionRate: Array<{ period: string; rate: number }>;
      hoursWorked: Array<{ period: string; hours: number }>;
    };
    achievements: Array<{
      title: string;
      description: string;
      earnedDate: Date;
      category: 'EFFICIENCY' | 'QUALITY' | 'SAFETY' | 'CUSTOMER';
    }>;
    goals: Array<{
      title: string;
      current: number;
      target: number;
      unit: string;
      progress: number; // percentage
    }>;
  }> {
    try {
      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case 'WEEK':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'QUARTER':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default: // MONTH
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      const [workOrders, timeEntries] = await Promise.all([
        prisma.workOrder.findMany({
          where: {
            assignedTechnician: technicianId,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        
        prisma.workOrderTimeEntry.findMany({
          where: {
            technicianId,
            startTime: { gte: startDate, lte: endDate },
          },
        }),
      ]);

      const completedWorkOrders = workOrders.filter(wo => wo.status === 'COMPLETED');
      const totalHoursWorked = timeEntries.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
      const averageCompletionTime = completedWorkOrders.length > 0 
        ? totalHoursWorked / completedWorkOrders.length 
        : 0;

      // Calculate efficiency (simplified)
      const totalEstimatedHours = workOrders.reduce((sum, wo) => sum + (wo.estimatedHours || 0), 0);
      const efficiencyRating = totalEstimatedHours > 0 
        ? Math.min(100, (totalEstimatedHours / totalHoursWorked) * 100)
        : 0;

      // Generate mock achievements and goals
      const achievements = [
        {
          title: 'Efficiency Expert',
          description: 'Completed work orders under estimated time',
          earnedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          category: 'EFFICIENCY' as const,
        },
      ];

      const goals = [
        {
          title: 'Monthly Completion Target',
          current: completedWorkOrders.length,
          target: 20,
          unit: 'work orders',
          progress: Math.min(100, (completedWorkOrders.length / 20) * 100),
        },
        {
          title: 'Efficiency Target',
          current: Math.round(efficiencyRating),
          target: 85,
          unit: '%',
          progress: Math.min(100, (efficiencyRating / 85) * 100),
        },
      ];

      return {
        summary: {
          workOrdersCompleted: completedWorkOrders.length,
          totalHoursWorked,
          averageCompletionTime,
          efficiencyRating: Math.round(efficiencyRating),
        },
        trends: {
          completionRate: [], // Would generate weekly/daily completion rates
          hoursWorked: [], // Would generate weekly/daily hours worked
        },
        achievements,
        goals,
      };
    } catch (error: unknown) {
      logger.error('Failed to get technician performance analytics', { technicianId, error });
      throw error;
    }
  }
}

export const technicianMobileService = new TechnicianMobileService();