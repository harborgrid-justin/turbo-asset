import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { machineLearningService } from './MachineLearningService';
import {
  ForecastingModel,
  ForecastAccuracy,
  SeasonalityInfo,
  CustomPattern,
  PortfolioForecast,
  ForecastPrediction,
  ForecastComponent,
  ForecastScenario,
  ForecastImpact,
  BudgetForecast,
  BudgetCategory,
  BudgetDriver,
  BudgetRiskFactor,
  MLModel
} from '@/types/machinelearning';

/**
 * AdvancedForecastingService - Advanced forecasting for portfolio planning and budgeting
 * Provides sophisticated time series forecasting using multiple algorithms and ensemble methods
 */
export class AdvancedForecastingService extends EventEmitter {
  private portfolioForecastModel?: MLModel;
  private budgetForecastModel?: MLModel;
  private demandForecastModel?: MLModel;
  private riskForecastModel?: MLModel;
  private ensembleForecastModel?: MLModel;

  private readonly forecastCache: Map<string, any> = new Map();
  private readonly modelAccuracies: Map<string, ForecastAccuracy> = new Map();
  
  // Forecasting parameters
  private readonly defaultHorizon = 365; // days
  private readonly minDataPoints = 30;
  private readonly confidenceLevel = 0.95;

  constructor() {
    super();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      logger.info('Initializing Advanced Forecasting Service');

      // Initialize portfolio forecasting model
      this.portfolioForecastModel = await machineLearningService.registerModel(
        'Portfolio Forecasting Engine',
        'FORECASTING',
        {
          algorithm: 'PROPHET_ENSEMBLE',
          forecastTypes: ['REVENUE', 'COSTS', 'OCCUPANCY', 'ENERGY', 'MAINTENANCE'],
          seasonalityComponents: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'],
          trendComponents: ['LINEAR', 'LOGISTIC', 'EXPONENTIAL'],
          uncertaintyEstimation: true,
          features: [
            'historical_data',
            'seasonal_patterns',
            'trend_components',
            'external_factors',
            'market_conditions',
            'economic_indicators',
            'business_events',
            'weather_patterns'
          ]
        },
        {
          trainingDataSize: 1500000,
          features: [
            'historical_data',
            'seasonal_patterns',
            'trend_components',
            'external_factors',
            'market_conditions',
            'economic_indicators',
            'business_events',
            'weather_patterns'
          ],
          target: 'forecast_values',
          algorithm: 'PROPHET_ENSEMBLE'
        }
      );

      // Initialize budget forecasting model
      this.budgetForecastModel = await machineLearningService.registerModel(
        'Budget Forecasting Engine',
        'FORECASTING',
        {
          algorithm: 'LSTM_ATTENTION_ENSEMBLE',
          budgetCategories: [
            'OPERATIONS', 'MAINTENANCE', 'ENERGY', 'SECURITY', 'CLEANING',
            'TECHNOLOGY', 'LEASING', 'CAPITAL_IMPROVEMENTS', 'INSURANCE', 'UTILITIES'
          ],
          riskFactors: true,
          scenarioAnalysis: true,
          features: [
            'historical_spending',
            'budget_categories',
            'cost_drivers',
            'inflation_rates',
            'utilization_metrics',
            'market_rates',
            'contract_escalations',
            'seasonal_adjustments'
          ]
        }
      );

      // Initialize demand forecasting model
      this.demandForecastModel = await machineLearningService.registerModel(
        'Space Demand Forecaster',
        'TIME_SERIES',
        {
          algorithm: 'ARIMA_NEURAL_HYBRID',
          demandTypes: ['SPACE_UTILIZATION', 'SERVICE_REQUESTS', 'RESOURCE_CONSUMPTION'],
          externalRegressors: true,
          features: [
            'historical_demand',
            'employee_growth',
            'business_cycles',
            'remote_work_trends',
            'seasonal_variations',
            'special_events',
            'policy_changes'
          ]
        }
      );

      // Initialize risk forecasting model
      this.riskForecastModel = await machineLearningService.registerModel(
        'Risk Forecasting Engine',
        'CLASSIFICATION',
        {
          algorithm: 'GRADIENT_BOOSTING_CLASSIFIER',
          riskCategories: ['FINANCIAL', 'OPERATIONAL', 'STRATEGIC', 'REGULATORY', 'ENVIRONMENTAL'],
          probabilityEstimation: true,
          features: [
            'historical_incidents',
            'risk_indicators',
            'market_volatility',
            'regulatory_changes',
            'operational_metrics',
            'financial_health',
            'external_threats'
          ]
        }
      );

      // Initialize ensemble forecasting model
      this.ensembleForecastModel = await machineLearningService.registerModel(
        'Ensemble Forecasting Engine',
        'FORECASTING',
        {
          algorithm: 'WEIGHTED_ENSEMBLE',
          baseModels: ['PROPHET', 'ARIMA', 'LSTM', 'EXPONENTIAL_SMOOTHING', 'LINEAR_REGRESSION'],
          weightingMethod: 'DYNAMIC_PERFORMANCE_BASED',
          metaLearner: 'STACKING_REGRESSOR',
          features: [
            'base_model_predictions',
            'model_uncertainties',
            'historical_accuracies',
            'data_characteristics',
            'forecast_horizon',
            'seasonality_strength'
          ]
        }
      );

      // Train all models
      await this.trainForecastingModels();

      // Initialize model accuracy tracking
      await this.initializeAccuracyTracking();

      logger.info('Advanced Forecasting Service initialized successfully');
      this.emit('service:initialized');

    } catch (error: unknown) {
      logger.error('Failed to initialize Advanced Forecasting Service', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive portfolio forecasts
   */
  async generatePortfolioForecast(
    organizationId: string,
    forecastType: 'REVENUE' | 'COSTS' | 'OCCUPANCY' | 'ENERGY' | 'MAINTENANCE',
    options: {
      horizon?: number;
      includeScenarios?: boolean;
      includeUncertainty?: boolean;
      includeSeasonality?: boolean;
      includeExternalFactors?: boolean;
      customEvents?: Array<{ date: Date; impact: number; description: string }>;
    } = {}
  ): Promise<PortfolioForecast> {
    try {
      const {
        horizon = this.defaultHorizon,
        includeScenarios = true,
        includeUncertainty = true,
        includeSeasonality = true,
        includeExternalFactors = false,
        customEvents = []
      } = options;

      const forecastId = this.generateForecastId();

      logger.info('Generating portfolio forecast', {
        forecastId,
        organizationId,
        forecastType,
        horizon,
        includeScenarios
      });

      // Get historical data
      const historicalData = await this.getHistoricalData(organizationId, forecastType);

      if (historicalData.length < this.minDataPoints) {
        throw new Error(`Insufficient historical data: ${historicalData.length} points, minimum required: ${this.minDataPoints}`);
      }

      // Prepare forecasting features
      const features = await this.prepareForecastingFeatures(
        organizationId,
        forecastType,
        historicalData,
        horizon,
        { includeSeasonality, includeExternalFactors, customEvents }
      );

      // Generate base forecast using ML model
      const baseForecast = await this.generateBaseForecast(
        features,
        forecastType,
        horizon
      );

      // Enhance with ensemble predictions
      const ensembleForecast = await this.enhanceWithEnsemble(
        baseForecast,
        features,
        forecastType
      );

      // Generate detailed predictions
      const predictions = await this.generateDetailedPredictions(
        ensembleForecast,
        historicalData,
        horizon,
        includeUncertainty
      );

      // Calculate forecast confidence
      const confidence = this.calculateForecastConfidence(
        ensembleForecast,
        historicalData,
        forecastType
      );

      // Generate scenarios if requested
      let scenarios: ForecastScenario[] = [];
      if (includeScenarios) {
        scenarios = await this.generateForecastScenarios(
          organizationId,
          forecastType,
          ensembleForecast,
          historicalData
        );
      }

      const portfolioForecast: PortfolioForecast = {
        forecastId,
        organizationId,
        type: forecastType,
        horizon,
        predictions,
        confidence,
        scenarios,
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + horizon * 24 * 60 * 60 * 1000),
        methodology: 'ENSEMBLE_ML',
        dataPoints: historicalData.length
      };

      // Cache the forecast
      this.cacheForcast(forecastId, portfolioForecast);

      // Emit forecast generated event
      this.emit('forecast:generated', {
        forecastId,
        organizationId,
        type: forecastType,
        horizon,
        confidence,
        scenariosCount: scenarios.length
      });

      logger.info('Portfolio forecast generated', {
        forecastId,
        organizationId,
        forecastType,
        predictionsCount: predictions.length,
        confidence,
        scenariosCount: scenarios.length
      });

      return portfolioForecast;

    } catch (error: unknown) {
      logger.error('Failed to generate portfolio forecast', { organizationId, forecastType, error });
      throw error;
    }
  }

  /**
   * Generate comprehensive budget forecasts with risk analysis
   */
  async generateBudgetForecast(
    organizationId: string,
    budgetPeriod: string,
    options: {
      categories?: string[];
      includeRiskAnalysis?: boolean;
      includeScenarios?: boolean;
      targetAccuracy?: number;
      includeDriverAnalysis?: boolean;
    } = {}
  ): Promise<BudgetForecast> {
    try {
      const {
        categories = [
          'OPERATIONS', 'MAINTENANCE', 'ENERGY', 'SECURITY', 'CLEANING',
          'TECHNOLOGY', 'LEASING', 'CAPITAL_IMPROVEMENTS'
        ],
        includeRiskAnalysis = true,
        includeScenarios = true,
        targetAccuracy = 0.85,
        includeDriverAnalysis = true
      } = options;

      const budgetId = this.generateBudgetId();

      logger.info('Generating budget forecast', {
        budgetId,
        organizationId,
        budgetPeriod,
        categoriesCount: categories.length,
        includeRiskAnalysis
      });

      if (!this.budgetForecastModel) {
        throw new Error('Budget forecasting model not available');
      }

      // Get historical budget data
      const historicalBudgets = await this.getHistoricalBudgetData(organizationId, categories);

      // Prepare budget forecasting features
      const features = await this.prepareBudgetForecastingFeatures(
        organizationId,
        budgetPeriod,
        categories,
        historicalBudgets
      );

      // Generate category-specific forecasts
      const categoryForecasts: BudgetCategory[] = [];
      
      for (const category of categories) {
        const categoryFeatures = {
          ...features,
          budget_category: category,
          category_history: historicalBudgets.filter((b: any) => b.category === category)
        };

        // Generate forecast for this category
        const forecast = await machineLearningService.predict(
          this.budgetForecastModel.id,
          categoryFeatures,
          { includeConfidence: true }
        );

        // Calculate category-specific metrics
        const categorySpend = this.calculateCategorySpend(historicalBudgets, category);
        const forecastSpend = forecast.prediction.forecast_amount || categorySpend.current * 1.05;
        const variance = forecastSpend - categorySpend.current;

        // Identify cost drivers if requested
        let drivers: BudgetDriver[] = [];
        if (includeDriverAnalysis) {
          drivers = await this.identifyBudgetDrivers(category, historicalBudgets, forecast);
        }

        categoryForecasts.push({
          name: category,
          currentSpend: categorySpend.current,
          forecastSpend,
          variance,
          confidence: forecast.confidence,
          drivers
        });
      }

      // Calculate total forecast
      const totalForecast = categoryForecasts.reduce((sum, cat) => sum + cat.forecastSpend, 0);
      const totalCurrent = categoryForecasts.reduce((sum, cat) => sum + cat.currentSpend, 0);
      const totalVariance = totalForecast - totalCurrent;

      // Calculate overall confidence
      const overallConfidence = categoryForecasts.reduce((sum, cat) => sum + cat.confidence, 0) / categoryForecasts.length;

      // Generate risk factors if requested
      let riskFactors: BudgetRiskFactor[] = [];
      if (includeRiskAnalysis) {
        riskFactors = await this.generateBudgetRiskFactors(
          organizationId,
          categoryForecasts,
          historicalBudgets
        );
      }

      const budgetForecast: BudgetForecast = {
        budgetId,
        organizationId,
        period: budgetPeriod,
        categories: categoryForecasts,
        totalForecast,
        variance: totalVariance,
        confidence: overallConfidence,
        riskFactors,
        generatedAt: new Date(),
        methodology: 'ML_ENSEMBLE',
        accuracy: this.estimateBudgetAccuracy(categoryForecasts, historicalBudgets)
      };

      // Generate scenarios if requested
      if (includeScenarios) {
        budgetForecast.scenarios = await this.generateBudgetScenarios(
          budgetForecast,
          historicalBudgets
        );
      }

      logger.info('Budget forecast generated', {
        budgetId,
        organizationId,
        totalForecast,
        variance: totalVariance,
        confidence: overallConfidence,
        riskFactorsCount: riskFactors.length
      });

      this.emit('budget:forecasted', {
        budgetId,
        organizationId,
        totalForecast,
        variance: totalVariance,
        riskLevel: this.calculateOverallRiskLevel(riskFactors)
      });

      return budgetForecast;

    } catch (error: unknown) {
      logger.error('Failed to generate budget forecast', { organizationId, budgetPeriod, error });
      throw error;
    }
  }

  /**
   * Generate space demand forecasts with capacity planning
   */
  async forecastSpaceDemand(
    organizationId: string,
    options: {
      spaceTypes?: string[];
      horizon?: number;
      includeCapacityPlanning?: boolean;
      includeGrowthScenarios?: boolean;
      includeSeasonality?: boolean;
    } = {}
  ): Promise<any> {
    try {
      const {
        spaceTypes = ['OFFICE', 'MEETING', 'COLLABORATIVE', 'STORAGE'],
        horizon = 365,
        includeCapacityPlanning = true,
        includeGrowthScenarios = true,
        includeSeasonality = true
      } = options;

      const forecastId = this.generateForecastId();

      logger.info('Forecasting space demand', {
        forecastId,
        organizationId,
        spaceTypes,
        horizon
      });

      if (!this.demandForecastModel) {
        throw new Error('Demand forecasting model not available');
      }

      // Get historical demand data
      const historicalDemand = await this.getHistoricalDemandData(organizationId, spaceTypes);
      
      // Get current capacity and utilization
      const currentCapacity = await this.getCurrentSpaceCapacity(organizationId, spaceTypes);

      // Prepare demand forecasting features
      const features = await this.prepareDemandForecastingFeatures(
        organizationId,
        spaceTypes,
        historicalDemand,
        currentCapacity,
        horizon,
        includeSeasonality
      );

      // Generate demand predictions for each space type
      const demandPredictions: any = {};
      
      for (const spaceType of spaceTypes) {
        const spaceFeatures = {
          ...features,
          space_type: spaceType,
          space_history: historicalDemand.filter((d: any) => d.spaceType === spaceType)
        };

        const prediction = await machineLearningService.predict(
          this.demandForecastModel.id,
          spaceFeatures,
          { includeConfidence: true }
        );

        demandPredictions[spaceType] = {
          currentUtilization: currentCapacity[spaceType]?.utilization || 0,
          currentCapacity: currentCapacity[spaceType]?.capacity || 0,
          forecastedDemand: prediction.prediction.demand_forecast || [],
          peakDemand: prediction.prediction.peak_demand || 0,
          averageDemand: prediction.prediction.average_demand || 0,
          confidence: prediction.confidence,
          trends: prediction.prediction.trends || {}
        };
      }

      // Generate capacity planning recommendations if requested
      let capacityPlan = null;
      if (includeCapacityPlanning) {
        capacityPlan = await this.generateCapacityPlan(
          demandPredictions,
          currentCapacity,
          organizationId
        );
      }

      // Generate growth scenarios if requested
      let growthScenarios = null;
      if (includeGrowthScenarios) {
        growthScenarios = await this.generateGrowthScenarios(
          organizationId,
          demandPredictions,
          horizon
        );
      }

      const demandForecast = {
        forecastId,
        organizationId,
        horizon,
        spaceTypes,
        predictions: demandPredictions,
        capacityPlan,
        growthScenarios,
        summary: this.generateDemandSummary(demandPredictions),
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + horizon * 24 * 60 * 60 * 1000)
      };

      logger.info('Space demand forecast generated', {
        forecastId,
        organizationId,
        spaceTypesCount: spaceTypes.length,
        hasCapacityPlan: capacityPlan !== null,
        hasScearios: growthScenarios !== null
      });

      this.emit('demand:forecasted', {
        forecastId,
        organizationId,
        summary: demandForecast.summary
      });

      return demandForecast;

    } catch (error: unknown) {
      logger.error('Failed to forecast space demand', { organizationId, error });
      throw error;
    }
  }

