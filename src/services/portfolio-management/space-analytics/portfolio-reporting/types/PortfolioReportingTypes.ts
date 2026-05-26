/**
 * Portfolio Reporting Types - Type definitions for portfolio reporting services
 * Part of the Portfolio Management domain within Turbo Asset IWMS
 */

// Core portfolio query interfaces
export interface PortfolioQuery {
  organizationId: string;
  includeInactive?: boolean;
  propertyIds?: string[];
  buildingIds?: string[];
  startDate?: Date;
  endDate?: Date;
  filters?: PortfolioFilters;
}

export interface PortfolioFilters {
  propertyTypes?: string[];
  locations?: string[];
  valueRange?: {
    min: number;
    max: number;
  };
  areaRange?: {
    min: number;
    max: number;
  };
  occupancyRange?: {
    min: number;
    max: number;
  };
  customFilters?: Record<string, any>;
}

// Dashboard and summary interfaces
export interface PortfolioDashboard {
  summary: PortfolioSummary;
  spaceMetrics: SpaceMetrics;
  financialMetrics: FinancialMetrics;
  utilizationTrends: any[];
  recentActivity: RecentActivity[];
  alerts: PortfolioAlert[];
  performanceIndicators: PerformanceIndicators;
  metadata: DashboardMetadata;
}

export interface PortfolioSummary {
  totalProperties: number;
  totalBuildings: number;
  totalFloors: number;
  totalSpaces: number;
  activeLeases: number;
  totalArea: number;
  occupiedSpaces: number;
  occupancyRate: number;
  averageSpacesPerBuilding: number;
  averageAreaPerProperty: number;
  utilizationRate: number;
  totalValue: number;
}

export interface SpaceMetrics {
  totalSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  occupancyRate: number;
  totalArea: number;
  occupiedArea: number;
  availableArea: number;
  utilizationRate: number;
  averageCapacity: number;
  spaceTypes: Record<string, number>;
}

export interface FinancialMetrics {
  totalValue: number;
  acquisitionCost: number;
  appreciationValue: number;
  operatingCosts: number;
  revenue: number;
  netOperatingIncome: number;
  costPerSqFt: number;
  revenuePerSqFt: number;
  grossMargin: number;
  capRate: number;
  cashOnCashReturn: number;
  roi: number;
}

export interface DashboardMetadata {
  generatedAt: Date;
  executionTimeMs: number;
  organizationId: string;
  includeInactive: boolean;
  dataAsOf?: Date;
  refreshRate?: number;
}

// Performance and metrics interfaces
export interface PerformanceIndicators {
  occupancy: PerformanceIndicator;
  revenue: PerformanceIndicator;
  costs: PerformanceIndicator;
  utilization: PerformanceIndicator;
  sustainability: SustainabilityMetrics;
  compliance: ComplianceStatus;
  overallScore: number;
}

export interface PerformanceIndicator {
  current: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  status: 'positive' | 'negative' | 'stable';
  benchmark?: number;
  target?: number;
}

export interface SustainabilityMetrics {
  energyIntensity: number;
  carbonFootprint: number;
  waterUsage: number;
  wasteReduction: number;
  renewableEnergyPercentage: number;
  certifications: string[];
  esgScore: number;
}

export interface ComplianceStatus {
  overallScore: number;
  categories: ComplianceCategory[];
  violations: ComplianceViolation[];
  upcomingDeadlines: ComplianceDeadline[];
}

export interface ComplianceCategory {
  name: string;
  score: number;
  status: 'compliant' | 'at_risk' | 'non_compliant';
  lastAuditDate: Date;
  nextAuditDate: Date;
}

