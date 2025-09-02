/**
 * Advanced Operations Domain - Configuration Constants
 * 
 * Centralized configuration and constants for workflow systems,
 * reporting services, enterprise service bus, data warehouse,
 * and portfolio management operations.
 */

export const ADVANCED_OPERATIONS_CONFIG = {
  // Domain configuration
  DOMAIN: {
    NAME: 'Advanced Operations',
    VERSION: '1.0.0',
    CACHE_TTL: 300000, // 5 minutes
    MAX_RETRY_ATTEMPTS: 3,
    DEFAULT_TIMEOUT: 30000, // 30 seconds
  },

  // Workflow Engine Configuration
  WORKFLOW: {
    MAX_EXECUTION_TIME: 86400000, // 24 hours
    DEFAULT_PRIORITY: 'NORMAL' as const,
    SCHEDULER_INTERVAL: 60000, // 1 minute
    MAX_CONCURRENT_INSTANCES: 100,
    ESCALATION_CHECK_INTERVAL: 300000, // 5 minutes
    AUTO_CLEANUP_DAYS: 90,
    SUPPORTED_VARIABLE_TYPES: ['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'OBJECT'] as const,
    STEP_TYPES: ['TASK', 'DECISION', 'PARALLEL', 'SUB_PROCESS', 'TIMER', 'END'] as const,
    STATUSES: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] as const,
    PRIORITIES: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const,
  },

  // Reporting Service Configuration
  REPORTING: {
    MAX_REPORT_SIZE: 100000000, // 100MB
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 1000,
    CACHE_TTL: 1800000, // 30 minutes
    CONCURRENT_GENERATIONS: 5,
    RETENTION_DAYS: 365,
    SUPPORTED_FORMATS: ['PDF', 'EXCEL', 'CSV', 'JSON', 'EMAIL'] as const,
    REPORT_CATEGORIES: ['FINANCIAL', 'OPERATIONAL', 'COMPLIANCE', 'EXECUTIVE', 'CUSTOM'] as const,
    REPORT_TYPES: ['TABULAR', 'CHART', 'DASHBOARD', 'KPI', 'EXECUTIVE'] as const,
    SCHEDULE_FREQUENCIES: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'] as const,
    DELIVERY_METHODS: ['EMAIL', 'SFTP', 'API', 'WEBHOOK'] as const,
  },

  // Enterprise Service Bus Configuration
  ESB: {
    MAX_MESSAGE_SIZE: 10485760, // 10MB
    MAX_QUEUE_SIZE: 10000,
    MESSAGE_TTL: 3600000, // 1 hour
    MAX_RETRY_ATTEMPTS: 5,
    RETRY_BACKOFF_MULTIPLIER: 2,
    DEAD_LETTER_TTL: 604800000, // 7 days
    SUPPORTED_PATTERNS: [
      'POINT_TO_POINT', 'PUBLISH_SUBSCRIBE', 'REQUEST_REPLY', 'MESSAGE_FILTER',
      'CONTENT_ROUTER', 'MESSAGE_TRANSLATOR', 'MESSAGE_ROUTING', 'CONTENT_BASED_ROUTING',
      'MESSAGE_TRANSFORMATION', 'SCATTER_GATHER', 'AGGREGATOR', 'SPLITTER', 'DEAD_LETTER_QUEUE'
    ] as const,
    ENDPOINT_TYPES: ['HTTP', 'SOAP', 'DATABASE', 'FILE', 'MESSAGE_QUEUE'] as const,
    MESSAGE_PRIORITIES: {
      LOW: 1,
      NORMAL: 5,
      HIGH: 8,
      URGENT: 10,
    },
  },

  // Data Warehouse Configuration
  WAREHOUSE: {
    MAX_BATCH_SIZE: 50000,
    SYNC_TIMEOUT: 3600000, // 1 hour
    MAX_PARALLEL_JOBS: 10,
    RETRY_DELAY: 60000, // 1 minute
    QUALITY_THRESHOLD: 0.95,
    SUPPORTED_CONNECTIONS: ['SNOWFLAKE', 'REDSHIFT', 'BIGQUERY', 'DATABRICKS', 'SYNAPSE'] as const,
    LOAD_STRATEGIES: ['FULL', 'INCREMENTAL', 'DELTA', 'UPSERT'] as const,
    TRANSFORMATION_TYPES: ['MAPPING', 'AGGREGATION', 'FILTERING', 'VALIDATION', 'ENRICHMENT'] as const,
    QUALITY_RULES: ['NOT_NULL', 'UNIQUE', 'RANGE', 'PATTERN', 'CUSTOM'] as const,
    SEVERITY_LEVELS: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const,
  },

  // Portfolio Service Configuration
  PORTFOLIO: {
    MAX_PROPERTIES: 10000,
    ANALYSIS_CACHE_TTL: 7200000, // 2 hours
    BENCHMARK_UPDATE_INTERVAL: 86400000, // 24 hours
    RISK_CALCULATION_WINDOW: 252, // Trading days in a year
    PROPERTY_TYPES: ['OFFICE', 'RETAIL', 'INDUSTRIAL', 'MIXED_USE', 'LAND', 'OTHER'] as const,
    LEASE_STATUSES: ['ACTIVE', 'EXPIRED', 'TERMINATED', 'PENDING'] as const,
    OPTIMIZATION_TYPES: ['ACQUISITION', 'DISPOSITION', 'RENOVATION', 'REFINANCING', 'REPOSITIONING'] as const,
    RISK_LEVELS: ['LOW', 'MEDIUM', 'HIGH'] as const,
    SCENARIO_IMPACTS: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] as const,
  },

  // Health Check Configuration
  HEALTH_CHECK: {
    INTERVAL: 300000, // 5 minutes
    TIMEOUT: 10000, // 10 seconds
    THRESHOLDS: {
      RESPONSE_TIME: 5000, // 5 seconds
      ERROR_RATE: 0.05, // 5%
      CPU_USAGE: 0.8, // 80%
      MEMORY_USAGE: 0.85, // 85%
    },
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Common Errors
  INVALID_ORGANIZATION_ID: 'Invalid organization ID provided',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation',
  OPERATION_TIMEOUT: 'Operation timed out',
  SERVICE_UNAVAILABLE: 'Service is currently unavailable',

  // Workflow Engine Errors
  WORKFLOW_NOT_FOUND: 'Workflow definition not found',
  WORKFLOW_INSTANCE_NOT_FOUND: 'Workflow instance not found',
  INVALID_WORKFLOW_DEFINITION: 'Invalid workflow definition provided',
  WORKFLOW_EXECUTION_FAILED: 'Workflow execution failed',
  STEP_NOT_FOUND: 'Workflow step not found',
  INVALID_TRANSITION: 'Invalid workflow transition',
  WORKFLOW_ALREADY_COMPLETED: 'Workflow instance already completed',
  ESCALATION_FAILED: 'Workflow escalation failed',

  // Reporting Service Errors
  REPORT_TEMPLATE_NOT_FOUND: 'Report template not found',
  REPORT_GENERATION_FAILED: 'Report generation failed',
  INVALID_REPORT_PARAMETERS: 'Invalid report parameters provided',
  REPORT_TOO_LARGE: 'Report exceeds maximum size limit',
  SCHEDULE_CONFLICT: 'Report schedule conflicts with existing schedule',
  DATA_SOURCE_UNAVAILABLE: 'Report data source is unavailable',
  BENCHMARK_DATA_MISSING: 'Benchmark data is not available',

  // ESB Errors
  INVALID_MESSAGE_FORMAT: 'Invalid message format',
  ENDPOINT_NOT_FOUND: 'Integration endpoint not found',
  MESSAGE_ROUTING_FAILED: 'Message routing failed',
  TRANSFORMATION_FAILED: 'Message transformation failed',
  FLOW_NOT_FOUND: 'ESB flow not found',
  ENDPOINT_UNAVAILABLE: 'Integration endpoint is unavailable',
  MESSAGE_TOO_LARGE: 'Message exceeds maximum size limit',
  DEAD_LETTER_QUEUE_FULL: 'Dead letter queue is full',

  // Data Warehouse Errors
  CONNECTION_FAILED: 'Data warehouse connection failed',
  ETL_JOB_NOT_FOUND: 'ETL job not found',
  ETL_EXECUTION_FAILED: 'ETL job execution failed',
  TRANSFORMATION_ERROR: 'Data transformation error',
  QUALITY_CHECK_FAILED: 'Data quality check failed',
  SYNC_TIMEOUT: 'Data synchronization timed out',
  LINEAGE_MISSING: 'Data lineage information missing',

  // Portfolio Service Errors
  PORTFOLIO_NOT_FOUND: 'Portfolio not found',
  PROPERTY_NOT_FOUND: 'Property not found',
  INVALID_PORTFOLIO_STRATEGY: 'Invalid portfolio strategy',
  ANALYSIS_FAILED: 'Portfolio analysis failed',
  BENCHMARK_UPDATE_FAILED: 'Benchmark data update failed',
  OPTIMIZATION_FAILED: 'Portfolio optimization failed',
  RISK_CALCULATION_ERROR: 'Risk calculation error',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  // Workflow Engine
  WORKFLOW_CREATED: 'Workflow definition created successfully',
  WORKFLOW_STARTED: 'Workflow instance started successfully',
  WORKFLOW_COMPLETED: 'Workflow completed successfully',
  STEP_APPROVED: 'Workflow step approved successfully',
  WORKFLOW_ESCALATED: 'Workflow escalated successfully',

  // Reporting Service
  REPORT_GENERATED: 'Report generated successfully',
  REPORT_SCHEDULED: 'Report scheduled successfully',
  TEMPLATE_SAVED: 'Report template saved successfully',
  BENCHMARK_UPDATED: 'Benchmark data updated successfully',

  // ESB
  MESSAGE_PROCESSED: 'Message processed successfully',
  FLOW_ACTIVATED: 'ESB flow activated successfully',
  ENDPOINT_REGISTERED: 'Integration endpoint registered successfully',
  TRANSFORMATION_APPLIED: 'Message transformation applied successfully',

  // Data Warehouse
  ETL_COMPLETED: 'ETL job completed successfully',
  DATA_SYNCHRONIZED: 'Data synchronized successfully',
  QUALITY_CHECK_PASSED: 'Data quality check passed',
  CONNECTION_ESTABLISHED: 'Data warehouse connection established',

  // Portfolio Service
  PORTFOLIO_UPDATED: 'Portfolio updated successfully',
  ANALYSIS_COMPLETED: 'Portfolio analysis completed successfully',
  OPTIMIZATION_COMPLETED: 'Portfolio optimization completed successfully',
  BENCHMARK_SYNCHRONIZED: 'Benchmark data synchronized successfully',
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  WORKFLOW: {
    NAME_MIN_LENGTH: 3,
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    MAX_STEPS: 100,
    MAX_VARIABLES: 50,
    VERSION_PATTERN: /^\d+\.\d+\.\d+$/,
  },

  REPORTING: {
    TEMPLATE_NAME_MIN_LENGTH: 3,
    TEMPLATE_NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 1000,
    MAX_PARAMETERS: 50,
    MAX_DATA_POINTS: 100000,
    REFRESH_INTERVAL_MIN: 60000, // 1 minute
  },

  ESB: {
    MESSAGE_ID_PATTERN: /^[a-zA-Z0-9\-_]{1,50}$/,
    ENDPOINT_NAME_MIN_LENGTH: 3,
    ENDPOINT_NAME_MAX_LENGTH: 100,
    MAX_HEADERS: 50,
    MAX_TRANSFORMATIONS: 20,
  },

  WAREHOUSE: {
    JOB_NAME_MIN_LENGTH: 3,
    JOB_NAME_MAX_LENGTH: 100,
    MAX_TRANSFORMATION_RULES: 100,
    CONNECTION_NAME_MIN_LENGTH: 3,
    CONNECTION_NAME_MAX_LENGTH: 50,
  },

  PORTFOLIO: {
    PORTFOLIO_NAME_MIN_LENGTH: 3,
    PORTFOLIO_NAME_MAX_LENGTH: 100,
    MAX_PROPERTIES_PER_PORTFOLIO: 10000,
    MIN_PROPERTY_VALUE: 1000,
    MAX_PROPERTY_VALUE: 10000000000, // $10B
  },
} as const;

