'use client';

import React, { useState, useEffect } from 'react';

interface CustomField {
  id: number;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'file';
  description: string;
  isRequired: boolean;
  isActive: boolean;
  module: 'Asset' | 'Maintenance' | 'Financial' | 'Space' | 'Lease' | 'Contract' | 'Project';
  section: string;
  sortOrder: number;
  defaultValue?: string | number | boolean;
  validationRules: ValidationRule[];
  options?: string[];
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'regex' | 'custom';
  value?: string | number;
  message: string;
}

interface FieldUsage {
  id: number;
  fieldId: number;
  entityType: string;
  entityId: number;
  value: string | number | boolean | string[];
  updatedAt: string;
  updatedBy: string;
}

interface FieldTemplate {
  id: number;
  name: string;
  description: string;
  module: string;
  fields: CustomField[];
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

interface CustomFieldMetrics {
  totalFields: number;
  activeFields: number;
  totalUsage: number;
  averageUsagePerField: number;
  fieldsCreatedThisMonth: number;
  mostUsedField: string;
  moduleDistribution: Record<string, number>;
}

const CustomFieldServicePage = () => {
  const [fields, setFields] = useState<CustomField[]>([
    {
      id: 1,
      name: 'warranty_expiration',
      label: 'Warranty Expiration Date',
      type: 'date',
      description: 'The date when the asset warranty expires',
      isRequired: false,
      isActive: true,
      module: 'Asset',
      section: 'Warranty Information',
      sortOrder: 1,
      validationRules: [
        { type: 'required', message: 'Warranty expiration date is required for new assets' }
      ],
      createdBy: 'admin@company.com',
      createdAt: '2024-12-01 10:00:00',
      usageCount: 1542
    },
    {
      id: 2,
      name: 'maintenance_priority',
      label: 'Maintenance Priority Level',
      type: 'select',
      description: 'Priority level for maintenance scheduling',
      isRequired: true,
      isActive: true,
      module: 'Maintenance',
      section: 'Scheduling',
      sortOrder: 2,
      defaultValue: 'Medium',
      options: ['Low', 'Medium', 'High', 'Critical', 'Emergency'],
      validationRules: [
        { type: 'required', message: 'Priority level must be selected' }
      ],
      createdBy: 'maintenance@company.com',
      createdAt: '2024-11-15 14:30:00',
      usageCount: 2340
    },
    {
      id: 3,
      name: 'project_budget_category',
      label: 'Budget Category',
      type: 'multiselect',
      description: 'Financial categories applicable to this project',
      isRequired: false,
      isActive: true,
      module: 'Project',
      section: 'Financial Details',
      sortOrder: 3,
      options: ['CAPEX', 'OPEX', 'Maintenance', 'Compliance', 'Strategic', 'Emergency'],
      validationRules: [
        { type: 'custom', message: 'At least one budget category must be selected' }
      ],
      createdBy: 'finance@company.com',
      createdAt: '2024-10-20 09:45:00',
      usageCount: 890
    },
    {
      id: 4,
      name: 'space_special_requirements',
      label: 'Special Requirements',
      type: 'textarea',
      description: 'Special requirements or restrictions for this space',
      isRequired: false,
      isActive: false,
      module: 'Space',
      section: 'Configuration',
      sortOrder: 4,
      validationRules: [
        { type: 'maxLength', value: 500, message: 'Requirements cannot exceed 500 characters' }
      ],
      createdBy: 'facilities@company.com',
      createdAt: '2024-09-10 16:20:00',
      usageCount: 156
    }
  ]);

  const [fieldUsage, setFieldUsage] = useState<FieldUsage[]>([
    {
      id: 1,
      fieldId: 1,
      entityType: 'Asset',
      entityId: 101,
      value: '2025-12-31',
      updatedAt: '2025-01-15 10:30:00',
      updatedBy: 'user@company.com'
    },
    {
      id: 2,
      fieldId: 2,
      entityType: 'WorkOrder',
      entityId: 501,
      value: 'High',
      updatedAt: '2025-01-15 11:15:00',
      updatedBy: 'maintenance@company.com'
    },
    {
      id: 3,
      fieldId: 3,
      entityType: 'Project',
      entityId: 301,
      value: ['CAPEX', 'Strategic'],
      updatedAt: '2025-01-15 09:45:00',
      updatedBy: 'finance@company.com'
    }
  ]);

  const [templates] = useState<FieldTemplate[]>([
    {
      id: 1,
      name: 'Asset Management Extended Fields',
      description: 'Standard additional fields for comprehensive asset tracking',
      module: 'Asset',
      fields: [fields[0]],
      isActive: true,
      usageCount: 45,
      createdAt: '2024-12-01 10:00:00'
    },
    {
      id: 2,
      name: 'Maintenance Work Order Fields',
      description: 'Additional fields for detailed work order management',
      module: 'Maintenance',
      fields: [fields[1]],
      isActive: true,
      usageCount: 78,
      createdAt: '2024-11-15 14:30:00'
    }
  ]);

  const [metrics] = useState<CustomFieldMetrics>({
    totalFields: 47,
    activeFields: 34,
    totalUsage: 28450,
    averageUsagePerField: 835,
    fieldsCreatedThisMonth: 8,
    mostUsedField: 'Maintenance Priority Level',
    moduleDistribution: {
      'Asset': 12,
      'Maintenance': 8,
      'Financial': 6,
      'Space': 4,
      'Lease': 3,
      'Contract': 2,
      'Project': 2
    }
  });

  const [filteredFields, setFilteredFields] = useState<CustomField[]>(fields);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showUsageDetails] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState<'fields' | 'usage' | 'templates'>('fields');

