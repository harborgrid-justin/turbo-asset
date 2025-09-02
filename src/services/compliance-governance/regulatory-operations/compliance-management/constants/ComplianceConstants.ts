/**
 * Compliance Management Constants
 * 
 * Configuration constants and default values for compliance, data governance,
 * and emergency planning services.
 */

export const COMPLIANCE_CONSTANTS = {
  // Compliance frameworks
  FRAMEWORKS: {
    SOX: {
      name: 'Sarbanes-Oxley Act',
      acronym: 'SOX',
      jurisdiction: 'US',
      type: 'REGULATION',
    },
    GDPR: {
      name: 'General Data Protection Regulation',
      acronym: 'GDPR',
      jurisdiction: 'EU',
      type: 'REGULATION',
    },
    ISO_27001: {
      name: 'ISO/IEC 27001',
      acronym: 'ISO 27001',
      type: 'STANDARD',
    },
    HIPAA: {
      name: 'Health Insurance Portability and Accountability Act',
      acronym: 'HIPAA',
      jurisdiction: 'US',
      type: 'REGULATION',
    },
    PCI_DSS: {
      name: 'Payment Card Industry Data Security Standard',
      acronym: 'PCI DSS',
      type: 'STANDARD',
    },
    NIST: {
      name: 'NIST Cybersecurity Framework',
      acronym: 'NIST CSF',
      jurisdiction: 'US',
      type: 'GUIDELINE',
    },
  },

  // Assessment frequencies
  ASSESSMENT_FREQUENCIES: {
    CONTINUOUS: {
      name: 'Continuous',
      interval: 0,
      description: 'Real-time monitoring',
    },
    DAILY: {
      name: 'Daily',
      interval: 1,
      description: 'Every day',
    },
    WEEKLY: {
      name: 'Weekly',
      interval: 7,
      description: 'Every week',
    },
    MONTHLY: {
      name: 'Monthly',
      interval: 30,
      description: 'Every month',
    },
    QUARTERLY: {
      name: 'Quarterly',
      interval: 90,
      description: 'Every quarter',
    },
    ANNUALLY: {
      name: 'Annually',
      interval: 365,
      description: 'Every year',
    },
  },

  // Risk scoring
  RISK_SCORING: {
    PROBABILITY_WEIGHTS: {
      VERY_LOW: 1,
      LOW: 2,
      MEDIUM: 3,
      HIGH: 4,
      VERY_HIGH: 5,
    },
    IMPACT_WEIGHTS: {
      VERY_LOW: 1,
      LOW: 2,
      MEDIUM: 3,
      HIGH: 4,
      VERY_HIGH: 5,
    },
    RISK_THRESHOLDS: {
      LOW: 5,
      MEDIUM: 10,
      HIGH: 15,
      CRITICAL: 20,
    },
  },

  // Compliance scoring
  COMPLIANCE_SCORING: {
    WEIGHTS: {
      CRITICAL: 10,
      HIGH: 7,
      MEDIUM: 4,
      LOW: 1,
    },
    THRESHOLDS: {
      EXCELLENT: 95,
      GOOD: 85,
      FAIR: 70,
      POOR: 50,
    },
  },

  // Data classification levels
  DATA_CLASSIFICATION: {
    LEVELS: {
      PUBLIC: {
        level: 1,
        retention: 365 * 7, // 7 years
        encryption: false,
        accessRestrictions: false,
      },
      INTERNAL: {
        level: 2,
        retention: 365 * 5, // 5 years
        encryption: false,
        accessRestrictions: true,
      },
      CONFIDENTIAL: {
        level: 3,
        retention: 365 * 7, // 7 years
        encryption: true,
        accessRestrictions: true,
      },
      RESTRICTED: {
        level: 4,
        retention: 365 * 10, // 10 years
        encryption: true,
        accessRestrictions: true,
      },
      TOP_SECRET: {
        level: 5,
        retention: 365 * 25, // 25 years
        encryption: true,
        accessRestrictions: true,
      },
    },
    CATEGORIES: [
      'PII', // Personally Identifiable Information
      'PHI', // Protected Health Information
      'PCI', // Payment Card Industry
      'FINANCIAL',
      'LEGAL',
      'TRADE_SECRET',
      'CUSTOMER_DATA',
      'EMPLOYEE_DATA',
      'INTELLECTUAL_PROPERTY',
      'REGULATORY',
    ],
  },

  // Data quality thresholds
  DATA_QUALITY: {
    THRESHOLDS: {
      EXCELLENT: 95,
      GOOD: 85,
      FAIR: 70,
      POOR: 50,
    },
    METRICS: [
      'completeness',
      'accuracy',
      'consistency',
      'timeliness',
      'validity',
      'uniqueness',
    ],
    DEFAULT_WEIGHTS: {
      completeness: 0.2,
      accuracy: 0.25,
      consistency: 0.15,
      timeliness: 0.15,
      validity: 0.15,
      uniqueness: 0.1,
    },
  },

  // Emergency plan types
  EMERGENCY_TYPES: {
    NATURAL_DISASTER: {
      name: 'Natural Disaster',
      subcategories: ['EARTHQUAKE', 'FLOOD', 'HURRICANE', 'TORNADO', 'WILDFIRE', 'BLIZZARD'],
      defaultSeverity: 'MAJOR',
    },
    CYBER_INCIDENT: {
      name: 'Cyber Security Incident',
      subcategories: ['DATA_BREACH', 'RANSOMWARE', 'DDOS', 'MALWARE', 'PHISHING', 'INSIDER_THREAT'],
      defaultSeverity: 'HIGH',
    },
    FIRE: {
      name: 'Fire Emergency',
      subcategories: ['BUILDING_FIRE', 'ELECTRICAL_FIRE', 'CHEMICAL_FIRE', 'EXPLOSION'],
      defaultSeverity: 'MAJOR',
    },
    MEDICAL: {
      name: 'Medical Emergency',
      subcategories: ['INJURY', 'ILLNESS', 'PANDEMIC', 'QUARANTINE'],
      defaultSeverity: 'MODERATE',
    },
    SECURITY: {
      name: 'Security Incident',
      subcategories: ['THEFT', 'VANDALISM', 'WORKPLACE_VIOLENCE', 'TERRORISM', 'BOMB_THREAT'],
      defaultSeverity: 'HIGH',
    },
    BUSINESS_CONTINUITY: {
      name: 'Business Continuity',
      subcategories: ['SYSTEM_OUTAGE', 'SUPPLY_CHAIN', 'KEY_PERSONNEL', 'VENDOR_FAILURE'],
      defaultSeverity: 'MODERATE',
    },
  },

  // Incident severity criteria
  INCIDENT_SEVERITY: {
    MINOR: {
      level: 1,
      maxAffected: 10,
      maxDowntime: 4, // hours
      businessImpact: 'MINIMAL',
    },
    MODERATE: {
      level: 2,
      maxAffected: 50,
      maxDowntime: 24, // hours
      businessImpact: 'LIMITED',
    },
    MAJOR: {
      level: 3,
      maxAffected: 200,
      maxDowntime: 72, // hours
      businessImpact: 'SIGNIFICANT',
    },
    CATASTROPHIC: {
      level: 4,
      maxAffected: 1000,
      maxDowntime: 168, // hours (1 week)
      businessImpact: 'SEVERE',
    },
  },

  // Communication channels
  COMMUNICATION_CHANNELS: {
    PA_SYSTEM: {
      priority: 1,
      reachTime: 1, // minutes
      reliability: 'HIGH',
    },
    EMAIL: {
      priority: 2,
      reachTime: 5, // minutes
      reliability: 'MEDIUM',
    },
    SMS: {
      priority: 3,
      reachTime: 2, // minutes
      reliability: 'HIGH',
    },
    PHONE_TREE: {
      priority: 4,
      reachTime: 15, // minutes
      reliability: 'MEDIUM',
    },
    SOCIAL_MEDIA: {
      priority: 5,
      reachTime: 10, // minutes
      reliability: 'LOW',
    },
    WEBSITE: {
      priority: 6,
      reachTime: 5, // minutes
      reliability: 'MEDIUM',
    },
    MOBILE_APP: {
      priority: 7,
      reachTime: 3, // minutes
      reliability: 'HIGH',
    },
  },

  // Compliance report types
  REPORT_TYPES: {
    REGULATORY: {
      name: 'Regulatory Report',
      requiresApproval: true,
      externalSubmission: true,
      retention: 365 * 7, // 7 years
    },
    INTERNAL: {
      name: 'Internal Audit Report',
      requiresApproval: true,
      externalSubmission: false,
      retention: 365 * 5, // 5 years
    },
    AUDIT: {
      name: 'External Audit Report',
      requiresApproval: true,
      externalSubmission: false,
      retention: 365 * 7, // 7 years
    },
    CERTIFICATION: {
      name: 'Certification Report',
      requiresApproval: true,
      externalSubmission: true,
      retention: 365 * 10, // 10 years
    },
  },

  // Control types
  CONTROL_TYPES: {
    PREVENTIVE: {
      name: 'Preventive Control',
      description: 'Controls that prevent incidents from occurring',
      effectiveness: 'HIGH',
    },
    DETECTIVE: {
      name: 'Detective Control',
      description: 'Controls that detect incidents after they occur',
      effectiveness: 'MEDIUM',
    },
    CORRECTIVE: {
      name: 'Corrective Control',
      description: 'Controls that correct incidents after detection',
      effectiveness: 'MEDIUM',
    },
    ADMINISTRATIVE: {
      name: 'Administrative Control',
      description: 'Policy and procedure-based controls',
      effectiveness: 'MEDIUM',
    },
  },

  // Validation rules
  VALIDATION: {
    ASSESSMENT_NAME: {
      minLength: 3,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_().]+$/,
    },
    RISK_TITLE: {
      minLength: 5,
      maxLength: 200,
    },
    FINDING_DESCRIPTION: {
      minLength: 10,
      maxLength: 2000,
    },
    PLAN_NAME: {
      minLength: 5,
      maxLength: 100,
    },
    PROCEDURE_TITLE: {
      minLength: 3,
      maxLength: 150,
    },
    CONTACT_PHONE: {
      pattern: /^\+?[\d\s\-\(\)]{10,}$/,
    },
    CONTACT_EMAIL: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },

  // Notification settings
  NOTIFICATIONS: {
    FINDING_CREATED: {
      immediate: ['CRITICAL', 'HIGH'],
      daily: ['MEDIUM'],
      weekly: ['LOW'],
    },
    ASSESSMENT_DUE: {
      advance: [30, 14, 7, 1], // days
    },
    INCIDENT_DECLARED: {
      immediate: ['MAJOR', 'CATASTROPHIC'],
      within_15min: ['MODERATE'],
      within_1hour: ['MINOR'],
    },
    PLAN_TEST_DUE: {
      advance: [90, 30, 7], // days
    },
  },

  // Caching settings
  CACHE_SETTINGS: {
    FRAMEWORKS: 24 * 60 * 60, // 24 hours
    ASSESSMENTS: 60 * 60, // 1 hour
    POLICIES: 2 * 60 * 60, // 2 hours
    PLANS: 60 * 60, // 1 hour
    METRICS: 30 * 60, // 30 minutes
    REPORTS: 4 * 60 * 60, // 4 hours
  },

  // API rate limits
  RATE_LIMITS: {
    ASSESSMENT_CREATION: {
      maxRequests: 10,
      windowMinutes: 60,
    },
    REPORT_GENERATION: {
      maxRequests: 5,
      windowMinutes: 60,
    },
    BULK_OPERATIONS: {
      maxRequests: 2,
      windowMinutes: 60,
    },
    EMERGENCY_ACTIVATION: {
      maxRequests: 3,
      windowMinutes: 5,
    },
  },

  // Event types
  EVENTS: {
    // Compliance events
    COMPLIANCE_ASSESSMENT_CREATED: 'compliance:assessment:created',
    COMPLIANCE_ASSESSMENT_COMPLETED: 'compliance:assessment:completed',
    COMPLIANCE_FINDING_CREATED: 'compliance:finding:created',
    COMPLIANCE_FINDING_RESOLVED: 'compliance:finding:resolved',
    COMPLIANCE_RULE_UPDATED: 'compliance:rule:updated',
    
    // Data governance events
    DATA_POLICY_CREATED: 'data_governance:policy:created',
    DATA_POLICY_UPDATED: 'data_governance:policy:updated',
    DATA_QUALITY_ALERT: 'data_governance:quality:alert',
    DATA_LINEAGE_UPDATED: 'data_governance:lineage:updated',
    DATA_CLASSIFICATION_CHANGED: 'data_governance:classification:changed',
    
    // Emergency planning events
    EMERGENCY_PLAN_ACTIVATED: 'emergency:plan:activated',
    EMERGENCY_PLAN_DEACTIVATED: 'emergency:plan:deactivated',
    EMERGENCY_DRILL_SCHEDULED: 'emergency:drill:scheduled',
    EMERGENCY_DRILL_COMPLETED: 'emergency:drill:completed',
    INCIDENT_DECLARED: 'emergency:incident:declared',
    INCIDENT_RESOLVED: 'emergency:incident:resolved',
    
    // General events
    RISK_THRESHOLD_EXCEEDED: 'risk:threshold:exceeded',
    COMPLIANCE_SCORE_CHANGED: 'compliance:score:changed',
    AUDIT_SCHEDULED: 'audit:scheduled',
    CERTIFICATION_EXPIRING: 'certification:expiring',
  },

  // Error codes
  ERROR_CODES: {
    ASSESSMENT_NOT_FOUND: 'ASSESSMENT_NOT_FOUND',
    INVALID_FRAMEWORK: 'INVALID_FRAMEWORK',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    ASSESSMENT_IN_PROGRESS: 'ASSESSMENT_IN_PROGRESS',
    FINDING_ALREADY_RESOLVED: 'FINDING_ALREADY_RESOLVED',
    PLAN_NOT_ACTIVE: 'PLAN_NOT_ACTIVE',
    EMERGENCY_ALREADY_ACTIVE: 'EMERGENCY_ALREADY_ACTIVE',
    INVALID_CLASSIFICATION: 'INVALID_CLASSIFICATION',
    DATA_QUALITY_THRESHOLD_ERROR: 'DATA_QUALITY_THRESHOLD_ERROR',
    POLICY_CONFLICT: 'POLICY_CONFLICT',
    INVALID_RISK_SCORE: 'INVALID_RISK_SCORE',
    CONTROL_IMPLEMENTATION_FAILED: 'CONTROL_IMPLEMENTATION_FAILED',
    REPORT_GENERATION_FAILED: 'REPORT_GENERATION_FAILED',
  },

  // Default settings
  DEFAULTS: {
    ASSESSMENT_DURATION: 30, // days
    FINDING_DUE_DAYS: 90,
    PLAN_TEST_FREQUENCY: 365, // days
    RISK_REVIEW_FREQUENCY: 90, // days
    POLICY_REVIEW_FREQUENCY: 365, // days
    DATA_RETENTION_DEFAULT: 2555, // days (7 years)
    EMERGENCY_DRILL_FREQUENCY: 180, // days (6 months)
  },

  // File size limits
  FILE_LIMITS: {
    EVIDENCE_MAX_SIZE: 50 * 1024 * 1024, // 50MB
    REPORT_ATTACHMENT_MAX_SIZE: 100 * 1024 * 1024, // 100MB
    POLICY_DOCUMENT_MAX_SIZE: 25 * 1024 * 1024, // 25MB
    PLAN_DOCUMENT_MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'txt', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'zip'
    ],
  },

  // Integration endpoints
  INTEGRATIONS: {
    GRC_PLATFORMS: ['ServiceNow GRC', 'MetricStream', 'LogicGate', 'Resolver'],
    SIEM_PLATFORMS: ['Splunk', 'QRadar', 'ArcSight', 'Sentinel'],
    NOTIFICATION_SERVICES: ['PagerDuty', 'Opsgenie', 'VictorOps', 'Slack'],
    DOCUMENT_SYSTEMS: ['SharePoint', 'Box', 'Google Drive', 'OneDrive'],
  },

  // Performance metrics
  PERFORMANCE: {
    MAX_CONCURRENT_ASSESSMENTS: 50,
    MAX_FINDINGS_PER_ASSESSMENT: 1000,
    MAX_CONTROLS_PER_FRAMEWORK: 500,
    MAX_PROCEDURES_PER_PLAN: 100,
    MAX_CONTACTS_PER_PLAN: 200,
    BULK_OPERATION_BATCH_SIZE: 100,
  },
} as const;

// Export individual constant groups for convenience
export const {
  FRAMEWORKS,
  ASSESSMENT_FREQUENCIES,
  RISK_SCORING,
  COMPLIANCE_SCORING,
  DATA_CLASSIFICATION,
  DATA_QUALITY,
  EMERGENCY_TYPES,
  INCIDENT_SEVERITY,
  COMMUNICATION_CHANNELS,
  REPORT_TYPES,
  CONTROL_TYPES,
  VALIDATION,
  NOTIFICATIONS,
  CACHE_SETTINGS,
  RATE_LIMITS,
  EVENTS,
  ERROR_CODES,
  DEFAULTS,
  FILE_LIMITS,
  INTEGRATIONS,
  PERFORMANCE,
} = COMPLIANCE_CONSTANTS;