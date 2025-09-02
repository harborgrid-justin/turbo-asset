/**
 * Capital Project Service - Enterprise Project Management
 * 
 * Comprehensive service for managing capital projects including planning,
 * execution, tracking, and reporting across the enterprise.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../config/logger';
import { prisma } from '../../../../config/database';
import {
  CapitalProject,
  ProjectTask,
  ProjectMilestone,
  ProjectDocument,
  ProjectRisk,
  ProjectBudgetBreakdown,
  ICapitalProjectService,
  BusinessOperationsContext
} from './types';
import { 
  PROJECT_CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES,
  BUSINESS_OPERATIONS_CONFIG 
} from './constants';

export class CapitalProjectService extends EventEmitter implements ICapitalProjectService {
  private cache = new Map<string, CapitalProject>();
  private readonly cacheTTL = BUSINESS_OPERATIONS_CONFIG.CACHING.PROJECT_CACHE_TTL * 1000;

  constructor(private context: BusinessOperationsContext) {
    super();
    logger.info('Capital Project Service initialized', { 
      organizationId: context.organizationId,
      userId: context.userId 
    });
  }

  /**
   * Create a new capital project
   */
  async createProject(data: Partial<CapitalProject>): Promise<CapitalProject> {
    try {
      this.validateProjectData(data);
      
      const projectNumber = await this.generateProjectNumber();
      
      const project: CapitalProject = {
        id: '',
        organizationId: this.context.organizationId,
        projectNumber,
        projectName: data.projectName!,
        description: data.description,
        category: data.category || 'OTHER',
        priority: data.priority || 'MEDIUM',
        riskLevel: data.riskLevel || 'MEDIUM',
        status: 'PLANNING',
        plannedStartDate: data.plannedStartDate!,
        plannedEndDate: data.plannedEndDate!,
        approvedBudget: data.approvedBudget || 0,
        currency: data.currency || 'USD',
        projectManager: data.projectManager!,
        sponsor: data.sponsor,
        stakeholders: data.stakeholders || [],
        affectedAssets: data.affectedAssets || [],
        approvalRequired: data.approvalRequired || false,
        createdBy: this.context.userId,
        createdDate: new Date(),
        lastUpdated: new Date(),
        budgetBreakdown: data.budgetBreakdown || this.createDefaultBudgetBreakdown(data.approvedBudget || 0),
        tasks: [],
        documents: [],
        riskAssessment: [],
        milestones: []
      };

      // Save to database (simplified for demo)
      const savedProject = await this.saveProject(project);
      
      // Cache the project
      this.cache.set(savedProject.id, savedProject);
      
      // Emit event
      this.emit('projectCreated', {
        type: 'PROJECT_CREATED',
        entityType: 'PROJECT',
        entityId: savedProject.id,
        data: savedProject,
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('Capital project created', { 
        projectId: savedProject.id,
        projectNumber: savedProject.projectNumber 
      });

      return savedProject;
      
    } catch (error) {
      logger.error('Failed to create capital project', error);
      throw new Error(`Failed to create project: ${(error as Error).message}`);
    }
  }

  async getProject(id: string): Promise<CapitalProject | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    
    const project = await this.loadProject(id);
    if (project) {
      this.cache.set(id, project);
    }
    return project;
  }

  async updateProject(id: string, data: Partial<CapitalProject>): Promise<CapitalProject> {
    const existingProject = await this.getProject(id);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    const updatedProject = {
      ...existingProject,
      ...data,
      lastUpdated: new Date()
    };

    const savedProject = await this.saveProject(updatedProject);
    this.cache.set(id, savedProject);
    
    this.emit('projectUpdated', { projectId: id, data: savedProject });
    return savedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const project = await this.getProject(id);
    if (!project) {
      throw new Error('Project not found');
    }

    await this.removeProject(id);
    this.cache.delete(id);
    
    this.emit('projectDeleted', { projectId: id });
    return true;
  }

  async searchProjects(criteria: any): Promise<CapitalProject[]> {
    const projects = await this.searchProjectsInDatabase(criteria, 100, 0);
    return projects;
  }

  async getProjectsByStatus(status: string): Promise<CapitalProject[]> {
    return await this.searchProjects({ status });
  }

  async createTask(projectId: string, data: Partial<ProjectTask>): Promise<ProjectTask> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const task: ProjectTask = {
      id: this.generateTaskId(),
      projectId,
      taskNumber: data.taskNumber || await this.generateTaskNumber(projectId),
      taskName: data.taskName!,
      description: data.description,
      status: 'NOT_STARTED',
      plannedStartDate: data.plannedStartDate!,
      plannedEndDate: data.plannedEndDate!,
      duration: data.duration || this.calculateDuration(data.plannedStartDate!, data.plannedEndDate!),
      assignedTo: data.assignedTo,
      assignedTeam: data.assignedTeam,
      predecessorTaskIds: data.predecessorTaskIds || [],
      successorTaskIds: [],
      budgetAmount: data.budgetAmount,
      isCritical: data.isCritical || false,
      percentComplete: 0,
      deliverables: data.deliverables || []
    };

    project.tasks.push(task);
    await this.saveProject(project);
    
    this.emit('taskCreated', { projectId, task });
    return task;
  }

  async updateProjectStatus(id: string, status: string): Promise<CapitalProject> {
    const project = await this.getProject(id);
    if (!project) {
      throw new Error('Project not found');
    }

    const updatedProject = await this.updateProject(id, { status });
    
    this.emit('statusChanged', { projectId: id, oldStatus: project.status, newStatus: status });
    return updatedProject;
  }

  async calculateProjectMetrics(id: string): Promise<any> {
    const project = await this.getProject(id);
    if (!project) {
      throw new Error('Project not found');
    }

    return {
      projectId: id,
      timeline: {
        plannedDuration: this.calculateDuration(project.plannedStartDate, project.plannedEndDate),
        daysRemaining: this.calculateDaysRemaining(project.plannedEndDate),
        isOnSchedule: this.isProjectOnSchedule(project)
      },
      budget: {
        approvedBudget: project.approvedBudget,
        actualCost: project.actualCost || 0,
        budgetVariance: this.calculateBudgetVariance(project)
      },
      tasks: {
        totalTasks: project.tasks.length,
        completedTasks: project.tasks.filter(t => t.status === 'COMPLETED').length
      }
    };
  }

  // Helper methods
  private validateProjectData(data: Partial<CapitalProject>): void {
    if (!data.projectName) throw new Error('Project name is required');
    if (!data.plannedStartDate || !data.plannedEndDate) throw new Error('Start and end dates are required');
    if (!data.projectManager) throw new Error('Project manager is required');
  }

  private async generateProjectNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PRJ-${year}-${sequence}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateTaskNumber(projectId: string): Promise<string> {
    const project = await this.getProject(projectId);
    const taskCount = project?.tasks.length || 0;
    return `${project?.projectNumber || 'PRJ'}-T${(taskCount + 1).toString().padStart(3, '0')}`;
  }

  private createDefaultBudgetBreakdown(totalBudget: number): ProjectBudgetBreakdown {
    return {
      designCost: totalBudget * 0.15,
      constructionCost: totalBudget * 0.60,
      equipmentCost: totalBudget * 0.15,
      contingencyCost: totalBudget * 0.08,
      otherCosts: totalBudget * 0.02,
      totalBudget
    };
  }

  private calculateDuration(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateDaysRemaining(endDate: Date): number {
    const today = new Date();
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  private isProjectOnSchedule(project: CapitalProject): boolean {
    if (project.status === 'COMPLETED') {
      return !project.actualEndDate || project.actualEndDate <= project.plannedEndDate;
    }
    return new Date() <= project.plannedEndDate;
  }

  private calculateBudgetVariance(project: CapitalProject): number {
    return (project.actualCost || 0) - (project.approvedBudget || 0);
  }

  // Database operations (simplified for demo)
  private async saveProject(project: CapitalProject): Promise<CapitalProject> {
    project.id = project.id || `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return project;
  }

  private async loadProject(id: string): Promise<CapitalProject | null> {
    return null; // Would load from database in real implementation
  }

  private async removeProject(id: string): Promise<void> {
    // Would delete from database in real implementation
  }

  private async searchProjectsInDatabase(params: any, limit: number, offset: number): Promise<CapitalProject[]> {
    return []; // Would search database in real implementation
  }
}