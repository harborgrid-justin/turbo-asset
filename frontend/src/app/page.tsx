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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Turbo Asset</h1>
            <p className="text-xl text-blue-200 mb-8">Enterprise Integrated Workplace Management System</p>
            <p className="text-lg max-w-3xl mx-auto mb-8 leading-relaxed">
              Modern alternative to IBM Tririga with advanced automation, AI-powered analytics, 
              and comprehensive facility management capabilities for Fortune 500 enterprises.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/asset-dashboard"
                className="bg-white text-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Asset Management
              </Link>
              <Link
                href="/business-logic-integration-dashboard"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                System Monitoring
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Key Features Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Enterprise-Grade Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-4 0H3m2 0h4m-4 0a2 2 0 00-2-2V7a2 2 0 012-2h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Asset Lifecycle Management</h3>
              <p className="text-gray-600">Complete asset tracking from acquisition to disposal with automated depreciation, maintenance scheduling, and compliance monitoring.</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Analytics</h3>
              <p className="text-gray-600">Advanced business intelligence with AI-powered insights, predictive maintenance, and comprehensive performance dashboards.</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
              <p className="text-gray-600">SOC2 compliant with comprehensive audit trails, role-based access control, and enterprise-grade data protection.</p>
            </div>
          </div>
        </div>

        {/* Production Monitoring Section */}
        <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-2xl font-semibold mb-4 text-blue-800">Production Monitoring & Control</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/business-logic-integration-dashboard"
              className="block p-6 bg-white border rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
            >
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-blue-700">Business Logic Integration</h3>
              </div>
              <p className="text-gray-600 mb-2">Monitor NAPI-RS services and TypeScript fallback performance</p>
              <div className="text-sm text-blue-600">
                ✓ Real-time metrics and health status monitoring<br/>
                ✓ Circuit breaker and rate limiting controls<br/>
                ✓ Production-grade error handling and recovery
              </div>
            </Link>
            
            <Link
              href="/audit-logging"
              className="block p-6 bg-white border rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
            >
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-700">Enterprise Audit Trail</h3>
              </div>
              <p className="text-gray-600 mb-2">Comprehensive compliance and security audit logging</p>
              <div className="text-sm text-green-600">
                ✓ SOX, GDPR, HIPAA compliance tracking<br/>
                ✓ Real-time security event monitoring<br/>
                ✓ Advanced filtering and export capabilities
              </div>
            </Link>
          </div>
        </div>

        {/* Core Services Grid */}
        <h2 className="text-2xl font-semibold mb-6">Core IWMS Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Link
              key={service.kebab}
              href={`/${service.kebab}`}
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{service.name}</h3>
              <p className="text-gray-600">Enterprise-grade {service.name.replace('Service', '').replace(/([A-Z])/g, ' $1').trim().toLowerCase()}</p>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-600">
          <p>© 2024 Turbo Asset - Enterprise IWMS Platform. Built with modern standards and industry best practices.</p>
          <p className="mt-2 text-sm">Powered by Next.js 15, TypeScript, and advanced microservices architecture.</p>
        </div>
      </div>
    </div>
  );
}
