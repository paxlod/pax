import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { generateSpectrogram } from '../lib/signal-processing';
import { Settings2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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

  const spectrogramData = useMemo(() => {
    if (data.length === 0) return [];
    return generateSpectrogram(data, windowSize, overlap);
  }, [data, windowSize, overlap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use parent element's internal width so we don't need a ResizeObserver on a variable wrapper
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
      if (spectrogramData.length === 0) return;

      const timeSteps = spectrogramData.length;
      const freqBins = spectrogramData[0].length;
      
      const cellWidth = canvas.width / timeSteps;
      const cellHeight = canvas.height / freqBins;

      let maxMag = 0;
      for (let i = 0; i < timeSteps; i++) {
        for (let j = 0; j < freqBins; j++) {
           if (spectrogramData[i][j] > maxMag) maxMag = spectrogramData[i][j];
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // We need to keep cell width calculation relative to the original scale
      for (let i = 0; i < timeSteps; i++) {
        // Optimization: if it's currently completely out of view, don't draw it.
        const currentX = (i * cellWidth * transform.k) + transform.x;
        if (currentX > canvas.width || currentX + (cellWidth * transform.k) < 0) continue;

        for (let j = 0; j < freqBins; j++) {
          const currentY = transform.y + (canvas.height - (j + 1) * cellHeight) * transform.k;
          if (currentY > canvas.height || currentY + (cellHeight * transform.k) < 0) continue;

          const mag = spectrogramData[i][j];
          const normalized = maxMag > 0 ? mag / maxMag : 0;
          
          const r = Math.floor(255 * Math.min(1, Math.max(0, 3.2 * normalized - 1.5)));
          const g = Math.floor(255 * Math.min(1, Math.max(0, -2.5 * Math.abs(normalized - 0.5) + 1.2)));
          const b = Math.floor(255 * Math.min(1, Math.max(0, 2.5 * (0.5 - normalized))));
          
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          // Draw from bottom up
          ctx.fillRect(i * cellWidth, canvas.height - (j + 1) * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
        }
      }
      ctx.restore();
    };

    draw();

    return () => resizeObserver.disconnect();
  }, [spectrogramData, transform]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const factor = Math.pow(1.1, delta / 100);
    
    const newK = Math.min(Math.max(transform.k * factor, 0.5), 20);
    
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

  const hopSize = windowSize - overlap;
  const timeResolution = data.length > 0 ? (hopSize / data.length).toFixed(6) : "0";

  return (
    <div className="space-y-4 w-full h-full">
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-sm font-medium text-slate-300">Spectral Topology (Spectrogram)</h3>
          <div className="flex items-center gap-2">
            <button
               onClick={resetView}
               className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
               title="Reset View"
            >
               <RefreshCw size={16} />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               exit={{ opacity: 0, height: 0 }}
               className="mb-4 overflow-hidden flex-shrink-0"
            >
               <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
                 <div>
                   <label className="text-xs text-slate-400 mb-1.5 flex justify-between">
                     FFT Window Size
                     <span className="text-emerald-500 font-mono">{windowSize}</span>
                   </label>
                   <input 
                     type="range"
                     min="64"
                     max="2048"
                     step="64"
                     value={windowSize}
                     onChange={(e) => {
                       const newSize = Number(e.target.value);
                       setWindowSize(newSize);
                       if (overlap >= newSize) setOverlap(Math.floor(newSize / 2));
                     }}
                     className="w-full accent-emerald-500"
                   />
                   <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                     <span>64</span>
                     <span>1024</span>
                     <span>2048</span>
                   </div>
                 </div>

                 <div>
                   <label className="text-xs text-slate-400 mb-1.5 flex justify-between">
                     Window Overlap
                     <span className="text-emerald-500 font-mono">{overlap}</span>
                   </label>
                   <input 
                     type="range"
                     min="0"
                     max={windowSize - 1}
                     step="16"
                     value={overlap}
                     onChange={(e) => setOverlap(Number(e.target.value))}
                     className="w-full accent-emerald-500"
                   />
                   <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                     <span>0</span>
                     <span>{Math.floor(windowSize / 2)}</span>
                     <span>{windowSize - 1}</span>
                   </div>
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-[150px] relative w-full border border-slate-800 rounded bg-black group overflow-hidden">
           <div 
             ref={containerRef}
             className={cn(
               "absolute inset-0 w-full h-full",
               isDragging ? "cursor-grabbing" : "cursor-crosshair"
             )}
             onWheel={handleWheel}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
           >
             <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
             
             {transform.k !== 1 && (
               <div className="absolute top-2 left-2 px-2 py-1 rounded bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 pointer-events-none z-10">
                 <span className="text-[10px] font-mono text-blue-400">
                   Zoom: {transform.k.toFixed(1)}x
                 </span>
               </div>
             )}
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 flex-shrink-0">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Temporal Resolution</div>
          <div className="text-sm font-mono text-slate-300">{timeResolution} units/step</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Freq Bins / Hop</div>
          <div className="text-sm font-mono text-slate-300">{Math.floor(windowSize / 2)} / {hopSize}</div>
        </div>
      </div>
    </div>
  );
}
