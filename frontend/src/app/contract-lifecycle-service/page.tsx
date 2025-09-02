import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface Contract {
  id: string;
  title: string;
  description?: string;
  contractType: 'Service' | 'Maintenance' | 'Lease' | 'Purchase' | 'License' | 'Other';
  status: 'Draft' | 'Active' | 'Expired' | 'Terminated' | 'PendingApproval';
  vendorId: string;
  vendorName: string;
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  autoRenewal: boolean;
  renewalPeriod?: number; // months
  nextRenewalDate?: string;
  terms: string[];
  milestones: {
    id: string;
    name: string;
    dueDate: string;
    completed: boolean;
    completedAt?: string;
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    uploadedAt: string;
    url: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

const ContractLifecycleServicePage = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [creating, setCreating] = useState(false);

  // Form state
  const [newContract, setNewContract] = useState({
    title: '',
    description: '',
    contractType: 'Service' as Contract['contractType'],
    status: 'Draft' as Contract['status'],
    vendorId: '',
    vendorName: '',
    value: 0,
    currency: 'USD',
    startDate: '',
    endDate: '',
    autoRenewal: false,
    renewalPeriod: 12,
    terms: '',
    milestones: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<Contract>('contracts');
      setContracts(data);
    } catch (err) {
      setError('Failed to load contracts. Please try again.');
      console.error('Error loading contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.title || !newContract.vendorId || !newContract.vendorName ||
        !newContract.startDate || !newContract.endDate) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const contractData = {
        ...newContract,
        terms: newContract.terms.split(',').map(term => term.trim()).filter(term => term),
        milestones: newContract.milestones.split(';').map(milestone => {
          const [name, dueDate] = milestone.split('|').map(s => s.trim());
          return name && dueDate ? { name, dueDate: new Date(dueDate).toISOString(), completed: false } : null;
        }).filter(Boolean),
        startDate: new Date(newContract.startDate).toISOString(),
        endDate: new Date(newContract.endDate).toISOString(),
        nextRenewalDate: newContract.autoRenewal && newContract.endDate
          ? new Date(new Date(newContract.endDate).getTime() + (newContract.renewalPeriod * 30 * 24 * 60 * 60 * 1000)).toISOString()
          : undefined
      };

      const createdContract = await apiService.generic.create<Contract>('contracts', contractData);

      setContracts(prev => [createdContract, ...prev]);
      setNewContract({
        title: '',
        description: '',
        contractType: 'Service',
        status: 'Draft',
        vendorId: '',
        vendorName: '',
        value: 0,
        currency: 'USD',
        startDate: '',
        endDate: '',
        autoRenewal: false,
        renewalPeriod: 12,
        terms: '',
        milestones: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create contract. Please try again.');
      console.error('Error creating contract:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateContractStatus = async (contractId: string, status: Contract['status']) => {
    try {
      setError(null);
      await apiService.generic.update<Contract>('contracts', parseInt(contractId), { status });
      setContracts(prev => prev.map(contract =>
        contract.id === contractId ? { ...contract, status } : contract
      ));
    } catch (err) {
      setError('Failed to update contract status. Please try again.');
      console.error('Error updating contract:', err);
    }
  };

  const deleteContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('contracts', parseInt(contractId));
      setContracts(prev => prev.filter(contract => contract.id !== contractId));
    } catch (err) {
      setError('Failed to delete contract. Please try again.');
      console.error('Error deleting contract:', err);
    }
  };

  const completeMilestone = async (contractId: string, milestoneId: string) => {
    try {
      setError(null);
      await apiService.generic.update<Contract>(`contracts/${contractId}/milestones/${milestoneId}`, parseInt(contractId), {
        completed: true,
        completedAt: new Date().toISOString()
      });

      // Refresh contracts to get updated data
      await loadContracts();
    } catch (err) {
      setError('Failed to complete milestone. Please try again.');
      console.error('Error completing milestone:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      case 'Terminated': return 'bg-gray-100 text-gray-800';
      case 'PendingApproval': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Service': return 'bg-blue-100 text-blue-800';
      case 'Maintenance': return 'bg-green-100 text-green-800';
      case 'Lease': return 'bg-purple-100 text-purple-800';
      case 'Purchase': return 'bg-orange-100 text-orange-800';
      case 'License': return 'bg-indigo-100 text-indigo-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredContracts = contracts.filter(contract => {
    const statusMatch = filterStatus === 'All' || contract.status === filterStatus;
    const typeMatch = filterType === 'All' || contract.contractType === filterType;
    return statusMatch && typeMatch;
  });

  const getContractStats = () => {
    const total = contracts.length;
    const active = contracts.filter(c => c.status === 'Active').length;
    const expiringSoon = contracts.filter(c => c.status === 'Active' && getDaysUntilExpiry(c.endDate) <= 30).length;
    const expired = contracts.filter(c => c.status === 'Expired').length;

    return { total, active, expiringSoon, expired };
  };

  const stats = getContractStats();

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
      <h1 className="text-3xl font-bold mb-6">Contract Lifecycle Service</h1>

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

      {/* Contract Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Contracts</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active</h3>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Expiring Soon</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Expired</h3>
          <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Contracts</h2>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Terminated">Terminated</option>
              <option value="PendingApproval">Pending Approval</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Types</option>
              <option value="Service">Service</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Lease">Lease</option>
              <option value="Purchase">Purchase</option>
              <option value="License">License</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={creating}
            >
              {showCreateForm ? 'Cancel' : 'Create Contract'}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Contract</h3>
          <form onSubmit={handleCreateContract} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contract Title *</label>
                <input
                  type="text"
                  value={newContract.title}
                  onChange={(e) => setNewContract(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contract Type</label>
                <select
                  value={newContract.contractType}
                  onChange={(e) => setNewContract(prev => ({ ...prev, contractType: e.target.value as Contract['contractType'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Service">Service</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Lease">Lease</option>
                  <option value="Purchase">Purchase</option>
                  <option value="License">License</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vendor ID *</label>
                <input
                  type="text"
                  value={newContract.vendorId}
                  onChange={(e) => setNewContract(prev => ({ ...prev, vendorId: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vendor Name *</label>
                <input
                  type="text"
                  value={newContract.vendorName}
                  onChange={(e) => setNewContract(prev => ({ ...prev, vendorName: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contract Value</label>
                <input
                  type="number"
                  value={newContract.value}
                  onChange={(e) => setNewContract(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <select
                  value={newContract.currency}
                  onChange={(e) => setNewContract(prev => ({ ...prev, currency: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                <input
                  type="date"
                  value={newContract.startDate}
                  onChange={(e) => setNewContract(prev => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date *</label>
                <input
                  type="date"
                  value={newContract.endDate}
                  onChange={(e) => setNewContract(prev => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newContract.status}
                  onChange={(e) => setNewContract(prev => ({ ...prev, status: e.target.value as Contract['status'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Terminated">Terminated</option>
                  <option value="PendingApproval">Pending Approval</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoRenewal"
                  checked={newContract.autoRenewal}
                  onChange={(e) => setNewContract(prev => ({ ...prev, autoRenewal: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRenewal" className="ml-2 block text-sm text-gray-900">
                  Auto Renewal
                </label>
              </div>
              {newContract.autoRenewal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Renewal Period (months)</label>
                  <input
                    type="number"
                    value={newContract.renewalPeriod}
                    onChange={(e) => setNewContract(prev => ({ ...prev, renewalPeriod: parseInt(e.target.value) || 12 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Terms (comma-separated)</label>
              <input
                type="text"
                value={newContract.terms}
                onChange={(e) => setNewContract(prev => ({ ...prev, terms: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Term1, Term2, Term3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Milestones (name|due_date; name|due_date)</label>
              <input
                type="text"
                value={newContract.milestones}
                onChange={(e) => setNewContract(prev => ({ ...prev, milestones: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Milestone 1|2024-12-31; Milestone 2|2025-03-31"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newContract.description}
                onChange={(e) => setNewContract(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Contract'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {filteredContracts.map((contract) => (
          <div key={contract.id} className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold">{contract.title}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(contract.status)}`}>
                    {contract.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(contract.contractType)}`}>
                    {contract.contractType}
                  </span>
                  {contract.status === 'Active' && getDaysUntilExpiry(contract.endDate) <= 30 && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-semibold">
                      Expires in {getDaysUntilExpiry(contract.endDate)} days
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{contract.vendorName} (ID: {contract.vendorId})</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(contract.value, contract.currency)}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-1">
                  {contract.status !== 'Active' && contract.status !== 'Terminated' && contract.status !== 'Expired' && (
                    <button
                      onClick={() => updateContractStatus(contract.id, 'Active')}
                      className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Activate
                    </button>
                  )}
                  {contract.status === 'Active' && (
                    <button
                      onClick={() => updateContractStatus(contract.id, 'Terminated')}
                      className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Terminate
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedContract(selectedContract?.id === contract.id ? null : contract)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    {selectedContract?.id === contract.id ? 'Hide' : 'Details'}
                  </button>
                  <button
                    onClick={() => deleteContract(contract.id)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {selectedContract?.id === contract.id && (
              <div className="mt-6 border-t pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Auto Renewal</p>
                    <p className="font-semibold">{contract.autoRenewal ? 'Yes' : 'No'}</p>
                    {contract.autoRenewal && contract.nextRenewalDate && (
                      <p className="text-xs text-gray-500">
                        Next: {new Date(contract.nextRenewalDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Renewal Period</p>
                    <p className="font-semibold">{contract.renewalPeriod || 'N/A'} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Documents</p>
                    <p className="font-semibold">{contract.documents.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Milestones</p>
                    <p className="font-semibold">{contract.milestones.length}</p>
                  </div>
                </div>

                {contract.description && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Description</h4>
                    <p className="text-gray-700">{contract.description}</p>
                  </div>
                )}

                {contract.terms.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Key Terms</h4>
                    <div className="flex flex-wrap gap-2">
                      {contract.terms.map((term, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {contract.milestones.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Milestones</h4>
                    <div className="space-y-2">
                      {contract.milestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div className="flex-1">
                            <p className={`font-medium ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                              {milestone.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              {milestone.completedAt && ` • Completed: ${new Date(milestone.completedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          {!milestone.completed && (
                            <button
                              onClick={() => completeMilestone(contract.id, milestone.id)}
                              className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {contract.documents.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Documents</h4>
                    <div className="space-y-2">
                      {contract.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div className="flex-1">
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-gray-600">
                              {doc.type} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4">
              <p>Created: {new Date(contract.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(contract.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {filterStatus === 'All' && filterType === 'All'
              ? 'No contracts found. Create your first contract to get started.'
              : 'No contracts match the selected filters.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ContractLifecycleServicePage;
