'use client';

import React, { useState, useEffect } from 'react';

interface APIEndpoint {
  id: number;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  status: 'Active' | 'Inactive' | 'Deprecated';
  version: string;
  description: string;
  responseTime: number;
  requestCount: number;
  errorRate: number;
  lastUpdated: string;
  category: 'Asset' | 'Financial' | 'Maintenance' | 'Integration';
}

interface APIKey {
  id: number;
  name: string;
  key: string;
  status: 'Active' | 'Inactive' | 'Expired';
  permissions: string[];
  usage: number;
  limit: number;
  expiresAt: string;
  lastUsed: string;
}

interface APIMetrics {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  activeEndpoints: number;
  activeKeys: number;
  errorCount: number;
}

const APIManagementServicePage = () => {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([
    {
      id: 1,
      name: 'Asset Management API',
      method: 'GET',
      path: '/api/v1/assets',
      status: 'Active',
      version: 'v1.2.0',
      description: 'Retrieve asset information with filtering capabilities',
      responseTime: 245,
      requestCount: 15420,
      errorRate: 0.02,
      lastUpdated: '2025-01-15 10:30:00',
      category: 'Asset'
    },
    {
      id: 2,
      name: 'Financial Data API',
      method: 'POST',
      path: '/api/v2/financial/reports',
      status: 'Active',
      version: 'v2.1.0',
      description: 'Generate financial reports and analytics',
      responseTime: 850,
      requestCount: 8960,
      errorRate: 0.05,
      lastUpdated: '2025-01-15 09:15:00',
      category: 'Financial'
    },
    {
      id: 3,
      name: 'Maintenance Scheduling',
      method: 'PUT',
      path: '/api/v1/maintenance/schedule',
      status: 'Deprecated',
      version: 'v1.0.0',
      description: 'Update maintenance schedules (deprecated - use v2)',
      responseTime: 320,
      requestCount: 1240,
      errorRate: 0.12,
      lastUpdated: '2024-12-20 14:22:00',
      category: 'Maintenance'
    }
  ]);

  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: 1,
      name: 'Mobile App Key',
      key: 'api_key_mob_***********abc123',
      status: 'Active',
      permissions: ['asset:read', 'maintenance:read', 'maintenance:write'],
      usage: 25420,
      limit: 50000,
      expiresAt: '2025-06-15',
      lastUsed: '2025-01-15 11:45:00'
    },
    {
      id: 2,
      name: 'Integration Service',
      key: 'api_key_int_***********def456',
      status: 'Active',
      permissions: ['*:*'],
      usage: 89760,
      limit: 100000,
      expiresAt: '2025-12-31',
      lastUsed: '2025-01-15 11:58:00'
    }
  ]);

  const [metrics] = useState<APIMetrics>({
    totalRequests: 125680,
    successRate: 97.8,
    avgResponseTime: 425,
    activeEndpoints: 48,
    activeKeys: 12,
    errorCount: 2764
  });

  const [filteredEndpoints, setFilteredEndpoints] = useState<APIEndpoint[]>(endpoints);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);

  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    method: 'GET' as APIEndpoint['method'],
    path: '',
    description: '',
    version: 'v1.0.0',
    category: 'Asset' as APIEndpoint['category']
  });

  const [newApiKey, setNewApiKey] = useState({
    name: '',
    permissions: [] as string[],
    limit: 10000,
    expiresAt: ''
  });

  useEffect(() => {
    const filtered = endpoints.filter(endpoint => {
      return (
        endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (methodFilter === '' || endpoint.method === methodFilter) &&
        (statusFilter === '' || endpoint.status === statusFilter) &&
        (categoryFilter === '' || endpoint.category === categoryFilter)
      );
    });
    setFilteredEndpoints(filtered);
  }, [endpoints, searchTerm, methodFilter, statusFilter, categoryFilter]);

  const handleEndpointInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewEndpoint(prev => ({ ...prev, [name]: value }));
  };

  const handleKeyInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'limit') {
      setNewApiKey(prev => ({ ...prev, [name]: parseInt(value) }));
    } else {
      setNewApiKey(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEndpoint.name && newEndpoint.path) {
      const endpoint: APIEndpoint = {
        id: Date.now(),
        ...newEndpoint,
        status: 'Active',
        responseTime: Math.floor(Math.random() * 500) + 100,
        requestCount: 0,
        errorRate: 0,
        lastUpdated: new Date().toLocaleString()
      };
      setEndpoints(prev => [...prev, endpoint]);
      setNewEndpoint({ name: '', method: 'GET', path: '', description: '', version: 'v1.0.0', category: 'Asset' });
      setShowCreateForm(false);
    }
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (newApiKey.name) {
      const apiKey: APIKey = {
        id: Date.now(),
        ...newApiKey,
        key: `api_key_${newApiKey.name.toLowerCase().replace(/\s+/g, '_')}_***********${Math.random().toString(36).substr(2, 6)}`,
        status: 'Active',
        usage: 0,
        lastUsed: 'Never'
      };
      setApiKeys(prev => [...prev, apiKey]);
      setNewApiKey({ name: '', permissions: [], limit: 10000, expiresAt: '' });
      setShowKeyForm(false);
    }
  };

  const toggleEndpointStatus = (id: number) => {
    setEndpoints(prev => prev.map(endpoint => 
      endpoint.id === id 
        ? { ...endpoint, status: endpoint.status === 'Active' ? 'Inactive' : 'Active' }
        : endpoint
    ));
  };

  const deleteEndpoint = (id: number) => {
    setEndpoints(prev => prev.filter(endpoint => endpoint.id !== id));
    if (selectedEndpoint?.id === id) {
      setSelectedEndpoint(null);
    }
  };

  const revokeApiKey = (id: number) => {
    setApiKeys(prev => prev.map(key => 
      key.id === id ? { ...key, status: 'Inactive' } : key
    ));
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Deprecated': return 'bg-red-100 text-red-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">API Management Service</h1>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">{metrics.successRate}%</p>
            </div>
            <div className="text-2xl">✅</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold">{metrics.avgResponseTime}ms</p>
            </div>
            <div className="text-2xl">⚡</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Endpoints</p>
              <p className="text-2xl font-bold">{metrics.activeEndpoints}</p>
            </div>
            <div className="text-2xl">🔗</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Keys</p>
              <p className="text-2xl font-bold">{metrics.activeKeys}</p>
            </div>
            <div className="text-2xl">🔑</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-red-600">{metrics.errorCount}</p>
            </div>
            <div className="text-2xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Search endpoints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Deprecated">Deprecated</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="Asset">Asset</option>
            <option value="Financial">Financial</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Integration">Integration</option>
          </select>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Endpoint
          </button>
          <button
            onClick={() => setShowKeyForm(!showKeyForm)}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Create API Key
          </button>
        </div>
      </div>

      {/* Create Endpoint Form */}
      {showCreateForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New API Endpoint</h2>
          <form onSubmit={handleCreateEndpoint}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint Name</label>
                <input
                  type="text"
                  name="name"
                  value={newEndpoint.name}
                  onChange={handleEndpointInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HTTP Method</label>
                <select
                  name="method"
                  value={newEndpoint.method}
                  onChange={handleEndpointInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
                <input
                  type="text"
                  name="path"
                  value={newEndpoint.path}
                  onChange={handleEndpointInputChange}
                  placeholder="/api/v1/resource"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                <input
                  type="text"
                  name="version"
                  value={newEndpoint.version}
                  onChange={handleEndpointInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={newEndpoint.category}
                  onChange={handleEndpointInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Asset">Asset</option>
                  <option value="Financial">Financial</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Integration">Integration</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={newEndpoint.description}
                  onChange={handleEndpointInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Endpoint
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

      {/* Create API Key Form */}
      {showKeyForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New API Key</h2>
          <form onSubmit={handleCreateApiKey}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                <input
                  type="text"
                  name="name"
                  value={newApiKey.name}
                  onChange={handleKeyInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Limit</label>
                <input
                  type="number"
                  name="limit"
                  value={newApiKey.limit}
                  onChange={handleKeyInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1000"
                  step="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                <input
                  type="date"
                  name="expiresAt"
                  value={newApiKey.expiresAt}
                  onChange={handleKeyInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Create API Key
              </button>
              <button
                type="button"
                onClick={() => setShowKeyForm(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* API Endpoints Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">API Endpoints ({filteredEndpoints.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEndpoints.map((endpoint) => (
                <tr key={endpoint.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{endpoint.name}</div>
                    <div className="text-xs text-gray-500">{endpoint.path}</div>
                    <div className="text-xs text-gray-400">{endpoint.version}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(endpoint.status)}`}>
                      {endpoint.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{endpoint.responseTime}ms avg</div>
                    <div className="text-xs text-gray-500">{(endpoint.errorRate * 100).toFixed(2)}% error rate</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{endpoint.requestCount.toLocaleString()} requests</div>
                    <div className="text-xs text-gray-500">Updated: {endpoint.lastUpdated.split(' ')[0]}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedEndpoint(selectedEndpoint?.id === endpoint.id ? null : endpoint)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedEndpoint?.id === endpoint.id ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => toggleEndpointStatus(endpoint.id)}
                      className={`text-white text-xs px-2 py-1 rounded ${
                        endpoint.status === 'Active' 
                          ? 'bg-yellow-500 hover:bg-yellow-700' 
                          : 'bg-green-500 hover:bg-green-700'
                      }`}
                    >
                      {endpoint.status === 'Active' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteEndpoint(endpoint.id)}
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

        {selectedEndpoint && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <h3 className="font-semibold mb-2">Endpoint Details: {selectedEndpoint.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><strong>Path:</strong> {selectedEndpoint.path}</div>
              <div><strong>Method:</strong> {selectedEndpoint.method}</div>
              <div><strong>Version:</strong> {selectedEndpoint.version}</div>
              <div><strong>Category:</strong> {selectedEndpoint.category}</div>
              <div><strong>Response Time:</strong> {selectedEndpoint.responseTime}ms</div>
              <div><strong>Request Count:</strong> {selectedEndpoint.requestCount.toLocaleString()}</div>
              <div><strong>Error Rate:</strong> {(selectedEndpoint.errorRate * 100).toFixed(2)}%</div>
              <div><strong>Last Updated:</strong> {selectedEndpoint.lastUpdated}</div>
            </div>
            <div className="mt-3">
              <strong>Description:</strong> {selectedEndpoint.description || 'No description provided'}
            </div>
          </div>
        )}
        
        {filteredEndpoints.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No endpoints found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* API Keys Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">API Keys ({apiKeys.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{key.name}</div>
                    <div className="text-xs text-gray-500">Last used: {key.lastUsed}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{key.key}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(key.status)}`}>
                      {key.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min((key.usage / key.limit) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs">{((key.usage / key.limit) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-gray-500">{key.usage.toLocaleString()} / {key.limit.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {key.expiresAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => revokeApiKey(key.id)}
                      disabled={key.status !== 'Active'}
                      className="bg-red-500 hover:bg-red-700 disabled:bg-gray-400 text-white text-xs px-2 py-1 rounded"
                    >
                      {key.status === 'Active' ? 'Revoke' : 'Revoked'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default APIManagementServicePage;
