import { PrismaClient } from '@prisma/client';
import { logger } from '@/config/logger';

const prisma = new PrismaClient();

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
  units: string;
  baseline?: number;
  target?: number;
  co2Equivalent?: number;
  emissionFactor?: number;
  industryBenchmark?: number;
  previousPeriodValue?: number;
  dataSource: string;
  calculationMethod?: string;
  organizationId: string;
}

export interface EnergyMetrics {
  totalConsumption: { [utilityType: string]: number };
  totalCost: number;
  averageCostPerUnit: { [utilityType: string]: number };
  consumptionTrends: Array<{
    period: string;
    consumption: number;
    cost: number;
    utilityType: string;
  }>;
  peakDemand: { [utilityType: string]: { value: number; timestamp: Date } };
  efficiencyMetrics: {
    energyIntensity: number; // kWh per sq ft or per unit
    costIntensity: number;   // cost per sq ft or per unit
    carbonIntensity: number; // CO2 per unit
  };
  sustainabilityScores: {
    overall: number;
    energyEfficiency: number;
    renewableEnergy: number;
    wasteReduction: number;
    waterConservation: number;
  };
  benchmarking: {
    industryAverage: number;
    bestInClass: number;
    percentileRanking: number;
  };
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    meterId?: string;
    value: number;
    threshold: number;
  }>;
}

export interface EnergyOptimizationRecommendation {
  category: string;
  recommendation: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  potentialSavings: {
    energyReduction: number; // kWh or equivalent
    costSavings: number;     // annual cost savings
    co2Reduction: number;    // tons CO2 equivalent
  };
  implementationCost: number;
  paybackPeriod: number; // months
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  requiredActions: string[];
  affectedAssets?: string[];
}

/**
 * EnergyManagementService - Comprehensive energy monitoring and sustainability
 * Handles energy metering, consumption tracking, and sustainability reporting
 * Supports multiple utility types and advanced analytics
 */
export class EnergyManagementService {

  /**
   * Create new energy meter
   */
  async createEnergyMeter(meterData: EnergyMeterData): Promise<any> {
    try {
      // Generate meter number if not provided
      if (!meterData.meterNumber) {
        meterData.meterNumber = await this.generateMeterNumber(meterData.organizationId, meterData.utilityType);
      }

      // Set default calibration date for new meters
      if (!meterData.calibrationDate) {
        meterData.calibrationDate = new Date();
        meterData.nextCalibrationDate = new Date();
        meterData.nextCalibrationDate.setFullYear(meterData.nextCalibrationDate.getFullYear() + 1);
      }

      const meter = await prisma.energyMeter.create({
        data: {
          meterNumber: meterData.meterNumber,
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
          status: 'ACTIVE',
          isActive: true,
          isSmartMeter: meterData.isSmartMeter || false,
          remoteReadCapable: meterData.remoteReadCapable || false,
          readingFrequency: meterData.readingFrequency as any,
          iotDeviceId: meterData.iotDeviceId,
          organizationId: meterData.organizationId,
          createdBy: meterData.createdBy,
        },
        include: {
          asset: true,
          iotDevice: true,
        },
      });

      logger.info('Energy meter created', { 
        meterId: meter.id,
        meterNumber: meter.meterNumber,
        utilityType: meter.utilityType 
      });

      return meter;
    } catch (error: unknown) {
      logger.error('Failed to create energy meter', error);
      throw error;
    }
  }

