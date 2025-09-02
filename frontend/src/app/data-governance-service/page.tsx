import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface DataPolicy {
  id: string;
  name: string;
  description?: string;
  category: 'Privacy' | 'Security' | 'Compliance' | 'Retention' | 'Access' | 'Other';
  status: 'Draft' | 'Active' | 'Archived' | 'UnderReview';
  effectiveDate: string;
  reviewDate?: string;
  owner: string;
  approver?: string;
  tags: string[];
  rules: {
    id: string;
    name: string;
    description: string;
    type: 'Allow' | 'Deny' | 'Require';
    conditions: string[];
  }[];
  createdAt: string;
  updatedAt: string;
}

interface DataClassification {
  id: string;
  name: string;
  description?: string;
  level: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
  color: string;
  requirements: string[];
  retentionPeriod: number; // days
  encryptionRequired: boolean;
  accessControls: string[];
  createdAt: string;
  updatedAt: string;
}

interface DataAuditLog {
  id: string;
  timestamp: string;
  action: 'Create' | 'Read' | 'Update' | 'Delete' | 'Export' | 'Access';
  userId: string;
  userName: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

const DataGovernanceServicePage = () => {
  const [policies, setPolicies] = useState<DataPolicy[]>([]);
  const [classifications, setClassifications] = useState<DataClassification[]>([]);
  const [auditLogs, setAuditLogs] = useState<DataAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'policies' | 'classifications' | 'audit'>('policies');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<DataPolicy | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<DataClassification | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterLevel, setFilterLevel] = useState<string>('All');
  const [creating, setCreating] = useState(false);

