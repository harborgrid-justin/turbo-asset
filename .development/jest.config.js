module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['../src', './tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {  // Fixed typo: was moduleNameMapping
    '^@/(.*)$': '../src/$1',
    '^@/types/(.*)$': '../src/shared/types/$1',
    '^@/interfaces/(.*)$': '../src/shared/interfaces/$1',
    '^@/constants/(.*)$': '../src/shared/constants/$1',
    '^@/models/(.*)$': '../src/models/$1',
    '^@/services/(.*)$': '../src/services/$1',
    '^@/controllers/(.*)$': '../src/api/controllers/$1',
    '^@/routes/(.*)$': '../src/api/routes/$1',
    '^@/graphql/(.*)$': '../src/api/graphql/$1',
    '^@/middleware/(.*)$': '../src/core/middleware/$1',
    '^@/utils/(.*)$': '../src/core/utils/$1',
    '^@/config/(.*)$': '../src/core/config/$1',
    '^@/auth/(.*)$': '../src/core/auth/$1',
    '^@/database/(.*)$': '../src/core/database/$1',
  },
  collectCoverageFrom: [
    '../src/**/*.ts',
    '!../src/**/*.d.ts',
    '!../src/index.ts',
    '!../src/**/__tests__/**',
    '!../src/**/*.test.ts',
    '!../src/**/*.spec.ts',
    '!../src/demo/**',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['./tests/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Use single worker for database tests to avoid conflicts
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Test organization for better reporting
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  
  // Global test configuration
  globalSetup: './tests/globalSetup.ts',
  globalTeardown: './tests/globalTeardown.ts',
  
  // Reporter configuration for comprehensive output
  reporters: [
    'default'
  ],
  
  // Custom test environments for different test types
  projects: [
    {
      displayName: 'Controllers',
      testMatch: ['<rootDir>/tests/controllers/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
    },
    {
      displayName: 'Services',
      testMatch: ['<rootDir>/tests/services/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
    },
    {
      displayName: 'Models',
      testMatch: ['<rootDir>/tests/models/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
    }
  ]
};