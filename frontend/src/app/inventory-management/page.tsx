'use client';

import React, { useState, useEffect } from 'react';

interface InventoryItem {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  unitOfMeasure: string;
  unitCost: number;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  location: string;
  warehouse: string;
  shelf: string;
  lastRestocked: string;
  supplier: string;
  averageUsage: number;
  stockValue: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Discontinued';
}

interface StockTransaction {
  id: string;
  partNumber: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  workOrder?: string;
  technician: string;
  date: string;
  notes?: string;
}

const InventoryManagementPage = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Mock data
  const mockInventoryItems: InventoryItem[] = [
    {
      id: '1',
      partNumber: 'HVAC-FILTER-001',
      description: 'HVAC Air Filter 20x25x1 MERV 11',
      category: 'HVAC Parts',
      subcategory: 'Filters',
      manufacturer: 'FilterCorp',
      unitOfMeasure: 'Each',
      unitCost: 25.50,
      currentStock: 45,
      minimumStock: 20,
      maximumStock: 100,
      reorderPoint: 25,
      reorderQuantity: 50,
      location: 'A-01-15',
      warehouse: 'Main Warehouse',
      shelf: 'A1',
      lastRestocked: '2025-01-10',
      supplier: 'HVAC Supply Co.',
      averageUsage: 8,
      stockValue: 1147.50,
      status: 'In Stock'
    },
    {
      id: '2',
      partNumber: 'ELEC-BREAKER-020',
      description: '20A Circuit Breaker',
      category: 'Electrical',
      subcategory: 'Breakers',
      manufacturer: 'ElectroCorp',
      unitOfMeasure: 'Each',
      unitCost: 45.00,
      currentStock: 8,
      minimumStock: 10,
      maximumStock: 50,
      reorderPoint: 12,
      reorderQuantity: 25,
      location: 'B-02-08',
      warehouse: 'Main Warehouse',
      shelf: 'B2',
      lastRestocked: '2024-12-15',
      supplier: 'Electric Supply Inc.',
      averageUsage: 3,
      stockValue: 360.00,
      status: 'Low Stock'
    },
    {
      id: '3',
      partNumber: 'MECH-BEARING-305',
      description: 'Deep Groove Ball Bearing 6305',
      category: 'Mechanical',
      subcategory: 'Bearings',
      manufacturer: 'BearingPro',
      unitOfMeasure: 'Each',
      unitCost: 15.75,
      currentStock: 0,
      minimumStock: 5,
      maximumStock: 30,
      reorderPoint: 8,
      reorderQuantity: 20,
      location: 'C-03-12',
      warehouse: 'Main Warehouse',
      shelf: 'C3',
      lastRestocked: '2024-11-20',
      supplier: 'Industrial Bearings Ltd.',
      averageUsage: 2,
      stockValue: 0,
      status: 'Out of Stock'
    }
  ];

  const mockTransactions: StockTransaction[] = [
    {
      id: '1',
      partNumber: 'HVAC-FILTER-001',
      type: 'OUT',
      quantity: 4,
      reason: 'Work Order Usage',
      workOrder: 'WO-2025-0001',
      technician: 'Mike Johnson',
      date: '2025-01-16',
      notes: 'Used for HVAC filter replacement'
    },
    {
      id: '2',
      partNumber: 'ELEC-BREAKER-020',
      type: 'OUT',
      quantity: 2,
      reason: 'Emergency Repair',
      workOrder: 'WO-2025-0002',
      technician: 'Sarah Davis',
      date: '2025-01-15'
    },
    {
      id: '3',
      partNumber: 'HVAC-FILTER-001',
      type: 'IN',
      quantity: 50,
      reason: 'Restock Delivery',
      technician: 'Inventory Manager',
      date: '2025-01-10',
      notes: 'Quarterly restock order'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setInventoryItems(mockInventoryItems);
      setFilteredItems(mockInventoryItems);
      setRecentTransactions(mockTransactions);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    // Apply filters
    const filtered = inventoryItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
      const matchesStatus = statusFilter === '' || item.status === statusFilter;
      const matchesLowStock = !showLowStock || item.currentStock <= item.reorderPoint;

      return matchesSearch && matchesCategory && matchesStatus && matchesLowStock;
    });

    setFilteredItems(filtered);
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, showLowStock, inventoryItems]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
      'In Stock': 'bg-green-100 text-green-800',
      'Low Stock': 'bg-yellow-100 text-yellow-800',
      'Out of Stock': 'bg-red-100 text-red-800',
      'Discontinued': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'IN': 'bg-green-100 text-green-800',
      'OUT': 'bg-red-100 text-red-800',
      'ADJUSTMENT': 'bg-blue-100 text-blue-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const openStockAdjustment = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowStockModal(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Calculate metrics
  const totalStockValue = inventoryItems.reduce((sum, item) => sum + item.stockValue, 0);
  const lowStockCount = inventoryItems.filter(item => item.currentStock <= item.reorderPoint).length;
  const outOfStockCount = inventoryItems.filter(item => item.currentStock === 0).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-gray-600 mt-2">Track and manage maintenance parts and supplies</p>
            </div>
            <div className="flex space-x-3">
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">
                Generate Reorder Report
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                Add New Item
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Stock Value</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalStockValue)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-3xl font-bold text-gray-900">{inventoryItems.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-yellow-600">{lowStockCount}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.966-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-3xl font-bold text-red-600">{outOfStockCount}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <input
                type="text"
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="HVAC Parts">HVAC Parts</option>
              <option value="Electrical">Electrical</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Safety">Safety</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Discontinued">Discontinued</option>
            </select>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show only low stock items</span>
            </label>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setStatusFilter('');
                setShowLowStock(false);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Inventory Table */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Inventory Items</h3>
            </div>
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
                        Part Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-blue-600">{item.partNumber}</p>
                            <p className="text-sm text-gray-500">{item.location}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-gray-900">{item.description}</p>
                            <p className="text-sm text-gray-500">{item.manufacturer}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <span className={`font-medium ${
                              item.currentStock <= item.reorderPoint ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {item.currentStock}
                            </span>
                            <span className="text-gray-500"> / {item.maximumStock}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Reorder at {item.reorderPoint}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.stockValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openStockAdjustment(item)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Adjust
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              Reorder
                            </button>
                            <button className="text-purple-600 hover:text-purple-900">
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredItems.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{transaction.partNumber}</p>
                        <p className="text-xs text-gray-500">{transaction.reason}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.type}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className={`font-medium ${transaction.type === 'OUT' ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.type === 'OUT' ? '-' : '+'}{transaction.quantity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>By:</span>
                        <span className="font-medium">{transaction.technician}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="font-medium">{formatDate(transaction.date)}</span>
                      </div>
                      {transaction.workOrder && (
                        <div className="flex justify-between">
                          <span>Work Order:</span>
                          <span className="font-medium text-blue-600">{transaction.workOrder}</span>
                        </div>
                      )}
                    </div>
                    {transaction.notes && (
                      <p className="text-xs text-gray-500 mt-2 italic">{transaction.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stock Adjustment Modal */}
        {showStockModal && selectedItem && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Stock Adjustment</h3>
                <button
                  onClick={() => setShowStockModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Part Number</label>
                  <p className="text-gray-900">{selectedItem.partNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Current Stock</label>
                  <p className="text-gray-900">{selectedItem.currentStock} {selectedItem.unitOfMeasure}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Adjustment Type</label>
                  <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="IN">Stock In</option>
                    <option value="OUT">Stock Out</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Quantity</label>
                  <input 
                    type="number" 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Reason</label>
                  <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">Select reason</option>
                    <option value="Work Order Usage">Work Order Usage</option>
                    <option value="Restock Delivery">Restock Delivery</option>
                    <option value="Physical Count">Physical Count</option>
                    <option value="Damage/Loss">Damage/Loss</option>
                    <option value="Return to Vendor">Return to Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Notes</label>
                  <textarea 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                  Save Adjustment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagementPage;