'use client';

import React, { useState } from 'react';
import { businessIntelligenceApi } from '../../lib/api-client';
import { useApi, useApiMutation } from '../../lib/use-api';
import type { Report } from '../../lib/api-types';

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface KPIData {
  title: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

const BusinessIntelligenceServicePage = () => {
  // Hardcoded organization ID for demo - in real app this would come from auth context
  const organizationId = 'demo-org-123';
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // State for form data
  const [newReport, setNewReport] = useState({
    name: '',
    type: 'Chart',
    category: 'Financial',
    schedule: '',
    description: ''
  });

  // API calls
  const { 
    data: reportsResponse, 
    loading: reportsLoading, 
    error: reportsError,
    refetch: refetchReports 
  } = useApi(() => businessIntelligenceApi.getReports(organizationId));

  const { mutate: createReportMutation, loading: createLoading } = useApiMutation<Report, any>();

  // Extract reports from API response or fall back to mock data if API fails
  const reports = reportsResponse?.data || [
    {
      id: 1,
      name: 'Asset Utilization Dashboard',
      type: 'Dashboard' as const,
      category: 'Operational' as const,
      lastRun: '2025-01-15 09:30:00',
      status: 'Ready' as const,
      schedule: 'Daily at 6:00 AM',
      dataPoints: 15420
    },
    {
      id: 2,
      name: 'Financial Performance Chart',
      type: 'Chart' as const,
      category: 'Financial' as const,
      lastRun: '2025-01-15 10:15:00',
      status: 'Ready' as const,
      schedule: 'Hourly',
      dataPoints: 8960
    }
  ];
  const filteredReports = reports.filter((report: Report) => {
    return (
      (!searchTerm || report.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!typeFilter || report.type === typeFilter) &&
      (!categoryFilter || report.category === categoryFilter) &&
      (!statusFilter || report.status === statusFilter)
    );
  });

  // Mock data for visualizations
  const [assetData] = useState<ChartData[]>([
    { name: 'Office Equipment', value: 35, color: '#3B82F6' },
    { name: 'HVAC Systems', value: 25, color: '#10B981' },
    { name: 'IT Infrastructure', value: 20, color: '#F59E0B' },
    { name: 'Furniture', value: 15, color: '#EF4444' },
    { name: 'Vehicles', value: 5, color: '#8B5CF6' }
  ]);

  const [revenueData] = useState<ChartData[]>([
    { name: 'Q1', value: 285000 },
    { name: 'Q2', value: 320000 },
    { name: 'Q3', value: 298000 },
    { name: 'Q4', value: 415000 }
  ]);

  const [kpiData] = useState<KPIData[]>([
    { title: 'Asset Utilization', value: 87.5, target: 90, unit: '%', trend: 'up', change: 2.1 },
    { title: 'Cost Efficiency', value: 94.2, target: 95, unit: '%', trend: 'up', change: 1.8 },
    { title: 'Maintenance Compliance', value: 98.1, target: 99, unit: '%', trend: 'down', change: -0.5 },
    { title: 'Energy Savings', value: 12.4, target: 15, unit: '%', trend: 'up', change: 3.2 }
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewReport(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newReport.name) {
      const reportData = {
        name: newReport.name,
        type: newReport.type,
        category: newReport.category,
        schedule: newReport.schedule,
        description: newReport.description,
        reportType: newReport.type,
        configuration: {
          schedule: newReport.schedule,
          description: newReport.description
        }
      };

      const result = await createReportMutation(
        (data) => businessIntelligenceApi.createReport(organizationId, data),
        reportData
      );

      if (result) {
        setNewReport({ name: '', type: 'Chart', category: 'Financial', schedule: '', description: '' });
        setShowCreateForm(false);
        refetchReports();
      }
    }
  };

  const runReport = async (reportId: number) => {
    try {
      await businessIntelligenceApi.executeReport(organizationId, reportId.toString());
      refetchReports(); // Refresh the reports list
    } catch (error) {
      console.error('Failed to run report:', error);
    }
  };

  const deleteReport = async (id: number) => {
    try {
      // Note: This would need a delete endpoint in the API
      // await businessIntelligenceApi.deleteReport(organizationId, id.toString());
      refetchReports();
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'bg-green-100 text-green-800';
      case 'Running': return 'bg-blue-100 text-blue-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Chart': return 'bg-blue-100 text-blue-800';
      case 'Table': return 'bg-green-100 text-green-800';
      case 'Dashboard': return 'bg-purple-100 text-purple-800';
      case 'KPI': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Business Intelligence Service</h1>

      {/* Loading State */}
      {reportsLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading reports...</span>
        </div>
      )}

      {/* Error State */}
      {reportsError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error loading reports:</strong> {reportsError}
          <button 
            onClick={refetchReports}
            className="ml-4 text-red-800 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">{kpi.title}</h3>
              <span className="text-lg">{getTrendIcon(kpi.trend)}</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
              <span className="text-sm text-gray-500">{kpi.unit}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${kpi.value >= kpi.target ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-gray-500">Target: {kpi.target}{kpi.unit}</span>
              <span className={`${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Data Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Asset Distribution Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Asset Distribution</h2>
          <div className="space-y-3">
            {assetData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-32 text-sm text-gray-600">{item.name}</div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className="h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                      style={{ 
                        width: `${(item.value / Math.max(...assetData.map(d => d.value))) * 100}%`,
                        backgroundColor: item.color 
                      }}
                    >
                      {item.value}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Quarterly Revenue</h2>
          <div className="flex items-end space-x-4 h-48">
            {revenueData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t flex items-end justify-center text-white text-xs font-semibold pb-1"
                  style={{ 
                    height: `${(item.value / Math.max(...revenueData.map(d => d.value))) * 180}px` 
                  }}
                >
                  ${(item.value / 1000).toFixed(0)}K
                </div>
                <div className="mt-2 text-sm font-medium text-gray-700">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="Chart">Chart</option>
            <option value="Table">Table</option>
            <option value="Dashboard">Dashboard</option>
            <option value="KPI">KPI</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="Financial">Financial</option>
            <option value="Operational">Operational</option>
            <option value="Strategic">Strategic</option>
            <option value="Compliance">Compliance</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Ready">Ready</option>
            <option value="Running">Running</option>
            <option value="Failed">Failed</option>
            <option value="Scheduled">Scheduled</option>
          </select>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {showCreateForm ? 'Cancel' : 'Create Report'}
          </button>
        </div>
      </div>

      {/* Create Report Form */}
      {showCreateForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Report</h2>
          <form onSubmit={handleCreateReport}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
                <input
                  type="text"
                  name="name"
                  value={newReport.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={newReport.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Chart">Chart</option>
                  <option value="Table">Table</option>
                  <option value="Dashboard">Dashboard</option>
                  <option value="KPI">KPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={newReport.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Financial">Financial</option>
                  <option value="Operational">Operational</option>
                  <option value="Strategic">Strategic</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                <input
                  type="text"
                  name="schedule"
                  value={newReport.schedule}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={newReport.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this report analyzes..."
              />
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                disabled={createLoading}
                className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
              >
                {createLoading ? 'Creating...' : 'Create Report'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Reports & Analytics ({filteredReports.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Points</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Run</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{report.name}</div>
                    <div className="text-xs text-gray-500">{report.schedule}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(report.type)}`}>
                      {report.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.dataPoints.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.lastRun}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedReport?.id === report.id ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => runReport(report.id)}
                      disabled={report.status === 'Running'}
                      className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs px-2 py-1 rounded"
                    >
                      {report.status === 'Running' ? 'Running...' : 'Run'}
                    </button>
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedReport && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <h3 className="font-semibold mb-2">Report Details: {selectedReport.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><strong>ID:</strong> {selectedReport.id}</div>
              <div><strong>Type:</strong> {selectedReport.type}</div>
              <div><strong>Category:</strong> {selectedReport.category}</div>
              <div><strong>Status:</strong> {selectedReport.status}</div>
              <div><strong>Schedule:</strong> {selectedReport.schedule}</div>
              <div><strong>Data Points:</strong> {selectedReport.dataPoints.toLocaleString()}</div>
              <div className="md:col-span-2"><strong>Last Run:</strong> {selectedReport.lastRun}</div>
            </div>
          </div>
        )}
        
        {filteredReports.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No reports found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessIntelligenceServicePage;
