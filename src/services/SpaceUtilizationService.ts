import { prisma } from '../config/database';
import { logger } from '../config/logger';

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
    } catch (error) {
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
    } catch (error) {
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
        if (records.length === 0) continue;

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
    } catch (error) {
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
      ` as any[];

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
    } catch (error) {
      logger.error('Failed to get real-time occupancy', error);
      throw error;
    }
  }

  /**
   * Process sensor data and create utilization records
   */
  async processSensorData(sensorData: {
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
  }[]): Promise<void> {
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
    } catch (error) {
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
    } catch (error) {
      logger.error('Failed to get utilization analytics', error);
      throw error;
    }
  }

  /**
   * Calculate utilization trend using simple linear regression
   */
  private calculateTrend(records: any[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (records.length < 2) return 'STABLE';

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
    if (slope > 0.1) return 'INCREASING';
    if (slope < -0.1) return 'DECREASING';
    return 'STABLE';
  }
}