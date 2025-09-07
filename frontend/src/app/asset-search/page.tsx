'use client';

import React, { useState, useEffect } from 'react';

interface Asset {
  id: string;
  assetTag: string;
  assetName: string;
  category: string;
  status: string;
  condition: string;
  criticality: string;
  location: string;
  building: string;
  manufacturer: string;
  model: string;
  purchasePrice: number;
  purchaseDate: string;
  warrantyExpiry: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
}

interface SearchFilters {
  query: string;
  category: string;
  status: string;
  condition: string;
  criticality: string;
  location: string;
  building: string;
  manufacturer: string;
  maintenanceDue: boolean;
  warrantyExpiring: boolean;
}

const AssetSearchPage = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('assetName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    status: '',
    condition: '',
    criticality: '',
    location: '',
    building: '',
    manufacturer: '',
    maintenanceDue: false,
    warrantyExpiring: false
  });

  // Mock data
  const mockAssets: Asset[] = [
    {
      id: '1',
      assetTag: 'HVAC-001',
      assetName: 'Central Air Conditioning Unit A',
      category: 'HVAC',
      status: 'Active',
      condition: 'Good',
      criticality: 'High',
      location: 'Main Building',
      building: 'Building A',
      manufacturer: 'Carrier',
      model: 'CA-2500',
      purchasePrice: 25000,
      purchaseDate: '2020-01-15',
      warrantyExpiry: '2025-01-15',
      lastMaintenanceDate: '2024-10-15',
      nextMaintenanceDate: '2025-04-15'
    },
    {
      id: '2',
      assetTag: 'ELEC-002',
      assetName: 'Emergency Generator B',
      category: 'Electrical',
      status: 'Active',
      condition: 'Excellent',
      criticality: 'Critical',
      location: 'Power Room',
      building: 'Building A',
      manufacturer: 'Generac',
      model: 'G-150',
      purchasePrice: 45000,
      purchaseDate: '2021-03-20',
      warrantyExpiry: '2026-03-20',
      lastMaintenanceDate: '2024-12-01',
      nextMaintenanceDate: '2025-06-01'
    },
    {
      id: '3',
      assetTag: 'MECH-003',
      assetName: 'Water Pump System C',
      category: 'Mechanical',
      status: 'Under Maintenance',
      condition: 'Fair',
      criticality: 'Medium',
      location: 'Basement',
      building: 'Building B',
      manufacturer: 'Grundfos',
      model: 'GF-300',
      purchasePrice: 12000,
      purchaseDate: '2019-07-10',
      warrantyExpiry: '2024-07-10',
      lastMaintenanceDate: '2024-11-20',
      nextMaintenanceDate: '2025-01-20'
    }
  ];

  useEffect(() => {
    // Simulate loading data
    setLoading(true);
    setTimeout(() => {
      setAssets(mockAssets);
      setFilteredAssets(mockAssets);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    // Apply filters
    const filtered = assets.filter(asset => {
      const matchesQuery = filters.query === '' || 
        asset.assetTag.toLowerCase().includes(filters.query.toLowerCase()) ||
        asset.assetName.toLowerCase().includes(filters.query.toLowerCase()) ||
        asset.manufacturer.toLowerCase().includes(filters.query.toLowerCase()) ||
        asset.model.toLowerCase().includes(filters.query.toLowerCase());

      const matchesCategory = filters.category === '' || asset.category === filters.category;
      const matchesStatus = filters.status === '' || asset.status === filters.status;
      const matchesCondition = filters.condition === '' || asset.condition === filters.condition;
      const matchesCriticality = filters.criticality === '' || asset.criticality === filters.criticality;
      const matchesLocation = filters.location === '' || asset.location.toLowerCase().includes(filters.location.toLowerCase());
      const matchesBuilding = filters.building === '' || asset.building.toLowerCase().includes(filters.building.toLowerCase());
      const matchesManufacturer = filters.manufacturer === '' || asset.manufacturer.toLowerCase().includes(filters.manufacturer.toLowerCase());

      // Check maintenance due
      const maintenanceDue = filters.maintenanceDue ? new Date(asset.nextMaintenanceDate) <= new Date() : true;
      
      // Check warranty expiring (within 30 days)
      const warrantyExpiring = filters.warrantyExpiring ? 
        new Date(asset.warrantyExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : true;

      return matchesQuery && matchesCategory && matchesStatus && matchesCondition && 
             matchesCriticality && matchesLocation && matchesBuilding && matchesManufacturer &&
             maintenanceDue && warrantyExpiring;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Asset];
      const bValue = b[sortBy as keyof Asset];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    setFilteredAssets(filtered);
    setCurrentPage(1);
  }, [filters, sortBy, sortOrder, assets]);

  const handleFilterChange = (field: keyof SearchFilters, value: string | boolean) => {
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

  const handleSelectAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === paginatedAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(paginatedAssets.map(asset => asset.id)));
    }
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      status: '',
      condition: '',
      criticality: '',
      location: '',
      building: '',
      manufacturer: '',
      maintenanceDue: false,
      warrantyExpiring: false
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssets = filteredAssets.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-gray-100 text-gray-800',
      'Under Maintenance': 'bg-yellow-100 text-yellow-800',
      'Retired': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      'Excellent': 'bg-green-100 text-green-800',
      'Good': 'bg-blue-100 text-blue-800',
      'Fair': 'bg-yellow-100 text-yellow-800',
      'Poor': 'bg-orange-100 text-orange-800',
      'Critical': 'bg-red-100 text-red-800'
    };
    return colors[condition] || 'bg-gray-100 text-gray-800';
  };

  const getCriticalityColor = (criticality: string) => {
    const colors: Record<string, string> = {
      'Critical': 'bg-red-100 text-red-800',
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return colors[criticality] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Asset Search & Browse</h1>
          <p className="text-gray-600 mt-2">Search and filter through your asset inventory</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by asset tag, name, manufacturer, or model..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="HVAC">HVAC</option>
              <option value="Electrical">Electrical</option>
              <option value="Mechanical">Mechanical</option>
              <option value="IT Equipment">IT Equipment</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Furniture">Furniture</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Retired">Retired</option>
            </select>

            <select
              value={filters.condition}
              onChange={(e) => handleFilterChange('condition', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Conditions</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>

            <select
              value={filters.criticality}
              onChange={(e) => handleFilterChange('criticality', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Criticality</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <input
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              placeholder="Building"
              value={filters.building}
              onChange={(e) => handleFilterChange('building', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              placeholder="Manufacturer"
              value={filters.manufacturer}
              onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Special Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.maintenanceDue}
                onChange={(e) => handleFilterChange('maintenanceDue', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Maintenance Due</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.warrantyExpiring}
                onChange={(e) => handleFilterChange('warrantyExpiring', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Warranty Expiring</span>
            </label>

            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Results Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-700">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAssets.length)} of {filteredAssets.length} assets
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              {selectedAssets.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">{selectedAssets.size} selected</span>
                  <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                    Bulk Actions
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Table */}
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
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedAssets.size === paginatedAssets.length && paginatedAssets.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('assetTag')}
                    >
                      Asset Tag
                      {sortBy === 'assetTag' && (
                        <span className="ml-2">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('assetName')}
                    >
                      Asset Name
                      {sortBy === 'assetName' && (
                        <span className="ml-2">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criticality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manufacturer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedAssets.has(asset.id)}
                          onChange={() => handleSelectAsset(asset.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        <button className="hover:text-blue-800">
                          {asset.assetTag}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.assetName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(asset.status)}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(asset.condition)}`}>
                          {asset.condition}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCriticalityColor(asset.criticality)}`}>
                          {asset.criticality}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.manufacturer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">View</button>
                          <button className="text-green-600 hover:text-green-900">Edit</button>
                          <button className="text-purple-600 hover:text-purple-900">Maintain</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredAssets.length === 0 && !loading && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No assets found</h3>
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
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetSearchPage;