import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BrainCircuit, Waves, Binary, ArrowRight, Play, Pause, Image as ImageIcon, Download, ClipboardList, Zap, Microscope, X } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Signal } from '../lib/signal-data';
import { decodeImage, extractBinary, binaryToAscii } from '../lib/signal-processing';
import { generateSonifiedAudioURL } from '../components/SonificationStudio';
import { DecodedImageView } from '../components/DecodedImageView';
import { cn } from '../lib/utils';

interface LabReportProps {
  signal: Signal;
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (id: string) => void;
}

function LabReportModal({ signal, isOpen, onClose, onAnalyze }: LabReportProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-4xl bg-[#0a0a0c] border border-indigo-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.15)] flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <Microscope className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{signal.metadata.name}</h2>
                  <p className="text-xs text-indigo-400 font-mono">LAB_REPORT // {signal.metadata.id}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-indigo-500/20">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                  <BrainCircuit className="w-4 h-4" /> Neural Analysis Summary
                </div>
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5 italic text-slate-300 leading-relaxed text-[15px]">
                  "{(signal.metadata as any).aiReasoning || "No autonomous reasoning log found for this signal."}"
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                    <Zap className="w-4 h-4" /> Signal Diagnostics
                  </div>
                  <div className="bg-slate-900 shadow-inner rounded-2xl p-5 border border-white/5 space-y-3 font-mono text-sm">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-slate-500">Frequency:</span>
                      <span className="text-indigo-400">{signal.metadata.frequency}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-slate-500">Origin:</span>
                      <span className="text-indigo-400">{signal.metadata.coordinates}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-slate-500">Telescope:</span>
                      <span className="text-indigo-400">{signal.metadata.telescope}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Capture Date:</span>
                      <span className="text-indigo-400">{signal.metadata.date}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                    <ClipboardList className="w-4 h-4" /> Description
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5 h-full text-slate-400 text-sm leading-relaxed">
                    {signal.metadata.description}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <button 
                  onClick={() => onAnalyze(signal.metadata.id)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_10px_20px_rgba(79,70,229,0.2)]"
                >
                  <ArrowRight className="w-5 h-5" />
                  INITIATE DEEP ANALYTIC BROADCAST
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function DiscoveryCard({ signal, onAnalyze }: { signal: Signal, onAnalyze: (id: string) => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // Derive static previews
  const imagePreview = useMemo(() => {
    // Attempt multiple widths to find a decent one or just use a square default
    const width = Math.floor(Math.sqrt(signal.data.length));
    const lines = Math.floor(signal.data.length / width);
    return decodeImage(signal.data, width, lines, { gamma: 1.2, contrast: 1.5, brightness: 0, flipH: false, flipV: false, transpose: false });
  }, [signal]);

  const textPreview = useMemo(() => {
    return binaryToAscii(extractBinary(signal.data, 8));
  }, [signal]);

  useEffect(() => {
      const url = generateSonifiedAudioURL(signal.data, 10, 'fm', 440, 200);
      setAudioUrl(url);
      return () => { if(url) URL.revokeObjectURL(url); }
  }, [signal]);

  useEffect(() => {
      const el = audioRef.current;
      if (!el) return;
      const handleEnded = () => setIsPlaying(false);
      el.addEventListener('ended', handleEnded);
      return () => el.removeEventListener('ended', handleEnded);
  }, [audioUrl]);

  const toggleSound = () => {
      if(!audioRef.current) return;
      if (isPlaying) {
          audioRef.current.pause();
      } else {
          audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0f1115] border border-white/5 rounded-[2rem] overflow-hidden hover:border-indigo-500/50 transition-all duration-500 group shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
      >
        <div className="p-6 border-b border-white/5 bg-slate-900/30 flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold tracking-widest uppercase">
                AI Discovery
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{signal.metadata.id}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{signal.metadata.name}</h3>
            <p className="text-sm text-slate-400 line-clamp-1 mt-1 font-sans">{signal.metadata.description}</p>
          </div>
          <button 
              onClick={() => setIsReportOpen(true)}
              className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-white/5 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm"
              title="Open Detailed Lab Report"
          >
              <ClipboardList className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Render Preview */}
            <div className="space-y-3">
                <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5" /> Visual Capture
                </div>
                <div className="bg-black border border-white/5 rounded-2xl p-2 h-40 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-indigo-500/20 transition-colors">
                    {imagePreview && imagePreview.length > 0 ? (
                        <DecodedImageView pixels={imagePreview} width="100%" height="100%" />
                    ) : (
                        <div className="text-[10px] text-slate-600 font-mono">NULL DATA</div>
                    )}
                </div>
            </div>

            {/* Audio Preview */}
            <div className="space-y-3">
                <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Waves className="w-3.5 h-3.5" /> Audio Stream
                </div>
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl h-40 flex flex-col items-center justify-center gap-4 relative group-hover:border-indigo-500/20 transition-colors">
                    {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
                    <button 
                        onClick={toggleSound}
                        className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 z-10"
                    >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                    </button>
                    <div className="flex gap-2 z-10">
                         {audioUrl && (
                          <a href={audioUrl} download={`${signal.metadata.name}.wav`} className="p-2 bg-white/5 rounded-full text-slate-500 hover:text-indigo-400 transition-colors">
                              <Download className="w-4 h-4" />
                          </a>
                        )}
                    </div>
                    {/* Visualizer effect */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <Waves className={cn("w-24 h-24 text-indigo-400", isPlaying && "animate-pulse")} />
                    </div>
                </div>
            </div>

            {/* Text Preview */}
            <div className="space-y-3">
                <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Binary className="w-3.5 h-3.5" /> Bitstream
                </div>
                <div className="bg-slate-950 border border-white/5 rounded-2xl p-4 h-40 overflow-hidden relative shadow-inner group-hover:border-indigo-500/20 transition-colors">
                    <div className="font-mono text-[11px] text-indigo-300/80 break-all leading-tight">
                        {textPreview || "ENCRYPTED_OR_NONARRAY_DATA_BLOCK"}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />
                </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-2">
                <BrainCircuit className="w-3.5 h-3.5" /> Autonomous Discovery Reasoning
            </div>
            <p className="text-[13px] text-slate-400 italic leading-relaxed line-clamp-2">
               "{(signal.metadata as any).aiReasoning || "Initializing reasoning log..."}"
            </p>
          </div>
        </div>

        <div className="bg-slate-900/50 px-6 py-3 border-t border-white/5 text-[10px] text-slate-500 flex justify-between items-center font-mono tracking-wider">
          <div className="flex gap-4">
            <span>FREQ: {signal.metadata.frequency}</span>
            <span className="hidden sm:inline">COORD: {signal.metadata.coordinates}</span>
          </div>
          <span>CAPTURED: {new Date(signal.metadata.date).toLocaleDateString()}</span>
        </div>
      </motion.div>

      <LabReportModal 
        signal={signal}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onAnalyze={onAnalyze}
      />
    </>
  );
}

export function AiDiscoveries() {
  const { customSignals } = useAppStore();
  const navigate = useNavigate();

  // Any AI-generated signal ID is stamped with 'ai-gen-'
  const aiGeneratedSignals = customSignals.filter(s => s.metadata.id.startsWith('ai-gen-'));

  return (
    <div className="p-4 sm:p-6 lg:p-12 max-w-7xl mx-auto space-y-12 pb-32">
      <header className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_10px_20px_rgba(79,70,229,0.3)]">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Nexus AI Analytics</h1>
            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em] mt-1">Autonomous Discovery & Synthesis Archive</p>
          </div>
        </div>
        <p className="text-slate-400 max-w-3xl text-base leading-relaxed">
          Welcome to the high-security archive of findings synthesized by the Nexus AI subsystem. Each entry represents a deep-web radio search or a neural simulation discovery, complete with autonomous reasoning and automated decoding.
        </p>
      </header>

      {aiGeneratedSignals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-24 bg-slate-900/50 border border-white/5 rounded-[3rem] text-center space-y-6">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
            <BrainCircuit className="w-8 h-8 text-slate-700" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100">No Intelligence Logs Found</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
              Activate the Nexus UI in the bottom corner and request a signal sweep or atmospheric archive retrieval to populate this database.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-12">
          {aiGeneratedSignals.map(signal => (
            <DiscoveryCard 
              key={signal.metadata.id} 
              signal={signal} 
              onAnalyze={(id) => navigate(`/analyzer/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
