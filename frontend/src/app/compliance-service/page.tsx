import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface ComplianceCheck {
  id: string;
  assetId: string;
  assetName: string;
  regulation: string;
  standard: string;
  status: 'Compliant' | 'NonCompliant' | 'Pending' | 'Exempt';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  checkDate: string;
  nextCheckDate?: string;
  findings: string[];
  remediation?: string;
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface ComplianceReport {
  id: string;
  name: string;
  period: string;
  totalAssets: number;
  compliantAssets: number;
  nonCompliantAssets: number;
  pendingChecks: number;
  criticalIssues: number;
  status: 'Draft' | 'Published' | 'Archived';
  generatedAt: string;
  generatedBy: string;
}

const ComplianceServicePage = () => {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'checks' | 'reports'>('checks');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheck | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [newCheck, setNewCheck] = useState({
    assetId: '',
    assetName: '',
    regulation: '',
    standard: '',
    status: 'Pending' as ComplianceCheck['status'],
    severity: 'Medium' as ComplianceCheck['severity'],
    checkDate: new Date().toISOString().split('T')[0],
    nextCheckDate: '',
    findings: '',
    remediation: '',
    assignedTo: '',
    dueDate: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadChecks();
    loadReports();
  }, []);

  const loadChecks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<ComplianceCheck>('compliance/checks');
      setChecks(data);
    } catch (err) {
      setError('Failed to load compliance checks. Please try again.');
      console.error('Error loading checks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const data = await apiService.generic.getAll<ComplianceReport>('compliance/reports');
      setReports(data);
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  };

  const handleCreateCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheck.assetId || !newCheck.assetName || !newCheck.regulation || !newCheck.standard) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const checkData = {
        ...newCheck,
        findings: newCheck.findings.split(',').map(f => f.trim()).filter(f => f),
        checkDate: new Date(newCheck.checkDate).toISOString(),
        nextCheckDate: newCheck.nextCheckDate ? new Date(newCheck.nextCheckDate).toISOString() : undefined,
        dueDate: newCheck.dueDate ? new Date(newCheck.dueDate).toISOString() : undefined
      };

      const createdCheck = await apiService.generic.create<ComplianceCheck>('compliance/checks', checkData);

      setChecks(prev => [createdCheck, ...prev]);
      setNewCheck({
        assetId: '',
        assetName: '',
        regulation: '',
        standard: '',
        status: 'Pending',
        severity: 'Medium',
        checkDate: new Date().toISOString().split('T')[0],
        nextCheckDate: '',
        findings: '',
        remediation: '',
        assignedTo: '',
        dueDate: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create compliance check. Please try again.');
      console.error('Error creating check:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateCheckStatus = async (checkId: string, status: ComplianceCheck['status']) => {
    try {
      setError(null);
      await apiService.generic.update<ComplianceCheck>('compliance/checks', parseInt(checkId), { status });
      setChecks(prev => prev.map(check =>
        check.id === checkId ? { ...check, status } : check
      ));
    } catch (err) {
      setError('Failed to update check status. Please try again.');
      console.error('Error updating check:', err);
    }
  };

  const deleteCheck = async (checkId: string) => {
    if (!confirm('Are you sure you want to delete this compliance check? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('compliance/checks', parseInt(checkId));
      setChecks(prev => prev.filter(check => check.id !== checkId));
    } catch (err) {
      setError('Failed to delete compliance check. Please try again.');
      console.error('Error deleting check:', err);
    }
  };

  const generateReport = async () => {
    try {
      setError(null);
      const report = await apiService.generic.create<ComplianceReport>('compliance/reports', {
        name: `Compliance Report ${new Date().toLocaleDateString()}`,
        period: new Date().toISOString().slice(0, 7), // YYYY-MM
        generatedBy: 'Current User' // In real app, get from auth context
      });

      setReports(prev => [report, ...prev]);
    } catch (err) {
      setError('Failed to generate compliance report. Please try again.');
      console.error('Error generating report:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'bg-green-100 text-green-800';
      case 'NonCompliant': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Exempt': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredChecks = checks.filter(check => {
    const statusMatch = filterStatus === 'All' || check.status === filterStatus;
    const severityMatch = filterSeverity === 'All' || check.severity === filterSeverity;
    return statusMatch && severityMatch;
  });

  const getComplianceStats = () => {
    const total = checks.length;
    const compliant = checks.filter(c => c.status === 'Compliant').length;
    const nonCompliant = checks.filter(c => c.status === 'NonCompliant').length;
    const pending = checks.filter(c => c.status === 'Pending').length;
    const critical = checks.filter(c => c.severity === 'Critical' && c.status === 'NonCompliant').length;

    return { total, compliant, nonCompliant, pending, critical };
  };

  const stats = getComplianceStats();

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
      <h1 className="text-3xl font-bold mb-6">Compliance Service</h1>

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

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Checks</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Compliant</h3>
          <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Non-Compliant</h3>
          <p className="text-2xl font-bold text-red-600">{stats.nonCompliant}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Critical Issues</h3>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('checks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'checks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Compliance Checks
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

      {/* Checks Tab */}
      {activeTab === 'checks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Compliance Checks</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Status</option>
                  <option value="Compliant">Compliant</option>
                  <option value="NonCompliant">Non-Compliant</option>
                  <option value="Pending">Pending</option>
                  <option value="Exempt">Exempt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Severity</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={generateReport}
                  className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                >
                  Generate Report
                </button>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Check'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Create New Compliance Check</h3>
              <form onSubmit={handleCreateCheck} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Asset ID *</label>
                    <input
                      type="text"
                      value={newCheck.assetId}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, assetId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Asset Name *</label>
                    <input
                      type="text"
                      value={newCheck.assetName}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, assetName: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Regulation *</label>
                    <input
                      type="text"
                      value={newCheck.regulation}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, regulation: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Standard *</label>
                    <input
                      type="text"
                      value={newCheck.standard}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, standard: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check Date</label>
                    <input
                      type="date"
                      value={newCheck.checkDate}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, checkDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Next Check Date</label>
                    <input
                      type="date"
                      value={newCheck.nextCheckDate}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, nextCheckDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={newCheck.status}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, status: e.target.value as ComplianceCheck['status'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Compliant">Compliant</option>
                      <option value="NonCompliant">Non-Compliant</option>
                      <option value="Exempt">Exempt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <select
                      value={newCheck.severity}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, severity: e.target.value as ComplianceCheck['severity'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                    <input
                      type="text"
                      value={newCheck.assignedTo}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      value={newCheck.dueDate}
                      onChange={(e) => setNewCheck(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Findings (comma-separated)</label>
                  <input
                    type="text"
                    value={newCheck.findings}
                    onChange={(e) => setNewCheck(prev => ({ ...prev, findings: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Finding1, Finding2, Finding3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remediation</label>
                  <textarea
                    value={newCheck.remediation}
                    onChange={(e) => setNewCheck(prev => ({ ...prev, remediation: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Check'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredChecks.map((check) => (
              <div key={check.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{check.assetName}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(check.status)}`}>
                        {check.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(check.severity)}`}>
                        {check.severity}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      {check.regulation} • {check.standard} • Asset ID: {check.assetId}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedCheck(selectedCheck?.id === check.id ? null : check)}
                      className="bg-gray-500 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded"
                    >
                      {selectedCheck?.id === check.id ? 'Hide' : 'Details'}
                    </button>
                    <div className="flex space-x-1">
                      {check.status !== 'Compliant' && check.status !== 'Exempt' && (
                        <>
                          <button
                            onClick={() => updateCheckStatus(check.id, 'Compliant')}
                            className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                          >
                            Mark Compliant
                          </button>
                          <button
                            onClick={() => updateCheckStatus(check.id, 'NonCompliant')}
                            className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                          >
                            Mark Non-Compliant
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteCheck(check.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedCheck?.id === check.id && (
                  <div className="mt-4 border-t pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <p><strong>Check Date:</strong> {new Date(check.checkDate).toLocaleDateString()}</p>
                        {check.nextCheckDate && (
                          <p><strong>Next Check:</strong> {new Date(check.nextCheckDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div>
                        {check.assignedTo && (
                          <p><strong>Assigned To:</strong> {check.assignedTo}</p>
                        )}
                        {check.dueDate && (
                          <p><strong>Due Date:</strong> {new Date(check.dueDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>

                    {check.findings.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Findings:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {check.findings.map((finding, index) => (
                            <li key={index} className="text-gray-700">{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {check.remediation && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Remediation:</h4>
                        <p className="text-gray-700 bg-yellow-50 p-3 rounded border">{check.remediation}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(check.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(check.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredChecks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterStatus === 'All' && filterSeverity === 'All'
                  ? 'No compliance checks found. Create your first check to get started.'
                  : 'No checks match the selected filters.'
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
            <h2 className="text-xl font-semibold">Compliance Reports</h2>
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
                      Period: {report.period} • Generated by {report.generatedBy} on {new Date(report.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{report.totalAssets}</p>
                    <p className="text-xs text-gray-600">Total Assets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{report.compliantAssets}</p>
                    <p className="text-xs text-gray-600">Compliant</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{report.nonCompliantAssets}</p>
                    <p className="text-xs text-gray-600">Non-Compliant</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{report.pendingChecks}</p>
                    <p className="text-xs text-gray-600">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{report.criticalIssues}</p>
                    <p className="text-xs text-gray-600">Critical</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button className="bg-blue-500 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded">
                    View Details
                  </button>
                  <button className="bg-green-500 hover:bg-green-700 text-white text-sm px-3 py-1 rounded">
                    Export Report
                  </button>
                </div>
              </div>
            ))}
          </div>

          {reports.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No compliance reports found. Generate your first report to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplianceServicePage;
