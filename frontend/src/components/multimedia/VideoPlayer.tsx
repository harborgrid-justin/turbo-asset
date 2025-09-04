'use client';

import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface EvidenceFile {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadDate: Date;
  metadata?: Record<string, unknown>;
}

interface Annotation {
  id: string;
  timestamp: number;
  text: string;
  type: 'comment' | 'bookmark' | 'highlight';
  user: string;
  createdAt: Date;
}

interface VideoPlayerProps {
  file: EvidenceFile;
}

export default function VideoPlayer({ file }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([
    {
      id: '1',
      timestamp: 15.5,
      text: 'Subject enters frame from the left',
      type: 'comment',
      user: 'Investigator A',
      createdAt: new Date()
    },
    {
      id: '2',
      timestamp: 32.2,
      text: 'Important evidence marker',
      type: 'bookmark',
      user: 'Analyst B',
      createdAt: new Date()
    }
  ]);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({
    text: '',
    type: 'comment' as 'comment' | 'bookmark' | 'highlight'
  });

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.className = 'vjs-default-skin vjs-big-play-centered w-full h-96';
      videoRef.current.appendChild(videoElement);

      const player = videojs(videoElement, {
        controls: true,
        responsive: true,
        fluid: true,
        sources: [{
          src: file.url,
          type: file.url.endsWith('.mp4') ? 'video/mp4' : 'video/webm'
        }],
        tracks: [{
          kind: 'captions',
          src: '/sample-captions.vtt',
          srclang: 'en',
          label: 'English',
          default: true
        }]
      });

      player.ready(() => {
        playerRef.current = player;
        
        player.on('timeupdate', () => {
          setCurrentTime(player.currentTime());
        });
        
        player.on('durationchange', () => {
          setDuration(player.duration());
        });
        
        player.on('play', () => setIsPlaying(true));
        player.on('pause', () => setIsPlaying(false));
      });
    }

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [file.url]);

  const seekToTime = (time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime(time);
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (playerRef.current) {
      playerRef.current.playbackRate(speed);
    }
  };

  const frameStep = (direction: 'forward' | 'backward') => {
    if (playerRef.current) {
      const frameRate = 30; // Assume 30fps
      const frameTime = 1 / frameRate;
      const newTime = direction === 'forward' 
        ? currentTime + frameTime 
        : currentTime - frameTime;
      playerRef.current.currentTime(Math.max(0, Math.min(duration, newTime)));
    }
  };

  const addAnnotation = () => {
    if (!newAnnotation.text.trim()) return;

    const annotation: Annotation = {
      id: Date.now().toString(),
      timestamp: currentTime,
      text: newAnnotation.text,
      type: newAnnotation.type,
      user: 'Current User',
      createdAt: new Date()
    };

    setAnnotations(prev => [...prev, annotation]);
    setNewAnnotation({ text: '', type: 'comment' });
    setShowAnnotationForm(false);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const getAnnotationIcon = (type: string): string => {
    switch (type) {
      case 'comment': return '💬';
      case 'bookmark': return '🔖';
      case 'highlight': return '⭐';
      default: return '📝';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Video Player */}
      <div className="relative mb-4">
        <div ref={videoRef} className="w-full" />
        
        {/* Annotation Markers on Timeline */}
        <div className="relative h-2 bg-gray-200 rounded mt-2">
          <div 
            className="absolute h-full bg-blue-500 rounded"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          {annotations.map((annotation) => (
            <button
              key={annotation.id}
              onClick={() => seekToTime(annotation.timestamp)}
              className="absolute w-3 h-3 bg-yellow-400 border-2 border-white rounded-full shadow-sm transform -translate-y-1/2 -translate-x-1/2 top-1/2 hover:bg-yellow-500 transition-colors"
              style={{ left: `${(annotation.timestamp / duration) * 100}%` }}
              title={`${formatTime(annotation.timestamp)}: ${annotation.text}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4">
        {/* Controls Panel */}
        <div className="col-span-8 space-y-4">
          {/* Frame-by-Frame Controls */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Precision Controls</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => frameStep('backward')}
                className="p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                title="Previous Frame"
              >
                ⏮️
              </button>
              <button
                onClick={() => playerRef.current?.[isPlaying ? 'pause' : 'play']()}
                className="p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={() => frameStep('forward')}
                className="p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                title="Next Frame"
              >
                ⏭️
              </button>
              
              <div className="text-sm text-gray-600">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>

          {/* Playback Speed */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Playback Speed</h3>
            <div className="flex space-x-2">
              {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => changePlaybackSpeed(speed)}
                  className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                    playbackSpeed === speed 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Loop Control */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Loop Section</h3>
            <div className="flex items-center space-x-4">
              <button className="px-3 py-1 text-sm bg-white border rounded-lg hover:bg-gray-50 transition-colors">
                Set Loop Start
              </button>
              <button className="px-3 py-1 text-sm bg-white border rounded-lg hover:bg-gray-50 transition-colors">
                Set Loop End
              </button>
              <button className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                🔁 Enable Loop
              </button>
            </div>
          </div>
        </div>

        {/* Annotations Panel */}
        <div className="col-span-4">
          <div className="bg-gray-50 rounded-lg p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Annotations ({annotations.length})
              </h3>
              <button
                onClick={() => setShowAnnotationForm(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add
              </button>
            </div>

            {/* Add Annotation Form */}
            {showAnnotationForm && (
              <div className="mb-4 p-3 bg-white rounded-lg border">
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={newAnnotation.type}
                    onChange={(e) => setNewAnnotation(prev => ({
                      ...prev,
                      type: e.target.value as any
                    }))}
                    className="w-full px-2 py-1 text-sm border rounded"
                  >
                    <option value="comment">Comment</option>
                    <option value="bookmark">Bookmark</option>
                    <option value="highlight">Highlight</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Text
                  </label>
                  <textarea
                    value={newAnnotation.text}
                    onChange={(e) => setNewAnnotation(prev => ({
                      ...prev,
                      text: e.target.value
                    }))}
                    placeholder="Add annotation..."
                    className="w-full px-2 py-1 text-sm border rounded resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={addAnnotation}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowAnnotationForm(false)}
                    className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  At {formatTime(currentTime)}
                </p>
              </div>
            )}

            {/* Annotations List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {annotations
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((annotation) => (
                <div
                  key={annotation.id}
                  className="p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => seekToTime(annotation.timestamp)}
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-sm">{getAnnotationIcon(annotation.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {annotation.text}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-blue-600 font-mono">
                          {formatTime(annotation.timestamp)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {annotation.user}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {annotations.length === 0 && !showAnnotationForm && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📝</div>
                <p className="text-sm text-gray-500">
                  No annotations yet. Click &quot;Add&quot; to create your first annotation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}