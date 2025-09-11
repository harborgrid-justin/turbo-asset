import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface SpaceStandard {
  id: string;
  name: string;
  category: 'OFFICE' | 'MEETING' | 'COMMON' | 'SUPPORT' | 'SPECIALIZED';
  type: string;
  description: string;
  specifications: SpaceSpecification;
  complianceRequirements: ComplianceRequirement[];
  costEstimates: CostEstimate[];
  templateConfiguration: TemplateConfiguration;
  isActive: boolean;
  version: string;
  organizationId: string;
}

export interface SpaceSpecification {
  minimumArea: number;
  maximumArea: number;
  recommendedArea: number;
  minimumCapacity: number;
  maximumCapacity: number;
  recommendedCapacity: number;
  ceilingHeight: number;
  ventilationRequirements: VentilationSpec;
  lightingRequirements: LightingSpec;
  acousticRequirements: AcousticSpec;
  accessibilityFeatures: AccessibilityFeature[];
  technologyRequirements: TechnologySpec[];
  furnitureRequirements: FurnitureSpec[];
  environmentalControls: EnvironmentalControlSpec;
}

export interface VentilationSpec {
  airChangesPerHour: number;
  freshAirPerPerson: number; // CFM
  temperatureRange: { min: number; max: number };
  humidityRange: { min: number; max: number };
  co2MaxLevel: number; // ppm
}

export interface LightingSpec {
  illuminationLevel: number; // lux
  colorTemperature: number; // Kelvin
  uniformityRatio: number;
  glareControl: boolean;
  naturalLightPreference: 'REQUIRED' | 'PREFERRED' | 'NEUTRAL' | 'AVOIDED';
  dimmingCapability: boolean;
}

export interface AcousticSpec {
  maxNoiseLevel: number; // dB
  speechPrivacyClass: 'CONFIDENTIAL' | 'NORMAL' | 'PUBLIC';
  soundMasking: boolean;
  speechIntelligibilityIndex: number;
  reverberation: { frequency: number; rt60: number }[];
}

export interface AccessibilityFeature {
  type: 'ADA_ENTRANCE' | 'WHEELCHAIR_ACCESSIBLE' | 'HEARING_LOOP' | 'VISUAL_ALERTS' | 'ADJUSTABLE_WORKSTATION';
  description: string;
  isRequired: boolean;
  specification: any;
}

export interface TechnologySpec {
  type: 'AV_SYSTEM' | 'NETWORK' | 'POWER' | 'SECURITY' | 'COLLABORATION';
  description: string;
  requirements: any;
  isRequired: boolean;
  costFactor: number;
}

export interface FurnitureSpec {
  category: 'SEATING' | 'TABLES' | 'STORAGE' | 'WORKSTATIONS' | 'SPECIALIZED';
  itemType: string;
  quantity: number;
  specifications: any;
  costPerUnit: number;
  vendorPreferences: string[];
}

export interface EnvironmentalControlSpec {
  hvacZoning: 'INDIVIDUAL' | 'SHARED' | 'CENTRAL';
  temperatureControl: 'INDIVIDUAL' | 'ZONE' | 'BUILDING';
  airQualityMonitoring: boolean;
  energyEfficiencyRating: 'STANDARD' | 'ENERGY_STAR' | 'LEED_COMPLIANT';
  sustainabilityFeatures: string[];
}

export interface ComplianceRequirement {
  standard: string; // e.g., 'OSHA', 'ADA', 'LEED', 'BOMA'
  requirement: string;
  description: string;
  severity: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
  validationMethod: 'INSPECTION' | 'CERTIFICATION' | 'DOCUMENTATION' | 'MEASUREMENT';
  frequency: 'INITIAL' | 'ANNUAL' | 'BIANNUAL' | 'AS_NEEDED';
}

export interface CostEstimate {
  category: 'CONSTRUCTION' | 'FURNITURE' | 'TECHNOLOGY' | 'COMPLIANCE' | 'MAINTENANCE';
  description: string;
  costPerSqFt: number;
  fixedCost: number;
  variableCost: number;
  laborHours: number;
  materialCost: number;
  currency: string;
  accuracy: 'ROUGH' | 'BUDGET' | 'DETAILED' | 'CONTRACT';
  validFrom: Date;
  validTo: Date;
}

