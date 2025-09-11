import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { config } from '../config';
import { logger } from '../config/logger';
import path from 'path';

export class InternationalizationService {
  private static instance: InternationalizationService;

  private constructor() {}

  static getInstance(): InternationalizationService {
    if (!InternationalizationService.instance) {
      InternationalizationService.instance = new InternationalizationService();
    }
    return InternationalizationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await i18next
        .use(Backend)
        .init({
          lng: config.defaults.language,
          fallbackLng: 'en',
          debug: config.server.env === 'development',
          
          backend: {
            loadPath: path.join(process.cwd(), 'locales', '{{lng}}', '{{ns}}.json'),
          },

          interpolation: {
            escapeValue: false,
          },

          resources: {
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
                required: 'This field is required',
                invalidEmail: 'Please enter a valid email address',
                invalidUrl: 'Please enter a valid URL',
                invalidPhone: 'Please enter a valid phone number',
              },
              properties: {
                title: 'Properties',
                name: 'Name',
                type: 'Type',
                address: 'Address',
                totalArea: 'Total Area',
                usableArea: 'Usable Area',
                acquisitionCost: 'Acquisition Cost',
                currentValue: 'Current Value',
                acquisitionDate: 'Acquisition Date',
              },
              workflows: {
                title: 'Workflows',
                pending: 'Pending',
                inProgress: 'In Progress',
                completed: 'Completed',
                cancelled: 'Cancelled',
                expired: 'Expired',
                approve: 'Approve',
                reject: 'Reject',
                comment: 'Comment',
              },
              notifications: {
                workflowApprovalRequired: 'Approval required for {{workflowName}}',
                workflowCompleted: 'Workflow {{workflowName}} has been completed',
                workflowOverdue: 'Workflow {{workflowName}} is overdue',
                maintenanceScheduled: 'Maintenance scheduled for {{assetName}}',
                maintenanceCompleted: 'Maintenance completed for {{assetName}}',
              },
            },
          },
        });

      logger.info('Internationalization service initialized');
    } catch (error) {
      logger.error('Failed to initialize internationalization service', error);
      throw error;
    }
  }

  /**
   * Translate a key with optional parameters
   */
  translate(key: string, options?: any, language?: string): string {
    const lng = language || config.defaults.language;
    return i18next.t(key, { ...options, lng }) as string;
  }

  /**
   * Get all translations for a language
   */
  getTranslations(language: string, namespace?: string): Record<string, any> {
    return i18next.getResourceBundle(language, namespace || 'common');
  }

  /**
   * Add translations dynamically
   */
  addTranslations(language: string, namespace: string, translations: Record<string, any>): void {
    i18next.addResourceBundle(language, namespace, translations, true, true);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      'en', // English
      'es', // Spanish
      'fr', // French
      'de', // German
      'it', // Italian
      'pt', // Portuguese
      'nl', // Dutch
      'sv', // Swedish
      'da', // Danish
      'no', // Norwegian
      'fi', // Finnish
      'pl', // Polish
      'cs', // Czech
      'hu', // Hungarian
      'ru', // Russian
      'ja', // Japanese
      'ko', // Korean
      'zh', // Chinese Simplified
      'ar', // Arabic
      'he', // Hebrew
      'hi', // Hindi
      'th', // Thai
      'vi', // Vietnamese
      'tr', // Turkish
    ];
  }

  /**
   * Format currency for locale
   */
  formatCurrency(amount: number, currency: string, language?: string): string {
    const lng = language || config.defaults.language;
    try {
      return new Intl.NumberFormat(lng, {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Format date for locale
   */
  formatDate(date: Date, language?: string, options?: Intl.DateTimeFormatOptions): string {
    const lng = language || config.defaults.language;
    try {
      return new Intl.DateTimeFormat(lng, options).format(date);
    } catch {
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Format number for locale
   */
  formatNumber(number: number, language?: string, options?: Intl.NumberFormatOptions): string {
    const lng = language || config.defaults.language;
    try {
      return new Intl.NumberFormat(lng, options).format(number);
    } catch {
      return number.toString();
    }
  }
}