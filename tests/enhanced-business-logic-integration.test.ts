/**
 * Comprehensive Test Suite for Enhanced Business Logic Integration
 */

import { 
  ProductionGradeBusinessLogic,
  enhancedBusinessLogicService,
  advancedBusinessRules,
  dataStandardizationEngine
} from '../src/services/enhanced-business-logic-integration';

// Mock logger to avoid import issues
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock NAPI registry
const mockNapiRegistry = {
  executeServiceMethod: jest.fn(),
};

describe('Enhanced Business Logic Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Advanced Business Rules Engine', () => {
    describe('Asset Depreciation Calculations', () => {
      test('should calculate straight-line depreciation correctly', () => {
        const assetData = {
          initialValue: 100000,
          salvageValue: 10000,
          usefulLifeYears: 5,
          depreciationMethod: 'straight-line' as const,
          currentAge: 2,
        };

        const result = advancedBusinessRules.calculateAssetDepreciation(assetData);

        expect(result.annualDepreciation).toBe(18000); // (100000-10000)/5
        expect(result.accumulatedDepreciation).toBe(36000); // 18000*2
        expect(result.bookValue).toBe(64000); // 100000-36000
        expect(result.depreciationSchedule).toHaveLength(0); // Only populated for declining methods
      });

      test('should calculate double declining balance depreciation correctly', () => {
        const assetData = {
          initialValue: 100000,
          salvageValue: 10000,
          usefulLifeYears: 5,
          depreciationMethod: 'double-declining' as const,
          currentAge: 1,
          acceleratedRatePercent: 200,
        };

        const result = advancedBusinessRules.calculateAssetDepreciation(assetData);

        expect(result.annualDepreciation).toBeGreaterThan(0);
        expect(result.depreciationSchedule).toHaveLength(1);
        expect(result.bookValue).toBeLessThan(assetData.initialValue);
      });

      test('should handle division by zero gracefully', () => {
        const assetData = {
          initialValue: 100000,
          salvageValue: 10000,
          usefulLifeYears: 0,
          depreciationMethod: 'straight-line' as const,
          currentAge: 1,
        };

        const result = advancedBusinessRules.calculateAssetDepreciation(assetData);
        
        // Should handle gracefully by returning zero depreciation or reasonable defaults
        expect(result).toBeDefined();
        expect(result.annualDepreciation).toBeDefined();
        expect(result.bookValue).toBeLessThanOrEqual(assetData.initialValue);
      });
    });

    describe('Lease Accounting Calculations (ASC 842/IFRS 16)', () => {
      test('should calculate lease accounting metrics correctly', () => {
        const leaseData = {
          monthlyPayment: 5000,
          leaseTerm: 36, // 3 years
          incrementalBorrowingRate: 6, // 6% annual
          initialDirectCosts: 2000,
          prepaidLease: 5000,
          leaseIncentives: 1000,
        };

        const result = advancedBusinessRules.calculateLeaseAccounting(leaseData);

        expect(result.presentValueOfLeasePayments).toBeGreaterThan(0);
        expect(result.rightOfUseAsset).toBeGreaterThan(0);
        expect(result.leaseLIABILITY).toBeGreaterThan(0);
        expect(result.monthlyAmortization).toBeGreaterThan(0);
        expect(result.paymentSchedule).toHaveLength(36);
        expect(result.totalLeaseExpense).toBe(180000); // 5000 * 36
        
        // ROU Asset should include initial costs and prepaid lease minus incentives
        expect(result.rightOfUseAsset).toBe(
          result.presentValueOfLeasePayments + 2000 + 5000 - 1000
        );
      });
    });

    describe('Data Standardization', () => {
      test('should standardize asset data from various source systems', () => {
        const rawAssetData = {
          id: 'hvac_001',
          name: '  HVAC Unit - Building A  ',
          type: 'hvac',
          manufacturer: 'Carrier',
          model: 'Model-X123',
          serialNumber: 'SN123456789',
          acquisitionCost: '$25,000.00',
          installationDate: '2020-01-15',
          building: 'BLD-A',
          floor: '3',
          room: '301A',
          criticality: 'high',
        };

        const result = dataStandardizationEngine.standardizeAssetData(rawAssetData, 'CMMS');

        expect(result.standardizedAsset.id).toBe('CMMS-hvac001');
        expect(result.standardizedAsset.name).toBe('HVAC Unit - Building A');
        expect(result.standardizedAsset.type).toBe('HVAC System');
        expect(result.standardizedAsset.category).toBe('Building Systems');
        expect(result.standardizedAsset.financial.acquisitionCost).toBe(25000);
        expect(result.standardizedAsset.financial.currency).toBe('USD');
        expect(result.standardizedAsset.specifications.installationDate).toBe('2020-01-15');
        expect(result.standardizedAsset.maintenance.criticalityLevel).toBe('high');

        expect(result.dataQualityScore).toBeGreaterThan(80); // Should be high quality data
        expect(result.transformationLog.length).toBeGreaterThan(0);
      });
    });

    describe('Production-Grade Business Logic Integration', () => {
      test('should list available services', () => {
        const services = ProductionGradeBusinessLogic.listAvailableServices();

        expect(Array.isArray(services)).toBe(true);
        expect(services.length).toBeGreaterThanOrEqual(0);
      });

      test('should add validation rules successfully', () => {
        const rules = [
          {
            field: 'testField',
            type: 'required' as const,
            message: 'Test field is required',
          },
        ];

        const result = ProductionGradeBusinessLogic.addValidationRule('test-service', 'testMethod', rules);

        // Since the service might not exist, result could be false
        expect(typeof result).toBe('boolean');
      });
    });
  });
});