'use client';

/**
 * Advanced Intelligence Dashboard - Modern React Component
 * 
 * Provides a sophisticated, real-time dashboard that exceeds IBM TRIRIGA's capabilities
 * with modern UX patterns, advanced visualizations, and AI-powered insights
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types for our advanced dashboard
interface IntelligenceInsight {
  id: string;
  type: 'PREDICTIVE' | 'PRESCRIPTIVE' | 'ANOMALY' | 'OPTIMIZATION' | 'RISK';
  title: string;
  description: string;
  confidence: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  actionable: boolean;
  recommendations: IntelligenceRecommendation[];
  metadata: Record<string, any>;
  generatedAt: Date;
  priority?: number;
}

interface IntelligenceRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedImpact: {
    costSavings?: number;
    timeReduction?: number;
    riskMitigation?: number;
    efficiency?: number;
  };
  implementation: {
    effort: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
    timeline: string;
    resources: string[];
    dependencies: string[];
  };
  roi: number;
}

interface DashboardMetrics {
  totalAssets: number;
  activeSpaces: number;
  occupancyRate: number;
  energyEfficiency: number;
  maintenanceAlerts: number;
  costSavings: number;
  predictiveAccuracy: number;
  systemHealth: number;
  userSatisfaction: number;
  sustainabilityScore: number;
}

interface RealTimeAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  category: string;
  timestamp: Date;
  acknowledged: boolean;
}

const AdvancedIntelligenceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAssets: 15420,
    activeSpaces: 2847,
    occupancyRate: 78.5,
    energyEfficiency: 87.2,
    maintenanceAlerts: 23,
    costSavings: 2400000,
    predictiveAccuracy: 94.1,
    systemHealth: 96.8,
    userSatisfaction: 4.7,
    sustainabilityScore: 89.3
  });

  const [insights, setInsights] = useState<IntelligenceInsight[]>([]);
  const [alerts, setAlerts] = useState<RealTimeAlert[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Simulate real-time data updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate real-time metric updates
      setMetrics(prev => ({
        ...prev,
        occupancyRate: Math.max(60, Math.min(95, prev.occupancyRate + (Math.random() - 0.5) * 2)),
        energyEfficiency: Math.max(80, Math.min(95, prev.energyEfficiency + (Math.random() - 0.5) * 1)),
        systemHealth: Math.max(90, Math.min(100, prev.systemHealth + (Math.random() - 0.5) * 0.5))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Load initial data
  useEffect(() => {
    loadIntelligenceData();
    loadAlerts();
  }, [selectedTimeframe, selectedCategory]);

  const loadIntelligenceData = useCallback(async () => {
    setIsLoading(true);
    
    // Simulate API call with realistic data
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockInsights: IntelligenceInsight[] = [
      {
        id: 'insight_1',
        type: 'PREDICTIVE',
        title: 'Space Utilization Optimization Opportunity',
        description: 'AI analysis predicts 23% space efficiency improvement possible through intelligent reallocation based on usage patterns and employee preferences.',
        confidence: 0.89,
        impact: 'HIGH',
        category: 'SPACE_OPTIMIZATION',
        actionable: true,
        priority: 1,
        recommendations: [
          {
            id: 'rec_1',
            title: 'Implement Dynamic Space Allocation',
            description: 'Deploy AI-driven space allocation system with real-time booking optimization',
            priority: 'HIGH',
            estimatedImpact: {
              costSavings: 150000,
              efficiency: 23
            },
            implementation: {
              effort: 'MODERATE',
              timeline: '2-3 months',
              resources: ['Space Planning Team', 'IT Support'],
              dependencies: ['Booking System Upgrade', 'Staff Communication']
            },
            roi: 4.2
          }
        ],
        metadata: {
          currentUtilization: 67,
          targetUtilization: 90,
          affectedSpaces: 45,
          dataPoints: 12000
        },
        generatedAt: new Date()
      },
      {
        id: 'insight_2',
        type: 'ANOMALY',
        title: 'Energy Consumption Anomaly Detected',
        description: 'Building 3 showing 34% higher energy usage than predicted model. Advanced analytics indicate potential HVAC system optimization needed.',
        confidence: 0.94,
        impact: 'MEDIUM',
        category: 'ENERGY_MANAGEMENT',
        actionable: true,
        priority: 2,
        recommendations: [
          {
            id: 'rec_2',
            title: 'HVAC System Optimization',
            description: 'Perform AI-guided HVAC optimization with smart controls integration',
            priority: 'HIGH',
            estimatedImpact: {
              costSavings: 45000,
              efficiency: 15
            },
            implementation: {
              effort: 'MINIMAL',
              timeline: '1-2 weeks',
              resources: ['Facilities Team', 'HVAC Specialist'],
              dependencies: ['System Access', 'Building Schedule']
            },
            roi: 8.5
          }
        ],
        metadata: {
          buildingId: 'building_3',
          baselineConsumption: 2400,
          currentConsumption: 3216,
          duration: '2 weeks'
        },
        generatedAt: new Date()
      },
      {
        id: 'insight_3',
        type: 'PRESCRIPTIVE',
        title: 'Predictive Maintenance Optimization',
        description: 'Machine learning model suggests adjusting maintenance schedules to reduce costs by 18% while maintaining 99.5% reliability through condition-based scheduling.',
        confidence: 0.87,
        impact: 'HIGH',
        category: 'ASSET_MANAGEMENT',
        actionable: true,
        priority: 3,
        recommendations: [
          {
            id: 'rec_3',
            title: 'Implement Condition-Based Maintenance',
            description: 'Deploy IoT sensors and AI analytics for predictive maintenance',
            priority: 'MEDIUM',
            estimatedImpact: {
              costSavings: 200000,
              timeReduction: 30,
              riskMitigation: 15
            },
            implementation: {
              effort: 'SIGNIFICANT',
              timeline: '4-6 months',
              resources: ['Maintenance Team', 'IoT Specialists', 'Data Analysts'],
              dependencies: ['Sensor Installation', 'System Integration', 'Staff Training']
            },
            roi: 3.8
          }
        ],
        metadata: {
          affectedAssets: 156,
          currentMaintenanceCost: 1100000,
          projectedSavings: 200000,
          reliabilityImpact: 0.02
        },
        generatedAt: new Date()
      }
    ];

    setInsights(mockInsights);
    setIsLoading(false);
  }, [selectedTimeframe, selectedCategory]);

  const loadAlerts = useCallback(async () => {
    const mockAlerts: RealTimeAlert[] = [
      {
        id: 'alert_1',
        severity: 'WARNING',
        title: 'Space Utilization Below Optimal',
        message: 'Floor 5 showing only 45% utilization for the past week',
        category: 'SPACE_UTILIZATION',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        acknowledged: false
      },
      {
        id: 'alert_2',
        severity: 'CRITICAL',
        title: 'Asset Failure Risk Detected',
        message: 'HVAC Unit #12 showing 89% failure probability within 30 days',
        category: 'ASSET_MANAGEMENT',
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
        acknowledged: false
      },
      {
        id: 'alert_3',
        severity: 'INFO',
        title: 'Cost Optimization Opportunity',
        message: 'Contract renewal approaching - AI suggests 12% cost reduction possible',
        category: 'FINANCIAL_OPTIMIZATION',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        acknowledged: false
      }
    ];

    setAlerts(mockAlerts);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'WARNING': return 'text-yellow-600 bg-yellow-100';
      case 'INFO': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    trend?: number;
    color: string;
    formatter?: (val: number) => string;
  }> = ({ title, value, icon, trend, color, formatter }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${color} text-xl`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span className="mr-1">{trend >= 0 ? '📈' : '📉'}</span>
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' && formatter ? formatter(value) : value}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🧠 Advanced Intelligence Dashboard
              </h1>
              <p className="text-gray-600">
                AI-powered insights and real-time analytics that exceed traditional IWMS capabilities
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Auto-refresh</label>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
              
              <button
                onClick={loadIntelligenceData}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Assets"
            value={metrics.totalAssets.toLocaleString()}
            icon="🏢"
            trend={2.3}
            color="bg-blue-100 text-blue-600"
          />
          <MetricCard
            title="Occupancy Rate"
            value={metrics.occupancyRate}
            icon="👥"
            trend={5.7}
            color="bg-green-100 text-green-600"
            formatter={formatPercentage}
          />
          <MetricCard
            title="Energy Efficiency"
            value={metrics.energyEfficiency}
            icon="⚡"
            trend={8.2}
            color="bg-yellow-100 text-yellow-600"
            formatter={formatPercentage}
          />
          <MetricCard
            title="Predictive Accuracy"
            value={metrics.predictiveAccuracy}
            icon="🧠"
            trend={1.4}
            color="bg-purple-100 text-purple-600"
            formatter={formatPercentage}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <MetricCard
            title="Active Spaces"
            value={metrics.activeSpaces.toLocaleString()}
            icon="📍"
            color="bg-indigo-100 text-indigo-600"
          />
          <MetricCard
            title="Cost Savings"
            value={metrics.costSavings}
            icon="💰"
            color="bg-green-100 text-green-600"
            formatter={formatCurrency}
          />
          <MetricCard
            title="System Health"
            value={metrics.systemHealth}
            icon="💚"
            color="bg-blue-100 text-blue-600"
            formatter={formatPercentage}
          />
          <MetricCard
            title="Maintenance Alerts"
            value={metrics.maintenanceAlerts}
            icon="⚠️"
            color="bg-red-100 text-red-600"
          />
          <MetricCard
            title="User Satisfaction"
            value={`${metrics.userSatisfaction}/5.0`}
            icon="⭐"
            color="bg-green-100 text-green-600"
          />
          <MetricCard
            title="Sustainability Score"
            value={metrics.sustainabilityScore}
            icon="🌍"
            color="bg-green-100 text-green-600"
            formatter={formatPercentage}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Insights */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <span className="mr-2 text-purple-600">🧠</span>
                  AI-Powered Insights
                </h2>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg bg-white text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="SPACE_OPTIMIZATION">Space Optimization</option>
                  <option value="ENERGY_MANAGEMENT">Energy Management</option>
                  <option value="ASSET_MANAGEMENT">Asset Management</option>
                  <option value="FINANCIAL_OPTIMIZATION">Financial Optimization</option>
                </select>
              </div>

              <div className="space-y-4">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg border ${getImpactColor(insight.impact)}`}>
                          {insight.type === 'PREDICTIVE' && '🔮'}
                          {insight.type === 'PRESCRIPTIVE' && '🎯'}
                          {insight.type === 'ANOMALY' && '⚠️'}
                          {insight.type === 'OPTIMIZATION' && '⚡'}
                          {insight.type === 'RISK' && '🛡️'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {insight.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {insight.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              🎯 {formatPercentage(insight.confidence * 100)} confidence
                            </span>
                            <span className={`px-2 py-1 rounded-full border ${getImpactColor(insight.impact)}`}>
                              {insight.impact} impact
                            </span>
                            <span className="flex items-center">
                              🕒 {insight.generatedAt.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setExpandedInsight(
                          expandedInsight === insight.id ? null : insight.id
                        )}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedInsight === insight.id ? '⬇️' : '➡️'}
                      </button>
                    </div>

                    {expandedInsight === insight.id && (
                      <div className="border-t border-gray-100 pt-4 mt-4">
                        <div className="space-y-4">
                          {insight.recommendations.map((rec) => (
                            <div key={rec.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">{rec.title}</h4>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  rec.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                  rec.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {rec.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <p className="font-medium text-gray-700">Estimated Impact:</p>
                                  {rec.estimatedImpact.costSavings && (
                                    <p className="text-green-600">💰 {formatCurrency(rec.estimatedImpact.costSavings)} savings</p>
                                  )}
                                  {rec.estimatedImpact.efficiency && (
                                    <p className="text-blue-600">⚡ {rec.estimatedImpact.efficiency}% efficiency gain</p>
                                  )}
                                  <p className="text-purple-600">📈 ROI: {rec.roi}x</p>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-700">Implementation:</p>
                                  <p className="text-gray-600">🔧 {rec.implementation.effort} effort</p>
                                  <p className="text-gray-600">⏱️ {rec.implementation.timeline}</p>
                                  <p className="text-gray-600">👥 {rec.implementation.resources.length} resources needed</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Alerts */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-2 text-red-500">🔔</span>
                Real-time Alerts
              </h2>
              
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.severity === 'CRITICAL' ? 'border-red-200 bg-red-50' :
                      alert.severity === 'WARNING' ? 'border-yellow-200 bg-yellow-50' :
                      'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm">{alert.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{alert.message}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{alert.category}</span>
                      <span>{alert.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                View All Alerts
              </button>
            </div>
          </div>
        </div>

        {/* Performance Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>🚀 Powered by Advanced AI/ML Models • Real-time Processing • Predictive Analytics</p>
          <p className="mt-1">Exceeding IBM TRIRIGA with modern architecture and superior user experience</p>
        </div>
      </div>
    </div>
  );
};

export default AdvancedIntelligenceDashboard;