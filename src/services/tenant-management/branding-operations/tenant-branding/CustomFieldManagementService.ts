/**
 * Custom Field Management Service
 * 
 * Handles dynamic custom field definitions, validation, storage, and retrieval
 * for tenant-specific data extensions across different entity types.
 */

import { EventEmitter } from 'events';
import { logger } from '../../../../../config/logger';
import { 
  CustomFieldDefinition, 
  CustomFieldType, 
  MultiTenantContext 
} from '../types/TenantBrandingTypes';
import { 
  CUSTOM_FIELDS, 
  EVENTS, 
  ERROR_CODES 
} from '../constants/TenantBrandingConstants';

interface CustomFieldValue {
  fieldId: string;
  entityId: string;
  entityType: string;
  value: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

interface CustomFieldGroup {
  name: string;
  label: string;
  displayOrder: number;
  isCollapsible: boolean;
  isCollapsed: boolean;
  fields: string[]; // Field IDs
}

interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export class CustomFieldManagementService extends EventEmitter {
  private fieldDefinitions: Map<string, CustomFieldDefinition> = new Map();
  private fieldValues: Map<string, Map<string, CustomFieldValue>> = new Map(); // entityId -> fieldId -> value
  private fieldGroups: Map<string, CustomFieldGroup[]> = new Map(); // organizationId -> groups
  private fieldsByEntity: Map<string, Set<string>> = new Map(); // entityType -> fieldIds

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for field management
   */
  private setupEventHandlers(): void {
    this.on(EVENTS.CUSTOM_FIELD_CREATED, this.handleFieldCreated.bind(this));
    this.on(EVENTS.CUSTOM_FIELD_UPDATED, this.handleFieldUpdated.bind(this));
  }

  /**
   * Create a new custom field definition
   */
  async createCustomField(
    organizationId: string,
    fieldDefinition: Omit<CustomFieldDefinition, 'id'>,
    createdBy: string
  ): Promise<CustomFieldDefinition> {
    try {
      // Validate field definition
      this.validateFieldDefinition(fieldDefinition);

      // Check if field name already exists for this entity type
      const existingField = this.findFieldByName(organizationId, fieldDefinition.entityType, fieldDefinition.name);
      if (existingField) {
        throw new Error(`Field with name '${fieldDefinition.name}' already exists for entity type '${fieldDefinition.entityType}'`);
      }

      const fieldId = this.generateFieldId(organizationId, fieldDefinition.entityType, fieldDefinition.name);

      const customField: CustomFieldDefinition = {
        ...fieldDefinition,
        id: fieldId,
      };

      // Store field definition
      this.fieldDefinitions.set(fieldId, customField);

      // Update entity type mapping
      this.addFieldToEntity(fieldDefinition.entityType, fieldId);

      // Add to default group if no group specified
      if (!customField.groupName) {
        this.addFieldToDefaultGroup(organizationId, fieldId);
      } else {
        this.addFieldToGroup(organizationId, customField.groupName, fieldId);
      }

      // Emit creation event
      this.emit(EVENTS.CUSTOM_FIELD_CREATED, {
        organizationId,
        fieldId,
        entityType: fieldDefinition.entityType,
        createdBy,
      });

      logger.info('Custom field created', {
        organizationId,
        fieldId,
        name: fieldDefinition.name,
        type: fieldDefinition.type,
        entityType: fieldDefinition.entityType,
        createdBy,
      });

      return customField;
    } catch (error: unknown) {
      logger.error('Failed to create custom field', {
        organizationId,
        fieldName: fieldDefinition.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update custom field definition
   */
  async updateCustomField(
    fieldId: string,
    updates: Partial<Omit<CustomFieldDefinition, 'id' | 'entityType'>>,
    updatedBy: string
  ): Promise<CustomFieldDefinition> {
    try {
      const existingField = this.fieldDefinitions.get(fieldId);
      if (!existingField) {
        throw new Error(`Custom field not found: ${fieldId}`);
      }

      // Validate updates
      if (updates.name && updates.name !== existingField.name) {
        const organizationId = this.extractOrganizationFromFieldId(fieldId);
        const duplicateField = this.findFieldByName(organizationId, existingField.entityType, updates.name);
        if (duplicateField && duplicateField.id !== fieldId) {
          throw new Error(`Field with name '${updates.name}' already exists`);
        }
      }

      // Create updated field definition
      const updatedField: CustomFieldDefinition = {
        ...existingField,
        ...updates,
      };

      // Validate updated definition
      this.validateFieldDefinition(updatedField);

      // Update storage
      this.fieldDefinitions.set(fieldId, updatedField);

      // Handle group changes
      if (updates.groupName && updates.groupName !== existingField.groupName) {
        const organizationId = this.extractOrganizationFromFieldId(fieldId);
        this.moveFieldBetweenGroups(organizationId, fieldId, existingField.groupName, updates.groupName);
      }

      // Emit update event
      this.emit(EVENTS.CUSTOM_FIELD_UPDATED, {
        fieldId,
        entityType: existingField.entityType,
        updatedBy,
        changes: Object.keys(updates),
      });

      logger.info('Custom field updated', {
        fieldId,
        name: updatedField.name,
        updatedBy,
        changes: Object.keys(updates),
      });

      return updatedField;
    } catch (error: unknown) {
      logger.error('Failed to update custom field', {
        fieldId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get custom field definition
   */
  async getCustomField(fieldId: string): Promise<CustomFieldDefinition | null> {
    return this.fieldDefinitions.get(fieldId) || null;
  }

  /**
   * Get all custom fields for an entity type
   */
  async getCustomFieldsForEntity(
    organizationId: string,
    entityType: string,
    options?: {
      activeOnly?: boolean;
      groupBy?: 'group' | 'none';
      sortBy?: 'displayOrder' | 'name' | 'createdAt';
    }
  ): Promise<CustomFieldDefinition[] | Record<string, CustomFieldDefinition[]>> {
    const entityFieldIds = this.fieldsByEntity.get(entityType) || new Set();
    const fields: CustomFieldDefinition[] = [];

    for (const fieldId of entityFieldIds) {
      if (fieldId.startsWith(`${organizationId}_`)) {
        const field = this.fieldDefinitions.get(fieldId);
        if (field && (!options?.activeOnly || field.isActive)) {
          fields.push(field);
        }
      }
    }

    // Sort fields
    if (options?.sortBy) {
      fields.sort(this.getFieldSorter(options.sortBy));
    }

    // Group fields if requested
    if (options?.groupBy === 'group') {
      return this.groupFieldsByGroup(fields);
    }

    return fields;
  }

  /**
   * Set custom field value
   */
  async setCustomFieldValue(
    context: MultiTenantContext,
    fieldId: string,
    entityId: string,
    value: any,
    setBy: string
  ): Promise<CustomFieldValue> {
    try {
      const fieldDefinition = this.fieldDefinitions.get(fieldId);
      if (!fieldDefinition) {
        throw new Error(`Custom field not found: ${fieldId}`);
      }

      if (!fieldDefinition.isActive) {
        throw new Error(`Custom field is not active: ${fieldId}`);
      }

      // Validate value
      const validationResult = this.validateFieldValue(fieldDefinition, value);
      if (!validationResult.isValid) {
        throw new Error(`Field validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get or create entity value map
      let entityValues = this.fieldValues.get(entityId);
      if (!entityValues) {
        entityValues = new Map();
        this.fieldValues.set(entityId, entityValues);
      }

      // Check if value already exists
      const existingValue = entityValues.get(fieldId);
      const now = new Date();

      const fieldValue: CustomFieldValue = {
        fieldId,
        entityId,
        entityType: fieldDefinition.entityType,
        value: this.normalizeFieldValue(fieldDefinition, value),
        createdAt: existingValue?.createdAt || now,
        updatedAt: now,
        createdBy: existingValue?.createdBy || setBy,
        updatedBy: existingValue ? setBy : undefined,
      };

      // Store value
      entityValues.set(fieldId, fieldValue);

      logger.debug('Custom field value set', {
        organizationId: context.organizationId,
        fieldId,
        entityId,
        entityType: fieldDefinition.entityType,
        setBy,
      });

      return fieldValue;
    } catch (error: unknown) {
      logger.error('Failed to set custom field value', {
        organizationId: context.organizationId,
        fieldId,
        entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get custom field value
   */
  async getCustomFieldValue(
    fieldId: string,
    entityId: string
  ): Promise<CustomFieldValue | null> {
    const entityValues = this.fieldValues.get(entityId);
    return entityValues?.get(fieldId) || null;
  }

  /**
   * Get all custom field values for an entity
   */
  async getCustomFieldValues(
    organizationId: string,
    entityId: string,
    entityType?: string
  ): Promise<Record<string, any>> {
    const entityValues = this.fieldValues.get(entityId);
    if (!entityValues) {
      return {};
    }

    const values: Record<string, any> = {};

    for (const [fieldId, fieldValue] of entityValues) {
      if (fieldId.startsWith(`${organizationId}_`)) {
        const fieldDefinition = this.fieldDefinitions.get(fieldId);
        if (fieldDefinition && (!entityType || fieldDefinition.entityType === entityType)) {
          values[fieldDefinition.name] = fieldValue.value;
        }
      }
    }

    return values;
  }

  /**
   * Delete custom field
   */
  async deleteCustomField(fieldId: string, deletedBy: string): Promise<boolean> {
    try {
      const fieldDefinition = this.fieldDefinitions.get(fieldId);
      if (!fieldDefinition) {
        return false;
      }

      // Remove from entity mapping
      const entityFields = this.fieldsByEntity.get(fieldDefinition.entityType);
      if (entityFields) {
        entityFields.delete(fieldId);
      }

      // Remove from groups
      const organizationId = this.extractOrganizationFromFieldId(fieldId);
      this.removeFieldFromGroups(organizationId, fieldId);

      // Remove field definition
      this.fieldDefinitions.delete(fieldId);

      // Remove all field values
      for (const entityValues of this.fieldValues.values()) {
        entityValues.delete(fieldId);
      }

      logger.info('Custom field deleted', {
        fieldId,
        name: fieldDefinition.name,
        entityType: fieldDefinition.entityType,
        deletedBy,
      });

      return true;
    } catch (error: unknown) {
      logger.error('Failed to delete custom field', {
        fieldId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create field group
   */
  async createFieldGroup(
    organizationId: string,
    groupDefinition: Omit<CustomFieldGroup, 'fields'>
  ): Promise<CustomFieldGroup> {
    try {
      const groups = this.fieldGroups.get(organizationId) || [];
      
      // Check for duplicate group name
      if (groups.some(g => g.name === groupDefinition.name)) {
        throw new Error(`Group with name '${groupDefinition.name}' already exists`);
      }

      const newGroup: CustomFieldGroup = {
        ...groupDefinition,
        fields: [],
      };

      groups.push(newGroup);
      this.fieldGroups.set(organizationId, groups);

      logger.info('Field group created', {
        organizationId,
        groupName: groupDefinition.name,
        label: groupDefinition.label,
      });

      return newGroup;
    } catch (error: unknown) {
      logger.error('Failed to create field group', {
        organizationId,
        groupName: groupDefinition.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get field groups for organization
   */
  async getFieldGroups(organizationId: string): Promise<CustomFieldGroup[]> {
    return this.fieldGroups.get(organizationId) || [];
  }

  /**
   * Validate field definition
   */
  private validateFieldDefinition(definition: Omit<CustomFieldDefinition, 'id'>): void {
    if (!definition.name || definition.name.length > CUSTOM_FIELDS.MAX_FIELD_NAME_LENGTH) {
      throw new Error('Field name is required and must not exceed maximum length');
    }

    if (!definition.label || definition.label.length > CUSTOM_FIELDS.MAX_FIELD_LABEL_LENGTH) {
      throw new Error('Field label is required and must not exceed maximum length');
    }

    if (!definition.type || !this.isValidFieldType(definition.type)) {
      throw new Error('Valid field type is required');
    }

    if (!definition.entityType) {
      throw new Error('Entity type is required');
    }

    // Validate field-specific constraints
    this.validateFieldTypeSpecificConstraints(definition);
  }

  /**
   * Validate field value against field definition
   */
  private validateFieldValue(
    fieldDefinition: CustomFieldDefinition,
    value: any
  ): FieldValidationResult {
    const errors: string[] = [];

    // Check required fields
    if (fieldDefinition.isRequired && (value === null || value === undefined || value === '')) {
      errors.push(`Field '${fieldDefinition.label}' is required`);
      return { isValid: false, errors };
    }

    // Skip validation if value is empty and not required
    if (value === null || value === undefined || value === '') {
      return { isValid: true, errors: [] };
    }

    // Type-specific validation
    switch (fieldDefinition.type) {
      case 'NUMBER':
        if (isNaN(Number(value))) {
          errors.push('Value must be a valid number');
        } else {
          const numValue = Number(value);
          if (fieldDefinition.validation?.min !== undefined && numValue < fieldDefinition.validation.min) {
            errors.push(`Value must be at least ${fieldDefinition.validation.min}`);
          }
          if (fieldDefinition.validation?.max !== undefined && numValue > fieldDefinition.validation.max) {
            errors.push(`Value must be at most ${fieldDefinition.validation.max}`);
          }
        }
        break;

      case 'TEXT':
      case 'TEXTAREA':
        if (typeof value !== 'string') {
          errors.push('Value must be a string');
        } else {
          const maxLength = fieldDefinition.type === 'TEXT' 
            ? CUSTOM_FIELDS.TEXT_FIELD_MAX_LENGTH 
            : CUSTOM_FIELDS.TEXTAREA_MAX_LENGTH;
          if (value.length > maxLength) {
            errors.push(`Value must not exceed ${maxLength} characters`);
          }
          if (fieldDefinition.validation?.pattern) {
            const regex = new RegExp(fieldDefinition.validation.pattern);
            if (!regex.test(value)) {
              errors.push('Value does not match required pattern');
            }
          }
        }
        break;

      case 'EMAIL':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          errors.push('Value must be a valid email address');
        }
        break;

      case 'URL':
        if (typeof value !== 'string' || !this.isValidUrl(value)) {
          errors.push('Value must be a valid URL');
        }
        break;

      case 'DATE':
        if (!this.isValidDate(value)) {
          errors.push('Value must be a valid date');
        }
        break;

      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          errors.push('Value must be a boolean');
        }
        break;

      case 'SELECT':
      case 'MULTISELECT':
        if (!fieldDefinition.validation?.options) {
          errors.push('Field configuration error: options not defined');
        } else {
          const options = fieldDefinition.validation.options;
          if (fieldDefinition.type === 'SELECT') {
            if (!options.includes(value)) {
              errors.push('Value must be one of the allowed options');
            }
          } else {
            if (!Array.isArray(value) || !value.every(v => options.includes(v))) {
              errors.push('All values must be from the allowed options');
            }
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Normalize field value for storage
   */
  private normalizeFieldValue(fieldDefinition: CustomFieldDefinition, value: any): any {
    switch (fieldDefinition.type) {
      case 'NUMBER':
        return Number(value);
      case 'BOOLEAN':
        return Boolean(value);
      case 'DATE':
        return new Date(value);
      case 'MULTISELECT':
        return Array.isArray(value) ? value : [value];
      default:
        return value;
    }
  }

  /**
   * Generate unique field ID
   */
  private generateFieldId(organizationId: string, entityType: string, fieldName: string): string {
    const sanitizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${organizationId}_${entityType}_${sanitizedName}_${Date.now()}`;
  }

  /**
   * Extract organization ID from field ID
   */
  private extractOrganizationFromFieldId(fieldId: string): string {
    return fieldId.split('_')[0];
  }

  /**
   * Find field by name within organization and entity type
   */
  private findFieldByName(
    organizationId: string,
    entityType: string,
    name: string
  ): CustomFieldDefinition | null {
    for (const field of this.fieldDefinitions.values()) {
      if (field.name === name && 
          field.entityType === entityType && 
          field.id.startsWith(`${organizationId}_`)) {
        return field;
      }
    }
    return null;
  }

  /**
   * Add field to entity type mapping
   */
  private addFieldToEntity(entityType: string, fieldId: string): void {
    let entityFields = this.fieldsByEntity.get(entityType);
    if (!entityFields) {
      entityFields = new Set();
      this.fieldsByEntity.set(entityType, entityFields);
    }
    entityFields.add(fieldId);
  }

  /**
   * Add field to default group
   */
  private addFieldToDefaultGroup(organizationId: string, fieldId: string): void {
    const groups = this.fieldGroups.get(organizationId) || [];
    let defaultGroup = groups.find(g => g.name === 'default');
    
    if (!defaultGroup) {
      defaultGroup = {
        name: 'default',
        label: 'Custom Fields',
        displayOrder: 0,
        isCollapsible: true,
        isCollapsed: false,
        fields: [],
      };
      groups.push(defaultGroup);
    }
    
    defaultGroup.fields.push(fieldId);
    this.fieldGroups.set(organizationId, groups);
  }

  /**
   * Add field to specific group
   */
  private addFieldToGroup(organizationId: string, groupName: string, fieldId: string): void {
    const groups = this.fieldGroups.get(organizationId) || [];
    let group = groups.find(g => g.name === groupName);
    
    if (!group) {
      group = {
        name: groupName,
        label: groupName,
        displayOrder: groups.length,
        isCollapsible: true,
        isCollapsed: false,
        fields: [],
      };
      groups.push(group);
    }
    
    group.fields.push(fieldId);
    this.fieldGroups.set(organizationId, groups);
  }

  /**
   * Move field between groups
   */
  private moveFieldBetweenGroups(
    organizationId: string,
    fieldId: string,
    fromGroup?: string,
    toGroup?: string
  ): void {
    const groups = this.fieldGroups.get(organizationId) || [];
    
    // Remove from old group
    if (fromGroup) {
      const oldGroup = groups.find(g => g.name === fromGroup);
      if (oldGroup) {
        const index = oldGroup.fields.indexOf(fieldId);
        if (index !== -1) {
          oldGroup.fields.splice(index, 1);
        }
      }
    }
    
    // Add to new group
    if (toGroup) {
      this.addFieldToGroup(organizationId, toGroup, fieldId);
    }
  }

  /**
   * Remove field from all groups
   */
  private removeFieldFromGroups(organizationId: string, fieldId: string): void {
    const groups = this.fieldGroups.get(organizationId) || [];
    
    for (const group of groups) {
      const index = group.fields.indexOf(fieldId);
      if (index !== -1) {
        group.fields.splice(index, 1);
      }
    }
  }

  /**
   * Group fields by their groups
   */
  private groupFieldsByGroup(fields: CustomFieldDefinition[]): Record<string, CustomFieldDefinition[]> {
    const grouped: Record<string, CustomFieldDefinition[]> = {};
    
    for (const field of fields) {
      const groupName = field.groupName || 'default';
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(field);
    }
    
    return grouped;
  }

  /**
   * Get field sorter function
   */
  private getFieldSorter(sortBy: 'displayOrder' | 'name' | 'createdAt') {
    switch (sortBy) {
      case 'displayOrder':
        return (a: CustomFieldDefinition, b: CustomFieldDefinition) => 
          (a.displayOrder || 0) - (b.displayOrder || 0);
      case 'name':
        return (a: CustomFieldDefinition, b: CustomFieldDefinition) => 
          a.name.localeCompare(b.name);
      default:
        return (a: CustomFieldDefinition, b: CustomFieldDefinition) => 
          a.name.localeCompare(b.name); // Default to name sort
    }
  }

  /**
   * Validate field type specific constraints
   */
  private validateFieldTypeSpecificConstraints(definition: Omit<CustomFieldDefinition, 'id'>): void {
    if (definition.type === 'SELECT' || definition.type === 'MULTISELECT') {
      if (!definition.validation?.options || definition.validation.options.length === 0) {
        throw new Error('Select fields must have at least one option');
      }
      if (definition.validation.options.length > CUSTOM_FIELDS.MAX_OPTIONS_COUNT) {
        throw new Error('Too many options for select field');
      }
    }
  }

  /**
   * Check if field type is valid
   */
  private isValidFieldType(type: string): type is CustomFieldType {
    const validTypes: CustomFieldType[] = [
      'TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 
      'TEXTAREA', 'EMAIL', 'URL', 'PHONE', 'FILE'
    ];
    return validTypes.includes(type as CustomFieldType);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate date
   */
  private isValidDate(date: any): boolean {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  /**
   * Handle field created event
   */
  private handleFieldCreated(eventData: any): void {
    logger.debug('Custom field created event handled', eventData);
  }

  /**
   * Handle field updated event
   */
  private handleFieldUpdated(eventData: any): void {
    logger.debug('Custom field updated event handled', eventData);
  }
}