import { Router, Request, Response } from 'express';
import { BulkDataService } from '@/services/BulkDataService';
import { logger } from '@/config/logger';
import multer from 'multer';
import path from 'path';

const router = Router();
const bulkDataService = new BulkDataService();

// Configure multer for file uploads
const upload = multer({
  dest: 'tmp/uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

/**
 * Import data from CSV/Excel file
 */
router.post('/import', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: 'File is required',
      });
      return;
    }

    const {
      entityType,
      organizationId,
      userId,
      mapping,
      validateOnly,
      skipInvalidRows,
      updateExisting,
    } = req.body;

    if (!entityType || !organizationId || !userId || !mapping) {
      res.status(400).json({
        error: 'Entity type, organization ID, user ID, and mapping are required',
      });
      return;
    }

    const options = {
      entityType,
      organizationId,
      userId,
      mapping: JSON.parse(mapping),
      validateOnly: validateOnly === 'true',
      skipInvalidRows: skipInvalidRows === 'true',
      updateExisting: updateExisting === 'true',
    };

    let result;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (ext === '.csv') {
      result = await bulkDataService.importFromCSV(req.file.path, options);
    } else {
      result = await bulkDataService.importFromExcel(req.file.path, options);
    }

    res.json({
      success: true,
      jobId: result.jobId,
      total: result.total,
      message: 'Import job started successfully',
    });
  } catch (error: unknown) {
    logger.error('Failed to start import job', error);
    res.status(500).json({
      error: 'Failed to start import job',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });
  }
});

/**
 * Export data to CSV/Excel file
 */
router.post('/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entityType,
      organizationId,
      format,
      filters,
      fields,
      includeCustomFields,
    } = req.body;

    if (!entityType || !organizationId || !format) {
      res.status(400).json({
        error: 'Entity type, organization ID, and format are required',
      });
      return;
    }

    if (!['csv', 'xlsx'].includes(format)) {
      res.status(400).json({
        error: 'Format must be csv or xlsx',
      });
      return;
    }

    const options = {
      entityType,
      organizationId,
      format,
      filters: filters || {},
      fields: fields || [],
      includeCustomFields: includeCustomFields === true,
    };

    const result = await bulkDataService.exportData(options);

    res.json({
      success: true,
      jobId: result.jobId,
      message: 'Export job started successfully',
    });
  } catch (error: unknown) {
    logger.error('Failed to start export job', error);
    res.status(500).json({
      error: 'Failed to start export job',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });
  }
});

/**
 * Get import job status
 */
router.get('/import/:jobId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const result = await bulkDataService.getImportJobStatus(jobId);

    if (!result) {
      res.status(404).json({
        error: 'Job not found',
      });
      return;
    }

    res.json(result);
  } catch (error: unknown) {
    logger.error('Failed to get import job status', error);
    res.status(500).json({
      error: 'Failed to get import job status',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });
  }
});

/**
 * Get export job status
 */
router.get('/export/:jobId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const result = await bulkDataService.getExportJobStatus(jobId);

    if (!result) {
      res.status(404).json({
        error: 'Job not found',
      });
      return;
    }

    res.json(result);
  } catch (error: unknown) {
    logger.error('Failed to get export job status', error);
    res.status(500).json({
      error: 'Failed to get export job status',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });
  }
});

/**
 * Download exported file
 */
router.get('/export/:jobId/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const result = await bulkDataService.getExportJobStatus(jobId);

    if (!result?.filePath) {
      res.status(404).json({
        error: 'Export file not found',
      });
      return;
    }

    res.download(result.filePath);
  } catch (error: unknown) {
    logger.error('Failed to download export file', error);
    res.status(500).json({
      error: 'Failed to download export file',
      message: error instanceof Error ? (error).message : 'Unknown error',
    });
  }
});

export default router;