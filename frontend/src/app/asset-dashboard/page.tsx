'use client';

import React, { useState, useEffect } from 'react';

interface AssetMetrics {
  totalAssets: number;
  assetsByCategory: Record<string, number>;
  assetsByStatus: Record<string, number>;
  assetsByCondition: Record<string, number>;
  assetsByCriticality: Record<string, number>;
  maintenanceDueCount: number;
  overdueMaintenanceCount: number;
  warrantyExpiringCount: number;
  totalAssetValue: number;
  availabilityRate: number;
}

const AssetDashboardPage = () => {
  const [metrics, setMetrics] = useState<AssetMetrics>({
    totalAssets: 12547,
    assetsByCategory: {
      'HVAC': 2456,
      'Electrical': 3421,
      'Mechanical': 1876,
      'IT Equipment': 2134,
      'Vehicles': 987,
      'Furniture': 1673
    },
    assetsByStatus: {
      'Active': 10234,
      'Inactive': 876,
      'Under Maintenance': 543,
      'Retired': 894
    },
    assetsByCondition: {
      'Excellent': 4521,
      'Good': 5234,
      'Fair': 2156,
      'Poor': 523,
      'Critical': 113
    },
    assetsByCriticality: {
      'Critical': 1234,
      'High': 3456,
      'Medium': 5678,
      'Low': 2179
    },
    maintenanceDueCount: 234,
    overdueMaintenanceCount: 45,
    warrantyExpiringCount: 67,
    totalAssetValue: 45678900,
    availabilityRate: 94.6
  });

  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  useEffect(() => {
    // In a real app, this would fetch from the backend
    // fetchAssetMetrics();
  }, [selectedTimeframe]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Active': 'text-green-600 bg-green-100',
      'Inactive': 'text-gray-600 bg-gray-100',
      'Under Maintenance': 'text-yellow-600 bg-yellow-100',
      'Retired': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      'Excellent': 'text-green-600 bg-green-100',
      'Good': 'text-blue-600 bg-blue-100',
      'Fair': 'text-yellow-600 bg-yellow-100',
      'Poor': 'text-orange-600 bg-orange-100',
      'Critical': 'text-red-600 bg-red-100'
    };
    return colors[condition] || 'text-gray-600 bg-gray-100';
  };

  const getCriticalityColor = (criticality: string) => {
    const colors: Record<string, string> = {
      'Critical': 'text-red-600 bg-red-100',
      'High': 'text-orange-600 bg-orange-100',
      'Medium': 'text-yellow-600 bg-yellow-100',
      'Low': 'text-green-600 bg-green-100'
    };
    return colors[criticality] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asset Management Dashboard</h1>
              <p className="text-gray-600 mt-2">Comprehensive overview of your asset portfolio</p>
            </div>
            <div className="flex space-x-4">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold">
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.totalAssets)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-green-600 text-sm font-medium">+5.2%</span>
              <span className="text-gray-600 text-sm ml-2">vs last month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Asset Value</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.totalAssetValue)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-green-600 text-sm font-medium">+12.3%</span>
              <span className="text-gray-600 text-sm ml-2">vs last month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Availability Rate</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.availabilityRate}%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-red-600 text-sm font-medium">-0.8%</span>
              <span className="text-gray-600 text-sm ml-2">vs last month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Maintenance Due</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.maintenanceDueCount)}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-red-600 text-sm font-medium">{formatNumber(metrics.overdueMaintenanceCount)} overdue</span>
            </div>
          </div>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Assets by Category */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets by Category</h3>
            <div className="space-y-4">
              {Object.entries(metrics.assetsByCategory).map(([category, count]) => {
                const percentage = (count / metrics.totalAssets) * 100;
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{category}</span>
                        <span className="text-sm text-gray-600">{formatNumber(count)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assets by Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets by Status</h3>
            <div className="space-y-3">
              {Object.entries(metrics.assetsByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Asset Condition and Criticality */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Assets by Condition */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Condition Distribution</h3>
            <div className="space-y-3">
              {Object.entries(metrics.assetsByCondition).map(([condition, count]) => (
                <div key={condition} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{condition}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(condition)}`}>
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Assets by Criticality */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Criticality Levels</h3>
            <div className="space-y-3">
              {Object.entries(metrics.assetsByCriticality).map(([criticality, count]) => (
                <div key={criticality} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{criticality}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCriticalityColor(criticality)}`}>
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Alerts</h3>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <div className="flex-shrink-0 w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-red-900">Overdue Maintenance</p>
                  <p className="text-sm text-red-700">{formatNumber(metrics.overdueMaintenanceCount)} assets require immediate attention</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <div className="flex-shrink-0 w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-yellow-900">Maintenance Due</p>
                  <p className="text-sm text-yellow-700">{formatNumber(metrics.maintenanceDueCount)} assets scheduled for maintenance</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-blue-900">Warranty Expiring</p>
                  <p className="text-sm text-blue-700">{formatNumber(metrics.warrantyExpiringCount)} assets have expiring warranties</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Create New Asset</span>
                </div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Schedule Maintenance</span>
                </div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Asset Search</span>
                </div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Generate Report</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="ml-3">
                  <p className="text-sm text-gray-900">Asset A-12345 maintenance completed</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="ml-3">
                  <p className="text-sm text-gray-900">New HVAC unit B-67890 registered</p>
                  <p className="text-xs text-gray-500">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div className="ml-3">
                  <p className="text-sm text-gray-900">Preventive maintenance scheduled for C-11111</p>
                  <p className="text-xs text-gray-500">6 hours ago</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div className="ml-3">
                  <p className="text-sm text-gray-900">Critical asset D-22222 requires immediate attention</p>
                  <p className="text-xs text-gray-500">8 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDashboardPage;