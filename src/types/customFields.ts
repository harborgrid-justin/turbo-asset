export type CustomFieldType = 
  | 'TEXT' 
  | 'NUMBER' 
  | 'DATE' 
  | 'BOOLEAN' 
  | 'SELECT' 
  | 'MULTI_SELECT' 
  | 'EMAIL' 
  | 'URL' 
  | 'PHONE' 
  | 'CURRENCY' 
  | 'PERCENTAGE' 
  | 'RICH_TEXT';

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'regex' | 'custom';
  value?: any;
  message: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  fieldType: CustomFieldType;
  entityType: string;
  isRequired: boolean;
  isUnique: boolean;
  defaultValue?: string;
  validationRules?: ValidationRule[];
  options?: string[];
  dependencies?: FieldDependency[];
  displayOrder: number;
  isActive: boolean;
}

export interface FieldDependency {
  fieldId: string;
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'require' | 'set_value';
  targetValue?: any;
}

export interface CustomFieldValue {
  fieldDefinitionId: string;
  value: any;
  entityId: string;
  entityType: string;
}