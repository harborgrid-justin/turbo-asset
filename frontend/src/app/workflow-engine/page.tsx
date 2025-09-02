'use client';

import React, { useState, useEffect } from 'react';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'task' | 'notification' | 'condition';
  assignee?: string;
  duration: number;
  conditions?: string;
  order: number;
}

interface Workflow {
  id: number;
  name: string;
  description: string;
  category: 'Asset Management' | 'Finance' | 'HR' | 'Maintenance' | 'Procurement';
  status: 'Active' | 'Draft' | 'Suspended' | 'Archived';
  triggerEvent: string;
  createdBy: string;
  createdDate: string;
  lastModified: string;
  executionCount: number;
  steps: WorkflowStep[];
  isTemplate: boolean;
}

interface WorkflowExecution {
  id: string;
  workflowId: number;
  workflowName: string;
  status: 'Running' | 'Completed' | 'Failed' | 'Paused';
  startTime: string;
  endTime?: string;
  currentStep: string;
  initiator: string;
  progress: number;
}

const WorkflowEnginePage = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 1,
      name: 'Asset Purchase Approval',
      description: 'Multi-level approval process for asset purchases over $5,000',
      category: 'Asset Management',
      status: 'Active',
      triggerEvent: 'Asset Purchase Request',
      createdBy: 'John Smith',
      createdDate: '2024-12-01',
      lastModified: '2025-01-10',
      executionCount: 47,
      isTemplate: false,
      steps: [
        { id: 'step1', name: 'Manager Approval', type: 'approval', assignee: 'Manager', duration: 2, order: 1 },
        { id: 'step2', name: 'Finance Review', type: 'approval', assignee: 'Finance Team', duration: 3, order: 2 },
        { id: 'step3', name: 'Final Approval', type: 'approval', assignee: 'Director', duration: 1, order: 3 },
        { id: 'step4', name: 'Purchase Order', type: 'task', assignee: 'Procurement', duration: 1, order: 4 }
      ]
    },
    {
      id: 2,
      name: 'Maintenance Request Processing',
      description: 'Automated workflow for processing maintenance requests',
      category: 'Maintenance',
      status: 'Active',
      triggerEvent: 'Maintenance Request Submitted',
      createdBy: 'Sarah Johnson',
      createdDate: '2024-11-15',
      lastModified: '2024-12-20',
      executionCount: 156,
      isTemplate: false,
      steps: [
        { id: 'step1', name: 'Priority Assessment', type: 'condition', conditions: 'Priority > High', duration: 0, order: 1 },
        { id: 'step2', name: 'Assign Technician', type: 'task', assignee: 'Maintenance Coordinator', duration: 1, order: 2 },
        { id: 'step3', name: 'Schedule Work', type: 'task', assignee: 'Scheduler', duration: 1, order: 3 },
        { id: 'step4', name: 'Completion Notification', type: 'notification', duration: 0, order: 4 }
      ]
    },
    {
      id: 3,
      name: 'Employee Onboarding',
      description: 'Complete onboarding process for new employees',
      category: 'HR',
      status: 'Draft',
      triggerEvent: 'New Employee Hired',
      createdBy: 'Mike Chen',
      createdDate: '2025-01-05',
      lastModified: '2025-01-15',
      executionCount: 0,
      isTemplate: true,
      steps: [
        { id: 'step1', name: 'IT Setup', type: 'task', assignee: 'IT Team', duration: 2, order: 1 },
        { id: 'step2', name: 'Badge Creation', type: 'task', assignee: 'Security', duration: 1, order: 2 },
        { id: 'step3', name: 'Orientation Scheduling', type: 'task', assignee: 'HR', duration: 1, order: 3 }
      ]
    }
  ]);

  const [executions, setExecutions] = useState<WorkflowExecution[]>([
    {
      id: 'exec1',
      workflowId: 1,
      workflowName: 'Asset Purchase Approval',
      status: 'Running',
      startTime: '2025-01-15 09:30:00',
      currentStep: 'Finance Review',
      initiator: 'Bob Wilson',
      progress: 50
    },
    {
      id: 'exec2',
      workflowId: 2,
      workflowName: 'Maintenance Request Processing',
      status: 'Completed',
      startTime: '2025-01-15 08:15:00',
      endTime: '2025-01-15 11:30:00',
      currentStep: 'Completed',
      initiator: 'Alice Brown',
      progress: 100
    },
    {
      id: 'exec3',
      workflowId: 1,
      workflowName: 'Asset Purchase Approval',
      status: 'Failed',
      startTime: '2025-01-14 14:20:00',
      endTime: '2025-01-14 16:45:00',
      currentStep: 'Manager Approval',
      initiator: 'Carol Davis',
      progress: 25
    }
  ]);

  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>(workflows);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showExecutions, setShowExecutions] = useState(false);

  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    category: 'Asset Management' as Workflow['category'],
    triggerEvent: '',
    isTemplate: false
  });

  const [newStep, setNewStep] = useState({
    name: '',
    type: 'task' as WorkflowStep['type'],
    assignee: '',
    duration: 1,
    conditions: ''
  });

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);

  const categories = ['Asset Management', 'Finance', 'HR', 'Maintenance', 'Procurement'];
  const stepTypes = ['approval', 'task', 'notification', 'condition'];
  const assignees = ['Manager', 'Director', 'Finance Team', 'IT Team', 'HR', 'Procurement', 'Maintenance Coordinator', 'Security'];

  useEffect(() => {
    const filtered = workflows.filter(workflow => {
      return (
        (workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         workflow.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (categoryFilter === '' || workflow.category === categoryFilter) &&
        (statusFilter === '' || workflow.status === statusFilter)
      );
    });
    setFilteredWorkflows(filtered);
  }, [workflows, searchTerm, categoryFilter, statusFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setNewWorkflow(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleStepChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewStep(prev => ({
      ...prev,
      [name]: name === 'duration' ? Number(value) : value
    }));
  };

  const addStep = () => {
    if (newStep.name && newStep.assignee) {
      const step: WorkflowStep = {
        id: `step${Date.now()}`,
        ...newStep,
        order: workflowSteps.length + 1
      };
      setWorkflowSteps(prev => [...prev, step]);
      setNewStep({
        name: '',
        type: 'task',
        assignee: '',
        duration: 1,
        conditions: ''
      });
    }
  };

  const removeStep = (stepId: string) => {
    setWorkflowSteps(prev => prev.filter(s => s.id !== stepId));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const stepIndex = workflowSteps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    const newSteps = [...workflowSteps];
    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;

    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    [newSteps[stepIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[stepIndex]];
    
    // Update order numbers
    newSteps.forEach((step, index) => {
      step.order = index + 1;
    });

    setWorkflowSteps(newSteps);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkflow.name && newWorkflow.triggerEvent && workflowSteps.length > 0) {
      const workflow: Workflow = {
        id: editingWorkflow ? editingWorkflow.id : Date.now(),
        ...newWorkflow,
        status: 'Draft' as Workflow['status'],
        createdBy: 'Current User',
        createdDate: editingWorkflow ? editingWorkflow.createdDate : new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0],
        executionCount: editingWorkflow ? editingWorkflow.executionCount : 0,
        steps: [...workflowSteps]
      };
      
      if (editingWorkflow) {
        setWorkflows(prev => prev.map(w => w.id === editingWorkflow.id ? workflow : w));
      } else {
        setWorkflows(prev => [...prev, workflow]);
      }
      
      resetForm();
    }
  };

  const resetForm = () => {
    setNewWorkflow({
      name: '',
      description: '',
      category: 'Asset Management',
      triggerEvent: '',
      isTemplate: false
    });
    setWorkflowSteps([]);
    setEditingWorkflow(null);
    setShowForm(false);
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setNewWorkflow({
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      triggerEvent: workflow.triggerEvent,
      isTemplate: workflow.isTemplate
    });
    setWorkflowSteps([...workflow.steps]);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setWorkflows(prev => prev.filter(workflow => workflow.id !== id));
    if (selectedWorkflow?.id === id) {
      setSelectedWorkflow(null);
    }
  };

  const updateStatus = (id: number, newStatus: Workflow['status']) => {
    setWorkflows(prev => prev.map(workflow => 
      workflow.id === id 
        ? { 
            ...workflow, 
            status: newStatus, 
            lastModified: new Date().toISOString().split('T')[0]
          }
        : workflow
    ));
  };

  const executeWorkflow = (workflow: Workflow) => {
    const execution: WorkflowExecution = {
      id: `exec${Date.now()}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'Running',
      startTime: new Date().toLocaleString(),
      currentStep: workflow.steps[0]?.name || 'Starting',
      initiator: 'Current User',
      progress: 0
    };
    
    setExecutions(prev => [execution, ...prev]);
    
    // Update execution count
    setWorkflows(prev => prev.map(w => 
      w.id === workflow.id 
        ? { ...w, executionCount: w.executionCount + 1 }
        : w
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Suspended': return 'bg-orange-100 text-orange-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Asset Management': 'bg-blue-100 text-blue-800',
      'Finance': 'bg-green-100 text-green-800',
      'HR': 'bg-purple-100 text-purple-800',
      'Maintenance': 'bg-orange-100 text-orange-800',
      'Procurement': 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'approval': return '✅';
      case 'task': return '📋';
      case 'notification': return '📧';
      case 'condition': return '❓';
      default: return '📄';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Workflow Engine</h1>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Workflows</h3>
          <p className="text-2xl font-bold text-blue-600">{workflows.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Active</h3>
          <p className="text-2xl font-bold text-green-600">
            {workflows.filter(w => w.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Running</h3>
          <p className="text-2xl font-bold text-orange-600">
            {executions.filter(e => e.status === 'Running').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Templates</h3>
          <p className="text-2xl font-bold text-purple-600">
            {workflows.filter(w => w.isTemplate).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Executions</h3>
          <p className="text-2xl font-bold text-red-600">
            {workflows.reduce((sum, w) => sum + w.executionCount, 0)}
          </p>
        </div>
      </div>

      {/* Main Controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => {
            setEditingWorkflow(null);
            setShowForm(!showForm);
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showForm ? 'Cancel' : 'Create Workflow'}
        </button>
        <button
          onClick={() => setShowExecutions(!showExecutions)}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          {showExecutions ? 'Hide' : 'Show'} Executions
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Suspended">Suspended</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Create/Edit Workflow Form */}
      {showForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
                <input
                  type="text"
                  name="name"
                  value={newWorkflow.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={newWorkflow.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
                <input
                  type="text"
                  name="triggerEvent"
                  value={newWorkflow.triggerEvent}
                  onChange={handleInputChange}
                  placeholder="e.g., Asset Purchase Request"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isTemplate"
                  checked={newWorkflow.isTemplate}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Is Template</label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={newWorkflow.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Workflow Steps */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Workflow Steps</h3>
              
              {/* Add Step Form */}
              <div className="bg-white p-4 rounded-lg border mb-4">
                <h4 className="font-medium mb-3">Add New Step</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input
                    type="text"
                    name="name"
                    value={newStep.name}
                    onChange={handleStepChange}
                    placeholder="Step name"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    name="type"
                    value={newStep.type}
                    onChange={handleStepChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {stepTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <select
                    name="assignee"
                    value={newStep.assignee}
                    onChange={handleStepChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select assignee</option>
                    {assignees.map(assignee => (
                      <option key={assignee} value={assignee}>{assignee}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    name="duration"
                    value={newStep.duration}
                    onChange={handleStepChange}
                    placeholder="Duration (days)"
                    min="0"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addStep}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Add Step
                  </button>
                </div>
                {newStep.type === 'condition' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      name="conditions"
                      value={newStep.conditions}
                      onChange={handleStepChange}
                      placeholder="Condition logic (e.g., Priority > High)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Steps List */}
              <div className="space-y-2">
                {workflowSteps.map((step, index) => (
                  <div key={step.id} className="bg-white p-3 rounded-lg border flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-lg">{getStepTypeIcon(step.type)}</span>
                      <div>
                        <span className="font-medium">{step.order}. {step.name}</span>
                        <div className="text-sm text-gray-600">
                          {step.type} • {step.assignee} • {step.duration} days
                          {step.conditions && ` • ${step.conditions}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => moveStep(step.id, 'up')}
                        disabled={index === 0}
                        className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(step.id, 'down')}
                        disabled={index === workflowSteps.length - 1}
                        className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workflow Executions */}
      {showExecutions && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Recent Workflow Executions</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {executions.map((execution) => (
                <div key={execution.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{execution.workflowName}</h3>
                      <p className="text-sm text-gray-600">
                        Started by {execution.initiator} • {execution.startTime}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getExecutionStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{execution.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${execution.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Current Step:</span> {execution.currentStep}
                    {execution.endTime && (
                      <span className="ml-4 text-gray-600">
                        Ended: {execution.endTime}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Workflow Library ({filteredWorkflows.length})</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {filteredWorkflows.map((workflow) => (
            <div key={workflow.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{workflow.name}</h3>
                  <p className="text-sm text-gray-600">{workflow.description}</p>
                  {workflow.isTemplate && (
                    <span className="inline-block mt-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                      Template
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(workflow.status)}`}>
                    {workflow.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(workflow.category)}`}>
                    {workflow.category}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Trigger:</span>
                  <span className="font-medium">{workflow.triggerEvent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Steps:</span>
                  <span>{workflow.steps.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Executions:</span>
                  <span>{workflow.executionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{workflow.createdDate}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                <button
                  onClick={() => setSelectedWorkflow(selectedWorkflow?.id === workflow.id ? null : workflow)}
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                >
                  {selectedWorkflow?.id === workflow.id ? 'Hide Steps' : 'View Steps'}
                </button>
                <button
                  onClick={() => executeWorkflow(workflow)}
                  disabled={workflow.status !== 'Active'}
                  className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs px-2 py-1 rounded"
                >
                  Execute
                </button>
                <button
                  onClick={() => handleEdit(workflow)}
                  className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                >
                  Edit
                </button>
              </div>

              <div className="flex gap-1">
                <select
                  value={workflow.status}
                  onChange={(e) => updateStatus(workflow.id, e.target.value as Workflow['status'])}
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Archived">Archived</option>
                </select>
                <button
                  onClick={() => handleDelete(workflow.id)}
                  className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>

              {selectedWorkflow?.id === workflow.id && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Workflow Steps:</h4>
                  <div className="space-y-2">
                    {workflow.steps.map((step) => (
                      <div key={step.id} className="flex items-center text-sm bg-gray-50 p-2 rounded">
                        <span className="mr-2">{getStepTypeIcon(step.type)}</span>
                        <span className="font-medium mr-2">{step.order}.</span>
                        <span className="flex-1">{step.name}</span>
                        <span className="text-gray-600 text-xs">
                          {step.assignee} • {step.duration}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filteredWorkflows.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No workflows found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowEnginePage;