// Cache Keys
export const CACHE_KEYS = {
  WORKFLOW_DEFINITION: (id: string) => `workflow:definition:${id}`,
  WORKFLOW_INSTANCE: (id: string) => `workflow:instance:${id}`,
  REPORT_TEMPLATE: (id: string) => `report:template:${id}`,
  REPORT_DATA: (templateId: string, hash: string) => `report:data:${templateId}:${hash}`,
  ESB_ENDPOINT: (id: string) => `esb:endpoint:${id}`,
  ESB_FLOW: (id: string) => `esb:flow:${id}`,
  WAREHOUSE_CONNECTION: (id: string) => `warehouse:connection:${id}`,
  ETL_JOB: (id: string) => `warehouse:job:${id}`,
  PORTFOLIO: (id: string) => `portfolio:${id}`,
  PORTFOLIO_ANALYSIS: (id: string) => `portfolio:analysis:${id}`,
  DASHBOARD_METRICS: (orgId: string) => `dashboard:metrics:${orgId}`,
  HEALTH_STATUS: (service: string) => `health:${service}`,
} as const;

// Queue Names
export const QUEUE_NAMES = {
  WORKFLOW_EXECUTION: 'workflow-execution',
  WORKFLOW_ESCALATION: 'workflow-escalation',
  REPORT_GENERATION: 'report-generation',
  REPORT_DELIVERY: 'report-delivery',
  ESB_PROCESSING: 'esb-processing',
  ESB_RETRY: 'esb-retry',
  ETL_EXECUTION: 'etl-execution',
  DATA_QUALITY: 'data-quality',
  PORTFOLIO_ANALYSIS: 'portfolio-analysis',
  BENCHMARK_UPDATE: 'benchmark-update',
} as const;

// Event Types
export const EVENT_TYPES = {
  // Workflow Events
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_STEP_COMPLETED: 'workflow.step.completed',
  WORKFLOW_COMPLETED: 'workflow.completed',
  WORKFLOW_FAILED: 'workflow.failed',
  WORKFLOW_ESCALATED: 'workflow.escalated',

  // Reporting Events
  REPORT_GENERATION_STARTED: 'report.generation.started',
  REPORT_GENERATED: 'report.generated',
  REPORT_GENERATION_FAILED: 'report.generation.failed',
  REPORT_SCHEDULED: 'report.scheduled',
  REPORT_DELIVERED: 'report.delivered',

  // ESB Events
  MESSAGE_RECEIVED: 'esb.message.received',
  MESSAGE_PROCESSED: 'esb.message.processed',
  MESSAGE_FAILED: 'esb.message.failed',
  FLOW_STARTED: 'esb.flow.started',
  FLOW_COMPLETED: 'esb.flow.completed',

  // Warehouse Events
  ETL_STARTED: 'warehouse.etl.started',
  ETL_COMPLETED: 'warehouse.etl.completed',
  ETL_FAILED: 'warehouse.etl.failed',
  DATA_QUALITY_CHECK: 'warehouse.quality.check',
  SYNC_COMPLETED: 'warehouse.sync.completed',

  // Portfolio Events
  PORTFOLIO_UPDATED: 'portfolio.updated',
  ANALYSIS_COMPLETED: 'portfolio.analysis.completed',
  BENCHMARK_UPDATED: 'portfolio.benchmark.updated',
  OPTIMIZATION_COMPLETED: 'portfolio.optimization.completed',
} as const;

