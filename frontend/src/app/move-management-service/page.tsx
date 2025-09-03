'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface MoveRequest {
  id: string;
  requestNumber: string;
  type: 'Internal' | 'External' | 'New Hire' | 'Termination';
  employee: {
    name: string;
    department: string;
    email: string;
    phone: string;
  };
  fromLocation?: {
    building: string;
    floor: string;
    space: string;
  };
  toLocation: {
    building: string;
    floor: string;
    space: string;
  };
  requestedBy: string;
  requestDate: string;
  scheduledDate?: string;
  targetDate: string;
  status: 'Pending' | 'Approved' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rejected';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  estimatedCost: number;
  actualCost?: number;
  vendor?: string;
  services: string[];
  notes: string;
  approvedBy?: string;
  approvedDate?: string;
}

interface MoveVendor {
  id: string;
  name: string;
  rating: number;
  services: string[];
  hourlyRate: number;
  isPreferred: boolean;
}

interface MoveMetrics {
  totalRequests: number;
  pendingApprovals: number;
  inProgress: number;
  completedThisMonth: number;
  averageCost: number;
  averageDuration: number;
}

const MoveManagementServicePage = () => {
  const [moveRequests, setMoveRequests] = useState<MoveRequest[]>([]);
  const [vendors, setVendors] = useState<MoveVendor[]>([]);
  const [metrics, setMetrics] = useState<MoveMetrics>({
    totalRequests: 0,
    pendingApprovals: 0,
    inProgress: 0,
    completedThisMonth: 0,
    averageCost: 0,
    averageDuration: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [filteredRequests, setFilteredRequests] = useState<MoveRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MoveRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'vendors' | 'analytics'>('requests');

  const [newRequest, setNewRequest] = useState({
    type: 'Internal' as MoveRequest['type'],
    employee: {
      name: '',
      department: '',
      email: '',
      phone: ''
    },
    fromLocation: {
      building: '',
      floor: '',
      space: ''
    },
    toLocation: {
      building: '',
      floor: '',
      space: ''
    },
    targetDate: '',
    priority: 'Medium' as MoveRequest['priority'],
    estimatedCost: 0,
    vendor: '',
    services: [] as string[],
    notes: ''
  });

  useEffect(() => {
    fetchMoveData();
  }, []);

  useEffect(() => {
    const filtered = moveRequests.filter(request => {
      const matchesSearch = 
        request.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.employee.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === '' || request.type === typeFilter;
      const matchesStatus = statusFilter === '' || request.status === statusFilter;
      const matchesPriority = priorityFilter === '' || request.priority === priorityFilter;
      
      return matchesSearch && matchesType && matchesStatus && matchesPriority;
    });
    
    setFilteredRequests(filtered);
  }, [moveRequests, searchTerm, typeFilter, statusFilter, priorityFilter]);

  const fetchMoveData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from backend, fallback to mock data
      try {
        const response = await apiClient.get('/move-management?organizationId=demo');
        // Handle response when backend is available
      } catch (apiError) {
        console.log('Backend not available, using mock data');
      }
      
      // Use mock data
      const mockRequests = getMockRequests();
      const mockVendors = getMockVendors();
      
      setMoveRequests(mockRequests);
      setVendors(mockVendors);
      
      // Calculate metrics
      const totalRequests = mockRequests.length;
      const pendingApprovals = mockRequests.filter(r => r.status === 'Pending').length;
      const inProgress = mockRequests.filter(r => r.status === 'In Progress').length;
      const completedThisMonth = mockRequests.filter(r => 
        r.status === 'Completed' && 
        new Date(r.scheduledDate || r.requestDate).getMonth() === new Date().getMonth()
      ).length;
      const averageCost = mockRequests.reduce((sum, r) => sum + (r.actualCost || r.estimatedCost), 0) / totalRequests;
      
      setMetrics({
        totalRequests,
        pendingApprovals,
        inProgress,
        completedThisMonth,
        averageCost: Math.round(averageCost),
        averageDuration: 3.2
      });
      
    } catch (error) {
      console.error('Failed to fetch move data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMockRequests = (): MoveRequest[] => [
    {
      id: '1',
      requestNumber: 'MR-2025-001',
      type: 'Internal',
      employee: {
        name: 'John Smith',
        department: 'Engineering',
        email: 'john.smith@company.com',
        phone: '+1 (555) 0123'
      },
      fromLocation: {
        building: 'Tower A',
        floor: '3rd Floor',
        space: 'Cubicle 312'
      },
      toLocation: {
        building: 'Tower B',
        floor: '5th Floor',
        space: 'Office 502'
      },
      requestedBy: 'Sarah Johnson',
      requestDate: '2025-01-10',
      scheduledDate: '2025-01-20',
      targetDate: '2025-01-20',
      status: 'Approved',
      priority: 'Medium',
      estimatedCost: 850,
      actualCost: 920,
      vendor: 'Professional Movers Inc',
      services: ['Furniture Moving', 'IT Equipment Setup', 'Storage'],
      notes: 'Employee promotion requires private office',
      approvedBy: 'Mike Davis',
      approvedDate: '2025-01-12'
    },
    {
      id: '2',
      requestNumber: 'MR-2025-002',
      type: 'New Hire',
      employee: {
        name: 'Emily Chen',
        department: 'Marketing',
        email: 'emily.chen@company.com',
        phone: '+1 (555) 0456'
      },
      toLocation: {
        building: 'Tower A',
        floor: '2nd Floor',
        space: 'Cubicle 203'
      },
      requestedBy: 'HR Department',
      requestDate: '2025-01-14',
      targetDate: '2025-01-25',
      status: 'Pending',
      priority: 'High',
      estimatedCost: 450,
      services: ['Desk Setup', 'IT Equipment Installation', 'Welcome Package'],
      notes: 'New hire starting 01/25, setup required by 01/24'
    },
    {
      id: '3',
      requestNumber: 'MR-2025-003',
      type: 'Termination',
      employee: {
        name: 'Robert Wilson',
        department: 'Finance',
        email: 'robert.wilson@company.com',
        phone: '+1 (555) 0789'
      },
      fromLocation: {
        building: 'Tower B',
        floor: '4th Floor',
        space: 'Office 408'
      },
      toLocation: {
        building: 'Storage',
        floor: 'Basement',
        space: 'Unit B-12'
      },
      requestedBy: 'HR Department',
      requestDate: '2025-01-08',
      scheduledDate: '2025-01-15',
      targetDate: '2025-01-15',
      status: 'Completed',
      priority: 'Medium',
      estimatedCost: 300,
      actualCost: 275,
      vendor: 'Quick Move Solutions',
      services: ['Personal Item Packing', 'Equipment Return'],
      notes: 'Voluntary resignation, peaceful transition',
      approvedBy: 'Linda Martinez',
      approvedDate: '2025-01-09'
    },
    {
      id: '4',
      requestNumber: 'MR-2025-004',
      type: 'External',
      employee: {
        name: 'David Kim',
        department: 'Sales',
        email: 'david.kim@company.com',
        phone: '+1 (555) 0321'
      },
      fromLocation: {
        building: 'Tower A',
        floor: '6th Floor',
        space: 'Office 615'
      },
      toLocation: {
        building: 'Branch Office Chicago',
        floor: '12th Floor',
        space: 'Office 1205'
      },
      requestedBy: 'Regional Manager',
      requestDate: '2025-01-12',
      targetDate: '2025-02-01',
      status: 'In Progress',
      priority: 'High',
      estimatedCost: 2400,
      vendor: 'Interstate Business Movers',
      services: ['Long Distance Moving', 'Temporary Storage', 'Insurance Coverage'],
      notes: 'Regional transfer, requires coordination with Chicago office'
    }
  ];

  const getMockVendors = (): MoveVendor[] => [
    {
      id: '1',
      name: 'Professional Movers Inc',
      rating: 4.8,
      services: ['Furniture Moving', 'IT Equipment Setup', 'Storage', 'Packing'],
      hourlyRate: 85,
      isPreferred: true
    },
    {
      id: '2',
      name: 'Quick Move Solutions',
      rating: 4.5,
      services: ['Personal Item Packing', 'Equipment Return', 'Same Day Service'],
      hourlyRate: 65,
      isPreferred: true
    },
    {
      id: '3',
      name: 'Interstate Business Movers',
      rating: 4.7,
      services: ['Long Distance Moving', 'Temporary Storage', 'Insurance Coverage', 'White Glove Service'],
      hourlyRate: 120,
      isPreferred: false
    }
  ];

  const handleRequestInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setNewRequest(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as object,
          [child]: value
        }
      }));
    } else {
      setNewRequest(prev => ({
        ...prev,
        [name]: name === 'estimatedCost' ? Number(value) : value
      }));
    }
  };

  const handleServiceToggle = (service: string) => {
    setNewRequest(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    const request: MoveRequest = {
      id: Date.now().toString(),
      requestNumber: `MR-2025-${String(moveRequests.length + 1).padStart(3, '0')}`,
      ...newRequest,
      requestedBy: 'Current User',
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };
    
    setMoveRequests(prev => [request, ...prev]);
    resetForm();
  };

  const resetForm = () => {
    setNewRequest({
      type: 'Internal',
      employee: { name: '', department: '', email: '', phone: '' },
      fromLocation: { building: '', floor: '', space: '' },
      toLocation: { building: '', floor: '', space: '' },
      targetDate: '',
      priority: 'Medium',
      estimatedCost: 0,
      vendor: '',
      services: [],
      notes: ''
    });
    setShowForm(false);
  };

  const updateRequestStatus = (id: string, status: MoveRequest['status'], approver?: string) => {
    setMoveRequests(prev => prev.map(request =>
      request.id === id
        ? {
            ...request,
            status,
            approvedBy: status === 'Approved' ? (approver || 'Current User') : request.approvedBy,
            approvedDate: status === 'Approved' ? new Date().toISOString().split('T')[0] : request.approvedDate,
            scheduledDate: status === 'Approved' ? request.targetDate : request.scheduledDate
          }
        : request
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Internal': return 'bg-blue-100 text-blue-800';
      case 'External': return 'bg-purple-100 text-purple-800';
      case 'New Hire': return 'bg-green-100 text-green-800';
      case 'Termination': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const availableServices = [
    'Furniture Moving', 'IT Equipment Setup', 'Storage', 'Packing',
    'Personal Item Packing', 'Equipment Return', 'Same Day Service',
    'Long Distance Moving', 'Temporary Storage', 'Insurance Coverage',
    'White Glove Service', 'Desk Setup', 'IT Equipment Installation',
    'Welcome Package'
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading move management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Move Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Move Request
        </button>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Total Requests</h3>
          <p className="text-2xl font-bold text-blue-600">{metrics.totalRequests}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600">{metrics.pendingApprovals}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">In Progress</h3>
          <p className="text-2xl font-bold text-blue-600">{metrics.inProgress}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Completed</h3>
          <p className="text-2xl font-bold text-green-600">{metrics.completedThisMonth}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Avg Cost</h3>
          <p className="text-2xl font-bold text-purple-600">${metrics.averageCost}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Avg Duration</h3>
          <p className="text-2xl font-bold text-indigo-600">{metrics.averageDuration} days</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Move Requests ({moveRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'vendors'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Vendors ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Types</option>
                <option value="Internal">Internal</option>
                <option value="External">External</option>
                <option value="New Hire">New Hire</option>
                <option value="Termination">Termination</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <button
                onClick={fetchMoveData}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Refresh
              </button>
            </div>

            {/* Requests Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Move Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.requestNumber}</div>
                          <div className="text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getTypeColor(request.type)}`}>
                              {request.type}
                            </span>
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(request.priority)}`}>
                              {request.priority}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.employee.name}</div>
                        <div className="text-sm text-gray-500">{request.employee.department}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {request.fromLocation && (
                            <div>From: {request.fromLocation.building} - {request.fromLocation.space}</div>
                          )}
                          <div>To: {request.toLocation.building} - {request.toLocation.space}</div>
                          <div className="text-xs text-gray-500">Target: {request.targetDate}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        {request.scheduledDate && (
                          <div className="text-xs text-gray-500">Scheduled: {request.scheduledDate}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>Est: ${request.estimatedCost}</div>
                        {request.actualCost && (
                          <div className="text-xs text-gray-500">Act: ${request.actualCost}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                        <button
                          onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          {selectedRequest?.id === request.id ? 'Hide' : 'View'}
                        </button>
                        {request.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'Approved')}
                              className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'Rejected')}
                              className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {request.status === 'Approved' && (
                          <button
                            onClick={() => updateRequestStatus(request.id, 'In Progress')}
                            className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                          >
                            Start
                          </button>
                        )}
                        {request.status === 'In Progress' && (
                          <button
                            onClick={() => updateRequestStatus(request.id, 'Completed')}
                            className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Request Details */}
            {selectedRequest && (
              <div className="mt-6 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Request Details: {selectedRequest.requestNumber}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Employee Information</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Name:</strong> {selectedRequest.employee.name}</div>
                      <div><strong>Department:</strong> {selectedRequest.employee.department}</div>
                      <div><strong>Email:</strong> {selectedRequest.employee.email}</div>
                      <div><strong>Phone:</strong> {selectedRequest.employee.phone}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Move Details</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Type:</strong> {selectedRequest.type}</div>
                      <div><strong>Priority:</strong> {selectedRequest.priority}</div>
                      <div><strong>Requested By:</strong> {selectedRequest.requestedBy}</div>
                      <div><strong>Request Date:</strong> {selectedRequest.requestDate}</div>
                      <div><strong>Target Date:</strong> {selectedRequest.targetDate}</div>
                      {selectedRequest.vendor && <div><strong>Vendor:</strong> {selectedRequest.vendor}</div>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Services</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedRequest.services.map(service => (
                        <span key={service} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Cost Information</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Estimated Cost:</strong> ${selectedRequest.estimatedCost}</div>
                      {selectedRequest.actualCost && <div><strong>Actual Cost:</strong> ${selectedRequest.actualCost}</div>}
                      {selectedRequest.approvedBy && <div><strong>Approved By:</strong> {selectedRequest.approvedBy}</div>}
                      {selectedRequest.approvedDate && <div><strong>Approved Date:</strong> {selectedRequest.approvedDate}</div>}
                    </div>
                  </div>
                </div>
                {selectedRequest.notes && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-gray-700">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vendors Tab */}
        {activeTab === 'vendors' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="border rounded-lg p-4 hover:shadow-md">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold">{vendor.name}</h3>
                    {vendor.isPreferred && (
                      <span className="px-2 py-1 bg-gold-100 text-gold-800 text-xs rounded">Preferred</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center">
                      <span className="font-medium">Rating:</span>
                      <div className="ml-2 flex items-center">
                        <span className="text-yellow-500">{'★'.repeat(Math.floor(vendor.rating))}</span>
                        <span className="ml-1">{vendor.rating}/5.0</span>
                      </div>
                    </div>
                    <div><strong>Hourly Rate:</strong> ${vendor.hourlyRate}</div>
                    <div>
                      <strong>Services:</strong>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {vendor.services.map(service => (
                          <span key={service} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Request Status Distribution</h3>
                <div className="space-y-2">
                  {['Pending', 'Approved', 'In Progress', 'Completed', 'Cancelled', 'Rejected'].map(status => {
                    const count = moveRequests.filter(r => r.status === status).length;
                    const percentage = moveRequests.length > 0 ? (count / moveRequests.length * 100).toFixed(1) : 0;
                    return (
                      <div key={status} className="flex justify-between items-center">
                        <span>{status}</span>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">{count} ({percentage}%)</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Move Type Distribution</h3>
                <div className="space-y-2">
                  {['Internal', 'External', 'New Hire', 'Termination'].map(type => {
                    const count = moveRequests.filter(r => r.type === type).length;
                    const percentage = moveRequests.length > 0 ? (count / moveRequests.length * 100).toFixed(1) : 0;
                    return (
                      <div key={type} className="flex justify-between items-center">
                        <span>{type}</span>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">{count} ({percentage}%)</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Move Request</h3>
            <form onSubmit={handleSubmitRequest}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Move Type</label>
                  <select
                    name="type"
                    value={newRequest.type}
                    onChange={handleRequestInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                    <option value="New Hire">New Hire</option>
                    <option value="Termination">Termination</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    name="priority"
                    value={newRequest.priority}
                    onChange={handleRequestInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                
                {/* Employee Information */}
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Employee Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        name="employee.name"
                        value={newRequest.employee.name}
                        onChange={handleRequestInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <input
                        type="text"
                        name="employee.department"
                        value={newRequest.employee.department}
                        onChange={handleRequestInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        name="employee.email"
                        value={newRequest.employee.email}
                        onChange={handleRequestInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        name="employee.phone"
                        value={newRequest.employee.phone}
                        onChange={handleRequestInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Location Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {newRequest.type !== 'New Hire' && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">From Location</h5>
                        <div className="space-y-2">
                          <input
                            type="text"
                            name="fromLocation.building"
                            value={newRequest.fromLocation.building}
                            onChange={handleRequestInputChange}
                            placeholder="Building"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <input
                            type="text"
                            name="fromLocation.floor"
                            value={newRequest.fromLocation.floor}
                            onChange={handleRequestInputChange}
                            placeholder="Floor"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <input
                            type="text"
                            name="fromLocation.space"
                            value={newRequest.fromLocation.space}
                            onChange={handleRequestInputChange}
                            placeholder="Space/Room"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">To Location</h5>
                      <div className="space-y-2">
                        <input
                          type="text"
                          name="toLocation.building"
                          value={newRequest.toLocation.building}
                          onChange={handleRequestInputChange}
                          placeholder="Building"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                        <input
                          type="text"
                          name="toLocation.floor"
                          value={newRequest.toLocation.floor}
                          onChange={handleRequestInputChange}
                          placeholder="Floor"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                        <input
                          type="text"
                          name="toLocation.space"
                          value={newRequest.toLocation.space}
                          onChange={handleRequestInputChange}
                          placeholder="Space/Room"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Date</label>
                  <input
                    type="date"
                    name="targetDate"
                    value={newRequest.targetDate}
                    onChange={handleRequestInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Cost ($)</label>
                  <input
                    type="number"
                    name="estimatedCost"
                    value={newRequest.estimatedCost}
                    onChange={handleRequestInputChange}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Services Required</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableServices.map(service => (
                      <label key={service} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newRequest.services.includes(service)}
                          onChange={() => handleServiceToggle(service)}
                          className="mr-2"
                        />
                        <span className="text-sm">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    name="notes"
                    value={newRequest.notes}
                    onChange={handleRequestInputChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-500 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoveManagementServicePage;
