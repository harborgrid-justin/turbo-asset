import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface Chargeback {
  id: string;
  assetId: string;
  assetName: string;
  department: string;
  costCenter: string;
  amount: number;
  currency: string;
  period: string; // YYYY-MM
  category: 'Maintenance' | 'Operations' | 'Depreciation' | 'Insurance' | 'Other';
  description?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChargebackSummary {
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  departmentBreakdown: {
    department: string;
    amount: number;
    count: number;
  }[];
  monthlyBreakdown: {
    period: string;
    amount: number;
    count: number;
  }[];
}

const ChargebackServicePage = () => {
  const [chargebacks, setChargebacks] = useState<Chargeback[]>([]);
  const [summary, setSummary] = useState<ChargebackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [creating, setCreating] = useState(false);

  // Form state
  const [newChargeback, setNewChargeback] = useState({
    assetId: '',
    assetName: '',
    department: '',
    costCenter: '',
    amount: 0,
    currency: 'USD',
    period: '',
    category: 'Maintenance' as Chargeback['category'],
    description: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadChargebacks();
    loadSummary();
  }, []);

  const loadChargebacks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<Chargeback>('chargebacks');
      setChargebacks(data);
    } catch (err) {
      setError('Failed to load chargebacks. Please try again.');
      console.error('Error loading chargebacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await apiService.generic.getAll<ChargebackSummary>('chargebacks/summary');
      setSummary(data[0] || null); // Assuming summary returns an array with one item
    } catch (err) {
      console.error('Error loading summary:', err);
    }
  };

  const handleCreateChargeback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChargeback.assetId || !newChargeback.assetName || !newChargeback.department ||
        !newChargeback.costCenter || !newChargeback.amount || !newChargeback.period) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const createdChargeback = await apiService.generic.create<Chargeback>('chargebacks', newChargeback);

      setChargebacks(prev => [createdChargeback, ...prev]);
      setNewChargeback({
        assetId: '',
        assetName: '',
        department: '',
        costCenter: '',
        amount: 0,
        currency: 'USD',
        period: '',
        category: 'Maintenance',
        description: ''
      });
      setShowCreateForm(false);

      // Refresh summary
      await loadSummary();
    } catch (err) {
      setError('Failed to create chargeback. Please try again.');
      console.error('Error creating chargeback:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateChargebackStatus = async (chargebackId: string, status: Chargeback['status']) => {
    try {
      setError(null);
      const updateData: Partial<Pick<Chargeback, 'status' | 'approvedBy' | 'approvedAt'>> = { status };

      if (status === 'Approved') {
        updateData.approvedBy = 'Current User'; // In real app, get from auth context
        updateData.approvedAt = new Date().toISOString();
      }

      await apiService.generic.update<Chargeback>('chargebacks', parseInt(chargebackId), updateData);
      setChargebacks(prev => prev.map(cb =>
        cb.id === chargebackId ? { ...cb, ...updateData } : cb
      ));

      // Refresh summary
      await loadSummary();
    } catch (err) {
      setError('Failed to update chargeback status. Please try again.');
      console.error('Error updating chargeback:', err);
    }
  };

  const deleteChargeback = async (chargebackId: string) => {
    if (!confirm('Are you sure you want to delete this chargeback? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('chargebacks', parseInt(chargebackId));
      setChargebacks(prev => prev.filter(cb => cb.id !== chargebackId));

      // Refresh summary
      await loadSummary();
    } catch (err) {
      setError('Failed to delete chargeback. Please try again.');
      console.error('Error deleting chargeback:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Approved': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Maintenance': return 'bg-blue-100 text-blue-800';
      case 'Operations': return 'bg-green-100 text-green-800';
      case 'Depreciation': return 'bg-purple-100 text-purple-800';
      case 'Insurance': return 'bg-orange-100 text-orange-800';
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

  const filteredChargebacks = chargebacks.filter(cb => {
    const statusMatch = filterStatus === 'All' || cb.status === filterStatus;
    const departmentMatch = filterDepartment === 'All' || cb.department === filterDepartment;
    const periodMatch = !selectedPeriod || cb.period === selectedPeriod;
    return statusMatch && departmentMatch && periodMatch;
  });

  const departments = [...new Set(chargebacks.map(cb => cb.department))];

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
      <h1 className="text-3xl font-bold mb-6">Chargeback Service</h1>

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

      {/* Summary Dashboard */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-4 border">
            <h3 className="text-lg font-semibold text-gray-700">Total Amount</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalAmount)}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4 border">
            <h3 className="text-lg font-semibold text-gray-700">Pending</h3>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.pendingAmount)}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4 border">
            <h3 className="text-lg font-semibold text-gray-700">Approved</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.approvedAmount)}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4 border">
            <h3 className="text-lg font-semibold text-gray-700">Paid</h3>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.paidAmount)}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Chargebacks</h2>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={creating}
            >
              {showCreateForm ? 'Cancel' : 'Create Chargeback'}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Chargeback</h3>
          <form onSubmit={handleCreateChargeback} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset ID *</label>
                <input
                  type="text"
                  value={newChargeback.assetId}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, assetId: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset Name *</label>
                <input
                  type="text"
                  value={newChargeback.assetName}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, assetName: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department *</label>
                <input
                  type="text"
                  value={newChargeback.department}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, department: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost Center *</label>
                <input
                  type="text"
                  value={newChargeback.costCenter}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, costCenter: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount *</label>
                <input
                  type="number"
                  value={newChargeback.amount}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Period *</label>
                <input
                  type="month"
                  value={newChargeback.period}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, period: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={newChargeback.category}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, category: e.target.value as Chargeback['category'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Maintenance">Maintenance</option>
                  <option value="Operations">Operations</option>
                  <option value="Depreciation">Depreciation</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <select
                  value={newChargeback.currency}
                  onChange={(e) => setNewChargeback(prev => ({ ...prev, currency: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newChargeback.description}
                onChange={(e) => setNewChargeback(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Chargeback'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredChargebacks.map((chargeback) => (
          <div key={chargeback.id} className="bg-white shadow rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold">{chargeback.assetName}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(chargeback.status)}`}>
                    {chargeback.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(chargeback.category)}`}>
                    {chargeback.category}
                  </span>
                </div>
                <p className="text-gray-600">Asset ID: {chargeback.assetId}</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(chargeback.amount, chargeback.currency)}</p>
                  <p className="text-sm text-gray-600">{chargeback.period}</p>
                </div>
                <div className="flex space-x-1">
                  {chargeback.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => updateChargebackStatus(chargeback.id, 'Approved')}
                        className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateChargebackStatus(chargeback.id, 'Rejected')}
                        className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {chargeback.status === 'Approved' && (
                    <button
                      onClick={() => updateChargebackStatus(chargeback.id, 'Paid')}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Mark Paid
                    </button>
                  )}
                  <button
                    onClick={() => deleteChargeback(chargeback.id)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
              <div>
                <p><strong>Department:</strong> {chargeback.department}</p>
              </div>
              <div>
                <p><strong>Cost Center:</strong> {chargeback.costCenter}</p>
              </div>
              <div>
                <p><strong>Period:</strong> {chargeback.period}</p>
              </div>
              <div>
                <p><strong>Currency:</strong> {chargeback.currency}</p>
              </div>
            </div>

            {chargeback.description && (
              <p className="text-gray-700 mb-4">{chargeback.description}</p>
            )}

            {chargeback.approvedBy && (
              <div className="text-sm text-gray-600">
                <p>Approved by {chargeback.approvedBy} on {chargeback.approvedAt ? new Date(chargeback.approvedAt).toLocaleDateString() : 'Unknown'}</p>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4">
              <p>Created: {new Date(chargeback.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(chargeback.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredChargebacks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {filterStatus === 'All' && filterDepartment === 'All'
              ? 'No chargebacks found. Create your first chargeback to get started.'
              : 'No chargebacks match the selected filters.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ChargebackServicePage;
