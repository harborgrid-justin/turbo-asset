'use client';

import React, { useRef, useEffect, useState } from 'react';

interface EvidenceFile {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadDate: Date;
  metadata?: Record<string, any>;
}

interface Annotation {
  id: string;
  type: 'arrow' | 'text' | 'highlight' | 'circle' | 'rectangle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  user: string;
  createdAt: Date;
}

interface ImageViewerProps {
  file: EvidenceFile;
}

export default function ImageViewer({ file }: ImageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Image adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [hue, setHue] = useState(0);
  
  // Measurement tools
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [measurementStart, setMeasurementStart] = useState<{x: number, y: number} | null>(null);
  const [measurementEnd, setMeasurementEnd] = useState<{x: number, y: number} | null>(null);
  const [pixelsPerUnit, setPixelsPerUnit] = useState(10); // pixels per cm
  
  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<'select' | 'arrow' | 'text' | 'highlight' | 'circle' | 'rectangle' | 'measure'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<Annotation> | null>(null);
  
  // Comparison view
  const [showComparison, setShowComparison] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        redrawCanvas();
      };
      
      img.src = file.url;
    }
  }, [file.url]);

  useEffect(() => {
    redrawCanvas();
  }, [scale, panX, panY, brightness, contrast, saturation, hue, annotations]);

  const redrawCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply image filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`;
    
    // Draw image with transformations
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(panX / scale, panY / scale);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    
    // Reset filter for annotations
    ctx.filter = 'none';
    
    // Draw annotations
    annotations.forEach(annotation => {
      drawAnnotation(ctx, annotation);
    });
    
    // Draw measurement if active
    if (measurementStart && measurementEnd) {
      drawMeasurement(ctx, measurementStart, measurementEnd);
    }
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = 2;
    
    const x = (annotation.x + panX) * scale;
    const y = (annotation.y + panY) * scale;
    
    switch (annotation.type) {
      case 'arrow':
        drawArrow(ctx, x, y, x + 50 * scale, y + 50 * scale);
        break;
      case 'text':
        ctx.font = `${16 * scale}px Arial`;
        ctx.fillText(annotation.text || '', x, y);
        break;
      case 'highlight':
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, (annotation.width || 50) * scale, (annotation.height || 20) * scale);
        ctx.globalAlpha = 1;
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(x, y, (annotation.width || 25) * scale, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'rectangle':
        ctx.strokeRect(x, y, (annotation.width || 50) * scale, (annotation.height || 50) * scale);
        break;
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowLength * Math.cos(angle - arrowAngle), y2 - arrowLength * Math.sin(angle - arrowAngle));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowLength * Math.cos(angle + arrowAngle), y2 - arrowLength * Math.sin(angle + arrowAngle));
    ctx.stroke();
  };

  const drawMeasurement = (ctx: CanvasRenderingContext2D, start: {x: number, y: number}, end: {x: number, y: number}) => {
    const startX = (start.x + panX) * scale;
    const startY = (start.y + panY) * scale;
    const endX = (end.x + panX) * scale;
    const endY = (end.y + panY) * scale;
    
    // Draw measurement line
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Calculate distance
    const pixelDistance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const realDistance = (pixelDistance / pixelsPerUnit).toFixed(2);
    
    // Draw distance label
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    ctx.fillStyle = '#FF0000';
    ctx.font = '14px Arial';
    ctx.fillText(`${realDistance} cm`, midX + 10, midY - 10);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / scale;
    const y = (e.clientY - rect.top - panY) / scale;
    
    if (selectedTool === 'select') {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (selectedTool === 'measure') {
      if (!measurementStart) {
        setMeasurementStart({ x, y });
      } else {
        setMeasurementEnd({ x, y });
      }
    } else {
      // Start annotation
      setIsDrawing(true);
      setCurrentAnnotation({
        type: selectedTool as any,
        x,
        y,
        color: '#FF0000',
        user: 'Current User'
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      setPanX(panX + deltaX);
      setPanY(panY + deltaY);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setIsDragging(false);
    } else if (isDrawing && currentAnnotation) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - panX) / scale;
      const y = (e.clientY - rect.top - panY) / scale;
      
      const newAnnotation: Annotation = {
        ...currentAnnotation,
        id: Date.now().toString(),
        width: Math.abs(x - currentAnnotation.x!),
        height: Math.abs(y - currentAnnotation.y!),
        createdAt: new Date()
      } as Annotation;
      
      if (selectedTool === 'text') {
        const text = prompt('Enter text:');
        if (text) {
          newAnnotation.text = text;
          setAnnotations(prev => [...prev, newAnnotation]);
        }
      } else {
        setAnnotations(prev => [...prev, newAnnotation]);
      }
      
      setIsDrawing(false);
      setCurrentAnnotation(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const newScale = scale + (e.deltaY > 0 ? -0.1 : 0.1);
    setScale(Math.max(0.1, Math.min(5, newScale)));
  };

  const zoomIn = () => setScale(Math.min(5, scale + 0.25));
  const zoomOut = () => setScale(Math.max(0.1, scale - 0.25));
  const resetZoom = () => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  };

  const resetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
  };

  const exportImage = () => {
    if (!canvasRef.current || typeof window === 'undefined') return;
    
    const link = document.createElement('a');
    link.download = `enhanced_${file.name}`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const clearMeasurement = () => {
    setMeasurementStart(null);
    setMeasurementEnd(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Tool selection */}
            <div className="flex space-x-1 bg-white rounded-lg p-1 border">
              {[
                { tool: 'select', icon: '👆', title: 'Select & Pan' },
                { tool: 'arrow', icon: '↗️', title: 'Arrow' },
                { tool: 'text', icon: '📝', title: 'Text' },
                { tool: 'highlight', icon: '🖍️', title: 'Highlight' },
                { tool: 'circle', icon: '⭕', title: 'Circle' },
                { tool: 'rectangle', icon: '◻️', title: 'Rectangle' },
                { tool: 'measure', icon: '📏', title: 'Measure' }
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

            {/* Zoom controls */}
            <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border">
              <button onClick={zoomOut} className="p-2 hover:bg-gray-100 rounded text-sm">🔍-</button>
              <span className="text-sm text-gray-600 px-2">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="p-2 hover:bg-gray-100 rounded text-sm">🔍+</button>
              <button onClick={resetZoom} className="p-2 hover:bg-gray-100 rounded text-sm" title="Reset Zoom">🎯</button>
            </div>

            {/* Measurement controls */}
            {(measurementStart || measurementEnd) && (
              <div className="flex items-center space-x-2 bg-white rounded-lg p-2 border">
                <span className="text-sm text-gray-600">
                  Measuring: {measurementStart && measurementEnd ? 
                    `${((Math.sqrt(Math.pow(measurementEnd.x - measurementStart.x, 2) + Math.pow(measurementEnd.y - measurementStart.y, 2))) / pixelsPerUnit).toFixed(2)} cm`
                    : 'Click to set end point'
                  }
                </span>
                <button
                  onClick={clearMeasurement}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                showComparison
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              📊 Before/After
            </button>
            <button
              onClick={exportImage}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4">
        {/* Image Canvas */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg border h-full relative overflow-hidden">
            <div className="absolute inset-0 bg-gray-100 bg-opacity-50" style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='%23000' fill-opacity='0.1'%3e%3cpath d='M10 0h10v10H10zM0 10h10v10H0z'/%3e%3c/g%3e%3c/svg%3e")`
            }}>
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                className="cursor-crosshair max-w-full max-h-full"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                  transformOrigin: '0 0'
                }}
              />
            </div>
            <img
              ref={imageRef}
              src={file.url}
              alt={file.name}
              className="hidden"
            />
          </div>
        </div>

        {/* Controls Panel */}
        <div className="col-span-4 space-y-4">
          {/* Image Adjustments */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Image Adjustments</h3>
              <button
                onClick={resetAdjustments}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Reset
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Brightness
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>{brightness}%</span>
                  <span>200%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contrast
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>{contrast}%</span>
                  <span>200%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Saturation
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>{saturation}%</span>
                  <span>200%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hue
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hue}
                  onChange={(e) => setHue(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0°</span>
                  <span>{hue}°</span>
                  <span>360°</span>
                </div>
              </div>
            </div>
          </div>

          {/* Measurement Calibration */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Measurement Scale</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Pixels per cm
              </label>
              <input
                type="number"
                value={pixelsPerUnit}
                onChange={(e) => setPixelsPerUnit(parseFloat(e.target.value) || 1)}
                className="w-full px-2 py-1 text-sm border rounded"
                min="0.1"
                step="0.1"
              />
            </div>
          </div>

          {/* Annotations List */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Annotations ({annotations.length})
              </h3>
              <button
                onClick={() => setAnnotations([])}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="p-2 bg-white rounded border text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{annotation.type}</span>
                    <button
                      onClick={() => setAnnotations(prev => prev.filter(a => a.id !== annotation.id))}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                  {annotation.text && (
                    <p className="text-gray-600 truncate">{annotation.text}</p>
                  )}
                  <p className="text-xs text-gray-500">{annotation.user}</p>
                </div>
              ))}
            </div>
            
            {annotations.length === 0 && (
              <div className="text-center py-4">
                <div className="text-gray-400 text-2xl mb-1">🖊️</div>
                <p className="text-xs text-gray-500">
                  Use the tools above to add annotations
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}