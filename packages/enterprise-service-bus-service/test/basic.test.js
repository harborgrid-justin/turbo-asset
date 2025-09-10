const test = require('node:test');
const assert = require('node:assert');

// Import the native module
const { EnterpriseServiceBus, init } = require('../index');

test('module initialization', async (t) => {
  const result = init();
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.includes('initialized successfully'));
});

test('service creation', async (t) => {
  const service = new EnterpriseServiceBus();
  assert.ok(service instanceof EnterpriseServiceBus);
});

test('service health check', async (t) => {
  const service = new EnterpriseServiceBus();
  const health = service.healthCheck();
  
  assert.strictEqual(typeof health, 'object');
  assert.strictEqual(health.status, 'healthy');
  assert.strictEqual(health.service, 'enterprise-service-bus-service');
});

test('service info', async (t) => {
  const service = new EnterpriseServiceBus();
  const info = service.getServiceInfo();
  
  assert.strictEqual(typeof info, 'object');
  assert.strictEqual(info.name, 'enterprise-service-bus-service');
  assert.strictEqual(info.version, '1.0.0');
});

test('service metrics', async (t) => {
  const service = new EnterpriseServiceBus();
  const metrics = service.getMetrics();
  
  assert.strictEqual(typeof metrics, 'object');
  assert.ok('uptime_seconds' in metrics);
  assert.ok('requests_processed' in metrics);
});

test('service initialization', async (t) => {
  const service = new EnterpriseServiceBus();
  const config = { environment: 'test' };
  const result = await service.initialize(config);
  
  assert.strictEqual(result, true);
});