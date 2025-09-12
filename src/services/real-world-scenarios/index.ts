/**
 * Real-World Scenarios Index
 * Exports all real-world business logic services for Phase 3 implementation
 */

export { CorporateRealEstateManagementService } from './CorporateRealEstateManagementService';
export { EnterpriseMoveManagementService } from './EnterpriseMoveManagementService';
export { AdvancedChargebackCostAllocationService } from './AdvancedChargebackCostAllocationService';
export { Phase3RealWorldBusinessLogicIntegrationService } from './Phase3RealWorldBusinessLogicIntegrationService';

// Initialize services for immediate use
const corporateRealEstateService = new CorporateRealEstateManagementService();
const moveManagementService = new EnterpriseMoveManagementService();
const chargebackService = new AdvancedChargebackCostAllocationService();
const integrationService = new Phase3RealWorldBusinessLogicIntegrationService();

export const realWorldServices = {
  corporateRealEstate: corporateRealEstateService,
  moveManagement: moveManagementService,
  chargeback: chargebackService,
  integration: integrationService
};

// Export service instances for direct use
export {
  corporateRealEstateService,
  moveManagementService,
  chargebackService,
  integrationService
};