  /**
   * Generate ensemble forecasts combining multiple models
   */
  async generateEnsembleForecast(
    organizationId: string,
    dataType: string,
    targetVariable: string,
    options: {
      models?: string[];
      weightingMethod?: 'EQUAL' | 'PERFORMANCE' | 'DYNAMIC';
      includeUncertainty?: boolean;
      crossValidation?: boolean;
    } = {}
  ): Promise<any> {
    try {
      const {
        models = ['PROPHET', 'ARIMA', 'LSTM', 'EXPONENTIAL_SMOOTHING'],
        weightingMethod = 'PERFORMANCE',
        includeUncertainty = true,
        crossValidation = false
      } = options;

      const forecastId = this.generateForecastId();

      logger.info('Generating ensemble forecast', {
        forecastId,
        organizationId,
        dataType,
        targetVariable,
        models,
        weightingMethod
      });

      if (!this.ensembleForecastModel) {
        throw new Error('Ensemble forecasting model not available');
      }

      // Get historical data
      const historicalData = await this.getHistoricalDataForTarget(organizationId, dataType, targetVariable);

      // Generate predictions from individual models
      const modelPredictions: any = {};
      const modelAccuracies: any = {};

      for (const modelType of models) {
        try {
          const prediction = await this.generateSingleModelForecast(
            historicalData,
            modelType,
            targetVariable
          );
          
          modelPredictions[modelType] = prediction.forecast;
          modelAccuracies[modelType] = prediction.accuracy;
          
        } catch (error: unknown) {
          logger.warn(`Failed to generate ${modelType} forecast, skipping`, error);
        }
      }

      if (Object.keys(modelPredictions).length === 0) {
        throw new Error('No individual model forecasts were generated successfully');
      }

      // Calculate model weights based on performance
      const weights = this.calculateModelWeights(modelAccuracies, weightingMethod);

      // Prepare ensemble features
      const ensembleFeatures = {
        model_predictions: modelPredictions,
        model_accuracies: modelAccuracies,
        weights,
        weighting_method: weightingMethod,
        historical_data_stats: this.calculateDataStatistics(historicalData)
      };

      // Generate ensemble prediction
      const ensemblePrediction = await machineLearningService.predict(
        this.ensembleForecastModel.id,
        ensembleFeatures,
        { includeConfidence: true }
      );

      // Create ensemble forecast
      const ensembleForecast = this.combineModelForecasts(
        modelPredictions,
        weights,
        includeUncertainty
      );

      // Perform cross-validation if requested
      let crossValidationResults = null;
      if (crossValidation) {
        crossValidationResults = await this.performCrossValidation(
          historicalData,
          models,
          targetVariable
        );
      }

      const forecast = {
        forecastId,
        organizationId,
        dataType,
        targetVariable,
        ensembleForecast,
        individualForecasts: modelPredictions,
        modelWeights: weights,
        accuracy: ensemblePrediction.confidence,
        crossValidationResults,
        metadata: {
          modelsUsed: Object.keys(modelPredictions),
          dataPoints: historicalData.length,
          forecastHorizon: ensembleForecast.length,
          weightingMethod
        },
        generatedAt: new Date()
      };

      logger.info('Ensemble forecast generated', {
        forecastId,
        modelsUsed: Object.keys(modelPredictions).length,
        accuracy: ensemblePrediction.confidence,
        forecastPoints: ensembleForecast.length
      });

      this.emit('ensemble:forecasted', {
        forecastId,
        organizationId,
        accuracy: ensemblePrediction.confidence,
        modelsCount: Object.keys(modelPredictions).length
      });

      return forecast;

    } catch (error: unknown) {
      logger.error('Failed to generate ensemble forecast', { organizationId, dataType, targetVariable, error });
      throw error;
    }
  }

