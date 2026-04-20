import React, { useEffect, useRef, useState, useCallback } from 'react';
import { generateSpectrogram } from '../lib/signal-processing';
import { Settings, X, RefreshCw, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SpectrogramViewProps {
  data: number[];
  width?: number | string;
  height?: number;
  windowSize?: number;
}

export function SpectrogramView({ data, width = '100%', height = 200, windowSize: initialWindowSize = 256 }: SpectrogramViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [windowSize, setWindowSize] = useState(initialWindowSize);
  const [overlap, setOverlap] = useState(Math.floor(initialWindowSize / 2));
  
  // Zoom and Pan state
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const resetView = useCallback(() => {
    setTransform({ k: 1, x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        draw();
      }
    });
    
    const parent = canvas.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    const draw = () => {
      if (data.length === 0) return;
      
      const spectrogram = generateSpectrogram(data, windowSize, overlap);
      if (spectrogram.length === 0) return;

      const timeSteps = spectrogram.length;
      const freqBins = spectrogram[0].length;
      
      const cellWidth = canvas.width / timeSteps;
      const cellHeight = canvas.height / freqBins;

      // Find max magnitude for color scaling
      let maxMag = 0;
      for (let i = 0; i < timeSteps; i++) {
        for (let j = 0; j < freqBins; j++) {
          if (spectrogram[i][j] > maxMag) maxMag = spectrogram[i][j];
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      // Apply transformations
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // Optimization: Only draw what's visible
      // For now, let's just draw everything and see performance
      for (let i = 0; i < timeSteps; i++) {
        for (let j = 0; j < freqBins; j++) {
          const mag = spectrogram[i][j];
          const normalized = maxMag > 0 ? mag / maxMag : 0;
          
          // Viridis-like colormap approximation
          const r = Math.floor(255 * Math.min(1, Math.max(0, 3.2 * normalized - 1.5)));
          const g = Math.floor(255 * Math.min(1, Math.max(0, -2.5 * Math.abs(normalized - 0.5) + 1.2)));
          const b = Math.floor(255 * Math.min(1, Math.max(0, 2.5 * (0.5 - normalized))));
          
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          // Draw from bottom up
          ctx.fillRect(i * cellWidth, canvas.height - (j + 1) * cellHeight, Math.ceil(cellWidth), Math.ceil(cellHeight));
        }
      }
      
      ctx.restore();
    };

    draw();

    return () => resizeObserver.disconnect();
  }, [data, windowSize, overlap, transform]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const factor = Math.pow(1.1, delta / 100);
    
    const newK = Math.min(Math.max(transform.k * factor, 0.5), 20);
    
    // Zoom relative to mouse position
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newX = mouseX - (mouseX - transform.x) * (newK / transform.k);
    const newY = mouseY - (mouseY - transform.y) * (newK / transform.k);
    
    setTransform({ k: newK, x: newX, y: newY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      ref={containerRef}
      style={{ width, height }} 
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-slate-900 border border-slate-800 group",
        isDragging ? "cursor-grabbing" : "cursor-crosshair"
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "p-1.5 rounded-md transition-all",
            "bg-slate-950/50 hover:bg-slate-950 text-slate-400 hover:text-slate-100 border border-slate-800",
            showSettings && "bg-slate-800 text-slate-100"
          )}
          title="Spectrogram Settings"
        >
          {showSettings ? <X size={16} /> : <Settings size={16} />}
        </button>

        <button
          onClick={resetView}
          className="p-1.5 rounded-md bg-slate-950/50 hover:bg-slate-950 text-slate-400 hover:text-slate-100 border border-slate-800 transition-all"
          title="Reset View"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Zoom/Pan Indicator */}
      {transform.k !== 1 && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 pointer-events-none z-10">
          <span className="text-[10px] font-mono text-blue-400">
            Zoom: {transform.k.toFixed(1)}x
          </span>
        </div>
      )}

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-12 right-2 w-48 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 z-20 shadow-xl"
          >
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Window Size</label>
                  <span className="text-xs font-mono text-blue-400">{windowSize}</span>
                </div>
                <input
                  type="range"
                  min="64"
                  max="1024"
                  step="64"
                  value={windowSize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setWindowSize(val);
                    if (overlap >= val) setOverlap(val - 1);
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Overlap</label>
                  <span className="text-xs font-mono text-blue-400">{overlap}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={windowSize - 1}
                  step="1"
                  value={overlap}
                  onChange={(e) => setOverlap(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="pt-2 border-top border-slate-800">
                <p className="text-[9px] text-slate-600 leading-tight italic">
                  Higher window size increases frequency resolution. Overlap improves temporal smoothness.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend / Info Overlay */}
      {!showSettings && (
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-slate-950/40 backdrop-blur-sm border border-slate-800/50 pointer-events-none">
          <span className="text-[10px] font-mono text-slate-500">
            FFT: {windowSize} | Overlap: {overlap}
          </span>
        </div>
      )}
    </div>
  );
}
