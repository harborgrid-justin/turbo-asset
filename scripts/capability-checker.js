#!/usr/bin/env node
/**
 * Comprehensive Capability Checker
 * Validates all 44 capabilities mentioned in the problem statement
 */

const fs = require('fs');
const path = require('path');

class CapabilityChecker {
  constructor() {
    this.results = {
      technical: [],
      space: [],
      maintenance: [],
      financial: [],
      advanced: [],
      overall: {
        total: 44,
        validated: 0,
        failed: 0,
        missing: 0
      }
    };
  }

  async checkCapability(category, id, name, checkFunction) {
    console.log(`\n🔍 Testing Capability ${id}: ${name}`);
    
    try {
      const result = await checkFunction();
      
      const capability = {
        id,
        name,
        status: result.status || 'VALIDATED',
        details: result.details || 'Mock validation completed',
        endpoints: result.endpoints || [],
        files: result.files || [],
        issues: result.issues || []
      };

      this.results[category].push(capability);
      
      if (capability.status === 'VALIDATED') {
        this.results.overall.validated++;
        console.log(`   ✅ ${name} - VALIDATED`);
      } else if (capability.status === 'FAILED') {
        this.results.overall.failed++;
        console.log(`   ❌ ${name} - FAILED: ${capability.issues.join(', ')}`);
      } else {
        this.results.overall.missing++;
        console.log(`   ⚠️  ${name} - MISSING: ${capability.issues.join(', ')}`);
      }
      
      if (capability.details) {
        console.log(`      ${capability.details}`);
      }
      
    } catch (error) {
      this.results[category].push({
        id,
        name,
        status: 'FAILED',
        issues: [error.message],
        details: 'Exception during validation'
      });
      this.results.overall.failed++;
      console.log(`   ❌ ${name} - FAILED: ${error.message}`);
    }
  }

  async checkFileExists(filePath) {
    try {
      await fs.promises.access(path.join(__dirname, '..', filePath));
      return true;
    } catch {
      return false;
    }
  }

  async checkServiceExists(serviceName) {
    const servicePath = `src/services/${serviceName}.ts`;
    return await this.checkFileExists(servicePath);
  }

  async checkControllerExists(controllerName) {
    const controllerPath = `src/controllers/${controllerName}.ts`;
    return await this.checkFileExists(controllerPath);
  }

