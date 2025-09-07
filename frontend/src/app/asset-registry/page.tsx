'use client';

import React, { useState } from 'react';

interface AssetFormData {
  assetTag: string;
  assetName: string;
  description: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  building: string;
  floor: string;
  room: string;
  status: string;
  condition: string;
  criticality: string;
  purchasePrice: string;
  purchaseDate: string;
  warrantyExpiry: string;
  depreciationMethod: string;
  usefulLife: string;
  salvageValue: string;
  notes: string;
}

const AssetRegistryPage = () => {
  const [formData, setFormData] = useState<AssetFormData>({
    assetTag: '',
    assetName: '',
    description: '',
    category: '',
    subcategory: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
    building: '',
    floor: '',
    room: '',
    status: 'Active',
    condition: 'Good',
    criticality: 'Medium',
    purchasePrice: '',
    purchaseDate: '',
    warrantyExpiry: '',
    depreciationMethod: 'Straight-line',
    usefulLife: '',
    salvageValue: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const categories = [
    'HVAC',
    'Electrical',
    'Mechanical',
    'IT Equipment',
    'Vehicles',
    'Furniture',
    'Safety Equipment',
    'Laboratory Equipment',
    'Office Equipment',
    'Manufacturing Equipment'
  ];

  const subcategories: Record<string, string[]> = {
    'HVAC': ['Air Conditioner', 'Heating Unit', 'Ventilation System', 'Boiler', 'Chiller'],
    'Electrical': ['Generator', 'Transformer', 'Panel Board', 'UPS', 'Emergency Lighting'],
    'Mechanical': ['Pump', 'Motor', 'Compressor', 'Conveyor', 'Elevator'],
    'IT Equipment': ['Server', 'Router', 'Switch', 'Firewall', 'Storage'],
    'Vehicles': ['Truck', 'Van', 'Car', 'Forklift', 'Golf Cart'],
    'Furniture': ['Desk', 'Chair', 'Table', 'Cabinet', 'Shelving']
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-generate asset tag if name is provided
    if (name === 'assetName' && value && !formData.assetTag) {
      const tag = value.toUpperCase().replace(/\s+/g, '-').substring(0, 10) + '-' + Date.now().toString().slice(-4);
      setFormData(prev => ({ ...prev, assetTag: tag }));
    }

    // Reset subcategory when category changes
    if (name === 'category') {
      setFormData(prev => ({ ...prev, subcategory: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.assetTag.trim()) newErrors.assetTag = 'Asset tag is required';
    if (!formData.assetName.trim()) newErrors.assetName = 'Asset name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    
    if (formData.purchasePrice && isNaN(Number(formData.purchasePrice))) {
      newErrors.purchasePrice = 'Purchase price must be a valid number';
    }
    
    if (formData.usefulLife && isNaN(Number(formData.usefulLife))) {
      newErrors.usefulLife = 'Useful life must be a valid number';
    }
    
    if (formData.salvageValue && isNaN(Number(formData.salvageValue))) {
      newErrors.salvageValue = 'Salvage value must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Asset registered:', formData);
      setShowSuccessMessage(true);
      
      // Reset form
      setFormData({
        assetTag: '',
        assetName: '',
        description: '',
        category: '',
        subcategory: '',
        manufacturer: '',
        model: '',
        serialNumber: '',
        location: '',
        building: '',
        floor: '',
        room: '',
        status: 'Active',
        condition: 'Good',
        criticality: 'Medium',
        purchasePrice: '',
        purchaseDate: '',
        warrantyExpiry: '',
        depreciationMethod: 'Straight-line',
        usefulLife: '',
        salvageValue: '',
        notes: ''
      });
      
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error registering asset:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Asset Registration</h1>
          <p className="text-gray-600 mt-2">Register new assets in the system with comprehensive details</p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Asset registered successfully!</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 gap-6">
              
              {/* Basic Information */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asset Tag *</label>
                    <input
                      type="text"
                      name="assetTag"
                      value={formData.assetTag}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.assetTag ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., HVAC-001"
                    />
                    {errors.assetTag && <p className="mt-1 text-sm text-red-600">{errors.assetTag}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asset Name *</label>
                    <input
                      type="text"
                      name="assetName"
                      value={formData.assetName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.assetName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter asset name"
                    />
                    {errors.assetName && <p className="mt-1 text-sm text-red-600">{errors.assetName}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter asset description"
                    />
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Classification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.category ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                    <select
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleInputChange}
                      disabled={!formData.category}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Select subcategory</option>
                      {formData.category && subcategories[formData.category]?.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Criticality</label>
                    <select
                      name="criticality"
                      value={formData.criticality}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
                    <input
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter manufacturer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter model"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
                    <input
                      type="text"
                      name="serialNumber"
                      value={formData.serialNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter serial number"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.location ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter location"
                    />
                    {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
                    <input
                      type="text"
                      name="building"
                      value={formData.building}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter building"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                    <input
                      type="text"
                      name="floor"
                      value={formData.floor}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter floor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                    <input
                      type="text"
                      name="room"
                      value={formData.room}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter room"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price</label>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.purchasePrice ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    {errors.purchasePrice && <p className="mt-1 text-sm text-red-600">{errors.purchasePrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                    <input
                      type="date"
                      name="purchaseDate"
                      value={formData.purchaseDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Expiry</label>
                    <input
                      type="date"
                      name="warrantyExpiry"
                      value={formData.warrantyExpiry}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Depreciation Method</label>
                    <select
                      name="depreciationMethod"
                      value={formData.depreciationMethod}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Straight-line">Straight-line</option>
                      <option value="Declining Balance">Declining Balance</option>
                      <option value="Double Declining Balance">Double Declining Balance</option>
                      <option value="Sum of Years Digits">Sum of Years Digits</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Useful Life (years)</label>
                    <input
                      type="number"
                      name="usefulLife"
                      value={formData.usefulLife}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.usefulLife ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 10"
                      min="1"
                    />
                    {errors.usefulLife && <p className="mt-1 text-sm text-red-600">{errors.usefulLife}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Salvage Value</label>
                    <input
                      type="number"
                      name="salvageValue"
                      value={formData.salvageValue}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.salvageValue ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    {errors.salvageValue && <p className="mt-1 text-sm text-red-600">{errors.salvageValue}</p>}
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h3>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter any additional notes or comments about this asset"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  setFormData({
                    assetTag: '',
                    assetName: '',
                    description: '',
                    category: '',
                    subcategory: '',
                    manufacturer: '',
                    model: '',
                    serialNumber: '',
                    location: '',
                    building: '',
                    floor: '',
                    room: '',
                    status: 'Active',
                    condition: 'Good',
                    criticality: 'Medium',
                    purchasePrice: '',
                    purchaseDate: '',
                    warrantyExpiry: '',
                    depreciationMethod: 'Straight-line',
                    usefulLife: '',
                    salvageValue: '',
                    notes: ''
                  });
                  setErrors({});
                }}
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </div>
                ) : (
                  'Register Asset'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetRegistryPage;