'use client';

import React, { useState, useEffect } from 'react';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'Info' | 'Warning' | 'Error' | 'Success';
  channel: 'Email' | 'SMS' | 'Push' | 'In-App' | 'Slack' | 'Teams';
  recipient: string;
  status: 'Pending' | 'Sent' | 'Failed' | 'Delivered' | 'Read';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  templateId?: string;
  createdAt: string;
  sentAt?: string;
  readAt?: string;
  retryCount: number;
  errorMessage?: string;
}

interface NotificationTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: 'Email' | 'SMS' | 'Push' | 'Slack';
  variables: string[];
  isActive: boolean;
  category: 'System' | 'Maintenance' | 'Financial' | 'Alert';
  createdAt: string;
}

interface NotificationRule {
  id: number;
  name: string;
  trigger: 'Asset_Update' | 'Maintenance_Due' | 'System_Error' | 'Financial_Alert' | 'Schedule_Change';
  condition: string;
  recipients: string[];
  channels: string[];
  template: string;
  isActive: boolean;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  createdAt: string;
}

interface NotificationMetrics {
  totalNotifications: number;
  sentToday: number;
  failedToday: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  activeRules: number;
  activeTemplates: number;
}

const NotificationServicePage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: 'Asset Maintenance Due',
      message: 'Asset HVAC-001 requires scheduled maintenance in 3 days',
      type: 'Warning',
      channel: 'Email',
      recipient: 'maintenance@company.com',
      status: 'Delivered',
      priority: 'High',
      templateId: 'maintenance_reminder',
      createdAt: '2025-01-15 10:30:00',
      sentAt: '2025-01-15 10:30:15',
      readAt: '2025-01-15 10:45:22',
      retryCount: 0
    },
    {
      id: 2,
      title: 'System Error Alert',
      message: 'Integration service failed to sync with external API',
      type: 'Error',
      channel: 'Slack',
      recipient: '#alerts',
      status: 'Sent',
      priority: 'Critical',
      templateId: 'system_error',
      createdAt: '2025-01-15 11:15:00',
      sentAt: '2025-01-15 11:15:05',
      retryCount: 0
    },
    {
      id: 3,
      title: 'Budget Approval Required',
      message: 'Capital project budget exceeds threshold and requires approval',
      type: 'Info',
      channel: 'Email',
      recipient: 'finance@company.com',
      status: 'Failed',
      priority: 'Medium',
      templateId: 'budget_approval',
      createdAt: '2025-01-15 09:45:00',
      sentAt: '2025-01-15 09:45:10',
      retryCount: 2,
      errorMessage: 'SMTP server timeout'
    }
  ]);

  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: 1,
      name: 'Maintenance Reminder',
      subject: 'Asset Maintenance Due: {{assetName}}',
      content: 'Dear {{recipientName}},\n\nAsset {{assetName}} ({{assetId}}) requires maintenance on {{dueDate}}.\n\nPlease schedule the necessary maintenance activities.',
      type: 'Email',
      variables: ['assetName', 'assetId', 'dueDate', 'recipientName'],
      isActive: true,
      category: 'Maintenance',
      createdAt: '2024-12-01 14:20:00'
    },
    {
      id: 2,
      name: 'System Error Alert',
      subject: 'System Alert: {{errorType}}',
      content: '🚨 System Error Alert\n\nService: {{serviceName}}\nError: {{errorMessage}}\nTime: {{timestamp}}',
      type: 'Slack',
      variables: ['errorType', 'serviceName', 'errorMessage', 'timestamp'],
      isActive: true,
      category: 'Alert',
      createdAt: '2024-11-15 09:10:00'
    },
    {
      id: 3,
      name: 'Budget Notification',
      subject: 'Budget Alert: {{projectName}}',
      content: 'Project {{projectName}} budget status:\n\nAmount: {{amount}}\nStatus: {{status}}\nAction Required: {{action}}',
      type: 'Email',
      variables: ['projectName', 'amount', 'status', 'action'],
      isActive: true,
      category: 'Financial',
      createdAt: '2024-10-20 16:30:00'
    }
  ]);

  const [rules, setRules] = useState<NotificationRule[]>([
    {
      id: 1,
      name: 'Asset Maintenance Alert',
      trigger: 'Maintenance_Due',
      condition: 'days_until_due <= 7',
      recipients: ['maintenance@company.com', 'facilities@company.com'],
      channels: ['Email', 'SMS'],
      template: 'maintenance_reminder',
      isActive: true,
      priority: 'High',
      createdAt: '2024-12-01 10:00:00'
    },
    {
      id: 2,
      name: 'Critical System Errors',
      trigger: 'System_Error',
      condition: 'severity = "critical"',
      recipients: ['#alerts', 'admin@company.com'],
      channels: ['Slack', 'Push'],
      template: 'system_error',
      isActive: true,
      priority: 'Critical',
      createdAt: '2024-11-20 15:30:00'
    },
    {
      id: 3,
      name: 'Budget Threshold Alerts',
      trigger: 'Financial_Alert',
      condition: 'budget_variance > 10000',
      recipients: ['finance@company.com', 'manager@company.com'],
      channels: ['Email'],
      template: 'budget_approval',
      isActive: false,
      priority: 'Medium',
      createdAt: '2024-10-15 11:45:00'
    }
  ]);

  const [metrics] = useState<NotificationMetrics>({
    totalNotifications: 15420,
    sentToday: 247,
    failedToday: 12,
    deliveryRate: 95.2,
    averageDeliveryTime: 2.3,
    activeRules: 18,
    activeTemplates: 12
  });

  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>(notifications);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [showCreateNotificationForm, setShowCreateNotificationForm] = useState(false);
  const [showCreateTemplateForm, setShowCreateTemplateForm] = useState(false);
  const [showCreateRuleForm, setShowCreateRuleForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'templates' | 'rules'>('notifications');

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'Info' as Notification['type'],
    channel: 'Email' as Notification['channel'],
    recipient: '',
    priority: 'Medium' as Notification['priority'],
    templateId: ''
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'Email' as NotificationTemplate['type'],
    category: 'System' as NotificationTemplate['category']
  });

  const [newRule, setNewRule] = useState({
    name: '',
    trigger: 'System_Error' as NotificationRule['trigger'],
    condition: '',
    recipients: [] as string[],
    channels: [] as string[],
    template: '',
    priority: 'Medium' as NotificationRule['priority']
  });

  useEffect(() => {
    const filtered = notifications.filter(notification => {
      return (
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.recipient.toLowerCase().includes(searchTerm.toLowerCase())
      ) &&
      (typeFilter === '' || notification.type === typeFilter) &&
      (channelFilter === '' || notification.channel === channelFilter) &&
      (statusFilter === '' || notification.status === statusFilter) &&
      (priorityFilter === '' || notification.priority === priorityFilter);
    });
    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, typeFilter, channelFilter, statusFilter, priorityFilter]);

  const handleNotificationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewNotification(prev => ({ ...prev, [name]: value }));
  };

  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTemplate(prev => ({ ...prev, [name]: value }));
  };

  const handleRuleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewRule(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNotification.title && newNotification.message && newNotification.recipient) {
      const notification: Notification = {
        id: Date.now(),
        ...newNotification,
        status: 'Pending',
        createdAt: new Date().toLocaleString(),
        retryCount: 0
      };
      setNotifications(prev => [notification, ...prev]);
      setNewNotification({
        title: '',
        message: '',
        type: 'Info',
        channel: 'Email',
        recipient: '',
        priority: 'Medium',
        templateId: ''
      });
      setShowCreateNotificationForm(false);
    }
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTemplate.name && newTemplate.subject && newTemplate.content) {
      const template: NotificationTemplate = {
        id: Date.now(),
        ...newTemplate,
        variables: extractVariables(newTemplate.content),
        isActive: true,
        createdAt: new Date().toLocaleString()
      };
      setTemplates(prev => [...prev, template]);
      setNewTemplate({
        name: '',
        subject: '',
        content: '',
        type: 'Email',
        category: 'System'
      });
      setShowCreateTemplateForm(false);
    }
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRule.name && newRule.condition) {
      const rule: NotificationRule = {
        id: Date.now(),
        ...newRule,
        isActive: true,
        createdAt: new Date().toLocaleString()
      };
      setRules(prev => [...prev, rule]);
      setNewRule({
        name: '',
        trigger: 'System_Error',
        condition: '',
        recipients: [],
        channels: [],
        template: '',
        priority: 'Medium'
      });
      setShowCreateRuleForm(false);
    }
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  };

  const sendNotification = (id: number) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === id 
        ? { 
            ...notification, 
            status: 'Sent',
            sentAt: new Date().toLocaleString()
          }
        : notification
    ));

    // Simulate delivery
    setTimeout(() => {
      setNotifications(prev => prev.map(notification => 
        notification.id === id 
          ? { 
              ...notification, 
              status: Math.random() > 0.1 ? 'Delivered' : 'Failed',
              errorMessage: Math.random() > 0.1 ? undefined : 'Delivery failed - recipient unavailable'
            }
          : notification
      ));
    }, 2000);
  };

  const retryNotification = (id: number) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === id 
        ? { 
            ...notification, 
            status: 'Pending',
            retryCount: notification.retryCount + 1,
            errorMessage: undefined
          }
        : notification
    ));

    setTimeout(() => sendNotification(id), 1000);
  };

  const toggleRuleStatus = (id: number) => {
    setRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const toggleTemplateStatus = (id: number) => {
    setTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, isActive: !template.isActive } : template
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Read': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Info': return 'bg-blue-100 text-blue-800';
      case 'Warning': return 'bg-yellow-100 text-yellow-800';
      case 'Error': return 'bg-red-100 text-red-800';
      case 'Success': return 'bg-green-100 text-green-800';
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

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'Email': return 'bg-blue-100 text-blue-800';
      case 'SMS': return 'bg-green-100 text-green-800';
      case 'Push': return 'bg-purple-100 text-purple-800';
      case 'In-App': return 'bg-orange-100 text-orange-800';
      case 'Slack': return 'bg-pink-100 text-pink-800';
      case 'Teams': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Notification Service</h1>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{metrics.totalNotifications.toLocaleString()}</p>
            </div>
            <div className="text-2xl">📧</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sent Today</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.sentToday}</p>
            </div>
            <div className="text-2xl">📤</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed Today</p>
              <p className="text-2xl font-bold text-red-600">{metrics.failedToday}</p>
            </div>
            <div className="text-2xl">❌</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivery Rate</p>
              <p className="text-2xl font-bold text-green-600">{metrics.deliveryRate}%</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Delivery</p>
              <p className="text-2xl font-bold">{metrics.averageDeliveryTime}s</p>
            </div>
            <div className="text-2xl">⚡</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Rules</p>
              <p className="text-2xl font-bold">{metrics.activeRules}</p>
            </div>
            <div className="text-2xl">⚙️</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Templates</p>
              <p className="text-2xl font-bold">{metrics.activeTemplates}</p>
            </div>
            <div className="text-2xl">📋</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 bg-white rounded-lg shadow">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'notifications'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'rules'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Rules ({rules.length})
          </button>
        </div>

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="p-6">
            {/* Filters and Controls */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="Info">Info</option>
                <option value="Warning">Warning</option>
                <option value="Error">Error</option>
                <option value="Success">Success</option>
              </select>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Channels</option>
                <option value="Email">Email</option>
                <option value="SMS">SMS</option>
                <option value="Push">Push</option>
                <option value="In-App">In-App</option>
                <option value="Slack">Slack</option>
                <option value="Teams">Teams</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Sent">Sent</option>
                <option value="Delivered">Delivered</option>
                <option value="Failed">Failed</option>
                <option value="Read">Read</option>
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
                onClick={() => setShowCreateNotificationForm(!showCreateNotificationForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Send Notification
              </button>
            </div>

            {/* Create Notification Form */}
            {showCreateNotificationForm && (
              <div className="bg-gray-100 p-6 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Send New Notification</h2>
                <form onSubmit={handleCreateNotification}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={newNotification.title}
                        onChange={handleNotificationInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        name="type"
                        value={newNotification.type}
                        onChange={handleNotificationInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Info">Info</option>
                        <option value="Warning">Warning</option>
                        <option value="Error">Error</option>
                        <option value="Success">Success</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                      <select
                        name="channel"
                        value={newNotification.channel}
                        onChange={handleNotificationInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Email">Email</option>
                        <option value="SMS">SMS</option>
                        <option value="Push">Push</option>
                        <option value="In-App">In-App</option>
                        <option value="Slack">Slack</option>
                        <option value="Teams">Teams</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        name="priority"
                        value={newNotification.priority}
                        onChange={handleNotificationInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                      <input
                        type="text"
                        name="recipient"
                        value={newNotification.recipient}
                        onChange={handleNotificationInputChange}
                        placeholder="email@company.com or #channel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Template (Optional)</label>
                      <select
                        name="templateId"
                        value={newNotification.templateId}
                        onChange={handleNotificationInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No Template</option>
                        {templates.filter(t => t.isActive).map(template => (
                          <option key={template.id} value={template.name.toLowerCase().replace(/\s+/g, '_')}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                      <textarea
                        name="message"
                        value={newNotification.message}
                        onChange={handleNotificationInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Send Notification
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateNotificationForm(false)}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notifications Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notification</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type & Channel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredNotifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{notification.title}</div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{notification.message}</div>
                        {notification.retryCount > 0 && (
                          <div className="text-xs text-orange-600">Retry #{notification.retryCount}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                        <div className="mt-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getChannelColor(notification.channel)}`}>
                            {notification.channel}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {notification.recipient}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(notification.status)}`}>
                          {notification.status}
                        </span>
                        {notification.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">{notification.errorMessage}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{notification.createdAt.split(' ')[0]}</div>
                        <div className="text-xs text-gray-500">{notification.createdAt.split(' ')[1]}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedNotification(selectedNotification?.id === notification.id ? null : notification)}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          {selectedNotification?.id === notification.id ? 'Hide' : 'View'}
                        </button>
                        {notification.status === 'Pending' && (
                          <button
                            onClick={() => sendNotification(notification.id)}
                            className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                          >
                            Send
                          </button>
                        )}
                        {notification.status === 'Failed' && (
                          <button
                            onClick={() => retryNotification(notification.id)}
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

            {selectedNotification && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Notification Details: {selectedNotification.title}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div><strong>Type:</strong> {selectedNotification.type}</div>
                  <div><strong>Channel:</strong> {selectedNotification.channel}</div>
                  <div><strong>Status:</strong> {selectedNotification.status}</div>
                  <div><strong>Priority:</strong> {selectedNotification.priority}</div>
                  <div><strong>Recipient:</strong> {selectedNotification.recipient}</div>
                  <div><strong>Template:</strong> {selectedNotification.templateId || 'None'}</div>
                  <div><strong>Created:</strong> {selectedNotification.createdAt}</div>
                  <div><strong>Sent:</strong> {selectedNotification.sentAt || 'Not sent'}</div>
                </div>
                <div>
                  <strong>Full Message:</strong>
                  <div className="bg-white p-3 rounded border mt-1 text-sm">{selectedNotification.message}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={() => setShowCreateTemplateForm(!showCreateTemplateForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Template
              </button>
            </div>

            {/* Create Template Form */}
            {showCreateTemplateForm && (
              <div className="bg-gray-100 p-6 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Create New Template</h2>
                <form onSubmit={handleCreateTemplate}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                      <input
                        type="text"
                        name="name"
                        value={newTemplate.name}
                        onChange={handleTemplateInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        name="type"
                        value={newTemplate.type}
                        onChange={handleTemplateInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Email">Email</option>
                        <option value="SMS">SMS</option>
                        <option value="Push">Push</option>
                        <option value="Slack">Slack</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        name="category"
                        value={newTemplate.category}
                        onChange={handleTemplateInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="System">System</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Financial">Financial</option>
                        <option value="Alert">Alert</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        value={newTemplate.subject}
                        onChange={handleTemplateInputChange}
                        placeholder="Use {{variable}} for dynamic content"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                      <textarea
                        name="content"
                        value={newTemplate.content}
                        onChange={handleTemplateInputChange}
                        rows={5}
                        placeholder="Use {{variable}} for dynamic content"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Create Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateTemplateForm(false)}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Templates Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getChannelColor(template.type)}`}>
                        {template.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><strong>Subject:</strong> {template.subject}</div>
                    <div><strong>Category:</strong> {template.category}</div>
                    <div><strong>Variables:</strong> {template.variables.join(', ') || 'None'}</div>
                    <div><strong>Content Preview:</strong></div>
                    <div className="bg-gray-100 p-2 rounded text-xs max-h-20 overflow-y-auto">
                      {template.content}
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => setSelectedTemplate(selectedTemplate?.id === template.id ? null : template)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedTemplate?.id === template.id ? 'Hide' : 'View Full'}
                    </button>
                    <button
                      onClick={() => toggleTemplateStatus(template.id)}
                      className={`text-white text-xs px-2 py-1 rounded ${
                        template.isActive 
                          ? 'bg-yellow-500 hover:bg-yellow-700' 
                          : 'bg-green-500 hover:bg-green-700'
                      }`}
                    >
                      {template.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>

                  {selectedTemplate?.id === template.id && (
                    <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
                      <div className="space-y-2">
                        <div><strong>Full Content:</strong></div>
                        <div className="bg-white p-3 rounded border whitespace-pre-wrap">{template.content}</div>
                        <div><strong>Created:</strong> {template.createdAt}</div>
                        <div><strong>Variables Available:</strong> {template.variables.length > 0 ? template.variables.map(v => `{{${v}}}`).join(', ') : 'None'}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={() => setShowCreateRuleForm(!showCreateRuleForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Rule
              </button>
            </div>

            {/* Create Rule Form */}
            {showCreateRuleForm && (
              <div className="bg-gray-100 p-6 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Create New Notification Rule</h2>
                <form onSubmit={handleCreateRule}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                      <input
                        type="text"
                        name="name"
                        value={newRule.name}
                        onChange={handleRuleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
                      <select
                        name="trigger"
                        value={newRule.trigger}
                        onChange={handleRuleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Asset_Update">Asset Update</option>
                        <option value="Maintenance_Due">Maintenance Due</option>
                        <option value="System_Error">System Error</option>
                        <option value="Financial_Alert">Financial Alert</option>
                        <option value="Schedule_Change">Schedule Change</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        name="priority"
                        value={newRule.priority}
                        onChange={handleRuleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                      <select
                        name="template"
                        value={newRule.template}
                        onChange={handleRuleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Template</option>
                        {templates.filter(t => t.isActive).map(template => (
                          <option key={template.id} value={template.name.toLowerCase().replace(/\s+/g, '_')}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                      <input
                        type="text"
                        name="condition"
                        value={newRule.condition}
                        onChange={handleRuleInputChange}
                        placeholder="e.g., severity = 'high' AND department = 'maintenance'"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Create Rule
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateRuleForm(false)}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Rules List */}
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4 hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{rule.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(rule.priority)}`}>
                        {rule.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Trigger:</strong> {rule.trigger.replace(/_/g, ' ')}</div>
                    <div><strong>Template:</strong> {rule.template || 'None'}</div>
                    <div><strong>Recipients:</strong> {rule.recipients.join(', ') || 'None'}</div>
                    <div><strong>Channels:</strong> {rule.channels.join(', ') || 'None'}</div>
                    <div className="md:col-span-2"><strong>Condition:</strong> {rule.condition}</div>
                    <div><strong>Created:</strong> {rule.createdAt}</div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => toggleRuleStatus(rule.id)}
                      className={`text-white text-xs px-3 py-1 rounded mr-2 ${
                        rule.isActive 
                          ? 'bg-yellow-500 hover:bg-yellow-700' 
                          : 'bg-green-500 hover:bg-green-700'
                      }`}
                    >
                      {rule.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationServicePage;
