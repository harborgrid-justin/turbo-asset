/**
 * Advanced Operations Domain - Type Definitions
 * 
 * Comprehensive type system for workflow engines, reporting services,
 * enterprise service bus, data warehouse, and portfolio management operations.
 */

import { EventEmitter } from 'events';

// =============================================================================
// Base Context and Event Types
// =============================================================================

export interface AdvancedOperationsContext {
  organizationId: string;
  userId: string;
  permissions: string[];
  tenantId?: string;
  correlationId?: string;
}

export interface AdvancedOperationsEvent {
  type: 
    | 'WORKFLOW_STARTED' | 'WORKFLOW_COMPLETED' | 'WORKFLOW_FAILED'
    | 'REPORT_GENERATED' | 'REPORT_SCHEDULED' | 'REPORT_FAILED'
    | 'ESB_MESSAGE_PROCESSED' | 'ESB_FLOW_STARTED' | 'ESB_ERROR'
    | 'WAREHOUSE_SYNC_STARTED' | 'WAREHOUSE_SYNC_COMPLETED' | 'WAREHOUSE_ERROR'
    | 'PORTFOLIO_UPDATED' | 'PORTFOLIO_ANALYZED' | 'PORTFOLIO_ALERT';
  data: any;
  timestamp: Date;
  source: 'workflow' | 'reporting' | 'esb' | 'warehouse' | 'portfolio';
  organizationId: string;
}

// =============================================================================
// Workflow Engine Types
// =============================================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  startStep: string;
  steps: WorkflowStep[];
  variables?: Record<string, WorkflowVariable>;
  configuration?: WorkflowConfiguration;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'TASK' | 'DECISION' | 'PARALLEL' | 'SUB_PROCESS' | 'TIMER' | 'END';
  configuration: any;
  transitions: WorkflowTransition[];
  assignments?: WorkflowAssignment[];
  dueDate?: Date;
  escalationRules?: EscalationRule[];
}

export interface WorkflowTransition {
  id: string;
  targetStepId: string;
  condition?: string;
  name?: string;
}

export interface WorkflowAssignment {
  type: 'USER' | 'ROLE' | 'GROUP' | 'EXPRESSION';
  value: string;
}

export interface WorkflowVariable {
  name: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'OBJECT';
  required: boolean;
  defaultValue?: any;
}

export interface WorkflowConfiguration {
  maxExecutionTime?: number;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  notificationSettings?: {
    onStart: boolean;
    onComplete: boolean;
    onError: boolean;
    recipients: string[];
  };
}

export interface WorkflowInstanceData {
  id: string;
  definitionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  currentStep: string;
  data: Record<string, any>;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  initiatedBy: string;
  assignedTo?: string;
  startedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
}

export interface ApprovalData {
  approved: boolean;
  comments?: string;
  approvedBy: string;
  approvedAt: Date;
  signature?: string;
}

export interface EscalationRule {
  triggerAfter: number; // minutes
  escalateTo: WorkflowAssignment[];
  notifyOriginalAssignee: boolean;
  escalationMessage?: string;
}

// =============================================================================
// Reporting Service Types
// =============================================================================

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'FINANCIAL' | 'OPERATIONAL' | 'COMPLIANCE' | 'EXECUTIVE' | 'CUSTOM';
  type: 'TABULAR' | 'CHART' | 'DASHBOARD' | 'KPI' | 'EXECUTIVE';
  dataSource: ReportDataSource;
  parameters: ReportParameter[];
  layout: ReportLayout;
  scheduling?: ReportScheduleConfig;
  permissions: ReportPermissions;
  createdBy: string;
  isPublic: boolean;
}

export interface ReportDataSource {
  type: 'SQL' | 'API' | 'FILE' | 'WAREHOUSE' | 'CALCULATED';
  connectionId?: string;
  query?: string;
  endpoint?: string;
  refreshInterval?: number;
}

export interface ReportParameter {
  name: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'LIST' | 'MULTI_SELECT';
  required: boolean;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  validation?: string;
}

export interface ReportLayout {
  sections: ReportSection[];
  styling: ReportStyling;
  responsive: boolean;
}

export interface ReportSection {
  id: string;
  type: 'HEADER' | 'CONTENT' | 'FOOTER' | 'CHART' | 'TABLE' | 'KPI';
  content: any;
  position: { row: number; column: number; width?: number; height?: number };
}

export interface ReportStyling {
  theme: 'LIGHT' | 'DARK' | 'BRANDED';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    header: string;
    body: string;
    monospace: string;
  };
}

export interface ReportScheduleConfig {
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  cronPattern?: string;
  timezone: string;
  recipients: ReportRecipient[];
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON' | 'EMAIL';
  deliveryMethod: 'EMAIL' | 'SFTP' | 'API' | 'WEBHOOK';
}