  /**
   * Get forecast accuracy metrics and model performance
   */
  async getForecastAccuracyMetrics(
    organizationId: string,
    forecastType: string,
    timeRange: { start: Date; end: Date }
  ): Promise<any> {
    try {
      logger.info('Calculating forecast accuracy metrics', {
        organizationId,
        forecastType,
        timeRange
      });

      // Get historical forecasts and actual values
      const historicalForecasts = await this.getHistoricalForecasts(
        organizationId,
        forecastType,
        timeRange
      );

      const actualValues = await this.getActualValues(
        organizationId,
        forecastType,
        timeRange
      );

      if (historicalForecasts.length === 0 || actualValues.length === 0) {
        throw new Error('Insufficient data for accuracy calculation');
      }

      // Calculate accuracy metrics
      const accuracyMetrics = this.calculateAccuracyMetrics(
        historicalForecasts,
        actualValues
      );

      // Analyze accuracy trends
      const accuracyTrends = this.analyzeAccuracyTrends(
        historicalForecasts,
        actualValues,
        timeRange
      );

      // Compare model performance
      const modelComparison = await this.compareModelPerformance(
        historicalForecasts,
        actualValues,
        forecastType
      );

      const metrics = {
        organizationId,
        forecastType,
        timeRange,
        accuracyMetrics,
        accuracyTrends,
        modelComparison,
        recommendations: this.generateAccuracyRecommendations(accuracyMetrics, modelComparison),
        calculatedAt: new Date()
      };

      logger.info('Forecast accuracy metrics calculated', {
        organizationId,
        forecastType,
        overallAccuracy: accuracyMetrics.mape,
        trendDirection: accuracyTrends.direction,
        bestModel: modelComparison.bestPerforming?.model
      });

      return metrics;

    } catch (error: unknown) {
      logger.error('Failed to calculate forecast accuracy metrics', { organizationId, forecastType, error });
      throw error;
    }
  }

