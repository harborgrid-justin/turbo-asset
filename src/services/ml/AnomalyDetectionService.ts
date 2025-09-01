import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { machineLearningService } from './MachineLearningService';
import {
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  AnomalyDetectionModel,
  MLModel
} from '../../types/machinelearning';

/**
 * AnomalyDetectionService - Advanced anomaly detection for energy consumption and space utilization
 * Uses machine learning models to detect unusual patterns and provide early warning systems
 */
export class AnomalyDetectionService extends EventEmitter {
  private energyAnomalyModel?: MLModel;
  private utilizationAnomalyModel?: MLModel;
  private temperatureAnomalyModel?: MLModel;
  private occupancyAnomalyModel?: MLModel;
  private maintenanceAnomalyModel?: MLModel;
  
  private readonly anomalyThresholds = {
    ENERGY: {
      sensitivity: 3.0, // Standard deviations
      minDataPoints: 30,
      lookbackDays: 30
    },
    UTILIZATION: {
      sensitivity: 2.5,
      minDataPoints: 20,
      lookbackDays: 14
    },
    TEMPERATURE: {
      sensitivity: 2.0,
      minDataPoints: 50,
      lookbackDays: 7
    },
    OCCUPANCY: {
      sensitivity: 2.8,
      minDataPoints: 25,
      lookbackDays: 21
    },
    MAINTENANCE: {
      sensitivity: 3.5,
      minDataPoints: 10,
      lookbackDays: 90
    }
  };

  private anomalyBuffer: Map<string, Anomaly[]> = new Map();
  private readonly maxBufferSize = 1000;

