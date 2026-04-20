import React, { useEffect, useRef } from 'react';

interface WaveformViewProps {
  data: number[];
  width?: number | string;
  height?: number;
  color?: string;
}

export function WaveformView({ data, width = '100%', height = 200, color = '#10b981' }: WaveformViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        draw();
      }
    });
    
    resizeObserver.observe(canvas.parentElement!);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (data.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      const step = canvas.width / data.length;
      
      // Find min/max for scaling if not normalized
      let min = data[0];
      let max = data[0];
      for (let i = 1; i < data.length; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
      }
      const range = max - min || 1;

      for (let i = 0; i < data.length; i++) {
        const x = i * step;
        const normalizedY = (data[i] - min) / range;
        const y = canvas.height - (normalizedY * canvas.height);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    draw();

    return () => resizeObserver.disconnect();
  }, [data, color]);

  return (
    <div style={{ width, height }} className="relative w-full overflow-hidden rounded-lg bg-slate-900 border border-slate-800">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
