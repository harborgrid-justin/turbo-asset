import { prisma } from '../config/database';
import { logger } from '@/config/logger';
import { CustomFieldDefinition, CustomFieldValue, ValidationRule, FieldDependency } from '../types/customFields';
import Joi from 'joi';

export class CustomFieldService {
  /**
   * Create a custom field definition
   */
  async createFieldDefinition(
    organizationId: string,
    fieldDefinition: Omit<CustomFieldDefinition, 'id'>
  ): Promise<string> {
    try {
      const result = await prisma.customFieldDefinition.create({
        data: {
          name: fieldDefinition.name,
          fieldType: fieldDefinition.fieldType,
          entityType: fieldDefinition.entityType,
          isRequired: fieldDefinition.isRequired,
          isUnique: fieldDefinition.isUnique,
          defaultValue: fieldDefinition.defaultValue,
          validationRules: fieldDefinition.validationRules,
          options: fieldDefinition.options,
          dependencies: fieldDefinition.dependencies,
          displayOrder: fieldDefinition.displayOrder,
          isActive: fieldDefinition.isActive,
          organizationId,
        },
      });

      logger.info('Custom field definition created', { 
        id: result.id, 
        name: fieldDefinition.name,
        entityType: fieldDefinition.entityType 
      });

      return result.id;
    } catch (error: unknown) {
      logger.error('Failed to create custom field definition', error);
      throw error;
    }
  }

  /**
   * Get custom field definitions for an entity type
   */
  async getFieldDefinitions(
    organizationId: string,
    entityType: string,
    includeInactive: boolean = false
  ): Promise<CustomFieldDefinition[]> {
    try {
      const definitions = await prisma.customFieldDefinition.findMany({
        where: {
          organizationId,
          entityType,
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: {
          displayOrder: 'asc',
        },
      });

      return definitions.map((def: any) => ({
        id: def.id,
        name: def.name,
        fieldType: def.fieldType,
        entityType: def.entityType,
        isRequired: def.isRequired,
        isUnique: def.isUnique,
        defaultValue: def.defaultValue,
        validationRules: def.validationRules as ValidationRule[],
        options: def.options as string[],
        dependencies: def.dependencies as FieldDependency[],
        displayOrder: def.displayOrder,
        isActive: def.isActive,
      }));
    } catch (error: unknown) {
      logger.error('Failed to get custom field definitions', error);
      throw error;
    }
  }

  /**
   * Set custom field value
   */
  async setFieldValue(
    fieldDefinitionId: string,
    entityId: string,
    entityType: string,
    value: any
  ): Promise<void> {
    try {
      // Get field definition
      const fieldDef = await prisma.customFieldDefinition.findUnique({
        where: { id: fieldDefinitionId },
      });

      if (!fieldDef) {
        throw new Error('Custom field definition not found');
      }

      // Validate value
      await this.validateFieldValue(fieldDef, value);

      // Check for existing value
      const existingValue = await prisma.customFieldValue.findFirst({
        where: {
          fieldDefinitionId,
          entityId,
          entityType,
        },
      });

      const stringValue = this.serializeValue(value, fieldDef.fieldType);

      if (existingValue) {
        await prisma.customFieldValue.update({
          where: { id: existingValue.id },
          data: { value: stringValue },
        });
      } else {
        await prisma.customFieldValue.create({
          data: {
            fieldDefinitionId,
            entityId,
            entityType,
            value: stringValue,
          },
        });
      }

      logger.info('Custom field value set', { 
        fieldDefinitionId, 
        entityId, 
        entityType 
      });
    } catch (error: unknown) {
      logger.error('Failed to set custom field value', error);
      throw error;
    }
  }

  /**
   * Get custom field values for an entity
   */
  async getFieldValues(
    entityId: string,
    entityType: string,
    organizationId: string
  ): Promise<Record<string, any>> {
    try {
      const values = await prisma.customFieldValue.findMany({
        where: {
          entityId,
          entityType,
        },
        include: {
          fieldDefinition: {
            where: {
              organizationId,
              isActive: true,
            },
          },
        },
      });

      const result: Record<string, any> = {};

      for (const value of values) {
        if (value.fieldDefinition) {
          const fieldType = value.fieldDefinition.fieldType as any;
          result[value.fieldDefinition.name] = this.deserializeValue(value.value, fieldType);
        }
      }

      return result;
    } catch (error: unknown) {
      logger.error('Failed to get custom field values', error);
      throw error;
    }
  }

  /**
   * Validate all custom fields for an entity
   */
  async validateEntityFields(
    organizationId: string,
    entityType: string,
    values: Record<string, any>
  ): Promise<{ isValid: boolean; errors: Record<string, string> }> {
    try {
      const fieldDefinitions = await this.getFieldDefinitions(organizationId, entityType);
      const errors: Record<string, string> = {};

      for (const fieldDef of fieldDefinitions) {
        const value = values[fieldDef.name];

        // Check required fields
        if (fieldDef.isRequired && (value === undefined || value === null || value === '')) {
          errors[fieldDef.name] = 'This field is required';
          continue;
        }

        // Validate field value if provided
        if (value !== undefined && value !== null && value !== '') {
          try {
            await this.validateFieldValue(fieldDef, value);
          } catch (error: unknown) {
            errors[fieldDef.name] = error instanceof Error ? (error).message : 'Invalid value';
          }
        }

        // Check field dependencies
        if (fieldDef.dependencies) {
          for (const dependency of fieldDef.dependencies) {
            const dependentValue = values[this.getFieldNameById(fieldDefinitions, dependency.fieldId)];
            if (!this.evaluateDependency(dependency, dependentValue, value)) {
              errors[fieldDef.name] = `This field depends on ${dependency.fieldId}`;
            }
          }
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
      };
    } catch (error: unknown) {
      logger.error('Failed to validate entity fields', error);
      throw error;
    }
  }

  /**
   * Validate a single field value
   */
  private async validateFieldValue(fieldDef: any, value: any): Promise<void> {
    // Type-specific validation
    let schema = this.getJoiSchema(fieldDef.fieldType, fieldDef.options);

    // Apply custom validation rules
    if (fieldDef.validationRules) {
      for (const rule of fieldDef.validationRules as ValidationRule[]) {
        schema = this.applyValidationRule(schema, rule);
      }
    }

    const { error } = schema.validate(value);
    if (error) {
      throw new Error(error.details[0].message);
    }

    // Check uniqueness if required
    if (fieldDef.isUnique) {
      const existing = await prisma.customFieldValue.findFirst({
        where: {
          fieldDefinitionId: fieldDef.id,
          value: this.serializeValue(value, fieldDef.fieldType),
        },
      });

      if (existing) {
        throw new Error('This value must be unique');
      }
    }
  }

  /**
   * Get Joi schema based on field type
   */
  private getJoiSchema(fieldType: string, options?: string[]): Joi.Schema {
    switch (fieldType) {
      case 'TEXT':
        return Joi.string();
      case 'RICH_TEXT':
        return Joi.string();
      case 'NUMBER':
        return Joi.number();
      case 'DATE':
        return Joi.date();
      case 'BOOLEAN':
        return Joi.boolean();
      case 'EMAIL':
        return Joi.string().email();
      case 'URL':
        return Joi.string().uri();
      case 'PHONE':
        return Joi.string().pattern(/^\+?[\d\s-()]+$/);
      case 'CURRENCY':
        return Joi.number().min(0);
      case 'PERCENTAGE':
        return Joi.number().min(0).max(100);
      case 'SELECT':
        return options ? Joi.string().valid(...options) : Joi.string();
      case 'MULTI_SELECT':
        return options ? Joi.array().items(Joi.string().valid(...options)) : Joi.array().items(Joi.string());
      default:
        return Joi.any();
    }
  }

  /**
   * Apply validation rule to Joi schema
   */
  private applyValidationRule(schema: Joi.Schema, rule: ValidationRule): Joi.Schema {
    switch (rule.type) {
      case 'min':
        if ('min' in schema) {
          return (schema as any).min(rule.value);
        }
        return schema;
      case 'max':
        if ('max' in schema) {
          return (schema as any).max(rule.value);
        }
        return schema;
      case 'regex':
        return (schema as Joi.StringSchema).pattern(new RegExp(rule.value));
      default:
        return schema;
    }
  }

  /**
   * Serialize value for storage
   */
  private serializeValue(value: any, fieldType: string): string {
    switch (fieldType) {
      case 'BOOLEAN':
        return String(Boolean(value));
      case 'NUMBER':
      case 'CURRENCY':
      case 'PERCENTAGE':
        return String(Number(value));
      case 'DATE':
        return value instanceof Date ? value.toISOString() : String(value);
      case 'MULTI_SELECT':
        return Array.isArray(value) ? JSON.stringify(value) : String(value);
      default:
        return String(value);
    }
  }

  /**
   * Deserialize value from storage
   */
  private deserializeValue(value: string, fieldType: string): any {
    switch (fieldType) {
      case 'BOOLEAN':
        return value === 'true';
      case 'NUMBER':
      case 'CURRENCY':
      case 'PERCENTAGE':
        return Number(value);
      case 'DATE':
        return new Date(value);
      case 'MULTI_SELECT':
        try {
          return JSON.parse(value);
        } catch {
          return [value];
        }
      default:
        return value;
    }
  }

  /**
   * Get field name by ID
   */
  private getFieldNameById(fieldDefinitions: CustomFieldDefinition[], fieldId: string): string {
    const field = fieldDefinitions.find(f => f.id === fieldId);
    return field ? field.name : fieldId;
  }

  /**
   * Evaluate field dependency
   */
  /**
   * Evaluate dependency condition
   */
  private evaluateDependency(dependency: FieldDependency, dependentValue: any, currentValue: any): boolean {
    switch (dependency.condition) {
      case 'equals':
        return dependentValue === dependency.value;
      case 'not_equals':
        return dependentValue !== dependency.value;
      case 'contains':
        return String(dependentValue).includes(String(dependency.value));
      case 'greater_than':
        return Number(dependentValue) > Number(dependency.value);
      case 'less_than':
        return Number(dependentValue) < Number(dependency.value);
      default:
        return true;
    }
  }

  /**
   * Update a custom field definition
   */
  async updateFieldDefinition(
    organizationId: string,
    fieldId: string,
    updates: Partial<Omit<CustomFieldDefinition, 'id' | 'organizationId'>>
  ): Promise<void> {
    try {
      await prisma.customFieldDefinition.updateMany({
        where: {
          id: fieldId,
          organizationId,
        },
        data: {
          ...updates,
          validationRules: updates.validationRules,
          options: updates.options,
          dependencies: updates.dependencies,
        },
      });

      logger.info('Custom field definition updated', { 
        fieldId, 
        organizationId 
      });
    } catch (error: unknown) {
      logger.error('Failed to update custom field definition', error);
      throw error;
    }
  }

  /**
   * Delete a custom field definition
   */
  async deleteFieldDefinition(organizationId: string, fieldId: string): Promise<void> {
    try {
      // Check if field has values before deleting
      const valueCount = await prisma.customFieldValue.count({
        where: { fieldDefinitionId: fieldId },
      });

      if (valueCount > 0) {
        throw new Error('Cannot delete field definition with existing values. Consider deactivating instead.');
      }

      await prisma.customFieldDefinition.deleteMany({
        where: {
          id: fieldId,
          organizationId,
        },
      });

      logger.info('Custom field definition deleted', { 
        fieldId, 
        organizationId 
      });
    } catch (error: unknown) {
      logger.error('Failed to delete custom field definition', error);
      throw error;
    }
  }

  /**
   * Copy field definition to another entity type
   */
  async copyFieldDefinition(
    organizationId: string,
    sourceFieldId: string,
    targetEntityType: string,
    newName?: string
  ): Promise<string> {
    try {
      const sourceField = await prisma.customFieldDefinition.findFirst({
        where: {
          id: sourceFieldId,
          organizationId,
        },
      });

      if (!sourceField) {
        throw new Error('Source field definition not found');
      }

      const copiedField = await prisma.customFieldDefinition.create({
        data: {
          name: newName || `${sourceField.name} (Copy)`,
          fieldType: sourceField.fieldType,
          entityType: targetEntityType,
          isRequired: sourceField.isRequired,
          isUnique: sourceField.isUnique,
          defaultValue: sourceField.defaultValue,
          validationRules: sourceField.validationRules,
          options: sourceField.options,
          dependencies: sourceField.dependencies,
          displayOrder: sourceField.displayOrder,
          isActive: sourceField.isActive,
          organizationId,
        },
      });

      logger.info('Custom field definition copied', { 
        sourceFieldId,
        newFieldId: copiedField.id,
        targetEntityType 
      });

      return copiedField.id;
    } catch (error: unknown) {
      logger.error('Failed to copy custom field definition', error);
      throw error;
    }
  }

  /**
   * Bulk update field values for multiple entities
   */
  async bulkUpdateFieldValues(
    organizationId: string,
    entityType: string,
    entityIds: string[],
    fieldValues: Record<string, any>
  ): Promise<{ successCount: number; errorCount: number; errors: any[] }> {
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    try {
      for (const entityId of entityIds) {
        try {
          await this.setFieldValue(organizationId, entityId, entityType, fieldValues);
          successCount++;
        } catch (error: unknown) {
          errorCount++;
          errors.push({
            entityId,
            error: (error as Error).message,
          });
        }
      }

      logger.info('Bulk field values update completed', { 
        organizationId,
        entityType,
        successCount,
        errorCount 
      });

      return { successCount, errorCount, errors };
    } catch (error: unknown) {
      logger.error('Failed to bulk update field values', error);
      throw error;
    }
  }

  /**
   * Get field usage statistics
   */
  async getFieldUsageStats(organizationId: string, fieldId: string): Promise<{
    totalValues: number;
    uniqueValues: number;
    nullValues: number;
    mostCommonValues: Array<{ value: any; count: number }>;
    usageByEntity: Record<string, number>;
  }> {
    try {
      const field = await prisma.customFieldDefinition.findFirst({
        where: { id: fieldId, organizationId },
      });

      if (!field) {
        throw new Error('Field definition not found');
      }

      const values = await prisma.customFieldValue.findMany({
        where: { fieldDefinitionId: fieldId },
        include: {
          fieldDefinition: {
            select: { entityType: true },
          },
        },
      });

      const totalValues = values.length;
      const uniqueValues = new Set(values.map(v => v.value)).size;
      const nullValues = values.filter(v => v.value === null || v.value === '').length;

      // Calculate most common values
      const valueCounts = values.reduce((acc, v) => {
        const val = v.value || 'null';
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostCommonValues = Object.entries(valueCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([value, count]) => ({ value, count: count as number }));

      // Usage by entity
      const usageByEntity = values.reduce((acc, v) => {
        acc[v.entityId] = (acc[v.entityId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalValues,
        uniqueValues,
        nullValues,
        mostCommonValues,
        usageByEntity,
      };
    } catch (error: unknown) {
      logger.error('Failed to get field usage stats', error);
      throw error;
    }
  }

  /**
   * Export field definitions and values
   */
  async exportFields(
    organizationId: string,
    entityType: string,
    format: string
  ): Promise<any> {
    try {
      const definitions = await this.getFieldDefinitions(organizationId, entityType);
      const values = await prisma.customFieldValue.findMany({
        where: {
          entityType,
          fieldDefinition: {
            organizationId,
          },
        },
        include: {
          fieldDefinition: {
            select: { name: true },
          },
        },
      });

      const exportData = {
        definitions,
        values: values.map(v => ({
          entityId: v.entityId,
          fieldName: v.fieldDefinition.name,
          value: v.value,
        })),
        exportedAt: new Date().toISOString(),
        entityType,
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }

      return exportData;
    } catch (error: unknown) {
      logger.error('Failed to export fields', error);
      throw error;
    }
  }

  /**
   * Import field definitions and values
   */
  async importFields(
    organizationId: string,
    data: any,
    format: string,
    mergeMode: 'skip' | 'overwrite' | 'merge'
  ): Promise<{ imported: number; skipped: number; errors: number }> {
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const importData = format === 'csv' ? this.parseCSV(data) : data;

      // Import definitions
      if (importData.definitions) {
        for (const def of importData.definitions) {
          try {
            const existing = await prisma.customFieldDefinition.findFirst({
              where: {
                name: def.name,
                entityType: def.entityType,
                organizationId,
              },
            });

            if (existing && mergeMode === 'skip') {
              skipped++;
              continue;
            }

            if (existing && mergeMode === 'overwrite') {
              await this.updateFieldDefinition(organizationId, existing.id, def);
            } else {
              await this.createFieldDefinition(organizationId, def);
            }

            imported++;
          } catch (error: unknown) {
            errors++;
            logger.error('Failed to import field definition', { name: def.name, error });
          }
        }
      }

      // Import values
      if (importData.values) {
        for (const val of importData.values) {
          try {
            const definition = await prisma.customFieldDefinition.findFirst({
              where: {
                name: val.fieldName,
                organizationId,
              },
            });

            if (definition) {
              await prisma.customFieldValue.upsert({
                where: {
                  fieldDefinitionId_entityId_entityType: {
                    fieldDefinitionId: definition.id,
                    entityId: val.entityId,
                    entityType: definition.entityType,
                  },
                },
                create: {
                  fieldDefinitionId: definition.id,
                  entityId: val.entityId,
                  entityType: definition.entityType,
                  value: val.value,
                },
                update: {
                  value: val.value,
                },
              });
            }
          } catch (error: unknown) {
            errors++;
            logger.error('Failed to import field value', { entityId: val.entityId, error });
          }
        }
      }

      logger.info('Field import completed', { 
        organizationId,
        imported,
        skipped,
        errors 
      });

      return { imported, skipped, errors };
    } catch (error: unknown) {
      logger.error('Failed to import fields', error);
      throw error;
    }
  }

  /**
   * Get field templates (common field definitions)
   */
  async getFieldTemplates(category?: string): Promise<any[]> {
    try {
      // This would typically come from a database or configuration
      // For now, return some common templates
      const templates = [
        {
          id: 'contact-template',
          name: 'Contact Information',
          category: 'general',
          description: 'Common contact fields',
          fields: [
            {
              name: 'Phone Number',
              fieldType: 'PHONE',
              isRequired: true,
              validationRules: [
                { type: 'regex', value: '^\\+?[1-9]\\d{1,14}$', message: 'Invalid phone number format' }
              ],
            },
            {
              name: 'Email Address',
              fieldType: 'EMAIL',
              isRequired: true,
              validationRules: [
                { type: 'regex', value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', message: 'Invalid email format' }
              ],
            },
          ],
        },
        {
          id: 'asset-template',
          name: 'Asset Information',
          category: 'assets',
          description: 'Common asset tracking fields',
          fields: [
            {
              name: 'Serial Number',
              fieldType: 'TEXT',
              isRequired: true,
              isUnique: true,
            },
            {
              name: 'Purchase Date',
              fieldType: 'DATE',
              isRequired: false,
            },
            {
              name: 'Purchase Cost',
              fieldType: 'CURRENCY',
              isRequired: false,
            },
            {
              name: 'Asset Category',
              fieldType: 'SELECT',
              isRequired: true,
              options: ['IT Equipment', 'Furniture', 'Vehicle', 'Machinery', 'Other'],
            },
          ],
        },
      ];

      return category 
        ? templates.filter(t => t.category === category)
        : templates;
    } catch (error: unknown) {
      logger.error('Failed to get field templates', error);
      throw error;
    }
  }

  /**
   * Validate field values against definitions and dependencies
   */
  async validateFieldValues(
    organizationId: string,
    entityType: string,
    values: Record<string, any>
  ): Promise<{
    isValid: boolean;
    errors: Array<{ fieldId: string; fieldName: string; message: string }>;
    warnings: Array<{ fieldId: string; fieldName: string; message: string }>;
  }> {
    try {
      const definitions = await this.getFieldDefinitions(organizationId, entityType);
      const errors: Array<{ fieldId: string; fieldName: string; message: string }> = [];
      const warnings: Array<{ fieldId: string; fieldName: string; message: string }> = [];

      for (const definition of definitions) {
        const fieldValue = values[definition.id] || values[definition.name];
        
        // Check required fields
        if (definition.isRequired && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
          errors.push({
            fieldId: definition.id,
            fieldName: definition.name,
            message: `${definition.name} is required`,
          });
          continue;
        }

        // Skip validation for empty non-required fields
        if (!fieldValue && !definition.isRequired) {
          continue;
        }

        // Validate against validation rules
        if (definition.validationRules) {
          for (const rule of definition.validationRules) {
            const validationResult = await this.validateRule(rule, fieldValue, definition);
            if (!validationResult.isValid) {
              errors.push({
                fieldId: definition.id,
                fieldName: definition.name,
                message: validationResult.message,
              });
            }
          }
        }

        // Check field type constraints
        const typeValidation = this.validateFieldType(definition.fieldType, fieldValue);
        if (!typeValidation.isValid) {
          errors.push({
            fieldId: definition.id,
            fieldName: definition.name,
            message: typeValidation.message,
          });
        }

        // Check uniqueness
        if (definition.isUnique) {
          const existing = await prisma.customFieldValue.findFirst({
            where: {
              fieldDefinitionId: definition.id,
              value: fieldValue,
            },
          });

          if (existing) {
            errors.push({
              fieldId: definition.id,
              fieldName: definition.name,
              message: `${definition.name} must be unique`,
            });
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: unknown) {
      logger.error('Failed to validate field values', error);
      throw error;
    }
  }

  /**
   * Validate a single validation rule
   */
  private async validateRule(
    rule: ValidationRule,
    value: any,
    definition: any
  ): Promise<{ isValid: boolean; message: string }> {
    switch (rule.type) {
      case 'required':
        return {
          isValid: value !== undefined && value !== null && value !== '',
          message: rule.message,
        };
      case 'min':
        if (typeof value === 'string') {
          return {
            isValid: value.length >= rule.value,
            message: rule.message,
          };
        } else if (typeof value === 'number') {
          return {
            isValid: value >= rule.value,
            message: rule.message,
          };
        }
        return { isValid: true, message: '' };
      case 'max':
        if (typeof value === 'string') {
          return {
            isValid: value.length <= rule.value,
            message: rule.message,
          };
        } else if (typeof value === 'number') {
          return {
            isValid: value <= rule.value,
            message: rule.message,
          };
        }
        return { isValid: true, message: '' };
      case 'regex':
        const regex = new RegExp(rule.value);
        return {
          isValid: regex.test(String(value)),
          message: rule.message,
        };
      case 'custom':
        // For custom validation, you would implement your own logic
        // This is a placeholder
        return { isValid: true, message: '' };
      default:
        return { isValid: true, message: '' };
    }
  }

  /**
   * Validate field type constraints
   */
  private validateFieldType(fieldType: string, value: any): { isValid: boolean; message: string } {
    switch (fieldType) {
      case 'EMAIL':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          isValid: emailRegex.test(value),
          message: 'Invalid email format',
        };
      case 'URL':
        try {
          new URL(value);
          return { isValid: true, message: '' };
        } catch {
          return { isValid: false, message: 'Invalid URL format' };
        }
      case 'NUMBER':
      case 'CURRENCY':
      case 'PERCENTAGE':
        return {
          isValid: !isNaN(Number(value)),
          message: 'Must be a valid number',
        };
      case 'DATE':
        return {
          isValid: !isNaN(Date.parse(value)),
          message: 'Must be a valid date',
        };
      case 'BOOLEAN':
        return {
          isValid: typeof value === 'boolean' || value === 'true' || value === 'false',
          message: 'Must be true or false',
        };
      default:
        return { isValid: true, message: '' };
    }
  }

  /**
   * Apply field template to entity type
   */
  async applyFieldTemplate(
    organizationId: string,
    templateId: string,
    entityType: string,
    customizations?: Record<string, any>
  ): Promise<string[]> {
    try {
      const templates = await this.getFieldTemplates();
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        throw new Error('Template not found');
      }

      const appliedFieldIds: string[] = [];

      for (const fieldTemplate of template.fields) {
        const fieldData = {
          ...fieldTemplate,
          entityType,
          displayOrder: appliedFieldIds.length,
          ...(customizations?.[fieldTemplate.name] || {}),
        };

        const fieldId = await this.createFieldDefinition(organizationId, fieldData);
        appliedFieldIds.push(fieldId);
      }

      logger.info('Field template applied', { 
        templateId,
        entityType,
        appliedFields: appliedFieldIds.length 
      });

      return appliedFieldIds;
    } catch (error: unknown) {
      logger.error('Failed to apply field template', error);
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const definitions = data.definitions.map((def: any) => 
      `"${def.name}","${def.fieldType}","${def.entityType}","${def.isRequired}","${def.isUnique}"`
    );
    
    const values = data.values.map((val: any) => 
      `"${val.entityId}","${val.fieldName}","${val.value}"`
    );

    return [
      'Field Definitions',
      'Name,Type,Entity Type,Required,Unique',
      ...definitions,
      '',
      'Field Values',
      'Entity ID,Field Name,Value',
      ...values,
    ].join('\n');
  }

  /**
   * Parse CSV data
   */
  private parseCSV(csvData: string): any {
    // Simple CSV parser - in production, use a proper CSV library
    const lines = csvData.split('\n');
    // This is a placeholder implementation
    return {
      definitions: [],
      values: [],
    };
  }
}