/**
 * Enterprise-grade structured logging with correlation IDs
 * Provides comprehensive logging capabilities for production monitoring
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { ValidatedEnvironment, getEnvironmentConfig } from './environment-validation';

// Correlation ID for request tracking
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };

/**
 * Create a new correlation ID
 */
export function createCorrelationId(): CorrelationId {
  return uuidv4() as CorrelationId;
}

/**
 * Log context interface for structured logging
 */
export interface LogContext {
  readonly correlationId?: CorrelationId;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly organizationId?: string;
  readonly operationId?: string;
  readonly requestId?: string;
  readonly duration?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Enterprise logger interface
 */
export interface EnterpriseLogger {
  error(message: string, context?: LogContext, error?: Error): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  audit(action: string, context: LogContext & { result: 'success' | 'failure' }): void;
  performance(operation: string, duration: number, context?: LogContext): void;
}

/**
 * Custom log format for structured logging
 */
const createLogFormat = (env: ValidatedEnvironment) => {
  const formats: winston.Logform.Format[] = [
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true })
  ];

  if (env.NODE_ENV !== 'production') {
    // Development format - more readable
    formats.push(
      winston.format.colorize(),
      winston.format.printf(info => {
        const { timestamp, level, message, correlationId, userId, error, ...meta } = info;
        let log = `${timestamp} [${level}]`;
        
        if (correlationId) {
          log += ` [${correlationId}]`;
        }
        
        if (userId) {
          log += ` [user:${userId}]`;
        }
        
        log += `: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          log += `\n  Meta: ${JSON.stringify(meta, null, 2)}`;
        }
        
        if (error?.stack) {
          log += `\n  Stack: ${error.stack}`;
        }
        
        return log;
      })
    );
  } else {
    // Production format - JSON for log aggregation
    formats.push(winston.format.json());
  }

  return winston.format.combine(...formats);
};

/**
 * Create enterprise logger instance
 */
function createEnterpriseLogger(): EnterpriseLogger {
  const env = getEnvironmentConfig();
  
  const winstonLogger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: createLogFormat(env),
    defaultMeta: {
      service: 'turbo-asset',
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
      // Console transport for all environments
      new winston.transports.Console({
        handleExceptions: true,
        handleRejections: true
      })
    ],
    exitOnError: false
  });

  // Add file transports for non-development environments
  if (env.NODE_ENV !== 'development') {
    winstonLogger.add(new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }));

    winstonLogger.add(new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 20,
      tailable: true
    }));
  }

  // Add audit log transport if enabled
  if (env.AUDIT_LOG_ENABLED) {
    winstonLogger.add(new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 50,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }));
  }

  return {
    error(message: string, context?: LogContext, error?: Error): void {
      winstonLogger.error(message, { ...context, error });
    },

    warn(message: string, context?: LogContext): void {
      winstonLogger.warn(message, context);
    },

    info(message: string, context?: LogContext): void {
      winstonLogger.info(message, context);
    },

    debug(message: string, context?: LogContext): void {
      winstonLogger.debug(message, context);
    },

    audit(action: string, context: LogContext & { result: 'success' | 'failure' }): void {
      winstonLogger.info(`AUDIT: ${action}`, {
        ...context,
        auditEvent: true,
        action,
        timestamp: new Date().toISOString()
      });
    },

    performance(operation: string, duration: number, context?: LogContext): void {
      winstonLogger.info(`PERFORMANCE: ${operation}`, {
        ...context,
        performanceEvent: true,
        operation,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Singleton logger instance
let loggerInstance: EnterpriseLogger | null = null;

/**
 * Get the singleton logger instance
 */
export function getLogger(): EnterpriseLogger {
  if (!loggerInstance) {
    loggerInstance = createEnterpriseLogger();
  }
  return loggerInstance;
}

/**
 * Performance timing utility
 */
export class PerformanceTimer {
  private readonly startTime: number;
  private readonly operation: string;
  private readonly context: LogContext;

  constructor(operation: string, context: LogContext = {}) {
    this.startTime = Date.now();
    this.operation = operation;
    this.context = context;
  }

  /**
   * End timing and log performance
   */
  end(): number {
    const duration = Date.now() - this.startTime;
    getLogger().performance(this.operation, duration, this.context);
    return duration;
  }
}

/**
 * Create a performance timer
 */
export function createTimer(operation: string, context?: LogContext): PerformanceTimer {
  return new PerformanceTimer(operation, context);
}

/**
 * Logger middleware for Express
 */
export function createLoggerMiddleware() {
  const logger = getLogger();
  
  return (req: any, res: any, next: any): void => {
    const correlationId = createCorrelationId();
    const startTime = Date.now();
    
    // Attach correlation ID to request
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Log request
    logger.info('Request started', {
      correlationId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        correlationId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration
      });
    });
    
    next();
  };
}

// Export logger as default
export default getLogger();