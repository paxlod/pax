import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignalById } from '../lib/signal-data';
import { detectPatterns, getAutocorrelationPeaks } from '../lib/signal-processing';
import { WaveformView } from '../components/WaveformView';
import { SpectrumView } from '../components/SpectrumView';
import { AutocorrelationView } from '../components/AutocorrelationView';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Save, AlertTriangle, CheckCircle2, HelpCircle, Sparkles, Info, ExternalLink, Activity, Radio, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeSignalWithAI } from '../services/aiService';

export function PatternDetector() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addSavedResult, incrementStat } = useAppStore();
  
  const signal = id ? getSignalById(id) : undefined;
  const [result, setResult] = useState<ReturnType<typeof detectPatterns> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{ classification: string; reasoning: string; recommendation: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'classification' | 'autocorrelation' | 'spectrum' | 'peaks'>('classification');

  useEffect(() => {
    if (signal) {
      setIsAnalyzing(true);
      setTimeout(() => {
        setResult(detectPatterns(signal.data));
        setIsAnalyzing(false);
      }, 500); // Artificial delay for effect
    }
  }, [signal?.metadata.id]);

  const rawPeaks = useMemo(() => {
    if (!signal) return [];
    // Identify peaks that exceed 0.8 and are separated by 20 samples
    const findPeaks = (data: number[], threshold: number, minDistance: number): number[] => {
      const peaks: number[] = [];
      for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
          if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
            peaks.push(i);
          }
        }
      }
      return peaks;
    };
    return findPeaks(signal.data, 0.8, 20);
  }, [signal]);

  const handleAiAnalysis = async () => {
    if (!signal || !result) return;
    setIsAiAnalyzing(true);
    
    try {
      const mean = signal.data.reduce((a, b) => a + b, 0) / signal.data.length;
      const stdDev = Math.sqrt(signal.data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / signal.data.length);
      const peaks = getAutocorrelationPeaks(signal.data, 500);
      
      const analysis = await analyzeSignalWithAI(
        signal.metadata.name,
        signal.metadata.description,
        {
          mean,
          stdDev,
          peaks,
          dominantFrequencies: result.dominantFrequencies
        }
      );
      
      if (analysis) {
        setAiResult(analysis);
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!signal || !result) return;
    addSavedResult({
      signalId: signal.metadata.id,
      type: 'pattern',
      data: result
    });
    incrementStat('patternsFound');
    navigate('/gallery');
  };

  if (!signal) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'artificial': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'natural': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'artificial': return <AlertTriangle className="w-8 h-8 text-emerald-500" />;
      case 'natural': return <CheckCircle2 className="w-8 h-8 text-blue-500" />;
      default: return <HelpCircle className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-slate-100">Pattern Detector</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </header>

      <div className="p-4 space-y-6 max-w-md mx-auto w-full">
        <div className="h-40 w-full">
          <WaveformView data={signal.data} height={160} color="#a855f7" />
        </div>

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-slate-400 font-medium animate-pulse">Running autocorrelation analysis...</p>
          </div>
        ) : result ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Analysis Tabs */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button 
                onClick={() => setActiveTab('classification')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'classification' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Sparkles size={14} /> Result
              </button>
              <button 
                onClick={() => setActiveTab('autocorrelation')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'autocorrelation' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Activity size={14} /> Temporal
              </button>
              <button 
                onClick={() => setActiveTab('spectrum')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'spectrum' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Radio size={14} /> Spectral
              </button>
              <button 
                onClick={() => setActiveTab('peaks')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'peaks' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Zap size={14} /> Peaks
              </button>
            </div>

            {activeTab === 'classification' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Classification Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center text-center space-y-4">
                  {getTypeIcon(result.type)}
                  <div>
                    <h2 className="text-sm text-slate-400 mb-1">Classification</h2>
                    <div className={cn("inline-flex px-4 py-1.5 rounded-full border font-bold uppercase tracking-widest text-lg", getTypeColor(result.type))}>
                      {result.type}
                    </div>
                  </div>
                  
                  <div className="w-full pt-4 border-t border-slate-800">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400">Confidence</span>
                      <span className="text-slate-200 font-mono">{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", result.type === 'artificial' ? 'bg-emerald-500' : result.type === 'natural' ? 'bg-blue-500' : 'bg-slate-500')}
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* AI Analysis Section */}
                {!aiResult ? (
                  <button 
                    onClick={handleAiAnalysis}
                    disabled={isAiAnalyzing}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Sparkles className={cn("w-5 h-5", isAiAnalyzing && "animate-spin")} />
                    {isAiAnalyzing ? "AI Researcher Analyzing..." : "Deep AI Signal Analysis"}
                  </button>
                ) : (
                  <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      AI Researcher Report
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">AI Classification</div>
                        <div className="text-lg font-bold text-slate-100">{aiResult.classification}</div>
                      </div>
                      
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Reasoning</div>
                        <p className="text-xs text-slate-400 leading-relaxed italic">"{aiResult.reasoning}"</p>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Recommendation</div>
                        <div className="flex items-start gap-2 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-emerald-300 font-medium">{aiResult.recommendation}</p>
                        </div>
                      </div>

                      {aiResult.recommendation.toLowerCase().includes('decode') && (
                        <button 
                          onClick={() => navigate(`/image-decoder/${signal.metadata.id}`)}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold transition-colors border border-emerald-500/20"
                        >
                          Open Image Decoder <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Details Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Period</div>
                    {result.period ? (
                      <div className="text-xl font-mono text-slate-200">{result.period} <span className="text-[10px] text-slate-500">samples</span></div>
                    ) : (
                      <div className="text-sm text-slate-500">Not detected</div>
                    )}
                  </div>
                  
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Top Freq</div>
                    {result.dominantFrequencies.length > 0 ? (
                      <div className="text-xl font-mono text-slate-200">{result.dominantFrequencies[0]} <span className="text-[10px] text-slate-500">Hz</span></div>
                    ) : (
                      <div className="text-sm text-slate-500">N/A</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'autocorrelation' && (
              <div className="animate-in fade-in duration-300 space-y-4">
                <AutocorrelationView data={signal.data} height={300} maxLag={Math.min(1000, Math.floor(signal.data.length / 2))} />
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                   <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Detected Periodic Peaks</h4>
                   <div className="flex flex-wrap gap-2">
                     {getAutocorrelationPeaks(signal.data, 500).map(lag => (
                       <span key={lag} className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded text-xs font-mono">
                         Lag: {lag}
                       </span>
                     ))}
                     {getAutocorrelationPeaks(signal.data, 500).length === 0 && (
                       <span className="text-xs text-slate-600 italic">No significant periodic peaks detected in local autocorrelation.</span>
                     )}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'spectrum' && (
              <div className="animate-in fade-in duration-300 space-y-4">
                <SpectrumView data={signal.data} height={300} />
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                   <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Dominant Harmonics</h4>
                   <div className="space-y-2">
                     {result.dominantFrequencies.map((f, i) => (
                       <div key={i} className="flex justify-between items-center text-xs">
                         <span className="text-slate-400">Peak #{i+1}</span>
                         <span className="text-cyan-400 font-mono font-bold">{f} Hz</span>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'spectrum' && (
              <div className="animate-in fade-in duration-300 space-y-4">
                <SpectrumView data={signal.data} height={300} />
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                   <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Dominant Harmonics</h4>
                   <div className="space-y-2">
                     {result.dominantFrequencies.map((f, i) => (
                       <div key={i} className="flex justify-between items-center text-xs">
                         <span className="text-slate-400">Peak #{i+1}</span>
                         <span className="text-cyan-400 font-mono font-bold">{f} Hz</span>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'peaks' && (
              <div className="animate-in fade-in duration-300 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                       <Zap className="w-4 h-4 text-orange-400" />
                       Significant Transients
                    </h3>
                    <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-bold rounded-full border border-orange-500/20">
                      Thresh: 0.8 | Dist: 20
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Detected high-intensity pulses in the raw signal. These indices point to major energy bursts or sharp alphanumeric boundaries.
                  </p>

                  <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {rawPeaks.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {rawPeaks.map((peak, idx) => (
                          <div 
                            key={peak} 
                            className="bg-slate-800/50 border border-slate-700/50 rounded p-2 text-center"
                          >
                            <div className="text-[10px] text-slate-500 mb-0.5">#{idx + 1}</div>
                            <div className="text-sm font-mono text-emerald-400 font-bold">{peak}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-slate-950/50 rounded-lg border border-dashed border-slate-800">
                        <p className="text-slate-600 text-sm">No peaks found exceeding 0.8 intensity.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
                   <div className="flex gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg h-fit">
                         <Info className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                         <h4 className="text-xs font-bold text-slate-200 mb-1">Observation</h4>
                         <p className="text-xs text-slate-400 leading-relaxed italic">
                           Transient peaks at these locations represent binary transitions or character start-frames in astro-linguistic sequences.
                         </p>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
