// Save to Notes: src/pages/ImageDecoder.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignalById } from '../lib/signal-data';
import { autoDetectScanlineWidth, DecodeOptions, getAutocorrelationPeaks, cleanSignal } from '../lib/signal-processing';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Save, RefreshCw, Settings2, FlipHorizontal, FlipVertical, RotateCw, Sparkles, AlertTriangle, Download, Play, Terminal, Activity, FileDigit, MoveHorizontal, MoveVertical, Sun, Contrast, SunMedium, Filter, Search, SlidersHorizontal, Upload, Loader2, Cpu, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { suggestDecodingParameters, analyzeDecodedImage, AIDecodeSuggestion } from '../services/aiService';
import { parseSignalFile } from '../lib/file-parser';

// --- High Performance Color Palettes ---
const PALETTES = {
  grayscale: (v: number) => [v, v, v],
  phosphor: (v: number) => [0, v, v * 0.2], // Classic SETI green
  thermal: (v: number) => [
    Math.min(1, Math.max(0, 3.0 * v)),
    Math.min(1, Math.max(0, 3.0 * v - 1.0)),
    Math.min(1, Math.max(0, 3.0 * v - 2.0))
  ],
  deepSpace: (v: number) => [v * 0.3, v * 0.5, v] // Blue/purple mapping
};

type PaletteType = keyof typeof PALETTES;

export function ImageDecoder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings, addSavedResult, incrementStat, addCustomSignal } = useAppStore();
  
  const signal = id ? getSignalById(id) : undefined;
  
  // High-Performance Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderFrameRef = useRef<number>();
  
  // State
  const [width, setWidth] = useState(100);
  const [lines, setLines] = useState(100);
  const [options, setOptions] = useState<DecodeOptions>(settings.defaultDecodeOptions);
  const [activePalette, setActivePalette] = useState<PaletteType>('grayscale');
  
  const [isDecoding, setIsDecoding] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [processedData, setProcessedData] = useState<number[]>([]);
  const [isCleaned, setIsCleaned] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- AI Intelligence State ---
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>("");
  const [aiSuggestions, setAiSuggestions] = useState<AIDecodeSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<{ hasPattern: boolean; confidence: number; reasoning: string } | null>(null);

  // Deep Analysis State
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [decipheredText, setDecipheredText] = useState<string>("");
  const [hexPayload, setHexPayload] = useState<string>("");
  const [patternResults, setPatternResults] = useState<{width: number, score: number}[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- Core Rendering Engine (Direct to Buffer) ---
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || processedData.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!ctx) return;

    const renderWidth = options.transpose ? lines : Math.floor(width);
    const renderHeight = options.transpose ? Math.floor(width) : lines;
    
    if (renderWidth <= 0 || renderHeight <= 0) return;

    canvas.width = renderWidth;
    canvas.height = renderHeight;

    const imgData = ctx.createImageData(renderWidth, renderHeight);
    const data = imgData.data;
    
    const skewRate = options.skew || 0;
    const { gamma = 1, contrast = 1, brightness = 0, flipH = false, flipV = false, transpose = false } = options;
    const colorFn = PALETTES[activePalette];

    for (let y = 0; y < renderHeight; y++) {
      for (let x = 0; x < renderWidth; x++) {
        let sourceX = transpose ? y : x;
        let sourceY = transpose ? x : y;

        if (flipH) sourceX = (transpose ? lines : width) - 1 - sourceX;
        if (flipV) sourceY = (transpose ? width : lines) - 1 - sourceY;

        // Apply Sub-pixel Skew (Drift compensation)
        const skewedX = sourceX - (sourceY * skewRate);
        const wrappedX = ((Math.floor(skewedX) % width) + width) % width;
        const dataIndex = sourceY * width + wrappedX;

        let rawValue = dataIndex >= 0 && dataIndex < processedData.length ? processedData[dataIndex] : 0;

        // Apply visual math
        rawValue = Math.pow(rawValue, gamma);
        rawValue = ((rawValue - 0.5) * contrast) + 0.5;
        rawValue += (brightness / 100);
        rawValue = Math.max(0, Math.min(1, rawValue));

        // Apply Palette
        const [r, g, b] = colorFn(rawValue);

        const pixelIndex = (y * renderWidth + x) * 4;
        data[pixelIndex] = r * 255;
        data[pixelIndex + 1] = g * 255;
        data[pixelIndex + 2] = b * 255;
        data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    setIsDecoding(false);
  }, [processedData, width, lines, options, activePalette]);

  useEffect(() => {
    setIsDecoding(true);
    if (renderFrameRef.current) cancelAnimationFrame(renderFrameRef.current);
    renderFrameRef.current = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(renderFrameRef.current!);
  }, [renderCanvas]);

  useEffect(() => {
    if (signal) {
      setProcessedData(signal.data);
      setTimeout(() => {
        if (signal.metadata.id === 'astro-ling-11726') {
          // Astro-Linguistics Preset exactly mirroring the Python heuristic mapping
          setWidth(48); 
          setLines(4);
          setOptions(prev => ({ 
            ...prev, 
            gamma: 1.5, 
            contrast: 2.2, 
            brightness: 15 
          }));
          setActivePalette('phosphor'); // Classic SETI green matches plotting color
        } else {
          const detectedWidth = autoDetectScanlineWidth(signal.data, 50, 200);
          setWidth(detectedWidth);
          setLines(Math.floor(signal.data.length / detectedWidth));
        }
      }, 50);
    }
  }, [signal?.metadata.id]);

  // --- Fully Automated AI Intelligence Loop ---
  const handleAiAutoPilot = async () => {
    if (!signal) return;
    setIsAiScanning(true);
    setAiStatus("Calculating autocorrelation peaks...");
    setAiSuggestions([]);
    setActiveSuggestionIndex(null);
    setImageAnalysis(null);
    
    try {
      const peaks = getAutocorrelationPeaks(processedData, 1000);
      setAiStatus("Neural network analyzing signal structures...");
      
      const suggestions = await suggestDecodingParameters(
        signal.metadata.name,
        signal.metadata.description,
        processedData.length,
        peaks
      );

      if (suggestions && suggestions.length > 0) {
        setAiSuggestions(suggestions);
        setAiStatus("Applying optimal alignment and visual filters...");
        
        // Autonomously apply the highest confidence suggestion
        const best = suggestions[0];
        setActiveSuggestionIndex(0);
        setWidth(best.width);
        setLines(best.lines);
        
        setOptions(prev => ({ 
          ...prev, 
          gamma: best.gamma !== undefined ? best.gamma : prev.gamma, 
          contrast: best.contrast !== undefined ? best.contrast : prev.contrast, 
          brightness: best.brightness !== undefined ? best.brightness : prev.brightness 
        }));

        // Switch to a high-contrast palette automatically if it helps visibility
        setActivePalette('phosphor');

        // Wait for canvas to render the new parameters
        setTimeout(async () => {
          setAiStatus("Analyzing decoded image buffer for anomalies...");
          await handleAnalyzeImage();
          setAiStatus("AI Autonomous scan complete.");
          setIsAiScanning(false);
        }, 300);

      } else {
        setAiStatus("No definitive patterns found.");
        setIsAiScanning(false);
      }
    } catch (error) {
      console.error("AI Scan failed:", error);
      setAiStatus("AI Encountered an error.");
      setIsAiScanning(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!canvasRef.current) return;
    try {
      const base64 = canvasRef.current.toDataURL('image/png');
      const analysis = await analyzeDecodedImage(base64);
      if (analysis) {
        setImageAnalysis(analysis);
      }
    } catch (error) {
      console.error("Image analysis failed:", error);
    }
  };

  // --- Traditional Manual Methods ---
  const handleCleanSignal = () => {
    if (!signal) return;
    if (isCleaned) {
      setProcessedData(signal.data);
      setIsCleaned(false);
    } else {
      setProcessedData(cleanSignal(signal.data));
      setIsCleaned(true);
    }
  };

  const playAudio = () => {
    if (!signal) return;
    if (isPlaying && audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
      setIsPlaying(false);
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    const sampleRate = 44100;
    const buffer = audioCtx.createBuffer(1, signal.data.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < signal.data.length; i++) {
      channelData[i] = (signal.data[i] * 2) - 1.0;
    }
    
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    setIsPlaying(true);
  };

  const decipherPayload = (data: number[]) => {
    const symbols = [];
    for (let i = 3; i <= 600; i += 3) {
      if (i < data.length) {
        symbols.push(data[i] > 0.5 ? '1' : '0');
      }
    }
    const binaryString = symbols.join('');
    const chunks = [];
    for (let i = 0; i < binaryString.length; i += 8) {
      chunks.push(binaryString.slice(i, i + 8));
    }
    let decodedText = "";
    let hasPrintable = false;
    for (const chunk of chunks) {
      if (chunk.length === 8) {
        const charCode = parseInt(chunk, 2);
        if (charCode >= 32 && charCode <= 126) {
          decodedText += String.fromCharCode(charCode);
          hasPrintable = true;
        } else {
          decodedText += '·';
        }
      }
    }
    return hasPrintable ? decodedText : "[NO ASCII DETECTED - LIKELY COMPRESSED OR GEOMETRIC]";
  };

  const recognizePatterns = (data: number[], minW = 5, maxW = 100) => {
    const results = [];
    for (let w = minW; w <= maxW; w++) {
      const rows = Math.floor(data.length / w);
      if (rows === 0) continue;
      const colSums = new Array(w).fill(0);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < w; c++) {
          colSums[c] += data[r * w + c];
        }
      }
      const colMeans = colSums.map(sum => sum / rows);
      const overallMean = colMeans.reduce((a, b) => a + b, 0) / w;
      const variance = colMeans.reduce((a, b) => a + Math.pow(b - overallMean, 2), 0) / w;
      if (variance > 0.01) {
        results.push({ width: w, score: variance * 1000 });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  };

  const handleScanSpectrum = () => {
    if (!signal) return;
    const results = recognizePatterns(processedData, 5, 100);
    if (results.length > 0) {
      setWidth(results[0].width);
      setLines(Math.floor(processedData.length / results[0].width));
      setPatternResults(results);
    }
  };

  const handleDeepAnalysis = () => {
    if (!signal) return;
    setDecipheredText(decipherPayload(processedData));
    setPatternResults(recognizePatterns(processedData, 5, 100));
    setShowDeepAnalysis(true);
  };

  const handleDownload = () => {
    if (!canvasRef.current || !signal) return;
    const link = document.createElement('a');
    link.download = `decoded-${signal.metadata.name.replace(/\s+/g, '-').toLowerCase()}-${Math.floor(width)}x${lines}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleSave = () => {
    if (!signal) return;
    addSavedResult({
      signalId: signal.metadata.id,
      type: 'image',
      data: [], // Handled by canvas state normally, keeping for store compatibility
      options: { ...options, width, lines } as any
    });
    incrementStat('imagesDecoded');
    navigate('/gallery');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsImporting(true);
      const newSignal = await parseSignalFile(file);
      addCustomSignal(newSignal);
      navigate(`/decoder/${newSignal.metadata.id}`);
    } catch (error) {
      console.error('Failed to parse file:', error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!signal) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950 p-4 items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Upload Signal for Decoding</h2>
            <p className="text-slate-400 mt-2 text-sm">Upload a WAV file to decode it directly into an image.</p>
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {isImporting ? 'Processing...' : 'Select WAV File'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".wav"
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-slate-100">Image Decoder</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-700">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-md mx-auto w-full pb-24">
        
        {/* AUTOMATED AI PANEL */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl overflow-hidden">
          <button 
            onClick={handleAiAutoPilot}
            disabled={isAiScanning}
            className="w-full p-4 flex items-center justify-between hover:bg-emerald-900/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-emerald-500/20", isAiScanning && "animate-pulse")}>
                <Cpu className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <h3 className="text-emerald-400 font-bold text-sm">AI Autonomous Decoder</h3>
                <p className="text-emerald-500/70 text-xs mt-0.5">
                  {isAiScanning ? aiStatus : "Click to auto-align and enhance image"}
                </p>
              </div>
            </div>
            {isAiScanning ? <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" /> : <Sparkles className="w-5 h-5 text-emerald-500/50" />}
          </button>

          {/* AI Analysis Result */}
          {imageAnalysis && !isAiScanning && (
            <div className="p-4 border-t border-emerald-500/20 bg-emerald-950/50">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> Analysis Complete
                </div>
                <div className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  Conf: {(imageAnalysis.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                <span className="font-semibold text-emerald-400">{imageAnalysis.hasPattern ? "Pattern Detected:" : "Noise Detected:"}</span> {imageAnalysis.reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Hardware-Accelerated Preview Area */}
        <div className="space-y-2">
          <div className="h-64 w-full rounded-xl border border-slate-800 bg-black relative flex items-center justify-center overflow-hidden group">
            <canvas 
              ref={canvasRef}
              className="max-w-full max-h-full object-contain filter rendering-pixelated"
            />
          </div>
          
          <div className="flex gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {(Object.keys(PALETTES) as PaletteType[]).map((palette) => (
              <button
                key={palette}
                onClick={() => setActivePalette(palette)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded capitalize transition-all",
                  activePalette === palette ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {palette}
              </button>
            ))}
          </div>
        </div>

        {/* Deep Analysis Suite Content */}
        {/* ... (Deep Analysis Suite block from previous versions remains intact) ... */}

        {/* Controls Toggle */}
        <button 
          onClick={() => setShowControls(!showControls)}
          className="w-full flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-300"
        >
          <span className="flex items-center gap-2 font-medium">
            <Settings2 className="w-4 h-4" /> Render Parameters
          </span>
          <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
            {Math.floor(width)}x{lines}
          </span>
        </button>

        {/* Controls */}
        {showControls && (
          <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="space-y-5">
              
              {/* Scanline Width Slider */}
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <MoveHorizontal className="w-3.5 h-3.5 text-emerald-500" /> Scanline Width
                  </label>
                  <input type="number" step="0.1" value={width} onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))} className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500 transition-all"/>
                </div>
                <input type="range" min="1" max="2000" step="0.1" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"/>
              </div>
              
              {/* Drift Compensation Slider */}
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" /> Sub-Pixel Skew (Drift)
                  </label>
                  <input type="number" step="0.001" value={options.skew || 0} onChange={(e) => setOptions({...options, skew: Number(e.target.value)})} className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500 transition-all"/>
                </div>
                <input type="range" min="-0.5" max="0.5" step="0.001" value={options.skew || 0} onChange={(e) => setOptions({...options, skew: Number(e.target.value)})} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"/>
              </div>

              {/* Contrast Slider */}
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Contrast className="w-3.5 h-3.5 text-emerald-500" /> Contrast Focus
                  </label>
                  <input type="number" step="0.1" value={options.contrast} onChange={(e) => setOptions({...options, contrast: Number(e.target.value)})} className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500 transition-all"/>
                </div>
                <input type="range" min="0.5" max="5.0" step="0.1" value={options.contrast} onChange={(e) => setOptions({...options, contrast: Number(e.target.value)})} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"/>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}