'use client';

import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface EvidenceFile {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadDate: Date;
  metadata?: Record<string, any>;
}

interface AudioTrack {
  id: string;
  name: string;
  url: string;
  color: string;
  visible: boolean;
}

interface AudioAnalyzerProps {
  file: EvidenceFile;
}

export default function AudioAnalyzer({ file }: AudioAnalyzerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const spectrogramRef = useRef<HTMLCanvasElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Audio Enhancement Controls
  const [noiseReduction, setNoiseReduction] = useState(0);
  const [amplification, setAmplification] = useState(0);
  const [lowPassFilter, setLowPassFilter] = useState(20000);
  const [highPassFilter, setHighPassFilter] = useState(20);
  
  // Multi-track support
  const [tracks, setTracks] = useState<AudioTrack[]>([
    {
      id: '1',
      name: 'Main Audio',
      url: file.url,
      color: '#3B82F6',
      visible: true
    }
  ]);
  
  const [selectedTrack, setSelectedTrack] = useState<string>('1');
  const [showSpectogram, setShowSpectogram] = useState(false);

  useEffect(() => {
    if (waveformRef.current && !wavesurferRef.current) {
      // Initialize WaveSurfer
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#3B82F6',
        progressColor: '#1D4ED8',
        height: 120,
        barWidth: 2,
        barGap: 1,
        responsive: true,
        normalize: true,
        backend: 'WebAudio'
      });

      wavesurfer.load(file.url);

      wavesurfer.on('ready', () => {
        setDuration(wavesurfer.getDuration());
      });

      wavesurfer.on('audioprocess', () => {
        setCurrentTime(wavesurfer.getCurrentTime());
      });

      wavesurfer.on('play', () => setIsPlaying(true));
      wavesurfer.on('pause', () => setIsPlaying(false));

      wavesurferRef.current = wavesurfer;
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [file.url]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume);
    }
  }, [volume]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackSpeed);
    }
  }, [playbackSpeed]);

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
    }
  };

  const seekTo = (position: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(position / duration);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const addTrack = () => {
    const newTrack: AudioTrack = {
      id: Date.now().toString(),
      name: `Track ${tracks.length + 1}`,
      url: file.url, // In real app, would be different URL
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      visible: true
    };
    setTracks(prev => [...prev, newTrack]);
  };

  const toggleTrackVisibility = (trackId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, visible: !track.visible }
        : track
    ));
  };

  const exportAudio = () => {
    // In real implementation, would process audio with enhancements
    const link = document.createElement('a');
    link.href = file.url;
    link.download = `enhanced_${file.name}`;
    link.click();
  };

  // Simulate spectrogram rendering
  useEffect(() => {
    if (showSpectogram && spectrogramRef.current) {
      const canvas = spectrogramRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Simple spectrogram visualization simulation
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width;
        const height = canvas.height;
        
        // Create gradient for frequency representation
        const imageData = ctx.createImageData(width, height);
        
        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            const index = (y * width + x) * 4;
            const frequency = (height - y) / height; // Higher frequencies at top
            const time = x / width;
            
            // Simulate frequency intensity with some randomness
            const intensity = Math.random() * frequency * 0.8 + 0.1;
            
            // Color based on intensity (blue to red spectrum)
            if (intensity > 0.7) {
              imageData.data[index] = 255; // Red
              imageData.data[index + 1] = intensity * 100;
              imageData.data[index + 2] = 0;
            } else if (intensity > 0.4) {
              imageData.data[index] = intensity * 255;
              imageData.data[index + 1] = 255; // Green
              imageData.data[index + 2] = 0;
            } else {
              imageData.data[index] = 0;
              imageData.data[index + 1] = intensity * 200;
              imageData.data[index + 2] = 255; // Blue
            }
            imageData.data[index + 3] = Math.floor(intensity * 255); // Alpha
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, [showSpectogram]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Main Waveform */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Audio Waveform</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSpectogram(!showSpectogram)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                showSpectogram 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Spectrogram
            </button>
          </div>
        </div>
        
        <div ref={waveformRef} className="w-full mb-4" />
        
        {/* Playback Controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlayPause}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <div className="text-sm text-gray-600 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Volume:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-gray-600">{Math.round(volume * 100)}%</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Speed:</label>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="px-2 py-1 text-sm border rounded"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4">
        {/* Enhancement Controls */}
        <div className="col-span-4 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Audio Enhancement</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Noise Reduction
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={noiseReduction}
                  onChange={(e) => setNoiseReduction(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>{noiseReduction}%</span>
                  <span>100%</span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amplification
                </label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={amplification}
                  onChange={(e) => setAmplification(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>-20dB</span>
                  <span>{amplification}dB</span>
                  <span>+20dB</span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  High Pass Filter
                </label>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  value={highPassFilter}
                  onChange={(e) => setHighPassFilter(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>20Hz</span>
                  <span>{highPassFilter}Hz</span>
                  <span>1kHz</span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Low Pass Filter
                </label>
                <input
                  type="range"
                  min="1000"
                  max="20000"
                  value={lowPassFilter}
                  onChange={(e) => setLowPassFilter(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1kHz</span>
                  <span>{(lowPassFilter/1000).toFixed(1)}kHz</span>
                  <span>20kHz</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={exportAudio}
              className="w-full mt-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Export Enhanced Audio
            </button>
          </div>
        </div>

        {/* Multi-Track Panel */}
        <div className="col-span-4 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Audio Tracks</h3>
              <button
                onClick={addTrack}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Track
              </button>
            </div>
            
            <div className="space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`p-3 bg-white rounded-lg border cursor-pointer transition-colors ${
                    selectedTrack === track.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedTrack(track.id)}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackVisibility(track.id);
                      }}
                      className="text-sm"
                    >
                      {track.visible ? '👁️' : '🙈'}
                    </button>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: track.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{track.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Spectrogram / Analysis Panel */}
        <div className="col-span-4">
          {showSpectogram ? (
            <div className="bg-gray-50 rounded-lg p-4 h-full">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Frequency Spectrogram</h3>
              <canvas
                ref={spectrogramRef}
                width={300}
                height={200}
                className="w-full border rounded bg-black"
              />
              <div className="mt-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>0Hz</span>
                  <span>Frequency</span>
                  <span>22kHz</span>
                </div>
                <div className="mt-1">
                  <span>Time →</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 h-full">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Audio Analysis</h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-gray-600 mb-1">Peak Amplitude</div>
                  <div className="text-lg font-semibold text-gray-900">-6.2 dB</div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-gray-600 mb-1">RMS Level</div>
                  <div className="text-lg font-semibold text-gray-900">-18.4 dB</div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-gray-600 mb-1">Dynamic Range</div>
                  <div className="text-lg font-semibold text-gray-900">12.2 dB</div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-xs text-gray-600 mb-1">Dominant Frequency</div>
                  <div className="text-lg font-semibold text-gray-900">440 Hz</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}