import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Crosshair, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface WaveformViewProps {
  data: number[];
  width?: number | string;
  height?: number;
  color?: string;
  showOverlay?: boolean;
}

export function WaveformView({ data, width = '100%', height = 200, color = '#10b981', showOverlay = true }: WaveformViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState(0); // Offset in index space
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseX = useRef(0);

  const resetView = useCallback(() => {
    setZoom(1.0);
    setOffset(0);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Mouse position relative to canvas width (0 to 1)
    const mouseXRatio = (e.clientX - rect.left) / rect.width;
    
    const maxZoom = 100;
    const minZoom = 1.0;
    const factor = Math.pow(1.1, -e.deltaY / 100);
    
    let newZoom = zoom * factor;
    newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
    
    // Calculate new offset to keeping the item under mouse stationary
    // current visible range: zoom length
    const currentLength = data.length / zoom;
    const newLength = data.length / newZoom;
    
    // Position under mouse in original array
    const absolutePos = offset + (currentLength * mouseXRatio);
    
    let newOffset = absolutePos - (newLength * mouseXRatio);
    // Clamp offset
    newOffset = Math.max(0, Math.min(newOffset, data.length - newLength));

    setZoom(newZoom);
    setOffset(newOffset);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMouseX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX.current;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // How many array elements does 1 pixel represent?
    const currentLength = data.length / zoom;
    const elementsPerPixel = currentLength / rect.width;
    
    let newOffset = offset - (dx * elementsPerPixel);
    newOffset = Math.max(0, Math.min(newOffset, data.length - currentLength));
    
    setOffset(newOffset);
    lastMouseX.current = e.clientX;
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Fix pixelation for high DPI screens
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        draw(width, height);
      }
    });
    
    resizeObserver.observe(containerRef.current);

    const draw = (w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      if (data.length === 0) return;

      const currentLength = data.length / zoom;
      const startIndex = Math.floor(offset);
      const endIndex = Math.min(data.length - 1, Math.ceil(offset + currentLength));

      // Find min/max for scaling if not normalized
      let min = data[startIndex];
      let max = data[startIndex];
      for (let i = startIndex + 1; i <= endIndex; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
      }
      const range = max - min || 1;

      // Draw horizontal threshold overlays if requested
      if (showOverlay) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Zero line / Middle line
        const midY = h - ((0.5 - min) / range * h);
        if (midY > 0 && midY < h) {
           ctx.moveTo(0, midY);
           ctx.lineTo(w, midY);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = zoom > 10 ? 2 : 1.5;
      ctx.lineJoin = 'round';

      // We might need to step if the array is huge
      const stepPixels = w / (currentLength);

      for (let i = startIndex; i <= endIndex; i++) {
        const x = (i - offset) * stepPixels;
        const normalizedY = (data[i] - min) / range;
        const y = h - (normalizedY * h);
        
        if (i === startIndex) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Draw using current client rect
    const rect = canvas.getBoundingClientRect();
    draw(rect.width, rect.height);

    return () => resizeObserver.disconnect();
  }, [data, color, zoom, offset, showOverlay]);

  return (
    <div 
      ref={containerRef}
      style={{ width, height }} 
      className="relative w-full overflow-hidden rounded-lg bg-slate-900 border border-slate-800 flex flex-col group"
    >
      {zoom !== 1.0 && (
         <div className="absolute top-2 left-2 px-2 py-1 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded z-10 flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-400">Zoom: {zoom.toFixed(1)}x</span>
            <button onClick={resetView} className="text-slate-400 hover:text-white" title="Reset View">
              <RefreshCw size={10} />
            </button>
         </div>
      )}
      
      <canvas 
        ref={canvasRef} 
        className={cn("w-full h-full", isDragging ? "cursor-grabbing" : "cursor-crosshair")}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