  /**
   * Private: Model training methods
   */
  private async trainForecastingModels(): Promise<void> {
    try {
      const models = [
        { model: this.portfolioForecastModel, name: 'Portfolio Forecasting' },
        { model: this.budgetForecastModel, name: 'Budget Forecasting' },
        { model: this.demandForecastModel, name: 'Demand Forecasting' },
        { model: this.riskForecastModel, name: 'Risk Forecasting' },
        { model: this.ensembleForecastModel, name: 'Ensemble Forecasting' }
      ];

      for (const { model, name } of models) {
        if (model) {
          logger.info(`Training ${name} model`);
          const trainingConfig = this.getForecastingTrainingConfig(model.type);
          await machineLearningService.trainModel(model.id, trainingConfig);
        }
      }

      logger.info('All forecasting models trained successfully');
    } catch (error: unknown) {
      logger.error('Failed to train forecasting models', error);
      throw error;
    }
  }

  private getForecastingTrainingConfig(modelType: string): any {
    const baseConfig = {
      epochs: 200,
      batchSize: 64,
      validationSplit: 0.2,
      learningRate: 0.0001,
      patience: 20
    };

    switch (modelType) {
      case 'FORECASTING':
        return {
          ...baseConfig,
          dataSource: 'time_series_forecasting_dataset',
          algorithm: 'PROPHET_ENSEMBLE',
          features: [
            'historical_data',
            'seasonal_patterns',
            'trend_components',
            'external_factors'
          ]
        };
      
      case 'TIME_SERIES':
        return {
          ...baseConfig,
          dataSource: 'demand_forecasting_dataset',
          algorithm: 'ARIMA_NEURAL_HYBRID',
          features: [
            'historical_demand',
            'external_regressors',
            'seasonal_variations'
          ]
        };
      
      default:
        return baseConfig;
    }
  }