export interface ComplianceViolation {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  identifiedDate: Date;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface ComplianceDeadline {
  id: string;
  title: string;
  category: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'upcoming' | 'overdue' | 'completed';
}

// Alert and notification interfaces
export interface PortfolioAlert {
  id: string;
  organizationId: string;
  category: AlertCategory;
  priority: AlertPriority;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  status: AlertStatus;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  metadata: Record<string, any>;
  actionRequired: boolean;
  autoResolve: boolean;
  notes?: string;
}

export type AlertCategory = 'LEASE_EXPIRATION' | 'OCCUPANCY' | 'FINANCIAL' | 'MAINTENANCE' | 'COMPLIANCE' | 'PERFORMANCE' | 'RISK' | 'SYSTEM';
export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

// Report interfaces
export interface PortfolioReport {
  id: string;
  organizationId: string;
  reportType: ReportType;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  period: ReportPeriod;
  sections: ReportSection[];
  summary: ExecutiveSummary;
  metadata: ReportMetadata;
  filters: Record<string, any>;
  customizations: Record<string, any>;
  filePath?: string;
}

export type ReportType = 'PORTFOLIO_OVERVIEW' | 'FINANCIAL_SUMMARY' | 'LEASE_EXPIRATION' | 'OCCUPANCY_ANALYTICS' | 'MAINTENANCE_SUMMARY' | 'EXECUTIVE_DASHBOARD';
export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'HTML' | 'JSON';

export interface ReportPeriod {
  start?: Date;
  end?: Date;
  type?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
}

export interface ReportSection {
  id: string;
  title: string;
  content: any;
  pageCount?: number;
  charts?: ChartData[];
  tables?: TableData[];
  insights?: string[];
}

export interface ExecutiveSummary {
  keyFindings: string[];
  criticalActions: string[];
  performanceHighlights: string[];
  riskAlerts: string[];
  recommendations: string[];
}

export interface ReportMetadata {
  version: string;
  format: ReportFormat;
  totalPages: number;
  executionTimeMs: number;
  dataAsOf: Date;
  template?: string;
  customizations?: Record<string, any>;
}

// Chart and visualization interfaces
export interface ChartData {
  id: string;
  type: ChartType;
  title: string;
  data: any;
  options?: ChartOptions;
  insights?: string[];
}

export type ChartType = 'LINE' | 'BAR' | 'PIE' | 'DOUGHNUT' | 'AREA' | 'SCATTER' | 'GAUGE' | 'HEATMAP' | 'TREEMAP';

export interface ChartOptions {
  width?: number;
  height?: number;
  colors?: string[];
  legend?: boolean;
  grid?: boolean;
  tooltip?: boolean;
  zoom?: boolean;
  customOptions?: Record<string, any>;
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: any[][];
  summary?: TableSummary;
  formatting?: TableFormatting;
}

export interface TableSummary {
  totalRows: number;
  aggregations?: Record<string, number>;
  notes?: string[];
}

export interface TableFormatting {
  headerStyle?: Record<string, any>;
  rowStyle?: Record<string, any>;
  conditionalFormatting?: ConditionalFormatRule[];
}

export interface ConditionalFormatRule {
  column: string;
  condition: 'greater_than' | 'less_than' | 'equal_to' | 'contains';
  value: any;
  style: Record<string, any>;
}

// Activity and audit interfaces
export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export type ActivityType = 'LEASE_SIGNED' | 'SPACE_OCCUPIED' | 'SPACE_VACATED' | 'MAINTENANCE_COMPLETED' | 'ALERT_GENERATED' | 'REPORT_GENERATED' | 'USER_ACTION';

// Export and data interfaces
export interface ExportConfiguration {
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  includeCharts: boolean;
  includeImages: boolean;
  includeMetadata: boolean;
  compression: boolean;
  password?: string;
  watermark?: string;
}

// System and configuration interfaces
export interface SystemConfiguration {
  organizationId: string;
  reportingSettings: ReportingSettings;
  dashboardSettings: DashboardSettings;
  alertSettings: AlertSettings;
  exportSettings: ExportSettings;
  retentionSettings: RetentionSettings;
}

export interface ReportingSettings {
  defaultTimeframe: string;
  autoGenerateReports: boolean;
  reportRetentionDays: number;
  allowCustomReports: boolean;
  maxReportsPerUser: number;
}

export interface DashboardSettings {
  defaultLayout: string;
  refreshInterval: number;
  maxWidgets: number;
  allowCustomizations: boolean;
  cacheEnabled: boolean;
}

export interface AlertSettings {
  enableAlerting: boolean;
  alertRetentionDays: number;
  maxAlertsPerDay: number;
  escalationEnabled: boolean;
  autoResolveEnabled: boolean;
}

export interface ExportSettings {
  maxFileSize: number;
  allowedFormats: string[];
  maxExportsPerDay: number;
  exportRetentionDays: number;
  compressionEnabled: boolean;
}

export interface RetentionSettings {
  dataRetentionDays: number;
  archiveEnabled: boolean;
  compressionEnabled: boolean;
  purgeEnabled: boolean;
}

// Common enums
export enum TimeframeType {
  REAL_TIME = 'REAL_TIME',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum ComparisonType {
  PERIOD_OVER_PERIOD = 'PERIOD_OVER_PERIOD',
  YEAR_OVER_YEAR = 'YEAR_OVER_YEAR',
  BENCHMARK = 'BENCHMARK',
  TARGET = 'TARGET',
}