export interface TemplateConfiguration {
  layout: LayoutTemplate;
  variants: TemplateVariant[];
  customizationOptions: CustomizationOption[];
  approvalWorkflow: ApprovalWorkflow;
}

export interface LayoutTemplate {
  type: '2D' | '3D' | 'PARAMETRIC';
  templateData: any;
  dimensions: { width: number; height: number; depth?: number };
  zones: LayoutZone[];
  circulation: CirculationPath[];
}

export interface LayoutZone {
  id: string;
  name: string;
  type: 'WORK' | 'MEETING' | 'CIRCULATION' | 'STORAGE' | 'AMENITY';
  area: number;
  capacity: number;
  adjacencyRequirements: string[];
  privacyLevel: 'OPEN' | 'SEMI_PRIVATE' | 'PRIVATE' | 'SECURE';
}

export interface CirculationPath {
  id: string;
  type: 'PRIMARY' | 'SECONDARY' | 'EMERGENCY';
  width: number;
  accessibility: boolean;
  waypoints: { x: number; y: number }[];
}

export interface TemplateVariant {
  id: string;
  name: string;
  description: string;
  applicability: string[];
  modifications: TemplateModification[];
  costImpact: number;
}

export interface TemplateModification {
  element: string;
  type: 'ADD' | 'REMOVE' | 'MODIFY' | 'REPLACE';
  specification: any;
  costImpact: number;
}

export interface CustomizationOption {
  id: string;
  name: string;
  category: 'LAYOUT' | 'FURNITURE' | 'TECHNOLOGY' | 'FINISHES' | 'LIGHTING';
  type: 'SELECT' | 'RANGE' | 'BOOLEAN' | 'TEXT';
  options: any[];
  defaultValue: any;
  costImpact: (value: any) => number;
  complianceImpact?: (value: any) => ComplianceRequirement[];
}

export interface ApprovalWorkflow {
  steps: ApprovalStep[];
  autoApprovalRules: AutoApprovalRule[];
  escalationRules: EscalationRule[];
}

export interface ApprovalStep {
  stepId: string;
  name: string;
  approverRole: string;
  approverIds?: string[];
  conditions: any[];
  timeLimit: number; // hours
  isRequired: boolean;
  canDelegate: boolean;
}

export interface AutoApprovalRule {
  condition: string;
  maxCost: number;
  maxArea: number;
  applicableStandards: string[];
}

export interface EscalationRule {
  stepId: string;
  timeLimit: number; // hours
  escalateToRole: string;
  escalateToIds?: string[];
  notificationMethod: 'EMAIL' | 'SMS' | 'SYSTEM';
}

export class SpaceStandardsService {
  /**
   * Create space standard with comprehensive specifications
   */
  async createSpaceStandard(standardData: Omit<SpaceStandard, 'id'>): Promise<SpaceStandard> {
    try {
      // Validate specifications
      this.validateSpaceSpecifications(standardData.specifications);
      
      // Validate compliance requirements
      await this.validateComplianceRequirements(standardData.complianceRequirements);
      
      // Calculate cost estimates if not provided
      if (!standardData.costEstimates || standardData.costEstimates.length === 0) {
        standardData.costEstimates = await this.generateCostEstimates(standardData.specifications);
      }

      const standard = await prisma.spaceStandard.create({
        data: {
          name: standardData.name,
          category: standardData.category,
          type: standardData.type,
          description: standardData.description,
          specifications: standardData.specifications as any,
          complianceRequirements: standardData.complianceRequirements as any,
          costEstimates: standardData.costEstimates as any,
          templateConfiguration: standardData.templateConfiguration as any,
          isActive: standardData.isActive,
          version: standardData.version,
          organizationId: standardData.organizationId,
          createdAt: new Date(),
        },
      });

      logger.info('Space standard created', {
        standardId: standard.id,
        name: standardData.name,
        category: standardData.category,
      });

      return standard as SpaceStandard;
    } catch (error) {
      logger.error('Failed to create space standard', error);
      throw error;
    }
  }

