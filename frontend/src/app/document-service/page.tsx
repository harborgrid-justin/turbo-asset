'use client';

import React, { useState, useEffect } from 'react';

interface Document {
  id: number;
  name: string;
  type: 'PDF' | 'DOC' | 'XLS' | 'IMG' | 'TXT';
  category: 'Contract' | 'Report' | 'Manual' | 'Policy' | 'Certificate';
  size: string;
  uploadDate: string;
  lastModified: string;
  owner: string;
  status: 'Active' | 'Archived' | 'Pending Review' | 'Expired';
  tags: string[];
  description: string;
  version: string;
}

const DocumentServicePage = () => {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: 1,
      name: 'Equipment Maintenance Manual',
      type: 'PDF',
      category: 'Manual',
      size: '2.4 MB',
      uploadDate: '2025-01-10',
      lastModified: '2025-01-15',
      owner: 'John Smith',
      status: 'Active',
      tags: ['maintenance', 'equipment', 'manual'],
      description: 'Complete maintenance procedures for all facility equipment',
      version: '2.1'
    },
    {
      id: 2,
      name: 'Annual Security Report',
      type: 'PDF',
      category: 'Report',
      size: '1.8 MB',
      uploadDate: '2024-12-30',
      lastModified: '2025-01-05',
      owner: 'Sarah Johnson',
      status: 'Active',
      tags: ['security', 'annual', 'report'],
      description: 'Comprehensive security assessment and recommendations',
      version: '1.0'
    },
    {
      id: 3,
      name: 'Vendor Contract - ABC Corp',
      type: 'DOC',
      category: 'Contract',
      size: '156 KB',
      uploadDate: '2024-11-15',
      lastModified: '2024-11-15',
      owner: 'Mike Chen',
      status: 'Pending Review',
      tags: ['contract', 'vendor', 'legal'],
      description: 'Service agreement with ABC Corporation for facility services',
      version: '1.2'
    },
    {
      id: 4,
      name: 'Safety Certificate 2024',
      type: 'PDF',
      category: 'Certificate',
      size: '512 KB',
      uploadDate: '2024-01-15',
      lastModified: '2024-01-15',
      owner: 'Emma Wilson',
      status: 'Expired',
      tags: ['safety', 'certificate', 'compliance'],
      description: 'Annual safety certification - needs renewal',
      version: '1.0'
    }
  ]);

  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>(documents);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'PDF' as Document['type'],
    category: 'Report' as Document['category'],
    owner: '',
    description: '',
    tags: '',
    version: '1.0'
  });

  const documentTypes = ['PDF', 'DOC', 'XLS', 'IMG', 'TXT'];
  const categories = ['Contract', 'Report', 'Manual', 'Policy', 'Certificate'];
  const statuses = ['Active', 'Archived', 'Pending Review', 'Expired'];

  useEffect(() => {
    const filtered = documents.filter(doc => {
      return (
        (doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (typeFilter === '' || doc.type === typeFilter) &&
        (categoryFilter === '' || doc.category === categoryFilter) &&
        (statusFilter === '' || doc.status === statusFilter)
      );
    });
    setFilteredDocuments(filtered);
  }, [documents, searchTerm, typeFilter, categoryFilter, statusFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewDocument(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDocument.name && newDocument.owner) {
      const document: Document = {
        id: editingDocument ? editingDocument.id : Date.now(),
        ...newDocument,
        tags: newDocument.tags.split(',').map(t => t.trim()).filter(t => t),
        size: `${Math.floor(Math.random() * 5000) + 100} KB`,
        uploadDate: editingDocument ? editingDocument.uploadDate : new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0],
        status: 'Active' as Document['status']
      };
      
      if (editingDocument) {
        setDocuments(prev => prev.map(d => d.id === editingDocument.id ? document : d));
      } else {
        setDocuments(prev => [...prev, document]);
      }
      
      resetForm();
    }
  };

  const resetForm = () => {
    setNewDocument({
      name: '',
      type: 'PDF',
      category: 'Report',
      owner: '',
      description: '',
      tags: '',
      version: '1.0'
    });
    setEditingDocument(null);
    setShowForm(false);
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setNewDocument({
      name: document.name,
      type: document.type,
      category: document.category,
      owner: document.owner,
      description: document.description,
      tags: document.tags.join(', '),
      version: document.version
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (selectedDocument?.id === id) {
      setSelectedDocument(null);
    }
  };

  const updateStatus = (id: number, newStatus: Document['status']) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id 
        ? { 
            ...doc, 
            status: newStatus, 
            lastModified: new Date().toISOString().split('T')[0]
          }
        : doc
    ));
  };

  const duplicateDocument = (document: Document) => {
    const newDoc: Document = {
      ...document,
      id: Date.now(),
      name: `${document.name} (Copy)`,
      uploadDate: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      version: '1.0',
      status: 'Active'
    };
    setDocuments(prev => [...prev, newDoc]);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PDF': return '📄';
      case 'DOC': return '📝';
      case 'XLS': return '📊';
      case 'IMG': return '🖼️';
      case 'TXT': return '📋';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      case 'Pending Review': return 'bg-yellow-100 text-yellow-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Contract': return 'bg-blue-100 text-blue-800';
      case 'Report': return 'bg-purple-100 text-purple-800';
      case 'Manual': return 'bg-green-100 text-green-800';
      case 'Policy': return 'bg-orange-100 text-orange-800';
      case 'Certificate': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Document Service</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Documents</h3>
          <p className="text-2xl font-bold text-blue-600">{documents.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Active</h3>
          <p className="text-2xl font-bold text-green-600">
            {documents.filter(d => d.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Pending Review</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {documents.filter(d => d.status === 'Pending Review').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Size</h3>
          <p className="text-2xl font-bold text-purple-600">
            {documents.length * 1.2}MB
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search documents..."
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
            {documentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
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
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditingDocument(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {showForm ? 'Cancel' : 'Upload Document'}
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingDocument ? 'Edit Document' : 'Upload New Document'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                <input
                  type="text"
                  name="name"
                  value={newDocument.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                <input
                  type="text"
                  name="owner"
                  value={newDocument.owner}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={newDocument.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {documentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={newDocument.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                <input
                  type="text"
                  name="version"
                  value={newDocument.version}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  name="tags"
                  value={newDocument.tags}
                  onChange={handleInputChange}
                  placeholder="tag1, tag2, tag3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={newDocument.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {!editingDocument && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">File Upload</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="text-gray-500">
                      <p>Click to upload or drag and drop</p>
                      <p className="text-sm">PDF, DOC, XLS, IMG files up to 10MB</p>
                    </div>
                    <button 
                      type="button" 
                      className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded"
                    >
                      Choose File
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {editingDocument ? 'Update Document' : 'Upload Document'}
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

      {/* Documents List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Document Library ({filteredDocuments.length})</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
          {filteredDocuments.map((document) => (
            <div key={document.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getTypeIcon(document.type)}</span>
                  <div>
                    <h3 className="font-semibold text-lg truncate">{document.name}</h3>
                    <p className="text-sm text-gray-500">v{document.version} • {document.size}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.status)}`}>
                  {document.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Owner:</span>
                  <span className="text-sm font-medium">{document.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Category:</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(document.category)}`}>
                    {document.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Modified:</span>
                  <span className="text-sm">{document.lastModified}</span>
                </div>
                {document.tags.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {document.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                <button
                  onClick={() => setSelectedDocument(selectedDocument?.id === document.id ? null : document)}
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                >
                  {selectedDocument?.id === document.id ? 'Hide Details' : 'View Details'}
                </button>
                <button
                  onClick={() => alert('Download functionality would be implemented')}
                  className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                >
                  Download
                </button>
                <button
                  onClick={() => handleEdit(document)}
                  className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                >
                  Edit
                </button>
                <select
                  value={document.status}
                  onChange={(e) => updateStatus(document.id, e.target.value as Document['status'])}
                  className="text-xs border border-gray-300 rounded px-1 py-1"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => duplicateDocument(document)}
                  className="flex-1 bg-purple-500 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleDelete(document.id)}
                  className="flex-1 bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>

              {selectedDocument?.id === document.id && (
                <div className="mt-4 pt-4 border-t text-sm space-y-1">
                  <div><strong>Description:</strong> {document.description || 'No description available'}</div>
                  <div><strong>Upload Date:</strong> {document.uploadDate}</div>
                  <div><strong>Document ID:</strong> {document.id}</div>
                  <div><strong>File Type:</strong> {document.type}</div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filteredDocuments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No documents found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentServicePage;
