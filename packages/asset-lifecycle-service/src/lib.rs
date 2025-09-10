use chrono::{DateTime, Utc};
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

/// Asset lifecycle data structure
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetLifecycleData {
  #[napi(js_name = "baseEntity")]
  pub base_entity: BaseEntity,
  #[napi(js_name = "assetId")]
  pub asset_id: String,
  #[napi(js_name = "depreciationMethod")]
  pub depreciation_method: String,
  #[napi(js_name = "usefulLife")]
  pub useful_life: i32,
  #[napi(js_name = "salvageValue")]
  pub salvage_value: f64,
  #[napi(js_name = "purchasePrice")]
  pub purchase_price: f64,
  #[napi(js_name = "purchaseDate")]
  pub purchase_date: DateTime<Utc>,
  #[napi(js_name = "replacementCost")]
  pub replacement_cost: Option<f64>,
  #[napi(js_name = "replacementDate")]
  pub replacement_date: Option<DateTime<Utc>>,
  #[napi(js_name = "disposalMethod")]
  pub disposal_method: Option<String>,
  #[napi(js_name = "disposalValue")]
  pub disposal_value: Option<f64>,
}

/// Depreciation calculation result
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepreciationCalculation {
  pub year: i32,
  #[napi(js_name = "startingValue")]
  pub starting_value: f64,
  #[napi(js_name = "depreciationAmount")]
  pub depreciation_amount: f64,
  #[napi(js_name = "accumulatedDepreciation")]
  pub accumulated_depreciation: f64,
  #[napi(js_name = "endingValue")]
  pub ending_value: f64,
  pub rate: Option<f64>,
}

/// Replacement plan structure
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplacementPlan {
  #[napi(js_name = "assetId")]
  pub asset_id: String,
  #[napi(js_name = "assetName")]
  pub asset_name: String,
  #[napi(js_name = "currentAge")]
  pub current_age: i32,
  #[napi(js_name = "remainingUsefulLife")]
  pub remaining_useful_life: i32,
  #[napi(js_name = "currentCondition")]
  pub current_condition: String,
  #[napi(js_name = "estimatedReplacementCost")]
  pub estimated_replacement_cost: f64,
  #[napi(js_name = "recommendedReplacementDate")]
  pub recommended_replacement_date: DateTime<Utc>,
  pub priority: String, // 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW'
  pub justification: String,
  #[napi(js_name = "budgetImpact")]
  pub budget_impact: f64,
  #[napi(js_name = "riskOfFailure")]
  pub risk_of_failure: f64,
  #[napi(js_name = "businessImpact")]
  pub business_impact: String, // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  #[napi(js_name = "alternativeOptions")]
  pub alternative_options: Vec<String>,
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

/// Asset Lifecycle Service
#[napi]
pub struct AssetLifecycleService {
  // Connection pool or database connection would go here
  // For now, we'll implement in-memory operations
}

#[napi]
impl AssetLifecycleService {
  #[napi(constructor)]
  pub fn new() -> Self {
    Self {}
  }

  /// Calculate straight-line depreciation
  #[napi]
  pub fn calculate_straight_line_depreciation(
    &self,
    purchase_price: f64,
    salvage_value: f64,
    useful_life: i32,
    current_year: i32,
  ) -> Result<DepreciationCalculation> {
    if useful_life <= 0 {
      return Err(napi::Error::new(
        napi::Status::InvalidArg,
        "Useful life must be greater than 0".to_string(),
      ));
    }

    let annual_depreciation = (purchase_price - salvage_value) / useful_life as f64;
    let accumulated_depreciation = annual_depreciation * current_year as f64;
    let ending_value = purchase_price - accumulated_depreciation;

    Ok(DepreciationCalculation {
      year: current_year,
      starting_value: purchase_price - (annual_depreciation * (current_year - 1) as f64),
      depreciation_amount: annual_depreciation,
      accumulated_depreciation,
      ending_value: ending_value.max(salvage_value),
      rate: Some(1.0 / useful_life as f64),
    })
  }

  /// Calculate declining balance depreciation
  #[napi]
  pub fn calculate_declining_balance_depreciation(
    &self,
    purchase_price: f64,
    salvage_value: f64,
    useful_life: i32,
    current_year: i32,
    acceleration_factor: f64,
  ) -> Result<DepreciationCalculation> {
    if useful_life <= 0 {
      return Err(napi::Error::new(
        napi::Status::InvalidArg,
        "Useful life must be greater than 0".to_string(),
      ));
    }

    let rate = acceleration_factor / useful_life as f64;
    let mut book_value = purchase_price;
    let mut accumulated_depreciation = 0.0;

    for year in 1..=current_year {
      let depreciation_amount = book_value * rate;
      let potential_ending_value = book_value - depreciation_amount;
      
      if potential_ending_value < salvage_value {
        let final_depreciation = book_value - salvage_value;
        accumulated_depreciation += final_depreciation;
        book_value = salvage_value;
        break;
      } else {
        accumulated_depreciation += depreciation_amount;
        book_value -= depreciation_amount;
      }
    }

    let current_depreciation = if current_year == 1 {
      purchase_price * rate
    } else {
      book_value * rate
    };

    Ok(DepreciationCalculation {
      year: current_year,
      starting_value: purchase_price - (accumulated_depreciation - current_depreciation),
      depreciation_amount: current_depreciation,
      accumulated_depreciation,
      ending_value: book_value,
      rate: Some(rate),
    })
  }

  /// Generate replacement plan for assets
  #[napi]
  pub async fn generate_replacement_plan(
    &self,
    asset_id: String,
    asset_name: String,
    purchase_date: DateTime<Utc>,
    useful_life: i32,
    current_condition: String,
    replacement_cost: f64,
  ) -> Result<ReplacementPlan> {
    let current_date = Utc::now();
    let age_duration = current_date.signed_duration_since(purchase_date);
    let current_age = age_duration.num_days() / 365;
    let remaining_useful_life = useful_life - current_age as i32;

    let (priority, business_impact, risk_of_failure) = match current_condition.as_str() {
      "POOR" => ("IMMEDIATE", "CRITICAL", 0.9),
      "FAIR" => ("HIGH", "HIGH", 0.6),
      "GOOD" => ("MEDIUM", "MEDIUM", 0.3),
      "EXCELLENT" => ("LOW", "LOW", 0.1),
      _ => ("MEDIUM", "MEDIUM", 0.5),
    };

    let recommended_replacement_date = if remaining_useful_life <= 0 {
      current_date
    } else {
      current_date + chrono::Duration::days((remaining_useful_life * 365) as i64)
    };

    Ok(ReplacementPlan {
      asset_id,
      asset_name,
      current_age: current_age as i32,
      remaining_useful_life,
      current_condition,
      estimated_replacement_cost: replacement_cost,
      recommended_replacement_date,
      priority: priority.to_string(),
      justification: format!(
        "Asset is {} years old with {} condition. Remaining useful life: {} years.",
        current_age, current_condition.to_lowercase(), remaining_useful_life
      ),
      budget_impact: replacement_cost,
      risk_of_failure,
      business_impact: business_impact.to_string(),
      alternative_options: vec![
        "Refurbish existing asset".to_string(),
        "Lease replacement asset".to_string(),
        "Purchase new asset".to_string(),
      ],
    })
  }

  /// Validate asset lifecycle data
  #[napi]
  pub fn validate_asset_lifecycle_data(&self, data: &AssetLifecycleData) -> Result<bool> {
    // Basic validation
    if data.useful_life <= 0 {
      return Err(napi::Error::new(
        napi::Status::InvalidArg,
        "Useful life must be greater than 0".to_string(),
      ));
    }

    if data.purchase_price <= 0.0 {
      return Err(napi::Error::new(
        napi::Status::InvalidArg,
        "Purchase price must be greater than 0".to_string(),
      ));
    }

    if data.salvage_value < 0.0 {
      return Err(napi::Error::new(
        napi::Status::InvalidArg,
        "Salvage value cannot be negative".to_string(),
      ));
    }

    if data.salvage_value >= data.purchase_price {
      return Err(napi::Error::new(
        napi::Status::InvalidArg,
        "Salvage value must be less than purchase price".to_string(),
      ));
    }

    Ok(true)
  }

  /// Calculate total cost of ownership
  #[napi]
  pub async fn calculate_total_cost_of_ownership(
    &self,
    purchase_price: f64,
    annual_maintenance_cost: f64,
    annual_operating_cost: f64,
    useful_life: i32,
    disposal_cost: f64,
    salvage_value: f64,
  ) -> Result<f64> {
    let total_maintenance = annual_maintenance_cost * useful_life as f64;
    let total_operating = annual_operating_cost * useful_life as f64;
    let net_disposal_cost = disposal_cost - salvage_value;
    
    let tco = purchase_price + total_maintenance + total_operating + net_disposal_cost;
    Ok(tco)
  }
}

/// Initialize the module
#[napi]
pub fn init() -> Result<String> {
  Ok("Asset Lifecycle Service initialized successfully".to_string())
}