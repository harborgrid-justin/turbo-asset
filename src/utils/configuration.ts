/**
 * Enterprise Configuration Management System
 * Provides centralized, type-safe configuration with environment-specific overrides
 */

import { logger } from '../config/logger';
import { EnterpriseError, ValidationUtils } from '../utils/error-handling';
import { HTTP_STATUS } from '../constants';

export interface ConfigurationSchema {
  readonly [key: string]: ConfigValue | ConfigurationSchema;
}

export type ConfigValue = string | number | boolean | readonly ConfigValue[];

export interface EnvironmentConfig {
  readonly environment: Environment;
  readonly version: string;
  readonly debug: boolean;
  readonly logging: LoggingConfig;
  readonly database: DatabaseConfig;
  readonly cache: CacheConfig;
  readonly security: SecurityConfig;
  readonly monitoring: MonitoringConfig;
  readonly features: FeatureFlags;
}

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface LoggingConfig {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly format: 'json' | 'text';
  readonly enableConsole: boolean;
  readonly enableFile: boolean;
  readonly filePath?: string;
  readonly maxFileSize: number;
  readonly maxFiles: number;
}

export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly ssl: boolean;
  readonly poolMin: number;
  readonly poolMax: number;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly retryDelay: number;
}

export interface CacheConfig {
  readonly provider: 'memory' | 'redis';
  readonly host?: string;
  readonly port?: number;
  readonly password?: string;
  readonly database?: number;
  readonly ttl: number;
  readonly maxSize: number;
  readonly compressionEnabled: boolean;
  readonly compressionThreshold: number;
}

export interface SecurityConfig {
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly bcryptRounds: number;
  readonly rateLimitWindow: number;
  readonly rateLimitMax: number;
  readonly corsOrigins: readonly string[];
  readonly enableHttps: boolean;
  readonly httpsPort?: number;
  readonly sessionSecret: string;
  readonly sessionMaxAge: number;
}

export interface MonitoringConfig {
  readonly enabled: boolean;
  readonly interval: number;
  readonly metricsRetention: number;
  readonly alertsEnabled: boolean;
  readonly healthCheckEndpoint: boolean;
  readonly prometheus: {
    readonly enabled: boolean;
    readonly port: number;
    readonly path: string;
  };
}

export interface FeatureFlags {
  readonly enhancedLogging: boolean;
  readonly advancedCaching: boolean;
  readonly performanceMonitoring: boolean;
  readonly securityAuditing: boolean;
  readonly experimentalFeatures: boolean;
  readonly maintenanceMode: boolean;
}

/**
 * Configuration Provider Interface
 */
export interface ConfigurationProvider {
  getName(): string;
  load(): Promise<Partial<EnvironmentConfig>>;
  watch?(callback: (config: Partial<EnvironmentConfig>) => void): void;
  validate?(config: Partial<EnvironmentConfig>): readonly string[];
}

/**
 * Environment Variables Configuration Provider
 */
export class EnvironmentProvider implements ConfigurationProvider {
  public getName(): string {
    return 'environment';
  }

  public async load(): Promise<Partial<EnvironmentConfig>> {
    return {
      environment: this.getEnvironment(),
      version: process.env.APP_VERSION ?? '1.0.0',
      debug: process.env.DEBUG === 'true',
      
      logging: {
        level: this.getLogLevel(),
        format: process.env.LOG_FORMAT === 'json' ? 'json' : 'text',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
        filePath: process.env.LOG_FILE_PATH,
        maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE ?? '10485760', 10), // 10MB
        maxFiles: parseInt(process.env.LOG_MAX_FILES ?? '5', 10)
      },

      database: {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        database: process.env.DB_NAME ?? 'turbo_asset',
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? '',
        ssl: process.env.DB_SSL === 'true',
        poolMin: parseInt(process.env.DB_POOL_MIN ?? '5', 10),
        poolMax: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
        timeout: parseInt(process.env.DB_TIMEOUT ?? '30000', 10),
        retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS ?? '3', 10),
        retryDelay: parseInt(process.env.DB_RETRY_DELAY ?? '1000', 10)
      },

      cache: {
        provider: process.env.CACHE_PROVIDER === 'redis' ? 'redis' : 'memory',
        host: process.env.CACHE_HOST,
        port: process.env.CACHE_PORT ? parseInt(process.env.CACHE_PORT, 10) : undefined,
        password: process.env.CACHE_PASSWORD,
        database: process.env.CACHE_DATABASE ? parseInt(process.env.CACHE_DATABASE, 10) : undefined,
        ttl: parseInt(process.env.CACHE_TTL ?? '300000', 10), // 5 minutes
        maxSize: parseInt(process.env.CACHE_MAX_SIZE ?? '1000', 10),
        compressionEnabled: process.env.CACHE_COMPRESSION !== 'false',
        compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD ?? '1024', 10)
      },

      security: {
        jwtSecret: process.env.JWT_SECRET ?? this.generateSecret(),
        jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW ?? '60000', 10),
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '1000', 10),
        corsOrigins: process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) ?? ['*'],
        enableHttps: process.env.ENABLE_HTTPS === 'true',
        httpsPort: process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT, 10) : undefined,
        sessionSecret: process.env.SESSION_SECRET ?? this.generateSecret(),
        sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE ?? '1800000', 10) // 30 minutes
      },

      monitoring: {
        enabled: process.env.MONITORING_ENABLED !== 'false',
        interval: parseInt(process.env.MONITORING_INTERVAL ?? '60000', 10),
        metricsRetention: parseInt(process.env.METRICS_RETENTION ?? '604800000', 10), // 1 week
        alertsEnabled: process.env.ALERTS_ENABLED !== 'false',
        healthCheckEndpoint: process.env.HEALTH_CHECK_ENDPOINT !== 'false',
        prometheus: {
          enabled: process.env.PROMETHEUS_ENABLED === 'true',
          port: parseInt(process.env.PROMETHEUS_PORT ?? '9090', 10),
          path: process.env.PROMETHEUS_PATH ?? '/metrics'
        }
      },

      features: {
        enhancedLogging: process.env.FEATURE_ENHANCED_LOGGING === 'true',
        advancedCaching: process.env.FEATURE_ADVANCED_CACHING !== 'false',
        performanceMonitoring: process.env.FEATURE_PERFORMANCE_MONITORING !== 'false',
        securityAuditing: process.env.FEATURE_SECURITY_AUDITING !== 'false',
        experimentalFeatures: process.env.FEATURE_EXPERIMENTAL === 'true',
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true'
      }
    };
  }

  public validate(config: Partial<EnvironmentConfig>): readonly string[] {
    const errors: string[] = [];

    if (config.database) {
      if (!config.database.host) errors.push('Database host is required');
      if (!config.database.database) errors.push('Database name is required');
      if (!config.database.username) errors.push('Database username is required');
      if (config.database.port < 1 || config.database.port > 65535) {
        errors.push('Database port must be between 1 and 65535');
      }
    }

    if (config.security) {
      if (!config.security.jwtSecret || config.security.jwtSecret.length < 32) {
        errors.push('JWT secret must be at least 32 characters long');
      }
      if (!config.security.sessionSecret || config.security.sessionSecret.length < 32) {
        errors.push('Session secret must be at least 32 characters long');
      }
      if (config.security.bcryptRounds < 10 || config.security.bcryptRounds > 15) {
        errors.push('BCrypt rounds must be between 10 and 15');
      }
    }

    return Object.freeze(errors);
  }

  private getEnvironment(): Environment {
    const env = process.env.NODE_ENV?.toLowerCase();
    switch (env) {
      case 'development':
      case 'staging':
      case 'production':
      case 'test':
        return env;
      default:
        return 'development';
    }
  }

  private getLogLevel(): LoggingConfig['level'] {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    switch (level) {
      case 'debug':
      case 'info':
      case 'warn':
      case 'error':
        return level;
      default:
        return 'info';
    }
  }

  private generateSecret(): string {
    return Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}

/**
 * JSON File Configuration Provider
 */
export class JsonFileProvider implements ConfigurationProvider {
  constructor(private readonly filePath: string) {}

  public getName(): string {
    return `json-file:${this.filePath}`;
  }

  public async load(): Promise<Partial<EnvironmentConfig>> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as Partial<EnvironmentConfig>;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.warn(`Configuration file not found: ${this.filePath}`);
        return {};
      }
      throw new EnterpriseError(
        'CONFIGURATION_ERROR',
        `Failed to load configuration from ${this.filePath}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { filePath: this.filePath, error: String(error) }
      );
    }
  }

  public validate(config: Partial<EnvironmentConfig>): readonly string[] {
    // JSON schema validation could be implemented here
    return [];
  }
}

/**
 * Configuration Manager
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: EnvironmentConfig | null = null;
  private readonly providers: ConfigurationProvider[] = [];
  private readonly watchers: Array<(config: EnvironmentConfig) => void> = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigurationManager {
    if (ConfigurationManager.instance === undefined) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Add configuration provider
   */
  public addProvider(provider: ConfigurationProvider): this {
    this.providers.push(provider);
    logger.debug(`Added configuration provider: ${provider.getName()}`);
    return this;
  }

  /**
   * Load configuration from all providers
   */
  public async load(): Promise<EnvironmentConfig> {
    const configs: Array<Partial<EnvironmentConfig>> = [];
    const errors: string[] = [];

    // Load from all providers
    for (const provider of this.providers) {
      try {
        const config = await provider.load();
        configs.push(config);

        // Validate if provider supports validation
        if (provider.validate) {
          const providerErrors = provider.validate(config);
          errors.push(...providerErrors);
        }

        logger.debug(`Loaded configuration from provider: ${provider.getName()}`);
      } catch (error) {
        logger.error(`Error loading configuration from ${provider.getName()}:`, error);
        errors.push(`Provider ${provider.getName()}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Merge configurations (later providers override earlier ones)
    const mergedConfig = this.mergeConfigs(configs);

    // Apply defaults
    this.config = this.applyDefaults(mergedConfig);

    // Validate final configuration
    const finalErrors = this.validateFinalConfig(this.config);
    errors.push(...finalErrors);

    if (errors.length > 0) {
      throw new EnterpriseError(
        'CONFIGURATION_ERROR',
        `Configuration validation failed: ${errors.join(', ')}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        { errors }
      );
    }

    // Notify watchers
    this.notifyWatchers(this.config);

    logger.info(`Configuration loaded successfully from ${this.providers.length} provider(s)`);
    return this.config;
  }

  /**
   * Get current configuration
   */
  public get(): EnvironmentConfig {
    if (this.config === null) {
      throw new EnterpriseError(
        'CONFIGURATION_ERROR',
        'Configuration not loaded. Call load() first.',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
    return this.config;
  }

  /**
   * Get specific configuration value
   */
  public getValue<T extends keyof EnvironmentConfig>(key: T): EnvironmentConfig[T] {
    return this.get()[key];
  }

  /**
   * Check if configuration is loaded
   */
  public isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Add configuration change watcher
   */
  public watch(callback: (config: EnvironmentConfig) => void): void {
    this.watchers.push(callback);
  }

  /**
   * Reload configuration
   */
  public async reload(): Promise<EnvironmentConfig> {
    logger.info('Reloading configuration...');
    return this.load();
  }

  private mergeConfigs(configs: Array<Partial<EnvironmentConfig>>): Partial<EnvironmentConfig> {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {} as Partial<EnvironmentConfig>);
  }

  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result[key as keyof T] = this.deepMerge(
            (result[key as keyof T] as any) || {},
            value
          );
        } else {
          result[key as keyof T] = value;
        }
      }
    }

    return result;
  }

  private applyDefaults(config: Partial<EnvironmentConfig>): EnvironmentConfig {
    return {
      environment: 'development',
      version: '1.0.0',
      debug: false,
      logging: {
        level: 'info',
        format: 'text',
        enableConsole: true,
        enableFile: false,
        maxFileSize: 10485760, // 10MB
        maxFiles: 5,
        ...config.logging
      },
      database: {
        host: 'localhost',
        port: 5432,
        database: 'turbo_asset',
        username: 'postgres',
        password: '',
        ssl: false,
        poolMin: 5,
        poolMax: 20,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        ...config.database
      },
      cache: {
        provider: 'memory',
        ttl: 300000,
        maxSize: 1000,
        compressionEnabled: true,
        compressionThreshold: 1024,
        ...config.cache
      },
      security: {
        jwtSecret: this.generateSecret(),
        jwtExpiresIn: '24h',
        bcryptRounds: 12,
        rateLimitWindow: 60000,
        rateLimitMax: 1000,
        corsOrigins: ['*'],
        enableHttps: false,
        sessionSecret: this.generateSecret(),
        sessionMaxAge: 1800000,
        ...config.security
      },
      monitoring: {
        enabled: true,
        interval: 60000,
        metricsRetention: 604800000,
        alertsEnabled: true,
        healthCheckEndpoint: true,
        prometheus: {
          enabled: false,
          port: 9090,
          path: '/metrics'
        },
        ...config.monitoring
      },
      features: {
        enhancedLogging: false,
        advancedCaching: true,
        performanceMonitoring: true,
        securityAuditing: true,
        experimentalFeatures: false,
        maintenanceMode: false,
        ...config.features
      },
      ...config
    };
  }

  private validateFinalConfig(config: EnvironmentConfig): readonly string[] {
    const errors: string[] = [];

    try {
      ValidationUtils.validateRequiredString(config.environment, 'environment');
      ValidationUtils.validateRequiredString(config.version, 'version');
      ValidationUtils.validateRequiredString(config.database.host, 'database.host');
      ValidationUtils.validateRequiredNumber(config.database.port, 'database.port', 1, 65535);
      ValidationUtils.validateRequiredString(config.database.database, 'database.database');
      ValidationUtils.validateRequiredString(config.database.username, 'database.username');
      ValidationUtils.validateRequiredString(config.security.jwtSecret, 'security.jwtSecret', 32);
      ValidationUtils.validateRequiredString(config.security.sessionSecret, 'security.sessionSecret', 32);
      ValidationUtils.validateRequiredNumber(config.security.bcryptRounds, 'security.bcryptRounds', 10, 15);
    } catch (error) {
      if (error instanceof EnterpriseError) {
        errors.push(error.message);
      }
    }

    return Object.freeze(errors);
  }

  private notifyWatchers(config: EnvironmentConfig): void {
    for (const watcher of this.watchers) {
      try {
        watcher(config);
      } catch (error) {
        logger.error('Error in configuration watcher:', error);
      }
    }
  }

  private generateSecret(): string {
    // Critical fix: Use cryptographically secure random number generation
    try {
      const crypto = require('crypto');
      if (!crypto.randomBytes) {
        throw new Error('Crypto module not available');
      }
      
      // Critical fix: Generate a proper cryptographically secure secret
      const buffer = crypto.randomBytes(32); // 256-bit secret
      const secret = buffer.toString('base64').replace(/[+/=]/g, '');
      
      // Critical fix: Ensure minimum length and entropy
      if (secret.length < 32) {
        throw new Error('Generated secret does not meet minimum security requirements');
      }
      
      return secret;
    } catch (error) {
      logger.error('Failed to generate secure secret:', error);
      throw new Error('Unable to generate cryptographically secure secret');
    }
  }
}

// Create and configure the default configuration manager
const configManager = ConfigurationManager.getInstance();

// Add default providers
configManager.addProvider(new EnvironmentProvider());

// Add JSON file provider if config file exists
const configPath = process.env.CONFIG_FILE ?? './config.json';
configManager.addProvider(new JsonFileProvider(configPath));

export { configManager };
export default configManager;