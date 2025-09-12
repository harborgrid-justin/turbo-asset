import { PrismaClient } from '@prisma/client';
import { logger } from '@/config/logger';

const prisma = new PrismaClient();

export interface CapitalProjectData {
  projectNumber?: string;
  projectName: string;
  description?: string;
  category: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  approvedBudget: number;
  designCost?: number;
  constructionCost?: number;
  equipmentCost?: number;
  contingencyCost?: number;
  projectManager: string;
  sponsor?: string;
  stakeholders?: string[];
  priority: string;
  riskLevel: string;
  affectedAssets?: string[];
  approvalRequired?: boolean;
  organizationId: string;
  createdBy: string;
}

export interface ProjectTaskData {
  projectId: string;
  taskNumber: string;
  taskName: string;
  description?: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  duration: number;
  assignedTo?: string;
  assignedTeam?: string;
  predecessorTaskId?: string;
  budgetAmount?: number;
  isCritical?: boolean;
}

export interface ProjectBudgetData {
  projectId: string;
  budgetCategory: string;
  description?: string;
  originalAmount: number;
  approvedAmount: number;
  approvedBy?: string;
}

export interface ProjectFilters {
  status?: string;
  category?: string;
  priority?: string;
  projectManager?: string;
  sponsor?: string;
  budgetRange?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
  riskLevel?: string;
  organizationId: string;
}

export interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  projectsByStatus: { [status: string]: number };
  projectsByCategory: { [category: string]: number };
  projectsByPriority: { [priority: string]: number };
  budgetMetrics: {
    totalApprovedBudget: number;
    totalSpentToDate: number;
    totalCommitments: number;
    remainingBudget: number;
    budgetUtilization: number; // percentage
  };
  scheduleMetrics: {
    onTimeProjects: number;
    delayedProjects: number;
    averageDelay: number; // days
  };
  riskMetrics: {
    highRiskProjects: number;
    mediumRiskProjects: number;
    lowRiskProjects: number;
  };
  performanceMetrics: {
    averageCostVariance: number;
    averageScheduleVariance: number;
    successRate: number; // percentage
  };
  portfolioValue: number;
  roi: number;
}

export interface ProjectScheduleAnalysis {
  criticalPath: Array<{
    taskId: string;
    taskName: string;
    startDate: Date;
    endDate: Date;
    duration: number;
    predecessors: string[];
    successors: string[];
  }>;
  projectDuration: number;
  earliestCompletion: Date;
  latestCompletion: Date;
  totalFloat: number;
  riskFactors: Array<{
    type: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    probability: number;
    mitigation: string;
  }>;
}

export interface BudgetVarianceAnalysis {
  variances: Array<{
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercent: number;
    status: 'OVER_BUDGET' | 'UNDER_BUDGET' | 'ON_BUDGET';
  }>;
  totalVariance: number;
  totalVariancePercent: number;
  forecastAtCompletion: number;
  costPerformanceIndex: number;
  schedulePerformanceIndex: number;
  estimateToComplete: number;
}

/**
 * CapitalProjectService - Comprehensive capital project management
 * Handles project lifecycle, budget tracking, and schedule management
 * Supports complex project hierarchies and resource optimization
 */
export class CapitalProjectService {

