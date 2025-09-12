/**
 * Global setup for Jest tests
 * Prepares the test environment and database for all tests
 */

import { execSync } from 'child_process';

module.exports = async () => {
  console.log('🚀 Setting up test environment...');
  
  try {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'file:./test.db';
    process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests
    
    // Generate Prisma client for test environment
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'pipe' });
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error.message);
    throw error;
  }
};