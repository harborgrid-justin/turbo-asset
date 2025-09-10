/**
 * Business Operations Domain Types
 * 
 * Comprehensive type definitions for capital projects, contracts, vendors,
 * leases, CAM reconciliation, and critical date management.
 */

import { EventEmitter } from 'events';

// === CAPITAL PROJECT TYPES ===

export interface CapitalProject {
  id: string;
  organizationId: string;
  projectNumber: string;
  projectName: string;
  description?: string;
  category: 'INFRASTRUCTURE' | 'EXPANSION' | 'RENOVATION' | 'UPGRADE' | 'REPLACEMENT' | 'OTHER';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PLANNING' | 'APPROVED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  approvedBudget: number;
  actualCost?: number;
  currency: string;
  projectManager: string;
  sponsor?: string;
  stakeholders: string[];
  affectedAssets: string[];
  approvalRequired: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedDate?: Date;
  createdBy: string;
  createdDate: Date;
  lastUpdated: Date;
  budgetBreakdown: ProjectBudgetBreakdown;
  tasks: ProjectTask[];
  documents: ProjectDocument[];
  riskAssessment?: ProjectRisk[];
  milestones: ProjectMilestone[];
}

export interface ProjectBudgetBreakdown {
  designCost: number;
  constructionCost: number;
  equipmentCost: number;
  contingencyCost: number;
  otherCosts: number;
  totalBudget: number;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  taskNumber: string;
  taskName: string;
  description?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  duration: number;
  assignedTo?: string;
  assignedTeam?: string;
  predecessorTaskIds: string[];
  successorTaskIds: string[];
  budgetAmount?: number;
  actualCost?: number;
  isCritical: boolean;
  percentComplete: number;
  deliverables: string[];
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  targetDate: Date;
  actualDate?: Date;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  dependencies: string[];
  deliverables: string[];
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  fileName: string;
  fileType: string;
  documentType: 'PLAN' | 'CONTRACT' | 'PERMIT' | 'DESIGN' | 'SPECIFICATION' | 'OTHER';
  filePath: string;
  uploadedBy: string;
  uploadedDate: Date;
  version: string;
}

export interface ProjectRisk {
  id: string;
  projectId: string;
  riskType: 'BUDGET' | 'SCHEDULE' | 'TECHNICAL' | 'REGULATORY' | 'VENDOR' | 'OTHER';
  description: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  mitigationStrategy?: string;
  owner: string;
  status: 'OPEN' | 'MITIGATED' | 'CLOSED';
}

// === CONTRACT LIFECYCLE TYPES ===

export interface Contract {
  id: string;
  organizationId: string;
  contractNumber: string;
  contractType: 'LEASE' | 'SERVICE_AGREEMENT' | 'MAINTENANCE' | 'CONSTRUCTION' | 'CONSULTING' | 'SUPPLY' | 'OTHER';
  title: string;
  description?: string;
  version: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'EXECUTED' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  executionDate?: Date;
  effectiveDate: Date;
  expirationDate: Date;
  autoRenew: boolean;
  renewalTerms?: ContractRenewalTerms;
  totalValue: number;
  currency: string;
  paymentTerms: ContractPaymentTerms;
  parties: ContractParty[];
  milestones: ContractMilestone[];
  documents: ContractDocument[];
  complianceRequirements: ComplianceRequirement[];
  renewalOptions: ContractRenewalOption[];
  terminationClauses: TerminationClause[];
  createdBy: string;
  createdDate: Date;
  lastUpdated: Date;
}

export interface ContractParty {
  id: string;
  role: 'LESSOR' | 'LESSEE' | 'VENDOR' | 'CLIENT' | 'GUARANTOR' | 'OTHER';
  entityName: string;
  contactPerson: string;
  contactInfo: ContactInfo;
  signatureRequired: boolean;
  signedDate?: Date;
}

export interface ContractMilestone {
  id: string;
  contractId: string;
  name: string;
  type: 'DELIVERABLE' | 'PAYMENT' | 'APPROVAL' | 'INSPECTION' | 'COMPLIANCE' | 'DEADLINE' | 'OTHER';
  dueDate: Date;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'WAIVED';
  description?: string;
  requirements: string[];
  deliverables: string[];
  completedDate?: Date;
  completedBy?: string;
}

