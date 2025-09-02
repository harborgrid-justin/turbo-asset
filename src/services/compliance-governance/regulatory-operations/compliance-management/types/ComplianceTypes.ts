/**
 * Compliance Management Types
 * 
 * Comprehensive type definitions for compliance, data governance, and emergency planning
 * within the regulatory operations domain.
 */

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'REGULATORY' | 'INTERNAL' | 'INDUSTRY' | 'SECURITY' | 'PRIVACY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  framework: ComplianceFramework;
  requirements: ComplianceRequirement[];
  applicableEntities: string[];
  isActive: boolean;
  effectiveDate: Date;
  expirationDate?: Date;
  tags: string[];
  metadata: Record<string, any>;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  acronym: string;
  description: string;
  type: 'REGULATION' | 'STANDARD' | 'GUIDELINE' | 'POLICY';
  version: string;
  jurisdiction?: string;
  industry?: string[];
  lastUpdated: Date;
  officialUrl?: string;
  requirements: FrameworkRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  controlObjective: string;
  evidence: string[];
  frequency: 'CONTINUOUS' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ON_DEMAND';
  responsible: string[];
  dependencies: string[];
  automatable: boolean;
  criticality: 'ESSENTIAL' | 'IMPORTANT' | 'RECOMMENDED';
}

export interface FrameworkRequirement {
  id: string;
  section: string;
  title: string;
  description: string;
  controlType: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE' | 'ADMINISTRATIVE';
  implementationGuidance: string;
  testingProcedures: string[];
}

