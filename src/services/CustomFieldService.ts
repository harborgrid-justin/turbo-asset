import { prisma } from '../config/database';
import { logger } from '../config/logger';
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
          validationRules: fieldDefinition.validationRules as any,
          options: fieldDefinition.options as any,
          dependencies: fieldDefinition.dependencies as any,
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
    } catch (error) {
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
        fieldType: def.fieldType as any,
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
    } catch (error) {
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

      const stringValue = this.serializeValue(value, fieldDef.fieldType as any);

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
    } catch (error) {
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
    } catch (error) {
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
          } catch (error) {
            errors[fieldDef.name] = error instanceof Error ? error.message : 'Invalid value';
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
    } catch (error) {
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
}