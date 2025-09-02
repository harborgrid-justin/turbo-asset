'use client';

import React, { useState, useEffect } from 'react';

interface Report {
  id: number;
  name: string;
  description: string;
  type: 'Table' | 'Chart' | 'Dashboard' | 'PDF' | 'Excel' | 'CSV';
  category: 'Financial' | 'Operational' | 'Compliance' | 'Maintenance' | 'Strategic';
  status: 'Draft' | 'Published' | 'Scheduled' | 'Running' | 'Failed';
  schedule?: string;
  parameters: ReportParameter[];
  dataSource: string;
  query: string;
  lastRun?: string;
  nextRun?: string;
  createdBy: string;
  createdAt: string;
  isPublic: boolean;
  subscribers: string[];
  executionTime?: number;
  recordCount?: number;
}

interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: string[];
  label: string;
}

interface ReportExecution {
  id: number;
  reportId: number;
  startTime: string;
  endTime?: string;
  status: 'Running' | 'Success' | 'Failed' | 'Cancelled';
  parameters: Record<string, string | number | boolean>;
  recordCount?: number;
  executionTime?: number;
  errorMessage?: string;
  outputSize?: string;
  downloadUrl?: string;
}

interface DataSource {
  id: number;
  name: string;
  type: 'Database' | 'API' | 'File' | 'External';
  connectionString: string;
  isActive: boolean;
  lastTested: string;
  testResult: 'Success' | 'Failed';
}

interface ReportMetrics {
  totalReports: number;
  publishedReports: number;
  scheduledReports: number;
  executionsToday: number;
  failedExecutions: number;
  avgExecutionTime: number;
  mostPopularReport: string;
}

const ReportingServicePage = () => {
  const [reports, setReports] = useState<Report[]>([
    {
      id: 1,
      name: 'Asset Utilization Analysis',
      description: 'Comprehensive analysis of asset utilization rates across all facilities',
      type: 'Dashboard',
      category: 'Operational',
      status: 'Published',
      schedule: 'Daily at 6:00 AM',
      parameters: [
        { name: 'startDate', type: 'date', required: true, label: 'Start Date' },
        { name: 'endDate', type: 'date', required: true, label: 'End Date' },
        { name: 'facility', type: 'select', required: false, label: 'Facility', options: ['All', 'Building A', 'Building B', 'Warehouse'] }
      ],
      dataSource: 'AssetManagement DB',
      query: 'SELECT * FROM asset_utilization WHERE created_date BETWEEN ? AND ?',
      lastRun: '2025-01-15 06:00:00',
      nextRun: '2025-01-16 06:00:00',
      createdBy: 'admin@company.com',
      createdAt: '2024-12-01 10:00:00',
      isPublic: true,
      subscribers: ['facilities@company.com', 'management@company.com'],
      executionTime: 45,
      recordCount: 15420
    },
    {
      id: 2,
      name: 'Financial Performance Report',
      description: 'Monthly financial performance metrics and KPIs',
      type: 'PDF',
      category: 'Financial',
      status: 'Published',
      schedule: 'Monthly on 1st at 9:00 AM',
      parameters: [
        { name: 'month', type: 'select', required: true, label: 'Month', options: ['January', 'February', 'March', 'April', 'May', 'June'] },
        { name: 'includeComparisons', type: 'boolean', required: false, defaultValue: true, label: 'Include Year-over-Year Comparison' }
      ],
      dataSource: 'Financial DB',
      query: 'EXEC GenerateFinancialReport @Month = ?, @IncludeComparisons = ?',
      lastRun: '2025-01-01 09:00:00',
      nextRun: '2025-02-01 09:00:00',
      createdBy: 'finance@company.com',
      createdAt: '2024-11-15 14:30:00',
      isPublic: false,
      subscribers: ['cfo@company.com', 'finance-team@company.com'],
      executionTime: 180,
      recordCount: 8960
    },
    {
      id: 3,
      name: 'Maintenance Cost Breakdown',
      description: 'Detailed breakdown of maintenance costs by asset type and facility',
      type: 'Excel',
      category: 'Maintenance',
      status: 'Failed',
      schedule: 'Weekly on Monday at 8:00 AM',
      parameters: [
        { name: 'quarter', type: 'select', required: true, label: 'Quarter', options: ['Q1', 'Q2', 'Q3', 'Q4'] },
        { name: 'assetType', type: 'string', required: false, label: 'Asset Type Filter' }
      ],
      dataSource: 'Maintenance DB',
      query: 'SELECT * FROM maintenance_costs WHERE quarter = ? AND asset_type LIKE ?',
      lastRun: '2025-01-13 08:00:00',
      nextRun: '2025-01-20 08:00:00',
      createdBy: 'maintenance@company.com',
      createdAt: '2024-10-20 16:45:00',
      isPublic: true,
      subscribers: ['maintenance@company.com', 'finance@company.com'],
      executionTime: 240,
      recordCount: 3240
    }
  ]);

  const [executions, setExecutions] = useState<ReportExecution[]>([
    {
      id: 1,
      reportId: 1,
      startTime: '2025-01-15 06:00:00',
      endTime: '2025-01-15 06:00:45',
      status: 'Success',
      parameters: { startDate: '2025-01-14', endDate: '2025-01-15', facility: 'All' },
      recordCount: 15420,
      executionTime: 45,
      outputSize: '2.3 MB',
      downloadUrl: '/downloads/asset-utilization-20250115.pdf'
    },
    {
      id: 2,
      reportId: 2,
      startTime: '2025-01-01 09:00:00',
      endTime: '2025-01-01 09:03:00',
      status: 'Success',
      parameters: { month: 'December', includeComparisons: true },
      recordCount: 8960,
      executionTime: 180,
      outputSize: '5.7 MB',
      downloadUrl: '/downloads/financial-performance-202412.pdf'
    },
    {
      id: 3,
      reportId: 3,
      startTime: '2025-01-13 08:00:00',
      endTime: '2025-01-13 08:02:30',
      status: 'Failed',
      parameters: { quarter: 'Q4', assetType: '' },
      executionTime: 150,
      errorMessage: 'Database connection timeout'
    }
  ]);

  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: 1,
      name: 'AssetManagement DB',
      type: 'Database',
      connectionString: 'Server=prod-db01;Database=AssetMgmt;',
      isActive: true,
      lastTested: '2025-01-15 10:30:00',
      testResult: 'Success'
    },
    {
      id: 2,
      name: 'Financial DB',
      type: 'Database',
      connectionString: 'Server=fin-db01;Database=Finance;',
      isActive: true,
      lastTested: '2025-01-15 10:25:00',
      testResult: 'Success'
    },
    {
      id: 3,
      name: 'Maintenance DB',
      type: 'Database',
      connectionString: 'Server=maint-db01;Database=Maintenance;',
      isActive: false,
      lastTested: '2025-01-15 10:15:00',
      testResult: 'Failed'
    }
  ]);

  const [metrics] = useState<ReportMetrics>({
    totalReports: 47,
    publishedReports: 34,
    scheduledReports: 18,
    executionsToday: 23,
    failedExecutions: 3,
    avgExecutionTime: 125,
    mostPopularReport: 'Asset Utilization Analysis'
  });

  const [filteredReports, setFilteredReports] = useState<Report[]>(reports);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showExecutions] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showDataSources] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'executions' | 'dataSources'>('reports');

  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    type: 'Table' as Report['type'],
    category: 'Operational' as Report['category'],
    dataSource: '',
    query: '',
    schedule: '',
    isPublic: true
  });

  useEffect(() => {
    const filtered = reports.filter(report => {
      return (
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase())
      ) &&
      (typeFilter === '' || report.type === typeFilter) &&
      (categoryFilter === '' || report.category === categoryFilter) &&
      (statusFilter === '' || report.status === statusFilter);
    });
    setFilteredReports(filtered);
  }, [reports, searchTerm, typeFilter, categoryFilter, statusFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setNewReport(prev => ({ ...prev, [name]: checked }));
    } else {
      setNewReport(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReport.name && newReport.dataSource && newReport.query) {
      const report: Report = {
        id: Date.now(),
        ...newReport,
        parameters: [],
        status: 'Draft',
        createdBy: 'current@user.com',
        createdAt: new Date().toLocaleString(),
        subscribers: []
      };
      setReports(prev => [...prev, report]);
      setNewReport({
        name: '',
        description: '',
        type: 'Table',
        category: 'Operational',
        dataSource: '',
        query: '',
        schedule: '',
        isPublic: true
      });
      setShowCreateForm(false);
    }
  };

  const runReport = (id: number) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    setReports(prev => prev.map(r => 
      r.id === id ? { ...r, status: 'Running' } : r
    ));

    const execution: ReportExecution = {
      id: Date.now(),
      reportId: id,
      startTime: new Date().toLocaleString(),
      status: 'Running',
      parameters: {}
    };

    setExecutions(prev => [execution, ...prev]);

    // Simulate execution
    setTimeout(() => {
      const success = Math.random() > 0.2;
      const executionTime = Math.floor(Math.random() * 300) + 30;
      const recordCount = Math.floor(Math.random() * 10000) + 1000;

      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id 
          ? {
              ...exec,
              endTime: new Date().toLocaleString(),
              status: success ? 'Success' : 'Failed',
              executionTime,
              recordCount: success ? recordCount : undefined,
              outputSize: success ? `${(Math.random() * 10 + 1).toFixed(1)} MB` : undefined,
              errorMessage: success ? undefined : 'Query execution failed',
              downloadUrl: success ? `/downloads/${report.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${report.type.toLowerCase()}` : undefined
            }
          : exec
      ));

      setReports(prev => prev.map(r => 
        r.id === id 
          ? { 
              ...r, 
              status: success ? 'Published' : 'Failed',
              lastRun: new Date().toLocaleString(),
              executionTime,
              recordCount: success ? recordCount : undefined
            }
          : r
      ));
    }, 3000);
  };

  const publishReport = (id: number) => {
    setReports(prev => prev.map(report => 
      report.id === id ? { ...report, status: 'Published' } : report
    ));
  };

  const scheduleReport = (id: number) => {
    setReports(prev => prev.map(report => 
      report.id === id ? { ...report, status: 'Scheduled' } : report
    ));
  };

  const testDataSource = (id: number) => {
    setDataSources(prev => prev.map(ds => 
      ds.id === id 
        ? { 
            ...ds, 
            lastTested: new Date().toLocaleString(),
            testResult: Math.random() > 0.2 ? 'Success' : 'Failed'
          }
        : ds
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published': case 'Success': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'Running': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Table': return 'bg-blue-100 text-blue-800';
      case 'Chart': return 'bg-purple-100 text-purple-800';
      case 'Dashboard': return 'bg-green-100 text-green-800';
      case 'PDF': return 'bg-red-100 text-red-800';
      case 'Excel': return 'bg-green-100 text-green-800';
      case 'CSV': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Financial': return 'bg-green-100 text-green-800';
      case 'Operational': return 'bg-blue-100 text-blue-800';
      case 'Compliance': return 'bg-orange-100 text-orange-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Strategic': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Reporting Service</h1>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold">{metrics.totalReports}</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold text-green-600">{metrics.publishedReports}</p>
            </div>
            <div className="text-2xl">✅</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.scheduledReports}</p>
            </div>
            <div className="text-2xl">⏰</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Runs Today</p>
              <p className="text-2xl font-bold">{metrics.executionsToday}</p>
            </div>
            <div className="text-2xl">🚀</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{metrics.failedExecutions}</p>
            </div>
            <div className="text-2xl">❌</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Time</p>
              <p className="text-2xl font-bold">{metrics.avgExecutionTime}s</p>
            </div>
            <div className="text-2xl">⚡</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Most Popular</p>
              <p className="text-xs font-bold text-purple-600">{metrics.mostPopularReport}</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 bg-white rounded-lg shadow">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('executions')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'executions'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Executions ({executions.length})
          </button>
          <button
            onClick={() => setActiveTab('dataSources')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'dataSources'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Sources ({dataSources.length})
          </button>
        </div>

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="p-6">
            {/* Filters and Controls */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
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
                <option value="Table">Table</option>
                <option value="Chart">Chart</option>
                <option value="Dashboard">Dashboard</option>
                <option value="PDF">PDF</option>
                <option value="Excel">Excel</option>
                <option value="CSV">CSV</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="Financial">Financial</option>
                <option value="Operational">Operational</option>
                <option value="Compliance">Compliance</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Strategic">Strategic</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Running">Running</option>
                <option value="Failed">Failed</option>
              </select>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Report
              </button>
              <div></div>
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
                        <option value="Table">Table</option>
                        <option value="Chart">Chart</option>
                        <option value="Dashboard">Dashboard</option>
                        <option value="PDF">PDF</option>
                        <option value="Excel">Excel</option>
                        <option value="CSV">CSV</option>
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
                        <option value="Compliance">Compliance</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Strategic">Strategic</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
                      <select
                        name="dataSource"
                        value={newReport.dataSource}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Data Source</option>
                        {dataSources.filter(ds => ds.isActive).map(ds => (
                          <option key={ds.id} value={ds.name}>{ds.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        name="description"
                        value={newReport.description}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">SQL Query</label>
                      <textarea
                        name="query"
                        value={newReport.query}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="SELECT * FROM table_name WHERE condition = ?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (Optional)</label>
                      <input
                        type="text"
                        name="schedule"
                        value={newReport.schedule}
                        onChange={handleInputChange}
                        placeholder="Daily at 9:00 AM"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isPublic"
                        checked={newReport.isPublic}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <label className="text-sm font-medium text-gray-700">Public Report</label>
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Create Report
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

            {/* Reports Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type & Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{report.name}</div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{report.description}</div>
                        <div className="text-xs text-gray-400">By: {report.createdBy}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(report.type)}`}>
                          {report.type}
                        </span>
                        <div className="mt-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(report.category)}`}>
                            {report.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {report.isPublic ? '🌐 Public' : '🔒 Private'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.executionTime && (
                          <div>{report.executionTime}s avg</div>
                        )}
                        {report.recordCount && (
                          <div className="text-xs text-gray-500">{report.recordCount.toLocaleString()} records</div>
                        )}
                        {report.subscribers.length > 0 && (
                          <div className="text-xs text-blue-600">{report.subscribers.length} subscribers</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.schedule && (
                          <>
                            <div>{report.schedule}</div>
                            {report.nextRun && (
                              <div className="text-xs text-gray-500">Next: {report.nextRun.split(' ')[0]}</div>
                            )}
                          </>
                        )}
                        {!report.schedule && (
                          <span className="text-gray-400">Manual</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1">
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
                        {report.status === 'Draft' && (
                          <button
                            onClick={() => publishReport(report.id)}
                            className="bg-purple-500 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded"
                          >
                            Publish
                          </button>
                        )}
                        {report.status === 'Published' && !report.schedule && (
                          <button
                            onClick={() => scheduleReport(report.id)}
                            className="bg-orange-500 hover:bg-orange-700 text-white text-xs px-2 py-1 rounded"
                          >
                            Schedule
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedReport && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Report Details: {selectedReport.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div><strong>Type:</strong> {selectedReport.type}</div>
                  <div><strong>Category:</strong> {selectedReport.category}</div>
                  <div><strong>Status:</strong> {selectedReport.status}</div>
                  <div><strong>Data Source:</strong> {selectedReport.dataSource}</div>
                  <div><strong>Created:</strong> {selectedReport.createdAt}</div>
                  <div><strong>Created By:</strong> {selectedReport.createdBy}</div>
                  <div><strong>Visibility:</strong> {selectedReport.isPublic ? 'Public' : 'Private'}</div>
                  <div><strong>Subscribers:</strong> {selectedReport.subscribers.length}</div>
                </div>
                <div className="mb-3">
                  <strong>Description:</strong> {selectedReport.description || 'No description provided'}
                </div>
                <div className="mb-3">
                  <strong>Parameters:</strong>
                  {selectedReport.parameters.length > 0 ? (
                    <div className="ml-4 mt-1">
                      {selectedReport.parameters.map((param, index) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border mb-1">
                          <strong>{param.label}</strong> ({param.type}) {param.required ? '- Required' : '- Optional'}
                          {param.defaultValue && <span> - Default: {param.defaultValue}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="ml-2 text-gray-500">No parameters</span>
                  )}
                </div>
                <div>
                  <strong>SQL Query:</strong>
                  <pre className="bg-white p-3 rounded border mt-1 text-xs overflow-x-auto">{selectedReport.query}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Executions Tab */}
        {activeTab === 'executions' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Output</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {executions.map((execution) => {
                    const report = reports.find(r => r.id === execution.reportId);
                    return (
                      <tr key={execution.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report?.name || 'Unknown Report'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {execution.startTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {execution.executionTime ? `${execution.executionTime}s` : 'In progress...'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {execution.recordCount ? execution.recordCount.toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(execution.status)}`}>
                            {execution.status}
                          </span>
                          {execution.errorMessage && (
                            <div className="text-xs text-red-600 mt-1">{execution.errorMessage}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {execution.downloadUrl ? (
                            <div>
                              <div className="text-sm text-gray-900">{execution.outputSize}</div>
                              <button className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded mt-1">
                                Download
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Sources Tab */}
        {activeTab === 'dataSources' && (
          <div className="p-6">
            <div className="space-y-4">
              {dataSources.map((ds) => (
                <div key={ds.id} className="border rounded-lg p-4 hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{ds.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        ds.type === 'Database' ? 'bg-blue-100 text-blue-800' :
                        ds.type === 'API' ? 'bg-green-100 text-green-800' :
                        ds.type === 'File' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ds.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        ds.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ds.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ds.testResult)}`}>
                        {ds.testResult}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="font-mono text-xs bg-gray-100 p-2 rounded">{ds.connectionString}</div>
                    <div>Last Tested: {ds.lastTested}</div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => testDataSource(ds.id)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-2"
                    >
                      Test Connection
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportingServicePage;
