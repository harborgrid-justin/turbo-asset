/**
 * Service Operations Domain - Type Definitions
 * 
 * Comprehensive type system for notification services, integration services,
 * technician mobile services, SDK generation, API documentation, and bulk data operations.
 */

import { EventEmitter } from 'events';

// =============================================================================
// Base Context and Event Types
// =============================================================================

export interface ServiceOperationsContext {
  organizationId: string;
  userId: string;
  permissions: string[];
  tenantId?: string;
  correlationId?: string;
}

export interface ServiceOperationsEvent {
  type: 
    | 'NOTIFICATION_SENT' | 'NOTIFICATION_FAILED' | 'TEMPLATE_CREATED'
    | 'INTEGRATION_COMPLETED' | 'INTEGRATION_FAILED' | 'SYNC_STARTED'
    | 'MOBILE_SYNC' | 'WORK_ORDER_UPDATED' | 'OFFLINE_DATA_SYNCED'
    | 'SDK_GENERATED' | 'SDK_PUBLISHED' | 'API_DOCUMENTED'
    | 'BULK_IMPORT_STARTED' | 'BULK_IMPORT_COMPLETED' | 'BULK_EXPORT_COMPLETED';
  data: any;
  timestamp: Date;
  source: 'notification' | 'integration' | 'mobile' | 'sdk' | 'documentation' | 'bulk';
  organizationId: string;
}

// =============================================================================
// Notification Service Types
// =============================================================================

export interface NotificationData {
  recipientId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'WORKFLOW' | 'SYSTEM' | 'MAINTENANCE';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  templateId?: string;
  templateData?: Record<string, any>;
  scheduledFor?: Date;
  expiresAt?: Date;
  organizationId?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  organizationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationChannel {
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBSOCKET' | 'SLACK' | 'TEAMS' | 'WEBHOOK';
  address?: string;
  config?: Record<string, any>;
  isEnabled: boolean;
}

export interface NotificationPreferences {
  userId: string;
  channels: NotificationChannel[];
  categories: {
    [key: string]: {
      enabled: boolean;
      channels: string[];
      quietHours?: {
        start: string;
        end: string;
        timezone: string;
      };
    };
  };
  organizationId: string;
}

export interface NotificationBatch {
  id: string;
  name?: string;
  notifications: NotificationData[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  processedAt?: Date;
  results?: {
    sent: number;
    failed: number;
    errors: Array<{ recipientId: string; error: string }>;
  };
}

export interface NotificationMetrics {
  totalSent: number;
  successRate: number;
  averageDeliveryTime: number;
  channelBreakdown: Record<string, number>;
  failureReasons: Record<string, number>;
}

// =============================================================================
// Integration Service Types
// =============================================================================

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'API' | 'DATABASE' | 'FILE' | 'WEBHOOK' | 'QUEUE';
  source: IntegrationEndpoint;
  target: IntegrationEndpoint;
  mapping: DataMapping[];
  schedule?: IntegrationSchedule;
  retryPolicy: RetryPolicy;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface IntegrationEndpoint {
  type: 'REST_API' | 'SOAP_API' | 'DATABASE' | 'SFTP' | 'FILE_SYSTEM' | 'WEBHOOK';
  connectionString?: string;
  credentials?: {
    username?: string;
    password?: string;
    apiKey?: string;
    token?: string;
    certificatePath?: string;
  };
  configuration: Record<string, any>;
  timeout: number;
  rateLimiting?: {
    requestsPerMinute: number;
    burstSize: number;
  };
}

export interface DataMapping {
  sourceField: string;
  targetField: string;
  transformation?: DataTransformation;
  required: boolean;
  defaultValue?: any;
}

export interface DataTransformation {
  type: 'FORMAT' | 'CALCULATE' | 'LOOKUP' | 'CONCATENATE' | 'SPLIT' | 'CUSTOM';
  parameters: Record<string, any>;
  expression?: string;
}

export interface IntegrationSchedule {
  frequency: 'REAL_TIME' | 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  cronExpression?: string;
  timezone: string;
  retryOnFailure: boolean;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'FIXED' | 'LINEAR' | 'EXPONENTIAL';
  baseDelay: number;
  maxDelay: number;
}

export interface IntegrationRun {
  id: string;
  configId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: IntegrationError[];
  metrics: {
    duration: number;
    throughput: number;
    memoryUsage: number;
  };
}

export interface IntegrationError {
  recordId?: string;
  message: string;
  stackTrace?: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// =============================================================================
// Technician Mobile Service Types
// =============================================================================

export interface MobileWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  type: string;
  assetInfo?: {
    id: string;
    assetName: string;
    assetTag: string;
    location: string;
    building?: string;
    floor?: string;
  };
  locationInfo: {
    building?: string;
    floor?: string;
    room?: string;
    coordinates?: string;
    directions?: string;
  };
  scheduledDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  taskList: MobileTask[];
  materialsList: MobileMaterial[];
  attachments: MobileAttachment[];
  safetyNotes?: string;
  specialInstructions?: string;
}

export interface MobileTask {
  id: string;
  taskNumber: number;
  title: string;
  description?: string;
  status: string;
  instructions?: string;
  safetyNotes?: string;
  skillsRequired: string[];
  toolsRequired: string[];
  estimatedHours?: number;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  photos: string[];
}

export interface MobileMaterial {
  id: string;
  itemName: string;
  quantity: number;
  unitOfMeasure: string;
  status: string;
  description?: string;
  requestedQuantity?: number;
  usedQuantity?: number;
  wasteQuantity?: number;
  costPerUnit?: number;
}

export interface MobileAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  isPhotoBefore?: boolean;
  isPhotoAfter?: boolean;
  description?: string;
}

export interface MobileTechnician {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  skills: string[];
  certifications: TechnicianCertification[];
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  availability: {
    status: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY' | 'EMERGENCY';
    scheduledHours: {
      start: string;
      end: string;
    };
    currentAssignments: string[];
  };
}

export interface TechnicianCertification {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate: Date;
  expirationDate?: Date;
  level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  verificationNumber?: string;
}

export interface MobileSyncData {
  technicianId: string;
  deviceId: string;
  timestamp: Date;
  workOrders: MobileWorkOrder[];
  completedTasks: string[];
  photoUploads: Array<{
    taskId: string;
    photoPath: string;
    uploadStatus: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  }>;
  offlineActions: Array<{
    action: string;
    data: any;
    timestamp: Date;
  }>;
}

export interface MobileAppConfig {
  version: string;
  features: {
    offlineMode: boolean;
    photoCapture: boolean;
    gpsTracking: boolean;
    barcodeScanning: boolean;
    voiceNotes: boolean;
    digitalSignature: boolean;
  };
  syncInterval: number;
  maxOfflineHours: number;
  photoQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  compressionEnabled: boolean;
}

// =============================================================================
// SDK Generator Service Types
// =============================================================================

export interface SDKConfiguration {
  id: string;
  name: string;
  version: string;
  language: 'JAVASCRIPT' | 'TYPESCRIPT' | 'PYTHON' | 'JAVA' | 'CSHARP' | 'GO' | 'PHP';
  apiBaseUrl: string;
  apiVersion: string;
  authentication: {
    type: 'API_KEY' | 'OAUTH2' | 'BASIC_AUTH' | 'BEARER_TOKEN';
    configuration: Record<string, any>;
  };
  endpoints: SDKEndpoint[];
  options: {
    includeModels: boolean;
    includeExamples: boolean;
    includeTests: boolean;
    packageName?: string;
    namespace?: string;
    outputFormat: 'PACKAGE' | 'SOURCE' | 'BOTH';
  };
  customization: {
    headerComment?: string;
    licenseFile?: string;
    additionalDependencies: string[];
    customCode?: Record<string, string>;
  };
}

export interface SDKEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  operationId: string;
  summary: string;
  description?: string;
  parameters: SDKParameter[];
  requestBody?: SDKRequestBody;
  responses: SDKResponse[];
  authentication?: string[];
  rateLimit?: {
    requests: number;
    period: string;
  };
}

export interface SDKParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  type: string;
  required: boolean;
  description?: string;
  example?: any;
  enum?: any[];
}

export interface SDKRequestBody {
  contentType: string;
  schema: any;
  example?: any;
  required: boolean;
}

export interface SDKResponse {
  statusCode: number;
  description: string;
  contentType: string;
  schema?: any;
  example?: any;
}

export interface SDKGenerationResult {
  id: string;
  configId: string;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  startedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  fileSize?: number;
  checksumMd5?: string;
  artifacts: {
    sourceFiles: number;
    testFiles: number;
    documentationFiles: number;
    exampleFiles: number;
  };
  errors: string[];
  warnings: string[];
}

// =============================================================================
// API Documentation Service Types
// =============================================================================

export interface APIDocumentation {
  id: string;
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: DocumentationEndpoint[];
  models: DocumentationModel[];
  authentication: AuthenticationDoc[];
  examples: DocumentationExample[];
  changelog: ChangelogEntry[];
  configuration: {
    theme: 'LIGHT' | 'DARK' | 'AUTO';
    language: string;
    includeExamples: boolean;
    includeModels: boolean;
    interactiveMode: boolean;
  };
}

export interface DocumentationEndpoint {
  id: string;
  path: string;
  method: string;
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: DocumentationParameter[];
  requestBody?: DocumentationRequestBody;
  responses: DocumentationResponse[];
  examples: DocumentationExample[];
  deprecated?: boolean;
  security: string[];
}

export interface DocumentationParameter {
  name: string;
  in: string;
  type: string;
  required: boolean;
  description: string;
  example: any;
  constraints?: {
    minimum?: number;
    maximum?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface DocumentationRequestBody {
  description: string;
  contentType: string;
  schema: any;
  examples: DocumentationExample[];
}

export interface DocumentationResponse {
  statusCode: number;
  description: string;
  contentType: string;
  schema: any;
  headers?: Record<string, any>;
  examples: DocumentationExample[];
}

export interface DocumentationModel {
  name: string;
  description: string;
  properties: Record<string, any>;
  required: string[];
  example: any;
}

export interface AuthenticationDoc {
  type: string;
  name: string;
  description: string;
  configuration: Record<string, any>;
  examples: DocumentationExample[];
}

export interface DocumentationExample {
  name: string;
  summary: string;
  description?: string;
  value: any;
  language?: string;
}

export interface ChangelogEntry {
  version: string;
  releaseDate: Date;
  changes: Array<{
    type: 'ADDED' | 'CHANGED' | 'DEPRECATED' | 'REMOVED' | 'FIXED' | 'SECURITY';
    description: string;
    endpoints?: string[];
  }>;
}

// =============================================================================
// Bulk Data Service Types
// =============================================================================

export interface BulkDataOperation {
  id: string;
  name: string;
  type: 'IMPORT' | 'EXPORT' | 'TRANSFORM';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  dataSource: BulkDataSource;
  dataTarget: BulkDataTarget;
  configuration: BulkDataConfig;
  schedule?: BulkDataSchedule;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  statistics: BulkDataStatistics;
  errors: BulkDataError[];
}

export interface BulkDataSource {
  type: 'FILE' | 'DATABASE' | 'API' | 'STREAM';
  location: string;
  format: 'CSV' | 'JSON' | 'XML' | 'EXCEL' | 'PARQUET' | 'AVRO';
  credentials?: Record<string, any>;
  configuration: {
    encoding?: string;
    delimiter?: string;
    hasHeader?: boolean;
    skipRows?: number;
    compression?: 'GZIP' | 'ZIP' | 'NONE';
  };
  validation: ValidationRule[];
}

export interface BulkDataTarget {
  type: 'FILE' | 'DATABASE' | 'API' | 'STREAM';
  location: string;
  format: 'CSV' | 'JSON' | 'XML' | 'EXCEL' | 'PARQUET' | 'AVRO';
  credentials?: Record<string, any>;
  configuration: {
    encoding?: string;
    delimiter?: string;
    includeHeader?: boolean;
    compression?: 'GZIP' | 'ZIP' | 'NONE';
    batchSize?: number;
  };
}

export interface BulkDataConfig {
  chunkSize: number;
  parallelProcessing: boolean;
  maxWorkers: number;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
  };
  validation: {
    strictMode: boolean;
    skipInvalidRows: boolean;
    maxErrorRate: number;
  };
  transformation: DataTransformation[];
  mapping: Record<string, string>;
}

export interface BulkDataSchedule {
  frequency: 'ONCE' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  cronExpression?: string;
  timezone: string;
  startDate?: Date;
  endDate?: Date;
  retryOnFailure: boolean;
}

export interface BulkDataStatistics {
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  processingRate: number;
  estimatedTimeRemaining?: number;
  dataVolume: {
    inputSize: number;
    outputSize: number;
    compressionRatio?: number;
  };
}

export interface BulkDataError {
  rowNumber?: number;
  field?: string;
  message: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  code?: string;
  timestamp: Date;
}

export interface ValidationRule {
  field: string;
  type: 'REQUIRED' | 'TYPE' | 'FORMAT' | 'RANGE' | 'ENUM' | 'CUSTOM';
  parameters: Record<string, any>;
  message?: string;
}

// =============================================================================
// Dashboard and Orchestration Types
// =============================================================================

export interface ServiceOperationsDashboard {
  notifications: {
    sent: number;
    pending: number;
    failureRate: number;
    averageDeliveryTime: number;
    channelBreakdown: Record<string, number>;
  };
  integrations: {
    activeConfigs: number;
    runningJobs: number;
    successRate: number;
    averageProcessingTime: number;
    dataVolume: number;
  };
  mobile: {
    activeTechnicians: number;
    workOrdersInProgress: number;
    syncPending: number;
    offlineDevices: number;
    averageResponseTime: number;
  };
  sdk: {
    totalSDKs: number;
    generationsToday: number;
    supportedLanguages: string[];
    downloadCount: number;
    averageGenerationTime: number;
  };
  documentation: {
    totalEndpoints: number;
    documentedEndpoints: number;
    coveragePercentage: number;
    lastUpdated: Date;
    viewCount: number;
  };
  bulk: {
    activeOperations: number;
    completedToday: number;
    failureRate: number;
    averageProcessingRate: number;
    dataVolumeProcessed: number;
  };
}

export interface ServiceHealthCheck {
  service: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  message?: string;
  metrics?: Record<string, any>;
  lastChecked: Date;
  dependencies?: Array<{
    name: string;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    responseTime: number;
  }>;
}

export interface ServiceMetrics {
  requests: number;
  errors: number;
  responseTime: number;
  throughput: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}