import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Resolve the JWT signing secret without ever falling back to a known public
 * default. Production must supply JWT_SECRET (fail fast); non-production uses an
 * ephemeral per-process random secret so local tokens still work but are never
 * a guessable shared value.
 */
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }
  if (nodeEnv === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return crypto.randomBytes(48).toString('hex');
}

const jwtSecret = resolveJwtSecret();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: nodeEnv,
  },

  database: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  security: {
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  },

  auth: {
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    aws: {
      bucket: process.env.AWS_S3_BUCKET || '',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_REGION || 'us-east-1',
    },
  },
  
  external: {
    currencyApiKey: process.env.CURRENCY_API_KEY || '',
    sap: {
      apiUrl: process.env.SAP_API_URL || '',
      apiKey: process.env.SAP_API_KEY || '',
    },
    oracle: {
      apiUrl: process.env.ORACLE_API_URL || '',
      apiKey: process.env.ORACLE_API_KEY || '',
    },
    workday: {
      apiUrl: process.env.WORKDAY_API_URL || '',
      apiKey: process.env.WORKDAY_API_KEY || '',
    },
    serviceNow: {
      apiUrl: process.env.SERVICENOW_API_URL || '',
      apiKey: process.env.SERVICENOW_API_KEY || '',
    },
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/turbo-asset.log',
  },
  
  email: {
    service: process.env.EMAIL_SERVICE || 'smtp',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  
  defaults: {
    language: process.env.DEFAULT_LANGUAGE || 'en',
    currency: process.env.DEFAULT_CURRENCY || 'USD',
    timezone: process.env.DEFAULT_TIMEZONE || 'America/New_York',
  },

  // Mock Data Configuration
  mockData: {
    assetCount: parseInt(process.env.MOCK_ASSET_COUNT || '100'),
    workOrderCount: parseInt(process.env.MOCK_WORK_ORDER_COUNT || '50'),
    spaceCount: parseInt(process.env.MOCK_SPACE_COUNT || '50'),
    maintenanceRecordCount: parseInt(process.env.MOCK_MAINTENANCE_COUNT || '200'),
    auditEntryCount: parseInt(process.env.MOCK_AUDIT_ENTRY_COUNT || '20'),
    enableRandomization: process.env.MOCK_ENABLE_RANDOMIZATION !== 'false',
    seed: parseInt(process.env.MOCK_SEED || '12345'),
    // Business Intelligence specific
    biDefaultRecordCount: parseInt(process.env.MOCK_BI_DEFAULT_RECORDS || '100'),
    // API Management
    mockTotalCost: process.env.MOCK_TOTAL_COST || '$487,650',
    // Service health check intervals
    healthCheckInterval: parseInt(process.env.MOCK_HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
  },
};