import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { EventEmitter } from 'events';

interface CADFileUpload {
  fileName: string;
  fileType: 'DWG' | 'DXF' | 'RVT' | 'PLN' | 'IFC' | 'SVG' | 'PDF';
  fileSize: number;
  fileBuffer: Buffer;
  spaceId?: string;
  floorId?: string;
  buildingId: string;
  organizationId: string;
  uploadedBy: string;
  version?: string;
  description?: string;
  tags?: string[];
}

interface CADProcessingOptions {
  extractLayers?: boolean;
  extractDimensions?: boolean;
  extractText?: boolean;
  generateThumbnail?: boolean;
  generatePreviews?: boolean;
  enableVersioning?: boolean;
  coordinateSystem?: string;
  units?: 'FEET' | 'METERS' | 'INCHES';
}

interface CADLayerInfo {
  layerName: string;
  layerType: 'ARCHITECTURAL' | 'STRUCTURAL' | 'MEP' | 'FURNITURE' | 'ANNOTATION' | 'DIMENSIONS';
  isVisible: boolean;
  color?: string;
  lineWeight?: number;
  elementCount: number;
}

interface CADCoordinateMapping {
  cadCoordinates: { x: number; y: number; z?: number };
  worldCoordinates: { lat: number; lng: number; elevation?: number };
  transformationMatrix: number[][];
}

interface SpaceMapping {
  spaceId: string;
  cadBoundary: { x: number; y: number }[];
  area: number;
  spaceType: string;
  spaceName?: string;
  department?: string;
  capacity?: number;
}

interface CADAnnotation {
  annotationType: 'TEXT' | 'DIMENSION' | 'SYMBOL' | 'LABEL';
  content: string;
  coordinates: { x: number; y: number };
  fontSize?: number;
  rotation?: number;
  layer?: string;
}

export class CADIntegrationService extends EventEmitter {
  private processingQueue: Map<string, any> = new Map();
  private versionHistory: Map<string, any[]> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('cad:uploaded', this.handleCADUploaded.bind(this));
    this.on('cad:processed', this.handleCADProcessed.bind(this));
    this.on('cad:version:created', this.handleVersionCreated.bind(this));
    this.on('space:mapped', this.handleSpaceMapped.bind(this));
  }

  /**
   * Upload and process CAD file
   */
  async uploadCADFile(uploadData: CADFileUpload, options: CADProcessingOptions = {}): Promise<{
    cadFile: any;
    processingId: string;
    estimatedProcessingTime: number;
  }> {
    try {
      // Validate file type and size
      this.validateCADFile(uploadData);

      // Create CAD file record
      const cadFile = await prisma.cADFile.create({
        data: {
          fileName: uploadData.fileName,
          fileType: uploadData.fileType,
          fileSize: uploadData.fileSize,
          filePath: '', // Will be set after processing
          buildingId: uploadData.buildingId,
          floorId: uploadData.floorId,
          spaceId: uploadData.spaceId,
          uploadedById: uploadData.uploadedBy,
          version: uploadData.version || '1.0',
          description: uploadData.description,
          tags: uploadData.tags || [],
          status: 'PROCESSING',
          metadata: {},
          createdAt: new Date(),
        },
      });

      // Generate processing ID
      const processingId = `CAD_${cadFile.id}_${Date.now()}`;

      // Add to processing queue
      this.processingQueue.set(processingId, {
        cadFile,
        uploadData,
        options,
        startTime: new Date(),
      });

      // Start asynchronous processing
      this.processCADFileAsync(processingId, uploadData, options);

      // Estimate processing time based on file type and size
      const estimatedTime = this.estimateProcessingTime(uploadData.fileType, uploadData.fileSize);

      // Emit upload event
      this.emit('cad:uploaded', { cadFile, processingId });

      logger.info('CAD file upload initiated', {
        fileId: cadFile.id,
        fileName: uploadData.fileName,
        processingId,
      });

      return {
        cadFile,
        processingId,
        estimatedProcessingTime: estimatedTime,
      };
    } catch (error: unknown) {
      logger.error('Failed to upload CAD file', error);
      throw error;
    }
  }

  /**
   * Get CAD file with layers and metadata
   */
  async getCADFile(fileId: string, includeContent: boolean = false): Promise<{
    file: any;
    layers?: CADLayerInfo[];
    annotations?: CADAnnotation[];
    spaceMappings?: SpaceMapping[];
    versions?: any[];
  }> {
    try {
      const cadFile = await prisma.cADFile.findUnique({
        where: { id: fileId },
        include: {
          building: {
            include: {
              property: true,
            },
          },
          floor: true,
          space: true,
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!cadFile) {
        throw new Error('CAD file not found');
      }

      let layers: CADLayerInfo[] | undefined;
      let annotations: CADAnnotation[] | undefined;
      let spaceMappings: SpaceMapping[] | undefined;
      let versions: any[] | undefined;

      if (includeContent) {
        // Get layer information from metadata
        layers = cadFile.metadata?.layers as CADLayerInfo[] || [];
        
        // Get annotations from metadata
        annotations = cadFile.metadata?.annotations as CADAnnotation[] || [];
        
        // Get space mappings
        spaceMappings = cadFile.metadata?.spaceMappings as SpaceMapping[] || [];
        
        // Get version history
        versions = this.versionHistory.get(fileId) || [];
      }

      return {
        file: cadFile,
        layers,
        annotations,
        spaceMappings,
        versions,
      };
    } catch (error: unknown) {
      logger.error('Failed to get CAD file', error);
      throw error;
    }
  }

  /**
   * Update space mappings from CAD file
   */
  async updateSpaceMappings(
    fileId: string,
    mappings: SpaceMapping[]
  ): Promise<{
    updated: number;
    created: number;
    errors: any[];
  }> {
    try {
      const cadFile = await prisma.cADFile.findUnique({
        where: { id: fileId },
      });

      if (!cadFile) {
        throw new Error('CAD file not found');
      }

      let updated = 0;
      let created = 0;
      const errors: any[] = [];

      for (const mapping of mappings) {
        try {
          // Check if space exists
          let space = await prisma.space.findUnique({
            where: { id: mapping.spaceId },
          });

          if (space) {
            // Update existing space
            await prisma.space.update({
              where: { id: mapping.spaceId },
              data: {
                area: mapping.area,
                capacity: mapping.capacity,
                cadBoundary: mapping.cadBoundary,
                lastUpdated: new Date(),
              },
            });
            updated++;
          } else if (mapping.spaceName && cadFile.floorId) {
            // Create new space from CAD mapping
            space = await prisma.space.create({
              data: {
                name: mapping.spaceName,
                type: mapping.spaceType,
                area: mapping.area,
                capacity: mapping.capacity,
                floorId: cadFile.floorId,
                cadBoundary: mapping.cadBoundary,
                isActive: true,
                createdAt: new Date(),
              },
            });
            created++;
          }

          // Emit space mapped event
          this.emit('space:mapped', {
            spaceId: space?.id,
            cadFileId: fileId,
            mapping,
          });
        } catch (error: unknown) {
          errors.push({
            spaceId: mapping.spaceId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Update CAD file metadata with mappings
      await prisma.cADFile.update({
        where: { id: fileId },
        data: {
          metadata: {
            ...cadFile.metadata as object,
            spaceMappings: mappings,
            lastMappingUpdate: new Date(),
          },
        },
      });

      logger.info('Space mappings updated', {
        fileId,
        updated,
        created,
        errors: errors.length,
      });

      return { updated, created, errors };
    } catch (error: unknown) {
      logger.error('Failed to update space mappings', error);
      throw error;
    }
  }

  /**
   * Generate floor plan from CAD file
   */
  async generateFloorPlan(
    fileId: string,
    options: {
      includeSpaces?: boolean;
      includeAssets?: boolean;
      includeDimensions?: boolean;
      outputFormat?: 'SVG' | 'PNG' | 'PDF';
      scale?: number;
      layerFilter?: string[];
    } = {}
  ): Promise<{
    floorPlan: Buffer;
    metadata: any;
    interactive: boolean;
  }> {
    try {
      const cadFile = await prisma.cADFile.findUnique({
        where: { id: fileId },
      });

      if (!cadFile) {
        throw new Error('CAD file not found');
      }

      if (cadFile.status !== 'PROCESSED') {
        throw new Error('CAD file is not yet processed');
      }

      // Generate floor plan based on options
      const floorPlanData = await this.renderFloorPlan(cadFile, options);

      // Create floor plan record
      await prisma.floorPlan.create({
        data: {
          cadFileId: fileId,
          floorId: cadFile.floorId,
          planType: 'GENERATED',
          planData: floorPlanData.metadata,
          isInteractive: floorPlanData.interactive,
          createdAt: new Date(),
        },
      });

      logger.info('Floor plan generated', {
        fileId,
        format: options.outputFormat,
        interactive: floorPlanData.interactive,
      });

      return floorPlanData;
    } catch (error: unknown) {
      logger.error('Failed to generate floor plan', error);
      throw error;
    }
  }

  /**
   * Synchronize CAD file with building data
   */
  async synchronizeWithBuildingData(
    fileId: string,
    syncOptions: {
      updateSpaces?: boolean;
      updateAssets?: boolean;
      createMissingSpaces?: boolean;
      archiveRemovedSpaces?: boolean;
    } = {}
  ): Promise<{
    spacesUpdated: number;
    spacesCreated: number;
    spacesArchived: number;
    assetsUpdated: number;
    conflicts: any[];
  }> {
    try {
      const cadFile = await prisma.cADFile.findUnique({
        where: { id: fileId },
        include: {
          floor: {
            include: {
              spaces: true,
            },
          },
        },
      });

      if (!cadFile) {
        throw new Error('CAD file not found');
      }

      const result = {
        spacesUpdated: 0,
        spacesCreated: 0,
        spacesArchived: 0,
        assetsUpdated: 0,
        conflicts: [] as any[],
      };

      // Extract current space mappings from CAD
      const cadSpaceMappings = cadFile.metadata?.spaceMappings as SpaceMapping[] || [];
      const currentSpaces = cadFile.floor?.spaces || [];

      // Create maps for easier lookup
      const cadSpaceMap = new Map(cadSpaceMappings.map(m => [m.spaceId, m]));
      const currentSpaceMap = new Map(currentSpaces.map(s => [s.id, s]));

      // Update existing spaces
      if (syncOptions.updateSpaces) {
        for (const [spaceId, cadMapping] of cadSpaceMap) {
          if (currentSpaceMap.has(spaceId)) {
            const currentSpace = currentSpaceMap.get(spaceId)!;
            
            // Check for conflicts
            const conflicts = this.detectSpaceConflicts(currentSpace, cadMapping);
            if (conflicts.length > 0) {
              result.conflicts.push(...conflicts);
              continue;
            }

            // Update space
            await prisma.space.update({
              where: { id: spaceId },
              data: {
                area: cadMapping.area,
                capacity: cadMapping.capacity,
                cadBoundary: cadMapping.cadBoundary,
                lastUpdated: new Date(),
              },
            });
            result.spacesUpdated++;
          }
        }
      }

      // Create missing spaces
      if (syncOptions.createMissingSpaces && cadFile.floorId) {
        for (const mapping of cadSpaceMappings) {
          if (!currentSpaceMap.has(mapping.spaceId) && mapping.spaceName) {
            await prisma.space.create({
              data: {
                name: mapping.spaceName,
                type: mapping.spaceType,
                area: mapping.area,
                capacity: mapping.capacity,
                floorId: cadFile.floorId,
                cadBoundary: mapping.cadBoundary,
                departmentId: mapping.department || null,
                isActive: true,
                createdAt: new Date(),
              },
            });
            result.spacesCreated++;
          }
        }
      }

      // Archive removed spaces
      if (syncOptions.archiveRemovedSpaces) {
        for (const [spaceId, currentSpace] of currentSpaceMap) {
          if (!cadSpaceMap.has(spaceId)) {
            await prisma.space.update({
              where: { id: spaceId },
              data: {
                isActive: false,
                archivedAt: new Date(),
              },
            });
            result.spacesArchived++;
          }
        }
      }

      // Update sync metadata
      await prisma.cADFile.update({
        where: { id: fileId },
        data: {
          metadata: {
            ...cadFile.metadata as object,
            lastSync: new Date(),
            syncResults: result,
          },
        },
      });

      logger.info('CAD synchronization completed', {
        fileId,
        result,
      });

      return result;
    } catch (error: unknown) {
      logger.error('Failed to synchronize CAD file', error);
      throw error;
    }
  }

  /**
   * Get CAD processing status
   */
  async getProcessingStatus(processingId: string): Promise<{
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    message?: string;
    result?: any;
  }> {
    try {
      const processingInfo = this.processingQueue.get(processingId);

      if (!processingInfo) {
        throw new Error('Processing ID not found');
      }

      // Get current status from database
      const cadFile = await prisma.cADFile.findUnique({
        where: { id: processingInfo.cadFile.id },
      });

      if (!cadFile) {
        throw new Error('CAD file not found');
      }

      const progress = this.calculateProcessingProgress(processingInfo);

      return {
        status: cadFile.status as any,
        progress,
        message: cadFile.processingMessage || undefined,
        result: cadFile.status === 'PROCESSED' ? cadFile.metadata : undefined,
      };
    } catch (error: unknown) {
      logger.error('Failed to get processing status', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateCADFile(uploadData: CADFileUpload): void {
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    const supportedTypes = ['DWG', 'DXF', 'RVT', 'PLN', 'IFC', 'SVG', 'PDF'];

    if (uploadData.fileSize > maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`);
    }

    if (!supportedTypes.includes(uploadData.fileType)) {
      throw new Error(`Unsupported file type: ${uploadData.fileType}`);
    }
  }

  private estimateProcessingTime(fileType: string, fileSize: number): number {
    // Base processing time in seconds
    let baseTime = 30;

    // Adjust based on file type complexity
    const complexityMultipliers = {
      'DWG': 2.0,
      'RVT': 3.0,
      'PLN': 2.5,
      'IFC': 2.5,
      'DXF': 1.5,
      'SVG': 1.0,
      'PDF': 1.2,
    };

    baseTime *= complexityMultipliers[fileType as keyof typeof complexityMultipliers] || 1.0;

    // Adjust based on file size (add 1 second per MB)
    const fileSizeMB = fileSize / (1024 * 1024);
    baseTime += fileSizeMB;

    return Math.ceil(baseTime);
  }

  private async processCADFileAsync(
    processingId: string,
    uploadData: CADFileUpload,
    options: CADProcessingOptions
  ): Promise<void> {
    try {
      const processingInfo = this.processingQueue.get(processingId);
      if (!processingInfo) {return;}

      // Simulate processing stages
      await this.updateProcessingProgress(processingInfo.cadFile.id, 'PROCESSING', 10, 'Extracting file contents...');
      
      // Stage 1: Extract file contents
      await this.simulateProcessingStage(1000);
      const fileContents = await this.extractCADContents(uploadData, options);
      
      await this.updateProcessingProgress(processingInfo.cadFile.id, 'PROCESSING', 30, 'Analyzing layers and elements...');
      
      // Stage 2: Analyze layers and elements
      await this.simulateProcessingStage(2000);
      const layerAnalysis = await this.analyzeCADLayers(fileContents, options);
      
      await this.updateProcessingProgress(processingInfo.cadFile.id, 'PROCESSING', 50, 'Extracting spatial information...');
      
      // Stage 3: Extract spatial information
      await this.simulateProcessingStage(1500);
      const spatialInfo = await this.extractSpatialInformation(fileContents, options);
      
      await this.updateProcessingProgress(processingInfo.cadFile.id, 'PROCESSING', 70, 'Generating previews...');
      
      // Stage 4: Generate previews and thumbnails
      await this.simulateProcessingStage(1000);
      const previews = await this.generatePreviews(fileContents, options);
      
      await this.updateProcessingProgress(processingInfo.cadFile.id, 'PROCESSING', 90, 'Finalizing...');
      
      // Stage 5: Finalize processing
      await this.simulateProcessingStage(500);
      
      // Create final metadata
      const metadata = {
        layers: layerAnalysis.layers,
        annotations: layerAnalysis.annotations,
        spatialInfo,
        previews,
        processedAt: new Date(),
        processingTime: Date.now() - processingInfo.startTime.getTime(),
      };

      // Update CAD file record
      await prisma.cADFile.update({
        where: { id: processingInfo.cadFile.id },
        data: {
          status: 'PROCESSED',
          metadata,
          filePath: `cad/${processingInfo.cadFile.id}/${uploadData.fileName}`,
          processingMessage: 'Processing completed successfully',
          processedAt: new Date(),
        },
      });

      // Remove from processing queue
      this.processingQueue.delete(processingId);

      // Emit processed event
      this.emit('cad:processed', {
        cadFile: processingInfo.cadFile,
        metadata,
        processingTime: metadata.processingTime,
      });

    } catch (error: unknown) {
      logger.error('CAD processing failed', error);
      
      // Update with error status
      await this.updateProcessingProgress(
        processingInfo.cadFile.id,
        'FAILED',
        0,
        `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Remove from processing queue
      this.processingQueue.delete(processingId);
    }
  }

  private async updateProcessingProgress(
    fileId: string,
    status: string,
    progress: number,
    message: string
  ): Promise<void> {
    await prisma.cADFile.update({
      where: { id: fileId },
      data: {
        status,
        processingProgress: progress,
        processingMessage: message,
      },
    });
  }

  private async simulateProcessingStage(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  private async extractCADContents(uploadData: CADFileUpload, options: CADProcessingOptions): Promise<any> {
    // Simulate CAD content extraction
    return {
      elements: [],
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      units: options.units || 'FEET',
    };
  }

  private async analyzeCADLayers(fileContents: any, options: CADProcessingOptions): Promise<any> {
    // Simulate layer analysis
    const layers: CADLayerInfo[] = [
      {
        layerName: 'Architecture',
        layerType: 'ARCHITECTURAL',
        isVisible: true,
        color: '#000000',
        lineWeight: 1,
        elementCount: 150,
      },
      {
        layerName: 'Furniture',
        layerType: 'FURNITURE',
        isVisible: true,
        color: '#0000FF',
        lineWeight: 1,
        elementCount: 75,
      },
    ];

    const annotations: CADAnnotation[] = [
      {
        annotationType: 'TEXT',
        content: 'Conference Room A',
        coordinates: { x: 50, y: 50 },
        fontSize: 12,
        layer: 'Architecture',
      },
    ];

    return { layers, annotations };
  }

  private async extractSpatialInformation(fileContents: any, options: CADProcessingOptions): Promise<any> {
    // Simulate spatial information extraction
    return {
      coordinateSystem: options.coordinateSystem || 'LOCAL',
      transformation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      spaces: [],
    };
  }

  private async generatePreviews(fileContents: any, options: CADProcessingOptions): Promise<any> {
    // Simulate preview generation
    return {
      thumbnail: 'data:image/png;base64,...',
      preview: 'data:image/png;base64,...',
      interactive: options.generatePreviews || false,
    };
  }

  private calculateProcessingProgress(processingInfo: any): number {
    const elapsed = Date.now() - processingInfo.startTime.getTime();
    const estimated = this.estimateProcessingTime(
      processingInfo.uploadData.fileType,
      processingInfo.uploadData.fileSize
    ) * 1000; // Convert to milliseconds
    
    return Math.min(95, Math.floor((elapsed / estimated) * 100));
  }

  private async renderFloorPlan(cadFile: any, options: any): Promise<any> {
    // Simulate floor plan rendering
    return {
      floorPlan: Buffer.from('mock floor plan data'),
      metadata: {
        format: options.outputFormat || 'SVG',
        scale: options.scale || 1.0,
        bounds: { width: 1000, height: 800 },
        layers: options.layerFilter || [],
      },
      interactive: options.includeSpaces || false,
    };
  }

  private detectSpaceConflicts(currentSpace: any, cadMapping: SpaceMapping): any[] {
    const conflicts: any[] = [];

    // Check for significant area differences (>10%)
    const areaDiff = Math.abs(currentSpace.area - cadMapping.area) / currentSpace.area;
    if (areaDiff > 0.1) {
      conflicts.push({
        type: 'AREA_MISMATCH',
        current: currentSpace.area,
        cad: cadMapping.area,
        difference: areaDiff,
      });
    }

    // Check for space type conflicts
    if (currentSpace.type !== cadMapping.spaceType) {
      conflicts.push({
        type: 'TYPE_MISMATCH',
        current: currentSpace.type,
        cad: cadMapping.spaceType,
      });
    }

    return conflicts;
  }

  private handleCADUploaded(data: any): void {
    logger.info('CAD file uploaded event handled', { fileId: data.cadFile.id });
  }

  private handleCADProcessed(data: any): void {
    logger.info('CAD file processed event handled', {
      fileId: data.cadFile.id,
      processingTime: data.processingTime,
    });
  }

  private handleVersionCreated(data: any): void {
    logger.info('CAD version created event handled', data);
  }

  private handleSpaceMapped(data: any): void {
    logger.info('Space mapped event handled', data);
  }
}