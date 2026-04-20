import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Play, Pause, FastForward, SlidersHorizontal, Activity, Settings2, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { WaveformView } from './WaveformView';

interface SonificationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  signalData: number[];
  signalName: string;
}

export function encodeWAV(samples: Float32Array, sampleRate: number): DataView {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return view;
}

export function generateSonifiedAudioURL(
  data: number[], 
  durationSec: number, 
  mode: 'direct' | 'fm' | 'am', 
  carrierOsc: number, 
  depth: number
): string {
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(totalSamples);
  
  let phase = 0;
  
  // Normalize data between 0 and 1
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) {
      if(data[i] < min) min = data[i];
      if(data[i] > max) max = data[i];
  }
  const range = max - min || 1;
  const normData = data.map(v => (v - min) / range);

  for (let i = 0; i < totalSamples; i++) {
      const dataIndex = (i / totalSamples) * (normData.length - 1);
      const idx1 = Math.floor(dataIndex);
      const idx2 = Math.ceil(dataIndex);
      const frac = dataIndex - idx1;
      
      let signalVal = normData[idx1];
      if (idx2 < normData.length) {
          signalVal = normData[idx1] * (1 - frac) + normData[idx2] * frac;
      }

      if (mode === 'direct') {
          buffer[i] = (signalVal * 2) - 1; // -1 to 1
      } else if (mode === 'am') {
          const osc = Math.sin(phase);
          buffer[i] = osc * signalVal;
          phase += 2 * Math.PI * carrierOsc / sampleRate;
      } else if (mode === 'fm') {
          const osc = Math.sin(phase);
          buffer[i] = osc;
          const currentFreq = carrierOsc + (signalVal - 0.5) * 2 * depth; 
          phase += 2 * Math.PI * currentFreq / sampleRate;
      }
  }
  
  return URL.createObjectURL(new Blob([encodeWAV(buffer, sampleRate)], { type: 'audio/wav' }));
}

export function SonificationStudio({ isOpen, onClose, signalData, signalName }: SonificationStudioProps) {
  const [mode, setMode] = useState<'fm' | 'am' | 'direct'>('fm');
  const [duration, setDuration] = useState<number>(30); // seconds
  const [carrier, setCarrier] = useState<number>(440); // Hz
  const [fmDepth, setFmDepth] = useState<number>(200); // Hz
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isOpen && signalData.length > 0) {
      handleGenerate();
    }
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [isOpen]);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Slight timeout allows UI to show saving/loading state before blocking generation
    setTimeout(() => {
      const url = generateSonifiedAudioURL(signalData, duration, mode, carrier, fmDepth);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsGenerating(false);
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.playbackRate = playbackRate;
      }
    }, 50);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', onEnd);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [audioUrl]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-slate-100 italic tracking-widest uppercase text-xs">Sonification Studio</h3>
                <span className="text-[10px] text-slate-500 ml-2">&gt; {signalName}</span>
              </div>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {/* Visualizer Stub */}
              <div className="bg-black border border-slate-800 rounded-xl p-4 h-32 relative">
                <div className="absolute top-2 left-2 flex items-center gap-2 text-[10px] font-mono text-indigo-500 font-bold uppercase tracking-widest">
                  <Activity className="w-3 h-3" /> Envelope Render
                </div>
                <WaveformView data={signalData} height={100} color="#6366f1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sonification Engine Settings */}
                <div className="space-y-5 bg-slate-950/50 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Settings2 className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-xs uppercase tracking-widest text-slate-300 font-bold">Synthesis Engine</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 mb-2 block font-bold tracking-wider">Modulation Mode</label>
                      <div className="flex bg-slate-900 border border-slate-800 rounded p-1">
                        <button 
                          onClick={() => setMode('fm')}
                          className={cn("flex-1 text-xs py-1.5 rounded transition", mode === 'fm' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200")}
                        >
                          Freq Mod (FM)
                        </button>
                        <button 
                          onClick={() => setMode('am')}
                          className={cn("flex-1 text-xs py-1.5 rounded transition", mode === 'am' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200")}
                        >
                          Amp Mod (AM)
                        </button>
                        <button 
                          onClick={() => setMode('direct')}
                          className={cn("flex-1 text-xs py-1.5 rounded transition", mode === 'direct' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200")}
                        >
                          Raw Direct
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
                        <span>Interpolated Duration</span>
                        <span>{duration}s</span>
                      </div>
                      <input 
                        type="range" min="1" max="180" step="1"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded appearance-none"
                      />
                    </div>

                    {mode !== 'direct' && (
                      <>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
                            <span>Carrier Freq</span>
                            <span>{carrier} Hz</span>
                          </div>
                          <input 
                            type="range" min="20" max="2000" step="10"
                            value={carrier}
                            onChange={(e) => setCarrier(parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded appearance-none"
                          />
                        </div>
                        
                        {mode === 'fm' && (
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
                              <span>FM Depth Spread</span>
                              <span>{fmDepth} Hz</span>
                            </div>
                            <input 
                              type="range" min="10" max="1000" step="10"
                              value={fmDepth}
                              onChange={(e) => setFmDepth(parseInt(e.target.value))}
                              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded appearance-none"
                            />
                          </div>
                        )}
                      </>
                    )}
                    
                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-lg flex justify-center items-center gap-2 transition"
                    >
                      {isGenerating ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Generate High-Res Broadcast
                    </button>
                  </div>
                </div>

                {/* Playback Settings */}
                <div className="space-y-5 bg-slate-950/50 border border-slate-800 rounded-xl p-5 flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-purple-500" />
                      <h4 className="text-xs uppercase tracking-widest text-slate-300 font-bold">Playback Control</h4>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    {/* Transport */}
                    <div className="flex flex-col items-center gap-4">
                      {audioUrl ? (
                         <audio ref={audioRef} src={audioUrl} className="hidden" />
                      ) : (
                         <div className="text-xs text-slate-500 italic text-center mb-2">Generate broadcast first</div>
                      )}
                      
                      <div className="flex items-center justify-center gap-4">
                        <button 
                          onClick={togglePlay}
                          disabled={!audioUrl}
                          className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:opacity-50 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                        >
                          {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 ml-1 fill-current" />}
                        </button>
                      </div>
                      
                      <div className="w-full space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>{(currentTime).toFixed(1)}s</span>
                          <span>{duration.toFixed(1)}s</span>
                        </div>
                        <input 
                          type="range" min="0" max={duration} step="0.1"
                          value={currentTime}
                          onChange={handleScrub}
                          disabled={!audioUrl}
                          className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/50">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
                        <span className="flex items-center gap-1"><FastForward className="w-3 h-3" /> Playback Speed</span>
                        <span>{playbackRate.toFixed(2)}x</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="3" step="0.1"
                        value={playbackRate}
                        onChange={handleRateChange}
                        disabled={!audioUrl}
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded appearance-none disabled:opacity-50"
                      />
                      <p className="text-[9px] text-slate-500 mt-2 text-center">
                        Slowing down the playback speed reduces pitch and expands the time domain for deep sensory analysis.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
              {audioUrl ? (
                <a 
                  href={audioUrl} 
                  download={`sonified-${signalName}.wav`}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700"
                >
                  <Download className="w-4 h-4" /> Export .WAV
                </a>
              ) : (
                <div />
              )}
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Close Studio
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
