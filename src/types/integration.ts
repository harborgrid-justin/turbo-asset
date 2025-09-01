export interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  description?: string;
  endpoint: string;
  credentials: IntegrationCredentials;
  settings: IntegrationSettings;
  isActive: boolean;
  lastSyncAt?: Date;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IntegrationType = 
  | 'SAP_S4HANA'
  | 'ORACLE_ERP'
  | 'WORKDAY'
  | 'SERVICENOW'
  | 'MICROSOFT_365'
  | 'SALESFORCE'
  | 'REST_API'
  | 'SOAP'
  | 'GRAPHQL'
  | 'DATABASE'
  | 'FILE_TRANSFER'
  | 'MESSAGE_QUEUE';

export interface IntegrationCredentials {
  authType: 'API_KEY' | 'OAUTH2' | 'BASIC_AUTH' | 'JWT' | 'SAML' | 'CERTIFICATE';
  apiKey?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenEndpoint?: string;
  certificatePath?: string;
  privateKeyPath?: string;
  scopes?: string[];
  additionalHeaders?: Record<string, string>;
}

export interface IntegrationSettings {
  syncFrequency: 'MANUAL' | 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  retryAttempts: number;
  timeout: number;
  batchSize: number;
  enableLogging: boolean;
  enableNotifications: boolean;
  dataMapping: DataMappingRule[];
  filterRules: FilterRule[];
  transformationRules: TransformationRule[];
}

export interface DataMappingRule {
  id: string;
  sourceField: string;
  targetField: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  isRequired: boolean;
  defaultValue?: any;
  transformation?: string;
  validation?: ValidationRule;
}

export interface FilterRule {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface TransformationRule {
  id: string;
  type: 'SCRIPT' | 'LOOKUP' | 'CALCULATION' | 'FORMAT' | 'CONDITIONAL';
  sourceFields: string[];
  targetField: string;
  script?: string;
  lookupTable?: Record<string, any>;
  format?: string;
  conditions?: Array<{
    condition: string;
    value: any;
  }>;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  allowedValues?: any[];
}

export interface IntegrationExecution {
  id: string;
  integrationId: string;
  type: 'SYNC' | 'IMPORT' | 'EXPORT' | 'VALIDATION';
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsSuccess: number;
  recordsError: number;
  errorSummary?: IntegrationError[];
  executionLog: IntegrationLogEntry[];
  metadata?: Record<string, any>;
}

export interface IntegrationError {
  id: string;
  executionId: string;
  recordId?: string;
  errorType: 'VALIDATION' | 'TRANSFORMATION' | 'CONNECTION' | 'AUTHORIZATION' | 'DATA_FORMAT' | 'BUSINESS_LOGIC';
  errorCode: string;
  errorMessage: string;
  fieldPath?: string;
  originalValue?: any;
  suggestedFix?: string;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface IntegrationLogEntry {
  id: string;
  executionId: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface IntegrationMetrics {
  integrationId: string;
  period: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  totalRecordsProcessed: number;
  errorRate: number;
  availabilityPercentage: number;
  lastSuccessfulSync?: Date;
  metrics: Array<{
    timestamp: Date;
    executionTime: number;
    recordsProcessed: number;
    errorCount: number;
    status: 'SUCCESS' | 'FAILED';
  }>;
}

export interface WebhookConfig {
  id: string;
  integrationId: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  secret?: string;
  isActive: boolean;
  retryAttempts: number;
  timeout: number;
  createdAt: Date;
  updatedAt: Date;
}

export type WebhookEvent = 
  | 'SYNC_STARTED'
  | 'SYNC_COMPLETED'
  | 'SYNC_FAILED'
  | 'DATA_IMPORTED'
  | 'DATA_EXPORTED'
  | 'ERROR_OCCURRED'
  | 'CONNECTION_LOST'
  | 'CONNECTION_RESTORED';

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, any>;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  attempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  createdAt: Date;
}

export interface APIConnector {
  id: string;
  name: string;
  type: IntegrationType;
  version: string;
  description?: string;
  endpoints: APIEndpoint[];
  schemas: APISchema[];
  authentication: IntegrationCredentials;
  rateLimit?: RateLimit;
  isSystemDefined: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  parameters: APIParameter[];
  requestSchema?: string;
  responseSchema?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
}

export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
  validation?: ValidationRule;
}

export interface APISchema {
  id: string;
  name: string;
  version: string;
  schema: Record<string, any>; // JSON Schema
  examples?: Record<string, any>[];
  documentation?: string;
}

export interface RateLimit {
  requests: number;
  period: 'SECOND' | 'MINUTE' | 'HOUR' | 'DAY';
  burst?: number;
  resetTime?: Date;
}