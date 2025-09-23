import express from 'express';
import { workOrderService } from '@/services/WorkOrderService';
import { logger } from '@/config/logger';

const router = express.Router();

/**
 * @swagger
 * /api/work-orders:
 *   get:
 *     summary: Search work orders
 *     tags: [Work Orders]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of work orders
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID required' });

      return;
      return;
    }

    const filters = {
      organizationId,
      status: req.query.status as string,
      priority: req.query.priority as string,
      type: req.query.type as string,
      assignedTo: req.query.assignedTo as string,
      assetId: req.query.assetId as string,
      location: req.query.location as string,
      building: req.query.building as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      overdueOnly: req.query.overdueOnly === 'true',
    };

    const result = await workOrderService.searchWorkOrders(
      filters,
      page,
      limit,
      req.query.sortBy as string,
      req.query.sortOrder as 'asc' | 'desc'
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Failed to search work orders', error);
    res.status(500).json({
      error: 'Failed to search work orders',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/work-orders:
 *   post:
 *     summary: Create work order
 *     tags: [Work Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               priority:
 *                 type: string
 *               type:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Work order created successfully
 */
router.post('/', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const createdBy = req.headers['x-user-id'] as string;

    if (!organizationId || !createdBy) {
      res.status(400).json({ error: 'Organization ID and User ID required' });

      return;
      return;
    }

    const workOrderData = {
      ...req.body,
      organizationId,
      createdBy,
      requestedDate: new Date(),
    };

    const workOrder = await workOrderService.createWorkOrder(workOrderData);

    res.status(201).json({
      success: true,
      data: workOrder,
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to create work order', error);
    res.status(500).json({
      error: 'Failed to create work order',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/work-orders/{id}:
 *   get:
 *     summary: Get work order by ID
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Work order details
 */
router.get('/:id', async (req, res) => {
  try {
    const workOrder = await workOrderService.getWorkOrder(req.params.id);
    
    res.json({
      success: true,
      data: workOrder,
    });
  } catch (error: unknown) {
    logger.error('Failed to get work order', error);
    res.status(error instanceof Error && (error).message === 'Work order not found' ? 404 : 500).json({
      error: 'Failed to get work order',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/work-orders/{id}/status:
 *   put:
 *     summary: Update work order status
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Work order status updated
 */
router.put('/:id/status', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const updatedBy = req.headers['x-user-id'] as string;
    const { status, notes } = req.body;

    if (!updatedBy) {
      res.status(400).json({ error: 'User ID required' });

      return;
      return;
    }

    if (!status) {
      res.status(400).json({ error: 'Status is required' });

      return;
      return;
    }

    const workOrder = await workOrderService.updateWorkOrderStatus(workOrderId, status, updatedBy, notes);

    res.json({
      success: true,
      data: workOrder,
    });
  } catch (error: unknown) {
    logger.error('Failed to update work order status', error);
    res.status(500).json({
      error: 'Failed to update work order status',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/work-orders/{id}/tasks:
 *   post:
 *     summary: Add task to work order
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskNumber:
 *                 type: integer
 *               title:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task added successfully
 */
router.post('/:id/tasks', async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      workOrderId: req.params.id,
      skillsRequired: req.body.skillsRequired || [],
      toolsRequired: req.body.toolsRequired || [],
    };

    const task = await workOrderService.addWorkOrderTask(taskData);

    res.status(201).json({
      success: true,
      data: task,
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to add work order task', error);
    res.status(500).json({
      error: 'Failed to add work order task',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/work-orders/{id}/materials:
 *   post:
 *     summary: Add material to work order
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemName:
 *                 type: string
 *               quantity:
 *                 type: number
 *               unitCost:
 *                 type: number
 *     responses:
 *       201:
 *         description: Material added successfully
 */
router.post('/:id/materials', async (req, res) => {
  try {
    const materialData = {
      ...req.body,
      workOrderId: req.params.id,
      requestedDate: new Date(),
    };

    const material = await workOrderService.addWorkOrderMaterial(materialData);

    res.status(201).json({
      success: true,
      data: material,
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to add work order material', error);
    res.status(500).json({
      error: 'Failed to add work order material',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/work-orders/{id}/time-entries:
 *   post:
 *     summary: Record time entry for work order
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               technicianId:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Time entry recorded successfully
 */
router.post('/:id/time-entries', async (req, res) => {
  try {
    const timeEntryData = {
      ...req.body,
      workOrderId: req.params.id,
      startTime: new Date(req.body.startTime),
      endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
    };

    const timeEntry = await workOrderService.recordTimeEntry(timeEntryData);

    res.status(201).json({
      success: true,
      data: timeEntry,
    });


    return;
  } catch (error: unknown) {
    logger.error('Failed to record time entry', error);
    res.status(500).json({
      error: 'Failed to record time entry',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/work-orders/tasks/{taskId}/status:
 *   put:
 *     summary: Update task status
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               actualHours:
 *                 type: number
 *     responses:
 *       200:
 *         description: Task status updated
 */
router.put('/tasks/:taskId/status', async (req, res) => {
  try {
    const {taskId} = req.params;
    const updatedBy = req.headers['x-user-id'] as string;
    const { status, actualHours, notes } = req.body;

    if (!updatedBy) {
      res.status(400).json({ error: 'User ID required' });

      return;
      return;
    }

    if (!status) {
      res.status(400).json({ error: 'Status is required' });

      return;
      return;
    }

    const task = await workOrderService.updateTaskStatus(taskId, status, updatedBy, actualHours, notes);

    res.json({
      success: true,
      data: task,
    });
  } catch (error: unknown) {
    logger.error('Failed to update task status', error);
    res.status(500).json({
      error: 'Failed to update task status',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/work-orders/{id}/assign:
 *   put:
 *     summary: Assign work order to technician
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               technicianId:
 *                 type: string
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Work order assigned successfully
 */
router.put('/:id/assign', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const assignedBy = req.headers['x-user-id'] as string;
    const { technicianId, scheduledDate } = req.body;

    if (!assignedBy) {
      res.status(400).json({ error: 'User ID required' });

      return;
      return;
    }

    if (!technicianId) {
      res.status(400).json({ error: 'Technician ID is required' });

      return;
      return;
    }

    const workOrder = await workOrderService.assignWorkOrder(
      workOrderId,
      technicianId,
      new Date(scheduledDate),
      assignedBy
    );

    res.json({
      success: true,
      data: workOrder,
    });
  } catch (error: unknown) {
    logger.error('Failed to assign work order', error);
    res.status(500).json({
      error: 'Failed to assign work order',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/work-orders/metrics:
 *   get:
 *     summary: Get work order metrics
 *     tags: [Work Orders]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for metrics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for metrics
 *     responses:
 *       200:
 *         description: Work order metrics and analytics
 */
router.get('/metrics', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID required' });

      return;
      return;
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const metrics = await workOrderService.getWorkOrderMetrics(organizationId, startDate, endDate);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error: unknown) {
    logger.error('Failed to get work order metrics', error);
    res.status(500).json({
      error: 'Failed to get work order metrics',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * @swagger
 * /api/work-orders/technician/{technicianId}/schedule:
 *   get:
 *     summary: Get technician schedule
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: technicianId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for schedule
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for schedule
 *     responses:
 *       200:
 *         description: Technician schedule
 */
router.get('/technician/:technicianId/schedule', async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { technicianId } = req.params;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID required' });

      return;
      return;
    }

    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : new Date(); // Default: today

    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: next 7 days

    const schedule = await workOrderService.getTechnicianSchedule(
      technicianId,
      startDate,
      endDate,
      organizationId
    );

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error: unknown) {
    logger.error('Failed to get technician schedule', error);
    res.status(500).json({
      error: 'Failed to get technician schedule',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });

    return;
  }
});

export default router;