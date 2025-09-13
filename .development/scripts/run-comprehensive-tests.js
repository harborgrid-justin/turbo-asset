#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Turbo Asset IWMS Platform
 * 
 * This script provides comprehensive testing capabilities including:
 * - Individual test suites (controllers, services, models)
 * - Full test suite execution
 * - Coverage reporting
 * - Performance monitoring
 * - Test result analysis
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class ComprehensiveTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      controllers: null,
      services: null,
      models: null,
      overall: null,
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logHeader(message) {
    this.log(`\n${'='.repeat(60)}`, 'cyan');
    this.log(`${message}`, 'bright');
    this.log(`${'='.repeat(60)}`, 'cyan');
  }

  logSection(message) {
    this.log(`\n${'-'.repeat(40)}`, 'blue');
    this.log(`${message}`, 'bright');
    this.log(`${'-'.repeat(40)}`, 'blue');
  }

  async runTestSuite(suiteName, testPath) {
    this.logSection(`Running ${suiteName} Tests`);
    
    try {
      const startTime = Date.now();
      
      // Run Jest for specific test suite
      const command = `npx jest ${testPath} --coverage=false --verbose --silent=false --detectOpenHandles --forceExit`;
      
      this.log(`📋 Command: ${command}`, 'blue');
      
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000, // 5 minutes timeout
      });
      
      const duration = Date.now() - startTime;
      
      // Parse test results
      const results = this.parseTestOutput(output);
      results.duration = duration;
      
      this.log(`✅ ${suiteName} tests completed in ${duration}ms`, 'green');
      this.log(`📊 Results: ${results.passed} passed, ${results.failed} failed`, 
        results.failed > 0 ? 'yellow' : 'green');
      
      return results;
    } catch (error) {
      this.log(`❌ ${suiteName} tests failed:`, 'red');
      this.log(error.stdout || error.message, 'red');
      
      return {
        passed: 0,
        failed: 1,
        duration: 0,
        error: error.message,
      };
    }
  }

  parseTestOutput(output) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };

    // Extract test results using regex patterns
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);
    const totalMatch = output.match(/(\d+) total/);

    if (passedMatch) results.passed = parseInt(passedMatch[1]);
    if (failedMatch) results.failed = parseInt(failedMatch[1]);
    if (skippedMatch) results.skipped = parseInt(skippedMatch[1]);
    if (totalMatch) results.total = parseInt(totalMatch[1]);

    return results;
  }

  async runCoverageReport() {
    this.logSection('Generating Coverage Report');
    
    try {
      const command = 'npx jest --coverage --coverageReporters=text --coverageReporters=json-summary --collectCoverageFrom="src/**/*.ts"';
      
      execSync(command, {
        stdio: 'inherit',
        timeout: 180000, // 3 minutes timeout
      });
      
      this.log('✅ Coverage report generated', 'green');
      
      // Read coverage summary
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.displayCoverageSummary(coverage);
      }
      
    } catch (error) {
      this.log(`⚠️  Coverage report generation failed: ${error.message}`, 'yellow');
    }
  }

  displayCoverageSummary(coverage) {
    this.logSection('Coverage Summary');
    
    const { total } = coverage;
    
    this.log(`📈 Overall Coverage:`, 'bright');
    this.log(`   Lines: ${total.lines.pct}%`, this.getCoverageColor(total.lines.pct));
    this.log(`   Functions: ${total.functions.pct}%`, this.getCoverageColor(total.functions.pct));
    this.log(`   Branches: ${total.branches.pct}%`, this.getCoverageColor(total.branches.pct));
    this.log(`   Statements: ${total.statements.pct}%`, this.getCoverageColor(total.statements.pct));
  }

  getCoverageColor(percentage) {
    if (percentage >= 80) return 'green';
    if (percentage >= 60) return 'yellow';
    return 'red';
  }

  async runFullTestSuite() {
    this.logHeader('🧪 COMPREHENSIVE TEST SUITE EXECUTION');
    
    this.log('🎯 Testing Strategy:', 'bright');
    this.log('   ✅ No mocks - Real database operations');
    this.log('   ✅ Realistic test scenarios');
    this.log('   ✅ Complete CRUD operations');
    this.log('   ✅ Relationship validation');
    this.log('   ✅ Error handling');
    this.log('   ✅ Performance monitoring');
    
    // Test individual suites
    this.results.controllers = await this.runTestSuite('Controller', 'tests/controllers');
    this.results.services = await this.runTestSuite('Service', 'tests/services');
    this.results.models = await this.runTestSuite('Model', 'tests/models');
    
    // Generate comprehensive coverage report
    await this.runCoverageReport();
    
    // Display final summary
    this.displayFinalSummary();
  }

  displayFinalSummary() {
    const totalDuration = Date.now() - this.startTime;
    
    this.logHeader('📊 FINAL TEST RESULTS SUMMARY');
    
    // Calculate totals
    const totalPassed = (this.results.controllers?.passed || 0) + 
                       (this.results.services?.passed || 0) + 
                       (this.results.models?.passed || 0);
    
    const totalFailed = (this.results.controllers?.failed || 0) + 
                       (this.results.services?.failed || 0) + 
                       (this.results.models?.failed || 0);
    
    const totalTests = totalPassed + totalFailed;
    
    this.log(`🎯 Test Suite Breakdown:`, 'bright');
    this.log(`   Controllers: ${this.formatSuiteResult(this.results.controllers)}`);
    this.log(`   Services:    ${this.formatSuiteResult(this.results.services)}`);
    this.log(`   Models:      ${this.formatSuiteResult(this.results.models)}`);
    
    this.log(`\n📈 Overall Results:`, 'bright');
    this.log(`   Total Tests: ${totalTests}`, 'bright');
    this.log(`   Passed: ${totalPassed}`, totalPassed > 0 ? 'green' : 'reset');
    this.log(`   Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
    this.log(`   Success Rate: ${totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0}%`, 
      totalFailed === 0 ? 'green' : 'yellow');
    
    this.log(`\n⏱️  Execution Time: ${this.formatDuration(totalDuration)}`, 'blue');
    
    // Final status
    if (totalFailed === 0) {
      this.log('\n🎉 ALL TESTS PASSED! ✅', 'green');
      this.log('🚀 Ready for production deployment!', 'green');
    } else {
      this.log(`\n⚠️  ${totalFailed} TEST(S) FAILED ❌`, 'red');
      this.log('🔧 Please fix failing tests before deployment', 'red');
    }
    
    this.logHeader('🏁 TEST EXECUTION COMPLETE');
  }

  formatSuiteResult(result) {
    if (!result) return 'Not run';
    if (result.error) return `❌ Error: ${result.error}`;
    return `✅ ${result.passed} passed, ❌ ${result.failed} failed (${this.formatDuration(result.duration)})`;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  async runSpecificSuite(suite) {
    this.logHeader(`🧪 RUNNING ${suite.toUpperCase()} TESTS ONLY`);
    
    const testPath = `tests/${suite}`;
    if (!fs.existsSync(testPath)) {
      this.log(`❌ Test directory ${testPath} does not exist`, 'red');
      process.exit(1);
    }
    
    const result = await this.runTestSuite(suite, testPath);
    
    this.log(`\n📊 ${suite} Test Results:`, 'bright');
    this.log(`   Passed: ${result.passed}`, result.passed > 0 ? 'green' : 'reset');
    this.log(`   Failed: ${result.failed}`, result.failed > 0 ? 'red' : 'green');
    this.log(`   Duration: ${this.formatDuration(result.duration)}`, 'blue');
    
    if (result.failed === 0) {
      this.log(`\n✅ All ${suite} tests passed!`, 'green');
    } else {
      this.log(`\n❌ ${result.failed} ${suite} test(s) failed`, 'red');
      process.exit(1);
    }
  }

  displayHelp() {
    this.log('\n🧪 Comprehensive Test Runner for Turbo Asset IWMS', 'bright');
    this.log('\nUsage:', 'bright');
    this.log('  npm run test:comprehensive           # Run all tests with coverage');
    this.log('  npm run test:comprehensive -- --controllers  # Run only controller tests');
    this.log('  npm run test:comprehensive -- --services     # Run only service tests');
    this.log('  npm run test:comprehensive -- --models       # Run only model tests');
    this.log('  npm run test:comprehensive -- --coverage     # Generate coverage only');
    this.log('  npm run test:comprehensive -- --help         # Show this help');
    
    this.log('\n🎯 Test Features:', 'bright');
    this.log('  ✅ Real database operations (no mocks)');
    this.log('  ✅ Comprehensive CRUD testing');
    this.log('  ✅ Relationship validation');
    this.log('  ✅ Error handling scenarios');
    this.log('  ✅ Performance monitoring');
    this.log('  ✅ Coverage reporting');
    
    this.log('\n📊 Test Coverage:', 'bright');
    this.log('  • Controllers: 33 test files');
    this.log('  • Services: 210 test files');
    this.log('  • Models: 100 test files');
    this.log('  • Total: 343 comprehensive test files\n');
  }
}

// Main execution
async function main() {
  const runner = new ComprehensiveTestRunner();
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    runner.displayHelp();
    return;
  }
  
  if (args.includes('--controllers')) {
    await runner.runSpecificSuite('controllers');
  } else if (args.includes('--services')) {
    await runner.runSpecificSuite('services');
  } else if (args.includes('--models')) {
    await runner.runSpecificSuite('models');
  } else if (args.includes('--coverage')) {
    await runner.runCoverageReport();
  } else {
    await runner.runFullTestSuite();
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the test runner
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveTestRunner;