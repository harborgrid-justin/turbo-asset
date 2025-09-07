'use client';

import React, { useState, useEffect } from 'react';

interface ComplianceItem {
  id: string;
  title: string;
  regulation: string;
  category: string;
  status: 'Compliant' | 'Non-Compliant' | 'Warning' | 'Pending';
  dueDate: string;
  lastInspection: string;
  nextInspection: string;
  inspector: string;
  asset?: string;
  assetTag?: string;
  location: string;
  requirements: string[];
  findings?: string;
  correctionActions?: string[];
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  cost?: number;
}

interface ComplianceMetrics {
  totalItems: number;
  compliantItems: number;
  nonCompliantItems: number;
  warningItems: number;
  pendingItems: number;
  dueSoon: number;
  overdue: number;
  complianceRate: number;
}

const ComplianceTrackingPage = () => {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ComplianceItem[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    totalItems: 0,
    compliantItems: 0,
    nonCompliantItems: 0,
    warningItems: 0,
    pendingItems: 0,
    dueSoon: 0,
    overdue: 0,
    complianceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Mock data
  const mockComplianceItems: ComplianceItem[] = [
    {
      id: '1',
      title: 'Fire Safety Inspection',
      regulation: 'NFPA 101',
      category: 'Fire Safety',
      status: 'Compliant',
      dueDate: '2025-06-15',
      lastInspection: '2024-06-15',
      nextInspection: '2025-06-15',
      inspector: 'Fire Marshal Johnson',
      location: 'Building A - All Floors',
      requirements: [
        'Fire extinguisher inspection',
        'Emergency exit verification',
        'Sprinkler system test',
        'Fire alarm system check'
      ],
      findings: 'All systems operational and compliant',
      priority: 'Critical'
    },
    {
      id: '2',
      title: 'Elevator Safety Inspection',
      regulation: 'ANSI/ASME A17.1',
      category: 'Elevator Safety',
      status: 'Warning',
      dueDate: '2025-02-01',
      lastInspection: '2024-02-01',
      nextInspection: '2025-02-01',
      inspector: 'Certified Elevator Inspector',
      asset: 'Passenger Elevator 1',
      assetTag: 'ELV-001',
      location: 'Building A - Lobby',
      requirements: [
        'Monthly safety test',
        'Annual inspection',
        'Emergency phone test',
        'Door operation check'
      ],
      findings: 'Minor alignment issue with door sensors',
      correctionActions: ['Adjust door sensor alignment', 'Schedule follow-up inspection'],
      priority: 'High',
      cost: 450
    },
    {
      id: '3',
      title: 'Electrical Panel Inspection',
      regulation: 'NEC 2020',
      category: 'Electrical Safety',
      status: 'Non-Compliant',
      dueDate: '2024-12-31',
      lastInspection: '2024-06-15',
      nextInspection: '2025-06-15',
      inspector: 'Licensed Electrician',
      asset: 'Main Electrical Panel A',
      assetTag: 'ELEC-PANEL-001',
      location: 'Building A - Electrical Room',
      requirements: [
        'Panel accessibility check',
        'Labeling verification',
        'Grounding system test',
        'Circuit breaker inspection'
      ],
      findings: 'Multiple unlabeled circuits, insufficient clearance space',
      correctionActions: [
        'Add proper circuit labels',
        'Clear minimum 3-foot workspace',
        'Update panel directory'
      ],
      priority: 'Critical',
      cost: 1200
    },
    {
      id: '4',
      title: 'Emergency Generator Test',
      regulation: 'NFPA 110',
      category: 'Emergency Systems',
      status: 'Pending',
      dueDate: '2025-01-30',
      lastInspection: '2024-10-30',
      nextInspection: '2025-01-30',
      inspector: 'Generator Technician',
      asset: 'Emergency Generator B',
      assetTag: 'GEN-002',
      location: 'Building B - Basement',
      requirements: [
        'Monthly exercise test',
        'Load bank test',
        'Fuel system check',
        'Battery system inspection'
      ],
      priority: 'High'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setComplianceItems(mockComplianceItems);
      setFilteredItems(mockComplianceItems);
      
      // Calculate metrics
      const totalItems = mockComplianceItems.length;
      const compliantItems = mockComplianceItems.filter(item => item.status === 'Compliant').length;
      const nonCompliantItems = mockComplianceItems.filter(item => item.status === 'Non-Compliant').length;
      const warningItems = mockComplianceItems.filter(item => item.status === 'Warning').length;
      const pendingItems = mockComplianceItems.filter(item => item.status === 'Pending').length;
      
      const today = new Date();
      const dueSoon = mockComplianceItems.filter(item => {
        const dueDate = new Date(item.nextInspection);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        return daysUntilDue <= 30 && daysUntilDue > 0;
      }).length;
      
      const overdue = mockComplianceItems.filter(item => {
        const dueDate = new Date(item.nextInspection);
        return dueDate < today;
      }).length;

      setMetrics({
        totalItems,
        compliantItems,
        nonCompliantItems,
        warningItems,
        pendingItems,
        dueSoon,
        overdue,
        complianceRate: totalItems > 0 ? (compliantItems / totalItems) * 100 : 0
      });
      
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    // Apply filters
    const filtered = complianceItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.regulation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
      const matchesStatus = statusFilter === '' || item.status === statusFilter;
      const matchesPriority = priorityFilter === '' || item.priority === priorityFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });

    setFilteredItems(filtered);
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, priorityFilter, complianceItems]);

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Compliant': 'bg-green-100 text-green-800',
      'Non-Compliant': 'bg-red-100 text-red-800',
      'Warning': 'bg-yellow-100 text-yellow-800',
      'Pending': 'bg-blue-100 text-blue-800'
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

  const getDaysUntilDue = (dateString: string) => {
    const today = new Date();
    const dueDate = new Date(dateString);
    return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  };

  const openComplianceDetails = (item: ComplianceItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Compliance Tracking</h1>
              <p className="text-gray-600 mt-2">Monitor regulatory compliance and safety requirements</p>
            </div>
            <div className="flex space-x-3">
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">
                Export Report
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                Schedule Inspection
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-3xl font-bold text-green-600">{metrics.complianceRate.toFixed(1)}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-gray-600 text-sm">{metrics.compliantItems} of {metrics.totalItems} items</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Non-Compliant</p>
                <p className="text-3xl font-bold text-red-600">{metrics.nonCompliantItems}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-red-600 text-sm">Requires immediate attention</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due Soon</p>
                <p className="text-3xl font-bold text-yellow-600">{metrics.dueSoon}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-yellow-600 text-sm">Next 30 days</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{metrics.overdue}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-red-600 text-sm">Past due date</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search compliance items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Fire Safety">Fire Safety</option>
              <option value="Elevator Safety">Elevator Safety</option>
              <option value="Electrical Safety">Electrical Safety</option>
              <option value="Emergency Systems">Emergency Systems</option>
              <option value="Environmental">Environmental</option>
              <option value="Health & Safety">Health & Safety</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Compliant">Compliant</option>
              <option value="Non-Compliant">Non-Compliant</option>
              <option value="Warning">Warning</option>
              <option value="Pending">Pending</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priority</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setStatusFilter('');
                setPriorityFilter('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
            </p>
          </div>
        </div>

        {/* Compliance Items Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compliance Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Inspection
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedItems.map((item) => {
                    const daysUntilDue = getDaysUntilDue(item.nextInspection);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <button 
                              onClick={() => openComplianceDetails(item)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {item.title}
                            </button>
                            <p className="text-sm text-gray-500">{item.regulation}</p>
                            {item.asset && (
                              <p className="text-sm text-gray-500">{item.asset} ({item.assetTag})</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(item.nextInspection)}
                            {daysUntilDue <= 0 && (
                              <span className="ml-2 text-red-600 text-xs font-medium">
                                ⚠️ Overdue
                              </span>
                            )}
                            {daysUntilDue > 0 && daysUntilDue <= 30 && (
                              <span className="ml-2 text-yellow-600 text-xs font-medium">
                                📅 Due in {daysUntilDue} days
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openComplianceDetails(item)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              Schedule
                            </button>
                            <button className="text-purple-600 hover:text-purple-900">
                              Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredItems.length === 0 && !loading && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No compliance items found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compliance Details Modal */}
        {showDetailsModal && selectedItem && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedItem.title}
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
                    <label className="block text-sm font-medium text-gray-600">Regulation</label>
                    <p className="text-gray-900">{selectedItem.regulation}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Category</label>
                    <p className="text-gray-900">{selectedItem.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedItem.status)}`}>
                      {selectedItem.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Priority</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedItem.priority)}`}>
                      {selectedItem.priority}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Location</label>
                    <p className="text-gray-900">{selectedItem.location}</p>
                  </div>
                  {selectedItem.asset && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Asset</label>
                      <p className="text-gray-900">{selectedItem.asset} ({selectedItem.assetTag})</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Last Inspection</label>
                    <p className="text-gray-900">{formatDate(selectedItem.lastInspection)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Next Inspection</label>
                    <p className="text-gray-900">{formatDate(selectedItem.nextInspection)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Inspector</label>
                    <p className="text-gray-900">{selectedItem.inspector}</p>
                  </div>
                  {selectedItem.cost && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Estimated Cost</label>
                      <p className="text-gray-900">{formatCurrency(selectedItem.cost)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">Requirements</label>
                <ul className="space-y-1">
                  {selectedItem.requirements.map((req, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedItem.findings && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-600">Findings</label>
                  <p className="text-gray-900 mt-1">{selectedItem.findings}</p>
                </div>
              )}

              {selectedItem.correctionActions && selectedItem.correctionActions.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Correction Actions</label>
                  <ul className="space-y-1">
                    {selectedItem.correctionActions.map((action, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-700">
                        <svg className="w-4 h-4 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
                  Schedule Inspection
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceTrackingPage;