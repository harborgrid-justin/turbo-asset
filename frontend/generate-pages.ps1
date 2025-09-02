$services = @(
    "APIDocumentationService",
    "APIManagementService",
    "AssetLifecycleService",
    "BudgetForecastService",
    "BulkDataService",
    "BusinessIntelligenceService",
    "CADIntegrationService",
    "CalendarIntegrationService",
    "CAMReconciliationService",
    "CapitalProjectService",
    "ChargebackService",
    "ComplianceService",
    "ContractLifecycleService",
    "CriticalDateService",
    "CustomFieldService",
    "DataGovernanceService",
    "DataWarehouseService",
    "DocumentService",
    "EmergencyPlanningService",
    "EnergyManagementService",
    "EnterpriseServiceBusService",
    "FinancialConsolidationService",
    "IntegrationService",
    "InternationalizationService",
    "InventoryService",
    "IoTDeviceService",
    "LeaseManagementService",
    "MaintenanceService",
    "Microsoft365IntegrationService",
    "MoveManagementService",
    "NotificationService",
    "Phase3IntegrationService",
    "PortfolioService",
    "PreventiveMaintenanceService",
    "ReportingService",
    "SalesforceIntegrationService",
    "SDKGeneratorService",
    "SpaceStandardsService",
    "SpaceUtilizationService",
    "TechnicianMobileService",
    "VendorBrokerService",
    "WhiteLabelService",
    "WorkflowEngine",
    "WorkOrderService"
)

foreach ($service in $services) {
    $kebab = [System.Text.RegularExpressions.Regex]::Replace($service, '([A-Z])', { param($match) '-' + $match.Value.ToLower() }) -replace '^-', ''
    $dir = "src\app\$kebab"
    New-Item -ItemType Directory -Path $dir -Force
    $content = @"
import React from 'react';

const ${service}Page = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">${service}</h1>
      <p>This is the UI page for ${service}.</p>
      {/* Add more components here */}
    </div>
  );
};

export default ${service}Page;
"@
    $content | Out-File -FilePath "$dir\page.tsx" -Encoding UTF8
}