  /**
   * Get space standards with filtering and search
   */
  async getSpaceStandards(
    organizationId: string,
    filters: {
      category?: string;
      type?: string;
      search?: string;
      includeInactive?: boolean;
    } = {}
  ): Promise<SpaceStandard[]> {
    try {
      const { category, type, search, includeInactive = false } = filters;

      const whereClause: any = {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(category && { category }),
        ...(type && { type }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { type: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const standards = await prisma.spaceStandard.findMany({
        where: whereClause,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      return standards as SpaceStandard[];
    } catch (error) {
      logger.error('Failed to get space standards', error);
      throw error;
    }
  }

  /**
   * Generate space configuration from standard and requirements
   */
  async generateSpaceConfiguration(
    standardId: string,
    requirements: {
      capacity: number;
      area?: number;
      specialRequirements?: string[];
      budget?: number;
      timeline?: number; // days
      customizations?: { [key: string]: any };
    }
  ): Promise<{
    configuration: any;
    costEstimate: number;
    complianceChecklist: ComplianceRequirement[];
    implementationPlan: any;
    recommendations: string[];
  }> {
    try {
      const standard = await prisma.spaceStandard.findUnique({
        where: { id: standardId },
      });

      if (!standard) {
        throw new Error('Space standard not found');
      }

      const standardData = standard as unknown as SpaceStandard;

      // Generate configuration based on standard and requirements
      const configuration = this.buildSpaceConfiguration(standardData, requirements);
      
      // Calculate cost estimate
      const costEstimate = this.calculateConfigurationCost(configuration, standardData.costEstimates);
      
      // Generate compliance checklist
      const complianceChecklist = this.buildComplianceChecklist(
        standardData.complianceRequirements,
        requirements
      );
      
      // Create implementation plan
      const implementationPlan = this.createImplementationPlan(
        configuration,
        costEstimate,
        requirements.timeline
      );
      
      // Generate recommendations
      const recommendations = this.generateConfigurationRecommendations(
        configuration,
        requirements,
        standardData
      );

      return {
        configuration,
        costEstimate,
        complianceChecklist,
        implementationPlan,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to generate space configuration', error);
      throw error;
    }
  }

  /**
   * Validate space configuration against standards and compliance
   */
  async validateSpaceConfiguration(
    configuration: any,
    standardId?: string
  ): Promise<{
    isValid: boolean;
    violations: any[];
    warnings: any[];
    recommendations: string[];
    complianceScore: number;
  }> {
    try {
      const violations: any[] = [];
      const warnings: any[] = [];
      const recommendations: string[] = [];

      // Load applicable standards
      let standard: SpaceStandard | null = null;
      if (standardId) {
        const standardRecord = await prisma.spaceStandard.findUnique({
          where: { id: standardId },
        });
        standard = standardRecord as unknown as SpaceStandard;
      }

      // Validate against space specifications
      if (standard) {
        const specViolations = this.validateAgainstSpecifications(configuration, standard.specifications);
        violations.push(...specViolations);
      }

      // Validate compliance requirements
      const complianceViolations = await this.validateComplianceCompliance(configuration);
      violations.push(...complianceViolations);

      // Validate accessibility requirements
      const accessibilityWarnings = this.validateAccessibility(configuration);
      warnings.push(...accessibilityWarnings);

      // Validate building codes
      const codeViolations = await this.validateBuildingCodes(configuration);
      violations.push(...codeViolations);

      // Calculate compliance score
      const totalChecks = violations.length + warnings.length + 10; // Base checks
      const issues = violations.length + (warnings.length * 0.5);
      const complianceScore = Math.max(0, (totalChecks - issues) / totalChecks * 100);

      // Generate recommendations
      if (violations.length > 0) {
        recommendations.push('Address all violations before proceeding with implementation');
      }
      if (warnings.length > 0) {
        recommendations.push('Review warnings and consider improvements');
      }
      if (complianceScore < 85) {
        recommendations.push('Consider design improvements to achieve higher compliance score');
      }

      const isValid = violations.length === 0;

      logger.info('Space configuration validated', {
        isValid,
        violations: violations.length,
        warnings: warnings.length,
        complianceScore,
      });

      return {
        isValid,
        violations,
        warnings,
        recommendations,
        complianceScore,
      };
    } catch (error) {
      logger.error('Failed to validate space configuration', error);
      throw error;
    }
  }

  /**
   * Generate space planning templates
   */
  async generatePlanningTemplates(
    organizationId: string,
    parameters: {
      spaceTypes: string[];
      totalArea: number;
      expectedOccupancy: number;
      designPriorities: string[];
      constraints: any;
    }
  ): Promise<{
    templates: any[];
    recommendations: any[];
    costComparison: any[];
  }> {
    try {
      // Get applicable standards
      const standards = await this.getSpaceStandards(organizationId, {
        type: parameters.spaceTypes.join('|'),
      });

      const templates: any[] = [];
      const recommendations: any[] = [];
      const costComparison: any[] = [];

      // Generate template variations
      for (const standard of standards) {
        const standardData = standard as unknown as SpaceStandard;
        
        // Generate multiple template variations
        const variations = this.generateTemplateVariations(standardData, parameters);
        
        for (const variation of variations) {
          const template = {
            id: `TEMPLATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            standardId: standard.id,
            standardName: standard.name,
            variation: variation.name,
            configuration: variation.configuration,
            estimatedCost: variation.cost,
            complianceScore: variation.complianceScore,
            efficiencyScore: variation.efficiencyScore,
            sustainability: variation.sustainability,
          };

          templates.push(template);
          
          // Add to cost comparison
          costComparison.push({
            templateId: template.id,
            name: `${standard.name} - ${variation.name}`,
            costPerSqFt: variation.cost / parameters.totalArea,
            totalCost: variation.cost,
            roi: variation.roi,
          });
        }
      }

      // Generate recommendations
      recommendations.push({
        type: 'COST_OPTIMIZATION',
        title: 'Most Cost-Effective Template',
        templateId: costComparison.reduce((min, curr) => 
          curr.costPerSqFt < min.costPerSqFt ? curr : min
        ).templateId,
      });

      recommendations.push({
        type: 'EFFICIENCY',
        title: 'Highest Efficiency Template',
        templateId: templates.reduce((max, curr) => 
          curr.efficiencyScore > max.efficiencyScore ? curr : max
        ).id,
      });

      logger.info('Planning templates generated', {
        organizationId,
        templateCount: templates.length,
        standardsUsed: standards.length,
      });

      return {
        templates,
        recommendations,
        costComparison,
      };
    } catch (error) {
      logger.error('Failed to generate planning templates', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateSpaceSpecifications(specs: SpaceSpecification): void {
    if (specs.minimumArea >= specs.maximumArea) {
      throw new Error('Minimum area must be less than maximum area');
    }
    if (specs.minimumCapacity >= specs.maximumCapacity) {
      throw new Error('Minimum capacity must be less than maximum capacity');
    }
    if (specs.recommendedArea < specs.minimumArea || specs.recommendedArea > specs.maximumArea) {
      throw new Error('Recommended area must be within min/max range');
    }
  }

  private async validateComplianceRequirements(requirements: ComplianceRequirement[]): Promise<void> {
    const validStandards = ['OSHA', 'ADA', 'LEED', 'BOMA', 'IBC', 'NFPA', 'ASHRAE'];
    
    for (const req of requirements) {
      if (!validStandards.includes(req.standard)) {
        logger.warn('Unknown compliance standard', { standard: req.standard });
      }
    }
  }

  private async generateCostEstimates(specs: SpaceSpecification): Promise<CostEstimate[]> {
    const estimates: CostEstimate[] = [];

    // Construction costs
    estimates.push({
      category: 'CONSTRUCTION',
      description: 'Base construction and fit-out',
      costPerSqFt: this.calculateConstructionCost(specs),
      fixedCost: 5000,
      variableCost: 0,
      laborHours: specs.recommendedArea * 2.5,
      materialCost: specs.recommendedArea * 45,
      currency: 'USD',
      accuracy: 'BUDGET',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    // Furniture costs
    estimates.push({
      category: 'FURNITURE',
      description: 'Standard furniture package',
      costPerSqFt: specs.furnitureRequirements.reduce((sum, f) => sum + (f.costPerUnit * f.quantity), 0) / specs.recommendedArea,
      fixedCost: 0,
      variableCost: 0,
      laborHours: specs.recommendedArea * 0.5,
      materialCost: 0,
      currency: 'USD',
      accuracy: 'BUDGET',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    // Technology costs
    estimates.push({
      category: 'TECHNOLOGY',
      description: 'Technology infrastructure',
      costPerSqFt: specs.technologyRequirements.reduce((sum, t) => sum + t.costFactor, 0),
      fixedCost: 2500,
      variableCost: 0,
      laborHours: 16,
      materialCost: 0,
      currency: 'USD',
      accuracy: 'BUDGET',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    return estimates;
  }

  private calculateConstructionCost(specs: SpaceSpecification): number {
    let baseCost = 85; // Base cost per sq ft

    // Adjust for ceiling height
    if (specs.ceilingHeight > 9) {
      baseCost += (specs.ceilingHeight - 9) * 8;
    }

    // Adjust for ventilation requirements
    if (specs.ventilationRequirements.airChangesPerHour > 6) {
      baseCost += 15;
    }

    // Adjust for acoustic requirements
    if (specs.acousticRequirements.maxNoiseLevel < 45) {
      baseCost += 20;
    }

    // Adjust for accessibility features
    baseCost += specs.accessibilityFeatures.filter(f => f.isRequired).length * 5;

    return baseCost;
  }

  private buildSpaceConfiguration(standard: SpaceStandard, requirements: any): any {
    const config = {
      standardId: standard.id,
      standardName: standard.name,
      category: standard.category,
      type: standard.type,
      targetCapacity: requirements.capacity,
      targetArea: requirements.area || standard.specifications.recommendedArea,
      specifications: { ...standard.specifications },
      customizations: requirements.customizations || {},
      layout: standard.templateConfiguration.layout,
      compliance: standard.complianceRequirements,
    };

    // Apply customizations
    if (requirements.customizations) {
      for (const [key, value] of Object.entries(requirements.customizations)) {
        const option = standard.templateConfiguration.customizationOptions.find(o => o.id === key);
        if (option) {
          // Apply customization logic
          this.applyCustomization(config, option, value);
        }
      }
    }

    return config;
  }

  private applyCustomization(config: any, option: CustomizationOption, value: any): void {
    switch (option.category) {
      case 'LAYOUT':
        if (option.id === 'open_office_percentage') {
          config.layout.openOfficePercentage = value;
        }
        break;
      case 'FURNITURE':
        if (option.id === 'furniture_grade') {
          config.specifications.furnitureGrade = value;
        }
        break;
      case 'TECHNOLOGY':
        if (option.id === 'av_level') {
          config.specifications.avLevel = value;
        }
        break;
    }
  }

  private calculateConfigurationCost(configuration: any, estimates: CostEstimate[]): number {
    let totalCost = 0;

    for (const estimate of estimates) {
      const categoryCost = estimate.costPerSqFt * configuration.targetArea + estimate.fixedCost;
      totalCost += categoryCost;
    }

    // Apply customization cost impacts
    if (configuration.customizations) {
      // Add customization costs (simplified)
      totalCost *= 1.1; // 10% increase for customizations
    }

    return Math.round(totalCost);
  }

  private buildComplianceChecklist(
    requirements: ComplianceRequirement[],
    spaceRequirements: any
  ): ComplianceRequirement[] {
    return requirements.filter(req => {
      // Filter based on space requirements
      if (req.severity === 'MANDATORY') {return true;}
      if (spaceRequirements.specialRequirements?.includes(req.standard)) {return true;}
      return req.severity === 'RECOMMENDED';
    });
  }

  private createImplementationPlan(configuration: any, cost: number, timeline?: number): any {
    const phases = [
      { name: 'Design & Approval', duration: Math.ceil((timeline || 60) * 0.2), cost: cost * 0.05 },
      { name: 'Permits & Preparation', duration: Math.ceil((timeline || 60) * 0.15), cost: cost * 0.1 },
      { name: 'Construction', duration: Math.ceil((timeline || 60) * 0.5), cost: cost * 0.7 },
      { name: 'Furniture & Technology', duration: Math.ceil((timeline || 60) * 0.1), cost: cost * 0.1 },
      { name: 'Final Inspection & Occupancy', duration: Math.ceil((timeline || 60) * 0.05), cost: cost * 0.05 },
    ];

    return {
      totalDuration: timeline || 60,
      totalCost: cost,
      phases,
      criticalPath: ['Design & Approval', 'Permits & Preparation', 'Construction'],
      risks: this.identifyImplementationRisks(configuration, timeline),
    };
  }

  private identifyImplementationRisks(configuration: any, timeline?: number): any[] {
    const risks = [];

    if ((timeline || 60) < 45) {
      risks.push({
        type: 'SCHEDULE',
        severity: 'HIGH',
        description: 'Aggressive timeline may impact quality',
        mitigation: 'Consider phased approach or extended timeline',
      });
    }

    if (configuration.specifications.accessibilityFeatures.some((f: any) => f.isRequired)) {
      risks.push({
        type: 'COMPLIANCE',
        severity: 'MEDIUM',
        description: 'ADA compliance requirements need careful validation',
        mitigation: 'Engage ADA compliance consultant early',
      });
    }

    return risks;
  }

  private generateConfigurationRecommendations(
    configuration: any,
    requirements: any,
    standard: SpaceStandard
  ): string[] {
    const recommendations: string[] = [];

    if (configuration.targetArea > standard.specifications.recommendedArea * 1.2) {
      recommendations.push('Consider if the large area is necessary - may be over-sized for requirements');
    }

    if (requirements.budget && requirements.budget < this.calculateConfigurationCost(configuration, standard.costEstimates)) {
      recommendations.push('Current configuration exceeds budget - consider reducing customizations');
    }

    if (!requirements.customizations || Object.keys(requirements.customizations).length === 0) {
      recommendations.push('Consider customizations to better meet specific needs');
    }

    return recommendations;
  }

  private validateAgainstSpecifications(configuration: any, specs: SpaceSpecification): any[] {
    const violations: any[] = [];

    if (configuration.targetArea < specs.minimumArea) {
      violations.push({
        type: 'AREA_TOO_SMALL',
        severity: 'HIGH',
        description: `Area ${configuration.targetArea} sq ft is below minimum ${specs.minimumArea} sq ft`,
      });
    }

    if (configuration.targetCapacity > specs.maximumCapacity) {
      violations.push({
        type: 'CAPACITY_EXCEEDED',
        severity: 'HIGH',
        description: `Capacity ${configuration.targetCapacity} exceeds maximum ${specs.maximumCapacity}`,
      });
    }

    return violations;
  }

  private async validateComplianceCompliance(configuration: any): Promise<any[]> {
    const violations: any[] = [];

    // Simulate compliance validation
    if (configuration.targetArea > 1000 && !configuration.specifications.accessibilityFeatures.some((f: any) => f.type === 'ADA_ENTRANCE')) {
      violations.push({
        type: 'ADA_COMPLIANCE',
        severity: 'HIGH',
        description: 'ADA accessible entrance required for spaces over 1000 sq ft',
      });
    }

    return violations;
  }

  private validateAccessibility(configuration: any): any[] {
    const warnings: any[] = [];

    if (configuration.layout && !configuration.layout.circulation.some((c: any) => c.accessibility)) {
      warnings.push({
        type: 'ACCESSIBILITY',
        severity: 'MEDIUM',
        description: 'No accessible circulation paths identified',
      });
    }

    return warnings;
  }

  private async validateBuildingCodes(configuration: any): Promise<any[]> {
    const violations: any[] = [];

    // Simulate building code validation
    if (configuration.targetCapacity > 50 && !configuration.layout.zones.some((z: any) => z.type === 'EMERGENCY')) {
      violations.push({
        type: 'BUILDING_CODE',
        severity: 'HIGH',
        description: 'Emergency egress requirements not met for high occupancy spaces',
      });
    }

    return violations;
  }

  private generateTemplateVariations(standard: SpaceStandard, parameters: any): any[] {
    const variations = [];

    // Standard configuration
    variations.push({
      name: 'Standard',
      configuration: this.buildSpaceConfiguration(standard, parameters),
      cost: this.calculateConfigurationCost(standard.specifications as any, standard.costEstimates),
      complianceScore: 95,
      efficiencyScore: 80,
      sustainability: 75,
      roi: 1.2,
    });

    // High-efficiency variation
    variations.push({
      name: 'High Efficiency',
      configuration: this.buildSpaceConfiguration(standard, { ...parameters, efficiency: 'HIGH' }),
      cost: this.calculateConfigurationCost(standard.specifications as any, standard.costEstimates) * 1.15,
      complianceScore: 98,
      efficiencyScore: 95,
      sustainability: 85,
      roi: 1.5,
    });

    // Budget variation
    variations.push({
      name: 'Budget',
      configuration: this.buildSpaceConfiguration(standard, { ...parameters, grade: 'BUDGET' }),
      cost: this.calculateConfigurationCost(standard.specifications as any, standard.costEstimates) * 0.8,
      complianceScore: 88,
      efficiencyScore: 70,
      sustainability: 65,
      roi: 1.0,
    });

    return variations;
  }
}