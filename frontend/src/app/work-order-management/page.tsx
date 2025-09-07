'use client';

import React, { useState, useEffect } from 'react';

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string;
  asset: string;
  assetTag: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  type: 'Preventive' | 'Corrective' | 'Emergency' | 'Inspection';
  assignedTo: string;
  requestedBy: string;
  createdDate: string;
  scheduledDate: string;
  dueDate: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours?: number;
  estimatedCost: number;
  actualCost?: number;
  location: string;
  building: string;
  notes?: string;
}

interface WorkOrderFilters {
  status: string;
  priority: string;
  type: string;
  assignedTo: string;
  dateRange: string;
  searchQuery: string;
}

const WorkOrderManagementPage = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [filters, setFilters] = useState<WorkOrderFilters>({
    status: '',
    priority: '',
    type: '',
    assignedTo: '',
    dateRange: '30d',
    searchQuery: ''
  });

  // Mock data
  const mockWorkOrders: WorkOrder[] = [
    {
      id: '1',
      workOrderNumber: 'WO-2025-0001',
      title: 'HVAC Filter Replacement',
      description: 'Replace air filters in central HVAC system and inspect for any maintenance issues',
      asset: 'Central Air Conditioning Unit A',
      assetTag: 'HVAC-001',
      priority: 'Medium',
      status: 'In Progress',
      type: 'Preventive',
      assignedTo: 'Mike Johnson',
      requestedBy: 'Facility Manager',
      createdDate: '2025-01-15',
      scheduledDate: '2025-01-16',
      dueDate: '2025-01-18',
      estimatedHours: 2,
      actualHours: 1.5,
      estimatedCost: 150,
      actualCost: 125,
      location: 'Building A - Mechanical Room',
      building: 'Building A',
      notes: 'Filters were heavily contaminated, recommend shortening replacement interval'
    },
    {
      id: '2',
      workOrderNumber: 'WO-2025-0002',
      title: 'Emergency Generator Service',
      description: 'Emergency generator failed to start during routine test - immediate service required',
      asset: 'Emergency Generator B',
      assetTag: 'GEN-002',
      priority: 'Critical',
      status: 'Open',
      type: 'Emergency',
      assignedTo: 'Sarah Davis',
      requestedBy: 'Security Team',
      createdDate: '2025-01-16',
      scheduledDate: '2025-01-16',
      dueDate: '2025-01-16',
      estimatedHours: 4,
      estimatedCost: 500,
      location: 'Building B - Basement',
      building: 'Building B'
    },
    {
      id: '3',
      workOrderNumber: 'WO-2025-0003',
      title: 'Elevator Safety Inspection',
      description: 'Annual safety inspection for passenger elevator as required by regulations',
      asset: 'Passenger Elevator 1',
      assetTag: 'ELV-001',
      priority: 'High',
      status: 'Completed',
      type: 'Inspection',
      assignedTo: 'John Smith',
      requestedBy: 'Compliance Officer',
      createdDate: '2025-01-14',
      scheduledDate: '2025-01-15',
      dueDate: '2025-01-15',
      completedDate: '2025-01-15',
      estimatedHours: 3,
      actualHours: 2.5,
      estimatedCost: 275,
      actualCost: 275,
      location: 'Building A - Lobby',
      building: 'Building A',
      notes: 'Inspection passed, certificate updated in system'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setWorkOrders(mockWorkOrders);
      setFilteredWorkOrders(mockWorkOrders);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = workOrders.filter(wo => {
      const matchesStatus = filters.status === '' || wo.status === filters.status;
      const matchesPriority = filters.priority === '' || wo.priority === filters.priority;
      const matchesType = filters.type === '' || wo.type === filters.type;
      const matchesAssignee = filters.assignedTo === '' || wo.assignedTo.toLowerCase().includes(filters.assignedTo.toLowerCase());
      const matchesSearch = filters.searchQuery === '' || 
        wo.workOrderNumber.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        wo.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        wo.asset.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        wo.assetTag.toLowerCase().includes(filters.searchQuery.toLowerCase());

      return matchesStatus && matchesPriority && matchesType && matchesAssignee && matchesSearch;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof WorkOrder];
      const bValue = b[sortBy as keyof WorkOrder];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    setFilteredWorkOrders(filtered);
    setCurrentPage(1);
  }, [filters, sortBy, sortOrder, workOrders]);

  const handleFilterChange = (field: keyof WorkOrderFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openWorkOrderDetails = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Open': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'On Hold': 'bg-gray-100 text-gray-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Preventive': 'bg-blue-100 text-blue-800',
      'Corrective': 'bg-orange-100 text-orange-800',
      'Emergency': 'bg-red-100 text-red-800',
      'Inspection': 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Pagination
  const totalPages = Math.ceil(filteredWorkOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWorkOrders = filteredWorkOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Work Order Management</h1>
              <p className="text-gray-600 mt-2">Manage and track all work orders across your facility</p>
            </div>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Create Work Order
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <div>
              <input
                type="text"
                placeholder="Search work orders..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priority</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="Preventive">Preventive</option>
              <option value="Corrective">Corrective</option>
              <option value="Emergency">Emergency</option>
              <option value="Inspection">Inspection</option>
            </select>

            <input
              type="text"
              placeholder="Assigned to..."
              value={filters.assignedTo}
              onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredWorkOrders.length)} of {filteredWorkOrders.length} work orders
            </p>
            <button
              onClick={() => setFilters({
                status: '',
                priority: '',
                type: '',
                assignedTo: '',
                dateRange: '30d',
                searchQuery: ''
              })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Work Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('workOrderNumber')}
                    >
                      Work Order #
                      {sortBy === 'workOrderNumber' && (
                        <span className="ml-2">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title & Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('dueDate')}
                    >
                      Due Date
                      {sortBy === 'dueDate' && (
                        <span className="ml-2">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedWorkOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => openWorkOrderDetails(wo)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {wo.workOrderNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{wo.title}</p>
                          <p className="text-sm text-gray-500">{wo.asset} ({wo.assetTag})</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(wo.priority)}`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(wo.status)}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(wo.type)}`}>
                          {wo.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {wo.assignedTo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(wo.dueDate)}
                        {new Date(wo.dueDate) < new Date() && wo.status !== 'Completed' && (
                          <span className="ml-2 text-red-600 text-xs">
                            ⚠️ Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openWorkOrderDetails(wo)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            Edit
                          </button>
                          {wo.status === 'Open' && (
                            <button className="text-purple-600 hover:text-purple-900">
                              Start
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredWorkOrders.length === 0 && !loading && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Work Order Details Modal */}
        {showDetailsModal && selectedWorkOrder && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Work Order Details - {selectedWorkOrder.workOrderNumber}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Title</label>
                    <p className="text-gray-900">{selectedWorkOrder.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-900">{selectedWorkOrder.description}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Asset</label>
                    <p className="text-gray-900">{selectedWorkOrder.asset} ({selectedWorkOrder.assetTag})</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Location</label>
                    <p className="text-gray-900">{selectedWorkOrder.location}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedWorkOrder.status)}`}>
                      {selectedWorkOrder.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Priority</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedWorkOrder.priority)}`}>
                      {selectedWorkOrder.priority}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Type</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedWorkOrder.type)}`}>
                      {selectedWorkOrder.type}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Assigned To</label>
                    <p className="text-gray-900">{selectedWorkOrder.assignedTo}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Created Date</label>
                  <p className="text-gray-900">{formatDate(selectedWorkOrder.createdDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Scheduled Date</label>
                  <p className="text-gray-900">{formatDate(selectedWorkOrder.scheduledDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Due Date</label>
                  <p className="text-gray-900">{formatDate(selectedWorkOrder.dueDate)}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Time Estimate</label>
                  <p className="text-gray-900">
                    {selectedWorkOrder.estimatedHours}h
                    {selectedWorkOrder.actualHours && (
                      <span className="text-gray-500"> (Actual: {selectedWorkOrder.actualHours}h)</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Cost Estimate</label>
                  <p className="text-gray-900">
                    {formatCurrency(selectedWorkOrder.estimatedCost)}
                    {selectedWorkOrder.actualCost && (
                      <span className="text-gray-500"> (Actual: {formatCurrency(selectedWorkOrder.actualCost)})</span>
                    )}
                  </p>
                </div>
              </div>

              {selectedWorkOrder.notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-600">Notes</label>
                  <p className="text-gray-900">{selectedWorkOrder.notes}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                  Edit Work Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrderManagementPage;