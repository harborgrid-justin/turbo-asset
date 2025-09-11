import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { machineLearningService } from './MachineLearningService';
import {
  SpaceOptimizationPrediction,
  SpaceOptimizationRecommendation,
  CostForecastModel,
  CostPrediction,
  CostFactor,
  PredictiveModel,
  MLModel
} from '../../types/machinelearning';

/**
 * PredictiveAnalyticsService - Advanced predictive analytics for space optimization and cost forecasting
 * Leverages machine learning models to predict future space utilization, costs, and optimization opportunities
 */
export class PredictiveAnalyticsService extends EventEmitter {
  private spaceOptimizationModel?: MLModel;
  private costForecastingModel?: MLModel;
  private demandPredictionModel?: MLModel;
  private energyForecastModel?: MLModel;

  constructor() {
    super();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      logger.info('Initializing Predictive Analytics Service');
      
      // Initialize space optimization model
      this.spaceOptimizationModel = await machineLearningService.registerModel(
        'Space Optimization Predictor',
        'PREDICTIVE_ANALYTICS',
        {
          algorithm: 'GRADIENT_BOOSTING',
          lookbackPeriod: 90,
          forecastHorizon: 365,
          features: [
            'historical_utilization',
            'occupancy_trends',
            'seasonal_patterns',
            'space_type',
            'department_size',
            'growth_rate',
            'cost_per_sqft',
            'employee_satisfaction'
          ]
        },
        {
          trainingDataSize: 50000,
          features: [
            'historical_utilization',
            'occupancy_trends',
            'seasonal_patterns',
            'space_type',
            'department_size',
            'growth_rate',
            'cost_per_sqft',
            'employee_satisfaction'
          ],
          target: 'future_utilization',
          algorithm: 'GRADIENT_BOOSTING'
        }
      );

      // Initialize cost forecasting model
      this.costForecastingModel = await machineLearningService.registerModel(
        'Cost Forecasting Predictor',
        'FORECASTING',
        {
          algorithm: 'LSTM_TIME_SERIES',
          forecastHorizon: 365,
          features: [
            'historical_costs',
            'inflation_rate',
            'market_trends',
            'utilization_rates',
            'maintenance_cycles',
            'energy_prices',
            'lease_escalations'
          ]
        },
        {
          trainingDataSize: 75000,
          features: [
            'historical_costs',
            'inflation_rate',
            'market_trends',
            'utilization_rates',
            'maintenance_cycles',
            'energy_prices',
            'lease_escalations'
          ],
          target: 'future_costs',
          algorithm: 'LSTM_TIME_SERIES'
        }
      );

      // Initialize demand prediction model
      this.demandPredictionModel = await machineLearningService.registerModel(
        'Space Demand Predictor',
        'TIME_SERIES',
        {
          algorithm: 'PROPHET',
          seasonality: {
            weekly: true,
            monthly: true,
            yearly: true
          },
          features: [
            'employee_count',
            'department_growth',
            'business_cycles',
            'remote_work_trends',
            'meeting_frequency',
            'collaboration_patterns'
          ]
        }
      );

      // Initialize energy forecast model
      this.energyForecastModel = await machineLearningService.registerModel(
        'Energy Cost Forecaster',
        'FORECASTING',
        {
          algorithm: 'ARIMA_ENSEMBLE',
          features: [
            'historical_energy_usage',
            'weather_patterns',
            'occupancy_levels',
            'equipment_efficiency',
            'utility_rates',
            'building_age',
            'insulation_rating'
          ]
        }
      );

      // Start training models
      await this.trainModels();

      logger.info('Predictive Analytics Service initialized successfully');
      this.emit('service:initialized');

    } catch (error: unknown) {
      logger.error('Failed to initialize Predictive Analytics Service', error);
      throw error;
    }
  }

  /**
   * Predict space optimization opportunities
   */
  async predictSpaceOptimization(
    organizationId: string,
    options: {
      spaceIds?: string[];
      forecastHorizon?: number;
      includeRecommendations?: boolean;
      scenarios?: string[];
    } = {}
  ): Promise<SpaceOptimizationPrediction[]> {
    try {
      const {
        spaceIds,
        forecastHorizon = 90,
        includeRecommendations = true,
        scenarios = ['CURRENT', 'GROWTH', 'OPTIMIZATION']
      } = options;

      logger.info('Generating space optimization predictions', {
        organizationId,
        spaceIds: spaceIds?.length || 'all',
        forecastHorizon
      });

      // Get historical space utilization data
      const historicalData = await this.getSpaceHistoricalData(organizationId, spaceIds);
      
      const predictions: SpaceOptimizationPrediction[] = [];

      for (const spaceData of historicalData) {
        // Prepare features for prediction
        const features = await this.prepareSpaceOptimizationFeatures(spaceData, forecastHorizon);
        
        // Generate predictions for each scenario
        for (const scenario of scenarios) {
          const scenarioFeatures = this.applyScenarioAdjustments(features, scenario);
          
          // Make prediction using ML model
          const predictionResult = await machineLearningService.predict(
            this.spaceOptimizationModel!.id,
            scenarioFeatures,
            { includeConfidence: true }
          );

          // Calculate optimization potential
          const optimizationPotential = this.calculateOptimizationPotential(
            spaceData.currentUtilization,
            predictionResult.prediction,
            spaceData.capacity
          );

          // Generate recommendations if requested
          const recommendations = includeRecommendations 
            ? await this.generateSpaceOptimizationRecommendations(spaceData, predictionResult, optimizationPotential)
            : [];

          const prediction: SpaceOptimizationPrediction = {
            spaceId: spaceData.spaceId,
            currentUtilization: spaceData.currentUtilization,
            predictedUtilization: predictionResult.prediction,
            optimizationPotential,
            recommendations,
            confidence: predictionResult.confidence,
            forecastPeriod: forecastHorizon
          };

          predictions.push(prediction);
        }
      }

      logger.info('Space optimization predictions generated', {
        organizationId,
        predictionsCount: predictions.length
      });

      this.emit('predictions:generated', {
        type: 'space_optimization',
        organizationId,
        count: predictions.length
      });

      return predictions;

    } catch (error: unknown) {
      logger.error('Failed to predict space optimization', { organizationId, error });
      throw error;
    }
  }

  /**
   * Forecast costs for various categories
   */
  async forecastCosts(
    organizationId: string,
    options: {
      categories?: ('MAINTENANCE' | 'ENERGY' | 'LEASE' | 'OPERATIONAL')[];
      forecastHorizon?: number;
      confidenceInterval?: number;
      includeScenarios?: boolean;
    } = {}
  ): Promise<CostForecastModel[]> {
    try {
      const {
        categories = ['MAINTENANCE', 'ENERGY', 'LEASE', 'OPERATIONAL'],
        forecastHorizon = 365,
        confidenceInterval = 0.95,
        includeScenarios = true
      } = options;

      logger.info('Generating cost forecasts', {
        organizationId,
        categories,
        forecastHorizon
      });

      const forecasts: CostForecastModel[] = [];

      for (const category of categories) {
        // Get historical cost data
        const historicalCosts = await this.getCostHistoricalData(organizationId, category);
        
        // Prepare features for prediction
        const features = await this.prepareCostForecastFeatures(historicalCosts, category, forecastHorizon);
        
        // Generate base prediction
        const predictionResult = await machineLearningService.predict(
          this.costForecastingModel!.id,
          features,
          { includeConfidence: true }
        );

        // Generate detailed predictions for each period
        const predictions: CostPrediction[] = [];
        const baselineCost = historicalCosts.averageMonthlyCost;
        
        for (let month = 1; month <= Math.ceil(forecastHorizon / 30); month++) {
          // Calculate period-specific factors
          const periodFactors = await this.calculateCostFactors(category, month, features);
          
          // Apply growth trends and seasonality
          const growthFactor = this.calculateGrowthFactor(category, month, features);
          const seasonalityFactor = this.calculateSeasonalityFactor(category, month);
          
          const predictedCost = baselineCost * growthFactor * seasonalityFactor;
          const uncertainty = this.calculateCostUncertainty(category, month, predictionResult.confidence);
          
          const prediction: CostPrediction = {
            period: new Date(Date.now() + month * 30 * 24 * 60 * 60 * 1000),
            predictedCost,
            lowerBound: predictedCost * (1 - uncertainty),
            upperBound: predictedCost * (1 + uncertainty),
            factors: periodFactors
          };

          predictions.push(prediction);
        }

        const forecast: CostForecastModel = {
          forecastId: this.generateForecastId(),
          organizationId,
          forecastType: category,
          predictions,
          confidence: predictionResult.confidence,
          modelAccuracy: this.costForecastingModel!.accuracy
        };

        forecasts.push(forecast);
      }

      logger.info('Cost forecasts generated', {
        organizationId,
        forecastsCount: forecasts.length
      });

      this.emit('forecasts:generated', {
        type: 'cost',
        organizationId,
        categories,
        count: forecasts.length
      });

      return forecasts;

    } catch (error: unknown) {
      logger.error('Failed to forecast costs', { organizationId, error });
      throw error;
    }
  }

  /**
   * Predict space demand based on business growth and trends
   */
  async predictSpaceDemand(
    organizationId: string,
    options: {
      forecastHorizon?: number;
      includeCapacityPlanning?: boolean;
      scenarios?: ('CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE')[];
    } = {}
  ): Promise<any> {
    try {
      const {
        forecastHorizon = 365,
        includeCapacityPlanning = true,
        scenarios = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']
      } = options;

      logger.info('Predicting space demand', {
        organizationId,
        forecastHorizon,
        scenarios
      });

      // Get organizational growth data
      const growthData = await this.getOrganizationalGrowthData(organizationId);
      
      // Get current space inventory
      const spaceInventory = await this.getCurrentSpaceInventory(organizationId);
      
      const demandPredictions = [];

      for (const scenario of scenarios) {
        // Prepare features for demand prediction
        const features = await this.prepareDemandPredictionFeatures(
          growthData,
          spaceInventory,
          scenario,
          forecastHorizon
        );

        // Make prediction using demand model
        const predictionResult = await machineLearningService.predict(
          this.demandPredictionModel!.id,
          features,
          { includeConfidence: true }
        );

        // Calculate space requirements by type
        const spaceRequirements = this.calculateSpaceRequirements(
          predictionResult.prediction,
          spaceInventory,
          scenario
        );

        // Generate capacity planning recommendations if requested
        const capacityPlan = includeCapacityPlanning 
          ? await this.generateCapacityPlan(spaceRequirements, spaceInventory, scenario)
          : null;

        const demandPrediction = {
          scenario,
          forecastHorizon,
          confidence: predictionResult.confidence,
          predictions: predictionResult.prediction,
          spaceRequirements,
          capacityPlan,
          keyMetrics: {
            projectedEmployeeGrowth: features.employeeGrowthRate,
            spacePerEmployee: features.targetSpacePerEmployee,
            utilizationTarget: features.targetUtilization,
            totalSpaceNeeded: spaceRequirements.totalRequired,
            currentCapacity: spaceInventory.totalCapacity,
            capacityGap: spaceRequirements.totalRequired - spaceInventory.totalCapacity
          }
        };

        demandPredictions.push(demandPrediction);
      }

      logger.info('Space demand predictions completed', {
        organizationId,
        scenariosCount: demandPredictions.length
      });

      return {
        organizationId,
        generatedAt: new Date(),
        forecastHorizon,
        scenarios: demandPredictions,
        summary: this.generateDemandSummary(demandPredictions),
        recommendations: await this.generateDemandRecommendations(demandPredictions, organizationId)
      };

    } catch (error: unknown) {
      logger.error('Failed to predict space demand', { organizationId, error });
      throw error;
    }
  }

  /**
   * Generate energy cost predictions with efficiency recommendations
   */
  async predictEnergyCosts(
    organizationId: string,
    options: {
      buildingIds?: string[];
      forecastHorizon?: number;
      includeEfficiencyRecommendations?: boolean;
    } = {}
  ): Promise<any> {
    try {
      const {
        buildingIds,
        forecastHorizon = 365,
        includeEfficiencyRecommendations = true
      } = options;

      logger.info('Predicting energy costs', {
        organizationId,
        buildingIds: buildingIds?.length || 'all',
        forecastHorizon
      });

      // Get historical energy data
      const energyData = await this.getEnergyHistoricalData(organizationId, buildingIds);
      
      const energyPredictions = [];

      for (const buildingData of energyData) {
        // Prepare features for energy prediction
        const features = await this.prepareEnergyPredictionFeatures(buildingData, forecastHorizon);
        
        // Make prediction using energy forecast model
        const predictionResult = await machineLearningService.predict(
          this.energyForecastModel!.id,
          features,
          { includeConfidence: true }
        );

        // Calculate monthly predictions
        const monthlyPredictions = this.generateMonthlyEnergyPredictions(
          predictionResult.prediction,
          buildingData,
          forecastHorizon
        );

        // Generate efficiency recommendations if requested
        const efficiencyRecommendations = includeEfficiencyRecommendations
          ? await this.generateEfficiencyRecommendations(buildingData, predictionResult)
          : [];

        const buildingPrediction = {
          buildingId: buildingData.buildingId,
          buildingName: buildingData.buildingName,
          currentEnergyUsage: buildingData.currentMonthlyUsage,
          predictions: monthlyPredictions,
          totalForecastCost: monthlyPredictions.reduce((sum, p) => sum + p.cost, 0),
          confidence: predictionResult.confidence,
          efficiencyRecommendations,
          potentialSavings: efficiencyRecommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0)
        };

        energyPredictions.push(buildingPrediction);
      }

      logger.info('Energy cost predictions completed', {
        organizationId,
        buildingsCount: energyPredictions.length
      });

      return {
        organizationId,
        generatedAt: new Date(),
        forecastHorizon,
        buildings: energyPredictions,
        summary: {
          totalCurrentCost: energyPredictions.reduce((sum, b) => sum + b.currentEnergyUsage * 12, 0),
          totalForecastCost: energyPredictions.reduce((sum, b) => sum + b.totalForecastCost, 0),
          totalPotentialSavings: energyPredictions.reduce((sum, b) => sum + b.potentialSavings, 0),
          averageConfidence: energyPredictions.reduce((sum, b) => sum + b.confidence, 0) / energyPredictions.length
        },
        overallRecommendations: await this.generateOverallEnergyRecommendations(energyPredictions)
      };

    } catch (error: unknown) {
      logger.error('Failed to predict energy costs', { organizationId, error });
      throw error;
    }
  }

  /**
   * Private: Train all prediction models
   */
  private async trainModels(): Promise<void> {
    try {
      const models = [
        { model: this.spaceOptimizationModel, name: 'Space Optimization' },
        { model: this.costForecastingModel, name: 'Cost Forecasting' },
        { model: this.demandPredictionModel, name: 'Demand Prediction' },
        { model: this.energyForecastModel, name: 'Energy Forecast' }
      ];

      for (const { model, name } of models) {
        if (model) {
          logger.info(`Training ${name} model`);
          const trainingConfig = this.getTrainingConfig(model.type);
          await machineLearningService.trainModel(model.id, trainingConfig);
        }
      }

      logger.info('All predictive models trained successfully');
    } catch (error: unknown) {
      logger.error('Failed to train predictive models', error);
      throw error;
    }
  }

  /**
   * Private: Get training configuration for model type
   */
  private getTrainingConfig(modelType: string): any {
    const baseConfig = {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      learningRate: 0.001
    };

    switch (modelType) {
      case 'PREDICTIVE_ANALYTICS':
        return {
          ...baseConfig,
          dataSource: 'space_utilization_history',
          features: [
            'historical_utilization',
            'occupancy_trends',
            'seasonal_patterns',
            'space_type',
            'department_size',
            'growth_rate'
          ],
          target: 'future_utilization',
          algorithm: 'GRADIENT_BOOSTING'
        };
      
      case 'FORECASTING':
        return {
          ...baseConfig,
          dataSource: 'cost_history',
          features: [
            'historical_costs',
            'inflation_rate',
            'market_trends',
            'utilization_rates'
          ],
          target: 'future_costs',
          algorithm: 'LSTM_TIME_SERIES'
        };
      
      case 'TIME_SERIES':
        return {
          ...baseConfig,
          dataSource: 'demand_history',
          features: [
            'employee_count',
            'department_growth',
            'business_cycles'
          ],
          target: 'future_demand',
          algorithm: 'PROPHET'
        };
      
      default:
        return baseConfig;
    }
  }

  /**
   * Private: Data preparation methods
   */
  private async getSpaceHistoricalData(organizationId: string, spaceIds?: string[]): Promise<any[]> {
    // Simulate historical space utilization data retrieval
    const spaces = spaceIds || await this.getAllSpaceIds(organizationId);
    
    return spaces.map(spaceId => ({
      spaceId,
      currentUtilization: Math.random() * 0.4 + 0.4, // 40-80%
      capacity: Math.floor(Math.random() * 50 + 10),
      spaceType: ['OFFICE', 'MEETING', 'COLLABORATIVE', 'FOCUS'][Math.floor(Math.random() * 4)],
      area: Math.floor(Math.random() * 500 + 100),
      historicalData: Array.from({ length: 90 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        utilization: Math.random() * 0.5 + 0.3
      }))
    }));
  }

  private async getCostHistoricalData(organizationId: string, category: string): Promise<any> {
    return {
      category,
      averageMonthlyCost: Math.random() * 50000 + 25000,
      trend: Math.random() > 0.5 ? 'INCREASING' : 'STABLE',
      volatility: Math.random() * 0.3 + 0.1,
      historicalData: Array.from({ length: 36 }, (_, i) => ({
        month: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
        cost: Math.random() * 20000 + 30000
      }))
    };
  }

  private async getOrganizationalGrowthData(organizationId: string): Promise<any> {
    return {
      currentEmployeeCount: Math.floor(Math.random() * 5000 + 1000),
      growthRate: Math.random() * 0.2 + 0.05, // 5-25% growth
      departmentGrowth: {
        ENGINEERING: Math.random() * 0.3 + 0.1,
        SALES: Math.random() * 0.25 + 0.05,
        MARKETING: Math.random() * 0.2 + 0.03,
        OPERATIONS: Math.random() * 0.15 + 0.02
      },
      businessCycle: 'GROWTH',
      remoteWorkTrend: Math.random() * 0.4 + 0.3 // 30-70% remote
    };
  }

  private async getCurrentSpaceInventory(organizationId: string): Promise<any> {
    return {
      totalCapacity: Math.floor(Math.random() * 2000 + 500),
      utilizationRate: Math.random() * 0.4 + 0.5, // 50-90%
      spacesByType: {
        OFFICE: Math.floor(Math.random() * 800 + 200),
        MEETING: Math.floor(Math.random() * 200 + 50),
        COLLABORATIVE: Math.floor(Math.random() * 300 + 100),
        FOCUS: Math.floor(Math.random() * 150 + 50)
      },
      averageSpacePerEmployee: Math.random() * 100 + 150 // 150-250 sqft
    };
  }

  private async getEnergyHistoricalData(organizationId: string, buildingIds?: string[]): Promise<any[]> {
    const buildings = buildingIds || ['building1', 'building2', 'building3'];
    
    return buildings.map(buildingId => ({
      buildingId,
      buildingName: `Building ${buildingId.slice(-1)}`,
      currentMonthlyUsage: Math.random() * 10000 + 5000, // kWh
      currentMonthlyCost: Math.random() * 2000 + 1000,
      efficiency: Math.random() * 0.4 + 0.6, // 60-100%
      buildingAge: Math.floor(Math.random() * 30 + 5),
      squareFeet: Math.floor(Math.random() * 50000 + 25000),
      equipmentEfficiency: Math.random() * 0.3 + 0.7
    }));
  }

  /**
   * Private: Feature preparation methods
   */
  private async prepareSpaceOptimizationFeatures(spaceData: any, forecastHorizon: number): Promise<any> {
    return {
      historical_utilization: spaceData.historicalData.map((d: any) => d.utilization),
      current_utilization: spaceData.currentUtilization,
      space_type: spaceData.spaceType,
      capacity: spaceData.capacity,
      area: spaceData.area,
      forecast_horizon: forecastHorizon,
      seasonal_factor: this.calculateSeasonalFactor(),
      trend_factor: this.calculateTrendFactor(spaceData.historicalData),
      occupancy_variance: this.calculateVariance(spaceData.historicalData.map((d: any) => d.utilization))
    };
  }

  private async prepareCostForecastFeatures(costData: any, category: string, forecastHorizon: number): Promise<any> {
    return {
      historical_costs: costData.historicalData.map((d: any) => d.cost),
      category,
      trend: costData.trend,
      volatility: costData.volatility,
      forecast_horizon: forecastHorizon,
      inflation_rate: 0.03, // 3% baseline inflation
      market_factor: Math.random() * 0.2 + 0.9, // Market adjustment factor
      seasonal_factor: this.calculateSeasonalFactor()
    };
  }

  private async prepareDemandPredictionFeatures(
    growthData: any,
    spaceInventory: any,
    scenario: string,
    forecastHorizon: number
  ): Promise<any> {
    const scenarioMultiplier = {
      CONSERVATIVE: 0.8,
      MODERATE: 1.0,
      AGGRESSIVE: 1.3
    }[scenario] || 1.0;

    return {
      current_employee_count: growthData.currentEmployeeCount,
      employeeGrowthRate: growthData.growthRate * scenarioMultiplier,
      department_growth: growthData.departmentGrowth,
      remote_work_trend: growthData.remoteWorkTrend,
      current_utilization: spaceInventory.utilizationRate,
      targetSpacePerEmployee: spaceInventory.averageSpacePerEmployee,
      targetUtilization: 0.8, // Target 80% utilization
      forecast_horizon: forecastHorizon,
      scenario
    };
  }

  private async prepareEnergyPredictionFeatures(buildingData: any, forecastHorizon: number): Promise<any> {
    return {
      current_usage: buildingData.currentMonthlyUsage,
      building_age: buildingData.buildingAge,
      square_feet: buildingData.squareFeet,
      efficiency_rating: buildingData.efficiency,
      equipment_efficiency: buildingData.equipmentEfficiency,
      forecast_horizon: forecastHorizon,
      seasonal_factor: this.calculateSeasonalFactor(),
      weather_factor: Math.random() * 0.3 + 0.85, // Weather impact
      utility_rate_trend: Math.random() * 0.1 + 0.02 // 2-12% rate increase
    };
  }

  /**
   * Private: Calculation helper methods
   */
  private calculateOptimizationPotential(current: number, predicted: number, capacity: number): number {
    const utilizationGap = Math.max(0, 0.8 - Math.max(current, predicted)); // Target 80% utilization
    return utilizationGap * capacity;
  }

  private calculateSeasonalFactor(): number {
    const month = new Date().getMonth();
    // Simple seasonal pattern - higher in winter, lower in summer
    return 0.9 + 0.2 * Math.sin((month - 6) * Math.PI / 6);
  }

  private calculateTrendFactor(historicalData: any[]): number {
    if (historicalData.length < 2) {return 1.0;}
    
    const recent = historicalData.slice(0, 10).map((d: any) => d.utilization);
    const older = historicalData.slice(-10).map((d: any) => d.utilization);
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    return recentAvg / olderAvg;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateGrowthFactor(category: string, month: number, features: any): number {
    const baseGrowth = {
      MAINTENANCE: 1.03, // 3% annual growth
      ENERGY: 1.05, // 5% annual growth
      LEASE: 1.04, // 4% annual growth
      OPERATIONAL: 1.02 // 2% annual growth
    }[category] || 1.03;

    return Math.pow(baseGrowth, month / 12);
  }

  private calculateSeasonalityFactor(category: string, month: number): number {
    const seasonalPatterns = {
      MAINTENANCE: [1.1, 0.9, 1.0, 1.2, 1.1, 0.8, 0.7, 0.8, 1.0, 1.1, 1.2, 1.1],
      ENERGY: [1.3, 1.2, 1.0, 0.8, 0.7, 0.9, 1.1, 1.2, 0.9, 0.8, 1.0, 1.2],
      LEASE: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
      OPERATIONAL: [1.1, 1.0, 1.0, 1.0, 0.9, 0.9, 0.8, 0.8, 1.0, 1.1, 1.1, 1.2]
    };

    const pattern = seasonalPatterns[category as keyof typeof seasonalPatterns] || [1.0];
    return pattern[(month - 1) % 12] || 1.0;
  }

  private calculateCostUncertainty(category: string, month: number, confidence: number): number {
    const baseUncertainty = {
      MAINTENANCE: 0.15,
      ENERGY: 0.20,
      LEASE: 0.05,
      OPERATIONAL: 0.12
    }[category] || 0.15;

    const timeDecay = Math.min(0.1, month * 0.01); // Uncertainty increases over time
    return (baseUncertainty + timeDecay) * (1 - confidence);
  }

  /**
   * Private: Recommendation generation methods
   */
  private async generateSpaceOptimizationRecommendations(
    spaceData: any,
    prediction: any,
    optimizationPotential: number
  ): Promise<SpaceOptimizationRecommendation[]> {
    const recommendations: SpaceOptimizationRecommendation[] = [];

    if (optimizationPotential > spaceData.capacity * 0.1) {
      recommendations.push({
        type: 'CONSOLIDATE',
        priority: 'HIGH',
        description: 'Space showing low utilization. Consider consolidating with adjacent spaces.',
        expectedSavings: optimizationPotential * 50, // $50 per sq ft saved annually
        implementationCost: optimizationPotential * 25,
        roi: 2.0,
        timeline: '6-8 weeks'
      });
    }

    if (prediction.prediction > 0.9) {
      recommendations.push({
        type: 'EXPAND',
        priority: 'MEDIUM',
        description: 'High predicted utilization indicates need for additional capacity.',
        expectedSavings: 0,
        implementationCost: spaceData.capacity * 0.2 * 100, // $100 per sq ft to expand
        roi: 1.5,
        timeline: '12-16 weeks'
      });
    }

    return recommendations;
  }

  private async calculateCostFactors(category: string, month: number, features: any): Promise<CostFactor[]> {
    const factors: CostFactor[] = [];

    factors.push({
      name: 'Inflation',
      impact: features.inflation_rate || 0.03,
      confidence: 0.9,
      description: 'General inflation rate impact on costs'
    });

    factors.push({
      name: 'Market Conditions',
      impact: (features.market_factor - 1) || 0.05,
      confidence: 0.75,
      description: 'Current market conditions affecting pricing'
    });

    factors.push({
      name: 'Seasonality',
      impact: features.seasonal_factor - 1,
      confidence: 0.85,
      description: 'Seasonal variations in demand and pricing'
    });

    return factors;
  }

  private calculateSpaceRequirements(prediction: any, inventory: any, scenario: string): any {
    const projectedEmployees = inventory.totalCapacity * (1 + prediction.employeeGrowthRate);
    const spacePerEmployee = inventory.averageSpacePerEmployee * (scenario === 'AGGRESSIVE' ? 1.1 : 0.95);
    
    return {
      totalRequired: Math.ceil(projectedEmployees * spacePerEmployee),
      byType: {
        OFFICE: Math.ceil(projectedEmployees * 0.6 * spacePerEmployee),
        MEETING: Math.ceil(projectedEmployees * 0.15 * spacePerEmployee),
        COLLABORATIVE: Math.ceil(projectedEmployees * 0.2 * spacePerEmployee),
        FOCUS: Math.ceil(projectedEmployees * 0.05 * spacePerEmployee)
      }
    };
  }

  private async generateCapacityPlan(requirements: any, inventory: any, scenario: string): Promise<any> {
    const gap = requirements.totalRequired - inventory.totalCapacity;
    
    if (gap > 0) {
      return {
        action: 'EXPAND',
        additionalSpaceNeeded: gap,
        estimatedCost: gap * 150, // $150 per sq ft
        timeline: '6-12 months',
        phasing: gap > 5000 ? 'PHASED' : 'SINGLE_PHASE'
      };
    } else if (gap < -inventory.totalCapacity * 0.2) {
      return {
        action: 'CONSOLIDATE',
        excessSpace: Math.abs(gap),
        potentialSavings: Math.abs(gap) * 50, // $50 per sq ft annually
        timeline: '3-6 months'
      };
    }

    return {
      action: 'OPTIMIZE',
      description: 'Current capacity sufficient with optimization',
      focusAreas: ['utilization', 'flexibility', 'efficiency']
    };
  }

  /**
   * Private: Summary and recommendation methods
   */
  private generateDemandSummary(predictions: any[]): any {
    return {
      averageGrowthProjection: predictions.reduce((sum, p) => sum + p.keyMetrics.projectedEmployeeGrowth, 0) / predictions.length,
      capacityGapRange: {
        min: Math.min(...predictions.map(p => p.keyMetrics.capacityGap)),
        max: Math.max(...predictions.map(p => p.keyMetrics.capacityGap))
      },
      recommendedScenario: predictions.find(p => p.scenario === 'MODERATE')?.scenario || 'MODERATE'
    };
  }

  private async generateDemandRecommendations(predictions: any[], organizationId: string): Promise<any[]> {
    const recommendations = [];

    const moderateScenario = predictions.find(p => p.scenario === 'MODERATE');
    if (moderateScenario?.keyMetrics.capacityGap > 0) {
      recommendations.push({
        type: 'CAPACITY_EXPANSION',
        priority: 'HIGH',
        description: 'Projected capacity shortage requires expansion planning',
        action: 'Begin capacity expansion planning',
        timeline: '6-12 months'
      });
    }

    return recommendations;
  }

  private generateMonthlyEnergyPredictions(basePrediction: any, buildingData: any, horizon: number): any[] {
    const predictions = [];
    const monthlyUsage = buildingData.currentMonthlyUsage;
    
    for (let month = 1; month <= Math.ceil(horizon / 30); month++) {
      const seasonalFactor = this.calculateSeasonalityFactor('ENERGY', month);
      const growthFactor = Math.pow(1.05, month / 12); // 5% annual growth
      
      const predictedUsage = monthlyUsage * seasonalFactor * growthFactor;
      const cost = predictedUsage * (buildingData.currentMonthlyCost / buildingData.currentMonthlyUsage);
      
      predictions.push({
        month: new Date(Date.now() + month * 30 * 24 * 60 * 60 * 1000),
        usage: predictedUsage,
        cost,
        seasonalFactor,
        growthFactor
      });
    }
    
    return predictions;
  }

  private async generateEfficiencyRecommendations(buildingData: any, prediction: any): Promise<any[]> {
    const recommendations = [];

    if (buildingData.efficiency < 0.8) {
      recommendations.push({
        type: 'HVAC_OPTIMIZATION',
        description: 'HVAC system efficiency below optimal range',
        estimatedSavings: buildingData.currentMonthlyCost * 12 * 0.15,
        investmentRequired: 50000,
        paybackPeriod: '2.8 years'
      });
    }

    if (buildingData.buildingAge > 20) {
      recommendations.push({
        type: 'INSULATION_UPGRADE',
        description: 'Building envelope improvements for older building',
        estimatedSavings: buildingData.currentMonthlyCost * 12 * 0.12,
        investmentRequired: 75000,
        paybackPeriod: '4.2 years'
      });
    }

    return recommendations;
  }

  private async generateOverallEnergyRecommendations(predictions: any[]): Promise<any[]> {
    return [
      {
        type: 'ENERGY_MANAGEMENT_SYSTEM',
        description: 'Implement centralized energy management system',
        potentialSavings: predictions.reduce((sum, p) => sum + p.totalForecastCost, 0) * 0.1,
        priority: 'HIGH'
      },
      {
        type: 'RENEWABLE_ENERGY',
        description: 'Evaluate renewable energy options',
        potentialSavings: predictions.reduce((sum, p) => sum + p.totalForecastCost, 0) * 0.08,
        priority: 'MEDIUM'
      }
    ];
  }

  /**
   * Private: Utility methods
   */
  private applyScenarioAdjustments(features: any, scenario: string): any {
    const adjustments = {
      CURRENT: 1.0,
      GROWTH: 1.2,
      OPTIMIZATION: 0.8
    };

    const multiplier = adjustments[scenario as keyof typeof adjustments] || 1.0;
    
    return {
      ...features,
      growth_factor: (features.growth_factor || 1.0) * multiplier,
      scenario
    };
  }

  private async getAllSpaceIds(organizationId: string): Promise<string[]> {
    // Simulate space ID retrieval
    return Array.from({ length: 20 }, (_, i) => `space_${i + 1}`);
  }

  private generateForecastId(): string {
    return `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const predictiveAnalyticsService = new PredictiveAnalyticsService();