import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface APIKey {
  id: string;
  name: string;
  key: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  expiresAt: string;
  rateLimit: number;
  usage: number;
}

const APIManagementServicePage = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newKey, setNewKey] = useState({
    name: '',
    rateLimit: 1000,
    expiresAt: ''
  });

  // Load API keys on component mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      // Using generic API service for API management
      const data = await apiService.generic.getAll<APIKey>('api-management/keys');
      setApiKeys(data);
    } catch (err) {
      setError('Failed to load API keys. Please try again.');
      console.error('Error loading API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewKey(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.name) {
      setError('Please provide a name for the API key.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const keyData = {
        name: newKey.name,
        rateLimit: newKey.rateLimit,
        expiresAt: newKey.expiresAt || null
      };

      const createdKey = await apiService.generic.create<APIKey>('api-management/keys', keyData);
      setApiKeys(prev => [...prev, createdKey]);
      setNewKey({ name: '', rateLimit: 1000, expiresAt: '' });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create API key. Please try again.');
      console.error('Error creating API key:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleKeyStatus = async (keyId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await apiService.generic.update('api-management/keys', parseInt(keyId), { status: newStatus });
      setApiKeys(prev => prev.map(key =>
        key.id === keyId ? { ...key, status: newStatus as 'active' | 'inactive' | 'expired' } : key
      ));
    } catch (err) {
      setError('Failed to update API key status. Please try again.');
      console.error('Error updating API key status:', err);
    }
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.generic.delete('api-management/keys', parseInt(keyId));
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
    } catch (err) {
      setError('Failed to delete API key. Please try again.');
      console.error('Error deleting API key:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsagePercentage = (usage: number, limit: number) => {
    return Math.min((usage / limit) * 100, 100);
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
      <h1 className="text-3xl font-bold mb-6">API Management Service</h1>

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

      <div className="mb-6 flex justify-between items-center">
        <div className="text-gray-600">
          Manage API keys, rate limits, and access controls
        </div>
        <div className="flex space-x-2">
          <button
            onClick={loadApiKeys}
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
            {showCreateForm ? 'Cancel' : 'Create API Key'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New API Key</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={newKey.name}
                  onChange={handleInputChange}
                  placeholder="My API Key"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rate Limit (requests/minute)</label>
                <input
                  type="number"
                  name="rateLimit"
                  value={newKey.rateLimit}
                  onChange={handleInputChange}
                  min="1"
                  max="10000"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={submitting}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expiration Date (optional)</label>
              <input
                type="datetime-local"
                name="expiresAt"
                value={newKey.expiresAt}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={submitting}
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create API Key'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {apiKeys.map((key) => (
          <div key={key.id} className="bg-white shadow rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold">{key.name}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(key.status)}`}>
                  {key.status}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleKeyStatus(key.id, key.status)}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    key.status === 'active'
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {key.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteKey(key.id)}
                  className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>API Key:</strong>
                </p>
                <code className="block mt-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                  {key.key}
                </code>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Created:</strong> {new Date(key.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Expires:</strong> {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Usage: {key.usage} / {key.rateLimit} requests</span>
                <span>{Math.round(getUsagePercentage(key.usage, key.rateLimit))}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    getUsagePercentage(key.usage, key.rateLimit) > 80
                      ? 'bg-red-500'
                      : getUsagePercentage(key.usage, key.rateLimit) > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${getUsagePercentage(key.usage, key.rateLimit)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {apiKeys.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No API keys found. Create your first API key to get started.</p>
        </div>
      )}
    </div>
  );
};

export default APIManagementServicePage;
