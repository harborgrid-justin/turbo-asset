import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface IoTDeviceData {
  deviceId?: string;
  deviceName: string;
  deviceType: string;
  manufacturer?: string;
  model?: string;
  firmware?: string;
  assetId?: string;
  location: string;
  building?: string;
  floor?: string;
  coordinates?: string;
  ipAddress?: string;
  macAddress?: string;
  networkType: string;
  sensorTypes: string[];
  samplingRate?: number;
  reportingInterval?: number;
  alertThresholds?: any;
  alertsEnabled?: boolean;
  organizationId: string;
  installedBy?: string;
}

export interface SensorReadingData {
  deviceId: string;
  sensorType: string;
  value: number;
  unit: string;
  rawValue?: number;
  calibrationOffset?: number;
  temperature?: number;
  humidity?: number;
  quality?: string;
}

export interface ConditionMonitoringData {
  deviceId: string;
  assetId?: string;
  monitoringType: string;
  overallCondition: string;
  healthScore: number;
  riskScore: number;
  trendDirection: string;
  changeRate?: number;
  predictedFailureDate?: Date;
  confidenceLevel?: number;
  remainingUsefulLife?: number;
  alertLevel: string;
  recommendedAction: string;
  urgencyLevel: string;
  analysisMethod?: string;
  dataPoints?: number;
  anomalies?: string[];
  recommendations?: string[];
}

export interface IoTMetrics {
  totalDevices: number;
  activeDevices: number;
  offlineDevices: number;
  devicesByType: { [type: string]: number };
  devicesByStatus: { [status: string]: number };
  networkHealth: {
    averageSignalStrength: number;
    connectivityRate: number;
    averageBatteryLevel: number;
  };
  dataMetrics: {
    totalReadingsToday: number;
    dataPointsPerHour: number;
    anomaliesDetected: number;
    alertsGenerated: number;
  };
  conditionMonitoring: {
    assetsMonitored: number;
    criticalAlerts: number;
    warningAlerts: number;
    predictiveAlerts: number;
  };
  sensorCoverage: { [sensorType: string]: number };
}

export interface AlertRule {
  deviceId?: string;
  sensorType: string;
  condition: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'RANGE' | 'TREND';
  threshold: number;
  upperThreshold?: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFORMATIONAL';
  description: string;
  enabled: boolean;
}

export interface PredictiveMaintenanceInsight {
  assetId: string;
  assetName: string;
  deviceId: string;
  currentCondition: string;
  healthScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predictedFailureWindow: {
    earliest: Date;
    mostLikely: Date;
    latest: Date;
  };
  remainingUsefulLife: number; // days
  confidenceLevel: number; // 0-100
  recommendedActions: Array<{
    action: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    estimatedCost: number;
    timeframe: string;
  }>;
  trendAnalysis: {
    direction: 'IMPROVING' | 'STABLE' | 'DECLINING';
    changeRate: number;
    keyIndicators: string[];
  };
}

/**
 * IoTDeviceService - Comprehensive IoT device and condition monitoring
 * Handles device management, sensor data processing, and predictive analytics
 * Supports multiple sensor types and advanced condition monitoring
 */
export class IoTDeviceService {

  /**
   * Register new IoT device
   */
  async registerIoTDevice(deviceData: IoTDeviceData): Promise<any> {
    try {
      // Generate device ID if not provided
      if (!deviceData.deviceId) {
        deviceData.deviceId = await this.generateDeviceId(deviceData.organizationId, deviceData.deviceType);
      }

      const device = await prisma.ioTDevice.create({
        data: {
          deviceId: deviceData.deviceId,
          deviceName: deviceData.deviceName,
          deviceType: deviceData.deviceType as any,
          manufacturer: deviceData.manufacturer,
          model: deviceData.model,
          firmware: deviceData.firmware,
          assetId: deviceData.assetId,
          location: deviceData.location,
          building: deviceData.building,
          floor: deviceData.floor,
          coordinates: deviceData.coordinates,
          ipAddress: deviceData.ipAddress,
          macAddress: deviceData.macAddress,
          networkType: deviceData.networkType as any,
          status: 'ACTIVE',
          isOnline: false,
          sensorTypes: deviceData.sensorTypes as any[],
          samplingRate: deviceData.samplingRate,
          reportingInterval: deviceData.reportingInterval,
          alertThresholds: deviceData.alertThresholds,
          alertsEnabled: deviceData.alertsEnabled !== false,
          organizationId: deviceData.organizationId,
          installedBy: deviceData.installedBy,
        },
        include: {
          asset: true,
        },
      });

      // Create default alert rules for common sensor types
      await this.createDefaultAlertRules(device.id, deviceData.sensorTypes);

      logger.info('IoT device registered', {
        deviceId: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
      });

      return device;
    } catch (error: unknown) {
      logger.error('Failed to register IoT device', error);
      throw error;
    }
  }

  /**
   * Record sensor reading
   */
  async recordSensorReading(readingData: SensorReadingData): Promise<any> {
    try {
      // Get device information
      const device = await prisma.ioTDevice.findUnique({
        where: { deviceId: readingData.deviceId },
      });

      if (!device) {
        throw new Error('IoT device not found');
      }

      // Apply calibration if provided
      const calibratedValue = readingData.calibrationOffset 
        ? readingData.value + readingData.calibrationOffset
        : readingData.value;

      // Determine quality based on basic validation
      const quality = this.validateReadingQuality(
        readingData.sensorType,
        calibratedValue,
        readingData.temperature,
        readingData.humidity
      );

      const reading = await prisma.ioTSensorReading.create({
        data: {
          deviceId: device.id,
          sensorType: readingData.sensorType as any,
          value: calibratedValue,
          unit: readingData.unit,
          rawValue: readingData.rawValue || readingData.value,
          quality: quality as any,
          isValid: quality === 'GOOD',
          calibrationOffset: readingData.calibrationOffset,
          temperature: readingData.temperature,
          humidity: readingData.humidity,
        },
      });

      // Update device status
      await prisma.ioTDevice.update({
        where: { id: device.id },
        data: {
          isOnline: true,
          lastSeen: new Date(),
        },
      });

      // Check alert conditions
      await this.checkAlertConditions(device.id, readingData.sensorType, calibratedValue);

      // Update condition monitoring if applicable
      if (device.assetId) {
        await this.updateConditionMonitoring(device.id, device.assetId);
      }

      logger.debug('Sensor reading recorded', {
        deviceId: device.deviceId,
        sensorType: readingData.sensorType,
        value: calibratedValue,
        quality,
      });

      return reading;
    } catch (error: unknown) {
      logger.error('Failed to record sensor reading', error);
      throw error;
    }
  }

  /**
   * Update condition monitoring analysis
   */
  async updateConditionMonitoring(deviceId: string, assetId?: string): Promise<any> {
    try {
      const device = await prisma.ioTDevice.findUnique({
        where: { id: deviceId },
        include: {
          sensorReadings: {
            orderBy: { timestamp: 'desc' },
            take: 100, // Last 100 readings for analysis
          },
          asset: true,
        },
      });

      if (!device || device.sensorReadings.length === 0) {
        return null;
      }

      // Analyze sensor data to determine condition
      const analysis = this.analyzeConditionData(device.sensorReadings, device.sensorTypes);

      const conditionMonitoring = await prisma.conditionMonitoring.create({
        data: {
          deviceId: device.id,
          assetId: assetId || device.assetId,
          monitoringType: this.determineMonitoringType(device.deviceType, device.sensorTypes),
          overallCondition: analysis.overallCondition as any,
          healthScore: analysis.healthScore,
          riskScore: analysis.riskScore,
          trendDirection: analysis.trendDirection as any,
          changeRate: analysis.changeRate,
          predictedFailureDate: analysis.predictedFailureDate,
          confidenceLevel: analysis.confidenceLevel,
          remainingUsefulLife: analysis.remainingUsefulLife,
          alertLevel: analysis.alertLevel as any,
          recommendedAction: analysis.recommendedAction as any,
          urgencyLevel: analysis.urgencyLevel as any,
          analysisMethod: analysis.analysisMethod,
          dataPoints: device.sensorReadings.length,
          anomalies: analysis.anomalies,
          recommendations: analysis.recommendations,
        },
      });

      logger.info('Condition monitoring updated', {
        deviceId: device.deviceId,
        assetId: assetId || device.assetId,
        healthScore: analysis.healthScore,
        alertLevel: analysis.alertLevel,
      });

      return conditionMonitoring;
    } catch (error: unknown) {
      logger.error('Failed to update condition monitoring', { deviceId, error });
      throw error;
    }
  }

  /**
   * Get IoT metrics and analytics
   */
  async getIoTMetrics(organizationId: string): Promise<IoTMetrics> {
    try {
      const [
        totalDevices,
        devicesByType,
        devicesByStatus,
        activeDevices,
        offlineDevices,
        networkMetrics,
        todayReadings,
        recentReadings,
        anomalies,
        alerts,
        conditionMetrics,
        sensorCoverage,
      ] = await Promise.all([
        // Total devices
        prisma.ioTDevice.count({
          where: { organizationId },
        }),

        // Devices by type
        prisma.ioTDevice.groupBy({
          by: ['deviceType'],
          where: { organizationId },
          _count: true,
        }),

        // Devices by status
        prisma.ioTDevice.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),

        // Active devices
        prisma.ioTDevice.count({
          where: { organizationId, isOnline: true },
        }),

        // Offline devices
        prisma.ioTDevice.count({
          where: { organizationId, isOnline: false },
        }),

        // Network metrics
        prisma.ioTDevice.aggregate({
          where: { organizationId, isOnline: true },
          _avg: {
            signalStrength: true,
            batteryLevel: true,
          },
        }),

        // Today's readings
        prisma.ioTSensorReading.count({
          where: {
            device: { organizationId },
            timestamp: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),

        // Recent readings for data rate calculation
        prisma.ioTSensorReading.count({
          where: {
            device: { organizationId },
            timestamp: {
              gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
            },
          },
        }),

        // Anomalies detected today
        prisma.ioTSensorReading.count({
          where: {
            device: { organizationId },
            quality: 'BAD',
            timestamp: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),

        // Alerts generated today (simplified - would need alert table)
        prisma.conditionMonitoring.count({
          where: {
            device: { organizationId },
            alertLevel: { in: ['CRITICAL', 'WARNING'] },
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),

        // Condition monitoring metrics
        prisma.conditionMonitoring.groupBy({
          by: ['alertLevel'],
          where: {
            device: { organizationId },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          _count: true,
        }),

        // Sensor coverage
        prisma.ioTDevice.findMany({
          where: { organizationId },
          select: { sensorTypes: true },
        }),
      ]);

      // Process grouped results
      const typeBreakdown: { [type: string]: number } = {};
      devicesByType.forEach((group) => {
        typeBreakdown[group.deviceType] = group._count;
      });

      const statusBreakdown: { [status: string]: number } = {};
      devicesByStatus.forEach((group) => {
        statusBreakdown[group.status] = group._count;
      });

      const conditionBreakdown: { [level: string]: number } = {};
      conditionMetrics.forEach((group) => {
        conditionBreakdown[group.alertLevel] = group._count;
      });

      // Calculate sensor coverage
      const sensorCounts: { [type: string]: number } = {};
      sensorCoverage.forEach(device => {
        device.sensorTypes.forEach(sensorType => {
          sensorCounts[sensorType] = (sensorCounts[sensorType] || 0) + 1;
        });
      });

      // Calculate connectivity rate
      const connectivityRate = totalDevices > 0 ? (activeDevices / totalDevices) * 100 : 0;

      return {
        totalDevices,
        activeDevices,
        offlineDevices,
        devicesByType: typeBreakdown,
        devicesByStatus: statusBreakdown,
        networkHealth: {
          averageSignalStrength: networkMetrics._avg.signalStrength || 0,
          connectivityRate,
          averageBatteryLevel: networkMetrics._avg.batteryLevel || 0,
        },
        dataMetrics: {
          totalReadingsToday: todayReadings,
          dataPointsPerHour: recentReadings,
          anomaliesDetected: anomalies,
          alertsGenerated: alerts,
        },
        conditionMonitoring: {
          assetsMonitored: await prisma.ioTDevice.count({
            where: { organizationId, assetId: { not: null } },
          }),
          criticalAlerts: conditionBreakdown['CRITICAL'] || 0,
          warningAlerts: conditionBreakdown['WARNING'] || 0,
          predictiveAlerts: conditionBreakdown['INFORMATIONAL'] || 0,
        },
        sensorCoverage: sensorCounts,
      };
    } catch (error: unknown) {
      logger.error('Failed to get IoT metrics', { organizationId, error });
      throw error;
    }
  }

  /**
   * Generate predictive maintenance insights
   */
  async generatePredictiveMaintenanceInsights(
    organizationId: string,
    assetIds?: string[]
  ): Promise<PredictiveMaintenanceInsight[]> {
    try {
      const whereCondition: any = {
        organizationId,
        assetId: { not: null },
      };

      if (assetIds && assetIds.length > 0) {
        whereCondition.assetId = { in: assetIds };
      }

      const devices = await prisma.ioTDevice.findMany({
        where: whereCondition,
        include: {
          asset: {
            select: {
              id: true,
              assetName: true,
              condition: true,
            },
          },
          sensorReadings: {
            orderBy: { timestamp: 'desc' },
            take: 200, // More readings for better analysis
          },
          conditionMonitoring: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const insights: PredictiveMaintenanceInsight[] = [];

      for (const device of devices) {
        if (!device.asset || device.sensorReadings.length < 20) {continue;}

        const latestCondition = device.conditionMonitoring[0];
        if (!latestCondition) {continue;}

        // Perform time series analysis
        const timeSeriesAnalysis = this.performTimeSeriesAnalysis(device.sensorReadings);

        // Calculate failure prediction
        const failurePrediction = this.predictFailure(
          device.sensorReadings,
          device.sensorTypes,
          timeSeriesAnalysis
        );

        // Generate recommendations
        const recommendations = this.generateMaintenanceRecommendations(
          device.asset,
          latestCondition,
          failurePrediction
        );

        insights.push({
          assetId: device.asset.id,
          assetName: device.asset.assetName,
          deviceId: device.deviceId,
          currentCondition: device.asset.condition,
          healthScore: latestCondition.healthScore,
          riskLevel: this.determineRiskLevel(latestCondition.riskScore),
          predictedFailureWindow: failurePrediction.window,
          remainingUsefulLife: failurePrediction.remainingUsefulLife,
          confidenceLevel: failurePrediction.confidence,
          recommendedActions: recommendations,
          trendAnalysis: timeSeriesAnalysis,
        });
      }

      // Sort by risk level and health score
      insights.sort((a, b) => {
        const riskOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        return riskDiff !== 0 ? riskDiff : a.healthScore - b.healthScore;
      });

      logger.info('Predictive maintenance insights generated', {
        organizationId,
        totalInsights: insights.length,
        criticalAssets: insights.filter(i => i.riskLevel === 'CRITICAL').length,
      });

      return insights;
    } catch (error: unknown) {
      logger.error('Failed to generate predictive maintenance insights', { organizationId, error });
      throw error;
    }
  }

  /**
   * Configure alert rules for device
   */
  async configureAlertRules(deviceId: string, rules: AlertRule[]): Promise<void> {
    try {
      const device = await prisma.ioTDevice.findUnique({
        where: { id: deviceId },
      });

      if (!device) {
        throw new Error('Device not found');
      }

      // Convert rules to JSON format for storage
      const alertThresholds = rules.reduce((acc, rule) => {
        acc[`${rule.sensorType}_${rule.condition}`] = {
          threshold: rule.threshold,
          upperThreshold: rule.upperThreshold,
          severity: rule.severity,
          description: rule.description,
          enabled: rule.enabled,
        };
        return acc;
      }, {} as any);

      await prisma.ioTDevice.update({
        where: { id: deviceId },
        data: { alertThresholds },
      });

      logger.info('Alert rules configured', {
        deviceId: device.deviceId,
        rulesCount: rules.length,
      });
    } catch (error: unknown) {
      logger.error('Failed to configure alert rules', { deviceId, error });
      throw error;
    }
  }

  /**
   * Process batch sensor data
   */
  async processBatchSensorData(
    readings: Array<SensorReadingData & { timestamp?: Date }>
  ): Promise<{ processed: number; failed: number; errors: string[] }> {
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      for (const reading of readings) {
        try {
          await this.recordSensorReading({
            deviceId: reading.deviceId,
            sensorType: reading.sensorType,
            value: reading.value,
            unit: reading.unit,
            rawValue: reading.rawValue,
            calibrationOffset: reading.calibrationOffset,
            temperature: reading.temperature,
            humidity: reading.humidity,
            quality: reading.quality,
          });
          processed++;
        } catch (error: unknown) {
          failed++;
          errors.push(`Reading from ${reading.deviceId}: ${error instanceof Error ? (error as Error).message : 'Unknown error'}`);
        }
      }

      logger.info('Batch sensor data processed', {
        total: readings.length,
        processed,
        failed,
      });

      return { processed, failed, errors };
    } catch (error: unknown) {
      logger.error('Failed to process batch sensor data', error);
      throw error;
    }
  }

  // Private helper methods

  private async generateDeviceId(organizationId: string, deviceType: string): Promise<string> {
    const count = await prisma.ioTDevice.count({
      where: { organizationId, deviceType: deviceType as any },
    });
    const typePrefix = deviceType.substring(0, 3).toUpperCase();
    return `${typePrefix}-${String(count + 1).padStart(6, '0')}`;
  }

  private async createDefaultAlertRules(deviceId: string, sensorTypes: string[]): Promise<void> {
    const defaultRules: { [sensorType: string]: AlertRule } = {
      TEMPERATURE: {
        sensorType: 'TEMPERATURE',
        condition: 'RANGE',
        threshold: -40,
        upperThreshold: 85,
        severity: 'WARNING',
        description: 'Temperature outside normal operating range',
        enabled: true,
      },
      VIBRATION: {
        sensorType: 'VIBRATION',
        condition: 'GREATER_THAN',
        threshold: 10,
        severity: 'CRITICAL',
        description: 'High vibration levels detected',
        enabled: true,
      },
      PRESSURE: {
        sensorType: 'PRESSURE',
        condition: 'GREATER_THAN',
        threshold: 100,
        severity: 'WARNING',
        description: 'Pressure exceeds safe threshold',
        enabled: true,
      },
    };

    const rules = sensorTypes
      .filter(type => defaultRules[type])
      .map(type => defaultRules[type]);

    if (rules.length > 0) {
      await this.configureAlertRules(deviceId, rules);
    }
  }

  private validateReadingQuality(
    sensorType: string,
    value: number,
    temperature?: number,
    humidity?: number
  ): string {
    // Basic quality validation logic
    const ranges: { [sensorType: string]: { min: number; max: number } } = {
      TEMPERATURE: { min: -50, max: 150 },
      HUMIDITY: { min: 0, max: 100 },
      PRESSURE: { min: 0, max: 1000 },
      VIBRATION: { min: 0, max: 100 },
    };

    const range = ranges[sensorType];
    if (range && (value < range.min || value > range.max)) {
      return 'BAD';
    }

    // Check for temperature and humidity influence on other sensors
    if (temperature !== undefined) {
      if (temperature < -40 || temperature > 85) {
        return 'QUESTIONABLE';
      }
    }

    return 'GOOD';
  }

  private async checkAlertConditions(
    deviceId: string,
    sensorType: string,
    value: number
  ): Promise<void> {
    try {
      const device = await prisma.ioTDevice.findUnique({
        where: { id: deviceId },
        select: { alertThresholds: true, alertsEnabled: true },
      });

      if (!device || !device.alertsEnabled || !device.alertThresholds) {return;}

      const thresholds = device.alertThresholds as any;
      
      // Check each configured rule for this sensor type
      Object.keys(thresholds).forEach(ruleKey => {
        if (ruleKey.startsWith(`${sensorType}_`)) {
          const rule = thresholds[ruleKey];
          if (!rule.enabled) {return;}

          let alertTriggered = false;
          const condition = ruleKey.split('_')[1];

          switch (condition) {
            case 'GREATER_THAN':
              alertTriggered = value > rule.threshold;
              break;
            case 'LESS_THAN':
              alertTriggered = value < rule.threshold;
              break;
            case 'RANGE':
              alertTriggered = value < rule.threshold || value > (rule.upperThreshold || rule.threshold);
              break;
          }

          if (alertTriggered) {
            logger.warn('IoT alert triggered', {
              deviceId,
              sensorType,
              value,
              rule: rule.description,
              severity: rule.severity,
            });
            // In a real implementation, this would create an alert record and send notifications
          }
        }
      });
    } catch (error: unknown) {
      logger.error('Failed to check alert conditions', { deviceId, sensorType, error });
    }
  }

  private analyzeConditionData(readings: any[], sensorTypes: string[]): any {
    if (readings.length === 0) {
      return {
        overallCondition: 'UNKNOWN',
        healthScore: 50,
        riskScore: 50,
        trendDirection: 'STABLE',
        alertLevel: 'NORMAL',
        recommendedAction: 'NO_ACTION_REQUIRED',
        urgencyLevel: 'LOW',
        analysisMethod: 'INSUFFICIENT_DATA',
        anomalies: [],
        recommendations: ['Collect more data for accurate analysis'],
      };
    }

    // Simple condition analysis - in production would use ML models
    const recentReadings = readings.slice(0, 20);
    const olderReadings = readings.slice(20, 40);

    // Calculate average values for comparison
    const recentAvg = recentReadings.reduce((sum, r) => sum + r.value, 0) / recentReadings.length;
    const olderAvg = olderReadings.length > 0 
      ? olderReadings.reduce((sum, r) => sum + r.value, 0) / olderReadings.length
      : recentAvg;

    // Determine trend
    const changePercent = olderAvg !== 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    let trendDirection = 'STABLE';
    if (Math.abs(changePercent) > 10) {
      trendDirection = changePercent > 0 ? 'DECLINING' : 'IMPROVING';
    }

    // Calculate health score (simplified)
    const qualityScore = readings.filter(r => r.quality === 'GOOD').length / readings.length * 100;
    const variabilityScore = this.calculateVariabilityScore(readings);
    const healthScore = Math.round((qualityScore + variabilityScore) / 2);

    // Determine risk and alert level
    const riskScore = 100 - healthScore;
    let alertLevel = 'NORMAL';
    let recommendedAction = 'NO_ACTION_REQUIRED';
    let urgencyLevel = 'LOW';

    if (healthScore < 30) {
      alertLevel = 'CRITICAL';
      recommendedAction = 'IMMEDIATE_REPAIR';
      urgencyLevel = 'IMMEDIATE';
    } else if (healthScore < 50) {
      alertLevel = 'WARNING';
      recommendedAction = 'SCHEDULE_MAINTENANCE';
      urgencyLevel = 'HIGH';
    } else if (healthScore < 70) {
      alertLevel = 'WARNING';
      recommendedAction = 'MONITOR_CLOSELY';
      urgencyLevel = 'MEDIUM';
    }

    return {
      overallCondition: healthScore > 70 ? 'GOOD' : healthScore > 50 ? 'FAIR' : 'POOR',
      healthScore,
      riskScore,
      trendDirection,
      changeRate: Math.abs(changePercent),
      alertLevel,
      recommendedAction,
      urgencyLevel,
      analysisMethod: 'STATISTICAL_ANALYSIS',
      anomalies: readings.filter(r => r.quality === 'BAD').map(r => r.sensorType),
      recommendations: this.generateConditionRecommendations(healthScore, trendDirection),
    };
  }

  private calculateVariabilityScore(readings: any[]): number {
    if (readings.length < 2) {return 100;}

    const values = readings.map(r => r.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;

    // Convert to score (lower variability = higher score)
    return Math.max(0, 100 - (coefficientOfVariation * 100));
  }

  private determineMonitoringType(deviceType: string, sensorTypes: string[]): string {
    if (sensorTypes.includes('VIBRATION')) {return 'VIBRATION_ANALYSIS';}
    if (sensorTypes.includes('TEMPERATURE')) {return 'THERMAL_IMAGING';}
    if (sensorTypes.includes('CURRENT') || sensorTypes.includes('VOLTAGE')) {return 'ELECTRICAL';}
    if (sensorTypes.includes('PRESSURE')) {return 'PERFORMANCE';}
    return 'VISUAL_INSPECTION';
  }

  private generateConditionRecommendations(healthScore: number, trendDirection: string): string[] {
    const recommendations: string[] = [];

    if (healthScore < 30) {
      recommendations.push('Schedule immediate inspection and maintenance');
      recommendations.push('Consider emergency repair or replacement');
    } else if (healthScore < 50) {
      recommendations.push('Increase monitoring frequency');
      recommendations.push('Plan preventive maintenance within 30 days');
    } else if (healthScore < 70) {
      recommendations.push('Continue regular monitoring');
      recommendations.push('Consider minor adjustments or calibration');
    }

    if (trendDirection === 'DECLINING') {
      recommendations.push('Investigate root cause of declining performance');
    }

    return recommendations;
  }

  private performTimeSeriesAnalysis(readings: any[]): PredictiveMaintenanceInsight['trendAnalysis'] {
    if (readings.length < 10) {
      return {
        direction: 'STABLE',
        changeRate: 0,
        keyIndicators: ['Insufficient data for trend analysis'],
      };
    }

    // Simple time series analysis
    const values = readings.map(r => r.value).slice(0, 50); // Last 50 readings
    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const changeRate = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    let direction: 'IMPROVING' | 'STABLE' | 'DECLINING';
    if (Math.abs(changeRate) < 5) {
      direction = 'STABLE';
    } else {
      direction = changeRate > 0 ? 'DECLINING' : 'IMPROVING';
    }

    const keyIndicators: string[] = [];
    if (Math.abs(changeRate) > 20) {
      keyIndicators.push('Significant trend detected');
    }
    
    const volatility = this.calculateVolatility(values);
    if (volatility > 15) {
      keyIndicators.push('High volatility in readings');
    }

    return {
      direction,
      changeRate: Math.abs(changeRate),
      keyIndicators,
    };
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) {return 0;}
    
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      const change = values[i-1] !== 0 ? Math.abs((values[i] - values[i-1]) / values[i-1]) * 100 : 0;
      changes.push(change);
    }
    
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }

  private predictFailure(
    readings: any[],
    sensorTypes: string[],
    trendAnalysis: any
  ): {
    window: { earliest: Date; mostLikely: Date; latest: Date };
    remainingUsefulLife: number;
    confidence: number;
  } {
    // Simplified failure prediction - in production would use ML models
    const baseLifeExpectancy = 365; // days
    let adjustedLife = baseLifeExpectancy;

    // Adjust based on trend
    if (trendAnalysis.direction === 'DECLINING') {
      const reductionFactor = Math.min(0.5, trendAnalysis.changeRate / 100);
      adjustedLife *= (1 - reductionFactor);
    }

    // Adjust based on sensor quality
    const qualityRatio = readings.filter(r => r.quality === 'GOOD').length / readings.length;
    adjustedLife *= qualityRatio;

    const remainingUsefulLife = Math.max(30, Math.round(adjustedLife));
    const now = new Date();
    const mostLikely = new Date(now.getTime() + remainingUsefulLife * 24 * 60 * 60 * 1000);
    const earliest = new Date(mostLikely.getTime() - 30 * 24 * 60 * 60 * 1000);
    const latest = new Date(mostLikely.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Confidence based on data quality and quantity
    let confidence = Math.min(90, (readings.length / 100) * 100);
    confidence *= qualityRatio;
    confidence = Math.max(20, Math.round(confidence));

    return {
      window: { earliest, mostLikely, latest },
      remainingUsefulLife,
      confidence,
    };
  }

  private generateMaintenanceRecommendations(
    asset: any,
    condition: any,
    prediction: any
  ): PredictiveMaintenanceInsight['recommendedActions'] {
    const recommendations: PredictiveMaintenanceInsight['recommendedActions'] = [];

    if (condition.healthScore < 50) {
      recommendations.push({
        action: 'Schedule comprehensive inspection',
        priority: 'HIGH',
        estimatedCost: 500,
        timeframe: 'Within 7 days',
      });
    }

    if (prediction.remainingUsefulLife < 60) {
      recommendations.push({
        action: 'Plan replacement or major overhaul',
        priority: 'HIGH',
        estimatedCost: 5000,
        timeframe: 'Within 30 days',
      });
    } else if (prediction.remainingUsefulLife < 180) {
      recommendations.push({
        action: 'Increase maintenance frequency',
        priority: 'MEDIUM',
        estimatedCost: 200,
        timeframe: 'Within 30 days',
      });
    }

    if (condition.alertLevel === 'CRITICAL') {
      recommendations.push({
        action: 'Immediate safety inspection',
        priority: 'HIGH',
        estimatedCost: 300,
        timeframe: 'Immediately',
      });
    }

    return recommendations;
  }

  private determineRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= 90) {return 'CRITICAL';}
    if (riskScore >= 70) {return 'HIGH';}
    if (riskScore >= 40) {return 'MEDIUM';}
    return 'LOW';
  }
}

export const ioTDeviceService = new IoTDeviceService();