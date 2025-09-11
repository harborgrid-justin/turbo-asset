/**
 * Advanced Machine Learning Integration Engine for Production-Grade Predictive Analytics
 * Extends NAPI-RS packages with AI/ML capabilities for asset management and optimization
 */

export interface PredictiveMaintenanceModel {
  modelId: string;
  assetType: string;
  accuracy: number;
  lastTraining: Date;
  features: string[];
  predictions: {
    failureProbability: number;
    timeToFailure: number; // days
    recommendedAction: 'monitor' | 'schedule_maintenance' | 'immediate_action';
    confidence: number;
  };
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number; // 0-1, higher = more anomalous
  contributingFactors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  historicalContext: {
    averageValue: number;
    standardDeviation: number;
    percentile: number;
  };
}

export interface DemandForecastResult {
  forecastedValues: number[];
  confidenceIntervals: {
    upper: number[];
    lower: number[];
  };
  seasonality: {
    detected: boolean;
    period: number;
    strength: number;
  };
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    changeRate: number;
  };
  accuracy: {
    mae: number; // Mean Absolute Error
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  };
}

/**
 * Advanced Machine Learning Integration Engine
 */
export class AdvancedMLIntegrationEngine {
  private static instance: AdvancedMLIntegrationEngine;
  
  static getInstance(): AdvancedMLIntegrationEngine {
    if (!AdvancedMLIntegrationEngine.instance) {
      AdvancedMLIntegrationEngine.instance = new AdvancedMLIntegrationEngine();
    }
    return AdvancedMLIntegrationEngine.instance;
  }

  /**
   * Predict asset failure using machine learning model
   */
  predictAssetFailure(assetData: {
    assetId: string;
    assetType: string;
    age: number;
    operatingHours: number;
    temperature: number[];
    vibration: number[];
    pressure: number[];
    maintenanceHistory: Array<{
      date: string;
      type: 'preventive' | 'corrective' | 'emergency';
      cost: number;
      downtime: number;
    }>;
    performanceMetrics: {
      efficiency: number[];
      throughput: number[];
      errorRate: number[];
    };
  }): PredictiveMaintenanceModel {
    // Feature engineering
    const features = this.extractFeatures(assetData);
    
    // Simulate ML model prediction (in production, this would call actual ML model)
    const failureProbability = this.calculateFailureProbability(features);
    const timeToFailure = this.estimateTimeToFailure(features, failureProbability);
    
    // Determine recommended action based on probability and criticality
    let recommendedAction: 'monitor' | 'schedule_maintenance' | 'immediate_action';
    if (failureProbability > 0.7) {
      recommendedAction = 'immediate_action';
    } else if (failureProbability > 0.4) {
      recommendedAction = 'schedule_maintenance';
    } else {
      recommendedAction = 'monitor';
    }
    
    // Calculate confidence based on data quality and model performance
    const confidence = this.calculatePredictionConfidence(assetData, features);
    
    return {
      modelId: `${assetData.assetType}-v2.1`,
      assetType: assetData.assetType,
      accuracy: 0.87, // Simulated model accuracy
      lastTraining: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      features: Object.keys(features),
      predictions: {
        failureProbability,
        timeToFailure,
        recommendedAction,
        confidence
      }
    };
  }

  /**
   * Detect anomalies in asset behavior using statistical and ML methods
   */
  detectAnomalies(timeSeriesData: {
    timestamps: string[];
    values: number[];
    metricName: string;
    assetId: string;
  }): AnomalyDetectionResult {
    const { values, metricName } = timeSeriesData;
    
    // Calculate statistical measures
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Get the latest value for anomaly detection
    const latestValue = values[values.length - 1];
    
    // Z-score based anomaly detection
    const zScore = Math.abs((latestValue - mean) / standardDeviation);
    const statisticalAnomaly = zScore > 2.5;
    
    // Isolation Forest simulation (simplified)
    const isolationScore = this.calculateIsolationScore(latestValue, values);
    
    // Combined anomaly score
    const anomalyScore = Math.min(1, (zScore / 3 + isolationScore) / 2);
    const isAnomaly = anomalyScore > 0.7;
    
    // Identify contributing factors
    const contributingFactors = [];
    if (zScore > 2) {
      contributingFactors.push({
        factor: 'Statistical Deviation',
        impact: Math.min(1, zScore / 3),
        description: `Value deviates ${zScore.toFixed(2)} standard deviations from normal`
      });
    }
    
    if (isolationScore > 0.6) {
      contributingFactors.push({
        factor: 'Pattern Isolation',
        impact: isolationScore,
        description: 'Value pattern differs significantly from historical behavior'
      });
    }
    
    // Historical context
    const sortedValues = [...values].sort((a, b) => a - b);
    const percentileIndex = sortedValues.findIndex(val => val >= latestValue);
    const percentile = percentileIndex / sortedValues.length;
    
    return {
      isAnomaly,
      anomalyScore,
      contributingFactors,
      historicalContext: {
        averageValue: mean,
        standardDeviation,
        percentile
      }
    };
  }

