'use client';

import React, { useState, useEffect } from 'react';

interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  category: string;
  services: string[];
  rating: number;
  status: 'Active' | 'Inactive' | 'Pending';
  contractStart?: string;
  contractEnd?: string;
  totalContracts: number;
  totalSpent: number;
  averageResponseTime: number;
  completionRate: number;
  lastEngagement: string;
  notes?: string;
}

interface VendorContract {
  id: string;
  vendorId: string;
  contractNumber: string;
  title: string;
  type: string;
  value: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired' | 'Terminated';
  description: string;
}

const VendorManagementPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedView, setSelectedView] = useState<'vendors' | 'contracts'>('vendors');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Mock data
  const mockVendors: Vendor[] = [
    {
      id: '1',
      name: 'HVAC Solutions Inc.',
      contactPerson: 'John Miller',
      email: 'john.miller@hvacsolutions.com',
      phone: '(555) 123-4567',
      address: '123 Industrial Blvd',
      city: 'Detroit',
      state: 'MI',
      zipCode: '48201',
      category: 'HVAC',
      services: ['Installation', 'Maintenance', 'Emergency Repair'],
      rating: 4.8,
      status: 'Active',
      contractStart: '2024-01-01',
      contractEnd: '2026-12-31',
      totalContracts: 12,
      totalSpent: 185000,
      averageResponseTime: 2.5,
      completionRate: 96.5,
      lastEngagement: '2025-01-15',
      notes: 'Preferred vendor for HVAC systems. Excellent response time and quality.'
    },
    {
      id: '2',
      name: 'ElectroTech Services',
      contactPerson: 'Sarah Johnson',
      email: 's.johnson@electrotech.com',
      phone: '(555) 234-5678',
      address: '456 Electric Ave',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      category: 'Electrical',
      services: ['Panel Upgrades', 'Wiring', 'Generator Service'],
      rating: 4.6,
      status: 'Active',
      contractStart: '2024-06-01',
      contractEnd: '2025-05-31',
      totalContracts: 8,
      totalSpent: 92000,
      averageResponseTime: 3.2,
      completionRate: 94.2,
      lastEngagement: '2025-01-12'
    },
    {
      id: '3',
      name: 'Reliable Plumbing Co.',
      contactPerson: 'Mike Rodriguez',
      email: 'mike@reliableplumbing.com',
      phone: '(555) 345-6789',
      address: '789 Water St',
      city: 'Milwaukee',
      state: 'WI',
      zipCode: '53201',
      category: 'Plumbing',
      services: ['Pipe Repair', 'Fixture Installation', 'Drain Cleaning'],
      rating: 4.3,
      status: 'Inactive',
      contractStart: '2023-01-01',
      contractEnd: '2024-12-31',
      totalContracts: 15,
      totalSpent: 67500,
      averageResponseTime: 4.1,
      completionRate: 89.8,
      lastEngagement: '2024-11-28'
    }
  ];

  const mockContracts: VendorContract[] = [
    {
      id: '1',
      vendorId: '1',
      contractNumber: 'HVAC-2024-001',
      title: 'Annual HVAC Maintenance',
      type: 'Maintenance',
      value: 75000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'Active',
      description: 'Comprehensive HVAC maintenance for all building systems'
    },
    {
      id: '2',
      vendorId: '2',
      contractNumber: 'ELEC-2024-002',
      title: 'Electrical System Upgrades',
      type: 'Project',
      value: 45000,
      startDate: '2024-06-01',
      endDate: '2025-03-31',
      status: 'Active',
      description: 'Panel upgrades and electrical infrastructure improvements'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setVendors(mockVendors);
      setFilteredVendors(mockVendors);
      setContracts(mockContracts);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    // Apply filters
    const filtered = vendors.filter(vendor => {
      const matchesSearch = searchQuery === '' || 
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === '' || vendor.category === categoryFilter;
      const matchesStatus = statusFilter === '' || vendor.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    setFilteredVendors(filtered);
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, vendors]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-red-100 text-red-800',
      'Pending': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getContractStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Expired': 'bg-red-100 text-red-800',
      'Terminated': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const openVendorDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowVendorModal(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVendors = filteredVendors.slice(startIndex, startIndex + itemsPerPage);

  // Calculate metrics
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter(v => v.status === 'Active').length;
  const totalSpent = vendors.reduce((sum, v) => sum + v.totalSpent, 0);
  const avgRating = vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
              <p className="text-gray-600 mt-2">Manage contractors, suppliers, and service providers</p>
            </div>
            <div className="flex space-x-3">
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">
                Generate Report
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                Add New Vendor
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vendors</p>
                <p className="text-3xl font-bold text-gray-900">{totalVendors}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Vendors</p>
                <p className="text-3xl font-bold text-green-600">{activeVendors}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-3xl font-bold text-yellow-600">{avgRating.toFixed(1)}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setSelectedView('vendors')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                selectedView === 'vendors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vendors ({totalVendors})
            </button>
            <button
              onClick={() => setSelectedView('contracts')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                selectedView === 'contracts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contracts ({contracts.length})
            </button>
          </nav>
        </div>

        {selectedView === 'vendors' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Search vendors..."
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
                  <option value="HVAC">HVAC</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Security">Security</option>
                  <option value="Landscaping">Landscaping</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('');
                    setStatusFilter('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Vendors Table */}
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
                          Vendor Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedVendors.map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <button 
                                onClick={() => openVendorDetails(vendor)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                {vendor.name}
                              </button>
                              <p className="text-sm text-gray-500">{vendor.city}, {vendor.state}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm text-gray-900">{vendor.contactPerson}</p>
                              <p className="text-sm text-gray-500">{vendor.email}</p>
                              <p className="text-sm text-gray-500">{vendor.phone}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vendor.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 mr-1">{vendor.rating}</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-4 h-4 ${i < Math.floor(vendor.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vendor.status)}`}>
                              {vendor.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(vendor.totalSpent)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => openVendorDetails(vendor)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </button>
                              <button className="text-green-600 hover:text-green-900">
                                Edit
                              </button>
                              <button className="text-purple-600 hover:text-purple-900">
                                Contract
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {selectedView === 'contracts' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Vendor Contracts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contract #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
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
                  {contracts.map((contract) => {
                    const vendor = vendors.find(v => v.id === contract.vendorId);
                    return (
                      <tr key={contract.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {contract.contractNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-gray-900">{contract.title}</p>
                            <p className="text-sm text-gray-500">{contract.type}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vendor?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(contract.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getContractStatusColor(contract.status)}`}>
                            {contract.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">View</button>
                            <button className="text-green-600 hover:text-green-900">Edit</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vendor Details Modal */}
        {showVendorModal && selectedVendor && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedVendor.name}
                </h3>
                <button
                  onClick={() => setShowVendorModal(false)}
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
                    <label className="block text-sm font-medium text-gray-600">Contact Person</label>
                    <p className="text-gray-900">{selectedVendor.contactPerson}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">{selectedVendor.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-900">{selectedVendor.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Address</label>
                    <p className="text-gray-900">
                      {selectedVendor.address}<br />
                      {selectedVendor.city}, {selectedVendor.state} {selectedVendor.zipCode}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Category</label>
                    <p className="text-gray-900">{selectedVendor.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Services</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedVendor.services.map((service, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Rating</label>
                    <div className="flex items-center">
                      <span className="text-gray-900 mr-2">{selectedVendor.rating}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(selectedVendor.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedVendor.status)}`}>
                      {selectedVendor.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Total Contracts</label>
                  <p className="text-2xl font-bold text-gray-900">{selectedVendor.totalContracts}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Total Spent</label>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedVendor.totalSpent)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Avg Response Time</label>
                  <p className="text-2xl font-bold text-gray-900">{selectedVendor.averageResponseTime}h</p>
                </div>
              </div>

              {selectedVendor.notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-600">Notes</label>
                  <p className="text-gray-900">{selectedVendor.notes}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                  Edit Vendor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorManagementPage;