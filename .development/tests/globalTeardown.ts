/**
 * Global teardown for Jest tests
 * Cleans up the test environment after all tests complete
 */

import { promises as fs } from 'fs';

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clean up test database files
    const testDbFiles = ['test.db', 'test.db-journal'];
    
    for (const file of testDbFiles) {
      try {
        await fs.unlink(file);
        console.log(`🗑️  Removed ${file}`);
      } catch (error) {
        // File might not exist, which is fine
      }
    }
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('⚠️  Error during cleanup (non-critical):', error.message);
    // Don't throw error for cleanup failures
  }
};