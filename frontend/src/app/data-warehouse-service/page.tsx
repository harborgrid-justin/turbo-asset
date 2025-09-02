import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface DataWarehouse {
  id: string;
  name: string;
  description?: string;
  type: 'DataLake' | 'DataWarehouse' | 'DataMart' | 'AnalyticsDB';
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Failed';
  storageSize: number; // GB
  recordCount: number;
  lastUpdated: string;
  schema: {
    tables: {
      id: string;
      name: string;
      columns: {
        name: string;
        type: string;
        nullable: boolean;
        primaryKey?: boolean;
      }[];
      recordCount: number;
      size: number; // MB
    }[];
  };
  connections: {
    id: string;
    name: string;
    type: 'ETL' | 'ELT' | 'Streaming' | 'Batch';
    source: string;
    status: 'Active' | 'Inactive' | 'Error';
    lastSync?: string;
  }[];
  performance: {
    queryCount: number;
    avgQueryTime: number; // ms
    throughput: number; // queries per second
    errorRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface DataQuery {
  id: string;
  warehouseId: string;
  query: string;
  status: 'Running' | 'Completed' | 'Failed' | 'Cancelled';
  executionTime?: number; // ms
  resultCount?: number;
  errorMessage?: string;
  executedBy: string;
  executedAt: string;
  completedAt?: string;
}

const DataWarehouseServicePage = () => {
  const [warehouses, setWarehouses] = useState<DataWarehouse[]>([]);
  const [queries, setQueries] = useState<DataQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<DataWarehouse | null>(null);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [executingQuery, setExecutingQuery] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [creating, setCreating] = useState(false);

  // Form state
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    description: '',
    type: 'DataWarehouse' as DataWarehouse['type'],
    status: 'Active' as DataWarehouse['status'],
    storageSize: 100,
    recordCount: 0
  });

  // Load data on component mount
  useEffect(() => {
    loadWarehouses();
    loadQueries();
  }, []);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<DataWarehouse>('data-warehouses');
      setWarehouses(data);
    } catch (err) {
      setError('Failed to load data warehouses. Please try again.');
      console.error('Error loading warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQueries = async () => {
    try {
      const data = await apiService.generic.getAll<DataQuery>('data-queries');
      setQueries(data);
    } catch (err) {
      console.error('Error loading queries:', err);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouse.name) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const warehouseData = {
        ...newWarehouse,
        schema: { tables: [] },
        connections: [],
        performance: {
          queryCount: 0,
          avgQueryTime: 0,
          throughput: 0,
          errorRate: 0
        },
        lastUpdated: new Date().toISOString()
      };

      const createdWarehouse = await apiService.generic.create<DataWarehouse>('data-warehouses', warehouseData);

      setWarehouses(prev => [createdWarehouse, ...prev]);
      setNewWarehouse({
        name: '',
        description: '',
        type: 'DataWarehouse',
        status: 'Active',
        storageSize: 100,
        recordCount: 0
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create data warehouse. Please try again.');
      console.error('Error creating warehouse:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateWarehouseStatus = async (warehouseId: string, status: DataWarehouse['status']) => {
    try {
      setError(null);
      await apiService.generic.update<DataWarehouse>('data-warehouses', parseInt(warehouseId), { status });
      setWarehouses(prev => prev.map(warehouse =>
        warehouse.id === warehouseId ? { ...warehouse, status } : warehouse
      ));
    } catch (err) {
      setError('Failed to update warehouse status. Please try again.');
      console.error('Error updating warehouse:', err);
    }
  };

  const deleteWarehouse = async (warehouseId: string) => {
    if (!confirm('Are you sure you want to delete this data warehouse? This will also delete all associated data and cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('data-warehouses', parseInt(warehouseId));
      setWarehouses(prev => prev.filter(warehouse => warehouse.id !== warehouseId));
      setQueries(prev => prev.filter(query => query.warehouseId !== warehouseId));
    } catch (err) {
      setError('Failed to delete data warehouse. Please try again.');
      console.error('Error deleting warehouse:', err);
    }
  };

  const executeQuery = async (warehouseId: string) => {
    if (!queryText.trim()) {
      setError('Please enter a query to execute.');
      return;
    }

    try {
      setExecutingQuery(true);
      setError(null);

      const queryData = {
        warehouseId,
        query: queryText,
        status: 'Running' as DataQuery['status'],
        executedBy: 'Current User', // In a real app, this would come from auth context
        executedAt: new Date().toISOString()
      };

      const createdQuery = await apiService.generic.create<DataQuery>('data-queries', queryData);

      // Simulate query execution (in real app, this would be handled by backend)
      setTimeout(async () => {
        try {
          const completedQuery = {
            ...createdQuery,
            status: 'Completed' as DataQuery['status'],
            executionTime: Math.random() * 5000 + 1000, // Random execution time
            resultCount: Math.floor(Math.random() * 10000),
            completedAt: new Date().toISOString()
          };

          await apiService.generic.update<DataQuery>('data-queries', parseInt(createdQuery.id), completedQuery);
          setQueries(prev => prev.map(q => q.id === createdQuery.id ? completedQuery : q));
        } catch (err) {
          console.error('Error updating query status:', err);
        }
      }, 2000);

      setQueries(prev => [createdQuery, ...prev]);
      setQueryText('');
    } catch (err) {
      setError('Failed to execute query. Please try again.');
      console.error('Error executing query:', err);
    } finally {
      setExecutingQuery(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DataLake': return 'bg-blue-100 text-blue-800';
      case 'DataWarehouse': return 'bg-green-100 text-green-800';
      case 'DataMart': return 'bg-purple-100 text-purple-800';
      case 'AnalyticsDB': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQueryStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredWarehouses = warehouses.filter(warehouse => {
    const typeMatch = filterType === 'All' || warehouse.type === filterType;
    const statusMatch = filterStatus === 'All' || warehouse.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const getWarehouseStats = () => {
    const total = warehouses.length;
    const active = warehouses.filter(w => w.status === 'Active').length;
    const totalStorage = warehouses.reduce((sum, w) => sum + w.storageSize, 0);
    const totalRecords = warehouses.reduce((sum, w) => sum + w.recordCount, 0);
    const totalQueries = queries.length;
    const avgQueryTime = queries.length > 0
      ? queries.filter(q => q.executionTime).reduce((sum, q) => sum + (q.executionTime || 0), 0) / queries.filter(q => q.executionTime).length
      : 0;

    return { total, active, totalStorage, totalRecords, totalQueries, avgQueryTime };
  };

  const stats = getWarehouseStats();

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
      <h1 className="text-3xl font-bold mb-6">Data Warehouse Service</h1>

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

      {/* Data Warehouse Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Warehouses</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active</h3>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Storage</h3>
          <p className="text-2xl font-bold text-purple-600">{formatBytes(stats.totalStorage * 1024 * 1024 * 1024)}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Records</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.totalRecords.toLocaleString()}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Queries</h3>
          <p className="text-2xl font-bold text-red-600">{stats.totalQueries}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Avg Query Time</h3>
          <p className="text-2xl font-bold text-indigo-600">{stats.avgQueryTime.toFixed(0)}ms</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Data Warehouses</h2>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Types</option>
              <option value="DataLake">Data Lake</option>
              <option value="DataWarehouse">Data Warehouse</option>
              <option value="DataMart">Data Mart</option>
              <option value="AnalyticsDB">Analytics DB</option>
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
              <option value="Maintenance">Maintenance</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={creating}
            >
              {showCreateForm ? 'Cancel' : 'Create Warehouse'}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Data Warehouse</h3>
          <form onSubmit={handleCreateWarehouse} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Warehouse Name *</label>
                <input
                  type="text"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={newWarehouse.type}
                  onChange={(e) => setNewWarehouse(prev => ({ ...prev, type: e.target.value as DataWarehouse['type'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="DataLake">Data Lake</option>
                  <option value="DataWarehouse">Data Warehouse</option>
                  <option value="DataMart">Data Mart</option>
                  <option value="AnalyticsDB">Analytics DB</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newWarehouse.status}
                  onChange={(e) => setNewWarehouse(prev => ({ ...prev, status: e.target.value as DataWarehouse['status'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Storage Size (GB)</label>
                <input
                  type="number"
                  value={newWarehouse.storageSize}
                  onChange={(e) => setNewWarehouse(prev => ({ ...prev, storageSize: parseInt(e.target.value) || 100 }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Initial Record Count</label>
                <input
                  type="number"
                  value={newWarehouse.recordCount}
                  onChange={(e) => setNewWarehouse(prev => ({ ...prev, recordCount: parseInt(e.target.value) || 0 }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newWarehouse.description}
                onChange={(e) => setNewWarehouse(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Data Warehouse'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {filteredWarehouses.map((warehouse) => (
          <div key={warehouse.id} className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold">{warehouse.name}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(warehouse.type)}`}>
                    {warehouse.type}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(warehouse.status)}`}>
                    {warehouse.status}
                  </span>
                </div>
                <p className="text-gray-600">{warehouse.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-lg font-bold">{formatBytes(warehouse.storageSize * 1024 * 1024 * 1024)}</p>
                  <p className="text-sm text-gray-600">
                    {warehouse.recordCount.toLocaleString()} records
                  </p>
                  <p className="text-sm text-gray-600">
                    Updated: {new Date(warehouse.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-1">
                  {warehouse.status !== 'Active' && warehouse.status !== 'Failed' && (
                    <button
                      onClick={() => updateWarehouseStatus(warehouse.id, 'Active')}
                      className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedWarehouse(selectedWarehouse?.id === warehouse.id ? null : warehouse)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    {selectedWarehouse?.id === warehouse.id ? 'Hide' : 'Details'}
                  </button>
                  <button
                    onClick={() => deleteWarehouse(warehouse.id)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {selectedWarehouse?.id === warehouse.id && (
              <div className="mt-6 border-t pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Tables</p>
                    <p className="font-semibold">{warehouse.schema.tables.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Connections</p>
                    <p className="font-semibold">{warehouse.connections.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Query Count</p>
                    <p className="font-semibold">{warehouse.performance.queryCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Query Time</p>
                    <p className="font-semibold">{warehouse.performance.avgQueryTime.toFixed(0)}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Throughput</p>
                    <p className="font-semibold">{warehouse.performance.throughput.toFixed(1)} qps</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Error Rate</p>
                    <p className="font-semibold">{(warehouse.performance.errorRate * 100).toFixed(1)}%</p>
                  </div>
                </div>

                {/* Query Interface */}
                <div className="mb-6">
                  <h4 className="text-md font-medium mb-4">Execute Query</h4>
                  <div className="space-y-4">
                    <textarea
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="Enter your SQL query here..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    />
                    <button
                      onClick={() => executeQuery(warehouse.id)}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                      disabled={executingQuery || !queryText.trim()}
                    >
                      {executingQuery ? 'Executing...' : 'Execute Query'}
                    </button>
                  </div>
                </div>

                {/* Schema Information */}
                {warehouse.schema.tables.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium mb-4">Schema ({warehouse.schema.tables.length} tables)</h4>
                    <div className="space-y-3">
                      {warehouse.schema.tables.map((table) => (
                        <div key={table.id} className="bg-gray-50 p-4 rounded border">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium">{table.name}</h5>
                            <div className="text-sm text-gray-600">
                              {table.recordCount.toLocaleString()} records • {formatBytes(table.size * 1024 * 1024)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {table.columns.slice(0, 5).map((column, index) => (
                              <div key={index} className="text-sm text-gray-700 flex items-center space-x-2">
                                <span className="font-mono">{column.name}</span>
                                <span className="text-gray-500">({column.type})</span>
                                {column.primaryKey && <span className="bg-blue-100 text-blue-800 text-xs px-1 rounded">PK</span>}
                                {!column.nullable && <span className="bg-red-100 text-red-800 text-xs px-1 rounded">NOT NULL</span>}
                              </div>
                            ))}
                            {table.columns.length > 5 && (
                              <p className="text-sm text-gray-500">
                                ... and {table.columns.length - 5} more columns
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connections */}
                {warehouse.connections.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium mb-4">Connections ({warehouse.connections.length})</h4>
                    <div className="space-y-2">
                      {warehouse.connections.map((connection) => (
                        <div key={connection.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                          <div className="flex-1">
                            <p className="font-medium">{connection.name}</p>
                            <p className="text-sm text-gray-600">
                              {connection.type} • {connection.source}
                              {connection.lastSync && ` • Last sync: ${new Date(connection.lastSync).toLocaleString()}`}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            connection.status === 'Active' ? 'bg-green-100 text-green-800' :
                            connection.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {connection.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Queries */}
                <div>
                  <h4 className="text-md font-medium mb-4">Recent Queries</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {queries.filter(q => q.warehouseId === warehouse.id).slice(0, 5).map((query) => (
                      <div key={query.id} className="bg-gray-50 p-3 rounded border">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getQueryStatusColor(query.status)}`}>
                            {query.status}
                          </span>
                          <div className="text-right text-sm text-gray-600">
                            <p>{query.executedBy}</p>
                            <p>{new Date(query.executedAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-sm font-mono bg-white p-2 rounded border mb-2">{query.query}</p>
                        {query.executionTime && (
                          <div className="text-sm text-gray-600">
                            Execution time: {query.executionTime.toFixed(0)}ms
                            {query.resultCount && ` • Results: ${query.resultCount.toLocaleString()}`}
                          </div>
                        )}
                        {query.errorMessage && (
                          <p className="text-sm text-red-600">Error: {query.errorMessage}</p>
                        )}
                      </div>
                    ))}
                    {queries.filter(q => q.warehouseId === warehouse.id).length === 0 && (
                      <p className="text-sm text-gray-500">No queries executed yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4">
              <p>Created: {new Date(warehouse.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(warehouse.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredWarehouses.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {filterType === 'All' && filterStatus === 'All'
              ? 'No data warehouses found. Create your first data warehouse to get started.'
              : 'No data warehouses match the selected filters.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default DataWarehouseServicePage;
