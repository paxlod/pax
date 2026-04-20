import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignalById } from '../lib/signal-data';
import { decodeImageGolden, schmittTriggerSync, DecodeOptions, getAutocorrelationPeaks } from '../lib/signal-processing';
import { DecodedImageView } from '../components/DecodedImageView';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Crosshair, Cpu, HardDrive, Target, Settings2, Download, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { suggestDecodingParameters } from '../services/aiService';

export function GoldenDecoder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useAppStore();
  
  const signal = id ? getSignalById(id) : undefined;
  
  // Golden Decoder State
  const [lines, setLines] = useState(100);
  const [options, setOptions] = useState<DecodeOptions>({
    gamma: 1.2,
    contrast: 1.5,
    brightness: 0.1,
    transpose: false,
    flipH: false,
    flipV: false
  });
  
  const [isDecoding, setIsDecoding] = useState(true);
  const [pixels, setPixels] = useState<number[][]>([]);
  const [syncMap, setSyncMap] = useState<number[]>([]);
  
  // High-precision thresholds
  const [schmittLow, setSchmittLow] = useState(0.2);
  const [schmittHigh, setSchmittHigh] = useState(0.8);

  const performGoldenDecode = () => {
    if (!signal) return;
    setIsDecoding(true);
    
    // Simulate Worklet/Background Worker thread processing
    setTimeout(() => {
      const floatData = new Float32Array(signal.data);
      const pulses = schmittTriggerSync(floatData, schmittLow, schmittHigh);
      setSyncMap(pulses);
      
      // Haptic feedback snap
      if (navigator.vibrate) {
        navigator.vibrate(50); // Light haptic simulation
      }
      
      let decodeLines = lines;
      if (pulses.length > 5) {
         decodeLines = pulses.length;
         setLines(decodeLines);
      }

      const decoded = decodeImageGolden(signal.data, pulses, decodeLines, options);
      setPixels(decoded);
      setIsDecoding(false);
    }, 50);
  };

  useEffect(() => {
    if (signal) {
      performGoldenDecode();
    }
  }, [signal?.metadata.id, schmittLow, schmittHigh, options]);

  if (!signal) {
    return <div className="text-white p-8">Signal not found in archive.</div>;
  }

  return (
    <div className="bg-[#000000] min-h-screen text-slate-300 pb-24 font-sans selected-theme-dark overflow-y-auto lg:overflow-hidden">
      {/* Top Banner */}
      <header className="px-6 py-4 border-b border-[#333333] flex items-center justify-between sticky top-0 bg-[#000000] z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-[#111111] hover:bg-[#222222] rounded-full transition-colors border border-[#333333]">
            <ArrowLeft className="w-5 h-5 text-emerald-500" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide uppercase">
              <Crosshair className="w-5 h-5 text-emerald-500" />
              Golden Signal Decoder
            </h1>
            <span className="text-[10px] text-[#666666] uppercase tracking-[0.2em] font-mono">Precision DSP Environment</span>
          </div>
        </div>
        
        {/* Astronomical Coordinates Precise Display */}
        <div className="hidden md:flex flex-col items-end gap-1 border border-[#333333] bg-[#0A0A0A] p-2 rounded-lg">
          <div className="text-[9px] text-[#666666] uppercase tracking-widest flex items-center gap-1">
            <Target className="w-3 h-3 text-[#555555]" />
            Astrometry Lock
          </div>
          <div className="font-mono text-xs text-emerald-400">
             {signal.metadata.coordinates}
          </div>
        </div>
      </header>

      {/* Main Layout Layer */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 lg:h-[calc(100vh-80px)]">
        
        {/* Left Side: Decoder DSP Controls */}
        <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-[#222222] p-6 lg:overflow-y-auto space-y-6">
          <section className="space-y-4">
            <h3 className="text-[10px] font-mono tracking-widest text-[#888888] flex items-center gap-2">
              <Cpu className="w-3 h-3" />
              Sync Plusing [Schmitt Trigger]
            </h3>
            <div className="bg-[#111111] border border-[#222222] rounded-lg p-4 space-y-4">
               <div>
                  <label className="text-xs text-[#AAAAAA] flex justify-between font-mono">
                    <span>High Thresh (Attack)</span>
                    <span className="text-emerald-500">{schmittHigh.toFixed(2)}</span>
                  </label>
                  <input 
                    type="range" min="0.5" max="0.99" step="0.01" 
                    value={schmittHigh} onChange={(e) => setSchmittHigh(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 mt-2"
                  />
               </div>
               <div>
                  <label className="text-xs text-[#AAAAAA] flex justify-between font-mono">
                    <span>Low Thresh (Release)</span>
                    <span className="text-emerald-500">{schmittLow.toFixed(2)}</span>
                  </label>
                  <input 
                    type="range" min="0.01" max="0.49" step="0.01" 
                    value={schmittLow} onChange={(e) => setSchmittLow(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 mt-2"
                  />
               </div>
               <div className="flex items-center justify-between text-xs font-mono font-bold pt-2 border-t border-[#333333]">
                 <span className="text-[#666666]">PULSES LOCKED:</span>
                 <span className="text-white">{syncMap.length}</span>
               </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-mono tracking-widest text-[#888888] flex items-center gap-2">
              <Settings2 className="w-3 h-3" />
              DSP Matrices (Bilinear)
            </h3>
            <div className="bg-[#111111] border border-[#222222] rounded-lg p-4 space-y-4">
              <div>
                <label className="text-xs text-[#AAAAAA] flex justify-between font-mono">
                  <span>Reconstruction Lines</span>
                  <span className="text-white">{lines}</span>
                </label>
                <input 
                  type="range" min="10" max="600" step="1" 
                  value={lines} onChange={(e) => setLines(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-[#AAAAAA] flex justify-between font-mono">
                  <span>Gamma Corr.</span>
                  <span className="text-white">{options.gamma.toFixed(2)}</span>
                </label>
                <input 
                  type="range" min="0.1" max="3" step="0.1" 
                  value={options.gamma} onChange={(e) => setOptions({...options, gamma: parseFloat(e.target.value)})}
                  className="w-full accent-emerald-500 mt-2"
                />
              </div>
               <div>
                <label className="text-xs text-[#AAAAAA] flex justify-between font-mono">
                  <span>Contrast Ratio</span>
                  <span className="text-white">{options.contrast.toFixed(2)}</span>
                </label>
                <input 
                  type="range" min="0" max="5" step="0.1" 
                  value={options.contrast} onChange={(e) => setOptions({...options, contrast: parseFloat(e.target.value)})}
                  className="w-full accent-emerald-500 mt-2"
                />
              </div>
            </div>
          </section>
          
          <button 
             onClick={performGoldenDecode}
             className="w-full relative overflow-hidden bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl p-3 text-xs font-bold font-mono hover:bg-emerald-500/20 active:bg-emerald-500/30 transition-colors flex justify-center items-center gap-2"
          >
             <Zap className="w-4 h-4" />
             FORCE RE-COMPUTE DSP
          </button>
        </div>

        {/* Right Side: The Rendering View */}
        <div className="lg:col-span-3 flex flex-col bg-[#050505] min-h-[400px] lg:min-h-0">
           <div className="flex-1 overflow-hidden p-4 lg:p-8 flex flex-col">
              {isDecoding ? (
                 <div className="flex-1 text-emerald-500 font-mono animate-pulse flex flex-col items-center justify-center">
                    <Crosshair className="w-12 h-12 mb-4 animate-spin slow-spin" />
                    [ ALIGNING BILINEAR INTERPOLATION MATRICES ]
                 </div>
              ) : pixels.length > 0 ? (
                 <div className="flex-1 w-full border border-[#333333] shadow-[0_0_40px_rgba(16,185,129,0.1)] rounded overflow-hidden relative group">
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 font-mono text-[9px] text-emerald-500 uppercase tracking-widest border border-emerald-500/20 z-20 backdrop-blur-sm pointer-events-none">
                      Reconstruction Success
                    </div>
                    <div className="absolute inset-0">
                      <DecodedImageView pixels={pixels} width="100%" height="100%" />
                    </div>
                 </div>
              ) : (
                 <div className="flex-1 flex items-center justify-center text-[#444444] font-mono text-xs">NO SIGNAL LOCK.</div>
              )}
           </div>
           
           <div className="h-12 bg-[#000000] border-t border-[#222222] flex items-center px-4 font-mono text-[10px] text-[#666666] tracking-wider justify-between">
              <div className="flex gap-4">
                 <span>ENGINE: JSI-Emulated Worklet</span>
                 <span>MEMORY: Typed Array / Float32</span>
              </div>
              <span className="text-emerald-500">SCHMITT TRIGGER SYNC LOCKED</span>
           </div>
        </div>

      </div>
    </div>
  );
}
