/**
 * CAM Reconciliation Service - Common Area Maintenance Reconciliation
 * 
 * Comprehensive service for managing CAM reconciliation processes including
 * expense tracking, tenant allocations, dispute management, and reporting.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../config/logger';
import { prisma } from '../../../../config/database';
import {
  CAMReconciliation,
  CAMExpense,
  CAMTenantAllocation,
  CAMReconAdjustment,
  CAMDispute,
  CAMDocument,
  ICAMReconciliationService,
  BusinessOperationsContext
} from './types';
import {
  CAM_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  BUSINESS_OPERATIONS_CONFIG
} from './constants';

export class CAMReconciliationService extends EventEmitter implements ICAMReconciliationService {
  private cache = new Map<string, CAMReconciliation>();
  private readonly cacheTTL = BUSINESS_OPERATIONS_CONFIG.CACHING.CAM_CACHE_TTL * 1000;

  constructor(private context: BusinessOperationsContext) {
    super();
    logger.info('CAM Reconciliation Service initialized', {
      organizationId: context.organizationId,
      userId: context.userId
    });
  }

  async createReconciliation(data: Partial<CAMReconciliation>): Promise<CAMReconciliation> {
    try {
      this.validateReconciliationData(data);
      
      const reconciliation: CAMReconciliation = {
        id: '',
        organizationId: this.context.organizationId,
        propertyId: data.propertyId!,
        leaseIds: data.leaseIds!,
        reconciliationYear: data.reconciliationYear!,
        status: 'DRAFT',
        dueDate: this.calculateDueDate(data.reconciliationYear!),
        totalCAMExpenses: 0,
        totalRecoverableExpenses: 0,
        totalTenantShares: 0,
        variance: 0,
        expenses: [],
        tenantAllocations: [],
        adjustments: [],
        disputes: [],
        documents: [],
        createdBy: this.context.userId,
        createdDate: new Date(),
        lastUpdated: new Date()
      };

      const savedReconciliation = await this.saveReconciliation(reconciliation);
      this.cache.set(savedReconciliation.id, savedReconciliation);

      this.emit('reconciliationCreated', {
        type: 'CAM_RECONCILIATION_CREATED',
        entityType: 'CAM_RECONCILIATION',
        entityId: savedReconciliation.id,
        data: savedReconciliation,
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('CAM reconciliation created', {
        reconciliationId: savedReconciliation.id,
        propertyId: savedReconciliation.propertyId,
        year: savedReconciliation.reconciliationYear
      });

      return savedReconciliation;
      
    } catch (error) {
      logger.error('Failed to create CAM reconciliation', error);
      throw new Error(`Failed to create reconciliation: ${(error as Error).message}`);
    }
  }

  async getReconciliation(id: string): Promise<CAMReconciliation | null> {
    try {
      const cached = this.cache.get(id);
      if (cached) return cached;

      const reconciliation = await this.loadReconciliation(id);
      if (reconciliation) {
        this.cache.set(id, reconciliation);
      }
      return reconciliation;
      
    } catch (error) {
      logger.error('Failed to get CAM reconciliation', { reconciliationId: id, error });
      throw new Error(`Failed to get reconciliation: ${(error as Error).message}`);
    }
  }

  async updateReconciliation(id: string, data: Partial<CAMReconciliation>): Promise<CAMReconciliation> {
    try {
      const existingReconciliation = await this.getReconciliation(id);
      if (!existingReconciliation) {
        throw new Error('Reconciliation not found');
      }

      this.validateReconciliationUpdateData(data, existingReconciliation);

      const updatedReconciliation = {
        ...existingReconciliation,
        ...data,
        lastUpdated: new Date()
      };

      const savedReconciliation = await this.saveReconciliation(updatedReconciliation);
      this.cache.set(id, savedReconciliation);

      this.emit('reconciliationUpdated', {
        type: 'CAM_RECONCILIATION_UPDATED',
        entityType: 'CAM_RECONCILIATION',
        entityId: id,
        data: savedReconciliation,
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('CAM reconciliation updated', { reconciliationId: id });
      return savedReconciliation;
      
    } catch (error) {
      logger.error('Failed to update CAM reconciliation', { reconciliationId: id, error });
      throw new Error(`Failed to update reconciliation: ${(error as Error).message}`);
    }
  }

  async addExpense(reconciliationId: string, expenseData: Partial<CAMExpense>): Promise<CAMExpense> {
    try {
      const reconciliation = await this.getReconciliation(reconciliationId);
      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      if (reconciliation.status === 'FINALIZED') {
        throw new Error('Cannot add expenses to finalized reconciliation');
      }

      this.validateExpenseData(expenseData);

      const expense: CAMExpense = {
        id: this.generateExpenseId(),
        reconId: reconciliationId,
        category: expenseData.category!,
        description: expenseData.description!,
        amount: expenseData.amount!,
        isRecoverable: expenseData.isRecoverable !== false,
        allocationMethod: expenseData.allocationMethod || 'AREA',
        supportingDocs: expenseData.supportingDocs || [],
        vendor: expenseData.vendor,
        invoiceNumber: expenseData.invoiceNumber,
        invoiceDate: expenseData.invoiceDate
      };

      reconciliation.expenses.push(expense);
      
      // Recalculate totals
      this.recalculateTotals(reconciliation);
      
      await this.saveReconciliation(reconciliation);
      this.cache.set(reconciliationId, reconciliation);

      this.emit('expenseAdded', {
        type: 'CAM_EXPENSE_ADDED',
        entityType: 'CAM_EXPENSE',
        entityId: expense.id,
        data: { reconciliationId, expense },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('CAM expense added', {
        reconciliationId,
        expenseId: expense.id,
        amount: expense.amount
      });

      return expense;
      
    } catch (error) {
      logger.error('Failed to add CAM expense', { reconciliationId, error });
      throw new Error(`Failed to add expense: ${(error as Error).message}`);
    }
  }

  async calculateTenantAllocations(reconId: string): Promise<CAMTenantAllocation[]> {
    try {
      const reconciliation = await this.getReconciliation(reconId);
      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      // Get lease information for tenant allocations
      const leaseAllocations = await this.getLeaseAllocations(reconciliation.leaseIds);
      const totalAllocableArea = leaseAllocations.reduce((sum, lease) => sum + lease.rentableArea, 0);

      const tenantAllocations: CAMTenantAllocation[] = [];

      // Calculate allocations for each tenant
      for (const lease of leaseAllocations) {
        const allocation = this.calculateAllocationForTenant(
          reconciliation,
          lease,
          totalAllocableArea
        );
        tenantAllocations.push(allocation);
      }

      // Update reconciliation with calculated allocations
      reconciliation.tenantAllocations = tenantAllocations;
      reconciliation.totalTenantShares = tenantAllocations.reduce(
        (sum, allocation) => sum + allocation.allocatedAmount, 0
      );

      this.recalculateVariance(reconciliation);
      
      await this.saveReconciliation(reconciliation);
      this.cache.set(reconId, reconciliation);

      this.emit('allocationsCalculated', {
        type: 'CAM_ALLOCATIONS_CALCULATED',
        entityType: 'CAM_ALLOCATION',
        entityId: reconId,
        data: { reconId, allocations: tenantAllocations },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('CAM tenant allocations calculated', {
        reconId,
        tenantCount: tenantAllocations.length,
        totalAllocated: reconciliation.totalTenantShares
      });

      return tenantAllocations;
      
    } catch (error) {
      logger.error('Failed to calculate tenant allocations', { reconId, error });
      throw new Error(`Failed to calculate allocations: ${(error as Error).message}`);
    }
  }

  async submitDispute(reconId: string, dispute: Partial<CAMDispute>): Promise<CAMDispute> {
    try {
      const reconciliation = await this.getReconciliation(reconId);
      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      this.validateDisputeData(dispute);

      const camDispute: CAMDispute = {
        id: this.generateDisputeId(),
        reconId,
        leaseId: dispute.leaseId!,
        tenantName: dispute.tenantName!,
        disputeType: dispute.disputeType!,
        description: dispute.description!,
        disputedAmount: dispute.disputedAmount!,
        submittedDate: new Date(),
        status: 'SUBMITTED'
      };

      reconciliation.disputes.push(camDispute);
      
      // Update reconciliation status if needed
      if (reconciliation.status === 'COMPLETED') {
        reconciliation.status = 'DISPUTED';
      }

      await this.saveReconciliation(reconciliation);
      this.cache.set(reconId, reconciliation);

      this.emit('disputeSubmitted', {
        type: 'CAM_DISPUTE_SUBMITTED',
        entityType: 'CAM_DISPUTE',
        entityId: camDispute.id,
        data: { reconId, dispute: camDispute },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('CAM dispute submitted', {
        reconId,
        disputeId: camDispute.id,
        disputedAmount: camDispute.disputedAmount
      });

      return camDispute;
      
    } catch (error) {
      logger.error('Failed to submit CAM dispute', { reconId, error });
      throw new Error(`Failed to submit dispute: ${(error as Error).message}`);
    }
  }

  async resolveDispute(reconId: string, disputeId: string, resolution: string, resolvedAmount?: number): Promise<CAMDispute> {
    try {
      const reconciliation = await this.getReconciliation(reconId);
      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      const disputeIndex = reconciliation.disputes.findIndex(d => d.id === disputeId);
      if (disputeIndex === -1) {
        throw new Error('Dispute not found');
      }

      const dispute = reconciliation.disputes[disputeIndex];
      dispute.status = 'RESOLVED';
      dispute.resolution = resolution;
      dispute.resolvedDate = new Date();
      dispute.resolvedAmount = resolvedAmount;

      // If resolved amount differs from disputed amount, create adjustment
      if (resolvedAmount !== undefined && resolvedAmount !== dispute.disputedAmount) {
        const adjustment: CAMReconAdjustment = {
          id: this.generateAdjustmentId(),
          reconId,
          adjustmentType: 'DISPUTE_RESOLUTION',
          description: `Dispute resolution adjustment for ${dispute.tenantName}`,
          amount: resolvedAmount - dispute.disputedAmount,
          affectedTenants: [dispute.leaseId],
          reason: resolution,
          approvedBy: this.context.userId,
          approvedDate: new Date()
        };

        reconciliation.adjustments.push(adjustment);
        
        // Update tenant allocation
        const tenantAllocation = reconciliation.tenantAllocations.find(a => a.leaseId === dispute.leaseId);
        if (tenantAllocation) {
          tenantAllocation.adjustments += adjustment.amount;
          tenantAllocation.owedAmount += Math.max(0, adjustment.amount);
          tenantAllocation.refundAmount += Math.max(0, -adjustment.amount);
        }
      }

      // Check if all disputes are resolved
      const unresolvedDisputes = reconciliation.disputes.filter(d => d.status !== 'RESOLVED').length;
      if (unresolvedDisputes === 0 && reconciliation.status === 'DISPUTED') {
        reconciliation.status = 'COMPLETED';
      }

      await this.saveReconciliation(reconciliation);
      this.cache.set(reconId, reconciliation);

      this.emit('disputeResolved', {
        type: 'CAM_DISPUTE_RESOLVED',
        entityType: 'CAM_DISPUTE',
        entityId: disputeId,
        data: { reconId, dispute, resolution, resolvedAmount },
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('CAM dispute resolved', {
        reconId,
        disputeId,
        resolvedAmount
      });

      return dispute;
      
    } catch (error) {
      logger.error('Failed to resolve CAM dispute', { reconId, disputeId, error });
      throw new Error(`Failed to resolve dispute: ${(error as Error).message}`);
    }
  }

  async finalizeReconciliation(reconId: string): Promise<CAMReconciliation> {
    try {
      const reconciliation = await this.getReconciliation(reconId);
      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      if (reconciliation.status === 'FINALIZED') {
        throw new Error('Reconciliation is already finalized');
      }

      // Check for unresolved disputes
      const unresolvedDisputes = reconciliation.disputes.filter(d => d.status !== 'RESOLVED').length;
      if (unresolvedDisputes > 0) {
        throw new Error(`Cannot finalize reconciliation with ${unresolvedDisputes} unresolved disputes`);
      }

      // Ensure allocations are calculated
      if (reconciliation.tenantAllocations.length === 0) {
        await this.calculateTenantAllocations(reconId);
      }

      const updatedReconciliation = await this.updateReconciliation(reconId, {
        status: 'FINALIZED',
        completedDate: new Date()
      });

      this.emit('reconciliationFinalized', {
        type: 'CAM_RECONCILIATION_FINALIZED',
        entityType: 'CAM_RECONCILIATION',
        entityId: reconId,
        data: updatedReconciliation,
        timestamp: new Date(),
        userId: this.context.userId,
        organizationId: this.context.organizationId
      });

      logger.info('CAM reconciliation finalized', { reconId });
      return updatedReconciliation;
      
    } catch (error) {
      logger.error('Failed to finalize CAM reconciliation', { reconId, error });
      throw new Error(`Failed to finalize reconciliation: ${(error as Error).message}`);
    }
  }

  async generateStatement(reconId: string, leaseId: string): Promise<Buffer> {
    try {
      const reconciliation = await this.getReconciliation(reconId);
      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      const tenantAllocation = reconciliation.tenantAllocations.find(a => a.leaseId === leaseId);
      if (!tenantAllocation) {
        throw new Error('Tenant allocation not found');
      }

      // Generate statement data
      const statementData = {
        reconciliationId: reconId,
        propertyId: reconciliation.propertyId,
        year: reconciliation.reconciliationYear,
        tenant: {
          leaseId,
          tenantName: tenantAllocation.tenantName,
          allocatedArea: tenantAllocation.allocatedArea,
          allocationPercentage: tenantAllocation.allocationPercentage
        },
        expenses: reconciliation.expenses.filter(e => e.isRecoverable),
        allocation: tenantAllocation,
        summary: {
          totalCAMExpenses: reconciliation.totalCAMExpenses,
          totalRecoverableExpenses: reconciliation.totalRecoverableExpenses,
          allocatedAmount: tenantAllocation.allocatedAmount,
          paidAmount: tenantAllocation.paidAmount,
          owedAmount: tenantAllocation.owedAmount,
          refundAmount: tenantAllocation.refundAmount,
          netAmount: tenantAllocation.owedAmount - tenantAllocation.refundAmount
        },
        adjustments: reconciliation.adjustments.filter(adj => 
          adj.affectedTenants.includes(leaseId)
        ),
        generatedAt: new Date(),
        generatedBy: this.context.userId
      };

      // Convert to PDF or other format (simplified - would use actual PDF generation)
      const statementBuffer = Buffer.from(JSON.stringify(statementData, null, 2));

      logger.info('CAM statement generated', { reconId, leaseId });
      return statementBuffer;
      
    } catch (error) {
      logger.error('Failed to generate CAM statement', { reconId, leaseId, error });
      throw new Error(`Failed to generate statement: ${(error as Error).message}`);
    }
  }

  async generateReconciliationReport(reconId: string): Promise<any> {
    try {
      const reconciliation = await this.getReconciliation(reconId);
      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      const report = {
        reconciliationId: reconId,
        propertyId: reconciliation.propertyId,
        year: reconciliation.reconciliationYear,
        status: reconciliation.status,
        
        summary: {
          totalCAMExpenses: reconciliation.totalCAMExpenses,
          totalRecoverableExpenses: reconciliation.totalRecoverableExpenses,
          totalTenantShares: reconciliation.totalTenantShares,
          variance: reconciliation.variance,
          variancePercentage: reconciliation.totalRecoverableExpenses > 0 ?
            (reconciliation.variance / reconciliation.totalRecoverableExpenses) * 100 : 0
        },
        
        expenseBreakdown: this.analyzeExpensesByCategory(reconciliation.expenses),
        
        tenantSummary: {
          totalTenants: reconciliation.tenantAllocations.length,
          totalOwed: reconciliation.tenantAllocations.reduce((sum, a) => sum + a.owedAmount, 0),
          totalRefunds: reconciliation.tenantAllocations.reduce((sum, a) => sum + a.refundAmount, 0),
          averageAllocation: reconciliation.tenantAllocations.length > 0 ?
            reconciliation.totalTenantShares / reconciliation.tenantAllocations.length : 0
        },
        
        disputes: {
          totalDisputes: reconciliation.disputes.length,
          resolvedDisputes: reconciliation.disputes.filter(d => d.status === 'RESOLVED').length,
          pendingDisputes: reconciliation.disputes.filter(d => d.status !== 'RESOLVED').length,
          totalDisputedAmount: reconciliation.disputes.reduce((sum, d) => sum + d.disputedAmount, 0)
        },
        
        adjustments: {
          totalAdjustments: reconciliation.adjustments.length,
          totalAdjustmentAmount: reconciliation.adjustments.reduce((sum, a) => sum + a.amount, 0),
          adjustmentsByType: this.analyzeAdjustmentsByType(reconciliation.adjustments)
        },
        
        timeline: {
          created: reconciliation.createdDate,
          dueDate: reconciliation.dueDate,
          completed: reconciliation.completedDate,
          daysToComplete: reconciliation.completedDate ?
            Math.ceil((reconciliation.completedDate.getTime() - reconciliation.createdDate.getTime()) / (1000 * 60 * 60 * 24)) : null,
          isOverdue: !reconciliation.completedDate && new Date() > reconciliation.dueDate
        },
        
        performance: {
          onTimeCompletion: reconciliation.completedDate && reconciliation.completedDate <= reconciliation.dueDate,
          varianceAcceptable: Math.abs(reconciliation.variance / reconciliation.totalRecoverableExpenses) <= (CAM_CONFIG.VALIDATION.VARIANCE_THRESHOLD_PERCENTAGE / 100),
          disputeRate: reconciliation.tenantAllocations.length > 0 ?
            (reconciliation.disputes.length / reconciliation.tenantAllocations.length) * 100 : 0
        },
        
        recommendations: this.generateReconciliationRecommendations(reconciliation),
        
        generatedAt: new Date(),
        generatedBy: this.context.userId
      };

      logger.info('CAM reconciliation report generated', { reconId });
      return report;
      
    } catch (error) {
      logger.error('Failed to generate reconciliation report', { reconId, error });
      throw new Error(`Failed to generate report: ${(error as Error).message}`);
    }
  }

  // === PRIVATE HELPER METHODS ===

  private validateReconciliationData(data: Partial<CAMReconciliation>): void {
    if (!data.propertyId) throw new Error('Property ID is required');
    if (!data.leaseIds || data.leaseIds.length === 0) throw new Error('Lease IDs are required');
    if (!data.reconciliationYear) throw new Error('Reconciliation year is required');

    const currentYear = new Date().getFullYear();
    if (data.reconciliationYear < CAM_CONFIG.VALIDATION.MIN_RECONCILIATION_YEAR || 
        data.reconciliationYear > currentYear) {
      throw new Error('Invalid reconciliation year');
    }
  }

  private validateReconciliationUpdateData(data: Partial<CAMReconciliation>, existing: CAMReconciliation): void {
    if (existing.status === 'FINALIZED') {
      throw new Error('Cannot modify finalized reconciliation');
    }
  }

  private validateExpenseData(data: Partial<CAMExpense>): void {
    if (!data.category) throw new Error('Expense category is required');
    if (!data.description) throw new Error('Expense description is required');
    if (!data.amount || data.amount <= 0) throw new Error('Valid expense amount is required');
  }

  private validateDisputeData(data: Partial<CAMDispute>): void {
    if (!data.leaseId) throw new Error('Lease ID is required');
    if (!data.tenantName) throw new Error('Tenant name is required');
    if (!data.disputeType) throw new Error('Dispute type is required');
    if (!data.description) throw new Error('Dispute description is required');
    if (!data.disputedAmount || data.disputedAmount <= 0) throw new Error('Valid disputed amount is required');
  }

  private calculateDueDate(year: number): Date {
    const dueDate = new Date(year + 1, 3, 30); // April 30th of following year
    return dueDate;
  }

  private generateExpenseId(): string {
    return `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDisputeId(): string {
    return `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAdjustmentId(): string {
    return `adjustment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private recalculateTotals(reconciliation: CAMReconciliation): void {
    reconciliation.totalCAMExpenses = reconciliation.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    reconciliation.totalRecoverableExpenses = reconciliation.expenses
      .filter(exp => exp.isRecoverable)
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    this.recalculateVariance(reconciliation);
  }

  private recalculateVariance(reconciliation: CAMReconciliation): void {
    reconciliation.variance = reconciliation.totalRecoverableExpenses - reconciliation.totalTenantShares;
  }

  private async getLeaseAllocations(leaseIds: string[]): Promise<any[]> {
    // Simplified - would fetch actual lease data from database
    return leaseIds.map(leaseId => ({
      leaseId,
      tenantName: `Tenant ${leaseId}`,
      rentableArea: 1000 + Math.random() * 5000, // Simplified
      occupancyRatio: 1.0,
      allocationPercentage: 0
    }));
  }

  private calculateAllocationForTenant(
    reconciliation: CAMReconciliation,
    lease: any,
    totalArea: number
  ): CAMTenantAllocation {
    const allocationPercentage = (lease.rentableArea / totalArea) * 100;
    const allocatedAmount = reconciliation.totalRecoverableExpenses * (allocationPercentage / 100);

    return {
      id: `allocation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reconId: reconciliation.id,
      leaseId: lease.leaseId,
      tenantName: lease.tenantName,
      allocatedAmount,
      paidAmount: 0, // Would be calculated from actual payments
      owedAmount: Math.max(0, allocatedAmount),
      refundAmount: Math.max(0, -allocatedAmount),
      allocationPercentage,
      allocatedArea: lease.rentableArea,
      calculationMethod: 'AREA',
      adjustments: 0
    };
  }

  private analyzeExpensesByCategory(expenses: CAMExpense[]): any {
    const categoryTotals: { [key: string]: number } = {};
    
    expenses.forEach(expense => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }
      categoryTotals[expense.category] += expense.amount;
    });

    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      count: expenses.filter(e => e.category === category).length,
      percentage: (amount / expenses.reduce((sum, e) => sum + e.amount, 0)) * 100
    }));
  }

  private analyzeAdjustmentsByType(adjustments: CAMReconAdjustment[]): any {
    const typeTotals: { [key: string]: number } = {};
    
    adjustments.forEach(adjustment => {
      if (!typeTotals[adjustment.adjustmentType]) {
        typeTotals[adjustment.adjustmentType] = 0;
      }
      typeTotals[adjustment.adjustmentType] += adjustment.amount;
    });

    return Object.entries(typeTotals).map(([type, amount]) => ({
      type,
      amount,
      count: adjustments.filter(a => a.adjustmentType === type).length
    }));
  }

  private generateReconciliationRecommendations(reconciliation: CAMReconciliation): string[] {
    const recommendations: string[] = [];
    
    const variancePercentage = reconciliation.totalRecoverableExpenses > 0 ?
      Math.abs(reconciliation.variance / reconciliation.totalRecoverableExpenses) * 100 : 0;
    
    if (variancePercentage > CAM_CONFIG.VALIDATION.VARIANCE_THRESHOLD_PERCENTAGE) {
      recommendations.push('High variance detected - review expense allocations and calculations');
    }
    
    const disputeRate = reconciliation.tenantAllocations.length > 0 ?
      (reconciliation.disputes.length / reconciliation.tenantAllocations.length) * 100 : 0;
    
    if (disputeRate > 20) {
      recommendations.push('High dispute rate - review expense documentation and communication');
    }
    
    if (reconciliation.status !== 'FINALIZED' && new Date() > reconciliation.dueDate) {
      recommendations.push('Reconciliation is overdue - prioritize completion');
    }
    
    const unresolvedDisputes = reconciliation.disputes.filter(d => d.status !== 'RESOLVED').length;
    if (unresolvedDisputes > 0) {
      recommendations.push(`${unresolvedDisputes} disputes require resolution before finalization`);
    }
    
    return recommendations;
  }

  // Database operations (simplified for demo)
  private async saveReconciliation(reconciliation: CAMReconciliation): Promise<CAMReconciliation> {
    reconciliation.id = reconciliation.id || `recon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return reconciliation;
  }

  private async loadReconciliation(id: string): Promise<CAMReconciliation | null> {
    return null;
  }
}