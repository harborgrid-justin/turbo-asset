'use client';

import React, { useState, useEffect } from 'react';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  unitPrice: number;
  location: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'On Order';
  lastUpdated: string;
}

const InventoryServicePage = () => {
  const [items, setItems] = useState<InventoryItem[]>([
    {
      id: 1,
      name: 'Office Chair',
      category: 'Furniture',
      quantity: 25,
      minQuantity: 10,
      maxQuantity: 50,
      unitPrice: 299.99,
      location: 'Warehouse A',
      status: 'In Stock',
      lastUpdated: '2025-01-15'
    },
    {
      id: 2,
      name: 'Laptop Docking Station',
      category: 'Electronics',
      quantity: 8,
      minQuantity: 15,
      maxQuantity: 30,
      unitPrice: 199.99,
      location: 'IT Storage',
      status: 'Low Stock',
      lastUpdated: '2025-01-14'
    },
    {
      id: 3,
      name: 'Whiteboard Markers',
      category: 'Office Supplies',
      quantity: 0,
      minQuantity: 5,
      maxQuantity: 20,
      unitPrice: 2.99,
      location: 'Supply Room',
      status: 'Out of Stock',
      lastUpdated: '2025-01-13'
    }
  ]);

  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>(items);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    quantity: 0,
    minQuantity: 0,
    maxQuantity: 0,
    unitPrice: 0,
    location: ''
  });

  const categories = ['Furniture', 'Electronics', 'Office Supplies', 'Equipment'];
  const locations = ['Warehouse A', 'Warehouse B', 'IT Storage', 'Supply Room'];

  useEffect(() => {
    const filtered = items.filter(item => {
      return (
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (categoryFilter === '' || item.category === categoryFilter) &&
        (statusFilter === '' || item.status === statusFilter)
      );
    });
    setFilteredItems(filtered);
  }, [items, searchTerm, categoryFilter, statusFilter]);

  const getItemStatus = (item: InventoryItem): InventoryItem['status'] => {
    if (item.quantity === 0) return 'Out of Stock';
    if (item.quantity <= item.minQuantity) return 'Low Stock';
    return 'In Stock';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'minQuantity' || name === 'maxQuantity' || name === 'unitPrice'
        ? Number(value)
        : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.name && newItem.category && newItem.location) {
      const item: InventoryItem = {
        id: editingItem ? editingItem.id : Date.now(),
        ...newItem,
        status: getItemStatus({ ...newItem } as InventoryItem),
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      if (editingItem) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? item : i));
      } else {
        setItems(prev => [...prev, item]);
      }
      
      resetForm();
    }
  };

  const resetForm = () => {
    setNewItem({
      name: '',
      category: '',
      quantity: 0,
      minQuantity: 0,
      maxQuantity: 0,
      unitPrice: 0,
      location: ''
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      maxQuantity: item.maxQuantity,
      unitPrice: item.unitPrice,
      location: item.location
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            quantity: newQuantity, 
            status: getItemStatus({ ...item, quantity: newQuantity }),
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : item
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-green-100 text-green-800';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
      case 'Out of Stock': return 'bg-red-100 text-red-800';
      case 'On Order': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Inventory Service</h1>

      {/* Filters and Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Search items..."
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
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="On Order">On Order</option>
          </select>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {showForm ? 'Cancel' : 'Add Item'}
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  name="name"
                  value={newItem.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={newItem.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={newItem.quantity}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  name="unitPrice"
                  value={newItem.unitPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Quantity</label>
                <input
                  type="number"
                  name="minQuantity"
                  value={newItem.minQuantity}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Quantity</label>
                <input
                  type="number"
                  name="maxQuantity"
                  value={newItem.maxQuantity}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  name="location"
                  value={newItem.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Location</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {editingItem ? 'Update Item' : 'Add Item'}
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

      {/* Inventory Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Inventory Items ({filteredItems.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">ID: {item.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">Min: {item.minQuantity} | Max: {item.maxQuantity}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.unitPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No inventory items found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryServicePage;
