import { InternationalizationService } from '../src/services/InternationalizationService';

describe('InternationalizationService', () => {
  let i18nService: InternationalizationService;

  beforeAll(async () => {
    i18nService = InternationalizationService.getInstance();
    await i18nService.initialize();
  });

  test('should translate basic keys', () => {
    const translation = i18nService.translate('common.save');
    expect(translation).toBe('Save');
  });

  test('should format currency', () => {
    const formatted = i18nService.formatCurrency(1000, 'USD');
    expect(formatted).toMatch(/^\$1,000\.00$/);
  });

  test('should format date', () => {
    const date = new Date('2023-12-25');
    const formatted = i18nService.formatDate(date);
    expect(formatted).toMatch(/12\/25\/2023|2023-12-25/);
  });

  test('should get supported languages', () => {
    const languages = i18nService.getSupportedLanguages();
    expect(languages).toContain('en');
    expect(languages).toContain('es');
    expect(languages).toContain('fr');
    expect(languages.length).toBeGreaterThan(20);
  });
});