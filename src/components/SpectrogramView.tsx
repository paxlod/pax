import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { generateSpectrogram } from '../lib/signal-processing';
import { Settings2, RefreshCw, Palette } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

interface SpectrogramViewProps {
  data: number[];
  width?: number | string;
  height?: number;
  windowSize?: number;
}

const COLOR_MAPS = {
  seti: `
      // Dynamic SETI Color Mapping: Deep space blue -> Anomaly Green/Pink
      vec3 color = vec3(
        clamp(3.2 * normalized - 1.5, 0.0, 1.0), // Red channel (peaks)
        clamp(-2.5 * abs(normalized - 0.5) + 1.2, 0.0, 1.0), // Green channel (mids)
        clamp(2.5 * (0.5 - normalized), 0.0, 1.0) // Blue channel (base noise)
      );
  `,
  magma: `
      // Magma-ish
      vec3 color = vec3(
        clamp(3.0 * normalized - 0.2, 0.0, 1.0),
        clamp(3.0 * normalized - 1.0, 0.0, 1.0),
        clamp(1.5 * normalized - 0.2, 0.0, 1.0) + clamp(0.5*(1.0-normalized), 0.0, 1.0)
      );
  `,
  viridis: `
      // Viridis-ish
      vec3 color = vec3(
        clamp(2.5 * normalized - 1.0, 0.0, 1.0) + clamp(0.3 * (1.0 - normalized), 0.0, 1.0),
        clamp(2.0 * normalized, 0.0, 1.0),
        clamp(2.5 * (0.5 - normalized), 0.0, 1.0)
      );
  `,
  grayscale: `
      vec3 color = vec3(normalized);
  `,
  thermal: `
      // Thermal
      vec3 color = vec3(
        clamp(3.0 * normalized, 0.0, 1.0),
        clamp(3.0 * normalized - 1.0, 0.0, 1.0),
        clamp(3.0 * normalized - 2.0, 0.0, 1.0)
      );
  `
};

type ColorMapKey = keyof typeof COLOR_MAPS;

const getFragmentShader = (mapType: ColorMapKey) => `
    uniform sampler2D uDataTexture;
    uniform float uMaxMag;
    varying vec2 vUv;
    void main() {
      // Discard pixels outside bounds
      if (vUv.x < 0.0 || vUv.x > 1.0 || vUv.y < 0.0 || vUv.y > 1.0) {
         gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
         return;
      }
      
      // Sample the texture
      float mag = texture2D(uDataTexture, vUv).r;
      float normalized = clamp(mag / uMaxMag, 0.0, 1.0);
      
${COLOR_MAPS[mapType]}
      
      gl_FragColor = vec4(color, 1.0);
    }
`;

