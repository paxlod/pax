import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getSignalLibrary, useSignal } from '../lib/signal-data';
import { WaveformView } from '../components/WaveformView';
import { SpectrogramView } from '../components/SpectrogramView';
import { SpectrumView } from '../components/SpectrumView';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Activity, Zap, Info, ShieldAlert, Binary, Volume2, Square, Radio, Wifi, Image as ImageIcon, MessageSquare, Crosshair, Play, Pause, FastForward, SlidersHorizontal, Download, Network, Database, Loader2, Cloud } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeSignal, detectPatterns } from '../lib/signal-processing';
import { ScientificNeuralModal } from '../components/ScientificNeuralModal';
import { SonificationStudio, generateSonifiedAudioURL } from '../components/SonificationStudio';
import { Brain } from 'lucide-react';
import { saveSignal } from '../services/signalService';
import { auth } from '../lib/firebase';

export function Analyzer() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const source = searchParams.get('source');

  const navigate = useNavigate();
  const { addRecentSignal, incrementStat, markSignalAsViewed } = useAppStore();
  
  const [viewMode, setViewMode] = useState<'waveform' | 'spectrogram' | 'spectrum'>('waveform');
  const [stats, setStats] = useState<{ peakAmplitude: number, rms: number, snr: number, dominantFrequency: number } | null>(null);
  const [patternData, setPatternData] = useState<{ type: string, confidence: number, period: number | null, dominantFrequencies: number[] } | null>(null);
  
  // Chunking State
  const [chunkSize, setChunkSize] = useState<number>(5000); // 5000 samples per chunk by default
  const [chunkIndex, setChunkIndex] = useState(0);

  // Quick Sonification State
  const [quickSonifyStatus, setQuickSonifyStatus] = useState<'idle' | 'generating' | 'ready'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [synthesisMode, setSynthesisMode] = useState<'fm' | 'am' | 'direct'>('fm');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [quickAudioUrl, setQuickAudioUrl] = useState<string | null>(null);
  const quickAudioRef = useRef<HTMLAudioElement>(null);

  // Modals state
  const [isScientificModalOpen, setIsScientificModalOpen] = useState(false);
  const [isSonificationStudioOpen, setIsSonificationStudioOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { signal, isLoading } = useSignal(id, source);
  const isHydrogen = signal?.metadata.category === 'Hydrogen Radio';

  // Chunking logic
  const totalSamples = signal?.data.length || 0;
  const maxChunks = chunkSize === -1 ? 1 : Math.ceil(totalSamples / chunkSize);
  // Ensure chunkIndex is within bounds if chunkSize changes
  useEffect(() => {
    if (chunkIndex >= maxChunks) {
      setChunkIndex(Math.max(0, maxChunks - 1));
    }
  }, [chunkSize, maxChunks, chunkIndex]);

  const activeData = useMemo(() => {
    return signal ? (chunkSize === -1 ? signal.data : signal.data.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize)) : [];
  }, [signal, chunkSize, chunkIndex]);

  useEffect(() => {
    if (signal && !isLoading) {
      addRecentSignal(signal.metadata.id);
      markSignalAsViewed(signal.metadata.id);
      incrementStat('signalsAnalyzed');
      // Run analysis asynchronously to not block UI
      setTimeout(() => {
        setStats(analyzeSignal(activeData));
        setPatternData(detectPatterns(activeData));
      }, 100);
    }
  }, [signal?.metadata.id, activeData, isLoading]);

  const handleSaveToCloud = async () => {
    if (!signal) return;
    if (!auth.currentUser) {
      alert("Please sign in to save signals to the cloud.");
      return;
    }

    setIsSaving(true);
    try {
      await saveSignal({
        name: signal.metadata.name,
        description: signal.metadata.description,
        category: signal.metadata.category,
        tags: [signal.metadata.category, ...Object.keys(patternData || {}).slice(0, 2)],
        parameters: JSON.stringify({ stats, patternData, chunkSize, chunkIndex }),
        data: JSON.stringify(signal.data)
      });
      alert("Signal saved to cloud successfully!");
    } catch (e) {
      console.error("Failed to save signal", e);
      alert("Failed to save signal. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Quick Sonification Generation
  const handleQuickSonifyUpdate = () => {
    if (!signal) return;
    setQuickSonifyStatus('generating');
    
    // Generate a 10s preview for quick analysis
    const url = generateSonifiedAudioURL(activeData, {
      mode: synthesisMode,
      durationSec: 10,
      carrierOsc: 440,
      fmDepth: 200,
      attack: 0.1,
      decay: 0.1,
      sustain: 0.8,
      release: 0.5,
      lfoRate: 5,
      lfoDepth: 0,
      lfoTarget: 'none',
      filterType: 'none',
      filterFreq: 2000,
      filterQ: 1
    });
    if (quickAudioUrl) URL.revokeObjectURL(quickAudioUrl);
    setQuickAudioUrl(url);
    setQuickSonifyStatus('ready');
    setIsPlaying(false);
    
    if (quickAudioRef.current) {
      quickAudioRef.current.load();
      quickAudioRef.current.playbackRate = playbackRate;
    }
  };

  const toggleQuickPlay = () => {
    if (!quickAudioUrl) {
      handleQuickSonifyUpdate();
      return;
    }
    if (quickAudioRef.current) {
      if (isPlaying) {
        quickAudioRef.current.pause();
      } else {
        quickAudioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = quickAudioRef.current;
    if (!audio) return;
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnd);
    return () => audio.removeEventListener('ended', onEnd);
  }, [quickAudioUrl]);

  useEffect(() => {
    if (quickAudioRef.current && quickAudioUrl) {
      quickAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  if (!signal) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-slate-400">
        <p>Signal not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-emerald-500">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-950 pb-20">
      <header className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-grow min-w-0 pr-4">
          {source === 'cloud' ? (
            <div className="w-full bg-slate-900 text-slate-100 font-semibold leading-tight tracking-tight uppercase italic text-sm px-3 py-1.5 rounded-lg border border-indigo-500/50 shadow-sm flex items-center justify-between">
              <span className="truncate">{signal.metadata.name}</span>
              <Cloud className="w-4 h-4 text-indigo-400 flex-shrink-0 ml-2" />
            </div>
          ) : (
            <select
              value={signal.metadata.id}
              onChange={(e) => navigate(`/analyzer/${e.target.value}`)}
              className="w-full bg-slate-900 text-slate-100 font-semibold leading-tight tracking-tight uppercase italic text-sm outline-none border border-slate-800 hover:border-slate-600 focus:border-indigo-500 transition-colors cursor-pointer appearance-none px-3 py-1.5 rounded-lg truncate shadow-sm overflow-hidden text-ellipsis"
              style={{ textOverflow: 'ellipsis' }}
            >
              {getSignalLibrary().map((s) => (
                <option key={s.metadata.id} value={s.metadata.id} className="bg-slate-900 text-slate-300 not-italic normal-case font-mono text-xs">
                  {s.metadata.name} [{s.metadata.category}]
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2 mt-1 px-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 truncate">{signal.metadata.category}</span>
            <span className="text-[10px] text-emerald-500 font-mono opacity-60 flex items-center gap-1">
              <Activity className="w-3 h-3" /> ANALYSIS_MODE
            </span>
          </div>
        </div>
        
        {source !== 'cloud' && (
          <button
            onClick={handleSaveToCloud}
            disabled={isSaving}
            className="flex-shrink-0 flex items-center justify-center p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors border border-indigo-500/20 disabled:opacity-50"
            title="Save to Cloud"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
          </button>
        )}
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Visualization */}
        <section className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-400" /> Neural Signal Visualization
            </h3>
            
            {/* Chunking UI */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg pr-1 pl-3 text-[10px] font-mono text-slate-400">
              <span className="uppercase tracking-widest font-bold">Chunk:</span>
              <div className="flex items-center">
                <button 
                  onClick={() => setChunkIndex(Math.max(0, chunkIndex - 1))}
                  disabled={chunkIndex === 0}
                  className="p-1 hover:text-indigo-400 disabled:opacity-50"
                  title="Previous Chunk"
                >◀</button>
                <span className="min-w-8 text-center text-slate-200">{chunkSize === -1 ? 'ALL' : chunkIndex + 1}/{maxChunks}</span>
                <button 
                  onClick={() => setChunkIndex(Math.min(maxChunks - 1, chunkIndex + 1))}
                  disabled={chunkIndex >= maxChunks - 1 || chunkSize === -1}
                  className="p-1 hover:text-indigo-400 disabled:opacity-50"
                  title="Next Chunk"
                >▶</button>
              </div>
              <div className="h-4 w-px bg-slate-800 mx-1"></div>
              <select
                value={chunkSize}
                onChange={(e) => {
                  setChunkSize(Number(e.target.value));
                  setChunkIndex(0);
                }}
                className="bg-transparent text-[10px] uppercase font-bold tracking-widest text-indigo-400 outline-none cursor-pointer"
              >
                <option value={1000}>1K SIZE</option>
                <option value={5000}>5K SIZE</option>
                <option value={10000}>10K SIZE</option>
                <option value={50000}>50K SIZE</option>
                <option value={-1}>FULL SIGNAL</option>
              </select>
            </div>

            <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
              <button 
                onClick={() => setViewMode('waveform')}
                className={cn(
                  "px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded transition-all",
                  viewMode === 'waveform' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Wave
              </button>
              <button 
                onClick={() => setViewMode('spectrogram')}
                className={cn(
                  "px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded transition-all",
                  viewMode === 'spectrogram' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Scan
              </button>
              <button 
                onClick={() => setViewMode('spectrum')}
                className={cn(
                  "px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded transition-all",
                  viewMode === 'spectrum' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                FFT
              </button>
            </div>
            {source !== 'cloud' && (
              <button
                onClick={handleSaveToCloud}
                disabled={isSaving}
                className="ml-2 flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:bg-emerald-500/30 transition-colors border border-emerald-500/20 disabled:opacity-50"
                title="Save to Cloud"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
              </button>
            )}
          </div>
          
          <div className="min-h-56 w-full bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            {viewMode === 'waveform' && <WaveformView data={activeData} height={224} />}
            {viewMode === 'spectrogram' && <SpectrogramView data={activeData} height={224} />}
            {viewMode === 'spectrum' && <SpectrumView data={activeData} height={224} />}
          </div>
        </section>

        {/* Sonification Analytics SECTION - ADDED */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
             <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs uppercase font-bold tracking-[0.2em] text-slate-200">Sonification Intelligence Portfolio</h3>
             </div>
             <button 
                onClick={() => setIsSonificationStudioOpen(true)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold uppercase tracking-wider"
             >
                <SlidersHorizontal className="w-3 h-3" /> Advanced Studio
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2 block">Synthesis Vector</label>
                  <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {['fm', 'am', 'direct'].map((m) => (
                      <button 
                        key={m}
                        onClick={() => { setSynthesisMode(m as any); setQuickAudioUrl(null); }}
                        className={cn(
                          "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                          synthesisMode === m ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
               </div>

               <div>
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    <span>Playback Speed</span>
                    <span className="text-emerald-400">{playbackRate.toFixed(2)}x</span>
                 </div>
                 <input 
                    type="range" min="0.1" max="2.0" step="0.1"
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none accent-emerald-500 border border-slate-800"
                 />
               </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-inner group relative overflow-hidden">
               {/* Animated background pulse when playing */}
               {isPlaying && (
                 <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500/20 animate-pulse" />
               )}
               
               {quickAudioUrl && <audio ref={quickAudioRef} src={quickAudioUrl} className="hidden" />}
               
               <div className="flex items-end gap-1 mb-4 h-6">
                 {[...Array(6)].map((_, i) => (
                   <div 
                     key={i}
                     className={cn(
                       "w-1 bg-emerald-500/50 rounded-full transition-all duration-300",
                       isPlaying ? "animate-bounce" : "h-1"
                     )}
                     style={{ 
                       height: isPlaying ? `${20 + Math.random() * 80}%` : '4px',
                       animationDelay: `${i * 0.1}s`,
                       animationDuration: `${0.5 + Math.random()}s`
                     }}
                   />
                 ))}
               </div>

               <button 
                  onClick={toggleQuickPlay}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 group-hover:shadow-emerald-500/10 z-10",
                    quickAudioUrl ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  )}
               >
                  {quickSonifyStatus === 'generating' ? (
                    <Activity className="w-8 h-8 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-8 h-8 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 ml-1 fill-current" />
                  )}
               </button>
               
               <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  {isPlaying ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> : null}
                  {quickSonifyStatus === 'idle' ? 'INIT SONIFIER' : isPlaying ? 'STREAMING' : 'READY TO STREAM'}
               </p>

               {!quickAudioUrl && (
                  <p className="mt-1 text-[9px] text-slate-600 text-center max-w-[150px]">
                    Click to initialize real-time acoustic rendering of this bitstream.
                  </p>
               )}
               
               {quickAudioUrl && (
                 <button 
                  onClick={handleQuickSonifyUpdate} 
                  className="mt-4 text-[9px] uppercase tracking-widest font-bold text-indigo-500 hover:text-indigo-400"
                 >
                    ↻ Re-render Engine
                 </button>
               )}
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            onClick={() => navigate(`/golden/${signal.metadata.id}`)}
            className="bg-black border border-emerald-500/30 hover:border-emerald-500 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 p-4 rounded-xl flex flex-col items-center gap-2 transition-all shadow-lg text-center"
          >
            <Crosshair className="w-6 h-6" />
            <span className="font-mono text-[9px] font-bold tracking-widest uppercase">Golden<br/>Decoder</span>
          </button>
          <button 
            onClick={() => navigate(`/decoder/${signal.metadata.id}`)}
            className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 p-4 rounded-xl flex flex-col items-center gap-2 transition-all group"
          >
            <ImageIcon className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Image</span>
          </button>
          <button 
            onClick={() => navigate(`/detector/${signal.metadata.id}`)}
            className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-slate-300 p-4 rounded-xl flex flex-col items-center gap-2 transition-all group"
          >
            <Zap className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Patterns</span>
          </button>
          <button 
            onClick={() => setIsScientificModalOpen(true)}
            className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-slate-300 p-4 rounded-xl flex flex-col items-center gap-2 transition-all group"
          >
            <Brain className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Scientific</span>
          </button>
          <button 
            onClick={() => navigate(`/telemetry/${signal.metadata.id}`)}
            className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 p-4 rounded-xl flex flex-col items-center gap-2 transition-all group"
          >
            <Binary className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-center leading-tight">Wow! &<br />Binary</span>
          </button>
          <button 
            onClick={() => navigate(`/interferometry/${signal.metadata.id}`)}
            className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 p-4 rounded-xl flex flex-col items-center gap-2 transition-all group"
          >
            <Network className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-center leading-tight">Multi<br />Sensor PCA</span>
          </button>
          <button 
            onClick={() => navigate(`/anomaly-detector/${signal.metadata.id}`)}
            className="bg-slate-900 border border-slate-800 hover:border-red-500/50 text-slate-300 p-4 rounded-xl flex flex-col items-center gap-2 transition-all group"
          >
            <ShieldAlert className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Anomaly</span>
          </button>
          {isHydrogen ? (
            <button 
              onClick={() => navigate(`/hydrogen`)}
              className="bg-blue-900/20 border border-blue-500/50 text-blue-400 p-4 rounded-xl flex flex-col items-center gap-2 transition-all"
            >
              <Wifi className="w-6 h-6 animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest">21cm</span>
            </button>
          ) : (
            <button 
              onClick={() => navigate(`/atlas-decoder/${signal.metadata.id}`)}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 p-4 rounded-xl flex flex-col items-center gap-2 transition-all group"
            >
              <Activity className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] uppercase font-bold tracking-widest">ATLAS</span>
            </button>
          )}
        </section>

        <ScientificNeuralModal 
          isOpen={isScientificModalOpen}
          onClose={() => setIsScientificModalOpen(false)}
          signalData={activeData}
          signalName={`${signal.metadata.name}${chunkSize !== -1 ? ` (Chunk ${chunkIndex + 1})` : ''}`}
        />

        <SonificationStudio 
          isOpen={isSonificationStudioOpen}
          onClose={() => setIsSonificationStudioOpen(false)}
          signalData={activeData}
          signalName={`${signal.metadata.name}${chunkSize !== -1 ? ` (Chunk ${chunkIndex + 1})` : ''}`}
        />

        {/* Stats */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Technical Characteristics
          </h3>
          
          {stats && patternData ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1 font-bold">Class / Pattern</div>
                <div className="font-mono text-sm uppercase flex items-center gap-2">
                  <span className={cn(
                    "font-bold",
                    patternData.type === 'artificial' ? "text-purple-400" :
                    patternData.type === 'natural' ? "text-emerald-400" : "text-slate-400"
                  )}>
                    {patternData.type}
                  </span>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    {Math.round(patternData.confidence * 100)}% CONF
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1 font-bold">Peak Amplitude</div>
                <div className="font-mono text-sm text-slate-200">{stats.peakAmplitude.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1 font-bold">RMS Power</div>
                <div className="font-mono text-sm text-slate-200">{stats.rms.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1 font-bold">Est. SNR</div>
                <div className="font-mono text-sm text-slate-200">{stats.snr.toFixed(1)} dB</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1 font-bold">Dominant Freq</div>
                <div className="font-mono text-sm text-slate-200">{stats.dominantFrequency} Hz</div>
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-slate-500 text-sm font-mono animate-pulse uppercase tracking-[0.3em]">
              Calculating Neural Weights...
            </div>
          )}
        </section>

        {/* Metadata */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" /> Origin Logs
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed italic">"{signal.metadata.description}"</p>
          
          <div className="pt-4 space-y-3 border-t border-slate-800">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-600 uppercase tracking-widest">Telescope</span>
              <span className="text-slate-300 font-bold">{signal.metadata.telescope}</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-600 uppercase tracking-widest">Timestamp</span>
              <span className="text-slate-300 font-bold">{signal.metadata.date}</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-600 uppercase tracking-widest">Coordinates</span>
              <span className="text-slate-300 font-bold">{signal.metadata.coordinates}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
