/**
 * Tenant Branding Types - Comprehensive type definitions for tenant management domain
 * 
 * This file provides all type definitions for white-label configurations, branding,
 * internationalization, custom domains, and tenant-specific features.
 */

export interface BrandingConfiguration {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily?: string;
  customCSS?: string;
  customJS?: string;
  brandName?: string;
  brandDescription?: string;
  headerStyle?: 'minimal' | 'standard' | 'branded';
  footerContent?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
}

export interface ThemeConfiguration {
  name: string;
  description?: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    neutral?: string;
    background?: string;
    surface?: string;
  };
  typography: {
    fontFamily: string;
    headingFontFamily?: string;
    fontSize: string;
    lineHeight: string;
    headingSizes?: {
      h1: string;
      h2: string;
      h3: string;
      h4: string;
      h5: string;
      h6: string;
    };
  };
  layout: {
    sidebar: 'left' | 'right' | 'hidden';
    navigation: 'top' | 'sidebar' | 'both';
    contentWidth: 'full' | 'contained' | 'narrow';
    borderRadius?: string;
    spacing?: string;
  };
  components: Record<string, any>;
  darkModeSupport?: boolean;
  customVariables?: Record<string, string>;
}

export interface CustomDomain {
  domain: string;
  subdomain?: string;
  certificateId?: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationMethod?: 'TXT' | 'CNAME' | 'FILE';
  sslEnabled?: boolean;
  redirectWww?: boolean;
  dnsRecords: Array<{
    type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'SRV';
    name: string;
    value: string;
    ttl?: number;
    priority?: number;
  }>;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  verifiedAt?: Date;
  expiresAt?: Date;
}

export interface LocalizationConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
  translations: Record<string, Record<string, string>>;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  currencySymbol?: string;
  currencyPlacement?: 'before' | 'after';
  numberFormat: 'US' | 'EU' | 'ASIA' | 'CUSTOM';
  thousandsSeparator?: string;
  decimalSeparator?: string;
  rtlSupported: boolean;
  fallbackLanguage?: string;
  autoDetectLanguage?: boolean;
  timezone?: string;
  weekStartsOn?: 'sunday' | 'monday';
  phoneFormat?: string;
  addressFormat?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'WELCOME' | 'NOTIFICATION' | 'REMINDER' | 'REPORT' | 'ALERT' | 'CUSTOM' | 'RESET_PASSWORD' | 'VERIFICATION' | 'INVITATION';
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  isActive: boolean;
  category?: string;
  tags?: string[];
  version: number;
  createdBy?: string;
  lastModifiedBy?: string;
  previewUrl?: string;
  testRecipients?: string[];
  schedulingOptions?: {
    timezone?: string;
    sendAt?: string;
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  };
}

export interface AccessConfiguration {
  allowedDomains?: string[];
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  geoRestrictions?: {
    allowedCountries?: string[];
    blockedCountries?: string[];
  };
  ssoEnabled: boolean;
  ssoProvider?: 'SAML' | 'OAUTH2' | 'LDAP' | 'OPENID';
  ssoConfiguration?: {
    entityId?: string;
    ssoUrl?: string;
    certificateFingerprint?: string;
    attributeMapping?: Record<string, string>;
    groupMapping?: Record<string, string[]>;
  };
  multiFactorRequired: boolean;
  allowedMfaMethods?: ('totp' | 'sms' | 'email' | 'push' | 'hardware')[];
  sessionTimeout: number;
  maxConcurrentSessions?: number;
  passwordPolicy: {
    minLength: number;
    maxLength?: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    maxAge: number;
    preventReuse?: number;
    lockoutThreshold?: number;
    lockoutDuration?: number;
  };
  apiAccess?: {
    enabled: boolean;
    rateLimit?: number;
    allowedOrigins?: string[];
    requireApiKey?: boolean;
  };
}

export interface FeatureFlags {
  [feature: string]: {
    enabled: boolean;
    rolloutPercentage?: number;
    startDate?: Date;
    endDate?: Date;
    allowedRoles?: string[];
    allowedUsers?: string[];
    conditions?: Record<string, any>;
    metadata?: Record<string, any>;
  };
}

