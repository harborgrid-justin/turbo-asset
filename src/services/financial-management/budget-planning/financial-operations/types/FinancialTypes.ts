/**
 * Financial Management Types - Core financial and budget planning types
 * 
 * Part of the Financial Management domain within Turbo Asset IWMS
 */

// Budget and Forecast Types
export interface BudgetCreationData {
  organizationId: string;
  propertyId?: string;
  budgetName: string;
  budgetType: 'OPERATING' | 'CAPITAL' | 'CASH_FLOW' | 'REVENUE' | 'EXPENSE' | 'CONSOLIDATED';
  budgetPeriod: string; // YYYY for annual, YYYY-QQ for quarterly
  fiscalYear: number;
  effectiveFrom: Date;
  effectiveTo: Date;
  assumptions?: any;
  lineItems: BudgetLineItem[];
}

export interface BudgetLineItem {
  category: string;
  subCategory?: string;
  description: string;
  annualAmount: number;
  q1Amount?: number;
  q2Amount?: number;
  q3Amount?: number;
  q4Amount?: number;
  monthlyAmounts?: number[];
  calculationMethod?: string;
  unitRate?: number;
  units?: number;
  escalationRate?: number;
}

export interface ForecastCreationData {
  budgetId?: string;
  forecastName: string;
  forecastType: 'REVENUE' | 'EXPENSE' | 'CASH_FLOW' | 'OCCUPANCY' | 'MARKET_RENT';
  forecastPeriod: string; // YYYY-MM or YYYY-QQ format
  forecastAmount: number;
  confidence?: number; // 0-1
  budgetAmount?: number;
  forecastMethod: 'HISTORICAL' | 'TREND_ANALYSIS' | 'REGRESSION' | 'MOVING_AVERAGE' | 'SEASONAL' | 'EXPERT_JUDGMENT' | 'MONTE_CARLO';
  dataPoints?: any[];
  assumptions?: any;
  periodStart: Date;
  periodEnd: Date;
}

export interface BudgetSummary {
  totalBudgets: number;
  totalBudgetAmount: number;
  approvedBudgets: number;
  pendingApprovals: number;
  varianceAmount: number;
  variancePercent: number;
  actualSpent: number;
  remainingBudget: number;
}

// Chargeback Types
export interface ChargebackRule {
  id: string;
  name: string;
  organizationId: string;
  ruleType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'USAGE_BASED' | 'HEADCOUNT' | 'AREA_BASED' | 'CUSTOM';
  isActive: boolean;
  effectiveDate: Date;
  expirationDate?: Date;
  costCategories: string[];
  allocationMethod: AllocationMethod;
  recipients: ChargebackRecipient[];
  conditions?: ChargebackCondition[];
}

export interface AllocationMethod {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'USAGE_BASED' | 'HEADCOUNT' | 'AREA_BASED';
  parameters: Record<string, any>;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'REAL_TIME';
}

export interface ChargebackRecipient {
  recipientId: string;
  recipientType: 'DEPARTMENT' | 'COST_CENTER' | 'PROJECT' | 'PROPERTY' | 'TENANT';
  allocationPercent?: number;
  fixedAmount?: number;
  metadata?: Record<string, any>;
}

export interface ChargebackCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IN' | 'BETWEEN';
  value: any;
}

export interface ChargebackTransaction {
  id: string;
  ruleId: string;
  sourceTransactionId?: string;
  amount: number;
  currency: string;
  transactionDate: Date;
  periodStart: Date;
  periodEnd: Date;
  recipients: ChargebackAllocation[];
  status: 'PENDING' | 'PROCESSED' | 'POSTED' | 'FAILED' | 'CANCELLED';
  metadata?: Record<string, any>;
}

export interface ChargebackAllocation {
  recipientId: string;
  recipientType: string;
  allocatedAmount: number;
  allocationPercent: number;
  status: 'PENDING' | 'POSTED' | 'FAILED';
  postingDate?: Date;
  glAccount?: string;
}

// Financial Consolidation Types
export interface ConsolidationHierarchy {
  id: string;
  name: string;
  organizationId: string;
  hierarchyType: 'LEGAL' | 'OPERATIONAL' | 'REPORTING' | 'COST_CENTER';
  rootNodeId: string;
  isActive: boolean;
  effectiveDate: Date;
  nodes: ConsolidationNode[];
}

export interface ConsolidationNode {
  id: string;
  name: string;
  nodeType: 'ENTITY' | 'DIVISION' | 'DEPARTMENT' | 'COST_CENTER' | 'PROJECT' | 'PROPERTY';
  parentId?: string;
  level: number;
  consolidationRules: ConsolidationRule[];
  financialData?: Record<string, any>;
}

export interface ConsolidationRule {
  id: string;
  ruleType: 'ELIMINATION' | 'ADJUSTMENT' | 'RECLASSIFICATION' | 'CURRENCY_TRANSLATION' | 'INTERCOMPANY';
  description: string;
  isActive: boolean;
  conditions: ConsolidationCondition[];
  actions: ConsolidationAction[];
}

export interface ConsolidationCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IN';
  value: any;
}

export interface ConsolidationAction {
  actionType: 'ELIMINATE' | 'ADJUST' | 'RECLASSIFY' | 'TRANSLATE' | 'AGGREGATE';
  targetAccount: string;
  amount?: number;
  formula?: string;
  parameters?: Record<string, any>;
}

export interface FinancialStatement {
  id: string;
  statementType: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'EQUITY' | 'TRIAL_BALANCE';
  organizationId: string;
  entityId?: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED';
  lineItems: FinancialLineItem[];
  consolidationLevel: 'ENTITY' | 'DIVISION' | 'CONSOLIDATED';
}

export interface FinancialLineItem {
  id: string;
  accountCode: string;
  accountName: string;
  category: string;
  subCategory?: string;
  amount: number;
  previousPeriodAmount?: number;
  budgetAmount?: number;
  variance?: number;
  variancePercent?: number;
  notes?: string[];
}

// General financial metrics and analytics
export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  operatingMargin: number;
  ebitda: number;
  cashFlow: number;
  budgetVariance: number;
  forecastAccuracy: number;
  costPerUnit: Record<string, number>;
  revenuePerUnit: Record<string, number>;
}

export interface FinancialAnalytics {
  period: string;
  metrics: FinancialMetrics;
  trends: {
    revenueGrowth: number;
    expenseGrowth: number;
    marginTrend: number;
    cashFlowTrend: number;
  };
  comparisons: {
    previousPeriod: FinancialMetrics;
    budget: FinancialMetrics;
    forecast: FinancialMetrics;
  };
  insights: FinancialInsight[];
}

export interface FinancialInsight {
  type: 'VARIANCE' | 'TREND' | 'ANOMALY' | 'OPPORTUNITY' | 'RISK';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation?: string;
  metadata?: Record<string, any>;
}