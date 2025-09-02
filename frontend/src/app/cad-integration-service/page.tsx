import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { apiService } from '../../lib/api';

interface CADModel {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  format: string;
  version: string;
  status: 'Uploaded' | 'Processing' | 'Converted' | 'Error';
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  metadata: {
    layers: number;
    objects: number;
    materials: number;
  };
}

interface CADConversion {
  id: string;
  sourceModelId: string;
  targetFormat: string;
  status: 'Pending' | 'Converting' | 'Completed' | 'Failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  outputFileUrl?: string;
  errorMessage?: string;
}

const CADIntegrationServicePage = () => {
  const [models, setModels] = useState<CADModel[]>([]);
  const [conversions, setConversions] = useState<CADConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'models' | 'conversions'>('models');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadModels();
    loadConversions();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<CADModel>('cad/models');
      setModels(data);
    } catch (err) {
      setError('Failed to load CAD models. Please try again.');
      console.error('Error loading models:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversions = async () => {
    try {
      const data = await apiService.generic.getAll<CADConversion>('cad/conversions');
      setConversions(data);
    } catch (err) {
      console.error('Error loading conversions:', err);
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
      setError('Please select a CAD file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const newModel = await apiService.generic.create<CADModel>('cad/models', {
        name: selectedFile.name.replace(/\.[^/.]+$/, ""),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        format: selectedFile.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'
      });

      setModels(prev => [newModel, ...prev]);
      setSelectedFile(null);
      setShowUploadForm(false);

      // Refresh data
      await loadModels();
    } catch (err) {
      setError('Failed to upload CAD file. Please try again.');
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  const startConversion = async (modelId: string, targetFormat: string) => {
    try {
      setError(null);
      const conversion = await apiService.generic.create<CADConversion>('cad/conversions', {
        sourceModelId: modelId,
        targetFormat
      });

      setConversions(prev => [conversion, ...prev]);
    } catch (err) {
      setError('Failed to start conversion. Please try again.');
      console.error('Error starting conversion:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Converted':
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Processing':
      case 'Converting': return 'bg-blue-100 text-blue-800';
      case 'Uploaded':
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Error':
      case 'Failed': return 'bg-red-100 text-red-800';
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

  const supportedFormats = ['DWG', 'DXF', 'STEP', 'IGES', 'STL', 'OBJ', 'FBX', 'COLLADA'];

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
      <h1 className="text-3xl font-bold mb-6">CAD Integration Service</h1>

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
              onClick={() => setActiveTab('models')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'models'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              CAD Models
            </button>
            <button
              onClick={() => setActiveTab('conversions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'conversions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Conversions
            </button>
          </nav>
        </div>
      </div>

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">CAD Models</h2>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={uploading}
            >
              {showUploadForm ? 'Cancel' : 'Upload CAD File'}
            </button>
          </div>

          {showUploadForm && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Upload CAD File</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select CAD File</label>
                  <input
                    type="file"
                    accept=".dwg,.dxf,.step,.iges,.stl,.obj,.fbx,.dae"
                    onChange={handleFileSelect}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    disabled={uploading}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Supported formats: DWG, DXF, STEP, IGES, STL, OBJ, FBX, COLLADA
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <div key={model.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold truncate">{model.name}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(model.status)}`}>
                    {model.status}
                  </span>
                </div>

                {model.thumbnailUrl && (
                  <div className="mb-4">
                    <Image
                      src={model.thumbnailUrl}
                      alt={`${model.name} thumbnail`}
                      width={300}
                      height={128}
                      className="w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>File:</strong> {model.fileName}</p>
                  <p><strong>Format:</strong> {model.format}</p>
                  <p><strong>Size:</strong> {formatFileSize(model.fileSize)}</p>
                  <p><strong>Version:</strong> {model.version}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
                  <div>
                    <p className="font-semibold">{model.metadata.layers}</p>
                    <p className="text-gray-500">Layers</p>
                  </div>
                  <div>
                    <p className="font-semibold">{model.metadata.objects}</p>
                    <p className="text-gray-500">Objects</p>
                  </div>
                  <div>
                    <p className="font-semibold">{model.metadata.materials}</p>
                    <p className="text-gray-500">Materials</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {supportedFormats.filter(format => format !== model.format).map(format => (
                    <button
                      key={format}
                      onClick={() => startConversion(model.id, format)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded"
                      disabled={model.status !== 'Converted'}
                    >
                      Convert to {format}
                    </button>
                  ))}
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  <p>Created: {new Date(model.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(model.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>

          {models.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No CAD models found. Upload your first CAD file to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Conversions Tab */}
      {activeTab === 'conversions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Conversion Jobs</h2>
            <button
              onClick={loadConversions}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {conversions.map((conversion) => (
              <div key={conversion.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Conversion to {conversion.targetFormat}
                    </h3>
                    <p className="text-sm text-gray-600">Model ID: {conversion.sourceModelId}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(conversion.status)}`}>
                    {conversion.status}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress: {conversion.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        conversion.status === 'Failed' ? 'bg-red-500' :
                        conversion.status === 'Completed' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${conversion.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p>Started: {new Date(conversion.createdAt).toLocaleString()}</p>
                    {conversion.completedAt && (
                      <p>Completed: {new Date(conversion.completedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    {conversion.outputFileUrl && (
                      <a
                        href={conversion.outputFileUrl}
                        className="text-blue-600 hover:text-blue-800 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download Output File
                      </a>
                    )}
                    {conversion.errorMessage && (
                      <p className="text-red-600">
                        <strong>Error:</strong> {conversion.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {conversions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No conversion jobs found. Convert a CAD model to see jobs here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CADIntegrationServicePage;
