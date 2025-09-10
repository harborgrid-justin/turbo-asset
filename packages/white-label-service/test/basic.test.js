const test = require('node:test');
const assert = require('node:assert');

// Import the native module
const { WhiteLabel, init } = require('../index');

test('module initialization', async (t) => {
  const result = init();
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.includes('initialized successfully'));
});

test('service creation', async (t) => {
  const service = new WhiteLabel();
  assert.ok(service instanceof WhiteLabel);
});

test('service health check', async (t) => {
  const service = new WhiteLabel();
  const health = service.healthCheck();
  
  assert.strictEqual(typeof health, 'object');
  assert.strictEqual(health.status, 'healthy');
  assert.strictEqual(health.service, 'white-label-service');
});

test('service info', async (t) => {
  const service = new WhiteLabel();
  const info = service.getServiceInfo();
  
  assert.strictEqual(typeof info, 'object');
  assert.strictEqual(info.name, 'white-label-service');
  assert.strictEqual(info.version, '1.0.0');
});

test('service metrics', async (t) => {
  const service = new WhiteLabel();
  const metrics = service.getMetrics();
  
  assert.strictEqual(typeof metrics, 'object');
  assert.ok('uptime_seconds' in metrics);
  assert.ok('requests_processed' in metrics);
});

test('service initialization', async (t) => {
  const service = new WhiteLabel();
  const config = { environment: 'test' };
  const result = await service.initialize(config);
  
  assert.strictEqual(result, true);
});