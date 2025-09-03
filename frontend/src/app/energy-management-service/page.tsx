'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface EnergyConsumption {
  id: string;
  propertyId: string;
  propertyName: string;
  meterType: 'Electricity' | 'Gas' | 'Water' | 'Steam';
  period: string;
  consumption: number;
  cost: number;
  unit: string;
  co2Emissions?: number;
  targetConsumption?: number;
  efficiency: number;
}

interface EnergyMetrics {
  totalCost: number;
  totalConsumption: number;
  averageEfficiency: number;
  co2Savings: number;
  costSavings: number;
  topConsumer: string;
}

interface EnergyDevice {
  id: string;
  name: string;
  type: 'HVAC' | 'Lighting' | 'Equipment' | 'Solar Panel' | 'Generator';
  location: string;
  status: 'Online' | 'Offline' | 'Maintenance' | 'Alert';
  currentConsumption: number;
  efficiency: number;
  lastMaintenance: string;
}

const EnergyManagementServicePage = () => {
  const [consumptionData, setConsumptionData] = useState<EnergyConsumption[]>([]);
  const [devices, setDevices] = useState<EnergyDevice[]>([]);
  const [metrics, setMetrics] = useState<EnergyMetrics>({
    totalCost: 0,
    totalConsumption: 0,
    averageEfficiency: 0,
    co2Savings: 0,
    costSavings: 0,
    topConsumer: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'consumption' | 'devices' | 'analytics'>('consumption');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedMeterType, setSelectedMeterType] = useState('');

  useEffect(() => {
    fetchEnergyData();
  }, []);

  const fetchEnergyData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from backend, fallback to mock data
      try {
        const response = await apiClient.get('/energy-management?organizationId=demo');
        // Handle response when available
      } catch (apiError) {
        console.log('Backend not available, using mock data');
      }
      
      // Use mock data
      const mockConsumption = getMockConsumption();
      const mockDevices = getMockDevices();
      
      setConsumptionData(mockConsumption);
      setDevices(mockDevices);
      
      // Calculate metrics
      const totalCost = mockConsumption.reduce((sum, item) => sum + item.cost, 0);
      const totalConsumption = mockConsumption.reduce((sum, item) => sum + item.consumption, 0);
      const averageEfficiency = mockConsumption.reduce((sum, item) => sum + item.efficiency, 0) / mockConsumption.length;
      const topConsumer = mockConsumption.sort((a, b) => b.consumption - a.consumption)[0]?.propertyName || '';
      
      setMetrics({
        totalCost: Math.round(totalCost),
        totalConsumption: Math.round(totalConsumption),
        averageEfficiency: Math.round(averageEfficiency * 100) / 100,
        co2Savings: 15.6,
        costSavings: 12.3,
        topConsumer
      });
      
    } catch (error) {
      console.error('Failed to fetch energy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMockConsumption = (): EnergyConsumption[] => [
    {
      id: '1',
      propertyId: 'prop-1',
      propertyName: 'Headquarters Tower',
      meterType: 'Electricity',
      period: '2025-01',
      consumption: 125400,
      cost: 18810,
      unit: 'kWh',
      co2Emissions: 52.68,
      targetConsumption: 120000,
      efficiency: 92.3
    },
    {
      id: '2',
      propertyId: 'prop-1',
      propertyName: 'Headquarters Tower',
      meterType: 'Gas',
      period: '2025-01',
      consumption: 45200,
      cost: 3616,
      unit: 'therms',
      co2Emissions: 24.1,
      targetConsumption: 48000,
      efficiency: 94.2
    },
    {
      id: '3',
      propertyId: 'prop-2',
      propertyName: 'Manufacturing Plant A',
      meterType: 'Electricity',
      period: '2025-01',
      consumption: 89600,
      cost: 13440,
      unit: 'kWh',
      co2Emissions: 37.6,
      targetConsumption: 85000,
      efficiency: 89.7
    },
    {
      id: '4',
      propertyId: 'prop-3',
      propertyName: 'Distribution Center',
      meterType: 'Electricity',
      period: '2025-01',
      consumption: 67800,
      cost: 10170,
      unit: 'kWh',
      co2Emissions: 28.5,
      targetConsumption: 70000,
      efficiency: 96.9
    },
    {
      id: '5',
      propertyId: 'prop-1',
      propertyName: 'Headquarters Tower',
      meterType: 'Water',
      period: '2025-01',
      consumption: 15600,
      cost: 780,
      unit: 'gallons',
      targetConsumption: 16000,
      efficiency: 97.5
    }
  ];

  const getMockDevices = (): EnergyDevice[] => [
    {
      id: '1',
      name: 'HVAC System - Zone A',
      type: 'HVAC',
      location: 'Headquarters Tower - 1st Floor',
      status: 'Online',
      currentConsumption: 45.2,
      efficiency: 87.5,
      lastMaintenance: '2025-01-10'
    },
    {
      id: '2',
      name: 'LED Lighting System',
      type: 'Lighting',
      location: 'Headquarters Tower - All Floors',
      status: 'Online',
      currentConsumption: 12.8,
      efficiency: 95.3,
      lastMaintenance: '2024-12-15'
    },
    {
      id: '3',
      name: 'Solar Panel Array',
      type: 'Solar Panel',
      location: 'Headquarters Tower - Rooftop',
      status: 'Online',
      currentConsumption: -25.6, // Negative because it's generating
      efficiency: 89.2,
      lastMaintenance: '2024-11-20'
    },
    {
      id: '4',
      name: 'Manufacturing Equipment',
      type: 'Equipment',
      location: 'Manufacturing Plant A',
      status: 'Alert',
      currentConsumption: 156.4,
      efficiency: 82.1,
      lastMaintenance: '2024-12-28'
    },
    {
      id: '5',
      name: 'Emergency Generator',
      type: 'Generator',
      location: 'Distribution Center - Basement',
      status: 'Offline',
      currentConsumption: 0,
      efficiency: 75.0,
      lastMaintenance: '2024-12-05'
    }
  ];

  const filteredConsumption = consumptionData.filter(item => {
    return (
      (!selectedProperty || item.propertyName.includes(selectedProperty)) &&
      (!selectedMeterType || item.meterType === selectedMeterType)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online': return 'bg-green-100 text-green-800';
      case 'Offline': return 'bg-gray-100 text-gray-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Alert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMeterTypeColor = (type: string) => {
    switch (type) {
      case 'Electricity': return 'bg-blue-100 text-blue-800';
      case 'Gas': return 'bg-orange-100 text-orange-800';
      case 'Water': return 'bg-cyan-100 text-cyan-800';
      case 'Steam': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return 'text-green-600';
    if (efficiency >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMeterTypeIcon = (type: string) => {
    switch (type) {
      case 'Electricity': return '⚡';
      case 'Gas': return '🔥';
      case 'Water': return '💧';
      case 'Steam': return '💨';
      default: return '📊';
    }
  };

  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case 'HVAC': return '❄️';
      case 'Lighting': return '💡';
      case 'Equipment': return '⚙️';
      case 'Solar Panel': return '☀️';
      case 'Generator': return '🔋';
      default: return '📱';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading energy management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Energy Management & Sustainability</h1>
        <div className="space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={fetchEnergyData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Total Cost</h3>
          <p className="text-2xl font-bold text-blue-600">${metrics.totalCost.toLocaleString()}</p>
          <p className="text-xs text-gray-500">This month</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Consumption</h3>
          <p className="text-2xl font-bold text-purple-600">{metrics.totalConsumption.toLocaleString()}</p>
          <p className="text-xs text-gray-500">kWh equivalent</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Avg Efficiency</h3>
          <p className="text-2xl font-bold text-green-600">{metrics.averageEfficiency}%</p>
          <p className="text-xs text-gray-500">Across all systems</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">CO₂ Savings</h3>
          <p className="text-2xl font-bold text-emerald-600">{metrics.co2Savings}%</p>
          <p className="text-xs text-gray-500">vs. last year</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Cost Savings</h3>
          <p className="text-2xl font-bold text-indigo-600">{metrics.costSavings}%</p>
          <p className="text-xs text-gray-500">vs. budget</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Top Consumer</h3>
          <p className="text-lg font-bold text-red-600">{metrics.topConsumer}</p>
          <p className="text-xs text-gray-500">Highest usage</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('consumption')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'consumption'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Energy Consumption ({consumptionData.length})
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'devices'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Devices & Systems ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Analytics & Trends
          </button>
        </div>

        {/* Consumption Tab */}
        {activeTab === 'consumption' && (
          <div className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Properties</option>
                <option value="Headquarters">Headquarters Tower</option>
                <option value="Manufacturing">Manufacturing Plant A</option>
                <option value="Distribution">Distribution Center</option>
              </select>
              <select
                value={selectedMeterType}
                onChange={(e) => setSelectedMeterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Meter Types</option>
                <option value="Electricity">Electricity</option>
                <option value="Gas">Gas</option>
                <option value="Water">Water</option>
                <option value="Steam">Steam</option>
              </select>
              <button
                onClick={() => alert('Export functionality would be implemented')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Export Data
              </button>
            </div>

            {/* Consumption Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meter Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumption</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO₂ Impact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">vs Target</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredConsumption.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.propertyName}</div>
                        <div className="text-sm text-gray-500">{item.period}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{getMeterTypeIcon(item.meterType)}</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getMeterTypeColor(item.meterType)}`}>
                            {item.meterType}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.consumption.toLocaleString()} {item.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${item.cost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getEfficiencyColor(item.efficiency)}`}>
                          {item.efficiency}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${item.efficiency}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.co2Emissions ? `${item.co2Emissions} tons` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.targetConsumption ? (
                          <div className="text-sm">
                            <div className={`font-medium ${item.consumption <= item.targetConsumption ? 'text-green-600' : 'text-red-600'}`}>
                              {item.consumption <= item.targetConsumption ? '✓ Under target' : '⚠ Over target'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Target: {item.targetConsumption.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No target</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => (
                <div key={device.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getDeviceTypeIcon(device.type)}</span>
                      <h3 className="font-semibold text-lg">{device.name}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{device.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium text-right">{device.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Usage:</span>
                      <span className={`font-medium ${device.currentConsumption < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                        {device.currentConsumption < 0 ? '-' : ''}{Math.abs(device.currentConsumption)} kW
                        {device.currentConsumption < 0 && ' (generating)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Efficiency:</span>
                      <span className={`font-medium ${getEfficiencyColor(device.efficiency)}`}>
                        {device.efficiency}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Maintenance:</span>
                      <span className="font-medium">{device.lastMaintenance}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t flex gap-2">
                    <button className="flex-1 bg-blue-500 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded">
                      View Details
                    </button>
                    <button className="flex-1 bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded">
                      Schedule Maintenance
                    </button>
                    {device.status === 'Alert' && (
                      <button className="flex-1 bg-red-500 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">
                        View Alert
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Energy Distribution Chart */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Energy Distribution by Type</h3>
                <div className="space-y-3">
                  {[
                    { type: 'Electricity', percentage: 65, color: 'bg-blue-500' },
                    { type: 'Gas', percentage: 25, color: 'bg-orange-500' },
                    { type: 'Water', percentage: 8, color: 'bg-cyan-500' },
                    { type: 'Steam', percentage: 2, color: 'bg-gray-500' }
                  ].map((item) => (
                    <div key={item.type} className="flex items-center">
                      <div className="w-20 text-sm text-gray-600">{item.type}</div>
                      <div className="flex-1 mx-4">
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div 
                            className={`h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold ${item.color}`}
                            style={{ width: `${item.percentage}%` }}
                          >
                            {item.percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Efficiency Trends */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Efficiency Trends (6 months)</h3>
                <div className="flex items-end space-x-2 h-48">
                  {[87, 89, 91, 88, 92, 91].map((value, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-green-500 rounded-t flex items-end justify-center text-white text-xs font-semibold pb-1"
                        style={{ height: `${(value / 100) * 180}px` }}
                      >
                        {value}%
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'][index]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Analysis */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Cost Analysis by Property</h3>
                <div className="space-y-3">
                  {[
                    { property: 'Headquarters Tower', cost: 23226, percentage: 45 },
                    { property: 'Manufacturing Plant A', cost: 13440, percentage: 26 },
                    { property: 'Distribution Center', cost: 10950, percentage: 21 },
                    { property: 'Research Facility', cost: 4200, percentage: 8 }
                  ].map((item) => (
                    <div key={item.property} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{item.property}</div>
                        <div className="text-xs text-gray-500">${item.cost.toLocaleString()}/month</div>
                      </div>
                      <div className="w-24">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className="bg-purple-500 h-4 rounded-full flex items-center justify-center text-white text-xs"
                            style={{ width: `${item.percentage}%` }}
                          >
                            {item.percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sustainability Metrics */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Sustainability Impact</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">142.9</div>
                    <div className="text-sm text-gray-600">tons CO₂ reduced</div>
                    <div className="text-xs text-gray-500">vs. previous year</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">89.2%</div>
                      <div className="text-gray-600">Energy Star Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-emerald-600">LEED Gold</div>
                      <div className="text-gray-600">Certification</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600">Renewable Energy</div>
                    <div className="text-lg font-bold text-yellow-600">18.4%</div>
                    <div className="text-xs text-gray-500">of total consumption</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnergyManagementServicePage;
