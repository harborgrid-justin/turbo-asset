// Test setup file
process.env.NODE_ENV = 'test';

// Mock Redis connection for tests
jest.mock('../src/config/redis', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    on: jest.fn(),
  },
  connectRedis: jest.fn(),
}));

// Mock Prisma database
jest.mock('../src/config/database', () => ({
  __esModule: true,
  prisma: {
    $on: jest.fn(),
  },
}));