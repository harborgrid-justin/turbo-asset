/**
 * Infrastructure & Technology Domain Constants
 * 
 * Configuration constants for smart systems and infrastructure operations
 */

// ==================== IoT Device Constants ====================

export const IOT_DEVICE_CONSTANTS = {
  DEVICE_TYPES: {
    SENSOR: 'SENSOR',
    ACTUATOR: 'ACTUATOR',
    GATEWAY: 'GATEWAY',
    HYBRID: 'HYBRID',
  } as const,

  NETWORK_TYPES: {
    WIFI: 'WIFI',
    ETHERNET: 'ETHERNET',
    BLUETOOTH: 'BLUETOOTH',
    ZIGBEE: 'ZIGBEE',
    LORA: 'LORA',
    CELLULAR: 'CELLULAR',
  } as const,

  DEVICE_STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    MAINTENANCE: 'MAINTENANCE',
    ERROR: 'ERROR',
  } as const,

  SENSOR_TYPES: {
    TEMPERATURE: 'TEMPERATURE',
    HUMIDITY: 'HUMIDITY',
    PRESSURE: 'PRESSURE',
    VIBRATION: 'VIBRATION',
    OCCUPANCY: 'OCCUPANCY',
    LIGHT: 'LIGHT',
    SOUND: 'SOUND',
    AIR_QUALITY: 'AIR_QUALITY',
    MOTION: 'MOTION',
    DOOR_WINDOW: 'DOOR_WINDOW',
    WATER_LEAK: 'WATER_LEAK',
    SMOKE: 'SMOKE',
    CO2: 'CO2',
    ENERGY: 'ENERGY',
    FLOW: 'FLOW',
  } as const,

  QUALITY_LEVELS: {
    GOOD: 'GOOD',
    FAIR: 'FAIR',
    POOR: 'POOR',
    INVALID: 'INVALID',
  } as const,

  MONITORING_TYPES: {
    VIBRATION: 'VIBRATION',
    TEMPERATURE: 'TEMPERATURE',
    PRESSURE: 'PRESSURE',
    FLOW: 'FLOW',
    ELECTRICAL: 'ELECTRICAL',
    ACOUSTIC: 'ACOUSTIC',
  } as const,

  CONDITION_LEVELS: {
    EXCELLENT: 'EXCELLENT',
    GOOD: 'GOOD',
    FAIR: 'FAIR',
    POOR: 'POOR',
    CRITICAL: 'CRITICAL',
  } as const,

  TREND_DIRECTIONS: {
    IMPROVING: 'IMPROVING',
    STABLE: 'STABLE',
    DEGRADING: 'DEGRADING',
  } as const,

  EVENTS: {
    DEVICE_REGISTERED: 'device:registered',
    DEVICE_STATUS_CHANGED: 'device:status_changed',
    SENSOR_READING_RECEIVED: 'sensor:reading_received',
    CONDITION_ALERT: 'condition:alert',
    DEVICE_MAINTENANCE_DUE: 'device:maintenance_due',
    BATTERY_LOW: 'device:battery_low',
    DEVICE_OFFLINE: 'device:offline',
    DEVICE_ONLINE: 'device:online',
    CALIBRATION_DUE: 'device:calibration_due',
  } as const,

  CACHE_KEYS: {
    DEVICE_LIST: 'iot:devices:list',
    DEVICE_STATUS: 'iot:device:status',
    SENSOR_READINGS: 'iot:sensor:readings',
    METRICS: 'iot:metrics',
    HEALTH_SCORES: 'iot:health_scores',
  } as const,

  CACHE_TTL: {
    DEVICE_LIST: 300, // 5 minutes
    DEVICE_STATUS: 60, // 1 minute
    SENSOR_READINGS: 30, // 30 seconds
    METRICS: 600, // 10 minutes
    HEALTH_SCORES: 1800, // 30 minutes
  } as const,

  THRESHOLDS: {
    LOW_BATTERY_WARNING: 20,
    CRITICAL_BATTERY: 10,
    OFFLINE_TIMEOUT: 600000, // 10 minutes
    POOR_SIGNAL_STRENGTH: -70,
    MAINTENANCE_INTERVAL: 2592000000, // 30 days
    CALIBRATION_INTERVAL: 7776000000, // 90 days
  } as const,
};

// ==================== Energy Management Constants ====================

export const ENERGY_MANAGEMENT_CONSTANTS = {
  METER_TYPES: {
    ELECTRIC: 'ELECTRIC',
    GAS: 'GAS',
    WATER: 'WATER',
    STEAM: 'STEAM',
    CHILLED_WATER: 'CHILLED_WATER',
  } as const,

  UTILITY_TYPES: {
    ELECTRIC: 'ELECTRIC',
    NATURAL_GAS: 'NATURAL_GAS',
    WATER: 'WATER',
    STEAM: 'STEAM',
    CHILLED_WATER: 'CHILLED_WATER',
  } as const,

  READING_FREQUENCIES: {
    REAL_TIME: 'REAL_TIME',
    HOURLY: 'HOURLY',
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
  } as const,

  READING_TYPES: {
    ACTUAL: 'ACTUAL',
    ESTIMATED: 'ESTIMATED',
    INTERPOLATED: 'INTERPOLATED',
  } as const,

  READING_METHODS: {
    MANUAL: 'MANUAL',
    AUTOMATIC: 'AUTOMATIC',
    REMOTE: 'REMOTE',
  } as const,

  SUSTAINABILITY_CATEGORIES: {
    ENERGY: 'ENERGY',
    WATER: 'WATER',
    WASTE: 'WASTE',
    EMISSIONS: 'EMISSIONS',
    TRANSPORTATION: 'TRANSPORTATION',
  } as const,

  REPORTING_PERIODS: {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    ANNUALLY: 'ANNUALLY',
  } as const,

  UNITS: {
    KWH: 'kWh',
    MWH: 'MWh',
    THERMS: 'therms',
    CCF: 'CCF',
    GALLONS: 'gallons',
    LITERS: 'liters',
    POUNDS_STEAM: 'lbs_steam',
    TON_HOURS: 'ton_hours',
    BTU: 'BTU',
    JOULES: 'J',
    KG_CO2: 'kg_CO2',
    TONS_CO2: 'tons_CO2',
  } as const,

  EVENTS: {
    METER_READING_RECORDED: 'energy:reading_recorded',
    CONSUMPTION_ANOMALY: 'energy:consumption_anomaly',
    PEAK_DEMAND_ALERT: 'energy:peak_demand_alert',
    SUSTAINABILITY_TARGET_MET: 'energy:sustainability_target_met',
    COST_THRESHOLD_EXCEEDED: 'energy:cost_threshold_exceeded',
    METER_MAINTENANCE_DUE: 'energy:meter_maintenance_due',
    CALIBRATION_REQUIRED: 'energy:calibration_required',
  } as const,

  CACHE_KEYS: {
    METER_LIST: 'energy:meters:list',
    READINGS: 'energy:readings',
    CONSUMPTION_DATA: 'energy:consumption',
    COST_ANALYSIS: 'energy:cost_analysis',
    SUSTAINABILITY_METRICS: 'energy:sustainability',
  } as const,

  CACHE_TTL: {
    METER_LIST: 1800, // 30 minutes
    READINGS: 300, // 5 minutes
    CONSUMPTION_DATA: 3600, // 1 hour
    COST_ANALYSIS: 7200, // 2 hours
    SUSTAINABILITY_METRICS: 14400, // 4 hours
  } as const,

  THRESHOLDS: {
    CONSUMPTION_VARIANCE: 0.15, // 15%
    COST_ALERT_PERCENTAGE: 0.20, // 20% over budget
    ANOMALY_DETECTION_THRESHOLD: 2.5, // Standard deviations
    PEAK_DEMAND_WARNING: 0.90, // 90% of capacity
    SUSTAINABILITY_TARGET_WARNING: 0.85, // 85% of target
  } as const,
};

// ==================== CAD Integration Constants ====================

export const CAD_INTEGRATION_CONSTANTS = {
  FILE_TYPES: {
    DWG: 'DWG',
    DXF: 'DXF',
    PDF: 'PDF',
    RVT: 'RVT',
    IFC: 'IFC',
    SKP: 'SKP',
    STEP: 'STEP',
  } as const,

  CATEGORIES: {
    ARCHITECTURAL: 'ARCHITECTURAL',
    STRUCTURAL: 'STRUCTURAL',
    MECHANICAL: 'MECHANICAL',
    ELECTRICAL: 'ELECTRICAL',
    PLUMBING: 'PLUMBING',
    FIRE_SAFETY: 'FIRE_SAFETY',
  } as const,

  FILE_STATUS: {
    DRAFT: 'DRAFT',
    REVIEW: 'REVIEW',
    APPROVED: 'APPROVED',
    ARCHIVED: 'ARCHIVED',
  } as const,

  ANNOTATION_TYPES: {
    TEXT: 'TEXT',
    DIMENSION: 'DIMENSION',
    LEADER: 'LEADER',
    SYMBOL: 'SYMBOL',
    HATCH: 'HATCH',
  } as const,

  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_FORMATS: ['.dwg', '.dxf', '.pdf', '.rvt', '.ifc', '.skp', '.step'],

  EVENTS: {
    FILE_UPLOADED: 'cad:file_uploaded',
    FILE_PROCESSED: 'cad:file_processed',
    FILE_APPROVED: 'cad:file_approved',
    FILE_VERSION_CREATED: 'cad:version_created',
    ANNOTATION_ADDED: 'cad:annotation_added',
    LAYER_UPDATED: 'cad:layer_updated',
  } as const,

  CACHE_KEYS: {
    FILE_LIST: 'cad:files:list',
    FILE_METADATA: 'cad:file:metadata',
    THUMBNAILS: 'cad:thumbnails',
    LAYERS: 'cad:layers',
    ANNOTATIONS: 'cad:annotations',
  } as const,

  CACHE_TTL: {
    FILE_LIST: 3600, // 1 hour
    FILE_METADATA: 1800, // 30 minutes
    THUMBNAILS: 86400, // 24 hours
    LAYERS: 7200, // 2 hours
    ANNOTATIONS: 3600, // 1 hour
  } as const,
};

// ==================== Business Intelligence Constants ====================

export const BUSINESS_INTELLIGENCE_CONSTANTS = {
  DASHBOARD_CATEGORIES: {
    OPERATIONAL: 'OPERATIONAL',
    FINANCIAL: 'FINANCIAL',
    SUSTAINABILITY: 'SUSTAINABILITY',
    PERFORMANCE: 'PERFORMANCE',
    EXECUTIVE: 'EXECUTIVE',
  } as const,

  WIDGET_TYPES: {
    CHART: 'CHART',
    KPI: 'KPI',
    TABLE: 'TABLE',
    MAP: 'MAP',
    GAUGE: 'GAUGE',
    TEXT: 'TEXT',
  } as const,

  CHART_TYPES: {
    LINE: 'LINE',
    BAR: 'BAR',
    PIE: 'PIE',
    SCATTER: 'SCATTER',
    AREA: 'AREA',
    HEATMAP: 'HEATMAP',
  } as const,

  FILTER_OPERATORS: {
    EQUALS: 'EQUALS',
    NOT_EQUALS: 'NOT_EQUALS',
    GREATER_THAN: 'GREATER_THAN',
    LESS_THAN: 'LESS_THAN',
    CONTAINS: 'CONTAINS',
    IN: 'IN',
    BETWEEN: 'BETWEEN',
  } as const,

  DEFAULT_LAYOUTS: {
    STANDARD: { columns: 12, rows: 8, gridSize: 1 },
    WIDE: { columns: 16, rows: 10, gridSize: 1 },
    MOBILE: { columns: 4, rows: 12, gridSize: 1 },
  } as const,

  REFRESH_INTERVALS: {
    REAL_TIME: 5000, // 5 seconds
    FREQUENT: 30000, // 30 seconds
    REGULAR: 300000, // 5 minutes
    HOURLY: 3600000, // 1 hour
    DAILY: 86400000, // 24 hours
  } as const,

  EVENTS: {
    DASHBOARD_CREATED: 'bi:dashboard_created',
    WIDGET_UPDATED: 'bi:widget_updated',
    REPORT_GENERATED: 'bi:report_generated',
    DATA_REFRESHED: 'bi:data_refreshed',
    ALERT_TRIGGERED: 'bi:alert_triggered',
  } as const,

  CACHE_KEYS: {
    DASHBOARD_LIST: 'bi:dashboards:list',
    DASHBOARD_DATA: 'bi:dashboard:data',
    WIDGET_DATA: 'bi:widget:data',
    REPORT_DATA: 'bi:report:data',
    QUERY_RESULTS: 'bi:query:results',
  } as const,

  CACHE_TTL: {
    DASHBOARD_LIST: 1800, // 30 minutes
    DASHBOARD_DATA: 300, // 5 minutes
    WIDGET_DATA: 60, // 1 minute
    REPORT_DATA: 3600, // 1 hour
    QUERY_RESULTS: 600, // 10 minutes
  } as const,
};

// ==================== Predictive Analytics Constants ====================

export const PREDICTIVE_ANALYTICS_CONSTANTS = {
  RISK_LEVELS: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
  } as const,

  MAINTENANCE_TYPES: {
    PREVENTIVE: 'PREVENTIVE',
    CORRECTIVE: 'CORRECTIVE',
    EMERGENCY: 'EMERGENCY',
  } as const,

  RECOMMENDATION_TYPES: {
    MAINTENANCE: 'MAINTENANCE',
    REPLACEMENT: 'REPLACEMENT',
    MONITORING: 'MONITORING',
    INVESTIGATION: 'INVESTIGATION',
  } as const,

  PRIORITIES: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  } as const,

  MODEL_TYPES: {
    TIME_SERIES: 'TIME_SERIES',
    REGRESSION: 'REGRESSION',
    CLASSIFICATION: 'CLASSIFICATION',
    ANOMALY_DETECTION: 'ANOMALY_DETECTION',
    CLUSTERING: 'CLUSTERING',
  } as const,

  CONFIDENCE_THRESHOLDS: {
    LOW: 0.6,
    MEDIUM: 0.75,
    HIGH: 0.85,
    VERY_HIGH: 0.95,
  } as const,

  EVENTS: {
    PREDICTION_GENERATED: 'prediction:generated',
    MAINTENANCE_RECOMMENDED: 'prediction:maintenance_recommended',
    FAILURE_PREDICTED: 'prediction:failure_predicted',
    MODEL_UPDATED: 'prediction:model_updated',
    ANOMALY_DETECTED: 'prediction:anomaly_detected',
  } as const,

  CACHE_KEYS: {
    PREDICTIONS: 'prediction:predictions',
    MODEL_RESULTS: 'prediction:model_results',
    INSIGHTS: 'prediction:insights',
    RECOMMENDATIONS: 'prediction:recommendations',
  } as const,

  CACHE_TTL: {
    PREDICTIONS: 3600, // 1 hour
    MODEL_RESULTS: 7200, // 2 hours
    INSIGHTS: 14400, // 4 hours
    RECOMMENDATIONS: 1800, // 30 minutes
  } as const,
};

// ==================== General Infrastructure Constants ====================

export const INFRASTRUCTURE_CONSTANTS = {
  SYSTEMS: {
    IOT: 'IOT',
    ENERGY: 'ENERGY',
    CAD: 'CAD',
    BI: 'BI',
    PREDICTIVE: 'PREDICTIVE',
  } as const,

  EVENTS: {
    SYSTEM_PROVISIONED: 'infrastructure:system_provisioned',
    CONTEXT_CREATED: 'infrastructure:context_created',
    DASHBOARD_GENERATED: 'infrastructure:dashboard_generated',
    INTEGRATION_ESTABLISHED: 'infrastructure:integration_established',
  } as const,

  CACHE_KEYS: {
    SYSTEM_STATUS: 'infrastructure:system_status',
    DASHBOARD_DATA: 'infrastructure:dashboard_data',
    INTEGRATION_HEALTH: 'infrastructure:integration_health',
    METRICS_SUMMARY: 'infrastructure:metrics_summary',
  } as const,

  CACHE_TTL: {
    SYSTEM_STATUS: 300, // 5 minutes
    DASHBOARD_DATA: 600, // 10 minutes
    INTEGRATION_HEALTH: 900, // 15 minutes
    METRICS_SUMMARY: 1800, // 30 minutes
  } as const,

  VALIDATION_RULES: {
    DEVICE_NAME: {
      minLength: 3,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_]+$/,
    },
    METER_NUMBER: {
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9\-_]+$/,
    },
    IP_ADDRESS: {
      pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    },
    MAC_ADDRESS: {
      pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    },
    FILE_NAME: {
      minLength: 1,
      maxLength: 255,
      pattern: /^[^<>:"/\\|?*\x00-\x1f]+$/,
    },
  },

  ERROR_CODES: {
    DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
    METER_NOT_FOUND: 'METER_NOT_FOUND',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
    INVALID_READING: 'INVALID_READING',
    CALIBRATION_EXPIRED: 'CALIBRATION_EXPIRED',
    PREDICTION_FAILED: 'PREDICTION_FAILED',
    DASHBOARD_ERROR: 'DASHBOARD_ERROR',
    INTEGRATION_FAILED: 'INTEGRATION_FAILED',
  },
} as const;

// ==================== Export All Constants ====================

export const ALL_INFRASTRUCTURE_CONSTANTS = {
  IOT_DEVICE: IOT_DEVICE_CONSTANTS,
  ENERGY_MANAGEMENT: ENERGY_MANAGEMENT_CONSTANTS,
  CAD_INTEGRATION: CAD_INTEGRATION_CONSTANTS,
  BUSINESS_INTELLIGENCE: BUSINESS_INTELLIGENCE_CONSTANTS,
  PREDICTIVE_ANALYTICS: PREDICTIVE_ANALYTICS_CONSTANTS,
  INFRASTRUCTURE: INFRASTRUCTURE_CONSTANTS,
} as const;