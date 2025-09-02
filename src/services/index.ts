/**
 * Turbo Asset Services - Central export hub for all service domains
 * 
 * This file provides easy access to all service domains and their orchestration services.
 */

// Domain Services
export { AssetManagementService } from './asset-management/maintenance-operations/asset-management';
export { PortfolioReportingManager } from './portfolio-management/space-analytics/portfolio-reporting';
export { DocumentLifecycleService } from './document-management/content-operations/document-lifecycle';
export { EnterpriseConnectorsService } from './integration-management/external-systems/enterprise-connectors';

// New Architected Domain Services
export { FinancialOperationsManager } from './financial-management/cost-accounting/financial-operations';
export { SpaceOperationsManager } from './space-management/utilization-analytics/space-operations';
export { MaintenanceOperationsManager } from './maintenance-management/operations-analytics/maintenance-operations';
export { TenantBrandingOperationsManager } from './tenant-management/branding-operations/tenant-branding';
export { ComplianceManagementOperationsManager } from './compliance-governance/regulatory-operations/compliance-management';
export { ExternalIntegrationSystemsManager } from './external-integration-systems/third-party-connectors/integration-orchestration';
export { InfrastructureTechnologyOperationsManager } from './infrastructure-technology/smart-systems/infrastructure-operations';

// Business Operations Domain - Complete Implementation
export { BusinessOperationsManager } from './business-operations/project-management/business-coordination';
export { CapitalProjectService } from './business-operations/project-management/business-coordination/CapitalProjectService';
export { ContractLifecycleService } from './business-operations/project-management/business-coordination/ContractLifecycleService';
export { VendorBrokerService } from './business-operations/project-management/business-coordination/VendorBrokerService';
export { LeaseManagementService } from './business-operations/project-management/business-coordination/LeaseManagementService';
export { CAMReconciliationService } from './business-operations/project-management/business-coordination/CAMReconciliationService';
export { CriticalDateService } from './business-operations/project-management/business-coordination/CriticalDateService';
export { BusinessOperationsReportsService } from './business-operations/project-management/business-coordination/BusinessOperationsReportsService';

// Business Operations Types and Constants
export * from './business-operations/project-management/business-coordination/types';
export * from './business-operations/project-management/business-coordination/constants';

// Legacy flat services (to be gradually refactored)
export { WorkflowEngine } from './WorkflowEngine';
export { InternationalizationService } from './InternationalizationService';
export { DocumentService } from './DocumentService';
export { IntegrationService } from './IntegrationService';
export { CustomFieldService } from './CustomFieldService';
export { NotificationService } from './NotificationService';
export { BulkDataService } from './BulkDataService';
export { SDKGeneratorService } from './SDKGeneratorService';
export { APIDocumentationService } from './APIDocumentationService';
export { APIManagementService } from './APIManagementService';

// Legacy services (moved to domain services)
// BudgetForecastService -> FinancialOperationsManager ✅
// ChargebackService -> FinancialOperationsManager ✅
// FinancialConsolidationService -> FinancialOperationsManager ✅
// SpaceUtilizationService -> SpaceOperationsManager ✅
// MoveManagementService -> SpaceOperationsManager ✅
// SpaceStandardsService -> SpaceOperationsManager ✅
// MaintenanceService -> MaintenanceOperationsManager ✅
// WorkOrderService -> MaintenanceOperationsManager ✅
// PreventiveMaintenanceService -> MaintenanceOperationsManager ✅
// WhiteLabelService -> TenantBrandingOperationsManager ✅
// InternationalizationService -> TenantBrandingOperationsManager.i18nService ✅
// CustomFieldService -> TenantBrandingOperationsManager.customFieldService ✅
// ComplianceService -> ComplianceManagementOperationsManager ✅
// DataGovernanceService -> ComplianceManagementOperationsManager ✅
// EmergencyPlanningService -> ComplianceManagementOperationsManager ✅
// Microsoft365IntegrationService -> ExternalIntegrationSystemsManager ✅
// SalesforceIntegrationService -> ExternalIntegrationSystemsManager ✅
// CalendarIntegrationService -> ExternalIntegrationSystemsManager (partial)
// Phase3IntegrationService -> ExternalIntegrationSystemsManager (partial)
// APIManagementService -> ExternalIntegrationSystemsManager (partial)
// IoTDeviceService -> InfrastructureTechnologyOperationsManager.iotDeviceService ✅
// EnergyManagementService -> InfrastructureTechnologyOperationsManager.energyManagementService ✅
// CADIntegrationService -> InfrastructureTechnologyOperationsManager ✅
// BusinessIntelligenceService -> InfrastructureTechnologyOperationsManager ✅

// Business Operations Domain Services (NEW - Complete Implementation) ✅
// CapitalProjectService -> BusinessOperationsManager.capitalProjectService ✅
// ContractLifecycleService -> BusinessOperationsManager.contractLifecycleService ✅
// VendorBrokerService -> BusinessOperationsManager.vendorBrokerService ✅
// LeaseManagementService -> BusinessOperationsManager.leaseManagementService ✅
// CAMReconciliationService -> BusinessOperationsManager.camReconciliationService ✅
// CriticalDateService -> BusinessOperationsManager.criticalDateService ✅

// Services still requiring migration to new domains:
// WorkflowEngine, ReportingService, EnterpriseServiceBusService -> Advanced Operations domain
// DataWarehouseService, PortfolioService -> Advanced Operations domain
// NotificationService, IntegrationService, TechnicianMobileService -> Service Operations domain
// SDKGeneratorService, APIDocumentationService, BulkDataService -> Service Operations domain
// AssetLifecycleService, InventoryService -> Asset Operations domain