  private async initializeAccuracyTracking(): Promise<void> {
    // Initialize accuracy tracking for different model types
    const defaultAccuracy: ForecastAccuracy = {
      mape: 15.0, // 15% MAPE as baseline
      smape: 12.0,
      rmse: 0.0,
      mae: 0.0
    };

    this.modelAccuracies.set('PORTFOLIO', defaultAccuracy);
    this.modelAccuracies.set('BUDGET', { ...defaultAccuracy, mape: 18.0, smape: 15.0 });
    this.modelAccuracies.set('DEMAND', { ...defaultAccuracy, mape: 20.0, smape: 18.0 });
    this.modelAccuracies.set('ENSEMBLE', { ...defaultAccuracy, mape: 12.0, smape: 10.0 });

    logger.info('Forecast accuracy tracking initialized');
  }

  /**
   * Private: Data preparation methods
   */
  private async getHistoricalData(organizationId: string, forecastType: string): Promise<any[]> {
    // Simulate historical data retrieval
    const dataPoints = 365; // One year of daily data
    const data = [];
    
    const baseValue = {
      'REVENUE': 500000,
      'COSTS': 300000,
      'OCCUPANCY': 0.75,
      'ENERGY': 150000,
      'MAINTENANCE': 25000
    }[forecastType] || 100000;

    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(Date.now() - (dataPoints - i) * 24 * 60 * 60 * 1000);
      const trend = i * 0.001; // Slight upward trend
      const seasonal = Math.sin((i / 365) * 2 * Math.PI) * 0.1; // Annual seasonality
      const weekly = Math.sin((i / 7) * 2 * Math.PI) * 0.05; // Weekly seasonality
      const noise = (Math.random() - 0.5) * 0.1; // Random noise

      const value = baseValue * (1 + trend + seasonal + weekly + noise);
      
      data.push({
        date,
        value: Math.max(0, value),
        dayOfWeek: date.getDay(),
        month: date.getMonth(),
        quarter: Math.floor(date.getMonth() / 3)
      });
    }

