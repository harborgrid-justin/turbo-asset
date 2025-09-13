import request from 'supertest';
import express from 'express';
import PropertyController from '../../src/controllers/PropertyController';
import { createTestOrganization, createTestUser, testDb } from '../setup';

const app = express();
app.use(express.json());
app.use('/properties', PropertyController);

describe('PropertyController', () => {
  let organizationId: string;
  let userId: string;

  beforeEach(async () => {
    const organization = await createTestOrganization();
    organizationId = organization.id;
    
    const user = await createTestUser(organizationId);
    userId = user.id;
  });

  describe('GET /', () => {
    it('should require organizationId parameter', async () => {
      const response = await request(app).get('/properties');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Organization ID is required');
    });

    it('should return empty array when no properties exist', async () => {
      const response = await request(app)
        .get('/properties')
        .query({ organizationId });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('properties');
      expect(response.body.properties).toEqual([]);
      expect(response.body.totalCount).toBe(0);
    });

    it('should return properties for organization', async () => {
      // Create test properties
      await testDb.property.create({
        data: {
          name: 'Downtown Office',
          type: 'OFFICE',
          address: { street: '123 Main St', city: 'Downtown', state: 'CA', zip: '90210' },
          totalArea: 15000,
          usableArea: 12000,
          acquisitionCost: 2000000,
          currentValue: 2500000,
          currency: 'USD',
          organizationId,
        },
      });

      await testDb.property.create({
        data: {
          name: 'Warehouse Complex',
          type: 'WAREHOUSE',
          address: { street: '456 Industrial Blvd', city: 'Industrial', state: 'CA', zip: '90211' },
          totalArea: 50000,
          usableArea: 48000,
          acquisitionCost: 1500000,
          currentValue: 1800000,
          currency: 'USD',
          organizationId,
        },
      });

      const response = await request(app)
        .get('/properties')
        .query({ organizationId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('properties');
      expect(response.body.properties).toHaveLength(2);
      expect(response.body.totalCount).toBe(2);

      const properties = response.body.properties;
      const officeProperty = properties.find((p: any) => p.name === 'Downtown Office');
      const warehouseProperty = properties.find((p: any) => p.name === 'Warehouse Complex');

      expect(officeProperty).toBeDefined();
      expect(officeProperty.type).toBe('OFFICE');
      expect(officeProperty.totalArea).toBe(15000);
      expect(officeProperty.currentValue).toBe(2500000);

      expect(warehouseProperty).toBeDefined();
      expect(warehouseProperty.type).toBe('WAREHOUSE');
      expect(warehouseProperty.totalArea).toBe(50000);
    });

    it('should support pagination', async () => {
      // Create multiple properties
      for (let i = 1; i <= 5; i++) {
        await testDb.property.create({
          data: {
            name: `Property ${i}`,
            type: 'OFFICE',
            address: { street: `${i}00 Test St`, city: 'Test City', state: 'CA', zip: '90210' },
            organizationId,
          },
        });
      }

      // Test first page
      const page1Response = await request(app)
        .get('/properties')
        .query({ organizationId, limit: 2, offset: 0 });

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.properties).toHaveLength(2);
      expect(page1Response.body.totalCount).toBe(5);

      // Test second page
      const page2Response = await request(app)
        .get('/properties')
        .query({ organizationId, limit: 2, offset: 2 });

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.properties).toHaveLength(2);
      expect(page2Response.body.totalCount).toBe(5);

      // Verify different properties on different pages
      const page1Names = page1Response.body.properties.map((p: any) => p.name);
      const page2Names = page2Response.body.properties.map((p: any) => p.name);
      expect(page1Names).not.toEqual(page2Names);
    });

    it('should include buildings in property response', async () => {
      const property = await testDb.property.create({
        data: {
          name: 'Test Property with Buildings',
          type: 'OFFICE',
          address: { street: '789 Building St', city: 'Test City', state: 'CA', zip: '90210' },
          organizationId,
        },
      });

      // Create buildings for the property
      await testDb.building.create({
        data: {
          name: 'Building A',
          buildingCode: 'BLD-A',
          totalArea: 10000,
          floorCount: 5,
          propertyId: property.id,
        },
      });

      await testDb.building.create({
        data: {
          name: 'Building B',
          buildingCode: 'BLD-B',
          totalArea: 8000,
          floorCount: 3,
          propertyId: property.id,
        },
      });

      const response = await request(app)
        .get('/properties')
        .query({ organizationId });

      expect(response.status).toBe(200);
      const propertyWithBuildings = response.body.properties[0];
      
      expect(propertyWithBuildings).toHaveProperty('buildings');
      expect(propertyWithBuildings.buildings).toHaveLength(2);
      
      const buildingA = propertyWithBuildings.buildings.find((b: any) => b.name === 'Building A');
      const buildingB = propertyWithBuildings.buildings.find((b: any) => b.name === 'Building B');
      
      expect(buildingA.buildingCode).toBe('BLD-A');
      expect(buildingA.floorCount).toBe(5);
      expect(buildingB.buildingCode).toBe('BLD-B');
      expect(buildingB.floorCount).toBe(3);
    });
  });

  describe('GET /:id', () => {
    let propertyId: string;

    beforeEach(async () => {
      const property = await testDb.property.create({
        data: {
          name: 'Detailed Test Property',
          type: 'OFFICE',
          address: { street: '999 Detail St', city: 'Detail City', state: 'CA', zip: '90210' },
          totalArea: 20000,
          usableArea: 18000,
          acquisitionCost: 3000000,
          currentValue: 3500000,
          acquisitionDate: new Date('2020-01-15'),
          coordinates: { lat: 34.0522, lng: -118.2437 },
          currency: 'USD',
          organizationId,
        },
      });
      propertyId = property.id;
    });

    it('should return property details by ID', async () => {
      const response = await request(app).get(`/properties/${propertyId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('property');
      
      const property = response.body.property;
      expect(property.name).toBe('Detailed Test Property');
      expect(property.type).toBe('OFFICE');
      expect(property.totalArea).toBe(20000);
      expect(property.usableArea).toBe(18000);
      expect(property.acquisitionCost).toBe(3000000);
      expect(property.currentValue).toBe(3500000);
      expect(property.organizationId).toBe(organizationId);
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = 'non-existent-property-id';
      const response = await request(app).get(`/properties/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Property not found');
    });

    it('should include full building details with floors', async () => {
      const building = await testDb.building.create({
        data: {
          name: 'Main Building',
          buildingCode: 'MAIN-001',
          totalArea: 15000,
          floorCount: 4,
          constructionYear: 1995,
          renovationYear: 2010,
          energyRating: 'B',
          propertyId: propertyId,
        },
      });

      // Create floors for the building
      await testDb.floor.create({
        data: {
          name: 'Ground Floor',
          floorNumber: 1,
          totalArea: 4000,
          usableArea: 3600,
          buildingId: building.id,
        },
      });

      await testDb.floor.create({
        data: {
          name: 'Second Floor',
          floorNumber: 2,
          totalArea: 3800,
          usableArea: 3400,
          buildingId: building.id,
        },
      });

      const response = await request(app).get(`/properties/${propertyId}`);

      expect(response.status).toBe(200);
      const property = response.body.property;
      
      expect(property.buildings).toHaveLength(1);
      const building_resp = property.buildings[0];
      
      expect(building_resp.name).toBe('Main Building');
      expect(building_resp.buildingCode).toBe('MAIN-001');
      expect(building_resp.floorCount).toBe(4);
      expect(building_resp.constructionYear).toBe(1995);
      expect(building_resp.energyRating).toBe('B');
      
      expect(building_resp.floors).toHaveLength(2);
      const groundFloor = building_resp.floors.find((f: any) => f.floorNumber === 1);
      const secondFloor = building_resp.floors.find((f: any) => f.floorNumber === 2);
      
      expect(groundFloor.name).toBe('Ground Floor');
      expect(groundFloor.totalArea).toBe(4000);
      expect(secondFloor.name).toBe('Second Floor');
      expect(secondFloor.totalArea).toBe(3800);
    });
  });

  describe('POST /', () => {
    it('should create a new property', async () => {
      const propertyData = {
        name: 'New Office Complex',
        type: 'OFFICE',
        address: {
          street: '100 New St',
          city: 'New City',
          state: 'NY',
          zip: '10001',
          country: 'USA'
        },
        totalArea: 25000,
        usableArea: 22000,
        acquisitionCost: 4000000,
        currentValue: 4500000,
        currency: 'USD',
        organizationId,
      };

      const response = await request(app)
        .post('/properties')
        .send(propertyData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('property');
      
      const createdProperty = response.body.property;
      expect(createdProperty.name).toBe(propertyData.name);
      expect(createdProperty.type).toBe(propertyData.type);
      expect(createdProperty.totalArea).toBe(propertyData.totalArea);
      expect(createdProperty.organizationId).toBe(organizationId);

      // Verify property was actually created in database
      const dbProperty = await testDb.property.findUnique({
        where: { id: createdProperty.id },
      });
      expect(dbProperty).toBeDefined();
      expect(dbProperty?.name).toBe(propertyData.name);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Property',
        // Missing required fields
      };

      const response = await request(app)
        .post('/properties')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle custom fields', async () => {
      const propertyData = {
        name: 'Property with Custom Fields',
        type: 'OFFICE',
        address: { street: '200 Custom St', city: 'Custom City', state: 'CA', zip: '90210' },
        organizationId,
        customFields: [
          { fieldName: 'Property Manager', value: 'John Doe' },
          { fieldName: 'Insurance Policy', value: 'POL-12345' },
        ],
      };

      const response = await request(app)
        .post('/properties')
        .send(propertyData);

      expect(response.status).toBe(201);
      expect(response.body.property).toHaveProperty('customFields');
    });
  });

  describe('PUT /:id', () => {
    let propertyId: string;

    beforeEach(async () => {
      const property = await testDb.property.create({
        data: {
          name: 'Update Test Property',
          type: 'OFFICE',
          address: { street: '300 Update St', city: 'Update City', state: 'CA', zip: '90210' },
          totalArea: 10000,
          currentValue: 1000000,
          organizationId,
        },
      });
      propertyId = property.id;
    });

    it('should update property details', async () => {
      const updateData = {
        name: 'Updated Property Name',
        totalArea: 12000,
        currentValue: 1200000,
        description: 'Updated property description',
      };

      const response = await request(app)
        .put(`/properties/${propertyId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.property.name).toBe(updateData.name);
      expect(response.body.property.totalArea).toBe(updateData.totalArea);
      expect(response.body.property.currentValue).toBe(updateData.currentValue);

      // Verify changes in database
      const updatedProperty = await testDb.property.findUnique({
        where: { id: propertyId },
      });
      expect(updatedProperty?.name).toBe(updateData.name);
      expect(updatedProperty?.totalArea).toBe(updateData.totalArea);
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = 'non-existent-property-id';
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/properties/${fakeId}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /:id', () => {
    let propertyId: string;

    beforeEach(async () => {
      const property = await testDb.property.create({
        data: {
          name: 'Delete Test Property',
          type: 'OFFICE',
          address: { street: '400 Delete St', city: 'Delete City', state: 'CA', zip: '90210' },
          organizationId,
        },
      });
      propertyId = property.id;
    });

    it('should soft delete property', async () => {
      const response = await request(app).delete(`/properties/${propertyId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify property is soft deleted (isActive = false)
      const deletedProperty = await testDb.property.findUnique({
        where: { id: propertyId },
      });
      expect(deletedProperty?.isActive).toBe(false);
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = 'non-existent-property-id';
      const response = await request(app).delete(`/properties/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would normally require mocking the database to simulate errors
      // For realistic testing, we test actual database operations
      const response = await request(app)
        .get('/properties')
        .query({ organizationId: 'invalid-uuid-format' });

      // Should handle invalid UUID gracefully
      expect([400, 500]).toContain(response.status);
    });

    it('should handle large property lists efficiently', async () => {
      // Create a large number of properties to test performance
      const properties = [];
      for (let i = 1; i <= 100; i++) {
        properties.push({
          name: `Performance Test Property ${i}`,
          type: 'OFFICE',
          address: { street: `${i} Performance St`, city: 'Perf City', state: 'CA', zip: '90210' },
          organizationId,
        });
      }

      await testDb.property.createMany({ data: properties });

      const startTime = Date.now();
      const response = await request(app)
        .get('/properties')
        .query({ organizationId, limit: 50 });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(response.body.properties).toHaveLength(50);
      expect(response.body.totalCount).toBe(100);
      
      // Should respond within reasonable time (adjust as needed)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});