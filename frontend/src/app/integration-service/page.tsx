'use client';

import React, { useState, useEffect } from 'react';

interface Integration {
  id: number;
  name: string;
  type: 'REST' | 'SOAP' | 'GraphQL' | 'Webhook' | 'Database' | 'File' | 'Queue';
  status: 'Active' | 'Inactive' | 'Failed' | 'Testing';
  sourceSystem: string;
  targetSystem: string;
  lastSync: string;
  syncFrequency: string;
  recordsProcessed: number;
  errorCount: number;
  dataMapping: string;
  authMethod: 'API_KEY' | 'OAUTH2' | 'BASIC' | 'CERTIFICATE' | 'NONE';
  createdAt: string;
}

interface SyncLog {
  id: number;
  integrationId: number;
  startTime: string;
  endTime: string;
  status: 'Success' | 'Failed' | 'Partial';
  recordsProcessed: number;
  recordsFailed: number;
  duration: number;
  errorMessage?: string;
}

interface IntegrationMetrics {
  totalIntegrations: number;
  activeIntegrations: number;
  failedIntegrations: number;
  totalRecordsToday: number;
  avgSyncTime: number;
  successRate: number;
  peakRecordsPerHour: number;
}

const IntegrationServicePage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 1,
      name: 'Asset Data Sync',
      type: 'REST',
      status: 'Active',
      sourceSystem: 'MaintenanceSystem',
      targetSystem: 'AssetManagement',
      lastSync: '2025-01-15 11:45:00',
      syncFrequency: 'Every 15 minutes',
      recordsProcessed: 15420,
      errorCount: 12,
      dataMapping: 'assets_to_maintenance_mapping.json',
      authMethod: 'API_KEY',
      createdAt: '2024-11-15 09:30:00'
    },
    {
      id: 2,
      name: 'Financial Reporting Integration',
      type: 'SOAP',
      status: 'Active',
      sourceSystem: 'ERP_System',
      targetSystem: 'FinancialReporting',
      lastSync: '2025-01-15 10:30:00',
      syncFrequency: 'Daily at 2:00 AM',
      recordsProcessed: 8960,
      errorCount: 3,
      dataMapping: 'financial_data_mapping.xml',
      authMethod: 'CERTIFICATE',
      createdAt: '2024-10-20 14:22:00'
    },
    {
      id: 3,
      name: 'Legacy Database Sync',
      type: 'Database',
      status: 'Failed',
      sourceSystem: 'LegacyDB_Oracle',
      targetSystem: 'ModernDataWarehouse',
      lastSync: '2025-01-15 08:15:00',
      syncFrequency: 'Hourly',
      recordsProcessed: 2340,
      errorCount: 156,
      dataMapping: 'legacy_transformation.sql',
      authMethod: 'BASIC',
      createdAt: '2024-09-10 16:45:00'
    }
  ]);

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([
    {
      id: 1,
      integrationId: 1,
      startTime: '2025-01-15 11:45:00',
      endTime: '2025-01-15 11:45:45',
      status: 'Success',
      recordsProcessed: 245,
      recordsFailed: 0,
      duration: 45
    },
    {
      id: 2,
      integrationId: 2,
      startTime: '2025-01-15 10:30:00',
      endTime: '2025-01-15 10:35:20',
      status: 'Success',
      recordsProcessed: 1850,
      recordsFailed: 2,
      duration: 320
    },
    {
      id: 3,
      integrationId: 3,
      startTime: '2025-01-15 08:15:00',
      endTime: '2025-01-15 08:16:30',
      status: 'Failed',
      recordsProcessed: 0,
      recordsFailed: 0,
      duration: 90,
      errorMessage: 'Database connection timeout'
    }
  ]);

  const [metrics] = useState<IntegrationMetrics>({
    totalIntegrations: 24,
    activeIntegrations: 21,
    failedIntegrations: 3,
    totalRecordsToday: 47320,
    avgSyncTime: 185,
    successRate: 94.2,
    peakRecordsPerHour: 8640
  });

  const [filteredIntegrations, setFilteredIntegrations] = useState<Integration[]>(integrations);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [authFilter, setAuthFilter] = useState('');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSyncLogs, setShowSyncLogs] = useState(false);

  const [newIntegration, setNewIntegration] = useState({
    name: '',
    type: 'REST' as Integration['type'],
    sourceSystem: '',
    targetSystem: '',
    syncFrequency: 'Hourly',
    dataMapping: '',
    authMethod: 'API_KEY' as Integration['authMethod']
  });

  useEffect(() => {
    const filtered = integrations.filter(integration => {
      return (
        integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        integration.sourceSystem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        integration.targetSystem.toLowerCase().includes(searchTerm.toLowerCase())
      ) &&
      (typeFilter === '' || integration.type === typeFilter) &&
      (statusFilter === '' || integration.status === statusFilter) &&
      (authFilter === '' || integration.authMethod === authFilter);
    });
    setFilteredIntegrations(filtered);
  }, [integrations, searchTerm, typeFilter, statusFilter, authFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewIntegration(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIntegration.name && newIntegration.sourceSystem && newIntegration.targetSystem) {
      const integration: Integration = {
        id: Date.now(),
        ...newIntegration,
        status: 'Testing',
        lastSync: 'Never',
        recordsProcessed: 0,
        errorCount: 0,
        createdAt: new Date().toLocaleString()
      };
      setIntegrations(prev => [...prev, integration]);
      setNewIntegration({
        name: '',
        type: 'REST',
        sourceSystem: '',
        targetSystem: '',
        syncFrequency: 'Hourly',
        dataMapping: '',
        authMethod: 'API_KEY'
      });
      setShowCreateForm(false);
    }
  };

  const testIntegration = (id: number) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id 
        ? { ...integration, status: 'Testing' }
        : integration
    ));

    // Simulate test
    setTimeout(() => {
      setIntegrations(prev => prev.map(integration => 
        integration.id === id 
          ? { 
              ...integration, 
              status: Math.random() > 0.3 ? 'Active' : 'Failed',
              lastSync: new Date().toLocaleString()
            }
          : integration
      ));
    }, 3000);
  };

  const runSync = (id: number) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;

    const newLog: SyncLog = {
      id: Date.now(),
      integrationId: id,
      startTime: new Date().toLocaleString(),
      endTime: '',
      status: 'Success',
      recordsProcessed: Math.floor(Math.random() * 1000) + 100,
      recordsFailed: Math.floor(Math.random() * 10),
      duration: 0
    };

    setSyncLogs(prev => [newLog, ...prev]);

    // Simulate sync completion
    setTimeout(() => {
      const duration = Math.floor(Math.random() * 300) + 30;
      const success = Math.random() > 0.2;
      
      setSyncLogs(prev => prev.map(log => 
        log.id === newLog.id 
          ? { 
              ...log, 
              endTime: new Date().toLocaleString(),
              status: success ? 'Success' : 'Failed',
              duration,
              errorMessage: success ? undefined : 'Sync operation failed - timeout'
            }
          : log
      ));

      setIntegrations(prev => prev.map(integration => 
        integration.id === id 
          ? { 
              ...integration, 
              lastSync: new Date().toLocaleString(),
              recordsProcessed: integration.recordsProcessed + newLog.recordsProcessed,
              errorCount: success ? integration.errorCount : integration.errorCount + 1
            }
          : integration
      ));
    }, 2000);
  };

  const toggleIntegrationStatus = (id: number) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id 
        ? { 
            ...integration, 
            status: integration.status === 'Active' ? 'Inactive' : 'Active' 
          }
        : integration
    ));
  };

  const deleteIntegration = (id: number) => {
    setIntegrations(prev => prev.filter(integration => integration.id !== id));
    setSyncLogs(prev => prev.filter(log => log.integrationId !== id));
    if (selectedIntegration?.id === id) {
      setSelectedIntegration(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Testing': return 'bg-blue-100 text-blue-800';
      case 'Success': return 'bg-green-100 text-green-800';
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'REST': return 'bg-blue-100 text-blue-800';
      case 'SOAP': return 'bg-purple-100 text-purple-800';
      case 'GraphQL': return 'bg-pink-100 text-pink-800';
      case 'Webhook': return 'bg-orange-100 text-orange-800';
      case 'Database': return 'bg-green-100 text-green-800';
      case 'File': return 'bg-yellow-100 text-yellow-800';
      case 'Queue': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAuthColor = (auth: string) => {
    switch (auth) {
      case 'API_KEY': return 'bg-blue-100 text-blue-800';
      case 'OAUTH2': return 'bg-green-100 text-green-800';
      case 'BASIC': return 'bg-yellow-100 text-yellow-800';
      case 'CERTIFICATE': return 'bg-purple-100 text-purple-800';
      case 'NONE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Integration Service</h1>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{metrics.totalIntegrations}</p>
            </div>
            <div className="text-2xl">🔗</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{metrics.activeIntegrations}</p>
            </div>
            <div className="text-2xl">✅</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{metrics.failedIntegrations}</p>
            </div>
            <div className="text-2xl">❌</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Records Today</p>
              <p className="text-2xl font-bold">{metrics.totalRecordsToday.toLocaleString()}</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Sync Time</p>
              <p className="text-2xl font-bold">{metrics.avgSyncTime}s</p>
            </div>
            <div className="text-2xl">⚡</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">{metrics.successRate}%</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Peak/Hour</p>
              <p className="text-2xl font-bold">{metrics.peakRecordsPerHour.toLocaleString()}</p>
            </div>
            <div className="text-2xl">🚀</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Search integrations..."
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
            <option value="REST">REST</option>
            <option value="SOAP">SOAP</option>
            <option value="GraphQL">GraphQL</option>
            <option value="Webhook">Webhook</option>
            <option value="Database">Database</option>
            <option value="File">File</option>
            <option value="Queue">Queue</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Failed">Failed</option>
            <option value="Testing">Testing</option>
          </select>
          <select
            value={authFilter}
            onChange={(e) => setAuthFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Auth</option>
            <option value="API_KEY">API Key</option>
            <option value="OAUTH2">OAuth2</option>
            <option value="BASIC">Basic</option>
            <option value="CERTIFICATE">Certificate</option>
            <option value="NONE">None</option>
          </select>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Integration
          </button>
          <button
            onClick={() => setShowSyncLogs(!showSyncLogs)}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Sync Logs
          </button>
        </div>
      </div>

      {/* Create Integration Form */}
      {showCreateForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Integration</h2>
          <form onSubmit={handleCreateIntegration}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Integration Name</label>
                <input
                  type="text"
                  name="name"
                  value={newIntegration.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={newIntegration.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="REST">REST API</option>
                  <option value="SOAP">SOAP</option>
                  <option value="GraphQL">GraphQL</option>
                  <option value="Webhook">Webhook</option>
                  <option value="Database">Database</option>
                  <option value="File">File</option>
                  <option value="Queue">Message Queue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source System</label>
                <input
                  type="text"
                  name="sourceSystem"
                  value={newIntegration.sourceSystem}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target System</label>
                <input
                  type="text"
                  name="targetSystem"
                  value={newIntegration.targetSystem}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sync Frequency</label>
                <select
                  name="syncFrequency"
                  value={newIntegration.syncFrequency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Real-time">Real-time</option>
                  <option value="Every 5 minutes">Every 5 minutes</option>
                  <option value="Every 15 minutes">Every 15 minutes</option>
                  <option value="Hourly">Hourly</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authentication</label>
                <select
                  name="authMethod"
                  value={newIntegration.authMethod}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="API_KEY">API Key</option>
                  <option value="OAUTH2">OAuth2</option>
                  <option value="BASIC">Basic Auth</option>
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="NONE">None</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Mapping</label>
                <input
                  type="text"
                  name="dataMapping"
                  value={newIntegration.dataMapping}
                  onChange={handleInputChange}
                  placeholder="mapping_config.json"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Integration
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

      {/* Sync Logs Modal/Panel */}
      {showSyncLogs && (
        <div className="bg-white p-6 rounded-lg mb-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Sync Logs</h2>
            <button
              onClick={() => setShowSyncLogs(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Integration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {syncLogs.slice(0, 10).map((log) => {
                  const integration = integrations.find(i => i.id === log.integrationId);
                  return (
                    <tr key={log.id}>
                      <td className="px-4 py-4 text-sm text-gray-900">{integration?.name || 'Unknown'}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{log.startTime}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{log.duration}s</td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>{log.recordsProcessed} processed</div>
                        {log.recordsFailed > 0 && (
                          <div className="text-red-600">{log.recordsFailed} failed</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                        {log.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">{log.errorMessage}</div>
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

      {/* Integrations Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Integrations ({filteredIntegrations.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Integration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Systems</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIntegrations.map((integration) => (
                <tr key={integration.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{integration.name}</div>
                    <div className="text-xs text-gray-500">{integration.syncFrequency}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(integration.type)}`}>
                      {integration.type}
                    </span>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getAuthColor(integration.authMethod)}`}>
                        {integration.authMethod.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{integration.sourceSystem}</div>
                    <div className="text-xs text-gray-500">→ {integration.targetSystem}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(integration.status)}`}>
                      {integration.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{integration.recordsProcessed.toLocaleString()} records</div>
                    <div className="text-xs text-red-600">{integration.errorCount} errors</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{integration.lastSync === 'Never' ? 'Never' : integration.lastSync.split(' ')[0]}</div>
                    {integration.lastSync !== 'Never' && (
                      <div className="text-xs text-gray-500">{integration.lastSync.split(' ')[1]}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedIntegration(selectedIntegration?.id === integration.id ? null : integration)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedIntegration?.id === integration.id ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => testIntegration(integration.id)}
                      disabled={integration.status === 'Testing'}
                      className="bg-purple-500 hover:bg-purple-700 disabled:bg-gray-400 text-white text-xs px-2 py-1 rounded"
                    >
                      {integration.status === 'Testing' ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => runSync(integration.id)}
                      disabled={integration.status !== 'Active'}
                      className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs px-2 py-1 rounded"
                    >
                      Sync
                    </button>
                    <button
                      onClick={() => toggleIntegrationStatus(integration.id)}
                      className={`text-white text-xs px-2 py-1 rounded ${
                        integration.status === 'Active' 
                          ? 'bg-yellow-500 hover:bg-yellow-700' 
                          : 'bg-green-500 hover:bg-green-700'
                      }`}
                    >
                      {integration.status === 'Active' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteIntegration(integration.id)}
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

        {selectedIntegration && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <h3 className="font-semibold mb-2">Integration Details: {selectedIntegration.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><strong>Type:</strong> {selectedIntegration.type}</div>
              <div><strong>Status:</strong> {selectedIntegration.status}</div>
              <div><strong>Auth Method:</strong> {selectedIntegration.authMethod.replace('_', ' ')}</div>
              <div><strong>Frequency:</strong> {selectedIntegration.syncFrequency}</div>
              <div><strong>Source:</strong> {selectedIntegration.sourceSystem}</div>
              <div><strong>Target:</strong> {selectedIntegration.targetSystem}</div>
              <div><strong>Records Processed:</strong> {selectedIntegration.recordsProcessed.toLocaleString()}</div>
              <div><strong>Error Count:</strong> {selectedIntegration.errorCount}</div>
              <div><strong>Data Mapping:</strong> {selectedIntegration.dataMapping || 'Not specified'}</div>
              <div><strong>Last Sync:</strong> {selectedIntegration.lastSync}</div>
              <div><strong>Created:</strong> {selectedIntegration.createdAt}</div>
            </div>
          </div>
        )}
        
        {filteredIntegrations.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No integrations found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationServicePage;
