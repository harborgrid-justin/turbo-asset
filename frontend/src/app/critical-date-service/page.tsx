import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface CriticalDate {
  id: string;
  title: string;
  description?: string;
  date: string;
  category: 'Contract' | 'Maintenance' | 'Compliance' | 'Lease' | 'Insurance' | 'Regulatory' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Upcoming' | 'Overdue' | 'Completed' | 'Cancelled';
  assignedTo?: string;
  assetId?: string;
  assetName?: string;
  reminderDays: number;
  isRecurring: boolean;
  recurrencePattern?: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  nextOccurrence?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const CriticalDateServicePage = () => {
  const [criticalDates, setCriticalDates] = useState<CriticalDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<CriticalDate | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [creating, setCreating] = useState(false);

  // Form state
  const [newDate, setNewDate] = useState({
    title: '',
    description: '',
    date: '',
    category: 'Contract' as CriticalDate['category'],
    priority: 'Medium' as CriticalDate['priority'],
    status: 'Upcoming' as CriticalDate['status'],
    assignedTo: '',
    assetId: '',
    assetName: '',
    reminderDays: 7,
    isRecurring: false,
    recurrencePattern: 'Monthly' as CriticalDate['recurrencePattern'],
    tags: '',
    notes: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadCriticalDates();
  }, []);

  const loadCriticalDates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<CriticalDate>('critical-dates');
      setCriticalDates(data);
    } catch (err) {
      setError('Failed to load critical dates. Please try again.');
      console.error('Error loading critical dates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate.title || !newDate.date) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const dateData = {
        ...newDate,
        tags: newDate.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        date: new Date(newDate.date).toISOString(),
        nextOccurrence: newDate.isRecurring && newDate.date
          ? calculateNextOccurrence(newDate.date, newDate.recurrencePattern!)
          : undefined
      };

      const createdDate = await apiService.generic.create<CriticalDate>('critical-dates', dateData);

      setCriticalDates(prev => [createdDate, ...prev]);
      setNewDate({
        title: '',
        description: '',
        date: '',
        category: 'Contract',
        priority: 'Medium',
        status: 'Upcoming',
        assignedTo: '',
        assetId: '',
        assetName: '',
        reminderDays: 7,
        isRecurring: false,
        recurrencePattern: 'Monthly',
        tags: '',
        notes: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create critical date. Please try again.');
      console.error('Error creating critical date:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateDateStatus = async (dateId: string, status: CriticalDate['status']) => {
    try {
      setError(null);
      await apiService.generic.update<CriticalDate>('critical-dates', parseInt(dateId), { status });
      setCriticalDates(prev => prev.map(date =>
        date.id === dateId ? { ...date, status } : date
      ));
    } catch (err) {
      setError('Failed to update date status. Please try again.');
      console.error('Error updating date:', err);
    }
  };

  const deleteDate = async (dateId: string) => {
    if (!confirm('Are you sure you want to delete this critical date? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('critical-dates', parseInt(dateId));
      setCriticalDates(prev => prev.filter(date => date.id !== dateId));
    } catch (err) {
      setError('Failed to delete critical date. Please try again.');
      console.error('Error deleting date:', err);
    }
  };

  const calculateNextOccurrence = (currentDate: string, pattern: string): string => {
    const date = new Date(currentDate);
    switch (pattern) {
      case 'Daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'Weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'Monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'Quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'Yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-100 text-blue-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Contract': return 'bg-blue-100 text-blue-800';
      case 'Maintenance': return 'bg-green-100 text-green-800';
      case 'Compliance': return 'bg-purple-100 text-purple-800';
      case 'Lease': return 'bg-orange-100 text-orange-800';
      case 'Insurance': return 'bg-indigo-100 text-indigo-800';
      case 'Regulatory': return 'bg-pink-100 text-pink-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilDate = (dateString: string) => {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (dateString: string) => {
    return getDaysUntilDate(dateString) < 0;
  };

  const isDueSoon = (dateString: string, reminderDays: number) => {
    const daysUntil = getDaysUntilDate(dateString);
    return daysUntil >= 0 && daysUntil <= reminderDays;
  };

  const filteredDates = criticalDates.filter(date => {
    const categoryMatch = filterCategory === 'All' || date.category === filterCategory;
    const priorityMatch = filterPriority === 'All' || date.priority === filterPriority;
    const statusMatch = filterStatus === 'All' || date.status === filterStatus;
    return categoryMatch && priorityMatch && statusMatch;
  });

  const getDateStats = () => {
    const total = criticalDates.length;
    const upcoming = criticalDates.filter(d => d.status === 'Upcoming').length;
    const overdue = criticalDates.filter(d => d.status === 'Upcoming' && isOverdue(d.date)).length;
    const dueSoon = criticalDates.filter(d => d.status === 'Upcoming' && isDueSoon(d.date, d.reminderDays)).length;
    const completed = criticalDates.filter(d => d.status === 'Completed').length;

    return { total, upcoming, overdue, dueSoon, completed };
  };

  const stats = getDateStats();

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
      <h1 className="text-3xl font-bold mb-6">Critical Date Service</h1>

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

      {/* Critical Date Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Dates</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Upcoming</h3>
          <p className="text-2xl font-bold text-green-600">{stats.upcoming}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Overdue</h3>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Due Soon</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.dueSoon}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Completed</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Critical Dates</h2>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Categories</option>
              <option value="Contract">Contract</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Compliance">Compliance</option>
              <option value="Lease">Lease</option>
              <option value="Insurance">Insurance</option>
              <option value="Regulatory">Regulatory</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
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
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={creating}
            >
              {showCreateForm ? 'Cancel' : 'Create Date'}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Critical Date</h3>
          <form onSubmit={handleCreateDate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  value={newDate.title}
                  onChange={(e) => setNewDate(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  value={newDate.date}
                  onChange={(e) => setNewDate(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={newDate.category}
                  onChange={(e) => setNewDate(prev => ({ ...prev, category: e.target.value as CriticalDate['category'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Contract">Contract</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Lease">Lease</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Regulatory">Regulatory</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={newDate.priority}
                  onChange={(e) => setNewDate(prev => ({ ...prev, priority: e.target.value as CriticalDate['priority'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newDate.status}
                  onChange={(e) => setNewDate(prev => ({ ...prev, status: e.target.value as CriticalDate['status'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <input
                  type="text"
                  value={newDate.assignedTo}
                  onChange={(e) => setNewDate(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset ID</label>
                <input
                  type="text"
                  value={newDate.assetId}
                  onChange={(e) => setNewDate(prev => ({ ...prev, assetId: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset Name</label>
                <input
                  type="text"
                  value={newDate.assetName}
                  onChange={(e) => setNewDate(prev => ({ ...prev, assetName: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reminder Days</label>
                <input
                  type="number"
                  value={newDate.reminderDays}
                  onChange={(e) => setNewDate(prev => ({ ...prev, reminderDays: parseInt(e.target.value) || 7 }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={newDate.isRecurring}
                  onChange={(e) => setNewDate(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                  Recurring
                </label>
              </div>
              {newDate.isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recurrence Pattern</label>
                  <select
                    value={newDate.recurrencePattern}
                    onChange={(e) => setNewDate(prev => ({ ...prev, recurrencePattern: e.target.value as CriticalDate['recurrencePattern'] }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input
                type="text"
                value={newDate.tags}
                onChange={(e) => setNewDate(prev => ({ ...prev, tags: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="urgent, important, review"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newDate.description}
                onChange={(e) => setNewDate(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={newDate.notes}
                onChange={(e) => setNewDate(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Critical Date'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredDates.map((date) => (
          <div key={date.id} className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold">{date.title}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(date.priority)}`}>
                    {date.priority}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(date.status)}`}>
                    {date.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(date.category)}`}>
                    {date.category}
                  </span>
                  {date.status === 'Upcoming' && isOverdue(date.date) && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-semibold">
                      OVERDUE
                    </span>
                  )}
                  {date.status === 'Upcoming' && isDueSoon(date.date, date.reminderDays) && !isOverdue(date.date) && (
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-semibold">
                      Due in {getDaysUntilDate(date.date)} days
                    </span>
                  )}
                </div>
                <p className="text-gray-600">
                  {new Date(date.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                {date.assetName && (
                  <p className="text-sm text-gray-500">Asset: {date.assetName} (ID: {date.assetId})</p>
                )}
                {date.assignedTo && (
                  <p className="text-sm text-gray-500">Assigned to: {date.assignedTo}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Reminder: {date.reminderDays} days</p>
                  {date.isRecurring && (
                    <p className="text-sm text-gray-600">Recurring: {date.recurrencePattern}</p>
                  )}
                </div>
                <div className="flex space-x-1">
                  {date.status !== 'Completed' && date.status !== 'Cancelled' && (
                    <button
                      onClick={() => updateDateStatus(date.id, 'Completed')}
                      className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Complete
                    </button>
                  )}
                  {date.status !== 'Cancelled' && (
                    <button
                      onClick={() => updateDateStatus(date.id, 'Cancelled')}
                      className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedDate(selectedDate?.id === date.id ? null : date)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    {selectedDate?.id === date.id ? 'Hide' : 'Details'}
                  </button>
                  <button
                    onClick={() => deleteDate(date.id)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {selectedDate?.id === date.id && (
              <div className="mt-6 border-t pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Recurring</p>
                    <p className="font-semibold">{date.isRecurring ? 'Yes' : 'No'}</p>
                    {date.isRecurring && date.nextOccurrence && (
                      <p className="text-xs text-gray-500">
                        Next: {new Date(date.nextOccurrence).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reminder Days</p>
                    <p className="font-semibold">{date.reminderDays}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Priority</p>
                    <p className="font-semibold">{date.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-semibold">{date.category}</p>
                  </div>
                </div>

                {date.description && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Description</h4>
                    <p className="text-gray-700">{date.description}</p>
                  </div>
                )}

                {date.notes && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Notes</h4>
                    <p className="text-gray-700">{date.notes}</p>
                  </div>
                )}

                {date.tags.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {date.tags.map((tag, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4">
              <p>Created: {new Date(date.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(date.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredDates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {filterCategory === 'All' && filterPriority === 'All' && filterStatus === 'All'
              ? 'No critical dates found. Create your first critical date to get started.'
              : 'No critical dates match the selected filters.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default CriticalDateServicePage;
