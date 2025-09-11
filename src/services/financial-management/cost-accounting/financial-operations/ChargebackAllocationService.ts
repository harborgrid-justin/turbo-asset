import { prisma } from '../../../../config/database';
import { logger } from '../../../../config/logger';

interface ChargebackRuleData {
  organizationId: string;
  name: string;
  description?: string;
  entityType: string;
  costCategory: string;
  allocationMethod: string;
  rate?: number;
  currency?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
}

interface AllocationData {
  ruleId: string;
  period: string; // YYYY-MM format
  totalCost: number;
  spaceId?: string;
  departmentId?: string;
}

interface ChargebackReport {
  period: string;
  department: {
    id: string;
    name: string;
    costCenter?: string;
  };
  allocations: {
    category: string;
    totalCost: number;
    allocatedCost: number;
    allocationBasis: number;
    method: string;
    spaces?: any[];
  }[];
  totalAllocated: number;
  costPerSqFt?: number;
  costPerEmployee?: number;
}

/**
 * Chargeback Allocation Service - Handles cost allocation and chargeback operations
 * 
 * This service manages:
 * - Chargeback rule creation and management
 * - Cost allocation calculations
 * - Department and space-based allocations
 * - Chargeback reporting and analytics
 * - Rate management and billing
 */
export class ChargebackAllocationService {
  /**
   * Create chargeback rule
   */
  async createChargebackRule(data: ChargebackRuleData): Promise<any> {
    try {
      logger.info('Creating chargeback rule', { 
        organizationId: data.organizationId, 
        name: data.name,
        allocationMethod: data.allocationMethod
      });

      const rule = await prisma.chargebackRule.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          description: data.description,
          entityType: data.entityType,
          costCategory: data.costCategory,
          allocationMethod: data.allocationMethod,
          rate: data.rate,
          currency: data.currency || 'USD',
          effectiveDate: data.effectiveDate || new Date(),
          expiryDate: data.expiryDate,
          status: 'ACTIVE',
          createdAt: new Date()
        }
      });

      logger.info('Chargeback rule created successfully', { ruleId: rule.id });
      return rule;
    } catch (error: unknown) {
      logger.error('Failed to create chargeback rule', error);
      throw error;
    }
  }

  /**
   * Process cost allocation for a period
   */
  async processAllocation(data: AllocationData): Promise<any> {
    try {
      logger.info('Processing cost allocation', { 
        ruleId: data.ruleId,
        period: data.period,
        totalCost: data.totalCost
      });

      const rule = await prisma.chargebackRule.findUnique({
        where: { id: data.ruleId }
      });

      if (!rule) {
        throw new Error('Chargeback rule not found');
      }

      // Get allocation basis (spaces, departments, employees, etc.)
      const allocationBasis = await this.getAllocationBasis(
        rule.organizationId,
        rule.allocationMethod,
        data.spaceId,
        data.departmentId
      );

      const allocations = allocationBasis.map((basis: any) => {
        const allocatedAmount = this.calculateAllocation(
          data.totalCost,
          basis.allocationFactor,
          rule.allocationMethod
        );

        return {
          ruleId: data.ruleId,
          period: data.period,
          entityId: basis.entityId,
          entityType: basis.entityType,
          entityName: basis.entityName,
          allocationFactor: basis.allocationFactor,
          allocatedAmount,
          allocationMethod: rule.allocationMethod,
          costCategory: rule.costCategory
        };
      });

      // Save allocations to database
      const savedAllocations = await prisma.costAllocation.createMany({
        data: allocations
      });

      logger.info('Cost allocation processed successfully', { 
        allocationsCreated: savedAllocations.count
      });

      return {
        ruleId: data.ruleId,
        period: data.period,
        totalCost: data.totalCost,
        allocations,
        totalAllocated: allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
      };
    } catch (error: unknown) {
      logger.error('Failed to process cost allocation', error);
      throw error;
    }
  }

  /**
   * Generate chargeback report for departments
   */
  async generateChargebackReport(
    organizationId: string, 
    period: string, 
    departmentIds?: string[]
  ): Promise<ChargebackReport[]> {
    try {
      logger.info('Generating chargeback report', { 
        organizationId, 
        period, 
        departmentIds 
      });

      const whereClause: any = {
        period,
        entityType: 'DEPARTMENT'
      };

      if (departmentIds && departmentIds.length > 0) {
        whereClause.entityId = { in: departmentIds };
      }

      const allocations = await prisma.costAllocation.findMany({
        where: whereClause,
        include: {
          rule: true
        }
      });

      // Group allocations by department
      const departmentGroups = allocations.reduce((groups, allocation) => {
        const deptId = allocation.entityId;
        if (!groups[deptId]) {
          groups[deptId] = [];
        }
        groups[deptId].push(allocation);
        return groups;
      }, {} as { [key: string]: any[] });

      const reports: ChargebackReport[] = [];

      for (const [departmentId, deptAllocations] of Object.entries(departmentGroups)) {
        // Get department info
        const department = await prisma.department.findUnique({
          where: { id: departmentId }
        });

        if (!department) {continue;}

        // Group allocations by category
        const categoryGroups = (deptAllocations as any[]).reduce((groups, allocation) => {
          const category = allocation.costCategory;
          if (!groups[category]) {
            groups[category] = [];
          }
          groups[category].push(allocation);
          return groups;
        }, {} as { [key: string]: any[] });

        const categoryAllocations = Object.entries(categoryGroups).map(([category, catAllocations]) => {
          const totalCost = (catAllocations as any[]).reduce((sum, a) => sum + (a.totalCost || 0), 0);
          const allocatedCost = (catAllocations as any[]).reduce((sum, a) => sum + a.allocatedAmount, 0);
          const allocationBasis = (catAllocations as any[]).reduce((sum, a) => sum + a.allocationFactor, 0);

          return {
            category,
            totalCost,
            allocatedCost,
            allocationBasis,
            method: catAllocations[0].allocationMethod,
            spaces: (catAllocations as any[]).filter(a => a.entityType === 'SPACE')
          };
        });

        const totalAllocated = categoryAllocations.reduce((sum, a) => sum + a.allocatedCost, 0);

        // Calculate per-unit costs if possible
        const departmentMetrics = await this.getDepartmentMetrics(departmentId);
        const costPerSqFt = departmentMetrics.totalSqFt > 0 ? totalAllocated / departmentMetrics.totalSqFt : undefined;
        const costPerEmployee = departmentMetrics.employeeCount > 0 ? totalAllocated / departmentMetrics.employeeCount : undefined;

        reports.push({
          period,
          department: {
            id: department.id,
            name: department.name,
            costCenter: department.costCenter
          },
          allocations: categoryAllocations,
          totalAllocated,
          costPerSqFt,
          costPerEmployee
        });
      }

      logger.info('Chargeback report generated successfully', { 
        reportsGenerated: reports.length 
      });

      return reports;
    } catch (error: unknown) {
      logger.error('Failed to generate chargeback report', error);
      throw error;
    }
  }

  /**
   * Get allocation basis for different methods
   */
  private async getAllocationBasis(
    organizationId: string,
    allocationMethod: string,
    spaceId?: string,
    departmentId?: string
  ): Promise<any[]> {
    switch (allocationMethod) {
      case 'SQUARE_FOOTAGE':
        return this.getSpaceAllocationBasis(organizationId, spaceId);
      case 'EMPLOYEE_COUNT':
        return this.getEmployeeAllocationBasis(organizationId, departmentId);
      case 'EQUAL_SPLIT':
        return this.getEqualSplitBasis(organizationId, departmentId);
      case 'USAGE_BASED':
        return this.getUsageAllocationBasis(organizationId, spaceId);
      default:
        throw new Error(`Unsupported allocation method: ${allocationMethod}`);
    }
  }

  /**
   * Get space-based allocation basis
   */
  private async getSpaceAllocationBasis(organizationId: string, spaceId?: string): Promise<any[]> {
    const whereClause: any = { organizationId };
    if (spaceId) {
      whereClause.id = spaceId;
    }

    const spaces = await prisma.space.findMany({
      where: whereClause,
      include: { department: true }
    });

    const totalSqFt = spaces.reduce((sum, space) => sum + (space.area || 0), 0);

    return spaces.map(space => ({
      entityId: space.departmentId || space.id,
      entityType: space.departmentId ? 'DEPARTMENT' : 'SPACE',
      entityName: space.department?.name || space.name,
      allocationFactor: totalSqFt > 0 ? (space.area || 0) / totalSqFt : 0
    }));
  }

  /**
   * Get employee-based allocation basis
   */
  private async getEmployeeAllocationBasis(organizationId: string, departmentId?: string): Promise<any[]> {
    const whereClause: any = { organizationId };
    if (departmentId) {
      whereClause.id = departmentId;
    }

    const departments = await prisma.department.findMany({
      where: whereClause,
      include: { employees: true }
    });

    const totalEmployees = departments.reduce((sum, dept) => sum + dept.employees.length, 0);

    return departments.map(dept => ({
      entityId: dept.id,
      entityType: 'DEPARTMENT',
      entityName: dept.name,
      allocationFactor: totalEmployees > 0 ? dept.employees.length / totalEmployees : 0
    }));
  }

  /**
   * Get equal split allocation basis
   */
  private async getEqualSplitBasis(organizationId: string, departmentId?: string): Promise<any[]> {
    const whereClause: any = { organizationId };
    if (departmentId) {
      whereClause.id = departmentId;
    }

    const departments = await prisma.department.findMany({
      where: whereClause
    });

    const splitFactor = departments.length > 0 ? 1 / departments.length : 0;

    return departments.map(dept => ({
      entityId: dept.id,
      entityType: 'DEPARTMENT',
      entityName: dept.name,
      allocationFactor: splitFactor
    }));
  }

  /**
   * Get usage-based allocation basis
   */
  private async getUsageAllocationBasis(organizationId: string, spaceId?: string): Promise<any[]> {
    // This would typically integrate with occupancy/utilization data
    // For now, return a placeholder implementation
    const whereClause: any = { organizationId };
    if (spaceId) {
      whereClause.id = spaceId;
    }

    const spaces = await prisma.space.findMany({
      where: whereClause,
      include: { department: true }
    });

    // Placeholder: assume equal usage for all spaces
    const equalUsage = spaces.length > 0 ? 1 / spaces.length : 0;

    return spaces.map(space => ({
      entityId: space.departmentId || space.id,
      entityType: space.departmentId ? 'DEPARTMENT' : 'SPACE',
      entityName: space.department?.name || space.name,
      allocationFactor: equalUsage
    }));
  }

  /**
   * Calculate allocation amount based on method
   */
  private calculateAllocation(totalCost: number, allocationFactor: number, method: string): number {
    return totalCost * allocationFactor;
  }

  /**
   * Get department metrics for per-unit calculations
   */
  private async getDepartmentMetrics(departmentId: string): Promise<{
    totalSqFt: number;
    employeeCount: number;
  }> {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        employees: true,
        spaces: true
      }
    });

    if (!department) {
      return { totalSqFt: 0, employeeCount: 0 };
    }

    const totalSqFt = department.spaces?.reduce((sum, space) => sum + (space.area || 0), 0) || 0;
    const employeeCount = department.employees?.length || 0;

    return { totalSqFt, employeeCount };
  }
}