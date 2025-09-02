'use client';

import React, { useState } from 'react';

interface SalesforceObject {
  id: string;
  name: string;
  apiName: string;
  type: 'Standard' | 'Custom';
  syncEnabled: boolean;
  syncDirection: 'Bidirectional' | 'From Salesforce' | 'To Salesforce';
  lastSync: string;
  recordCount: number;
  mappingStatus: 'Complete' | 'Partial' | 'Not Configured';
}

interface FieldMapping {
  id: string;
  salesforceField: string;
  localField: string;
  transformation: 'Direct' | 'Calculated' | 'Lookup';
  required: boolean;
  dataType: string;
}

interface ConnectionSettings {
  instanceUrl: string;
  username: string;
  password: string;
  securityToken: string;
  clientId: string;
  clientSecret: string;
  environment: 'Production' | 'Sandbox';
  apiVersion: string;
  timeout: number;
}

const SalesforceIntegrationServicePage = () => {
  const [objects, setObjects] = useState<SalesforceObject[]>([
    {
      id: 'account',
      name: 'Account',
      apiName: 'Account',
      type: 'Standard',
      syncEnabled: true,
      syncDirection: 'Bidirectional',
      lastSync: '2025-01-15 10:30:00',
      recordCount: 2450,
      mappingStatus: 'Complete'
    },
    {
      id: 'contact',
      name: 'Contact',
      apiName: 'Contact',
      type: 'Standard',
      syncEnabled: true,
      syncDirection: 'From Salesforce',
      lastSync: '2025-01-15 10:25:00',
      recordCount: 8970,
      mappingStatus: 'Complete'
    },
    {
      id: 'opportunity',
      name: 'Opportunity',
      apiName: 'Opportunity',
      type: 'Standard',
      syncEnabled: false,
      syncDirection: 'To Salesforce',
      lastSync: 'Never',
      recordCount: 0,
      mappingStatus: 'Not Configured'
    },
    {
      id: 'custom_asset',
      name: 'Custom Asset',
      apiName: 'Custom_Asset__c',
      type: 'Custom',
      syncEnabled: true,
      syncDirection: 'Bidirectional',
      lastSync: '2025-01-15 09:45:00',
      recordCount: 1250,
      mappingStatus: 'Partial'
    }
  ]);

  const [connectionSettings, setConnectionSettings] = useState<ConnectionSettings>({
    instanceUrl: 'https://your-domain.my.salesforce.com',
    username: 'integration@company.com',
    password: '',
    securityToken: '',
    clientId: 'your_connected_app_id',
    clientSecret: '',
    environment: 'Production',
    apiVersion: '58.0',
    timeout: 30000
  });

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([
    {
      id: '1',
      salesforceField: 'Name',
      localField: 'company_name',
      transformation: 'Direct',
      required: true,
      dataType: 'Text'
    },
    {
      id: '2',
      salesforceField: 'Email',
      localField: 'email_address',
      transformation: 'Direct',
      required: false,
      dataType: 'Email'
    },
    {
      id: '3',
      salesforceField: 'AnnualRevenue',
      localField: 'revenue',
      transformation: 'Calculated',
      required: false,
      dataType: 'Currency'
    }
  ]);

  const [selectedObject, setSelectedObject] = useState<SalesforceObject | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMappings, setShowMappings] = useState(false);
  const [testConnection, setTestConnection] = useState<{testing: boolean, result: string | null}>({
    testing: false,
    result: null
  });
  const [syncLogs, setSyncLogs] = useState<string[]>([
    '[2025-01-15 10:30:15] Account sync completed - 25 records updated',
    '[2025-01-15 10:25:32] Contact sync completed - 142 records synced',
    '[2025-01-15 10:00:45] Custom Asset sync started',
    '[2025-01-15 09:45:22] Custom Asset sync completed - 8 records updated',
    '[2025-01-15 09:30:18] Connection test successful',
    '[2025-01-15 09:00:12] Settings updated - API version changed to 58.0'
  ]);

  const [newMapping, setNewMapping] = useState({
    salesforceField: '',
    localField: '',
    transformation: 'Direct' as FieldMapping['transformation'],
    required: false,
    dataType: 'Text'
  });

  const handleConnectionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConnectionSettings(prev => ({
      ...prev,
      [name]: name === 'timeout' ? Number(value) : value
    }));
  };

  const handleTestConnection = async () => {
    setTestConnection({ testing: true, result: null });
    
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate
      const result = success 
        ? '✅ Connection successful! Connected to Salesforce org.'
        : '❌ Connection failed. Please check your credentials and network connectivity.';
      
      setTestConnection({ testing: false, result });
      
      const logEntry = success 
        ? '[' + new Date().toLocaleString() + '] Connection test successful'
        : '[' + new Date().toLocaleString() + '] Connection test failed - Invalid credentials';
      
      setSyncLogs(prev => [logEntry, ...prev.slice(0, 9)]);
    }, 2500);
  };

  const toggleObjectSync = (objectId: string) => {
    setObjects(prev => prev.map(obj => 
      obj.id === objectId 
        ? { ...obj, syncEnabled: !obj.syncEnabled }
        : obj
    ));
    
    const object = objects.find(o => o.id === objectId);
    const action = object?.syncEnabled ? 'disabled' : 'enabled';
    setSyncLogs(prev => [`[${new Date().toLocaleString()}] ${object?.name} sync ${action}`, ...prev.slice(0, 9)]);
  };

  const updateSyncDirection = (objectId: string, direction: SalesforceObject['syncDirection']) => {
    setObjects(prev => prev.map(obj => 
      obj.id === objectId 
        ? { ...obj, syncDirection: direction }
        : obj
    ));
    
    const object = objects.find(o => o.id === objectId);
    setSyncLogs(prev => [`[${new Date().toLocaleString()}] ${object?.name} sync direction updated to ${direction}`, ...prev.slice(0, 9)]);
  };

  const forceSync = (objectId: string) => {
    const object = objects.find(o => o.id === objectId);
    if (!object?.syncEnabled) return;

    setObjects(prev => prev.map(obj => 
      obj.id === objectId 
        ? { 
            ...obj, 
            lastSync: new Date().toLocaleString(),
            recordCount: obj.recordCount + Math.floor(Math.random() * 50)
          }
        : obj
    ));
    
    setSyncLogs(prev => [`[${new Date().toLocaleString()}] Manual sync initiated for ${object?.name}`, ...prev.slice(0, 9)]);
  };

  const addFieldMapping = () => {
    if (newMapping.salesforceField && newMapping.localField) {
      const mapping: FieldMapping = {
        id: Date.now().toString(),
        ...newMapping
      };
      setFieldMappings(prev => [...prev, mapping]);
      setNewMapping({
        salesforceField: '',
        localField: '',
        transformation: 'Direct',
        required: false,
        dataType: 'Text'
      });
    }
  };

  const deleteFieldMapping = (mappingId: string) => {
    setFieldMappings(prev => prev.filter(m => m.id !== mappingId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-800';
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      case 'Not Configured': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Standard': return 'bg-blue-100 text-blue-800';
      case 'Custom': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Salesforce Integration Service</h1>

      {/* Connection Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Objects</h3>
          <p className="text-2xl font-bold text-blue-600">{objects.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Syncing</h3>
          <p className="text-2xl font-bold text-green-600">
            {objects.filter(o => o.syncEnabled).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Configured</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {objects.filter(o => o.mappingStatus === 'Complete').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Records</h3>
          <p className="text-2xl font-bold text-purple-600">
            {objects.reduce((sum, o) => sum + o.recordCount, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Main Controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showSettings ? 'Hide' : 'Show'} Connection Settings
        </button>
        <button
          onClick={() => setShowMappings(!showMappings)}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          {showMappings ? 'Hide' : 'Show'} Field Mappings
        </button>
        <button
          onClick={handleTestConnection}
          disabled={testConnection.testing}
          className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
        >
          {testConnection.testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={() => objects.forEach(o => o.syncEnabled && forceSync(o.id))}
          className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
        >
          Sync All Objects
        </button>
      </div>

      {/* Test Connection Result */}
      {testConnection.result && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <p className="font-medium">{testConnection.result}</p>
        </div>
      )}

      {/* Connection Settings Panel */}
      {showSettings && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Salesforce Connection Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instance URL</label>
              <input
                type="url"
                name="instanceUrl"
                value={connectionSettings.instanceUrl}
                onChange={handleConnectionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                name="username"
                value={connectionSettings.username}
                onChange={handleConnectionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={connectionSettings.password}
                onChange={handleConnectionChange}
                placeholder="Enter password..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Security Token</label>
              <input
                type="password"
                name="securityToken"
                value={connectionSettings.securityToken}
                onChange={handleConnectionChange}
                placeholder="Enter security token..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input
                type="text"
                name="clientId"
                value={connectionSettings.clientId}
                onChange={handleConnectionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
              <input
                type="password"
                name="clientSecret"
                value={connectionSettings.clientSecret}
                onChange={handleConnectionChange}
                placeholder="Enter client secret..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
              <select
                name="environment"
                value={connectionSettings.environment}
                onChange={handleConnectionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Production">Production</option>
                <option value="Sandbox">Sandbox</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Version</label>
              <input
                type="text"
                name="apiVersion"
                value={connectionSettings.apiVersion}
                onChange={handleConnectionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
              <input
                type="number"
                name="timeout"
                value={connectionSettings.timeout}
                onChange={handleConnectionChange}
                min="1000"
                max="60000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-6 flex space-x-3">
            <button
              onClick={() => setSyncLogs(prev => [`[${new Date().toLocaleString()}] Connection settings saved`, ...prev.slice(0, 9)])}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Save Settings
            </button>
            <button
              onClick={() => setSyncLogs(prev => [`[${new Date().toLocaleString()}] Settings reset to defaults`, ...prev.slice(0, 9)])}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}

      {/* Field Mappings Panel */}
      {showMappings && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Field Mappings</h2>
          
          {/* Add New Mapping */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Add New Field Mapping</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                type="text"
                placeholder="Salesforce Field"
                value={newMapping.salesforceField}
                onChange={(e) => setNewMapping(prev => ({ ...prev, salesforceField: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Local Field"
                value={newMapping.localField}
                onChange={(e) => setNewMapping(prev => ({ ...prev, localField: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newMapping.transformation}
                onChange={(e) => setNewMapping(prev => ({ ...prev, transformation: e.target.value as FieldMapping['transformation'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Direct">Direct</option>
                <option value="Calculated">Calculated</option>
                <option value="Lookup">Lookup</option>
              </select>
              <select
                value={newMapping.dataType}
                onChange={(e) => setNewMapping(prev => ({ ...prev, dataType: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Text">Text</option>
                <option value="Number">Number</option>
                <option value="Email">Email</option>
                <option value="Currency">Currency</option>
                <option value="Date">Date</option>
                <option value="Boolean">Boolean</option>
              </select>
              <button
                onClick={addFieldMapping}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Add Mapping
              </button>
            </div>
            <div className="mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newMapping.required}
                  onChange={(e) => setNewMapping(prev => ({ ...prev, required: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">Required Field</span>
              </label>
            </div>
          </div>

          {/* Existing Mappings */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Salesforce Field</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Local Field</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transformation</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fieldMappings.map((mapping) => (
                  <tr key={mapping.id}>
                    <td className="px-4 py-2 text-sm">{mapping.salesforceField}</td>
                    <td className="px-4 py-2 text-sm">{mapping.localField}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 text-xs rounded ${
                        mapping.transformation === 'Direct' ? 'bg-green-100 text-green-800' :
                        mapping.transformation === 'Calculated' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {mapping.transformation}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{mapping.dataType}</td>
                    <td className="px-4 py-2 text-sm">
                      {mapping.required ? '✅' : '❌'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => deleteFieldMapping(mapping.id)}
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
        </div>
      )}

      {/* Objects and Sync Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salesforce Objects */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Salesforce Objects</h2>
          </div>
          <div className="p-6 space-y-4">
            {objects.map((object) => (
              <div key={object.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{object.name}</h3>
                    <p className="text-sm text-gray-600">API Name: {object.apiName}</p>
                    <p className="text-sm text-gray-600">
                      Records: {object.recordCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(object.type)}`}>
                      {object.type}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(object.mappingStatus)}`}>
                      {object.mappingStatus}
                    </span>
                    <input
                      type="checkbox"
                      checked={object.syncEnabled}
                      onChange={() => toggleObjectSync(object.id)}
                      className="text-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Sync:</span>
                    <span>{object.lastSync}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Sync Direction:</span>
                    <select
                      value={object.syncDirection}
                      onChange={(e) => updateSyncDirection(object.id, e.target.value as SalesforceObject['syncDirection'])}
                      disabled={!object.syncEnabled}
                      className="text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                    >
                      <option value="Bidirectional">Bidirectional</option>
                      <option value="From Salesforce">From Salesforce</option>
                      <option value="To Salesforce">To Salesforce</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedObject(selectedObject?.id === object.id ? null : object)}
                    className="flex-1 bg-blue-500 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                  >
                    {selectedObject?.id === object.id ? 'Hide Details' : 'View Details'}
                  </button>
                  <button
                    onClick={() => forceSync(object.id)}
                    disabled={!object.syncEnabled}
                    className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs px-3 py-1 rounded"
                  >
                    Sync Now
                  </button>
                </div>

                {selectedObject?.id === object.id && (
                  <div className="mt-4 pt-4 border-t text-sm space-y-1">
                    <div><strong>Object ID:</strong> {object.id}</div>
                    <div><strong>Sync Enabled:</strong> {object.syncEnabled ? 'Yes' : 'No'}</div>
                    <div><strong>Mapping Status:</strong> {object.mappingStatus}</div>
                    <div><strong>Record Count:</strong> {object.recordCount.toLocaleString()}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sync Logs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Sync Activity Logs</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {syncLogs.map((log, index) => (
                <div key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                  {log}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={() => setSyncLogs([])}
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

export default SalesforceIntegrationServicePage;
