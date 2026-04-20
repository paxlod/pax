import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Cpu, Activity, BarChart3, Binary, Brain, Info, Save, Share2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { detectDeepAnomaly, calculateKurtosis } from '../lib/signal-processing';
import { cn } from '../lib/utils';

interface ScientificNeuralModalProps {
  isOpen: boolean;
  onClose: () => void;
  signalData: number[];
  signalName: string;
}

export function ScientificNeuralModal({ isOpen, onClose, signalData, signalName }: ScientificNeuralModalProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Prepare IQ Data for Constellation (simulated from 1D)
  const iqData = useMemo(() => {
    const points = [];
    // Take a slice to keep performance high
    const sampleSize = 500;
    const step = Math.floor(signalData.length / sampleSize) || 1;
    for (let i = 0; i < signalData.length - step; i += step) {
      points.push({
        i: signalData[i],
        q: signalData[i + Math.min(10, step)], // Phase shift proxy
      });
    }
    return points;
  }, [signalData]);

  const [planarReport, setPlanarReport] = useState<string>('');

  // Prepare Tri-Planar Data
  const planarData = useMemo(() => {
    const samples = 120;
    const step = Math.max(1, Math.floor(signalData.length / samples));
    
    // XY Plane: Time vs Amplitude (Temporal Projection)
    const xyPlane = [];
    for (let i = 0; i < samples; i++) {
      xyPlane.push({ x: i, y: signalData[i * step] });
    }

    // YZ Plane: Amplitude vs Frequency (Spectral Projection)
    // Simple FFT-like binning for visualization
    const yzPlane = [];
    const bins = 40;
    const binSize = Math.floor(signalData.length / bins);
    for (let i = 0; i < bins; i++) {
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        sum += Math.abs(signalData[i * binSize + j]);
      }
      yzPlane.push({ y: sum / binSize, z: i });
    }

    // XZ Plane: Time vs Frequency (Spatial Persistence)
    const xzPlane = [];
    for (let i = 0; i < samples; i++) {
      const idx = i * step;
      // We use a high-pass proxy for "z" (frequency component)
      const prev = signalData[idx - 1] || 0;
      const freqComponent = Math.abs(signalData[idx] - prev);
      xzPlane.push({ x: i, z: freqComponent });
    }

    return { xy: xyPlane, yz: yzPlane, xz: xzPlane };
  }, [signalData]);

  // Probability Density Function (Histogram)
  const pdfData = useMemo(() => {
    const bins = 20;
    const counts = new Array(bins).fill(0);
    signalData.forEach(v => {
      const b = Math.min(bins - 1, Math.max(0, Math.floor(((v + 1) / 2) * bins)));
      counts[b]++;
    });
    return counts.map((count, i) => {
      const x = (i / bins) * 2 - 1;
      // Ideal Gaussian for comparison
      const gaussian = Math.exp(-Math.pow(x, 2) / 0.1) * (signalData.length / 5);
      return { bin: x.toFixed(1), count, gaussian };
    });
  }, [signalData]);

  useEffect(() => {
    if (isOpen && signalData.length > 0) {
      handleFullDeepAnalysis();
    }
  }, [isOpen]);

  const handleFullDeepAnalysis = async () => {
    setIsAnalysing(true);
    const deepResult = detectDeepAnomaly(signalData);
    setResult(deepResult);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a neural-linked signal analyst listening to a deep-space radio telemetry stream.
      Signal Identity: ${signalName}
      
      TELEMETRY FEED (Listening):
      - Fusion Anomaly Index: ${(deepResult.score * 100).toPrecision(3)}%
      - Spectral Saliency (Z-Persistence): ${deepResult.metrics.peakSaliency.toFixed(4)}
      - Neural Correlation (Y-Coherence): ${deepResult.metrics.spectralCorrelation.toFixed(4)}
      - Sparsity Factor (X-Density): ${deepResult.metrics.sparsity.toFixed(4)}
      - SNR Variance: ${deepResult.metrics.snrFloor.toFixed(2)} dB
      
      TRI-PLANAR RECONSTRUCTION (Reading):
      - Plane XY (Temporal): ${planarData.xy.length} nodes analyzed.
      - Plane YZ (Spectral): ${planarData.yz.length} spectral bins mapped.
      - Plane XZ (Persistence): High-frequency transitions detected.
      
      Summarize the signal's multi-planar geometry. Is it a coherent message, a natural pulsar-like pulse, or artificial RFI? 
      Keep the report technical, futuristic, and formatted as a "Deep Space Reconnaissance Report".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setAnalysis(response.text || 'Could not generate report.');
    } catch (e) {
      setAnalysis('Neural Analysis failed. Check telemetry connection.');
    } finally {
      setIsAnalysing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Brain className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Neural Scientific Laboratory</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest">Multi-Factor RF Characterization</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Plane Suite */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Plane XY */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-48 relative overflow-hidden group">
              <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-700">COORD: [X,Y]</div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Plane XY: Time/Amplitude
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={planarData.xy}>
                    <Line type="monotone" dataKey="y" stroke="#10b981" strokeWidth={1} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Plane YZ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-48 relative overflow-hidden group">
              <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-700">COORD: [Y,Z]</div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Plane YZ: Amplitude/Spectral
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={planarData.yz}>
                    <Line type="stepAfter" dataKey="y" stroke="#818cf8" strokeWidth={1} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Plane XZ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-48 relative overflow-hidden group">
              <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-700">COORD: [X,Z]</div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Plane XZ: Time/Frequency
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={planarData.xz}>
                    <Area type="monotone" dataKey="z" stroke="#f59e0b" fill="#f59e0b22" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Charts */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Constellation Plot */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 h-64 flex flex-col">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Phase-Space Constellation (I/Q)
                  </h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" dataKey="i" domain={[-1.2, 1.2]} hide />
                        <YAxis type="number" dataKey="q" domain={[-1.2, 1.2]} hide />
                        <ZAxis type="number" range={[10, 10]} />
                        <Scatter name="Points" data={iqData} fill="#818cf8" opacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PDF Chart */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 h-64 flex flex-col">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Gaussianity Distribution
                  </h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pdfData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="bin" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                          itemStyle={{ fontSize: '10px' }}
                        />
                        <Area type="monotone" dataKey="gaussian" stroke="#334155" fill="#1e293b" name="Ideal Gaussian" />
                        <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b98133" name="Signal PDF" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Spectral Analytics Metrics */}
              {result && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Spectral Saliency</div>
                    <div className="text-lg font-mono font-bold text-white">{result.metrics.peakSaliency.toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Neural Correlation</div>
                    <div className="text-lg font-mono font-bold text-white">{result.metrics.spectralCorrelation.toFixed(3)}</div>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Spectral Kurtosis</div>
                    <div className="text-lg font-mono font-bold text-white">{result.metrics.avgSpectralKurtosis.toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Sparsity Factor</div>
                    <div className="text-lg font-mono font-bold text-white">{(result.metrics.sparsity * 100).toFixed(1)}%</div>
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: AI Report */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full min-h-[400px]">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    Neural Interpretation
                  </h3>
                  {isAnalysing && <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />}
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                  {isAnalysing ? (
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-800 rounded w-full animate-pulse" />
                      <div className="h-4 bg-slate-800 rounded w-[90%] animate-pulse" />
                      <div className="h-4 bg-slate-800 rounded w-[95%] animate-pulse" />
                      <div className="h-12 bg-slate-800/50 rounded w-full mt-4 flex items-center justify-center">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Running Fourier Inference...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-300 leading-relaxed font-serif italic">
                      {analysis || 'No telemetry data recovered.'}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-slate-950/50 border-t border-slate-800 rounded-b-2xl">
                  <div className="flex gap-2">
                    <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                      <Save className="w-3 h-3" /> Save Report
                    </button>
                    <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                      <Share2 className="w-3 h-3" /> Export
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap tracking-wide">AI Model: Gemini 3 Flash</span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="text-[10px] font-mono text-slate-600">
              SAMPLES: {signalData.length} | BANDWIDTH: HI-RES
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-700" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
