/**
 * Internationalization and Localization Service
 * 
 * Handles multi-language support, regional formatting, currency conversion,
 * and cultural adaptations for tenant white-label applications.
 */

import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { 
  LocalizationConfig, 
  MultiTenantContext 
} from '../types/TenantBrandingTypes';
import { 
  LOCALIZATION, 
  EVENTS 
} from '../constants/TenantBrandingConstants';

interface TranslationCache {
  [languageCode: string]: {
    [key: string]: string;
  };
}

interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

interface FormattingContext {
  language: string;
  country?: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: string;
  rtl: boolean;
}

export class InternationalizationService extends EventEmitter {
  private readonly translationCache: Map<string, TranslationCache> = new Map();
  private readonly localizationConfigs: Map<string, LocalizationConfig> = new Map();
  private readonly currencyRates: Map<string, CurrencyRate> = new Map();
  private readonly formatters: Map<string, Intl.NumberFormat | Intl.DateTimeFormat> = new Map();

  constructor() {
    super();
    this.initializeDefaultTranslations();
    this.setupCurrencyRateUpdates();
  }

  /**
   * Setup localization configuration for an organization
   */
  async setupLocalization(
    organizationId: string,
    config: LocalizationConfig
  ): Promise<void> {
    try {
      // Validate configuration
      this.validateLocalizationConfig(config);

      // Store configuration
      this.localizationConfigs.set(organizationId, config);

      // Load translations for supported languages
      await this.loadTranslations(organizationId, config.supportedLanguages);

      // Setup formatters
      this.setupFormatters(organizationId, config);

      logger.info('Localization setup completed', {
        organizationId,
        defaultLanguage: config.defaultLanguage,
        supportedLanguages: config.supportedLanguages,
        currency: config.currency,
      });
    } catch (error: unknown) {
      logger.error('Localization setup failed', {
        organizationId,
        error: error instanceof Error ? (error).message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get localized text
   */
  async getLocalizedText(
    context: MultiTenantContext,
    key: string,
    variables?: Record<string, any>,
    options?: {
      language?: string;
      fallback?: string;
    }
  ): Promise<string> {
    try {
      const config = this.localizationConfigs.get(context.organizationId);
      if (!config) {
        return key; // Return key as fallback
      }

      const language = options?.language || 
                      this.detectUserLanguage(context) || 
                      config.defaultLanguage;

      // Get translation from cache
      const orgTranslations = this.translationCache.get(context.organizationId);
      let translation = orgTranslations?.[language][key];

      // Try fallback language
      if (!translation && config.fallbackLanguage) {
        translation = orgTranslations?.[config.fallbackLanguage]?.[key];
      }

      // Use provided fallback or key
      if (!translation) {
        translation = options?.fallback || key;
      }

      // Replace variables
      if (variables && typeof translation === 'string') {
        translation = this.replaceVariables(translation, variables);
      }

      return translation;
    } catch (error: unknown) {
      logger.error('Failed to get localized text', {
        organizationId: context.organizationId,
        key,
        error: error instanceof Error ? (error).message : 'Unknown error',
      });
      return options?.fallback || key;
    }
  }

  /**
   * Format number based on locale
   */
  async formatNumber(
    context: MultiTenantContext,
    value: number,
    options?: {
      style?: 'decimal' | 'currency' | 'percent';
      currency?: string;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    }
  ): Promise<string> {
    try {
      const config = this.localizationConfigs.get(context.organizationId);
      if (!config) {
        return value.toString();
      }

      const formattingContext = this.getFormattingContext(context, config);
      const formatterKey = this.getFormatterKey('number', formattingContext, options);
      
      let formatter = this.formatters.get(formatterKey) as Intl.NumberFormat;
      
      if (!formatter) {
        const formatOptions: Intl.NumberFormatOptions = {
          ...options,
          currency: options?.currency || config.currency,
        };

        formatter = new Intl.NumberFormat(
          this.getLocaleString(formattingContext.language, formattingContext.country),
          formatOptions
        );
        
        this.formatters.set(formatterKey, formatter);
      }

      return formatter.format(value);
    } catch (error: unknown) {
      logger.error('Number formatting failed', {
        organizationId: context.organizationId,
        value,
        error: error instanceof Error ? (error).message : 'Unknown error',
      });
      return value.toString();
    }
  }

  /**
   * Format date based on locale
   */
  async formatDate(
    context: MultiTenantContext,
    date: Date,
    options?: {
      dateStyle?: 'full' | 'long' | 'medium' | 'short';
      timeStyle?: 'full' | 'long' | 'medium' | 'short';
      timeZone?: string;
    }
  ): Promise<string> {
    try {
      const config = this.localizationConfigs.get(context.organizationId);
      if (!config) {
        return date.toLocaleDateString();
      }

      const formattingContext = this.getFormattingContext(context, config);
      const formatterKey = this.getFormatterKey('date', formattingContext, options);
      
      let formatter = this.formatters.get(formatterKey) as Intl.DateTimeFormat;
      
      if (!formatter) {
        const formatOptions: Intl.DateTimeFormatOptions = {
          ...options,
          timeZone: options?.timeZone || formattingContext.timezone,
        };

        // Apply custom date format if specified
        if (!options?.dateStyle && config.dateFormat) {
          this.applyCustomDateFormat(formatOptions, config.dateFormat);
        }

        formatter = new Intl.DateTimeFormat(
          this.getLocaleString(formattingContext.language, formattingContext.country),
          formatOptions
        );
        
        this.formatters.set(formatterKey, formatter);
      }

      return formatter.format(date);
    } catch (error: unknown) {
      logger.error('Date formatting failed', {
        organizationId: context.organizationId,
        date,
        error: error instanceof Error ? (error).message : 'Unknown error',
      });
      return date.toLocaleDateString();
    }
  }

  /**
   * Convert currency
   */
  async convertCurrency(
    context: MultiTenantContext,
    amount: number,
    fromCurrency: string,
    toCurrency?: string
  ): Promise<{ amount: number; currency: string; rate: number }> {
    try {
      const config = this.localizationConfigs.get(context.organizationId);
      const targetCurrency = toCurrency || config?.currency || 'USD';

      if (fromCurrency === targetCurrency) {
        return { amount, currency: targetCurrency, rate: 1 };
      }

      const rateKey = `${fromCurrency}_${targetCurrency}`;
      const currencyRate = this.currencyRates.get(rateKey);

      if (!currencyRate || this.isRateStale(currencyRate)) {
        await this.updateCurrencyRate(fromCurrency, targetCurrency);
      }

      const updatedRate = this.currencyRates.get(rateKey);
      if (!updatedRate) {
        throw new Error(`Currency rate not available: ${fromCurrency} to ${targetCurrency}`);
      }

      const convertedAmount = amount * updatedRate.rate;

      return {
        amount: convertedAmount,
        currency: targetCurrency,
        rate: updatedRate.rate,
      };
    } catch (error: unknown) {
      logger.error('Currency conversion failed', {
        organizationId: context.organizationId,
        amount,
        fromCurrency,
        toCurrency,
        error: error instanceof Error ? (error).message : 'Unknown error',
      });
      
      // Return original amount as fallback
      return { amount, currency: fromCurrency, rate: 1 };
    }
  }

  /**
   * Get available languages for an organization
   */
  async getAvailableLanguages(organizationId: string): Promise<string[]> {
    const config = this.localizationConfigs.get(organizationId);
    return config?.supportedLanguages || [LOCALIZATION.DEFAULT_LANGUAGE];
  }

  /**
   * Update translations for a specific language
   */
  async updateTranslations(
    organizationId: string,
    language: string,
    translations: Record<string, string>
  ): Promise<void> {
    try {
      let orgTranslations = this.translationCache.get(organizationId);
      if (!orgTranslations) {
        orgTranslations = {};
        this.translationCache.set(organizationId, orgTranslations);
      }

      if (!orgTranslations[language]) {
        orgTranslations[language] = {};
      }

      // Merge translations
      Object.assign(orgTranslations[language], translations);

      logger.info('Translations updated', {
        organizationId,
        language,
        count: Object.keys(translations).length,
      });
    } catch (error: unknown) {
      logger.error('Failed to update translations', {
        organizationId,
        language,
        error: error instanceof Error ? (error).message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Export translations for backup/migration
   */
  async exportTranslations(
    organizationId: string,
    language?: string
  ): Promise<Record<string, any>> {
    const orgTranslations = this.translationCache.get(organizationId);
    if (!orgTranslations) {
      return {};
    }

    if (language) {
      return { [language]: orgTranslations[language] || {} };
    }

    return orgTranslations;
  }

  /**
   * Detect user's preferred language
   */
  private detectUserLanguage(context: MultiTenantContext): string | null {
    const config = this.localizationConfigs.get(context.organizationId);
    if (!config?.autoDetectLanguage) {
      return null;
    }

    // In a real implementation, this would check:
    // - User's saved language preference
    // - Browser Accept-Language header
    // - Geo-IP location
    // - Organization default

    return config.defaultLanguage;
  }

  /**
   * Replace variables in translated text
   */
  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get formatting context for locale-specific formatting
   */
  private getFormattingContext(
    context: MultiTenantContext,
    config: LocalizationConfig
  ): FormattingContext {
    const language = context.localization?.defaultLanguage || config.defaultLanguage;
    
    return {
      language,
      currency: config.currency,
      timezone: config.timezone || LOCALIZATION.DEFAULT_TIMEZONE,
      dateFormat: config.dateFormat,
      timeFormat: config.timeFormat,
      numberFormat: config.numberFormat,
      rtl: LOCALIZATION.RTL_LANGUAGES.includes(language),
    };
  }

  /**
   * Get locale string for Intl APIs
   */
  private getLocaleString(language: string, country?: string): string {
    return country ? `${language}-${country}` : language;
  }

  /**
   * Get unique formatter key for caching
   */
  private getFormatterKey(
    type: 'number' | 'date',
    context: FormattingContext,
    options?: any
  ): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${type}_${context.language}_${context.currency}_${optionsStr}`;
  }

  /**
   * Apply custom date format to Intl options
   */
  private applyCustomDateFormat(
    options: Intl.DateTimeFormatOptions,
    format: string
  ): void {
    // Simple mapping of common format patterns
    // In production, this would be more comprehensive
    const formatMappings: Record<string, Partial<Intl.DateTimeFormatOptions>> = {
      'MM/DD/YYYY': { month: '2-digit', day: '2-digit', year: 'numeric' },
      'DD/MM/YYYY': { day: '2-digit', month: '2-digit', year: 'numeric' },
      'YYYY-MM-DD': { year: 'numeric', month: '2-digit', day: '2-digit' },
    };

    const mapping = formatMappings[format];
    if (mapping) {
      Object.assign(options, mapping);
    }
  }

  /**
   * Validate localization configuration
   */
  private validateLocalizationConfig(config: LocalizationConfig): void {
    if (!config.defaultLanguage) {
      throw new Error('Default language is required');
    }

    if (!config.supportedLanguages.includes(config.defaultLanguage)) {
      throw new Error('Default language must be included in supported languages');
    }

    if (!config.currency || config.currency.length !== 3) {
      throw new Error('Valid 3-letter currency code is required');
    }
  }

  /**
   * Initialize default translations
   */
  private initializeDefaultTranslations(): void {
    // Load common UI translations
    const defaultTranslations = {
      en: {
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.close': 'Close',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.warning': 'Warning',
        'common.info': 'Information',
      },
      es: {
        'common.save': 'Guardar',
        'common.cancel': 'Cancelar',
        'common.delete': 'Eliminar',
        'common.edit': 'Editar',
        'common.close': 'Cerrar',
        'common.loading': 'Cargando...',
        'common.error': 'Error',
        'common.success': 'Éxito',
        'common.warning': 'Advertencia',
        'common.info': 'Información',
      },
      fr: {
        'common.save': 'Enregistrer',
        'common.cancel': 'Annuler',
        'common.delete': 'Supprimer',
        'common.edit': 'Modifier',
        'common.close': 'Fermer',
        'common.loading': 'Chargement...',
        'common.error': 'Erreur',
        'common.success': 'Succès',
        'common.warning': 'Avertissement',
        'common.info': 'Information',
      },
    };

    // Store default translations for global use
    this.translationCache.set('default', defaultTranslations);
  }

  /**
   * Load translations for supported languages
   */
  private async loadTranslations(
    organizationId: string,
    languages: string[]
  ): Promise<void> {
    try {
      // Initialize with defaults
      const defaultTranslations = this.translationCache.get('default') || {};
      const orgTranslations: TranslationCache = {};

      for (const language of languages) {
        orgTranslations[language] = {
          ...(defaultTranslations[language] || {}),
          // Additional organization-specific translations would be loaded here
        };
      }

      this.translationCache.set(organizationId, orgTranslations);
    } catch (error: unknown) {
      logger.error('Failed to load translations', {
        organizationId,
        languages,
        error: error instanceof Error ? (error).message : 'Unknown error',
      });
    }
  }

  /**
   * Setup formatters for organization
   */
  private setupFormatters(organizationId: string, config: LocalizationConfig): void {
    // Pre-create commonly used formatters
    const commonFormats = [
      { style: 'currency' as const, currency: config.currency },
      { style: 'percent' as const },
      { style: 'decimal' as const },
    ];

    for (const format of commonFormats) {
      const key = `number_${config.defaultLanguage}_${config.currency}_${JSON.stringify(format)}`;
      const formatter = new Intl.NumberFormat(config.defaultLanguage, format);
      this.formatters.set(key, formatter);
    }
  }

  /**
   * Setup currency rate updates
   */
  private setupCurrencyRateUpdates(): void {
    // Update currency rates every hour
    setInterval(() => {
      this.updateAllCurrencyRates();
    }, 60 * 60 * 1000);
  }

  /**
   * Update currency rate for specific pair
   */
  private async updateCurrencyRate(from: string, to: string): Promise<void> {
    try {
      // In production, this would call a real currency API
      // For now, using mock data
      const mockRate = 1 + (Math.random() - 0.5) * 0.1; // Simulate ±5% variation
      
      const currencyRate: CurrencyRate = {
        from,
        to,
        rate: mockRate,
        timestamp: new Date(),
      };

      this.currencyRates.set(`${from}_${to}`, currencyRate);

      logger.debug('Currency rate updated', { from, to, rate: mockRate });
    } catch (error: unknown) {
      logger.error('Failed to update currency rate', {
        from,
        to,
        error: error instanceof Error ? (error).message : 'Unknown error',
      });
    }
  }

  /**
   * Update all currency rates
   */
  private async updateAllCurrencyRates(): Promise<void> {
    // In production, this would batch update all required currency pairs
    logger.debug('Currency rates update scheduled');
  }

  /**
   * Check if currency rate is stale
   */
  private isRateStale(rate: CurrencyRate): boolean {
    const staleThreshold = 4 * 60 * 60 * 1000; // 4 hours
    return Date.now() - rate.timestamp.getTime() > staleThreshold;
  }
}