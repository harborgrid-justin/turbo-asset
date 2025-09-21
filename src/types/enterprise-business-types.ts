/**
 * Enterprise Business Logic Types
 * Comprehensive type definitions for enterprise-grade operations
 */

// Core Business Types
export interface BusinessMetrics {
  readonly totalFeatures: number;
  readonly activeFeatures: number;
  readonly totalOperations: number;
  readonly successfulOperations: number;
  readonly failedOperations: number;
  readonly averageResponseTime: number;
  readonly uptime: number;
}

// Quality Control Types
export interface QualityProgram {
  readonly inspectionSchedule: string;
  readonly checklistCompliance: number;
  readonly defectRate: number;
  readonly reworkRequired: number;
}

export interface AuditResult {
  readonly date: Date;
  readonly auditor: string;
  readonly score: number;
  readonly findings: readonly string[];
  readonly correctiveActions: readonly string[];
}

export interface QualityControlsResponse {
  readonly qualityProgram: QualityProgram;
  readonly auditResults: readonly AuditResult[];
  readonly continuousImprovement: readonly string[];
}

// Space Optimization Types
export interface SpaceRecommendation {
  readonly area: string;
  readonly issue: string;
  readonly recommendation: string;
  readonly expectedImprovement: string;
}

export interface ImplementationPlan {
  readonly quickWins: readonly string[];
  readonly mediumTerm: readonly string[];
  readonly longTerm: readonly string[];
}

export interface SpaceOptimizationResponse {
  readonly optimizationScore: number;
  readonly recommendations: readonly SpaceRecommendation[];
  readonly implementationPlan: ImplementationPlan;
  readonly budgetEstimate: number;
}

// Employee Feedback Types
export interface CategoryRatings {
  readonly moveExecution: number;
  readonly newWorkspace: number;
  readonly communication: number;
  readonly support: number;
  readonly technology: number;
}

export interface EmployeeFeedbackResponse {
  readonly responseRate: number;
  readonly averageSatisfaction: number;
  readonly categoryRatings: CategoryRatings;
  readonly commonFeedback: readonly string[];
  readonly actionItems: readonly string[];
  readonly successIndicators: readonly string[];
}

// Lessons Learned Types
export interface LessonsLearnedResponse {
  readonly successFactors: readonly string[];
  readonly improvementOpportunities: readonly string[];
  readonly bestPractices: readonly string[];
  readonly recommendations: readonly string[];
}

// Financial Types
export interface ExchangeRates {
  readonly [currencyPair: string]: number;
}

export interface ConsolidationAdjustment {
  readonly type: string;
  readonly amount: number;
}

export interface ConsolidatedPosition {
  readonly totalAssets: number;
  readonly totalLiabilities: number;
  readonly shareholdersEquity: number;
  readonly netIncome: number;
}

// Space Utilization Types
export interface SpaceUtilizationInfo {
  readonly spaceId: string;
  readonly utilizationRate: number;
  readonly area: number;
  readonly cost: number;
}

export interface UtilizationTrend {
  readonly weeklyTrend: 'INCREASING' | 'DECREASING';
  readonly monthlyTrend: 'STABLE' | 'VOLATILE';
  readonly seasonalPattern: string;
  readonly forecastAccuracy: number;
}

export interface OptimizationOpportunity {
  readonly opportunity: string;
  readonly potentialSavings: number;
}

// Project ID branded type for type safety
export type ProjectId = string & { readonly __brand: 'ProjectId' };

// Helper function to create ProjectId
export function createProjectId(id: string): ProjectId {
  return id as ProjectId;
}