#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of remaining 19 packages to create
const packages = [
  {
    name: 'notification-service',
    description: 'High-performance notification and messaging service with multi-channel delivery',
    features: ['real-time notifications', 'message queuing', 'template processing', 'delivery tracking']
  },
  {
    name: 'document-service',
    description: 'Document management service with version control and metadata processing',
    features: ['file upload/download', 'version control', 'metadata extraction', 'search indexing']
  },
  {
    name: 'bulk-data-service',
    description: 'High-performance bulk data import/export service with parallel processing',
    features: ['CSV/Excel processing', 'data validation', 'parallel processing', 'progress tracking']
  },
  {
    name: 'business-intelligence-service',
    description: 'Business intelligence and analytics service with ML capabilities',
    features: ['data aggregation', 'statistical analysis', 'predictive modeling', 'report generation']
  },
  {
    name: 'cad-integration-service',
    description: 'CAD file processing and integration service for floor plans and drawings',
    features: ['DWG/DXF parsing', 'coordinate transformation', 'layer extraction', 'spatial queries']
  },
  {
    name: 'chargeback-service',
    description: 'Cost allocation and chargeback calculation service',
    features: ['cost allocation', 'rate management', 'billing calculations', 'financial reporting']
  },
  {
    name: 'compliance-service',
    description: 'Regulatory compliance and audit trail service',
    features: ['compliance checking', 'audit logging', 'policy validation', 'regulatory reporting']
  },
  {
    name: 'custom-field-service',
    description: 'Dynamic custom field management and validation service',
    features: ['field definition', 'validation rules', 'form generation', 'data type handling']
  },
  {
    name: 'energy-management-service',
    description: 'Energy monitoring and sustainability reporting service',
    features: ['meter data processing', 'usage analytics', 'carbon footprint', 'efficiency optimization']
  },
  {
    name: 'inventory-service',
    description: 'Inventory management and stock optimization service',
    features: ['stock tracking', 'reorder management', 'demand forecasting', 'supplier integration']
  },
  {
    name: 'iot-device-service',
    description: 'IoT device management and sensor data processing service',
    features: ['device connectivity', 'sensor data processing', 'anomaly detection', 'device management']
  },
  {
    name: 'lease-management-service',
    description: 'Lease administration and contract management service',
    features: ['lease tracking', 'payment calculation', 'deadline management', 'financial reporting']
  },
  {
    name: 'maintenance-service',
    description: 'Maintenance management and work order processing service',
    features: ['preventive maintenance', 'work order management', 'resource scheduling', 'cost tracking']
  },
  {
    name: 'portfolio-service',
    description: 'Portfolio analytics and performance tracking service',
    features: ['portfolio metrics', 'performance analysis', 'benchmarking', 'trend analysis']
  },
  {
    name: 'reporting-service',
    description: 'Report generation and business intelligence service',
    features: ['report templates', 'data visualization', 'scheduled reports', 'export formats']
  },
  {
    name: 'space-utilization-service',
    description: 'Space utilization analytics and optimization service',
    features: ['occupancy tracking', 'utilization analysis', 'space optimization', 'sensor integration']
  },
  {
    name: 'work-order-service',
    description: 'Work order management and technician dispatch service',
    features: ['work order lifecycle', 'technician assignment', 'mobile support', 'progress tracking']
  },
  {
    name: 'workflow-engine',
    description: 'Configurable workflow engine with approval chains',
    features: ['workflow definition', 'state management', 'approval routing', 'SLA tracking']
  },
  {
    name: 'integration-service',
    description: 'Enterprise integration and API management service',
    features: ['API orchestration', 'data transformation', 'system connectivity', 'message routing']
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
  ).join('');

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

  /// Initialize the service
  #[napi]
  pub async fn initialize(&self, config: HashMap<String, String>) -> Result<bool> {
    // Initialize service with configuration
    Ok(true)
  }

  /// Health check for the service
  #[napi]
  pub fn health_check(&self) -> Result<String> {
    Ok("Service is healthy".to_string())
  }

  /// Get service information
  #[napi]
  pub fn get_service_info(&self) -> Result<HashMap<String, String>> {
    let mut info = HashMap::new();
    info.insert("name".to_string(), "${pkg.name}".to_string());
    info.insert("version".to_string(), "1.0.0".to_string());
    info.insert("description".to_string(), "${pkg.description}".to_string());
    Ok(info)
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
  ).join('');

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
  healthCheck(): string
  getServiceInfo(): Record<string, string>
}

export function init(): string`;
}

function generateBuildRs() {
  return `fn main() {
  napi_build::setup();
}`;
}

// Create all packages
async function createPackages() {
  const packagesDir = path.join(process.cwd(), 'packages');
  
  for (const pkg of packages) {
    const packageDir = path.join(packagesDir, pkg.name);
    const srcDir = path.join(packageDir, 'src');
    
    // Create directories
    await fs.promises.mkdir(srcDir, { recursive: true });
    
    // Generate files
    const packageJson = generatePackageJson(pkg);
    const cargoToml = generateCargoToml(pkg);
    const libRs = generateLibRs(pkg);
    const indexDTs = generateIndexDTs(pkg);
    const buildRs = generateBuildRs();
    
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
    
    console.log(`Generated package: ${pkg.name}`);
  }
  
  console.log(`Successfully generated ${packages.length} packages!`);
}

// Run the generator
createPackages().catch(console.error);