#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of 20 additional packages to create (beyond the existing 20)
const additionalPackages = [
  {
    name: 'advanced-intelligence-service',
    description: 'Advanced AI/ML service with computer vision, NLP, and predictive analytics',
    features: ['machine learning', 'computer vision', 'NLP processing', 'predictive analytics']
  },
  {
    name: 'api-documentation-service',
    description: 'Automated API documentation generation and management service',
    features: ['OpenAPI generation', 'documentation automation', 'SDK generation', 'API versioning']
  },
  {
    name: 'api-management-service',
    description: 'Comprehensive API lifecycle management and governance service',
    features: ['API lifecycle', 'access control', 'rate limiting', 'API analytics']
  },
  {
    name: 'budget-forecast-service',
    description: 'Financial budgeting and forecasting service with predictive modeling',
    features: ['budget planning', 'financial forecasting', 'variance analysis', 'cost modeling']
  },
  {
    name: 'calendar-integration-service',
    description: 'Multi-platform calendar integration and scheduling service',
    features: ['calendar sync', 'event management', 'scheduling optimization', 'availability tracking']
  },
  {
    name: 'contract-lifecycle-service',
    description: 'Contract management and lifecycle tracking service',
    features: ['contract tracking', 'renewal management', 'compliance monitoring', 'vendor relations']
  },
  {
    name: 'critical-date-service',
    description: 'Critical date monitoring and alert management service',
    features: ['deadline tracking', 'alert management', 'escalation workflows', 'notification routing']
  },
  {
    name: 'data-governance-service',
    description: 'Data quality, governance, and compliance management service',
    features: ['data quality', 'governance policies', 'compliance tracking', 'data lineage']
  },
  {
    name: 'data-warehouse-service',
    description: 'Enterprise data warehousing and analytics service',
    features: ['data aggregation', 'ETL processing', 'analytics engine', 'data modeling']
  },
  {
    name: 'emergency-planning-service',
    description: 'Emergency response planning and disaster recovery service',
    features: ['emergency protocols', 'disaster recovery', 'response coordination', 'safety management']
  },
  {
    name: 'enterprise-service-bus-service',
    description: 'Enterprise service bus for system integration and message routing',
    features: ['message routing', 'service orchestration', 'protocol translation', 'system integration']
  },
  {
    name: 'financial-consolidation-service',
    description: 'Financial data consolidation and reporting service',
    features: ['financial consolidation', 'multi-entity reporting', 'currency conversion', 'regulatory reporting']
  },
  {
    name: 'move-management-service',
    description: 'Employee and asset relocation management service',
    features: ['move planning', 'resource allocation', 'logistics coordination', 'cost tracking']
  },
  {
    name: 'preventive-maintenance-service',
    description: 'Preventive maintenance scheduling and optimization service',
    features: ['maintenance scheduling', 'predictive maintenance', 'resource optimization', 'equipment tracking']
  },
  {
    name: 'sdk-generator-service',
    description: 'Multi-language SDK and code generation service',
    features: ['SDK generation', 'code templates', 'multi-language support', 'documentation generation']
  },
  {
    name: 'space-standards-service',
    description: 'Space standards compliance and management service',
    features: ['standards compliance', 'space allocation', 'utilization standards', 'policy enforcement']
  },
  {
    name: 'technician-mobile-service',
    description: 'Mobile-first technician workflow and field service management',
    features: ['mobile workflows', 'offline capability', 'field service', 'work order management']
  },
  {
    name: 'vendor-broker-service',
    description: 'Vendor and broker relationship management service',
    features: ['vendor management', 'broker relations', 'performance tracking', 'contract negotiation']
  },
  {
    name: 'white-label-service',
    description: 'White-label branding and customization service',
    features: ['branding customization', 'theme management', 'multi-tenancy', 'UI personalization']
  },
  {
    name: 'workflow-service',
    description: 'Advanced workflow engine with approval chains and automation',
    features: ['workflow automation', 'approval chains', 'process modeling', 'SLA management']
  }
];

