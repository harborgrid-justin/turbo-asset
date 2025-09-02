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
      <h1 className="text-2xl font-bold mb-4">InventoryService</h1>
      <p>This is the UI page for InventoryService.</p>
      {/* Add more components here */}
    </div>
  );
};

export default InventoryServicePage;
