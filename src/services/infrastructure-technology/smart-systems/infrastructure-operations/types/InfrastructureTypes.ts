/**
 * Infrastructure & Technology Domain Types
 * 
 * Comprehensive type definitions for smart systems and infrastructure operations
 */

// ==================== IoT Device Management Types ====================

export interface IoTDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'SENSOR' | 'ACTUATOR' | 'GATEWAY' | 'HYBRID';
  manufacturer?: string;
  model?: string;
  firmware?: string;
  assetId?: string;
  location: string;
  building?: string;
  floor?: string;
  coordinates?: string;
  ipAddress?: string;
  macAddress?: string;
  networkType: 'WIFI' | 'ETHERNET' | 'BLUETOOTH' | 'ZIGBEE' | 'LORA' | 'CELLULAR';
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'ERROR';
  isOnline: boolean;
  lastHeartbeat?: Date;
  sensorTypes: string[];
  samplingRate?: number;
  reportingInterval?: number;
  alertThresholds?: Record<string, any>;
  alertsEnabled: boolean;
  batteryLevel?: number;
  signalStrength?: number;
  organizationId: string;
  installedBy?: string;
  installedDate: Date;
  maintenanceDate?: Date;
  lastCalibrated?: Date;
  created: Date;
  updated: Date;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  sensorType: string;
  value: number;
  unit: string;
  rawValue?: number;
  calibrationOffset?: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  quality: 'GOOD' | 'FAIR' | 'POOR' | 'INVALID';
  timestamp: Date;
  correlationId?: string;
}

export interface ConditionMonitoring {
  id: string;
  deviceId: string;
  assetId?: string;
  monitoringType: 'VIBRATION' | 'TEMPERATURE' | 'PRESSURE' | 'FLOW' | 'ELECTRICAL' | 'ACOUSTIC';
  overallCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  healthScore: number; // 0-100
  riskScore: number; // 0-100
  trendDirection: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  changeRate?: number;
  recommendations: string[];
  nextMaintenanceDate?: Date;
  criticalAlerts: string[];
  timestamp: Date;
}

// ==================== Energy Management Types ====================

export interface EnergyMeter {
  id: string;
  meterNumber: string;
  meterName: string;
  meterType: 'ELECTRIC' | 'GAS' | 'WATER' | 'STEAM' | 'CHILLED_WATER';
  utilityType: 'ELECTRIC' | 'NATURAL_GAS' | 'WATER' | 'STEAM' | 'CHILLED_WATER';
  assetId?: string;
  building: string;
  floor?: string;
  location: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: Date;
  calibrationDate?: Date;
  nextCalibrationDate?: Date;
  capacity?: number;
  units: string;
  multiplier: number;
  isSmartMeter: boolean;
  remoteReadCapable: boolean;
  readingFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  iotDeviceId?: string;
  organizationId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  created: Date;
  updated: Date;
}

export interface EnergyReading {
  id: string;
  meterId: string;
  readingDate: Date;
  reading: number;
  previousReading?: number;
  consumption?: number;
  readingType: 'ACTUAL' | 'ESTIMATED' | 'INTERPOLATED';
  readingMethod: 'MANUAL' | 'AUTOMATIC' | 'REMOTE';
  rate?: number;
  cost?: number;
  demandCharge?: number;
  peakDemand?: number;
  powerFactor?: number;
  readBy?: string;
  notes?: string;
  validated: boolean;
  anomalyDetected: boolean;
}

export interface SustainabilityMetrics {
  id: string;
  organizationId: string;
  metricName: string;
  category: 'ENERGY' | 'WATER' | 'WASTE' | 'EMISSIONS' | 'TRANSPORTATION';
  reportingPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  startDate: Date;
  endDate: Date;
  value: number;
  unit: string;
  baseline?: number;
  target?: number;
  benchmarkValue?: number;
  percentageChange?: number;
  trendDirection: 'IMPROVING' | 'STABLE' | 'WORSENING';
  carbonFootprint?: number;
  certifications: string[];
  created: Date;
  updated: Date;
}

// ==================== CAD Integration Types ====================

export interface CADFile {
  id: string;
  fileName: string;
  fileType: 'DWG' | 'DXF' | 'PDF' | 'RVT' | 'IFC' | 'SKP' | 'STEP';
  version: string;
  assetId?: string;
  buildingId?: string;
  floorId?: string;
  spaceId?: string;
  category: 'ARCHITECTURAL' | 'STRUCTURAL' | 'MECHANICAL' | 'ELECTRICAL' | 'PLUMBING' | 'FIRE_SAFETY';
  discipline: string;
  drawingNumber?: string;
  title?: string;
  scale?: string;
  fileSize: number;
  filePath: string;
  thumbnailPath?: string;
  metadata: Record<string, any>;
  layers: CADLayer[];
  annotations: CADAnnotation[];
  organizationId: string;
  uploadedBy: string;
  approvedBy?: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ARCHIVED';
  created: Date;
  updated: Date;
}

export interface CADLayer {
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  lineType: string;
  lineWeight: number;
  objects: number;
}

export interface CADAnnotation {
  id: string;
  type: 'TEXT' | 'DIMENSION' | 'LEADER' | 'SYMBOL' | 'HATCH';
  content: string;
  position: {
    x: number;
    y: number;
    z?: number;
  };
  properties: Record<string, any>;
}

// ==================== Business Intelligence Types ====================

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category: 'OPERATIONAL' | 'FINANCIAL' | 'SUSTAINABILITY' | 'PERFORMANCE' | 'EXECUTIVE';
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  filters: DashboardFilter[];
  refreshInterval?: number;
  isPublic: boolean;
  organizationId: string;
  createdBy: string;
  sharedWith: string[];
  created: Date;
  updated: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'CHART' | 'KPI' | 'TABLE' | 'MAP' | 'GAUGE' | 'TEXT';
  title: string;
  dataSource: string;
  query: string;
  chartType?: 'LINE' | 'BAR' | 'PIE' | 'SCATTER' | 'AREA' | 'HEATMAP';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  configuration: Record<string, any>;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gridSize: number;
}

export interface DashboardFilter {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IN' | 'BETWEEN';
  value: any;
  label: string;
}

// ==================== Context and Provisioning Types ====================

export interface InfrastructureContext {
  organizationId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  buildings: string[];
  systems: string[];
}

export interface InfrastructureProvisioningOptions {
  organizationId: string;
  systems: ('IOT' | 'ENERGY' | 'CAD' | 'BI' | 'PREDICTIVE')[];
  settings: {
    iotEnabled: boolean;
    energyManagement: boolean;
    cadIntegration: boolean;
    businessIntelligence: boolean;
    predictiveAnalytics: boolean;
    sustainabilityTracking: boolean;
  };
  integrations: {
    existingSystems: string[];
    apiEndpoints: Record<string, string>;
    credentials: Record<string, any>;
  };
}

export interface InfrastructureDashboardData {
  iotDeviceMetrics: {
    totalDevices: number;
    onlineDevices: number;
    alertCount: number;
    batteryLowCount: number;
  };
  energyMetrics: {
    totalConsumption: number;
    costSavings: number;
    sustainabilityScore: number;
    peakDemand: number;
  };
  cadMetrics: {
    totalDrawings: number;
    recentUploads: number;
    pendingReviews: number;
    storageUsed: number;
  };
  biMetrics: {
    activeDashboards: number;
    reportsGenerated: number;
    dataQualityScore: number;
    userEngagement: number;
  };
}

// ==================== Predictive Analytics Types ====================

export interface PredictiveMaintenanceInsight {
  id: string;
  assetId: string;
  deviceId?: string;
  assetType: string;
  predictedFailureDate: Date;
  confidenceLevel: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY';
  estimatedCost: number;
  potentialSavings: number;
  recommendations: PredictiveRecommendation[];
  dataPoints: number;
  modelAccuracy: number;
  lastAnalysis: Date;
}

export interface PredictiveRecommendation {
  type: 'MAINTENANCE' | 'REPLACEMENT' | 'MONITORING' | 'INVESTIGATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description: string;
  estimatedEffort: string;
  estimatedCost: number;
  expectedBenefit: string;
}

export interface IoTMetrics {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  devicesInMaintenance: number;
  totalReadings: number;
  readingsToday: number;
  alertsActive: number;
  alertsCritical: number;
  averageBatteryLevel: number;
  averageSignalStrength: number;
  dataQualityScore: number;
  uptimePercentage: number;
}