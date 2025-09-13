import { Asset, AssetType, AssetCondition, AssetStatus } from '@prisma/client';
import { createTestOrganization, createTestUser, testDb } from '../setup';

describe('Asset Model', () => {
  let organizationId: string;
  let userId: string;
  let propertyId: string;
  let buildingId: string;

  beforeEach(async () => {
    const organization = await createTestOrganization();
    organizationId = organization.id;
    
    const user = await createTestUser(organizationId);
    userId = user.id;

    // Create property and building for asset relationships
    const property = await testDb.property.create({
      data: {
        name: 'Test Property',
        type: 'OFFICE',
        address: { street: '123 Test St', city: 'Test City', state: 'TS', zip: '12345' },
        organizationId,
      },
    });
    propertyId = property.id;

    const building = await testDb.building.create({
      data: {
        name: 'Test Building',
        propertyId: property.id,
      },
    });
    buildingId = building.id;
  });

  describe('Asset Creation', () => {
    it('should create a new asset with required fields', async () => {
      const assetData = {
        name: 'Test Laptop',
        assetTag: 'LT-001',
        type: AssetType.TECHNOLOGY,
        manufacturer: 'Dell',
        model: 'Latitude 7420',
        serialNumber: 'DL123456',
        purchaseDate: new Date('2023-01-15'),
        purchasePrice: 1500.00,
        currency: 'USD',
        condition: AssetCondition.EXCELLENT,
        status: AssetStatus.ACTIVE,
        buildingId,
      };

      const asset = await testDb.asset.create({
        data: assetData,
      });

      expect(asset).toBeDefined();
      expect(asset.id).toBeDefined();
      expect(asset.name).toBe(assetData.name);
      expect(asset.assetTag).toBe(assetData.assetTag);
      expect(asset.type).toBe(assetData.type);
      expect(asset.manufacturer).toBe(assetData.manufacturer);
      expect(asset.model).toBe(assetData.model);
      expect(asset.serialNumber).toBe(assetData.serialNumber);
      expect(asset.purchasePrice).toBe(assetData.purchasePrice);
      expect(asset.condition).toBe(assetData.condition);
      expect(asset.status).toBe(assetData.status);
      expect(asset.buildingId).toBe(buildingId);
      expect(asset.isActive).toBe(true);
      expect(asset.createdAt).toBeDefined();
      expect(asset.updatedAt).toBeDefined();
    });

    it('should enforce unique asset tag constraint', async () => {
      const assetData = {
        name: 'Test Asset 1',
        assetTag: 'UNIQUE-001',
        type: AssetType.EQUIPMENT,
      };

      // Create first asset
      await testDb.asset.create({
        data: { ...assetData, name: 'First Asset' },
      });

      // Attempt to create second asset with same tag
      await expect(
        testDb.asset.create({
          data: { ...assetData, name: 'Second Asset' },
        })
      ).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const minimumAssetData = {
        name: 'Minimal Asset',
        assetTag: 'MIN-001',
        type: AssetType.FURNITURE,
      };

      const asset = await testDb.asset.create({
        data: minimumAssetData,
      });

      expect(asset.condition).toBe(AssetCondition.GOOD);
      expect(asset.status).toBe(AssetStatus.ACTIVE);
      expect(asset.currency).toBe('USD');
      expect(asset.isActive).toBe(true);
    });
  });

  describe('Asset Relationships', () => {
    let assetId: string;

    beforeEach(async () => {
      const asset = await testDb.asset.create({
        data: {
          name: 'Test Asset for Relationships',
          assetTag: 'REL-001',
          type: AssetType.EQUIPMENT,
          buildingId,
        },
      });
      assetId = asset.id;
    });

    it('should establish relationship with building', async () => {
      const asset = await testDb.asset.findUnique({
        where: { id: assetId },
        include: { building: true },
      });

      expect(asset).toBeDefined();
      expect(asset?.building).toBeDefined();
      expect(asset?.building?.name).toBe('Test Building');
      expect(asset?.building?.propertyId).toBe(propertyId);
    });

    it('should support asset hierarchy (parent-child relationships)', async () => {
      const childAsset = await testDb.asset.create({
        data: {
          name: 'Child Asset',
          assetTag: 'CHILD-001',
          type: AssetType.TECHNOLOGY,
          parentAssetId: assetId,
        },
      });

      const parentAsset = await testDb.asset.findUnique({
        where: { id: assetId },
        include: { subAssets: true },
      });

      const childAssetWithParent = await testDb.asset.findUnique({
        where: { id: childAsset.id },
        include: { parentAsset: true },
      });

      expect(parentAsset?.subAssets).toHaveLength(1);
      expect(parentAsset?.subAssets[0].name).toBe('Child Asset');
      expect(childAssetWithParent?.parentAsset?.name).toBe('Test Asset for Relationships');
    });

    it('should support maintenance records relationship', async () => {
      const maintenanceRecord = await testDb.maintenanceRecord.create({
        data: {
          type: 'PREVENTIVE',
          description: 'Regular maintenance check',
          scheduledDate: new Date(),
          cost: 150.00,
          currency: 'USD',
          status: 'SCHEDULED',
          assetId: assetId,
        },
      });

      const assetWithMaintenance = await testDb.asset.findUnique({
        where: { id: assetId },
        include: { maintenanceRecords: true },
      });

      expect(assetWithMaintenance?.maintenanceRecords).toHaveLength(1);
      expect(assetWithMaintenance?.maintenanceRecords[0].description).toBe('Regular maintenance check');
      expect(assetWithMaintenance?.maintenanceRecords[0].cost).toBe(150.00);
    });
  });

  describe('Asset Queries', () => {
    beforeEach(async () => {
      // Create multiple assets for testing queries
      const assetsData = [
        { name: 'Laptop A', assetTag: 'LT-A', type: AssetType.TECHNOLOGY, condition: AssetCondition.EXCELLENT, status: AssetStatus.ACTIVE },
        { name: 'Laptop B', assetTag: 'LT-B', type: AssetType.TECHNOLOGY, condition: AssetCondition.GOOD, status: AssetStatus.ACTIVE },
        { name: 'Desk A', assetTag: 'DK-A', type: AssetType.FURNITURE, condition: AssetCondition.FAIR, status: AssetStatus.INACTIVE },
        { name: 'Printer', assetTag: 'PR-001', type: AssetType.EQUIPMENT, condition: AssetCondition.POOR, status: AssetStatus.MAINTENANCE },
      ];

      for (const assetData of assetsData) {
        await testDb.asset.create({ data: assetData });
      }
    });

    it('should filter assets by type', async () => {
      const technologyAssets = await testDb.asset.findMany({
        where: { type: AssetType.TECHNOLOGY },
      });

      expect(technologyAssets).toHaveLength(2);
      technologyAssets.forEach(asset => {
        expect(asset.type).toBe(AssetType.TECHNOLOGY);
      });
    });

    it('should filter assets by condition', async () => {
      const excellentAssets = await testDb.asset.findMany({
        where: { condition: AssetCondition.EXCELLENT },
      });

      expect(excellentAssets).toHaveLength(1);
      expect(excellentAssets[0].name).toBe('Laptop A');
    });

    it('should filter assets by status', async () => {
      const activeAssets = await testDb.asset.findMany({
        where: { status: AssetStatus.ACTIVE },
      });

      expect(activeAssets).toHaveLength(2);
      activeAssets.forEach(asset => {
        expect(asset.status).toBe(AssetStatus.ACTIVE);
      });
    });

    it('should support complex filtering', async () => {
      const specificAssets = await testDb.asset.findMany({
        where: {
          AND: [
            { type: AssetType.TECHNOLOGY },
            { condition: { in: [AssetCondition.EXCELLENT, AssetCondition.GOOD] } },
            { status: AssetStatus.ACTIVE },
            { isActive: true },
          ],
        },
        orderBy: { name: 'asc' },
      });

      expect(specificAssets).toHaveLength(2);
      expect(specificAssets[0].name).toBe('Laptop A');
      expect(specificAssets[1].name).toBe('Laptop B');
    });

    it('should search assets by name', async () => {
      const laptopAssets = await testDb.asset.findMany({
        where: {
          name: { contains: 'Laptop', mode: 'insensitive' },
        },
      });

      expect(laptopAssets).toHaveLength(2);
    });

    it('should count assets by category', async () => {
      const technologyCount = await testDb.asset.count({
        where: { type: AssetType.TECHNOLOGY },
      });

      const furnitureCount = await testDb.asset.count({
        where: { type: AssetType.FURNITURE },
      });

      const equipmentCount = await testDb.asset.count({
        where: { type: AssetType.EQUIPMENT },
      });

      expect(technologyCount).toBe(2);
      expect(furnitureCount).toBe(1);
      expect(equipmentCount).toBe(1);
    });
  });

  describe('Asset Updates and Validation', () => {
    let assetId: string;

    beforeEach(async () => {
      const asset = await testDb.asset.create({
        data: {
          name: 'Update Test Asset',
          assetTag: 'UPD-001',
          type: AssetType.EQUIPMENT,
          condition: AssetCondition.GOOD,
          status: AssetStatus.ACTIVE,
        },
      });
      assetId = asset.id;
    });

    it('should update asset condition', async () => {
      const updatedAsset = await testDb.asset.update({
        where: { id: assetId },
        data: { condition: AssetCondition.FAIR },
      });

      expect(updatedAsset.condition).toBe(AssetCondition.FAIR);
      expect(updatedAsset.updatedAt).not.toBe(updatedAsset.createdAt);
    });

    it('should update asset status', async () => {
      const updatedAsset = await testDb.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.MAINTENANCE },
      });

      expect(updatedAsset.status).toBe(AssetStatus.MAINTENANCE);
    });

    it('should update multiple fields simultaneously', async () => {
      const updateData = {
        condition: AssetCondition.POOR,
        status: AssetStatus.OUT_OF_SERVICE,
        description: 'Asset needs major repairs',
      };

      const updatedAsset = await testDb.asset.update({
        where: { id: assetId },
        data: updateData,
      });

      expect(updatedAsset.condition).toBe(AssetCondition.POOR);
      expect(updatedAsset.status).toBe(AssetStatus.OUT_OF_SERVICE);
      expect(updatedAsset.description).toBe('Asset needs major repairs');
    });

    it('should soft delete asset by setting isActive to false', async () => {
      const updatedAsset = await testDb.asset.update({
        where: { id: assetId },
        data: { isActive: false },
      });

      expect(updatedAsset.isActive).toBe(false);

      const activeAssets = await testDb.asset.findMany({
        where: { isActive: true },
      });

      expect(activeAssets.find(a => a.id === assetId)).toBeUndefined();
    });
  });

  describe('Asset Deletion', () => {
    it('should delete asset and cascade to related records', async () => {
      const asset = await testDb.asset.create({
        data: {
          name: 'Delete Test Asset',
          assetTag: 'DEL-001',
          type: AssetType.EQUIPMENT,
        },
      });

      // Create related maintenance record
      await testDb.maintenanceRecord.create({
        data: {
          type: 'CORRECTIVE',
          description: 'Test maintenance',
          assetId: asset.id,
        },
      });

      // Delete the asset
      await testDb.asset.delete({
        where: { id: asset.id },
      });

      // Verify asset is deleted
      const deletedAsset = await testDb.asset.findUnique({
        where: { id: asset.id },
      });
      expect(deletedAsset).toBeNull();

      // Verify related maintenance records are also deleted (cascade)
      const maintenanceRecords = await testDb.maintenanceRecord.findMany({
        where: { assetId: asset.id },
      });
      expect(maintenanceRecords).toHaveLength(0);
    });
  });
});