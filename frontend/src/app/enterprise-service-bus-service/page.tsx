'use client';

import React, { useState, useEffect } from 'react';

interface ESBMessage {
  id: number;
  messageId: string;
  source: string;
  target: string;
  pattern: ESBPatternType;
  status: 'Queued' | 'Processing' | 'Completed' | 'Failed' | 'Retrying';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  payload: string;
  createdAt: string;
  processedAt: string | null;
  errorMessage?: string;
  retryCount: number;
}

type ESBPatternType = 
  | 'POINT_TO_POINT' 
  | 'PUBLISH_SUBSCRIBE' 
  | 'REQUEST_REPLY' 
  | 'MESSAGE_FILTER' 
  | 'CONTENT_ROUTER' 
  | 'MESSAGE_TRANSLATOR' 
  | 'SCATTER_GATHER' 
  | 'AGGREGATOR' 
  | 'SPLITTER';

interface ESBFlow {
  id: number;
  name: string;
  pattern: ESBPatternType;
  isActive: boolean;
  sourceEndpoints: string[];
  targetEndpoints: string[];
  messageCount: number;
  successRate: number;
  avgProcessingTime: number;
  lastExecution: string;
}

interface IntegrationEndpoint {
  id: number;
  name: string;
  url: string;
  type: 'HTTP' | 'QUEUE' | 'DATABASE' | 'FILE' | 'WEBHOOK';
  status: 'Connected' | 'Disconnected' | 'Error';
  lastHeartbeat: string;
  messagesSent: number;
  messagesReceived: number;
}

interface ESBMetrics {
  totalMessages: number;
  messagesProcessed: number;
  messagesFailed: number;
  avgProcessingTime: number;
  activeFlows: number;
  connectedEndpoints: number;
  queueDepth: number;
}

const EnterpriseServiceBusServicePage = () => {
  const [messages, setMessages] = useState<ESBMessage[]>([
    {
      id: 1,
      messageId: 'msg_001',
      source: 'AssetService',
      target: 'InventoryService',
      pattern: 'POINT_TO_POINT',
      status: 'Completed',
      priority: 'Medium',
      payload: '{"assetId": "A001", "action": "update"}',
      createdAt: '2025-01-15 10:30:00',
      processedAt: '2025-01-15 10:30:02',
      retryCount: 0
    },
    {
      id: 2,
      messageId: 'msg_002',
      source: 'FinancialService',
      target: 'ReportingService',
      pattern: 'PUBLISH_SUBSCRIBE',
      status: 'Processing',
      priority: 'High',
      payload: '{"reportType": "quarterly", "period": "Q1-2025"}',
      createdAt: '2025-01-15 10:32:00',
      processedAt: null,
      retryCount: 0
    },
    {
      id: 3,
      messageId: 'msg_003',
      source: 'MaintenanceService',
      target: 'NotificationService',
      pattern: 'MESSAGE_FILTER',
      status: 'Failed',
      priority: 'Critical',
      payload: '{"workOrderId": "WO123", "urgency": "critical"}',
      createdAt: '2025-01-15 10:28:00',
      processedAt: '2025-01-15 10:28:15',
      errorMessage: 'Target service unavailable',
      retryCount: 2
    }
  ]);

  const [flows, setFlows] = useState<ESBFlow[]>([
    {
      id: 1,
      name: 'Asset Lifecycle Flow',
      pattern: 'CONTENT_ROUTER',
      isActive: true,
      sourceEndpoints: ['AssetService', 'MaintenanceService'],
      targetEndpoints: ['InventoryService', 'FinancialService'],
      messageCount: 15420,
      successRate: 98.5,
      avgProcessingTime: 245,
      lastExecution: '2025-01-15 11:45:00'
    },
    {
      id: 2,
      name: 'Financial Reporting Aggregator',
      pattern: 'AGGREGATOR',
      isActive: true,
      sourceEndpoints: ['FinancialService', 'AssetService', 'ComplianceService'],
      targetEndpoints: ['ReportingService', 'DashboardService'],
      messageCount: 8960,
      successRate: 97.2,
      avgProcessingTime: 850,
      lastExecution: '2025-01-15 11:30:00'
    },
    {
      id: 3,
      name: 'Notification Scatter',
      pattern: 'SCATTER_GATHER',
      isActive: false,
      sourceEndpoints: ['EventService'],
      targetEndpoints: ['EmailService', 'SMSService', 'PushService'],
      messageCount: 3240,
      successRate: 94.8,
      avgProcessingTime: 320,
      lastExecution: '2025-01-15 09:15:00'
    }
  ]);

  const [endpoints, setEndpoints] = useState<IntegrationEndpoint[]>([
    {
      id: 1,
      name: 'Asset Management API',
      url: 'https://api.assets.company.com/v1',
      type: 'HTTP',
      status: 'Connected',
      lastHeartbeat: '2025-01-15 11:58:30',
      messagesSent: 5420,
      messagesReceived: 3240
    },
    {
      id: 2,
      name: 'Message Queue',
      url: 'amqp://queue.company.com:5672',
      type: 'QUEUE',
      status: 'Connected',
      lastHeartbeat: '2025-01-15 11:59:00',
      messagesSent: 15680,
      messagesReceived: 14920
    },
    {
      id: 3,
      name: 'Legacy Database',
      url: 'jdbc:oracle:thin:@legacy.company.com:1521:XE',
      type: 'DATABASE',
      status: 'Error',
      lastHeartbeat: '2025-01-15 11:45:00',
      messagesSent: 240,
      messagesReceived: 180
    }
  ]);

  const [metrics] = useState<ESBMetrics>({
    totalMessages: 127840,
    messagesProcessed: 124580,
    messagesFailed: 3260,
    avgProcessingTime: 425,
    activeFlows: 18,
    connectedEndpoints: 12,
    queueDepth: 45
  });

  const [filteredMessages, setFilteredMessages] = useState<ESBMessage[]>(messages);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [patternFilter, setPatternFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ESBMessage | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<ESBFlow | null>(null);
  const [showCreateFlowForm, setShowCreateFlowForm] = useState(false);
  const [showCreateEndpointForm, setShowCreateEndpointForm] = useState(false);

  const [newFlow, setNewFlow] = useState({
    name: '',
    pattern: 'POINT_TO_POINT' as ESBPatternType,
    sourceEndpoints: [] as string[],
    targetEndpoints: [] as string[]
  });

  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    url: '',
    type: 'HTTP' as IntegrationEndpoint['type']
  });

  useEffect(() => {
    const filtered = messages.filter(message => {
      return (
        message.messageId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.target.toLowerCase().includes(searchTerm.toLowerCase())
      ) &&
      (statusFilter === '' || message.status === statusFilter) &&
      (patternFilter === '' || message.pattern === patternFilter) &&
      (priorityFilter === '' || message.priority === priorityFilter);
    });
    setFilteredMessages(filtered);
  }, [messages, searchTerm, statusFilter, patternFilter, priorityFilter]);

  const handleFlowInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewFlow(prev => ({ ...prev, [name]: value }));
  };

  const handleEndpointInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEndpoint(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFlow.name) {
      const flow: ESBFlow = {
        id: Date.now(),
        ...newFlow,
        isActive: true,
        messageCount: 0,
        successRate: 100,
        avgProcessingTime: 0,
        lastExecution: 'Never'
      };
      setFlows(prev => [...prev, flow]);
      setNewFlow({ name: '', pattern: 'POINT_TO_POINT', sourceEndpoints: [], targetEndpoints: [] });
      setShowCreateFlowForm(false);
    }
  };

  const handleCreateEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEndpoint.name && newEndpoint.url) {
      const endpoint: IntegrationEndpoint = {
        id: Date.now(),
        ...newEndpoint,
        status: 'Connected',
        lastHeartbeat: new Date().toLocaleString(),
        messagesSent: 0,
        messagesReceived: 0
      };
      setEndpoints(prev => [...prev, endpoint]);
      setNewEndpoint({ name: '', url: '', type: 'HTTP' });
      setShowCreateEndpointForm(false);
    }
  };

  const retryMessage = (id: number) => {
    setMessages(prev => prev.map(message => 
      message.id === id 
        ? { 
            ...message, 
            status: 'Queued',
            retryCount: message.retryCount + 1,
            errorMessage: undefined
          }
        : message
    ));

    // Simulate retry processing
    setTimeout(() => {
      setMessages(prev => prev.map(message => 
        message.id === id 
          ? { 
              ...message, 
              status: Math.random() > 0.3 ? 'Completed' : 'Failed',
              processedAt: new Date().toLocaleString(),
              errorMessage: Math.random() > 0.3 ? undefined : 'Retry failed - service timeout'
            }
          : message
      ));
    }, 2000);
  };

  const toggleFlowStatus = (id: number) => {
    setFlows(prev => prev.map(flow => 
      flow.id === id 
        ? { ...flow, isActive: !flow.isActive }
        : flow
    ));
  };

  const testEndpointConnection = (id: number) => {
    setEndpoints(prev => prev.map(endpoint => 
      endpoint.id === id 
        ? { 
            ...endpoint, 
            status: Math.random() > 0.2 ? 'Connected' : 'Error',
            lastHeartbeat: new Date().toLocaleString()
          }
        : endpoint
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': case 'Connected': return 'bg-green-100 text-green-800';
      case 'Processing': case 'Queued': return 'bg-blue-100 text-blue-800';
      case 'Failed': case 'Error': case 'Disconnected': return 'bg-red-100 text-red-800';
      case 'Retrying': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'POINT_TO_POINT': return 'bg-blue-100 text-blue-800';
      case 'PUBLISH_SUBSCRIBE': return 'bg-green-100 text-green-800';
      case 'REQUEST_REPLY': return 'bg-purple-100 text-purple-800';
      case 'MESSAGE_FILTER': return 'bg-orange-100 text-orange-800';
      case 'CONTENT_ROUTER': return 'bg-pink-100 text-pink-800';
      case 'MESSAGE_TRANSLATOR': return 'bg-indigo-100 text-indigo-800';
      case 'SCATTER_GATHER': return 'bg-teal-100 text-teal-800';
      case 'AGGREGATOR': return 'bg-cyan-100 text-cyan-800';
      case 'SPLITTER': return 'bg-lime-100 text-lime-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPattern = (pattern: string) => {
    return pattern.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Enterprise Service Bus</h1>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold">{metrics.totalMessages.toLocaleString()}</p>
            </div>
            <div className="text-2xl">📨</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-green-600">{metrics.messagesProcessed.toLocaleString()}</p>
            </div>
            <div className="text-2xl">✅</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{metrics.messagesFailed.toLocaleString()}</p>
            </div>
            <div className="text-2xl">❌</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Processing</p>
              <p className="text-2xl font-bold">{metrics.avgProcessingTime}ms</p>
            </div>
            <div className="text-2xl">⚡</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Flows</p>
              <p className="text-2xl font-bold">{metrics.activeFlows}</p>
            </div>
            <div className="text-2xl">🔄</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Endpoints</p>
              <p className="text-2xl font-bold">{metrics.connectedEndpoints}</p>
            </div>
            <div className="text-2xl">🔗</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Queue Depth</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.queueDepth}</p>
            </div>
            <div className="text-2xl">📋</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Queued">Queued</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
            <option value="Retrying">Retrying</option>
          </select>
          <select
            value={patternFilter}
            onChange={(e) => setPatternFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Patterns</option>
            <option value="POINT_TO_POINT">Point to Point</option>
            <option value="PUBLISH_SUBSCRIBE">Publish Subscribe</option>
            <option value="REQUEST_REPLY">Request Reply</option>
            <option value="MESSAGE_FILTER">Message Filter</option>
            <option value="CONTENT_ROUTER">Content Router</option>
            <option value="AGGREGATOR">Aggregator</option>
            <option value="SCATTER_GATHER">Scatter Gather</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button
            onClick={() => setShowCreateFlowForm(!showCreateFlowForm)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Flow
          </button>
          <button
            onClick={() => setShowCreateEndpointForm(!showCreateEndpointForm)}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Add Endpoint
          </button>
        </div>
      </div>

      {/* Create Flow Form */}
      {showCreateFlowForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New ESB Flow</h2>
          <form onSubmit={handleCreateFlow}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flow Name</label>
                <input
                  type="text"
                  name="name"
                  value={newFlow.name}
                  onChange={handleFlowInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pattern</label>
                <select
                  name="pattern"
                  value={newFlow.pattern}
                  onChange={handleFlowInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="POINT_TO_POINT">Point to Point</option>
                  <option value="PUBLISH_SUBSCRIBE">Publish Subscribe</option>
                  <option value="REQUEST_REPLY">Request Reply</option>
                  <option value="MESSAGE_FILTER">Message Filter</option>
                  <option value="CONTENT_ROUTER">Content Router</option>
                  <option value="MESSAGE_TRANSLATOR">Message Translator</option>
                  <option value="SCATTER_GATHER">Scatter Gather</option>
                  <option value="AGGREGATOR">Aggregator</option>
                  <option value="SPLITTER">Splitter</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Flow
              </button>
              <button
                type="button"
                onClick={() => setShowCreateFlowForm(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Endpoint Form */}
      {showCreateEndpointForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Integration Endpoint</h2>
          <form onSubmit={handleCreateEndpoint}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint Name</label>
                <input
                  type="text"
                  name="name"
                  value={newEndpoint.name}
                  onChange={handleEndpointInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="text"
                  name="url"
                  value={newEndpoint.url}
                  onChange={handleEndpointInputChange}
                  placeholder="https://api.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={newEndpoint.type}
                  onChange={handleEndpointInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HTTP">HTTP</option>
                  <option value="QUEUE">Queue</option>
                  <option value="DATABASE">Database</option>
                  <option value="FILE">File</option>
                  <option value="WEBHOOK">Webhook</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Add Endpoint
              </button>
              <button
                type="button"
                onClick={() => setShowCreateEndpointForm(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Messages Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Message Queue ({filteredMessages.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pattern</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMessages.map((message) => (
                <tr key={message.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{message.messageId}</div>
                    {message.retryCount > 0 && (
                      <div className="text-xs text-orange-600">Retry #{message.retryCount}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getPatternColor(message.pattern)}`}>
                      {formatPattern(message.pattern)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{message.source}</div>
                    <div className="text-xs text-gray-500">→ {message.target}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(message.status)}`}>
                      {message.status}
                    </span>
                    {message.errorMessage && (
                      <div className="text-xs text-red-600 mt-1">{message.errorMessage}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(message.priority)}`}>
                      {message.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{message.createdAt.split(' ')[0]}</div>
                    <div className="text-xs text-gray-500">{message.createdAt.split(' ')[1]}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedMessage(selectedMessage?.id === message.id ? null : message)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedMessage?.id === message.id ? 'Hide' : 'View'}
                    </button>
                    {message.status === 'Failed' && (
                      <button
                        onClick={() => retryMessage(message.id)}
                        className="bg-orange-500 hover:bg-orange-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedMessage && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <h3 className="font-semibold mb-2">Message Details: {selectedMessage.messageId}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
              <div><strong>Source:</strong> {selectedMessage.source}</div>
              <div><strong>Target:</strong> {selectedMessage.target}</div>
              <div><strong>Pattern:</strong> {formatPattern(selectedMessage.pattern)}</div>
              <div><strong>Priority:</strong> {selectedMessage.priority}</div>
              <div><strong>Status:</strong> {selectedMessage.status}</div>
              <div><strong>Created:</strong> {selectedMessage.createdAt}</div>
              <div><strong>Processed:</strong> {selectedMessage.processedAt || 'Not processed'}</div>
              <div><strong>Retry Count:</strong> {selectedMessage.retryCount}</div>
            </div>
            <div>
              <strong>Payload:</strong>
              <pre className="bg-gray-100 p-2 rounded text-xs mt-1 overflow-x-auto">{selectedMessage.payload}</pre>
            </div>
          </div>
        )}
        
        {filteredMessages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No messages found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Flows and Endpoints Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ESB Flows */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">ESB Flows ({flows.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {flows.map((flow) => (
              <div key={flow.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-medium text-gray-900">{flow.name}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getPatternColor(flow.pattern)}`}>
                      {formatPattern(flow.pattern)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      flow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {flow.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedFlow(selectedFlow?.id === flow.id ? null : flow)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      {selectedFlow?.id === flow.id ? 'Hide' : 'Details'}
                    </button>
                    <button
                      onClick={() => toggleFlowStatus(flow.id)}
                      className={`text-xs px-2 py-1 rounded ${
                        flow.isActive 
                          ? 'bg-yellow-500 hover:bg-yellow-700 text-white' 
                          : 'bg-green-500 hover:bg-green-700 text-white'
                      }`}
                    >
                      {flow.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Messages: {flow.messageCount.toLocaleString()} | Success: {flow.successRate}% | Avg: {flow.avgProcessingTime}ms</div>
                  <div>Sources: {flow.sourceEndpoints.join(', ')}</div>
                  <div>Targets: {flow.targetEndpoints.join(', ')}</div>
                </div>
                
                {selectedFlow?.id === flow.id && (
                  <div className="mt-3 p-3 bg-gray-100 rounded text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div><strong>Last Execution:</strong> {flow.lastExecution}</div>
                      <div><strong>Success Rate:</strong> {flow.successRate}%</div>
                      <div><strong>Average Processing:</strong> {flow.avgProcessingTime}ms</div>
                      <div><strong>Total Messages:</strong> {flow.messageCount.toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Integration Endpoints */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Integration Endpoints ({endpoints.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-medium text-gray-900">{endpoint.name}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      endpoint.type === 'HTTP' ? 'bg-blue-100 text-blue-800' :
                      endpoint.type === 'QUEUE' ? 'bg-purple-100 text-purple-800' :
                      endpoint.type === 'DATABASE' ? 'bg-green-100 text-green-800' :
                      endpoint.type === 'FILE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {endpoint.type}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(endpoint.status)}`}>
                      {endpoint.status}
                    </span>
                  </div>
                  <button
                    onClick={() => testEndpointConnection(endpoint.id)}
                    className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Test
                  </button>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="truncate">{endpoint.url}</div>
                  <div>Sent: {endpoint.messagesSent.toLocaleString()} | Received: {endpoint.messagesReceived.toLocaleString()}</div>
                  <div>Last Heartbeat: {endpoint.lastHeartbeat}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseServiceBusServicePage;
