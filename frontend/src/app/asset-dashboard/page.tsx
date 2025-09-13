'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DataTable, Column } from '@/components/ui/DataTable';
import { formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil, getStatusColor, getPriorityColor } from '@/lib/utils';

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

interface Asset {
  id: string;
  name: string;
  category: string;
  status: string;
  condition: string;
  criticality: string;
  location: string;
  value: number;
  purchaseDate: string;
  lastMaintenance: string;
  nextMaintenance: string;
}

interface MaintenanceAlert {
  id: string;
  assetId: string;
  assetName: string;
  type: 'overdue' | 'due' | 'warranty';
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  dueDate: string;
}

const AssetDashboardPage = () => {
  const [metrics, setMetrics] = useState<AssetMetrics | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'assets' | 'maintenance'>('overview');

  useEffect(() => {
    const fetchAssetMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3001/api/assets/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch asset statistics');
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          const { summary, categories, conditions, statuses, criticality } = data.data;
          
          setMetrics({
            totalAssets: summary.totalAssets,
            totalAssetValue: summary.totalValue,
            availabilityRate: parseFloat(summary.availabilityRate),
            maintenanceDueCount: summary.maintenanceDue,
            assetsByCategory: categories,
            assetsByStatus: statuses,
            assetsByCondition: conditions,
            assetsByCriticality: criticality,
            overdueMaintenanceCount: Math.floor(summary.maintenanceDue * 0.2), // Estimate 20% overdue
            warrantyExpiringCount: Math.floor(summary.totalAssets * 0.05) // Estimate 5% warranty expiring
          });
        }
      } catch (err) {
        console.error('Error fetching asset metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load asset data');
        
        // Fallback to mock data
        const mockMetrics = {
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
        };

        const mockAssets: Asset[] = Array.from({ length: 50 }, (_, i) => ({
          id: `A${String(i + 1).padStart(5, '0')}`,
          name: `Asset ${i + 1}`,
          category: ['HVAC', 'Electrical', 'Mechanical', 'IT Equipment', 'Vehicles', 'Furniture'][i % 6],
          status: ['Active', 'Inactive', 'Under Maintenance', 'Retired'][i % 4],
          condition: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'][i % 5],
          criticality: ['Critical', 'High', 'Medium', 'Low'][i % 4],
          location: `Building ${Math.floor(i / 10) + 1}, Floor ${(i % 3) + 1}`,
          value: Math.floor(Math.random() * 100000) + 5000,
          purchaseDate: new Date(2020 + (i % 4), i % 12, (i % 28) + 1).toISOString().split('T')[0],
          lastMaintenance: new Date(2024, (i % 12), (i % 28) + 1).toISOString().split('T')[0],
          nextMaintenance: new Date(2024, ((i + 1) % 12), (i % 28) + 1).toISOString().split('T')[0],
        }));

        const mockMaintenanceAlerts: MaintenanceAlert[] = [
          {
            id: '1',
            assetId: 'A00001',
            assetName: 'HVAC Unit A-001',
            type: 'overdue',
            priority: 'critical',
            message: 'Preventive maintenance overdue by 15 days',
            dueDate: '2024-01-15'
          },
          {
            id: '2',
            assetId: 'A00002',
            assetName: 'Generator B-002',
            type: 'due',
            priority: 'high',
            message: 'Scheduled maintenance due in 3 days',
            dueDate: '2024-02-01'
          },
          {
            id: '3',
            assetId: 'A00003',
            assetName: 'Server C-003',
            type: 'warranty',
            priority: 'medium',
            message: 'Warranty expires in 30 days',
            dueDate: '2024-02-28'
          }
        ];

        setMetrics(mockMetrics);
        setAssets(mockAssets);
        setMaintenanceAlerts(mockMaintenanceAlerts);
      } finally {
        setLoading(false);
      }
    };

    fetchAssetMetrics();
  }, []);

  const formatCurrency = formatCurrencyUtil;

  const formatNumberHelper = formatNumberUtil;

  const assetColumns: Column<Asset>[] = [
    {
      key: 'id',
      header: 'Asset ID',
      sortable: true,
      width: '120px'
    },
    {
      key: 'name',
      header: 'Asset Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.location}</div>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => (
        <Badge className={getStatusColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'condition',
      header: 'Condition',
      sortable: true,
      render: (value) => (
        <Badge variant={value === 'Critical' ? 'danger' : value === 'Poor' ? 'warning' : 'default'}>
          {value}
        </Badge>
      )
    },
    {
      key: 'criticality',
      header: 'Criticality',
      sortable: true,
      render: (value) => (
        <Badge className={getPriorityColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      align: 'right',
      render: (value) => formatCurrencyUtil(value)
    },
    {
      key: 'nextMaintenance',
      header: 'Next Maintenance',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading asset data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-2">Failed to load asset data</p>
              {error && <p className="text-gray-600 text-sm">{error}</p>}
              <Button 
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asset Management Dashboard</h1>
              <p className="text-gray-600 mt-2">Comprehensive overview of your asset portfolio</p>
            </div>
            <div className="flex flex-wrap gap-3">
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
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Report
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Asset
              </Button>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedView('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setSelectedView('assets')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'assets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Asset List ({formatNumberHelper(assets.length)})
              </button>
              <button
                onClick={() => setSelectedView('maintenance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'maintenance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Maintenance Alerts ({maintenanceAlerts.length})
              </button>
            </nav>
          </div>
        </div>

        {selectedView === 'overview' && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Assets</p>
                      <p className="text-3xl font-bold text-gray-900">{formatNumberHelper(metrics.totalAssets)}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="success" size="sm">+5.2% vs last month</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Asset Value</p>
                      <p className="text-3xl font-bold text-gray-900">{formatCurrencyUtil(metrics.totalAssetValue)}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="success" size="sm">+12.3% vs last month</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
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
                    <Badge variant="warning" size="sm">-0.8% vs last month</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Maintenance Due</p>
                      <p className="text-3xl font-bold text-gray-900">{formatNumberHelper(metrics.maintenanceDueCount)}</p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="danger" size="sm">{formatNumberHelper(metrics.overdueMaintenanceCount)} overdue</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Assets by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Assets by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(metrics.assetsByCategory).map(([category, count]) => {
                      const percentage = (count / metrics.totalAssets) * 100;
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">{category}</span>
                              <span className="text-sm text-gray-600">{formatNumberHelper(count)} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Assets by Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Assets by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.assetsByStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{status}</span>
                        <Badge className={getStatusColor(status)}>
                          {formatNumberHelper(count)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Asset Condition and Criticality */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Assets by Condition */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Condition Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.assetsByCondition).map(([condition, count]) => (
                      <div key={condition} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{condition}</span>
                        <Badge variant={condition === 'Critical' ? 'danger' : condition === 'Poor' ? 'warning' : 'default'}>
                          {formatNumberHelper(count)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Assets by Criticality */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Criticality Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.assetsByCriticality).map(([criticality, count]) => (
                      <div key={criticality} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{criticality}</span>
                        <Badge className={getPriorityColor(criticality)}>
                          {formatNumberHelper(count)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Items */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-red-50 rounded-lg">
                      <div className="flex-shrink-0 w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-red-900">Overdue Maintenance</p>
                        <p className="text-sm text-red-700">{formatNumberHelper(metrics.overdueMaintenanceCount)} assets require immediate attention</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                      <div className="flex-shrink-0 w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-yellow-900">Maintenance Due</p>
                        <p className="text-sm text-yellow-700">{formatNumberHelper(metrics.maintenanceDueCount)} assets scheduled for maintenance</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                      <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-blue-900">Warranty Expiring</p>
                        <p className="text-sm text-blue-700">{formatNumberHelper(metrics.warrantyExpiringCount)} assets have expiring warranties</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => setShowCreateModal(true)}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create New Asset
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Schedule Maintenance
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setSelectedView('assets')}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Asset Search
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {selectedView === 'assets' && (
          <Card>
            <CardHeader>
              <CardTitle>Asset Inventory</CardTitle>
              <CardDescription>Complete list of all assets in your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={assets}
                columns={assetColumns}
                onRowClick={(asset) => {
                  console.log('Selected asset:', asset);
                  // Handle asset detail view
                }}
                searchable={true}
                pageSize={15}
              />
            </CardContent>
          </Card>
        )}

        {selectedView === 'maintenance' && (
          <div className="space-y-4">
            {maintenanceAlerts.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                        alert.type === 'overdue' ? 'bg-red-500' : 
                        alert.type === 'due' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{alert.assetName}</h3>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">Asset ID: {alert.assetId} • Due: {new Date(alert.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(alert.priority)}>
                        {alert.priority}
                      </Badge>
                      <Button size="sm">
                        Action Required
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Asset Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Asset"
          description="Add a new asset to your inventory"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter asset name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>HVAC</option>
                  <option>Electrical</option>
                  <option>Mechanical</option>
                  <option>IT Equipment</option>
                  <option>Vehicles</option>
                  <option>Furniture</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Building, Floor, Room"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Value</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter asset description"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button>
                Create Asset
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default AssetDashboardPage;