export interface ContractDocument {
  id: string;
  contractId: string;
  documentType: 'CONTRACT' | 'AMENDMENT' | 'ADDENDUM' | 'EXHIBIT' | 'SCHEDULE' | 'OTHER';
  fileName: string;
  filePath: string;
  version: string;
  uploadedBy: string;
  uploadedDate: Date;
  isExecuted: boolean;
}

export interface ContractRenewalTerms {
  renewalPeriod: number;
  renewalPeriodUnit: 'DAYS' | 'MONTHS' | 'YEARS';
  noticePeriod: number;
  noticePeriodUnit: 'DAYS' | 'MONTHS';
  renewalConditions: string[];
  rateIncrease?: number;
  rateIncreaseType?: 'FIXED' | 'PERCENTAGE' | 'CPI';
}

export interface ContractPaymentTerms {
  paymentSchedule: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ON_DELIVERY' | 'MILESTONE' | 'OTHER';
  paymentDue: number;
  paymentDueUnit: 'DAYS' | 'MONTHS';
  lateFeeRate?: number;
  discountTerms?: string;
}

export interface ContractRenewalOption {
  id: string;
  contractId: string;
  optionNumber: number;
  renewalPeriod: number;
  renewalPeriodUnit: 'MONTHS' | 'YEARS';
  newRate?: number;
  rateIncrease?: number;
  conditions: string[];
  noticeRequired: boolean;
  noticePeriod?: number;
}

export interface TerminationClause {
  id: string;
  contractId: string;
  clauseType: 'CONVENIENCE' | 'CAUSE' | 'NON_PAYMENT' | 'BREACH' | 'OTHER';
  noticePeriod: number;
  noticePeriodUnit: 'DAYS' | 'MONTHS';
  terminationFee?: number;
  conditions: string[];
  penalties?: string[];
}

export interface ComplianceRequirement {
  id: string;
  contractId: string;
  requirementType: 'INSURANCE' | 'LICENSES' | 'CERTIFICATIONS' | 'REPORTING' | 'AUDIT' | 'OTHER';
  description: string;
  dueDate?: Date;
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME';
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'OVERDUE' | 'WAIVED';
  responsible: string;
}

// === VENDOR BROKER TYPES ===

export interface Vendor {
  id: string;
  organizationId: string;
  vendorCode: string;
  name: string;
  legalName?: string;
  vendorType: 'SERVICE' | 'CONTRACTOR' | 'SUPPLIER' | 'CONSULTANT' | 'BROKER' | 'LEGAL' | 'FINANCIAL' | 'TECHNOLOGY' | 'OTHER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
  contactInfo: ContactInfo;
  primaryContact: string;
  accountManager?: string;
  businessInfo: BusinessInfo;
  services: string[];
  specialties: string[];
  certifications: Certification[];
  performance: VendorPerformance;
  contracts: string[];
  ratings: VendorRating[];
  createdBy: string;
  createdDate: Date;
  lastUpdated: Date;
}

export interface Broker {
  id: string;
  organizationId: string;
  brokerCode: string;
  name: string;
  company?: string;
  licenseInfo: BrokerLicense;
  contactInfo: ContactInfo;
  assistants: BrokerAssistant[];
  specialization: string[];
  markets: string[];
  propertyTypes: string[];
  commission: CommissionStructure;
  performance: BrokerPerformance;
  deals: BrokerDeal[];
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdDate: Date;
  lastUpdated: Date;
}

export interface ContactInfo {
  address?: Address;
  phone?: string;
  email?: string;
  website?: string;
  fax?: string;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BusinessInfo {
  businessType: 'CORPORATION' | 'LLC' | 'PARTNERSHIP' | 'SOLE_PROPRIETORSHIP' | 'OTHER';
  taxId?: string;
  dbaName?: string;
  creditRating?: string;
  annualRevenue?: number;
  employeeCount?: number;
  yearEstablished?: number;
  insurance: InsuranceInfo[];
  standardRates: StandardRate[];
}

export interface InsuranceInfo {
  type: 'GENERAL_LIABILITY' | 'WORKERS_COMP' | 'PROFESSIONAL' | 'AUTO' | 'OTHER';
  carrier: string;
  policyNumber: string;
  coverageAmount: number;
  deductible?: number;
  expirationDate: Date;
  certificateOnFile: boolean;
}

export interface StandardRate {
  serviceType: string;
  rateType: 'HOURLY' | 'DAILY' | 'PROJECT' | 'UNIT';
  rate: number;
  currency: string;
  effectiveDate: Date;
  expirationDate?: Date;
}

export interface Certification {
  name: string;
  issuingBody: string;
  certificateNumber?: string;
  issueDate: Date;
  expirationDate?: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
}

export interface VendorPerformance {
  overallRating: number;
  onTimeDelivery: number;
  qualityRating: number;
  costPerformance: number;
  communicationRating: number;
  contractsCompleted: number;
  contractsActive: number;
  totalContractValue: number;
  lastPerformanceReview?: Date;
}

export interface VendorRating {
  id: string;
  vendorId: string;
  projectId?: string;
  contractId?: string;
  ratingType: 'QUALITY' | 'TIMELINESS' | 'COMMUNICATION' | 'VALUE' | 'OVERALL';
  rating: number;
  comments?: string;
  ratedBy: string;
  ratedDate: Date;
}

export interface BrokerLicense {
  licenseNumber: string;
  licenseState: string;
  licenseType: 'REAL_ESTATE' | 'COMMERCIAL' | 'RESIDENTIAL' | 'OTHER';
  issueDate: Date;
  expirationDate: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
}

export interface BrokerAssistant {
  name: string;
  role: string;
  contactInfo: ContactInfo;
  licenseInfo?: BrokerLicense;
}

export interface CommissionStructure {
  defaultRate: number;
  tieredRates?: TieredRate[];
  minimumCommission?: number;
  maximumCommission?: number;
  paymentTerms: string;
}

export interface TieredRate {
  minValue: number;
  maxValue?: number;
  rate: number;
}

export interface BrokerPerformance {
  dealsCompleted: number;
  totalVolume: number;
  averageDealSize: number;
  successRate: number;
  averageTimeToDeal: number;
  clientSatisfaction: number;
  lastPerformanceReview?: Date;
}

export interface BrokerDeal {
  id: string;
  dealType: 'LEASE' | 'PURCHASE' | 'SALE' | 'RENEWAL' | 'OTHER';
  propertyId: string;
  dealValue: number;
  commissionEarned: number;
  closeDate: Date;
  clientId: string;
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED';
}

// === LEASE MANAGEMENT TYPES ===

export interface Lease {
  id: string;
  organizationId: string;
  leaseNumber: string;
  propertyId: string;
  spaceIds: string[];
  leaseType: 'OFFICE' | 'RETAIL' | 'INDUSTRIAL' | 'STORAGE' | 'PARKING' | 'OTHER';
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING_RENEWAL' | 'DRAFT';
  startDate: Date;
  endDate: Date;
  rentableArea: number;
  usableArea: number;
  rentDetails: LeaseRentDetails;
  renewalOptions: LeaseRenewalOption[];
  expansionOptions: LeaseExpansionOption[];
  assignmentRights: AssignmentRights;
  subleaseRights: SubleaseRights;
  criticalDates: LeaseCriticalDate[];
  amendments: LeaseAmendment[];
  payments: LeasePayment[];
  documents: LeaseDocument[];
  createdBy: string;
  createdDate: Date;
  lastUpdated: Date;
}

export interface LeaseRentDetails {
  baseRent: number;
  rentSchedule: RentScheduleEntry[];
  escalations: RentEscalation[];
  freeRentPeriods: FreeRentPeriod[];
  additionalRent: AdditionalRent[];
  securityDeposit: number;
  currency: string;
}

export interface RentScheduleEntry {
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  annualRent: number;
  psf?: number;
}

export interface RentEscalation {
  type: 'FIXED' | 'PERCENTAGE' | 'CPI' | 'OTHER';
  value: number;
  frequency: 'ANNUAL' | 'BIENNIAL' | 'OTHER';
  startDate: Date;
  capRate?: number;
}

export interface FreeRentPeriod {
  startDate: Date;
  endDate: Date;
  type: 'FULL' | 'PARTIAL';
  description?: string;
}

export interface AdditionalRent {
  type: 'CAM' | 'TAXES' | 'INSURANCE' | 'UTILITIES' | 'PARKING' | 'OTHER';
  amount: number;
  billingFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  estimatedAmount?: number;
  reconciliationRequired: boolean;
}

export interface LeaseRenewalOption {
  id: string;
  optionNumber: number;
  term: number;
  termUnit: 'MONTHS' | 'YEARS';
  noticeRequired: boolean;
  noticePeriod?: number;
  noticePeriodUnit?: 'DAYS' | 'MONTHS';
  rentDetermination: 'FIXED' | 'MARKET' | 'PERCENTAGE_INCREASE' | 'CPI';
  rentValue?: number;
  conditions: string[];
}

export interface LeaseExpansionOption {
  id: string;
  additionalArea: number;
  expansionRent: number;
  availabilityDate?: Date;
  exerciseDeadline?: Date;
  conditions: string[];
}

export interface AssignmentRights {
  allowed: boolean;
  landlordConsent: 'REQUIRED' | 'NOT_UNREASONABLY_WITHHELD' | 'NOT_REQUIRED';
  fee?: number;
  conditions: string[];
}

export interface SubleaseRights {
  allowed: boolean;
  landlordConsent: 'REQUIRED' | 'NOT_UNREASONABLY_WITHHELD' | 'NOT_REQUIRED';
  profitSharing?: number;
  conditions: string[];
}

export interface LeaseCriticalDate {
  id: string;
  leaseId: string;
  dateType: 'RENT_COMMENCEMENT' | 'LEASE_EXPIRATION' | 'OPTION_EXERCISE' | 'RENEWAL_NOTICE' | 'TERMINATION_NOTICE' | 'OTHER';
  date: Date;
  description: string;
  notificationPeriod: number;
  notificationPeriodUnit: 'DAYS' | 'MONTHS';
  status: 'UPCOMING' | 'NOTIFIED' | 'COMPLETED' | 'OVERDUE';
  responsible: string;
}

export interface LeaseAmendment {
  id: string;
  leaseId: string;
  amendmentNumber: string;
  executionDate: Date;
  effectiveDate: Date;
  description: string;
  changes: string[];
  documentPath: string;
  createdBy: string;
  createdDate: Date;
}

export interface LeasePayment {
  id: string;
  leaseId: string;
  paymentType: 'BASE_RENT' | 'CAM' | 'TAXES' | 'INSURANCE' | 'OTHER';
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  paidAmount?: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  paymentMethod?: string;
  reference?: string;
}

export interface LeaseDocument {
  id: string;
  leaseId: string;
  documentType: 'LEASE' | 'AMENDMENT' | 'ADDENDUM' | 'ABSTRACT' | 'CERTIFICATE' | 'OTHER';
  fileName: string;
  filePath: string;
  version: string;
  uploadedBy: string;
  uploadedDate: Date;
  isExecuted: boolean;
}

// === CAM RECONCILIATION TYPES ===

export interface CAMReconciliation {
  id: string;
  organizationId: string;
  propertyId: string;
  leaseIds: string[];
  reconciliationYear: number;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'COMPLETED' | 'DISPUTED' | 'FINALIZED';
  dueDate: Date;
  completedDate?: Date;
  totalCAMExpenses: number;
  totalRecoverableExpenses: number;
  totalTenantShares: number;
  variance: number;
  expenses: CAMExpense[];
  tenantAllocations: CAMTenantAllocation[];
  adjustments: CAMReconAdjustment[];
  disputes: CAMDispute[];
  documents: CAMDocument[];
  createdBy: string;
  createdDate: Date;
  lastUpdated: Date;
}

export interface CAMExpense {
  id: string;
  reconId: string;
  category: 'MAINTENANCE' | 'UTILITIES' | 'INSURANCE' | 'TAXES' | 'MANAGEMENT' | 'SECURITY' | 'LANDSCAPING' | 'OTHER';
  description: string;
  amount: number;
  isRecoverable: boolean;
  allocationMethod: 'AREA' | 'HEADCOUNT' | 'PERCENTAGE' | 'FIXED' | 'OTHER';
  supportingDocs: string[];
  vendor?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
}

export interface CAMTenantAllocation {
  id: string;
  reconId: string;
  leaseId: string;
  tenantName: string;
  allocatedAmount: number;
  paidAmount: number;
  owedAmount: number;
  refundAmount: number;
  allocationPercentage: number;
  allocatedArea: number;
  calculationMethod: string;
  adjustments: number;
}

export interface CAMReconAdjustment {
  id: string;
  reconId: string;
  adjustmentType: 'PRIOR_YEAR' | 'AUDIT' | 'DISPUTE_RESOLUTION' | 'ERROR_CORRECTION' | 'OTHER';
  description: string;
  amount: number;
  affectedTenants: string[];
  reason: string;
  approvedBy?: string;
  approvedDate?: Date;
}

export interface CAMDispute {
  id: string;
  reconId: string;
  leaseId: string;
  tenantName: string;
  disputeType: 'EXPENSE_CHALLENGE' | 'CALCULATION_ERROR' | 'DOCUMENTATION' | 'ALLOCATION_METHOD' | 'OTHER';
  description: string;
  disputedAmount: number;
  submittedDate: Date;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';
  resolution?: string;
  resolvedDate?: Date;
  resolvedAmount?: number;
}

export interface CAMDocument {
  id: string;
  reconId: string;
  documentType: 'RECONCILIATION_STATEMENT' | 'SUPPORTING_INVOICE' | 'TENANT_STATEMENT' | 'AUDIT_REPORT' | 'OTHER';
  fileName: string;
  filePath: string;
  uploadedBy: string;
  uploadedDate: Date;
}

// === CRITICAL DATE TYPES ===

export interface CriticalDate {
  id: string;
  organizationId: string;
  entityType: 'LEASE' | 'CONTRACT' | 'PROJECT' | 'PERMIT' | 'INSURANCE' | 'COMPLIANCE' | 'OTHER';
  entityId: string;
  entityName: string;
  dateType: string;
  criticalDate: Date;
  description: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'EXPIRATION' | 'RENEWAL' | 'NOTICE' | 'DEADLINE' | 'MILESTONE' | 'COMPLIANCE' | 'OTHER';
  responsible: string;
  backupContact?: string;
  status: 'UPCOMING' | 'NOTIFIED' | 'ACTION_REQUIRED' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  notifications: CriticalDateNotification[];
  actions: CriticalDateAction[];
  dependencies: string[];
  tags: string[];
  createdBy: string;
  createdDate: Date;
  lastUpdated: Date;
}

export interface CriticalDateNotification {
  id: string;
  criticalDateId: string;
  notificationType: 'EMAIL' | 'SMS' | 'SYSTEM' | 'WORKFLOW';
  trigger: 'ADVANCE_NOTICE' | 'OVERDUE' | 'COMPLETION' | 'ESCALATION';
  triggerDays: number;
  recipients: string[];
  message: string;
  sentDate?: Date;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
}

export interface CriticalDateAction {
  id: string;
  criticalDateId: string;
  actionType: 'RENEWAL' | 'TERMINATION' | 'NOTIFICATION' | 'DOCUMENT_REVIEW' | 'APPROVAL' | 'OTHER';
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  completedDate?: Date;
  completedBy?: string;
  notes?: string;
}

// === COMMON EVENT TYPES ===

export interface BusinessOperationsEvent {
  type: string;
  entityType: string;
  entityId: string;
  data: any;
  timestamp: Date;
  userId: string;
  organizationId: string;
}

// === SERVICE INTERFACES ===

export interface ICapitalProjectService extends EventEmitter {
  createProject(data: Partial<CapitalProject>): Promise<CapitalProject>;
  getProject(id: string): Promise<CapitalProject | null>;
  updateProject(id: string, data: Partial<CapitalProject>): Promise<CapitalProject>;
  deleteProject(id: string): Promise<boolean>;
  searchProjects(criteria: any): Promise<CapitalProject[]>;
  getProjectsByStatus(status: string): Promise<CapitalProject[]>;
  createTask(projectId: string, data: Partial<ProjectTask>): Promise<ProjectTask>;
  updateProjectStatus(id: string, status: string): Promise<CapitalProject>;
  calculateProjectMetrics(id: string): Promise<any>;
}

export interface IContractLifecycleService extends EventEmitter {
  createContract(data: Partial<Contract>): Promise<Contract>;
  getContract(id: string): Promise<Contract | null>;
  updateContract(id: string, data: Partial<Contract>): Promise<Contract>;
  deleteContract(id: string): Promise<boolean>;
  searchContracts(criteria: any): Promise<Contract[]>;
  getExpiringContracts(days: number): Promise<Contract[]>;
  renewContract(id: string, terms?: Partial<ContractRenewalTerms>): Promise<Contract>;
  terminateContract(id: string, reason: string): Promise<Contract>;
  trackMilestones(contractId: string): Promise<ContractMilestone[]>;
}

export interface IVendorBrokerService extends EventEmitter {
  createVendor(data: Partial<Vendor>): Promise<Vendor>;
  createBroker(data: Partial<Broker>): Promise<Broker>;
  getVendor(id: string): Promise<Vendor | null>;
  getBroker(id: string): Promise<Broker | null>;
  updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor>;
  updateBroker(id: string, data: Partial<Broker>): Promise<Broker>;
  searchVendors(criteria: any): Promise<Vendor[]>;
  searchBrokers(criteria: any): Promise<Broker[]>;
  rateVendor(vendorId: string, rating: Partial<VendorRating>): Promise<VendorRating>;
  calculateVendorPerformance(vendorId: string): Promise<VendorPerformance>;
}

export interface ILeaseManagementService extends EventEmitter {
  createLease(data: Partial<Lease>): Promise<Lease>;
  getLease(id: string): Promise<Lease | null>;
  updateLease(id: string, data: Partial<Lease>): Promise<Lease>;
  deleteLease(id: string): Promise<boolean>;
  searchLeases(criteria: any): Promise<Lease[]>;
  getExpiringLeases(days: number): Promise<Lease[]>;
  calculateRent(leaseId: string, date: Date): Promise<number>;
  renewLease(leaseId: string, optionNumber: number): Promise<Lease>;
  terminateLease(leaseId: string, reason: string): Promise<Lease>;
}

export interface ICAMReconciliationService extends EventEmitter {
  createReconciliation(data: Partial<CAMReconciliation>): Promise<CAMReconciliation>;
  getReconciliation(id: string): Promise<CAMReconciliation | null>;
  updateReconciliation(id: string, data: Partial<CAMReconciliation>): Promise<CAMReconciliation>;
  calculateTenantAllocations(reconId: string): Promise<CAMTenantAllocation[]>;
  submitDispute(reconId: string, dispute: Partial<CAMDispute>): Promise<CAMDispute>;
  finalizeReconciliation(reconId: string): Promise<CAMReconciliation>;
  generateStatement(reconId: string, leaseId: string): Promise<Buffer>;
}

export interface ICriticalDateService extends EventEmitter {
  createCriticalDate(data: Partial<CriticalDate>): Promise<CriticalDate>;
  getCriticalDate(id: string): Promise<CriticalDate | null>;
  updateCriticalDate(id: string, data: Partial<CriticalDate>): Promise<CriticalDate>;
  deleteCriticalDate(id: string): Promise<boolean>;
  getUpcomingDates(days: number): Promise<CriticalDate[]>;
  getOverdueDates(): Promise<CriticalDate[]>;
  sendNotifications(dateId: string): Promise<boolean>;
  escalateOverdue(dateId: string): Promise<boolean>;
  markCompleted(dateId: string): Promise<CriticalDate>;
}

// Business Operations Context
export interface BusinessOperationsContext {
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  settings: Record<string, any>;
  apiEndpoints: Record<string, string>;
  eventEmitter: EventEmitter;
}

// Business Operations Events
export interface BusinessOperationsEvent {
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  organizationId: string;
  userId?: string;
}

// Default context creator
export function createDefaultBusinessOperationsContext(): BusinessOperationsContext {
  return {
    organizationId: 'default',
    userId: 'system',
    userRole: 'admin',
    permissions: ['*'],
    settings: {},
    apiEndpoints: {},
    eventEmitter: new EventEmitter()
  };
}