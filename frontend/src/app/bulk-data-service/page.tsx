import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface DataJob {
  id: string;
  name: string;
  type: 'Import' | 'Export' | 'Process';
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface DataFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  status: 'Uploaded' | 'Processing' | 'Processed' | 'Error';
}

const BulkDataServicePage = () => {
  const [jobs, setJobs] = useState<DataJob[]>([]);
  const [files, setFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'files'>('jobs');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadJobs();
    loadFiles();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<DataJob>('bulk-data/jobs');
      setJobs(data);
    } catch (err) {
      setError('Failed to load data jobs. Please try again.');
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      const data = await apiService.generic.getAll<DataFile>('bulk-data/files');
      setFiles(data);
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      // Create upload job
      const uploadJob = await apiService.generic.create<DataJob>('bulk-data/upload', {
        name: selectedFile.name,
        type: 'Import',
        fileSize: selectedFile.size
      });

      setJobs(prev => [uploadJob, ...prev]);
      setSelectedFile(null);
      setShowUploadForm(false);

      // Refresh data
      await loadJobs();
      await loadFiles();
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  const startExport = async (dataType: string) => {
    try {
      setError(null);
      const exportJob = await apiService.generic.create<DataJob>('bulk-data/export', {
        name: `${dataType} Export`,
        type: 'Export',
        dataType
      });

      setJobs(prev => [exportJob, ...prev]);
    } catch (err) {
      setError('Failed to start export. Please try again.');
      console.error('Error starting export:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Running': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Uploaded': return 'bg-green-100 text-green-800';
      case 'Processing': return 'bg-blue-100 text-blue-800';
      case 'Processed': return 'bg-purple-100 text-purple-800';
      case 'Error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
      <h1 className="text-3xl font-bold mb-6">Bulk Data Service</h1>

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

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'jobs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Data Jobs
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Files
            </button>
          </nav>
        </div>
      </div>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Data Processing Jobs</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => startExport('Assets')}
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                Export Assets
              </button>
              <button
                onClick={() => startExport('Reports')}
                className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
              >
                Export Reports
              </button>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={uploading}
              >
                {showUploadForm ? 'Cancel' : 'Upload Data'}
              </button>
            </div>
          </div>

          {showUploadForm && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Upload Data File</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select File</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.json"
                    onChange={handleFileSelect}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    disabled={uploading}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Supported formats: CSV, Excel (.xlsx), JSON
                  </p>
                </div>
                {selectedFile && (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm">
                      <strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  </div>
                )}
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{job.name}</h3>
                    <p className="text-sm text-gray-600">Type: {job.type}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress: {job.processedRecords} / {job.totalRecords} records</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        job.status === 'Failed' ? 'bg-red-500' :
                        job.status === 'Completed' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${job.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p>Created: {new Date(job.createdAt).toLocaleString()}</p>
                    {job.completedAt && (
                      <p>Completed: {new Date(job.completedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    {job.errorMessage && (
                      <p className="text-red-600">
                        <strong>Error:</strong> {job.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {jobs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No data jobs found. Upload a file or start an export to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Uploaded Files</h2>
            <button
              onClick={loadFiles}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{file.name}</h3>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(file.size)} • {file.type} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(file.status)}`}>
                      {file.status}
                    </span>
                    <button className="bg-blue-500 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded">
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {files.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No files uploaded yet. Upload your first data file to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkDataServicePage;