    return data;
  }

  private async prepareForecastingFeatures(
    organizationId: string,
    forecastType: string,
    historicalData: any[],
    horizon: number,
    options: any
  ): Promise<any> {
    const latest = historicalData[historicalData.length - 1];
    const values = historicalData.map(d => d.value);
    
    return {
      organization_id: organizationId,
      forecast_type: forecastType,
      forecast_horizon: horizon,
      data_points: historicalData.length,
      latest_value: latest?.value || 0,
      mean_value: values.reduce((sum, val) => sum + val, 0) / values.length,
      std_value: this.calculateStandardDeviation(values),
      trend_strength: this.calculateTrendStrength(values),
      seasonal_strength: this.calculateSeasonalStrength(historicalData),
      volatility: this.calculateVolatility(values),
      custom_events: options.customEvents?.length || 0,
      include_seasonality: options.includeSeasonality || false,
      include_external_factors: options.includeExternalFactors || false
    };
  }

  /**
   * Private: Forecasting methods
   */
  private async generateBaseForecast(features: any, forecastType: string, horizon: number): Promise<any> {
    if (!this.portfolioForecastModel) {
      return this.generateFallbackForecast(features, horizon);
    }

    try {
      const prediction = await machineLearningService.predict(
        this.portfolioForecastModel.id,
        features,
        { includeConfidence: true }
      );

      return {
        forecast: prediction.prediction.forecast || this.generateSimpleForecast(features.latest_value, horizon),
        confidence: prediction.confidence,
        methodology: 'ML_MODEL',
        features_used: Object.keys(features)
      };
    } catch (error: unknown) {
      logger.warn('Base forecast generation failed, using fallback', error);
      return this.generateFallbackForecast(features, horizon);
    }
  }

  private generateFallbackForecast(features: any, horizon: number): any {
    const forecast = this.generateSimpleForecast(features.latest_value, horizon);
    
    return {
      forecast,
      confidence: 0.7,
      methodology: 'SIMPLE_TREND',
      features_used: ['latest_value', 'trend_strength']
    };
  }

  private generateSimpleForecast(latestValue: number, horizon: number): number[] {
    const forecast = [];
    const trendRate = 0.001; // 0.1% daily growth
    
    for (let i = 1; i <= horizon; i++) {
      const trendComponent = latestValue * (1 + trendRate * i);
      const seasonalComponent = Math.sin((i / 365) * 2 * Math.PI) * latestValue * 0.05;
      const noise = (Math.random() - 0.5) * latestValue * 0.02;
      
      forecast.push(Math.max(0, trendComponent + seasonalComponent + noise));
    }
    
    return forecast;
  }

  private async enhanceWithEnsemble(baseForecast: any, features: any, forecastType: string): Promise<any> {
    if (!this.ensembleForecastModel) {
      return baseForecast;
    }

    try {
      const ensembleFeatures = {
        ...features,
        base_forecast: baseForecast.forecast,
        base_confidence: baseForecast.confidence,
        base_methodology: baseForecast.methodology
      };

      const enhancedPrediction = await machineLearningService.predict(
        this.ensembleForecastModel.id,
        ensembleFeatures,
        { includeConfidence: true }
      );

      return {
        forecast: enhancedPrediction.prediction.enhanced_forecast || baseForecast.forecast,
        confidence: Math.max(baseForecast.confidence, enhancedPrediction.confidence),
        methodology: 'ENSEMBLE_ENHANCED',
        ensemble_contribution: enhancedPrediction.prediction.ensemble_weight || 0.3
      };
    } catch (error: unknown) {
      logger.warn('Ensemble enhancement failed, using base forecast', error);
      return baseForecast;
    }
  }

  private async generateDetailedPredictions(
    forecast: any,
    historicalData: any[],
    horizon: number,
    includeUncertainty: boolean
  ): Promise<ForecastPrediction[]> {
    const predictions: ForecastPrediction[] = [];
    const baseValue = historicalData[historicalData.length - 1]?.value || 0;
    
    for (let i = 0; i < Math.min(forecast.forecast.length, horizon); i++) {
      const date = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
      const value = forecast.forecast[i];
      
      // Calculate uncertainty bounds if requested
      const uncertaintyFactor = includeUncertainty ? (1 - forecast.confidence) * 0.5 : 0;
      const lowerBound = value * (1 - uncertaintyFactor);
      const upperBound = value * (1 + uncertaintyFactor);
      
      // Decompose forecast components
      const trend = this.calculateTrendComponent(value, baseValue, i + 1);
      const seasonality = this.calculateSeasonalComponent(date, value);
      
      predictions.push({
        date,
        value,
        lowerBound,
        upperBound,
        trend,
        seasonality,
        components: [
          {
            name: 'trend',
            value: trend,
            contribution: Math.abs(trend) / value
          },
          {
            name: 'seasonality',
            value: seasonality,
            contribution: Math.abs(seasonality) / value
          }
        ]
      });
    }
    
    return predictions;
  }

  private calculateForecastConfidence(forecast: any, historicalData: any[], forecastType: string): number {
    const modelAccuracy = this.modelAccuracies.get(forecastType.toUpperCase());
    const baseConfidence = modelAccuracy ? (100 - modelAccuracy.mape) / 100 : 0.8;
    
    // Adjust confidence based on data quality
    const dataQualityFactor = Math.min(1, historicalData.length / 100); // Prefer 100+ data points
    const volatilityPenalty = this.calculateVolatility(historicalData.map(d => d.value)) * 0.1;
    
    const adjustedConfidence = baseConfidence * dataQualityFactor - volatilityPenalty;
    
    return Math.max(0.3, Math.min(0.95, adjustedConfidence));
  }

  /**
   * Private: Budget forecasting methods
   */
  private async getHistoricalBudgetData(organizationId: string, categories: string[]): Promise<any[]> {
    // Simulate historical budget data
    const data = [];
    const months = 24; // 2 years of monthly data
    
    for (let month = 0; month < months; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - month));
      
      for (const category of categories) {
        const baseAmount = this.getCategoryBaseAmount(category);
        const growth = month * 0.02; // 2% monthly growth
        const seasonal = Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.1;
        const noise = (Math.random() - 0.5) * 0.1;
        
        const amount = baseAmount * (1 + growth + seasonal + noise);
        
        data.push({
          date,
          category,
          amount: Math.max(0, amount),
          month: date.getMonth(),
          year: date.getFullYear()
        });
      }
    }
    
    return data;
  }

  private getCategoryBaseAmount(category: string): number {
    const amounts: Record<string, number> = {
      'OPERATIONS': 50000,
      'MAINTENANCE': 25000,
      'ENERGY': 30000,
      'SECURITY': 15000,
      'CLEANING': 12000,
      'TECHNOLOGY': 20000,
      'LEASING': 80000,
      'CAPITAL_IMPROVEMENTS': 40000,
      'INSURANCE': 8000,
      'UTILITIES': 18000
    };
    
    return amounts[category] || 10000;
  }

  private async prepareBudgetForecastingFeatures(
    organizationId: string,
    budgetPeriod: string,
    categories: string[],
    historicalData: any[]
  ): Promise<any> {
    const currentYear = new Date().getFullYear();
    const recentData = historicalData.filter(d => d.year >= currentYear - 1);
    
    return {
      organization_id: organizationId,
      budget_period: budgetPeriod,
      categories_count: categories.length,
      historical_months: historicalData.length / categories.length,
      total_historical_spend: historicalData.reduce((sum, item) => sum + item.amount, 0),
      recent_spend: recentData.reduce((sum, item) => sum + item.amount, 0),
      inflation_rate: 0.03, // 3% assumed inflation
      growth_rate: this.calculateGrowthRate(historicalData),
      seasonality_factor: this.calculateBudgetSeasonality(historicalData),
      categories
    };
  }

  private calculateCategorySpend(historicalData: any[], category: string): any {
    const categoryData = historicalData.filter(d => d.category === category);
    const recentData = categoryData.slice(-12); // Last 12 months
    
    return {
      current: recentData.reduce((sum, d) => sum + d.amount, 0) / 12, // Monthly average
      trend: this.calculateTrendStrength(recentData.map(d => d.amount)),
      volatility: this.calculateVolatility(recentData.map(d => d.amount))
    };
  }

  private async identifyBudgetDrivers(category: string, historicalData: any[], forecast: any): Promise<BudgetDriver[]> {
    const drivers: BudgetDriver[] = [];
    
    // Category-specific drivers
    switch (category) {
      case 'ENERGY':
        drivers.push(
          {
            name: 'Utility Rate Changes',
            impact: 0.15,
            trend: 'INCREASING',
            seasonality: true
          },
          {
            name: 'Occupancy Levels',
            impact: 0.25,
            trend: 'STABLE',
            seasonality: true
          }
        );
        break;
        
      case 'MAINTENANCE':
        drivers.push(
          {
            name: 'Equipment Age',
            impact: 0.20,
            trend: 'INCREASING',
            seasonality: false
          },
          {
            name: 'Preventive Maintenance Programs',
            impact: -0.10,
            trend: 'STABLE',
            seasonality: false
          }
        );
        break;
        
      case 'LEASING':
        drivers.push(
          {
            name: 'Market Rental Rates',
            impact: 0.08,
            trend: 'INCREASING',
            seasonality: false
          },
          {
            name: 'Lease Renewals',
            impact: 0.12,
            trend: 'STABLE',
            seasonality: false
          }
        );
        break;
        
      default:
        drivers.push(
          {
            name: 'General Inflation',
            impact: 0.03,
            trend: 'INCREASING',
            seasonality: false
          }
        );
    }
    
    return drivers;
  }

  private async generateBudgetRiskFactors(
    organizationId: string,
    categoryForecasts: BudgetCategory[],
    historicalData: any[]
  ): Promise<BudgetRiskFactor[]> {
    const riskFactors: BudgetRiskFactor[] = [];
    
    // High variance categories
    const highVarianceCategories = categoryForecasts.filter(cat => 
      Math.abs(cat.variance) / cat.currentSpend > 0.15
    );
    
    if (highVarianceCategories.length > 0) {
      riskFactors.push({
        factor: 'High Budget Variance',
        probability: 0.7,
        impact: highVarianceCategories.reduce((sum, cat) => sum + Math.abs(cat.variance), 0),
        mitigation: 'Implement tighter budget controls and frequent monitoring'
      });
    }
    
    // External economic factors
    riskFactors.push({
      factor: 'Economic Uncertainty',
      probability: 0.4,
      impact: categoryForecasts.reduce((sum, cat) => sum + cat.forecastSpend, 0) * 0.05,
      mitigation: 'Build contingency reserves and flexible contracts'
    });
    
    // Seasonal variations
    const seasonalRisk = this.calculateSeasonalRisk(historicalData);
    if (seasonalRisk > 0.1) {
      riskFactors.push({
        factor: 'Seasonal Budget Fluctuations',
        probability: 0.9,
        impact: categoryForecasts.reduce((sum, cat) => sum + cat.forecastSpend, 0) * seasonalRisk,
        mitigation: 'Develop seasonal budget allocation strategies'
      });
    }
    
    return riskFactors;
  }

  /**
   * Private: Calculation helper methods
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateTrendStrength(values: number[]): number {
    if (values.length < 2) {return 0;}
    
    const first = values[0];
    const last = values[values.length - 1];
    
    return (last - first) / first;
  }

  private calculateSeasonalStrength(historicalData: any[]): number {
    // Simplified seasonal strength calculation
    const monthlyAvgs: Record<number, number[]> = {};
    
    historicalData.forEach(point => {
      const month = point.date.getMonth();
      if (!monthlyAvgs[month]) {monthlyAvgs[month] = [];}
      monthlyAvgs[month].push(point.value);
    });
    
    const monthlyMeans = Object.entries(monthlyAvgs).map(([month, values]) => 
      values.reduce((sum, val) => sum + val, 0) / values.length
    );
    
    if (monthlyMeans.length < 2) {return 0;}
    
    const overallMean = monthlyMeans.reduce((sum, val) => sum + val, 0) / monthlyMeans.length;
    const variance = monthlyMeans.reduce((sum, val) => sum + Math.pow(val - overallMean, 2), 0) / monthlyMeans.length;
    
    return Math.sqrt(variance) / overallMean;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) {return 0;}
    
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        returns.push((values[i] - values[i - 1]) / values[i - 1]);
      }
    }
    
    return this.calculateStandardDeviation(returns);
  }

  private calculateTrendComponent(value: number, baseValue: number, period: number): number {
    const trendRate = 0.001; // Default trend rate
    return baseValue * trendRate * period;
  }

  private calculateSeasonalComponent(date: Date, value: number): number {
    const monthSeasonal = Math.sin((date.getMonth() / 12) * 2 * Math.PI);
    const weekSeasonal = Math.sin((date.getDay() / 7) * 2 * Math.PI);
    
    return value * (monthSeasonal * 0.1 + weekSeasonal * 0.05);
  }

  private calculateGrowthRate(historicalData: any[]): number {
    if (historicalData.length < 2) {return 0;}
    
    const sorted = historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());
    const first = sorted[0].amount;
    const last = sorted[sorted.length - 1].amount;
    const months = (sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return Math.pow(last / first, 1 / months) - 1;
  }

  private calculateBudgetSeasonality(historicalData: any[]): number {
    return this.calculateSeasonalStrength(historicalData.map(d => ({ date: d.date, value: d.amount })));
  }

  private calculateSeasonalRisk(historicalData: any[]): number {
    const seasonalStrength = this.calculateBudgetSeasonality(historicalData);
    return Math.min(0.3, seasonalStrength * 2); // Cap at 30% risk
  }

  private estimateBudgetAccuracy(categoryForecasts: BudgetCategory[], historicalData: any[]): number {
    // Estimate accuracy based on historical variance and confidence
    const avgConfidence = categoryForecasts.reduce((sum, cat) => sum + cat.confidence, 0) / categoryForecasts.length;
    const dataQuality = Math.min(1, historicalData.length / 100);
    
    return avgConfidence * dataQuality * 0.9; // Conservative estimate
  }

  private calculateOverallRiskLevel(riskFactors: BudgetRiskFactor[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    const totalRisk = riskFactors.reduce((sum, factor) => sum + factor.probability * factor.impact, 0);
    
    if (totalRisk < 10000) {return 'LOW';}
    if (totalRisk < 50000) {return 'MEDIUM';}
    return 'HIGH';
  }

  /**
   * Private: Scenario generation methods
   */
  private async generateForecastScenarios(
    organizationId: string,
    forecastType: string,
    baseForecast: any,
    historicalData: any[]
  ): Promise<ForecastScenario[]> {
    const scenarios: ForecastScenario[] = [];
    
    // Conservative scenario (10% below base)
    scenarios.push({
      name: 'Conservative',
      description: 'Lower growth expectations with economic headwinds',
      probability: 0.3,
      adjustments: { growth_rate: -0.1, volatility: 0.05 },
      impact: this.calculateScenarioImpact(baseForecast, -0.1)
    });
    
    // Base scenario
    scenarios.push({
      name: 'Base Case',
      description: 'Expected performance based on current trends',
      probability: 0.4,
      adjustments: {},
      impact: this.calculateScenarioImpact(baseForecast, 0)
    });
    
    // Optimistic scenario (15% above base)
    scenarios.push({
      name: 'Optimistic',
      description: 'Strong growth driven by favorable market conditions',
      probability: 0.3,
      adjustments: { growth_rate: 0.15, volatility: -0.02 },
      impact: this.calculateScenarioImpact(baseForecast, 0.15)
    });
    
    return scenarios;
  }

  private calculateScenarioImpact(baseForecast: any, adjustment: number): ForecastImpact {
    const impact: ForecastImpact = {};
    
    if (baseForecast.forecast && Array.isArray(baseForecast.forecast)) {
      const avgValue = baseForecast.forecast.reduce((sum: number, val: number) => sum + val, 0) / baseForecast.forecast.length;
      impact.revenue = avgValue * adjustment;
    }
    
    return impact;
  }

  private async generateBudgetScenarios(budget: BudgetForecast, historicalData: any[]): Promise<any[]> {
    return [
      {
        name: 'Cost Control',
        description: 'Aggressive cost reduction measures',
        adjustments: { total_reduction: 0.1 },
        impact: -budget.totalForecast * 0.1
      },
      {
        name: 'Business as Usual',
        description: 'Current budget trajectory',
        adjustments: {},
        impact: 0
      },
      {
        name: 'Growth Investment',
        description: 'Increased spending to support growth',
        adjustments: { growth_investment: 0.15 },
        impact: budget.totalForecast * 0.15
      }
    ];
  }

  /**
   * Private: Utility methods
   */
  private cacheForcast(forecastId: string, forecast: any): void {
    // Simple cache with 1 hour TTL
    this.forecastCache.set(forecastId, {
      data: forecast,
      timestamp: Date.now(),
      ttl: 60 * 60 * 1000 // 1 hour
    });
    
    // Cleanup old cache entries
    this.cleanupCache();
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.forecastCache) {
      if (now - cached.timestamp > cached.ttl) {
        this.forecastCache.delete(key);
      }
    }
  }

  private generateForecastId(): string {
    return `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBudgetId(): string {
    return `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Additional stub implementations for completeness
  private async getHistoricalDemandData(organizationId: string, spaceTypes: string[]): Promise<any[]> { return []; }
  private async getCurrentSpaceCapacity(organizationId: string, spaceTypes: string[]): Promise<any> { return {}; }
  private async prepareDemandForecastingFeatures(organizationId: string, spaceTypes: string[], historicalDemand: any[], currentCapacity: any, horizon: number, includeSeasonality: boolean): Promise<any> { return {}; }
  private async generateCapacityPlan(demandPredictions: any, currentCapacity: any, organizationId: string): Promise<any> { return {}; }
  private async generateGrowthScenarios(organizationId: string, demandPredictions: any, horizon: number): Promise<any[]> { return []; }
  private generateDemandSummary(demandPredictions: any): any { return {}; }
  private async getHistoricalDataForTarget(organizationId: string, dataType: string, targetVariable: string): Promise<any[]> { return []; }
  private async generateSingleModelForecast(historicalData: any[], modelType: string, targetVariable: string): Promise<any> { return { forecast: [], accuracy: 0.8 }; }
  private calculateModelWeights(modelAccuracies: any, weightingMethod: string): any { return {}; }
  private calculateDataStatistics(historicalData: any[]): any { return {}; }
  private combineModelForecasts(modelPredictions: any, weights: any, includeUncertainty: boolean): any[] { return []; }
  private async performCrossValidation(historicalData: any[], models: string[], targetVariable: string): Promise<any> { return {}; }
  private async getHistoricalForecasts(organizationId: string, forecastType: string, timeRange: { start: Date; end: Date }): Promise<any[]> { return []; }
  private async getActualValues(organizationId: string, forecastType: string, timeRange: { start: Date; end: Date }): Promise<any[]> { return []; }
  private calculateAccuracyMetrics(forecasts: any[], actuals: any[]): ForecastAccuracy { return { mape: 15, smape: 12, rmse: 0.1, mae: 0.08 }; }
  private analyzeAccuracyTrends(forecasts: any[], actuals: any[], timeRange: { start: Date; end: Date }): any { return { direction: 'STABLE' }; }
  private async compareModelPerformance(forecasts: any[], actuals: any[], forecastType: string): Promise<any> { return { bestPerforming: { model: 'ENSEMBLE', accuracy: 0.85 } }; }
  private generateAccuracyRecommendations(accuracyMetrics: ForecastAccuracy, modelComparison: any): string[] { return ['Consider ensemble methods for improved accuracy']; }
}

// Export singleton instance
export const advancedForecastingService = new AdvancedForecastingService();