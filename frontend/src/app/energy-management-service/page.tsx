import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface EnergyMeter {
  id: string;
  name: string;
  location: string;
  type: 'Electricity' | 'Gas' | 'Water' | 'Steam' | 'Other';
  unit: string;
  currentReading: number;
  previousReading: number;
  consumption: number;
  cost: number;
  lastReadingDate: string;
  nextReadingDate: string;
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Faulty';
  alerts: {
    id: string;
    type: 'HighConsumption' | 'LowConsumption' | 'NoReading' | 'Fault' | 'MaintenanceDue';
    message: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    timestamp: string;
    acknowledged: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface EnergyConsumption {
  id: string;
  meterId: string;
  date: string;
  reading: number;
  consumption: number;
  cost: number;
  peakDemand?: number;
  offPeakDemand?: number;
  temperature?: number;
  humidity?: number;
  notes?: string;
  createdAt: string;
}

interface EnergyEfficiency {
  id: string;
  title: string;
  description: string;
  category: 'Lighting' | 'HVAC' | 'Equipment' | 'Building' | 'Renewable' | 'Other';
  status: 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
  estimatedSavings: number;
  actualSavings?: number;
  implementationCost: number;
  paybackPeriod: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo: string;
  targetCompletionDate: string;
  actualCompletionDate?: string;
  measures: {
    id: string;
    description: string;
    estimatedSavings: number;
    status: 'NotStarted' | 'InProgress' | 'Completed';
  }[];
  createdAt: string;
  updatedAt: string;
}

const EnergyManagementServicePage = () => {
  const [meters, setMeters] = useState<EnergyMeter[]>([]);
  const [consumption, setConsumption] = useState<EnergyConsumption[]>([]);
  const [efficiencyProjects, setEfficiencyProjects] = useState<EnergyEfficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'meters' | 'consumption' | 'efficiency'>('meters');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState<EnergyMeter | null>(null);
  const [selectedConsumption, setSelectedConsumption] = useState<EnergyConsumption | null>(null);
  const [selectedProject, setSelectedProject] = useState<EnergyEfficiency | null>(null);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [creating, setCreating] = useState(false);

  // Form state for meters
  const [newMeter, setNewMeter] = useState({
    name: '',
    location: '',
    type: 'Electricity' as EnergyMeter['type'],
    unit: 'kWh',
    currentReading: 0,
    previousReading: 0,
    cost: 0,
    nextReadingDate: ''
  });

  // Form state for consumption
  const [newConsumption, setNewConsumption] = useState({
    meterId: '',
    date: '',
    reading: 0,
    cost: 0,
    peakDemand: 0,
    offPeakDemand: 0,
    temperature: 0,
    humidity: 0,
    notes: ''
  });

  // Form state for efficiency projects
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: 'Other' as EnergyEfficiency['category'],
    status: 'Planned' as EnergyEfficiency['status'],
    estimatedSavings: 0,
    implementationCost: 0,
    paybackPeriod: 0,
    priority: 'Medium' as EnergyEfficiency['priority'],
    assignedTo: '',
    targetCompletionDate: '',
    measures: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [metersData, consumptionData, projectsData] = await Promise.all([
        apiService.generic.getAll<EnergyMeter>('energy-meters'),
        apiService.generic.getAll<EnergyConsumption>('energy-consumption'),
        apiService.generic.getAll<EnergyEfficiency>('energy-efficiency')
      ]);
      setMeters(metersData);
      setConsumption(consumptionData);
      setEfficiencyProjects(projectsData);
    } catch (err) {
      setError('Failed to load energy management data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeter.name || !newMeter.location) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const meterData = {
        ...newMeter,
        consumption: newMeter.currentReading - newMeter.previousReading,
        lastReadingDate: new Date().toISOString(),
        nextReadingDate: new Date(newMeter.nextReadingDate).toISOString(),
        status: 'Active' as EnergyMeter['status'],
        alerts: []
      };

      const createdMeter = await apiService.generic.create<EnergyMeter>('energy-meters', meterData);

      setMeters(prev => [createdMeter, ...prev]);
      setNewMeter({
        name: '',
        location: '',
        type: 'Electricity',
        unit: 'kWh',
        currentReading: 0,
        previousReading: 0,
        cost: 0,
        nextReadingDate: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create energy meter. Please try again.');
      console.error('Error creating meter:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsumption.meterId || !newConsumption.date || newConsumption.reading <= 0) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const meter = meters.find(m => m.id === newConsumption.meterId);
      if (!meter) {
        setError('Selected meter not found.');
        return;
      }

      const consumptionData = {
        ...newConsumption,
        consumption: newConsumption.reading - meter.currentReading,
        date: new Date(newConsumption.date).toISOString()
      };

      const createdConsumption = await apiService.generic.create<EnergyConsumption>('energy-consumption', consumptionData);

      setConsumption(prev => [createdConsumption, ...prev]);

      // Update meter reading
      await apiService.generic.update<EnergyMeter>('energy-meters', parseInt(newConsumption.meterId), {
        currentReading: newConsumption.reading,
        previousReading: meter.currentReading,
        consumption: newConsumption.reading - meter.previousReading,
        cost: newConsumption.cost,
        lastReadingDate: new Date().toISOString()
      });

      setNewConsumption({
        meterId: '',
        date: '',
        reading: 0,
        cost: 0,
        peakDemand: 0,
        offPeakDemand: 0,
        temperature: 0,
        humidity: 0,
        notes: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to record energy consumption. Please try again.');
      console.error('Error creating consumption:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !newProject.assignedTo || !newProject.targetCompletionDate) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const projectData = {
        ...newProject,
        targetCompletionDate: new Date(newProject.targetCompletionDate).toISOString(),
        measures: newProject.measures.split(';').map((measure) => {
          const [description, savings] = measure.split('|').map(s => s.trim());
          return description ? {
            description,
            estimatedSavings: parseFloat(savings) || 0,
            status: 'NotStarted' as const
          } : null;
        }).filter(Boolean)
      };

      const createdProject = await apiService.generic.create<EnergyEfficiency>('energy-efficiency', projectData);

      setEfficiencyProjects(prev => [createdProject, ...prev]);
      setNewProject({
        title: '',
        description: '',
        category: 'Other',
        status: 'Planned',
        estimatedSavings: 0,
        implementationCost: 0,
        paybackPeriod: 0,
        priority: 'Medium',
        assignedTo: '',
        targetCompletionDate: '',
        measures: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create efficiency project. Please try again.');
      console.error('Error creating project:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateMeterStatus = async (meterId: string, status: EnergyMeter['status']) => {
    try {
      setError(null);
      await apiService.generic.update<EnergyMeter>('energy-meters', parseInt(meterId), { status });
      setMeters(prev => prev.map(meter =>
        meter.id === meterId ? { ...meter, status } : meter
      ));
    } catch (err) {
      setError('Failed to update meter status. Please try again.');
      console.error('Error updating meter:', err);
    }
  };

  const updateProjectStatus = async (projectId: string, status: EnergyEfficiency['status']) => {
    try {
      setError(null);
      const updateData: Partial<EnergyEfficiency> = { status };
      if (status === 'Completed') {
        updateData.actualCompletionDate = new Date().toISOString();
      }
      await apiService.generic.update<EnergyEfficiency>('energy-efficiency', parseInt(projectId), updateData);
      setEfficiencyProjects(prev => prev.map(project =>
        project.id === projectId ? { ...project, ...updateData } : project
      ));
    } catch (err) {
      setError('Failed to update project status. Please try again.');
      console.error('Error updating project:', err);
    }
  };

  const deleteMeter = async (meterId: string) => {
    if (!confirm('Are you sure you want to delete this energy meter? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('energy-meters', parseInt(meterId));
      setMeters(prev => prev.filter(meter => meter.id !== meterId));
    } catch (err) {
      setError('Failed to delete energy meter. Please try again.');
      console.error('Error deleting meter:', err);
    }
  };

  const deleteConsumption = async (consumptionId: string) => {
    if (!confirm('Are you sure you want to delete this consumption record? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('energy-consumption', parseInt(consumptionId));
      setConsumption(prev => prev.filter(record => record.id !== consumptionId));
    } catch (err) {
      setError('Failed to delete consumption record. Please try again.');
      console.error('Error deleting consumption:', err);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this efficiency project? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('energy-efficiency', parseInt(projectId));
      setEfficiencyProjects(prev => prev.filter(project => project.id !== projectId));
    } catch (err) {
      setError('Failed to delete efficiency project. Please try again.');
      console.error('Error deleting project:', err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Electricity': return 'bg-yellow-100 text-yellow-800';
      case 'Gas': return 'bg-blue-100 text-blue-800';
      case 'Water': return 'bg-cyan-100 text-cyan-800';
      case 'Steam': return 'bg-red-100 text-red-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Faulty': return 'bg-red-100 text-red-800';
      case 'Planned': return 'bg-blue-100 text-blue-800';
      case 'InProgress': return 'bg-orange-100 text-orange-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Lighting': return 'bg-yellow-100 text-yellow-800';
      case 'HVAC': return 'bg-blue-100 text-blue-800';
      case 'Equipment': return 'bg-purple-100 text-purple-800';
      case 'Building': return 'bg-green-100 text-green-800';
      case 'Renewable': return 'bg-orange-100 text-orange-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
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

  const filteredMeters = meters.filter(meter => {
    const typeMatch = filterType === 'All' || meter.type === filterType;
    const statusMatch = filterStatus === 'All' || meter.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const filteredConsumption = consumption.filter(record => {
    const meterMatch = !newConsumption.meterId || record.meterId === newConsumption.meterId;
    const dateMatch = (!dateRange.start || new Date(record.date) >= new Date(dateRange.start)) &&
                     (!dateRange.end || new Date(record.date) <= new Date(dateRange.end));
    return meterMatch && dateMatch;
  });

  const filteredProjects = efficiencyProjects.filter(project => {
    const categoryMatch = filterCategory === 'All' || project.category === filterCategory;
    const statusMatch = filterStatus === 'All' || project.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  const getStats = () => {
    const totalMeters = meters.length;
    const activeMeters = meters.filter(m => m.status === 'Active').length;
    const totalConsumption = consumption.reduce((sum, record) => sum + record.consumption, 0);
    const totalCost = consumption.reduce((sum, record) => sum + record.cost, 0);
    const totalAlerts = meters.reduce((sum, meter) => sum + meter.alerts.length, 0);
    const activeProjects = efficiencyProjects.filter(p => p.status === 'InProgress').length;
    const completedProjects = efficiencyProjects.filter(p => p.status === 'Completed').length;
    const totalSavings = efficiencyProjects
      .filter(p => p.actualSavings)
      .reduce((sum, p) => sum + (p.actualSavings || 0), 0);

    return { totalMeters, activeMeters, totalConsumption, totalCost, totalAlerts, activeProjects, completedProjects, totalSavings };
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
      <h1 className="text-3xl font-bold mb-6">Energy Management Service</h1>

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

      {/* Energy Management Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Meters</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalMeters}</p>
          <p className="text-sm text-gray-600">{stats.activeMeters} active</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Consumption</h3>
          <p className="text-2xl font-bold text-green-600">{stats.totalConsumption.toLocaleString()}</p>
          <p className="text-sm text-gray-600">units</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Cost</h3>
          <p className="text-2xl font-bold text-red-600">${stats.totalCost.toLocaleString()}</p>
          <p className="text-sm text-gray-600">this period</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active Alerts</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.totalAlerts}</p>
          <p className="text-sm text-gray-600">requiring attention</p>
        </div>
      </div>

      {/* Efficiency Projects Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active Projects</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.activeProjects}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Completed Projects</h3>
          <p className="text-2xl font-bold text-green-600">{stats.completedProjects}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Savings</h3>
          <p className="text-2xl font-bold text-blue-600">${stats.totalSavings.toLocaleString()}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('meters')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'meters'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Energy Meters ({meters.length})
        </button>
        <button
          onClick={() => setActiveTab('consumption')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'consumption'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Consumption ({consumption.length})
        </button>
        <button
          onClick={() => setActiveTab('efficiency')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'efficiency'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Efficiency ({efficiencyProjects.length})
        </button>
      </div>

      {/* Meters Tab */}
      {activeTab === 'meters' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Energy Meters</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Types</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Gas">Gas</option>
                  <option value="Water">Water</option>
                  <option value="Steam">Steam</option>
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
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Faulty">Faulty</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Meter'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Energy Meter</h3>
              <form onSubmit={handleCreateMeter} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Meter Name *</label>
                    <input
                      type="text"
                      value={newMeter.name}
                      onChange={(e) => setNewMeter(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location *</label>
                    <input
                      type="text"
                      value={newMeter.location}
                      onChange={(e) => setNewMeter(prev => ({ ...prev, location: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newMeter.type}
                      onChange={(e) => setNewMeter(prev => ({ ...prev, type: e.target.value as EnergyMeter['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Electricity">Electricity</option>
                      <option value="Gas">Gas</option>
                      <option value="Water">Water</option>
                      <option value="Steam">Steam</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <input
                      type="text"
                      value={newMeter.unit}
                      onChange={(e) => setNewMeter(prev => ({ ...prev, unit: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="kWh, m³, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Reading</label>
                    <input
                      type="number"
                      value={newMeter.currentReading}
                      onChange={(e) => setNewMeter(prev => ({ ...prev, currentReading: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Previous Reading</label>
                    <input
                      type="number"
                      value={newMeter.previousReading}
                      onChange={(e) => setNewMeter(prev => ({ ...prev, previousReading: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost per Unit ($)</label>
                    <input
                      type="number"
                      value={newMeter.cost}
                      onChange={(e) => setNewMeter(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Next Reading Date</label>
                    <input
                      type="date"
                      value={newMeter.nextReadingDate}
                      onChange={(e) => setNewMeter(prev => ({ ...prev, nextReadingDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add Energy Meter'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredMeters.map((meter) => (
              <div key={meter.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{meter.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(meter.type)}`}>
                        {meter.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(meter.status)}`}>
                        {meter.status}
                      </span>
                    </div>
                    <p className="text-gray-600">{meter.location}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Current: {meter.currentReading.toLocaleString()} {meter.unit}</span>
                      <span>Consumption: {meter.consumption.toLocaleString()} {meter.unit}</span>
                      <span>Cost: ${meter.cost.toFixed(2)}</span>
                      <span>Next Reading: {new Date(meter.nextReadingDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Alerts: {meter.alerts.length}
                      </p>
                      <p className="text-sm text-gray-600">
                        Last Reading: {new Date(meter.lastReadingDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {meter.status !== 'Active' && (
                        <button
                          onClick={() => updateMeterStatus(meter.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedMeter(selectedMeter?.id === meter.id ? null : meter)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedMeter?.id === meter.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteMeter(meter.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedMeter?.id === meter.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Previous Reading</p>
                        <p className="font-semibold">{meter.previousReading.toLocaleString()} {meter.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Consumption</p>
                        <p className="font-semibold">{meter.consumption.toLocaleString()} {meter.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cost</p>
                        <p className="font-semibold">${meter.cost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Reading</p>
                        <p className="font-semibold">{new Date(meter.lastReadingDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {meter.alerts.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Active Alerts ({meter.alerts.length})</h4>
                        <div className="space-y-3">
                          {meter.alerts.map((alert) => (
                            <div key={alert.id} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium">{alert.type}</h5>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(alert.severity)}`}>
                                    {alert.severity}
                                  </span>
                                  {!alert.acknowledged && (
                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                                      Unacknowledged
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-700 text-sm mb-2">{alert.message}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(alert.timestamp).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(meter.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(meter.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredMeters.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterType === 'All' && filterStatus === 'All'
                  ? 'No energy meters found. Add your first energy meter to get started.'
                  : 'No energy meters match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Consumption Tab */}
      {activeTab === 'consumption' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Energy Consumption Records</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meter</label>
                <select
                  value={newConsumption.meterId}
                  onChange={(e) => setNewConsumption(prev => ({ ...prev, meterId: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Meters</option>
                  {meters.map(meter => (
                    <option key={meter.id} value={meter.id}>{meter.name} ({meter.location})</option>
                  ))}
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
                  {showCreateForm ? 'Cancel' : 'Add Reading'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Record Energy Consumption</h3>
              <form onSubmit={handleCreateConsumption} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Meter *</label>
                    <select
                      value={newConsumption.meterId}
                      onChange={(e) => setNewConsumption(prev => ({ ...prev, meterId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select a meter...</option>
                      {meters.filter(m => m.status === 'Active').map(meter => (
                        <option key={meter.id} value={meter.id}>
                          {meter.name} ({meter.location}) - Current: {meter.currentReading} {meter.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reading Date *</label>
                    <input
                      type="date"
                      value={newConsumption.date}
                      onChange={(e) => setNewConsumption(prev => ({ ...prev, date: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Meter Reading *</label>
                    <input
                      type="number"
                      value={newConsumption.reading}
                      onChange={(e) => setNewConsumption(prev => ({ ...prev, reading: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost ($)</label>
                    <input
                      type="number"
                      value={newConsumption.cost}
                      onChange={(e) => setNewConsumption(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Peak Demand (kW)</label>
                    <input
                      type="number"
                      value={newConsumption.peakDemand}
                      onChange={(e) => setNewConsumption(prev => ({ ...prev, peakDemand: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Off-Peak Demand (kW)</label>
                    <input
                      type="number"
                      value={newConsumption.offPeakDemand}
                      onChange={(e) => setNewConsumption(prev => ({ ...prev, offPeakDemand: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                    <input
                      type="number"
                      value={newConsumption.temperature}
                      onChange={(e) => setNewConsumption(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Humidity (%)</label>
                    <input
                      type="number"
                      value={newConsumption.humidity}
                      onChange={(e) => setNewConsumption(prev => ({ ...prev, humidity: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={newConsumption.notes}
                    onChange={(e) => setNewConsumption(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Recording...' : 'Record Consumption'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredConsumption.map((record) => {
              const meter = meters.find(m => m.id === record.meterId);
              return (
                <div key={record.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold">
                          {meter ? meter.name : 'Unknown Meter'}
                        </h3>
                        <span className="text-sm text-gray-600">
                          {new Date(record.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600">{meter?.location}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <span>Reading: {record.reading.toLocaleString()} {meter?.unit}</span>
                        <span>Consumption: {record.consumption.toLocaleString()} {meter?.unit}</span>
                        <span>Cost: ${record.cost.toFixed(2)}</span>
                        {record.peakDemand && <span>Peak: {record.peakDemand} kW</span>}
                        {record.temperature && <span>Temp: {record.temperature}°C</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        {record.offPeakDemand && (
                          <p className="text-sm text-gray-600">
                            Off-Peak: {record.offPeakDemand} kW
                          </p>
                        )}
                        {record.humidity && (
                          <p className="text-sm text-gray-600">
                            Humidity: {record.humidity}%
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setSelectedConsumption(selectedConsumption?.id === record.id ? null : record)}
                          className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                        >
                          {selectedConsumption?.id === record.id ? 'Hide' : 'Details'}
                        </button>
                        <button
                          onClick={() => deleteConsumption(record.id)}
                          className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedConsumption?.id === record.id && (
                    <div className="mt-6 border-t pt-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">Meter Reading</p>
                          <p className="font-semibold">{record.reading.toLocaleString()} {meter?.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Consumption</p>
                          <p className="font-semibold">{record.consumption.toLocaleString()} {meter?.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Cost</p>
                          <p className="font-semibold">${record.cost.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-semibold">{new Date(record.date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {record.peakDemand && record.offPeakDemand && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div>
                            <p className="text-sm text-gray-600">Peak Demand</p>
                            <p className="font-semibold">{record.peakDemand} kW</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Off-Peak Demand</p>
                            <p className="font-semibold">{record.offPeakDemand} kW</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Temperature</p>
                            <p className="font-semibold">{record.temperature}°C</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Humidity</p>
                            <p className="font-semibold">{record.humidity}%</p>
                          </div>
                        </div>
                      )}

                      {record.notes && (
                        <div className="mb-6">
                          <h4 className="text-md font-medium mb-2">Notes</h4>
                          <p className="text-gray-700">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-4">
                    <p>Created: {new Date(record.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredConsumption.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No consumption records found. Add your first energy consumption record to get started.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Efficiency Tab */}
      {activeTab === 'efficiency' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Energy Efficiency Projects</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Categories</option>
                  <option value="Lighting">Lighting</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Building">Building</option>
                  <option value="Renewable">Renewable</option>
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
                  <option value="Planned">Planned</option>
                  <option value="InProgress">In Progress</option>
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
                  {showCreateForm ? 'Cancel' : 'New Project'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create Energy Efficiency Project</h3>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project Title *</label>
                    <input
                      type="text"
                      value={newProject.title}
                      onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={newProject.category}
                      onChange={(e) => setNewProject(prev => ({ ...prev, category: e.target.value as EnergyEfficiency['category'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Lighting">Lighting</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Building">Building</option>
                      <option value="Renewable">Renewable</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assigned To *</label>
                    <input
                      type="text"
                      value={newProject.assignedTo}
                      onChange={(e) => setNewProject(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Completion Date *</label>
                    <input
                      type="date"
                      value={newProject.targetCompletionDate}
                      onChange={(e) => setNewProject(prev => ({ ...prev, targetCompletionDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estimated Savings ($)</label>
                    <input
                      type="number"
                      value={newProject.estimatedSavings}
                      onChange={(e) => setNewProject(prev => ({ ...prev, estimatedSavings: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Implementation Cost ($)</label>
                    <input
                      type="number"
                      value={newProject.implementationCost}
                      onChange={(e) => setNewProject(prev => ({ ...prev, implementationCost: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payback Period (months)</label>
                    <input
                      type="number"
                      value={newProject.paybackPeriod}
                      onChange={(e) => setNewProject(prev => ({ ...prev, paybackPeriod: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject(prev => ({ ...prev, priority: e.target.value as EnergyEfficiency['priority'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Implementation Measures (description|savings; ...)</label>
                  <textarea
                    value={newProject.measures}
                    onChange={(e) => setNewProject(prev => ({ ...prev, measures: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Replace incandescent bulbs with LED|500; Upgrade HVAC system|2000; Install solar panels|3000"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Efficiency Project'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{project.title}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(project.category)}`}>
                        {project.category}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                    </div>
                    <p className="text-gray-600">{project.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Assigned to: {project.assignedTo}</span>
                      <span>Target: {new Date(project.targetCompletionDate).toLocaleDateString()}</span>
                      <span>Est. Savings: ${project.estimatedSavings.toLocaleString()}</span>
                      <span>Cost: ${project.implementationCost.toLocaleString()}</span>
                      <span>Payback: {project.paybackPeriod} months</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Measures: {project.measures.length}
                      </p>
                      {project.actualSavings && (
                        <p className="text-sm text-green-600 font-semibold">
                          Actual Savings: ${project.actualSavings.toLocaleString()}
                        </p>
                      )}
                      {project.actualCompletionDate && (
                        <p className="text-sm text-gray-600">
                          Completed: {new Date(project.actualCompletionDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {project.status === 'Planned' && (
                        <button
                          onClick={() => updateProjectStatus(project.id, 'InProgress')}
                          className="bg-orange-500 hover:bg-orange-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Start
                        </button>
                      )}
                      {project.status === 'InProgress' && (
                        <button
                          onClick={() => updateProjectStatus(project.id, 'Completed')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedProject?.id === project.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedProject?.id === project.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Estimated Savings</p>
                        <p className="font-semibold">${project.estimatedSavings.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Implementation Cost</p>
                        <p className="font-semibold">${project.implementationCost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Payback Period</p>
                        <p className="font-semibold">{project.paybackPeriod} months</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">ROI</p>
                        <p className="font-semibold">
                          {project.implementationCost > 0
                            ? ((project.estimatedSavings / project.implementationCost) * 100).toFixed(1)
                            : '0'
                          }%
                        </p>
                      </div>
                    </div>

                    {project.measures.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Implementation Measures ({project.measures.length})</h4>
                        <div className="space-y-3">
                          {project.measures.map((measure, index) => (
                            <div key={index} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium">{measure.description}</h5>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">
                                    Est. Savings: ${measure.estimatedSavings.toLocaleString()}
                                  </span>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                    measure.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                    measure.status === 'InProgress' ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {measure.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(project.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(project.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterCategory === 'All' && filterStatus === 'All'
                  ? 'No efficiency projects found. Create your first energy efficiency project to get started.'
                  : 'No efficiency projects match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnergyManagementServicePage;