export interface ComplianceAssessment {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  framework: ComplianceFramework;
  scope: AssessmentScope;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assessmentType: 'INTERNAL' | 'EXTERNAL' | 'REGULATORY' | 'CERTIFICATION';
  startDate: Date;
  endDate: Date;
  assessor: AssessorInfo;
  findings: ComplianceFinding[];
  overallScore: number;
  recommendations: string[];
  nextReviewDate: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentScope {
  entities: string[];
  locations: string[];
  systems: string[];
  processes: string[];
  timeframe: {
    start: Date;
    end: Date;
  };
  exclusions?: string[];
}

export interface AssessorInfo {
  name: string;
  organization: string;
  credentials: string[];
  contactInfo: {
    email: string;
    phone: string;
  };
  isExternal: boolean;
}

export interface ComplianceFinding {
  id: string;
  assessmentId: string;
  requirementId: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ACCEPTED_RISK';
  category: 'GAP' | 'DEFICIENCY' | 'OBSERVATION' | 'BEST_PRACTICE';
  evidence: Evidence[];
  impact: string;
  recommendation: string;
  remediation: RemediationPlan;
  assignedTo: string;
  dueDate: Date;
  closedDate?: Date;
  closureNotes?: string;
}

export interface Evidence {
  type: 'DOCUMENT' | 'SCREENSHOT' | 'LOG' | 'INTERVIEW' | 'OBSERVATION';
  description: string;
  reference: string;
  collectDate: Date;
  collector: string;
}

export interface RemediationPlan {
  actions: RemediationAction[];
  timeline: Date;
  cost: number;
  resources: string[];
  priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
  dependencies: string[];
}

export interface RemediationAction {
  id: string;
  description: string;
  responsible: string;
  dueDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  completedDate?: Date;
  notes?: string;
}

export interface DataGovernancePolicy {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: 'DATA_CLASSIFICATION' | 'DATA_RETENTION' | 'DATA_ACCESS' | 'DATA_SHARING' | 'DATA_QUALITY';
  policyDocument: string;
  version: string;
  effectiveDate: Date;
  reviewDate: Date;
  owner: string;
  approver: string;
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'DEPRECATED';
  applicableDataTypes: string[];
  controls: DataGovernanceControl[];
}

export interface DataGovernanceControl {
  id: string;
  policyId: string;
  name: string;
  description: string;
  controlType: 'TECHNICAL' | 'ADMINISTRATIVE' | 'PHYSICAL';
  implementation: string;
  testingProcedure: string;
  frequency: string;
  responsible: string;
  automated: boolean;
  effectiveness: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DataLineage {
  entityId: string;
  entityType: string;
  source: {
    system: string;
    table?: string;
    field?: string;
    lastUpdated: Date;
  };
  transformations: Array<{
    step: number;
    type: 'EXTRACT' | 'TRANSFORM' | 'LOAD' | 'VALIDATE' | 'ENRICH';
    description: string;
    timestamp: Date;
    system: string;
  }>;
  downstream: Array<{
    entityId: string;
    entityType: string;
    system: string;
    relationship: 'DIRECT' | 'DERIVED' | 'AGGREGATED';
  }>;
}

export interface DataQualityMetrics {
  entityType: string;
  entityId: string;
  measuredAt: Date;
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
  uniqueness: number;
  overallScore: number;
  issues: DataQualityIssue[];
  trendData: Array<{
    date: Date;
    metric: string;
    value: number;
  }>;
}

export interface DataQualityIssue {
  id: string;
  type: 'MISSING_DATA' | 'INVALID_FORMAT' | 'DUPLICATE' | 'INCONSISTENT' | 'OUTDATED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affectedRecords: number;
  detectedAt: Date;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED';
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface DataClassification {
  level: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'TOP_SECRET';
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  categories: string[];
  restrictions: DataRestriction[];
  retentionPeriod: number; // in days
  disposalMethod: 'DELETION' | 'ANONYMIZATION' | 'ARCHIVAL';
  jurisdictional: string[];
  complianceRequirements: string[];
}

export interface DataRestriction {
  type: 'ACCESS' | 'SHARING' | 'STORAGE' | 'TRANSMISSION' | 'PROCESSING';
  description: string;
  conditions: string[];
  exceptions: string[];
}

export interface EmergencyPlan {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: 'NATURAL_DISASTER' | 'CYBER_INCIDENT' | 'FIRE' | 'MEDICAL' | 'SECURITY' | 'BUSINESS_CONTINUITY';
  scope: EmergencyScope;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CATASTROPHIC';
  activationCriteria: string[];
  procedures: EmergencyProcedure[];
  resources: EmergencyResource[];
  contacts: EmergencyContact[];
  evacuationPlan?: EvacuationPlan;
  communicationPlan: CommunicationPlan;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
  lastTested: Date;
  nextTest: Date;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyScope {
  locations: string[];
  departments: string[];
  systems: string[];
  maxAffectedPersons: number;
  geographicArea: string;
}

export interface EmergencyProcedure {
  id: string;
  planId: string;
  sequence: number;
  title: string;
  description: string;
  responsible: string;
  timeframe: number; // in minutes
  prerequisites: string[];
  steps: ProcedureStep[];
  decisionPoints: DecisionPoint[];
  escalation?: EscalationCriteria;
}

export interface ProcedureStep {
  sequence: number;
  action: string;
  responsible: string;
  timeLimit: number; // in minutes
  verificationMethod: string;
  documentationRequired: boolean;
}

export interface DecisionPoint {
  condition: string;
  trueAction: string;
  falseAction: string;
  responsible: string;
}

export interface EscalationCriteria {
  conditions: string[];
  escalateTo: string;
  timeThreshold: number; // in minutes
  notificationMethod: 'PHONE' | 'EMAIL' | 'SMS' | 'ALERT_SYSTEM';
}

export interface EmergencyResource {
  id: string;
  type: 'PERSONNEL' | 'EQUIPMENT' | 'FACILITY' | 'SERVICE' | 'SUPPLY';
  name: string;
  description: string;
  location: string;
  quantity: number;
  unit: string;
  availability: 'ALWAYS' | 'BUSINESS_HOURS' | 'ON_CALL' | 'SEASONAL';
  contact?: string;
  alternateOptions?: string[];
  lastChecked: Date;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'UNAVAILABLE';
}

export interface EmergencyContact {
  id: string;
  planId: string;
  type: 'PRIMARY' | 'SECONDARY' | 'BACKUP' | 'EXTERNAL';
  role: string;
  name: string;
  title: string;
  organization: string;
  phone: {
    primary: string;
    mobile?: string;
    alternate?: string;
  };
  email: {
    primary: string;
    alternate?: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  availability: string;
  expertise: string[];
  isActive: boolean;
}

export interface EvacuationPlan {
  routes: EvacuationRoute[];
  assemblyPoints: AssemblyPoint[];
  specialNeeds: SpecialNeedsGroup[];
  wardenSystem: WardenInfo[];
  signaling: string[];
  disabledAccess: boolean;
}

export interface EvacuationRoute {
  id: string;
  name: string;
  startLocation: string;
  endLocation: string;
  capacity: number;
  estimatedTime: number; // in minutes
  conditions: string[];
  alternateRoute?: string;
  accessibility: 'FULL' | 'LIMITED' | 'NONE';
}

export interface AssemblyPoint {
  id: string;
  name: string;
  location: string;
  capacity: number;
  facilities: string[];
  weatherProtection: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  accessibility: 'FULL' | 'LIMITED' | 'NONE';
}

export interface SpecialNeedsGroup {
  type: 'MOBILITY_IMPAIRED' | 'HEARING_IMPAIRED' | 'VISUALLY_IMPAIRED' | 'MEDICAL_DEPENDENCY' | 'COGNITIVE_IMPAIRMENT';
  count: number;
  location: string;
  assistanceRequired: string;
  equipmentNeeded: string[];
  assignedPersonnel: string[];
}

export interface WardenInfo {
  name: string;
  title: string;
  area: string;
  responsibilities: string[];
  contact: {
    phone: string;
    radio?: string;
  };
  alternateWarden?: string;
}

export interface CommunicationPlan {
  channels: CommunicationChannel[];
  messageTemplates: MessageTemplate[];
  stakeholders: CommunicationStakeholder[];
  escalationMatrix: EscalationLevel[];
  mediaRelations?: MediaRelationsPlan;
}

export interface CommunicationChannel {
  type: 'PA_SYSTEM' | 'EMAIL' | 'SMS' | 'PHONE_TREE' | 'SOCIAL_MEDIA' | 'WEBSITE' | 'MOBILE_APP';
  priority: number;
  responsible: string;
  backupMethod: string;
  testFrequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  lastTested: Date;
}

export interface MessageTemplate {
  id: string;
  scenario: string;
  audience: 'INTERNAL' | 'EXTERNAL' | 'MEDIA' | 'REGULATORY';
  urgency: 'IMMEDIATE' | 'URGENT' | 'ROUTINE';
  template: string;
  variables: string[];
  approvalRequired: boolean;
  approver?: string;
}

export interface CommunicationStakeholder {
  type: 'EMPLOYEE' | 'CUSTOMER' | 'VENDOR' | 'REGULATORY' | 'MEDIA' | 'COMMUNITY';
  contactMethod: 'EMAIL' | 'PHONE' | 'SMS' | 'PORTAL';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  messageType: string[];
  responsible: string;
}

export interface EscalationLevel {
  level: number;
  criteria: string;
  responsible: string;
  timeframe: number; // in minutes
  authorities: string[];
  documentation: string[];
}

export interface MediaRelationsPlan {
  spokesperson: string;
  backupSpokesperson: string;
  approvedStatements: string[];
  mediaContacts: string[];
  socialMediaGuidelines: string;
  restrictedInformation: string[];
}

export interface IncidentResponse {
  id: string;
  organizationId: string;
  planId: string;
  type: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CATASTROPHIC';
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED' | 'POST_INCIDENT';
  startTime: Date;
  endTime?: Date;
  incidentCommander: string;
  affectedAreas: string[];
  affectedPersons: number;
  timeline: IncidentTimelineEntry[];
  actions: IncidentAction[];
  resources: ResourceDeployment[];
  damages: DamageAssessment[];
  lessonsLearned?: string[];
  afterActionReport?: string;
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  event: string;
  responsible: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionsTaken: string[];
}

export interface IncidentAction {
  id: string;
  sequence: number;
  action: string;
  responsible: string;
  startTime: Date;
  endTime?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  outcome?: string;
}

export interface ResourceDeployment {
  resourceId: string;
  deployedAt: Date;
  recalledAt?: Date;
  location: string;
  purpose: string;
  effectiveness: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DamageAssessment {
  category: 'PERSONNEL' | 'PROPERTY' | 'ENVIRONMENT' | 'REPUTATION' | 'FINANCIAL';
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE';
  description: string;
  estimatedCost?: number;
  actualCost?: number;
  recoveryTime?: number; // in hours
  mitigationActions: string[];
}

export interface ComplianceReport {
  id: string;
  organizationId: string;
  title: string;
  type: 'REGULATORY' | 'INTERNAL' | 'AUDIT' | 'CERTIFICATION';
  framework: string;
  reportingPeriod: {
    start: Date;
    end: Date;
  };
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SUBMITTED';
  sections: ReportSection[];
  attachments: ReportAttachment[];
  metrics: ComplianceMetrics;
  recommendations: string[];
  nextSteps: string[];
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSection {
  title: string;
  content: string;
  findings: ComplianceFinding[];
  metrics: Record<string, number>;
  charts?: ChartDefinition[];
}

export interface ReportAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
  description: string;
}

export interface ComplianceMetrics {
  overallScore: number;
  controlsImplemented: number;
  totalControls: number;
  riskScore: number;
  openFindings: number;
  closedFindings: number;
  trendData: Array<{
    period: string;
    score: number;
    findings: number;
  }>;
}

export interface ChartDefinition {
  type: 'bar' | 'line' | 'pie' | 'gauge';
  title: string;
  data: any[];
  options: Record<string, any>;
}

export interface RiskRegister {
  id: string;
  organizationId: string;
  name: string;
  risks: RiskEntry[];
  lastReviewed: Date;
  nextReview: Date;
  owner: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface RiskEntry {
  id: string;
  registerId: string;
  title: string;
  description: string;
  category: 'OPERATIONAL' | 'FINANCIAL' | 'STRATEGIC' | 'COMPLIANCE' | 'REPUTATIONAL';
  probability: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  impact: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  riskScore: number;
  residualRiskScore?: number;
  controls: RiskControl[];
  owner: string;
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED' | 'TRANSFERRED' | 'CLOSED';
  identifiedDate: Date;
  lastAssessed: Date;
  nextAssessment: Date;
}

export interface RiskControl {
  id: string;
  riskId: string;
  type: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
  description: string;
  effectiveness: 'HIGH' | 'MEDIUM' | 'LOW';
  implementationStatus: 'PLANNED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'FAILED';
  responsible: string;
  cost: number;
  implementationDate?: Date;
  testingSchedule: string;
  lastTested?: Date;
}

// Common types and enums
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'UNKNOWN';
export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type ControlEffectiveness = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type ImplementationStatus = 'PLANNED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'FAILED' | 'DEFERRED';
export type ReviewFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY' | 'ANNUALLY' | 'BI_ANNUALLY';

export interface ComplianceContext {
  organizationId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  framework?: string;
  jurisdiction?: string;
  industry?: string;
}