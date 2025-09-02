import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  unitOfMeasure: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  unitCost: number;
  totalValue: number;
  location: {
    warehouse: string;
    aisle: string;
    shelf: string;
    bin: string;
  };
  supplier: {
    id: string;
    name: string;
    contact: string;
    leadTime: number; // in days
  };
  status: 'Active' | 'Inactive' | 'Discontinued' | 'OutOfStock' | 'LowStock';
  lastInventoryDate: string;
  expiryDate?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  movementType: 'Inbound' | 'Outbound' | 'Adjustment' | 'Transfer' | 'Return';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string; // PO number, SO number, etc.
  location: {
    fromWarehouse?: string;
    toWarehouse?: string;
    fromLocation?: string;
    toLocation?: string;
  };
  performedBy: string;
  performedAt: string;
  cost: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryCount {
  id: string;
  warehouse: string;
  status: 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  totalItems: number;
  countedItems: number;
  discrepancies: number;
  assignedTo: string[];
  progress: {
    planned: number;
    counted: number;
    verified: number;
    completionPercentage: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  capacity: {
    total: number;
    used: number;
    available: number;
  };
  zones: {
    id: string;
    name: string;
    type: 'Storage' | 'Picking' | 'Shipping' | 'Receiving';
    capacity: number;
    occupied: number;
  }[];
  status: 'Active' | 'Inactive' | 'Maintenance';
  temperature?: {
    min: number;
    max: number;
    current?: number;
  };
  securityLevel: 'Low' | 'Medium' | 'High';
  createdAt: string;
  updatedAt: string;
}

const InventoryServicePage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'counts' | 'warehouses'>('inventory');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [selectedCount, setSelectedCount] = useState<InventoryCount | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Form state for inventory items
  const [newItem, setNewItem] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    subcategory: '',
    unitOfMeasure: 'Each',
    currentStock: 0,
    minimumStock: 0,
    maximumStock: 0,
    reorderPoint: 0,
    unitCost: 0,
    warehouse: '',
    aisle: '',
    shelf: '',
    bin: '',
    supplierId: '',
    supplierName: '',
    supplierContact: '',
    leadTime: 7,
    expiryDate: '',
    batchNumber: '',
    tags: ''
  });

  // Form state for stock movements
  const [newMovement, setNewMovement] = useState({
    itemId: '',
    movementType: 'Inbound' as StockMovement['movementType'],
    quantity: 0,
    reason: '',
    reference: '',
    fromWarehouse: '',
    toWarehouse: '',
    fromLocation: '',
    toLocation: '',
    notes: ''
  });

  // Form state for inventory counts
  const [newCount, setNewCount] = useState({
    warehouse: '',
    scheduledDate: '',
    assignedTo: '',
    notes: ''
  });

  // Form state for warehouses
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    code: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    totalCapacity: 0,
    securityLevel: 'Medium' as Warehouse['securityLevel'],
    minTemp: 0,
    maxTemp: 30
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [inventoryData, movementsData, countsData, warehousesData] = await Promise.all([
        apiService.generic.getAll<InventoryItem>('inventory'),
        apiService.generic.getAll<StockMovement>('stock-movements'),
        apiService.generic.getAll<InventoryCount>('inventory-counts'),
        apiService.generic.getAll<Warehouse>('warehouses')
      ]);
      setInventory(inventoryData);
      setMovements(movementsData);
      setCounts(countsData);
      setWarehouses(warehousesData);
    } catch (err) {
      setError('Failed to load inventory data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.sku || !newItem.name || !newItem.category || !newItem.warehouse) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const itemData = {
        ...newItem,
        totalValue: newItem.currentStock * newItem.unitCost,
        location: {
          warehouse: newItem.warehouse,
          aisle: newItem.aisle,
          shelf: newItem.shelf,
          bin: newItem.bin
        },
        supplier: {
          id: newItem.supplierId,
          name: newItem.supplierName,
          contact: newItem.supplierContact,
          leadTime: newItem.leadTime
        },
        status: 'Active' as InventoryItem['status'],
        lastInventoryDate: new Date().toISOString(),
        tags: newItem.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        expiryDate: newItem.expiryDate || undefined,
        batchNumber: newItem.batchNumber || undefined
      };

      const createdItem = await apiService.generic.create<InventoryItem>('inventory', itemData);

      setInventory(prev => [createdItem, ...prev]);
      setNewItem({
        sku: '',
        name: '',
        description: '',
        category: '',
        subcategory: '',
        unitOfMeasure: 'Each',
        currentStock: 0,
        minimumStock: 0,
        maximumStock: 0,
        reorderPoint: 0,
        unitCost: 0,
        warehouse: '',
        aisle: '',
        shelf: '',
        bin: '',
        supplierId: '',
        supplierName: '',
        supplierContact: '',
        leadTime: 7,
        expiryDate: '',
        batchNumber: '',
        tags: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create inventory item. Please try again.');
      console.error('Error creating item:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovement.itemId || !newMovement.quantity || !newMovement.reason) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const item = inventory.find(i => i.id === newMovement.itemId);
      if (!item) {
        setError('Selected item not found.');
        return;
      }

      const movementData = {
        ...newMovement,
        itemName: item.name,
        previousStock: item.currentStock,
        newStock: newMovement.movementType === 'Inbound'
          ? item.currentStock + newMovement.quantity
          : item.currentStock - newMovement.quantity,
        location: {
          fromWarehouse: newMovement.fromWarehouse || undefined,
          toWarehouse: newMovement.toWarehouse || undefined,
          fromLocation: newMovement.fromLocation || undefined,
          toLocation: newMovement.toLocation || undefined
        },
        performedBy: 'current-user', // This would come from auth context
        performedAt: new Date().toISOString(),
        cost: newMovement.movementType === 'Inbound' ? newMovement.quantity * item.unitCost : 0
      };

      const createdMovement = await apiService.generic.create<StockMovement>('stock-movements', movementData);

      // Update item stock
      await apiService.generic.update<InventoryItem>('inventory', parseInt(newMovement.itemId), {
        currentStock: movementData.newStock,
        lastInventoryDate: new Date().toISOString(),
        totalValue: movementData.newStock * item.unitCost
      });

      setMovements(prev => [createdMovement, ...prev]);
      setInventory(prev => prev.map(inv =>
        inv.id === newMovement.itemId ? {
          ...inv,
          currentStock: movementData.newStock,
          totalValue: movementData.newStock * inv.unitCost,
          lastInventoryDate: new Date().toISOString()
        } : inv
      ));

      setNewMovement({
        itemId: '',
        movementType: 'Inbound',
        quantity: 0,
        reason: '',
        reference: '',
        fromWarehouse: '',
        toWarehouse: '',
        fromLocation: '',
        toLocation: '',
        notes: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create stock movement. Please try again.');
      console.error('Error creating movement:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCount.warehouse || !newCount.scheduledDate) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const warehouse = warehouses.find(w => w.id === newCount.warehouse);
      if (!warehouse) {
        setError('Selected warehouse not found.');
        return;
      }

      const countData = {
        ...newCount,
        status: 'Planned' as InventoryCount['status'],
        totalItems: inventory.filter(i => i.location.warehouse === warehouse.name).length,
        countedItems: 0,
        discrepancies: 0,
        assignedTo: newCount.assignedTo.split(',').map(name => name.trim()).filter(name => name),
        progress: {
          planned: inventory.filter(i => i.location.warehouse === warehouse.name).length,
          counted: 0,
          verified: 0,
          completionPercentage: 0
        }
      };

      const createdCount = await apiService.generic.create<InventoryCount>('inventory-counts', countData);

      setCounts(prev => [createdCount, ...prev]);
      setNewCount({
        warehouse: '',
        scheduledDate: '',
        assignedTo: '',
        notes: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create inventory count. Please try again.');
      console.error('Error creating count:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouse.name || !newWarehouse.code || !newWarehouse.city || !newWarehouse.country) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const warehouseData = {
        ...newWarehouse,
        address: {
          street: newWarehouse.street,
          city: newWarehouse.city,
          state: newWarehouse.state,
          zipCode: newWarehouse.zipCode,
          country: newWarehouse.country
        },
        contact: {
          name: newWarehouse.contactName,
          phone: newWarehouse.contactPhone,
          email: newWarehouse.contactEmail
        },
        capacity: {
          total: newWarehouse.totalCapacity,
          used: 0,
          available: newWarehouse.totalCapacity
        },
        zones: [],
        status: 'Active' as Warehouse['status'],
        temperature: {
          min: newWarehouse.minTemp,
          max: newWarehouse.maxTemp
        }
      };

      const createdWarehouse = await apiService.generic.create<Warehouse>('warehouses', warehouseData);

      setWarehouses(prev => [createdWarehouse, ...prev]);
      setNewWarehouse({
        name: '',
        code: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        totalCapacity: 0,
        securityLevel: 'Medium',
        minTemp: 0,
        maxTemp: 30
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create warehouse. Please try again.');
      console.error('Error creating warehouse:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateItemStatus = async (itemId: string, status: InventoryItem['status']) => {
    try {
      setError(null);
      await apiService.generic.update<InventoryItem>('inventory', parseInt(itemId), { status });
      setInventory(prev => prev.map(item =>
        item.id === itemId ? { ...item, status } : item
      ));
    } catch (err) {
      setError('Failed to update item status. Please try again.');
      console.error('Error updating item:', err);
    }
  };

  const updateCountStatus = async (countId: string, status: InventoryCount['status']) => {
    try {
      setError(null);
      const updateData: Partial<InventoryCount> = { status };

      if (status === 'InProgress' && !counts.find(c => c.id === countId)?.startedAt) {
        updateData.startedAt = new Date().toISOString();
      } else if (status === 'Completed' && !counts.find(c => c.id === countId)?.completedAt) {
        updateData.completedAt = new Date().toISOString();
      }

      await apiService.generic.update<InventoryCount>('inventory-counts', parseInt(countId), updateData);
      setCounts(prev => prev.map(count =>
        count.id === countId ? { ...count, ...updateData } : count
      ));
    } catch (err) {
      setError('Failed to update count status. Please try again.');
      console.error('Error updating count:', err);
    }
  };

  const updateWarehouseStatus = async (warehouseId: string, status: Warehouse['status']) => {
    try {
      setError(null);
      await apiService.generic.update<Warehouse>('warehouses', parseInt(warehouseId), { status });
      setWarehouses(prev => prev.map(warehouse =>
        warehouse.id === warehouseId ? { ...warehouse, status } : warehouse
      ));
    } catch (err) {
      setError('Failed to update warehouse status. Please try again.');
      console.error('Error updating warehouse:', err);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this inventory item? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('inventory', parseInt(itemId));
      setInventory(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      setError('Failed to delete inventory item. Please try again.');
      console.error('Error deleting item:', err);
    }
  };

  const deleteMovement = async (movementId: string) => {
    if (!confirm('Are you sure you want to delete this stock movement? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('stock-movements', parseInt(movementId));
      setMovements(prev => prev.filter(movement => movement.id !== movementId));
    } catch (err) {
      setError('Failed to delete stock movement. Please try again.');
      console.error('Error deleting movement:', err);
    }
  };

  const deleteCount = async (countId: string) => {
    if (!confirm('Are you sure you want to delete this inventory count? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('inventory-counts', parseInt(countId));
      setCounts(prev => prev.filter(count => count.id !== countId));
    } catch (err) {
      setError('Failed to delete inventory count. Please try again.');
      console.error('Error deleting count:', err);
    }
  };

  const deleteWarehouse = async (warehouseId: string) => {
    if (!confirm('Are you sure you want to delete this warehouse? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('warehouses', parseInt(warehouseId));
      setWarehouses(prev => prev.filter(warehouse => warehouse.id !== warehouseId));
    } catch (err) {
      setError('Failed to delete warehouse. Please try again.');
      console.error('Error deleting warehouse:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Discontinued': return 'bg-red-100 text-red-800';
      case 'OutOfStock': return 'bg-red-100 text-red-800';
      case 'LowStock': return 'bg-yellow-100 text-yellow-800';
      case 'Planned': return 'bg-blue-100 text-blue-800';
      case 'InProgress': return 'bg-orange-100 text-orange-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'Inbound': return 'bg-green-100 text-green-800';
      case 'Outbound': return 'bg-blue-100 text-blue-800';
      case 'Adjustment': return 'bg-yellow-100 text-yellow-800';
      case 'Transfer': return 'bg-purple-100 text-purple-800';
      case 'Return': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockLevelColor = (current: number, min: number, max: number) => {
    if (current === 0) return 'bg-red-100 text-red-800';
    if (current <= min) return 'bg-yellow-100 text-yellow-800';
    if (current >= max) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockLevelText = (current: number, min: number, max: number) => {
    if (current === 0) return 'Out of Stock';
    if (current <= min) return 'Low Stock';
    if (current >= max) return 'Overstock';
    return 'In Stock';
  };

  const filteredInventory = inventory.filter(item => {
    const categoryMatch = filterCategory === 'All' || item.category === filterCategory;
    const statusMatch = filterStatus === 'All' || item.status === filterStatus;
    const warehouseMatch = filterWarehouse === 'All' || item.location.warehouse === filterWarehouse;
    const searchMatch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && statusMatch && warehouseMatch && searchMatch;
  });

  const filteredMovements = movements.filter(movement => {
    const searchMatch = !searchQuery ||
      movement.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (movement.reference && movement.reference.toLowerCase().includes(searchQuery.toLowerCase()));
    return searchMatch;
  });

  const filteredCounts = counts.filter(count => {
    const statusMatch = filterStatus === 'All' || count.status === filterStatus;
    const warehouseMatch = filterWarehouse === 'All' || count.warehouse === filterWarehouse;
    const searchMatch = !searchQuery ||
      count.warehouse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      count.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && warehouseMatch && searchMatch;
  });

  const filteredWarehouses = warehouses.filter(warehouse => {
    const searchMatch = !searchQuery ||
      warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warehouse.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warehouse.address.city.toLowerCase().includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  const getStats = () => {
    const totalItems = inventory.length;
    const activeItems = inventory.filter(i => i.status === 'Active').length;
    const lowStockItems = inventory.filter(i => i.currentStock <= i.minimumStock && i.currentStock > 0).length;
    const outOfStockItems = inventory.filter(i => i.currentStock === 0).length;
    const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    const totalMovements = movements.length;
    const recentMovements = movements.filter(m => {
      const movementDate = new Date(m.performedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return movementDate >= weekAgo;
    }).length;
    const activeCounts = counts.filter(c => c.status === 'InProgress' || c.status === 'Planned').length;
    const completedCounts = counts.filter(c => c.status === 'Completed').length;
    const totalWarehouses = warehouses.length;
    const activeWarehouses = warehouses.filter(w => w.status === 'Active').length;

    return {
      totalItems,
      activeItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      totalMovements,
      recentMovements,
      activeCounts,
      completedCounts,
      totalWarehouses,
      activeWarehouses
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Inventory Service</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Items</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalItems}</p>
          <p className="text-sm text-gray-600">{stats.activeItems} active</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Stock Alerts</h3>
          <p className="text-2xl font-bold text-red-600">{stats.lowStockItems + stats.outOfStockItems}</p>
          <p className="text-sm text-gray-600">{stats.lowStockItems} low, {stats.outOfStockItems} out</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Value</h3>
          <p className="text-2xl font-bold text-green-600">${stats.totalValue.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Inventory value</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Recent Activity</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.recentMovements}</p>
          <p className="text-sm text-gray-600">Movements this week</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'inventory'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Inventory ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'movements'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Movements ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab('counts')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'counts'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Counts ({counts.length})
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'warehouses'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Warehouses ({warehouses.length})
        </button>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Inventory Items</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search items..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Categories</option>
                  {Array.from(new Set(inventory.map(i => i.category))).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Discontinued">Discontinued</option>
                  <option value="OutOfStock">Out of Stock</option>
                  <option value="LowStock">Low Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                <select
                  value={filterWarehouse}
                  onChange={(e) => setFilterWarehouse(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Warehouses</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Inventory Item</h3>
              <form onSubmit={handleCreateItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU *</label>
                    <input
                      type="text"
                      value={newItem.sku}
                      onChange={(e) => setNewItem(prev => ({ ...prev, sku: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Item Name *</label>
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category *</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select category...</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Tools">Tools</option>
                      <option value="Materials">Materials</option>
                      <option value="Equipment">Equipment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subcategory</label>
                    <input
                      type="text"
                      value={newItem.subcategory}
                      onChange={(e) => setNewItem(prev => ({ ...prev, subcategory: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit of Measure</label>
                    <select
                      value={newItem.unitOfMeasure}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unitOfMeasure: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Each">Each</option>
                      <option value="Box">Box</option>
                      <option value="Case">Case</option>
                      <option value="Pallet">Pallet</option>
                      <option value="Kg">Kg</option>
                      <option value="Liter">Liter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Warehouse *</label>
                    <select
                      value={newItem.warehouse}
                      onChange={(e) => setNewItem(prev => ({ ...prev, warehouse: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select warehouse...</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                    <input
                      type="number"
                      value={newItem.currentStock}
                      onChange={(e) => setNewItem(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Stock</label>
                    <input
                      type="number"
                      value={newItem.minimumStock}
                      onChange={(e) => setNewItem(prev => ({ ...prev, minimumStock: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Stock</label>
                    <input
                      type="number"
                      value={newItem.maximumStock}
                      onChange={(e) => setNewItem(prev => ({ ...prev, maximumStock: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reorder Point</label>
                    <input
                      type="number"
                      value={newItem.reorderPoint}
                      onChange={(e) => setNewItem(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit Cost ($)</label>
                    <input
                      type="number"
                      value={newItem.unitCost}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                    <input
                      type="text"
                      value={newItem.supplierName}
                      onChange={(e) => setNewItem(prev => ({ ...prev, supplierName: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Aisle</label>
                    <input
                      type="text"
                      value={newItem.aisle}
                      onChange={(e) => setNewItem(prev => ({ ...prev, aisle: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Shelf</label>
                    <input
                      type="text"
                      value={newItem.shelf}
                      onChange={(e) => setNewItem(prev => ({ ...prev, shelf: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bin</label>
                    <input
                      type="text"
                      value={newItem.bin}
                      onChange={(e) => setNewItem(prev => ({ ...prev, bin: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input
                      type="date"
                      value={newItem.expiryDate}
                      onChange={(e) => setNewItem(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                    <input
                      type="text"
                      value={newItem.batchNumber}
                      onChange={(e) => setNewItem(prev => ({ ...prev, batchNumber: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newItem.tags}
                    onChange={(e) => setNewItem(prev => ({ ...prev, tags: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="fragile, hazardous, perishable"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add Inventory Item'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredInventory.map((item) => (
              <div key={item.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{item.name}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                        {item.sku}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStockLevelColor(item.currentStock, item.minimumStock, item.maximumStock)}`}>
                        {getStockLevelText(item.currentStock, item.minimumStock, item.maximumStock)}
                      </span>
                    </div>
                    <p className="text-gray-600">{item.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Category: {item.category}</span>
                      <span>Location: {item.location.warehouse} {item.location.aisle}-{item.location.shelf}-{item.location.bin}</span>
                      <span>Stock: {item.currentStock} {item.unitOfMeasure}</span>
                      <span>Value: ${item.totalValue.toFixed(2)}</span>
                    </div>
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        ${item.unitCost.toFixed(2)}/{item.unitOfMeasure}
                      </p>
                      <p className="text-sm text-gray-600">
                        Min: {item.minimumStock}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {item.status === 'Active' && (
                        <button
                          onClick={() => updateItemStatus(item.id, 'Inactive')}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Deactivate
                        </button>
                      )}
                      {item.status === 'Inactive' && (
                        <button
                          onClick={() => updateItemStatus(item.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedItem?.id === item.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedItem?.id === item.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">SKU</p>
                        <p className="font-semibold">{item.sku}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Category</p>
                        <p className="font-semibold">{item.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Unit of Measure</p>
                        <p className="font-semibold">{item.unitOfMeasure}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold">{item.status}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Current Stock</p>
                        <p className="font-semibold">{item.currentStock}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Minimum Stock</p>
                        <p className="font-semibold">{item.minimumStock}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Maximum Stock</p>
                        <p className="font-semibold">{item.maximumStock}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Reorder Point</p>
                        <p className="font-semibold">{item.reorderPoint}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Unit Cost</p>
                        <p className="font-semibold">${item.unitCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Value</p>
                        <p className="font-semibold">${item.totalValue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Supplier</p>
                        <p className="font-semibold">{item.supplier.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Lead Time</p>
                        <p className="font-semibold">{item.supplier.leadTime} days</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Warehouse</p>
                        <p className="font-semibold">{item.location.warehouse}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-semibold">{item.location.aisle}-{item.location.shelf}-{item.location.bin}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Inventory</p>
                        <p className="font-semibold">{new Date(item.lastInventoryDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Expiry Date</p>
                        <p className="font-semibold">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    {item.batchNumber && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-2">Batch Information</h4>
                        <div className="bg-white p-4 rounded border">
                          <p className="text-gray-700">Batch Number: {item.batchNumber}</p>
                        </div>
                      </div>
                    )}

                    {item.tags.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Tags ({item.tags.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {item.tags.map((tag, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(item.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredInventory.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterCategory === 'All' && filterStatus === 'All' && filterWarehouse === 'All' && !searchQuery
                  ? 'No inventory items found. Add your first item to get started.'
                  : 'No items match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Stock Movements</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search movements..."
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Record Movement'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Record Stock Movement</h3>
              <form onSubmit={handleCreateMovement} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Item *</label>
                    <select
                      value={newMovement.itemId}
                      onChange={(e) => setNewMovement(prev => ({ ...prev, itemId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select item...</option>
                      {inventory.map(item => (
                        <option key={item.id} value={item.id}>{item.name} (Current: {item.currentStock})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Movement Type *</label>
                    <select
                      value={newMovement.movementType}
                      onChange={(e) => setNewMovement(prev => ({ ...prev, movementType: e.target.value as StockMovement['movementType'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="Inbound">Inbound</option>
                      <option value="Outbound">Outbound</option>
                      <option value="Adjustment">Adjustment</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Return">Return</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                    <input
                      type="number"
                      value={newMovement.quantity}
                      onChange={(e) => setNewMovement(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason *</label>
                    <select
                      value={newMovement.reason}
                      onChange={(e) => setNewMovement(prev => ({ ...prev, reason: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select reason...</option>
                      <option value="Purchase Order">Purchase Order</option>
                      <option value="Sales Order">Sales Order</option>
                      <option value="Stock Adjustment">Stock Adjustment</option>
                      <option value="Damaged Goods">Damaged Goods</option>
                      <option value="Lost Items">Lost Items</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Return">Return</option>
                      <option value="Cycle Count">Cycle Count</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reference (PO/SO #)</label>
                    <input
                      type="text"
                      value={newMovement.reference}
                      onChange={(e) => setNewMovement(prev => ({ ...prev, reference: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="PO-12345 or SO-67890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">From Warehouse</label>
                    <select
                      value={newMovement.fromWarehouse}
                      onChange={(e) => setNewMovement(prev => ({ ...prev, fromWarehouse: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select warehouse...</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">To Warehouse</label>
                    <select
                      value={newMovement.toWarehouse}
                      onChange={(e) => setNewMovement(prev => ({ ...prev, toWarehouse: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select warehouse...</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">From Location</label>
                    <input
                      type="text"
                      value={newMovement.fromLocation}
                      onChange={(e) => setNewMovement(prev => ({ ...prev, fromLocation: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Aisle-Shelf-Bin"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">To Location</label>
                    <input
                      type="text"
                      value={newMovement.toLocation}
                      onChange={(e) => setNewMovement(prev => ({ ...prev, toLocation: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Aisle-Shelf-Bin"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={newMovement.notes}
                    onChange={(e) => setNewMovement(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Recording...' : 'Record Movement'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredMovements.map((movement) => (
              <div key={movement.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{movement.itemName}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getMovementTypeColor(movement.movementType)}`}>
                        {movement.movementType}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                        {movement.reason}
                      </span>
                    </div>
                    <p className="text-gray-600">Quantity: {movement.quantity} | Previous: {movement.previousStock} → New: {movement.newStock}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>By: {movement.performedBy}</span>
                      <span>At: {new Date(movement.performedAt).toLocaleString()}</span>
                      {movement.reference && <span>Ref: {movement.reference}</span>}
                      <span>Cost: ${movement.cost.toFixed(2)}</span>
                    </div>
                    {(movement.location.fromWarehouse || movement.location.toWarehouse) && (
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        {movement.location.fromWarehouse && <span>From: {movement.location.fromWarehouse}</span>}
                        {movement.location.toWarehouse && <span>To: {movement.location.toWarehouse}</span>}
                        {movement.location.fromLocation && <span>From Loc: {movement.location.fromLocation}</span>}
                        {movement.location.toLocation && <span>To Loc: {movement.location.toLocation}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedMovement(selectedMovement?.id === movement.id ? null : movement)}
                      className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedMovement?.id === movement.id ? 'Hide' : 'Details'}
                    </button>
                    <button
                      onClick={() => deleteMovement(movement.id)}
                      className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {selectedMovement?.id === movement.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Movement Type</p>
                        <p className="font-semibold">{movement.movementType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Quantity</p>
                        <p className="font-semibold">{movement.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Previous Stock</p>
                        <p className="font-semibold">{movement.previousStock}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">New Stock</p>
                        <p className="font-semibold">{movement.newStock}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Reason</p>
                        <p className="font-semibold">{movement.reason}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Reference</p>
                        <p className="font-semibold">{movement.reference || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cost</p>
                        <p className="font-semibold">${movement.cost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Performed By</p>
                        <p className="font-semibold">{movement.performedBy}</p>
                      </div>
                    </div>

                    {(movement.location.fromWarehouse || movement.location.toWarehouse) && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-2">Location Details</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">From Warehouse</p>
                            <p className="font-semibold">{movement.location.fromWarehouse || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">To Warehouse</p>
                            <p className="font-semibold">{movement.location.toWarehouse || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">From Location</p>
                            <p className="font-semibold">{movement.location.fromLocation || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">To Location</p>
                            <p className="font-semibold">{movement.location.toLocation || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {movement.notes && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-2">Notes</h4>
                        <div className="bg-white p-4 rounded border">
                          <p className="text-gray-700">{movement.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(movement.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(movement.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredMovements.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {!searchQuery
                  ? 'No stock movements found. Record your first movement to get started.'
                  : 'No movements match the search query.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Counts Tab */}
      {activeTab === 'counts' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Inventory Counts</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search counts..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Status</option>
                  <option value="Planned">Planned</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                <select
                  value={filterWarehouse}
                  onChange={(e) => setFilterWarehouse(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Warehouses</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Schedule Count'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Schedule Inventory Count</h3>
              <form onSubmit={handleCreateCount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Warehouse *</label>
                    <select
                      value={newCount.warehouse}
                      onChange={(e) => setNewCount(prev => ({ ...prev, warehouse: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select warehouse...</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.name}>{warehouse.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Scheduled Date *</label>
                    <input
                      type="date"
                      value={newCount.scheduledDate}
                      onChange={(e) => setNewCount(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned Team (comma-separated)</label>
                  <input
                    type="text"
                    value={newCount.assignedTo}
                    onChange={(e) => setNewCount(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="John Doe, Jane Smith, Bob Johnson"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={newCount.notes}
                    onChange={(e) => setNewCount(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Scheduling...' : 'Schedule Inventory Count'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredCounts.map((count) => (
              <div key={count.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{count.warehouse}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(count.status)}`}>
                        {count.status}
                      </span>
                    </div>
                    <p className="text-gray-600">Scheduled: {new Date(count.scheduledDate).toLocaleDateString()}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Items: {count.countedItems}/{count.totalItems}</span>
                      <span>Progress: {count.progress.completionPercentage}%</span>
                      <span>Discrepancies: {count.discrepancies}</span>
                      {count.assignedTo.length > 0 && <span>Team: {count.assignedTo.length} members</span>}
                    </div>
                    {count.startedAt && (
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>Started: {new Date(count.startedAt).toLocaleString()}</span>
                        {count.completedAt && <span>Completed: {new Date(count.completedAt).toLocaleString()}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Planned: {count.progress.planned}
                      </p>
                      <p className="text-sm text-gray-600">
                        Counted: {count.progress.counted}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {count.status === 'Planned' && (
                        <button
                          onClick={() => updateCountStatus(count.id, 'InProgress')}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Start
                        </button>
                      )}
                      {count.status === 'InProgress' && (
                        <button
                          onClick={() => updateCountStatus(count.id, 'Completed')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedCount(selectedCount?.id === count.id ? null : count)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedCount?.id === count.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteCount(count.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedCount?.id === count.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Warehouse</p>
                        <p className="font-semibold">{count.warehouse}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold">{count.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Items</p>
                        <p className="font-semibold">{count.totalItems}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Counted Items</p>
                        <p className="font-semibold">{count.countedItems}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Discrepancies</p>
                        <p className="font-semibold">{count.discrepancies}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Completion</p>
                        <p className="font-semibold">{count.progress.completionPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Verified Items</p>
                        <p className="font-semibold">{count.progress.verified}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Scheduled Date</p>
                        <p className="font-semibold">{new Date(count.scheduledDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {count.assignedTo.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Assigned Team ({count.assignedTo.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {count.assignedTo.map((member, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {member}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {count.notes && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-2">Notes</h4>
                        <div className="bg-white p-4 rounded border">
                          <p className="text-gray-700">{count.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(count.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(count.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredCounts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterStatus === 'All' && filterWarehouse === 'All' && !searchQuery
                  ? 'No inventory counts found. Schedule your first count to get started.'
                  : 'No counts match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Warehouses Tab */}
      {activeTab === 'warehouses' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Warehouses</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search warehouses..."
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Warehouse'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Warehouse</h3>
              <form onSubmit={handleCreateWarehouse} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Warehouse Name *</label>
                    <input
                      type="text"
                      value={newWarehouse.name}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Warehouse Code *</label>
                    <input
                      type="text"
                      value={newWarehouse.code}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, code: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="WH001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                    <input
                      type="text"
                      value={newWarehouse.contactName}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, contactName: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                    <input
                      type="tel"
                      value={newWarehouse.contactPhone}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, contactPhone: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                    <input
                      type="email"
                      value={newWarehouse.contactEmail}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, contactEmail: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Capacity</label>
                    <input
                      type="number"
                      value={newWarehouse.totalCapacity}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, totalCapacity: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
                    <input
                      type="text"
                      value={newWarehouse.street}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, street: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City *</label>
                    <input
                      type="text"
                      value={newWarehouse.city}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, city: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <input
                      type="text"
                      value={newWarehouse.state}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, state: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                    <input
                      type="text"
                      value={newWarehouse.zipCode}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country *</label>
                    <input
                      type="text"
                      value={newWarehouse.country}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, country: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Security Level</label>
                    <select
                      value={newWarehouse.securityLevel}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, securityLevel: e.target.value as Warehouse['securityLevel'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Temperature (°C)</label>
                    <input
                      type="number"
                      value={newWarehouse.minTemp}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, minTemp: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Temperature (°C)</label>
                    <input
                      type="number"
                      value={newWarehouse.maxTemp}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, maxTemp: parseInt(e.target.value) || 30 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.1"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add Warehouse'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredWarehouses.map((warehouse) => (
              <div key={warehouse.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{warehouse.name}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                        {warehouse.code}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${warehouse.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {warehouse.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${warehouse.securityLevel === 'High' ? 'bg-red-100 text-red-800' : warehouse.securityLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {warehouse.securityLevel}
                      </span>
                    </div>
                    <p className="text-gray-600">{warehouse.address.street}, {warehouse.address.city}, {warehouse.address.state} {warehouse.address.zipCode}, {warehouse.address.country}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Contact: {warehouse.contact.name} ({warehouse.contact.phone})</span>
                      <span>Capacity: {warehouse.capacity.used}/{warehouse.capacity.total}</span>
                      <span>Zones: {warehouse.zones.length}</span>
                      {warehouse.temperature && <span>Temp: {warehouse.temperature.min}°C - {warehouse.temperature.max}°C</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Available: {warehouse.capacity.available}
                      </p>
                      <p className="text-sm text-gray-600">
                        Items: {inventory.filter(i => i.location.warehouse === warehouse.name).length}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {warehouse.status === 'Active' && (
                        <button
                          onClick={() => updateWarehouseStatus(warehouse.id, 'Inactive')}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Deactivate
                        </button>
                      )}
                      {warehouse.status === 'Inactive' && (
                        <button
                          onClick={() => updateWarehouseStatus(warehouse.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                      </button>
                      )}
                      <button
                        onClick={() => setSelectedWarehouse(selectedWarehouse?.id === warehouse.id ? null : warehouse)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedWarehouse?.id === warehouse.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteWarehouse(warehouse.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedWarehouse?.id === warehouse.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Warehouse Code</p>
                        <p className="font-semibold">{warehouse.code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold">{warehouse.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Security Level</p>
                        <p className="font-semibold">{warehouse.securityLevel}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Capacity</p>
                        <p className="font-semibold">{warehouse.capacity.total}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Used Capacity</p>
                        <p className="font-semibold">{warehouse.capacity.used}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Available Capacity</p>
                        <p className="font-semibold">{warehouse.capacity.available}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Number of Zones</p>
                        <p className="font-semibold">{warehouse.zones.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Contact Email</p>
                        <p className="font-semibold">{warehouse.contact.email}</p>
                      </div>
                    </div>

                    {warehouse.temperature && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">Min Temperature</p>
                          <p className="font-semibold">{warehouse.temperature.min}°C</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Max Temperature</p>
                          <p className="font-semibold">{warehouse.temperature.max}°C</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Current Temperature</p>
                          <p className="font-semibold">{warehouse.temperature.current || 'N/A'}°C</p>
                        </div>
                      </div>
                    )}

                    {warehouse.zones.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Warehouse Zones ({warehouse.zones.length})</h4>
                        <div className="space-y-2">
                          {warehouse.zones.map((zone, index) => (
                            <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                              <div className="flex-1">
                                <p className="font-medium">{zone.name}</p>
                                <p className="text-sm text-gray-600">Type: {zone.type} | Capacity: {zone.occupied}/{zone.capacity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(warehouse.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(warehouse.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredWarehouses.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {!searchQuery
                  ? 'No warehouses found. Add your first warehouse to get started.'
                  : 'No warehouses match the search query.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryServicePage;
