import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface Integration {
  id: string;
  name: string;
  description: string;
  type: 'API' | 'Database' | 'File' | 'MessageQueue' | 'Webhook' | 'Custom';
  sourceSystem: string;
  targetSystem: string;
  status: 'Active' | 'Inactive' | 'Error' | 'Maintenance';
  configuration: {
    endpoint?: string;
    credentials?: Record<string, unknown>;
    headers?: Record<string, string>;
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      backoffMultiplier: number;
      initialDelay: number;
    };
    transformation?: {
      inputFormat: string;
      outputFormat: string;
      mappingRules: Record<string, string>;
    };
  };
  schedule?: {
    type: 'RealTime' | 'Batch' | 'Scheduled';
    cronExpression?: string;
    interval?: number;
    unit?: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  monitoring: {
    enabled: boolean;
    metrics: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
      lastExecutionTime?: string;
      uptime: number;
    };
    alerts: {
      enabled: boolean;
      failureThreshold: number;
      responseTimeThreshold: number;
      emailRecipients: string[];
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface IntegrationLog {
  id: string;
  integrationId: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
  status: 'Success' | 'Failed' | 'Partial' | 'Timeout';
}

interface DataMapping {
  id: string;
  integrationId: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  defaultValue?: string;
  validation?: {
    required: boolean;
    type: string;
    pattern?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const IntegrationServicePage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [mappings, setMappings] = useState<DataMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'integrations' | 'logs' | 'mappings'>('integrations');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterLevel, setFilterLevel] = useState<string>('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [creating, setCreating] = useState(false);

  // Form state for integrations
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    description: '',
    type: 'API' as Integration['type'],
    sourceSystem: '',
    targetSystem: '',
    endpoint: '',
    credentials: '',
    headers: '',
    timeout: 30,
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1,
    scheduleType: 'RealTime' as 'RealTime' | 'Batch' | 'Scheduled',
    cronExpression: '',
    interval: 1,
    unit: 'hours' as 'seconds' | 'minutes' | 'hours' | 'days',
    unit: 'hours' as 'seconds' | 'minutes' | 'hours' | 'days',
    alertsEnabled: true,
    failureThreshold: 5,
    responseTimeThreshold: 5000,
    emailRecipients: ''
  });

  // Form state for mappings
  const [newMapping, setNewMapping] = useState({
    integrationId: '',
    sourceField: '',
    targetField: '',
    transformation: '',
    defaultValue: '',
    required: false,
    fieldType: 'string',
    pattern: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [integrationsData, logsData, mappingsData] = await Promise.all([
        apiService.generic.getAll<Integration>('integrations'),
        apiService.generic.getAll<IntegrationLog>('integration-logs'),
        apiService.generic.getAll<DataMapping>('data-mappings')
      ]);
      setIntegrations(integrationsData);
      setLogs(logsData);
      setMappings(mappingsData);
    } catch (err) {
      setError('Failed to load integration data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIntegration.name || !newIntegration.sourceSystem || !newIntegration.targetSystem) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const integrationData = {
        ...newIntegration,
        configuration: {
          endpoint: newIntegration.endpoint || undefined,
          credentials: newIntegration.credentials.split(';').reduce((acc, item) => {
            const [key, value] = item.split(':').map(s => s.trim());
            if (key && value) acc[key] = value;
            return acc;
          }, {} as Record<string, unknown>),
          headers: newIntegration.headers.split(';').reduce((acc, item) => {
            const [key, value] = item.split(':').map(s => s.trim());
            if (key && value) acc[key] = value;
            return acc;
          }, {} as Record<string, string>),
          timeout: newIntegration.timeout,
          retryPolicy: {
            maxRetries: newIntegration.maxRetries,
            backoffMultiplier: newIntegration.backoffMultiplier,
            initialDelay: newIntegration.initialDelay
          },
          transformation: {
            inputFormat: 'JSON',
            outputFormat: 'JSON',
            mappingRules: {}
          }
        },
        schedule: newIntegration.scheduleType === 'RealTime' ? undefined : {
          type: newIntegration.scheduleType,
          cronExpression: newIntegration.scheduleType === 'Scheduled' ? newIntegration.cronExpression : undefined,
          interval: newIntegration.scheduleType === 'Batch' ? newIntegration.interval : undefined,
          unit: newIntegration.scheduleType === 'Batch' ? newIntegration.unit : undefined
        },
        monitoring: {
          enabled: newIntegration.monitoringEnabled,
          metrics: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            uptime: 100
          },
          alerts: {
            enabled: newIntegration.alertsEnabled,
            failureThreshold: newIntegration.failureThreshold,
            responseTimeThreshold: newIntegration.responseTimeThreshold,
            emailRecipients: newIntegration.emailRecipients.split(',').map(email => email.trim())
          }
        },
        status: 'Inactive' as Integration['status']
      };

      const createdIntegration = await apiService.generic.create<Integration>('integrations', integrationData);

      setIntegrations(prev => [createdIntegration, ...prev]);
      setNewIntegration({
        name: '',
        description: '',
        type: 'API',
        sourceSystem: '',
        targetSystem: '',
        endpoint: '',
        credentials: '',
        headers: '',
        timeout: 30,
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1,
        scheduleType: 'RealTime',
        cronExpression: '',
        interval: 1,
        unit: 'hours',
        monitoringEnabled: true,
        alertsEnabled: true,
        failureThreshold: 5,
        responseTimeThreshold: 5000,
        emailRecipients: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create integration. Please try again.');
      console.error('Error creating integration:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapping.integrationId || !newMapping.sourceField || !newMapping.targetField) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const mappingData = {
        ...newMapping,
        validation: {
          required: newMapping.required,
          type: newMapping.fieldType,
          pattern: newMapping.pattern || undefined
        }
      };

      const createdMapping = await apiService.generic.create<DataMapping>('data-mappings', mappingData);

      setMappings(prev => [createdMapping, ...prev]);
      setNewMapping({
        integrationId: '',
        sourceField: '',
        targetField: '',
        transformation: '',
        defaultValue: '',
        required: false,
        fieldType: 'string',
        pattern: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create data mapping. Please try again.');
      console.error('Error creating mapping:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateIntegrationStatus = async (integrationId: string, status: Integration['status']) => {
    try {
      setError(null);
      await apiService.generic.update<Integration>('integrations', parseInt(integrationId), { status });
      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId ? { ...integration, status } : integration
      ));
    } catch (err) {
      setError('Failed to update integration status. Please try again.');
      console.error('Error updating integration:', err);
    }
  };

  const deleteIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('integrations', parseInt(integrationId));
      setIntegrations(prev => prev.filter(integration => integration.id !== integrationId));
    } catch (err) {
      setError('Failed to delete integration. Please try again.');
      console.error('Error deleting integration:', err);
    }
  };

  const deleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this data mapping? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('data-mappings', parseInt(mappingId));
      setMappings(prev => prev.filter(mapping => mapping.id !== mappingId));
    } catch (err) {
      setError('Failed to delete data mapping. Please try again.');
      console.error('Error deleting mapping:', err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'API': return 'bg-blue-100 text-blue-800';
      case 'Database': return 'bg-green-100 text-green-800';
      case 'File': return 'bg-purple-100 text-purple-800';
      case 'MessageQueue': return 'bg-orange-100 text-orange-800';
      case 'Webhook': return 'bg-red-100 text-red-800';
      case 'Custom': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Error': return 'bg-red-100 text-red-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'bg-blue-100 text-blue-800';
      case 'WARN': return 'bg-yellow-100 text-yellow-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      case 'DEBUG': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogStatusColor = (status: string) => {
    switch (status) {
      case 'Success': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      case 'Timeout': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const typeMatch = filterType === 'All' || integration.type === filterType;
    const statusMatch = filterStatus === 'All' || integration.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const filteredLogs = logs.filter(log => {
    const levelMatch = filterLevel === 'All' || log.level === filterLevel;
    const dateMatch = (!dateRange.start || new Date(log.timestamp) >= new Date(dateRange.start)) &&
                     (!dateRange.end || new Date(log.timestamp) <= new Date(dateRange.end));
    return levelMatch && dateMatch;
  });

  const filteredMappings = mappings.filter(mapping => {
    const integrationMatch = !selectedIntegration || mapping.integrationId === selectedIntegration.id;
    return integrationMatch;
  });

  const getStats = () => {
    const totalIntegrations = integrations.length;
    const activeIntegrations = integrations.filter(i => i.status === 'Active').length;
    const totalLogs = logs.length;
    const errorLogs = logs.filter(l => l.level === 'ERROR').length;
    const totalMappings = mappings.length;
    const successRate = logs.length > 0 ? (logs.filter(l => l.status === 'Success').length / logs.length * 100).toFixed(1) : '0';
    const averageResponseTime = integrations.reduce((sum, i) => sum + i.monitoring.metrics.averageResponseTime, 0) / integrations.length || 0;

    return {
      totalIntegrations,
      activeIntegrations,
      totalLogs,
      errorLogs,
      totalMappings,
      successRate,
      averageResponseTime
    };
  };

  const stats = getStats();

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
      <h1 className="text-3xl font-bold mb-6">Integration Service</h1>

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

      {/* Integration Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Integrations</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalIntegrations}</p>
          <p className="text-sm text-gray-600">{stats.activeIntegrations} active</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Success Rate</h3>
          <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
          <p className="text-sm text-gray-600">{stats.errorLogs} errors</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Avg Response Time</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.averageResponseTime.toFixed(0)}ms</p>
          <p className="text-sm text-gray-600">across all integrations</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Data Mappings</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.totalMappings}</p>
          <p className="text-sm text-gray-600">field transformations</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'integrations'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Integrations ({integrations.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'logs'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('mappings')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'mappings'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Mappings ({mappings.length})
        </button>
      </div>

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Integrations</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Types</option>
                  <option value="API">API</option>
                  <option value="Database">Database</option>
                  <option value="File">File</option>
                  <option value="MessageQueue">Message Queue</option>
                  <option value="Webhook">Webhook</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Error">Error</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Integration'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Integration</h3>
              <form onSubmit={handleCreateIntegration} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Integration Name *</label>
                    <input
                      type="text"
                      value={newIntegration.name}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newIntegration.type}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, type: e.target.value as Integration['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="API">API</option>
                      <option value="Database">Database</option>
                      <option value="File">File</option>
                      <option value="MessageQueue">Message Queue</option>
                      <option value="Webhook">Webhook</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source System *</label>
                    <input
                      type="text"
                      value={newIntegration.sourceSystem}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, sourceSystem: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target System *</label>
                    <input
                      type="text"
                      value={newIntegration.targetSystem}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, targetSystem: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newIntegration.description}
                    onChange={(e) => setNewIntegration(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                    <input
                      type="url"
                      value={newIntegration.endpoint}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, endpoint: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="https://api.example.com/v1/data"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={newIntegration.timeout}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                      max="300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Credentials (key:value; ...)</label>
                  <textarea
                    value={newIntegration.credentials}
                    onChange={(e) => setNewIntegration(prev => ({ ...prev, credentials: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="username:admin; password:secret; apiKey:abc123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Headers (key:value; ...)</label>
                  <textarea
                    value={newIntegration.headers}
                    onChange={(e) => setNewIntegration(prev => ({ ...prev, headers: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Content-Type:application/json; Authorization:Bearer token"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Retries</label>
                    <input
                      type="number"
                      value={newIntegration.maxRetries}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 3 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Backoff Multiplier</label>
                    <input
                      type="number"
                      value={newIntegration.backoffMultiplier}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, backoffMultiplier: parseFloat(e.target.value) || 2 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.1"
                      min="1"
                      max="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Initial Delay (seconds)</label>
                    <input
                      type="number"
                      value={newIntegration.initialDelay}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, initialDelay: parseInt(e.target.value) || 1 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                      max="60"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Schedule Type</label>
                    <select
                      value={newIntegration.scheduleType}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, scheduleType: e.target.value as 'RealTime' | 'Batch' | 'Scheduled' }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="RealTime">Real Time</option>
                      <option value="Batch">Batch</option>
                      <option value="Scheduled">Scheduled</option>
                    </select>
                  </div>
                  {newIntegration.scheduleType === 'Scheduled' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cron Expression</label>
                      <input
                        type="text"
                        value={newIntegration.cronExpression}
                        onChange={(e) => setNewIntegration(prev => ({ ...prev, cronExpression: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0 0 * * *"
                      />
                    </div>
                  )}
                  {newIntegration.scheduleType === 'Batch' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Interval</label>
                        <input
                          type="number"
                          value={newIntegration.interval}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Unit</label>
                        <select
                          value={newIntegration.unit}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, unit: e.target.value as 'seconds' | 'minutes' | 'hours' | 'days' }))}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="seconds">Seconds</option>
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newIntegration.monitoringEnabled}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, monitoringEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Monitoring</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newIntegration.alertsEnabled}
                      onChange={(e) => setNewIntegration(prev => ({ ...prev, alertsEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Alerts</span>
                  </label>
                </div>
                {newIntegration.alertsEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Failure Threshold</label>
                      <input
                        type="number"
                        value={newIntegration.failureThreshold}
                        onChange={(e) => setNewIntegration(prev => ({ ...prev, failureThreshold: parseInt(e.target.value) || 5 }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        min="1"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Response Time Threshold (ms)</label>
                      <input
                        type="number"
                        value={newIntegration.responseTimeThreshold}
                        onChange={(e) => setNewIntegration(prev => ({ ...prev, responseTimeThreshold: parseInt(e.target.value) || 5000 }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        min="100"
                        max="60000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Recipients</label>
                      <input
                        type="text"
                        value={newIntegration.emailRecipients}
                        onChange={(e) => setNewIntegration(prev => ({ ...prev, emailRecipients: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="admin@example.com, dev@example.com"
                      />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Integration'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredIntegrations.map((integration) => (
              <div key={integration.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{integration.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(integration.type)}`}>
                        {integration.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(integration.status)}`}>
                        {integration.status}
                      </span>
                    </div>
                    <p className="text-gray-600">{integration.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Source: {integration.sourceSystem}</span>
                      <span>Target: {integration.targetSystem}</span>
                      <span>Requests: {integration.monitoring.metrics.totalRequests}</span>
                      <span>Success Rate: {integration.monitoring.metrics.totalRequests > 0 ? ((integration.monitoring.metrics.successfulRequests / integration.monitoring.metrics.totalRequests) * 100).toFixed(1) : 0}%</span>
                      <span>Avg Response: {integration.monitoring.metrics.averageResponseTime}ms</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Uptime: {integration.monitoring.metrics.uptime}%
                      </p>
                      {integration.monitoring.metrics.lastExecutionTime && (
                        <p className="text-sm text-gray-600">
                          Last Run: {new Date(integration.monitoring.metrics.lastExecutionTime).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {integration.status === 'Inactive' && (
                        <button
                          onClick={() => updateIntegrationStatus(integration.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      {integration.status === 'Active' && (
                        <button
                          onClick={() => updateIntegrationStatus(integration.id, 'Inactive')}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedIntegration(selectedIntegration?.id === integration.id ? null : integration)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedIntegration?.id === integration.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteIntegration(integration.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedIntegration?.id === integration.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Source System</p>
                        <p className="font-semibold">{integration.sourceSystem}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Target System</p>
                        <p className="font-semibold">{integration.targetSystem}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Integration Type</p>
                        <p className="font-semibold">{integration.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Schedule Type</p>
                        <p className="font-semibold">{integration.schedule?.type || 'Real Time'}</p>
                      </div>
                    </div>

                    {integration.configuration.endpoint && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">Endpoint</p>
                          <p className="font-semibold text-blue-600">{integration.configuration.endpoint}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Timeout</p>
                          <p className="font-semibold">{integration.configuration.timeout}s</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Max Retries</p>
                          <p className="font-semibold">{integration.configuration.retryPolicy?.maxRetries || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Backoff Multiplier</p>
                          <p className="font-semibold">{integration.configuration.retryPolicy?.backoffMultiplier || 1}</p>
                        </div>
                      </div>
                    )}

                    {integration.monitoring.enabled && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Monitoring Metrics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white p-4 rounded border">
                            <p className="text-sm text-gray-600">Total Requests</p>
                            <p className="text-2xl font-bold text-blue-600">{integration.monitoring.metrics.totalRequests}</p>
                          </div>
                          <div className="bg-white p-4 rounded border">
                            <p className="text-sm text-gray-600">Successful</p>
                            <p className="text-2xl font-bold text-green-600">{integration.monitoring.metrics.successfulRequests}</p>
                          </div>
                          <div className="bg-white p-4 rounded border">
                            <p className="text-sm text-gray-600">Failed</p>
                            <p className="text-2xl font-bold text-red-600">{integration.monitoring.metrics.failedRequests}</p>
                          </div>
                          <div className="bg-white p-4 rounded border">
                            <p className="text-sm text-gray-600">Avg Response Time</p>
                            <p className="text-2xl font-bold text-purple-600">{integration.monitoring.metrics.averageResponseTime}ms</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {integration.monitoring.alerts.enabled && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Alert Configuration</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded border">
                            <p className="text-sm text-gray-600">Failure Threshold</p>
                            <p className="text-lg font-semibold">{integration.monitoring.alerts.failureThreshold}</p>
                          </div>
                          <div className="bg-white p-4 rounded border">
                            <p className="text-sm text-gray-600">Response Time Threshold</p>
                            <p className="text-lg font-semibold">{integration.monitoring.alerts.responseTimeThreshold}ms</p>
                          </div>
                          <div className="bg-white p-4 rounded border">
                            <p className="text-sm text-gray-600">Email Recipients</p>
                            <p className="text-lg font-semibold">{integration.monitoring.alerts.emailRecipients.length}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {integration.schedule && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Schedule Configuration</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Type</p>
                            <p className="font-semibold">{integration.schedule.type}</p>
                          </div>
                          {integration.schedule.cronExpression && (
                            <div>
                              <p className="text-sm text-gray-600">Cron Expression</p>
                              <p className="font-semibold">{integration.schedule.cronExpression}</p>
                            </div>
                          )}
                          {integration.schedule.interval && (
                            <div>
                              <p className="text-sm text-gray-600">Interval</p>
                              <p className="font-semibold">{integration.schedule.interval} {integration.schedule.unit}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(integration.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(integration.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterType === 'All' && filterStatus === 'All'
                  ? 'No integrations found. Create your first integration to get started.'
                  : 'No integrations match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Integration Logs</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Levels</option>
                  <option value="INFO">Info</option>
                  <option value="WARN">Warning</option>
                  <option value="ERROR">Error</option>
                  <option value="DEBUG">Debug</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getLogStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {integrations.find(i => i.id === log.integrationId)?.name || `Integration ${log.integrationId}`}
                      </span>
                    </div>
                    <p className="text-gray-700">{log.message}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Timestamp: {new Date(log.timestamp).toLocaleString()}</span>
                      {log.duration && <span>Duration: {log.duration}ms</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedLog?.id === log.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {selectedLog?.id === log.id && log.details && (
                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-md font-medium mb-4">Log Details</h4>
                    <div className="bg-gray-100 p-4 rounded">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterLevel === 'All'
                  ? 'No integration logs found.'
                  : 'No logs match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mappings Tab */}
      {activeTab === 'mappings' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Data Mappings</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Integration</label>
                <select
                  value={selectedIntegration?.id || ''}
                  onChange={(e) => setSelectedIntegration(integrations.find(i => i.id === e.target.value) || null)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Integrations</option>
                  {integrations.map(integration => (
                    <option key={integration.id} value={integration.id}>{integration.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Mapping'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Data Mapping</h3>
              <form onSubmit={handleCreateMapping} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Integration *</label>
                    <select
                      value={newMapping.integrationId}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, integrationId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select integration...</option>
                      {integrations.map(integration => (
                        <option key={integration.id} value={integration.id}>{integration.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source Field *</label>
                    <input
                      type="text"
                      value={newMapping.sourceField}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, sourceField: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Field *</label>
                    <input
                      type="text"
                      value={newMapping.targetField}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, targetField: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Field Type</label>
                    <select
                      value={newMapping.fieldType}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, fieldType: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                      <option value="object">Object</option>
                      <option value="array">Array</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Transformation</label>
                    <input
                      type="text"
                      value={newMapping.transformation}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, transformation: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., toUpperCase(), parseInt(), formatDate()"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Default Value</label>
                    <input
                      type="text"
                      value={newMapping.defaultValue}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, defaultValue: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Validation Pattern</label>
                    <input
                      type="text"
                      value={newMapping.pattern}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, pattern: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., ^[A-Za-z]+$, \d{4}-\d{2}-\d{2}"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newMapping.required}
                        onChange={(e) => setNewMapping(prev => ({ ...prev, required: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Required Field</span>
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Data Mapping'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredMappings.map((mapping) => (
              <div key={mapping.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{mapping.sourceField} → {mapping.targetField}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(mapping.validation?.type || 'string')}`}>
                        {mapping.validation?.type || 'string'}
                      </span>
                      {mapping.validation?.required && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Integration: {integrations.find(i => i.id === mapping.integrationId)?.name || mapping.integrationId}</span>
                      {mapping.transformation && <span>Transform: {mapping.transformation}</span>}
                      {mapping.defaultValue && <span>Default: {mapping.defaultValue}</span>}
                      {mapping.validation?.pattern && <span>Pattern: {mapping.validation.pattern}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => deleteMapping(mapping.id)}
                      className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(mapping.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(mapping.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredMappings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {selectedIntegration
                  ? `No data mappings found for ${selectedIntegration.name}.`
                  : 'No data mappings found. Create your first mapping to get started.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntegrationServicePage;
