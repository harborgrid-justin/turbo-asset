import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface ContractCreationData {
  leaseId: string;
  contractNumber: string;
  contractType: 'LEASE' | 'SERVICE_AGREEMENT' | 'MAINTENANCE' | 'CONSTRUCTION' | 'CONSULTING' | 'SUPPLY' | 'OTHER';
  version?: string;
  executionDate?: Date;
  effectiveDate?: Date;
  expirationDate?: Date;
  autoRenew?: boolean;
  renewalTerms?: any;
  originalDocument?: string;
  terms: any;
  clauses?: any;
  lessor: any;
  lessee: any;
  guarantors?: any;
  totalValue?: number;
  currency?: string;
  paymentTerms?: any;
  complianceReq?: any;
  insurance?: any;
  milestones?: Array<{
    milestoneName: string;
    milestoneType: 'DELIVERABLE' | 'PAYMENT' | 'APPROVAL' | 'INSPECTION' | 'COMPLIANCE' | 'DEADLINE' | 'OTHER';
    dueDate: Date;
    description?: string;
    requirements?: any;
    deliverables?: any;
  }>;
  vendors?: Array<{
    vendorId: string;
    role: 'GENERAL' | 'SUBCONTRACTOR' | 'SUPPLIER' | 'CONSULTANT' | 'SPECIALIST';
    startDate?: Date;
    endDate?: Date;
    contractValue?: number;
    paymentTerms?: any;
    deliverables?: any;
  }>;
}

export interface ContractSummary {
  totalContracts: number;
  activeContracts: number;
  contractsByType: { [key: string]: number };
  contractsByStatus: { [key: string]: number };
  totalContractValue: number;
  expiringContracts: {
    next30Days: number;
    next60Days: number;
    next90Days: number;
    nextYear: number;
  };
  renewalPipeline: Array<{
    contractId: string;
    contractNumber: string;
    contractType: string;
    expirationDate: Date;
    autoRenew: boolean;
    totalValue: number;
    renewalStatus: string;
  }>;
  performanceMetrics: {
    onTimeDeliveryRate: number;
    budgetComplianceRate: number;
    qualityScore: number;
    renewalRate: number;
  };
  riskIndicators: {
    highRiskContracts: number;
    contractsWithIssues: number;
    overdueDeliverables: number;
  };
}

export interface RenewalAnalysis {
  contractId: string;
  contractNumber: string;
  currentTerms: any;
  marketComparison: {
    currentRate: number;
    marketRate: number;
    competitorRates: number[];
    recommendation: 'RENEW' | 'RENEGOTIATE' | 'TERMINATE' | 'REBID';
  };
  performanceReview: {
    overallScore: number;
    deliveryScore: number;
    qualityScore: number;
    costScore: number;
    issues: string[];
  };
  financialImpact: {
    currentAnnualCost: number;
    proposedAnnualCost: number;
    potentialSavings: number;
    riskAdjustment: number;
  };
  recommendations: string[];
  renewalProbability: number;
  nextSteps: string[];
}

export interface ContractOptimizationRecommendations {
  consolidationOpportunities: Array<{
    contracts: string[];
    estimatedSavings: number;
    implementation: string;
  }>;
  renegotiationTargets: Array<{
    contractId: string;
    currentTerms: any;
    proposedTerms: any;
    savingsOpportunity: number;
  }>;
  performanceImprovements: Array<{
    contractId: string;
    performanceGaps: string[];
    improvementPlan: string;
    expectedBenefits: string[];
  }>;
  contractStandardization: {
    templatesNeeded: string[];
    clauseStandardization: string[];
    processImprovements: string[];
  };
}

/**
 * ContractLifecycleService handles contract management and renewal optimization
 * Provides comprehensive contract lifecycle management and optimization analytics
 */
export class ContractLifecycleService {