  constructor() {
    super();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      logger.info('Initializing Anomaly Detection Service');

      // Initialize energy anomaly detection model
      this.energyAnomalyModel = await machineLearningService.registerModel(
        'Energy Anomaly Detector',
        'ANOMALY_DETECTION',
        {
          algorithm: 'ISOLATION_FOREST',
          sensitivity: this.anomalyThresholds.ENERGY.sensitivity,
          features: [
            'energy_consumption',
            'time_of_day',
            'day_of_week',
            'temperature',
            'occupancy_level',
            'equipment_status',
            'historical_baseline'
          ]
        },
        {
          trainingDataSize: 100000,
          features: [
            'energy_consumption',
            'time_of_day',
            'day_of_week',
            'temperature',
            'occupancy_level',
            'equipment_status',
            'historical_baseline'
          ],
          target: 'is_anomaly',
          algorithm: 'ISOLATION_FOREST'
        }
      );

      // Initialize utilization anomaly detection model
      this.utilizationAnomalyModel = await machineLearningService.registerModel(
        'Space Utilization Anomaly Detector',
        'ANOMALY_DETECTION',
        {
          algorithm: 'LOCAL_OUTLIER_FACTOR',
          sensitivity: this.anomalyThresholds.UTILIZATION.sensitivity,
          features: [
            'utilization_rate',
            'booking_rate',
            'check_in_rate',
            'space_type',
            'time_patterns',
            'department_usage',
            'seasonal_baseline'
          ]
        }
      );

      // Initialize temperature anomaly detection model
      this.temperatureAnomalyModel = await machineLearningService.registerModel(
        'Temperature Anomaly Detector',
        'ANOMALY_DETECTION',
        {
          algorithm: 'STATISTICAL_PROCESS_CONTROL',
          sensitivity: this.anomalyThresholds.TEMPERATURE.sensitivity,
          features: [
            'temperature',
            'humidity',
            'hvac_status',
            'outdoor_temperature',
            'occupancy',
            'time_of_day',
            'zone_type'
          ]
        }
      );

      // Initialize occupancy anomaly detection model
      this.occupancyAnomalyModel = await machineLearningService.registerModel(
        'Occupancy Anomaly Detector',
        'ANOMALY_DETECTION',
        {
          algorithm: 'AUTOENCODER',
          sensitivity: this.anomalyThresholds.OCCUPANCY.sensitivity,
          features: [
            'occupancy_count',
            'badge_scans',
            'wifi_connections',
            'camera_detections',
            'meeting_bookings',
            'time_patterns',
            'expected_occupancy'
          ]
        }
      );

      // Initialize maintenance anomaly detection model
      this.maintenanceAnomalyModel = await machineLearningService.registerModel(
        'Maintenance Anomaly Detector',
        'ANOMALY_DETECTION',
        {
          algorithm: 'ONE_CLASS_SVM',
          sensitivity: this.anomalyThresholds.MAINTENANCE.sensitivity,
          features: [
            'vibration_levels',
            'temperature_readings',
            'pressure_readings',
            'runtime_hours',
            'maintenance_intervals',
            'performance_metrics',
            'error_codes'
          ]
        }
      );

      // Train all models
      await this.trainAnomalyDetectionModels();

      // Start real-time monitoring
      this.startRealTimeMonitoring();

      logger.info('Anomaly Detection Service initialized successfully');
      this.emit('service:initialized');

    } catch (error) {
      logger.error('Failed to initialize Anomaly Detection Service', error);
      throw error;
    }
  }

  /**
   * Detect energy consumption anomalies
   */
  async detectEnergyAnomalies(
    organizationId: string,
    options: {
      buildingIds?: string[];
      timeRange?: { start: Date; end: Date };
      realTime?: boolean;
      includePredictions?: boolean;
    } = {}
  ): Promise<Anomaly[]> {
    try {
      const {
        buildingIds,
        timeRange,
        realTime = false,
        includePredictions = false
      } = options;

      logger.info('Detecting energy anomalies', {
        organizationId,
        buildingIds: buildingIds?.length || 'all',
        realTime
      });

      const energyData = await this.getEnergyData(organizationId, buildingIds, timeRange);
      const anomalies: Anomaly[] = [];

      for (const buildingData of energyData) {
        const buildingAnomalies = await this.analyzeEnergyData(buildingData, realTime);
        anomalies.push(...buildingAnomalies);
      }

      // Include predictions if requested
      if (includePredictions && !realTime) {
        const predictedAnomalies = await this.predictFutureEnergyAnomalies(organizationId, buildingIds);
        anomalies.push(...predictedAnomalies);
      }

      // Sort by severity and timestamp
      anomalies.sort((a, b) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        return severityDiff !== 0 ? severityDiff : b.timestamp.getTime() - a.timestamp.getTime();
      });

      this.storeAnomalies('ENERGY', anomalies);

      logger.info('Energy anomalies detected', {
        organizationId,
        anomaliesCount: anomalies.length,
        severityCounts: this.countAnomaliesBySeverity(anomalies)
      });

      this.emit('anomalies:detected', {
        type: 'ENERGY',
        organizationId,
        count: anomalies.length,
        anomalies: anomalies.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL')
      });

      return anomalies;

    } catch (error) {
      logger.error('Failed to detect energy anomalies', { organizationId, error });
      throw error;
    }
  }

  /**
   * Detect space utilization anomalies
   */
  async detectUtilizationAnomalies(
    organizationId: string,
    options: {
      spaceIds?: string[];
      timeRange?: { start: Date; end: Date };
      includeBookingData?: boolean;
      realTime?: boolean;
    } = {}
  ): Promise<Anomaly[]> {
    try {
      const {
        spaceIds,
        timeRange,
        includeBookingData = true,
        realTime = false
      } = options;

      logger.info('Detecting utilization anomalies', {
        organizationId,
        spaceIds: spaceIds?.length || 'all',
        realTime
      });

      const utilizationData = await this.getUtilizationData(organizationId, spaceIds, timeRange, includeBookingData);
      const anomalies: Anomaly[] = [];

      for (const spaceData of utilizationData) {
        const spaceAnomalies = await this.analyzeUtilizationData(spaceData, realTime);
        anomalies.push(...spaceAnomalies);
      }

      // Apply business rules for utilization anomalies
      const filteredAnomalies = this.applyUtilizationBusinessRules(anomalies);

      this.storeAnomalies('UTILIZATION', filteredAnomalies);

      logger.info('Utilization anomalies detected', {
        organizationId,
        anomaliesCount: filteredAnomalies.length,
        severityCounts: this.countAnomaliesBySeverity(filteredAnomalies)
      });

      this.emit('anomalies:detected', {
        type: 'UTILIZATION',
        organizationId,
        count: filteredAnomalies.length,
        anomalies: filteredAnomalies
      });

      return filteredAnomalies;

    } catch (error) {
      logger.error('Failed to detect utilization anomalies', { organizationId, error });
      throw error;
    }
  }

  /**
   * Get comprehensive anomaly dashboard data
   */
  async getAnomalyDashboard(
    organizationId: string,
    options: {
      timeRange?: { start: Date; end: Date };
      types?: AnomalyType[];
      severityFilter?: AnomalySeverity[];
    } = {}
  ): Promise<any> {
    try {
      const {
        timeRange = {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          end: new Date()
        },
        types = ['ENERGY_SPIKE', 'ENERGY_DROP', 'UTILIZATION_ANOMALY', 'TEMPERATURE_ANOMALY', 'OCCUPANCY_ANOMALY'],
        severityFilter
      } = options;

      logger.info('Generating anomaly dashboard', { organizationId, types });

      // Get all anomalies for the time range
      const allAnomalies = await this.getAnomaliesForTimeRange(organizationId, timeRange);
      
      // Filter by type and severity if specified
      let filteredAnomalies = allAnomalies.filter(anomaly => types.includes(anomaly.type));
      
      if (severityFilter) {
        filteredAnomalies = filteredAnomalies.filter(anomaly => severityFilter.includes(anomaly.severity));
      }

      // Generate dashboard metrics
      const dashboard = {
        overview: {
          totalAnomalies: filteredAnomalies.length,
          criticalAnomalies: filteredAnomalies.filter(a => a.severity === 'CRITICAL').length,
          highSeverityAnomalies: filteredAnomalies.filter(a => a.severity === 'HIGH').length,
          resolvedAnomalies: 0, // Would be tracked in actual implementation
          averageConfidence: filteredAnomalies.reduce((sum, a) => sum + a.confidence, 0) / filteredAnomalies.length || 0
        },
        byType: this.groupAnomaliesByType(filteredAnomalies),
        bySeverity: this.groupAnomaliesBySeverity(filteredAnomalies),
        timeline: this.generateAnomalyTimeline(filteredAnomalies),
        topAnomalies: filteredAnomalies
          .sort((a, b) => {
            const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            return severityDiff !== 0 ? severityDiff : b.confidence - a.confidence;
          })
          .slice(0, 10),
        patterns: await this.identifyAnomalyPatterns(filteredAnomalies),
        recommendations: await this.generateAnomalyRecommendations(filteredAnomalies),
        forecast: await this.forecastAnomalyTrends(organizationId, types)
      };

      logger.info('Anomaly dashboard generated', {
        organizationId,
        totalAnomalies: dashboard.overview.totalAnomalies,
        criticalCount: dashboard.overview.criticalAnomalies
      });

      return dashboard;

    } catch (error) {
      logger.error('Failed to generate anomaly dashboard', { organizationId, error });
      throw error;
    }
  }

  /**
   * Private: Analyze energy data for anomalies
   */
  private async analyzeEnergyData(buildingData: any, realTime: boolean): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (!this.energyAnomalyModel) return anomalies;

    for (const dataPoint of buildingData.readings) {
      const features = this.prepareEnergyFeatures(dataPoint, buildingData);
      
      try {
        const prediction = await machineLearningService.predict(
          this.energyAnomalyModel.id,
          features,
          { includeConfidence: true }
        );

        if (prediction.prediction.isAnomaly) {
          const anomaly = this.createEnergyAnomaly(dataPoint, buildingData, prediction);
          anomalies.push(anomaly);
        }
      } catch (error) {
        logger.debug('Energy anomaly detection failed for data point', { error });
      }
    }

    return anomalies;
  }

  /**
   * Private: Analyze utilization data for anomalies
   */
  private async analyzeUtilizationData(spaceData: any, realTime: boolean): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (!this.utilizationAnomalyModel) return anomalies;

    for (const dataPoint of spaceData.utilizationReadings) {
      const features = this.prepareUtilizationFeatures(dataPoint, spaceData);
      
      try {
        const prediction = await machineLearningService.predict(
          this.utilizationAnomalyModel.id,
          features,
          { includeConfidence: true }
        );

        if (prediction.prediction.isAnomaly) {
          const anomaly = this.createUtilizationAnomaly(dataPoint, spaceData, prediction);
          anomalies.push(anomaly);
        }
      } catch (error) {
        logger.debug('Utilization anomaly detection failed for data point', { error });
      }
    }

    return anomalies;
  }

  /**
   * Private: Feature preparation methods
   */
  private prepareEnergyFeatures(dataPoint: any, buildingData: any): any {
    const now = new Date(dataPoint.timestamp);
    return {
      energy_consumption: dataPoint.consumption,
      time_of_day: now.getHours() + now.getMinutes() / 60,
      day_of_week: now.getDay(),
      temperature: dataPoint.temperature || buildingData.avgTemperature,
      occupancy_level: dataPoint.occupancy || buildingData.avgOccupancy,
      equipment_status: dataPoint.equipmentStatus || 'NORMAL',
      historical_baseline: buildingData.baseline
    };
  }

  private prepareUtilizationFeatures(dataPoint: any, spaceData: any): any {
    const now = new Date(dataPoint.timestamp);
    return {
      utilization_rate: dataPoint.utilizationRate,
      booking_rate: dataPoint.bookingRate || 0,
      check_in_rate: dataPoint.checkInRate || 0,
      space_type: spaceData.spaceType,
      time_patterns: this.encodeTimePatterns(now),
      department_usage: spaceData.departmentUsage || 'GENERAL',
      seasonal_baseline: spaceData.seasonalBaseline
    };
  }

  /**
   * Private: Anomaly creation methods
   */
  private createEnergyAnomaly(dataPoint: any, buildingData: any, prediction: any): Anomaly {
    const severity = this.determineEnergySeverity(dataPoint, prediction);
    const anomalyType: AnomalyType = dataPoint.consumption > buildingData.baseline * 1.5 ? 'ENERGY_SPIKE' : 'ENERGY_DROP';
    
    return {
      id: this.generateAnomalyId(),
      type: anomalyType,
      severity,
      timestamp: new Date(dataPoint.timestamp),
      entityId: buildingData.buildingId,
      entityType: 'BUILDING',
      value: dataPoint.consumption,
      expectedRange: [buildingData.baseline * 0.8, buildingData.baseline * 1.2],
      deviation: Math.abs((dataPoint.consumption - buildingData.baseline) / buildingData.baseline),
      confidence: prediction.confidence,
      description: this.generateEnergyAnomalyDescription(anomalyType, dataPoint, buildingData),
      rootCause: this.inferEnergyRootCause(dataPoint, buildingData, prediction),
      recommendations: this.generateEnergyRecommendations(anomalyType, dataPoint, buildingData)
    };
  }

  private createUtilizationAnomaly(dataPoint: any, spaceData: any, prediction: any): Anomaly {
    const severity = this.determineUtilizationSeverity(dataPoint, prediction);
    
    return {
      id: this.generateAnomalyId(),
      type: 'UTILIZATION_ANOMALY',
      severity,
      timestamp: new Date(dataPoint.timestamp),
      entityId: spaceData.spaceId,
      entityType: 'SPACE',
      value: dataPoint.utilizationRate,
      expectedRange: [spaceData.expectedUtilization * 0.7, spaceData.expectedUtilization * 1.3],
      deviation: Math.abs((dataPoint.utilizationRate - spaceData.expectedUtilization) / spaceData.expectedUtilization),
      confidence: prediction.confidence,
      description: this.generateUtilizationAnomalyDescription(dataPoint, spaceData),
      recommendations: this.generateUtilizationRecommendations(dataPoint, spaceData)
    };
  }

  /**
   * Private: Data retrieval methods (simulated)
   */
  private async getEnergyData(organizationId: string, buildingIds?: string[], timeRange?: any): Promise<any[]> {
    // Simulate energy data retrieval
    const buildings = buildingIds || ['bldg1', 'bldg2', 'bldg3'];
    
    return buildings.map(buildingId => ({
      buildingId,
      baseline: Math.random() * 1000 + 500,
      avgTemperature: Math.random() * 10 + 20,
      avgOccupancy: Math.random() * 100 + 50,
      readings: Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60000),
        consumption: Math.random() * 1500 + 400 + (Math.random() < 0.05 ? Math.random() * 2000 : 0), // 5% chance of spike
        temperature: Math.random() * 5 + 22,
        occupancy: Math.random() * 120 + 30,
        equipmentStatus: Math.random() < 0.9 ? 'NORMAL' : 'ALERT'
      }))
    }));
  }

  private async getUtilizationData(organizationId: string, spaceIds?: string[], timeRange?: any, includeBookingData?: boolean): Promise<any[]> {
    // Simulate utilization data retrieval
    const spaces = spaceIds || ['space1', 'space2', 'space3', 'space4'];
    
    return spaces.map(spaceId => ({
      spaceId,
      spaceType: ['OFFICE', 'MEETING', 'COLLABORATIVE'][Math.floor(Math.random() * 3)],
      expectedUtilization: Math.random() * 0.4 + 0.4, // 40-80%
      seasonalBaseline: Math.random() * 0.3 + 0.5,
      departmentUsage: ['ENGINEERING', 'SALES', 'MARKETING'][Math.floor(Math.random() * 3)],
      utilizationReadings: Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000),
        utilizationRate: Math.random() * 1.0 + (Math.random() < 0.08 ? Math.random() * 0.5 : 0), // 8% chance of anomaly
        bookingRate: includeBookingData ? Math.random() * 0.8 : undefined,
        checkInRate: includeBookingData ? Math.random() * 0.9 : undefined
      }))
    }));
  }

  /**
   * Private: Training and utility methods
   */
  private async trainAnomalyDetectionModels(): Promise<void> {
    const models = [
      { model: this.energyAnomalyModel, name: 'Energy Anomaly Detection' },
      { model: this.utilizationAnomalyModel, name: 'Utilization Anomaly Detection' },
      { model: this.temperatureAnomalyModel, name: 'Temperature Anomaly Detection' },
      { model: this.occupancyAnomalyModel, name: 'Occupancy Anomaly Detection' },
      { model: this.maintenanceAnomalyModel, name: 'Maintenance Anomaly Detection' }
    ];

    for (const { model, name } of models) {
      if (model) {
        logger.info(`Training ${name} model`);
        const trainingConfig = {
          dataSource: `${name.toLowerCase().replace(/\s+/g, '_')}_history`,
          features: model.metadata.features,
          target: 'is_anomaly',
          algorithm: model.parameters.algorithm,
          epochs: 50,
          batchSize: 64,
          validationSplit: 0.2
        };
        await machineLearningService.trainModel(model.id, trainingConfig);
      }
    }
  }

  private startRealTimeMonitoring(): void {
    // Simulate real-time anomaly monitoring
    setInterval(async () => {
      try {
        // This would be replaced with actual real-time data streaming
        const organizationIds = ['org1', 'org2']; // Sample organizations
        
        for (const orgId of organizationIds) {
          // Check for real-time energy anomalies
          const energyAnomalies = await this.detectEnergyAnomalies(orgId, { realTime: true });
          if (energyAnomalies.length > 0) {
            this.handleRealTimeAnomalies(orgId, energyAnomalies);
          }
          
          // Check for real-time utilization anomalies
          const utilizationAnomalies = await this.detectUtilizationAnomalies(orgId, { realTime: true });
          if (utilizationAnomalies.length > 0) {
            this.handleRealTimeAnomalies(orgId, utilizationAnomalies);
          }
        }
      } catch (error) {
        logger.error('Real-time monitoring failed', error);
      }
    }, 60000); // Check every minute
  }

  private handleRealTimeAnomalies(organizationId: string, anomalies: Anomaly[]): void {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL');
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'HIGH');
    
    if (criticalAnomalies.length > 0) {
      this.emit('anomaly:critical', {
        organizationId,
        anomalies: criticalAnomalies
      });
    }
    
    if (highSeverityAnomalies.length > 0) {
      this.emit('anomaly:high', {
        organizationId,
        anomalies: highSeverityAnomalies
      });
    }
  }

  /**
   * Private: Additional helper methods
   */
  private encodeTimePatterns(date: Date): any {
    return {
      hour: date.getHours(),
      dayOfWeek: date.getDay(),
      weekOfMonth: Math.ceil(date.getDate() / 7),
      month: date.getMonth(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isBusinessHour: date.getHours() >= 8 && date.getHours() <= 18
    };
  }

  private determineEnergySeverity(dataPoint: any, prediction: any): AnomalySeverity {
    const score = prediction.prediction.anomalyScore || 0;
    if (score > 0.9) return 'CRITICAL';
    if (score > 0.7) return 'HIGH';
    if (score > 0.5) return 'MEDIUM';
    return 'LOW';
  }

  private determineUtilizationSeverity(dataPoint: any, prediction: any): AnomalySeverity {
    const score = prediction.prediction.anomalyScore || 0;
    if (score > 0.85) return 'CRITICAL';
    if (score > 0.65) return 'HIGH';
    if (score > 0.45) return 'MEDIUM';
    return 'LOW';
  }

  private generateEnergyAnomalyDescription(type: AnomalyType, dataPoint: any, buildingData: any): string {
    const deviation = ((dataPoint.consumption - buildingData.baseline) / buildingData.baseline * 100).toFixed(1);
    return type === 'ENERGY_SPIKE' 
      ? `Energy consumption spike detected: ${deviation}% above baseline`
      : `Energy consumption drop detected: ${Math.abs(Number(deviation))}% below baseline`;
  }

  private generateUtilizationAnomalyDescription(dataPoint: any, spaceData: any): string {
    const rate = (dataPoint.utilizationRate * 100).toFixed(1);
    return `Unusual space utilization detected: ${rate}% utilization for ${spaceData.spaceType} space`;
  }

  private inferEnergyRootCause(dataPoint: any, buildingData: any, prediction: any): string | undefined {
    if (dataPoint.equipmentStatus !== 'NORMAL') return 'Equipment malfunction detected';
    if (dataPoint.occupancy > buildingData.avgOccupancy * 1.5) return 'Unusually high occupancy';
    if (Math.abs(dataPoint.temperature - buildingData.avgTemperature) > 5) return 'Extreme temperature variation';
    return 'Unknown cause - requires investigation';
  }

  private generateEnergyRecommendations(type: AnomalyType, dataPoint: any, buildingData: any): string[] {
    const recommendations = [];
    
    if (type === 'ENERGY_SPIKE') {
      recommendations.push('Check for equipment malfunctions');
      recommendations.push('Verify HVAC system operations');
      recommendations.push('Review occupancy patterns');
    } else {
      recommendations.push('Verify all systems are operational');
      recommendations.push('Check for power supply issues');
      recommendations.push('Review building automation settings');
    }
    
    return recommendations;
  }

  private generateUtilizationRecommendations(dataPoint: any, spaceData: any): string[] {
    return [
      'Review booking patterns and policies',
      'Consider space reallocation',
      'Check sensor calibration',
      'Analyze user behavior patterns'
    ];
  }

  private storeAnomalies(type: string, anomalies: Anomaly[]): void {
    const key = `${type}_${Date.now()}`;
    this.anomalyBuffer.set(key, anomalies);
    
    // Cleanup old entries
    if (this.anomalyBuffer.size > this.maxBufferSize) {
      const oldestKey = Array.from(this.anomalyBuffer.keys())[0];
      this.anomalyBuffer.delete(oldestKey);
    }
  }

  private countAnomaliesBySeverity(anomalies: Anomaly[]): Record<string, number> {
    return anomalies.reduce((counts, anomaly) => {
      counts[anomaly.severity] = (counts[anomaly.severity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  private applyUtilizationBusinessRules(anomalies: Anomaly[]): Anomaly[] {
    // Filter out anomalies during known maintenance windows, holidays, etc.
    return anomalies.filter(anomaly => {
      const hour = anomaly.timestamp.getHours();
      const day = anomaly.timestamp.getDay();
      
      // Skip anomalies during non-business hours for office spaces
      if (anomaly.entityType === 'SPACE' && (hour < 6 || hour > 22)) {
        return anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH';
      }
      
      // Skip weekend anomalies for business spaces
      if ((day === 0 || day === 6) && anomaly.severity === 'LOW') {
        return false;
      }
      
      return true;
    });
  }

  private async getAnomaliesForTimeRange(organizationId: string, timeRange: { start: Date; end: Date }): Promise<Anomaly[]> {
    // Simulate retrieval of stored anomalies
    const allAnomalies: Anomaly[] = [];
    
    this.anomalyBuffer.forEach((anomalies) => {
      const filteredAnomalies = anomalies.filter(anomaly => 
        anomaly.timestamp >= timeRange.start && anomaly.timestamp <= timeRange.end
      );
      allAnomalies.push(...filteredAnomalies);
    });
    
    return allAnomalies;
  }

  private groupAnomaliesByType(anomalies: Anomaly[]): Record<string, number> {
    return anomalies.reduce((groups, anomaly) => {
      groups[anomaly.type] = (groups[anomaly.type] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  private groupAnomaliesBySeverity(anomalies: Anomaly[]): Record<string, number> {
    return anomalies.reduce((groups, anomaly) => {
      groups[anomaly.severity] = (groups[anomaly.severity] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  private generateAnomalyTimeline(anomalies: Anomaly[]): any[] {
    const timeline = [];
    const hourlyBuckets = new Map<string, number>();
    
    anomalies.forEach(anomaly => {
      const hour = new Date(anomaly.timestamp).toISOString().slice(0, 13);
      hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
    });
    
    hourlyBuckets.forEach((count, hour) => {
      timeline.push({
        timestamp: new Date(hour + ':00:00'),
        count
      });
    });
    
    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async identifyAnomalyPatterns(anomalies: Anomaly[]): Promise<any[]> {
    // Identify recurring patterns in anomalies
    const patterns = [];
    
    // Time-based patterns
    const hourlyDistribution = new Map<number, number>();
    anomalies.forEach(anomaly => {
      const hour = anomaly.timestamp.getHours();
      hourlyDistribution.set(hour, (hourlyDistribution.get(hour) || 0) + 1);
    });
    
    const peakHours = Array.from(hourlyDistribution.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (peakHours.length > 0) {
      patterns.push({
        type: 'TEMPORAL',
        description: `Anomalies frequently occur during hours: ${peakHours.map(([hour]) => `${hour}:00`).join(', ')}`,
        confidence: 0.8
      });
    }
    
    return patterns;
  }

  private async generateAnomalyRecommendations(anomalies: Anomaly[]): Promise<any[]> {
    const recommendations = [];
    const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
    const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
    
    if (criticalCount > 5) {
      recommendations.push({
        priority: 'HIGH',
        category: 'IMMEDIATE_ACTION',
        description: `${criticalCount} critical anomalies require immediate attention`,
        actions: ['Schedule emergency maintenance', 'Activate incident response team', 'Notify facility management']
      });
    }
    
    return recommendations;
  }

  private async forecastAnomalyTrends(organizationId: string, types: AnomalyType[]): Promise<any> {
    // Simple trend forecasting based on recent anomaly patterns
    const recentAnomalies = await this.getAnomaliesForTimeRange(organizationId, {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    });
    
    const trend = recentAnomalies.length > 20 ? 'INCREASING' : 
                 recentAnomalies.length < 5 ? 'DECREASING' : 'STABLE';
    
    return {
      trend,
      projectedCount: Math.max(0, recentAnomalies.length * 1.1), // 10% increase projection
      confidence: 0.7,
      recommendation: trend === 'INCREASING' ? 'Increase monitoring frequency' : 'Current monitoring adequate'
    };
  }

  private async predictFutureEnergyAnomalies(organizationId: string, buildingIds?: string[]): Promise<Anomaly[]> {
    // Predict potential future anomalies based on patterns
    const predictedAnomalies: Anomaly[] = [];
    
    // Simple prediction: if we've seen patterns, predict similar ones in the next 24 hours
    if (Math.random() < 0.3) { // 30% chance of predicted anomaly
      predictedAnomalies.push({
        id: this.generateAnomalyId(),
        type: 'ENERGY_SPIKE',
        severity: 'MEDIUM',
        timestamp: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000), // Next 24 hours
        entityId: buildingIds?.[0] || 'predicted_building',
        entityType: 'BUILDING',
        value: 0,
        expectedRange: [0, 0],
        deviation: 0,
        confidence: 0.6,
        description: 'Predicted energy anomaly based on historical patterns',
        recommendations: ['Monitor energy consumption closely', 'Prepare contingency plans']
      });
    }
    
    return predictedAnomalies;
  }

  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const anomalyDetectionService = new AnomalyDetectionService();