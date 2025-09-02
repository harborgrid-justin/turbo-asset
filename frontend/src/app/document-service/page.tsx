import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  category: 'Contract' | 'Manual' | 'Report' | 'Certificate' | 'Invoice' | 'Policy' | 'Other';
  tags: string[];
  status: 'Draft' | 'Published' | 'Archived' | 'Deleted';
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  lastModified: string;
  assetId?: string;
  assetName?: string;
  permissions: {
    read: string[];
    write: string[];
    delete: string[];
  };
  metadata: {
    author?: string;
    language?: string;
    pages?: number;
    keywords?: string[];
    expirationDate?: string;
  };
  downloadCount: number;
  lastDownloadedAt?: string;
}

interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  changes?: string;
}

const DocumentServicePage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);

  // Form state
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: 'Other' as Document['category'],
    tags: '',
    assetId: '',
    assetName: '',
    metadata: {
      author: '',
      language: 'en',
      pages: 1,
      keywords: '',
      expirationDate: ''
    }
  });

  // Load data on component mount
  useEffect(() => {
    loadDocuments();
    loadDocumentVersions();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<Document>('documents');
      setDocuments(data);
    } catch (err) {
      setError('Failed to load documents. Please try again.');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentVersions = async () => {
    try {
      const data = await apiService.generic.getAll<DocumentVersion>('document-versions');
      setDocumentVersions(data);
    } catch (err) {
      console.error('Error loading document versions:', err);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocument.title) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const documentData = {
        ...newDocument,
        tags: newDocument.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        metadata: {
          ...newDocument.metadata,
          keywords: newDocument.metadata.keywords.split(',').map(keyword => keyword.trim()).filter(keyword => keyword),
          pages: newDocument.metadata.pages || undefined,
          expirationDate: newDocument.metadata.expirationDate ? new Date(newDocument.metadata.expirationDate).toISOString() : undefined
        },
        fileName: 'placeholder.pdf', // In real app, this would come from file upload
        fileType: 'PDF',
        fileSize: 1024 * 1024, // 1MB placeholder
        mimeType: 'application/pdf',
        status: 'Draft' as Document['status'],
        version: 1,
        uploadedBy: 'Current User', // In real app, this would come from auth context
        uploadedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        permissions: {
          read: ['everyone'],
          write: ['admin'],
          delete: ['admin']
        },
        downloadCount: 0
      };

      const createdDocument = await apiService.generic.create<Document>('documents', documentData);

      setDocuments(prev => [createdDocument, ...prev]);
      setNewDocument({
        title: '',
        description: '',
        category: 'Other',
        tags: '',
        assetId: '',
        assetName: '',
        metadata: {
          author: '',
          language: 'en',
          pages: 1,
          keywords: '',
          expirationDate: ''
        }
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create document. Please try again.');
      console.error('Error creating document:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateDocumentStatus = async (documentId: string, status: Document['status']) => {
    try {
      setError(null);
      await apiService.generic.update<Document>('documents', parseInt(documentId), { status });
      setDocuments(prev => prev.map(document =>
        document.id === documentId ? { ...document, status } : document
      ));
    } catch (err) {
      setError('Failed to update document status. Please try again.');
      console.error('Error updating document:', err);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('documents', parseInt(documentId));
      setDocuments(prev => prev.filter(document => document.id !== documentId));
      setDocumentVersions(prev => prev.filter(version => version.documentId !== documentId));
    } catch (err) {
      setError('Failed to delete document. Please try again.');
      console.error('Error deleting document:', err);
    }
  };

  const downloadDocument = async (documentId: string) => {
    try {
      setError(null);
      // In real app, this would download the actual file
      // For now, we'll just update the download count
      const document = documents.find(d => d.id === documentId);
      if (!document) {
        setError('Document not found.');
        return;
      }

      await apiService.generic.update<Document>('documents', parseInt(documentId), {
        downloadCount: document.downloadCount + 1,
        lastDownloadedAt: new Date().toISOString()
      });

      // Refresh documents to get updated data
      await loadDocuments();

      // Simulate download
      alert('Document download would start here in a real application.');
    } catch (err) {
      setError('Failed to download document. Please try again.');
      console.error('Error downloading document:', err);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Contract': return 'bg-blue-100 text-blue-800';
      case 'Manual': return 'bg-green-100 text-green-800';
      case 'Report': return 'bg-purple-100 text-purple-800';
      case 'Certificate': return 'bg-orange-100 text-orange-800';
      case 'Invoice': return 'bg-indigo-100 text-indigo-800';
      case 'Policy': return 'bg-pink-100 text-pink-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      case 'Deleted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(document => {
    const categoryMatch = filterCategory === 'All' || document.category === filterCategory;
    const statusMatch = filterStatus === 'All' || document.status === filterStatus;
    const searchMatch = searchTerm === '' ||
      document.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return categoryMatch && statusMatch && searchMatch;
  });

  const getDocumentStats = () => {
    const total = documents.length;
    const published = documents.filter(d => d.status === 'Published').length;
    const totalSize = documents.reduce((sum, d) => sum + d.fileSize, 0);
    const totalDownloads = documents.reduce((sum, d) => sum + d.downloadCount, 0);
    const byCategory = documents.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, published, totalSize, totalDownloads, byCategory };
  };

  const stats = getDocumentStats();

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
      <h1 className="text-3xl font-bold mb-6">Document Service</h1>

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

      {/* Document Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Documents</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Published</h3>
          <p className="text-2xl font-bold text-green-600">{stats.published}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Size</h3>
          <p className="text-2xl font-bold text-purple-600">{formatFileSize(stats.totalSize)}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Downloads</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.totalDownloads}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Documents</h2>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search documents..."
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
              <option value="Contract">Contract</option>
              <option value="Manual">Manual</option>
              <option value="Report">Report</option>
              <option value="Certificate">Certificate</option>
              <option value="Invoice">Invoice</option>
              <option value="Policy">Policy</option>
              <option value="Other">Other</option>
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
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
              <option value="Deleted">Deleted</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={creating}
            >
              {showCreateForm ? 'Cancel' : 'Create Document'}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Document</h3>
          <form onSubmit={handleCreateDocument} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Document Title *</label>
                <input
                  type="text"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={newDocument.category}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, category: e.target.value as Document['category'] }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Contract">Contract</option>
                  <option value="Manual">Manual</option>
                  <option value="Report">Report</option>
                  <option value="Certificate">Certificate</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Policy">Policy</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset ID</label>
                <input
                  type="text"
                  value={newDocument.assetId}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, assetId: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset Name</label>
                <input
                  type="text"
                  value={newDocument.assetName}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, assetName: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Author</label>
                <input
                  type="text"
                  value={newDocument.metadata.author}
                  onChange={(e) => setNewDocument(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, author: e.target.value }
                  }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <select
                  value={newDocument.metadata.language}
                  onChange={(e) => setNewDocument(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, language: e.target.value }
                  }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pages</label>
                <input
                  type="number"
                  value={newDocument.metadata.pages}
                  onChange={(e) => setNewDocument(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, pages: parseInt(e.target.value) || 1 }
                  }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                <input
                  type="date"
                  value={newDocument.metadata.expirationDate}
                  onChange={(e) => setNewDocument(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, expirationDate: e.target.value }
                  }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input
                type="text"
                value={newDocument.tags}
                onChange={(e) => setNewDocument(prev => ({ ...prev, tags: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="important, confidential, review"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Keywords (comma-separated)</label>
              <input
                type="text"
                value={newDocument.metadata.keywords}
                onChange={(e) => setNewDocument(prev => ({
                  ...prev,
                  metadata: { ...prev.metadata, keywords: e.target.value }
                }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="contract, agreement, terms"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newDocument.description}
                onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Document'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredDocuments.map((document) => (
          <div key={document.id} className="bg-white shadow rounded-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold">{document.title}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(document.category)}`}>
                    {document.category}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(document.status)}`}>
                    {document.status}
                  </span>
                  {document.metadata.expirationDate && new Date(document.metadata.expirationDate) < new Date() && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-semibold">
                      EXPIRED
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{document.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                  <span>{document.fileName}</span>
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>v{document.version}</span>
                  <span>{document.downloadCount} downloads</span>
                </div>
                {document.assetName && (
                  <p className="text-sm text-gray-500">Asset: {document.assetName} (ID: {document.assetId})</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    By: {document.uploadedBy}
                  </p>
                  {document.lastDownloadedAt && (
                    <p className="text-sm text-gray-600">
                      Last download: {new Date(document.lastDownloadedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => downloadDocument(document.id)}
                    className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Download
                  </button>
                  {document.status !== 'Published' && document.status !== 'Archived' && (
                    <button
                      onClick={() => updateDocumentStatus(document.id, 'Published')}
                      className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedDocument(selectedDocument?.id === document.id ? null : document)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    {selectedDocument?.id === document.id ? 'Hide' : 'Details'}
                  </button>
                  <button
                    onClick={() => deleteDocument(document.id)}
                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {selectedDocument?.id === document.id && (
              <div className="mt-6 border-t pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">File Type</p>
                    <p className="font-semibold">{document.fileType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">MIME Type</p>
                    <p className="font-semibold text-xs">{document.mimeType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Version</p>
                    <p className="font-semibold">v{document.version}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Download Count</p>
                    <p className="font-semibold">{document.downloadCount}</p>
                  </div>
                </div>

                {document.metadata && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Metadata</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {document.metadata.author && (
                        <div>
                          <p className="text-sm text-gray-600">Author</p>
                          <p className="font-semibold">{document.metadata.author}</p>
                        </div>
                      )}
                      {document.metadata.language && (
                        <div>
                          <p className="text-sm text-gray-600">Language</p>
                          <p className="font-semibold">{document.metadata.language.toUpperCase()}</p>
                        </div>
                      )}
                      {document.metadata.pages && (
                        <div>
                          <p className="text-sm text-gray-600">Pages</p>
                          <p className="font-semibold">{document.metadata.pages}</p>
                        </div>
                      )}
                      {document.metadata.expirationDate && (
                        <div>
                          <p className="text-sm text-gray-600">Expiration</p>
                          <p className="font-semibold">{new Date(document.metadata.expirationDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {document.tags.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {document.tags.map((tag, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {document.metadata.keywords && document.metadata.keywords.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {document.metadata.keywords.map((keyword, index) => (
                        <span key={index} className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-md font-medium mb-2">Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Read Access</p>
                      <p className="font-semibold">{document.permissions.read.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Write Access</p>
                      <p className="font-semibold">{document.permissions.write.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delete Access</p>
                      <p className="font-semibold">{document.permissions.delete.join(', ')}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Version History</h4>
                  <div className="space-y-2">
                    {documentVersions.filter(v => v.documentId === document.id).slice(0, 5).map((version) => (
                      <div key={version.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                        <div className="flex-1">
                          <p className="font-medium">Version {version.version}</p>
                          <p className="text-sm text-gray-600">
                            {version.fileName} • {formatFileSize(version.fileSize)} •
                            Uploaded by {version.uploadedBy} on {new Date(version.uploadedAt).toLocaleDateString()}
                          </p>
                          {version.changes && (
                            <p className="text-sm text-gray-700 mt-1">{version.changes}</p>
                          )}
                        </div>
                        <button className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded">
                          Download
                        </button>
                      </div>
                    ))}
                    {documentVersions.filter(v => v.documentId === document.id).length === 0 && (
                      <p className="text-sm text-gray-500">No version history available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4">
              <p>Created: {new Date(document.uploadedAt).toLocaleString()}</p>
              <p>Modified: {new Date(document.lastModified).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {filterCategory === 'All' && filterStatus === 'All' && searchTerm === ''
              ? 'No documents found. Create your first document to get started.'
              : 'No documents match the selected filters.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentServicePage;