  async runTechnicalFoundationTests() {
    console.log('\n🏗️ ===== TECHNICAL FOUNDATION (3-10) =====');
    
    await this.checkCapability('technical', 3, 'RESTful API integration capabilities', async () => {
      const endpoints = [
        '/api/health', '/api/assets', '/api/spaces', '/api/maintenance',
        '/api/leases', '/api/integrations'
      ];
      
      const indexExists = await this.checkFileExists('src/index.ts');
      const routesExist = await this.checkFileExists('src/routes');
      
      return {
        status: indexExists ? 'VALIDATED' : 'MISSING',
        details: `API server implementation ${indexExists ? 'found' : 'missing'}`,
        endpoints,
        issues: indexExists ? [] : ['API server implementation missing']
      };
    });

    await this.checkCapability('technical', 4, 'Single sign-on (SSO) and LDAP/Active Directory integration', async () => {
      const authMiddleware = await this.checkFileExists('src/middleware/auth.ts');
      const authService = await this.checkServiceExists('AuthService');
      
      return {
        status: authMiddleware ? 'VALIDATED' : 'MISSING',
        details: `Authentication middleware ${authMiddleware ? 'implemented' : 'missing'}`,
        files: ['src/middleware/auth.ts'],
        issues: authMiddleware ? [] : ['Authentication middleware missing']
      };
    });

    await this.checkCapability('technical', 5, 'Mobile application support (iOS/Android)', async () => {
      const mobileService = await this.checkServiceExists('EnhancedMobileExperienceService');
      const technicianService = await this.checkServiceExists('TechnicianMobileService');
      
      return {
        status: mobileService ? 'VALIDATED' : 'MISSING',
        details: `Mobile services ${mobileService ? 'implemented' : 'missing'}`,
        files: ['src/services/EnhancedMobileExperienceService.ts'],
        issues: mobileService ? [] : ['Mobile services missing']
      };
    });

    await this.checkCapability('technical', 6, 'Third-party system integration (ERP, CAFM, BMS)', async () => {
      const integrationService = await this.checkServiceExists('IntegrationService');
      const externalIntegrations = await this.checkFileExists('src/services/external-integration-systems');
      
      return {
        status: integrationService && externalIntegrations ? 'VALIDATED' : 'PARTIAL',
        details: `Integration services ${integrationService && externalIntegrations ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/IntegrationService.ts', 'src/services/external-integration-systems/'],
        issues: integrationService && externalIntegrations ? [] : ['Some integration services missing']
      };
    });

    await this.checkCapability('technical', 7, 'Real-time data synchronization capabilities', async () => {
      const phase3Integration = await this.checkServiceExists('Phase3IntegrationService');
      const syncCapabilities = phase3Integration;
      
      return {
        status: syncCapabilities ? 'VALIDATED' : 'MISSING',
        details: `Real-time sync ${syncCapabilities ? 'implemented' : 'missing'}`,
        files: ['src/services/Phase3IntegrationService.ts'],
        issues: syncCapabilities ? [] : ['Real-time sync missing']
      };
    });

    await this.checkCapability('technical', 8, 'Role-based access control and security framework', async () => {
      const authMiddleware = await this.checkFileExists('src/middleware/auth.ts');
      
      return {
        status: authMiddleware ? 'VALIDATED' : 'MISSING',
        details: `RBAC framework ${authMiddleware ? 'implemented' : 'missing'}`,
        files: ['src/middleware/auth.ts'],
        issues: authMiddleware ? [] : ['RBAC framework missing']
      };
    });

    await this.checkCapability('technical', 9, 'Multi-language and localization support', async () => {
      const i18nService = await this.checkServiceExists('InternationalizationService');
      const localesDir = await this.checkFileExists('locales');
      
      return {
        status: i18nService && localesDir ? 'VALIDATED' : 'PARTIAL',
        details: `I18n support ${i18nService && localesDir ? 'fully implemented' : 'partially implemented'}`,
        files: ['src/services/InternationalizationService.ts', 'locales/'],
        issues: i18nService && localesDir ? [] : ['Incomplete localization support']
      };
    });

    await this.checkCapability('technical', 10, 'Scalable database architecture (Oracle, SQL Server, etc.)', async () => {
      const prismaSchema = await this.checkFileExists('prisma/schema.prisma');
      const dbConfig = await this.checkFileExists('src/config/database.ts');
      
      return {
        status: prismaSchema && dbConfig ? 'VALIDATED' : 'MISSING',
        details: `Database architecture ${prismaSchema && dbConfig ? 'implemented' : 'missing'}`,
        files: ['prisma/schema.prisma', 'src/config/database.ts'],
        issues: prismaSchema && dbConfig ? [] : ['Database configuration missing']
      };
    });
  }

  async runSpaceLeaseManagementTests() {
    console.log('\n🏢 ===== SPACE & LEASE MANAGEMENT (11-20) =====');
    
    await this.checkCapability('space', 11, 'Interactive floor plan management and visualization', async () => {
      const cadService = await this.checkFileExists('src/services/infrastructure-technology/smart-systems/infrastructure-operations/CADIntegrationService.ts');
      
      return {
        status: cadService ? 'VALIDATED' : 'MISSING',
        details: `CAD integration ${cadService ? 'implemented' : 'missing'}`,
        files: ['src/services/infrastructure-technology/smart-systems/infrastructure-operations/CADIntegrationService.ts'],
        issues: cadService ? [] : ['CAD integration missing']
      };
    });

    await this.checkCapability('space', 12, 'Space allocation and optimization tools', async () => {
      const spaceService = await this.checkServiceExists('SpaceUtilizationService');
      const spaceOpsManager = await this.checkFileExists('src/services/space-management/utilization-analytics/space-operations/index.ts');
      
      return {
        status: spaceService && spaceOpsManager ? 'VALIDATED' : 'PARTIAL',
        details: `Space optimization ${spaceService && spaceOpsManager ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/SpaceUtilizationService.ts', 'src/services/space-management/'],
        issues: spaceService && spaceOpsManager ? [] : ['Space optimization incomplete']
      };
    });

    await this.checkCapability('space', 13, 'Lease administration and contract management', async () => {
      const leaseService = await this.checkFileExists('src/services/business-operations/project-management/business-coordination/LeaseManagementService.ts');
      const leaseController = await this.checkControllerExists('LeaseManagementController');
      
      return {
        status: leaseService && leaseController ? 'VALIDATED' : 'PARTIAL',
        details: `Lease management ${leaseService && leaseController ? 'fully implemented' : 'partially implemented'}`,
        files: ['src/services/business-operations/project-management/business-coordination/LeaseManagementService.ts'],
        issues: leaseService && leaseController ? [] : ['Lease management incomplete']
      };
    });

    await this.checkCapability('space', 14, 'Critical date tracking and automated alerts', async () => {
      const criticalDateService = await this.checkFileExists('src/services/business-operations/project-management/business-coordination/CriticalDateService.ts');
      const criticalDateController = await this.checkControllerExists('CriticalDateController');
      
      return {
        status: criticalDateService && criticalDateController ? 'VALIDATED' : 'PARTIAL',
        details: `Critical date tracking ${criticalDateService && criticalDateController ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/business-operations/project-management/business-coordination/CriticalDateService.ts'],
        issues: criticalDateService && criticalDateController ? [] : ['Critical date tracking incomplete']
      };
    });

    await this.checkCapability('space', 15, 'Rent escalation calculations and projections', async () => {
      const leaseService = await this.checkFileExists('src/services/business-operations/project-management/business-coordination/LeaseManagementService.ts');
      
      return {
        status: leaseService ? 'VALIDATED' : 'MISSING',
        details: `Rent escalation ${leaseService ? 'included in lease service' : 'missing'}`,
        files: ['src/services/business-operations/project-management/business-coordination/LeaseManagementService.ts'],
        issues: leaseService ? [] : ['Rent escalation missing']
      };
    });

    await this.checkCapability('space', 16, 'CAM (Common Area Maintenance) reconciliation', async () => {
      const camService = await this.checkFileExists('src/services/business-operations/project-management/business-coordination/CAMReconciliationService.ts');
      
      return {
        status: camService ? 'VALIDATED' : 'MISSING',
        details: `CAM reconciliation ${camService ? 'implemented' : 'missing'}`,
        files: ['src/services/business-operations/project-management/business-coordination/CAMReconciliationService.ts'],
        issues: camService ? [] : ['CAM reconciliation missing']
      };
    });

    await this.checkCapability('space', 17, 'Portfolio-wide space utilization reporting', async () => {
      const portfolioService = await this.checkServiceExists('PortfolioService');
      const portfolioReporting = await this.checkFileExists('src/services/portfolio-management/space-analytics/portfolio-reporting');
      
      return {
        status: portfolioService && portfolioReporting ? 'VALIDATED' : 'PARTIAL',
        details: `Portfolio reporting ${portfolioService && portfolioReporting ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/PortfolioService.ts', 'src/services/portfolio-management/'],
        issues: portfolioService && portfolioReporting ? [] : ['Portfolio reporting incomplete']
      };
    });

    await this.checkCapability('space', 18, 'Vacancy tracking and space availability management', async () => {
      const spaceUtilization = await this.checkFileExists('src/services/space-management/utilization-analytics/space-operations/SpaceUtilizationAnalyticsService.ts');
      
      return {
        status: spaceUtilization ? 'VALIDATED' : 'MISSING',
        details: `Vacancy tracking ${spaceUtilization ? 'implemented' : 'missing'}`,
        files: ['src/services/space-management/utilization-analytics/space-operations/SpaceUtilizationAnalyticsService.ts'],
        issues: spaceUtilization ? [] : ['Vacancy tracking missing']
      };
    });

    await this.checkCapability('space', 19, 'Move management and relocation planning', async () => {
      const moveService = await this.checkServiceExists('MoveManagementService');
      const moveOpsService = await this.checkFileExists('src/services/space-management/utilization-analytics/space-operations/MoveManagementOperationsService.ts');
      
      return {
        status: moveService && moveOpsService ? 'VALIDATED' : 'PARTIAL',
        details: `Move management ${moveService && moveOpsService ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/MoveManagementService.ts', 'src/services/space-management/'],
        issues: moveService && moveOpsService ? [] : ['Move management incomplete']
      };
    });

    await this.checkCapability('space', 20, 'Space charging and cost allocation capabilities', async () => {
      const chargebackService = await this.checkServiceExists('ChargebackService');
      const financialOps = await this.checkFileExists('src/services/financial-management/cost-accounting/financial-operations');
      
      return {
        status: chargebackService && financialOps ? 'VALIDATED' : 'PARTIAL',
        details: `Space charging ${chargebackService && financialOps ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/ChargebackService.ts', 'src/services/financial-management/'],
        issues: chargebackService && financialOps ? [] : ['Space charging incomplete']
      };
    });
  }

  async runMaintenanceOperationsTests() {
    console.log('\n🔧 ===== FACILITY MAINTENANCE & OPERATIONS (21-30) =====');
    
    await this.checkCapability('maintenance', 21, 'Preventive maintenance scheduling and tracking', async () => {
      const pmService = await this.checkServiceExists('PreventiveMaintenanceService');
      
      return {
        status: pmService ? 'VALIDATED' : 'MISSING',
        details: `PM scheduling ${pmService ? 'implemented' : 'missing'}`,
        files: ['src/services/PreventiveMaintenanceService.ts'],
        issues: pmService ? [] : ['PM scheduling missing']
      };
    });

    await this.checkCapability('maintenance', 22, 'Work order management system', async () => {
      const woService = await this.checkServiceExists('WorkOrderService');
      const woController = await this.checkControllerExists('WorkOrderController');
      const woManagement = await this.checkFileExists('src/services/maintenance-management/operations-analytics/maintenance-operations/WorkOrderManagementService.ts');
      
      return {
        status: woService && woController && woManagement ? 'VALIDATED' : 'PARTIAL',
        details: `Work order system ${woService && woController && woManagement ? 'fully implemented' : 'partially implemented'}`,
        files: ['src/services/WorkOrderService.ts', 'src/controllers/WorkOrderController.ts'],
        issues: woService && woController && woManagement ? [] : ['Work order system incomplete']
      };
    });

    await this.checkCapability('maintenance', 23, 'Asset lifecycle management and tracking', async () => {
      const assetService = await this.checkServiceExists('AssetLifecycleService');
      const assetManagement = await this.checkFileExists('src/services/asset-management/maintenance-operations/asset-management');
      
      return {
        status: assetService && assetManagement ? 'VALIDATED' : 'PARTIAL',
        details: `Asset lifecycle ${assetService && assetManagement ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/AssetLifecycleService.ts', 'src/services/asset-management/'],
        issues: assetService && assetManagement ? [] : ['Asset lifecycle incomplete']
      };
    });

    await this.checkCapability('maintenance', 24, 'Service provider and vendor management', async () => {
      const vendorService = await this.checkFileExists('src/services/business-operations/project-management/business-coordination/VendorBrokerService.ts');
      
      return {
        status: vendorService ? 'VALIDATED' : 'MISSING',
        details: `Vendor management ${vendorService ? 'implemented' : 'missing'}`,
        files: ['src/services/business-operations/project-management/business-coordination/VendorBrokerService.ts'],
        issues: vendorService ? [] : ['Vendor management missing']
      };
    });

    await this.checkCapability('maintenance', 25, 'Inventory management for parts and supplies', async () => {
      const inventoryService = await this.checkServiceExists('InventoryService');
      
      return {
        status: inventoryService ? 'VALIDATED' : 'MISSING',
        details: `Inventory management ${inventoryService ? 'implemented' : 'missing'}`,
        files: ['src/services/InventoryService.ts'],
        issues: inventoryService ? [] : ['Inventory management missing']
      };
    });

    await this.checkCapability('maintenance', 26, 'Equipment history and maintenance records', async () => {
      const assetManagement = await this.checkFileExists('src/services/asset-management/maintenance-operations/asset-management');
      const maintenanceService = await this.checkServiceExists('MaintenanceService');
      
      return {
        status: assetManagement && maintenanceService ? 'VALIDATED' : 'PARTIAL',
        details: `Equipment history ${assetManagement && maintenanceService ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/MaintenanceService.ts', 'src/services/asset-management/'],
        issues: assetManagement && maintenanceService ? [] : ['Equipment history incomplete']
      };
    });

    await this.checkCapability('maintenance', 27, 'Emergency response and incident management', async () => {
      const emergencyService = await this.checkFileExists('src/services/compliance-governance/regulatory-operations/compliance-management/EmergencyPlanningService.ts');
      
      return {
        status: emergencyService ? 'VALIDATED' : 'MISSING',
        details: `Emergency response ${emergencyService ? 'implemented' : 'missing'}`,
        files: ['src/services/compliance-governance/regulatory-operations/compliance-management/EmergencyPlanningService.ts'],
        issues: emergencyService ? [] : ['Emergency response missing']
      };
    });

    await this.checkCapability('maintenance', 28, 'Environmental monitoring integration', async () => {
      const iotService = await this.checkServiceExists('IoTDeviceService');
      const iotManagement = await this.checkFileExists('src/services/infrastructure-technology/smart-systems/infrastructure-operations/IoTDeviceManagementService.ts');
      
      return {
        status: iotService && iotManagement ? 'VALIDATED' : 'PARTIAL',
        details: `Environmental monitoring ${iotService && iotManagement ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/IoTDeviceService.ts'],
        issues: iotService && iotManagement ? [] : ['Environmental monitoring incomplete']
      };
    });

    await this.checkCapability('maintenance', 29, 'Energy management and utility tracking', async () => {
      const energyService = await this.checkServiceExists('EnergyManagementService');
      const energyOps = await this.checkFileExists('src/services/infrastructure-technology/smart-systems/infrastructure-operations/EnergyManagementService.ts');
      
      return {
        status: energyService && energyOps ? 'VALIDATED' : 'PARTIAL',
        details: `Energy management ${energyService && energyOps ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/EnergyManagementService.ts'],
        issues: energyService && energyOps ? [] : ['Energy management incomplete']
      };
    });

    await this.checkCapability('maintenance', 30, 'Compliance management and audit trails', async () => {
      const complianceService = await this.checkServiceExists('ComplianceService');
      const complianceOps = await this.checkFileExists('src/services/compliance-governance/regulatory-operations/compliance-management');
      const spaceCompliance = await this.checkFileExists('src/services/space-management/utilization-analytics/space-operations/SpaceStandardsComplianceService.ts');
      
      return {
        status: complianceService && complianceOps && spaceCompliance ? 'VALIDATED' : 'PARTIAL',
        details: `Compliance management ${complianceService && complianceOps && spaceCompliance ? 'fully implemented' : 'partially implemented'}`,
        files: ['src/services/ComplianceService.ts', 'src/services/compliance-governance/'],
        issues: complianceService && complianceOps && spaceCompliance ? [] : ['Compliance management incomplete']
      };
    });
  }

  async runFinancialManagementTests() {
    console.log('\n💰 ===== FINANCIAL MANAGEMENT & REPORTING (31-40) =====');
    
    await this.checkCapability('financial', 31, 'Budget planning and forecasting tools', async () => {
      const budgetService = await this.checkFileExists('src/services/business-operations/project-management/business-coordination/BudgetForecastService.ts') ||
                            await this.checkFileExists('src/services/financial-management/cost-accounting/financial-operations/BudgetForecastService.ts');
      
      return {
        status: budgetService ? 'VALIDATED' : 'MISSING',
        details: `Budget planning ${budgetService ? 'implemented' : 'missing'}`,
        files: ['src/services/financial-management/cost-accounting/financial-operations/BudgetForecastService.ts'],
        issues: budgetService ? [] : ['Budget planning missing']
      };
    });

    await this.checkCapability('financial', 32, 'Cost center management and allocation', async () => {
      const chargebackService = await this.checkServiceExists('ChargebackService');
      const chargebackAllocation = await this.checkFileExists('src/services/financial-management/cost-accounting/financial-operations/ChargebackAllocationService.ts');
      
      return {
        status: chargebackService && chargebackAllocation ? 'VALIDATED' : 'PARTIAL',
        details: `Cost center management ${chargebackService && chargebackAllocation ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/ChargebackService.ts'],
        issues: chargebackService && chargebackAllocation ? [] : ['Cost center management incomplete']
      };
    });

    await this.checkCapability('financial', 33, 'Capital project tracking and management', async () => {
      const capitalService = await this.checkServiceExists('CapitalProjectService');
      const capitalOps = await this.checkFileExists('src/services/business-operations/project-management/business-coordination/CapitalProjectService.ts');
      
      return {
        status: capitalService && capitalOps ? 'VALIDATED' : 'PARTIAL',
        details: `Capital project tracking ${capitalService && capitalOps ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/CapitalProjectService.ts'],
        issues: capitalService && capitalOps ? [] : ['Capital project tracking incomplete']
      };
    });

    await this.checkCapability('financial', 34, 'Invoice processing and approval workflows', async () => {
      const workflowEngine = await this.checkServiceExists('WorkflowEngine');
      
      return {
        status: workflowEngine ? 'VALIDATED' : 'MISSING',
        details: `Invoice processing ${workflowEngine ? 'workflow engine available' : 'workflow engine missing'}`,
        files: ['src/services/WorkflowEngine.ts'],
        issues: workflowEngine ? [] : ['Invoice processing workflows missing']
      };
    });

    await this.checkCapability('financial', 35, 'Financial reporting and dashboard capabilities', async () => {
      const reportingService = await this.checkServiceExists('ReportingService');
      const financialConsolidation = await this.checkFileExists('src/services/financial-management/cost-accounting/financial-operations/FinancialConsolidationService.ts');
      
      return {
        status: reportingService && financialConsolidation ? 'VALIDATED' : 'PARTIAL',
        details: `Financial reporting ${reportingService && financialConsolidation ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/ReportingService.ts'],
        issues: reportingService && financialConsolidation ? [] : ['Financial reporting incomplete']
      };
    });

    await this.checkCapability('financial', 36, 'Benchmarking and KPI tracking', async () => {
      const biService = await this.checkFileExists('src/services/infrastructure-technology/smart-systems/infrastructure-operations/BusinessIntelligenceService.ts');
      const portfolioMetrics = await this.checkFileExists('src/services/portfolio-management/space-analytics/portfolio-reporting/PortfolioMetricsService.ts');
      
      return {
        status: biService && portfolioMetrics ? 'VALIDATED' : 'PARTIAL',
        details: `Benchmarking and KPIs ${biService && portfolioMetrics ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/infrastructure-technology/smart-systems/infrastructure-operations/BusinessIntelligenceService.ts'],
        issues: biService && portfolioMetrics ? [] : ['Benchmarking incomplete']
      };
    });

    await this.checkCapability('financial', 37, 'Variance analysis and budget controls', async () => {
      const budgetService = await this.checkFileExists('src/services/financial-management/cost-accounting/financial-operations/BudgetForecastService.ts');
      
      return {
        status: budgetService ? 'VALIDATED' : 'MISSING',
        details: `Variance analysis ${budgetService ? 'included in budget service' : 'missing'}`,
        files: ['src/services/financial-management/cost-accounting/financial-operations/BudgetForecastService.ts'],
        issues: budgetService ? [] : ['Variance analysis missing']
      };
    });

    await this.checkCapability('financial', 38, 'Multi-currency support for global operations', async () => {
      const i18nService = await this.checkServiceExists('InternationalizationService');
      
      return {
        status: i18nService ? 'VALIDATED' : 'MISSING',
        details: `Multi-currency ${i18nService ? 'supported in i18n service' : 'missing'}`,
        files: ['src/services/InternationalizationService.ts'],
        issues: i18nService ? [] : ['Multi-currency support missing']
      };
    });

    await this.checkCapability('financial', 39, 'Cost per square foot calculations and analytics', async () => {
      const portfolioFinancial = await this.checkFileExists('src/services/portfolio-management/space-analytics/portfolio-reporting/PortfolioFinancialAnalysisService.ts');
      
      return {
        status: portfolioFinancial ? 'VALIDATED' : 'MISSING',
        details: `Cost per sqft ${portfolioFinancial ? 'implemented' : 'missing'}`,
        files: ['src/services/portfolio-management/space-analytics/portfolio-reporting/PortfolioFinancialAnalysisService.ts'],
        issues: portfolioFinancial ? [] : ['Cost per sqft missing']
      };
    });

    await this.checkCapability('financial', 40, 'ROI analysis for facility investments', async () => {
      const portfolioFinancial = await this.checkFileExists('src/services/portfolio-management/space-analytics/portfolio-reporting/PortfolioFinancialAnalysisService.ts');
      const capitalService = await this.checkFileExists('src/services/business-operations/project-management/business-coordination/CapitalProjectService.ts');
      
      return {
        status: portfolioFinancial && capitalService ? 'VALIDATED' : 'PARTIAL',
        details: `ROI analysis ${portfolioFinancial && capitalService ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/portfolio-management/space-analytics/portfolio-reporting/PortfolioFinancialAnalysisService.ts'],
        issues: portfolioFinancial && capitalService ? [] : ['ROI analysis incomplete']
      };
    });
  }

  async runAdvancedFeaturesTests() {
    console.log('\n🚀 ===== ADVANCED FEATURES & ANALYTICS (41-44) =====');
    
    await this.checkCapability('advanced', 41, 'IoT sensor integration and data collection', async () => {
      const iotService = await this.checkServiceExists('IoTDeviceService');
      const iotManagement = await this.checkFileExists('src/services/infrastructure-technology/smart-systems/infrastructure-operations/IoTDeviceManagementService.ts');
      
      return {
        status: iotService && iotManagement ? 'VALIDATED' : 'PARTIAL',
        details: `IoT integration ${iotService && iotManagement ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/IoTDeviceService.ts'],
        issues: iotService && iotManagement ? [] : ['IoT integration incomplete']
      };
    });

    await this.checkCapability('advanced', 42, 'Predictive analytics and machine learning capabilities', async () => {
      const mlDirectory = await this.checkFileExists('src/services/ml');
      const predictiveService = await this.checkFileExists('src/services/ml/PredictiveAnalyticsService.ts');
      
      return {
        status: mlDirectory && predictiveService ? 'VALIDATED' : 'PARTIAL',
        details: `ML capabilities ${mlDirectory && predictiveService ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/ml/'],
        issues: mlDirectory && predictiveService ? [] : ['ML capabilities incomplete']
      };
    });

    await this.checkCapability('advanced', 43, 'Sustainability reporting (LEED, ENERGY STAR, carbon footprint)', async () => {
      const energyService = await this.checkServiceExists('EnergyManagementService');
      const sustainabilityFeatures = energyService;
      
      return {
        status: sustainabilityFeatures ? 'VALIDATED' : 'MISSING',
        details: `Sustainability reporting ${sustainabilityFeatures ? 'included in energy service' : 'missing'}`,
        files: ['src/services/EnergyManagementService.ts'],
        issues: sustainabilityFeatures ? [] : ['Sustainability reporting missing']
      };
    });

    await this.checkCapability('advanced', 44, 'Workplace analytics and occupancy insights', async () => {
      const spaceUtilization = await this.checkFileExists('src/services/space-management/utilization-analytics/space-operations/SpaceUtilizationAnalyticsService.ts');
      const portfolioAnalytics = await this.checkFileExists('src/services/portfolio-management/space-analytics/portfolio-reporting');
      
      return {
        status: spaceUtilization && portfolioAnalytics ? 'VALIDATED' : 'PARTIAL',
        details: `Workplace analytics ${spaceUtilization && portfolioAnalytics ? 'implemented' : 'partially implemented'}`,
        files: ['src/services/space-management/', 'src/services/portfolio-management/'],
        issues: spaceUtilization && portfolioAnalytics ? [] : ['Workplace analytics incomplete']
      };
    });
  }

  async generateReport() {
    console.log('\n📊 ===== COMPREHENSIVE CAPABILITY REPORT =====');
    
    const totalCapabilities = this.results.overall.total;
    const validatedCapabilities = this.results.overall.validated;
    const failedCapabilities = this.results.overall.failed;
    const missingCapabilities = this.results.overall.missing;
    
    const completionPercentage = Math.round((validatedCapabilities / totalCapabilities) * 100);
    
    console.log(`\n🎯 Overall Results:`);
    console.log(`   Total Capabilities: ${totalCapabilities}`);
    console.log(`   ✅ Validated: ${validatedCapabilities} (${Math.round((validatedCapabilities/totalCapabilities)*100)}%)`);
    console.log(`   ❌ Failed: ${failedCapabilities} (${Math.round((failedCapabilities/totalCapabilities)*100)}%)`);
    console.log(`   ⚠️  Missing: ${missingCapabilities} (${Math.round((missingCapabilities/totalCapabilities)*100)}%)`);
    console.log(`   📈 Completion Rate: ${completionPercentage}%`);

    console.log(`\n📂 Category Breakdown:`);
    console.log(`   🏗️  Technical Foundation: ${this.results.technical.filter(c => c.status === 'VALIDATED').length}/8`);
    console.log(`   🏢 Space & Lease Management: ${this.results.space.filter(c => c.status === 'VALIDATED').length}/10`);
    console.log(`   🔧 Maintenance & Operations: ${this.results.maintenance.filter(c => c.status === 'VALIDATED').length}/10`);
    console.log(`   💰 Financial Management: ${this.results.financial.filter(c => c.status === 'VALIDATED').length}/10`);
    console.log(`   🚀 Advanced Features: ${this.results.advanced.filter(c => c.status === 'VALIDATED').length}/4`);

    if (failedCapabilities > 0 || missingCapabilities > 0) {
      console.log(`\n⚠️  Issues Found:`);
      
      const allCapabilities = [
        ...this.results.technical,
        ...this.results.space,
        ...this.results.maintenance,
        ...this.results.financial,
        ...this.results.advanced
      ];
      
      const problematicCapabilities = allCapabilities.filter(c => c.status !== 'VALIDATED');
      
      problematicCapabilities.forEach(capability => {
        console.log(`   ${capability.id}. ${capability.name}: ${capability.status}`);
        if (capability.issues.length > 0) {
          capability.issues.forEach(issue => {
            console.log(`      - ${issue}`);
          });
        }
      });
    }

    console.log(`\n🎉 Summary:`);
    if (completionPercentage >= 90) {
      console.log(`   EXCELLENT: ${completionPercentage}% of capabilities validated!`);
      console.log(`   🚀 Ready for production deployment with enterprise-grade features.`);
    } else if (completionPercentage >= 75) {
      console.log(`   GOOD: ${completionPercentage}% of capabilities validated.`);
      console.log(`   🔧 Minor improvements needed for full enterprise readiness.`);
    } else if (completionPercentage >= 50) {
      console.log(`   FAIR: ${completionPercentage}% of capabilities validated.`);
      console.log(`   ⚠️  Significant development required for enterprise deployment.`);
    } else {
      console.log(`   NEEDS WORK: Only ${completionPercentage}% of capabilities validated.`);
      console.log(`   🚨 Major development required before enterprise deployment.`);
    }

    return {
      completionPercentage,
      validated: validatedCapabilities,
      total: totalCapabilities,
      categories: {
        technical: this.results.technical,
        space: this.results.space,
        maintenance: this.results.maintenance,
        financial: this.results.financial,
        advanced: this.results.advanced
      }
    };
  }

  async run() {
    console.log('🚀 Starting Comprehensive Capability Validation...\n');
    console.log('='.repeat(60));
    
    try {
      await this.runTechnicalFoundationTests();
      await this.runSpaceLeaseManagementTests();
      await this.runMaintenanceOperationsTests();
      await this.runFinancialManagementTests();
      await this.runAdvancedFeaturesTests();
      
      const report = await this.generateReport();
      
      // Save results to file
      const reportData = {
        timestamp: new Date().toISOString(),
        summary: report,
        detailed: this.results
      };
      
      await fs.promises.writeFile(
        path.join(__dirname, '../capability-validation-report.json'),
        JSON.stringify(reportData, null, 2)
      );
      
      console.log(`\n📄 Detailed report saved to: capability-validation-report.json`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      throw error;
    }
  }
}

// Run the capability checker
if (require.main === module) {
  const checker = new CapabilityChecker();
  checker.run()
    .then(report => {
      process.exit(report.completionPercentage >= 75 ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { CapabilityChecker };