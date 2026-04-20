import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignalById } from '../lib/signal-data';
import { WaveformView } from '../components/WaveformView';
import { SpectrogramView } from '../components/SpectrogramView';
import { SpectrumView } from '../components/SpectrumView';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Activity, Zap, Info, ShieldAlert, Binary, Volume2, Square, Radio, Wifi, Image as ImageIcon, MessageSquare, Crosshair, Play, Pause, FastForward, SlidersHorizontal, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeSignal } from '../lib/signal-processing';
import { DecoderModal } from '../components/DecoderModal';
import { ScientificNeuralModal } from '../components/ScientificNeuralModal';
import { SonificationStudio, generateSonifiedAudioURL } from '../components/SonificationStudio';
import { Brain } from 'lucide-react';

export function Analyzer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addRecentSignal, incrementStat, markSignalAsViewed } = useAppStore();
  
  const [viewMode, setViewMode] = useState<'waveform' | 'spectrogram' | 'spectrum'>('waveform');
  const [stats, setStats] = useState<{ peakAmplitude: number, rms: number, snr: number, dominantFrequency: number } | null>(null);
  
  // Quick Sonification State
  const [quickSonifyStatus, setQuickSonifyStatus] = useState<'idle' | 'generating' | 'ready'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [synthesisMode, setSynthesisMode] = useState<'fm' | 'am' | 'direct'>('fm');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [quickAudioUrl, setQuickAudioUrl] = useState<string | null>(null);
  const quickAudioRef = useRef<HTMLAudioElement>(null);

  // Modals state
  const [isScientificModalOpen, setIsScientificModalOpen] = useState(false);
  const [isDecoderModalOpen, setIsDecoderModalOpen] = useState(false);
  const [isSonificationStudioOpen, setIsSonificationStudioOpen] = useState(false);
  
  const signal = id ? getSignalById(id) : undefined;
  const isHydrogen = signal?.metadata.category === 'Hydrogen Radio';

  useEffect(() => {
    if (signal) {
      addRecentSignal(signal.metadata.id);
      markSignalAsViewed(signal.metadata.id);
      incrementStat('signalsAnalyzed');
      // Run analysis asynchronously to not block UI
      setTimeout(() => {
        setStats(analyzeSignal(signal.data));
      }, 100);
    }
  }, [signal?.metadata.id]);

  // Handle Quick Sonification Generation
  const handleQuickSonifyUpdate = () => {
    if (!signal) return;
    setQuickSonifyStatus('generating');
    
    // Generate a 10s preview for quick analysis
    const url = generateSonifiedAudioURL(signal.data, 10, synthesisMode, 440, 200);
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
        <div>
          <h1 className="font-semibold text-slate-100 leading-tight tracking-tight uppercase italic text-sm">{signal.metadata.name} <span className="text-emerald-500 font-mono ml-2 opacity-50">ANALYSIS_MODE</span></h1>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{signal.metadata.category}</span>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Visualization */}
        <section className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-400" /> Neural Signal Visualization
            </h3>
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
          </div>
          
          <div className="min-h-56 w-full bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            {viewMode === 'waveform' && <WaveformView data={signal.data} height={224} />}
            {viewMode === 'spectrogram' && <SpectrogramView data={signal.data} height={224} />}
            {viewMode === 'spectrum' && <SpectrumView data={signal.data} height={224} />}
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
            onClick={() => setIsDecoderModalOpen(true)}
            className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 p-4 rounded-xl flex flex-col items-center gap-2 transition-all group"
          >
            <Binary className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Binary</span>
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
          signalData={signal.data}
          signalName={signal.metadata.name}
        />

        <DecoderModal 
          isOpen={isDecoderModalOpen}
          onClose={() => setIsDecoderModalOpen(false)}
          signalData={signal.data}
          signalName={signal.metadata.name}
        />

        <SonificationStudio 
          isOpen={isSonificationStudioOpen}
          onClose={() => setIsSonificationStudioOpen(false)}
          signalData={signal.data}
          signalName={signal.metadata.name}
        />

        {/* Stats */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Technical Characteristics
          </h3>
          
          {stats ? (
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
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
