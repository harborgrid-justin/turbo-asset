// Test setup file - Using real database for realistic testing
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Set test environment
process.env.NODE_ENV = 'test';

// Use SQLite for tests (faster and isolated)
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('postgresql')) {
  process.env.DATABASE_URL = 'file:./test.db';
}

// Global test database instance
let prisma: PrismaClient;

// Setup before all tests
beforeAll(async () => {
  // Initialize Prisma client
  prisma = new PrismaClient();
  
  // Run migrations for test database
  try {
    if (process.env.DATABASE_URL?.includes('file:')) {
      // For SQLite, use db push to create schema
      execSync('npx prisma db push --force-reset --skip-generate', { stdio: 'pipe' });
    } else {
      // For PostgreSQL, use migrate
      execSync('npx prisma migrate deploy', { stdio: 'pipe' });
    }
  } catch (error) {
    console.warn('Schema setup failed, continuing with existing schema');
  }
  
  // Connect to the database
  await prisma.$connect();
}, 30000);

// Cleanup after each test
afterEach(async () => {
  if (prisma) {
    try {
      // Get all model names from Prisma client
      const models = Object.keys(prisma).filter(key => 
        !key.startsWith('_') && 
        !key.startsWith('$') && 
        typeof prisma[key as keyof typeof prisma] === 'object'
      );

      // Delete all records from all tables in reverse order to handle foreign keys
      const deleteOrder = [
        'auditLog', 'notification', 'approval', 'workflowInstance', 'workflowDefinition',
        'documentPermission', 'documentVersion', 'document', 'customFieldValue', 'customFieldDefinition',
        'maintenanceRecord', 'asset', 'space', 'floor', 'building', 'property',
        'user', 'department', 'organization'
      ];

      for (const model of deleteOrder) {
        if (models.includes(model)) {
          try {
            await (prisma as any)[model].deleteMany({});
          } catch (error) {
            // Skip if model doesn't exist or can't be deleted
          }
        }
      }
      
      // Clean remaining models not in deleteOrder
      for (const model of models) {
        if (!deleteOrder.includes(model)) {
          try {
            await (prisma as any)[model].deleteMany({});
          } catch (error) {
            // Skip if model can't be deleted
          }
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  }
}, 10000);

// Cleanup after all tests
afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  
  // Clean up test database file if using SQLite
  if (process.env.DATABASE_URL?.includes('file:')) {
    try {
      const fs = require('fs');
      const path = './test.db';
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

// Export test database instance
export { prisma as testDb };

// Test utilities for creating common test data
export const createTestOrganization = async (overrides = {}) => {
  return await prisma.organization.create({
    data: {
      name: 'Test Organization',
      description: 'Test organization for unit tests',
      defaultCurrency: 'USD',
      defaultLanguage: 'en',
      defaultTimezone: 'UTC',
      isActive: true,
      ...overrides,
    },
  });
};

export const createTestUser = async (organizationId: string, overrides = {}) => {
  const timestamp = Date.now();
  return await prisma.user.create({
    data: {
      email: `test${timestamp}@example.com`,
      username: `testuser${timestamp}`,
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashedpassword',
      role: 'USER',
      organizationId,
      isActive: true,
      ...overrides,
    },
  });
};

export const createTestDepartment = async (organizationId: string, overrides = {}) => {
  return await prisma.department.create({
    data: {
      name: 'Test Department',
      description: 'Test department for unit tests',
      costCenter: 'TEST-CC-001',
      organizationId,
      isActive: true,
      ...overrides,
    },
  });
};

export const createTestProperty = async (organizationId: string, overrides = {}) => {
  return await prisma.property.create({
    data: {
      name: 'Test Property',
      type: 'OFFICE',
      address: { 
        street: '123 Test St', 
        city: 'Test City', 
        state: 'TS', 
        zip: '12345',
        country: 'USA'
      },
      totalArea: 10000,
      usableArea: 8500,
      currency: 'USD',
      organizationId,
      isActive: true,
      ...overrides,
    },
  });
};

export const createTestBuilding = async (propertyId: string, overrides = {}) => {
  return await prisma.building.create({
    data: {
      name: 'Test Building',
      buildingCode: 'TB-001',
      totalArea: 8000,
      floorCount: 3,
      propertyId,
      isActive: true,
      ...overrides,
    },
  });
};

export const createTestAsset = async (organizationId: string, createdBy: string, overrides = {}) => {
  const timestamp = Date.now();
  return await prisma.asset.create({
    data: {
      name: 'Test Asset',
      assetTag: `TEST-${timestamp}`,
      type: 'EQUIPMENT',
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      condition: 'GOOD',
      status: 'ACTIVE',
      purchasePrice: 1000,
      currency: 'USD',
      isActive: true,
      ...overrides,
    },
  });
};

// Helper function to clean specific tables
export const cleanupTables = async (...tableNames: string[]) => {
  for (const tableName of tableNames) {
    try {
      await (prisma as any)[tableName].deleteMany({});
    } catch (error) {
      // Ignore errors for tables that don't exist
    }
  }
};

// Helper to wait for database operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));