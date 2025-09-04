'use client';

import React, { useRef, useState } from 'react';
import VideoPlayer from '../../components/multimedia/VideoPlayer';
import AudioAnalyzer from '../../components/multimedia/AudioAnalyzer';
import ImageViewer from '../../components/multimedia/ImageViewer';
import DocumentProcessor from '../../components/multimedia/DocumentProcessor';

type MediaType = 'video' | 'audio' | 'image' | 'document';

interface EvidenceFile {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  size: number;
  uploadDate: Date;
  metadata?: Record<string, unknown>;
}

export default function MultimediaEvidenceViewerPage() {
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);
  const [files, setFiles] = useState<EvidenceFile[]>([
    {
      id: '1',
      name: 'incident_recording.mp4',
      type: 'video',
      url: '/sample-video.mp4',
      size: 15728640,
      uploadDate: new Date('2025-01-15')
    },
    {
      id: '2', 
      name: 'audio_statement.wav',
      type: 'audio',
      url: '/sample-audio.wav', 
      size: 5242880,
      uploadDate: new Date('2025-01-14')
    },
    {
      id: '3',
      name: 'evidence_photo.jpg',
      type: 'image', 
      url: '/sample-image.jpg',
      size: 2097152,
      uploadDate: new Date('2025-01-13')
    },
    {
      id: '4',
      name: 'witness_statement.pdf',
      type: 'document',
      url: '/sample-document.pdf',
      size: 524288,
      uploadDate: new Date('2025-01-12')
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const getFileType = (file: File): MediaType => {
      if (file.type.startsWith('video/')) return 'video';
      if (file.type.startsWith('audio/')) return 'audio';
      if (file.type.startsWith('image/')) return 'image';
      if (file.type === 'application/pdf') return 'document';
      return 'document'; // default
    };

    const newFile: EvidenceFile = {
      id: Date.now().toString(),
      name: file.name,
      type: getFileType(file),
      url: URL.createObjectURL(file),
      size: file.size,
      uploadDate: new Date(),
      metadata: {
        originalFile: file
      }
    };

    setFiles(prev => [...prev, newFile]);
    setSelectedFile(newFile);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type: MediaType): string => {
    switch (type) {
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'image': return '🖼️';
      case 'document': return '📄';
      default: return '📁';
    }
  };

  const renderViewer = () => {
    if (!selectedFile) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Select a file to view
            </h3>
            <p className="text-gray-500">
              Choose from the file list or upload a new evidence file
            </p>
          </div>
        </div>
      );
    }

    switch (selectedFile.type) {
      case 'video':
        return <VideoPlayer file={selectedFile} />;
      case 'audio':
        return <AudioAnalyzer file={selectedFile} />;
      case 'image':
        return <ImageViewer file={selectedFile} />;
      case 'document':
        return <DocumentProcessor file={selectedFile} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Unsupported file type</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📹 Multimedia Evidence Viewer
              </h1>
              <p className="text-gray-600">
                Advanced multimedia analysis and evidence processing platform
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>📤</span>
                <span>Upload Evidence</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept="video/*,audio/*,image/*,.pdf"
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* File List Sidebar */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Evidence Files ({files.length})
                </h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedFile?.id === file.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{getFileTypeIcon(file.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {file.uploadDate.toLocaleDateString()}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          file.type === 'video' ? 'bg-purple-100 text-purple-800' :
                          file.type === 'audio' ? 'bg-green-100 text-green-800' :
                          file.type === 'image' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {file.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* File Stats */}
            <div className="mt-4 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Collection Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Videos:</span>
                  <span className="font-medium">{files.filter(f => f.type === 'video').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Audio:</span>
                  <span className="font-medium">{files.filter(f => f.type === 'audio').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Images:</span>
                  <span className="font-medium">{files.filter(f => f.type === 'image').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Documents:</span>
                  <span className="font-medium">{files.filter(f => f.type === 'document').length}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-gray-900">Total Size:</span>
                    <span className="text-gray-900">
                      {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Viewer Area */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg shadow-sm border h-full min-h-[600px]">
              {selectedFile && (
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getFileTypeIcon(selectedFile.type)}</div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{selectedFile.name}</h2>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(selectedFile.size)} • Uploaded {selectedFile.uploadDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-gray-400 hover:text-gray-600">
                        <span className="text-xl">⋮</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-4 h-full">
                {renderViewer()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}