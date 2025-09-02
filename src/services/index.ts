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
// BudgetForecastService -> FinancialOperationsManager
// ChargebackService -> FinancialOperationsManager  
// FinancialConsolidationService -> FinancialOperationsManager
// SpaceUtilizationService -> SpaceOperationsManager
// MoveManagementService -> SpaceOperationsManager
// SpaceStandardsService -> SpaceOperationsManager
// MaintenanceService -> MaintenanceOperationsManager
// WorkOrderService -> MaintenanceOperationsManager
// PreventiveMaintenanceService -> MaintenanceOperationsManager
// WhiteLabelService -> TenantBrandingOperationsManager
// InternationalizationService -> TenantBrandingOperationsManager.i18nService
// CustomFieldService -> TenantBrandingOperationsManager.customFieldService
// ComplianceService -> ComplianceManagementOperationsManager (planned)
// DataGovernanceService -> ComplianceManagementOperationsManager (planned)
// EmergencyPlanningService -> ComplianceManagementOperationsManager (planned)
// Microsoft365IntegrationService -> ExternalIntegrationSystemsManager (planned)
// SalesforceIntegrationService -> ExternalIntegrationSystemsManager (planned)
// CalendarIntegrationService -> ExternalIntegrationSystemsManager (planned)
// Phase3IntegrationService -> ExternalIntegrationSystemsManager (planned)
// APIManagementService -> ExternalIntegrationSystemsManager (planned)