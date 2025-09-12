import { WorkOrderService, WorkOrderData, WorkOrderTaskData } from '../../src/services/WorkOrderService';
import { createTestOrganization, createTestUser, testDb } from '../setup';

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let organizationId: string;
  let userId: string;
  let assetId: string;

  beforeEach(async () => {
    service = new WorkOrderService();
    
    const organization = await createTestOrganization();
    organizationId = organization.id;
    
    const user = await createTestUser(organizationId);
    userId = user.id;

    // Create test asset for work orders
    const asset = await testDb.maintenanceAsset.create({
      data: {
        assetNumber: 'WO-ASSET-001',
        name: 'HVAC Unit #1',
        category: 'HVAC',
        manufacturer: 'Carrier',
        model: 'X13',
        location: 'Roof',
        organizationId,
        createdBy: userId,
      },
    });
    assetId = asset.id;
  });

  describe('createWorkOrder', () => {
    it('should create a work order with all required fields', async () => {
      const workOrderData: WorkOrderData = {
        title: 'HVAC Maintenance',
        description: 'Routine HVAC system maintenance',
        priority: 'NORMAL',
        type: 'PREVENTIVE',
        category: 'HVAC',
        location: 'Building A - Roof',
        building: 'Building A',
        floor: 'Roof',
        requestedDate: new Date(),
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        assignedTechnician: 'Tech-001',
        estimatedHours: 4,
        estimatedCost: 500,
        assetId,
        organizationId,
        createdBy: userId,
      };

      const workOrder = await service.createWorkOrder(workOrderData);

      expect(workOrder).toBeDefined();
      expect(workOrder.id).toBeDefined();
      expect(workOrder.workOrderNumber).toBeDefined();
      expect(workOrder.title).toBe(workOrderData.title);
      expect(workOrder.description).toBe(workOrderData.description);
      expect(workOrder.priority).toBe(workOrderData.priority);
      expect(workOrder.type).toBe(workOrderData.type);
      expect(workOrder.status).toBe('SUBMITTED');
      expect(workOrder.assetId).toBe(assetId);
      expect(workOrder.estimatedHours).toBe(4);
      expect(workOrder.estimatedCost).toBe(500);
    });

    it('should generate unique work order numbers', async () => {
      const workOrderData: WorkOrderData = {
        title: 'Test Work Order',
        priority: 'NORMAL',
        type: 'CORRECTIVE',
        location: 'Test Location',
        requestedDate: new Date(),
        organizationId,
        createdBy: userId,
      };

      const workOrder1 = await service.createWorkOrder(workOrderData);
      const workOrder2 = await service.createWorkOrder({
        ...workOrderData,
        title: 'Another Test Work Order',
      });

      expect(workOrder1.workOrderNumber).toBeDefined();
      expect(workOrder2.workOrderNumber).toBeDefined();
      expect(workOrder1.workOrderNumber).not.toBe(workOrder2.workOrderNumber);
    });

    it('should create emergency work order with high priority', async () => {
      const emergencyData: WorkOrderData = {
        title: 'Emergency Plumbing Repair',
        description: 'Water leak in main lobby',
        priority: 'EMERGENCY',
        type: 'EMERGENCY',
        category: 'Plumbing',
        location: 'Main Lobby',
        requestedDate: new Date(),
        requiresApproval: false,
        organizationId,
        createdBy: userId,
      };

      const workOrder = await service.createWorkOrder(emergencyData);

      expect(workOrder.priority).toBe('EMERGENCY');
      expect(workOrder.type).toBe('EMERGENCY');
      expect(workOrder.requiresApproval).toBe(false);
      expect(workOrder.status).toBe('SUBMITTED');
    });

    it('should link work order to asset', async () => {
      const workOrderData: WorkOrderData = {
        title: 'Asset-specific Maintenance',
        priority: 'NORMAL',
        type: 'PREVENTIVE',
        location: 'Equipment Room',
        requestedDate: new Date(),
        assetId,
        organizationId,
        createdBy: userId,
      };

      const workOrder = await service.createWorkOrder(workOrderData);

      expect(workOrder.assetId).toBe(assetId);

      // Verify relationship in database
      const workOrderWithAsset = await testDb.workOrder.findUnique({
        where: { id: workOrder.id },
        include: { asset: true },
      });

      expect(workOrderWithAsset?.asset).toBeDefined();
      expect(workOrderWithAsset?.asset?.name).toBe('HVAC Unit #1');
    });
  });

  describe('updateWorkOrderStatus', () => {
    let workOrderId: string;

    beforeEach(async () => {
      const workOrder = await service.createWorkOrder({
        title: 'Status Update Test',
        priority: 'NORMAL',
        type: 'CORRECTIVE',
        location: 'Test Location',
        requestedDate: new Date(),
        organizationId,
        createdBy: userId,
      });
      workOrderId = workOrder.id;
    });

    it('should update work order status to IN_PROGRESS', async () => {
      const updatedWorkOrder = await service.updateWorkOrderStatus(
        workOrderId,
        'IN_PROGRESS',
        userId
      );

      expect(updatedWorkOrder.status).toBe('IN_PROGRESS');
      expect(updatedWorkOrder.startDate).toBeDefined();
    });

    it('should update work order status to COMPLETED', async () => {
      // First move to in progress
      await service.updateWorkOrderStatus(workOrderId, 'IN_PROGRESS', userId);
      
      // Then complete
      const completedWorkOrder = await service.updateWorkOrderStatus(
        workOrderId,
        'COMPLETED',
        userId
      );

      expect(completedWorkOrder.status).toBe('COMPLETED');
      expect(completedWorkOrder.completionDate).toBeDefined();
      expect(completedWorkOrder.actualHours).toBeGreaterThan(0);
    });

    it('should calculate actual hours when completing work order', async () => {
      // Start work order
      const startedWorkOrder = await service.updateWorkOrderStatus(
        workOrderId,
        'IN_PROGRESS',
        userId
      );

      // Simulate some work time by updating start date to an hour ago
      await testDb.workOrder.update({
        where: { id: workOrderId },
        data: { startDate: new Date(Date.now() - 60 * 60 * 1000) },
      });

      // Complete work order
      const completedWorkOrder = await service.updateWorkOrderStatus(
        workOrderId,
        'COMPLETED',
        userId
      );

      expect(completedWorkOrder.actualHours).toBeGreaterThan(0.9);
      expect(completedWorkOrder.actualHours).toBeLessThan(1.1);
    });

    it('should handle invalid status transitions', async () => {
      await expect(
        service.updateWorkOrderStatus(workOrderId, 'COMPLETED', userId)
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('addWorkOrderTask', () => {
    let workOrderId: string;

    beforeEach(async () => {
      const workOrder = await service.createWorkOrder({
        title: 'Task Test Work Order',
        priority: 'NORMAL',
        type: 'PREVENTIVE',
        location: 'Test Location',
        requestedDate: new Date(),
        organizationId,
        createdBy: userId,
      });
      workOrderId = workOrder.id;
    });

    it('should add task to work order', async () => {
      const taskData: WorkOrderTaskData = {
        workOrderId,
        taskNumber: 1,
        title: 'Inspect Equipment',
        description: 'Visual inspection of all components',
        priority: 'HIGH',
        assignedTo: 'technician-001',
        estimatedHours: 2,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        instructions: 'Check for wear and tear',
        safetyNotes: 'Ensure equipment is powered off',
        skillsRequired: ['Electrical', 'HVAC'],
        toolsRequired: ['Multimeter', 'Screwdriver Set'],
      };

      const task = await service.addWorkOrderTask(taskData);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.workOrderId).toBe(workOrderId);
      expect(task.title).toBe(taskData.title);
      expect(task.priority).toBe(taskData.priority);
      expect(task.status).toBe('NOT_STARTED');
      expect(task.skillsRequired).toEqual(taskData.skillsRequired);
      expect(task.toolsRequired).toEqual(taskData.toolsRequired);
    });

    it('should create dependent tasks', async () => {
      const firstTask = await service.addWorkOrderTask({
        workOrderId,
        taskNumber: 1,
        title: 'Shutdown Equipment',
        priority: 'HIGH',
        skillsRequired: ['Safety'],
        toolsRequired: ['Lock-out Kit'],
      });

      const secondTask = await service.addWorkOrderTask({
        workOrderId,
        taskNumber: 2,
        title: 'Perform Maintenance',
        priority: 'MEDIUM',
        dependsOnTaskId: firstTask.id,
        skillsRequired: ['HVAC'],
        toolsRequired: ['Standard Tools'],
      });

      expect(secondTask.dependsOnTaskId).toBe(firstTask.id);

      // Verify relationship in database
      const taskWithDependency = await testDb.workOrderTask.findUnique({
        where: { id: secondTask.id },
        include: { dependsOnTask: true },
      });

      expect(taskWithDependency?.dependsOnTask?.title).toBe('Shutdown Equipment');
    });

    it('should enforce unique task numbers per work order', async () => {
      await service.addWorkOrderTask({
        workOrderId,
        taskNumber: 1,
        title: 'First Task',
        priority: 'NORMAL',
        skillsRequired: [],
        toolsRequired: [],
      });

      await expect(
        service.addWorkOrderTask({
          workOrderId,
          taskNumber: 1, // Same number
          title: 'Second Task',
          priority: 'NORMAL',
          skillsRequired: [],
          toolsRequired: [],
        })
      ).rejects.toThrow();
    });
  });

  describe('getWorkOrdersByStatus', () => {
    beforeEach(async () => {
      // Create work orders with different statuses
      const workOrder1 = await service.createWorkOrder({
        title: 'Submitted Work Order',
        priority: 'NORMAL',
        type: 'CORRECTIVE',
        location: 'Location 1',
        requestedDate: new Date(),
        organizationId,
        createdBy: userId,
      });

      const workOrder2 = await service.createWorkOrder({
        title: 'Another Work Order',
        priority: 'HIGH',
        type: 'PREVENTIVE',
        location: 'Location 2',
        requestedDate: new Date(),
        organizationId,
        createdBy: userId,
      });

      // Move second work order to in progress
      await service.updateWorkOrderStatus(workOrder2.id, 'IN_PROGRESS', userId);
    });

    it('should filter work orders by status', async () => {
      const submittedOrders = await service.getWorkOrdersByStatus(
        organizationId,
        'SUBMITTED'
      );
      
      const inProgressOrders = await service.getWorkOrdersByStatus(
        organizationId,
        'IN_PROGRESS'
      );

      expect(submittedOrders).toHaveLength(1);
      expect(submittedOrders[0].title).toBe('Submitted Work Order');
      expect(submittedOrders[0].status).toBe('SUBMITTED');

      expect(inProgressOrders).toHaveLength(1);
      expect(inProgressOrders[0].title).toBe('Another Work Order');
      expect(inProgressOrders[0].status).toBe('IN_PROGRESS');
    });

    it('should include related asset information', async () => {
      const workOrder = await service.createWorkOrder({
        title: 'Work Order with Asset',
        priority: 'NORMAL',
        type: 'PREVENTIVE',
        location: 'Test Location',
        requestedDate: new Date(),
        assetId,
        organizationId,
        createdBy: userId,
      });

      const workOrders = await service.getWorkOrdersByStatus(
        organizationId,
        'SUBMITTED'
      );

      const orderWithAsset = workOrders.find(wo => wo.id === workOrder.id);
      expect(orderWithAsset).toBeDefined();
      expect(orderWithAsset?.asset).toBeDefined();
      expect(orderWithAsset?.asset?.name).toBe('HVAC Unit #1');
    });
  });

  describe('calculateWorkOrderMetrics', () => {
    beforeEach(async () => {
      // Create work orders with different statuses and priorities for metrics
      const workOrders = [
        { title: 'Emergency Repair', priority: 'EMERGENCY', type: 'EMERGENCY', estimatedCost: 1000 },
        { title: 'Urgent Fix', priority: 'URGENT', type: 'CORRECTIVE', estimatedCost: 500 },
        { title: 'Normal Maintenance', priority: 'NORMAL', type: 'PREVENTIVE', estimatedCost: 200 },
        { title: 'Low Priority Task', priority: 'LOW', type: 'INSPECTION', estimatedCost: 100 },
      ];

      for (const orderData of workOrders) {
        const workOrder = await service.createWorkOrder({
          ...orderData,
          location: 'Test Location',
          requestedDate: new Date(),
          organizationId,
          createdBy: userId,
        });

        // Complete some work orders for metrics
        if (orderData.priority !== 'EMERGENCY') {
          await service.updateWorkOrderStatus(workOrder.id, 'IN_PROGRESS', userId);
          if (orderData.priority === 'LOW') {
            await service.updateWorkOrderStatus(workOrder.id, 'COMPLETED', userId);
          }
        }
      }
    });

    it('should calculate work order metrics correctly', async () => {
      const metrics = await service.calculateWorkOrderMetrics(organizationId);

      expect(metrics).toHaveProperty('totalWorkOrders');
      expect(metrics).toHaveProperty('completedWorkOrders');
      expect(metrics).toHaveProperty('averageCompletionTime');
      expect(metrics).toHaveProperty('totalEstimatedCost');
      expect(metrics).toHaveProperty('workOrdersByStatus');
      expect(metrics).toHaveProperty('workOrdersByPriority');

      expect(metrics.totalWorkOrders).toBe(4);
      expect(metrics.completedWorkOrders).toBe(1);
      expect(metrics.totalEstimatedCost).toBe(1800); // Sum of all estimated costs

      expect(metrics.workOrdersByStatus).toHaveProperty('SUBMITTED');
      expect(metrics.workOrdersByStatus).toHaveProperty('IN_PROGRESS');
      expect(metrics.workOrdersByStatus).toHaveProperty('COMPLETED');

      expect(metrics.workOrdersByPriority).toHaveProperty('EMERGENCY');
      expect(metrics.workOrdersByPriority).toHaveProperty('URGENT');
      expect(metrics.workOrdersByPriority).toHaveProperty('NORMAL');
      expect(metrics.workOrdersByPriority).toHaveProperty('LOW');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle non-existent work order updates', async () => {
      const fakeId = 'non-existent-work-order-id';
      
      await expect(
        service.updateWorkOrderStatus(fakeId, 'IN_PROGRESS', userId)
      ).rejects.toThrow('Work order not found');
    });

    it('should handle invalid priority values', async () => {
      await expect(
        service.createWorkOrder({
          title: 'Invalid Priority',
          priority: 'INVALID_PRIORITY',
          type: 'CORRECTIVE',
          location: 'Test Location',
          requestedDate: new Date(),
          organizationId,
          createdBy: userId,
        })
      ).rejects.toThrow();
    });

    it('should handle work orders without estimated costs', async () => {
      const workOrder = await service.createWorkOrder({
        title: 'No Cost Work Order',
        priority: 'NORMAL',
        type: 'INSPECTION',
        location: 'Test Location',
        requestedDate: new Date(),
        organizationId,
        createdBy: userId,
      });

      expect(workOrder.estimatedCost).toBe(0);
    });

    it('should calculate metrics for organization with no work orders', async () => {
      const emptyOrgId = 'empty-organization-id';
      const metrics = await service.calculateWorkOrderMetrics(emptyOrgId);

      expect(metrics.totalWorkOrders).toBe(0);
      expect(metrics.completedWorkOrders).toBe(0);
      expect(metrics.totalEstimatedCost).toBe(0);
    });
  });
});