  /**
   * Create a new contract with milestones and vendor assignments
   */
  async createContract(data: ContractCreationData): Promise<any> {
    try {
      // Validate lease exists
      const lease = await prisma.lease.findUnique({
        where: { id: data.leaseId },
        include: {
          property: true,
          tenant: true
        }
      });

      if (!lease) {
        throw new Error('Lease not found');
      }

      // Check for duplicate contract number
      const existingContract = await prisma.leaseContract.findUnique({
        where: { contractNumber: data.contractNumber }
      });

      if (existingContract) {
        throw new Error('Contract number already exists');
      }

      const contract = await prisma.leaseContract.create({
        data: {
          leaseId: data.leaseId,
          contractNumber: data.contractNumber,
          contractType: data.contractType,
          version: data.version || '1.0',
          status: 'DRAFT',
          executionDate: data.executionDate,
          effectiveDate: data.effectiveDate,
          expirationDate: data.expirationDate,
          autoRenew: data.autoRenew || false,
          renewalTerms: data.renewalTerms,
          originalDocument: data.originalDocument,
          terms: data.terms,
          clauses: data.clauses,
          lessor: data.lessor,
          lessee: data.lessee,
          guarantors: data.guarantors,
          totalValue: data.totalValue,
          currency: data.currency || 'USD',
          paymentTerms: data.paymentTerms,
          complianceReq: data.complianceReq,
          insurance: data.insurance,
          isActive: true
        }
      });

      // Create milestones if provided
      if (data.milestones && data.milestones.length > 0) {
        const milestonePromises = data.milestones.map(milestone => {
          return prisma.contractMilestone.create({
            data: {
              contractId: contract.id,
              milestoneName: milestone.milestoneName,
              milestoneType: milestone.milestoneType,
              dueDate: milestone.dueDate,
              description: milestone.description,
              requirements: milestone.requirements,
              deliverables: milestone.deliverables,
              status: 'PENDING',
              completionPercentage: 0
            }
          });
        });

        await Promise.all(milestonePromises);
      }

      // Create vendor assignments if provided
      if (data.vendors && data.vendors.length > 0) {
        const vendorPromises = data.vendors.map(vendorAssignment => {
          return prisma.contractVendor.create({
            data: {
              contractId: contract.id,
              vendorId: vendorAssignment.vendorId,
              role: vendorAssignment.role,
              startDate: vendorAssignment.startDate,
              endDate: vendorAssignment.endDate,
              contractValue: vendorAssignment.contractValue,
              paymentTerms: vendorAssignment.paymentTerms,
              deliverables: vendorAssignment.deliverables,
              status: 'ACTIVE'
            }
          });
        });

        await Promise.all(vendorPromises);
      }

      // Create critical dates for contract milestones
      if (data.expirationDate) {
        await prisma.criticalDate.create({
          data: {
            contractId: contract.id,
            dateType: 'CONTRACT_RENEWAL',
            dateValue: data.expirationDate,
            description: `Contract ${data.contractNumber} expires`,
            importance: 'HIGH',
            alertDays: [180, 90, 60, 30, 14],
            actionRequired: 'Review contract for renewal or termination'
          }
        });
      }

      logger.info('Contract created successfully', {
        contractId: contract.id,
        contractNumber: data.contractNumber,
        leaseId: data.leaseId,
        milestoneCount: data.milestones?.length || 0,
        vendorCount: data.vendors?.length || 0
      });

      return contract;
    } catch (error) {
      logger.error('Failed to create contract', error);
      throw error;
    }
  }

