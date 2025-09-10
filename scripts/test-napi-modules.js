#!/usr/bin/env node

/**
 * Test script to verify NAPI-RS modules work correctly
 */

const path = require('path');

async function testModule(moduleName) {
  try {
    console.log(`\n--- Testing ${moduleName} ---`);
    
    // Try to require the module
    const modulePath = path.join(__dirname, '..', 'packages', moduleName);
    
    try {
      const module = require(modulePath);
      console.log(`✅ ${moduleName}: Module loaded successfully`);
      
      // Test init function
      if (module.init) {
        const initResult = module.init();
        console.log(`✅ ${moduleName}: init() -> ${initResult}`);
      }
      
      // Test service class
      const ServiceClass = Object.values(module).find(exp => 
        typeof exp === 'function' && exp.name.includes('Service')
      );
      
      if (ServiceClass) {
        const service = new ServiceClass();
        console.log(`✅ ${moduleName}: Service instance created`);
        
        // Test health check
        if (service.healthCheck) {
          const health = service.healthCheck();
          console.log(`✅ ${moduleName}: healthCheck() -> ${health}`);
        }
        
        // Test service info
        if (service.getServiceInfo) {
          const info = service.getServiceInfo();
          console.log(`✅ ${moduleName}: getServiceInfo() ->`, info);
        }
        
        // Test initialization
        if (service.initialize) {
          const initResult = service.initialize({
            database_url: "postgres://test:test@localhost/test_db",
            log_level: "info"
          });
          console.log(`✅ ${moduleName}: initialize() -> ${initResult}`);
        }
      }
      
      return true;
    } catch (requireError) {
      console.log(`❌ ${moduleName}: Failed to load - ${requireError.message}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ${moduleName}: Test failed - ${error.message}`);
    return false;
  }
}

async function testAllModules() {
  console.log('🚀 Testing NAPI-RS Modules\n');
  
  const testModules = [
    'portfolio-service',
    'notification-service',
    'reporting-service'
  ];
  
  let successCount = 0;
  let totalCount = testModules.length;
  
  for (const moduleName of testModules) {
    const success = await testModule(moduleName);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Test Summary: ${successCount}/${totalCount} modules passed`);
  
  if (successCount === totalCount) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the build status of the modules.');
  }
}

// Run tests
testAllModules().catch(console.error);