function generatePackageJson(pkg) {
  return {
    name: `@turbo-asset/${pkg.name}`,
    version: "1.0.0",
    description: pkg.description,
    main: "index.js",
    types: "index.d.ts",
    files: [
      "index.js",
      "index.d.ts",
      "*.node"
    ],
    scripts: {
      build: "napi build --platform --release",
      "build:debug": "napi build --platform",
      test: "node --test test/*.js",
      prepublishOnly: "npm run build",
      version: "napi version",
      artifacts: "napi artifacts"
    },
    napi: {
      name: pkg.name,
      triples: {
        defaults: true,
        additional: [
          "x86_64-unknown-linux-musl",
          "aarch64-unknown-linux-gnu",
          "i686-pc-windows-msvc",
          "armv7-unknown-linux-gnueabihf",
          "aarch64-apple-darwin",
          "aarch64-pc-windows-msvc",
          "aarch64-unknown-linux-musl",
          "aarch64-linux-android",
          "x86_64-unknown-freebsd",
          "x86_64-unknown-linux-musl",
          "x86_64-pc-windows-msvc",
          "x86_64-apple-darwin"
        ]
      }
    },
    devDependencies: {
      "@napi-rs/cli": "^2.18.0",
      "@types/node": "^20.19.12"
    },
    keywords: pkg.features.concat(["napi-rs", "rust", "iwms", "enterprise"]),
    author: "HarborGrid",
    license: "MIT",
    engines: {
      node: ">=18.0.0"
    },
    publishConfig: {
      registry: "https://registry.npmjs.org/",
      access: "public"
    }
  };
}

function generateCargoToml(pkg) {
  return `[package]
name = "${pkg.name}"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
napi = { version = "2.0", default-features = false, features = ["napi8"] }
napi-derive = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1.0"
thiserror = "1.0"
tracing = "0.1"
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-rustls", "chrono", "uuid"] }

[build-dependencies]
napi-build = "2.0"`;
}

function generateLibRs(pkg) {
  const structName = pkg.name.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('').replace(/Service$/, '');

  return `use chrono::{DateTime, Utc};
use napi::{bindgen_prelude::*, Result};
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Base entity structure following the universal data standard
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaseEntity {
  pub id: String,
  pub organization_id: String,
  pub created_at: DateTime<Utc>,
  pub updated_at: DateTime<Utc>,
  pub created_by: String,
  pub updated_by: String,
  pub version: i32,
  pub is_active: bool,
  pub metadata: Option<HashMap<String, String>>,
}

/// Standard response structure
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardResponse<T> {
  pub success: bool,
  pub data: Option<T>,
  pub error: Option<ErrorResponse>,
  pub metadata: Option<ResponseMetadata>,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
  pub code: String,
  pub message: String,
  pub details: Option<HashMap<String, String>>,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseMetadata {
  pub timestamp: DateTime<Utc>,
  #[napi(js_name = "requestId")]
  pub request_id: String,
  #[napi(js_name = "executionTime")]
  pub execution_time: i64,
  #[napi(js_name = "apiVersion")]
  pub api_version: String,
}

/// ${pkg.description}
#[napi]
pub struct ${structName} {
  // Service implementation
}

#[napi]
impl ${structName} {
  #[napi(constructor)]
  pub fn new() -> Self {
    Self {}
  }

  /// Initialize the service with configuration
  #[napi]
  pub async fn initialize(&self, config: HashMap<String, String>) -> Result<bool> {
    // Initialize service with configuration
    Ok(true)
  }

  /// Health check for the service
  #[napi]
  pub fn health_check(&self) -> Result<HashMap<String, String>> {
    let mut health = HashMap::new();
    health.insert("status".to_string(), "healthy".to_string());
    health.insert("service".to_string(), "${pkg.name}".to_string());
    health.insert("version".to_string(), "1.0.0".to_string());
    Ok(health)
  }

  /// Get service information
  #[napi]
  pub fn get_service_info(&self) -> Result<HashMap<String, String>> {
    let mut info = HashMap::new();
    info.insert("name".to_string(), "${pkg.name}".to_string());
    info.insert("version".to_string(), "1.0.0".to_string());
    info.insert("description".to_string(), "${pkg.description}".to_string());
    info.insert("features".to_string(), "${pkg.features.join(', ')}".to_string());
    Ok(info)
  }

  /// Get service metrics
  #[napi]
  pub fn get_metrics(&self) -> Result<HashMap<String, i64>> {
    let mut metrics = HashMap::new();
    metrics.insert("uptime_seconds".to_string(), 0);
    metrics.insert("requests_processed".to_string(), 0);
    metrics.insert("errors_count".to_string(), 0);
    metrics.insert("avg_response_time_ms".to_string(), 0);
    Ok(metrics)
  }
}

/// Initialize the module
#[napi]
pub fn init() -> Result<String> {
  Ok("${structName} initialized successfully".to_string())
}`;
}

function generateIndexDTs(pkg) {
  const structName = pkg.name.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('').replace(/Service$/, '');

  return `/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export interface BaseEntity {
  id: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  version: number
  isActive: boolean
  metadata?: Record<string, string>
}

export interface StandardResponse<T> {
  success: boolean
  data?: T
  error?: ErrorResponse
  metadata?: ResponseMetadata
}

export interface ErrorResponse {
  code: string
  message: string
  details?: Record<string, string>
}

export interface ResponseMetadata {
  timestamp: Date
  requestId: string
  executionTime: number
  apiVersion: string
}

export class ${structName} {
  constructor()
  initialize(config: Record<string, string>): Promise<boolean>
  healthCheck(): Record<string, string>
  getServiceInfo(): Record<string, string>
  getMetrics(): Record<string, number>
}

export function init(): string`;
}

function generateBuildRs() {
  return `fn main() {
  napi_build::setup();
}`;
}

function generateTestFile(pkg) {
  const structName = pkg.name.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('').replace(/Service$/, '');

  return `const test = require('node:test');
const assert = require('node:assert');

// Import the native module
const { ${structName}, init } = require('../index');

test('module initialization', async (t) => {
  const result = init();
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.includes('initialized successfully'));
});

test('service creation', async (t) => {
  const service = new ${structName}();
  assert.ok(service instanceof ${structName});
});

test('service health check', async (t) => {
  const service = new ${structName}();
  const health = service.healthCheck();
  
  assert.strictEqual(typeof health, 'object');
  assert.strictEqual(health.status, 'healthy');
  assert.strictEqual(health.service, '${pkg.name}');
});

test('service info', async (t) => {
  const service = new ${structName}();
  const info = service.getServiceInfo();
  
  assert.strictEqual(typeof info, 'object');
  assert.strictEqual(info.name, '${pkg.name}');
  assert.strictEqual(info.version, '1.0.0');
});

test('service metrics', async (t) => {
  const service = new ${structName}();
  const metrics = service.getMetrics();
  
  assert.strictEqual(typeof metrics, 'object');
  assert.ok('uptime_seconds' in metrics);
  assert.ok('requests_processed' in metrics);
});

test('service initialization', async (t) => {
  const service = new ${structName}();
  const config = { environment: 'test' };
  const result = await service.initialize(config);
  
  assert.strictEqual(result, true);
});`;
}

// Create all additional packages
async function createAdditionalPackages() {
  const packagesDir = path.join(process.cwd(), 'packages');
  
  console.log('Creating 20 additional NAPI-RS packages...');
  
  for (const pkg of additionalPackages) {
    const packageDir = path.join(packagesDir, pkg.name);
    const srcDir = path.join(packageDir, 'src');
    const testDir = path.join(packageDir, 'test');
    
    // Create directories
    await fs.promises.mkdir(srcDir, { recursive: true });
    await fs.promises.mkdir(testDir, { recursive: true });
    
    // Generate files
    const packageJson = generatePackageJson(pkg);
    const cargoToml = generateCargoToml(pkg);
    const libRs = generateLibRs(pkg);
    const indexDTs = generateIndexDTs(pkg);
    const buildRs = generateBuildRs();
    const testFile = generateTestFile(pkg);
    
    // Write files
    await fs.promises.writeFile(
      path.join(packageDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    await fs.promises.writeFile(
      path.join(packageDir, 'Cargo.toml'),
      cargoToml
    );
    
    await fs.promises.writeFile(
      path.join(srcDir, 'lib.rs'),
      libRs
    );
    
    await fs.promises.writeFile(
      path.join(packageDir, 'index.d.ts'),
      indexDTs
    );
    
    await fs.promises.writeFile(
      path.join(packageDir, 'build.rs'),
      buildRs
    );

    await fs.promises.writeFile(
      path.join(testDir, 'basic.test.js'),
      testFile
    );
    
    console.log(`✅ Generated package: ${pkg.name}`);
  }
  
  console.log(`\n🎉 Successfully generated ${additionalPackages.length} additional packages!`);
  console.log(`📦 Total packages: ${additionalPackages.length + 20} (original 20 + new 20)`);
  
  // Update the workspace package.json to include new packages
  await updateWorkspacePackageJson();
}

async function updateWorkspacePackageJson() {
  const rootPackageJsonPath = path.join(process.cwd(), 'packages', 'package.json');
  
  try {
    let packageJson = {};
    try {
      const content = await fs.promises.readFile(rootPackageJsonPath, 'utf-8');
      packageJson = JSON.parse(content);
    } catch (error) {
      // File doesn't exist, create new one
    }
    
    packageJson.name = '@turbo-asset/packages';
    packageJson.version = '1.0.0';
    packageJson.description = 'Turbo Asset NAPI-RS Package Collection';
    packageJson.private = true;
    packageJson.scripts = {
      'build:all': 'npm run build --workspaces',
      'test:all': 'npm run test --workspaces',
      'clean:all': 'npm run clean --workspaces'
    };
    packageJson.workspaces = [
      '*'
    ];
    
    await fs.promises.writeFile(
      rootPackageJsonPath,
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log('✅ Updated workspace package.json');
  } catch (error) {
    console.error('Failed to update workspace package.json:', error);
  }
}

// Run the generator
createAdditionalPackages().catch(console.error);