  // Form state for policies
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    category: 'Privacy' as DataPolicy['category'],
    status: 'Draft' as DataPolicy['status'],
    effectiveDate: '',
    reviewDate: '',
    owner: '',
    approver: '',
    tags: '',
    rules: ''
  });

  // Form state for classifications
  const [newClassification, setNewClassification] = useState({
    name: '',
    description: '',
    level: 'Internal' as DataClassification['level'],
    color: '#3B82F6',
    requirements: '',
    retentionPeriod: 365,
    encryptionRequired: false,
    accessControls: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [policiesData, classificationsData, auditData] = await Promise.all([
        apiService.generic.getAll<DataPolicy>('data-policies'),
        apiService.generic.getAll<DataClassification>('data-classifications'),
        apiService.generic.getAll<DataAuditLog>('data-audit-logs')
      ]);
      setPolicies(policiesData);
      setClassifications(classificationsData);
      setAuditLogs(auditData);
    } catch (err) {
      setError('Failed to load data governance data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.name || !newPolicy.effectiveDate || !newPolicy.owner) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const policyData = {
        ...newPolicy,
        tags: newPolicy.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        rules: newPolicy.rules.split(';').map(rule => {
          const [name, description, type, conditions] = rule.split('|').map(s => s.trim());
          return name && description ? {
            name,
            description,
            type: type as 'Allow' | 'Deny' | 'Require',
            conditions: conditions ? conditions.split(',').map(c => c.trim()) : []
          } : null;
        }).filter(Boolean),
        effectiveDate: new Date(newPolicy.effectiveDate).toISOString(),
        reviewDate: newPolicy.reviewDate ? new Date(newPolicy.reviewDate).toISOString() : undefined
      };

      const createdPolicy = await apiService.generic.create<DataPolicy>('data-policies', policyData);

      setPolicies(prev => [createdPolicy, ...prev]);
      setNewPolicy({
        name: '',
        description: '',
        category: 'Privacy',
        status: 'Draft',
        effectiveDate: '',
        reviewDate: '',
        owner: '',
        approver: '',
        tags: '',
        rules: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create data policy. Please try again.');
      console.error('Error creating policy:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClassification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassification.name) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const classificationData = {
        ...newClassification,
        requirements: newClassification.requirements.split(',').map(req => req.trim()).filter(req => req),
        accessControls: newClassification.accessControls.split(',').map(control => control.trim()).filter(control => control)
      };

      const createdClassification = await apiService.generic.create<DataClassification>('data-classifications', classificationData);

      setClassifications(prev => [createdClassification, ...prev]);
      setNewClassification({
        name: '',
        description: '',
        level: 'Internal',
        color: '#3B82F6',
        requirements: '',
        retentionPeriod: 365,
        encryptionRequired: false,
        accessControls: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create data classification. Please try again.');
      console.error('Error creating classification:', err);
    } finally {
      setCreating(false);
    }
  };

  const updatePolicyStatus = async (policyId: string, status: DataPolicy['status']) => {
    try {
      setError(null);
      await apiService.generic.update<DataPolicy>('data-policies', parseInt(policyId), { status });
      setPolicies(prev => prev.map(policy =>
        policy.id === policyId ? { ...policy, status } : policy
      ));
    } catch (err) {
      setError('Failed to update policy status. Please try again.');
      console.error('Error updating policy:', err);
    }
  };

  const deletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this data policy? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('data-policies', parseInt(policyId));
      setPolicies(prev => prev.filter(policy => policy.id !== policyId));
    } catch (err) {
      setError('Failed to delete data policy. Please try again.');
      console.error('Error deleting policy:', err);
    }
  };

  const deleteClassification = async (classificationId: string) => {
    if (!confirm('Are you sure you want to delete this data classification? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('data-classifications', parseInt(classificationId));
      setClassifications(prev => prev.filter(classification => classification.id !== classificationId));
    } catch (err) {
      setError('Failed to delete data classification. Please try again.');
      console.error('Error deleting classification:', err);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Privacy': return 'bg-blue-100 text-blue-800';
      case 'Security': return 'bg-red-100 text-red-800';
      case 'Compliance': return 'bg-green-100 text-green-800';
      case 'Retention': return 'bg-purple-100 text-purple-800';
      case 'Access': return 'bg-orange-100 text-orange-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      case 'UnderReview': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Public': return 'bg-green-100 text-green-800';
      case 'Internal': return 'bg-blue-100 text-blue-800';
      case 'Confidential': return 'bg-orange-100 text-orange-800';
      case 'Restricted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Create': return 'bg-green-100 text-green-800';
      case 'Read': return 'bg-blue-100 text-blue-800';
      case 'Update': return 'bg-orange-100 text-orange-800';
      case 'Delete': return 'bg-red-100 text-red-800';
      case 'Export': return 'bg-purple-100 text-purple-800';
      case 'Access': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPolicies = policies.filter(policy => {
    const categoryMatch = filterCategory === 'All' || policy.category === filterCategory;
    const statusMatch = filterStatus === 'All' || policy.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  const filteredClassifications = classifications.filter(classification => {
    const levelMatch = filterLevel === 'All' || classification.level === filterLevel;
    return levelMatch;
  });

  const getStats = () => {
    const totalPolicies = policies.length;
    const activePolicies = policies.filter(p => p.status === 'Active').length;
    const totalClassifications = classifications.length;
    const totalAudits = auditLogs.length;
    const recentAudits = auditLogs.filter(log =>
      new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    return { totalPolicies, activePolicies, totalClassifications, totalAudits, recentAudits };
  };

  const stats = getStats();

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
      <h1 className="text-3xl font-bold mb-6">Data Governance Service</h1>

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

      {/* Data Governance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Policies</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalPolicies}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active Policies</h3>
          <p className="text-2xl font-bold text-green-600">{stats.activePolicies}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Classifications</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.totalClassifications}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Audits</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.totalAudits}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Recent Audits</h3>
          <p className="text-2xl font-bold text-red-600">{stats.recentAudits}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'policies'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Data Policies ({policies.length})
        </button>
        <button
          onClick={() => setActiveTab('classifications')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'classifications'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Classifications ({classifications.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'audit'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Data Policies</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Categories</option>
                  <option value="Privacy">Privacy</option>
                  <option value="Security">Security</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Retention">Retention</option>
                  <option value="Access">Access</option>
                  <option value="Other">Other</option>
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
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                  <option value="UnderReview">Under Review</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Policy'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Data Policy</h3>
              <form onSubmit={handleCreatePolicy} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Policy Name *</label>
                    <input
                      type="text"
                      value={newPolicy.name}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={newPolicy.category}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, category: e.target.value as DataPolicy['category'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Privacy">Privacy</option>
                      <option value="Security">Security</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Retention">Retention</option>
                      <option value="Access">Access</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Effective Date *</label>
                    <input
                      type="date"
                      value={newPolicy.effectiveDate}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, effectiveDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Review Date</label>
                    <input
                      type="date"
                      value={newPolicy.reviewDate}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, reviewDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Owner *</label>
                    <input
                      type="text"
                      value={newPolicy.owner}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, owner: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Approver</label>
                    <input
                      type="text"
                      value={newPolicy.approver}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, approver: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={newPolicy.status}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, status: e.target.value as DataPolicy['status'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Active">Active</option>
                      <option value="Archived">Archived</option>
                      <option value="UnderReview">Under Review</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newPolicy.tags}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, tags: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="gdpr, pii, security"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rules (name|description|type|conditions; ...)</label>
                  <textarea
                    value={newPolicy.rules}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, rules: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Data Encryption|All sensitive data must be encrypted|Require|data.sensitivity=high; Access Logging|All access must be logged|Require|action=read,write"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newPolicy.description}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Data Policy'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredPolicies.map((policy) => (
              <div key={policy.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{policy.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(policy.category)}`}>
                        {policy.category}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(policy.status)}`}>
                        {policy.status}
                      </span>
                    </div>
                    <p className="text-gray-600">Owner: {policy.owner}</p>
                    {policy.approver && (
                      <p className="text-sm text-gray-500">Approver: {policy.approver}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Effective: {new Date(policy.effectiveDate).toLocaleDateString()}
                      </p>
                      {policy.reviewDate && (
                        <p className="text-sm text-gray-600">
                          Review: {new Date(policy.reviewDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {policy.status !== 'Active' && policy.status !== 'Archived' && (
                        <button
                          onClick={() => updatePolicyStatus(policy.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedPolicy(selectedPolicy?.id === policy.id ? null : policy)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedPolicy?.id === policy.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deletePolicy(policy.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedPolicy?.id === policy.id && (
                  <div className="mt-6 border-t pt-6">
                    {policy.description && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Description</h4>
                        <p className="text-gray-700">{policy.description}</p>
                      </div>
                    )}

                    {policy.tags.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {policy.tags.map((tag, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {policy.rules.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Rules ({policy.rules.length})</h4>
                        <div className="space-y-3">
                          {policy.rules.map((rule) => (
                            <div key={rule.id} className="bg-white p-4 rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium">{rule.name}</h5>
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                  rule.type === 'Allow' ? 'bg-green-100 text-green-800' :
                                  rule.type === 'Deny' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {rule.type}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm mb-2">{rule.description}</p>
                              {rule.conditions.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {rule.conditions.map((condition, index) => (
                                    <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                      {condition}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(policy.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(policy.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredPolicies.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterCategory === 'All' && filterStatus === 'All'
                  ? 'No data policies found. Create your first data policy to get started.'
                  : 'No data policies match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Classifications Tab */}
      {activeTab === 'classifications' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Data Classifications</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Levels</option>
                  <option value="Public">Public</option>
                  <option value="Internal">Internal</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Restricted">Restricted</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Classification'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Data Classification</h3>
              <form onSubmit={handleCreateClassification} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Classification Name *</label>
                    <input
                      type="text"
                      value={newClassification.name}
                      onChange={(e) => setNewClassification(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Level</label>
                    <select
                      value={newClassification.level}
                      onChange={(e) => setNewClassification(prev => ({ ...prev, level: e.target.value as DataClassification['level'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Public">Public</option>
                      <option value="Internal">Internal</option>
                      <option value="Confidential">Confidential</option>
                      <option value="Restricted">Restricted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Color</label>
                    <input
                      type="color"
                      value={newClassification.color}
                      onChange={(e) => setNewClassification(prev => ({ ...prev, color: e.target.value }))}
                      className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Retention Period (days)</label>
                    <input
                      type="number"
                      value={newClassification.retentionPeriod}
                      onChange={(e) => setNewClassification(prev => ({ ...prev, retentionPeriod: parseInt(e.target.value) || 365 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="encryptionRequired"
                      checked={newClassification.encryptionRequired}
                      onChange={(e) => setNewClassification(prev => ({ ...prev, encryptionRequired: e.target.checked }))}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="encryptionRequired" className="ml-2 block text-sm text-gray-900">
                      Encryption Required
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Requirements (comma-separated)</label>
                  <input
                    type="text"
                    value={newClassification.requirements}
                    onChange={(e) => setNewClassification(prev => ({ ...prev, requirements: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Access control, Encryption, Audit logging"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Access Controls (comma-separated)</label>
                  <input
                    type="text"
                    value={newClassification.accessControls}
                    onChange={(e) => setNewClassification(prev => ({ ...prev, accessControls: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Role-based access, Multi-factor authentication"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newClassification.description}
                    onChange={(e) => setNewClassification(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Classification'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredClassifications.map((classification) => (
              <div key={classification.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: classification.color }}
                      ></div>
                      <h3 className="text-xl font-semibold">{classification.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getLevelColor(classification.level)}`}>
                        {classification.level}
                      </span>
                      {classification.encryptionRequired && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-semibold">
                          Encrypted
                        </span>
                      )}
                    </div>
                    {classification.description && (
                      <p className="text-gray-600">{classification.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Retention: {classification.retentionPeriod} days
                      </p>
                      <p className="text-sm text-gray-600">
                        Requirements: {classification.requirements.length}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setSelectedClassification(selectedClassification?.id === classification.id ? null : classification)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedClassification?.id === classification.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteClassification(classification.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedClassification?.id === classification.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Level</p>
                        <p className="font-semibold">{classification.level}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Retention Period</p>
                        <p className="font-semibold">{classification.retentionPeriod} days</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Encryption</p>
                        <p className="font-semibold">{classification.encryptionRequired ? 'Required' : 'Not Required'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Access Controls</p>
                        <p className="font-semibold">{classification.accessControls.length}</p>
                      </div>
                    </div>

                    {classification.requirements.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Requirements</h4>
                        <div className="flex flex-wrap gap-2">
                          {classification.requirements.map((req, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {classification.accessControls.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Access Controls</h4>
                        <div className="flex flex-wrap gap-2">
                          {classification.accessControls.map((control, index) => (
                            <span key={index} className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">
                              {control}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(classification.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(classification.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredClassifications.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterLevel === 'All'
                  ? 'No data classifications found. Create your first data classification to get started.'
                  : 'No data classifications match the selected filter.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Data Audit Logs</h2>
            <div className="text-sm text-gray-600">
              Showing last 100 audit entries
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.slice(0, 100).map((log) => (
              <div key={log.id} className="bg-gray-50 p-4 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="font-medium">{log.resourceType}: {log.resourceName}</span>
                    <span className="text-sm text-gray-600">(ID: {log.resourceId})</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{log.userName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {log.details && (
                  <p className="text-sm text-gray-700 mb-2">{log.details}</p>
                )}
                <div className="text-xs text-gray-500">
                  IP: {log.ipAddress || 'N/A'} • User Agent: {log.userAgent ? log.userAgent.substring(0, 50) + '...' : 'N/A'}
                </div>
              </div>
            ))}
          </div>

          {auditLogs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No audit logs found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataGovernanceServicePage;
