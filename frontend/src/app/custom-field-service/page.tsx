import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface CustomField {
  id: string;
  name: string;
  label: string;
  description?: string;
  fieldType: 'Text' | 'Number' | 'Date' | 'Boolean' | 'Select' | 'Multiselect' | 'Textarea';
  entityType: 'Asset' | 'Contract' | 'Maintenance' | 'WorkOrder' | 'User' | 'Vendor';
  isRequired: boolean;
  isActive: boolean;
  defaultValue?: string;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  options?: string[]; // For select/multiselect fields
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomFieldValue {
  id: string;
  customFieldId: string;
  entityId: string;
  entityType: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

const CustomFieldServicePage = () => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [filterEntityType, setFilterEntityType] = useState<string>('All');
  const [filterFieldType, setFilterFieldType] = useState<string>('All');
  const [creating, setCreating] = useState(false);

  // Form state
  const [newField, setNewField] = useState({
    name: '',
    label: '',
    description: '',
    fieldType: 'Text' as CustomField['fieldType'],
    entityType: 'Asset' as CustomField['entityType'],
    isRequired: false,
    isActive: true,
    defaultValue: '',
    validationRules: {
      minLength: 0,
      maxLength: 255,
      min: 0,
      max: 999999,
      pattern: ''
    },
    options: '',
    displayOrder: 0
  });

  // Load data on component mount
  useEffect(() => {
    loadCustomFields();
    loadFieldValues();
  }, []);

  const loadCustomFields = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<CustomField>('custom-fields');
      setCustomFields(data);
    } catch (err) {
      setError('Failed to load custom fields. Please try again.');
      console.error('Error loading custom fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFieldValues = async () => {
    try {
      const data = await apiService.generic.getAll<CustomFieldValue>('custom-field-values');
      setFieldValues(data);
    } catch (err) {
      console.error('Error loading field values:', err);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField.name || !newField.label) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const fieldData = {
        ...newField,
        options: newField.options.split(',').map(option => option.trim()).filter(option => option),
        validationRules: {
          ...newField.validationRules,
          minLength: newField.validationRules.minLength || undefined,
          maxLength: newField.validationRules.maxLength || undefined,
          min: newField.validationRules.min || undefined,
          max: newField.validationRules.max || undefined,
          pattern: newField.validationRules.pattern || undefined
        }
      };

      const createdField = await apiService.generic.create<CustomField>('custom-fields', fieldData);

      setCustomFields(prev => [createdField, ...prev]);
      setNewField({
        name: '',
        label: '',
        description: '',
        fieldType: 'Text',
        entityType: 'Asset',
        isRequired: false,
        isActive: true,
        defaultValue: '',
        validationRules: {
          minLength: 0,
          maxLength: 255,
          min: 0,
          max: 999999,
          pattern: ''
        },
        options: '',
        displayOrder: 0
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create custom field. Please try again.');
      console.error('Error creating custom field:', err);
    } finally {
      setCreating(false);
    }
  };

  const toggleFieldStatus = async (fieldId: string, isActive: boolean) => {
    try {
      setError(null);
      await apiService.generic.update<CustomField>('custom-fields', parseInt(fieldId), { isActive: !isActive });
      setCustomFields(prev => prev.map(field =>
        field.id === fieldId ? { ...field, isActive: !isActive } : field
      ));
    } catch (err) {
      setError('Failed to update field status. Please try again.');
      console.error('Error updating field:', err);
    }
  };

  const deleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field? This will also delete all associated values. This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('custom-fields', parseInt(fieldId));
      setCustomFields(prev => prev.filter(field => field.id !== fieldId));
      setFieldValues(prev => prev.filter(value => value.customFieldId !== fieldId));
    } catch (err) {
      setError('Failed to delete custom field. Please try again.');
      console.error('Error deleting field:', err);
    }
  };

  const getFieldTypeColor = (fieldType: string) => {
    switch (fieldType) {
      case 'Text': return 'bg-blue-100 text-blue-800';
      case 'Number': return 'bg-green-100 text-green-800';
      case 'Date': return 'bg-purple-100 text-purple-800';
      case 'Boolean': return 'bg-orange-100 text-orange-800';
      case 'Select': return 'bg-indigo-100 text-indigo-800';
      case 'Multiselect': return 'bg-pink-100 text-pink-800';
      case 'Textarea': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case 'Asset': return 'bg-blue-100 text-blue-800';
      case 'Contract': return 'bg-green-100 text-green-800';
      case 'Maintenance': return 'bg-purple-100 text-purple-800';
      case 'WorkOrder': return 'bg-orange-100 text-orange-800';
      case 'User': return 'bg-indigo-100 text-indigo-800';
      case 'Vendor': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFields = customFields.filter(field => {
    const entityMatch = filterEntityType === 'All' || field.entityType === filterEntityType;
    const typeMatch = filterFieldType === 'All' || field.fieldType === filterFieldType;
    return entityMatch && typeMatch;
  });

  const getFieldStats = () => {
    const total = customFields.length;
    const active = customFields.filter(f => f.isActive).length;
    const required = customFields.filter(f => f.isRequired).length;
    const byEntity = customFields.reduce((acc, field) => {
      acc[field.entityType] = (acc[field.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, active, required, byEntity };
  };

  const stats = getFieldStats();

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
      <h1 className="text-3xl font-bold mb-6">Custom Field Service</h1>

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

      {/* Custom Field Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Fields</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active</h3>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Required</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.required}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Field Values</h3>
          <p className="text-2xl font-bold text-purple-600">{fieldValues.length}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Custom Fields</h2>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Entities</option>
              <option value="Asset">Asset</option>
              <option value="Contract">Contract</option>
              <option value="Maintenance">Maintenance</option>
              <option value="WorkOrder">Work Order</option>
              <option value="User">User</option>
              <option value="Vendor">Vendor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
            <select
              value={filterFieldType}
              onChange={(e) => setFilterFieldType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All">All Types</option>
              <option value="Text">Text</option>
              <option value="Number">Number</option>
              <option value="Date">Date</option>
              <option value="Boolean">Boolean</option>
              <option value="Select">Select</option>
              <option value="Multiselect">Multiselect</option>
              <option value="Textarea">Textarea</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={creating}
            >
              {showCreateForm ? 'Cancel' : 'Create Field'}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Custom Field</h3>
          <form onSubmit={handleCreateField} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Field Name *</label>
                <input
                  type="text"
                  value={newField.name}
                  onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Display Label *</label>
                <input
                  type="text"
                  value={newField.label}
                  onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Entity Type</label>
                <select
                  value={newField.entityType}
                  onChange={(e) => setNewField(prev => ({ ...prev, entityType: e.target.value as CustomField['entityType'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Asset">Asset</option>
                  <option value="Contract">Contract</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="WorkOrder">Work Order</option>
                  <option value="User">User</option>
                  <option value="Vendor">Vendor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Field Type</label>
                <select
                  value={newField.fieldType}
                  onChange={(e) => setNewField(prev => ({ ...prev, fieldType: e.target.value as CustomField['fieldType'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Text">Text</option>
                  <option value="Number">Number</option>
                  <option value="Date">Date</option>
                  <option value="Boolean">Boolean</option>
                  <option value="Select">Select</option>
                  <option value="Multiselect">Multiselect</option>
                  <option value="Textarea">Textarea</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Display Order</label>
                <input
                  type="number"
                  value={newField.displayOrder}
                  onChange={(e) => setNewField(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Value</label>
                <input
                  type="text"
                  value={newField.defaultValue}
                  onChange={(e) => setNewField(prev => ({ ...prev, defaultValue: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={newField.isRequired}
                  onChange={(e) => setNewField(prev => ({ ...prev, isRequired: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isRequired" className="ml-2 block text-sm text-gray-900">
                  Required Field
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newField.isActive}
                  onChange={(e) => setNewField(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active Field
                </label>
              </div>
            </div>

            {(newField.fieldType === 'Select' || newField.fieldType === 'Multiselect') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Options (comma-separated)</label>
                <input
                  type="text"
                  value={newField.options}
                  onChange={(e) => setNewField(prev => ({ ...prev, options: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Option1, Option2, Option3"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Min Length</label>
                <input
                  type="number"
                  value={newField.validationRules.minLength}
                  onChange={(e) => setNewField(prev => ({
                    ...prev,
                    validationRules: { ...prev.validationRules, minLength: parseInt(e.target.value) || 0 }
                  }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Length</label>
                <input
                  type="number"
                  value={newField.validationRules.maxLength}
                  onChange={(e) => setNewField(prev => ({
                    ...prev,
                    validationRules: { ...prev.validationRules, maxLength: parseInt(e.target.value) || 255 }
                  }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pattern (Regex)</label>
                <input
                  type="text"
                  value={newField.validationRules.pattern}
                  onChange={(e) => setNewField(prev => ({
                    ...prev,
                    validationRules: { ...prev.validationRules, pattern: e.target.value }
                  }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newField.description}
                onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Custom Field'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredFields.map((field) => (
          <div key={field.id} className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold">{field.label}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getFieldTypeColor(field.fieldType)}`}>
                    {field.fieldType}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getEntityTypeColor(field.entityType)}`}>
                    {field.entityType}
                  </span>
                  {field.isRequired && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-semibold">
                      Required
                    </span>
                  )}
                  {!field.isActive && (
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded font-semibold">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-gray-600">Name: {field.name}</p>
                {field.description && (
                  <p className="text-sm text-gray-500">{field.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Order: {field.displayOrder}</p>
                  <p className="text-sm text-gray-600">
                    Values: {fieldValues.filter(v => v.customFieldId === field.id).length}
                  </p>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => toggleFieldStatus(field.id, field.isActive)}
                    className={`${field.isActive ? 'bg-gray-500 hover:bg-gray-700' : 'bg-green-500 hover:bg-green-700'} text-white text-xs px-2 py-1 rounded`}
                  >
                    {field.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setSelectedField(selectedField?.id === field.id ? null : field)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    {selectedField?.id === field.id ? 'Hide' : 'Details'}
                  </button>
                  <button
                    onClick={() => deleteField(field.id)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {selectedField?.id === field.id && (
              <div className="mt-6 border-t pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Field Type</p>
                    <p className="font-semibold">{field.fieldType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Entity Type</p>
                    <p className="font-semibold">{field.entityType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Required</p>
                    <p className="font-semibold">{field.isRequired ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="font-semibold">{field.isActive ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {field.defaultValue && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Default Value</h4>
                    <p className="text-gray-700">{field.defaultValue}</p>
                  </div>
                )}

                {field.options && field.options.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Options</h4>
                    <div className="flex flex-wrap gap-2">
                      {field.options.map((option, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                          {option}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {field.validationRules && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Validation Rules</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {field.validationRules.minLength !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600">Min Length</p>
                          <p className="font-semibold">{field.validationRules.minLength}</p>
                        </div>
                      )}
                      {field.validationRules.maxLength !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600">Max Length</p>
                          <p className="font-semibold">{field.validationRules.maxLength}</p>
                        </div>
                      )}
                      {field.validationRules.min !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600">Min Value</p>
                          <p className="font-semibold">{field.validationRules.min}</p>
                        </div>
                      )}
                      {field.validationRules.max !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600">Max Value</p>
                          <p className="font-semibold">{field.validationRules.max}</p>
                        </div>
                      )}
                      {field.validationRules.pattern && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Pattern</p>
                          <p className="font-semibold text-xs">{field.validationRules.pattern}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-md font-medium mb-2">Field Values ({fieldValues.filter(v => v.customFieldId === field.id).length})</h4>
                  <div className="max-h-40 overflow-y-auto">
                    {fieldValues.filter(v => v.customFieldId === field.id).slice(0, 10).map((value) => (
                      <div key={value.id} className="flex justify-between items-center bg-gray-50 p-2 rounded mb-1">
                        <span className="text-sm">Entity {value.entityId}: {value.value}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(value.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {fieldValues.filter(v => v.customFieldId === field.id).length > 10 && (
                      <p className="text-sm text-gray-500 mt-2">
                        ... and {fieldValues.filter(v => v.customFieldId === field.id).length - 10} more values
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4">
              <p>Created: {new Date(field.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(field.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredFields.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {filterEntityType === 'All' && filterFieldType === 'All'
              ? 'No custom fields found. Create your first custom field to get started.'
              : 'No custom fields match the selected filters.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomFieldServicePage;
