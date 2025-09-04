'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface EvidenceFile {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadDate: Date;
  metadata?: Record<string, any>;
}

interface DocumentAnnotation {
  id: string;
  pageNumber: number;
  type: 'highlight' | 'comment' | 'redaction';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color: string;
  user: string;
  createdAt: Date;
  isTemporary?: boolean;
}

interface CommentThread {
  id: string;
  parentId?: string;
  annotationId: string;
  user: string;
  text: string;
  createdAt: Date;
  replies: CommentThread[];
}

interface DocumentProcessorProps {
  file: EvidenceFile;
}

export default function DocumentProcessor({ file }: DocumentProcessorProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  
  // OCR State
  const [ocrText, setOcrText] = useState<string>('');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  
  // Annotations
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<'select' | 'highlight' | 'comment' | 'redaction'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<DocumentAnnotation> | null>(null);
  
  // Comment threads
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([]);
  const [showComments, setShowComments] = useState(false);
  
  // Version comparison
  const [showVersions, setShowVersions] = useState(false);
  const [versions] = useState([
    { id: '1', name: 'Original', date: new Date('2025-01-10'), url: file.url },
    { id: '2', name: 'Rev 1', date: new Date('2025-01-12'), url: file.url },
    { id: '3', name: 'Current', date: new Date('2025-01-15'), url: file.url }
  ]);
  const [selectedVersion, setSelectedVersion] = useState('3');

  useEffect(() => {
    loadPdfDocument();
  }, [file.url]);

  const loadPdfDocument = async () => {
    try {
      const loadingTask = pdfjsLib.getDocument(file.url);
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setNumPages(pdf.numPages);
      
      // Render first page
      renderPage(pdf, 1);
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const renderPage = async (pdf: any, pageNum: number) => {
    if (!pdf) return;
    
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRefs.current[pageNum - 1];
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      if (context) {
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
        
        // Render annotations for this page
        renderAnnotations(context, pageNum);
      }
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  const renderAnnotations = (context: CanvasRenderingContext2D, pageNum: number) => {
    const pageAnnotations = annotations.filter(ann => ann.pageNumber === pageNum);
    
    pageAnnotations.forEach(annotation => {
      switch (annotation.type) {
        case 'highlight':
          context.globalAlpha = 0.3;
          context.fillStyle = annotation.color;
          context.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
          context.globalAlpha = 1;
          break;
          
        case 'redaction':
          context.fillStyle = annotation.isTemporary ? '#FF0000' : '#000000';
          context.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
          if (annotation.isTemporary) {
            context.strokeStyle = '#FF0000';
            context.lineWidth = 2;
            context.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
          }
          break;
          
        case 'comment':
          // Draw comment indicator
          context.fillStyle = annotation.color;
          context.beginPath();
          context.arc(annotation.x + 10, annotation.y + 10, 8, 0, 2 * Math.PI);
          context.fill();
          context.fillStyle = 'white';
          context.font = '12px Arial';
          context.textAlign = 'center';
          context.fillText('💬', annotation.x + 10, annotation.y + 15);
          break;
      }
    });
  };

  const performOCR = async () => {
    if (!pdfDocument) return;
    
    setIsProcessingOCR(true);
    setOcrProgress(0);
    
    try {
      const worker = await createWorker('eng');
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setOcrProgress((pageNum / numPages) * 100);
        
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
          
          const imageData = canvas.toDataURL();
          const { data: { text } } = await worker.recognize(imageData);
          fullText += `\n--- Page ${pageNum} ---\n${text}\n`;
        }
      }
      
      await worker.terminate();
      setOcrText(fullText);
    } catch (error) {
      console.error('OCR Error:', error);
    }
    
    setIsProcessingOCR(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, pageNum: number) => {
    if (selectedTool === 'select') return;
    
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setCurrentAnnotation({
      pageNumber: pageNum,
      type: selectedTool as any,
      x,
      y,
      width: 0,
      height: 0,
      color: selectedTool === 'highlight' ? '#FFFF00' : 
             selectedTool === 'redaction' ? '#FF0000' : '#0000FF',
      user: 'Current User'
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentAnnotation(prev => prev ? {
      ...prev,
      width: x - prev.x!,
      height: y - prev.y!
    } : null);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    
    const newAnnotation: DocumentAnnotation = {
      ...currentAnnotation,
      id: Date.now().toString(),
      createdAt: new Date(),
      isTemporary: selectedTool === 'redaction'
    } as DocumentAnnotation;
    
    if (selectedTool === 'comment') {
      const text = prompt('Enter comment:');
      if (text) {
        newAnnotation.text = text;
        setAnnotations(prev => [...prev, newAnnotation]);
        
        // Create comment thread
        const thread: CommentThread = {
          id: Date.now().toString(),
          annotationId: newAnnotation.id,
          user: 'Current User',
          text,
          createdAt: new Date(),
          replies: []
        };
        setCommentThreads(prev => [...prev, thread]);
      }
    } else {
      setAnnotations(prev => [...prev, newAnnotation]);
    }
    
    setIsDrawing(false);
    setCurrentAnnotation(null);
    
    // Re-render the page to show the new annotation
    if (pdfDocument) {
      renderPage(pdfDocument, currentAnnotation.pageNumber!);
    }
  };

  const changePage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= numPages && pdfDocument) {
      setCurrentPage(pageNum);
      renderPage(pdfDocument, pageNum);
    }
  };

  const zoomIn = () => {
    const newScale = Math.min(3, scale + 0.25);
    setScale(newScale);
    if (pdfDocument) {
      renderPage(pdfDocument, currentPage);
    }
  };

  const zoomOut = () => {
    const newScale = Math.max(0.5, scale - 0.25);
    setScale(newScale);
    if (pdfDocument) {
      renderPage(pdfDocument, currentPage);
    }
  };

  const exportRedactedDocument = () => {
    // In real implementation, would create new PDF with permanent redactions
    const link = document.createElement('a');
    link.href = file.url;
    link.download = `redacted_${file.name}`;
    link.click();
  };

  const toggleRedactionMode = (annotationId: string) => {
    setAnnotations(prev => prev.map(ann => 
      ann.id === annotationId 
        ? { ...ann, isTemporary: !ann.isTemporary }
        : ann
    ));
    
    if (pdfDocument) {
      renderPage(pdfDocument, currentPage);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Tool Selection */}
            <div className="flex space-x-1 bg-white rounded-lg p-1 border">
              {[
                { tool: 'select', icon: '👆', title: 'Select' },
                { tool: 'highlight', icon: '🖍️', title: 'Highlight' },
                { tool: 'comment', icon: '💬', title: 'Comment' },
                { tool: 'redaction', icon: '⬛', title: 'Redact' }
              ].map(({ tool, icon, title }) => (
                <button
                  key={tool}
                  onClick={() => setSelectedTool(tool as any)}
                  className={`p-2 rounded text-sm transition-colors ${
                    selectedTool === tool
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  title={title}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Page Navigation */}
            <div className="flex items-center space-x-2 bg-white rounded-lg p-1 border">
              <button 
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                ⬅️
              </button>
              <span className="text-sm text-gray-600 px-2">
                {currentPage} / {numPages}
              </span>
              <button 
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                ➡️
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border">
              <button onClick={zoomOut} className="p-1 hover:bg-gray-100 rounded">🔍-</button>
              <span className="text-sm text-gray-600 px-2">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="p-1 hover:bg-gray-100 rounded">🔍+</button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowComments(!showComments)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                showComments
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              💬 Comments ({commentThreads.length})
            </button>
            <button
              onClick={() => setShowVersions(!showVersions)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                showVersions
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              📊 Versions
            </button>
            <button
              onClick={performOCR}
              disabled={isProcessingOCR}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isProcessingOCR ? `🔄 OCR ${Math.round(ocrProgress)}%` : '🔍 Extract Text'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4">
        {/* Document Viewer */}
        <div className={`${showComments || showVersions ? 'col-span-8' : 'col-span-12'} flex flex-col`}>
          <div className="bg-white rounded-lg border flex-1 overflow-auto p-4">
            {numPages > 0 && Array.from({ length: numPages }, (_, i) => (
              <div key={i + 1} className="mb-4">
                <div className="text-sm text-gray-500 mb-2">Page {i + 1}</div>
                <canvas
                  ref={el => canvasRefs.current[i] = el}
                  onMouseDown={(e) => handleCanvasMouseDown(e, i + 1)}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="border shadow-sm cursor-crosshair max-w-full"
                />
              </div>
            ))}
            
            {numPages === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-gray-500">Loading document...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        {(showComments || showVersions) && (
          <div className="col-span-4 space-y-4">
            {/* Comments Panel */}
            {showComments && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Comments & Annotations
                  </h3>
                  <button
                    onClick={() => setAnnotations([])}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {commentThreads.map((thread) => (
                    <div key={thread.id} className="bg-white rounded-lg border p-3">
                      <div className="flex items-start space-x-2">
                        <div className="text-sm font-medium text-gray-900">
                          {thread.user}
                        </div>
                        <div className="text-xs text-gray-500">
                          {thread.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{thread.text}</p>
                    </div>
                  ))}
                  
                  {annotations.filter(ann => ann.type !== 'comment').map((annotation) => (
                    <div key={annotation.id} className="bg-white rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {annotation.type} - Page {annotation.pageNumber}
                        </span>
                        {annotation.type === 'redaction' && (
                          <button
                            onClick={() => toggleRedactionMode(annotation.id)}
                            className={`text-xs px-2 py-1 rounded ${
                              annotation.isTemporary
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {annotation.isTemporary ? 'Temporary' : 'Permanent'}
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        By {annotation.user} on {annotation.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Redaction Export */}
                {annotations.some(ann => ann.type === 'redaction') && (
                  <button
                    onClick={exportRedactedDocument}
                    className="w-full mt-3 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    📥 Export Redacted Document
                  </button>
                )}
              </div>
            )}

            {/* Versions Panel */}
            {showVersions && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Document Versions</h3>
                
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      onClick={() => setSelectedVersion(version.id)}
                      className={`p-3 bg-white rounded-lg border cursor-pointer transition-colors ${
                        selectedVersion === version.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {version.name}
                        </span>
                        {selectedVersion === version.id && (
                          <span className="text-xs text-blue-600">Current</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {version.date.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  📊 Compare Versions
                </button>
              </div>
            )}

            {/* OCR Results */}
            {ocrText && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Extracted Text</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(ocrText)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="bg-white rounded border p-3 max-h-32 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {ocrText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}