import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface CapitalProject {
  id: string;
  name: string;
  description?: string;
  status: 'Planning' | 'Active' | 'OnHold' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  budget: number;
  spent: number;
  startDate: string;
  endDate?: string;
  manager: string;
  department: string;
  assets: string[];
  milestones: {
    id: string;
    name: string;
    dueDate: string;
    completed: boolean;
    completedAt?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

const CapitalProjectServicePage = () => {
  const [projects, setProjects] = useState<CapitalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<CapitalProject | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [creating, setCreating] = useState(false);

  // Form state
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'Planning' as CapitalProject['status'],
    priority: 'Medium' as CapitalProject['priority'],
    budget: 0,
    startDate: '',
    endDate: '',
    manager: '',
    department: '',
    assets: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<CapitalProject>('capital-projects');
      setProjects(data);
    } catch (err) {
      setError('Failed to load capital projects. Please try again.');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.budget || !newProject.startDate || !newProject.manager || !newProject.department) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const projectData = {
        ...newProject,
        assets: newProject.assets.split(',').map(asset => asset.trim()).filter(asset => asset),
        startDate: new Date(newProject.startDate).toISOString(),
        endDate: newProject.endDate ? new Date(newProject.endDate).toISOString() : undefined
      };

      const createdProject = await apiService.generic.create<CapitalProject>('capital-projects', projectData);

      setProjects(prev => [createdProject, ...prev]);
      setNewProject({
        name: '',
        description: '',
        status: 'Planning',
        priority: 'Medium',
        budget: 0,
        startDate: '',
        endDate: '',
        manager: '',
        department: '',
        assets: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create project. Please try again.');
      console.error('Error creating project:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateProjectStatus = async (projectId: string, status: CapitalProject['status']) => {
    try {
      setError(null);
      await apiService.generic.update<CapitalProject>('capital-projects', parseInt(projectId), { status });
      setProjects(prev => prev.map(project =>
        project.id === projectId ? { ...project, status } : project
      ));
    } catch (err) {
      setError('Failed to update project status. Please try again.');
      console.error('Error updating project:', err);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('capital-projects', parseInt(projectId));
      setProjects(prev => prev.filter(project => project.id !== projectId));
    } catch (err) {
      setError('Failed to delete project. Please try again.');
      console.error('Error deleting project:', err);
    }
  };

  const completeMilestone = async (projectId: string, milestoneId: string) => {
    try {
      setError(null);
      await apiService.generic.update<CapitalProject>(`capital-projects/${projectId}/milestones/${milestoneId}`, parseInt(projectId), {
        completed: true,
        completedAt: new Date().toISOString()
      });

      // Refresh projects to get updated data
      await loadProjects();
    } catch (err) {
      setError('Failed to complete milestone. Please try again.');
      console.error('Error completing milestone:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'OnHold': return 'bg-orange-100 text-orange-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getBudgetProgress = (budget: number, spent: number) => {
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    return Math.min(percentage, 100);
  };

  const filteredProjects = projects.filter(project => {
    const statusMatch = filterStatus === 'All' || project.status === filterStatus;
    const priorityMatch = filterPriority === 'All' || project.priority === filterPriority;
    return statusMatch && priorityMatch;
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
      <h1 className="text-3xl font-bold mb-6">Capital Project Service</h1>

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

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Capital Projects</h2>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Status</option>
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="OnHold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Priority</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={creating}
            >
              {showCreateForm ? 'Cancel' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Capital Project</h3>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department *</label>
                <input
                  type="text"
                  value={newProject.department}
                  onChange={(e) => setNewProject(prev => ({ ...prev, department: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Manager *</label>
                <input
                  type="text"
                  value={newProject.manager}
                  onChange={(e) => setNewProject(prev => ({ ...prev, manager: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Budget *</label>
                <input
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                <input
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={newProject.endDate}
                  onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newProject.status}
                  onChange={(e) => setNewProject(prev => ({ ...prev, status: e.target.value as CapitalProject['status'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="OnHold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={newProject.priority}
                  onChange={(e) => setNewProject(prev => ({ ...prev, priority: e.target.value as CapitalProject['priority'] }))}
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
              <label className="block text-sm font-medium text-gray-700">Assets (comma-separated)</label>
              <input
                type="text"
                value={newProject.assets}
                onChange={(e) => setNewProject(prev => ({ ...prev, assets: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Asset1, Asset2, Asset3"
              />
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
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold">{project.name}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </span>
                </div>
                <p className="text-gray-600">{project.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                  className="bg-gray-500 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded"
                >
                  {selectedProject?.id === project.id ? 'Hide Details' : 'Show Details'}
                </button>
                <div className="flex space-x-1">
                  {project.status !== 'Completed' && project.status !== 'Cancelled' && (
                    <>
                      {project.status !== 'Active' && (
                        <button
                          onClick={() => updateProjectStatus(project.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      {project.status !== 'OnHold' && (
                        <button
                          onClick={() => updateProjectStatus(project.id, 'OnHold')}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Hold
                        </button>
                      )}
                      <button
                        onClick={() => updateProjectStatus(project.id, 'Completed')}
                        className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Complete
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Budget</p>
                <p className="text-lg font-semibold">{formatCurrency(project.budget)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Spent</p>
                <p className="text-lg font-semibold">{formatCurrency(project.spent)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-lg font-semibold">{formatCurrency(project.budget - project.spent)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-lg font-semibold">{Math.round(getBudgetProgress(project.budget, project.spent))}%</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Budget Utilization</span>
                <span>{Math.round(getBudgetProgress(project.budget, project.spent))}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    getBudgetProgress(project.budget, project.spent) > 90 ? 'bg-red-500' :
                    getBudgetProgress(project.budget, project.spent) > 75 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${getBudgetProgress(project.budget, project.spent)}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
              <div>
                <p><strong>Manager:</strong> {project.manager}</p>
              </div>
              <div>
                <p><strong>Department:</strong> {project.department}</p>
              </div>
              <div>
                <p><strong>Start:</strong> {new Date(project.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p><strong>End:</strong> {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}</p>
              </div>
            </div>

            {selectedProject?.id === project.id && (
              <div className="mt-6 border-t pt-6">
                <h4 className="text-lg font-semibold mb-4">Project Details</h4>

                {project.assets.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-md font-medium mb-2">Associated Assets</h5>
                    <div className="flex flex-wrap gap-2">
                      {project.assets.map((asset, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                          {asset}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h5 className="text-md font-medium mb-2">Milestones</h5>
                  {project.milestones.length > 0 ? (
                    <div className="space-y-2">
                      {project.milestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div className="flex-1">
                            <p className={`font-medium ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                              {milestone.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              {milestone.completedAt && ` • Completed: ${new Date(milestone.completedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {milestone.completed ? (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-semibold">
                                Completed
                              </span>
                            ) : (
                              <button
                                onClick={() => completeMilestone(project.id, milestone.id)}
                                className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No milestones defined.</p>
                  )}
                </div>
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
            {filterStatus === 'All' && filterPriority === 'All'
              ? 'No capital projects found. Create your first project to get started.'
              : 'No projects match the selected filters.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default CapitalProjectServicePage;