  /**
   * Record energy reading
   */
  async recordEnergyReading(readingData: EnergyReadingData): Promise<any> {
    try {
      // Get meter information
      const meter = await prisma.energyMeter.findUnique({
        where: { id: readingData.meterId },
        include: {
          readings: {
            orderBy: { readingDate: 'desc' },
            take: 1,
          },
        },
      });

      if (!meter) {
        throw new Error('Energy meter not found');
      }

      // Get previous reading if not provided
      let previousReading = readingData.previousReading;
      if (!previousReading && meter.readings.length > 0) {
        previousReading = meter.readings[0].reading;
      }

      // Calculate consumption
      const consumption = previousReading 
        ? Math.max(0, readingData.reading - previousReading) * meter.multiplier
        : 0;

      // Calculate cost if rate provided
      const cost = readingData.rate ? consumption * readingData.rate : readingData.cost;

      // Validate reading (basic anomaly detection)
      const isAnomaly = await this.detectReadingAnomaly(
        readingData.meterId,
        consumption,
        readingData.readingDate
      );

      const reading = await prisma.energyReading.create({
        data: {
          meterId: readingData.meterId,
          readingDate: readingData.readingDate,
          reading: readingData.reading,
          previousReading,
          consumption,
          readingType: readingData.readingType as any,
          readingMethod: readingData.readingMethod as any,
          isValidated: !isAnomaly,
          isAnomaly,
          anomalyReason: isAnomaly ? 'Unusual consumption pattern detected' : undefined,
          rate: readingData.rate,
          cost,
          demandCharge: readingData.demandCharge,
          readBy: readingData.readBy,
          notes: readingData.notes,
        },
      });

      // Update meter status
      await prisma.energyMeter.update({
        where: { id: readingData.meterId },
        data: { isActive: true },
      });

      logger.info('Energy reading recorded', {
        readingId: reading.id,
        meterId: readingData.meterId,
        consumption,
        isAnomaly,
      });

      return reading;
    } catch (error: unknown) {
      logger.error('Failed to record energy reading', error);
      throw error;
    }
  }

  /**
   * Create sustainability metric
   */
  async createSustainabilityMetric(metricData: SustainabilityMetricData): Promise<any> {
    try {
      // Calculate percentage change from previous period
      const percentChange = metricData.previousPeriodValue 
        ? ((metricData.value - metricData.previousPeriodValue) / metricData.previousPeriodValue) * 100
        : undefined;

      const metric = await prisma.sustainabilityMetric.create({
        data: {
          metricName: metricData.metricName,
          category: metricData.category as any,
          reportingPeriod: metricData.reportingPeriod as any,
          startDate: metricData.startDate,
          endDate: metricData.endDate,
          value: metricData.value,
          units: metricData.units,
          baseline: metricData.baseline,
          target: metricData.target,
          co2Equivalent: metricData.co2Equivalent,
          emissionFactor: metricData.emissionFactor,
          industryBenchmark: metricData.industryBenchmark,
          previousPeriodValue: metricData.previousPeriodValue,
          percentChange,
          dataSource: metricData.dataSource as any,
          calculationMethod: metricData.calculationMethod,
          isVerified: false,
          organizationId: metricData.organizationId,
        },
      });

      logger.info('Sustainability metric created', {
        metricId: metric.id,
        metricName: metric.metricName,
        value: metric.value,
        category: metric.category,
      });

      return metric;
    } catch (error: unknown) {
      logger.error('Failed to create sustainability metric', error);
      throw error;
    }
  }

  /**
   * Get comprehensive energy metrics
   */
  async getEnergyMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EnergyMetrics> {
    try {
      // Get all energy readings for the period
      const readings = await prisma.energyReading.findMany({
        where: {
          meter: { organizationId },
          readingDate: {
            gte: startDate,
            lte: endDate,
          },
          isValidated: true,
        },
        include: {
          meter: {
            select: {
              utilityType: true,
              units: true,
              building: true,
            },
          },
        },
        orderBy: { readingDate: 'asc' },
      });

      // Calculate total consumption by utility type
      const totalConsumption: { [utilityType: string]: number } = {};
      const totalCostByType: { [utilityType: string]: number } = {};
      let totalCost = 0;

      readings.forEach(reading => {
        const utilityType = reading.meter.utilityType;
        const consumption = reading.consumption || 0;
        const cost = reading.cost || 0;

        totalConsumption[utilityType] = (totalConsumption[utilityType] || 0) + consumption;
        totalCostByType[utilityType] = (totalCostByType[utilityType] || 0) + cost;
        totalCost += cost;
      });

      // Calculate average cost per unit
      const averageCostPerUnit: { [utilityType: string]: number } = {};
      Object.keys(totalConsumption).forEach(utilityType => {
        const consumption = totalConsumption[utilityType];
        const cost = totalCostByType[utilityType] || 0;
        averageCostPerUnit[utilityType] = consumption > 0 ? cost / consumption : 0;
      });

      // Generate consumption trends (monthly breakdown)
      const monthlyData = new Map<string, Map<string, { consumption: number; cost: number }>>();
      
      readings.forEach(reading => {
        const monthKey = reading.readingDate.toISOString().substring(0, 7);
        const utilityType = reading.meter.utilityType;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, new Map());
        }
        
        const monthData = monthlyData.get(monthKey)!;
        if (!monthData.has(utilityType)) {
          monthData.set(utilityType, { consumption: 0, cost: 0 });
        }
        
        const typeData = monthData.get(utilityType)!;
        typeData.consumption += reading.consumption || 0;
        typeData.cost += reading.cost || 0;
      });

      const consumptionTrends: EnergyMetrics['consumptionTrends'] = [];
      monthlyData.forEach((utilityData, month) => {
        utilityData.forEach((data, utilityType) => {
          consumptionTrends.push({
            period: month,
            consumption: data.consumption,
            cost: data.cost,
            utilityType,
          });
        });
      });

      // Calculate peak demand
      const peakDemand: { [utilityType: string]: { value: number; timestamp: Date } } = {};
      Object.keys(totalConsumption).forEach(utilityType => {
        const utilityReadings = readings.filter(r => r.meter.utilityType === utilityType);
        if (utilityReadings.length > 0) {
          const peakReading = utilityReadings.reduce((max, reading) => 
            (reading.consumption || 0) > (max.consumption || 0) ? reading : max
          );
          
          peakDemand[utilityType] = {
            value: peakReading.consumption || 0,
            timestamp: peakReading.readingDate,
          };
        }
      });

      // Calculate efficiency metrics (simplified - would need building area/production data)
      const buildingArea = 100000; // Placeholder - would come from building/space data
      const energyIntensity = totalConsumption['ELECTRICITY'] ? 
        totalConsumption['ELECTRICITY'] / buildingArea : 0;
      const costIntensity = totalCost / buildingArea;
      const carbonIntensity = await this.calculateCarbonIntensity(totalConsumption, organizationId);

      // Get sustainability metrics
      const sustainabilityMetrics = await prisma.sustainabilityMetric.findMany({
        where: {
          organizationId,
          startDate: { gte: startDate },
          endDate: { lte: endDate },
        },
      });

      const sustainabilityScores = this.calculateSustainabilityScores(sustainabilityMetrics);

      // Calculate benchmarking (simplified)
      const benchmarking = {
        industryAverage: energyIntensity * 1.2, // 20% above current as placeholder
        bestInClass: energyIntensity * 0.8,     // 20% below current
        percentileRanking: 60, // Placeholder
      };

      // Generate alerts
      const alerts = await this.generateEnergyAlerts(readings, organizationId);

