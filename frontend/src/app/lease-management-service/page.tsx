'use client';

import React, { useState, useEffect } from 'react';

interface Lease {
  id: number;
  propertyName: string;
  tenant: string;
  leaseType: 'Commercial' | 'Residential' | 'Industrial';
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: 'Active' | 'Expired' | 'Terminating' | 'Draft';
  renewalOption: boolean;
  contactPerson: string;
  notes: string;
}

const LeaseManagementServicePage = () => {
  const [leases, setLeases] = useState<Lease[]>([
    {
      id: 1,
      propertyName: 'Downtown Office Complex A',
      tenant: 'Tech Solutions Inc.',
      leaseType: 'Commercial',
      startDate: '2024-01-01',
      endDate: '2026-12-31',
      monthlyRent: 8500,
      securityDeposit: 17000,
      status: 'Active',
      renewalOption: true,
      contactPerson: 'Sarah Johnson',
      notes: 'Excellent tenant with timely payments'
    },
    {
      id: 2,
      propertyName: 'Warehouse District B',
      tenant: 'Logistics Partners LLC',
      leaseType: 'Industrial',
      startDate: '2023-06-01',
      endDate: '2025-05-31',
      monthlyRent: 12000,
      securityDeposit: 24000,
      status: 'Active',
      renewalOption: false,
      contactPerson: 'Michael Chen',
      notes: 'Requires special equipment access'
    },
    {
      id: 3,
      propertyName: 'Residential Complex C',
      tenant: 'Family Housing Corp',
      leaseType: 'Residential',
      startDate: '2023-01-01',
      endDate: '2024-12-31',
      monthlyRent: 2800,
      securityDeposit: 5600,
      status: 'Expired',
      renewalOption: true,
      contactPerson: 'Emma Wilson',
      notes: 'Lease expired, renewal pending'
    }
  ]);

  const [filteredLeases, setFilteredLeases] = useState<Lease[]>(leases);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  
  const [newLease, setNewLease] = useState({
    propertyName: '',
    tenant: '',
    leaseType: 'Commercial' as Lease['leaseType'],
    startDate: '',
    endDate: '',
    monthlyRent: 0,
    securityDeposit: 0,
    renewalOption: false,
    contactPerson: '',
    notes: ''
  });

  useEffect(() => {
    const filtered = leases.filter(lease => {
      return (
        (lease.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         lease.tenant.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (typeFilter === '' || lease.leaseType === typeFilter) &&
        (statusFilter === '' || lease.status === statusFilter)
      );
    });
    setFilteredLeases(filtered);
  }, [leases, searchTerm, typeFilter, statusFilter]);

  const calculateLeaseStatus = (startDate: string, endDate: string): Lease['status'] => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) return 'Draft';
    if (now > end) return 'Expired';
    
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 90) return 'Terminating';
    
    return 'Active';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setNewLease(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
               name === 'monthlyRent' || name === 'securityDeposit' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLease.propertyName && newLease.tenant && newLease.startDate && newLease.endDate) {
      const lease: Lease = {
        id: editingLease ? editingLease.id : Date.now(),
        ...newLease,
        status: calculateLeaseStatus(newLease.startDate, newLease.endDate)
      };
      
      if (editingLease) {
        setLeases(prev => prev.map(l => l.id === editingLease.id ? lease : l));
      } else {
        setLeases(prev => [...prev, lease]);
      }
      
      resetForm();
    }
  };

  const resetForm = () => {
    setNewLease({
      propertyName: '',
      tenant: '',
      leaseType: 'Commercial',
      startDate: '',
      endDate: '',
      monthlyRent: 0,
      securityDeposit: 0,
      renewalOption: false,
      contactPerson: '',
      notes: ''
    });
    setEditingLease(null);
    setShowForm(false);
  };

  const handleEdit = (lease: Lease) => {
    setEditingLease(lease);
    setNewLease({
      propertyName: lease.propertyName,
      tenant: lease.tenant,
      leaseType: lease.leaseType,
      startDate: lease.startDate,
      endDate: lease.endDate,
      monthlyRent: lease.monthlyRent,
      securityDeposit: lease.securityDeposit,
      renewalOption: lease.renewalOption,
      contactPerson: lease.contactPerson,
      notes: lease.notes
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setLeases(prev => prev.filter(lease => lease.id !== id));
    if (selectedLease?.id === id) {
      setSelectedLease(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      case 'Terminating': return 'bg-yellow-100 text-yellow-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaseTypeColor = (type: string) => {
    switch (type) {
      case 'Commercial': return 'bg-blue-100 text-blue-800';
      case 'Residential': return 'bg-purple-100 text-purple-800';
      case 'Industrial': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Lease Management Service</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Leases</h3>
          <p className="text-2xl font-bold text-blue-600">{leases.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Active</h3>
          <p className="text-2xl font-bold text-green-600">
            {leases.filter(l => l.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Expiring Soon</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {leases.filter(l => l.status === 'Terminating').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Monthly Revenue</h3>
          <p className="text-2xl font-bold text-purple-600">
            ${leases.reduce((sum, l) => sum + l.monthlyRent, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search properties or tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="Commercial">Commercial</option>
            <option value="Residential">Residential</option>
            <option value="Industrial">Industrial</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Terminating">Terminating</option>
            <option value="Draft">Draft</option>
          </select>
          <button
            onClick={() => {
              setEditingLease(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {showForm ? 'Cancel' : 'Add Lease'}
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingLease ? 'Edit Lease' : 'Add New Lease'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                <input
                  type="text"
                  name="propertyName"
                  value={newLease.propertyName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <input
                  type="text"
                  name="tenant"
                  value={newLease.tenant}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lease Type</label>
                <select
                  name="leaseType"
                  value={newLease.leaseType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Commercial">Commercial</option>
                  <option value="Residential">Residential</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={newLease.contactPerson}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={newLease.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={newLease.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent ($)</label>
                <input
                  type="number"
                  name="monthlyRent"
                  value={newLease.monthlyRent}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit ($)</label>
                <input
                  type="number"
                  name="securityDeposit"
                  value={newLease.securityDeposit}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="renewalOption"
                    checked={newLease.renewalOption}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Renewal Option Available</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={newLease.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {editingLease ? 'Update Lease' : 'Add Lease'}
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

      {/* Lease List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Lease Portfolio ({filteredLeases.length})</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
          {filteredLeases.map((lease) => (
            <div key={lease.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg truncate">{lease.propertyName}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lease.status)}`}>
                  {lease.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tenant:</span>
                  <span className="text-sm font-medium">{lease.tenant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getLeaseTypeColor(lease.leaseType)}`}>
                    {lease.leaseType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Monthly Rent:</span>
                  <span className="text-sm font-medium">${lease.monthlyRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">End Date:</span>
                  <span className="text-sm">{lease.endDate}</span>
                </div>
                {lease.status === 'Active' && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Days Remaining:</span>
                    <span className="text-sm font-medium">
                      {calculateDaysRemaining(lease.endDate)} days
                    </span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedLease(selectedLease?.id === lease.id ? null : lease)}
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                >
                  {selectedLease?.id === lease.id ? 'Hide Details' : 'View Details'}
                </button>
                <button
                  onClick={() => handleEdit(lease)}
                  className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(lease.id)}
                  className="bg-red-500 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>

              {selectedLease?.id === lease.id && (
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-1 text-sm">
                    <div><strong>Contact:</strong> {lease.contactPerson}</div>
                    <div><strong>Security Deposit:</strong> ${lease.securityDeposit.toLocaleString()}</div>
                    <div><strong>Renewal Option:</strong> {lease.renewalOption ? 'Yes' : 'No'}</div>
                    <div><strong>Start Date:</strong> {lease.startDate}</div>
                    {lease.notes && (
                      <div><strong>Notes:</strong> {lease.notes}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filteredLeases.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No leases found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaseManagementServicePage;
