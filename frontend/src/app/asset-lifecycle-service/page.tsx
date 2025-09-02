import React, { useState } from 'react';

interface Asset {
  id: number;
  name: string;
  type: string;
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Retired';
  lifecycleStage: string;
  createdDate: string;
}

const AssetLifecycleServicePage = () => {
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: 1,
      name: 'Server Rack A1',
      type: 'Hardware',
      status: 'Active',
      lifecycleStage: 'Production',
      createdDate: '2025-01-15'
    },
    {
      id: 2,
      name: 'Database Server B2',
      type: 'Software',
      status: 'Maintenance',
      lifecycleStage: 'Upgrade',
      createdDate: '2024-11-20'
    }
  ]);

  const [newAsset, setNewAsset] = useState({
    name: '',
    type: '',
    status: 'Active' as Asset['status'],
    lifecycleStage: ''
  });

  const [showForm, setShowForm] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAsset(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAsset.name && newAsset.type && newAsset.lifecycleStage) {
      const asset: Asset = {
        id: Date.now(),
        ...newAsset,
        createdDate: new Date().toISOString().split('T')[0]
      };
      setAssets(prev => [...prev, asset]);
      setNewAsset({ name: '', type: '', status: 'Active', lifecycleStage: '' });
      setShowForm(false);
    }
  };

  const updateStatus = (id: number, newStatus: Asset['status']) => {
    setAssets(prev => prev.map(asset =>
      asset.id === id ? { ...asset, status: newStatus } : asset
    ));
  };

  const deleteAsset = (id: number) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Asset Lifecycle Service</h1>

      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showForm ? 'Cancel' : 'Add New Asset'}
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                name="status"
                value={newAsset.status}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Asset
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
                    onChange={(e) => updateStatus(asset.id, e.target.value as Asset['status'])}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Retired">Retired</option>
                  </select>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="bg-red-500 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AssetLifecycleServicePage;