      return {
        totalConsumption,
        totalCost,
        averageCostPerUnit,
        consumptionTrends,
        peakDemand,
        efficiencyMetrics: {
          energyIntensity,
          costIntensity,
          carbonIntensity,
        },
        sustainabilityScores,
        benchmarking,
        alerts,
      };
    } catch (error: unknown) {
      logger.error('Failed to get energy metrics', { organizationId, error });
      throw error;
    }
  }

  /**
   * Generate energy optimization recommendations
   */
  async generateOptimizationRecommendations(
    organizationId: string,
    analysisMonths: number = 12
  ): Promise<EnergyOptimizationRecommendation[]> {
    try {
      const analysisStartDate = new Date();
      analysisStartDate.setMonth(analysisStartDate.getMonth() - analysisMonths);

      // Get energy consumption data
      const readings = await prisma.energyReading.findMany({
        where: {
          meter: { organizationId },
          readingDate: { gte: analysisStartDate },
          isValidated: true,
        },
        include: {
          meter: {
            include: {
              asset: {
                select: {
                  id: true,
                  assetName: true,
                  category: true,
                  condition: true,
                },
              },
            },
          },
        },
      });

      // Get sustainability metrics
      const sustainabilityMetrics = await prisma.sustainabilityMetric.findMany({
        where: {
          organizationId,
          startDate: { gte: analysisStartDate },
        },
      });

      const recommendations: EnergyOptimizationRecommendation[] = [];

      // Analyze consumption patterns
      const consumptionByUtility = this.analyzeConsumptionPatterns(readings);
      
      // Energy efficiency recommendations
      Object.entries(consumptionByUtility).forEach(([utilityType, data]) => {
        if (utilityType === 'ELECTRICITY' && data.averageMonthly > 50000) { // High electricity usage
          recommendations.push({
            category: 'ENERGY_EFFICIENCY',
            recommendation: 'Implement LED lighting upgrade program',
            priority: 'HIGH',
            potentialSavings: {
              energyReduction: data.averageMonthly * 0.3, // 30% reduction
              costSavings: data.averageMonthlyCost * 0.3 * 12,
              co2Reduction: (data.averageMonthly * 0.3 * 12) * 0.0004, // CO2 factor
            },
            implementationCost: 25000,
            paybackPeriod: 18,
            complexity: 'MEDIUM',
            requiredActions: [
              'Conduct lighting audit',
              'Replace fluorescent with LED fixtures',
              'Install occupancy sensors',
              'Implement daylight harvesting controls',
            ],
            affectedAssets: data.meters.map(m => m.assetId).filter(Boolean) as string[],
          });
        }

        if (utilityType === 'ELECTRICITY' && data.peakDemandVariation > 50) { // High peak demand variation
          recommendations.push({
            category: 'DEMAND_MANAGEMENT',
            recommendation: 'Implement demand response program',
            priority: 'MEDIUM',
            potentialSavings: {
              energyReduction: 0,
              costSavings: data.averageMonthlyCost * 0.15 * 12, // 15% demand charge reduction
              co2Reduction: 0,
            },
            implementationCost: 15000,
            paybackPeriod: 12,
            complexity: 'HIGH',
            requiredActions: [
              'Install smart meters and controls',
              'Develop load scheduling protocols',
              'Train facility staff on demand management',
              'Implement automated load shedding',
            ],
          });
        }
      });

      // HVAC optimization (if HVAC assets found)
      const hvacAssets = readings
        .filter(r => r.meter.asset?.category === 'HVAC')
        .map(r => r.meter.asset!)
        .filter(Boolean);

      if (hvacAssets.length > 0) {
        const poorConditionHVAC = hvacAssets.filter(asset => 
          asset.condition === 'POOR' || asset.condition === 'CRITICAL'
        );

        if (poorConditionHVAC.length > 0) {
          recommendations.push({
            category: 'EQUIPMENT_OPTIMIZATION',
            recommendation: 'Upgrade aging HVAC equipment',
            priority: 'HIGH',
            potentialSavings: {
              energyReduction: consumptionByUtility['ELECTRICITY']?.averageMonthly * 0.25 || 0,
              costSavings: 18000,
              co2Reduction: 12,
            },
            implementationCost: 75000,
            paybackPeriod: 48,
            complexity: 'HIGH',
            requiredActions: [
              'Conduct HVAC system assessment',
              'Replace inefficient equipment',
              'Install smart thermostats',
              'Implement predictive maintenance',
            ],
            affectedAssets: poorConditionHVAC.map(asset => asset.id),
          });
        }
      }

      // Renewable energy recommendations
      const electricityConsumption = consumptionByUtility['ELECTRICITY'];
      if (electricityConsumption && electricityConsumption.averageMonthly > 30000) {
        recommendations.push({
          category: 'RENEWABLE_ENERGY',
          recommendation: 'Install solar photovoltaic system',
          priority: 'MEDIUM',
          potentialSavings: {
            energyReduction: electricityConsumption.averageMonthly * 0.4, // 40% of consumption
            costSavings: electricityConsumption.averageMonthlyCost * 0.4 * 12,
            co2Reduction: (electricityConsumption.averageMonthly * 0.4 * 12) * 0.0004,
          },
          implementationCost: 150000,
          paybackPeriod: 84, // 7 years
          complexity: 'HIGH',
          requiredActions: [
            'Conduct solar feasibility study',
            'Obtain permits and approvals',
            'Install solar PV system',
            'Implement net metering',
            'Monitor performance',
          ],
        });
      }

      // Water conservation (if water meters present)
      const waterConsumption = consumptionByUtility['WATER'];
      if (waterConsumption && waterConsumption.averageMonthly > 10000) {
        recommendations.push({
          category: 'WATER_CONSERVATION',
          recommendation: 'Implement water conservation measures',
          priority: 'MEDIUM',
          potentialSavings: {
            energyReduction: 0,
            costSavings: waterConsumption.averageMonthlyCost * 0.2 * 12, // 20% water cost reduction
            co2Reduction: 2, // Indirect CO2 savings
          },
          implementationCost: 8000,
          paybackPeriod: 24,
          complexity: 'LOW',
          requiredActions: [
            'Install low-flow fixtures',
            'Implement leak detection system',
            'Upgrade irrigation controls',
            'Train staff on water conservation',
          ],
        });
      }

      // Sort by potential savings (ROI)
      recommendations.sort((a, b) => {
        const roiA = a.potentialSavings.costSavings / a.implementationCost;
        const roiB = b.potentialSavings.costSavings / b.implementationCost;
        return roiB - roiA;
      });

      logger.info('Energy optimization recommendations generated', {
        organizationId,
        recommendationCount: recommendations.length,
        totalPotentialSavings: recommendations.reduce((sum, r) => sum + r.potentialSavings.costSavings, 0),
      });

      return recommendations;
    } catch (error: unknown) {
      logger.error('Failed to generate optimization recommendations', { organizationId, error });
      throw error;
    }
  }

  /**
   * Generate energy audit report
   */
  async generateEnergyAuditReport(
    organizationId: string,
    reportPeriod: { start: Date; end: Date }
  ): Promise<{
    summary: {
      totalConsumption: { [utilityType: string]: number };
      totalCost: number;
      carbonFootprint: number;
      energyIntensity: number;
    };
    trends: any[];
    benchmarks: any[];
    recommendations: EnergyOptimizationRecommendation[];
    compliance: {
      regulatoryRequirements: string[];
      complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
      gaps: string[];
    };
  }> {
    try {
      // Get energy metrics for the period
      const metrics = await this.getEnergyMetrics(organizationId, reportPeriod.start, reportPeriod.end);
      
      // Get optimization recommendations
      const recommendations = await this.generateOptimizationRecommendations(organizationId, 12);

      // Calculate carbon footprint
      const carbonFootprint = await this.calculateCarbonFootprint(
        metrics.totalConsumption,
        organizationId
      );

      // Get sustainability metrics for trends
      const sustainabilityMetrics = await prisma.sustainabilityMetric.findMany({
        where: {
          organizationId,
          startDate: { gte: reportPeriod.start },
          endDate: { lte: reportPeriod.end },
        },
        orderBy: { startDate: 'asc' },
      });

      // Generate compliance assessment
      const compliance = this.assessRegulatoryCompliance(metrics, sustainabilityMetrics);

      const report = {
        summary: {
          totalConsumption: metrics.totalConsumption,
          totalCost: metrics.totalCost,
          carbonFootprint,
          energyIntensity: metrics.efficiencyMetrics.energyIntensity,
        },
        trends: metrics.consumptionTrends,
        benchmarks: [metrics.benchmarking],
        recommendations: recommendations.slice(0, 10), // Top 10 recommendations
        compliance,
      };

      logger.info('Energy audit report generated', {
        organizationId,
        reportPeriod,
        totalCost: metrics.totalCost,
        recommendationCount: recommendations.length,
      });

      return report;
    } catch (error: unknown) {
      logger.error('Failed to generate energy audit report', { organizationId, error });
      throw error;
    }
  }

  // Private helper methods

  private async generateMeterNumber(organizationId: string, utilityType: string): Promise<string> {
    const count = await prisma.energyMeter.count({
      where: { organizationId, utilityType: utilityType as any },
    });
    const typePrefix = utilityType.substring(0, 3).toUpperCase();
    return `${typePrefix}-${String(count + 1).padStart(6, '0')}`;
  }

  private async detectReadingAnomaly(
    meterId: string,
    consumption: number,
    readingDate: Date
  ): Promise<boolean> {
    try {
      // Get historical readings for comparison
      const historicalReadings = await prisma.energyReading.findMany({
        where: {
          meterId,
          readingDate: {
            lt: readingDate,
            gte: new Date(readingDate.getTime() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          },
          isValidated: true,
        },
        select: { consumption: true },
      });

      if (historicalReadings.length < 5) {return false;} // Not enough history

      const consumptions = historicalReadings
        .map(r => r.consumption || 0)
        .filter(c => c > 0);

      if (consumptions.length === 0) {return false;}

      // Calculate mean and standard deviation
      const mean = consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length;
      const stdDev = Math.sqrt(
        consumptions.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / consumptions.length
      );

      // Flag as anomaly if reading is more than 3 standard deviations from mean
      const zScore = Math.abs(consumption - mean) / (stdDev || 1);
      return zScore > 3;
    } catch (error: unknown) {
      logger.error('Failed to detect reading anomaly', { meterId, error });
      return false;
    }
  }

  private async calculateCarbonIntensity(
    consumption: { [utilityType: string]: number },
    organizationId: string
  ): Promise<number> {
    // Emission factors (kg CO2 per unit)
    const emissionFactors = {
      ELECTRICITY: 0.4, // kg CO2 per kWh (varies by grid)
      NATURAL_GAS: 2.0, // kg CO2 per therm
      FUEL_OIL: 10.2,   // kg CO2 per gallon
      PROPANE: 5.7,     // kg CO2 per gallon
    };

    let totalCO2 = 0;
    let totalConsumption = 0;

    Object.entries(consumption).forEach(([utilityType, amount]) => {
      const factor = emissionFactors[utilityType as keyof typeof emissionFactors] || 0;
      totalCO2 += amount * factor;
      totalConsumption += amount;
    });

    return totalConsumption > 0 ? totalCO2 / totalConsumption : 0;
  }

  private calculateSustainabilityScores(metrics: any[]): EnergyMetrics['sustainabilityScores'] {
    // Simplified scoring based on available metrics
    const scores = {
      overall: 75,
      energyEfficiency: 70,
      renewableEnergy: 60,
      wasteReduction: 80,
      waterConservation: 85,
    };

    // Adjust scores based on actual metrics (simplified logic)
    metrics.forEach(metric => {
      if (metric.category === 'ENERGY_CONSUMPTION') {
        const targetAchievement = metric.target ? (metric.value / metric.target) : 1;
        scores.energyEfficiency = Math.min(100, scores.energyEfficiency * targetAchievement);
      }
      // Add more metric-based adjustments as needed
    });

    return scores;
  }

  private async generateEnergyAlerts(
    readings: any[],
    organizationId: string
  ): Promise<EnergyMetrics['alerts']> {
    const alerts: EnergyMetrics['alerts'] = [];

    // Group readings by meter for analysis
    const readingsByMeter = new Map<string, any[]>();
    readings.forEach(reading => {
      const meterId = reading.meterId;
      if (!readingsByMeter.has(meterId)) {
        readingsByMeter.set(meterId, []);
      }
      readingsByMeter.get(meterId)!.push(reading);
    });

    // Check for various alert conditions
    readingsByMeter.forEach((meterReadings, meterId) => {
      const latestReading = meterReadings[meterReadings.length - 1];
      const avgConsumption = meterReadings.reduce((sum, r) => sum + (r.consumption || 0), 0) / meterReadings.length;

      // High consumption alert
      if (latestReading.consumption > avgConsumption * 1.5) {
        alerts.push({
          type: 'HIGH_CONSUMPTION',
          severity: 'WARNING',
          message: `Consumption is 50% above average for meter ${meterId}`,
          meterId,
          value: latestReading.consumption,
          threshold: avgConsumption * 1.5,
        });
      }

      // Anomaly alert
      if (latestReading.isAnomaly) {
        alerts.push({
          type: 'ANOMALY',
          severity: 'WARNING',
          message: `Unusual reading pattern detected for meter ${meterId}`,
          meterId,
          value: latestReading.consumption,
          threshold: avgConsumption,
        });
      }

      // High cost alert
      if (latestReading.cost && latestReading.cost > 1000) {
        alerts.push({
          type: 'HIGH_COST',
          severity: 'CRITICAL',
          message: `High energy cost detected for meter ${meterId}`,
          meterId,
          value: latestReading.cost,
          threshold: 1000,
        });
      }
    });

    return alerts;
  }

  private analyzeConsumptionPatterns(readings: any[]): {
    [utilityType: string]: {
      averageMonthly: number;
      averageMonthlyCost: number;
      peakDemandVariation: number;
      meters: any[];
    };
  } {
    const patterns: { [utilityType: string]: any } = {};

    readings.forEach(reading => {
      const utilityType = reading.meter.utilityType;
      
      if (!patterns[utilityType]) {
        patterns[utilityType] = {
          totalConsumption: 0,
          totalCost: 0,
          readingCount: 0,
          consumptions: [],
          meters: [],
        };
      }

      const pattern = patterns[utilityType];
      pattern.totalConsumption += reading.consumption || 0;
      pattern.totalCost += reading.cost || 0;
      pattern.readingCount++;
      pattern.consumptions.push(reading.consumption || 0);
      
      if (!pattern.meters.find((m: any) => m.id === reading.meterId)) {
        pattern.meters.push(reading.meter);
      }
    });

    // Calculate final metrics
    Object.keys(patterns).forEach(utilityType => {
      const pattern = patterns[utilityType];
      pattern.averageMonthly = pattern.totalConsumption / Math.max(1, pattern.readingCount / 30);
      pattern.averageMonthlyCost = pattern.totalCost / Math.max(1, pattern.readingCount / 30);
      
      // Calculate peak demand variation
      const consumptions = pattern.consumptions.filter((c: number) => c > 0);
      if (consumptions.length > 0) {
        const maxConsumption = Math.max(...consumptions);
        const avgConsumption = consumptions.reduce((sum: number, c: number) => sum + c, 0) / consumptions.length;
        pattern.peakDemandVariation = avgConsumption > 0 ? ((maxConsumption - avgConsumption) / avgConsumption) * 100 : 0;
      } else {
        pattern.peakDemandVariation = 0;
      }
    });

    return patterns;
  }

  private async calculateCarbonFootprint(
    consumption: { [utilityType: string]: number },
    organizationId: string
  ): Promise<number> {
    // This would typically use location-specific emission factors
    const emissionFactors = {
      ELECTRICITY: 0.4, // kg CO2 per kWh
      NATURAL_GAS: 2.0, // kg CO2 per therm
      FUEL_OIL: 10.2,   // kg CO2 per gallon
      PROPANE: 5.7,     // kg CO2 per gallon
      WATER: 0.001,     // kg CO2 per gallon (water treatment)
    };

    let totalCO2 = 0;
    Object.entries(consumption).forEach(([utilityType, amount]) => {
      const factor = emissionFactors[utilityType as keyof typeof emissionFactors] || 0;
      totalCO2 += amount * factor / 1000; // Convert to tons
    });

    return totalCO2;
  }

  private assessRegulatoryCompliance(
    metrics: EnergyMetrics,
    sustainabilityMetrics: any[]
  ): {
    regulatoryRequirements: string[];
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
    gaps: string[];
  } {
    // This would be customized based on actual regulatory requirements
    const requirements = [
      'Energy Star benchmarking reporting',
      'Greenhouse gas emissions reporting',
      'Energy efficiency standards compliance',
      'Renewable energy portfolio standards',
    ];

    const gaps: string[] = [];
    let complianceCount = 0;

    // Check Energy Star benchmarking
    if (metrics.benchmarking.percentileRanking >= 50) {
      complianceCount++;
    } else {
      gaps.push('Energy performance below median - consider efficiency improvements');
    }

    // Check GHG reporting
    const hasEmissionsData = sustainabilityMetrics.some(m => m.category === 'CARBON_EMISSIONS');
    if (hasEmissionsData) {
      complianceCount++;
    } else {
      gaps.push('Missing comprehensive greenhouse gas emissions tracking');
    }

    // Check efficiency standards
    if (metrics.efficiencyMetrics.energyIntensity < 50) { // kWh/sq ft threshold
      complianceCount++;
    } else {
      gaps.push('Energy intensity exceeds recommended levels');
    }

    // Check renewable energy
    if (metrics.sustainabilityScores.renewableEnergy >= 70) {
      complianceCount++;
    } else {
      gaps.push('Renewable energy adoption below recommended levels');
    }

    let complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
    if (complianceCount === requirements.length) {
      complianceStatus = 'COMPLIANT';
    } else if (complianceCount === 0) {
      complianceStatus = 'NON_COMPLIANT';
    } else {
      complianceStatus = 'PARTIAL';
    }

    return {
      regulatoryRequirements: requirements,
      complianceStatus,
      gaps,
    };
  }
}

export const energyManagementService = new EnergyManagementService();