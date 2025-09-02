import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface EmergencyPlan {
  id: string;
  title: string;
  description?: string;
  type: 'Fire' | 'Medical' | 'Security' | 'NaturalDisaster' | 'Chemical' | 'General';
  status: 'Draft' | 'Active' | 'UnderReview' | 'Archived';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  location: string;
  responsiblePerson: string;
  contactInfo: {
    phone: string;
    email: string;
    alternateContact?: string;
  };
  procedures: {
    id: string;
    step: number;
    title: string;
    description: string;
    estimatedTime: number; // minutes
    requiredResources: string[];
  }[];
  evacuationRoutes: {
    id: string;
    name: string;
    description: string;
    distance: number; // meters
    estimatedTime: number; // minutes
  }[];
  emergencyContacts: {
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    available24x7: boolean;
  }[];
  equipment: {
    id: string;
    name: string;
    type: string;
    location: string;
    quantity: number;
    lastInspected: string;
    nextInspection: string;
  }[];
  lastReviewed: string;
  nextReview: string;
  createdAt: string;
  updatedAt: string;
}

interface EmergencyIncident {
  id: string;
  planId?: string;
  title: string;
  description: string;
  type: 'Fire' | 'Medical' | 'Security' | 'NaturalDisaster' | 'Chemical' | 'Other';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Reported' | 'Responding' | 'Contained' | 'Resolved' | 'FalseAlarm';
  location: string;
  reportedBy: string;
  reportedAt: string;
  respondedAt?: string;
  resolvedAt?: string;
  casualties?: number;
  propertyDamage?: string;
  actions: {
    id: string;
    timestamp: string;
    action: string;
    performedBy: string;
    notes?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

const EmergencyPlanningServicePage = () => {
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'incidents'>('plans');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<EmergencyPlan | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<EmergencyIncident | null>(null);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [creating, setCreating] = useState(false);

  // Form state for plans
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    type: 'General' as EmergencyPlan['type'],
    status: 'Draft' as EmergencyPlan['status'],
    priority: 'Medium' as EmergencyPlan['priority'],
    location: '',
    responsiblePerson: '',
    contactInfo: {
      phone: '',
      email: '',
      alternateContact: ''
    },
    procedures: '',
    evacuationRoutes: '',
    emergencyContacts: '',
    equipment: '',
    nextReview: ''
  });

  // Form state for incidents
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    type: 'Other' as EmergencyIncident['type'],
    severity: 'Medium' as EmergencyIncident['severity'],
    status: 'Reported' as EmergencyIncident['status'],
    location: '',
    reportedBy: '',
    casualties: 0,
    propertyDamage: '',
    actions: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, incidentsData] = await Promise.all([
        apiService.generic.getAll<EmergencyPlan>('emergency-plans'),
        apiService.generic.getAll<EmergencyIncident>('emergency-incidents')
      ]);
      setPlans(plansData);
      setIncidents(incidentsData);
    } catch (err) {
      setError('Failed to load emergency planning data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.title || !newPlan.location || !newPlan.responsiblePerson) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const planData = {
        ...newPlan,
        procedures: newPlan.procedures.split(';').map((proc, index) => {
          const [title, description, time, resources] = proc.split('|').map(s => s.trim());
          return title && description ? {
            step: index + 1,
            title,
            description,
            estimatedTime: parseInt(time) || 0,
            requiredResources: resources ? resources.split(',').map(r => r.trim()) : []
          } : null;
        }).filter(Boolean),
        evacuationRoutes: newPlan.evacuationRoutes.split(';').map(route => {
          const [name, description, distance, time] = route.split('|').map(s => s.trim());
          return name && description ? {
            name,
            description,
            distance: parseInt(distance) || 0,
            estimatedTime: parseInt(time) || 0
          } : null;
        }).filter(Boolean),
        emergencyContacts: newPlan.emergencyContacts.split(';').map(contact => {
          const [name, role, phone, email, available24x7] = contact.split('|').map(s => s.trim());
          return name && role && phone && email ? {
            name,
            role,
            phone,
            email,
            available24x7: available24x7 === 'true'
          } : null;
        }).filter(Boolean),
        equipment: newPlan.equipment.split(';').map(equip => {
          const [name, type, location, quantity, nextInspection] = equip.split('|').map(s => s.trim());
          return name && type && location ? {
            name,
            type,
            location,
            quantity: parseInt(quantity) || 1,
            lastInspected: new Date().toISOString(),
            nextInspection: nextInspection ? new Date(nextInspection).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          } : null;
        }).filter(Boolean),
        lastReviewed: new Date().toISOString(),
        nextReview: new Date(newPlan.nextReview).toISOString()
      };

      const createdPlan = await apiService.generic.create<EmergencyPlan>('emergency-plans', planData);

      setPlans(prev => [createdPlan, ...prev]);
      setNewPlan({
        title: '',
        description: '',
        type: 'General',
        status: 'Draft',
        priority: 'Medium',
        location: '',
        responsiblePerson: '',
        contactInfo: {
          phone: '',
          email: '',
          alternateContact: ''
        },
        procedures: '',
        evacuationRoutes: '',
        emergencyContacts: '',
        equipment: '',
        nextReview: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create emergency plan. Please try again.');
      console.error('Error creating plan:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.title || !newIncident.location || !newIncident.reportedBy) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const incidentData = {
        ...newIncident,
        reportedAt: new Date().toISOString(),
        actions: newIncident.actions.split(';').map(action => {
          const [actionText, performedBy, notes] = action.split('|').map(s => s.trim());
          return actionText && performedBy ? {
            timestamp: new Date().toISOString(),
            action: actionText,
            performedBy,
            notes
          } : null;
        }).filter(Boolean)
      };

      const createdIncident = await apiService.generic.create<EmergencyIncident>('emergency-incidents', incidentData);

      setIncidents(prev => [createdIncident, ...prev]);
      setNewIncident({
        title: '',
        description: '',
        type: 'Other',
        severity: 'Medium',
        status: 'Reported',
        location: '',
        reportedBy: '',
        casualties: 0,
        propertyDamage: '',
        actions: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create emergency incident. Please try again.');
      console.error('Error creating incident:', err);
    } finally {
      setCreating(false);
    }
  };

  const updatePlanStatus = async (planId: string, status: EmergencyPlan['status']) => {
    try {
      setError(null);
      await apiService.generic.update<EmergencyPlan>('emergency-plans', parseInt(planId), { status });
      setPlans(prev => prev.map(plan =>
        plan.id === planId ? { ...plan, status } : plan
      ));
    } catch (err) {
      setError('Failed to update plan status. Please try again.');
      console.error('Error updating plan:', err);
    }
  };

  const updateIncidentStatus = async (incidentId: string, status: EmergencyIncident['status']) => {
    try {
      setError(null);
      const updateData: Partial<EmergencyIncident> = { status };
      if (status === 'Responding' && !incidents.find(i => i.id === incidentId)?.respondedAt) {
        updateData.respondedAt = new Date().toISOString();
      } else if (status === 'Resolved' && !incidents.find(i => i.id === incidentId)?.resolvedAt) {
        updateData.resolvedAt = new Date().toISOString();
      }

      await apiService.generic.update<EmergencyIncident>('emergency-incidents', parseInt(incidentId), updateData);
      setIncidents(prev => prev.map(incident =>
        incident.id === incidentId ? { ...incident, ...updateData } : incident
      ));
    } catch (err) {
      setError('Failed to update incident status. Please try again.');
      console.error('Error updating incident:', err);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this emergency plan? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('emergency-plans', parseInt(planId));
      setPlans(prev => prev.filter(plan => plan.id !== planId));
    } catch (err) {
      setError('Failed to delete emergency plan. Please try again.');
      console.error('Error deleting plan:', err);
    }
  };

  const deleteIncident = async (incidentId: string) => {
    if (!confirm('Are you sure you want to delete this emergency incident? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('emergency-incidents', parseInt(incidentId));
      setIncidents(prev => prev.filter(incident => incident.id !== incidentId));
    } catch (err) {
      setError('Failed to delete emergency incident. Please try again.');
      console.error('Error deleting incident:', err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Fire': return 'bg-red-100 text-red-800';
      case 'Medical': return 'bg-blue-100 text-blue-800';
      case 'Security': return 'bg-purple-100 text-purple-800';
      case 'NaturalDisaster': return 'bg-orange-100 text-orange-800';
      case 'Chemical': return 'bg-green-100 text-green-800';
      case 'General': return 'bg-gray-100 text-gray-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'UnderReview': return 'bg-blue-100 text-blue-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      case 'Reported': return 'bg-red-100 text-red-800';
      case 'Responding': return 'bg-orange-100 text-orange-800';
      case 'Contained': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'FalseAlarm': return 'bg-gray-100 text-gray-800';
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPlans = plans.filter(plan => {
    const typeMatch = filterType === 'All' || plan.type === filterType;
    const statusMatch = filterStatus === 'All' || plan.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const filteredIncidents = incidents.filter(incident => {
    const typeMatch = filterType === 'All' || incident.type === filterType;
    const severityMatch = filterSeverity === 'All' || incident.severity === filterSeverity;
    return typeMatch && severityMatch;
  });

  const getStats = () => {
    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.status === 'Active').length;
    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter(i => i.status === 'Resolved').length;
    const criticalIncidents = incidents.filter(i => i.severity === 'Critical').length;
    const recentIncidents = incidents.filter(i =>
      new Date(i.reportedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    return { totalPlans, activePlans, totalIncidents, resolvedIncidents, criticalIncidents, recentIncidents };
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
      <h1 className="text-3xl font-bold mb-6">Emergency Planning Service</h1>

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

      {/* Emergency Planning Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Plans</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalPlans}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active Plans</h3>
          <p className="text-2xl font-bold text-green-600">{stats.activePlans}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Incidents</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.totalIncidents}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Resolved</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.resolvedIncidents}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Critical</h3>
          <p className="text-2xl font-bold text-red-600">{stats.criticalIncidents}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Recent (30d)</h3>
          <p className="text-2xl font-bold text-indigo-600">{stats.recentIncidents}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'plans'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Emergency Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'incidents'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Incidents ({incidents.length})
        </button>
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Emergency Plans</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Types</option>
                  <option value="Fire">Fire</option>
                  <option value="Medical">Medical</option>
                  <option value="Security">Security</option>
                  <option value="NaturalDisaster">Natural Disaster</option>
                  <option value="Chemical">Chemical</option>
                  <option value="General">General</option>
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
                  <option value="UnderReview">Under Review</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Emergency Plan</h3>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Title *</label>
                    <input
                      type="text"
                      value={newPlan.title}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newPlan.type}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, type: e.target.value as EmergencyPlan['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Fire">Fire</option>
                      <option value="Medical">Medical</option>
                      <option value="Security">Security</option>
                      <option value="NaturalDisaster">Natural Disaster</option>
                      <option value="Chemical">Chemical</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location *</label>
                    <input
                      type="text"
                      value={newPlan.location}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, location: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Responsible Person *</label>
                    <input
                      type="text"
                      value={newPlan.responsiblePerson}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, responsiblePerson: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={newPlan.contactInfo.phone}
                      onChange={(e) => setNewPlan(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, phone: e.target.value }
                      }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={newPlan.contactInfo.email}
                      onChange={(e) => setNewPlan(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, email: e.target.value }
                      }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={newPlan.priority}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, priority: e.target.value as EmergencyPlan['priority'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Next Review Date</label>
                    <input
                      type="date"
                      value={newPlan.nextReview}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, nextReview: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Alternate Contact</label>
                  <input
                    type="text"
                    value={newPlan.contactInfo.alternateContact}
                    onChange={(e) => setNewPlan(prev => ({
                      ...prev,
                      contactInfo: { ...prev.contactInfo, alternateContact: e.target.value }
                    }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Procedures (title|description|time|resources; ...)</label>
                  <textarea
                    value={newPlan.procedures}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, procedures: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Evacuate building|Clear all personnel from building|10|megaphone,flashlight; Call emergency services|Contact local fire department|2|phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Evacuation Routes (name|description|distance|time; ...)</label>
                  <textarea
                    value={newPlan.evacuationRoutes}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, evacuationRoutes: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Main exit|Primary building exit to parking lot|200|5; Emergency stairs|Stairwell exit to ground level|150|3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Emergency Contacts (name|role|phone|email|24x7; ...)</label>
                  <textarea
                    value={newPlan.emergencyContacts}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, emergencyContacts: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="John Smith|Fire Chief|555-0101|john@firedept.com|true; Emergency Services|Local Police|555-0111|police@city.com|false"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Equipment (name|type|location|quantity|nextInspection; ...)</label>
                  <textarea
                    value={newPlan.equipment}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, equipment: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Fire Extinguisher|Safety Equipment|Lobby|4|2024-12-31; First Aid Kit|Medical|Office|2|2024-06-30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Emergency Plan'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredPlans.map((plan) => (
              <div key={plan.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{plan.title}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(plan.type)}`}>
                        {plan.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(plan.status)}`}>
                        {plan.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(plan.priority)}`}>
                        {plan.priority}
                      </span>
                    </div>
                    <p className="text-gray-600">{plan.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Location: {plan.location}</span>
                      <span>Responsible: {plan.responsiblePerson}</span>
                      <span>Next Review: {new Date(plan.nextReview).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Procedures: {plan.procedures.length}
                      </p>
                      <p className="text-sm text-gray-600">
                        Contacts: {plan.emergencyContacts.length}
                      </p>
                      <p className="text-sm text-gray-600">
                        Equipment: {plan.equipment.length}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {plan.status !== 'Active' && plan.status !== 'Archived' && (
                        <button
                          onClick={() => updatePlanStatus(plan.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedPlan?.id === plan.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedPlan?.id === plan.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Contact Phone</p>
                        <p className="font-semibold">{plan.contactInfo.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Contact Email</p>
                        <p className="font-semibold">{plan.contactInfo.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Alternate Contact</p>
                        <p className="font-semibold">{plan.contactInfo.alternateContact || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Reviewed</p>
                        <p className="font-semibold">{new Date(plan.lastReviewed).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {plan.procedures.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Emergency Procedures ({plan.procedures.length})</h4>
                        <div className="space-y-3">
                          {plan.procedures.map((procedure) => (
                            <div key={procedure.id} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium">Step {procedure.step}: {procedure.title}</h5>
                                <span className="text-sm text-gray-600">{procedure.estimatedTime} min</span>
                              </div>
                              <p className="text-gray-700 text-sm mb-2">{procedure.description}</p>
                              {procedure.requiredResources.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {procedure.requiredResources.map((resource, index) => (
                                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                      {resource}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {plan.evacuationRoutes.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Evacuation Routes ({plan.evacuationRoutes.length})</h4>
                        <div className="space-y-2">
                          {plan.evacuationRoutes.map((route) => (
                            <div key={route.id} className="flex justify-between items-center bg-white p-3 rounded border">
                              <div className="flex-1">
                                <p className="font-medium">{route.name}</p>
                                <p className="text-sm text-gray-600">{route.description}</p>
                              </div>
                              <div className="text-right text-sm text-gray-600">
                                <p>{route.distance}m • {route.estimatedTime}min</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {plan.emergencyContacts.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Emergency Contacts ({plan.emergencyContacts.length})</h4>
                        <div className="space-y-2">
                          {plan.emergencyContacts.map((contact) => (
                            <div key={contact.id} className="flex justify-between items-center bg-white p-3 rounded border">
                              <div className="flex-1">
                                <p className="font-medium">{contact.name}</p>
                                <p className="text-sm text-gray-600">{contact.role}</p>
                                <p className="text-sm text-gray-600">{contact.phone} • {contact.email}</p>
                              </div>
                              {contact.available24x7 && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                  24/7
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {plan.equipment.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Emergency Equipment ({plan.equipment.length})</h4>
                        <div className="space-y-2">
                          {plan.equipment.map((equip) => (
                            <div key={equip.id} className="flex justify-between items-center bg-white p-3 rounded border">
                              <div className="flex-1">
                                <p className="font-medium">{equip.name}</p>
                                <p className="text-sm text-gray-600">{equip.type} • Location: {equip.location}</p>
                                <p className="text-sm text-gray-600">
                                  Next Inspection: {new Date(equip.nextInspection).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">Qty: {equip.quantity}</p>
                                <p className="text-xs text-gray-500">
                                  Last: {new Date(equip.lastInspected).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(plan.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(plan.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredPlans.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterType === 'All' && filterStatus === 'All'
                  ? 'No emergency plans found. Create your first emergency plan to get started.'
                  : 'No emergency plans match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Emergency Incidents</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Types</option>
                  <option value="Fire">Fire</option>
                  <option value="Medical">Medical</option>
                  <option value="Security">Security</option>
                  <option value="NaturalDisaster">Natural Disaster</option>
                  <option value="Chemical">Chemical</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Severities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Report Incident'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-red-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Report New Emergency Incident</h3>
              <form onSubmit={handleCreateIncident} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Incident Title *</label>
                    <input
                      type="text"
                      value={newIncident.title}
                      onChange={(e) => setNewIncident(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newIncident.type}
                      onChange={(e) => setNewIncident(prev => ({ ...prev, type: e.target.value as EmergencyIncident['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Fire">Fire</option>
                      <option value="Medical">Medical</option>
                      <option value="Security">Security</option>
                      <option value="NaturalDisaster">Natural Disaster</option>
                      <option value="Chemical">Chemical</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location *</label>
                    <input
                      type="text"
                      value={newIncident.location}
                      onChange={(e) => setNewIncident(prev => ({ ...prev, location: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reported By *</label>
                    <input
                      type="text"
                      value={newIncident.reportedBy}
                      onChange={(e) => setNewIncident(prev => ({ ...prev, reportedBy: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <select
                      value={newIncident.severity}
                      onChange={(e) => setNewIncident(prev => ({ ...prev, severity: e.target.value as EmergencyIncident['severity'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Casualties</label>
                    <input
                      type="number"
                      value={newIncident.casualties}
                      onChange={(e) => setNewIncident(prev => ({ ...prev, casualties: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Property Damage</label>
                  <input
                    type="text"
                    value={newIncident.propertyDamage}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, propertyDamage: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describe any property damage..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Actions (action|performedBy|notes; ...)</label>
                  <textarea
                    value={newIncident.actions}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, actions: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Called emergency services|John Smith|Contacted local fire department at 555-0101; Evacuated building|Jane Doe|Cleared all personnel from affected area"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newIncident.description}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Reporting...' : 'Report Emergency Incident'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredIncidents.map((incident) => (
              <div key={incident.id} className="bg-red-50 shadow rounded-lg p-6 border border-red-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{incident.title}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(incident.type)}`}>
                        {incident.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-gray-600">{incident.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Location: {incident.location}</span>
                      <span>Reported by: {incident.reportedBy}</span>
                      <span>Reported: {new Date(incident.reportedAt).toLocaleString()}</span>
                      {incident.respondedAt && (
                        <span>Responded: {new Date(incident.respondedAt).toLocaleString()}</span>
                      )}
                      {incident.resolvedAt && (
                        <span>Resolved: {new Date(incident.resolvedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      {incident.casualties && incident.casualties > 0 && (
                        <p className="text-sm text-red-600 font-semibold">
                          Casualties: {incident.casualties}
                        </p>
                      )}
                      {incident.propertyDamage && (
                        <p className="text-sm text-orange-600">
                          Property Damage
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Actions: {incident.actions.length}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {incident.status !== 'Resolved' && incident.status !== 'FalseAlarm' && (
                        <>
                          {incident.status === 'Reported' && (
                            <button
                              onClick={() => updateIncidentStatus(incident.id, 'Responding')}
                              className="bg-orange-500 hover:bg-orange-700 text-white text-xs px-2 py-1 rounded"
                            >
                              Start Response
                            </button>
                          )}
                          {incident.status === 'Responding' && (
                            <button
                              onClick={() => updateIncidentStatus(incident.id, 'Contained')}
                              className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                            >
                              Contain
                            </button>
                          )}
                          {(incident.status === 'Responding' || incident.status === 'Contained') && (
                            <button
                              onClick={() => updateIncidentStatus(incident.id, 'Resolved')}
                              className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => updateIncidentStatus(incident.id, 'FalseAlarm')}
                            className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                          >
                            False Alarm
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedIncident(selectedIncident?.id === incident.id ? null : incident)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedIncident?.id === incident.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteIncident(incident.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedIncident?.id === incident.id && (
                  <div className="mt-6 border-t pt-6">
                    {incident.propertyDamage && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Property Damage</h4>
                        <p className="text-gray-700">{incident.propertyDamage}</p>
                      </div>
                    )}

                    {incident.actions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-4">Incident Timeline ({incident.actions.length} actions)</h4>
                        <div className="space-y-3">
                          {incident.actions.map((action) => (
                            <div key={action.id} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium">{action.action}</h5>
                                <div className="text-right text-sm text-gray-600">
                                  <p>{action.performedBy}</p>
                                  <p>{new Date(action.timestamp).toLocaleString()}</p>
                                </div>
                              </div>
                              {action.notes && (
                                <p className="text-gray-700 text-sm">{action.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(incident.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(incident.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredIncidents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterType === 'All' && filterSeverity === 'All'
                  ? 'No emergency incidents found. Report your first incident to get started.'
                  : 'No emergency incidents match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmergencyPlanningServicePage;
