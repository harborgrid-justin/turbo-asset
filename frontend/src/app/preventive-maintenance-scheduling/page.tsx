'use client';

import React, { useState } from 'react';

interface PreventiveMaintenanceTask {
  id: string;
  title: string;
  asset: string;
  assetTag: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
  nextDue: string;
  assignedTo: string;
  estimatedHours: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Scheduled' | 'Overdue' | 'In Progress' | 'Completed';
  checklist: string[];
  lastCompleted?: string;
  location: string;
}

const PreventiveMaintenanceSchedulingPage = () => {
  const [pmTasks] = useState<PreventiveMaintenanceTask[]>([
    {
      id: '1',
      title: 'HVAC Filter Replacement',
      asset: 'Central Air Unit A',
      assetTag: 'HVAC-001',
      frequency: 'Monthly',
      nextDue: '2025-02-01',
      assignedTo: 'Mike Johnson',
      estimatedHours: 2,
      priority: 'High',
      status: 'Scheduled',
      checklist: ['Remove old filters', 'Install new filters', 'Check airflow', 'Update maintenance log'],
      lastCompleted: '2025-01-01',
      location: 'Building A'
    },
    {
      id: '2',
      title: 'Generator Load Test',
      asset: 'Emergency Generator B',
      assetTag: 'GEN-002',
      frequency: 'Monthly',
      nextDue: '2025-01-25',
      assignedTo: 'Sarah Davis',
      estimatedHours: 4,
      priority: 'Critical',
      status: 'Overdue',
      checklist: ['Start generator', 'Apply load', 'Monitor performance', 'Check fuel levels', 'Update logs'],
      lastCompleted: '2024-12-25',
      location: 'Building B'
    }
  ]);

  const [selectedTask, setSelectedTask] = useState<PreventiveMaintenanceTask | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Scheduled': 'bg-blue-100 text-blue-800',
      'Overdue': 'bg-red-100 text-red-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'Critical': 'bg-red-100 text-red-800',
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Preventive Maintenance Scheduling</h1>
              <p className="text-gray-600 mt-2">Schedule and track preventive maintenance tasks</p>
            </div>
            <div className="flex space-x-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                >
                  List View
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'calendar' ? 'bg-white shadow' : ''}`}
                >
                  Calendar View
                </button>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                Create PM Task
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total PM Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{pmTasks.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due This Week</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {pmTasks.filter(task => getDaysUntilDue(task.nextDue) <= 7 && getDaysUntilDue(task.nextDue) > 0).length}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600">
                  {pmTasks.filter(task => task.status === 'Overdue').length}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-green-600">94%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Scheduled PM Tasks</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pmTasks.map((task) => {
                    const daysUntilDue = getDaysUntilDue(task.nextDue);
                    return (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <button 
                              onClick={() => setSelectedTask(task)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {task.title}
                            </button>
                            <p className="text-sm text-gray-500">{task.estimatedHours}h estimated</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-gray-900">{task.asset}</p>
                            <p className="text-sm text-gray-500">{task.assetTag}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {task.frequency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(task.nextDue).toLocaleDateString()}
                            {daysUntilDue <= 0 && (
                              <span className="ml-2 text-red-600 text-xs">
                                ⚠️ Overdue
                              </span>
                            )}
                            {daysUntilDue > 0 && daysUntilDue <= 7 && (
                              <span className="ml-2 text-yellow-600 text-xs">
                                📅 Due in {daysUntilDue} days
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {task.assignedTo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => setSelectedTask(task)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              Start
                            </button>
                            <button className="text-purple-600 hover:text-purple-900">
                              Reschedule
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">PM Schedule Calendar</h3>
            <div className="grid grid-cols-7 gap-4 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 35 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - date.getDay() + i);
                const tasksForDay = pmTasks.filter(task => 
                  new Date(task.nextDue).toDateString() === date.toDateString()
                );
                return (
                  <div key={i} className={`p-2 border rounded ${date.getMonth() === new Date().getMonth() ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="text-sm text-gray-900 mb-1">{date.getDate()}</div>
                    {tasksForDay.map(task => (
                      <div key={task.id} className={`text-xs p-1 rounded mb-1 ${getStatusColor(task.status)}`}>
                        {task.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Task Details Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{selectedTask.title}</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Asset</label>
                    <p className="text-gray-900">{selectedTask.asset} ({selectedTask.assetTag})</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Location</label>
                    <p className="text-gray-900">{selectedTask.location}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Frequency</label>
                    <p className="text-gray-900">{selectedTask.frequency}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Estimated Time</label>
                    <p className="text-gray-900">{selectedTask.estimatedHours} hours</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Maintenance Checklist</label>
                  <ul className="space-y-2">
                    {selectedTask.checklist.map((item, index) => (
                      <li key={index} className="flex items-center">
                        <input type="checkbox" className="mr-3" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
                  Start Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreventiveMaintenanceSchedulingPage;