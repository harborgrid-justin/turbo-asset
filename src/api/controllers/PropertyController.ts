import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { CustomFieldService } from '@/services/CustomFieldService';

const router = Router();
const customFieldService = new CustomFieldService();

/**
 * Get properties for an organization
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, limit = 50, offset = 0 } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });
      return;
    }

    const properties = await prisma.property.findMany({
      where: {
        organizationId: organizationId as string,
        isActive: true,
      },
      include: {
        buildings: {
          include: {
            floors: {
              include: {
                spaces: true,
              },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get custom field values for each property
    for (const property of properties) {
      const customFields = await customFieldService.getFieldValues(
        property.id,
        'property',
        organizationId as string
      );
      (property as any).customFields = customFields;
    }

    res.json({
      properties,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: properties.length,
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to get properties', error);
    res.status(500).json({
      error: 'Failed to get properties',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get property by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    const property = await prisma.property.findFirst({
      where: {
        id,
        organizationId: organizationId as string,
      },
      include: {
        buildings: {
          include: {
            floors: {
              include: {
                spaces: true,
              },
            },
            assets: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!property) {
      res.status(404).json({
        error: 'Property not found',
      });
      return;
    }

    // Get custom field values
    const customFields = await customFieldService.getFieldValues(
      property.id,
      'property',
      organizationId as string
    );
    (property as any).customFields = customFields;

    res.json(property);
  } catch (error: unknown) {
    logger.error('Failed to get property', error);
    res.status(500).json({
      error: 'Failed to get property',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create new property
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      organizationId,
      name,
      type,
      address,
      totalArea,
      usableArea,
      acquisitionCost,
      currentValue,
      acquisitionDate,
      coordinates,
      timezone,
      customFields = {},
    } = req.body;

    // Validate required fields
    if (!organizationId || !name || !type) {
      res.status(400).json({
        error: 'Organization ID, name, and type are required',
      });
      return;
    }

    // Validate custom fields
    const customFieldValidation = await customFieldService.validateEntityFields(
      organizationId,
      'property',
      customFields
    );

    if (!customFieldValidation.isValid) {
      res.status(400).json({
        error: 'Custom field validation failed',
        errors: customFieldValidation.errors,
      });
      return;
    }

    // Create property
    const property = await prisma.property.create({
      data: {
        organizationId,
        name,
        type,
        address: address || {},
        totalArea: totalArea ? parseFloat(totalArea) : null,
        usableArea: usableArea ? parseFloat(usableArea) : null,
        acquisitionCost: acquisitionCost ? parseFloat(acquisitionCost) : null,
        currentValue: currentValue ? parseFloat(currentValue) : null,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        coordinates: coordinates || null,
        timezone: timezone || 'UTC',
      },
    });

    // Save custom field values
    for (const [fieldName, value] of Object.entries(customFields)) {
      const fieldDef = await prisma.customFieldDefinition.findFirst({
        where: {
          name: fieldName,
          entityType: 'property',
          organizationId,
          isActive: true,
        },
      });

      if (fieldDef) {
        await customFieldService.setFieldValue(
          fieldDef.id,
          property.id,
          'property',
          value
        );
      }
    }

    logger.info('Property created', { propertyId: property.id, organizationId });

    res.status(201).json(property);
  } catch (error: unknown) {
    logger.error('Failed to create property', error);
    res.status(500).json({
      error: 'Failed to create property',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update property
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      organizationId,
      name,
      type,
      address,
      totalArea,
      usableArea,
      acquisitionCost,
      currentValue,
      acquisitionDate,
      coordinates,
      timezone,
      customFields = {},
    } = req.body;

    // Check if property exists
    const existingProperty = await prisma.property.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingProperty) {
      res.status(404).json({
        error: 'Property not found',
      });
      return;
    }

    // Validate custom fields
    if (Object.keys(customFields).length > 0) {
      const customFieldValidation = await customFieldService.validateEntityFields(
        organizationId,
        'property',
        customFields
      );

      if (!customFieldValidation.isValid) {
        res.status(400).json({
          error: 'Custom field validation failed',
          errors: customFieldValidation.errors,
        });
      return;
      }
    }

    // Update property
    const updateData: any = {};
    if (name !== undefined) {updateData.name = name;}
    if (type !== undefined) {updateData.type = type;}
    if (address !== undefined) {updateData.address = address;}
    if (totalArea !== undefined) {updateData.totalArea = totalArea ? parseFloat(totalArea) : null;}
    if (usableArea !== undefined) {updateData.usableArea = usableArea ? parseFloat(usableArea) : null;}
    if (acquisitionCost !== undefined) {updateData.acquisitionCost = acquisitionCost ? parseFloat(acquisitionCost) : null;}
    if (currentValue !== undefined) {updateData.currentValue = currentValue ? parseFloat(currentValue) : null;}
    if (acquisitionDate !== undefined) {updateData.acquisitionDate = acquisitionDate ? new Date(acquisitionDate) : null;}
    if (coordinates !== undefined) {updateData.coordinates = coordinates;}
    if (timezone !== undefined) {updateData.timezone = timezone;}

    const property = await prisma.property.update({
      where: { id },
      data: updateData,
    });

    // Update custom field values
    for (const [fieldName, value] of Object.entries(customFields)) {
      const fieldDef = await prisma.customFieldDefinition.findFirst({
        where: {
          name: fieldName,
          entityType: 'property',
          organizationId,
          isActive: true,
        },
      });

      if (fieldDef) {
        await customFieldService.setFieldValue(
          fieldDef.id,
          property.id,
          'property',
          value
        );
      }
    }

    logger.info('Property updated', { propertyId: property.id, organizationId });

    res.json(property);
  } catch (error: unknown) {
    logger.error('Failed to update property', error);
    res.status(500).json({
      error: 'Failed to update property',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Delete property
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    const property = await prisma.property.findFirst({
      where: {
        id,
        organizationId: organizationId as string,
      },
    });

    if (!property) {
      res.status(404).json({
        error: 'Property not found',
      });
      return;
    }

    // Soft delete - mark as inactive
    await prisma.property.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Property deleted', { propertyId: id, organizationId });

    res.json({ message: 'Property deleted successfully' });
  } catch (error: unknown) {
    logger.error('Failed to delete property', error);
    res.status(500).json({
      error: 'Failed to delete property',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;