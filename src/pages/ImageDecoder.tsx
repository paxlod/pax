import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignalById } from '../lib/signal-data';
import { decodeImage, autoDetectScanlineWidth, DecodeOptions, getAutocorrelationPeaks, cleanSignal } from '../lib/signal-processing';
import { DecodedImageView } from '../components/DecodedImageView';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Save, RefreshCw, Settings2, FlipHorizontal, FlipVertical, RotateCw, Sparkles, AlertCircle, AlertTriangle, Download, Play, Terminal, Activity, FileDigit, MoveHorizontal, MoveVertical, Sun, Contrast, SunMedium, Filter, Search, SlidersHorizontal, Upload, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { suggestDecodingParameters, analyzeDecodedImage, AIDecodeSuggestion } from '../services/aiService';
import { parseSignalFile } from '../lib/file-parser';

export function ImageDecoder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings, addSavedResult, incrementStat, addCustomSignal } = useAppStore();
  
  const signal = id ? getSignalById(id) : undefined;
  
  const [width, setWidth] = useState(100);
  const [lines, setLines] = useState(100);
  const [options, setOptions] = useState<DecodeOptions>(settings.defaultDecodeOptions);
  const [isDecoding, setIsDecoding] = useState(true);
  const [pixels, setPixels] = useState<number[][]>([]);
  const [showControls, setShowControls] = useState(true);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIDecodeSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<{ hasPattern: boolean; confidence: number; reasoning: string } | null>(null);
  const [processedData, setProcessedData] = useState<number[]>([]);
  const [isCleaned, setIsCleaned] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deep Analysis State
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [decipheredText, setDecipheredText] = useState<string>("");
  const [hexPayload, setHexPayload] = useState<string>("");
  const [patternResults, setPatternResults] = useState<{width: number, score: number}[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Auto-detect width on mount
  useEffect(() => {
    if (signal) {
      setProcessedData(signal.data);
      setIsDecoding(true);
      // Small delay to allow UI to render before heavy computation
      setTimeout(() => {
        const detectedWidth = autoDetectScanlineWidth(signal.data, 50, 200);
        setWidth(detectedWidth);
        setLines(Math.floor(signal.data.length / detectedWidth));
        setIsDecoding(false);
      }, 50);
    }
  }, [signal?.metadata.id]);

  const handleAiScan = async () => {
    if (!signal) return;
    setIsAiScanning(true);
    setAiSuggestions([]);
    setActiveSuggestionIndex(null);
    
    try {
      const peaks = getAutocorrelationPeaks(processedData, 1000);
      const suggestions = await suggestDecodingParameters(
        signal.metadata.name,
        signal.metadata.description,
        processedData.length,
        peaks
      );

      if (suggestions && suggestions.length > 0) {
        setAiSuggestions(suggestions);
        setActiveSuggestionIndex(0);
        const best = suggestions[0];
        setWidth(best.width);
        setLines(best.lines);
        if (best.gamma !== undefined) {
          setOptions(prev => ({ ...prev, gamma: best.gamma, contrast: best.contrast, brightness: best.brightness }));
        }
      }
    } catch (error) {
      console.error("AI Scan failed:", error);
    } finally {
      setIsAiScanning(false);
    }
  };

  const applySuggestion = (index: number) => {
    const suggestion = aiSuggestions[index];
    if (!suggestion) return;
    setActiveSuggestionIndex(index);
    setWidth(suggestion.width);
    setLines(suggestion.lines);
    if (suggestion.gamma !== undefined) {
      setOptions(prev => ({ ...prev, gamma: suggestion.gamma, contrast: suggestion.contrast, brightness: suggestion.brightness }));
    }
  };

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

  const handleAnalyzeImage = async () => {
    if (pixels.length === 0) return;
    setIsAnalyzingImage(true);
    
    try {
      // Create a temporary canvas to generate base64
      const canvas = document.createElement('canvas');
      const imgWidth = pixels[0].length;
      const imgHeight = pixels.length;
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgData = ctx.createImageData(imgWidth, imgHeight);
      for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
          const idx = (y * imgWidth + x) * 4;
          const val = Math.floor(pixels[y][x] * 255);
          imgData.data[idx] = val;
          imgData.data[idx + 1] = val;
          imgData.data[idx + 2] = val;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const base64 = canvas.toDataURL('image/png');
      
      const analysis = await analyzeDecodedImage(base64);
      if (analysis) {
        setImageAnalysis(analysis);
      }
    } catch (error) {
      console.error("Image analysis failed:", error);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleDownload = () => {
    if (pixels.length === 0) return;
    try {
      const canvas = document.createElement('canvas');
      const imgWidth = pixels[0].length;
      const imgHeight = pixels.length;
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgData = ctx.createImageData(imgWidth, imgHeight);
      for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
          const idx = (y * imgWidth + x) * 4;
          const val = Math.floor(pixels[y][x] * 255);
          imgData.data[idx] = val;
          imgData.data[idx + 1] = val;
          imgData.data[idx + 2] = val;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      
      const link = document.createElement('a');
      link.download = `decoded-${signal.metadata.name.replace(/\s+/g, '-').toLowerCase()}-${width}x${lines}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // --- Deep Analysis Suite Methods ---

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
      // Normalize 0-1 to -1.0 to 1.0
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

  const extractHexPayload = (data: number[], w: number) => {
    const symbols = [];
    for (let i = 3; i <= 600; i += 3) {
      if (i < data.length) {
        symbols.push(data[i] > 0.5 ? '1' : '0');
      }
    }
    const binaryString = symbols.join('');
    // It will only be up to 200 bits (600/3) now, but keeping original variable
    const first512 = binaryString.slice(0, 512);
    let hex = '';
    for (let i = 0; i < first512.length; i += 4) {
      const chunk = first512.slice(i, i + 4).padEnd(4, '0');
      hex += parseInt(chunk, 2).toString(16).toUpperCase();
    }
    return hex;
  };

  const recognizePatterns = (data: number[], minW = 5, maxW = 100) => {
    const results = [];
    for (let w = minW; w <= maxW; w++) {
      const rows = Math.floor(data.length / w);
      if (rows === 0) continue;
      
      // Calculate variance of column means to detect vertical alignment
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
      if (showDeepAnalysis) {
        setHexPayload(extractHexPayload(processedData, results[0].width));
      }
    }
  };

  const handleDeepAnalysis = () => {
    if (!signal) return;
    setDecipheredText(decipherPayload(processedData));
    setHexPayload(extractHexPayload(processedData, width));
    setPatternResults(recognizePatterns(processedData, 5, 100));
    setShowDeepAnalysis(true);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Re-decode when parameters change
  useEffect(() => {
    if (signal && !isDecoding && processedData.length > 0) {
      const decoded = decodeImage(processedData, width, lines, options);
      setPixels(decoded);
    }
  }, [processedData, width, lines, options, isDecoding]);

  const handleSave = () => {
    if (!signal) return;
    addSavedResult({
      signalId: signal.metadata.id,
      type: 'image',
      data: pixels,
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
          
          <button 
            onClick={() => navigate(-1)}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Go Back
          </button>
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
          <button 
            onClick={handleDownload}
            disabled={pixels.length === 0}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-700"
            title="Export Image"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-md mx-auto w-full pb-24">
        {/* Preview Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-medium text-slate-300">Preview</span>
            <div className="flex items-center gap-2">
              {isAiScanning && <span className="text-[10px] text-emerald-400 animate-pulse">AI Scanning...</span>}
              {(isDecoding || isAiScanning) && <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />}
            </div>
          </div>
          <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-800 bg-black relative group">
            {pixels.length > 0 && <DecodedImageView pixels={pixels} height={256} />}
            
            <button 
              onClick={handleAiScan}
              disabled={isAiScanning}
              className={cn(
                "absolute bottom-3 right-3 p-2 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 group-hover:ring-4 text-white",
                (activeSuggestionIndex !== null && aiSuggestions[activeSuggestionIndex]?.confidence < 0.7)
                  ? "bg-amber-600 hover:bg-amber-500 ring-amber-500/20" 
                  : "bg-emerald-600 hover:bg-emerald-500 ring-emerald-500/20"
              )}
              title="AI Auto-Tune"
            >
              <Sparkles className={cn("w-5 h-5", isAiScanning && "animate-pulse")} />
            </button>
            
            {(activeSuggestionIndex !== null && aiSuggestions[activeSuggestionIndex]?.confidence < 0.7) && (
              <div 
                className="absolute bottom-4 right-14 flex items-center gap-1 bg-amber-500/90 text-amber-950 px-2 py-1 rounded text-[10px] font-bold shadow-lg animate-in fade-in slide-in-from-right-2"
                title={`Low confidence: ${(aiSuggestions[activeSuggestionIndex].confidence * 100).toFixed(0)}%`}
              >
                <AlertTriangle className="w-3 h-3" />
                Low Confidence
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleAnalyzeImage}
              disabled={isAnalyzingImage || pixels.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 rounded-lg text-xs font-bold transition-colors border border-emerald-500/20"
            >
              {isAnalyzingImage ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Analyze Decoded Image
            </button>
            <button 
              onClick={handleCleanSignal}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors border",
                isCleaned 
                  ? "bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border-indigo-500/50" 
                  : "bg-slate-800 hover:bg-slate-700 text-indigo-400 border-indigo-500/20"
              )}
            >
              <Filter className="w-3 h-3" />
              {isCleaned ? "Restore Original" : "Clean Signal (Band-pass)"}
            </button>
          </div>
          
          {aiSuggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-emerald-400 text-xs">AI Parameter Suggestions</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {aiSuggestions.map((suggestion, idx) => (
                  <div 
                    key={idx}
                    onClick={() => applySuggestion(idx)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      activeSuggestionIndex === idx 
                        ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50" 
                        : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-sm text-emerald-400">{suggestion.name || `Suggestion ${idx + 1}`}</div>
                      <div className="flex items-center gap-2" title={`AI Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`}>
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full", suggestion.confidence < 0.7 ? "bg-amber-500" : "bg-emerald-500")}
                            style={{ width: `${suggestion.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 text-[10px] font-mono text-slate-400 mb-2">
                      <span>W:{suggestion.width}</span>
                      <span>L:{suggestion.lines}</span>
                      {suggestion.gamma !== undefined && <span>G:{suggestion.gamma.toFixed(1)}</span>}
                      {suggestion.contrast !== undefined && <span>C:{suggestion.contrast.toFixed(1)}</span>}
                    </div>
                    <p className="text-xs text-slate-300/80 leading-relaxed">
                      {suggestion.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {imageAnalysis && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-[10px] uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Image Content Analysis
                </div>
                <div className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">
                  Confidence: {(imageAnalysis.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <p className="text-xs text-purple-200/80 leading-relaxed">
                <span className="font-semibold text-purple-400">{imageAnalysis.hasPattern ? "Pattern Detected:" : "No Clear Pattern:"}</span> {imageAnalysis.reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Deep Analysis Suite Toggle */}
        <button 
          onClick={showDeepAnalysis ? () => setShowDeepAnalysis(false) : handleDeepAnalysis}
          className={cn(
            "w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-bold transition-colors border",
            showDeepAnalysis 
              ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400" 
              : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
          )}
        >
          <Terminal className="w-4 h-4" /> 
          {showDeepAnalysis ? "Hide Deep Analysis Suite" : "Open Deep Analysis Suite"}
        </button>

        {/* Deep Analysis Suite Content */}
        {showDeepAnalysis && (
          <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-4 animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Deep Analysis Suite
              </h3>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">ACTIVE</span>
            </div>

            {/* Audio Playback */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Play className="w-3 h-3" /> Signal Sonification
              </div>
              <button 
                onClick={playAudio}
                className={cn(
                  "w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors",
                  isPlaying 
                    ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                )}
              >
                {isPlaying ? "Stop Playback" : "Play Signal Audio"}
              </button>
              <p className="text-[10px] text-slate-500 text-center">Converts the 1D signal array into an audible 44.1kHz WAV stream.</p>
            </div>

            <div className="h-px bg-slate-800 w-full" />

            {/* Pattern Recognition */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Raster Alignment Recognition
              </div>
              <div className="grid grid-cols-3 gap-2">
                {patternResults.slice(0, 6).map((res, i) => (
                  <div 
                    key={res.width} 
                    onClick={() => setWidth(res.width)}
                    className={cn(
                      "p-2 rounded border cursor-pointer transition-colors text-center",
                      i === 0 ? "bg-indigo-500/20 border-indigo-500/50" : "bg-slate-950 border-slate-800 hover:border-slate-600"
                    )}
                    title="Click to apply this width"
                  >
                    <div className={cn("text-sm font-mono font-bold", i === 0 ? "text-indigo-400" : "text-slate-300")}>
                      W:{res.width}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Score: {res.score.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">Tests multiple widths for vertical alignment variance. Click a width to apply.</p>
            </div>

            <div className="h-px bg-slate-800 w-full" />

            {/* ASCII Deciphering */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <FileDigit className="w-3 h-3" /> Binary Payload Deciphering
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black border border-slate-800 rounded p-3 h-32 overflow-y-auto">
                  <div className="text-[10px] text-slate-500 mb-1 font-bold">ASCII</div>
                  <p className="text-xs font-mono text-emerald-500 break-all whitespace-pre-wrap">
                    {decipheredText}
                  </p>
                </div>
                <div className="bg-black border border-slate-800 rounded p-3 h-32 overflow-y-auto">
                  <div className="text-[10px] text-slate-500 mb-1 font-bold">HEX (First 512 bits)</div>
                  <p className="text-xs font-mono text-indigo-400 break-all whitespace-pre-wrap">
                    {hexPayload}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">Attempts to parse signal as 8-bit ASCII characters and extracts raw HEX payload.</p>
            </div>
          </div>
        )}

        {/* Controls Toggle */}
        <button 
          onClick={() => setShowControls(!showControls)}
          className="w-full flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-300"
        >
          <span className="flex items-center gap-2 font-medium">
            <Settings2 className="w-4 h-4" /> Parameters
          </span>
          <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
            {width}x{lines}
          </span>
        </button>

        {/* Controls */}
        {showControls && (
          <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
            {/* Dimensions */}
            <div className="space-y-5">
              <div className="flex gap-2">
                <button 
                  onClick={handleScanSpectrum}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  Scan Spectrum (Auto-Width)
                </button>
              </div>
              
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <MoveHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                    Scanline Width
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.1"
                      value={width} 
                      onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">px</span>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input 
                    type="range" min="1" max="2000" step="0.1" value={width} 
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                  />
                </div>
              </div>
              
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <MoveVertical className="w-3.5 h-3.5 text-emerald-500" />
                    Number of Lines
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={lines} 
                      onChange={(e) => setLines(Math.max(1, Number(e.target.value)))}
                      className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">px</span>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input 
                    type="range" min="1" max="2000" value={lines} 
                    onChange={(e) => setLines(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                  />
                </div>
              </div>
              
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                    Drift Compensation (Skew)
                  </label>
                  <input 
                    type="number" 
                    step="0.001"
                    value={options.skew || 0} 
                    onChange={(e) => setOptions({...options, skew: Number(e.target.value)})}
                    className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                <input 
                  type="range" min="-0.5" max="0.5" step="0.001" value={options.skew || 0} 
                  onChange={(e) => setOptions({...options, skew: Number(e.target.value)})}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                />
              </div>
            </div>

            <div className="h-px bg-slate-800/50 w-full" />

            {/* Adjustments */}
            <div className="space-y-5">
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-emerald-500" />
                    Gamma
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={options.gamma} 
                    onChange={(e) => setOptions({...options, gamma: Number(e.target.value)})}
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                <input 
                  type="range" min="0.2" max="3.0" step="0.1" value={options.gamma} 
                  onChange={(e) => setOptions({...options, gamma: Number(e.target.value)})}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                />
              </div>
              
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Contrast className="w-3.5 h-3.5 text-emerald-500" />
                    Contrast
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={options.contrast} 
                    onChange={(e) => setOptions({...options, contrast: Number(e.target.value)})}
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                <input 
                  type="range" min="0.5" max="3.0" step="0.1" value={options.contrast} 
                  onChange={(e) => setOptions({...options, contrast: Number(e.target.value)})}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                />
              </div>
              
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <SunMedium className="w-3.5 h-3.5 text-emerald-500" />
                    Brightness
                  </label>
                  <input 
                    type="number" 
                    value={options.brightness} 
                    onChange={(e) => setOptions({...options, brightness: Number(e.target.value)})}
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                <input 
                  type="range" min="-100" max="100" value={options.brightness} 
                  onChange={(e) => setOptions({...options, brightness: Number(e.target.value)})}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                />
              </div>
            </div>

            <div className="h-px bg-slate-800 w-full" />

            {/* Transforms */}
            <div className="flex gap-2">
              <button 
                onClick={() => setOptions({...options, transpose: !options.transpose})}
                className={cn("flex-1 py-2 rounded-lg flex justify-center items-center gap-2 text-sm transition-colors border", 
                  options.transpose ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-300")}
              >
                <RotateCw className="w-4 h-4" /> Transpose
              </button>
              <button 
                onClick={() => setOptions({...options, flipH: !options.flipH})}
                className={cn("flex-1 py-2 rounded-lg flex justify-center items-center gap-2 text-sm transition-colors border", 
                  options.flipH ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-300")}
              >
                <FlipHorizontal className="w-4 h-4" /> Flip H
              </button>
              <button 
                onClick={() => setOptions({...options, flipV: !options.flipV})}
                className={cn("flex-1 py-2 rounded-lg flex justify-center items-center gap-2 text-sm transition-colors border", 
                  options.flipV ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-300")}
              >
                <FlipVertical className="w-4 h-4" /> Flip V
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