  /**
   * Create new capital project
   */
  async createCapitalProject(projectData: CapitalProjectData): Promise<any> {
    try {
      // Generate project number if not provided
      if (!projectData.projectNumber) {
        projectData.projectNumber = await this.generateProjectNumber(projectData.organizationId);
      }

      // Calculate remaining budget
      const totalCosts = (projectData.designCost || 0) + 
                        (projectData.constructionCost || 0) + 
                        (projectData.equipmentCost || 0) + 
                        (projectData.contingencyCost || 0);
      
      const currentBudget = totalCosts > 0 ? totalCosts : projectData.approvedBudget;
      const remainingBudget = currentBudget;

      const project = await prisma.capitalProject.create({
        data: {
          projectNumber: projectData.projectNumber,
          projectName: projectData.projectName,
          description: projectData.description,
          category: projectData.category as any,
          status: 'PLANNING',
          phase: 'INITIATION',
          plannedStartDate: projectData.plannedStartDate,
          plannedEndDate: projectData.plannedEndDate,
          approvedBudget: projectData.approvedBudget,
          currentBudget,
          spentToDate: 0,
          commitments: 0,
          remainingBudget,
          designCost: projectData.designCost || 0,
          constructionCost: projectData.constructionCost || 0,
          equipmentCost: projectData.equipmentCost || 0,
          contingencyCost: projectData.contingencyCost || 0,
          projectManager: projectData.projectManager,
          sponsor: projectData.sponsor,
          stakeholders: projectData.stakeholders || [],
          priority: projectData.priority as any,
          riskLevel: projectData.riskLevel as any,
          affectedAssets: projectData.affectedAssets || [],
          approvalRequired: projectData.approvalRequired !== false,
          organizationId: projectData.organizationId,
          createdBy: projectData.createdBy,
        },
        include: {
          tasks: true,
          budgetEntries: true,
        },
      });

      // Create default budget entries
      const budgetCategories = [
        { category: 'DESIGN', amount: projectData.designCost || 0 },
        { category: 'CONSTRUCTION', amount: projectData.constructionCost || 0 },
        { category: 'EQUIPMENT', amount: projectData.equipmentCost || 0 },
        { category: 'CONTINGENCY', amount: projectData.contingencyCost || 0 },
      ];

      for (const budgetItem of budgetCategories) {
        if (budgetItem.amount > 0) {
          await this.addProjectBudget({
            projectId: project.id,
            budgetCategory: budgetItem.category,
            description: `${budgetItem.category} budget allocation`,
            originalAmount: budgetItem.amount,
            approvedAmount: budgetItem.amount,
          });
        }
      }

      logger.info('Capital project created', {
        projectId: project.id,
        projectNumber: project.projectNumber,
        approvedBudget: project.approvedBudget,
      });

      return project;
    } catch (error: unknown) {
      logger.error('Failed to create capital project', error);
      throw error;
    }
  }

  /**
   * Add task to project
   */
  async addProjectTask(taskData: ProjectTaskData): Promise<any> {
    try {
      // Validate predecessor exists
      if (taskData.predecessorTaskId) {
        const predecessor = await prisma.projectTask.findUnique({
          where: { id: taskData.predecessorTaskId },
        });
        
        if (!predecessor) {
          throw new Error('Predecessor task not found');
        }
      }

      const task = await prisma.projectTask.create({
        data: {
          projectId: taskData.projectId,
          taskNumber: taskData.taskNumber,
          taskName: taskData.taskName,
          description: taskData.description,
          plannedStartDate: taskData.plannedStartDate,
          plannedEndDate: taskData.plannedEndDate,
          duration: taskData.duration,
          status: 'NOT_STARTED',
          percentComplete: 0,
          assignedTo: taskData.assignedTo,
          assignedTeam: taskData.assignedTeam,
          predecessorTaskId: taskData.predecessorTaskId,
          budgetAmount: taskData.budgetAmount,
          actualCost: 0,
          isCritical: taskData.isCritical || false,
        },
      });

      // Update project phase if this is the first task
      const project = await prisma.capitalProject.findUnique({
        where: { id: taskData.projectId },
        include: { tasks: true },
      });

      if (project && project.tasks.length === 1 && project.phase === 'INITIATION') {
        await prisma.capitalProject.update({
          where: { id: taskData.projectId },
          data: { phase: 'PLANNING' },
        });
      }

      logger.info('Project task added', {
        taskId: task.id,
        projectId: taskData.projectId,
        taskNumber: task.taskNumber,
      });

      return task;
    } catch (error: unknown) {
      logger.error('Failed to add project task', error);
      throw error;
    }
  }

  /**
   * Update task progress
   */
  async updateTaskProgress(
    taskId: string,
    progressData: {
      percentComplete: number;
      status?: string;
      actualStartDate?: Date;
      actualEndDate?: Date;
      actualCost?: number;
      notes?: string;
      updatedBy: string;
    }
  ): Promise<any> {
    try {
      const updateData: any = {
        percentComplete: Math.max(0, Math.min(100, progressData.percentComplete)),
        updatedAt: new Date(),
      };

      if (progressData.status) {
        updateData.status = progressData.status;
      }
      
      if (progressData.actualStartDate) {
        updateData.actualStartDate = progressData.actualStartDate;
      }
      
      if (progressData.actualEndDate) {
        updateData.actualEndDate = progressData.actualEndDate;
        updateData.status = 'COMPLETED';
      }
      
      if (progressData.actualCost) {
        updateData.actualCost = progressData.actualCost;
      }

      const updatedTask = await prisma.projectTask.update({
        where: { id: taskId },
        data: updateData,
        include: {
          project: {
            include: {
              tasks: true,
            },
          },
        },
      });

      // Update project progress and budget
      await this.updateProjectProgress(updatedTask.project.id);

      logger.info('Task progress updated', {
        taskId,
        percentComplete: progressData.percentComplete,
        status: progressData.status,
        updatedBy: progressData.updatedBy,
      });

      return updatedTask;
    } catch (error: unknown) {
      logger.error('Failed to update task progress', { taskId, error });
      throw error;
    }
  }

