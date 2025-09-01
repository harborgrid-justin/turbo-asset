import { prisma } from '../config/database';
import { logger } from '../config/logger';

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

export class ChargebackService {
  /**
   * Create chargeback rule
   */
  async createChargebackRule(data: ChargebackRuleData): Promise<any> {
    try {
      // Validate organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: data.organizationId },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      const rule = await prisma.chargebackRule.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          description: data.description,
          entityType: data.entityType,
          costCategory: data.costCategory,
          allocationMethod: data.allocationMethod,
          rate: data.rate,
          currency: data.currency || organization.defaultCurrency,
          effectiveDate: data.effectiveDate || new Date(),
          expiryDate: data.expiryDate,
        },
      });

      logger.info('Chargeback rule created', {
        ruleId: rule.id,
        organizationId: data.organizationId,
        name: data.name,
      });

      return rule;
    } catch (error) {
      logger.error('Failed to create chargeback rule', error);
      throw error;
    }
  }

  /**
   * Get chargeback rules for organization
   */
  async getChargebackRules(organizationId: string, includeExpired: boolean = false): Promise<any[]> {
    try {
      const whereClause: any = {
        organizationId,
        isActive: true,
      };

      if (!includeExpired) {
        whereClause.AND = [
          { effectiveDate: { lte: new Date() } },
          {
            OR: [
              { expiryDate: null },
              { expiryDate: { gt: new Date() } },
            ],
          },
        ];
      }

      const rules = await prisma.chargebackRule.findMany({
        where: whereClause,
        include: {
          allocations: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              allocations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return rules;
    } catch (error) {
      logger.error('Failed to get chargeback rules', error);
      throw error;
    }
  }

  /**
   * Process monthly allocations for all active rules
   */
  async processMonthlyAllocations(organizationId: string, period: string): Promise<void> {
    try {
      const rules = await this.getChargebackRules(organizationId);

      logger.info('Starting monthly allocation processing', {
        organizationId,
        period,
        ruleCount: rules.length,
      });

      for (const rule of rules) {
        try {
          await this.processRuleAllocation(rule, period);
        } catch (error) {
          logger.error('Failed to process rule allocation', {
            ruleId: rule.id,
            ruleName: rule.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Monthly allocation processing completed', {
        organizationId,
        period,
      });
    } catch (error) {
      logger.error('Failed to process monthly allocations', error);
      throw error;
    }
  }

  /**
   * Process allocation for a specific rule
   */
  async processRuleAllocation(rule: any, period: string): Promise<void> {
    try {
      // Get total cost for the period (this would normally come from accounting systems)
      // For this implementation, we'll calculate based on the rule rate and allocation method
      
      let totalCost: number;
      let allocations: any[] = [];

      switch (rule.allocationMethod) {
        case 'SQUARE_FOOTAGE':
          allocations = await this.allocateBySquareFootage(rule, period);
          break;
        case 'HEADCOUNT':
          allocations = await this.allocateByHeadcount(rule, period);
          break;
        case 'FIXED_PERCENTAGE':
          allocations = await this.allocateByFixedPercentage(rule, period);
          break;
        case 'USAGE_BASED':
          allocations = await this.allocateByUsage(rule, period);
          break;
        case 'ASSET_COUNT':
          allocations = await this.allocateByAssetCount(rule, period);
          break;
        default:
          throw new Error(`Unsupported allocation method: ${rule.allocationMethod}`);
      }

      // Calculate total cost
      totalCost = allocations.reduce((sum, alloc) => sum + alloc.allocatedCost, 0);

      // Create allocation records
      for (const allocation of allocations) {
        await prisma.chargebackAllocation.create({
          data: {
            ruleId: rule.id,
            period,
            totalCost,
            allocatedCost: allocation.allocatedCost,
            allocationBasis: allocation.allocationBasis,
            currency: rule.currency,
            departmentId: allocation.departmentId,
            spaceId: allocation.spaceId,
          },
        });
      }

      logger.info('Rule allocation processed', {
        ruleId: rule.id,
        ruleName: rule.name,
        period,
        totalCost,
        allocationCount: allocations.length,
      });
    } catch (error) {
      logger.error('Failed to process rule allocation', error);
      throw error;
    }
  }

  /**
   * Allocate costs by square footage
   */
  private async allocateBySquareFootage(rule: any, period: string): Promise<any[]> {
    const departments = await prisma.department.findMany({
      where: {
        organizationId: rule.organizationId,
        isActive: true,
        spaces: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        spaces: {
          where: { isActive: true },
        },
      },
    });

    const totalSquareFootage = departments.reduce(
      (sum, dept) => sum + dept.spaces.reduce((spaceSum, space) => spaceSum + (space.area || 0), 0),
      0
    );

    const allocations = departments.map(department => {
      const departmentArea = department.spaces.reduce((sum, space) => sum + (space.area || 0), 0);
      const allocationPercentage = totalSquareFootage > 0 ? departmentArea / totalSquareFootage : 0;
      const allocatedCost = (rule.rate || 0) * departmentArea;

      return {
        departmentId: department.id,
        allocatedCost,
        allocationBasis: departmentArea,
      };
    });

    return allocations.filter(alloc => alloc.allocatedCost > 0);
  }

  /**
   * Allocate costs by headcount
   */
  private async allocateByHeadcount(rule: any, period: string): Promise<any[]> {
    const departments = await prisma.department.findMany({
      where: {
        organizationId: rule.organizationId,
        isActive: true,
      },
      include: {
        users: {
          where: { isActive: true },
        },
      },
    });

    const totalHeadcount = departments.reduce((sum, dept) => sum + dept.users.length, 0);

    const allocations = departments.map(department => {
      const departmentHeadcount = department.users.length;
      const allocatedCost = (rule.rate || 0) * departmentHeadcount;

      return {
        departmentId: department.id,
        allocatedCost,
        allocationBasis: departmentHeadcount,
      };
    });

    return allocations.filter(alloc => alloc.allocatedCost > 0);
  }

  /**
   * Allocate costs by fixed percentage
   */
  private async allocateByFixedPercentage(rule: any, period: string): Promise<any[]> {
    // This would require percentage configuration per department
    // For simplicity, we'll allocate equally among active departments
    const departments = await prisma.department.findMany({
      where: {
        organizationId: rule.organizationId,
        isActive: true,
      },
    });

    const totalCost = rule.rate || 1000; // Default cost if not specified
    const allocationPerDepartment = totalCost / departments.length;

    return departments.map(department => ({
      departmentId: department.id,
      allocatedCost: allocationPerDepartment,
      allocationBasis: 1, // Equal allocation
    }));
  }

  /**
   * Allocate costs by usage (utilization data)
   */
  private async allocateByUsage(rule: any, period: string): Promise<any[]> {
    // Get utilization data for the period
    const [year, month] = period.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const utilizationData = await prisma.spaceUtilization.findMany({
      where: {
        recordDate: {
          gte: startDate,
          lte: endDate,
        },
        space: {
          floor: {
            building: {
              property: {
                organizationId: rule.organizationId,
              },
            },
          },
          departmentId: { not: null },
        },
      },
      include: {
        space: {
          include: {
            department: true,
          },
        },
      },
    });

    // Group by department and calculate average utilization
    const departmentUtilization = new Map<string, { total: number; count: number; department: any }>();

    utilizationData.forEach(record => {
      const deptId = record.space.departmentId!;
      if (!departmentUtilization.has(deptId)) {
        departmentUtilization.set(deptId, {
          total: 0,
          count: 0,
          department: record.space.department,
        });
      }
      
      const data = departmentUtilization.get(deptId)!;
      data.total += record.value;
      data.count += 1;
    });

    const totalUtilization = Array.from(departmentUtilization.values())
      .reduce((sum, data) => sum + (data.count > 0 ? data.total / data.count : 0), 0);

    return Array.from(departmentUtilization.entries()).map(([departmentId, data]) => {
      const avgUtilization = data.count > 0 ? data.total / data.count : 0;
      const utilizationPercentage = totalUtilization > 0 ? avgUtilization / totalUtilization : 0;
      const allocatedCost = (rule.rate || 0) * avgUtilization;

      return {
        departmentId,
        allocatedCost,
        allocationBasis: avgUtilization,
      };
    }).filter(alloc => alloc.allocatedCost > 0);
  }

  /**
   * Allocate costs by asset count
   */
  private async allocateByAssetCount(rule: any, period: string): Promise<any[]> {
    const departments = await prisma.department.findMany({
      where: {
        organizationId: rule.organizationId,
        isActive: true,
      },
      include: {
        spaces: {
          where: { isActive: true },
          include: {
            assets: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    const allocations = departments.map(department => {
      const assetCount = department.spaces.reduce(
        (sum, space) => sum + space.assets.length,
        0
      );
      const allocatedCost = (rule.rate || 0) * assetCount;

      return {
        departmentId: department.id,
        allocatedCost,
        allocationBasis: assetCount,
      };
    });

    return allocations.filter(alloc => alloc.allocatedCost > 0);
  }

  /**
   * Generate chargeback report
   */
  async generateChargebackReport(
    organizationId: string,
    period: string,
    departmentId?: string
  ): Promise<ChargebackReport[]> {
    try {
      const whereClause: any = {
        rule: {
          organizationId,
        },
        period,
      };

      if (departmentId) {
        whereClause.departmentId = departmentId;
      }

      const allocations = await prisma.chargebackAllocation.findMany({
        where: whereClause,
        include: {
          rule: true,
          department: true,
          space: {
            include: {
              floor: {
                include: {
                  building: true,
                },
              },
            },
          },
        },
      });

      // Group by department
      const departmentAllocations = new Map<string, any[]>();
      
      allocations.forEach(allocation => {
        const deptId = allocation.departmentId;
        if (!departmentAllocations.has(deptId)) {
          departmentAllocations.set(deptId, []);
        }
        departmentAllocations.get(deptId)!.push(allocation);
      });

      const reports: ChargebackReport[] = [];

      for (const [deptId, deptAllocations] of departmentAllocations.entries()) {
        const department = deptAllocations[0].department;
        
        // Group allocations by category
        const categoryAllocations = new Map<string, any[]>();
        deptAllocations.forEach(allocation => {
          const category = allocation.rule.costCategory;
          if (!categoryAllocations.has(category)) {
            categoryAllocations.set(category, []);
          }
          categoryAllocations.get(category)!.push(allocation);
        });

        const categoryReports = Array.from(categoryAllocations.entries()).map(([category, catAllocations]) => {
          const totalCost = catAllocations.reduce((sum, alloc) => sum + alloc.totalCost, 0);
          const allocatedCost = catAllocations.reduce((sum, alloc) => sum + alloc.allocatedCost, 0);
          const allocationBasis = catAllocations.reduce((sum, alloc) => sum + (alloc.allocationBasis || 0), 0);
          const method = catAllocations[0].rule.allocationMethod;

          return {
            category,
            totalCost,
            allocatedCost,
            allocationBasis,
            method,
            spaces: catAllocations.filter(alloc => alloc.space).map(alloc => ({
              id: alloc.space.id,
              name: alloc.space.name,
              area: alloc.space.area,
              building: alloc.space.floor.building.name,
            })),
          };
        });

        const totalAllocated = categoryReports.reduce((sum, cat) => sum + cat.allocatedCost, 0);

        // Calculate cost per metrics
        const departmentSpaces = await prisma.space.findMany({
          where: {
            departmentId: deptId,
            isActive: true,
          },
        });

        const totalArea = departmentSpaces.reduce((sum, space) => sum + (space.area || 0), 0);
        const employeeCount = await prisma.user.count({
          where: {
            departmentId: deptId,
            isActive: true,
          },
        });

        reports.push({
          period,
          department: {
            id: department.id,
            name: department.name,
            costCenter: department.costCenter,
          },
          allocations: categoryReports,
          totalAllocated,
          costPerSqFt: totalArea > 0 ? totalAllocated / totalArea : undefined,
          costPerEmployee: employeeCount > 0 ? totalAllocated / employeeCount : undefined,
        });
      }

      return reports.sort((a, b) => b.totalAllocated - a.totalAllocated);
    } catch (error) {
      logger.error('Failed to generate chargeback report', error);
      throw error;
    }
  }

  /**
   * Get chargeback analytics
   */
  async getChargebackAnalytics(organizationId: string, periodCount: number = 12): Promise<any> {
    try {
      // Get recent periods
      const currentDate = new Date();
      const periods: string[] = [];
      
      for (let i = 0; i < periodCount; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        periods.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      }

      const allocations = await prisma.chargebackAllocation.findMany({
        where: {
          rule: {
            organizationId,
          },
          period: { in: periods },
        },
        include: {
          rule: true,
          department: true,
        },
      });

      // Analyze by period
      const periodAnalysis = periods.map(period => {
        const periodAllocations = allocations.filter(alloc => alloc.period === period);
        const totalCost = periodAllocations.reduce((sum, alloc) => sum + alloc.allocatedCost, 0);
        const departmentCount = new Set(periodAllocations.map(alloc => alloc.departmentId)).size;

        return {
          period,
          totalCost: Math.round(totalCost),
          departmentCount,
          allocationCount: periodAllocations.length,
        };
      });

      // Analyze by department
      const departmentAnalysis = new Map<string, { name: string; totalCost: number; periods: number }>();
      
      allocations.forEach(allocation => {
        const deptId = allocation.departmentId;
        const deptName = allocation.department.name;
        
        if (!departmentAnalysis.has(deptId)) {
          departmentAnalysis.set(deptId, {
            name: deptName,
            totalCost: 0,
            periods: 0,
          });
        }
        
        const analysis = departmentAnalysis.get(deptId)!;
        analysis.totalCost += allocation.allocatedCost;
        
        // Count unique periods
        const deptPeriods = new Set(
          allocations.filter(a => a.departmentId === deptId).map(a => a.period)
        ).size;
        analysis.periods = deptPeriods;
      });

      // Analyze by cost category
      const categoryAnalysis = new Map<string, number>();
      
      allocations.forEach(allocation => {
        const category = allocation.rule.costCategory;
        categoryAnalysis.set(category, (categoryAnalysis.get(category) || 0) + allocation.allocatedCost);
      });

      return {
        summary: {
          totalPeriods: periods.length,
          totalAllocations: allocations.length,
          totalCost: Math.round(allocations.reduce((sum, alloc) => sum + alloc.allocatedCost, 0)),
          uniqueDepartments: departmentAnalysis.size,
          uniqueCategories: categoryAnalysis.size,
        },
        periodTrends: periodAnalysis.reverse(), // Most recent first
        departmentBreakdown: Array.from(departmentAnalysis.entries()).map(([id, data]) => ({
          departmentId: id,
          departmentName: data.name,
          totalCost: Math.round(data.totalCost),
          averageMonthlyCost: Math.round(data.totalCost / Math.max(data.periods, 1)),
          periodsWithAllocations: data.periods,
        })).sort((a, b) => b.totalCost - a.totalCost),
        categoryBreakdown: Array.from(categoryAnalysis.entries()).map(([category, cost]) => ({
          category,
          totalCost: Math.round(cost),
        })).sort((a, b) => b.totalCost - a.totalCost),
      };
    } catch (error) {
      logger.error('Failed to get chargeback analytics', error);
      throw error;
    }
  }

  /**
   * Update chargeback rule
   */
  async updateChargebackRule(ruleId: string, organizationId: string, updates: Partial<ChargebackRuleData>): Promise<any> {
    try {
      // Validate rule exists and belongs to organization
      const existingRule = await prisma.chargebackRule.findFirst({
        where: {
          id: ruleId,
          organizationId,
          isActive: true,
        },
      });

      if (!existingRule) {
        throw new Error('Chargeback rule not found');
      }

      const updatedRule = await prisma.chargebackRule.update({
        where: { id: ruleId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      logger.info('Chargeback rule updated', {
        ruleId,
        organizationId,
        updates: Object.keys(updates),
      });

      return updatedRule;
    } catch (error) {
      logger.error('Failed to update chargeback rule', error);
      throw error;
    }
  }

  /**
   * Delete chargeback rule (soft delete)
   */
  async deleteChargebackRule(ruleId: string, organizationId: string): Promise<void> {
    try {
      const existingRule = await prisma.chargebackRule.findFirst({
        where: {
          id: ruleId,
          organizationId,
          isActive: true,
        },
      });

      if (!existingRule) {
        throw new Error('Chargeback rule not found');
      }

      await prisma.chargebackRule.update({
        where: { id: ruleId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info('Chargeback rule deleted', { ruleId, organizationId });
    } catch (error) {
      logger.error('Failed to delete chargeback rule', error);
      throw error;
    }
  }
}