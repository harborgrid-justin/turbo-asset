/**
 * API Controllers - Barrel Export
 * Following industry best practices for controller organization
 */

// Core controllers
export { APIManagementController } from './APIManagementController';
export { default as AssetController } from './AssetController';
export { default as BulkDataController } from './BulkDataController';
export { BusinessIntelligenceController } from './BusinessIntelligenceController';
export { BusinessLogicIntegrationController } from './BusinessLogicIntegrationController';
export { default as CADIntegrationController } from './CADIntegrationController';
export { ComplianceController } from './ComplianceController';
export { CriticalDateController } from './CriticalDateController';
export { CustomFieldController } from './CustomFieldController';
export { DataGovernanceController } from './DataGovernanceController';
export { DataWarehouseController } from './DataWarehouseController';
export { default as DocumentController } from './DocumentController';

// Enterprise integration controllers
export { EnterpriseIntegrationController } from './EnterpriseIntegrationController';
export { FinancialConsolidationController } from './FinancialConsolidationController';
export { default as IntegrationController } from './IntegrationController';
export { LeaseManagementController } from './LeaseManagementController';

// Operations controllers
export { default as MaintenanceController } from './MaintenanceController';
export { default as MoveManagementController } from './MoveManagementController';
export { default as NotificationController } from './NotificationController';
export { default as PortfolioController } from './PortfolioController';
export { default as PropertyController } from './PropertyController';

// Reporting and analytics
export { ReportingController } from './ReportingController';
export { default as SpaceAnalyticsController } from './SpaceAnalyticsController';
export { default as SpaceBookingController } from './SpaceBookingController';
export { default as SpaceStandardsController } from './SpaceStandardsController';

// Tenant and workflow management
export { WhiteLabelController } from './WhiteLabelController';
export { default as WorkOrderController } from './WorkOrderController';
export { default as WorkflowController } from './WorkflowController';

// Enhanced business logic
export { EnhancedBusinessLogicController } from './EnhancedBusinessLogicController';
export { EnhancedBusinessLogicIntegrationController } from './EnhancedBusinessLogicIntegrationController';

// Emergency services
export { default as EmergencyPlanningController } from './EmergencyPlanningController';