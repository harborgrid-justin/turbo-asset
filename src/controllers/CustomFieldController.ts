import { Router, Request, Response } from 'express';
import { CustomFieldService } from '../services/CustomFieldService';
import { logger } from '../config/logger';
import { prisma } from '../config/database';
import Joi from 'joi';

const router = Router();
const customFieldService = new CustomFieldService();

// Validation schemas
const createFieldDefinitionSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  fieldType: Joi.string().valid(
    'TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT',
    'EMAIL', 'URL', 'PHONE', 'CURRENCY', 'PERCENTAGE', 'RICH_TEXT'
  ).required(),
  entityType: Joi.string().required(),
  isRequired: Joi.boolean().default(false),
  isUnique: Joi.boolean().default(false),
  defaultValue: Joi.string().allow(null, ''),
  validationRules: Joi.array().items(Joi.object({
    type: Joi.string().valid('required', 'min', 'max', 'regex', 'custom').required(),
    value: Joi.any(),
    message: Joi.string().required(),
  })),
  options: Joi.array().items(Joi.string()),
  dependencies: Joi.array().items(Joi.object({
    fieldId: Joi.string().required(),
    condition: Joi.string().valid('equals', 'not_equals', 'contains', 'greater_than', 'less_than').required(),
    value: Joi.any().required(),
    action: Joi.string().valid('show', 'hide', 'require', 'set_value').required(),
    targetValue: Joi.any(),
  })),
  displayOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
});

const updateFieldDefinitionSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  isRequired: Joi.boolean(),
  isUnique: Joi.boolean(),
  defaultValue: Joi.string().allow(null, ''),
  validationRules: Joi.array().items(Joi.object({
    type: Joi.string().valid('required', 'min', 'max', 'regex', 'custom').required(),
    value: Joi.any(),
    message: Joi.string().required(),
  })),
  options: Joi.array().items(Joi.string()),
  dependencies: Joi.array().items(Joi.object({
    fieldId: Joi.string().required(),
    condition: Joi.string().valid('equals', 'not_equals', 'contains', 'greater_than', 'less_than').required(),
    value: Joi.any().required(),
    action: Joi.string().valid('show', 'hide', 'require', 'set_value').required(),
    targetValue: Joi.any(),
  })),
  displayOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
});

const setFieldValuesSchema = Joi.object({
  entityId: Joi.string().required(),
  entityType: Joi.string().required(),
  values: Joi.object().pattern(
    Joi.string(),
    Joi.any()
  ).required(),
});

const bulkUpdateSchema = Joi.object({
  entityType: Joi.string().required(),
  entityIds: Joi.array().items(Joi.string()).required(),
  fieldValues: Joi.object().pattern(
    Joi.string(),
    Joi.any()
  ).required(),
});

export class CustomFieldController {
  /**
   * Get custom field definitions for an entity type
   */
  async getFieldDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { entityType, includeInactive = 'false' } = req.query;

      if (!entityType) {
        res.status(400).json({ error: 'entityType query parameter is required' });
        return;
      }

      const definitions = await customFieldService.getFieldDefinitions(
        organizationId,
        entityType as string,
        includeInactive === 'true'
      );

      res.json({
        success: true,
        data: definitions,
        count: definitions.length,
      });
    } catch (error) {
      logger.error('Failed to get field definitions', error);
      res.status(500).json({ error: 'Failed to get field definitions' });
    }
  }

  /**
   * Create a new custom field definition
   */
  async createFieldDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      
      const { error, value } = createFieldDefinitionSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const fieldId = await customFieldService.createFieldDefinition(organizationId, value);

      res.status(201).json({
        success: true,
        data: { id: fieldId },
        message: 'Custom field definition created successfully',
      });
    } catch (error) {
      logger.error('Failed to create field definition', error);
      res.status(500).json({ error: 'Failed to create field definition' });
    }
  }

  /**
   * Update a custom field definition
   */
  async updateFieldDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, fieldId } = req.params;
      
      const { error, value } = updateFieldDefinitionSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      await customFieldService.updateFieldDefinition(organizationId, fieldId, value);

      res.json({
        success: true,
        message: 'Custom field definition updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update field definition', error);
      res.status(500).json({ error: 'Failed to update field definition' });
    }
  }

  /**
   * Delete a custom field definition
   */
  async deleteFieldDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, fieldId } = req.params;

      await customFieldService.deleteFieldDefinition(organizationId, fieldId);

      res.json({
        success: true,
        message: 'Custom field definition deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete field definition', error);
      res.status(500).json({ error: 'Failed to delete field definition' });
    }
  }

  /**
   * Get custom field values for an entity
   */
  async getFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, entityId } = req.params;
      const { entityType } = req.query;

      if (!entityType) {
        res.status(400).json({ error: 'entityType query parameter is required' });
        return;
      }

      const values = await customFieldService.getFieldValues(
        organizationId,
        entityId,
        entityType as string
      );

      res.json({
        success: true,
        data: values,
      });
    } catch (error) {
      logger.error('Failed to get field values', error);
      res.status(500).json({ error: 'Failed to get field values' });
    }
  }

  /**
   * Set custom field values for an entity
   */
  async setFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      
      const { error, value } = setFieldValuesSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      await customFieldService.setFieldValue(
        organizationId,
        value.entityId,
        value.entityType,
        value.values
      );

      res.json({
        success: true,
        message: 'Custom field values set successfully',
      });
    } catch (error) {
      logger.error('Failed to set field values', error);
      res.status(500).json({ error: 'Failed to set field values' });
    }
  }

  /**
   * Validate field values against definitions and dependencies
   */
  async validateFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { entityType, values } = req.body;

      if (!entityType || !values) {
        res.status(400).json({ error: 'entityType and values are required' });
        return;
      }

      const validation = await customFieldService.validateFieldValues(
        organizationId,
        entityType,
        values
      );

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      logger.error('Failed to validate field values', error);
      res.status(500).json({ error: 'Failed to validate field values' });
    }
  }

  /**
   * Get field definition by ID
   */
  async getFieldDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, fieldId } = req.params;

      const definition = await prisma.customFieldDefinition.findFirst({
        where: {
          id: fieldId,
          organizationId,
        },
      });

      if (!definition) {
        res.status(404).json({ error: 'Field definition not found' });
        return;
      }

      res.json({
        success: true,
        data: definition,
      });
    } catch (error) {
      logger.error('Failed to get field definition', error);
      res.status(500).json({ error: 'Failed to get field definition' });
    }
  }

  /**
   * Copy field definition to another entity type
   */
  async copyFieldDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, fieldId } = req.params;
      const { targetEntityType, newName } = req.body;

      if (!targetEntityType) {
        res.status(400).json({ error: 'targetEntityType is required' });
        return;
      }

      const newFieldId = await customFieldService.copyFieldDefinition(
        organizationId,
        fieldId,
        targetEntityType,
        newName
      );

      res.status(201).json({
        success: true,
        data: { id: newFieldId },
        message: 'Field definition copied successfully',
      });
    } catch (error) {
      logger.error('Failed to copy field definition', error);
      res.status(500).json({ error: 'Failed to copy field definition' });
    }
  }

  /**
   * Bulk update field values for multiple entities
   */
  async bulkUpdateFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      
      const { error, value } = bulkUpdateSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const results = await customFieldService.bulkUpdateFieldValues(
        organizationId,
        value.entityType,
        value.entityIds,
        value.fieldValues
      );

      res.json({
        success: true,
        data: results,
        message: `Bulk update completed. ${results.successCount} successful, ${results.errorCount} failed.`,
      });
    } catch (error) {
      logger.error('Failed to bulk update field values', error);
      res.status(500).json({ error: 'Failed to bulk update field values' });
    }
  }

  /**
   * Get field usage statistics
   */
  async getFieldUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, fieldId } = req.params;

      const stats = await customFieldService.getFieldUsageStats(organizationId, fieldId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get field usage stats', error);
      res.status(500).json({ error: 'Failed to get field usage stats' });
    }
  }

  /**
   * Export field definitions and values
   */
  async exportFields(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { entityType, format = 'json' } = req.query;

      if (!entityType) {
        res.status(400).json({ error: 'entityType query parameter is required' });
        return;
      }

      const exportData = await customFieldService.exportFields(
        organizationId,
        entityType as string,
        format as string
      );

      const fileName = `custom-fields-${entityType}-${new Date().toISOString().split('T')[0]}.${format}`;

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
      } else if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.send(exportData);
      } else {
        res.status(400).json({ error: 'Invalid format. Supported formats: json, csv' });
      }
    } catch (error) {
      logger.error('Failed to export fields', error);
      res.status(500).json({ error: 'Failed to export fields' });
    }
  }

  /**
   * Import field definitions and values
   */
  async importFields(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { data, format = 'json', mergeMode = 'skip' } = req.body;

      if (!data) {
        res.status(400).json({ error: 'data is required' });
        return;
      }

      const results = await customFieldService.importFields(
        organizationId,
        data,
        format,
        mergeMode
      );

      res.json({
        success: true,
        data: results,
        message: `Import completed. ${results.imported} fields imported, ${results.skipped} skipped, ${results.errors} errors.`,
      });
    } catch (error) {
      logger.error('Failed to import fields', error);
      res.status(500).json({ error: 'Failed to import fields' });
    }
  }

  /**
   * Get field templates (common field definitions)
   */
  async getFieldTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;

      const templates = await customFieldService.getFieldTemplates(category as string);

      res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      logger.error('Failed to get field templates', error);
      res.status(500).json({ error: 'Failed to get field templates' });
    }
  }

  /**
   * Apply field template to entity type
   */
  async applyFieldTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { templateId, entityType, customizations } = req.body;

      if (!templateId || !entityType) {
        res.status(400).json({ error: 'templateId and entityType are required' });
        return;
      }

      const appliedFields = await customFieldService.applyFieldTemplate(
        organizationId,
        templateId,
        entityType,
        customizations
      );

      res.status(201).json({
        success: true,
        data: { appliedFields },
        message: `Template applied successfully. ${appliedFields.length} fields created.`,
      });
    } catch (error) {
      logger.error('Failed to apply field template', error);
      res.status(500).json({ error: 'Failed to apply field template' });
    }
  }
}

const controller = new CustomFieldController();

// Field definition routes
router.get('/:organizationId/definitions', controller.getFieldDefinitions.bind(controller));
router.post('/:organizationId/definitions', controller.createFieldDefinition.bind(controller));
router.get('/:organizationId/definitions/:fieldId', controller.getFieldDefinition.bind(controller));
router.put('/:organizationId/definitions/:fieldId', controller.updateFieldDefinition.bind(controller));
router.delete('/:organizationId/definitions/:fieldId', controller.deleteFieldDefinition.bind(controller));
router.post('/:organizationId/definitions/:fieldId/copy', controller.copyFieldDefinition.bind(controller));

// Field value routes
router.get('/:organizationId/values/:entityId', controller.getFieldValues.bind(controller));
router.post('/:organizationId/values', controller.setFieldValues.bind(controller));
router.post('/:organizationId/values/bulk', controller.bulkUpdateFieldValues.bind(controller));
router.post('/:organizationId/validate', controller.validateFieldValues.bind(controller));

// Field statistics and management
router.get('/:organizationId/definitions/:fieldId/stats', controller.getFieldUsageStats.bind(controller));
router.get('/:organizationId/export', controller.exportFields.bind(controller));
router.post('/:organizationId/import', controller.importFields.bind(controller));

// Field templates
router.get('/templates', controller.getFieldTemplates.bind(controller));
router.post('/:organizationId/templates/apply', controller.applyFieldTemplate.bind(controller));

export default router;