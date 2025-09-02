/**
 * Localization Service - Manages internationalization and translations
 * 
 * Handles language detection, translation loading, and content localization
 * Part of the Communication Management domain within Turbo Asset IWMS
 */

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { logger } from '../../../../../src/config/logger';
import { LocalizationConfig, I18nConfiguration, TranslationResource } from './types/CommunicationTypes';
import { DEFAULT_I18N_CONFIG, COMMUNICATION_CONSTANTS } from './constants/CommunicationConstants';
import path from 'path';

export class LocalizationService {
  private isInitialized: boolean = false;
  private config: LocalizationConfig;
  private loadedLanguages: Set<string> = new Set();

  constructor(config?: Partial<LocalizationConfig>) {
    this.config = { ...DEFAULT_I18N_CONFIG, ...config };
  }

  /**
   * Initialize the localization service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await i18next
        .use(Backend)
        .init({
          lng: this.config.defaultLanguage,
          fallbackLng: this.config.fallbackLanguage,
          debug: this.config.debug,
          
          backend: {
            loadPath: path.join(process.cwd(), this.config.loadPath),
          },

          interpolation: {
            escapeValue: false,
          },

          // Load default resources
          resources: this.getDefaultResources(),

          // Namespace configuration
          defaultNS: COMMUNICATION_CONSTANTS.I18N_DEFAULTS.NAMESPACE,
          ns: [
            COMMUNICATION_CONSTANTS.I18N_DEFAULTS.NAMESPACE,
            'validation',
            'notifications',
            'workflows',
            'assets',
            'reports'
          ],

          // Language detection
          detection: {
            order: ['header', 'querystring', 'cookie', 'localStorage'],
            caches: ['localStorage', 'cookie']
          }
        });

      this.loadedLanguages.add(this.config.defaultLanguage);
      this.isInitialized = true;

      logger.info('Localization service initialized', {
        defaultLanguage: this.config.defaultLanguage,
        supportedLanguages: this.config.supportedLanguages
      });
    } catch (error) {
      logger.error('Failed to initialize localization service', error);
      throw error;
    }
  }

  /**
   * Translate a key with interpolation
   */
  translate(
    key: string,
    options: {
      language?: string;
      namespace?: string;
      interpolation?: Record<string, any>;
      defaultValue?: string;
    } = {}
  ): string {
    if (!this.isInitialized) {
      logger.warn('Localization service not initialized, returning key');
      return options.defaultValue || key;
    }

    try {
      const translationKey = options.namespace ? `${options.namespace}:${key}` : key;
      
      return i18next.t(translationKey, {
        lng: options.language,
        defaultValue: options.defaultValue,
        ...options.interpolation
      });
    } catch (error) {
      logger.error('Translation failed', { error, key, options });
      return options.defaultValue || key;
    }
  }

  /**
   * Translate multiple keys at once
   */
  translateMultiple(
    keys: string[],
    options: {
      language?: string;
      namespace?: string;
      interpolation?: Record<string, any>;
    } = {}
  ): Record<string, string> {
    const translations: Record<string, string> = {};

    for (const key of keys) {
      translations[key] = this.translate(key, options);
    }

    return translations;
  }

  /**
   * Change current language
   */
  async changeLanguage(language: string): Promise<void> {
    if (!this.config.supportedLanguages.includes(language)) {
      throw new Error(`Language ${language} is not supported`);
    }

    try {
      await i18next.changeLanguage(language);
      this.loadedLanguages.add(language);
      
      logger.info('Language changed', { language });
    } catch (error) {
      logger.error('Failed to change language', { error, language });
      throw error;
    }
  }

  /**
   * Load language resources dynamically
   */
  async loadLanguageResources(
    language: string,
    namespace: string,
    resources: TranslationResource
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      i18next.addResourceBundle(language, namespace, resources, true, true);
      this.loadedLanguages.add(language);

      logger.info('Language resources loaded', { language, namespace });
    } catch (error) {
      logger.error('Failed to load language resources', { error, language, namespace });
      throw error;
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return i18next.language || this.config.defaultLanguage;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.config.supportedLanguages;
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.config.supportedLanguages.includes(language);
  }

  /**
   * Get loaded languages
   */
  getLoadedLanguages(): string[] {
    return Array.from(this.loadedLanguages);
  }

  /**
   * Detect language from request headers
   */
  detectLanguageFromHeaders(acceptLanguage?: string): string {
    if (!acceptLanguage) {
      return this.config.defaultLanguage;
    }

    // Parse Accept-Language header
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const parts = lang.trim().split(';');
        const code = parts[0].split('-')[0].toLowerCase();
        const quality = parts[1] ? parseFloat(parts[1].replace('q=', '')) : 1.0;
        return { code, quality };
      })
      .sort((a, b) => b.quality - a.quality);

    // Find first supported language
    for (const lang of languages) {
      if (this.isLanguageSupported(lang.code)) {
        return lang.code;
      }
    }

    return this.config.defaultLanguage;
  }

  /**
   * Format date according to locale
   */
  formatDate(
    date: Date,
    options: {
      language?: string;
      format?: 'short' | 'medium' | 'long' | 'full';
    } = {}
  ): string {
    const language = options.language || this.getCurrentLanguage();
    
    try {
      const formatOptions: Intl.DateTimeFormatOptions = {};
      
      switch (options.format) {
        case 'short':
          formatOptions.dateStyle = 'short';
          break;
        case 'medium':
          formatOptions.dateStyle = 'medium';
          break;
        case 'long':
          formatOptions.dateStyle = 'long';
          break;
        case 'full':
          formatOptions.dateStyle = 'full';
          break;
        default:
          formatOptions.dateStyle = 'medium';
      }

      return new Intl.DateTimeFormat(language, formatOptions).format(date);
    } catch (error) {
      logger.error('Date formatting failed', { error, date, language });
      return date.toLocaleDateString();
    }
  }

  /**
   * Format number according to locale
   */
  formatNumber(
    number: number,
    options: {
      language?: string;
      style?: 'decimal' | 'currency' | 'percent';
      currency?: string;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    } = {}
  ): string {
    const language = options.language || this.getCurrentLanguage();

    try {
      const formatOptions: Intl.NumberFormatOptions = {
        style: options.style || 'decimal',
        minimumFractionDigits: options.minimumFractionDigits,
        maximumFractionDigits: options.maximumFractionDigits
      };

      if (options.style === 'currency' && options.currency) {
        formatOptions.currency = options.currency;
      }

      return new Intl.NumberFormat(language, formatOptions).format(number);
    } catch (error) {
      logger.error('Number formatting failed', { error, number, language });
      return number.toString();
    }
  }

  /**
   * Get default translation resources
   */
  private getDefaultResources(): any {
    return {
      en: {
        common: {
          loading: 'Loading...',
          save: 'Save',
          cancel: 'Cancel',
          delete: 'Delete',
          edit: 'Edit',
          create: 'Create',
          update: 'Update',
          search: 'Search',
          filter: 'Filter',
          export: 'Export',
          import: 'Import',
          yes: 'Yes',
          no: 'No',
          ok: 'OK',
          close: 'Close'
        },
        notifications: {
          title: 'Notifications',
          markAllRead: 'Mark All Read',
          noNotifications: 'No notifications',
          newNotification: 'New notification',
          notificationSent: 'Notification sent successfully',
          notificationFailed: 'Failed to send notification'
        }
      }
    };
  }
}