const getSpectrogramMaterial = (mapType: ColorMapKey) => ({
  uniforms: {
    uDataTexture: { value: null },
    uMaxMag: { value: 1.0 },
    uZoom: { value: 1.0 },
    uOffset: { value: new THREE.Vector2(0, 0) }
  },
  vertexShader: `
    varying vec2 vUv;
    uniform float uZoom;
    uniform vec2 uOffset;
    void main() {
      // Basic scaling and translating UVs for zoom/pan
      vUv = uv * uZoom + uOffset;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: getFragmentShader(mapType)
});

export function SpectrogramView({ data, width = '100%', height = 200, windowSize: initialWindowSize = 256 }: SpectrogramViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [windowSize, setWindowSize] = useState(initialWindowSize);
  const [overlap, setOverlap] = useState(Math.floor(initialWindowSize / 2));
  const [activeColorMap, setActiveColorMap] = useState<ColorMapKey>('seti');
  const materialParams = useMemo(() => getSpectrogramMaterial(activeColorMap), [activeColorMap]);
  
  // Transform states (using React states so it triggers re-renders for the uniforms)
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const resetView = useCallback(() => {
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
  }, []);

  const spectrogramData = useMemo(() => {
    if (data.length === 0) return [];
    return generateSpectrogram(data, windowSize, overlap);
  }, [data, windowSize, overlap]);

  const { dataTexture, maxMag, texWidth, texHeight } = useMemo(() => {
    if (spectrogramData.length === 0) return { dataTexture: null, maxMag: 1, texWidth: 0, texHeight: 0 };
    
    const w = spectrogramData.length;
    const h = spectrogramData[0].length;
    const size = w * h;
    const flatData = new Float32Array(size);
    
    let max = 0;
    // Map 2D array [time][freq] to 1D texture for WebGL
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
         const val = spectrogramData[x][y];
         if (val > max) max = val;
         // WebGL textures sample from bottom-left generally,
         // We'll write data linearly. 
         flatData[y * w + x] = val;
      }
    }
    
    const texture = new THREE.DataTexture(flatData, w, h, THREE.RedFormat, THREE.FloatType);
    texture.needsUpdate = true;
    
    return { dataTexture: texture, maxMag: max > 0 ? max : 1, texWidth: w, texHeight: h };
  }, [spectrogramData]);

  const uniforms = useMemo(() => {
    return {
      uDataTexture: { value: dataTexture },
      uMaxMag: { value: maxMag },
      uZoom: { value: 1.0 / zoom },
      // Translate offset back to 0..1 UV space based on zoom
      uOffset: { value: new THREE.Vector2(-offset.x / (texWidth || 1), offset.y / (texHeight || 1)) }
    };
  }, [dataTexture, maxMag, zoom, offset, texWidth, texHeight]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = Math.pow(1.1, delta / 100);
    const newZ = Math.min(Math.max(zoom * factor, 0.5), 20);
    setZoom(newZ);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
    // Scale delta relative to container dimensions
    const rect = containerRef.current.getBoundingClientRect();
    
    setOffset(prev => ({
      x: prev.x + (dx / rect.width) * (texWidth / zoom),
      y: prev.y + (dy / rect.height) * (texHeight / zoom)
    }));
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const hopSize = windowSize - overlap;
  const timeResolution = data.length > 0 ? (hopSize / data.length).toFixed(6) : "0";

  return (
    <div className="space-y-4 w-full h-full pb-4">
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden h-full flex flex-col min-h-[300px]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-sm font-medium text-slate-300">Spectral Topology (GPU Spectrogram)</h3>
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
                     type="range" min="64" max="2048" step="64"
                     value={windowSize}
                     onChange={(e) => {
                       const newSize = Number(e.target.value);
                       setWindowSize(newSize);
                       if (overlap >= newSize) setOverlap(Math.floor(newSize / 2));
                     }}
                     className="w-full accent-emerald-500"
                   />
                 </div>

                 <div>
                   <label className="text-xs text-slate-400 mb-1.5 flex justify-between">
                     Window Overlap
                     <span className="text-emerald-500 font-mono">{overlap}</span>
                   </label>
                   <input 
                     type="range" min="0" max={windowSize - 1} step="16"
                     value={overlap}
                     onChange={(e) => setOverlap(Number(e.target.value))}
                     className="w-full accent-emerald-500"
                   />
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 relative w-full border border-slate-800 rounded bg-black group overflow-hidden">
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
             {dataTexture && (
               <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }}>
                 <mesh>
                   {/* Plane that fills the screen in clip space using orthographic 1-to-1 bounds if we scale it right, 
                       or we just use a plane scale 2 to fill canonical clip volume */}
                   <planeGeometry args={[2, 2]} />
                   <shaderMaterial 
                     attach="material" 
                     args={[materialParams]} 
                     uniforms={uniforms} 
                   />
                 </mesh>
               </Canvas>
             )}
             
             {zoom !== 1.0 && (
               <div className="absolute top-2 left-2 px-2 py-1 rounded bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 pointer-events-none z-10">
                 <span className="text-[10px] font-mono text-blue-400">
                   Zoom: {zoom.toFixed(1)}x
                 </span>
               </div>
             )}
           </div>
        </div>
        
        {/* Color Map Switcher */}
        <div className="flex gap-2 mt-4 bg-slate-900 border border-slate-800 rounded-lg p-1 shrink-0">
          {(Object.keys(COLOR_MAPS) as ColorMapKey[]).map(key => (
            <button
              key={key}
              onClick={() => setActiveColorMap(key)}
              className={cn(
                "flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors",
                activeColorMap === key ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              {key}
            </button>
          ))}
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
