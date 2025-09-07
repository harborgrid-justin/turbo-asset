'use client';

import React, { useState, useEffect } from 'react';

interface AssetProfile {
  id: string;
  assetTag: string;
  assetName: string;
  description: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: string;
  condition: string;
  criticality: string;
  location: string;
  building: string;
  floor: string;
  room: string;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  warrantyExpiry: string;
  depreciationMethod: string;
  usefulLife: number;
  salvageValue: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  maintenanceInterval: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes: string;
}

interface MaintenanceRecord {
  id: string;
  workOrderNumber: string;
  type: string;
  description: string;
  completedDate: string;
  technician: string;
  cost: number;
  duration: number;
  status: string;
}

interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  url: string;
}

const AssetProfilePage = () => {
  const [asset, setAsset] = useState<AssetProfile | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setAsset({
        id: '1',
        assetTag: 'HVAC-001',
        assetName: 'Central Air Conditioning Unit A',
        description: 'Primary HVAC system for Building A main floor cooling and heating',
        category: 'HVAC',
        subcategory: 'Air Conditioner',
        manufacturer: 'Carrier',
        model: 'CA-2500X',
        serialNumber: 'CR25X-98765-2020',
        status: 'Active',
        condition: 'Good',
        criticality: 'High',
        location: 'Main Building',
        building: 'Building A',
        floor: '1st Floor',
        room: 'Mechanical Room A1',
        purchasePrice: 25000,
        currentValue: 18750,
        purchaseDate: '2020-01-15',
        warrantyExpiry: '2025-01-15',
        depreciationMethod: 'Straight-line',
        usefulLife: 15,
        salvageValue: 2500,
        lastMaintenanceDate: '2024-10-15',
        nextMaintenanceDate: '2025-04-15',
        maintenanceInterval: 6,
        createdAt: '2020-01-15',
        updatedAt: '2024-12-01',
        createdBy: 'John Smith',
        notes: 'Critical system for main building climate control. Requires regular filter changes.'
      });

      setMaintenanceHistory([
        {
          id: '1',
          workOrderNumber: 'WO-2024-1234',
          type: 'Preventive',
          description: 'Filter replacement and system inspection',
          completedDate: '2024-10-15',
          technician: 'Mike Johnson',
          cost: 450,
          duration: 3,
          status: 'Completed'
        },
        {
          id: '2',
          workOrderNumber: 'WO-2024-0987',
          type: 'Corrective',
          description: 'Repair temperature sensor malfunction',
          completedDate: '2024-08-22',
          technician: 'Sarah Davis',
          cost: 275,
          duration: 2,
          status: 'Completed'
        }
      ]);

      setDocuments([
        {
          id: '1',
          name: 'Installation Manual',
          type: 'PDF',
          size: 2456789,
          uploadedAt: '2020-01-15',
          uploadedBy: 'John Smith',
          url: '/documents/hvac-001-manual.pdf'
        },
        {
          id: '2',
          name: 'Warranty Certificate',
          type: 'PDF',
          size: 512345,
          uploadedAt: '2020-01-15',
          uploadedBy: 'John Smith',
          url: '/documents/hvac-001-warranty.pdf'
        }
      ]);

      setLoading(false);
    }, 1000);
  }, []);

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

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

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

  if (loading || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{asset.assetName}</h1>
                <p className="text-lg text-blue-600 font-medium">{asset.assetTag}</p>
                <p className="text-gray-600 mt-1">{asset.description}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setEditing(!editing)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
              >
                {editing ? 'Save Changes' : 'Edit Asset'}
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">
                Schedule Maintenance
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold">
                Generate QR Code
              </button>
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex space-x-3 mt-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(asset.status)}`}>
              {asset.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(asset.condition)}`}>
              {asset.condition}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCriticalityColor(asset.criticality)}`}>
              {asset.criticality} Priority
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'maintenance', label: 'Maintenance History', icon: '🔧' },
              { id: 'financial', label: 'Financial Data', icon: '💰' },
              { id: 'documents', label: 'Documents', icon: '📄' },
              { id: 'qr', label: 'QR Code', icon: '🔲' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Asset Tag</label>
                    <p className="text-gray-900">{asset.assetTag}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <p className="text-gray-900">{asset.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Subcategory</label>
                    <p className="text-gray-900">{asset.subcategory}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Manufacturer</label>
                    <p className="text-gray-900">{asset.manufacturer}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Model</label>
                    <p className="text-gray-900">{asset.model}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Serial Number</label>
                    <p className="text-gray-900">{asset.serialNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Location</label>
                    <p className="text-gray-900">{asset.location}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Building</label>
                    <p className="text-gray-900">{asset.building}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Floor</label>
                    <p className="text-gray-900">{asset.floor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Room</label>
                    <p className="text-gray-900">{asset.room}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    📍 View on Floor Plan
                  </button>
                </div>
              </div>
            </div>

            {/* Maintenance Schedule */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Schedule</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Maintenance</label>
                  <p className="text-gray-900">{formatDate(asset.lastMaintenanceDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Next Scheduled</label>
                  <p className="text-gray-900">{formatDate(asset.nextMaintenanceDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Maintenance Interval</label>
                  <p className="text-gray-900">{asset.maintenanceInterval} months</p>
                </div>
                <div className="mt-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-yellow-800">Maintenance due in 3 months</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-700">{asset.notes}</p>
              <div className="mt-4 text-sm text-gray-500">
                <p>Created by {asset.createdBy} on {formatDate(asset.createdAt)}</p>
                <p>Last updated on {formatDate(asset.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Maintenance History</h3>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                  Create Work Order
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Technician
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {maintenanceHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        <button className="hover:text-blue-800">
                          {record.workOrderNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          record.type === 'Preventive' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.completedDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.technician}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.duration}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Purchase Price</label>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(asset.purchasePrice)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Purchase Date</label>
                  <p className="text-gray-900">{formatDate(asset.purchaseDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Warranty Expiry</label>
                  <p className="text-gray-900">{formatDate(asset.warrantyExpiry)}</p>
                </div>
              </div>
            </div>

            {/* Depreciation Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Depreciation</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Value</label>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(asset.currentValue)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Depreciation Method</label>
                  <p className="text-gray-900">{asset.depreciationMethod}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Useful Life</label>
                    <p className="text-gray-900">{asset.usefulLife} years</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Salvage Value</label>
                    <p className="text-gray-900">{formatCurrency(asset.salvageValue)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-600">Depreciation Progress</label>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${((asset.purchasePrice - asset.currentValue) / (asset.purchasePrice - asset.salvageValue)) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(((asset.purchasePrice - asset.currentValue) / (asset.purchasePrice - asset.salvageValue)) * 100).toFixed(1)}% depreciated
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Documents & Attachments</h3>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                  Upload Document
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.type} • {formatFileSize(doc.size)}</p>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      <p>Uploaded by {doc.uploadedBy}</p>
                      <p>{formatDate(doc.uploadedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">QR Code</h3>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                  <div className="w-48 h-48 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <p className="text-sm text-gray-500">QR Code for {asset.assetTag}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold">
                    Generate QR Code
                  </button>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold ml-2">
                    Download PNG
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  QR Code will link to: <br />
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    https://app.example.com/assets/{asset.id}
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetProfilePage;