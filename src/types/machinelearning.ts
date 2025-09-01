/**
 * Machine Learning Type Definitions
 * Core types for Phase 7 Advanced Analytics & Machine Learning
 */

// Core ML Model Types
export interface MLModel {
  id: string;
  name: string;
  type: MLModelType;
  version: string;
  status: MLModelStatus;
  accuracy: number;
  trainedAt: Date;
  lastUpdated: Date;
  parameters: Record<string, any>;
  metadata: MLModelMetadata;
}

export type MLModelType = 
  | 'PREDICTIVE_ANALYTICS' 
  | 'ANOMALY_DETECTION' 
  | 'CLASSIFICATION' 
  | 'REGRESSION' 
  | 'CLUSTERING' 
  | 'TIME_SERIES' 
  | 'COMPUTER_VISION' 
  | 'NLP' 
  | 'RECOMMENDATION' 
  | 'FORECASTING';

export type MLModelStatus = 
  | 'TRAINING' 
  | 'TRAINED' 
  | 'DEPLOYED' 
  | 'DEPRECATED' 
  | 'FAILED';

export interface MLModelMetadata {
  trainingDataSize: number;
  features: string[];
  target: string;
  algorithm: string;
  hyperparameters: Record<string, any>;
  validationMetrics: MLValidationMetrics;
}

export interface MLValidationMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  rmse?: number;
  mae?: number;
  r2Score?: number;
  auc?: number;
}

// Predictive Analytics Types
export interface PredictiveModel {
  modelId: string;
  prediction: number | string | boolean;
  confidence: number;
  features: Record<string, any>;
  timestamp: Date;
  horizon: number; // prediction horizon in days
}

export interface SpaceOptimizationPrediction {
  spaceId: string;
  currentUtilization: number;
  predictedUtilization: number;
  optimizationPotential: number;
  recommendations: SpaceOptimizationRecommendation[];
  confidence: number;
  forecastPeriod: number;
}

export interface SpaceOptimizationRecommendation {
  type: 'CONSOLIDATE' | 'EXPAND' | 'RECONFIGURE' | 'RELOCATE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  expectedSavings: number;
  implementationCost: number;
  roi: number;
  timeline: string;
}

export interface CostForecastModel {
  forecastId: string;
  organizationId: string;
  forecastType: 'MAINTENANCE' | 'ENERGY' | 'LEASE' | 'OPERATIONAL';
  predictions: CostPrediction[];
  confidence: number;
  modelAccuracy: number;
}

export interface CostPrediction {
  period: Date;
  predictedCost: number;
  lowerBound: number;
  upperBound: number;
  factors: CostFactor[];
}

export interface CostFactor {
  name: string;
  impact: number;
  confidence: number;
  description: string;
}

// Anomaly Detection Types
export interface AnomalyDetectionModel {
  modelId: string;
  type: 'ENERGY' | 'UTILIZATION' | 'MAINTENANCE' | 'TEMPERATURE' | 'OCCUPANCY';
  threshold: number;
  sensitivity: number;
  lookbackPeriod: number;
  features: string[];
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  timestamp: Date;
  entityId: string;
  entityType: string;
  value: number;
  expectedRange: [number, number];
  deviation: number;
  confidence: number;
  description: string;
  rootCause?: string;
  recommendations: string[];
}

export type AnomalyType = 
  | 'ENERGY_SPIKE' 
  | 'ENERGY_DROP' 
  | 'UTILIZATION_ANOMALY' 
  | 'TEMPERATURE_ANOMALY' 
  | 'OCCUPANCY_ANOMALY' 
  | 'MAINTENANCE_ANOMALY';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Computer Vision Types
export interface ComputerVisionModel {
  modelId: string;
  type: 'FACILITY_CONDITION' | 'OCCUPANCY_DETECTION' | 'EQUIPMENT_INSPECTION' | 'SAFETY_MONITORING';
  inputFormat: 'IMAGE' | 'VIDEO' | 'STREAM';
  outputFormat: 'CLASSIFICATION' | 'OBJECT_DETECTION' | 'SEGMENTATION';
  accuracy: number;
  processingTime: number;
}

export interface FacilityConditionAssessment {
  assessmentId: string;
  facilityId: string;
  imageUrl: string;
  timestamp: Date;
  overallCondition: ConditionScore;
  detectedIssues: DetectedIssue[];
  maintenanceRecommendations: MaintenanceRecommendation[];
  confidence: number;
}

export interface ConditionScore {
  overall: number;
  structural: number;
  electrical: number;
  plumbing: number;
  hvac: number;
  flooring: number;
  lighting: number;
  safety: number;
}

export interface DetectedIssue {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: BoundingBox;
  description: string;
  confidence: number;
  estimatedCost: number;
  urgency: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MaintenanceRecommendation {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  description: string;
  estimatedCost: number;
  timeframe: string;
  preventive: boolean;
}

// Natural Language Processing Types
export interface NLPModel {
  modelId: string;
  type: 'CLASSIFICATION' | 'SENTIMENT' | 'ENTITY_EXTRACTION' | 'SUMMARIZATION';
  language: string;
  accuracy: number;
  vocabulary: number;
}

export interface TicketClassification {
  ticketId: string;
  content: string;
  predictedCategory: TicketCategory;
  predictedPriority: TicketPriority;
  predictedDepartment: string;
  confidence: number;
  extractedEntities: ExtractedEntity[];
  sentiment: SentimentScore;
}

export interface TicketCategory {
  category: string;
  subcategory?: string;
  confidence: number;
}

export interface TicketPriority {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  confidence: number;
  reasoning: string;
}

export interface ExtractedEntity {
  type: 'LOCATION' | 'ASSET' | 'PERSON' | 'ORGANIZATION' | 'ISSUE_TYPE';
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface SentimentScore {
  overall: number;
  positive: number;
  negative: number;
  neutral: number;
  confidence: number;
}

// Recommendation Engine Types
export interface RecommendationEngine {
  engineId: string;
  type: 'VENDOR' | 'LEASE' | 'MAINTENANCE' | 'SPACE' | 'ENERGY';
  algorithm: 'COLLABORATIVE' | 'CONTENT_BASED' | 'HYBRID' | 'MATRIX_FACTORIZATION';
  accuracy: number;
  lastTrained: Date;
}

export interface VendorRecommendation {
  vendorId: string;
  score: number;
  factors: RecommendationFactor[];
  historicalPerformance: VendorPerformance;
  costAnalysis: CostAnalysis;
  riskAssessment: RiskAssessment;
  confidence: number;
}

export interface RecommendationFactor {
  name: string;
  weight: number;
  value: number;
  impact: number;
}

export interface VendorPerformance {
  overallRating: number;
  completionRate: number;
  onTimePerformance: number;
  qualityScore: number;
  costEffectiveness: number;
  communicationRating: number;
}

export interface CostAnalysis {
  estimatedCost: number;
  costRange: [number, number];
  competitiveness: number;
  valueForMoney: number;
  hiddenCosts: string[];
}

export interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface RiskFactor {
  type: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  likelihood: number;
  impact: number;
}

export interface LeaseRecommendation {
  leaseId: string;
  action: 'RENEW' | 'RENEGOTIATE' | 'TERMINATE' | 'EXPAND' | 'DOWNSIZE';
  confidence: number;
  financialImpact: number;
  recommendations: LeaseRecommendationDetail[];
  timeline: string;
}

export interface LeaseRecommendationDetail {
  aspect: 'RENT' | 'TERMS' | 'SPACE' | 'CLAUSES';
  recommendation: string;
  impact: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Digital Twin Types
export interface DigitalTwinModel {
  twinId: string;
  entityId: string;
  entityType: 'BUILDING' | 'FLOOR' | 'SPACE' | 'ASSET';
  status: 'ACTIVE' | 'INACTIVE' | 'UPDATING';
  lastSync: Date;
  accuracy: number;
  components: DigitalTwinComponent[];
}

export interface DigitalTwinComponent {
  componentId: string;
  type: string;
  properties: Record<string, any>;
  sensors: TwinSensor[];
  model3D?: Model3D;
}

export interface TwinSensor {
  sensorId: string;
  type: string;
  currentValue: number;
  unit: string;
  lastUpdate: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
}

export interface Model3D {
  modelId: string;
  format: 'GLTF' | 'FBX' | 'OBJ' | 'IFC';
  url: string;
  size: number;
  vertices: number;
  textures: string[];
}

export interface DigitalTwinSimulation {
  simulationId: string;
  twinId: string;
  type: 'ENERGY' | 'OCCUPANCY' | 'AIRFLOW' | 'EMERGENCY' | 'MAINTENANCE';
  parameters: SimulationParameters;
  results: SimulationResults;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export interface SimulationParameters {
  startTime: Date;
  endTime: Date;
  timeStep: number;
  scenarios: Scenario[];
  variables: Record<string, any>;
}

export interface Scenario {
  name: string;
  description: string;
  parameters: Record<string, any>;
  probability: number;
}

export interface SimulationResults {
  summary: SimulationSummary;
  timeSeries: TimeSeriesData[];
  statistics: SimulationStatistics;
  visualizations: Visualization[];
}

export interface SimulationSummary {
  totalEnergy?: number;
  peakOccupancy?: number;
  averageTemperature?: number;
  evacuationTime?: number;
  maintenanceCost?: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  values: Record<string, number>;
}

export interface SimulationStatistics {
  mean: Record<string, number>;
  median: Record<string, number>;
  standardDeviation: Record<string, number>;
  min: Record<string, number>;
  max: Record<string, number>;
}

export interface Visualization {
  type: 'CHART' | 'HEATMAP' | '3D_MODEL' | 'ANIMATION';
  title: string;
  data: any;
  config: Record<string, any>;
}

// Advanced Forecasting Types
export interface ForecastingModel {
  modelId: string;
  type: 'ARIMA' | 'LSTM' | 'PROPHET' | 'LINEAR' | 'ENSEMBLE';
  target: string;
  features: string[];
  horizon: number;
  accuracy: ForecastAccuracy;
  seasonality: SeasonalityInfo;
}

export interface ForecastAccuracy {
  mape: number; // Mean Absolute Percentage Error
  smape: number; // Symmetric Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number; // Mean Absolute Error
}

export interface SeasonalityInfo {
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  yearly: boolean;
  customPatterns: CustomPattern[];
}

export interface CustomPattern {
  name: string;
  period: number;
  strength: number;
}

export interface PortfolioForecast {
  forecastId: string;
  organizationId: string;
  type: 'REVENUE' | 'COSTS' | 'OCCUPANCY' | 'ENERGY' | 'MAINTENANCE';
  horizon: number;
  predictions: ForecastPrediction[];
  confidence: number;
  scenarios: ForecastScenario[];
}

export interface ForecastPrediction {
  date: Date;
  value: number;
  lowerBound: number;
  upperBound: number;
  trend: number;
  seasonality: number;
  components: ForecastComponent[];
}

export interface ForecastComponent {
  name: string;
  value: number;
  contribution: number;
}

export interface ForecastScenario {
  name: string;
  description: string;
  probability: number;
  adjustments: Record<string, number>;
  impact: ForecastImpact;
}

export interface ForecastImpact {
  revenue?: number;
  costs?: number;
  occupancy?: number;
  energy?: number;
  maintenance?: number;
}

export interface BudgetForecast {
  budgetId: string;
  organizationId: string;
  period: string;
  categories: BudgetCategory[];
  totalForecast: number;
  variance: number;
  confidence: number;
  riskFactors: BudgetRiskFactor[];
}

export interface BudgetCategory {
  name: string;
  currentSpend: number;
  forecastSpend: number;
  variance: number;
  confidence: number;
  drivers: BudgetDriver[];
}

export interface BudgetDriver {
  name: string;
  impact: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  seasonality: boolean;
}

export interface BudgetRiskFactor {
  factor: string;
  probability: number;
  impact: number;
  mitigation: string;
}

// Sentiment Analysis Types
export interface SentimentAnalysisModel {
  modelId: string;
  domain: 'WORKPLACE' | 'FACILITIES' | 'GENERAL';
  language: string;
  accuracy: number;
  trainingData: number;
}

export interface EmployeeFeedbackAnalysis {
  feedbackId: string;
  source: 'SURVEY' | 'REVIEW' | 'COMMENT' | 'TICKET';
  content: string;
  sentiment: DetailedSentiment;
  topics: ExtractedTopic[];
  emotions: EmotionScore[];
  actionItems: ActionItem[];
  timestamp: Date;
}

export interface DetailedSentiment {
  overall: SentimentPolarity;
  aspects: AspectSentiment[];
  intensity: number;
  confidence: number;
}

export interface SentimentPolarity {
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
}

export interface AspectSentiment {
  aspect: string;
  sentiment: SentimentPolarity;
  mentions: string[];
}

export interface ExtractedTopic {
  topic: string;
  relevance: number;
  keywords: string[];
  category: 'WORKSPACE' | 'AMENITIES' | 'TECHNOLOGY' | 'ENVIRONMENT' | 'MANAGEMENT';
}

export interface EmotionScore {
  emotion: 'JOY' | 'ANGER' | 'FEAR' | 'SADNESS' | 'SURPRISE' | 'DISGUST';
  score: number;
}

export interface ActionItem {
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  description: string;
  suggestedAction: string;
  estimatedImpact: number;
}

export interface SentimentTrends {
  organizationId: string;
  period: DateRange;
  overallTrend: TrendDirection;
  categoryTrends: CategoryTrend[];
  insights: SentimentInsight[];
  recommendations: SentimentRecommendation[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type TrendDirection = 'IMPROVING' | 'DECLINING' | 'STABLE' | 'VOLATILE';

export interface CategoryTrend {
  category: string;
  trend: TrendDirection;
  change: number;
  significance: number;
}

export interface SentimentInsight {
  type: 'POSITIVE_DRIVER' | 'NEGATIVE_DRIVER' | 'OPPORTUNITY' | 'RISK';
  description: string;
  confidence: number;
  impact: number;
}

export interface SentimentRecommendation {
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  area: string;
  action: string;
  expectedImprovement: number;
  timeline: string;
  resources: string[];
}

// Training and Deployment Types
export interface ModelTrainingJob {
  jobId: string;
  modelType: MLModelType;
  status: TrainingStatus;
  startTime: Date;
  endTime?: Date;
  progress: number;
  config: TrainingConfig;
  metrics: TrainingMetrics;
  logs: string[];
}

export type TrainingStatus = 
  | 'QUEUED' 
  | 'PREPARING' 
  | 'TRAINING' 
  | 'VALIDATING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

export interface TrainingConfig {
  dataSource: string;
  features: string[];
  target: string;
  algorithm: string;
  hyperparameters: Record<string, any>;
  validationSplit: number;
  epochs?: number;
  batchSize?: number;
}

export interface TrainingMetrics {
  loss: number[];
  accuracy: number[];
  validationLoss: number[];
  validationAccuracy: number[];
  finalMetrics: MLValidationMetrics;
}

export interface ModelDeployment {
  deploymentId: string;
  modelId: string;
  version: string;
  environment: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  status: DeploymentStatus;
  deployedAt: Date;
  config: DeploymentConfig;
  monitoring: ModelMonitoring;
}

export type DeploymentStatus = 
  | 'DEPLOYING' 
  | 'ACTIVE' 
  | 'INACTIVE' 
  | 'FAILED' 
  | 'ROLLBACK';

export interface DeploymentConfig {
  replicas: number;
  resources: ResourceRequirements;
  autoScaling: AutoScalingConfig;
  healthCheck: HealthCheckConfig;
}

export interface ResourceRequirements {
  cpu: string;
  memory: string;
  gpu?: string;
}

export interface AutoScalingConfig {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  targetUtilization: number;
}

export interface HealthCheckConfig {
  path: string;
  interval: number;
  timeout: number;
  retries: number;
}

export interface ModelMonitoring {
  requestCount: number;
  averageLatency: number;
  errorRate: number;
  accuracy: number;
  dataDrift: number;
  alerts: MonitoringAlert[];
}

export interface MonitoringAlert {
  type: 'PERFORMANCE' | 'ACCURACY' | 'DATA_DRIFT' | 'ERROR_RATE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

// Data Processing Types
export interface DataPipeline {
  pipelineId: string;
  name: string;
  type: 'BATCH' | 'STREAM' | 'REALTIME';
  status: PipelineStatus;
  schedule: string;
  stages: PipelineStage[];
  lastRun: Date;
  nextRun: Date;
}

export type PipelineStatus = 
  | 'ACTIVE' 
  | 'INACTIVE' 
  | 'RUNNING' 
  | 'FAILED' 
  | 'PAUSED';

export interface PipelineStage {
  stageId: string;
  name: string;
  type: 'EXTRACT' | 'TRANSFORM' | 'LOAD' | 'VALIDATE' | 'AGGREGATE';
  config: Record<string, any>;
  dependencies: string[];
  timeout: number;
}

export interface FeatureStore {
  featureSetId: string;
  name: string;
  features: Feature[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
  schema: FeatureSchema;
}

export interface Feature {
  name: string;
  type: 'NUMERIC' | 'CATEGORICAL' | 'TEXT' | 'TIMESTAMP' | 'BOOLEAN';
  description: string;
  source: string;
  transformation: string;
  statistics: FeatureStatistics;
}

export interface FeatureSchema {
  primaryKey: string;
  timestamp: string;
  features: Record<string, FeatureDefinition>;
}

export interface FeatureDefinition {
  type: string;
  nullable: boolean;
  default?: any;
  constraints?: Record<string, any>;
}

export interface FeatureStatistics {
  count: number;
  unique?: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  nullCount: number;
  distribution?: Record<string, number>;
}

// API Response Types
export interface MLApiResponse<T = any> {
  success: boolean;
  data: T;
  metadata: {
    modelId: string;
    version: string;
    processingTime: number;
    confidence: number;
  };
  errors?: string[];
}

export interface BatchPredictionRequest {
  modelId: string;
  data: Record<string, any>[];
  options?: {
    includeConfidence?: boolean;
    includeFeatureImportance?: boolean;
    outputFormat?: 'JSON' | 'CSV';
  };
}

export interface BatchPredictionResponse {
  requestId: string;
  predictions: any[];
  metadata: {
    totalRecords: number;
    successfulPredictions: number;
    failedPredictions: number;
    averageConfidence: number;
    processingTime: number;
  };
}

// Configuration Types
export interface MLServiceConfig {
  models: {
    maxConcurrentTraining: number;
    maxModelSize: number;
    retentionPeriod: number;
    autoRetraining: boolean;
  };
  inference: {
    timeout: number;
    maxBatchSize: number;
    cacheResults: boolean;
    cacheTtl: number;
  };
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      accuracy: number;
      latency: number;
      errorRate: number;
    };
  };
}