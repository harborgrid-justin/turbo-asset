import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface Message {
  id: string;
  messageId: string;
  correlationId?: string;
  messageType: 'Command' | 'Event' | 'Query' | 'Response';
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  source: string;
  destination: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'DeadLetter';
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  retryCount: number;
  maxRetries: number;
  scheduledTime?: string;
  processedTime?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface Endpoint {
  id: string;
  name: string;
  url: string;
  type: 'REST' | 'SOAP' | 'GraphQL' | 'MessageQueue' | 'WebSocket';
  protocol: 'HTTP' | 'HTTPS' | 'AMQP' | 'MQTT' | 'WebSocket';
  authentication: {
    type: 'None' | 'Basic' | 'Bearer' | 'APIKey' | 'OAuth2';
    credentials?: Record<string, unknown>;
  };
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Error';
  healthCheck: {
    enabled: boolean;
    interval: number; // seconds
    timeout: number; // seconds
    lastCheck?: string;
    status: 'Healthy' | 'Unhealthy' | 'Unknown';
  };
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
  };
  transformationRules: {
    id: string;
    name: string;
    type: 'Mapping' | 'Filter' | 'Enrichment' | 'Validation';
    rule: string;
    enabled: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'Message' | 'Schedule' | 'Event' | 'API';
    condition: string;
  };
  steps: {
    id: string;
    name: string;
    type: 'Transform' | 'Route' | 'Enrich' | 'Validate' | 'Send' | 'Wait';
    config: Record<string, unknown>;
    order: number;
    enabled: boolean;
  }[];
  status: 'Active' | 'Inactive' | 'Draft' | 'Error';
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number; // milliseconds
  lastExecuted?: string;
  createdAt: string;
  updatedAt: string;
}

