import Link from 'next/link';

const services = [
  { name: 'APIDocumentationService', kebab: 'a-p-i-documentation-service' },
  { name: 'APIManagementService', kebab: 'a-p-i-management-service' },
  { name: 'AssetLifecycleService', kebab: 'asset-lifecycle-service' },
  { name: 'BudgetForecastService', kebab: 'budget-forecast-service' },
  { name: 'BulkDataService', kebab: 'bulk-data-service' },
  { name: 'BusinessIntelligenceService', kebab: 'business-intelligence-service' },
  { name: 'CADIntegrationService', kebab: 'c-a-d-integration-service' },
  { name: 'CalendarIntegrationService', kebab: 'calendar-integration-service' },
  { name: 'CAMReconciliationService', kebab: 'c-a-m-reconciliation-service' },
  { name: 'CapitalProjectService', kebab: 'capital-project-service' },
  { name: 'ChargebackService', kebab: 'chargeback-service' },
  { name: 'ComplianceService', kebab: 'compliance-service' },
  { name: 'ContractLifecycleService', kebab: 'contract-lifecycle-service' },
  { name: 'CriticalDateService', kebab: 'critical-date-service' },
  { name: 'CustomFieldService', kebab: 'custom-field-service' },
  { name: 'DataGovernanceService', kebab: 'data-governance-service' },
  { name: 'DataWarehouseService', kebab: 'data-warehouse-service' },
  { name: 'DocumentService', kebab: 'document-service' },
  { name: 'EmergencyPlanningService', kebab: 'emergency-planning-service' },
  { name: 'EnergyManagementService', kebab: 'energy-management-service' },
  { name: 'EnterpriseServiceBusService', kebab: 'enterprise-service-bus-service' },
  { name: 'FinancialConsolidationService', kebab: 'financial-consolidation-service' },
  { name: 'IntegrationService', kebab: 'integration-service' },
  { name: 'InternationalizationService', kebab: 'internationalization-service' },
  { name: 'InventoryService', kebab: 'inventory-service' },
  { name: 'IoTDeviceService', kebab: 'io-t-device-service' },
  { name: 'LeaseManagementService', kebab: 'lease-management-service' },
  { name: 'MaintenanceService', kebab: 'maintenance-service' },
  { name: 'Microsoft365IntegrationService', kebab: 'microsoft365-integration-service' },
  { name: 'MoveManagementService', kebab: 'move-management-service' },
  { name: 'NotificationService', kebab: 'notification-service' },
  { name: 'Phase3IntegrationService', kebab: 'phase3-integration-service' },
  { name: 'PortfolioService', kebab: 'portfolio-service' },
  { name: 'PreventiveMaintenanceService', kebab: 'preventive-maintenance-service' },
  { name: 'ReportingService', kebab: 'reporting-service' },
  { name: 'SalesforceIntegrationService', kebab: 'salesforce-integration-service' },
  { name: 'SDKGeneratorService', kebab: 's-d-k-generator-service' },
  { name: 'SpaceStandardsService', kebab: 'space-standards-service' },
  { name: 'SpaceUtilizationService', kebab: 'space-utilization-service' },
  { name: 'TechnicianMobileService', kebab: 'technician-mobile-service' },
  { name: 'VendorBrokerService', kebab: 'vendor-broker-service' },
  { name: 'WhiteLabelService', kebab: 'white-label-service' },
  { name: 'WorkflowEngine', kebab: 'workflow-engine' },
  { name: 'WorkOrderService', kebab: 'work-order-service' },
  { name: 'MultimediaEvidenceViewer', kebab: 'multimedia-evidence-viewer' },
];

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Services Dashboard</h1>
      
      {/* Production Monitoring Section */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Production Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/business-logic-integration-dashboard"
            className="block p-4 bg-white border rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
          >
            <h3 className="text-lg font-semibold text-blue-700">Business Logic Integration</h3>
            <p className="text-gray-600">Monitor NAPI-RS services and TypeScript fallback performance</p>
            <div className="mt-2 text-sm text-blue-600">
              View real-time metrics, health status, and circuit breaker monitoring
            </div>
          </Link>
          
          <Link
            href="/system-metrics"
            className="block p-4 bg-white border rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
          >
            <h3 className="text-lg font-semibold text-blue-700">System Metrics</h3>
            <p className="text-gray-600">Overall system performance and resource utilization</p>
            <div className="mt-2 text-sm text-blue-600">
              View CPU, memory, and network metrics across all services
            </div>
          </Link>
        </div>
      </div>

      {/* Services Grid */}
      <h2 className="text-2xl font-semibold mb-6">Available Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Link
            key={service.kebab}
            href={`/${service.kebab}`}
            className="block p-4 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <h2 className="text-xl font-semibold">{service.name}</h2>
            <p className="text-gray-600 dark:text-gray-400">Manage {service.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
