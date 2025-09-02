import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface ConsolidationRule {
  id: string;
  name: string;
  description: string;
  sourceEntity: string;
  targetEntity: string;
  mappingRules: {
    sourceField: string;
    targetField: string;
    transformation?: string;
    defaultValue?: string;
  }[];
  consolidationMethod: 'Sum' | 'Average' | 'WeightedAverage' | 'First' | 'Last' | 'Custom';
  currencyConversion: {
    enabled: boolean;
    sourceCurrency: string;
    targetCurrency: string;
    exchangeRate: number;
    rateDate: string;
  };
  validationRules: {
    field: string;
    rule: string;
    errorMessage: string;
  }[];
  status: 'Active' | 'Inactive' | 'Draft' | 'Error';
  lastExecuted?: string;
  executionCount: number;
  successCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ConsolidationJob {
  id: string;
  name: string;
  description: string;
  ruleIds: string[];
  schedule: {
    type: 'Manual' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';
  progress: number;
  startTime?: string;
  endTime?: string;
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage?: string;
  output: {
    consolidatedRecords: number;
    totalValue: number;
    currency: string;
    reportUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface FinancialEntity {
  id: string;
  name: string;
  type: 'Company' | 'Division' | 'Department' | 'Project' | 'CostCenter';
  parentId?: string;
  currency: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  status: 'Active' | 'Inactive' | 'Archived';
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const FinancialConsolidationServicePage = () => {
  const [rules, setRules] = useState<ConsolidationRule[]>([]);
  const [jobs, setJobs] = useState<ConsolidationJob[]>([]);
  const [entities, setEntities] = useState<FinancialEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'jobs' | 'entities'>('rules');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ConsolidationRule | null>(null);
  const [selectedJob, setSelectedJob] = useState<ConsolidationJob | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<FinancialEntity | null>(null);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterEntityType, setFilterEntityType] = useState<string>('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [creating, setCreating] = useState(false);

  // Form state for rules
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    sourceEntity: '',
    targetEntity: '',
    mappingRules: '',
    consolidationMethod: 'Sum' as ConsolidationRule['consolidationMethod'],
    currencyConversionEnabled: false,
    sourceCurrency: 'USD',
    targetCurrency: 'USD',
    exchangeRate: 1,
    rateDate: '',
    validationRules: ''
  });

  // Form state for jobs
  const [newJob, setNewJob] = useState({
    name: '',
    description: '',
    ruleIds: '',
    scheduleType: 'Manual' as ConsolidationJob['schedule']['type'],
    scheduleTime: '',
    scheduleDayOfWeek: 1,
    scheduleDayOfMonth: 1
  });

  // Form state for entities
  const [newEntity, setNewEntity] = useState({
    name: '',
    type: 'Company' as FinancialEntity['type'],
    parentId: '',
    currency: 'USD',
    fiscalYearStart: '01-01',
    fiscalYearEnd: '12-31',
    metadata: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rulesData, jobsData, entitiesData] = await Promise.all([
        apiService.generic.getAll<ConsolidationRule>('consolidation-rules'),
        apiService.generic.getAll<ConsolidationJob>('consolidation-jobs'),
        apiService.generic.getAll<FinancialEntity>('financial-entities')
      ]);
      setRules(rulesData);
      setJobs(jobsData);
      setEntities(entitiesData);
    } catch (err) {
      setError('Failed to load financial consolidation data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name || !newRule.sourceEntity || !newRule.targetEntity) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const ruleData = {
        ...newRule,
        mappingRules: newRule.mappingRules.split(';').map(rule => {
          const [sourceField, targetField, transformation, defaultValue] = rule.split('|').map(s => s.trim());
          return sourceField && targetField ? {
            sourceField,
            targetField,
            transformation,
            defaultValue
          } : null;
        }).filter(Boolean),
        currencyConversion: {
          enabled: newRule.currencyConversionEnabled,
          sourceCurrency: newRule.sourceCurrency,
          targetCurrency: newRule.targetCurrency,
          exchangeRate: newRule.exchangeRate,
          rateDate: newRule.currencyConversionEnabled ? new Date(newRule.rateDate).toISOString() : new Date().toISOString()
        },
        validationRules: newRule.validationRules.split(';').map(rule => {
          const [field, ruleText, errorMessage] = rule.split('|').map(s => s.trim());
          return field && ruleText ? {
            field,
            rule: ruleText,
            errorMessage: errorMessage || 'Validation failed'
          } : null;
        }).filter(Boolean),
        status: 'Draft' as ConsolidationRule['status'],
        executionCount: 0,
        successCount: 0
      };

      const createdRule = await apiService.generic.create<ConsolidationRule>('consolidation-rules', ruleData);

      setRules(prev => [createdRule, ...prev]);
      setNewRule({
        name: '',
        description: '',
        sourceEntity: '',
        targetEntity: '',
        mappingRules: '',
        consolidationMethod: 'Sum',
        currencyConversionEnabled: false,
        sourceCurrency: 'USD',
        targetCurrency: 'USD',
        exchangeRate: 1,
        rateDate: '',
        validationRules: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create consolidation rule. Please try again.');
      console.error('Error creating rule:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.name || !newJob.ruleIds) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const jobData = {
        ...newJob,
        ruleIds: newJob.ruleIds.split(',').map(id => id.trim()),
        schedule: {
          type: newJob.scheduleType,
          time: newJob.scheduleType !== 'Manual' ? newJob.scheduleTime : undefined,
          dayOfWeek: newJob.scheduleType === 'Weekly' ? newJob.scheduleDayOfWeek : undefined,
          dayOfMonth: newJob.scheduleType === 'Monthly' ? newJob.scheduleDayOfMonth : undefined
        },
        status: 'Pending' as ConsolidationJob['status'],
        progress: 0,
        recordsProcessed: 0,
        recordsFailed: 0,
        output: {
          consolidatedRecords: 0,
          totalValue: 0,
          currency: 'USD'
        }
      };

      const createdJob = await apiService.generic.create<ConsolidationJob>('consolidation-jobs', jobData);

      setJobs(prev => [createdJob, ...prev]);
      setNewJob({
        name: '',
        description: '',
        ruleIds: '',
        scheduleType: 'Manual',
        scheduleTime: '',
        scheduleDayOfWeek: 1,
        scheduleDayOfMonth: 1
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create consolidation job. Please try again.');
      console.error('Error creating job:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity.name || !newEntity.currency) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const entityData = {
        ...newEntity,
        fiscalYearStart: `${new Date().getFullYear()}-${newEntity.fiscalYearStart}`,
        fiscalYearEnd: `${new Date().getFullYear()}-${newEntity.fiscalYearEnd}`,
        metadata: newEntity.metadata.split(';').reduce((acc, item) => {
          const [key, value] = item.split(':').map(s => s.trim());
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
        status: 'Active' as FinancialEntity['status']
      };

      const createdEntity = await apiService.generic.create<FinancialEntity>('financial-entities', entityData);

      setEntities(prev => [createdEntity, ...prev]);
      setNewEntity({
        name: '',
        type: 'Company',
        parentId: '',
        currency: 'USD',
        fiscalYearStart: '01-01',
        fiscalYearEnd: '12-31',
        metadata: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create financial entity. Please try again.');
      console.error('Error creating entity:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateRuleStatus = async (ruleId: string, status: ConsolidationRule['status']) => {
    try {
      setError(null);
      await apiService.generic.update<ConsolidationRule>('consolidation-rules', parseInt(ruleId), { status });
      setRules(prev => prev.map(rule =>
        rule.id === ruleId ? { ...rule, status } : rule
      ));
    } catch (err) {
      setError('Failed to update rule status. Please try again.');
      console.error('Error updating rule:', err);
    }
  };

  const updateJobStatus = async (jobId: string, status: ConsolidationJob['status']) => {
    try {
      setError(null);
      const updateData: Partial<ConsolidationJob> = { status };
      if (status === 'Running' && !jobs.find(j => j.id === jobId)?.startTime) {
        updateData.startTime = new Date().toISOString();
      } else if ((status === 'Completed' || status === 'Failed') && !jobs.find(j => j.id === jobId)?.endTime) {
        updateData.endTime = new Date().toISOString();
      }
      await apiService.generic.update<ConsolidationJob>('consolidation-jobs', parseInt(jobId), updateData);
      setJobs(prev => prev.map(job =>
        job.id === jobId ? { ...job, ...updateData } : job
      ));
    } catch (err) {
      setError('Failed to update job status. Please try again.');
      console.error('Error updating job:', err);
    }
  };

  const updateEntityStatus = async (entityId: string, status: FinancialEntity['status']) => {
    try {
      setError(null);
      await apiService.generic.update<FinancialEntity>('financial-entities', parseInt(entityId), { status });
      setEntities(prev => prev.map(entity =>
        entity.id === entityId ? { ...entity, status } : entity
      ));
    } catch (err) {
      setError('Failed to update entity status. Please try again.');
      console.error('Error updating entity:', err);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this consolidation rule? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('consolidation-rules', parseInt(ruleId));
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
    } catch (err) {
      setError('Failed to delete consolidation rule. Please try again.');
      console.error('Error deleting rule:', err);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this consolidation job? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('consolidation-jobs', parseInt(jobId));
      setJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (err) {
      setError('Failed to delete consolidation job. Please try again.');
      console.error('Error deleting job:', err);
    }
  };

  const deleteEntity = async (entityId: string) => {
    if (!confirm('Are you sure you want to delete this financial entity? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('financial-entities', parseInt(entityId));
      setEntities(prev => prev.filter(entity => entity.id !== entityId));
    } catch (err) {
      setError('Failed to delete financial entity. Please try again.');
      console.error('Error deleting entity:', err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Sum': return 'bg-blue-100 text-blue-800';
      case 'Average': return 'bg-green-100 text-green-800';
      case 'WeightedAverage': return 'bg-purple-100 text-purple-800';
      case 'First': return 'bg-orange-100 text-orange-800';
      case 'Last': return 'bg-red-100 text-red-800';
      case 'Custom': return 'bg-gray-100 text-gray-800';
      case 'Company': return 'bg-indigo-100 text-indigo-800';
      case 'Division': return 'bg-cyan-100 text-cyan-800';
      case 'Department': return 'bg-pink-100 text-pink-800';
      case 'Project': return 'bg-yellow-100 text-yellow-800';
      case 'CostCenter': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Pending': return 'bg-blue-100 text-blue-800';
      case 'Running': return 'bg-orange-100 text-orange-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      case 'Error': return 'bg-red-100 text-red-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScheduleColor = (type: string) => {
    switch (type) {
      case 'Manual': return 'bg-gray-100 text-gray-800';
      case 'Daily': return 'bg-blue-100 text-blue-800';
      case 'Weekly': return 'bg-green-100 text-green-800';
      case 'Monthly': return 'bg-purple-100 text-purple-800';
      case 'Quarterly': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRules = rules.filter(rule => {
    const typeMatch = filterType === 'All' || rule.consolidationMethod === filterType;
    const statusMatch = filterStatus === 'All' || rule.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const filteredJobs = jobs.filter(job => {
    const statusMatch = filterStatus === 'All' || job.status === filterStatus;
    const dateMatch = (!dateRange.start || new Date(job.createdAt) >= new Date(dateRange.start)) &&
                     (!dateRange.end || new Date(job.createdAt) <= new Date(dateRange.end));
    return statusMatch && dateMatch;
  });

  const filteredEntities = entities.filter(entity => {
    const typeMatch = filterEntityType === 'All' || entity.type === filterEntityType;
    const statusMatch = filterStatus === 'All' || entity.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const getStats = () => {
    const totalRules = rules.length;
    const activeRules = rules.filter(r => r.status === 'Active').length;
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'Completed').length;
    const failedJobs = jobs.filter(j => j.status === 'Failed').length;
    const totalEntities = entities.length;
    const activeEntities = entities.filter(e => e.status === 'Active').length;
    const totalValue = jobs.reduce((sum, job) => sum + job.output.totalValue, 0);
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs * 100).toFixed(1) : '0';

    return {
      totalRules,
      activeRules,
      totalJobs,
      completedJobs,
      failedJobs,
      totalEntities,
      activeEntities,
      totalValue,
      successRate
    };
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
      <h1 className="text-3xl font-bold mb-6">Financial Consolidation Service</h1>

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

      {/* Financial Consolidation Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Rules</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalRules}</p>
          <p className="text-sm text-gray-600">{stats.activeRules} active</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Jobs</h3>
          <p className="text-2xl font-bold text-green-600">{stats.totalJobs}</p>
          <p className="text-sm text-gray-600">{stats.completedJobs} completed</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Success Rate</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.successRate}%</p>
          <p className="text-sm text-gray-600">{stats.failedJobs} failed</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Value</h3>
          <p className="text-2xl font-bold text-orange-600">${stats.totalValue.toLocaleString()}</p>
          <p className="text-sm text-gray-600">consolidated</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'rules'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'jobs'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('entities')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'entities'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Entities ({entities.length})
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Consolidation Rules</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Methods</option>
                  <option value="Sum">Sum</option>
                  <option value="Average">Average</option>
                  <option value="WeightedAverage">Weighted Average</option>
                  <option value="First">First</option>
                  <option value="Last">Last</option>
                  <option value="Custom">Custom</option>
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
                  <option value="Draft">Draft</option>
                  <option value="Error">Error</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Rule'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Consolidation Rule</h3>
              <form onSubmit={handleCreateRule} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rule Name *</label>
                    <input
                      type="text"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source Entity *</label>
                    <select
                      value={newRule.sourceEntity}
                      onChange={(e) => setNewRule(prev => ({ ...prev, sourceEntity: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select source entity...</option>
                      {entities.map(entity => (
                        <option key={entity.id} value={entity.id}>{entity.name} ({entity.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Entity *</label>
                    <select
                      value={newRule.targetEntity}
                      onChange={(e) => setNewRule(prev => ({ ...prev, targetEntity: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select target entity...</option>
                      {entities.map(entity => (
                        <option key={entity.id} value={entity.id}>{entity.name} ({entity.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Consolidation Method</label>
                    <select
                      value={newRule.consolidationMethod}
                      onChange={(e) => setNewRule(prev => ({ ...prev, consolidationMethod: e.target.value as ConsolidationRule['consolidationMethod'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Sum">Sum</option>
                      <option value="Average">Average</option>
                      <option value="WeightedAverage">Weighted Average</option>
                      <option value="First">First</option>
                      <option value="Last">Last</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mapping Rules (sourceField|targetField|transformation|defaultValue; ...)</label>
                  <textarea
                    value={newRule.mappingRules}
                    onChange={(e) => setNewRule(prev => ({ ...prev, mappingRules: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="revenue|totalRevenue||0; expenses|totalExpenses||0"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newRule.currencyConversionEnabled}
                      onChange={(e) => setNewRule(prev => ({ ...prev, currencyConversionEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Currency Conversion</span>
                  </label>
                </div>
                {newRule.currencyConversionEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Source Currency</label>
                      <input
                        type="text"
                        value={newRule.sourceCurrency}
                        onChange={(e) => setNewRule(prev => ({ ...prev, sourceCurrency: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="USD"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Target Currency</label>
                      <input
                        type="text"
                        value={newRule.targetCurrency}
                        onChange={(e) => setNewRule(prev => ({ ...prev, targetCurrency: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="EUR"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Exchange Rate</label>
                      <input
                        type="number"
                        value={newRule.exchangeRate}
                        onChange={(e) => setNewRule(prev => ({ ...prev, exchangeRate: parseFloat(e.target.value) || 1 }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        step="0.0001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rate Date</label>
                      <input
                        type="date"
                        value={newRule.rateDate}
                        onChange={(e) => setNewRule(prev => ({ ...prev, rateDate: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Validation Rules (field|rule|errorMessage; ...)</label>
                  <textarea
                    value={newRule.validationRules}
                    onChange={(e) => setNewRule(prev => ({ ...prev, validationRules: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="revenue|value > 0|Revenue must be positive; expenses|value >= 0|Expenses cannot be negative"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Consolidation Rule'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <div key={rule.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{rule.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(rule.consolidationMethod)}`}>
                        {rule.consolidationMethod}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(rule.status)}`}>
                        {rule.status}
                      </span>
                      {rule.currencyConversion.enabled && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                          Currency Conversion
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{rule.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Source: {entities.find(e => e.id === rule.sourceEntity)?.name || rule.sourceEntity}</span>
                      <span>Target: {entities.find(e => e.id === rule.targetEntity)?.name || rule.targetEntity}</span>
                      <span>Executions: {rule.executionCount}</span>
                      <span>Success Rate: {rule.executionCount > 0 ? ((rule.successCount / rule.executionCount) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Mappings: {rule.mappingRules.length}
                      </p>
                      <p className="text-sm text-gray-600">
                        Validations: {rule.validationRules.length}
                      </p>
                      {rule.lastExecuted && (
                        <p className="text-sm text-gray-600">
                          Last Run: {new Date(rule.lastExecuted).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {rule.status === 'Draft' && (
                        <button
                          onClick={() => updateRuleStatus(rule.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      {rule.status === 'Active' && (
                        <button
                          onClick={() => updateRuleStatus(rule.id, 'Inactive')}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRule(selectedRule?.id === rule.id ? null : rule)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedRule?.id === rule.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedRule?.id === rule.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Source Entity</p>
                        <p className="font-semibold">{entities.find(e => e.id === rule.sourceEntity)?.name || rule.sourceEntity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Target Entity</p>
                        <p className="font-semibold">{entities.find(e => e.id === rule.targetEntity)?.name || rule.targetEntity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Execution Count</p>
                        <p className="font-semibold">{rule.executionCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Success Count</p>
                        <p className="font-semibold">{rule.successCount}</p>
                      </div>
                    </div>

                    {rule.currencyConversion.enabled && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">Source Currency</p>
                          <p className="font-semibold">{rule.currencyConversion.sourceCurrency}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Target Currency</p>
                          <p className="font-semibold">{rule.currencyConversion.targetCurrency}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Exchange Rate</p>
                          <p className="font-semibold">{rule.currencyConversion.exchangeRate}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Rate Date</p>
                          <p className="font-semibold">{new Date(rule.currencyConversion.rateDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}

                    {rule.mappingRules.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Mapping Rules ({rule.mappingRules.length})</h4>
                        <div className="space-y-3">
                          {rule.mappingRules.map((mapping, index) => (
                            <div key={index} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium">{mapping.sourceField} → {mapping.targetField}</h5>
                                {mapping.transformation && (
                                  <span className="text-sm text-gray-600">Transform: {mapping.transformation}</span>
                                )}
                              </div>
                              {mapping.defaultValue && (
                                <p className="text-sm text-gray-600">Default: {mapping.defaultValue}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rule.validationRules.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Validation Rules ({rule.validationRules.length})</h4>
                        <div className="space-y-3">
                          {rule.validationRules.map((validation, index) => (
                            <div key={index} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium">{validation.field}</h5>
                                <span className="text-sm text-gray-600">{validation.rule}</span>
                              </div>
                              <p className="text-sm text-red-600">{validation.errorMessage}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(rule.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(rule.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredRules.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterType === 'All' && filterStatus === 'All'
                  ? 'No consolidation rules found. Create your first rule to get started.'
                  : 'No consolidation rules match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Consolidation Jobs</h2>
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
                  <option value="Running">Running</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Consolidation Job</h3>
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Job Name *</label>
                    <input
                      type="text"
                      value={newJob.name}
                      onChange={(e) => setNewJob(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Schedule Type</label>
                    <select
                      value={newJob.scheduleType}
                      onChange={(e) => setNewJob(prev => ({ ...prev, scheduleType: e.target.value as ConsolidationJob['schedule']['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Manual">Manual</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newJob.description}
                    onChange={(e) => setNewJob(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rule IDs (comma-separated) *</label>
                  <input
                    type="text"
                    value={newJob.ruleIds}
                    onChange={(e) => setNewJob(prev => ({ ...prev, ruleIds: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="rule1,rule2,rule3"
                    required
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Available rules: {rules.filter(r => r.status === 'Active').map(r => r.name).join(', ')}
                  </p>
                </div>
                {newJob.scheduleType !== 'Manual' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Schedule Time</label>
                      <input
                        type="time"
                        value={newJob.scheduleTime}
                        onChange={(e) => setNewJob(prev => ({ ...prev, scheduleTime: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    {newJob.scheduleType === 'Weekly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Day of Week</label>
                        <select
                          value={newJob.scheduleDayOfWeek}
                          onChange={(e) => setNewJob(prev => ({ ...prev, scheduleDayOfWeek: parseInt(e.target.value) }))}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                          <option value={0}>Sunday</option>
                        </select>
                      </div>
                    )}
                    {newJob.scheduleType === 'Monthly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Day of Month</label>
                        <input
                          type="number"
                          value={newJob.scheduleDayOfMonth}
                          onChange={(e) => setNewJob(prev => ({ ...prev, scheduleDayOfMonth: parseInt(e.target.value) }))}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          min="1"
                          max="31"
                        />
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Consolidation Job'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{job.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getScheduleColor(job.schedule.type)}`}>
                        {job.schedule.type}
                      </span>
                    </div>
                    <p className="text-gray-600">{job.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Rules: {job.ruleIds.length}</span>
                      <span>Progress: {job.progress}%</span>
                      <span>Records: {job.recordsProcessed} processed, {job.recordsFailed} failed</span>
                      <span>Value: ${job.output.totalValue.toLocaleString()} {job.output.currency}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      {job.startTime && (
                        <p className="text-sm text-gray-600">
                          Started: {new Date(job.startTime).toLocaleString()}
                        </p>
                      )}
                      {job.endTime && (
                        <p className="text-sm text-gray-600">
                          Ended: {new Date(job.endTime).toLocaleString()}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Consolidated: {job.output.consolidatedRecords}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {job.status === 'Pending' && (
                        <button
                          onClick={() => updateJobStatus(job.id, 'Running')}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Start
                        </button>
                      )}
                      {job.status === 'Running' && (
                        <button
                          onClick={() => updateJobStatus(job.id, 'Completed')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Complete
                        </button>
                      )}
                      {(job.status === 'Running' || job.status === 'Pending') && (
                        <button
                          onClick={() => updateJobStatus(job.id, 'Cancelled')}
                          className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedJob?.id === job.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteJob(job.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedJob?.id === job.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Schedule Type</p>
                        <p className="font-semibold">{job.schedule.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Progress</p>
                        <p className="font-semibold">{job.progress}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Records Processed</p>
                        <p className="font-semibold">{job.recordsProcessed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Records Failed</p>
                        <p className="font-semibold">{job.recordsFailed}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Consolidated Records</p>
                        <p className="font-semibold">{job.output.consolidatedRecords}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Value</p>
                        <p className="font-semibold">${job.output.totalValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Currency</p>
                        <p className="font-semibold">{job.output.currency}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Report</p>
                        <p className="font-semibold">
                          {job.output.reportUrl ? (
                            <a href={job.output.reportUrl} className="text-blue-600 hover:text-blue-800">
                              Download
                            </a>
                          ) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {job.schedule.type !== 'Manual' && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">Schedule Time</p>
                          <p className="font-semibold">{job.schedule.time || 'N/A'}</p>
                        </div>
                        {job.schedule.dayOfWeek !== undefined && (
                          <div>
                            <p className="text-sm text-gray-600">Day of Week</p>
                            <p className="font-semibold">
                              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][job.schedule.dayOfWeek]}
                            </p>
                          </div>
                        )}
                        {job.schedule.dayOfMonth && (
                          <div>
                            <p className="text-sm text-gray-600">Day of Month</p>
                            <p className="font-semibold">{job.schedule.dayOfMonth}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {job.errorMessage && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-2">Error Message</h4>
                        <div className="bg-red-50 p-4 rounded border border-red-200">
                          <p className="text-red-700">{job.errorMessage}</p>
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <h4 className="text-md font-medium mb-4">Applied Rules ({job.ruleIds.length})</h4>
                      <div className="space-y-2">
                        {job.ruleIds.map((ruleId) => {
                          const rule = rules.find(r => r.id === ruleId);
                          return (
                            <div key={ruleId} className="flex justify-between items-center bg-white p-3 rounded border">
                              <div className="flex-1">
                                <p className="font-medium">{rule?.name || `Rule ${ruleId}`}</p>
                                <p className="text-sm text-gray-600">{rule?.description}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(rule?.consolidationMethod || 'Custom')}`}>
                                {rule?.consolidationMethod || 'Unknown'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(job.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(job.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterStatus === 'All'
                  ? 'No consolidation jobs found. Create your first job to get started.'
                  : 'No consolidation jobs match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Entities Tab */}
      {activeTab === 'entities' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Financial Entities</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterEntityType}
                  onChange={(e) => setFilterEntityType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Types</option>
                  <option value="Company">Company</option>
                  <option value="Division">Division</option>
                  <option value="Department">Department</option>
                  <option value="Project">Project</option>
                  <option value="CostCenter">Cost Center</option>
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
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Entity'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Financial Entity</h3>
              <form onSubmit={handleCreateEntity} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Entity Name *</label>
                    <input
                      type="text"
                      value={newEntity.name}
                      onChange={(e) => setNewEntity(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newEntity.type}
                      onChange={(e) => setNewEntity(prev => ({ ...prev, type: e.target.value as FinancialEntity['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Company">Company</option>
                      <option value="Division">Division</option>
                      <option value="Department">Department</option>
                      <option value="Project">Project</option>
                      <option value="CostCenter">Cost Center</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Parent Entity</label>
                    <select
                      value={newEntity.parentId}
                      onChange={(e) => setNewEntity(prev => ({ ...prev, parentId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">No Parent</option>
                      {entities.map(entity => (
                        <option key={entity.id} value={entity.id}>{entity.name} ({entity.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency *</label>
                    <input
                      type="text"
                      value={newEntity.currency}
                      onChange={(e) => setNewEntity(prev => ({ ...prev, currency: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="USD"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fiscal Year Start</label>
                    <input
                      type="text"
                      value={newEntity.fiscalYearStart}
                      onChange={(e) => setNewEntity(prev => ({ ...prev, fiscalYearStart: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="01-01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fiscal Year End</label>
                    <input
                      type="text"
                      value={newEntity.fiscalYearEnd}
                      onChange={(e) => setNewEntity(prev => ({ ...prev, fiscalYearEnd: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="12-31"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Metadata (key:value; ...)</label>
                  <textarea
                    value={newEntity.metadata}
                    onChange={(e) => setNewEntity(prev => ({ ...prev, metadata: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="industry:technology; region:north-america; size:enterprise"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add Financial Entity'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredEntities.map((entity) => (
              <div key={entity.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{entity.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(entity.type)}`}>
                        {entity.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(entity.status)}`}>
                        {entity.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Currency: {entity.currency}</span>
                      <span>Fiscal Year: {entity.fiscalYearStart} - {entity.fiscalYearEnd}</span>
                      {entity.parentId && (
                        <span>Parent: {entities.find(e => e.id === entity.parentId)?.name || entity.parentId}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Metadata: {Object.keys(entity.metadata).length} fields
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {entity.status !== 'Active' && entity.status !== 'Archived' && (
                        <button
                          onClick={() => updateEntityStatus(entity.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedEntity(selectedEntity?.id === entity.id ? null : entity)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedEntity?.id === entity.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteEntity(entity.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedEntity?.id === entity.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Entity Type</p>
                        <p className="font-semibold">{entity.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Currency</p>
                        <p className="font-semibold">{entity.currency}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fiscal Year Start</p>
                        <p className="font-semibold">{entity.fiscalYearStart}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fiscal Year End</p>
                        <p className="font-semibold">{entity.fiscalYearEnd}</p>
                      </div>
                    </div>

                    {entity.parentId && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">Parent Entity</p>
                          <p className="font-semibold">{entities.find(e => e.id === entity.parentId)?.name || entity.parentId}</p>
                        </div>
                      </div>
                    )}

                    {Object.keys(entity.metadata).length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Metadata ({Object.keys(entity.metadata).length} fields)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {Object.entries(entity.metadata).map(([key, value]) => (
                            <div key={key} className="bg-white p-3 rounded border">
                              <p className="text-sm font-medium text-gray-700">{key}</p>
                              <p className="text-sm text-gray-600">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(entity.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(entity.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredEntities.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterEntityType === 'All' && filterStatus === 'All'
                  ? 'No financial entities found. Add your first entity to get started.'
                  : 'No financial entities match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancialConsolidationServicePage;
