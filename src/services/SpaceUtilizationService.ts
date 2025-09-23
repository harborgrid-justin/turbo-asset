import { prisma } from '../config/database';
import { logger } from '@/config/logger';

interface UtilizationRecord {
  spaceId: string;
  utilizationType: string;
  value: number;
  unit: string;
  dataSource?: string;
  sensorId?: string;
  metadata?: any;
  recordDate?: Date;
}

interface UtilizationQuery {
  organizationId: string;
  spaceIds?: string[];
  buildingIds?: string[];
  floorIds?: string[];
  startDate?: Date;
  endDate?: Date;
  utilizationType?: string;
  dataSource?: string;
}

interface UtilizationReport {
  spaceId: string;
  spaceName: string;
  spaceType: string;
  totalRecords: number;
  averageUtilization: number;
  peakUtilization: number;
  utilizationTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  records: any[];
}

export class SpaceUtilizationService {
  /**
   * Record space utilization data
   */
  async recordUtilization(records: UtilizationRecord[]): Promise<void> {
    try {
      // Validate spaces exist
      const spaceIds = records.map(r => r.spaceId);
      const existingSpaces = await prisma.space.findMany({
        where: {
          id: { in: spaceIds },
          isActive: true,
        },
      });

      const existingSpaceIds = new Set(existingSpaces.map(s => s.id));
      const validRecords = records.filter(r => existingSpaceIds.has(r.spaceId));

      if (validRecords.length === 0) {
        throw new Error('No valid spaces found for utilization records');
      }

      // Create utilization records
      await prisma.spaceUtilization.createMany({
        data: validRecords.map(record => ({
          spaceId: record.spaceId,
          utilizationType: record.utilizationType,
          value: record.value,
          unit: record.unit,
          dataSource: record.dataSource || 'MANUAL',
          sensorId: record.sensorId || null,
          metadata: record.metadata || null,
          recordDate: record.recordDate || new Date(),
        })),
      });

      logger.info('Space utilization records created', { 
        recordCount: validRecords.length,
        invalidCount: records.length - validRecords.length,
      });
    } catch (error: unknown) {
      logger.error('Failed to record space utilization', error);
      throw error;
    }
  }

  /**
   * Get space utilization data with filtering
   */
  async getUtilizationData(query: UtilizationQuery): Promise<any[]> {
    try {
      // Build where clause
      const whereClause: any = {
        space: {
          floor: {
            building: {
              property: {
                organizationId: query.organizationId,
              },
            },
          },
          isActive: true,
        },
      };

      if (query.spaceIds && query.spaceIds.length > 0) {
        whereClause.spaceId = { in: query.spaceIds };
      }

      if (query.buildingIds && query.buildingIds.length > 0) {
        whereClause.space.floor.buildingId = { in: query.buildingIds };
      }

      if (query.floorIds && query.floorIds.length > 0) {
        whereClause.space.floorId = { in: query.floorIds };
      }

      if (query.startDate || query.endDate) {
        whereClause.recordDate = {};
        if (query.startDate) {
          whereClause.recordDate.gte = query.startDate;
        }
        if (query.endDate) {
          whereClause.recordDate.lte = query.endDate;
        }
      }

      if (query.utilizationType) {
        whereClause.utilizationType = query.utilizationType;
      }

      if (query.dataSource) {
        whereClause.dataSource = query.dataSource;
      }

      const utilizationData = await prisma.spaceUtilization.findMany({
        where: whereClause,
        include: {
          space: {
            include: {
              floor: {
                include: {
                  building: {
                    include: {
                      property: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          recordDate: 'desc',
        },
      });

      return utilizationData;
    } catch (error: unknown) {
      logger.error('Failed to get utilization data', error);
      throw error;
    }
  }

  /**
   * Generate utilization reports for spaces
   */
  async generateUtilizationReport(query: UtilizationQuery): Promise<UtilizationReport[]> {
    try {
      const utilizationData = await this.getUtilizationData(query);

      // Group data by space
      const spaceDataMap = new Map<string, any[]>();
      utilizationData.forEach(record => {
        if (!spaceDataMap.has(record.spaceId)) {
          spaceDataMap.set(record.spaceId, []);
        }
        spaceDataMap.get(record.spaceId)!.push(record);
      });

      const reports: UtilizationReport[] = [];

      for (const [spaceId, records] of spaceDataMap.entries()) {
        if (records.length === 0) {continue;}

        const firstRecord = records[0];
        const utilizationValues = records.map(r => r.value);
        
        const averageUtilization = utilizationValues.reduce((sum, val) => sum + val, 0) / utilizationValues.length;
        const peakUtilization = Math.max(...utilizationValues);

        // Calculate trend (simple linear regression)
        const trend = this.calculateTrend(records);

        reports.push({
          spaceId,
          spaceName: firstRecord.space.name,
          spaceType: firstRecord.space.type,
          totalRecords: records.length,
          averageUtilization: Math.round(averageUtilization * 100) / 100,
          peakUtilization,
          utilizationTrend: trend,
          records: records.slice(0, 10), // Latest 10 records
        });
      }

      return reports.sort((a, b) => b.averageUtilization - a.averageUtilization);
    } catch (error: unknown) {
      logger.error('Failed to generate utilization report', error);
      throw error;
    }
  }

  /**
   * Get real-time occupancy data
   */
  async getRealTimeOccupancy(organizationId: string, spaceIds?: string[]): Promise<any[]> {
    try {
      const whereClause: any = {
        space: {
          floor: {
            building: {
              property: {
                organizationId,
              },
            },
          },
          isActive: true,
        },
        utilizationType: 'OCCUPANCY',
        recordDate: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      };

      if (spaceIds && spaceIds.length > 0) {
        whereClause.spaceId = { in: spaceIds };
      }

      // Get latest occupancy record for each space
      const latestRecords = await prisma.$queryRaw`
        SELECT DISTINCT ON (space_id) 
          space_id,
          value,
          unit,
          data_source,
          record_date,
          sensor_id,
          metadata
        FROM space_utilization 
        WHERE space_id IN (
          SELECT s.id FROM spaces s
          JOIN floors f ON s.floor_id = f.id
          JOIN buildings b ON f.building_id = b.id
          JOIN properties p ON b.property_id = p.id
          WHERE p.organization_id = ${organizationId}
          AND s.is_active = true
          ${spaceIds && spaceIds.length > 0 ? `AND s.id = ANY(${spaceIds})` : ''}
        )
        AND utilization_type = 'OCCUPANCY'
        AND record_date >= NOW() - INTERVAL '24 hours'
        ORDER BY space_id, record_date DESC
      `;

      // Enrich with space information
      const enrichedData = await Promise.all(
        latestRecords.map(async (record: any) => {
          const space = await prisma.space.findUnique({
            where: { id: record.space_id },
            include: {
              floor: {
                include: {
                  building: {
                    include: {
                      property: true,
                    },
                  },
                },
              },
            },
          });

          return {
            spaceId: record.space_id,
            space,
            currentOccupancy: record.value,
            unit: record.unit,
            dataSource: record.data_source,
            lastUpdated: record.record_date,
            sensorId: record.sensor_id,
            metadata: record.metadata,
          };
        })
      );

      return enrichedData;
    } catch (error: unknown) {
      logger.error('Failed to get real-time occupancy', error);
      throw error;
    }
  }

  /**
   * Process sensor data and create utilization records
   */
  async processSensorData(sensorData: Array<{
    sensorId: string;
    spaceId: string;
    data: {
      occupancy?: number;
      temperature?: number;
      co2?: number;
      footTraffic?: number;
      [key: string]: any;
    };
    timestamp: Date;
  }>): Promise<void> {
    try {
      const utilizationRecords: UtilizationRecord[] = [];

      for (const sensor of sensorData) {
        const { sensorId, spaceId, data, timestamp } = sensor;

        // Create records for different types of sensor data
        if (data.occupancy !== undefined) {
          utilizationRecords.push({
            spaceId,
            utilizationType: 'OCCUPANCY',
            value: data.occupancy,
            unit: 'people',
            dataSource: 'SENSOR',
            sensorId,
            recordDate: timestamp,
            metadata: { rawData: data },
          });
        }

        if (data.temperature !== undefined) {
          utilizationRecords.push({
            spaceId,
            utilizationType: 'ENVIRONMENTAL',
            value: data.temperature,
            unit: 'celsius',
            dataSource: 'SENSOR',
            sensorId,
            recordDate: timestamp,
            metadata: { type: 'temperature', rawData: data },
          });
        }

        if (data.co2 !== undefined) {
          utilizationRecords.push({
            spaceId,
            utilizationType: 'ENVIRONMENTAL',
            value: data.co2,
            unit: 'ppm',
            dataSource: 'SENSOR',
            sensorId,
            recordDate: timestamp,
            metadata: { type: 'co2', rawData: data },
          });
        }

        if (data.footTraffic !== undefined) {
          utilizationRecords.push({
            spaceId,
            utilizationType: 'FOOT_TRAFFIC',
            value: data.footTraffic,
            unit: 'count',
            dataSource: 'SENSOR',
            sensorId,
            recordDate: timestamp,
            metadata: { rawData: data },
          });
        }
      }

      if (utilizationRecords.length > 0) {
        await this.recordUtilization(utilizationRecords);
        logger.info('Processed sensor data', { 
          sensorCount: sensorData.length,
          recordCount: utilizationRecords.length 
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to process sensor data', error);
      throw error;
    }
  }

  /**
   * Get space utilization analytics
   */
  async getUtilizationAnalytics(query: UtilizationQuery): Promise<{
    summary: any;
    trends: any[];
    heatmap: any[];
    recommendations: string[];
  }> {
    try {
      const utilizationData = await this.getUtilizationData(query);
      const reports = await this.generateUtilizationReport(query);

      const summary = {
        totalSpaces: reports.length,
        averageUtilization: reports.reduce((sum, r) => sum + r.averageUtilization, 0) / reports.length,
        highlyUtilized: reports.filter(r => r.averageUtilization > 80).length,
        underUtilized: reports.filter(r => r.averageUtilization < 30).length,
        totalRecords: utilizationData.length,
      };

      // Generate trends by date
      const trendMap = new Map<string, number[]>();
      utilizationData.forEach(record => {
        const dateKey = record.recordDate.toISOString().split('T')[0];
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, []);
        }
        trendMap.get(dateKey)!.push(record.value);
      });

      const trends = Array.from(trendMap.entries()).map(([date, values]) => ({
        date,
        averageUtilization: values.reduce((sum, val) => sum + val, 0) / values.length,
        recordCount: values.length,
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Generate heatmap data (by hour)
      const heatmapMap = new Map<number, number[]>();
      utilizationData.forEach(record => {
        const hour = record.recordDate.getHours();
        if (!heatmapMap.has(hour)) {
          heatmapMap.set(hour, []);
        }
        heatmapMap.get(hour)!.push(record.value);
      });

      const heatmap = Array.from(heatmapMap.entries()).map(([hour, values]) => ({
        hour,
        averageUtilization: values.reduce((sum, val) => sum + val, 0) / values.length,
        recordCount: values.length,
      })).sort((a, b) => a.hour - b.hour);

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (summary.underUtilized > summary.totalSpaces * 0.3) {
        recommendations.push('Consider consolidating spaces to improve utilization efficiency');
      }
      
      if (summary.highlyUtilized > summary.totalSpaces * 0.2) {
        recommendations.push('High utilization detected - consider adding more spaces or implementing hoteling');
      }

      const peakHour = heatmap.reduce((max, current) => 
        current.averageUtilization > max.averageUtilization ? current : max, 
        { hour: 0, averageUtilization: 0 }
      );
      
      if (peakHour.hour) {
        recommendations.push(`Peak utilization occurs at ${peakHour.hour}:00 - consider staggered schedules`);
      }

      return {
        summary,
        trends,
        heatmap,
        recommendations,
      };
    } catch (error: unknown) {
      logger.error('Failed to get utilization analytics', error);
      throw error;
    }
  }

  /**
   * Calculate utilization trend using simple linear regression
   */
  private calculateTrend(records: any[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (records.length < 2) {return 'STABLE';}

    // Sort by date
    const sortedRecords = records.sort((a, b) => 
      new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime()
    );

    const n = sortedRecords.length;
    const values = sortedRecords.map((_, index) => ({ x: index, y: sortedRecords[index].value }));

    const sumX = values.reduce((sum, val) => sum + val.x, 0);
    const sumY = values.reduce((sum, val) => sum + val.y, 0);
    const sumXY = values.reduce((sum, val) => sum + val.x * val.y, 0);
    const sumXX = values.reduce((sum, val) => sum + val.x * val.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Determine trend based on slope
    if (slope > 0.1) {return 'INCREASING';}
    if (slope < -0.1) {return 'DECREASING';}
    return 'STABLE';
  }

  /**
   * Get predictive space planning analytics using ML insights
   */
  async getPredictiveSpacePlanning(
    organizationId: string,
    timeHorizon: number = 90
  ): Promise<{
    predictions: any[];
    capacityRecommendations: any[];
    optimizationSuggestions: any[];
    riskAssessment: any;
  }> {
    try {
      // Get historical data for ML analysis
      const historicalData = await prisma.$queryRaw`
        SELECT 
          s.id,
          s.name,
          s.type,
          s.capacity,
          s.area,
          DATE_TRUNC('day', su.record_date) as date,
          AVG(su.value) as avg_utilization,
          MAX(su.value) as peak_utilization,
          COUNT(*) as data_points
        FROM space_utilization su
        JOIN spaces s ON su.space_id = s.id
        JOIN floors f ON s.floor_id = f.id
        JOIN buildings b ON f.building_id = b.id
        JOIN properties p ON b.property_id = p.id
        WHERE p.organization_id = ${organizationId}
        AND su.record_date >= NOW() - INTERVAL '1 year'
        AND su.utilization_type = 'UTILIZATION'
        GROUP BY s.id, s.name, s.type, s.capacity, s.area, DATE_TRUNC('day', su.record_date)
        ORDER BY s.id, date DESC
      `;

      // Calculate growth trends and predictions
      const predictions = this.calculateGrowthPredictions(historicalData, timeHorizon);
      
      // Generate capacity recommendations
      const capacityRecommendations = await this.generateCapacityRecommendations(
        organizationId,
        predictions
      );

      // Generate optimization suggestions
      const optimizationSuggestions = await this.generateOptimizationSuggestions(
        organizationId,
        historicalData
      );

      // Assess risks for space planning
      const riskAssessment = this.assessSpacePlanningRisks(predictions);

      return {
        predictions,
        capacityRecommendations,
        optimizationSuggestions,
        riskAssessment,
      };
    } catch (error: unknown) {
      logger.error('Failed to get predictive space planning', error);
      throw error;
    }
  }

  /**
   * Process real-time sensor data with advanced analytics
   */
  async processRealtimeSensorData(
    sensorData: Array<{
      sensorId: string;
      spaceId: string;
      sensorType: string;
      value: number;
      unit: string;
      timestamp: Date;
      metadata?: any;
    }>
  ): Promise<{
    processed: number;
    alerts: any[];
    recommendations: any[];
  }> {
    try {
      const processed: any[] = [];
      const alerts: any[] = [];
      const recommendations: any[] = [];

      for (const data of sensorData) {
        // Store sensor data
        await prisma.spaceUtilization.create({
          data: {
            spaceId: data.spaceId,
            utilizationType: data.sensorType,
            value: data.value,
            unit: data.unit,
            dataSource: 'SENSOR',
            sensorId: data.sensorId,
            metadata: data.metadata,
            recordDate: data.timestamp,
          },
        });

        // Check for anomalies and generate alerts
        const anomaly = await this.detectUtilizationAnomaly(data);
        if (anomaly) {
          alerts.push(anomaly);
        }

        // Generate real-time recommendations
        const recommendation = await this.generateRealtimeRecommendation(data);
        if (recommendation) {
          recommendations.push(recommendation);
        }

        processed.push(data.sensorId);
      }

      // Emit real-time events for dashboard updates
      this.emitRealTimeUpdate({
        processed: processed.length,
        alerts,
        recommendations,
      });

      return {
        processed: processed.length,
        alerts,
        recommendations,
      };
    } catch (error: unknown) {
      logger.error('Failed to process realtime sensor data', error);
      throw error;
    }
  }

  /**
   * Get enterprise-scale occupancy insights for 100k+ employees
   */
  async getEnterpriseOccupancyInsights(
    organizationId: string,
    options: {
      includeSubsidiaries?: boolean;
      aggregationLevel?: 'SPACE' | 'FLOOR' | 'BUILDING' | 'PROPERTY';
      timeRange?: 'REAL_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    } = {}
  ): Promise<{
    totalEmployees: number;
    currentOccupancy: number;
    capacityUtilization: number;
    peakHours: any[];
    bottlenecks: any[];
    expansionNeeds: any[];
    costOptimization: any;
  }> {
    try {
      const { includeSubsidiaries = false, aggregationLevel = 'BUILDING', timeRange = 'DAILY' } = options;

      // Build complex query for enterprise-scale data
      const whereClause: any = {
        organizationId,
      };

      if (includeSubsidiaries) {
        // Include subsidiary data
        const subsidiaries = await prisma.organization.findMany({
          where: { parentId: organizationId },
          select: { id: true },
        });
        
        if (subsidiaries.length > 0) {
          whereClause.OR = [
            { organizationId },
            { organizationId: { in: subsidiaries.map(s => s.id) } },
          ];
          delete whereClause.organizationId;
        }
      }

      // Get current occupancy data
      const occupancyData = await this.getAggregatedOccupancyData(whereClause, aggregationLevel, timeRange);
      
      // Calculate employee metrics
      const employeeMetrics = await this.calculateEmployeeMetrics(organizationId, includeSubsidiaries);
      
      // Identify peak usage patterns
      const peakHours = await this.identifyPeakUsagePatterns(organizationId, timeRange);
      
      // Find capacity bottlenecks
      const bottlenecks = await this.identifyCapacityBottlenecks(organizationId);
      
      // Calculate expansion needs
      const expansionNeeds = await this.calculateExpansionNeeds(organizationId, employeeMetrics);
      
      // Generate cost optimization recommendations
      const costOptimization = await this.generateCostOptimizationRecommendations(
        organizationId,
        occupancyData,
        employeeMetrics
      );

      return {
        totalEmployees: employeeMetrics.totalEmployees,
        currentOccupancy: occupancyData.currentOccupancy,
        capacityUtilization: occupancyData.capacityUtilization,
        peakHours,
        bottlenecks,
        expansionNeeds,
        costOptimization,
      };
    } catch (error: unknown) {
      logger.error('Failed to get enterprise occupancy insights', error);
      throw error;
    }
  }

  /**
   * Calculate growth predictions using trend analysis
   */
  private calculateGrowthPredictions(historicalData: any[], timeHorizon: number): any[] {
    // Group data by space
    const spaceData = new Map<string, any[]>();
    
    historicalData.forEach(record => {
      if (!spaceData.has(record.id)) {
        spaceData.set(record.id, []);
      }
      spaceData.get(record.id)!.push(record);
    });

    const predictions: any[] = [];

    spaceData.forEach((data, spaceId) => {
      if (data.length < 30) {return;} // Need at least 30 days of data

      // Sort by date
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate trend using linear regression
      const trend = this.calculateLinearTrend(data.map(d => d.avg_utilization));
      const seasonality = this.calculateSeasonality(data);
      
      // Project future utilization
      const futureProjections = [];
      for (let i = 1; i <= timeHorizon; i++) {
        const baseValue = data[data.length - 1].avg_utilization;
        const trendValue = baseValue + (trend.slope * i);
        const seasonalAdjustment = seasonality[i % seasonality.length] || 0;
        const predictedValue = Math.max(0, Math.min(100, trendValue + seasonalAdjustment));
        
        futureProjections.push({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          predictedUtilization: predictedValue,
          confidence: Math.max(0.1, 0.9 - (i / timeHorizon) * 0.4), // Decreasing confidence over time
        });
      }

      predictions.push({
        spaceId,
        spaceName: data[0].name,
        spaceType: data[0].type,
        currentUtilization: data[data.length - 1].avg_utilization,
        trend: trend.slope > 0 ? 'INCREASING' : trend.slope < 0 ? 'DECREASING' : 'STABLE',
        trendStrength: Math.abs(trend.slope),
        projections: futureProjections,
      });
    });

    return predictions;
  }

  /**
   * Generate capacity recommendations based on predictions
   */
  private async generateCapacityRecommendations(
    organizationId: string,
    predictions: any[]
  ): Promise<any[]> {
    const recommendations: any[] = [];

    for (const prediction of predictions) {
      const space = await prisma.space.findUnique({
        where: { id: prediction.spaceId },
        include: {
          floor: {
            include: {
              building: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
      });

      if (!space) {continue;}

      // Check if space will be over-utilized
      const maxProjectedUtilization = Math.max(
        ...prediction.projections.map((p: any) => p.predictedUtilization)
      );

      if (maxProjectedUtilization > 85) {
        recommendations.push({
          type: 'CAPACITY_EXPANSION',
          priority: maxProjectedUtilization > 95 ? 'HIGH' : 'MEDIUM',
          spaceId: space.id,
          spaceName: space.name,
          currentCapacity: space.capacity,
          recommendedCapacity: Math.ceil(space.capacity * (maxProjectedUtilization / 80)), // Target 80% utilization
          expectedDate: prediction.projections.find((p: any) => p.predictedUtilization > 85)?.date,
          estimatedCost: this.estimateExpansionCost(space, maxProjectedUtilization),
        });
      }

      // Check for under-utilization opportunities
      const avgProjectedUtilization = prediction.projections.reduce(
        (sum: number, p: any) => sum + p.predictedUtilization, 0
      ) / prediction.projections.length;

      if (avgProjectedUtilization < 40) {
        recommendations.push({
          type: 'SPACE_CONSOLIDATION',
          priority: avgProjectedUtilization < 25 ? 'HIGH' : 'MEDIUM',
          spaceId: space.id,
          spaceName: space.name,
          currentUtilization: avgProjectedUtilization,
          consolidationOpportunity: true,
          potentialSavings: this.estimateConsolidationSavings(space, avgProjectedUtilization),
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate optimization suggestions
   */
  private async generateOptimizationSuggestions(
    organizationId: string,
    historicalData: any[]
  ): Promise<any[]> {
    const suggestions: any[] = [];

    // Analyze space type efficiency
    const spaceTypeAnalysis = new Map<string, { totalSpaces: number; avgUtilization: number; totalArea: number }>();

    historicalData.forEach(record => {
      if (!spaceTypeAnalysis.has(record.type)) {
        spaceTypeAnalysis.set(record.type, { totalSpaces: 0, avgUtilization: 0, totalArea: 0 });
      }
      
      const current = spaceTypeAnalysis.get(record.type)!;
      current.totalSpaces++;
      current.avgUtilization += record.avg_utilization;
      current.totalArea += record.area || 0;
    });

    // Generate suggestions based on analysis
    spaceTypeAnalysis.forEach((analysis, spaceType) => {
      const avgUtilization = analysis.avgUtilization / analysis.totalSpaces;
      
      if (avgUtilization < 30) {
        suggestions.push({
          type: 'SPACE_TYPE_OPTIMIZATION',
          spaceType,
          issue: 'LOW_UTILIZATION',
          suggestion: `Consider converting some ${spaceType} spaces to more in-demand space types`,
          impactArea: analysis.totalArea,
          potentialSavings: analysis.totalArea * 50, // $50 per sq ft annually
        });
      }

      if (avgUtilization > 90) {
        suggestions.push({
          type: 'SPACE_TYPE_EXPANSION',
          spaceType,
          issue: 'HIGH_DEMAND',
          suggestion: `Consider adding more ${spaceType} spaces to meet demand`,
          currentSpaces: analysis.totalSpaces,
          recommendedIncrease: Math.ceil(analysis.totalSpaces * 0.2), // 20% increase
        });
      }
    });

    return suggestions;
  }

  /**
   * Assess space planning risks
   */
  private assessSpacePlanningRisks(predictions: any[]): any {
    const risks = {
      overCapacity: 0,
      underUtilization: 0,
      rapidGrowth: 0,
      volatility: 0,
      overall: 'LOW',
    };

    predictions.forEach(prediction => {
      const maxUtilization = Math.max(...prediction.projections.map((p: any) => p.predictedUtilization));
      const minUtilization = Math.min(...prediction.projections.map((p: any) => p.predictedUtilization));
      const utilizationRange = maxUtilization - minUtilization;

      if (maxUtilization > 95) {risks.overCapacity++;}
      if (minUtilization < 20) {risks.underUtilization++;}
      if (prediction.trendStrength > 2) {risks.rapidGrowth++;}
      if (utilizationRange > 40) {risks.volatility++;}
    });

    // Calculate overall risk
    const totalRisks = risks.overCapacity + risks.underUtilization + risks.rapidGrowth + risks.volatility;
    const riskThreshold = predictions.length * 0.2; // 20% of spaces having issues

    if (totalRisks > riskThreshold * 2) {
      risks.overall = 'HIGH';
    } else if (totalRisks > riskThreshold) {
      risks.overall = 'MEDIUM';
    }

    return risks;
  }

  /**
   * Helper methods for advanced calculations
   */
  private calculateLinearTrend(values: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssRes = values.reduce((sum, val, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { slope, intercept, rSquared };
  }

  private calculateSeasonality(data: any[]): number[] {
    // Simple seasonal decomposition (assumes weekly seasonality)
    const weeklyPatterns = new Array(7).fill(0);
    const weeklyCounts = new Array(7).fill(0);

    data.forEach(record => {
      const dayOfWeek = new Date(record.date).getDay();
      weeklyPatterns[dayOfWeek] += record.avg_utilization;
      weeklyCounts[dayOfWeek]++;
    });

    // Calculate average for each day of week
    const avgPattern = weeklyPatterns.map((sum, i) => 
      weeklyCounts[i] > 0 ? sum / weeklyCounts[i] : 0
    );

    const overallAvg = avgPattern.reduce((sum, val) => sum + val, 0) / 7;
    
    // Return deviations from average
    return avgPattern.map(val => val - overallAvg);
  }

  private estimateExpansionCost(space: any, projectedUtilization: number): number {
    // Basic cost estimation - $200 per sq ft for expansion
    const additionalCapacityNeeded = Math.ceil((projectedUtilization / 80) - 1) * space.capacity;
    const additionalArea = additionalCapacityNeeded * 100; // Assume 100 sq ft per person
    return additionalArea * 200;
  }

  private estimateConsolidationSavings(space: any, utilization: number): number {
    // Estimate annual savings - $50 per sq ft for unused space
    const unusedCapacity = space.capacity * (1 - utilization / 100);
    const unusedArea = unusedCapacity * 100; // Assume 100 sq ft per person
    return unusedArea * 50;
  }

  private async detectUtilizationAnomaly(sensorData: any): Promise<any | null> {
    // Get historical average for this sensor
    const historical = await prisma.spaceUtilization.findMany({
      where: {
        sensorId: sensorData.sensorId,
        recordDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { recordDate: 'desc' },
      take: 100,
    });

    if (historical.length < 10) {return null;} // Need enough data

    const average = historical.reduce((sum, record) => sum + record.value, 0) / historical.length;
    const stdDev = Math.sqrt(
      historical.reduce((sum, record) => sum + Math.pow(record.value - average, 2), 0) / historical.length
    );

    // Check for anomaly (3 sigma rule)
    if (Math.abs(sensorData.value - average) > 3 * stdDev) {
      return {
        type: 'UTILIZATION_ANOMALY',
        severity: sensorData.value > average + 3 * stdDev ? 'HIGH' : 'LOW',
        sensorId: sensorData.sensorId,
        spaceId: sensorData.spaceId,
        currentValue: sensorData.value,
        expectedRange: [average - 2 * stdDev, average + 2 * stdDev],
        timestamp: sensorData.timestamp,
      };
    }

    return null;
  }

  private async generateRealtimeRecommendation(sensorData: any): Promise<any | null> {
    // Simple recommendation logic based on current utilization
    if (sensorData.sensorType === 'OCCUPANCY' && sensorData.value > 90) {
      return {
        type: 'CAPACITY_WARNING',
        message: 'Space is approaching full capacity. Consider directing traffic to alternative spaces.',
        spaceId: sensorData.spaceId,
        currentUtilization: sensorData.value,
        priority: 'MEDIUM',
      };
    }

    if (sensorData.sensorType === 'TEMPERATURE' && (sensorData.value > 26 || sensorData.value < 20)) {
      return {
        type: 'ENVIRONMENTAL_ALERT',
        message: 'Temperature is outside comfortable range. HVAC adjustment may be needed.',
        spaceId: sensorData.spaceId,
        currentValue: sensorData.value,
        unit: sensorData.unit,
        priority: 'LOW',
      };
    }

    return null;
  }

  private emitRealTimeUpdate(data: any): void {
    // In a real implementation, this would emit to WebSocket clients or message queue
    logger.info('Real-time space utilization update', data);
  }

  // Placeholder methods for enterprise insights
  private async getAggregatedOccupancyData(whereClause: any, aggregationLevel: string, timeRange: string): Promise<any> {
    // Implementation would depend on specific aggregation requirements
    return { currentOccupancy: 0, capacityUtilization: 0 };
  }

  private async calculateEmployeeMetrics(organizationId: string, includeSubsidiaries: boolean): Promise<any> {
    // Implementation would calculate total employees across organization
    return { totalEmployees: 0 };
  }

  private async identifyPeakUsagePatterns(organizationId: string, timeRange: string): Promise<any[]> {
    // Implementation would analyze historical patterns
    return [];
  }

  private async identifyCapacityBottlenecks(organizationId: string): Promise<any[]> {
    // Implementation would find spaces with consistent over-utilization
    return [];
  }

  private async calculateExpansionNeeds(organizationId: string, employeeMetrics: any): Promise<any[]> {
    // Implementation would calculate future space needs
    return [];
  }

  private async generateCostOptimizationRecommendations(
    organizationId: string,
    occupancyData: any,
    employeeMetrics: any
  ): Promise<any> {
    // Implementation would generate cost optimization suggestions
    return {};
  }
}