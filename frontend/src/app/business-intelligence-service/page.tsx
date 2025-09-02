import React, { useState, useEffect } from 'react';
import { apiService, Report, Metric } from '../../lib/api';

const BusinessIntelligenceServicePage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newReport, setNewReport] = useState({
    name: '',
    type: 'Sales' as Report['type'],
    status: 'Draft' as Report['status']
  });

  // Load reports and metrics on component mount
  useEffect(() => {
    loadReports();
    loadMetrics();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.businessIntelligence.getReports();
      setReports(data);
    } catch (err) {
      setError('Failed to load reports. Please try again.');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const data = await apiService.businessIntelligence.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error loading metrics:', err);
      // Don't set error for metrics as it's secondary data
    }
  };

  const filteredReports = reports.filter(report => {
    const typeMatch = filterType === 'All' || report.type === filterType;
    const statusMatch = filterStatus === 'All' || report.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewReport(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.name) {
      setError('Please provide a report name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const reportData = {
        name: newReport.name,
        type: newReport.type,
        status: newReport.status
      };

      const createdReport = await apiService.businessIntelligence.createReport(reportData);
      setReports(prev => [...prev, createdReport]);
      setNewReport({ name: '', type: 'Sales', status: 'Draft' });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create report. Please try again.');
      console.error('Error creating report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, newStatus: Report['status']) => {
    try {
      const updatedReport = await apiService.businessIntelligence.updateReport(id, { status: newStatus });
      setReports(prev => prev.map(report =>
        report.id === id ? updatedReport : report
      ));
    } catch (err) {
      setError('Failed to update report status. Please try again.');
      console.error('Error updating report status:', err);
    }
  };

  const deleteReport = async (id: number) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.businessIntelligence.deleteReport(id);
      setReports(prev => prev.filter(report => report.id !== id));
    } catch (err) {
      setError('Failed to delete report. Please try again.');
      console.error('Error deleting report:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Business Intelligence Service</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{metric.name}</p>
                <p className="text-2xl font-bold">{metric.value.toLocaleString()}</p>
              </div>
              <div className={`text-xl ${getTrendColor(metric.trend)}`}>
                {getTrendIcon(metric.trend)}
              </div>
            </div>
            <p className={`text-sm ${getTrendColor(metric.trend)}`}>
              {metric.change > 0 ? '+' : ''}{metric.change}% from last month
            </p>
          </div>
        ))}
      </div>

      {/* Reports Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg leading-6 font-medium text-gray-900">Reports</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage and view business intelligence reports</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => { loadReports(); loadMetrics(); }}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                disabled={loading}
              >
                Refresh
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={submitting}
              >
                {showCreateForm ? 'Cancel' : 'Create Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="All">All Types</option>
                <option value="Sales">Sales</option>
                <option value="Financial">Financial</option>
                <option value="Operational">Operational</option>
                <option value="Performance">Performance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="All">All Status</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Create Report Form */}
        {showCreateForm && (
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Report Name</label>
                  <input
                    type="text"
                    name="name"
                    value={newReport.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    name="type"
                    value={newReport.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={submitting}
                  >
                    <option value="Sales">Sales</option>
                    <option value="Financial">Financial</option>
                    <option value="Operational">Operational</option>
                    <option value="Performance">Performance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={newReport.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={submitting}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Report'}
              </button>
            </form>
          </div>
        )}

        {/* Reports List */}
        <ul className="divide-y divide-gray-200">
          {filteredReports.map((report) => (
            <li key={report.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-indigo-600 truncate">{report.name}</p>
                    <p className="ml-2 flex-shrink-0 flex">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </p>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Type: {report.type}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Data Points: {report.dataPoints?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      Updated: {report.lastUpdated || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <select
                    value={report.status}
                    onChange={(e) => report.id && updateStatus(report.id, e.target.value as Report['status'])}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    disabled={!report.id}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Archived">Archived</option>
                  </select>
                  <button className="bg-blue-500 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded">
                    View
                  </button>
                  <button
                    onClick={() => report.id && deleteReport(report.id)}
                    className="bg-red-500 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                    disabled={!report.id}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filteredReports.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-500">No reports found matching the current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessIntelligenceServicePage;