export interface ReportRecipient {
  email: string;
  name: string;
  type: 'TO' | 'CC' | 'BCC';
}

export interface ReportPermissions {
  view: string[];
  edit: string[];
  schedule: string[];
  share: string[];
}

export interface ExecutiveDashboardMetrics {
  portfolioValue: {
    total: number;
    trend: { value: number; direction: 'up' | 'down' | 'neutral'; period: string };
  };
  occupancyRate: {
    current: number;
    target: number;
    trend: { value: number; direction: 'up' | 'down' | 'neutral'; period: string };
  };
  noi: {
    current: number;
    budgeted: number;
    variance: number;
    trend: { value: number; direction: 'up' | 'down' | 'neutral'; period: string };
  };
  costPerSqft: {
    current: number;
    benchmark: number;
    variance: number;
  };
  maintenanceKPIs: {
    completionRate: number;
    avgResponseTime: number;
    budgetVariance: number;
  };
  sustainabilityMetrics: {
    energyEfficiency: number;
    carbonFootprint: number;
    sustainabilityScore: number;
  };
}

export interface BenchmarkingData {
  metric: string;
  currentValue: number;
  industryAverage: number;
  percentile: number;
  trend: 'improving' | 'declining' | 'stable';
  benchmark: 'above' | 'at' | 'below';
}

// =============================================================================
// Enterprise Service Bus Types
// =============================================================================

export type ESBPatternType = 
  | 'POINT_TO_POINT'
  | 'PUBLISH_SUBSCRIBE'
  | 'REQUEST_REPLY'
  | 'MESSAGE_FILTER'
  | 'CONTENT_ROUTER'
  | 'MESSAGE_TRANSLATOR'
  | 'MESSAGE_ROUTING'
  | 'CONTENT_BASED_ROUTING'
  | 'MESSAGE_TRANSFORMATION'
  | 'SCATTER_GATHER'
  | 'AGGREGATOR'
  | 'SPLITTER'
  | 'DEAD_LETTER_QUEUE';

export interface ESBMessage {
  id: string;
  source: string;
  destination: string;
  payload: any;
  headers: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
  replyTo?: string;
  messageType: string;
  priority: number;
}

export interface IntegrationEndpoint {
  id: string;
  name: string;
  type: 'HTTP' | 'SOAP' | 'DATABASE' | 'FILE' | 'MESSAGE_QUEUE';
  configuration: any;
  isActive: boolean;
  transformationRules?: string;
}

export interface ESBFlow {
  id: string;
  name: string;
  pattern: ESBPatternType;
  sourceEndpoints: string[];
  targetEndpoints: string[];
  configuration: any;
  isActive: boolean;
  errorHandling: {
    retryPolicy: {
      maxRetries: number;
      retryDelay: number;
    };
    deadLetterQueue: string;
  };
}

export interface MessageRoute {
  id: string;
  pattern: string;
  conditions: RouteCondition[];
  targetEndpoint: string;
  transformations: MessageTransformation[];
  priority: number;
}

export interface RouteCondition {
  field: string;
  operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
  value: any;
}

export interface MessageTransformation {
  type: 'FIELD_MAPPING' | 'DATA_TYPE_CONVERSION' | 'ENRICHMENT' | 'FILTERING' | 'AGGREGATION';
  configuration: any;
}

// =============================================================================
// Data Warehouse Types
// =============================================================================

export interface DataWarehouseConnection {
  id: string;
  name: string;
  type: 'SNOWFLAKE' | 'REDSHIFT' | 'BIGQUERY' | 'DATABRICKS' | 'SYNAPSE';
  connectionString: string;
  credentials: {
    username?: string;
    password?: string;
    keyFile?: string;
    token?: string;
  };
  isActive: boolean;
  lastTested: Date;
}

export interface ETLJob {
  id: string;
  name: string;
  description?: string;
  sourceConnection: string;
  targetConnection: string;
  extractQuery: string;
  transformationRules: DataTransformation[];
  loadStrategy: 'FULL' | 'INCREMENTAL' | 'DELTA' | 'UPSERT';
  schedule: ETLSchedule;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface DataTransformation {
  type: 'MAPPING' | 'AGGREGATION' | 'FILTERING' | 'VALIDATION' | 'ENRICHMENT';
  configuration: any;
  order: number;
}

export interface ETLSchedule {
  frequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  cronPattern?: string;
  timezone: string;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface DataQualityRule {
  id: string;
  name: string;
  description?: string;
  table: string;
  column?: string;
  ruleType: 'NOT_NULL' | 'UNIQUE' | 'RANGE' | 'PATTERN' | 'CUSTOM';
  condition: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
}

export interface DataLineage {
  sourceSystem: string;
  sourceTable: string;
  sourceColumn?: string;
  targetSystem: string;
  targetTable: string;
  targetColumn?: string;
  transformations: string[];
  lastUpdated: Date;
}

// =============================================================================
// Portfolio Service Types
// =============================================================================

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  managerId: string;
  totalValue: number;
  totalArea: number;
  properties: Property[];
  strategy: PortfolioStrategy;
  kpis: PortfolioKPIs;
  benchmarks: PortfolioBenchmarks;
}

export interface Property {
  id: string;
  name: string;
  type: 'OFFICE' | 'RETAIL' | 'INDUSTRIAL' | 'MIXED_USE' | 'LAND' | 'OTHER';
  address: PropertyAddress;
  area: PropertyArea;
  financial: PropertyFinancials;
  occupancy: PropertyOccupancy;
  condition: PropertyCondition;
  sustainability: PropertySustainability;
}

export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyArea {
  totalSqft: number;
  leasableSqft: number;
  commonSqft: number;
  parkingSpaces: number;
  floors: number;
}

export interface PropertyFinancials {
  acquisitionCost: number;
  currentValue: number;
  annualRent: number;
  operatingExpenses: number;
  noi: number;
  capRate: number;
  cashFlow: number;
}

export interface PropertyOccupancy {
  totalSpaces: number;
  occupiedSpaces: number;
  occupancyRate: number;
  leases: Lease[];
  averageRent: number;
}

export interface Lease {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  sqft: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING';
}

export interface PropertyCondition {
  overallRating: number;
  lastInspection: Date;
  maintenanceBacklog: number;
  criticalIssues: number;
  plannedCapex: number;
}

export interface PropertySustainability {
  energyRating: string;
  carbonFootprint: number;
  waterUsage: number;
  wasteGeneration: number;
  sustainabilityScore: number;
}

export interface PortfolioStrategy {
  assetMix: {
    target: Record<string, number>;
    current: Record<string, number>;
  };
  geographicDistribution: {
    target: Record<string, number>;
    current: Record<string, number>;
  };
  holdPeriod: {
    shortTerm: number; // < 5 years
    mediumTerm: number; // 5-10 years
    longTerm: number; // > 10 years
  };
  returnTargets: {
    totalReturn: number;
    capitalAppreciation: number;
    income: number;
  };
}

export interface PortfolioKPIs {
  totalReturn: number;
  capitalAppreciation: number;
  incomeReturn: number;
  occupancyRate: number;
  noi: number;
  capRate: number;
  dscr: number; // Debt Service Coverage Ratio
  ltv: number; // Loan to Value
}

export interface PortfolioBenchmarks {
  industry: Record<string, number>;
  peer: Record<string, number>;
  historical: Record<string, number>;
  targets: Record<string, number>;
}

export interface PortfolioAnalysis {
  riskMetrics: {
    var: number; // Value at Risk
    sharpeRatio: number;
    beta: number;
    correlationMatrix: number[][];
  };
  performance: {
    totalReturn: number;
    riskAdjustedReturn: number;
    benchmarkComparison: number;
    attribution: {
      assetSelection: number;
      marketTiming: number;
      interaction: number;
    };
  };
  optimization: {
    recommendations: OptimizationRecommendation[];
    scenarios: ScenarioAnalysis[];
  };
}

export interface OptimizationRecommendation {
  type: 'ACQUISITION' | 'DISPOSITION' | 'RENOVATION' | 'REFINANCING' | 'REPOSITIONING';
  propertyId?: string;
  description: string;
  expectedReturn: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  investment: number;
  timeframe: string;
  confidence: number;
}

export interface ScenarioAnalysis {
  name: string;
  assumptions: Record<string, any>;
  projectedReturns: number[];
  probability: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

// =============================================================================
// Dashboard and Orchestration Types
// =============================================================================

export interface AdvancedOperationsDashboard {
  workflows: {
    active: number;
    completed: number;
    failed: number;
    averageCompletionTime: number;
    slaCompliance: number;
  };
  reporting: {
    scheduledReports: number;
    generatedToday: number;
    failureRate: number;
    averageGenerationTime: number;
    storageUsed: number;
  };
  esb: {
    messagesProcessed: number;
    activeFlows: number;
    errorRate: number;
    throughput: number;
    latency: number;
  };
  warehouse: {
    activeJobs: number;
    dataVolume: number;
    syncStatus: string;
    qualityScore: number;
    lastSyncTime: Date;
  };
  portfolio: {
    totalValue: number;
    propertiesCount: number;
    occupancyRate: number;
    noi: number;
    performanceScore: number;
  };
}

export interface HealthCheckResult {
  service: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  message?: string;
  metrics?: Record<string, any>;
  lastChecked: Date;
}

export interface ServiceMetrics {
  requests: number;
  errors: number;
  responseTime: number;
  throughput: number;
  uptime: number;
}