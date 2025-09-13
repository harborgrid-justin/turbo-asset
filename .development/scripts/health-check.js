#!/usr/bin/env node

/**
 * Health Check Script for NAPI-RS Services
 * Verifies that all 40 NAPI-RS packages are properly generated and configured
 */

const fs = require('fs');
const path = require('path');

async function checkPackageStructure() {
  console.log('🔍 Checking NAPI-RS Package Structure...');
  
  const packagesDir = path.join(process.cwd(), 'packages');
  const packages = await fs.promises.readdir(packagesDir);
  
  // Filter out non-package files
  const actualPackages = packages.filter(pkg => {
    const pkgPath = path.join(packagesDir, pkg);
    return fs.statSync(pkgPath).isDirectory() && pkg !== 'node_modules';
  });
  
  console.log(`📦 Found ${actualPackages.length} packages`);
  
  // Expected 40 packages (20 original + 20 additional)
  const expectedPackages = [
    // Original 20 packages
    'asset-lifecycle-service',
    'notification-service',
    'document-service',
    'bulk-data-service',
    'business-intelligence-service',
    'cad-integration-service',
    'chargeback-service',
    'compliance-service',
    'custom-field-service',
    'energy-management-service',
    'inventory-service',
    'iot-device-service',
    'lease-management-service',
    'maintenance-service',
    'portfolio-service',
    'reporting-service',
    'space-utilization-service',
    'work-order-service',
    'workflow-engine',
    'integration-service',
    
    // Additional 20 packages
    'advanced-intelligence-service',
    'api-documentation-service',
    'api-management-service',
    'budget-forecast-service',
    'calendar-integration-service',
    'contract-lifecycle-service',
    'critical-date-service',
    'data-governance-service',
    'data-warehouse-service',
    'emergency-planning-service',
    'enterprise-service-bus-service',
    'financial-consolidation-service',
    'move-management-service',
    'preventive-maintenance-service',
    'sdk-generator-service',
    'space-standards-service',
    'technician-mobile-service',
    'vendor-broker-service',
    'white-label-service',
    'workflow-service'
  ];
  
  console.log('\n📋 Package Status:');
  
  let foundCount = 0;
  let missingCount = 0;
  
  for (const expectedPkg of expectedPackages) {
    if (actualPackages.includes(expectedPkg)) {
      console.log(`  ✅ ${expectedPkg}`);
      foundCount++;
    } else {
      console.log(`  ❌ ${expectedPkg} - MISSING`);
      missingCount++;
    }
  }
  
  // Check for unexpected packages
  const unexpectedPackages = actualPackages.filter(pkg => !expectedPackages.includes(pkg) && pkg !== 'package.json');
  if (unexpectedPackages.length > 0) {
    console.log('\n📋 Unexpected packages:');
    unexpectedPackages.forEach(pkg => {
      console.log(`  ⚠️  ${pkg}`);
    });
  }
  
  console.log(`\n📊 Summary: ${foundCount}/${expectedPackages.length} packages found`);
  console.log(`❌ Missing: ${missingCount}`);
  console.log(`⚠️  Unexpected: ${unexpectedPackages.length}`);
  
  return { foundCount, expectedCount: expectedPackages.length, missingCount };
}

async function checkPackageStructureDetails() {
  console.log('\n🔍 Checking Package Structure Details...');
  
  const packagesDir = path.join(process.cwd(), 'packages');
  const packages = await fs.promises.readdir(packagesDir);
  
  let validPackages = 0;
  let invalidPackages = 0;
  
  for (const pkg of packages) {
    const pkgPath = path.join(packagesDir, pkg);
    if (!fs.statSync(pkgPath).isDirectory() || pkg === 'package.json' || pkg === 'node_modules') {
      continue;
    }
    
    const requiredFiles = [
      'package.json',
      'Cargo.toml',
      'build.rs',
      'index.d.ts',
      'src/lib.rs'
    ];
    
    let hasAllFiles = true;
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      const filePath = path.join(pkgPath, file);
      if (!fs.existsSync(filePath)) {
        hasAllFiles = false;
        missingFiles.push(file);
      }
    }
    
    if (hasAllFiles) {
      validPackages++;
      console.log(`  ✅ ${pkg} - Complete`);
    } else {
      invalidPackages++;
      console.log(`  ❌ ${pkg} - Missing: ${missingFiles.join(', ')}`);
    }
  }
  
  console.log(`\n📊 Package Structure Summary:`);
  console.log(`✅ Valid: ${validPackages}`);
  console.log(`❌ Invalid: ${invalidPackages}`);
  
  return { validPackages, invalidPackages };
}

async function checkNAPIIntegrationConfig() {
  console.log('\n🔍 Checking NAPI Integration Configuration...');
  
  try {
    const napiIntegrationPath = path.join(process.cwd(), 'src', 'services', 'napi-integration.ts');
    const content = await fs.promises.readFile(napiIntegrationPath, 'utf-8');
    
    // Count service configurations
    const serviceConfigMatches = content.match(/serviceName: '[^']+'/g);
    const configuredServices = serviceConfigMatches ? serviceConfigMatches.length : 0;
    
    console.log(`📊 Configured Services: ${configuredServices}`);
    
    // Check for specific services
    const expectedServices = [
      'asset-lifecycle',
      'advanced-intelligence',
      'api-documentation',
      'budget-forecast',
      'workflow'
    ];
    
    for (const service of expectedServices) {
      if (content.includes(`serviceName: '${service}'`)) {
        console.log(`  ✅ ${service} - Configured`);
      } else {
        console.log(`  ❌ ${service} - NOT Configured`);
      }
    }
    
    return { configuredServices };
  } catch (error) {
    console.log(`❌ Error reading NAPI integration config: ${error.message}`);
    return { configuredServices: 0 };
  }
}

async function checkBusinessLogicIntegration() {
  console.log('\n🔍 Checking Business Logic Integration...');
  
  try {
    const businessLogicPath = path.join(process.cwd(), 'src', 'services', 'business-logic-integration.ts');
    const content = await fs.promises.readFile(businessLogicPath, 'utf-8');
    
    // Check for key integration components
    const checks = [
      { name: 'BusinessLogicIntegrationService class', pattern: /class BusinessLogicIntegrationService/ },
      { name: 'Bridge setup method', pattern: /setupBridges/ },
      { name: 'Execute integrated operation', pattern: /executeIntegratedOperation/ },
      { name: 'Health check method', pattern: /healthCheck/ },
      { name: 'Business domain imports', pattern: /BusinessOperationsManager/ }
    ];
    
    let passedChecks = 0;
    
    for (const check of checks) {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name}`);
        passedChecks++;
      } else {
        console.log(`  ❌ ${check.name} - NOT Found`);
      }
    }
    
    console.log(`📊 Integration Health: ${passedChecks}/${checks.length} checks passed`);
    
    return { passedChecks, totalChecks: checks.length };
  } catch (error) {
    console.log(`❌ Error reading business logic integration: ${error.message}`);
    return { passedChecks: 0, totalChecks: 0 };
  }
}

async function checkDocumentation() {
  console.log('\n🔍 Checking Documentation Updates...');
  
  try {
    const docPath = path.join(process.cwd(), 'NAPI-RS-IMPLEMENTATION.md');
    const content = await fs.promises.readFile(docPath, 'utf-8');
    
    const checks = [
      { name: '40 modules mentioned', pattern: /40.*modules/i },
      { name: 'Additional 20 modules section', pattern: /Additional 20 Modules/i },
      { name: 'Business logic integration', pattern: /business.*logic.*integration/i },
      { name: 'Advanced Intelligence Service', pattern: /Advanced Intelligence Service/ }
    ];
    
    let passedChecks = 0;
    
    for (const check of checks) {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name}`);
        passedChecks++;
      } else {
        console.log(`  ❌ ${check.name} - NOT Found`);
      }
    }
    
    return { passedChecks, totalChecks: checks.length };
  } catch (error) {
    console.log(`❌ Error reading documentation: ${error.message}`);
    return { passedChecks: 0, totalChecks: 0 };
  }
}

async function main() {
  console.log('🚀 NAPI-RS Implementation Health Check\n');
  
  const packageResult = await checkPackageStructure();
  const structureResult = await checkPackageStructureDetails();
  const napiResult = await checkNAPIIntegrationConfig();
  const businessResult = await checkBusinessLogicIntegration();
  const docResult = await checkDocumentation();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 OVERALL HEALTH REPORT');
  console.log('='.repeat(50));
  
  console.log(`📦 Packages: ${packageResult.foundCount}/${packageResult.expectedCount} found`);
  console.log(`🏗️  Structure: ${structureResult.validPackages} valid packages`);
  console.log(`⚙️  NAPI Config: ${napiResult.configuredServices} services configured`);
  console.log(`🔗 Business Logic: ${businessResult.passedChecks}/${businessResult.totalChecks} checks passed`);
  console.log(`📚 Documentation: ${docResult.passedChecks}/${docResult.totalChecks} checks passed`);
  
  // Calculate overall health score
  const totalScore = (
    (packageResult.foundCount / packageResult.expectedCount) * 25 +
    (structureResult.validPackages / (structureResult.validPackages + structureResult.invalidPackages || 1)) * 25 +
    (napiResult.configuredServices >= 40 ? 25 : (napiResult.configuredServices / 40) * 25) +
    (businessResult.passedChecks / businessResult.totalChecks) * 15 +
    (docResult.passedChecks / docResult.totalChecks) * 10
  );
  
  console.log(`\n🎯 Overall Health Score: ${Math.round(totalScore)}%`);
  
  if (totalScore >= 90) {
    console.log('🎉 EXCELLENT - Implementation is ready for production!');
  } else if (totalScore >= 75) {
    console.log('👍 GOOD - Implementation is mostly complete with minor issues');
  } else if (totalScore >= 50) {
    console.log('⚠️  FAIR - Implementation needs significant work');
  } else {
    console.log('❌ POOR - Implementation has major issues');
  }
  
  console.log('\n✨ Health check complete!');
}

main().catch(console.error);