  const [newField, setNewField] = useState({
    name: '',
    label: '',
    type: 'text' as CustomField['type'],
    description: '',
    isRequired: false,
    module: 'Asset' as CustomField['module'],
    section: '',
    defaultValue: '',
    options: [] as string[],
    validationRules: [] as ValidationRule[]
  });

  const [newValidationRule, setNewValidationRule] = useState({
    type: 'required' as ValidationRule['type'],
    value: '',
    message: ''
  });

  useEffect(() => {
    const filtered = fields.filter(field => {
      return (
        field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.description.toLowerCase().includes(searchTerm.toLowerCase())
      ) &&
      (typeFilter === '' || field.type === typeFilter) &&
      (moduleFilter === '' || field.module === moduleFilter) &&
      (statusFilter === '' || (statusFilter === 'active' ? field.isActive : !field.isActive));
    });
    setFilteredFields(filtered);
  }, [fields, searchTerm, typeFilter, moduleFilter, statusFilter]);

  const handleFieldInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setNewField(prev => ({ ...prev, [name]: checked }));
    } else {
      setNewField(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleValidationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewValidationRule(prev => ({ ...prev, [name]: value }));
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const options = e.target.value.split('\n').filter(option => option.trim() !== '');
    setNewField(prev => ({ ...prev, options }));
  };

  const addValidationRule = () => {
    if (newValidationRule.message) {
      setNewField(prev => ({
        ...prev,
        validationRules: [...prev.validationRules, newValidationRule]
      }));
      setNewValidationRule({ type: 'required', value: '', message: '' });
    }
  };

  const removeValidationRule = (index: number) => {
    setNewField(prev => ({
      ...prev,
      validationRules: prev.validationRules.filter((_, i) => i !== index)
    }));
  };

  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (newField.name && newField.label) {
      const field: CustomField = {
        id: Date.now(),
        ...newField,
        isActive: true,
        sortOrder: fields.length + 1,
        createdBy: 'current@user.com',
        createdAt: new Date().toLocaleString(),
        usageCount: 0
      };
      setFields(prev => [...prev, field]);
      setNewField({
        name: '',
        label: '',
        type: 'text',
        description: '',
        isRequired: false,
        module: 'Asset',
        section: '',
        defaultValue: '',
        options: [],
        validationRules: []
      });
      setShowCreateForm(false);
    }
  };

  const toggleFieldStatus = (id: number) => {
    setFields(prev => prev.map(field => 
      field.id === id ? { ...field, isActive: !field.isActive } : field
    ));
  };

  const duplicateField = (id: number) => {
    const originalField = fields.find(f => f.id === id);
    if (originalField) {
      const duplicatedField: CustomField = {
        ...originalField,
        id: Date.now(),
        name: `${originalField.name}_copy`,
        label: `${originalField.label} (Copy)`,
        createdAt: new Date().toLocaleString(),
        usageCount: 0
      };
      setFields(prev => [...prev, duplicatedField]);
    }
  };

  const deleteField = (id: number) => {
    if (confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
      setFields(prev => prev.filter(field => field.id !== id));
      setFieldUsage(prev => prev.filter(usage => usage.fieldId !== id));
      if (selectedField?.id === id) {
        setSelectedField(null);
      }
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 text-blue-800';
      case 'number': return 'bg-green-100 text-green-800';
      case 'date': return 'bg-purple-100 text-purple-800';
      case 'boolean': return 'bg-yellow-100 text-yellow-800';
      case 'select': return 'bg-orange-100 text-orange-800';
      case 'multiselect': return 'bg-pink-100 text-pink-800';
      case 'textarea': return 'bg-indigo-100 text-indigo-800';
      case 'file': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModuleColor = (module: string) => {
    switch (module) {
      case 'Asset': return 'bg-blue-100 text-blue-800';
      case 'Maintenance': return 'bg-orange-100 text-orange-800';
      case 'Financial': return 'bg-green-100 text-green-800';
      case 'Space': return 'bg-purple-100 text-purple-800';
      case 'Lease': return 'bg-yellow-100 text-yellow-800';
      case 'Contract': return 'bg-red-100 text-red-800';
      case 'Project': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Custom Field Service</h1>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Fields</p>
              <p className="text-2xl font-bold">{metrics.totalFields}</p>
            </div>
            <div className="text-2xl">📝</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{metrics.activeFields}</p>
            </div>
            <div className="text-2xl">✅</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold">{metrics.totalUsage.toLocaleString()}</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Usage</p>
              <p className="text-2xl font-bold">{metrics.averageUsagePerField}</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.fieldsCreatedThisMonth}</p>
            </div>
            <div className="text-2xl">🆕</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Most Used</p>
              <p className="text-xs font-bold text-purple-600">{metrics.mostUsedField}</p>
            </div>
            <div className="text-2xl">🏆</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Modules</p>
              <p className="text-2xl font-bold">{Object.keys(metrics.moduleDistribution).length}</p>
            </div>
            <div className="text-2xl">📦</div>
          </div>
        </div>
      </div>

      {/* Module Distribution Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Fields by Module</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(metrics.moduleDistribution).map(([module, count]) => (
            <div key={module} className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                module === 'Asset' ? 'bg-blue-500' :
                module === 'Maintenance' ? 'bg-orange-500' :
                module === 'Financial' ? 'bg-green-500' :
                module === 'Space' ? 'bg-purple-500' :
                module === 'Lease' ? 'bg-yellow-500' :
                module === 'Contract' ? 'bg-red-500' :
                'bg-indigo-500'
              }`}>
                {count}
              </div>
              <div className="text-sm font-medium mt-2">{module}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 bg-white rounded-lg shadow">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('fields')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'fields'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Custom Fields ({fields.length})
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'usage'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Usage Statistics ({fieldUsage.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates ({templates.length})
          </button>
        </div>

        {/* Fields Tab */}
        {activeTab === 'fields' && (
          <div className="p-6">
            {/* Filters and Controls */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
              <input
                type="text"
                placeholder="Search fields..."
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
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
                <option value="select">Select</option>
                <option value="multiselect">Multi-select</option>
                <option value="textarea">Textarea</option>
                <option value="file">File</option>
              </select>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Modules</option>
                <option value="Asset">Asset</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Financial">Financial</option>
                <option value="Space">Space</option>
                <option value="Lease">Lease</option>
                <option value="Contract">Contract</option>
                <option value="Project">Project</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Field
              </button>
              <div></div>
            </div>

            {/* Create Field Form */}
            {showCreateForm && (
              <div className="bg-gray-100 p-6 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Create Custom Field</h2>
                <form onSubmit={handleCreateField}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Field Name (Internal)</label>
                      <input
                        type="text"
                        name="name"
                        value={newField.name}
                        onChange={handleFieldInputChange}
                        placeholder="field_name_lowercase"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Display Label</label>
                      <input
                        type="text"
                        name="label"
                        value={newField.label}
                        onChange={handleFieldInputChange}
                        placeholder="Field Display Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                      <select
                        name="type"
                        value={newField.type}
                        onChange={handleFieldInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="boolean">Boolean (Yes/No)</option>
                        <option value="select">Select (Dropdown)</option>
                        <option value="multiselect">Multi-select</option>
                        <option value="textarea">Textarea</option>
                        <option value="file">File Upload</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                      <select
                        name="module"
                        value={newField.module}
                        onChange={handleFieldInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Asset">Asset</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Financial">Financial</option>
                        <option value="Space">Space</option>
                        <option value="Lease">Lease</option>
                        <option value="Contract">Contract</option>
                        <option value="Project">Project</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                      <input
                        type="text"
                        name="section"
                        value={newField.section}
                        onChange={handleFieldInputChange}
                        placeholder="Form Section Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Value (Optional)</label>
                      <input
                        type="text"
                        name="defaultValue"
                        value={newField.defaultValue}
                        onChange={handleFieldInputChange}
                        placeholder="Default value"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        name="description"
                        value={newField.description}
                        onChange={handleFieldInputChange}
                        rows={2}
                        placeholder="Field description and usage instructions"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {(newField.type === 'select' || newField.type === 'multiselect') && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Options (one per line)</label>
                        <textarea
                          value={newField.options.join('\n')}
                          onChange={handleOptionsChange}
                          rows={4}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isRequired"
                        checked={newField.isRequired}
                        onChange={handleFieldInputChange}
                        className="mr-2"
                      />
                      <label className="text-sm font-medium text-gray-700">Required Field</label>
                    </div>
                  </div>

                  {/* Validation Rules Section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Validation Rules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <select
                        name="type"
                        value={newValidationRule.type}
                        onChange={handleValidationInputChange}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="required">Required</option>
                        <option value="minLength">Min Length</option>
                        <option value="maxLength">Max Length</option>
                        <option value="min">Min Value</option>
                        <option value="max">Max Value</option>
                        <option value="regex">Regex Pattern</option>
                        <option value="custom">Custom Rule</option>
                      </select>
                      <input
                        type="text"
                        name="value"
                        value={newValidationRule.value}
                        onChange={handleValidationInputChange}
                        placeholder="Rule value (if applicable)"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        name="message"
                        value={newValidationRule.message}
                        onChange={handleValidationInputChange}
                        placeholder="Error message"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={addValidationRule}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Add Rule
                      </button>
                    </div>
                    {newField.validationRules.length > 0 && (
                      <div className="space-y-2">
                        {newField.validationRules.map((rule, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                            <span className="text-sm">
                              <strong>{rule.type}</strong>
                              {rule.value && <span>: {rule.value}</span>}
                              <span className="text-gray-600"> - {rule.message}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeValidationRule(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Create Field
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Fields Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type & Module</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Configuration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFields.map((field) => (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{field.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{field.name}</div>
                        <div className="text-xs text-gray-400">{field.section}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(field.type)}`}>
                          {field.type}
                        </span>
                        <div className="mt-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getModuleColor(field.module)}`}>
                            {field.module}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          {field.isRequired && (
                            <div className="text-xs text-red-600">Required</div>
                          )}
                          {field.defaultValue && (
                            <div className="text-xs text-gray-500">Default: {field.defaultValue}</div>
                          )}
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            field.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {field.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{field.usageCount.toLocaleString()} times</div>
                        <div className="text-xs text-gray-500">
                          {field.validationRules.length} rules
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{field.createdAt.split(' ')[0]}</div>
                        <div className="text-xs text-gray-500">{field.createdBy}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                        <button
                          onClick={() => setSelectedField(selectedField?.id === field.id ? null : field)}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          {selectedField?.id === field.id ? 'Hide' : 'View'}
                        </button>
                        <button
                          onClick={() => toggleFieldStatus(field.id)}
                          className={`text-white text-xs px-2 py-1 rounded ${
                            field.isActive 
                              ? 'bg-yellow-500 hover:bg-yellow-700' 
                              : 'bg-green-500 hover:bg-green-700'
                          }`}
                        >
                          {field.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => duplicateField(field.id)}
                          className="bg-purple-500 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => deleteField(field.id)}
                          className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedField && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Field Details: {selectedField.label}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div><strong>Internal Name:</strong> {selectedField.name}</div>
                  <div><strong>Type:</strong> {selectedField.type}</div>
                  <div><strong>Module:</strong> {selectedField.module}</div>
                  <div><strong>Section:</strong> {selectedField.section || 'Default'}</div>
                  <div><strong>Required:</strong> {selectedField.isRequired ? 'Yes' : 'No'}</div>
                  <div><strong>Status:</strong> {selectedField.isActive ? 'Active' : 'Inactive'}</div>
                  <div><strong>Usage Count:</strong> {selectedField.usageCount.toLocaleString()}</div>
                  <div><strong>Sort Order:</strong> {selectedField.sortOrder}</div>
                </div>
                <div className="mb-3">
                  <strong>Description:</strong> {selectedField.description || 'No description provided'}
                </div>
                {selectedField.options && selectedField.options.length > 0 && (
                  <div className="mb-3">
                    <strong>Options:</strong> {selectedField.options.join(', ')}
                  </div>
                )}
                {selectedField.defaultValue && (
                  <div className="mb-3">
                    <strong>Default Value:</strong> {selectedField.defaultValue}
                  </div>
                )}
                {selectedField.validationRules.length > 0 && (
                  <div>
                    <strong>Validation Rules:</strong>
                    <div className="ml-4 mt-1 space-y-1">
                      {selectedField.validationRules.map((rule, index) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border">
                          <strong>{rule.type}</strong>
                          {rule.value && <span>: {rule.value}</span>}
                          <span className="text-gray-600"> - {rule.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fieldUsage.map((usage) => {
                    const field = fields.find(f => f.id === usage.fieldId);
                    return (
                      <tr key={usage.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {field?.label || 'Unknown Field'}
                          <div className="text-xs text-gray-500 font-mono">{field?.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{usage.entityType}</div>
                          <div className="text-xs text-gray-500">ID: {usage.entityId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-xs truncate">
                            {Array.isArray(usage.value) ? usage.value.join(', ') : usage.value}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {usage.updatedAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {usage.updatedBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="p-6">
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getModuleColor(template.module)}`}>
                        {template.module}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {template.description}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div><strong>Fields:</strong> {template.fields.length}</div>
                    <div><strong>Usage:</strong> {template.usageCount} times</div>
                    <div><strong>Created:</strong> {template.createdAt.split(' ')[0]}</div>
                  </div>
                  <div className="mt-3">
                    <strong>Included Fields:</strong>
                    <div className="ml-4 mt-1 space-y-1">
                      {template.fields.map((field, index) => (
                        <div key={index} className="text-xs bg-gray-100 p-2 rounded">
                          <strong>{field.label}</strong> ({field.type}) - {field.description}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomFieldServicePage;
