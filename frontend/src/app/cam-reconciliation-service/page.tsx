import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface ReconciliationItem {
  id: string;
  assetId: string;
  assetName: string;
  sourceSystem: string;
  targetSystem: string;
  status: 'Matched' | 'Unmatched' | 'PartiallyMatched' | 'Error';
  discrepancies: {
    field: string;
    sourceValue: string;
    targetValue: string;
    severity: 'Low' | 'Medium' | 'High';
  }[];
  lastReconciledAt: string;
  createdAt: string;
}

interface ReconciliationReport {
  id: string;
  name: string;
  totalItems: number;
  matchedItems: number;
  unmatchedItems: number;
  partiallyMatchedItems: number;
  errorItems: number;
  status: 'Running' | 'Completed' | 'Failed';
  startedAt: string;
  completedAt?: string;
  generatedBy: string;
}

const CAMReconciliationServicePage = () => {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'reports'>('items');
  const [selectedItem, setSelectedItem] = useState<ReconciliationItem | null>(null);
  const [runningReconciliation, setRunningReconciliation] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Load data on component mount
  useEffect(() => {
    loadItems();
    loadReports();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<ReconciliationItem>('cam-reconciliation/items');
      setItems(data);
    } catch (err) {
      setError('Failed to load reconciliation items. Please try again.');
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const data = await apiService.generic.getAll<ReconciliationReport>('cam-reconciliation/reports');
      setReports(data);
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  };

  const runReconciliation = async () => {
    try {
      setRunningReconciliation(true);
      setError(null);
      const report = await apiService.generic.create<ReconciliationReport>('cam-reconciliation/run', {
        name: `Reconciliation ${new Date().toLocaleString()}`,
        generatedBy: 'User'
      });

      setReports(prev => [report, ...prev]);
      // Refresh items after reconciliation
      await loadItems();
    } catch (err) {
      setError('Failed to run reconciliation. Please try again.');
      console.error('Error running reconciliation:', err);
    } finally {
      setRunningReconciliation(false);
    }
  };

  const resolveDiscrepancy = async (itemId: string, field: string, resolution: string) => {
    try {
      setError(null);
      await apiService.generic.update<ReconciliationItem>('cam-reconciliation/items', parseInt(itemId), {
        resolution: { field, resolution }
      });

      // Refresh items
      await loadItems();
    } catch (err) {
      setError('Failed to resolve discrepancy. Please try again.');
      console.error('Error resolving discrepancy:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Matched': return 'bg-green-100 text-green-800';
      case 'PartiallyMatched': return 'bg-yellow-100 text-yellow-800';
      case 'Unmatched': return 'bg-red-100 text-red-800';
      case 'Error': return 'bg-red-100 text-red-800';
      case 'Running': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredItems = items.filter(item => {
    if (filterStatus === 'All') return true;
    return item.status === filterStatus;
  });

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
      <h1 className="text-3xl font-bold mb-6">CAM Reconciliation Service</h1>

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

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('items')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reconciliation Items
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reports
            </button>
          </nav>
        </div>
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Reconciliation Items</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Status</option>
                  <option value="Matched">Matched</option>
                  <option value="PartiallyMatched">Partially Matched</option>
                  <option value="Unmatched">Unmatched</option>
                  <option value="Error">Error</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={runReconciliation}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={runningReconciliation}
                >
                  {runningReconciliation ? 'Running...' : 'Run Reconciliation'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{item.assetName}</h3>
                    <p className="text-sm text-gray-600">
                      Asset ID: {item.assetId} • {item.sourceSystem} ↔ {item.targetSystem}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <button
                      onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                      className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedItem?.id === item.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {selectedItem?.id === item.id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-md font-semibold mb-3">Discrepancies</h4>
                    {item.discrepancies.length > 0 ? (
                      <div className="space-y-3">
                        {item.discrepancies.map((discrepancy, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{discrepancy.field}</span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(discrepancy.severity)}`}>
                                {discrepancy.severity}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600"><strong>Source:</strong></p>
                                <p className="font-mono bg-red-50 p-1 rounded">{discrepancy.sourceValue}</p>
                              </div>
                              <div>
                                <p className="text-gray-600"><strong>Target:</strong></p>
                                <p className="font-mono bg-green-50 p-1 rounded">{discrepancy.targetValue}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex space-x-2">
                              <button
                                onClick={() => resolveDiscrepancy(item.id, discrepancy.field, 'UseSource')}
                                className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                              >
                                Use Source
                              </button>
                              <button
                                onClick={() => resolveDiscrepancy(item.id, discrepancy.field, 'UseTarget')}
                                className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                              >
                                Use Target
                              </button>
                              <button
                                onClick={() => resolveDiscrepancy(item.id, discrepancy.field, 'Manual')}
                                className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                              >
                                Manual Review
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No discrepancies found.</p>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Last reconciled: {new Date(item.lastReconciledAt).toLocaleString()}</p>
                  <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterStatus === 'All'
                  ? 'No reconciliation items found. Run a reconciliation to get started.'
                  : `No ${filterStatus.toLowerCase()} items found.`
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Reconciliation Reports</h2>
            <button
              onClick={loadReports}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{report.name}</h3>
                    <p className="text-sm text-gray-600">
                      Generated by {report.generatedBy} • Started {new Date(report.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{report.totalItems}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{report.matchedItems}</p>
                    <p className="text-xs text-gray-600">Matched</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{report.partiallyMatchedItems}</p>
                    <p className="text-xs text-gray-600">Partial</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{report.unmatchedItems}</p>
                    <p className="text-xs text-gray-600">Unmatched</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{report.errorItems}</p>
                    <p className="text-xs text-gray-600">Errors</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {report.completedAt && (
                      <p>Completed: {new Date(report.completedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button className="bg-blue-500 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded">
                      View Details
                    </button>
                    <button className="bg-green-500 hover:bg-green-700 text-white text-sm px-3 py-1 rounded">
                      Export Report
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {reports.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No reconciliation reports found. Run a reconciliation to generate reports.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CAMReconciliationServicePage;
