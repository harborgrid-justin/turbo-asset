'use client';

import React, { useState, useEffect } from 'react';

interface Vendor {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: 'Maintenance' | 'Cleaning' | 'Security' | 'Landscaping' | 'IT Support' | 'Construction';
  status: 'Active' | 'Inactive' | 'Under Review' | 'Terminated';
  rating: number;
  contractValue: number;
  contractStart: string;
  contractEnd: string;
  servicesProvided: string[];
  paymentTerms: string;
  notes: string;
  lastEvaluation: string;
}

const VendorBrokerServicePage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([
    {
      id: 1,
      companyName: 'ProClean Services LLC',
      contactPerson: 'Alice Johnson',
      email: 'alice@proclean.com',
      phone: '(555) 123-4567',
      category: 'Cleaning',
      status: 'Active',
      rating: 4.8,
      contractValue: 120000,
      contractStart: '2024-01-01',
      contractEnd: '2025-12-31',
      servicesProvided: ['Office Cleaning', 'Window Cleaning', 'Carpet Cleaning'],
      paymentTerms: 'Net 30',
      notes: 'Excellent service quality, always on time',
      lastEvaluation: '2024-12-15'
    },
    {
      id: 2,
      companyName: 'SecureGuard Solutions',
      contactPerson: 'Bob Martinez',
      email: 'bob@secureguard.com',
      phone: '(555) 234-5678',
      category: 'Security',
      status: 'Active',
      rating: 4.5,
      contractValue: 180000,
      contractStart: '2024-06-01',
      contractEnd: '2026-05-31',
      servicesProvided: ['24/7 Security', 'Access Control', 'CCTV Monitoring'],
      paymentTerms: 'Net 15',
      notes: 'Professional team, good response times',
      lastEvaluation: '2024-11-30'
    },
    {
      id: 3,
      companyName: 'TechFix IT Services',
      contactPerson: 'Carol Davis',
      email: 'carol@techfix.com',
      phone: '(555) 345-6789',
      category: 'IT Support',
      status: 'Under Review',
      rating: 3.9,
      contractValue: 85000,
      contractStart: '2024-03-01',
      contractEnd: '2025-02-28',
      servicesProvided: ['Help Desk', 'Network Maintenance', 'Hardware Repair'],
      paymentTerms: 'Net 30',
      notes: 'Recent performance issues, under evaluation',
      lastEvaluation: '2024-10-15'
    },
    {
      id: 4,
      companyName: 'GreenSpace Landscaping',
      contactPerson: 'David Wilson',
      email: 'david@greenspace.com',
      phone: '(555) 456-7890',
      category: 'Landscaping',
      status: 'Terminated',
      rating: 2.8,
      contractValue: 45000,
      contractStart: '2023-04-01',
      contractEnd: '2024-03-31',
      servicesProvided: ['Lawn Maintenance', 'Tree Trimming', 'Seasonal Planting'],
      paymentTerms: 'Net 30',
      notes: 'Contract terminated due to poor service quality',
      lastEvaluation: '2024-01-20'
    }
  ]);

  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>(vendors);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showEvaluationForm, setShowEvaluationForm] = useState<Vendor | null>(null);

  const [newVendor, setNewVendor] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    category: 'Maintenance' as Vendor['category'],
    contractValue: 0,
    contractStart: '',
    contractEnd: '',
    servicesProvided: '',
    paymentTerms: 'Net 30',
    notes: ''
  });

  const [evaluation, setEvaluation] = useState({
    rating: 5,
    notes: '',
    performanceAreas: {
      quality: 5,
      timeliness: 5,
      communication: 5,
      value: 5
    }
  });

  const categories = ['Maintenance', 'Cleaning', 'Security', 'Landscaping', 'IT Support', 'Construction'];
  const paymentTerms = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Upon Completion'];

  useEffect(() => {
    const filtered = vendors.filter(vendor => {
      const matchesSearch = vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.servicesProvided.some(service => 
                             service.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === '' || vendor.category === categoryFilter;
      const matchesStatus = statusFilter === '' || vendor.status === statusFilter;
      
      let matchesRating = true;
      if (ratingFilter) {
        const rating = parseFloat(ratingFilter);
        matchesRating = vendor.rating >= rating;
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesRating;
    });
    setFilteredVendors(filtered);
  }, [vendors, searchTerm, categoryFilter, statusFilter, ratingFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewVendor(prev => ({
      ...prev,
      [name]: name === 'contractValue' ? Number(value) : value
    }));
  };

  const handleEvaluationChange = (field: string, value: number | string) => {
    if (field === 'rating' || field === 'notes') {
      setEvaluation(prev => ({ ...prev, [field]: value }));
    } else {
      setEvaluation(prev => ({
        ...prev,
        performanceAreas: { ...prev.performanceAreas, [field]: value as number }
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVendor.companyName && newVendor.contactPerson && newVendor.email) {
      const vendor: Vendor = {
        id: editingVendor ? editingVendor.id : Date.now(),
        ...newVendor,
        servicesProvided: newVendor.servicesProvided.split(',').map(s => s.trim()).filter(s => s),
        status: 'Active' as Vendor['status'],
        rating: 0,
        lastEvaluation: 'Not evaluated'
      };
      
      if (editingVendor) {
        setVendors(prev => prev.map(v => v.id === editingVendor.id ? { ...vendor, rating: editingVendor.rating, lastEvaluation: editingVendor.lastEvaluation } : v));
      } else {
        setVendors(prev => [...prev, vendor]);
      }
      
      resetForm();
    }
  };

  const handleEvaluationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showEvaluationForm) {
      const overallRating = (evaluation.performanceAreas.quality + 
                            evaluation.performanceAreas.timeliness + 
                            evaluation.performanceAreas.communication + 
                            evaluation.performanceAreas.value) / 4;
      
      setVendors(prev => prev.map(vendor => 
        vendor.id === showEvaluationForm.id 
          ? { 
              ...vendor, 
              rating: overallRating,
              lastEvaluation: new Date().toISOString().split('T')[0],
              notes: evaluation.notes ? evaluation.notes : vendor.notes
            }
          : vendor
      ));
      
      setShowEvaluationForm(null);
      setEvaluation({
        rating: 5,
        notes: '',
        performanceAreas: { quality: 5, timeliness: 5, communication: 5, value: 5 }
      });
    }
  };

  const resetForm = () => {
    setNewVendor({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      category: 'Maintenance',
      contractValue: 0,
      contractStart: '',
      contractEnd: '',
      servicesProvided: '',
      paymentTerms: 'Net 30',
      notes: ''
    });
    setEditingVendor(null);
    setShowForm(false);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setNewVendor({
      companyName: vendor.companyName,
      contactPerson: vendor.contactPerson,
      email: vendor.email,
      phone: vendor.phone,
      category: vendor.category,
      contractValue: vendor.contractValue,
      contractStart: vendor.contractStart,
      contractEnd: vendor.contractEnd,
      servicesProvided: vendor.servicesProvided.join(', '),
      paymentTerms: vendor.paymentTerms,
      notes: vendor.notes
    });
    setShowForm(true);
  };

  const updateStatus = (id: number, newStatus: Vendor['status']) => {
    setVendors(prev => prev.map(vendor => 
      vendor.id === id ? { ...vendor, status: newStatus } : vendor
    ));
  };

  const handleDelete = (id: number) => {
    setVendors(prev => prev.filter(vendor => vendor.id !== id));
    if (selectedVendor?.id === id) {
      setSelectedVendor(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      case 'Terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Maintenance': 'bg-blue-100 text-blue-800',
      'Cleaning': 'bg-green-100 text-green-800',
      'Security': 'bg-red-100 text-red-800',
      'Landscaping': 'bg-yellow-100 text-yellow-800',
      'IT Support': 'bg-purple-100 text-purple-800',
      'Construction': 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>
          ⭐
        </span>
      );
    }
    return stars;
  };

  const isContractExpiring = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 90 && diffDays > 0;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Vendor Broker Service</h1>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Vendors</h3>
          <p className="text-2xl font-bold text-blue-600">{vendors.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Active</h3>
          <p className="text-2xl font-bold text-green-600">
            {vendors.filter(v => v.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Under Review</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {vendors.filter(v => v.status === 'Under Review').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Expiring Soon</h3>
          <p className="text-2xl font-bold text-red-600">
            {vendors.filter(v => isContractExpiring(v.contractEnd)).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Value</h3>
          <p className="text-2xl font-bold text-purple-600">
            ${vendors.reduce((sum, v) => sum + v.contractValue, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search vendors..."
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
            <option value="Inactive">Inactive</option>
            <option value="Under Review">Under Review</option>
            <option value="Terminated">Terminated</option>
          </select>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Ratings</option>
            <option value="4">4+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="2">2+ Stars</option>
          </select>
          <button
            onClick={() => {
              setEditingVendor(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {showForm ? 'Cancel' : 'Add Vendor'}
          </button>
        </div>
      </div>

      {/* Add/Edit Vendor Form */}
      {showForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={newVendor.companyName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={newVendor.contactPerson}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newVendor.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={newVendor.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={newVendor.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value ($)</label>
                <input
                  type="number"
                  name="contractValue"
                  value={newVendor.contractValue}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Start</label>
                <input
                  type="date"
                  name="contractStart"
                  value={newVendor.contractStart}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract End</label>
                <input
                  type="date"
                  name="contractEnd"
                  value={newVendor.contractEnd}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select
                  name="paymentTerms"
                  value={newVendor.paymentTerms}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {paymentTerms.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Services (comma-separated)</label>
                <input
                  type="text"
                  name="servicesProvided"
                  value={newVendor.servicesProvided}
                  onChange={handleInputChange}
                  placeholder="Service 1, Service 2, Service 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={newVendor.notes}
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
                {editingVendor ? 'Update Vendor' : 'Add Vendor'}
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

      {/* Vendor Evaluation Form */}
      {showEvaluationForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Evaluate Vendor: {showEvaluationForm.companyName}
          </h2>
          <form onSubmit={handleEvaluationSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {Object.entries(evaluation.performanceAreas).map(([area, rating]) => (
                <div key={area}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {area} (1-5 stars)
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => handleEvaluationChange(area, Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 Star - Poor</option>
                    <option value={2}>2 Stars - Below Average</option>
                    <option value={3}>3 Stars - Average</option>
                    <option value={4}>4 Stars - Good</option>
                    <option value={5}>5 Stars - Excellent</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Notes</label>
              <textarea
                value={evaluation.notes}
                onChange={(e) => handleEvaluationChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional comments about vendor performance..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Submit Evaluation
              </button>
              <button
                type="button"
                onClick={() => setShowEvaluationForm(null)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vendors List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Vendor Directory ({filteredVendors.length})</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{vendor.companyName}</h3>
                  <p className="text-sm text-gray-600">{vendor.contactPerson}</p>
                  <div className="flex items-center mt-1">
                    {getRatingStars(vendor.rating)}
                    <span className="ml-2 text-sm text-gray-600">
                      ({vendor.rating > 0 ? vendor.rating.toFixed(1) : 'Not rated'})
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vendor.status)}`}>
                    {vendor.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(vendor.category)}`}>
                    {vendor.category}
                  </span>
                  {isContractExpiring(vendor.contractEnd) && (
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                      Expiring Soon
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract Value:</span>
                  <span className="font-medium">${vendor.contractValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract Period:</span>
                  <span>{vendor.contractStart} to {vendor.contractEnd}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Terms:</span>
                  <span>{vendor.paymentTerms}</span>
                </div>
                <div>
                  <span className="text-gray-600">Services:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {vendor.servicesProvided.slice(0, 3).map((service, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {service}
                      </span>
                    ))}
                    {vendor.servicesProvided.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                        +{vendor.servicesProvided.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                <button
                  onClick={() => setSelectedVendor(selectedVendor?.id === vendor.id ? null : vendor)}
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                >
                  {selectedVendor?.id === vendor.id ? 'Hide Details' : 'View Details'}
                </button>
                <button
                  onClick={() => setShowEvaluationForm(vendor)}
                  className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                >
                  Evaluate
                </button>
                <button
                  onClick={() => handleEdit(vendor)}
                  className="bg-purple-500 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded"
                >
                  Edit
                </button>
              </div>

              <div className="flex gap-1">
                <select
                  value={vendor.status}
                  onChange={(e) => updateStatus(vendor.id, e.target.value as Vendor['status'])}
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Terminated">Terminated</option>
                </select>
                <button
                  onClick={() => handleDelete(vendor.id)}
                  className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>

              {selectedVendor?.id === vendor.id && (
                <div className="mt-4 pt-4 border-t text-sm space-y-2">
                  <div><strong>Email:</strong> {vendor.email}</div>
                  <div><strong>Phone:</strong> {vendor.phone}</div>
                  <div><strong>Last Evaluation:</strong> {vendor.lastEvaluation}</div>
                  <div><strong>All Services:</strong> {vendor.servicesProvided.join(', ')}</div>
                  {vendor.notes && <div><strong>Notes:</strong> {vendor.notes}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filteredVendors.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No vendors found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorBrokerServicePage;
