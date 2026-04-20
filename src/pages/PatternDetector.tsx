import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignalById } from '../lib/signal-data';
import { detectPatterns, getAutocorrelationPeaks } from '../lib/signal-processing';
import { WaveformView } from '../components/WaveformView';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Save, AlertTriangle, CheckCircle2, HelpCircle, Sparkles, Info, ExternalLink } from 'lucide-react';
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

  useEffect(() => {
    if (signal) {
      setIsAnalyzing(true);
      setTimeout(() => {
        setResult(detectPatterns(signal.data));
        setIsAnalyzing(false);
      }, 500); // Artificial delay for effect
    }
  }, [signal?.metadata.id]);

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

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2">Detected Periodicity</div>
                {result.period ? (
                  <div className="text-2xl font-mono text-slate-200">{result.period} <span className="text-sm text-slate-500">samples</span></div>
                ) : (
                  <div className="text-lg text-slate-400">None detected</div>
                )}
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2">Top Frequency</div>
                {result.dominantFrequencies.length > 0 ? (
                  <div className="text-2xl font-mono text-slate-200">{result.dominantFrequencies[0]} <span className="text-sm text-slate-500">Hz</span></div>
                ) : (
                  <div className="text-lg text-slate-400">N/A</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