// Metrics
export const METRICS = {
  COUNTERS: {
    WORKFLOWS_STARTED: 'workflows_started_total',
    WORKFLOWS_COMPLETED: 'workflows_completed_total',
    WORKFLOWS_FAILED: 'workflows_failed_total',
    REPORTS_GENERATED: 'reports_generated_total',
    MESSAGES_PROCESSED: 'messages_processed_total',
    ETL_JOBS_EXECUTED: 'etl_jobs_executed_total',
    PORTFOLIOS_ANALYZED: 'portfolios_analyzed_total',
  },
  HISTOGRAMS: {
    WORKFLOW_EXECUTION_TIME: 'workflow_execution_time_seconds',
    REPORT_GENERATION_TIME: 'report_generation_time_seconds',
    MESSAGE_PROCESSING_TIME: 'message_processing_time_seconds',
    ETL_EXECUTION_TIME: 'etl_execution_time_seconds',
    PORTFOLIO_ANALYSIS_TIME: 'portfolio_analysis_time_seconds',
  },
  GAUGES: {
    ACTIVE_WORKFLOWS: 'active_workflows',
    PENDING_REPORTS: 'pending_reports',
    QUEUE_SIZE: 'queue_size',
    CONNECTION_POOL_SIZE: 'connection_pool_size',
    CACHE_SIZE: 'cache_size',
  },
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  WORKFLOW: {
    BASE: '/api/v1/workflows',
    DEFINITIONS: '/api/v1/workflows/definitions',
    INSTANCES: '/api/v1/workflows/instances',
    APPROVALS: '/api/v1/workflows/approvals',
  },
  REPORTING: {
    BASE: '/api/v1/reports',
    TEMPLATES: '/api/v1/reports/templates',
    GENERATE: '/api/v1/reports/generate',
    SCHEDULES: '/api/v1/reports/schedules',
  },
  ESB: {
    BASE: '/api/v1/esb',
    ENDPOINTS: '/api/v1/esb/endpoints',
    FLOWS: '/api/v1/esb/flows',
    MESSAGES: '/api/v1/esb/messages',
  },
  WAREHOUSE: {
    BASE: '/api/v1/warehouse',
    CONNECTIONS: '/api/v1/warehouse/connections',
    JOBS: '/api/v1/warehouse/jobs',
    QUALITY: '/api/v1/warehouse/quality',
  },
  PORTFOLIO: {
    BASE: '/api/v1/portfolios',
    ANALYSIS: '/api/v1/portfolios/analysis',
    BENCHMARKS: '/api/v1/portfolios/benchmarks',
    OPTIMIZATION: '/api/v1/portfolios/optimization',
  },
} as const;