export interface SubsidiaryConfiguration {
  name: string;
  displayName: string;
  description?: string;
  parentOrganizationId: string;
  branding: BrandingConfiguration;
  theme: ThemeConfiguration;
  customDomain?: CustomDomain;
  localization: LocalizationConfig;
  access: AccessConfiguration;
  features: FeatureFlags;
  emailTemplates: EmailTemplate[];
  customizations: Record<string, any>;
  isActive: boolean;
  timezone?: string;
  businessHours?: {
    [day: string]: {
      start: string;
      end: string;
      isOpen: boolean;
    };
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  billing?: {
    plan?: string;
    limits?: Record<string, number>;
    usageTracking?: boolean;
  };
}

export interface TenantSettings {
  organizationId: string;
  tenantId: string;
  name: string;
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: Date;
  updatedAt: Date;
  configuration: {
    branding: BrandingConfiguration;
    theme: ThemeConfiguration;
    localization: LocalizationConfig;
    access: AccessConfiguration;
    features: FeatureFlags;
  };
  customDomains: CustomDomain[];
  emailTemplates: EmailTemplate[];
  subsidiaries?: SubsidiaryConfiguration[];
  metadata?: Record<string, any>;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT' | 'TEXTAREA' | 'EMAIL' | 'URL' | 'PHONE' | 'FILE';
  entityType: string; // e.g., 'asset', 'property', 'tenant'
  isRequired: boolean;
  isActive: boolean;
  isSearchable?: boolean;
  isSortable?: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
    fileTypes?: string[];
    maxFileSize?: number;
  };
  displayOrder?: number;
  groupName?: string;
  helpText?: string;
  placeholder?: string;
  visibility?: {
    roles?: string[];
    conditions?: Record<string, any>;
  };
  formatting?: {
    prefix?: string;
    suffix?: string;
    thousandsSeparator?: boolean;
    decimalPlaces?: number;
  };
}

export interface MultiTenantContext {
  tenantId: string;
  organizationId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  branding?: BrandingConfiguration;
  localization?: LocalizationConfig;
  customDomain?: string;
  features?: FeatureFlags;
}

export interface BrandingAnalytics {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: {
    pageViews: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    bounceRate: number;
    topPages: Array<{
      path: string;
      views: number;
    }>;
    deviceTypes: Record<string, number>;
    browsers: Record<string, number>;
    countries: Record<string, number>;
    userEngagement: {
      logins: number;
      activeUsers: number;
      featureUsage: Record<string, number>;
    };
  };
  customEventTracking?: Array<{
    event: string;
    count: number;
    metadata?: Record<string, any>;
  }>;
}

export interface WhiteLabelConfiguration {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  brandingScope: 'GLOBAL' | 'REGIONAL' | 'SUBSIDIARY' | 'DEPARTMENT' | 'PROJECT';
  branding: BrandingConfiguration;
  theme: ThemeConfiguration;
  customDomain?: CustomDomain;
  localization: LocalizationConfig;
  access: AccessConfiguration;
  features: FeatureFlags;
  emailTemplates: EmailTemplate[];
  customizations: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy?: string;
  version: number;
  publishedVersion?: number;
  isDraft: boolean;
  expiresAt?: Date;
  analytics?: BrandingAnalytics;
}

export interface PWAManifest {
  name: string;
  short_name: string;
  description?: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  theme_color: string;
  background_color: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation?: 'portrait' | 'landscape' | 'any';
  start_url: string;
  scope?: string;
  categories?: string[];
  screenshots?: Array<{
    src: string;
    sizes: string;
    type: string;
    label?: string;
  }>;
}

export type BrandingScope = 'GLOBAL' | 'REGIONAL' | 'SUBSIDIARY' | 'DEPARTMENT' | 'PROJECT';
export type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT' | 'TEXTAREA' | 'EMAIL' | 'URL' | 'PHONE' | 'FILE';
export type DomainVerificationMethod = 'TXT' | 'CNAME' | 'FILE';
export type DomainStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';