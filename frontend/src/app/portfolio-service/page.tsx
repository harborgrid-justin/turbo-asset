'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

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
      revenue: 2400000
    },
    {
      id: '2', 
      name: 'Manufacturing Plant A',
      type: 'Industrial',
      totalArea: 85000,
      occupiedArea: 85000,
      status: 'Active',
      revenue: 1850000
    },
    {
      id: '3',
      name: 'Distribution Center',
      type: 'Warehouse',
      totalArea: 200000,
      occupiedArea: 175000,
      status: 'Active',
      revenue: 1950000
    },
    {
      id: '4',
      name: 'Research Facility',
      type: 'Laboratory',
      totalArea: 45000,
      occupiedArea: 40500,
      status: 'Active',
      revenue: 975000
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatArea = (area: number) => {
    return new Intl.NumberFormat('en-US').format(area) + ' sq ft';
  };

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
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={fetchPortfolioData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
        <button 
          onClick={fetchPortfolioData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Properties</h3>
          <p className="text-3xl font-bold text-blue-600">{metrics.totalProperties}</p>
          <p className="text-sm text-gray-500">{metrics.totalSpaces.toLocaleString()} total spaces</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Occupancy Rate</h3>
          <p className="text-3xl font-bold text-green-600">{metrics.occupancyRate}%</p>
          <p className="text-sm text-gray-500">Utilization: {metrics.utilizationRate}%</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Revenue</h3>
          <p className="text-3xl font-bold text-purple-600">{formatCurrency(metrics.totalRevenue)}</p>
          <p className="text-sm text-gray-500">NOI: {formatCurrency(metrics.netOperatingIncome)}</p>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {properties.map((property) => (
                <tr key={property.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{property.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{property.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatArea(property.totalArea)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {((property.occupiedArea / property.totalArea) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">{formatArea(property.occupiedArea)} occupied</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(property.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {property.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Active Alerts</h2>
        </div>
        <div className="p-6 space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className={`p-4 rounded-lg border ${getAlertBgColor(alert.type)}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-semibold ${getAlertTextColor(alert.type)}`}>{alert.title}</h3>
                  <p className={`mt-1 text-sm ${getAlertTextColor(alert.type)} opacity-80`}>{alert.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  alert.priority === 'High' ? 'bg-red-100 text-red-800' : 
                  alert.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-blue-100 text-blue-800'
                }`}>
                  {alert.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioServicePage;