const EnterpriseServiceBusServicePage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'endpoints' | 'workflows'>('messages');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterProtocol, setFilterProtocol] = useState<string>('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [creating, setCreating] = useState(false);

  // Form state for messages
  const [newMessage, setNewMessage] = useState({
    messageId: '',
    correlationId: '',
    messageType: 'Event' as Message['messageType'],
    payload: '',
    headers: '',
    source: '',
    destination: '',
    priority: 'Normal' as Message['priority'],
    maxRetries: 3,
    scheduledTime: ''
  });

  // Form state for endpoints
  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    url: '',
    type: 'REST' as Endpoint['type'],
    protocol: 'HTTPS' as Endpoint['protocol'],
    authenticationType: 'None' as Endpoint['authentication']['type'],
    healthCheckEnabled: true,
    healthCheckInterval: 60,
    healthCheckTimeout: 30,
    rateLimitEnabled: false,
    requestsPerMinute: 1000,
    burstLimit: 100,
    transformationRules: ''
  });

  // Form state for workflows
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    triggerType: 'Message' as Workflow['trigger']['type'],
    triggerCondition: '',
    steps: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [messagesData, endpointsData, workflowsData] = await Promise.all([
        apiService.generic.getAll<Message>('esb-messages'),
        apiService.generic.getAll<Endpoint>('esb-endpoints'),
        apiService.generic.getAll<Workflow>('esb-workflows')
      ]);
      setMessages(messagesData);
      setEndpoints(endpointsData);
      setWorkflows(workflowsData);
    } catch (err) {
      setError('Failed to load ESB data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.messageId || !newMessage.source || !newMessage.destination) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const messageData = {
        ...newMessage,
        payload: JSON.parse(newMessage.payload || '{}'),
        headers: newMessage.headers.split(';').reduce((acc, header) => {
          const [key, value] = header.split(':').map(s => s.trim());
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
        retryCount: 0,
        status: 'Pending' as Message['status'],
        scheduledTime: newMessage.scheduledTime ? new Date(newMessage.scheduledTime).toISOString() : undefined
      };

      const createdMessage = await apiService.generic.create<Message>('esb-messages', messageData);

      setMessages(prev => [createdMessage, ...prev]);
      setNewMessage({
        messageId: '',
        correlationId: '',
        messageType: 'Event',
        payload: '',
        headers: '',
        source: '',
        destination: '',
        priority: 'Normal',
        maxRetries: 3,
        scheduledTime: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create message. Please try again.');
      console.error('Error creating message:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEndpoint.name || !newEndpoint.url) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const endpointData = {
        ...newEndpoint,
        authentication: {
          type: newEndpoint.authenticationType,
          credentials: newEndpoint.authenticationType !== 'None' ? {} : undefined
        },
        healthCheck: {
          enabled: newEndpoint.healthCheckEnabled,
          interval: newEndpoint.healthCheckInterval,
          timeout: newEndpoint.healthCheckTimeout,
          status: 'Unknown' as const
        },
        rateLimit: {
          enabled: newEndpoint.rateLimitEnabled,
          requestsPerMinute: newEndpoint.requestsPerMinute,
          burstLimit: newEndpoint.burstLimit
        },
        transformationRules: newEndpoint.transformationRules.split(';').map(rule => {
          const [name, type, ruleText] = rule.split('|').map(s => s.trim());
          return name && type && ruleText ? {
            name,
            type: type as Endpoint['transformationRules'][0]['type'],
            rule: ruleText,
            enabled: true
          } : null;
        }).filter(Boolean),
        status: 'Active' as Endpoint['status']
      };

      const createdEndpoint = await apiService.generic.create<Endpoint>('esb-endpoints', endpointData);

      setEndpoints(prev => [createdEndpoint, ...prev]);
      setNewEndpoint({
        name: '',
        url: '',
        type: 'REST',
        protocol: 'HTTPS',
        authenticationType: 'None',
        healthCheckEnabled: true,
        healthCheckInterval: 60,
        healthCheckTimeout: 30,
        rateLimitEnabled: false,
        requestsPerMinute: 1000,
        burstLimit: 100,
        transformationRules: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create endpoint. Please try again.');
      console.error('Error creating endpoint:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflow.name || !newWorkflow.triggerCondition) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const workflowData = {
        ...newWorkflow,
        trigger: {
          type: newWorkflow.triggerType,
          condition: newWorkflow.triggerCondition
        },
        steps: newWorkflow.steps.split(';').map((step, index) => {
          const [name, type, config] = step.split('|').map(s => s.trim());
          return name && type ? {
            name,
            type: type as Workflow['steps'][0]['type'],
            config: config ? JSON.parse(config) : {},
            order: index + 1,
            enabled: true
          } : null;
        }).filter(Boolean),
        status: 'Draft' as Workflow['status'],
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageExecutionTime: 0
      };

      const createdWorkflow = await apiService.generic.create<Workflow>('esb-workflows', workflowData);

      setWorkflows(prev => [createdWorkflow, ...prev]);
      setNewWorkflow({
        name: '',
        description: '',
        triggerType: 'Message',
        triggerCondition: '',
        steps: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create workflow. Please try again.');
      console.error('Error creating workflow:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: Message['status']) => {
    try {
      setError(null);
      const updateData: Partial<Message> = { status };
      if (status === 'Processing' && !messages.find(m => m.id === messageId)?.processedTime) {
        updateData.processedTime = new Date().toISOString();
      }
      await apiService.generic.update<Message>('esb-messages', parseInt(messageId), updateData);
      setMessages(prev => prev.map(message =>
        message.id === messageId ? { ...message, ...updateData } : message
      ));
    } catch (err) {
      setError('Failed to update message status. Please try again.');
      console.error('Error updating message:', err);
    }
  };

  const updateEndpointStatus = async (endpointId: string, status: Endpoint['status']) => {
    try {
      setError(null);
      await apiService.generic.update<Endpoint>('esb-endpoints', parseInt(endpointId), { status });
      setEndpoints(prev => prev.map(endpoint =>
        endpoint.id === endpointId ? { ...endpoint, status } : endpoint
      ));
    } catch (err) {
      setError('Failed to update endpoint status. Please try again.');
      console.error('Error updating endpoint:', err);
    }
  };

  const updateWorkflowStatus = async (workflowId: string, status: Workflow['status']) => {
    try {
      setError(null);
      await apiService.generic.update<Workflow>('esb-workflows', parseInt(workflowId), { status });
      setWorkflows(prev => prev.map(workflow =>
        workflow.id === workflowId ? { ...workflow, status } : workflow
      ));
    } catch (err) {
      setError('Failed to update workflow status. Please try again.');
      console.error('Error updating workflow:', err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('esb-messages', parseInt(messageId));
      setMessages(prev => prev.filter(message => message.id !== messageId));
    } catch (err) {
      setError('Failed to delete message. Please try again.');
      console.error('Error deleting message:', err);
    }
  };

  const deleteEndpoint = async (endpointId: string) => {
    if (!confirm('Are you sure you want to delete this endpoint? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('esb-endpoints', parseInt(endpointId));
      setEndpoints(prev => prev.filter(endpoint => endpoint.id !== endpointId));
    } catch (err) {
      setError('Failed to delete endpoint. Please try again.');
      console.error('Error deleting endpoint:', err);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('esb-workflows', parseInt(workflowId));
      setWorkflows(prev => prev.filter(workflow => workflow.id !== workflowId));
    } catch (err) {
      setError('Failed to delete workflow. Please try again.');
      console.error('Error deleting workflow:', err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Command': return 'bg-blue-100 text-blue-800';
      case 'Event': return 'bg-green-100 text-green-800';
      case 'Query': return 'bg-purple-100 text-purple-800';
      case 'Response': return 'bg-orange-100 text-orange-800';
      case 'REST': return 'bg-cyan-100 text-cyan-800';
      case 'SOAP': return 'bg-indigo-100 text-indigo-800';
      case 'GraphQL': return 'bg-pink-100 text-pink-800';
      case 'MessageQueue': return 'bg-yellow-100 text-yellow-800';
      case 'WebSocket': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Processing': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'DeadLetter': return 'bg-red-100 text-red-800';
      case 'Maintenance': return 'bg-orange-100 text-orange-800';
      case 'Error': return 'bg-red-100 text-red-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Healthy': return 'bg-green-100 text-green-800';
      case 'Unhealthy': return 'bg-red-100 text-red-800';
      case 'Unknown': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case 'HTTP': return 'bg-blue-100 text-blue-800';
      case 'HTTPS': return 'bg-green-100 text-green-800';
      case 'AMQP': return 'bg-purple-100 text-purple-800';
      case 'MQTT': return 'bg-orange-100 text-orange-800';
      case 'WebSocket': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Normal': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMessages = messages.filter(message => {
    const typeMatch = filterType === 'All' || message.messageType === filterType;
    const statusMatch = filterStatus === 'All' || message.status === filterStatus;
    const dateMatch = (!dateRange.start || new Date(message.createdAt) >= new Date(dateRange.start)) &&
                     (!dateRange.end || new Date(message.createdAt) <= new Date(dateRange.end));
    return typeMatch && statusMatch && dateMatch;
  });

  const filteredEndpoints = endpoints.filter(endpoint => {
    const typeMatch = filterType === 'All' || endpoint.type === filterType;
    const protocolMatch = filterProtocol === 'All' || endpoint.protocol === filterProtocol;
    const statusMatch = filterStatus === 'All' || endpoint.status === filterStatus;
    return typeMatch && protocolMatch && statusMatch;
  });

  const filteredWorkflows = workflows.filter(workflow => {
    const statusMatch = filterStatus === 'All' || workflow.status === filterStatus;
    return statusMatch;
  });

  const getStats = () => {
    const totalMessages = messages.length;
    const pendingMessages = messages.filter(m => m.status === 'Pending').length;
    const processingMessages = messages.filter(m => m.status === 'Processing').length;
    const failedMessages = messages.filter(m => m.status === 'Failed').length;
    const totalEndpoints = endpoints.length;
    const activeEndpoints = endpoints.filter(e => e.status === 'Active').length;
    const healthyEndpoints = endpoints.filter(e => e.healthCheck.status === 'Healthy').length;
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter(w => w.status === 'Active').length;
    const totalExecutions = workflows.reduce((sum, w) => sum + w.executionCount, 0);
    const successRate = totalExecutions > 0
      ? (workflows.reduce((sum, w) => sum + w.successCount, 0) / totalExecutions * 100).toFixed(1)
      : '0';

    return {
      totalMessages,
      pendingMessages,
      processingMessages,
      failedMessages,
      totalEndpoints,
      activeEndpoints,
      healthyEndpoints,
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
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
      <h1 className="text-3xl font-bold mb-6">Enterprise Service Bus Service</h1>

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

      {/* ESB Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Messages</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalMessages}</p>
          <p className="text-sm text-gray-600">{stats.pendingMessages} pending</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active Endpoints</h3>
          <p className="text-2xl font-bold text-green-600">{stats.activeEndpoints}</p>
          <p className="text-sm text-gray-600">{stats.healthyEndpoints} healthy</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active Workflows</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.activeWorkflows}</p>
          <p className="text-sm text-gray-600">{stats.totalWorkflows} total</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Success Rate</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.successRate}%</p>
          <p className="text-sm text-gray-600">{stats.totalExecutions} executions</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'messages'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Messages ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'endpoints'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Endpoints ({endpoints.length})
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'workflows'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Workflows ({workflows.length})
        </button>
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Messages</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Types</option>
                  <option value="Command">Command</option>
                  <option value="Event">Event</option>
                  <option value="Query">Query</option>
                  <option value="Response">Response</option>
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
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                  <option value="DeadLetter">Dead Letter</option>
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
                  {showCreateForm ? 'Cancel' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Send New Message</h3>
              <form onSubmit={handleCreateMessage} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message ID *</label>
                    <input
                      type="text"
                      value={newMessage.messageId}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, messageId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Correlation ID</label>
                    <input
                      type="text"
                      value={newMessage.correlationId}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, correlationId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source *</label>
                    <input
                      type="text"
                      value={newMessage.source}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, source: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Destination *</label>
                    <input
                      type="text"
                      value={newMessage.destination}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, destination: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message Type</label>
                    <select
                      value={newMessage.messageType}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, messageType: e.target.value as Message['messageType'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Command">Command</option>
                      <option value="Event">Event</option>
                      <option value="Query">Query</option>
                      <option value="Response">Response</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={newMessage.priority}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, priority: e.target.value as Message['priority'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Retries</label>
                    <input
                      type="number"
                      value={newMessage.maxRetries}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 3 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Scheduled Time</label>
                    <input
                      type="datetime-local"
                      value={newMessage.scheduledTime}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Headers (key:value; ...)</label>
                  <input
                    type="text"
                    value={newMessage.headers}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, headers: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Content-Type:application/json; Authorization:Bearer token"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payload (JSON)</label>
                  <textarea
                    value={newMessage.payload}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, payload: e.target.value }))}
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder='{"action": "create", "data": {...}}'
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <div key={message.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{message.messageId}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(message.messageType)}`}>
                        {message.messageType}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(message.priority)}`}>
                        {message.priority}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      {message.source} → {message.destination}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Correlation: {message.correlationId || 'N/A'}</span>
                      <span>Retries: {message.retryCount}/{message.maxRetries}</span>
                      {message.scheduledTime && (
                        <span>Scheduled: {new Date(message.scheduledTime).toLocaleString()}</span>
                      )}
                      {message.processedTime && (
                        <span>Processed: {new Date(message.processedTime).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      {message.errorMessage && (
                        <p className="text-sm text-red-600 font-semibold">
                          Error
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Headers: {Object.keys(message.headers).length}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {message.status === 'Pending' && (
                        <button
                          onClick={() => updateMessageStatus(message.id, 'Processing')}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Process
                        </button>
                      )}
                      {message.status === 'Processing' && (
                        <button
                          onClick={() => updateMessageStatus(message.id, 'Completed')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Complete
                        </button>
                      )}
                      {(message.status === 'Processing' || message.status === 'Failed') && (
                        <button
                          onClick={() => updateMessageStatus(message.id, 'Failed')}
                          className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Fail
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedMessage(selectedMessage?.id === message.id ? null : message)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedMessage?.id === message.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedMessage?.id === message.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Message ID</p>
                        <p className="font-semibold">{message.messageId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Correlation ID</p>
                        <p className="font-semibold">{message.correlationId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Retry Count</p>
                        <p className="font-semibold">{message.retryCount}/{message.maxRetries}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Created</p>
                        <p className="font-semibold">{new Date(message.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {Object.keys(message.headers).length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Headers ({Object.keys(message.headers).length})</h4>
                        <div className="bg-white p-4 rounded border">
                          <pre className="text-sm text-gray-700">
                            {JSON.stringify(message.headers, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {message.payload && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Payload</h4>
                        <div className="bg-white p-4 rounded border">
                          <pre className="text-sm text-gray-700">
                            {JSON.stringify(message.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {message.errorMessage && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Error Message</h4>
                        <div className="bg-red-50 p-4 rounded border border-red-200">
                          <p className="text-red-700">{message.errorMessage}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(message.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(message.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredMessages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterType === 'All' && filterStatus === 'All'
                  ? 'No messages found. Send your first message to get started.'
                  : 'No messages match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Endpoints Tab */}
      {activeTab === 'endpoints' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Endpoints</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Types</option>
                  <option value="REST">REST</option>
                  <option value="SOAP">SOAP</option>
                  <option value="GraphQL">GraphQL</option>
                  <option value="MessageQueue">Message Queue</option>
                  <option value="WebSocket">WebSocket</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Protocol</label>
                <select
                  value={filterProtocol}
                  onChange={(e) => setFilterProtocol(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Protocols</option>
                  <option value="HTTP">HTTP</option>
                  <option value="HTTPS">HTTPS</option>
                  <option value="AMQP">AMQP</option>
                  <option value="MQTT">MQTT</option>
                  <option value="WebSocket">WebSocket</option>
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
                  <option value="Error">Error</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Endpoint'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Endpoint</h3>
              <form onSubmit={handleCreateEndpoint} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Endpoint Name *</label>
                    <input
                      type="text"
                      value={newEndpoint.name}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">URL *</label>
                    <input
                      type="url"
                      value={newEndpoint.url}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, url: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newEndpoint.type}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, type: e.target.value as Endpoint['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="REST">REST</option>
                      <option value="SOAP">SOAP</option>
                      <option value="GraphQL">GraphQL</option>
                      <option value="MessageQueue">Message Queue</option>
                      <option value="WebSocket">WebSocket</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Protocol</label>
                    <select
                      value={newEndpoint.protocol}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, protocol: e.target.value as Endpoint['protocol'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="HTTP">HTTP</option>
                      <option value="HTTPS">HTTPS</option>
                      <option value="AMQP">AMQP</option>
                      <option value="MQTT">MQTT</option>
                      <option value="WebSocket">WebSocket</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Authentication</label>
                    <select
                      value={newEndpoint.authenticationType}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, authenticationType: e.target.value as Endpoint['authentication']['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="None">None</option>
                      <option value="Basic">Basic</option>
                      <option value="Bearer">Bearer</option>
                      <option value="APIKey">API Key</option>
                      <option value="OAuth2">OAuth2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Health Check Interval (sec)</label>
                    <input
                      type="number"
                      value={newEndpoint.healthCheckInterval}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, healthCheckInterval: parseInt(e.target.value) || 60 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Health Check Timeout (sec)</label>
                    <input
                      type="number"
                      value={newEndpoint.healthCheckTimeout}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, healthCheckTimeout: parseInt(e.target.value) || 30 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Requests/Minute</label>
                    <input
                      type="number"
                      value={newEndpoint.requestsPerMinute}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, requestsPerMinute: parseInt(e.target.value) || 1000 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newEndpoint.healthCheckEnabled}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, healthCheckEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Health Check</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newEndpoint.rateLimitEnabled}
                      onChange={(e) => setNewEndpoint(prev => ({ ...prev, rateLimitEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Rate Limiting</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Transformation Rules (name|type|rule; ...)</label>
                  <textarea
                    value={newEndpoint.transformationRules}
                    onChange={(e) => setNewEndpoint(prev => ({ ...prev, transformationRules: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="AddTimestamp|Enrichment|add timestamp field; ValidateSchema|Validation|check required fields"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add Endpoint'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{endpoint.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(endpoint.type)}`}>
                        {endpoint.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getProtocolColor(endpoint.protocol)}`}>
                        {endpoint.protocol}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(endpoint.status)}`}>
                        {endpoint.status}
                      </span>
                      {endpoint.healthCheck.enabled && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(endpoint.healthCheck.status)}`}>
                          {endpoint.healthCheck.status}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 font-mono text-sm">{endpoint.url}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Auth: {endpoint.authentication.type}</span>
                      {endpoint.healthCheck.enabled && (
                        <span>Health Check: {endpoint.healthCheck.interval}s</span>
                      )}
                      {endpoint.rateLimit.enabled && (
                        <span>Rate Limit: {endpoint.rateLimit.requestsPerMinute}/min</span>
                      )}
                      <span>Rules: {endpoint.transformationRules.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      {endpoint.healthCheck.lastCheck && (
                        <p className="text-sm text-gray-600">
                          Last Check: {new Date(endpoint.healthCheck.lastCheck).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {endpoint.status !== 'Active' && endpoint.status !== 'Error' && (
                        <button
                          onClick={() => updateEndpointStatus(endpoint.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedEndpoint(selectedEndpoint?.id === endpoint.id ? null : endpoint)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedEndpoint?.id === endpoint.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteEndpoint(endpoint.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedEndpoint?.id === endpoint.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Authentication</p>
                        <p className="font-semibold">{endpoint.authentication.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Health Check</p>
                        <p className="font-semibold">
                          {endpoint.healthCheck.enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Rate Limiting</p>
                        <p className="font-semibold">
                          {endpoint.rateLimit.enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Transformation Rules</p>
                        <p className="font-semibold">{endpoint.transformationRules.length}</p>
                      </div>
                    </div>

                    {endpoint.healthCheck.enabled && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">Check Interval</p>
                          <p className="font-semibold">{endpoint.healthCheck.interval}s</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Timeout</p>
                          <p className="font-semibold">{endpoint.healthCheck.timeout}s</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Last Check</p>
                          <p className="font-semibold">
                            {endpoint.healthCheck.lastCheck
                              ? new Date(endpoint.healthCheck.lastCheck).toLocaleString()
                              : 'Never'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <p className="font-semibold">{endpoint.healthCheck.status}</p>
                        </div>
                      </div>
                    )}

                    {endpoint.rateLimit.enabled && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">Requests/Minute</p>
                          <p className="font-semibold">{endpoint.rateLimit.requestsPerMinute}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Burst Limit</p>
                          <p className="font-semibold">{endpoint.rateLimit.burstLimit}</p>
                        </div>
                      </div>
                    )}

                    {endpoint.transformationRules.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Transformation Rules ({endpoint.transformationRules.length})</h4>
                        <div className="space-y-3">
                          {endpoint.transformationRules.map((rule, index) => (
                            <div key={index} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium">{rule.name}</h5>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(rule.type)}`}>
                                    {rule.type}
                                  </span>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                    rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {rule.enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-gray-700 text-sm">{rule.rule}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(endpoint.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(endpoint.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredEndpoints.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterType === 'All' && filterProtocol === 'All' && filterStatus === 'All'
                  ? 'No endpoints found. Add your first endpoint to get started.'
                  : 'No endpoints match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Workflows</h2>
            <div className="flex space-x-4">
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
                  {showCreateForm ? 'Cancel' : 'Create Workflow'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Workflow</h3>
              <form onSubmit={handleCreateWorkflow} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Workflow Name *</label>
                    <input
                      type="text"
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Trigger Type</label>
                    <select
                      value={newWorkflow.triggerType}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, triggerType: e.target.value as Workflow['trigger']['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Message">Message</option>
                      <option value="Schedule">Schedule</option>
                      <option value="Event">Event</option>
                      <option value="API">API</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trigger Condition *</label>
                  <input
                    type="text"
                    value={newWorkflow.triggerCondition}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, triggerCondition: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="message.type == 'OrderCreated' or schedule.cron == '0 0 * * *'"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Workflow Steps (name|type|config; ...)</label>
                  <textarea
                    value={newWorkflow.steps}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, steps: e.target.value }))}
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder='Validate Order|Validate|{"schema": "order"}; Process Payment|Send|{"endpoint": "payment-service"}; Send Confirmation|Send|{"endpoint": "email-service"}'
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Workflow'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredWorkflows.map((workflow) => (
              <div key={workflow.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{workflow.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(workflow.status)}`}>
                        {workflow.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(workflow.trigger.type)}`}>
                        {workflow.trigger.type}
                      </span>
                    </div>
                    <p className="text-gray-600">{workflow.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Trigger: {workflow.trigger.condition}</span>
                      <span>Steps: {workflow.steps.length}</span>
                      <span>Executions: {workflow.executionCount}</span>
                      <span>Success Rate: {workflow.executionCount > 0 ? ((workflow.successCount / workflow.executionCount) * 100).toFixed(1) : 0}%</span>
                      <span>Avg Time: {workflow.averageExecutionTime}ms</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      {workflow.lastExecuted && (
                        <p className="text-sm text-gray-600">
                          Last Run: {new Date(workflow.lastExecuted).toLocaleString()}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Failures: {workflow.failureCount}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {workflow.status === 'Draft' && (
                        <button
                          onClick={() => updateWorkflowStatus(workflow.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      {workflow.status === 'Active' && (
                        <button
                          onClick={() => updateWorkflowStatus(workflow.id, 'Inactive')}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedWorkflow(selectedWorkflow?.id === workflow.id ? null : workflow)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedWorkflow?.id === workflow.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedWorkflow?.id === workflow.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Trigger Type</p>
                        <p className="font-semibold">{workflow.trigger.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Trigger Condition</p>
                        <p className="font-semibold">{workflow.trigger.condition}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Executions</p>
                        <p className="font-semibold">{workflow.executionCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Average Execution Time</p>
                        <p className="font-semibold">{workflow.averageExecutionTime}ms</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Success Count</p>
                        <p className="font-semibold text-green-600">{workflow.successCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Failure Count</p>
                        <p className="font-semibold text-red-600">{workflow.failureCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="font-semibold">
                          {workflow.executionCount > 0 ? ((workflow.successCount / workflow.executionCount) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Executed</p>
                        <p className="font-semibold">
                          {workflow.lastExecuted ? new Date(workflow.lastExecuted).toLocaleString() : 'Never'}
                        </p>
                      </div>
                    </div>

                    {workflow.steps.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Workflow Steps ({workflow.steps.length})</h4>
                        <div className="space-y-3">
                          {workflow.steps.map((step) => (
                            <div key={step.id} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium">Step {step.order}: {step.name}</h5>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(step.type)}`}>
                                    {step.type}
                                  </span>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                    step.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {step.enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                              </div>
                              {step.config && Object.keys(step.config).length > 0 && (
                                <div className="bg-gray-50 p-2 rounded text-sm">
                                  <pre className="text-gray-700">
                                    {JSON.stringify(step.config, null, 2)}
                                  </pre>
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
                  <p>Created: {new Date(workflow.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(workflow.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredWorkflows.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterStatus === 'All'
                  ? 'No workflows found. Create your first workflow to get started.'
                  : 'No workflows match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnterpriseServiceBusServicePage;
