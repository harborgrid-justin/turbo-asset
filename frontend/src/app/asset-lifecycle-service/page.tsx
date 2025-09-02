'use client';

import React, { useState, useEffect } from 'react';
import { apiService, Asset } from '../../lib/api';

const AssetLifecycleServicePage = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newAsset, setNewAsset] = useState({
    name: '',
    type: '',
    status: 'Active' as Asset['status'],
    lifecycleStage: ''
  });

  // Load assets on component mount
  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.assets.getAll();
      setAssets(data);
    } catch (err) {
      setError('Failed to load assets. Please try again.');
      console.error('Error loading assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAsset(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.type || !newAsset.lifecycleStage) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const assetData = {
        name: newAsset.name,
        type: newAsset.type,
        status: newAsset.status,
        lifecycleStage: newAsset.lifecycleStage
      };

      const createdAsset = await apiService.assets.create(assetData);
      setAssets(prev => [...prev, createdAsset]);
      setNewAsset({ name: '', type: '', status: 'Active', lifecycleStage: '' });
      setShowForm(false);
    } catch (err) {
      setError('Failed to create asset. Please try again.');
      console.error('Error creating asset:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, newStatus: Asset['status']) => {
    if (!id) return;
    try {
      const updatedAsset = await apiService.assets.updateStatus(id, newStatus);
      setAssets(prev => prev.map(asset =>
        asset.id === id ? updatedAsset : asset
      ));
    } catch (err) {
      setError('Failed to update asset status. Please try again.');
      console.error('Error updating asset status:', err);
    }
  };

  const deleteAsset = async (id: number) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      await apiService.assets.delete(id);
      setAssets(prev => prev.filter(asset => asset.id !== id));
    } catch (err) {
      setError('Failed to delete asset. Please try again.');
      console.error('Error deleting asset:', err);
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
      <h1 className="text-3xl font-bold mb-6">Asset Lifecycle Service</h1>

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

      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={submitting}
        >
          {showForm ? 'Cancel' : 'Add New Asset'}
        </button>
        <button
          onClick={loadAssets}
          className="ml-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Asset</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Asset Name</label>
              <input
                type="text"
                name="name"
                value={newAsset.name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Asset Type</label>
              <input
                type="text"
                name="type"
                value={newAsset.type}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lifecycle Stage</label>
              <input
                type="text"
                name="lifecycleStage"
                value={newAsset.lifecycleStage}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                name="status"
                value={newAsset.status}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={submitting}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Add Asset'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Asset List</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage your assets and their lifecycle stages.</p>
        </div>
        <ul className="divide-y divide-gray-200">
          {assets.map((asset) => (
            <li key={asset.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-indigo-600 truncate">{asset.name}</p>
                    <p className="ml-2 flex-shrink-0 flex">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        asset.status === 'Active' ? 'bg-green-100 text-green-800' :
                        asset.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        asset.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {asset.status}
                      </span>
                    </p>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Type: {asset.type}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Stage: {asset.lifecycleStage}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      Created: {asset.createdDate}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <select
                    value={asset.status}
                    onChange={(e) => asset.id && updateStatus(asset.id, e.target.value as Asset['status'])}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    disabled={!asset.id}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Retired">Retired</option>
                  </select>
                  <button
                    onClick={() => asset.id && deleteAsset(asset.id)}
                    className="bg-red-500 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                    disabled={!asset.id}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {assets.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-500">No assets found. Create your first asset above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetLifecycleServicePage;
