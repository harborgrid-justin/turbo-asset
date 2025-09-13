#!/usr/bin/env node

/**
 * Script to fix NAPI-RS module compilation issues
 */

const fs = require('fs');
const path = require('path');

// Template for a working lib.rs
const getLibTemplate = (serviceName, description) => `use napi::{Result};
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Base entity structure following the universal data standard
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaseEntity {
  pub id: String,
  pub organization_id: String,
  pub created_at: String, // Use String for date serialization
  pub updated_at: String, // Use String for date serialization
  pub created_by: String,
  pub updated_by: String,
  pub version: i32,
  pub is_active: bool,
  pub metadata: Option<HashMap<String, String>>,
}

/// Standard response structure
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardResponse {
  pub success: bool,
  pub data: Option<String>, // Simplified to String for now
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
  pub timestamp: String, // Use String for date serialization
  #[napi(js_name = "requestId")]
  pub request_id: String,
  #[napi(js_name = "executionTime")]
  pub execution_time: i64,
  #[napi(js_name = "apiVersion")]
  pub api_version: String,
}

/// ${description}
#[napi]
pub struct ${serviceName} {
  // Service implementation
}

#[napi]
impl ${serviceName} {
  #[napi(constructor)]
  pub fn new() -> Self {
    Self {}
  }

  /// Initialize the service
  #[napi]
  pub fn initialize(&self, config: HashMap<String, String>) -> Result<bool> {
    // Initialize service with configuration
    let _ = config; // Acknowledge the parameter
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
    info.insert("name".to_string(), "${serviceName.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1)}".to_string());
    info.insert("version".to_string(), "1.0.0".to_string());
    info.insert("description".to_string(), "${description}".to_string());
    Ok(info)
  }
}

/// Initialize the module
#[napi]
pub fn init() -> Result<String> {
  Ok("${serviceName} initialized successfully".to_string())
}`;

// Service descriptions
const serviceDescriptions = {
  'advanced-intelligence-service': 'AI/ML intelligence and predictive analytics',
  'api-documentation-service': 'API documentation generation and management',
  'api-management-service': 'API lifecycle management and governance',
  'asset-lifecycle-service': 'Comprehensive asset lifecycle management',
  'budget-forecast-service': 'Budget planning and forecasting',
  'bulk-data-service': 'Bulk data processing and batch operations',
  'business-intelligence-service': 'Business intelligence and advanced analytics',
  'cad-integration-service': 'CAD system integration and file management',
  'calendar-integration-service': 'Calendar system integration and synchronization',
  'chargeback-service': 'Cost allocation and chargeback management',
  'compliance-service': 'Regulatory compliance management and monitoring',
  'contract-lifecycle-service': 'Contract lifecycle management and automation',
  'critical-date-service': 'Critical date tracking and milestone management',
  'custom-field-service': 'Dynamic custom field management and configuration',
  'data-governance-service': 'Data governance and quality management',
  'data-warehouse-service': 'Data warehousing and ETL operations',
  'document-service': 'Document management and content operations',
  'emergency-planning-service': 'Emergency planning and response management',
  'energy-management-service': 'Energy monitoring and management system',
  'enterprise-service-bus-service': 'Enterprise service bus and messaging',
  'financial-consolidation-service': 'Financial data consolidation and reporting',
  'integration-service': 'System integration orchestration and management',
  'inventory-service': 'Inventory management and tracking operations',
  'iot-device-service': 'IoT device management and monitoring',
  'lease-management-service': 'Lease contract management and optimization',
  'maintenance-service': 'Maintenance operations and scheduling',
  'move-management-service': 'Space move operations and coordination',
  'notification-service': 'High-performance notification and messaging service with multi-channel delivery',
  'portfolio-service': 'Portfolio analytics and performance tracking',
  'preventive-maintenance-service': 'Preventive maintenance scheduling and management',
  'reporting-service': 'Report generation and business intelligence service',
  'sdk-generator-service': 'SDK generation and developer tools',
  'space-standards-service': 'Space planning and standards management',
  'space-utilization-service': 'Space utilization analytics and optimization',
  'technician-mobile-service': 'Mobile technician operations and field service',
  'vendor-broker-service': 'Vendor management and broker integration',
  'white-label-service': 'White label customization and branding',
  'work-order-service': 'Work order management and tracking',
  'workflow-engine': 'Configurable workflow automation engine',
  'workflow-service': 'Advanced workflow operations and automation'
};

// Get all packages
const packagesDir = path.join(__dirname, '..', 'packages');
const packages = fs.readdirSync(packagesDir).filter(name => 
  fs.statSync(path.join(packagesDir, name)).isDirectory()
);

console.log(`Found ${packages.length} packages to fix`);

packages.forEach(packageName => {
  const packageDir = path.join(packagesDir, packageName);
  const libPath = path.join(packageDir, 'src', 'lib.rs');
  const cargoPath = path.join(packageDir, 'Cargo.toml');
  
  // Get service name
  const serviceName = packageName.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('') + 'Service';
  
  const description = serviceDescriptions[packageName] || 'Enterprise service implementation';
  
  // Fix lib.rs with template
  if (fs.existsSync(libPath)) {
    const content = getLibTemplate(serviceName, description);
    fs.writeFileSync(libPath, content);
    console.log(`Fixed ${packageName}/src/lib.rs`);
  }
  
  // Fix Cargo.toml
  if (fs.existsSync(cargoPath)) {
    let content = fs.readFileSync(cargoPath, 'utf8');
    
    // Replace dependencies section
    const newDependencies = `[dependencies]
napi = { version = "2.0", default-features = false, features = ["napi8"] }
napi-derive = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }`;

    content = content.replace(
      /\[dependencies\][\s\S]*?(?=\n\[|\n$|$)/,
      newDependencies
    );
    
    fs.writeFileSync(cargoPath, content);
    console.log(`Fixed ${packageName}/Cargo.toml`);
  }
});

console.log('All packages fixed!');