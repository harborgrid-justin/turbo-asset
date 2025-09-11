export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  description?: string;
  fieldType: CustomFieldType;
  entityType: string;
  category?: string;
  isRequired: boolean;
  isActive: boolean;
  isSearchable: boolean;
  isSortable: boolean;
  order: number;
  validation: ValidationRules;
  options?: FieldOptions;
  defaultValue?: any;
  helpText?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}

export type CustomFieldType = 
  | 'TEXT'
  | 'TEXTAREA'
  | 'RICH_TEXT'
  | 'NUMBER'
  | 'DECIMAL'
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'DATE'
  | 'DATETIME'
  | 'TIME'
  | 'BOOLEAN'
  | 'DROPDOWN'
  | 'MULTI_SELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'FILE'
  | 'IMAGE'
  | 'URL'
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'LOCATION'
  | 'JSON'
  | 'LOOKUP'
  | 'FORMULA'
  | 'RATING'
  | 'COLOR'
  | 'SIGNATURE'
  | 'BARCODE'
  | 'QR_CODE';

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  customValidator?: string;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  uniqueValue?: boolean;
  dependencies?: FieldDependency[];
}

export interface FieldDependency {
  field: string;
  condition: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN' | 'NOT_IN';
  value: any;
  action: 'SHOW' | 'HIDE' | 'REQUIRE' | 'DISABLE' | 'SET_VALUE' | 'SET_OPTIONS';
  targetValue?: any;
  targetOptions?: DropdownOption[];
}

export interface FieldOptions {
  dropdown?: DropdownOption[];
  multiSelect?: DropdownOption[];
  radio?: DropdownOption[];
  checkbox?: DropdownOption[];
  lookup?: LookupOptions;
  formula?: FormulaOptions;
  file?: FileOptions;
  address?: AddressOptions;
  location?: LocationOptions;
  rating?: RatingOptions;
  dateTime?: DateTimeOptions;
}

export interface DropdownOption {
  value: any;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  isActive?: boolean;
  order?: number;
}

export interface LookupOptions {
  entityType: string;
  displayField: string;
  valueField: string;
  filterField?: string;
  filterValue?: any;
  allowCreate?: boolean;
  searchable?: boolean;
  multiSelect?: boolean;
}

export interface FormulaOptions {
  expression: string;
  returnType: 'NUMBER' | 'TEXT' | 'DATE' | 'BOOLEAN';
  dependencies: string[];
  formatMask?: string;
  recalculateOnChange?: boolean;
}

export interface FileOptions {
  allowedTypes: string[];
  maxSize: number;
  maxFiles: number;
  allowPreview?: boolean;
  allowDownload?: boolean;
  requireApproval?: boolean;
  storageLocation?: 'LOCAL' | 'S3' | 'AZURE' | 'GCP';
}

export interface AddressOptions {
  format: 'FULL' | 'STREET_ONLY' | 'CITY_STATE' | 'COUNTRY_ONLY';
  requireValidation?: boolean;
  allowInternational?: boolean;
  defaultCountry?: string;
}

export interface LocationOptions {
  enableGeolocation?: boolean;
  mapProvider?: 'GOOGLE' | 'MAPBOX' | 'OSMAP';
  defaultZoom?: number;
  allowRadius?: boolean;
  showMarker?: boolean;
}

export interface RatingOptions {
  scale: number;
  style: 'STARS' | 'NUMBERS' | 'THUMBS' | 'FACES';
  allowHalf?: boolean;
  showLabels?: boolean;
  labels?: string[];
}

export interface DateTimeOptions {
  format: string;
  showTime?: boolean;
  timezone?: string;
  minDate?: Date;
  maxDate?: Date;
  disabledDays?: number[];
  workingDaysOnly?: boolean;
}

export interface CustomFieldValue {
  id: string;
  fieldId: string;
  entityId: string;
  entityType: string;
  value: any;
  displayValue?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string;
}

export interface CustomFieldGroup {
  id: string;
  name: string;
  label: string;
  description?: string;
  entityType: string;
  isCollapsible: boolean;
  isCollapsed: boolean;
  order: number;
  fields: CustomFieldDefinition[];
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldValidationResult {
  isValid: boolean;
  errors: FieldValidationError[];
  warnings: FieldValidationWarning[];
  value: any;
  displayValue: string;
}

export interface FieldValidationError {
  code: string;
  message: string;
  field: string;
  value: any;
  severity: 'ERROR' | 'WARNING';
}

export interface FieldValidationWarning {
  code: string;
  message: string;
  field: string;
  value: any;
  suggestion?: string;
}

export interface CustomFieldTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  entityType: string;
  fields: CustomFieldDefinition[];
  isSystemDefined: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldImport {
  id: string;
  fileName: string;
  entityType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  errors: CustomFieldImportError[];
  startedAt: Date;
  completedAt?: Date;
  createdById: string;
}

export interface CustomFieldImportError {
  row: number;
  field: string;
  value: any;
  error: string;
  suggestion?: string;
}

export interface CustomFieldExport {
  id: string;
  name: string;
  entityType: string;
  fields: string[];
  filters?: Record<string, any>;
  format: 'CSV' | 'EXCEL' | 'JSON' | 'XML';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
  createdById: string;
}

export interface CustomFieldAudit {
  id: string;
  fieldId: string;
  entityId: string;
  entityType: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValue?: any;
  newValue?: any;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CustomFieldAnalytics {
  fieldId: string;
  entityType: string;
  usage: {
    totalRecords: number;
    filledRecords: number;
    emptyRecords: number;
    fillRate: number;
  };
  valueDistribution: Array<{
    value: any;
    count: number;
    percentage: number;
  }>;
  trends: Array<{
    date: Date;
    fillRate: number;
    uniqueValues: number;
  }>;
  performance: {
    avgRenderTime: number;
    avgValidationTime: number;
    errorRate: number;
  };
}