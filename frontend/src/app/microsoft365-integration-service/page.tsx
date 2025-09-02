'use client';

import React, { useState } from 'react';

interface Integration {
  id: number;
  service: string;
  status: 'Connected' | 'Disconnected' | 'Error' | 'Configuring';
  lastSync: string;
  syncFrequency: '5min' | '15min' | '30min' | '1hour' | '6hour' | '24hour';
  recordsCount: number;
  enabled: boolean;
}

interface ConnectionConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  environment: 'Production' | 'Development' | 'Testing';
}

const Microsoft365IntegrationServicePage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 1,
      service: 'Microsoft Teams',
      status: 'Connected',
      lastSync: '2025-01-15 10:30:00',
      syncFrequency: '15min',
      recordsCount: 1250,
      enabled: true
    },
    {
      id: 2,
      service: 'Outlook Calendar',
      status: 'Connected',
      lastSync: '2025-01-15 10:25:00',
      syncFrequency: '5min',
      recordsCount: 890,
      enabled: true
    },
    {
      id: 3,
      service: 'SharePoint',
      status: 'Error',
      lastSync: '2025-01-14 15:20:00',
      syncFrequency: '1hour',
      recordsCount: 0,
      enabled: false
    },
    {
      id: 4,
      service: 'OneDrive',
      status: 'Disconnected',
      lastSync: 'Never',
      syncFrequency: '30min',
      recordsCount: 0,
      enabled: false
    }
  ]);

  const [config, setConfig] = useState<ConnectionConfig>({
    tenantId: 'your-tenant-id-here',
    clientId: 'your-client-id-here',
    clientSecret: '',
    redirectUri: 'https://your-app.com/auth/callback',
    scopes: ['User.Read', 'Calendars.Read', 'Mail.Read', 'Sites.Read.All'],
    environment: 'Production'
  });

  const [showConfig, setShowConfig] = useState(false);
  const [testConnection, setTestConnection] = useState<{testing: boolean, result: string | null}>({
    testing: false,
    result: null
  });
  const [selectedService, setSelectedService] = useState<Integration | null>(null);
  const [logs, setLogs] = useState<string[]>([
    '[2025-01-15 10:30:15] Teams sync completed successfully - 25 new records',
    '[2025-01-15 10:25:32] Calendar sync completed successfully - 12 updated events',
    '[2025-01-15 10:00:45] SharePoint connection failed - Authentication error',
    '[2025-01-15 09:30:22] OneDrive sync disabled by admin',
    '[2025-01-15 09:00:18] Configuration updated - Scopes modified'
  ]);

  const availableScopes = [
    'User.Read', 'User.Read.All', 'Calendars.Read', 'Calendars.ReadWrite',
    'Mail.Read', 'Mail.ReadWrite', 'Sites.Read.All', 'Sites.ReadWrite.All',
    'Files.Read', 'Files.ReadWrite', 'Chat.Read', 'Team.ReadBasic.All'
  ];

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleScopeToggle = (scope: string) => {
    setConfig(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }));
  };

  const handleTestConnection = async () => {
    setTestConnection({ testing: true, result: null });
    
    // Simulate API call
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate
      setTestConnection({
        testing: false,
        result: success 
          ? '✅ Connection successful! Authentication validated.'
          : '❌ Connection failed. Please check your credentials.'
      });
      
      if (success) {
        setLogs(prev => [`[${new Date().toLocaleString()}] Connection test successful`, ...prev.slice(0, 9)]);
      } else {
        setLogs(prev => [`[${new Date().toLocaleString()}] Connection test failed - Invalid credentials`, ...prev.slice(0, 9)]);
      }
    }, 2000);
  };

  const toggleIntegration = (id: number) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id 
        ? { 
            ...integration, 
            enabled: !integration.enabled,
            status: !integration.enabled ? 'Connected' : 'Disconnected'
          }
        : integration
    ));
    
    const integration = integrations.find(i => i.id === id);
    const action = integration?.enabled ? 'disabled' : 'enabled';
    setLogs(prev => [`[${new Date().toLocaleString()}] ${integration?.service} integration ${action}`, ...prev.slice(0, 9)]);
  };

  const updateSyncFrequency = (id: number, frequency: Integration['syncFrequency']) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id 
        ? { ...integration, syncFrequency: frequency }
        : integration
    ));
    
    const integration = integrations.find(i => i.id === id);
    setLogs(prev => [`[${new Date().toLocaleString()}] ${integration?.service} sync frequency updated to ${frequency}`, ...prev.slice(0, 9)]);
  };

  const forceSync = (id: number) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration?.enabled) return;

    setIntegrations(prev => prev.map(i => 
      i.id === id 
        ? { 
            ...i, 
            lastSync: new Date().toLocaleString(),
            recordsCount: i.recordsCount + Math.floor(Math.random() * 50)
          }
        : i
    ));
    
    setLogs(prev => [`[${new Date().toLocaleString()}] Manual sync initiated for ${integration?.service}`, ...prev.slice(0, 9)]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Connected': return 'bg-green-100 text-green-800';
      case 'Disconnected': return 'bg-gray-100 text-gray-800';
      case 'Error': return 'bg-red-100 text-red-800';
      case 'Configuring': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Microsoft 365 Integration Service</h1>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Services</h3>
          <p className="text-2xl font-bold text-blue-600">{integrations.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Connected</h3>
          <p className="text-2xl font-bold text-green-600">
            {integrations.filter(i => i.status === 'Connected').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Errors</h3>
          <p className="text-2xl font-bold text-red-600">
            {integrations.filter(i => i.status === 'Error').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Records</h3>
          <p className="text-2xl font-bold text-purple-600">
            {integrations.reduce((sum, i) => sum + i.recordsCount, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Main Controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showConfig ? 'Hide' : 'Show'} Configuration
        </button>
        <button
          onClick={handleTestConnection}
          disabled={testConnection.testing}
          className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
        >
          {testConnection.testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={() => integrations.forEach(i => i.enabled && forceSync(i.id))}
          className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
        >
          Sync All
        </button>
      </div>

      {/* Test Connection Result */}
      {testConnection.result && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <p className="font-medium">{testConnection.result}</p>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Microsoft 365 Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
              <input
                type="text"
                name="tenantId"
                value={config.tenantId}
                onChange={handleConfigChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input
                type="text"
                name="clientId"
                value={config.clientId}
                onChange={handleConfigChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
              <input
                type="password"
                name="clientSecret"
                value={config.clientSecret}
                onChange={handleConfigChange}
                placeholder="Enter client secret..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
              <select
                name="environment"
                value={config.environment}
                onChange={handleConfigChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Production">Production</option>
                <option value="Development">Development</option>
                <option value="Testing">Testing</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URI</label>
              <input
                type="url"
                name="redirectUri"
                value={config.redirectUri}
                onChange={handleConfigChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions (Scopes)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {availableScopes.map(scope => (
                <label key={scope} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.scopes.includes(scope)}
                    onChange={() => handleScopeToggle(scope)}
                    className="text-blue-600"
                  />
                  <span>{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={() => setLogs(prev => [`[${new Date().toLocaleString()}] Configuration saved successfully`, ...prev.slice(0, 9)])}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Save Configuration
            </button>
            <button
              onClick={() => setLogs(prev => [`[${new Date().toLocaleString()}] Configuration reset to defaults`, ...prev.slice(0, 9)])}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}

      {/* Integration Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Integration Services</h2>
          </div>
          <div className="p-6 space-y-4">
            {integrations.map((integration) => (
              <div key={integration.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{integration.service}</h3>
                    <p className="text-sm text-gray-600">
                      Records: {integration.recordsCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(integration.status)}`}>
                      {integration.status}
                    </span>
                    <input
                      type="checkbox"
                      checked={integration.enabled}
                      onChange={() => toggleIntegration(integration.id)}
                      className="text-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Sync:</span>
                    <span>{integration.lastSync}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Frequency:</span>
                    <select
                      value={integration.syncFrequency}
                      onChange={(e) => updateSyncFrequency(integration.id, e.target.value as Integration['syncFrequency'])}
                      disabled={!integration.enabled}
                      className="text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                    >
                      <option value="5min">5 minutes</option>
                      <option value="15min">15 minutes</option>
                      <option value="30min">30 minutes</option>
                      <option value="1hour">1 hour</option>
                      <option value="6hour">6 hours</option>
                      <option value="24hour">24 hours</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedService(selectedService?.id === integration.id ? null : integration)}
                    className="flex-1 bg-blue-500 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                  >
                    {selectedService?.id === integration.id ? 'Hide Details' : 'View Details'}
                  </button>
                  <button
                    onClick={() => forceSync(integration.id)}
                    disabled={!integration.enabled}
                    className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs px-3 py-1 rounded"
                  >
                    Sync Now
                  </button>
                </div>

                {selectedService?.id === integration.id && (
                  <div className="mt-4 pt-4 border-t text-sm space-y-1">
                    <div><strong>Service ID:</strong> {integration.id}</div>
                    <div><strong>Enabled:</strong> {integration.enabled ? 'Yes' : 'No'}</div>
                    <div><strong>Status Details:</strong> {
                      integration.status === 'Connected' ? 'All systems operational' :
                      integration.status === 'Error' ? 'Authentication or network issues detected' :
                      integration.status === 'Disconnected' ? 'Service manually disabled' :
                      'Configuration in progress'
                    }</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Activity Logs</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                  {log}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={() => setLogs([])}
                className="bg-red-500 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Microsoft365IntegrationServicePage;
