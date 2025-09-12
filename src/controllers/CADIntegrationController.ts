import express, { Request, Response } from 'express';
import { CADIntegrationService } from '../services/CADIntegrationService';
import { logger } from '../config/logger';
import multer from 'multer';

const router = express.Router();
const cadService = new CADIntegrationService();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/dwg', 'application/dxf', 'application/octet-stream'];
    const allowedExtensions = ['.dwg', '.dxf', '.rvt', '.pln', '.ifc', '.svg', '.pdf'];
    
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported types: DWG, DXF, RVT, PLN, IFC, SVG, PDF'));
    }
  },
});

/**
 * @swagger
 * /api/cad/upload:
 *   post:
 *     summary: Upload CAD file
 *     tags: [CAD Integration]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: CAD file to upload
 *       - in: formData
 *         name: buildingId
 *         type: string
 *         required: true
 *         description: Building ID
 *       - in: formData
 *         name: floorId
 *         type: string
 *         description: Floor ID
 *       - in: formData
 *         name: spaceId
 *         type: string
 *         description: Space ID
 *       - in: formData
 *         name: organizationId
 *         type: string
 *         required: true
 *         description: Organization ID
 *       - in: formData
 *         name: uploadedBy
 *         type: string
 *         required: true
 *         description: User ID of uploader
 *       - in: formData
 *         name: version
 *         type: string
 *         description: File version
 *       - in: formData
 *         name: description
 *         type: string
 *         description: File description
 *       - in: formData
 *         name: extractLayers
 *         type: boolean
 *         description: Extract layer information
 *       - in: formData
 *         name: generateThumbnail
 *         type: boolean
 *         description: Generate thumbnail
 *     responses:
 *       201:
 *         description: CAD file uploaded successfully
 *       400:
 *         description: Bad request
 *       413:
 *         description: File too large
 *       500:
 *         description: Internal server error
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: 'No file provided',
      });

      return;
    }

    const {
      buildingId,
      floorId,
      spaceId,
      organizationId,
      uploadedBy,
      version,
      description,
      extractLayers = 'true',
      extractDimensions = 'false',
      extractText = 'false',
      generateThumbnail = 'true',
      generatePreviews = 'true',
      coordinateSystem,
      units = 'FEET',
    } = req.body;

    if (!buildingId || !organizationId || !uploadedBy) {
      res.status(400).json({
        error: 'Building ID, organization ID, and uploader ID are required',
      });

      return;
    }

    // Determine file type from extension
    const fileName = req.file.originalname;
    const fileExtension = fileName.split('.').pop()?.toUpperCase();
    const fileType = fileExtension as 'DWG' | 'DXF' | 'RVT' | 'PLN' | 'IFC' | 'SVG' | 'PDF';

    const uploadData = {
      fileName,
      fileType,
      fileSize: req.file.size,
      fileBuffer: req.file.buffer,
      buildingId,
      floorId: floorId || undefined,
      spaceId: spaceId || undefined,
      organizationId,
      uploadedBy,
      version: version || '1.0',
      description: description || undefined,
      tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
    };

    const processingOptions = {
      extractLayers: extractLayers === 'true',
      extractDimensions: extractDimensions === 'true',
      extractText: extractText === 'true',
      generateThumbnail: generateThumbnail === 'true',
      generatePreviews: generatePreviews === 'true',
      coordinateSystem: coordinateSystem || 'LOCAL',
      units: units as 'FEET' | 'METERS' | 'INCHES',
    };

    const result = await cadService.uploadCADFile(uploadData, processingOptions);

    res.status(201).json(result);


    return;
  } catch (error: unknown) {
    logger.error('Failed to upload CAD file', error);
    if (error instanceof Error && (error as Error).message.includes('File size exceeds')) {
      res.status(413).json({ error: (error as Error).message });

      return;
    } else if (error instanceof Error && (error as Error).message.includes('Unsupported file type')) {
      res.status(400).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to upload CAD file',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * @swagger
 * /api/cad/files/{fileId}:
 *   get:
 *     summary: Get CAD file details
 *     tags: [CAD Integration]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: CAD file ID
 *       - in: query
 *         name: includeContent
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include file content and metadata
 *     responses:
 *       200:
 *         description: CAD file details retrieved successfully
 *       404:
 *         description: CAD file not found
 *       500:
 *         description: Internal server error
 */
