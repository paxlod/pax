import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSignalById, getSignalLibrary } from '../lib/signal-data';
import { detectDeepAnomaly, detectCyclostationarity, detectVocoderArtifacts } from '../lib/signal-processing';
import { ArrowLeft, ShieldAlert, Cpu, Activity, Waves, Binary, Zap, Volume2, Info, Search, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { SpectrogramView } from '../components/SpectrogramView';

export function AnomalyDetector() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeSignalId, setActiveSignalId] = useState<string | null>(id || null);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<{
    anomaly: ReturnType<typeof detectDeepAnomaly>,
    cyclostationary: ReturnType<typeof detectCyclostationarity>,
    vocoder: ReturnType<typeof detectVocoderArtifacts>
  } | null>(null);

  const signal = activeSignalId ? getSignalById(activeSignalId) : null;
  const library = getSignalLibrary();

  const handleScan = () => {
    if (!signal) return;
    setIsScanning(true);
    setResults(null);
    
    setTimeout(() => {
      const anomaly = detectDeepAnomaly(signal.data);
      const cyclostationary = detectCyclostationarity(signal.data);
      const vocoder = detectVocoderArtifacts(signal.data);
      
      setResults({ anomaly, cyclostationary, vocoder });
      setIsScanning(false);
    }, 2500);
  };

  useEffect(() => {
    if (activeSignalId) {
      setResults(null);
    }
  }, [activeSignalId]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 pb-20">
      <header className="p-4 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-20 backdrop-blur-md flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-slate-100">Advanced Anomaly Discovery</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">RF & Bio-Synthetic Detection Suite</p>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Signal Selection */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold">Active Signal Payload</h2>
            </div>
            <select 
              className="bg-slate-800 border-none rounded text-xs p-1 focus:ring-1 focus:ring-indigo-500"
              value={activeSignalId || ''}
              onChange={(e) => setActiveSignalId(e.target.value)}
            >
              <option value="" disabled>Select from library...</option>
              {library.map(s => (
                <option key={s.metadata.id} value={s.metadata.id}>{s.metadata.name}</option>
              ))}
            </select>
          </div>
          
          {signal ? (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-100">{signal.metadata.name}</h3>
                  <p className="text-xs text-slate-500 italic">{signal.metadata.category} | {signal.metadata.telescope}</p>
                </div>
                <div className="bg-slate-800/50 px-2 py-1 rounded text-[10px] font-mono border border-slate-700">
                  {signal.data.length} SAMPLES
                </div>
              </div>
              
              <div className="h-32 bg-black/40 rounded-lg overflow-hidden border border-slate-800">
                <SpectrogramView data={signal.data} height={128} />
              </div>

              <button 
                onClick={handleScan}
                disabled={isScanning}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-all",
                  isScanning 
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                )}
              >
                {isScanning ? (
                  <>
                    <Activity className="w-4 h-4 animate-pulse" />
                    Running Neural Models...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Run Deep Analysis
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-8 text-center space-y-2">
              <Info className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-sm text-slate-500">Please select a signal payload from the library to begin analysis.</p>
            </div>
          )}
        </section>

        {/* Scan Results */}
        <AnimatePresence>
          {results && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* DeepSig Anomaly Results */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    results.anomaly.score > 0.5 ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"
                  )}>
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">OmniSIG Anomaly Engine</h2>
                    <p className="text-xs text-slate-500">Neural spectrum anomaly classification</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-black/40 p-4 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Anomaly Confidence</div>
                    <div className="text-2xl font-mono font-bold">{(results.anomaly.score * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">State</div>
                    <div className={cn(
                      "text-sm font-bold",
                      results.anomaly.score > 0.6 ? "text-red-400" : "text-emerald-400"
                    )}>
                      {results.anomaly.score > 0.6 ? "ALERT: ARTIFICIAL" : "NOMINAL: NATURAL"}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-300 italic border-l-2 border-indigo-500 pl-3">
                  "{results.anomaly.description}"
                </p>

                {/* New Scientific Evidence Panel */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Library className="w-3 h-3" />
                    Neural Scientific Evidence
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/50">
                      <div className="text-[8px] text-slate-500 uppercase">Spectral Saliency</div>
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {results.anomaly.metrics.peakSaliency.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/50">
                      <div className="text-[8px] text-slate-500 uppercase">Neural Correlation</div>
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {results.anomaly.metrics.spectralCorrelation.toFixed(4)}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/50">
                      <div className="text-[8px] text-slate-500 uppercase">Sparsity Factor</div>
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {(results.anomaly.metrics.sparsity * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/50">
                      <div className="text-[8px] text-slate-500 uppercase">SNR Floor (dB)</div>
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {results.anomaly.metrics.snrFloor.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* RF Periodicity & Bio-Synthetic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Binary className="w-4 h-4 text-amber-400" />
                    Cyclostationary Features
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Hidden Periodicities</span>
                      <span className="text-slate-200">{results.cyclostationary.hiddenFreqs.length} detected</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-amber-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${results.cyclostationary.periodicityScore * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Detecting man-made signals (headers/pilot tones) at low power levels.
                    </div>
                  </div>
                </section>

                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    Bio-Synthetic Analysis
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Vocoder Texture Score</span>
                      <span className="text-slate-200">{(results.vocoder.roboticTextureScore * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${results.vocoder.roboticTextureScore * 100}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-[8px] text-slate-500 bg-black/20 p-1 rounded">
                        FLUX: {results.vocoder.flux.toFixed(4)}
                      </div>
                      <div className="text-[8px] text-slate-500 bg-black/20 p-1 rounded">
                        CENTROID: {results.vocoder.centroid.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Framework Insights */}
              <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Neural Analytics Framework</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Cpu className="w-5 h-5 text-indigo-400 mt-1" />
                    <div>
                      <h4 className="text-sm font-semibold">ResNet Spectrogram Classifier</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Processes 2D spectrogram fragments to differentiate between natural stochastic noise and synthetic transmitter signatures.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Waves className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <h4 className="text-sm font-semibold">Phase Distortion Tracker</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Detects lack of natural vocal "jitter" and temporal inconsistencies common in vocoder-extracted signals.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
