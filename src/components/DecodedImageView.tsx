import React, { useEffect, useRef, useState, useCallback } from 'react';

interface DecodedImageViewProps {
  pixels: number[][];
  width?: number | string;
  height?: number | string;
}

export function DecodedImageView({ pixels, width = '100%', height = 300 }: DecodedImageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!pixels || !Array.isArray(pixels) || pixels.length === 0 || !pixels[0] || pixels[0].length === 0) return;
    
    const imgHeight = pixels.length;
    const imgWidth = pixels[0].length;
    
    // Calculate aspect ratio preserving dimensions
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = imgWidth / imgHeight;
    
    let baseDrawWidth = canvas.width;
    let baseDrawHeight = canvas.height;
    let baseOffsetX = 0;
    let baseOffsetY = 0;
    
    if (canvasRatio > imgRatio) {
      baseDrawWidth = canvas.height * imgRatio;
      baseOffsetX = (canvas.width - baseDrawWidth) / 2;
    } else {
      baseDrawHeight = canvas.width / imgRatio;
      baseOffsetY = (canvas.height - baseDrawHeight) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create ImageData
    const imgData = ctx.createImageData(imgWidth, imgHeight);
    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        const idx = (y * imgWidth + x) * 4;
        const val = Math.floor(pixels[y][x] * 255);
        imgData.data[idx] = val;     // R
        imgData.data[idx + 1] = val; // G
        imgData.data[idx + 2] = val; // B
        imgData.data[idx + 3] = 255; // A
      }
    }
    
    // Draw to an offscreen canvas first to scale it
    const offscreen = document.createElement('canvas');
    offscreen.width = imgWidth;
    offscreen.height = imgHeight;
    offscreen.getContext('2d')!.putImageData(imgData, 0, 0);
    
    // Disable smoothing for pixelated look
    ctx.imageSmoothingEnabled = false;
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    // Center scaling
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    ctx.drawImage(offscreen, baseOffsetX, baseOffsetY, baseDrawWidth, baseDrawHeight);
    ctx.restore();
  }, [pixels, scale, offset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        draw();
      }
    });
    
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.max(0.5, Math.min(scale * (1 + delta), 20));
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      style={{ width, height }} 
      className="relative w-full overflow-hidden rounded-lg bg-black border border-slate-800 flex items-center justify-center group/canvas"
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" 
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {(scale !== 1 || offset.x !== 0 || offset.y !== 0) && (
        <button 
          onClick={handleReset}
          className="absolute top-2 right-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] px-2 py-1 rounded backdrop-blur-sm opacity-0 group-hover/canvas:opacity-100 transition-opacity"
        >
          Reset View
        </button>
      )}

      {/* Zoom Indicator */}
      <div className="absolute bottom-2 right-2 bg-slate-900/80 text-emerald-400 text-[10px] font-mono px-2 py-1 rounded backdrop-blur-sm pointer-events-none opacity-0 group-hover/canvas:opacity-100 transition-opacity border border-slate-800/50">
        {scale.toFixed(1)}x
      </div>

      {/* Dragging Indicator */}
      {isDragging && (
        <div className="absolute bottom-2 left-2 bg-slate-900/80 text-slate-300 text-[10px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none flex items-center gap-1.5 border border-slate-800/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Dragging
        </div>
      )}
    </div>
  );
}
