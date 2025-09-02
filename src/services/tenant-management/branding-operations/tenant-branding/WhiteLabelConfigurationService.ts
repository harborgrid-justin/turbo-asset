/**
 * White Label Configuration Service
 * 
 * Handles white-label configuration management including creation, updates,
 * versioning, and deployment of tenant-specific branding configurations.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../../config/logger';
import { 
  WhiteLabelConfiguration, 
  BrandingConfiguration, 
  ThemeConfiguration,
  TenantStatus,
  BrandingScope 
} from '../types/TenantBrandingTypes';
import { 
  TENANT_BRANDING_CONSTANTS, 
  EVENTS, 
  ERROR_CODES, 
  BRANDING_VALIDATION 
} from '../constants/TenantBrandingConstants';

export class WhiteLabelConfigurationService extends EventEmitter {
  private configCache: Map<string, WhiteLabelConfiguration> = new Map();
  private versionHistory: Map<string, WhiteLabelConfiguration[]> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for configuration management
   */
  private setupEventHandlers(): void {
    this.on(EVENTS.BRANDING_UPDATED, this.handleBrandingUpdated.bind(this));
    this.on(EVENTS.THEME_APPLIED, this.handleThemeApplied.bind(this));
  }

  /**
   * Create a new white-label configuration
   */
  async createConfiguration(
    organizationId: string,
    name: string,
    description: string,
    brandingScope: BrandingScope,
    branding: BrandingConfiguration,
    theme: ThemeConfiguration,
    createdBy: string,
    customizations?: Record<string, any>
  ): Promise<WhiteLabelConfiguration> {
    try {
      // Validate branding configuration
      this.validateBrandingConfiguration(branding);
      this.validateThemeConfiguration(theme);

      const configId = this.generateConfigId();
      const now = new Date();

      const configuration: WhiteLabelConfiguration = {
        id: configId,
        organizationId,
        name,
        description,
        brandingScope,
        branding,
        theme,
        localization: this.getDefaultLocalization(),
        access: this.getDefaultAccessConfiguration(),
        features: {},
        emailTemplates: [],
        customizations: customizations || {},
        isActive: false,
        createdAt: now,
        updatedAt: now,
        createdBy,
        version: 1,
        isDraft: true,
      };

      // Cache the configuration
      this.configCache.set(configId, configuration);
      this.initializeVersionHistory(configId, configuration);

      // Log creation
      logger.info('White-label configuration created', {
        configId,
        organizationId,
        name,
        brandingScope,
        createdBy,
      });

      return configuration;
    } catch (error) {
      logger.error('Failed to create white-label configuration', {
        organizationId,
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update an existing white-label configuration
   */
  async updateConfiguration(
    configId: string,
    updates: Partial<Omit<WhiteLabelConfiguration, 'id' | 'organizationId' | 'createdAt' | 'version'>>,
    updatedBy: string
  ): Promise<WhiteLabelConfiguration> {
    try {
      const existingConfig = this.configCache.get(configId);
      if (!existingConfig) {
        throw new Error(`Configuration not found: ${configId}`);
      }

      // Validate updates
      if (updates.branding) {
        this.validateBrandingConfiguration(updates.branding);
      }
      if (updates.theme) {
        this.validateThemeConfiguration(updates.theme);
      }

      // Create new version
      const updatedConfig: WhiteLabelConfiguration = {
        ...existingConfig,
        ...updates,
        version: existingConfig.version + 1,
        updatedAt: new Date(),
        lastModifiedBy: updatedBy,
      };

      // Update cache and version history
      this.configCache.set(configId, updatedConfig);
      this.addToVersionHistory(configId, updatedConfig);

      // Emit update event
      this.emit(EVENTS.BRANDING_UPDATED, {
        configId,
        organizationId: updatedConfig.organizationId,
        version: updatedConfig.version,
        updatedBy,
        changes: Object.keys(updates),
      });

      logger.info('White-label configuration updated', {
        configId,
        organizationId: updatedConfig.organizationId,
        version: updatedConfig.version,
        updatedBy,
        changes: Object.keys(updates),
      });

      return updatedConfig;
    } catch (error) {
      logger.error('Failed to update white-label configuration', {
        configId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Publish a configuration (make it active)
   */
  async publishConfiguration(
    configId: string,
    publishedBy: string
  ): Promise<WhiteLabelConfiguration> {
    try {
      const config = this.configCache.get(configId);
      if (!config) {
        throw new Error(`Configuration not found: ${configId}`);
      }

      const publishedConfig = {
        ...config,
        isActive: true,
        isDraft: false,
        publishedVersion: config.version,
        updatedAt: new Date(),
        lastModifiedBy: publishedBy,
      };

      this.configCache.set(configId, publishedConfig);
      this.addToVersionHistory(configId, publishedConfig);

      logger.info('White-label configuration published', {
        configId,
        organizationId: publishedConfig.organizationId,
        version: publishedConfig.version,
        publishedBy,
      });

      return publishedConfig;
    } catch (error) {
      logger.error('Failed to publish white-label configuration', {
        configId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get configuration by ID
   */
  async getConfiguration(configId: string): Promise<WhiteLabelConfiguration | null> {
    const config = this.configCache.get(configId);
    return config || null;
  }

  /**
   * Get configuration by organization ID
   */
  async getConfigurationByOrganization(organizationId: string): Promise<WhiteLabelConfiguration | null> {
    for (const config of this.configCache.values()) {
      if (config.organizationId === organizationId && config.isActive) {
        return config;
      }
    }
    return null;
  }

  /**
   * Get all configurations for an organization
   */
  async getOrganizationConfigurations(organizationId: string): Promise<WhiteLabelConfiguration[]> {
    const configs: WhiteLabelConfiguration[] = [];
    for (const config of this.configCache.values()) {
      if (config.organizationId === organizationId) {
        configs.push(config);
      }
    }
    return configs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get version history for a configuration
   */
  async getVersionHistory(configId: string): Promise<WhiteLabelConfiguration[]> {
    return this.versionHistory.get(configId) || [];
  }

  /**
   * Clone configuration
   */
  async cloneConfiguration(
    configId: string,
    newName: string,
    targetOrganizationId: string,
    clonedBy: string
  ): Promise<WhiteLabelConfiguration> {
    try {
      const sourceConfig = this.configCache.get(configId);
      if (!sourceConfig) {
        throw new Error(`Source configuration not found: ${configId}`);
      }

      const clonedConfig = await this.createConfiguration(
        targetOrganizationId,
        newName,
        `Cloned from ${sourceConfig.name}`,
        sourceConfig.brandingScope,
        { ...sourceConfig.branding },
        { ...sourceConfig.theme },
        clonedBy,
        { ...sourceConfig.customizations }
      );

      logger.info('Configuration cloned', {
        sourceConfigId: configId,
        clonedConfigId: clonedConfig.id,
        targetOrganizationId,
        clonedBy,
      });

      return clonedConfig;
    } catch (error) {
      logger.error('Failed to clone configuration', {
        configId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(configId: string, deletedBy: string): Promise<boolean> {
    try {
      const config = this.configCache.get(configId);
      if (!config) {
        return false;
      }

      // Don't allow deletion of active configurations
      if (config.isActive) {
        throw new Error('Cannot delete active configuration. Deactivate first.');
      }

      this.configCache.delete(configId);
      this.versionHistory.delete(configId);

      logger.info('Configuration deleted', {
        configId,
        organizationId: config.organizationId,
        deletedBy,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete configuration', {
        configId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate branding configuration
   */
  private validateBrandingConfiguration(branding: BrandingConfiguration): void {
    if (!BRANDING_VALIDATION.COLOR_REGEX.test(branding.primaryColor)) {
      throw new Error(`Invalid primary color: ${branding.primaryColor}`);
    }
    if (!BRANDING_VALIDATION.COLOR_REGEX.test(branding.secondaryColor)) {
      throw new Error(`Invalid secondary color: ${branding.secondaryColor}`);
    }
    if (branding.logoUrl && !BRANDING_VALIDATION.URL_REGEX.test(branding.logoUrl)) {
      throw new Error(`Invalid logo URL: ${branding.logoUrl}`);
    }
    if (branding.customCSS && branding.customCSS.length > BRANDING_VALIDATION.MAX_CSS_SIZE) {
      throw new Error('Custom CSS exceeds maximum size limit');
    }
    if (branding.customJS && branding.customJS.length > BRANDING_VALIDATION.MAX_JS_SIZE) {
      throw new Error('Custom JavaScript exceeds maximum size limit');
    }
  }

  /**
   * Validate theme configuration
   */
  private validateThemeConfiguration(theme: ThemeConfiguration): void {
    const requiredColors = ['primary', 'secondary', 'success', 'warning', 'error', 'info'];
    for (const color of requiredColors) {
      if (!theme.colors[color as keyof typeof theme.colors]) {
        throw new Error(`Missing required color: ${color}`);
      }
    }
  }

  /**
   * Generate unique configuration ID
   */
  private generateConfigId(): string {
    return `wl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get default localization configuration
   */
  private getDefaultLocalization() {
    return {
      defaultLanguage: TENANT_BRANDING_CONSTANTS.LOCALIZATION.DEFAULT_LANGUAGE,
      supportedLanguages: [TENANT_BRANDING_CONSTANTS.LOCALIZATION.DEFAULT_LANGUAGE],
      translations: {},
      dateFormat: TENANT_BRANDING_CONSTANTS.LOCALIZATION.DEFAULT_DATE_FORMAT,
      timeFormat: TENANT_BRANDING_CONSTANTS.LOCALIZATION.DEFAULT_TIME_FORMAT,
      currency: TENANT_BRANDING_CONSTANTS.LOCALIZATION.DEFAULT_CURRENCY,
      numberFormat: TENANT_BRANDING_CONSTANTS.LOCALIZATION.DEFAULT_NUMBER_FORMAT,
      rtlSupported: false,
    };
  }

  /**
   * Get default access configuration
   */
  private getDefaultAccessConfiguration() {
    return {
      ssoEnabled: false,
      multiFactorRequired: false,
      sessionTimeout: TENANT_BRANDING_CONSTANTS.ACCESS_CONFIG.DEFAULT_SESSION_TIMEOUT,
      passwordPolicy: TENANT_BRANDING_CONSTANTS.ACCESS_CONFIG.DEFAULT_PASSWORD_POLICY,
    };
  }

  /**
   * Initialize version history for a configuration
   */
  private initializeVersionHistory(configId: string, config: WhiteLabelConfiguration): void {
    this.versionHistory.set(configId, [config]);
  }

  /**
   * Add configuration to version history
   */
  private addToVersionHistory(configId: string, config: WhiteLabelConfiguration): void {
    const history = this.versionHistory.get(configId) || [];
    history.push(config);
    
    // Keep only last 50 versions
    if (history.length > 50) {
      history.shift();
    }
    
    this.versionHistory.set(configId, history);
  }

  /**
   * Handle branding updated event
   */
  private handleBrandingUpdated(eventData: any): void {
    logger.debug('Branding updated event handled', eventData);
    // Additional post-update processing can be added here
  }

  /**
   * Handle theme applied event
   */
  private handleThemeApplied(eventData: any): void {
    logger.debug('Theme applied event handled', eventData);
    // Additional theme processing can be added here
  }
}