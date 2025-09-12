module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/types/(.*)$': '<rootDir>/src/shared/types/$1',
    '^@/interfaces/(.*)$': '<rootDir>/src/shared/interfaces/$1',
    '^@/constants/(.*)$': '<rootDir>/src/shared/constants/$1',
    '^@/models/(.*)$': '<rootDir>/src/models/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/controllers/(.*)$': '<rootDir>/src/api/controllers/$1',
    '^@/routes/(.*)$': '<rootDir>/src/api/routes/$1',
    '^@/graphql/(.*)$': '<rootDir>/src/api/graphql/$1',
    '^@/middleware/(.*)$': '<rootDir>/src/core/middleware/$1',
    '^@/utils/(.*)$': '<rootDir>/src/core/utils/$1',
    '^@/config/(.*)$': '<rootDir>/src/core/config/$1',
    '^@/auth/(.*)$': '<rootDir>/src/core/auth/$1',
    '^@/database/(.*)$': '<rootDir>/src/core/database/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/demo/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
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
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
  
  // Reporter configuration for comprehensive output
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
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