  /**
   * Get comprehensive contract summary
   */
  async getContractSummary(organizationId: string): Promise<ContractSummary> {
    try {
      const now = new Date();
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const next60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const contracts = await prisma.leaseContract.findMany({
        where: {
          lease: {
            property: {
              organizationId
            }
          },
          isActive: true
        },
        include: {
          lease: {
            include: {
              tenant: true,
              property: true
            }
          },
          milestones: true,
          vendors: {
            include: {
              vendor: true
            }
          }
        }
      });

      const totalContracts = contracts.length;
      const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;

      // Contract breakdown by type
      const contractsByType = contracts.reduce((acc, contract) => {
        acc[contract.contractType] = (acc[contract.contractType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Contract breakdown by status
      const contractsByStatus = contracts.reduce((acc, contract) => {
        acc[contract.status] = (acc[contract.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Total contract value
      const totalContractValue = contracts.reduce((sum, contract) => sum + (contract.totalValue || 0), 0);

      // Expiring contracts analysis
      const expiringContracts = {
        next30Days: contracts.filter(c => c.expirationDate && c.expirationDate <= next30Days).length,
        next60Days: contracts.filter(c => c.expirationDate && c.expirationDate <= next60Days).length,
        next90Days: contracts.filter(c => c.expirationDate && c.expirationDate <= next90Days).length,
        nextYear: contracts.filter(c => c.expirationDate && c.expirationDate <= nextYear).length
      };

      // Renewal pipeline
      const renewalPipeline = contracts
        .filter(c => c.expirationDate && c.expirationDate <= nextYear)
        .map(c => ({
          contractId: c.id,
          contractNumber: c.contractNumber,
          contractType: c.contractType,
          expirationDate: c.expirationDate!,
          autoRenew: c.autoRenew,
          totalValue: c.totalValue || 0,
          renewalStatus: this.determineRenewalStatus(c)
        }))
        .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

      // Performance metrics (simplified calculations)
      const performanceMetrics = this.calculatePerformanceMetrics(contracts);

      // Risk indicators
      const riskIndicators = this.calculateRiskIndicators(contracts);

      return {
        totalContracts,
        activeContracts,
        contractsByType,
        contractsByStatus,
        totalContractValue: Math.round(totalContractValue),
        expiringContracts,
        renewalPipeline,
        performanceMetrics,
        riskIndicators
      };
    } catch (error) {
      logger.error('Failed to get contract summary', error);
      throw error;
    }
  }

  /**
   * Analyze renewal opportunities for contracts
   */
  async analyzeRenewalOpportunities(organizationId: string): Promise<RenewalAnalysis[]> {
    try {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const contractsForRenewal = await prisma.leaseContract.findMany({
        where: {
          lease: {
            property: { organizationId }
          },
          expirationDate: {
            lte: oneYearFromNow,
            gte: new Date()
          },
          status: 'ACTIVE'
        },
        include: {
          lease: {
            include: {
              tenant: true,
              property: true
            }
          },
          vendors: {
            include: {
              vendor: {
                include: {
                  performance: {
                    orderBy: { evaluationDate: 'desc' },
                    take: 1
                  }
                }
              }
            }
          },
          milestones: true
        }
      });

      const renewalAnalyses: RenewalAnalysis[] = [];

      for (const contract of contractsForRenewal) {
        const analysis = await this.performRenewalAnalysis(contract);
        renewalAnalyses.push(analysis);
      }

      return renewalAnalyses.sort((a, b) => b.renewalProbability - a.renewalProbability);
    } catch (error) {
      logger.error('Failed to analyze renewal opportunities', error);
      throw error;
    }
  }

  /**
   * Generate contract optimization recommendations
   */
  async generateOptimizationRecommendations(organizationId: string): Promise<ContractOptimizationRecommendations> {
    try {
      const contracts = await prisma.leaseContract.findMany({
        where: {
          lease: {
            property: { organizationId }
          },
          isActive: true
        },
        include: {
          lease: {
            include: {
              tenant: true,
              property: true
            }
          },
          vendors: {
            include: {
              vendor: {
                include: {
                  performance: {
                    orderBy: { evaluationDate: 'desc' },
                    take: 1
                  }
                }
              }
            }
          }
        }
      });

      // Identify consolidation opportunities
      const consolidationOpportunities = this.identifyConsolidationOpportunities(contracts);

      // Identify renegotiation targets
      const renegotiationTargets = this.identifyRenegotiationTargets(contracts);

      // Identify performance improvements
      const performanceImprovements = this.identifyPerformanceImprovements(contracts);

      // Contract standardization recommendations
      const contractStandardization = this.generateStandardizationRecommendations(contracts);

      return {
        consolidationOpportunities,
        renegotiationTargets,
        performanceImprovements,
        contractStandardization
      };
    } catch (error) {
      logger.error('Failed to generate optimization recommendations', error);
      throw error;
    }
  }

  /**
   * Update contract milestone status
   */
  async updateMilestoneStatus(
    milestoneId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CANCELLED',
    completionPercentage?: number,
    notes?: string
  ): Promise<any> {
    try {
      const milestone = await prisma.contractMilestone.update({
        where: { id: milestoneId },
        data: {
          status,
          completionPercentage: completionPercentage || 0,
          ...(status === 'COMPLETED' && {
            completedDate: new Date()
          }),
          notes,
          updatedAt: new Date()
        }
      });

      // Update contract progress based on milestone completion
      await this.updateContractProgress(milestone.contractId);

      logger.info('Milestone status updated', {
        milestoneId,
        status,
        completionPercentage
      });

      return milestone;
    } catch (error) {
      logger.error('Failed to update milestone status', error);
      throw error;
    }
  }

  /**
   * Generate contract performance report
   */
  async generateContractReport(
    organizationId: string,
    reportType: string,
    filters: any = {}
  ): Promise<any> {
    try {
      switch (reportType) {
        case 'CONTRACT_SUMMARY':
          return await this.generateContractSummaryReport(organizationId, filters);
        case 'RENEWAL_PIPELINE':
          return await this.generateRenewalPipelineReport(organizationId, filters);
        case 'PERFORMANCE_ANALYSIS':
          return await this.generatePerformanceAnalysisReport(organizationId, filters);
        case 'OPTIMIZATION_OPPORTUNITIES':
          return await this.generateOptimizationReport(organizationId, filters);
        default:
          throw new Error('Invalid report type');
      }
    } catch (error) {
      logger.error('Failed to generate contract report', error);
      throw error;
    }
  }

  /**
   * Process contract renewal
   */
  async processContractRenewal(
    contractId: string,
    renewalData: {
      newExpirationDate: Date;
      newTerms?: any;
      priceAdjustment?: number;
      renewalNotes?: string;
      autoApprove?: boolean;
    }
  ): Promise<any> {
    try {
      const contract = await prisma.leaseContract.findUnique({
        where: { id: contractId }
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      // Create new version of contract for renewal
      const renewedContract = await prisma.leaseContract.create({
        data: {
          ...contract,
          id: undefined, // Create new record
          version: this.incrementVersion(contract.version),
          expirationDate: renewalData.newExpirationDate,
          terms: renewalData.newTerms || contract.terms,
          totalValue: renewalData.priceAdjustment ? 
            (contract.totalValue || 0) * (1 + renewalData.priceAdjustment / 100) :
            contract.totalValue,
          status: renewalData.autoApprove ? 'ACTIVE' : 'UNDER_REVIEW',
          executionDate: new Date(),
          effectiveDate: contract.expirationDate, // New contract starts when old one ends
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Mark old contract as completed
      await prisma.leaseContract.update({
        where: { id: contractId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });

      // Create critical dates for new contract
      if (renewalData.newExpirationDate) {
        await prisma.criticalDate.create({
          data: {
            contractId: renewedContract.id,
            dateType: 'CONTRACT_RENEWAL',
            dateValue: renewalData.newExpirationDate,
            description: `Renewed contract ${renewedContract.contractNumber} expires`,
            importance: 'HIGH',
            alertDays: [180, 90, 60, 30, 14],
            actionRequired: 'Review contract for renewal or termination'
          }
        });
      }

      logger.info('Contract renewal processed', {
        originalContractId: contractId,
        renewedContractId: renewedContract.id,
        newExpirationDate: renewalData.newExpirationDate
      });

      return renewedContract;
    } catch (error) {
      logger.error('Failed to process contract renewal', error);
      throw error;
    }
  }

  /**
   * Track contract compliance and deliverables
   */
  async trackContractCompliance(contractId: string): Promise<any> {
    try {
      const contract = await prisma.leaseContract.findUnique({
        where: { id: contractId },
        include: {
          milestones: true,
          vendors: {
            include: {
              vendor: {
                include: {
                  performance: {
                    orderBy: { evaluationDate: 'desc' },
                    take: 1
                  }
                }
              }
            }
          }
        }
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      const now = new Date();
      const compliance = {
        contractId,
        overallStatus: 'COMPLIANT',
        milestoneCompliance: {
          totalMilestones: contract.milestones.length,
          completedMilestones: contract.milestones.filter(m => m.status === 'COMPLETED').length,
          overdueMilestones: contract.milestones.filter(m => m.dueDate < now && m.status !== 'COMPLETED').length,
          upcomingMilestones: contract.milestones.filter(m => {
            const dueDate = new Date(m.dueDate);
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            return dueDate <= thirtyDaysFromNow && dueDate > now && m.status !== 'COMPLETED';
          }).length
        },
        vendorPerformance: contract.vendors.map(cv => ({
          vendorId: cv.vendorId,
          vendorName: cv.vendor.name,
          role: cv.role,
          status: cv.status,
          overallRating: cv.vendor.overallRating || 0,
          latestPerformanceScore: cv.vendor.performance[0]?.overallScore || 0
        })),
        complianceIssues: this.identifyComplianceIssues(contract),
        recommendations: this.generateComplianceRecommendations(contract)
      };

      // Determine overall status
      if (compliance.milestoneCompliance.overdueMilestones > 0) {
        compliance.overallStatus = 'NON_COMPLIANT';
      } else if (compliance.milestoneCompliance.upcomingMilestones > 2) {
        compliance.overallStatus = 'AT_RISK';
      }

      return compliance;
    } catch (error) {
      logger.error('Failed to track contract compliance', error);
      throw error;
    }
  }

  // Private helper methods

  private determineRenewalStatus(contract: any): string {
    const now = new Date();
    const expirationDate = new Date(contract.expirationDate);
    const monthsToExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (contract.autoRenew) {
      return 'AUTO_RENEWAL';
    } else if (monthsToExpiration <= 3) {
      return 'URGENT_REVIEW';
    } else if (monthsToExpiration <= 6) {
      return 'REVIEW_REQUIRED';
    } else {
      return 'ON_TRACK';
    }
  }

  private calculatePerformanceMetrics(contracts: any[]): any {
    const completedMilestones = contracts.flatMap(c => c.milestones || [])
      .filter(m => m.status === 'COMPLETED');
    const totalMilestones = contracts.flatMap(c => c.milestones || []);
    const overdueMilestones = totalMilestones.filter(m => 
      new Date(m.dueDate) < new Date() && m.status !== 'COMPLETED'
    );

    return {
      onTimeDeliveryRate: totalMilestones.length > 0 ? 
        Math.round(((totalMilestones.length - overdueMilestones.length) / totalMilestones.length) * 100) : 100,
      budgetComplianceRate: 85, // Demo value - would be calculated from actual vs budgeted costs
      qualityScore: 4.2, // Demo value - would be calculated from quality assessments
      renewalRate: 75 // Demo value - would be calculated from historical renewal data
    };
  }

  private calculateRiskIndicators(contracts: any[]): any {
    const now = new Date();
    const highRiskContracts = contracts.filter(c => {
      const hasOverdueMilestones = (c.milestones || []).some((m: any) => 
        new Date(m.dueDate) < now && m.status !== 'COMPLETED'
      );
      const isNearExpiration = c.expirationDate && 
        new Date(c.expirationDate).getTime() - now.getTime() < 90 * 24 * 60 * 60 * 1000; // 90 days
      return hasOverdueMilestones || isNearExpiration;
    }).length;

    const contractsWithIssues = contracts.filter(c => 
      c.status === 'UNDER_REVIEW' || c.status === 'DISPUTED'
    ).length;

    const overdueDeliverables = contracts.flatMap(c => c.milestones || [])
      .filter(m => new Date(m.dueDate) < now && m.status !== 'COMPLETED').length;

    return {
      highRiskContracts,
      contractsWithIssues,
      overdueDeliverables
    };
  }

  private async performRenewalAnalysis(contract: any): Promise<RenewalAnalysis> {
    // Calculate current annual cost
    const currentAnnualCost = (contract.totalValue || 0) / 
      Math.max(1, (new Date(contract.expirationDate).getFullYear() - new Date(contract.effectiveDate).getFullYear()));

    // Market comparison (simplified - would integrate with market data)
    const marketRate = currentAnnualCost * 1.1; // Assume 10% market premium
    const competitorRates = [
      currentAnnualCost * 0.95,
      currentAnnualCost * 1.05,
      currentAnnualCost * 1.15
    ];

    let recommendation: 'RENEW' | 'RENEGOTIATE' | 'TERMINATE' | 'REBID' = 'RENEW';
    if (marketRate < currentAnnualCost * 0.9) {
      recommendation = 'RENEGOTIATE';
    } else if (marketRate > currentAnnualCost * 1.2) {
      recommendation = 'REBID';
    }

    // Performance review based on vendor performance
    const vendorScores = contract.vendors.map((cv: any) => cv.vendor.performance[0]?.overallScore || 3);
    const averageVendorScore = vendorScores.length > 0 ? 
      vendorScores.reduce((sum: number, score: number) => sum + score, 0) / vendorScores.length : 3;

    const performanceReview = {
      overallScore: averageVendorScore,
      deliveryScore: averageVendorScore * 0.9, // Simplified
      qualityScore: averageVendorScore * 1.1, // Simplified
      costScore: averageVendorScore,
      issues: averageVendorScore < 3 ? ['Performance below expectations'] : []
    };

    // Financial impact analysis
    const proposedAnnualCost = recommendation === 'RENEGOTIATE' ? 
      currentAnnualCost * 0.95 : currentAnnualCost * 1.03;
    const potentialSavings = currentAnnualCost - proposedAnnualCost;

    const renewalProbability = this.calculateRenewalProbability(contract, performanceReview, recommendation);

    return {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      currentTerms: contract.terms,
      marketComparison: {
        currentRate: Math.round(currentAnnualCost),
        marketRate: Math.round(marketRate),
        competitorRates: competitorRates.map(rate => Math.round(rate)),
        recommendation
      },
      performanceReview,
      financialImpact: {
        currentAnnualCost: Math.round(currentAnnualCost),
        proposedAnnualCost: Math.round(proposedAnnualCost),
        potentialSavings: Math.round(potentialSavings),
        riskAdjustment: Math.round(potentialSavings * 0.1) // 10% risk adjustment
      },
      recommendations: this.generateRenewalRecommendations(recommendation, performanceReview, potentialSavings),
      renewalProbability,
      nextSteps: this.generateNextSteps(recommendation, contract.expirationDate)
    };
  }

  private calculateRenewalProbability(contract: any, performanceReview: any, recommendation: string): number {
    let probability = 70; // Base probability

    // Adjust based on performance
    if (performanceReview.overallScore > 4) {
      probability += 15;
    } else if (performanceReview.overallScore < 3) {
      probability -= 20;
    }

    // Adjust based on recommendation
    switch (recommendation) {
      case 'RENEW':
        probability += 10;
        break;
      case 'RENEGOTIATE':
        probability += 5;
        break;
      case 'REBID':
        probability -= 15;
        break;
      case 'TERMINATE':
        probability -= 30;
        break;
    }

    // Adjust based on auto-renewal
    if (contract.autoRenew) {
      probability += 20;
    }

    return Math.max(0, Math.min(100, Math.round(probability)));
  }

  private generateRenewalRecommendations(recommendation: string, performanceReview: any, potentialSavings: number): string[] {
    const recommendations = [];

    switch (recommendation) {
      case 'RENEW':
        recommendations.push('Contract performance is satisfactory - proceed with renewal');
        if (potentialSavings > 0) {
          recommendations.push(`Potential savings of $${potentialSavings.toLocaleString()} available through renegotiation`);
        }
        break;
      case 'RENEGOTIATE':
        recommendations.push('Renegotiate terms to achieve better pricing or service levels');
        recommendations.push('Use market benchmarking data in negotiations');
        break;
      case 'REBID':
        recommendations.push('Market rates significantly lower - consider rebidding process');
        recommendations.push('Allow 90+ days for rebidding process');
        break;
      case 'TERMINATE':
        recommendations.push('Consider termination due to poor performance or high costs');
        recommendations.push('Develop transition plan for alternative service provision');
        break;
    }

    if (performanceReview.overallScore < 3.5) {
      recommendations.push('Address performance issues before renewal decision');
    }

    return recommendations;
  }

  private generateNextSteps(recommendation: string, expirationDate: Date): string[] {
    const now = new Date();
    const monthsToExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

    const nextSteps = [];

    if (monthsToExpiration <= 3) {
      nextSteps.push('URGENT: Immediate action required');
    }

    switch (recommendation) {
      case 'RENEW':
        nextSteps.push('Initiate renewal discussions with current vendor');
        nextSteps.push('Review and update contract terms');
        break;
      case 'RENEGOTIATE':
        nextSteps.push('Prepare market analysis and benchmarking data');
        nextSteps.push('Schedule renegotiation meetings');
        break;
      case 'REBID':
        nextSteps.push('Prepare RFP documentation');
        nextSteps.push('Identify potential bidders');
        nextSteps.push('Plan transition timeline');
        break;
    }

    nextSteps.push('Update critical date alerts');
    nextSteps.push('Schedule stakeholder review meeting');

    return nextSteps;
  }

  private identifyConsolidationOpportunities(contracts: any[]): any[] {
    // Simplified consolidation logic - would be more sophisticated in practice
    const serviceContracts = contracts.filter(c => c.contractType === 'SERVICE_AGREEMENT');
    const maintenanceContracts = contracts.filter(c => c.contractType === 'MAINTENANCE');

    const opportunities = [];

    if (serviceContracts.length >= 3) {
      opportunities.push({
        contracts: serviceContracts.slice(0, 3).map(c => c.contractNumber),
        estimatedSavings: 50000,
        implementation: 'Consolidate three service contracts into single master agreement'
      });
    }

    if (maintenanceContracts.length >= 2) {
      opportunities.push({
        contracts: maintenanceContracts.slice(0, 2).map(c => c.contractNumber),
        estimatedSavings: 25000,
        implementation: 'Combine maintenance contracts for economies of scale'
      });
    }

    return opportunities;
  }

  private identifyRenegotiationTargets(contracts: any[]): any[] {
    return contracts
      .filter(c => c.totalValue && c.totalValue > 100000) // High value contracts
      .slice(0, 5) // Top 5
      .map(c => ({
        contractId: c.id,
        currentTerms: { value: c.totalValue, term: 'Current terms' },
        proposedTerms: { value: c.totalValue * 0.95, term: 'Renegotiated terms' },
        savingsOpportunity: c.totalValue * 0.05
      }));
  }

  private identifyPerformanceImprovements(contracts: any[]): any[] {
    return contracts
      .filter(c => {
        const hasLowPerformingVendor = c.vendors?.some((cv: any) => 
          (cv.vendor.overallRating || 0) < 3.5
        );
        return hasLowPerformingVendor;
      })
      .map(c => ({
        contractId: c.id,
        performanceGaps: ['Below average vendor performance', 'Service level improvements needed'],
        improvementPlan: 'Implement performance improvement plan with monthly reviews',
        expectedBenefits: ['Improved service quality', 'Better cost efficiency', 'Enhanced tenant satisfaction']
      }));
  }

  private generateStandardizationRecommendations(contracts: any[]): any {
    return {
      templatesNeeded: ['Service Agreement Template', 'Maintenance Contract Template'],
      clauseStandardization: ['Payment Terms', 'Performance Standards', 'Termination Clauses'],
      processImprovements: ['Automated approval workflow', 'Standardized evaluation criteria', 'Digital contract repository']
    };
  }

  private async updateContractProgress(contractId: string): Promise<void> {
    const milestones = await prisma.contractMilestone.findMany({
      where: { contractId }
    });

    if (milestones.length === 0) {return;}

    const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length;
    const progressPercentage = (completedMilestones / milestones.length) * 100;

    // Update contract with overall progress (would need to add this field to schema)
    logger.info('Contract progress calculated', {
      contractId,
      progressPercentage: Math.round(progressPercentage)
    });
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const minor = parseInt(parts[1] || '0') + 1;
    return `${parts[0]}.${minor}`;
  }

  private identifyComplianceIssues(contract: any): string[] {
    const issues = [];
    const now = new Date();

    // Check for overdue milestones
    const overdueMilestones = contract.milestones.filter((m: any) => 
      new Date(m.dueDate) < now && m.status !== 'COMPLETED'
    );

    if (overdueMilestones.length > 0) {
      issues.push(`${overdueMilestones.length} overdue milestone(s)`);
    }

    // Check contract expiration
    if (contract.expirationDate && new Date(contract.expirationDate) < now) {
      issues.push('Contract has expired');
    }

    // Check vendor performance
    const lowPerformingVendors = contract.vendors?.filter((cv: any) => 
      (cv.vendor.overallRating || 0) < 3
    ).length || 0;

    if (lowPerformingVendors > 0) {
      issues.push(`${lowPerformingVendors} low-performing vendor(s)`);
    }

    return issues;
  }

  private generateComplianceRecommendations(contract: any): string[] {
    const recommendations = [];
    const now = new Date();

    const overdueMilestones = contract.milestones.filter((m: any) => 
      new Date(m.dueDate) < now && m.status !== 'COMPLETED'
    );

    if (overdueMilestones.length > 0) {
      recommendations.push('Address overdue milestones immediately');
      recommendations.push('Review milestone timeline and adjust if necessary');
    }

    if (contract.expirationDate) {
      const daysToExpiration = Math.ceil(
        (new Date(contract.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysToExpiration < 90) {
        recommendations.push('Begin renewal or termination process');
      } else if (daysToExpiration < 180) {
        recommendations.push('Start planning for contract renewal');
      }
    }

    const lowPerformingVendors = contract.vendors?.filter((cv: any) => 
      (cv.vendor.overallRating || 0) < 3
    ).length || 0;

    if (lowPerformingVendors > 0) {
      recommendations.push('Address vendor performance issues');
      recommendations.push('Consider vendor replacement if performance does not improve');
    }

    if (recommendations.length === 0) {
      recommendations.push('Contract compliance is satisfactory - continue monitoring');
    }

    return recommendations;
  }

  private async generateContractSummaryReport(organizationId: string, filters: any): Promise<any> {
    const summary = await this.getContractSummary(organizationId);
    
    return {
      reportType: 'CONTRACT_SUMMARY',
      generatedDate: new Date(),
      parameters: { organizationId, ...filters },
      summary,
      insights: [
        `${summary.expiringContracts.next90Days} contracts require attention in next 90 days`,
        `Overall performance metrics show ${summary.performanceMetrics.onTimeDeliveryRate}% on-time delivery rate`,
        `${summary.riskIndicators.highRiskContracts} contracts identified as high-risk`,
        summary.renewalPipeline.length > 10 ? 
          'Heavy renewal pipeline - ensure adequate resources allocated' :
          'Manageable renewal pipeline'
      ]
    };
  }

  private async generateRenewalPipelineReport(organizationId: string, filters: any): Promise<any> {
    const renewalAnalyses = await this.analyzeRenewalOpportunities(organizationId);
    
    return {
      reportType: 'RENEWAL_PIPELINE',
      generatedDate: new Date(),
      summary: {
        totalContracts: renewalAnalyses.length,
        highProbability: renewalAnalyses.filter(r => r.renewalProbability > 70).length,
        requiresAttention: renewalAnalyses.filter(r => r.renewalProbability < 50).length,
        potentialSavings: renewalAnalyses.reduce((sum, r) => sum + r.financialImpact.potentialSavings, 0)
      },
      renewalAnalyses
    };
  }

  private async generatePerformanceAnalysisReport(organizationId: string, filters: any): Promise<any> {
    // Implementation for performance analysis report
    return {
      reportType: 'PERFORMANCE_ANALYSIS',
      generatedDate: new Date(),
      // ... detailed performance analysis
    };
  }

  private async generateOptimizationReport(organizationId: string, filters: any): Promise<any> {
    const recommendations = await this.generateOptimizationRecommendations(organizationId);
    
    return {
      reportType: 'OPTIMIZATION_OPPORTUNITIES',
      generatedDate: new Date(),
      recommendations,
      potentialSavings: recommendations.consolidationOpportunities
        .reduce((sum, opp) => sum + opp.estimatedSavings, 0) +
        recommendations.renegotiationTargets
        .reduce((sum, target) => sum + target.savingsOpportunity, 0)
    };
  }
}