  /**
   * Add budget entry to project
   */
  async addProjectBudget(budgetData: ProjectBudgetData): Promise<any> {
    try {
      const budget = await prisma.projectBudget.create({
        data: {
          projectId: budgetData.projectId,
          budgetCategory: budgetData.budgetCategory as any,
          description: budgetData.description,
          originalAmount: budgetData.originalAmount,
          revisedAmount: budgetData.originalAmount,
          approvedAmount: budgetData.approvedAmount,
          commitments: 0,
          actualCost: 0,
          remainingAmount: budgetData.approvedAmount,
          budgetDate: new Date(),
          approvedBy: budgetData.approvedBy,
          approvedDate: budgetData.approvedBy ? new Date() : undefined,
        },
      });

      // Update project total budget
      await this.recalculateProjectBudget(budgetData.projectId);

      logger.info('Project budget added', {
        budgetId: budget.id,
        projectId: budgetData.projectId,
        category: budget.budgetCategory,
        amount: budget.approvedAmount,
      });

      return budget;
    } catch (error: unknown) {
      logger.error('Failed to add project budget', error);
      throw error;
    }
  }

  /**
   * Search capital projects with filtering
   */
  async searchCapitalProjects(
    filters: ProjectFilters,
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{
    projects: any[];
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
      if (filters.category) {
        where.category = filters.category;
      }
      if (filters.priority) {
        where.priority = filters.priority;
      }
      if (filters.projectManager) {
        where.projectManager = filters.projectManager;
      }
      if (filters.sponsor) {
        where.sponsor = filters.sponsor;
      }
      if (filters.riskLevel) {
        where.riskLevel = filters.riskLevel;
      }
      if (filters.budgetRange) {
        where.approvedBudget = {
          gte: filters.budgetRange.min,
          lte: filters.budgetRange.max,
        };
      }
      if (filters.dateRange) {
        where.plannedStartDate = {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end,
        };
      }

      // Get total count
      const totalCount = await prisma.capitalProject.count({ where });

      // Get projects
      const projects = await prisma.capitalProject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          tasks: {
            select: {
              id: true,
              status: true,
              percentComplete: true,
            },
          },
          budgetEntries: {
            select: {
              budgetCategory: true,
              approvedAmount: true,
              actualCost: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              budgetEntries: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        projects,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error: unknown) {
      logger.error('Failed to search capital projects', { filters, error });
      throw error;
    }
  }

  /**
   * Get comprehensive project metrics
   */
  async getProjectMetrics(organizationId: string): Promise<ProjectMetrics> {
    try {
      const [
        totalProjects,
        projectsByStatus,
        projectsByCategory,
        projectsByPriority,
        budgetAggregates,
        scheduleMetrics,
        riskMetrics,
      ] = await Promise.all([
        // Total projects
        prisma.capitalProject.count({
          where: { organizationId },
        }),

        // Projects by status
        prisma.capitalProject.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),

        // Projects by category
        prisma.capitalProject.groupBy({
          by: ['category'],
          where: { organizationId },
          _count: true,
        }),

        // Projects by priority
        prisma.capitalProject.groupBy({
          by: ['priority'],
          where: { organizationId },
          _count: true,
        }),

        // Budget aggregates
        prisma.capitalProject.aggregate({
          where: { organizationId },
          _sum: {
            approvedBudget: true,
            spentToDate: true,
            commitments: true,
            remainingBudget: true,
          },
        }),

        // Schedule performance
        this.calculateScheduleMetrics(organizationId),

        // Risk analysis
        prisma.capitalProject.groupBy({
          by: ['riskLevel'],
          where: { organizationId },
          _count: true,
        }),
      ]);

      // Process grouped results
      const statusBreakdown: { [status: string]: number } = {};
      projectsByStatus.forEach((group) => {
        statusBreakdown[group.status] = group._count;
      });

      const categoryBreakdown: { [category: string]: number } = {};
      projectsByCategory.forEach((group) => {
        categoryBreakdown[group.category] = group._count;
      });

      const priorityBreakdown: { [priority: string]: number } = {};
      projectsByPriority.forEach((group) => {
        priorityBreakdown[group.priority] = group._count;
      });

      const riskBreakdown: { [risk: string]: number } = {};
      riskMetrics.forEach((group) => {
        riskBreakdown[group.riskLevel] = group._count;
      });

      // Calculate performance metrics
      const totalApprovedBudget = budgetAggregates._sum.approvedBudget || 0;
      const totalSpentToDate = budgetAggregates._sum.spentToDate || 0;
      const budgetUtilization = totalApprovedBudget > 0 ? (totalSpentToDate / totalApprovedBudget) * 100 : 0;

      // Calculate cost and schedule variances (simplified)
      const performanceMetrics = await this.calculatePerformanceMetrics(organizationId);

      return {
        totalProjects,
        activeProjects: statusBreakdown['IN_PROGRESS'] || 0,
        completedProjects: statusBreakdown['COMPLETED'] || 0,
        projectsByStatus: statusBreakdown,
        projectsByCategory: categoryBreakdown,
        projectsByPriority: priorityBreakdown,
        budgetMetrics: {
          totalApprovedBudget,
          totalSpentToDate,
          totalCommitments: budgetAggregates._sum.commitments || 0,
          remainingBudget: budgetAggregates._sum.remainingBudget || 0,
          budgetUtilization,
        },
        scheduleMetrics,
        riskMetrics: {
          highRiskProjects: riskBreakdown['HIGH'] || 0,
          mediumRiskProjects: riskBreakdown['MEDIUM'] || 0,
          lowRiskProjects: riskBreakdown['LOW'] || 0,
        },
        performanceMetrics,
        portfolioValue: totalApprovedBudget,
        roi: performanceMetrics.successRate,
      };
    } catch (error: unknown) {
      logger.error('Failed to get project metrics', { organizationId, error });
      throw error;
    }
  }

  /**
   * Analyze project schedule and critical path
   */
  async analyzeProjectSchedule(projectId: string): Promise<ProjectScheduleAnalysis> {
    try {
      const project = await prisma.capitalProject.findUnique({
        where: { id: projectId },
        include: {
          tasks: {
            include: {
              predecessorTask: true,
              successorTasks: true,
            },
            orderBy: { plannedStartDate: 'asc' },
          },
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Build dependency graph
      const taskMap = new Map(project.tasks.map(task => [task.id, task]));
      const dependencies = new Map<string, string[]>();
      
      project.tasks.forEach(task => {
        dependencies.set(task.id, task.predecessorTaskId ? [task.predecessorTaskId] : []);
      });

      // Calculate critical path using simplified algorithm
      const criticalPath = this.calculateCriticalPath(project.tasks, dependencies);
      
      // Calculate project duration
      const projectDuration = project.tasks.reduce((max, task) => {
        const endDate = task.actualEndDate || task.plannedEndDate;
        const duration = Math.ceil((endDate.getTime() - project.plannedStartDate.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(max, duration);
      }, 0);

      // Calculate earliest and latest completion dates
      const plannedEnd = project.plannedEndDate;
      const actualEnd = project.actualEndDate || new Date(project.plannedStartDate.getTime() + projectDuration * 24 * 60 * 60 * 1000);

      // Identify risk factors
      const riskFactors = this.identifyScheduleRisks(project.tasks);

      // Calculate total float
      const totalFloat = this.calculateTotalFloat(project.tasks, criticalPath);

      return {
        criticalPath,
        projectDuration,
        earliestCompletion: actualEnd,
        latestCompletion: plannedEnd,
        totalFloat,
        riskFactors,
      };
    } catch (error: unknown) {
      logger.error('Failed to analyze project schedule', { projectId, error });
      throw error;
    }
  }

  /**
   * Analyze budget variance
   */
  async analyzeBudgetVariance(projectId: string): Promise<BudgetVarianceAnalysis> {
    try {
      const project = await prisma.capitalProject.findUnique({
        where: { id: projectId },
        include: {
          budgetEntries: true,
          tasks: true,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const variances = project.budgetEntries.map(budget => {
        const budgeted = budget.approvedAmount;
        const actual = budget.actualCost;
        const variance = actual - budgeted;
        const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
        
        let status: 'OVER_BUDGET' | 'UNDER_BUDGET' | 'ON_BUDGET';
        if (Math.abs(variancePercent) <= 5) {
          status = 'ON_BUDGET';
        } else if (variance > 0) {
          status = 'OVER_BUDGET';
        } else {
          status = 'UNDER_BUDGET';
        }

        return {
          category: budget.budgetCategory,
          budgeted,
          actual,
          variance,
          variancePercent,
          status,
        };
      });

      const totalBudgeted = variances.reduce((sum, v) => sum + v.budgeted, 0);
      const totalActual = variances.reduce((sum, v) => sum + v.actual, 0);
      const totalVariance = totalActual - totalBudgeted;
      const totalVariancePercent = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;

      // Calculate earned value metrics
      const percentComplete = project.tasks.length > 0 
        ? project.tasks.reduce((sum, task) => sum + task.percentComplete, 0) / project.tasks.length / 100
        : 0;

      const earnedValue = totalBudgeted * percentComplete;
      const costPerformanceIndex = earnedValue > 0 ? earnedValue / totalActual : 0;
      
      // Schedule performance (simplified)
      const plannedDuration = (project.plannedEndDate.getTime() - project.plannedStartDate.getTime()) / (1000 * 60 * 60 * 24);
      const actualDuration = (new Date().getTime() - project.plannedStartDate.getTime()) / (1000 * 60 * 60 * 24);
      const schedulePerformanceIndex = actualDuration > 0 ? (plannedDuration / actualDuration) * percentComplete : 1;

      const estimateAtCompletion = costPerformanceIndex > 0 ? totalBudgeted / costPerformanceIndex : totalBudgeted;
      const estimateToComplete = Math.max(0, estimateAtCompletion - totalActual);

      return {
        variances,
        totalVariance,
        totalVariancePercent,
        forecastAtCompletion: estimateAtCompletion,
        costPerformanceIndex,
        schedulePerformanceIndex,
        estimateToComplete,
      };
    } catch (error: unknown) {
      logger.error('Failed to analyze budget variance', { projectId, error });
      throw error;
    }
  }

  // Private helper methods

  private async generateProjectNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.capitalProject.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `CAP-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    try {
      const project = await prisma.capitalProject.findUnique({
        where: { id: projectId },
        include: {
          tasks: true,
          budgetEntries: true,
        },
      });

      if (!project) {return;}

      // Calculate overall progress
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length;
      const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate spent to date
      const spentToDate = project.budgetEntries.reduce((sum, budget) => sum + budget.actualCost, 0);
      const commitments = project.budgetEntries.reduce((sum, budget) => sum + budget.commitments, 0);
      const remainingBudget = project.currentBudget - spentToDate - commitments;

      // Determine project status and phase
      let status = project.status;
      let phase = project.phase;

      if (overallProgress === 100) {
        status = 'COMPLETED';
        phase = 'CLOSING';
      } else if (overallProgress > 0) {
        status = 'IN_PROGRESS';
        phase = 'EXECUTION';
      }

      await prisma.capitalProject.update({
        where: { id: projectId },
        data: {
          spentToDate,
          commitments,
          remainingBudget,
          status: status as any,
          phase: phase as any,
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to update project progress', { projectId, error });
    }
  }

  private async recalculateProjectBudget(projectId: string): Promise<void> {
    try {
      const budgetEntries = await prisma.projectBudget.findMany({
        where: { projectId },
      });

      const totalBudget = budgetEntries.reduce((sum, entry) => sum + entry.approvedAmount, 0);

      await prisma.capitalProject.update({
        where: { id: projectId },
        data: {
          currentBudget: totalBudget,
          remainingBudget: totalBudget, // Will be updated as costs are incurred
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to recalculate project budget', { projectId, error });
    }
  }

  private async calculateScheduleMetrics(organizationId: string): Promise<ProjectMetrics['scheduleMetrics']> {
    const projects = await prisma.capitalProject.findMany({
      where: { organizationId },
      select: {
        plannedEndDate: true,
        actualEndDate: true,
        status: true,
      },
    });

    let onTimeProjects = 0;
    let delayedProjects = 0;
    let totalDelay = 0;

    projects.forEach(project => {
      if (project.actualEndDate) {
        const delay = (project.actualEndDate.getTime() - project.plannedEndDate.getTime()) / (1000 * 60 * 60 * 24);
        if (delay <= 0) {
          onTimeProjects++;
        } else {
          delayedProjects++;
          totalDelay += delay;
        }
      } else if (project.status === 'COMPLETED') {
        // Assume on time if completed without actual end date
        onTimeProjects++;
      }
    });

    const averageDelay = delayedProjects > 0 ? totalDelay / delayedProjects : 0;

    return {
      onTimeProjects,
      delayedProjects,
      averageDelay,
    };
  }

  private async calculatePerformanceMetrics(organizationId: string): Promise<ProjectMetrics['performanceMetrics']> {
    const projects = await prisma.capitalProject.findMany({
      where: { organizationId },
      include: {
        budgetEntries: true,
      },
    });

    let totalCostVariance = 0;
    let totalScheduleVariance = 0;
    let successfulProjects = 0;
    const totalProjects = projects.length;

    projects.forEach(project => {
      // Cost variance
      const totalBudget = project.budgetEntries.reduce((sum, entry) => sum + entry.approvedAmount, 0);
      const totalActual = project.budgetEntries.reduce((sum, entry) => sum + entry.actualCost, 0);
      const costVariance = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;
      totalCostVariance += Math.abs(costVariance);

      // Schedule variance (simplified)
      if (project.actualEndDate) {
        const plannedDuration = (project.plannedEndDate.getTime() - project.plannedStartDate.getTime()) / (1000 * 60 * 60 * 24);
        const actualDuration = (project.actualEndDate.getTime() - project.plannedStartDate.getTime()) / (1000 * 60 * 60 * 24);
        const scheduleVariance = plannedDuration > 0 ? ((actualDuration - plannedDuration) / plannedDuration) * 100 : 0;
        totalScheduleVariance += Math.abs(scheduleVariance);
      }

      // Success criteria (on time and on budget)
      const onTime = !project.actualEndDate || project.actualEndDate <= project.plannedEndDate;
      const onBudget = Math.abs(costVariance) <= 10; // Within 10%
      if (onTime && onBudget && project.status === 'COMPLETED') {
        successfulProjects++;
      }
    });

    return {
      averageCostVariance: totalProjects > 0 ? totalCostVariance / totalProjects : 0,
      averageScheduleVariance: totalProjects > 0 ? totalScheduleVariance / totalProjects : 0,
      successRate: totalProjects > 0 ? (successfulProjects / totalProjects) * 100 : 0,
    };
  }

  private calculateCriticalPath(
    tasks: any[],
    dependencies: Map<string, string[]>
  ): ProjectScheduleAnalysis['criticalPath'] {
    // Simplified critical path calculation
    // In a real implementation, this would use a proper CPM algorithm
    
    const criticalTasks = tasks
      .filter(task => task.isCritical || task.floatDays === 0)
      .map(task => ({
        taskId: task.id,
        taskName: task.taskName,
        startDate: task.actualStartDate || task.plannedStartDate,
        endDate: task.actualEndDate || task.plannedEndDate,
        duration: task.duration,
        predecessors: dependencies.get(task.id) || [],
        successors: task.successorTasks?.map((t: any) => t.id) || [],
      }));

    return criticalTasks;
  }

  private identifyScheduleRisks(tasks: any[]): ProjectScheduleAnalysis['riskFactors'] {
    const riskFactors: ProjectScheduleAnalysis['riskFactors'] = [];

    // Check for overdue tasks
    const overdueTasks = tasks.filter(task => 
      task.status !== 'COMPLETED' && 
      task.plannedEndDate < new Date()
    );

    if (overdueTasks.length > 0) {
      riskFactors.push({
        type: 'SCHEDULE_DELAY',
        description: `${overdueTasks.length} tasks are overdue`,
        impact: 'HIGH',
        probability: 0.9,
        mitigation: 'Expedite overdue tasks and reallocate resources',
      });
    }

    // Check for long-duration tasks without progress
    const stalledTasks = tasks.filter(task => 
      task.duration > 30 && 
      task.percentComplete === 0 && 
      task.plannedStartDate < new Date()
    );

    if (stalledTasks.length > 0) {
      riskFactors.push({
        type: 'STALLED_TASKS',
        description: `${stalledTasks.length} long-duration tasks have not started`,
        impact: 'MEDIUM',
        probability: 0.7,
        mitigation: 'Review task assignments and remove blockers',
      });
    }

    return riskFactors;
  }

  private calculateTotalFloat(tasks: any[], criticalPath: any[]): number {
    // Calculate total float for non-critical tasks
    const criticalTaskIds = new Set(criticalPath.map(task => task.taskId));
    const nonCriticalTasks = tasks.filter(task => !criticalTaskIds.has(task.id));
    
    return nonCriticalTasks.reduce((sum, task) => sum + (task.floatDays || 0), 0);
  }
}

export const capitalProjectService = new CapitalProjectService();