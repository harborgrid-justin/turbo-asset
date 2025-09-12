import { AssetLifecycleService, AssetLifecycleData, DepreciationCalculation } from '../../src/services/AssetLifecycleService';
import { createTestOrganization, createTestUser, testDb } from '../setup';

describe('AssetLifecycleService', () => {
  let service: AssetLifecycleService;
  let organizationId: string;
  let userId: string;
  let assetId: string;

  beforeEach(async () => {
    service = new AssetLifecycleService();
    
    const organization = await createTestOrganization();
    organizationId = organization.id;
    
    const user = await createTestUser(organizationId);
    userId = user.id;

    // Create a test asset in the database
    const property = await testDb.property.create({
      data: {
        name: 'Test Property',
        type: 'OFFICE',
        address: { street: '123 Test St', city: 'Test City', state: 'TS', zip: '12345' },
        organizationId,
      },
    });

    const building = await testDb.building.create({
      data: {
        name: 'Test Building',
        propertyId: property.id,
      },
    });

    const asset = await testDb.maintenanceAsset.create({
      data: {
        assetNumber: 'TEST-001',
        name: 'Test Asset',
        category: 'EQUIPMENT',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        purchasePrice: 10000,
        currentValue: 10000,
        purchaseDate: new Date('2020-01-01'),
        usefulLifeYears: 5,
        organizationId,
        createdBy: userId,
      },
    });

    assetId = asset.id;
  });

  describe('calculateDepreciation', () => {
    it('should calculate straight-line depreciation correctly', async () => {
      const lifecycleData: AssetLifecycleData = {
        assetId,
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLife: 5,
        salvageValue: 1000,
        purchasePrice: 10000,
        purchaseDate: new Date('2020-01-01'),
        organizationId,
        updatedBy: userId,
      };

      const depreciations = await service.calculateDepreciation(lifecycleData);

      expect(depreciations).toHaveLength(5);
      expect(depreciations[0].depreciationAmount).toBe(1800); // (10000 - 1000) / 5
      expect(depreciations[0].year).toBe(2020);
      expect(depreciations[4].endingValue).toBe(1000); // Should equal salvage value
    });

    it('should calculate declining balance depreciation correctly', async () => {
      const lifecycleData: AssetLifecycleData = {
        assetId,
        depreciationMethod: 'DECLINING_BALANCE',
        usefulLife: 5,
        salvageValue: 1000,
        purchasePrice: 10000,
        purchaseDate: new Date('2020-01-01'),
        organizationId,
        updatedBy: userId,
      };

      const depreciations = await service.calculateDepreciation(lifecycleData);

      expect(depreciations).toHaveLength(5);
      expect(depreciations[0].depreciationAmount).toBeGreaterThan(0);
      expect(depreciations[0].year).toBe(2020);
      
      // Each year's depreciation should be less than the previous
      expect(depreciations[1].depreciationAmount).toBeLessThan(depreciations[0].depreciationAmount);
    });

    it('should store depreciation records in database', async () => {
      const lifecycleData: AssetLifecycleData = {
        assetId,
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLife: 5,
        salvageValue: 1000,
        purchasePrice: 10000,
        purchaseDate: new Date('2020-01-01'),
        organizationId,
        updatedBy: userId,
      };

      await service.calculateDepreciation(lifecycleData);

      // Verify records were created in database
      const depreciationRecords = await testDb.assetDepreciation.findMany({
        where: { assetId },
        orderBy: { depreciationYear: 'asc' },
      });

      expect(depreciationRecords).toHaveLength(5);
      expect(depreciationRecords[0].method).toBe('STRAIGHT_LINE');
      expect(depreciationRecords[0].depreciationAmount).toBe(1800);
    });

    it('should update asset current value after depreciation calculation', async () => {
      const lifecycleData: AssetLifecycleData = {
        assetId,
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLife: 5,
        salvageValue: 1000,
        purchasePrice: 10000,
        purchaseDate: new Date('2020-01-01'),
        organizationId,
        updatedBy: userId,
      };

      await service.calculateDepreciation(lifecycleData);

      // Verify asset current value was updated
      const updatedAsset = await testDb.maintenanceAsset.findUnique({
        where: { id: assetId },
      });

      expect(updatedAsset?.currentValue).toBe(1000); // Should equal ending value of last year
    });

    it('should handle invalid depreciation method', async () => {
      const lifecycleData: AssetLifecycleData = {
        assetId,
        depreciationMethod: 'INVALID_METHOD',
        usefulLife: 5,
        salvageValue: 1000,
        purchasePrice: 10000,
        purchaseDate: new Date('2020-01-01'),
        organizationId,
        updatedBy: userId,
      };

      await expect(service.calculateDepreciation(lifecycleData))
        .rejects.toThrow('Unsupported depreciation method');
    });
  });

  describe('generateReplacementPlan', () => {
    beforeEach(async () => {
      // Create an older asset that needs replacement
      await testDb.maintenanceAsset.create({
        data: {
          assetNumber: 'OLD-001',
          name: 'Old Asset',
          category: 'EQUIPMENT',
          manufacturer: 'Old Manufacturer',
          model: 'Old Model',
          purchasePrice: 5000,
          currentValue: 500,
          purchaseDate: new Date('2015-01-01'),
          usefulLifeYears: 5,
          condition: 'POOR',
          organizationId,
          createdBy: userId,
        },
      });
    });

    it('should generate replacement plan for assets', async () => {
      const replacementPlan = await service.generateReplacementPlan(organizationId, 5);

      expect(replacementPlan).toBeInstanceOf(Array);
      expect(replacementPlan.length).toBeGreaterThan(0);

      const oldAsset = replacementPlan.find(plan => plan.assetName === 'Old Asset');
      expect(oldAsset).toBeDefined();
      expect(oldAsset?.priority).toBe('HIGH');
      expect(oldAsset?.currentAge).toBeGreaterThan(5);
    });

    it('should filter replacement plan by category', async () => {
      const replacementPlan = await service.generateReplacementPlan(
        organizationId,
        5,
        { category: 'EQUIPMENT' }
      );

      expect(replacementPlan).toBeInstanceOf(Array);
      // All assets should be EQUIPMENT category
      replacementPlan.forEach(plan => {
        expect(plan).toHaveProperty('assetName');
        expect(plan).toHaveProperty('priority');
      });
    });

    it('should calculate correct business impact and risk', async () => {
      const replacementPlan = await service.generateReplacementPlan(organizationId, 5);

      replacementPlan.forEach(plan => {
        expect(plan).toHaveProperty('businessImpact');
        expect(plan).toHaveProperty('riskOfFailure');
        expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(plan.businessImpact);
        expect(plan.riskOfFailure).toBeGreaterThanOrEqual(0);
        expect(plan.riskOfFailure).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('calculateLifecycleMetrics', () => {
    it('should calculate accurate lifecycle metrics', async () => {
      const metrics = await service.calculateLifecycleMetrics(organizationId);

      expect(metrics).toHaveProperty('totalAssetValue');
      expect(metrics).toHaveProperty('totalDepreciation');
      expect(metrics).toHaveProperty('averageAssetAge');
      expect(metrics).toHaveProperty('assetsNearingReplacement');

      expect(metrics.totalAssetValue).toBeGreaterThan(0);
      expect(metrics.averageAssetAge).toBeGreaterThanOrEqual(0);
      expect(metrics.assetsNearingReplacement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle assets with zero purchase price', async () => {
      const lifecycleData: AssetLifecycleData = {
        assetId,
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLife: 5,
        salvageValue: 0,
        purchasePrice: 0,
        purchaseDate: new Date('2020-01-01'),
        organizationId,
        updatedBy: userId,
      };

      const depreciations = await service.calculateDepreciation(lifecycleData);
      expect(depreciations).toHaveLength(5);
      depreciations.forEach(dep => {
        expect(dep.depreciationAmount).toBe(0);
      });
    });

    it('should handle future purchase dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const lifecycleData: AssetLifecycleData = {
        assetId,
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLife: 5,
        salvageValue: 1000,
        purchasePrice: 10000,
        purchaseDate: futureDate,
        organizationId,
        updatedBy: userId,
      };

      const depreciations = await service.calculateDepreciation(lifecycleData);
      expect(depreciations).toHaveLength(0); // No depreciation for future assets
    });

    it('should handle non-existent organization', async () => {
      const fakeOrgId = 'non-existent-org-id';
      const metrics = await service.calculateLifecycleMetrics(fakeOrgId);

      expect(metrics.totalAssetValue).toBe(0);
      expect(metrics.totalDepreciation).toBe(0);
      expect(metrics.averageAssetAge).toBe(0);
      expect(metrics.assetsNearingReplacement).toBe(0);
    });
  });
});