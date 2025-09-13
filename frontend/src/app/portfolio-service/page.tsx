'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/ui/DataTable';
import { formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil, getStatusColor, getPriorityColor } from '@/lib/utils';

interface PortfolioMetrics {
  totalProperties: number;
  totalSpaces: number;
  occupancyRate: number;
  utilizationRate: number;
  totalRevenue: number;
  netOperatingIncome: number;
}

interface Property {
  id: string;
  name: string;
  type: string;
  totalArea: number;
  occupiedArea: number;
  status: string;
  revenue: number;
  location: string;
  leaseExpiry?: string;
  propertyManager: string;
  yearBuilt: number;
  energyRating: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  priority: string;
}

const PortfolioServicePage = () => {
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    totalProperties: 0,
    totalSpaces: 0,
    occupancyRate: 0,
    utilizationRate: 0,
    totalRevenue: 0,
    netOperatingIncome: 0
  });
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'dashboard' | 'properties' | 'analytics'>('dashboard');

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from backend first, fallback to mock data
      try {
        const dashboardResponse = await apiClient.get('/portfolio/dashboard?organizationId=demo');
        const dashboard = dashboardResponse.data.data;
        
        setMetrics({
          totalProperties: dashboard.totalProperties || 42,
          totalSpaces: dashboard.totalSpaces || 2847,
          occupancyRate: dashboard.occupancyRate || 87.3,
          utilizationRate: dashboard.utilizationRate || 73.8,
          totalRevenue: dashboard.totalRevenue || 8750000,
          netOperatingIncome: dashboard.netOperatingIncome || 6825000
        });
        
        setProperties(dashboard.properties || getMockProperties());
        setAlerts(dashboard.alerts || getMockAlerts());
      } catch (apiError) {
        console.log('Backend not available, using mock data');
        // Use mock data as fallback
        setMetrics({
          totalProperties: 42,
          totalSpaces: 2847,
          occupancyRate: 87.3,
          utilizationRate: 73.8,
          totalRevenue: 8750000,
          netOperatingIncome: 6825000
        });
        setProperties(getMockProperties());
        setAlerts(getMockAlerts());
      }
    } catch (err) {
      setError('Failed to load portfolio data');
      console.error('Portfolio data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMockProperties = (): Property[] => [
    {
      id: '1',
      name: 'Headquarters Tower',
      type: 'Office',
      totalArea: 125000,
      occupiedArea: 108750,
      status: 'Active',
      revenue: 2400000,
      location: 'New York, NY',
      leaseExpiry: '2025-12-31',
      propertyManager: 'John Smith',
      yearBuilt: 1998,
      energyRating: 'A+'
    },
    {
      id: '2', 
      name: 'Manufacturing Plant A',
      type: 'Industrial',
      totalArea: 85000,
      occupiedArea: 85000,
      status: 'Active',
      revenue: 1850000,
      location: 'Detroit, MI',
      propertyManager: 'Sarah Johnson',
      yearBuilt: 2005,
      energyRating: 'B'
    },
    {
      id: '3',
      name: 'Distribution Center',
      type: 'Warehouse',
      totalArea: 200000,
      occupiedArea: 175000,
      status: 'Active',
      revenue: 1950000,
      location: 'Phoenix, AZ',
      propertyManager: 'Mike Davis',
      yearBuilt: 2010,
      energyRating: 'B+'
    },
    {
      id: '4',
      name: 'Research Facility',
      type: 'Laboratory',
      totalArea: 45000,
      occupiedArea: 40500,
      status: 'Active',
      revenue: 975000,
      location: 'San Francisco, CA',
      leaseExpiry: '2024-06-30',
      propertyManager: 'Emily Chen',
      yearBuilt: 2015,
      energyRating: 'A'
    },
    {
      id: '5',
      name: 'Regional Office East',
      type: 'Office',
      totalArea: 65000,
      occupiedArea: 58500,
      status: 'Active',
      revenue: 1200000,
      location: 'Boston, MA',
      propertyManager: 'David Wilson',
      yearBuilt: 2008,
      energyRating: 'A-'
    },
    {
      id: '6',
      name: 'Retail Store Downtown',
      type: 'Retail',
      totalArea: 15000,
      occupiedArea: 15000,
      status: 'Active',
      revenue: 650000,
      location: 'Chicago, IL',
      leaseExpiry: '2024-03-31',
      propertyManager: 'Lisa Rodriguez',
      yearBuilt: 1995,
      energyRating: 'C+'
    }
  ];

  const getMockAlerts = (): Alert[] => [
    {
      id: '1',
      type: 'warning',
      title: 'Lease Expiry Alert',
      description: 'Headquarters Tower lease expires in 90 days',
      priority: 'High'
    },
    {
      id: '2',
      type: 'error', 
      title: 'Maintenance Overdue',
      description: 'HVAC system maintenance overdue at Manufacturing Plant A',
      priority: 'High'
    },
    {
      id: '3',
      type: 'info',
      title: 'Utilization Report',
      description: 'Research Facility utilization below target (65%)',
      priority: 'Medium'
    }
  ];

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount);
  };

  const formatArea = (area: number) => {
    return formatNumberUtil(area) + ' sq ft';
  };

  const propertyColumns: Column<Property>[] = [
    {
      key: 'name',
      header: 'Property Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.location}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      filterable: true,
    },
    {
      key: 'totalArea',
      header: 'Area',
      sortable: true,
      align: 'right',
      render: (value) => formatArea(value)
    },
    {
      key: 'occupancyRate',
      header: 'Occupancy',
      sortable: true,
      render: (_, row) => {
        const rate = ((row.occupiedArea / row.totalArea) * 100);
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{rate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">{formatArea(row.occupiedArea)} occupied</div>
          </div>
        );
      }
    },
    {
      key: 'revenue',
      header: 'Revenue',
      sortable: true,
      align: 'right',
      render: (value) => formatCurrency(value)
    },
    {
      key: 'energyRating',
      header: 'Energy Rating',
      sortable: true,
      render: (value) => (
        <Badge variant={value.startsWith('A') ? 'success' : value.startsWith('B') ? 'default' : 'warning'}>
          {value}
        </Badge>
      )
    },
    {
      key: 'propertyManager',
      header: 'Manager',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <Badge className={getStatusColor(value)}>
          {value}
        </Badge>
      )
    }
  ];

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getAlertTextColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-800';
      case 'warning': return 'text-yellow-800';
      case 'info': return 'text-blue-800';
      default: return 'text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading portfolio data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-2">{error}</p>
              <Button onClick={fetchPortfolioData}>
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
              <h1 className="text-3xl font-bold text-gray-900">Portfolio Management</h1>
              <p className="text-gray-600 mt-2">Real estate portfolio overview and management</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Import Properties
              </Button>
              <Button variant="outline" onClick={fetchPortfolioData}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </Button>
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Property
              </Button>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedView('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dashboard Overview
              </button>
              <button
                onClick={() => setSelectedView('properties')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'properties'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Properties ({properties.length})
              </button>
              <button
                onClick={() => setSelectedView('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedView === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics & Reports
              </button>
            </nav>
          </div>
        </div>

        {selectedView === 'dashboard' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Properties</p>
                      <p className="text-3xl font-bold text-blue-600">{metrics.totalProperties}</p>
                      <p className="text-sm text-gray-500 mt-1">{formatNumberUtil(metrics.totalSpaces)} total spaces</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="success" size="sm">+8.3% vs last quarter</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                      <p className="text-3xl font-bold text-green-600">{metrics.occupancyRate}%</p>
                      <p className="text-sm text-gray-500 mt-1">Utilization: {metrics.utilizationRate}%</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="success" size="sm">+2.1% vs last month</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue</p>
                      <p className="text-3xl font-bold text-purple-600">{formatCurrency(metrics.totalRevenue)}</p>
                      <p className="text-sm text-gray-500 mt-1">NOI: {formatCurrency(metrics.netOperatingIncome)}</p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="success" size="sm">+15.7% vs last quarter</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Property Performance Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Property Performance</CardTitle>
                  <CardDescription>Revenue and occupancy by property</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {properties.slice(0, 4).map((property) => {
                      const occupancyRate = (property.occupiedArea / property.totalArea) * 100;
                      return (
                        <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{property.name}</p>
                            <p className="text-sm text-gray-600">{property.type} • {property.location}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatCurrency(property.revenue)}</p>
                            <p className="text-sm text-gray-600">{occupancyRate.toFixed(1)}% occupied</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Property Types</CardTitle>
                  <CardDescription>Distribution by property type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(
                      properties.reduce((acc, prop) => {
                        acc[prop.type] = (acc[prop.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => {
                      const percentage = (count / properties.length) * 100;
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">{type}</span>
                              <span className="text-sm text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
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
            </div>

            {/* Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts & Notifications</CardTitle>
                <CardDescription>Important items requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border ${getAlertBgColor(alert.type)}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`font-semibold ${getAlertTextColor(alert.type)}`}>{alert.title}</h3>
                          <p className={`mt-1 text-sm ${getAlertTextColor(alert.type)} opacity-80`}>{alert.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(alert.priority)}>
                            {alert.priority}
                          </Badge>
                          <Button size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {selectedView === 'properties' && (
          <Card>
            <CardHeader>
              <CardTitle>Property Portfolio</CardTitle>
              <CardDescription>Complete overview of all properties in your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={properties}
                columns={propertyColumns}
                onRowClick={(property) => {
                  console.log('Selected property:', property);
                  // Handle property detail view
                }}
                searchable={true}
                pageSize={10}
              />
            </CardContent>
          </Card>
        )}

        {selectedView === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Financial Performance</CardTitle>
                <CardDescription>Revenue trends and financial metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">Total Portfolio Value</p>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(metrics.totalRevenue * 12)}</p>
                    </div>
                    <div className="text-green-600">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Average Revenue per Sq Ft</p>
                      <p className="text-2xl font-bold text-blue-900">
                        ${((metrics.totalRevenue / properties.reduce((sum, p) => sum + p.totalArea, 0)) * 1000).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-blue-600">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Energy Efficiency</CardTitle>
                <CardDescription>Environmental performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    properties.reduce((acc, prop) => {
                      acc[prop.energyRating] = (acc[prop.energyRating] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([rating, count]) => (
                    <div key={rating} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Energy Rating {rating}</span>
                      <Badge variant={rating.startsWith('A') ? 'success' : rating.startsWith('B') ? 'default' : 'warning'}>
                        {count} properties
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioServicePage;