router.get('/files/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { includeContent = 'false' } = req.query;

    const cadFile = await cadService.getCADFile(fileId, includeContent === 'true');

    res.json(cadFile);
  } catch (error: unknown) {
    logger.error('Failed to get CAD file', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to get CAD file',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * @swagger
 * /api/cad/files/{fileId}/mappings:
 *   put:
 *     summary: Update space mappings from CAD file
 *     tags: [CAD Integration]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: CAD file ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mappings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     spaceId:
 *                       type: string
 *                     cadBoundary:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           x:
 *                             type: number
 *                           y:
 *                             type: number
 *                     area:
 *                       type: number
 *                     spaceType:
 *                       type: string
 *                     spaceName:
 *                       type: string
 *                     capacity:
 *                       type: number
 *     responses:
 *       200:
 *         description: Space mappings updated successfully
 *       404:
 *         description: CAD file not found
 *       500:
 *         description: Internal server error
 */
router.put('/files/:fileId/mappings', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { mappings = [] } = req.body;

    if (!Array.isArray(mappings)) {
      res.status(400).json({
        error: 'Mappings must be an array',
      });

      return;
    }

    const result = await cadService.updateSpaceMappings(fileId, mappings);

    res.json(result);
  } catch (error: unknown) {
    logger.error('Failed to update space mappings', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to update space mappings',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * @swagger
 * /api/cad/files/{fileId}/floor-plan:
 *   post:
 *     summary: Generate floor plan from CAD file
 *     tags: [CAD Integration]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: CAD file ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeSpaces:
 *                 type: boolean
 *                 default: true
 *               includeAssets:
 *                 type: boolean
 *                 default: false
 *               includeDimensions:
 *                 type: boolean
 *                 default: false
 *               outputFormat:
 *                 type: string
 *                 enum: [SVG, PNG, PDF]
 *                 default: SVG
 *               scale:
 *                 type: number
 *                 default: 1.0
 *               layerFilter:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Floor plan generated successfully
 *       404:
 *         description: CAD file not found
 *       400:
 *         description: CAD file not processed yet
 *       500:
 *         description: Internal server error
 */
router.post('/files/:fileId/floor-plan', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const {
      includeSpaces = true,
      includeAssets = false,
      includeDimensions = false,
      outputFormat = 'SVG',
      scale = 1.0,
      layerFilter,
    } = req.body;

    const options = {
      includeSpaces,
      includeAssets,
      includeDimensions,
      outputFormat: outputFormat as 'SVG' | 'PNG' | 'PDF',
      scale,
      layerFilter: layerFilter || undefined,
    };

    const floorPlan = await cadService.generateFloorPlan(fileId, options);

    // Set appropriate content type based on format
    const contentTypes = {
      SVG: 'image/svg+xml',
      PNG: 'image/png',
      PDF: 'application/pdf',
    };

    res.setHeader('Content-Type', contentTypes[outputFormat as keyof typeof contentTypes] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="floor-plan-${fileId}.${outputFormat.toLowerCase()}"`);
    
    res.json({
      floorPlan: floorPlan.floorPlan.toString('base64'),
      metadata: floorPlan.metadata,
      interactive: floorPlan.interactive,
    });
  } catch (error: unknown) {
    logger.error('Failed to generate floor plan', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else if (error instanceof Error && (error as Error).message.includes('not yet processed')) {
      res.status(400).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to generate floor plan',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * @swagger
 * /api/cad/files/{fileId}/sync:
 *   post:
 *     summary: Synchronize CAD file with building data
 *     tags: [CAD Integration]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: CAD file ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updateSpaces:
 *                 type: boolean
 *                 default: true
 *               updateAssets:
 *                 type: boolean
 *                 default: false
 *               createMissingSpaces:
 *                 type: boolean
 *                 default: true
 *               archiveRemovedSpaces:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Synchronization completed successfully
 *       404:
 *         description: CAD file not found
 *       500:
 *         description: Internal server error
 */
router.post('/files/:fileId/sync', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const {
      updateSpaces = true,
      updateAssets = false,
      createMissingSpaces = true,
      archiveRemovedSpaces = false,
    } = req.body;

    const syncOptions = {
      updateSpaces,
      updateAssets,
      createMissingSpaces,
      archiveRemovedSpaces,
    };

    const result = await cadService.synchronizeWithBuildingData(fileId, syncOptions);

    res.json(result);
  } catch (error: unknown) {
    logger.error('Failed to synchronize CAD file', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to synchronize CAD file',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * @swagger
 * /api/cad/processing/{processingId}/status:
 *   get:
 *     summary: Get CAD processing status
 *     tags: [CAD Integration]
 *     parameters:
 *       - in: path
 *         name: processingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Processing ID
 *     responses:
 *       200:
 *         description: Processing status retrieved successfully
 *       404:
 *         description: Processing ID not found
 *       500:
 *         description: Internal server error
 */
router.get('/processing/:processingId/status', async (req: Request, res: Response) => {
  try {
    const { processingId } = req.params;

    const status = await cadService.getProcessingStatus(processingId);

    res.json(status);
  } catch (error: unknown) {
    logger.error('Failed to get processing status', error);
    if (error instanceof Error && (error as Error).message.includes('not found')) {
      res.status(404).json({ error: (error as Error).message });

      return;
    } else {
      res.status(500).json({
        error: 'Failed to get processing status',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
      });

      return;
    }
  }
});

/**
 * @swagger
 * /api/cad/analytics/{organizationId}:
 *   get:
 *     summary: Get CAD integration analytics
 *     tags: [CAD Integration]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [WEEKLY, MONTHLY, QUARTERLY, ANNUAL]
 *           default: MONTHLY
 *         description: Analytics timeframe
 *     responses:
 *       200:
 *         description: CAD analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/analytics/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { timeframe = 'MONTHLY' } = req.query;

    // This would be implemented with actual analytics logic
    const analytics = {
      organizationId,
      timeframe,
      summary: {
        totalFiles: 125,
        processedFiles: 118,
        failedFiles: 7,
        totalSpacesMapped: 1547,
        accuracyRate: 94.2,
      },
      fileTypes: {
        DWG: { count: 45, successRate: 96.8 },
        RVT: { count: 35, successRate: 91.4 },
        PLN: { count: 20, successRate: 90.0 },
        DXF: { count: 15, successRate: 100.0 },
        IFC: { count: 10, successRate: 80.0 },
      },
      processingTimes: {
        average: 4.2, // minutes
        median: 3.1,
        fastest: 0.8,
        slowest: 15.6,
      },
      spaceMapping: {
        automaticMappings: 1205,
        manualMappings: 342,
        mappingAccuracy: 89.7,
        conflictsResolved: 23,
      },
      trends: [
        { period: 'Week 1', uploads: 8, processed: 7 },
        { period: 'Week 2', uploads: 12, processed: 11 },
        { period: 'Week 3', uploads: 15, processed: 15 },
        { period: 'Week 4', uploads: 9, processed: 8 },
      ],
      recommendations: [
        'Consider upgrading legacy DWG files to newer format versions',
        'Implement automated space naming conventions for better mapping',
        'Schedule regular CAD file updates to maintain accuracy',
      ],
    };

    res.json(analytics);
  } catch (error: unknown) {
    logger.error('Failed to get CAD analytics', error);
    res.status(500).json({
      error: 'Failed to get CAD analytics',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

export default router;