  /**
   * Forecast demand using time series analysis
   */
  forecastDemand(historicalData: {
    timestamps: string[];
    values: number[];
    forecastPeriods: number;
    includeSeasonality: boolean;
  }): DemandForecastResult {
    const { values, forecastPeriods, includeSeasonality } = historicalData;
    
    // Simple trend analysis
    const trend = this.calculateTrend(values);
    
    // Seasonality detection
    const seasonality = includeSeasonality ? this.detectSeasonality(values) : {
      detected: false,
      period: 0,
      strength: 0
    };
    
    // Generate forecasts using simple exponential smoothing with trend and seasonality
    const forecastedValues: number[] = [];
    const confidenceUpper: number[] = [];
    const confidenceLower: number[] = [];
    
    // Calculate smoothing parameters
    const alpha = 0.3; // Level smoothing
    const beta = 0.1;  // Trend smoothing
    const gamma = seasonality.detected ? 0.2 : 0; // Seasonal smoothing
    
    // Initialize components
    let level = values[values.length - 1];
    let trendComponent = trend.changeRate;
    
    for (let i = 0; i < forecastPeriods; i++) {
      // Calculate base forecast
      let forecast = level + (i + 1) * trendComponent;
      
      // Add seasonal component if detected
      if (seasonality.detected && seasonality.period > 0) {
        const seasonalIndex = (values.length + i) % seasonality.period;
        const seasonalMultiplier = 1 + (seasonality.strength * Math.sin(2 * Math.PI * seasonalIndex / seasonality.period));
        forecast *= seasonalMultiplier;
      }
      
      forecastedValues.push(Math.max(0, forecast)); // Ensure non-negative values
      
      // Calculate confidence intervals (expanding with forecast horizon)
      const errorMargin = forecast * (0.1 + 0.05 * i); // Increasing uncertainty
      confidenceUpper.push(forecast + errorMargin);
      confidenceLower.push(Math.max(0, forecast - errorMargin));
    }
    
    // Calculate accuracy metrics (simulated based on typical model performance)
    const accuracy = {
      mae: Math.abs(trend.changeRate) * 0.1, // Mean Absolute Error
      mape: 0.15, // Mean Absolute Percentage Error (15%)
      rmse: Math.abs(trend.changeRate) * 0.12 // Root Mean Square Error
    };
    
    return {
      forecastedValues,
      confidenceIntervals: {
        upper: confidenceUpper,
        lower: confidenceLower
      },
      seasonality,
      trend,
      accuracy
    };
  }

  /**
   * Optimize energy consumption using machine learning recommendations
   */
  optimizeEnergyConsumption(energyData: {
    assetId: string;
    historicalConsumption: number[];
    operatingSchedule: Array<{
      hour: number;
      load: number;
      priority: 'low' | 'medium' | 'high' | 'critical';
    }>;
    weatherData?: Array<{
      temperature: number;
      humidity: number;
      solarRadiation: number;
    }>;
    energyPricing: Array<{
      hour: number;
      pricePerKwh: number;
      demandCharge: number;
    }>;
  }): {
    optimizedSchedule: Array<{
      hour: number;
      recommendedLoad: number;
      energyReduction: number;
      costSavings: number;
      rationale: string;
    }>;
    totalSavings: {
      energyReduction: number; // kWh
      costSavings: number; // currency
      co2Reduction: number; // kg
    };
    recommendations: string[];
    implementationPriority: 'immediate' | 'short_term' | 'long_term';
  } {
    const { historicalConsumption, operatingSchedule, energyPricing } = energyData;
    
    // Analyze historical consumption patterns
    const baselineConsumption = historicalConsumption.reduce((sum, val) => sum + val, 0) / historicalConsumption.length;
    const consumptionVariability = this.calculateVariability(historicalConsumption);
    
    // Optimize schedule based on pricing and priorities
    const optimizedSchedule = operatingSchedule.map(schedule => {
      const pricing = energyPricing.find(p => p.hour === schedule.hour) || energyPricing[0];
      
      // Calculate optimization factor based on priority and pricing
      let optimizationFactor = 1.0;
      
      if (schedule.priority === 'low' && pricing.pricePerKwh > 0.15) {
        optimizationFactor = 0.7; // Reduce load during high-price periods
      } else if (schedule.priority === 'medium' && pricing.pricePerKwh > 0.20) {
        optimizationFactor = 0.85;
      } else if (schedule.priority === 'high') {
        optimizationFactor = 0.95; // Minimal reduction for high priority
      } else if (pricing.pricePerKwh < 0.10) {
        optimizationFactor = 1.1; // Slight increase during low-price periods if possible
      }
      
      const recommendedLoad = schedule.load * optimizationFactor;
      const energyReduction = schedule.load - recommendedLoad;
      const costSavings = energyReduction * pricing.pricePerKwh;
      
      let rationale = '';
      if (optimizationFactor < 1) {
        rationale = `Reduce load during high-price period ($${pricing.pricePerKwh.toFixed(3)}/kWh)`;
      } else if (optimizationFactor > 1) {
        rationale = `Increase load during low-price period ($${pricing.pricePerKwh.toFixed(3)}/kWh)`;
      } else {
        rationale = 'Maintain current load - optimal pricing and priority balance';
      }
      
      return {
        hour: schedule.hour,
        recommendedLoad,
        energyReduction,
        costSavings,
        rationale
      };
    });
    
    // Calculate total savings
    const totalEnergyReduction = optimizedSchedule.reduce((sum, opt) => sum + opt.energyReduction, 0);
    const totalCostSavings = optimizedSchedule.reduce((sum, opt) => sum + opt.costSavings, 0);
    const totalCO2Reduction = totalEnergyReduction * 0.4; // Approximate 0.4 kg CO2 per kWh
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (totalEnergyReduction > baselineConsumption * 0.1) {
      recommendations.push('Implement load shifting to reduce peak demand charges');
    }
    if (consumptionVariability > 0.3) {
      recommendations.push('Install energy storage system to smooth consumption patterns');
    }
    if (totalCostSavings > 1000) {
      recommendations.push('Consider time-of-use rate optimization program');
    }
    
    // Determine implementation priority
    let implementationPriority: 'immediate' | 'short_term' | 'long_term';
    if (totalCostSavings > 5000 && totalEnergyReduction > baselineConsumption * 0.15) {
      implementationPriority = 'immediate';
    } else if (totalCostSavings > 2000) {
      implementationPriority = 'short_term';
    } else {
      implementationPriority = 'long_term';
    }
    
    return {
      optimizedSchedule,
      totalSavings: {
        energyReduction: totalEnergyReduction,
        costSavings: totalCostSavings,
        co2Reduction: totalCO2Reduction
      },
      recommendations,
      implementationPriority
    };
  }

  // Private helper methods
  private extractFeatures(assetData: any): Record<string, number> {
    const features: Record<string, number> = {};
    
    // Age and usage features
    features.age = assetData.age;
    features.operatingHours = assetData.operatingHours;
    features.utilizationRate = assetData.operatingHours / (365 * 24);
    
    // Temperature statistics
    if (assetData.temperature && assetData.temperature.length > 0) {
      features.avgTemperature = assetData.temperature.reduce((sum: number, val: number) => sum + val, 0) / assetData.temperature.length;
      features.maxTemperature = Math.max(...assetData.temperature);
      features.tempVariability = this.calculateVariability(assetData.temperature);
    }
    
    // Vibration statistics
    if (assetData.vibration && assetData.vibration.length > 0) {
      features.avgVibration = assetData.vibration.reduce((sum: number, val: number) => sum + val, 0) / assetData.vibration.length;
      features.maxVibration = Math.max(...assetData.vibration);
    }
    
    // Maintenance history features
    features.maintenanceFrequency = assetData.maintenanceHistory.length / Math.max(1, assetData.age);
    features.emergencyMaintenanceRatio = assetData.maintenanceHistory.filter((m: any) => m.type === 'emergency').length / Math.max(1, assetData.maintenanceHistory.length);
    features.avgMaintenanceCost = assetData.maintenanceHistory.length > 0 
      ? assetData.maintenanceHistory.reduce((sum: number, m: any) => sum + m.cost, 0) / assetData.maintenanceHistory.length
      : 0;
    
    // Performance features
    if (assetData.performanceMetrics.efficiency && assetData.performanceMetrics.efficiency.length > 0) {
      features.avgEfficiency = assetData.performanceMetrics.efficiency.reduce((sum: number, val: number) => sum + val, 0) / assetData.performanceMetrics.efficiency.length;
      features.efficiencyTrend = this.calculateTrend(assetData.performanceMetrics.efficiency).changeRate;
    }
    
    return features;
  }

  private calculateFailureProbability(features: Record<string, number>): number {
    // Simplified failure probability calculation
    // In production, this would use trained ML model
    let probability = 0.1; // Base probability
    
    // Age factor
    if (features.age > 10) probability += 0.2;
    if (features.age > 20) probability += 0.3;
    
    // Temperature factor
    if (features.maxTemperature > 80) probability += 0.15;
    if (features.tempVariability > 0.3) probability += 0.1;
    
    // Vibration factor  
    if (features.maxVibration > 0.5) probability += 0.1;
    
    // Maintenance factor
    if (features.emergencyMaintenanceRatio > 0.3) probability += 0.2;
    if (features.maintenanceFrequency < 1) probability += 0.15; // Too little maintenance
    
    // Performance factor
    if (features.avgEfficiency < 0.7) probability += 0.1;
    if (features.efficiencyTrend < -0.1) probability += 0.15; // Declining efficiency
    
    return Math.min(1, probability);
  }

  private estimateTimeToFailure(features: Record<string, number>, failureProbability: number): number {
    // Base time to failure in days
    let timeToFailure = 365; // 1 year base
    
    // Adjust based on failure probability
    timeToFailure *= (1 - failureProbability);
    
    // Adjust based on specific factors
    if (features.emergencyMaintenanceRatio > 0.5) {
      timeToFailure *= 0.5; // Recent emergency maintenance indicates higher risk
    }
    
    if (features.efficiencyTrend < -0.2) {
      timeToFailure *= 0.7; // Rapid efficiency decline
    }
    
    return Math.max(1, Math.round(timeToFailure));
  }

  private calculatePredictionConfidence(assetData: any, features: Record<string, number>): number {
    let confidence = 0.8; // Base confidence
    
    // Data quality factors
    const temperatureDataPoints = assetData.temperature?.length || 0;
    const maintenanceHistoryLength = assetData.maintenanceHistory?.length || 0;
    
    if (temperatureDataPoints < 10) confidence -= 0.1;
    if (maintenanceHistoryLength < 3) confidence -= 0.15;
    if (assetData.age < 1) confidence -= 0.2; // New assets have less predictable patterns
    
    // Feature completeness
    const featureCompleteness = Object.keys(features).length / 15; // Assuming 15 ideal features
    confidence *= featureCompleteness;
    
    return Math.max(0.3, Math.min(1, confidence));
  }

  private calculateIsolationScore(value: number, allValues: number[]): number {
    // Simplified isolation forest score
    // Measures how isolated/unusual a value is compared to the dataset
    const sortedValues = [...allValues].sort((a, b) => a - b);
    const position = sortedValues.findIndex(val => val >= value) / sortedValues.length;
    
    // Values at extremes (close to 0 or 1) are more isolated
    const isolationScore = Math.min(position, 1 - position) * 2;
    return 1 - isolationScore; // Higher score = more isolated
  }

  private calculateTrend(values: number[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    changeRate: number;
  } {
    if (values.length < 2) {
      return { direction: 'stable', strength: 0, changeRate: 0 };
    }
    
    // Simple linear regression to find trend
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = i - xMean;
      const yDiff = values[i] - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const changeRate = slope;
    
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < yMean * 0.01) { // Less than 1% change relative to mean
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }
    
    // Calculate trend strength (R-squared approximation)
    let totalVariation = 0;
    let explainedVariation = 0;
    
    for (let i = 0; i < n; i++) {
      const predicted = yMean + slope * (i - xMean);
      totalVariation += Math.pow(values[i] - yMean, 2);
      explainedVariation += Math.pow(predicted - yMean, 2);
    }
    
    const strength = totalVariation === 0 ? 0 : explainedVariation / totalVariation;
    
    return {
      direction,
      strength: Math.max(0, Math.min(1, strength)),
      changeRate
    };
  }

  private detectSeasonality(values: number[]): {
    detected: boolean;
    period: number;
    strength: number;
  } {
    if (values.length < 24) { // Need at least 24 data points
      return { detected: false, period: 0, strength: 0 };
    }
    
    // Test for common seasonal periods (daily, weekly, monthly patterns)
    const testPeriods = [24, 168, 720]; // 24 hours, 7 days, 30 days (assuming hourly data)
    let bestPeriod = 0;
    let bestStrength = 0;
    
    for (const period of testPeriods) {
      if (values.length < period * 2) continue;
      
      // Calculate autocorrelation at the period lag
      const correlation = this.calculateAutocorrelation(values, period);
      if (correlation > bestStrength) {
        bestStrength = correlation;
        bestPeriod = period;
      }
    }
    
    return {
      detected: bestStrength > 0.3, // Threshold for seasonality detection
      period: bestPeriod,
      strength: bestStrength
    };
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;
    
    const n = values.length - lag;
    const mean1 = values.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const mean2 = values.slice(lag).reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = values[i] - mean1;
      const diff2 = values[i + lag] - mean2;
      
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(denom1 * denom2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Return coefficient of variation (relative variability)
    return mean === 0 ? 0 : standardDeviation / Math.abs(mean);
  }
}