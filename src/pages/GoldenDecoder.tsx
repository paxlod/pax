import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignalById } from '../lib/signal-data';
import { decodeImageGolden, schmittTriggerSync, DecodeOptions, getAutocorrelationPeaks } from '../lib/signal-processing';
import { DecodedImageView } from '../components/DecodedImageView';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Crosshair, Cpu, HardDrive, Target, Settings2, Download, Zap, Brain } from 'lucide-react';
import { cn } from '../lib/utils';
import { suggestDecodingParameters, generateVisualSignature } from '../services/aiService';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

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

  const [decodeError, setDecodeError] = useState<string | null>(null);

  // Visual Signature State
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isGeneratingSignature, setIsGeneratingSignature] = useState(false);
  const [visualSignature, setVisualSignature] = useState<{ title: string; signatureSvg: string; description: string } | null>(null);

  const handleGenerateSignature = async () => {
    if (!signal || pixels.length === 0) return;
    
    setIsSignatureModalOpen(true);
    setIsGeneratingSignature(true);
    setVisualSignature(null);

    // Create a temporary canvas to get a base64 string of the current pixels
    const canvas = document.createElement('canvas');
    const width = pixels[0]?.length || 0;
    const height = pixels.length;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const val = pixels[y][x];
          const idx = (y * width + x) * 4;
          imgData.data[idx] = val;
          imgData.data[idx + 1] = val;
          imgData.data[idx + 2] = val;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const base64Image = canvas.toDataURL('image/png');
      
      const result = await generateVisualSignature(signal.metadata.name, base64Image);
      if (result) {
        setVisualSignature(result);
      } else {
        setVisualSignature({
          title: "Generation Failed",
          signatureSvg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='10' y='50' fill='red'>Error</text></svg>",
          description: "Failed to establish neural link with Nexus core to generate signature."
        });
      }
    }
    setIsGeneratingSignature(false);
  };

  const performGoldenDecode = () => {
    if (!signal) return;
    setIsDecoding(true);
    setDecodeError(null);
    
    // Simulate Worklet/Background Worker thread processing
    setTimeout(() => {
      try {
        if (!signal.data || signal.data.length < 100) {
          throw new Error("Insufficient signal data to perform decoding. Requires at least 100 samples.");
        }

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

        if (pulses.length < 2 && decodeLines <= 0) {
           throw new Error("No sync pulses detected and manual lines not set. Signal may lack clear synchronization markers.");
        }

        const decoded = decodeImageGolden(signal.data, pulses, decodeLines, options);
        if (!decoded || decoded.length === 0) {
           throw new Error("Reconstruction resulted in an empty matrix. Check signal integrity or verify Bilinear DSP parameters.");
        }

        setPixels(decoded);
      } catch (err) {
        setPixels([]);
        if (err instanceof Error) {
          setDecodeError(err.message);
        } else {
          setDecodeError("An unknown error occurred during DSP reconstruction.");
        }
      } finally {
        setIsDecoding(false);
      }
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
          
          <button 
             onClick={handleGenerateSignature}
             disabled={pixels.length === 0 || isDecoding}
             className="w-full relative overflow-hidden bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-xl p-3 text-xs font-bold font-mono hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
             <Brain className="w-4 h-4" />
             AI VISUAL SIGNATURE
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
              ) : decodeError ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-red-500/20 bg-red-500/5 rounded-xl m-4 lg:m-8 shadow-inner">
                   <Target className="w-10 h-10 text-red-500 mb-4 opacity-80" />
                   <h4 className="text-red-400 font-bold mb-2 uppercase tracking-widest text-sm">Decoding Failure</h4>
                   <p className="text-slate-400 font-mono text-xs max-w-md">{decodeError}</p>
                   <div className="mt-8 text-[10px] text-slate-500 font-mono text-left bg-black/40 p-5 rounded-lg w-full max-w-md shadow-md border border-[#222]">
                      <strong className="text-slate-300 flex items-center gap-2 mb-3">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Suggested Diagnostics:
                      </strong>
                      <ul className="list-disc pl-5 space-y-2 marker:text-[#444]">
                        <li>Lower the <span className="text-emerald-400">High Thresh (Attack)</span> in the Schmitt Trigger to detect fainter synchronization pulses.</li>
                        <li>Ensure the <span className="text-emerald-400">Reconstruction Lines</span> slider does not drop below 10.</li>
                        <li>Verify the current signal actually contains visual analog telemetry (e.g. Arecibo message style structures).</li>
                      </ul>
                   </div>
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

      {/* Visual Signature Modal */}
      <AnimatePresence>
        {isSignatureModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSignatureModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#0A0A0A]">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-slate-100 uppercase tracking-widest text-xs">AI Visual Signature Analysis</h3>
                </div>
                <button 
                  onClick={() => setIsSignatureModalOpen(false)}
                  className="p-1 text-[#666] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {isGeneratingSignature ? (
                   <div className="flex flex-col items-center justify-center py-12 gap-4">
                     <Brain className="w-12 h-12 text-indigo-500 animate-pulse" />
                     <p className="text-xs text-indigo-400 font-mono tracking-widest uppercase animate-pulse">Neural Link Establishing...</p>
                   </div>
                ) : visualSignature ? (
                  <div className="space-y-6">
                    <div className="bg-[#050505] p-6 rounded-xl border border-[#222] flex justify-center items-center h-64 overflow-hidden">
                       <div 
                         className="w-full h-full max-w-full max-h-full svg-container" 
                         dangerouslySetInnerHTML={{ __html: visualSignature.signatureSvg }} 
                       />
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-white mb-2">{visualSignature.title}</h4>
                       <p className="text-sm text-[#888] leading-relaxed">{visualSignature.description}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
