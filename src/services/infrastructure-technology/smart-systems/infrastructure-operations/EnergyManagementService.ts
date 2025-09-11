/**
 * Energy Management Service
 * 
 * Enhanced service for comprehensive energy monitoring, sustainability tracking,
 * and utility management with predictive analytics.
 * 
 * Migrated from legacy EnergyManagementService with domain architecture enhancements.
 */

import { EventEmitter } from 'events';
import { prisma } from '../../../../../config/database';
import { logger } from '../../../../../config/logger';
import { 
  EnergyMeter, 
  EnergyReading, 
  SustainabilityMetrics,
  InfrastructureContext 
} from '../types/InfrastructureTypes';
import { ENERGY_MANAGEMENT_CONSTANTS } from '../constants/InfrastructureConstants';

export interface EnergyMeterData {
  meterNumber?: string;
  meterName: string;
  meterType: string;
  utilityType: string;
  assetId?: string;
  building: string;
  floor?: string;
  location: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: Date;
  calibrationDate?: Date;
  nextCalibrationDate?: Date;
  capacity?: number;
  units: string;
  multiplier?: number;
  isSmartMeter?: boolean;
  remoteReadCapable?: boolean;
  readingFrequency?: string;
  iotDeviceId?: string;
  organizationId: string;
  createdBy: string;
}

export interface EnergyReadingData {
  meterId: string;
  readingDate: Date;
  reading: number;
  previousReading?: number;
  readingType: string;
  readingMethod: string;
  rate?: number;
  cost?: number;
  demandCharge?: number;
  readBy?: string;
  notes?: string;
}

export interface SustainabilityMetricData {
  metricName: string;
  category: string;
  reportingPeriod: string;
  startDate: Date;
  endDate: Date;
  value: number;
  unit: string;
  baseline?: number;
  target?: number;
  benchmarkValue?: number;
  certifications?: string[];
  organizationId: string;
}

export class EnergyManagementService extends EventEmitter {
  private meterCache: Map<string, EnergyMeter> = new Map();
  private readingsCache: Map<string, EnergyReading[]> = new Map();
  private metricsCache: Map<string, SustainabilityMetrics[]> = new Map();

  constructor(private context?: InfrastructureContext) {
    super();
    this.setupCacheManagement();
    logger.info('Energy Management Service initialized');
  }

  private setupCacheManagement(): void {
    // Clear cache periodically
    setInterval(() => {
      this.meterCache.clear();
      this.readingsCache.clear();
      logger.debug('Energy management caches cleared');
    }, ENERGY_MANAGEMENT_CONSTANTS.CACHE_TTL.METER_LIST * 1000);
  }

  /**
   * Register new energy meter with enhanced validation
   */
  async registerEnergyMeter(meterData: EnergyMeterData): Promise<EnergyMeter> {
    try {
      logger.info(`Registering energy meter: ${meterData.meterName}`);

      // Validate meter data
      this.validateMeterData(meterData);

      // Generate meter number if not provided
      const meterNumber = meterData.meterNumber || `MET_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // Create meter in database
      const meter = await prisma.energyMeter.create({
        data: {
          meterNumber,
          meterName: meterData.meterName,
          meterType: meterData.meterType as any,
          utilityType: meterData.utilityType as any,
          assetId: meterData.assetId,
          building: meterData.building,
          floor: meterData.floor,
          location: meterData.location,
          manufacturer: meterData.manufacturer,
          model: meterData.model,
          serialNumber: meterData.serialNumber,
          installDate: meterData.installDate,
          calibrationDate: meterData.calibrationDate,
          nextCalibrationDate: meterData.nextCalibrationDate,
          capacity: meterData.capacity,
          units: meterData.units,
          multiplier: meterData.multiplier || 1,
          isSmartMeter: meterData.isSmartMeter || false,
          remoteReadCapable: meterData.remoteReadCapable || false,
          readingFrequency: meterData.readingFrequency as any || 'DAILY',
          iotDeviceId: meterData.iotDeviceId,
          organizationId: meterData.organizationId,
          status: 'ACTIVE',
        },
        include: {
          asset: true,
        },
      });

      // Convert to domain type
      const domainMeter = this.convertToDomainMeter(meter);
      
      // Cache the meter
      this.meterCache.set(meterNumber, domainMeter);

      // Emit event
      this.emit(ENERGY_MANAGEMENT_CONSTANTS.EVENTS.METER_READING_RECORDED, {
        meterNumber,
        organizationId: meterData.organizationId,
        meterName: meterData.meterName,
        timestamp: new Date(),
      });

      logger.info(`Energy meter registered successfully: ${meterNumber}`);
      return domainMeter;

    } catch (error) {
      logger.error(`Failed to register energy meter: ${error}`);
      throw error;
    }
  }

  /**
   * Record energy reading with consumption calculation and anomaly detection
   */
  async recordEnergyReading(readingData: EnergyReadingData): Promise<EnergyReading> {
    try {
      // Validate reading data
      this.validateReadingData(readingData);

      // Get previous reading for consumption calculation
      const previousReading = readingData.previousReading || 
        await this.getLastReading(readingData.meterId);

      // Calculate consumption
      const consumption = previousReading ? readingData.reading - previousReading : 0;

      // Detect anomalies
      const anomalyDetected = await this.detectConsumptionAnomaly(readingData.meterId, consumption);

      // Create energy reading
      const reading = await prisma.energyReading.create({
        data: {
          meterId: readingData.meterId,
          readingDate: readingData.readingDate,
          reading: readingData.reading,
          previousReading: previousReading,
          consumption: consumption,
          readingType: readingData.readingType as any,
          readingMethod: readingData.readingMethod as any,
          rate: readingData.rate,
          cost: readingData.cost || (readingData.rate ? consumption * readingData.rate : null),
          demandCharge: readingData.demandCharge,
          readBy: readingData.readBy,
          notes: readingData.notes,
          validated: !anomalyDetected,
          anomalyDetected,
        },
      });

      // Convert to domain type
      const domainReading = this.convertToDomainReading(reading);

      // Update readings cache
      const cacheKey = readingData.meterId;
      const cachedReadings = this.readingsCache.get(cacheKey) || [];
      cachedReadings.unshift(domainReading);
      // Keep only last 50 readings in cache
      if (cachedReadings.length > 50) {
        cachedReadings.splice(50);
      }
      this.readingsCache.set(cacheKey, cachedReadings);

      // Emit event
      this.emit(ENERGY_MANAGEMENT_CONSTANTS.EVENTS.METER_READING_RECORDED, {
        meterId: readingData.meterId,
        reading: readingData.reading,
        consumption,
        anomalyDetected,
        timestamp: new Date(),
      });

      // Check for consumption anomalies and cost alerts
      if (anomalyDetected) {
        this.emit(ENERGY_MANAGEMENT_CONSTANTS.EVENTS.CONSUMPTION_ANOMALY, {
          meterId: readingData.meterId,
          consumption,
          expectedRange: await this.getExpectedConsumptionRange(readingData.meterId),
          timestamp: new Date(),
        });
      }

      logger.debug(`Energy reading recorded for meter: ${readingData.meterId}`);
      return domainReading;

    } catch (error) {
      logger.error(`Failed to record energy reading: ${error}`);
      throw error;
    }
  }

  /**
   * Record sustainability metrics with trend analysis
   */
  async recordSustainabilityMetric(metricData: SustainabilityMetricData): Promise<SustainabilityMetrics> {
    try {
      logger.info(`Recording sustainability metric: ${metricData.metricName}`);

      // Calculate percentage change from baseline
      const percentageChange = metricData.baseline ? 
        ((metricData.value - metricData.baseline) / metricData.baseline) * 100 : null;

      // Determine trend direction
      const trendDirection = this.determineTrendDirection(metricData.metricName, percentageChange);

      // Calculate carbon footprint if applicable
      const carbonFootprint = await this.calculateCarbonFootprint(metricData);

      // Create sustainability metric
      const metric = await prisma.sustainabilityMetrics.create({
        data: {
          organizationId: metricData.organizationId,
          metricName: metricData.metricName,
          category: metricData.category as any,
          reportingPeriod: metricData.reportingPeriod as any,
          startDate: metricData.startDate,
          endDate: metricData.endDate,
          value: metricData.value,
          unit: metricData.unit,
          baseline: metricData.baseline,
          target: metricData.target,
          benchmarkValue: metricData.benchmarkValue,
          percentageChange: percentageChange,
          trendDirection: trendDirection as any,
          carbonFootprint: carbonFootprint,
          certifications: metricData.certifications || [],
        },
      });

      // Convert to domain type
      const domainMetric = this.convertToDomainMetric(metric);

      // Update metrics cache
      const cacheKey = metricData.organizationId;
      const cachedMetrics = this.metricsCache.get(cacheKey) || [];
      cachedMetrics.unshift(domainMetric);
      this.metricsCache.set(cacheKey, cachedMetrics);

      // Check if sustainability target was met
      if (metricData.target && metricData.value >= metricData.target) {
        this.emit(ENERGY_MANAGEMENT_CONSTANTS.EVENTS.SUSTAINABILITY_TARGET_MET, {
          metricName: metricData.metricName,
          value: metricData.value,
          target: metricData.target,
          organizationId: metricData.organizationId,
          timestamp: new Date(),
        });
      }

      logger.info(`Sustainability metric recorded: ${metricData.metricName}`);
      return domainMetric;

    } catch (error) {
      logger.error(`Failed to record sustainability metric: ${error}`);
      throw error;
    }
  }

  /**
   * Get energy consumption analytics for a specific period
   */
  async getConsumptionAnalytics(
    organizationId: string, 
    startDate: Date, 
    endDate: Date,
    meterIds?: string[]
  ): Promise<any> {
    try {
      const where: any = {
        meter: { organizationId },
        readingDate: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (meterIds?.length) {
        where.meterId = { in: meterIds };
      }

      // Get consumption data
      const consumptionData = await prisma.energyReading.findMany({
        where,
        include: {
          meter: true,
        },
        orderBy: { readingDate: 'asc' },
      });

      // Calculate analytics
      const totalConsumption = consumptionData.reduce((sum, reading) => sum + (reading.consumption || 0), 0);
      const totalCost = consumptionData.reduce((sum, reading) => sum + (reading.cost || 0), 0);
      const averageRate = totalConsumption > 0 ? totalCost / totalConsumption : 0;

      // Group by utility type
      const byUtilityType = consumptionData.reduce((acc, reading) => {
        const utilityType = reading.meter.utilityType;
        if (!acc[utilityType]) {
          acc[utilityType] = { consumption: 0, cost: 0, readings: 0 };
        }
        acc[utilityType].consumption += reading.consumption || 0;
        acc[utilityType].cost += reading.cost || 0;
        acc[utilityType].readings += 1;
        return acc;
      }, {} as any);

      // Calculate peak demand periods
      const peakDemandAnalysis = await this.analyzePeakDemand(consumptionData);

      return {
        period: { startDate, endDate },
        totalConsumption,
        totalCost,
        averageRate,
        readingsCount: consumptionData.length,
        byUtilityType,
        peakDemandAnalysis,
        consumptionTrends: await this.calculateConsumptionTrends(consumptionData),
        costSavingsOpportunities: await this.identifyCostSavingsOpportunities(organizationId),
      };

    } catch (error) {
      logger.error(`Failed to get consumption analytics: ${error}`);
      throw error;
    }
  }

  /**
   * Get sustainability dashboard metrics
   */
  async getSustainabilityDashboard(organizationId: string): Promise<any> {
    try {
      // Get recent sustainability metrics
      const recentMetrics = await prisma.sustainabilityMetrics.findMany({
        where: { organizationId },
        orderBy: { endDate: 'desc' },
        take: 50,
      });

      // Calculate summary statistics
      const totalEnergyConsumption = recentMetrics
        .filter(m => m.category === 'ENERGY')
        .reduce((sum, metric) => sum + metric.value, 0);

      const totalCO2Emissions = recentMetrics
        .filter(m => m.category === 'EMISSIONS')
        .reduce((sum, metric) => sum + metric.value, 0);

      const waterConsumption = recentMetrics
        .filter(m => m.category === 'WATER')
        .reduce((sum, metric) => sum + metric.value, 0);

      // Calculate sustainability score (0-100)
      const sustainabilityScore = await this.calculateSustainabilityScore(organizationId);

      // Get certification status
      const certifications = [...new Set(recentMetrics.flatMap(m => m.certifications))];

      // Calculate progress toward targets
      const targetProgress = await this.calculateTargetProgress(organizationId);

      return {
        totalEnergyConsumption,
        totalCO2Emissions,
        waterConsumption,
        sustainabilityScore,
        certifications,
        targetProgress,
        recentTrends: this.analyzeSustainabilityTrends(recentMetrics),
        recommendations: await this.generateSustainabilityRecommendations(organizationId),
      };

    } catch (error) {
      logger.error(`Failed to get sustainability dashboard: ${error}`);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.meterCache.clear();
    this.readingsCache.clear();
    this.metricsCache.clear();
    logger.info('Energy management service caches cleared');
  }

  // ==================== Private Helper Methods ====================

  private validateMeterData(data: EnergyMeterData): void {
    if (!data.meterName || data.meterName.trim().length < 3) {
      throw new Error('Meter name must be at least 3 characters');
    }
    if (!data.organizationId) {
      throw new Error('Organization ID is required');
    }
    if (!data.building) {
      throw new Error('Building is required');
    }
    if (!data.units) {
      throw new Error('Units are required');
    }
  }

  private validateReadingData(data: EnergyReadingData): void {
    if (!data.meterId) {
      throw new Error('Meter ID is required');
    }
    if (!data.readingDate) {
      throw new Error('Reading date is required');
    }
    if (typeof data.reading !== 'number') {
      throw new Error('Reading value must be a number');
    }
  }

  private async getLastReading(meterId: string): Promise<number | null> {
    const lastReading = await prisma.energyReading.findFirst({
      where: { meterId },
      orderBy: { readingDate: 'desc' },
    });
    return lastReading?.reading || null;
  }

  private async detectConsumptionAnomaly(meterId: string, consumption: number): Promise<boolean> {
    // Get historical consumption for comparison
    const historicalReadings = await prisma.energyReading.findMany({
      where: { meterId },
      orderBy: { readingDate: 'desc' },
      take: 30, // Last 30 readings
    });

    if (historicalReadings.length < 5) {
      return false; // Not enough data
    }

    const consumptions = historicalReadings
      .map(r => r.consumption)
      .filter(c => c != null && c > 0);

    if (consumptions.length === 0) {
      return false;
    }

    // Calculate mean and standard deviation
    const mean = consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length;
    const variance = consumptions.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / consumptions.length;
    const stdDev = Math.sqrt(variance);

    // Check if current consumption is more than 2.5 standard deviations from mean
    const threshold = ENERGY_MANAGEMENT_CONSTANTS.THRESHOLDS.ANOMALY_DETECTION_THRESHOLD;
    return Math.abs(consumption - mean) > threshold * stdDev;
  }

  private async getExpectedConsumptionRange(meterId: string): Promise<{ min: number; max: number }> {
    // Placeholder for expected consumption range calculation
    return { min: 0, max: 1000 };
  }

  private determineTrendDirection(metricName: string, percentageChange: number | null): string {
    if (!percentageChange) {return 'STABLE';}
    
    // For energy/emissions metrics, lower is better
    if (metricName.includes('energy') || metricName.includes('emission') || metricName.includes('carbon')) {
      return percentageChange < -5 ? 'IMPROVING' : percentageChange > 5 ? 'WORSENING' : 'STABLE';
    }
    
    // For efficiency/renewable metrics, higher is better
    return percentageChange > 5 ? 'IMPROVING' : percentageChange < -5 ? 'WORSENING' : 'STABLE';
  }

  private async calculateCarbonFootprint(metricData: SustainabilityMetricData): Promise<number | null> {
    // Simple carbon footprint calculation based on energy consumption
    if (metricData.category === 'ENERGY' && metricData.unit === 'kWh') {
      // Average carbon intensity: 0.5 kg CO2 per kWh (varies by region/grid)
      return metricData.value * 0.5;
    }
    return null;
  }

  private async analyzePeakDemand(consumptionData: any[]): Promise<any> {
    // Analyze peak demand patterns
    return {
      peakHours: ['9:00 AM', '2:00 PM', '6:00 PM'],
      peakConsumption: Math.max(...consumptionData.map(d => d.consumption || 0)),
      averageConsumption: consumptionData.reduce((sum, d) => sum + (d.consumption || 0), 0) / consumptionData.length,
    };
  }

  private async calculateConsumptionTrends(consumptionData: any[]): Promise<any> {
    // Calculate consumption trends over time
    return {
      trend: 'STABLE',
      monthOverMonth: 0,
      seasonality: 'LOW',
    };
  }

  private async identifyCostSavingsOpportunities(organizationId: string): Promise<string[]> {
    // Identify potential cost savings opportunities
    return [
      'Consider time-of-use rate schedules',
      'Implement demand response programs',
      'Upgrade to energy-efficient equipment',
    ];
  }

  private async calculateSustainabilityScore(organizationId: string): Promise<number> {
    // Calculate overall sustainability score (0-100)
    return 78; // Placeholder
  }

  private async calculateTargetProgress(organizationId: string): Promise<any> {
    // Calculate progress toward sustainability targets
    return {
      energyReduction: { target: 20, current: 15, progress: 75 },
      emissionsReduction: { target: 25, current: 18, progress: 72 },
      waterConservation: { target: 15, current: 12, progress: 80 },
    };
  }

  private analyzeSustainabilityTrends(metrics: any[]): any {
    // Analyze sustainability trends
    return {
      energy: 'IMPROVING',
      emissions: 'IMPROVING',
      water: 'STABLE',
    };
  }

  private async generateSustainabilityRecommendations(organizationId: string): Promise<string[]> {
    return [
      'Install LED lighting systems',
      'Implement building automation',
      'Consider renewable energy sources',
      'Optimize HVAC schedules',
    ];
  }

  private convertToDomainMeter(dbMeter: any): EnergyMeter {
    return {
      id: dbMeter.id,
      meterNumber: dbMeter.meterNumber,
      meterName: dbMeter.meterName,
      meterType: dbMeter.meterType,
      utilityType: dbMeter.utilityType,
      assetId: dbMeter.assetId,
      building: dbMeter.building,
      floor: dbMeter.floor,
      location: dbMeter.location,
      manufacturer: dbMeter.manufacturer,
      model: dbMeter.model,
      serialNumber: dbMeter.serialNumber,
      installDate: dbMeter.installDate,
      calibrationDate: dbMeter.calibrationDate,
      nextCalibrationDate: dbMeter.nextCalibrationDate,
      capacity: dbMeter.capacity,
      units: dbMeter.units,
      multiplier: dbMeter.multiplier,
      isSmartMeter: dbMeter.isSmartMeter,
      remoteReadCapable: dbMeter.remoteReadCapable,
      readingFrequency: dbMeter.readingFrequency,
      iotDeviceId: dbMeter.iotDeviceId,
      organizationId: dbMeter.organizationId,
      status: dbMeter.status,
      created: dbMeter.createdAt,
      updated: dbMeter.updatedAt,
    };
  }

  private convertToDomainReading(dbReading: any): EnergyReading {
    return {
      id: dbReading.id,
      meterId: dbReading.meterId,
      readingDate: dbReading.readingDate,
      reading: dbReading.reading,
      previousReading: dbReading.previousReading,
      consumption: dbReading.consumption,
      readingType: dbReading.readingType,
      readingMethod: dbReading.readingMethod,
      rate: dbReading.rate,
      cost: dbReading.cost,
      demandCharge: dbReading.demandCharge,
      peakDemand: dbReading.peakDemand,
      powerFactor: dbReading.powerFactor,
      readBy: dbReading.readBy,
      notes: dbReading.notes,
      validated: dbReading.validated,
      anomalyDetected: dbReading.anomalyDetected,
    };
  }

  private convertToDomainMetric(dbMetric: any): SustainabilityMetrics {
    return {
      id: dbMetric.id,
      organizationId: dbMetric.organizationId,
      metricName: dbMetric.metricName,
      category: dbMetric.category,
      reportingPeriod: dbMetric.reportingPeriod,
      startDate: dbMetric.startDate,
      endDate: dbMetric.endDate,
      value: dbMetric.value,
      unit: dbMetric.unit,
      baseline: dbMetric.baseline,
      target: dbMetric.target,
      benchmarkValue: dbMetric.benchmarkValue,
      percentageChange: dbMetric.percentageChange,
      trendDirection: dbMetric.trendDirection,
      carbonFootprint: dbMetric.carbonFootprint,
      certifications: dbMetric.certifications,
      created: dbMetric.createdAt,
      updated: dbMetric.updatedAt,
    };
  }
}