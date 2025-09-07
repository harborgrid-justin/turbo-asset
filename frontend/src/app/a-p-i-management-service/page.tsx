'use client';

import React, { useState } from 'react';

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
  // State for filters and forms
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Mock data for endpoints
  const endpoints: APIEndpoint[] = [
    {
      id: 1,
      name: 'Asset Management API',
      method: 'GET',
      path: '/api/v1/assets',
      status: 'Active',
      version: 'v1.2.0',
      description: 'Retrieve asset information with filtering capabilities',
      responseTime: 125,
      requestCount: 45680,
      errorRate: 0.02,
      lastUpdated: '2024-12-20 15:30:00',
      category: 'Asset'
    },
    {
      id: 2,
      name: 'Financial Reporting',
      method: 'POST',
      path: '/api/v1/financial/reports',
      status: 'Active',
      version: 'v2.1.0',
      description: 'Generate financial reports for portfolio analysis',
      responseTime: 850,
      requestCount: 12340,
      errorRate: 0.01,
      lastUpdated: '2024-12-20 10:15:00',
      category: 'Financial'
    }
  ];

  // Mock data for API keys
  const apiKeys: APIKey[] = [
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
  ];

  const metrics: APIMetrics = {
    totalRequests: 125680,
    successRate: 97.8,
    avgResponseTime: 425,
    activeEndpoints: 48,
    activeKeys: 12,
    errorCount: 2764
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API Management Service</h1>
          <p className="text-gray-600 mt-2">Manage API endpoints, keys, and monitor usage across your platform</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
            <p className="text-2xl font-bold text-blue-600">{metrics.totalRequests.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
            <p className="text-2xl font-bold text-green-600">{metrics.successRate}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Avg Response</h3>
            <p className="text-2xl font-bold text-yellow-600">{metrics.avgResponseTime}ms</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Active Endpoints</h3>
            <p className="text-2xl font-bold text-purple-600">{metrics.activeEndpoints}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Active Keys</h3>
            <p className="text-2xl font-bold text-indigo-600">{metrics.activeKeys}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Errors</h3>
            <p className="text-2xl font-bold text-red-600">{metrics.errorCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search endpoints..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Deprecated">Deprecated</option>
              </select>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Endpoints</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {endpoints.map((endpoint) => (
                  <tr key={endpoint.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{endpoint.name}</div>
                        <div className="text-sm text-gray-500">{endpoint.path}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                        endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                        endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        endpoint.status === 'Active' ? 'bg-green-100 text-green-800' :
                        endpoint.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {endpoint.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {endpoint.requestCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {endpoint.responseTime}ms
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(endpoint.errorRate * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
            {apiKeys.map((key) => (
              <div key={key.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{key.name}</h3>
                    <p className="text-sm text-gray-600 font-mono">{key.key}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    key.status === 'Active' ? 'bg-green-100 text-green-800' :
                    key.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {key.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Usage:</span>
                    <span>{key.usage.toLocaleString()} / {key.limit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires:</span>
                    <span>{key.expiresAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Used:</span>
                    <span>{key.lastUsed}</span>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(key.usage / key.limit) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIManagementServicePage;