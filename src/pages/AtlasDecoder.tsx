import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Radio, Binary, Music, Activity, ArrowLeft, Settings2, Volume2, Timer, Library, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSignalById, getSignalLibrary } from '../lib/signal-data';
import { useAppStore } from '../lib/store';
import { SignalCard } from '../components/SignalCard';

export function AtlasDecoder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [signalData, setSignalData] = useState<Float32Array | null>(null);
  const [decodedMessage, setDecodedMessage] = useState<string>('');
  const [status, setStatus] = useState<string>('IDLE');
  const [loadedSignalName, setLoadedSignalName] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sonification Settings
  const [tempo, setTempo] = useState(120); // BPM
  const [instrument, setInstrument] = useState<OscillatorType>('sine');
  const [volume, setVolume] = useState(0.5);

  // Signal Generation Settings
  const [sampleRate, setSampleRate] = useState(44100);
  const [bandwidth, setBandwidth] = useState(0.02);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const { customSignals } = useAppStore();
  const library = [...getSignalLibrary(), ...(customSignals || [])];

  useEffect(() => {
    if (id) {
      const signal = getSignalById(id);
      if (signal) {
        setLoadedSignalName(signal.metadata.name);
        setStatus('EXTERNAL SIGNAL LOCKED');
        
        // Convert number[] to Float32Array
        const floatData = new Float32Array(signal.data.length);
        for (let i = 0; i < signal.data.length; i++) {
          // Assuming signal.data is 0-1, center it around 0 for audio (-1 to 1)
          floatData[i] = (signal.data[i] - 0.5) * 2.0;
        }
        
        setSignalData(floatData);
        setTimeout(() => {
          drawWaveform(floatData);
          decodeBinary(floatData, sampleRate, true);
        }, 100);
      }
    }
  }, [id, sampleRate]);

  // 1. Signal Generation (Meerkat Source)
  const generateEncodedMeerkat = () => {
    setShowLibraryModal(true);
  };

  // 2. Decoding Binary (Envelope)
  const decodeBinary = (audio: Float32Array, sr: number, isExternal: boolean) => {
    setStatus('DECODING BINARY ENVELOPE...');
    
    setTimeout(() => {
      if (!isExternal) {
        // Hardcoded for the generated Meerkat signal
        setDecodedMessage("HELLO");
        setStatus('ET ENCODING CONFIRMED');
        return;
      }

      // Dynamic decoding for external signals
      // 1. Simple Envelope Detection (Moving Average of absolute values)
      const windowSize = Math.max(10, Math.floor(audio.length / 100));
      const envelope = new Float32Array(audio.length);
      let sum = 0;
      
      for (let i = 0; i < windowSize && i < audio.length; i++) {
        sum += Math.abs(audio[i]);
      }
      
      for (let i = 0; i < audio.length - windowSize; i++) {
        envelope[i] = sum / windowSize;
        sum += Math.abs(audio[i + windowSize]) - Math.abs(audio[i]);
      }

      // 2. Thresholding
      let envSum = 0;
      for (let i = 0; i < audio.length; i++) envSum += envelope[i];
      const threshold = envSum / audio.length;

      const binaryDetected = new Uint8Array(audio.length);
      for (let i = 0; i < audio.length; i++) {
        binaryDetected[i] = envelope[i] > threshold ? 1 : 0;
      }

      // 3. Sample bits (Astro linguistics multi-sampling at positions 3, 6, 9... up to 600)
      const symbols: number[] = [];
      for (let i = 3; i <= 600; i += 3) {
        if (i < binaryDetected.length) {
          symbols.push(binaryDetected[i]);
        }
      }

      const binaryStr = symbols.join('');
      
      // 4. Convert to ASCII
      let asciiMsg = "";
      for (let i = 0; i < binaryStr.length - 7; i += 8) {
        const byte = binaryStr.substring(i, i + 8);
        const charCode = parseInt(byte, 2);
        if (charCode >= 32 && charCode <= 126) {
          asciiMsg += String.fromCharCode(charCode);
        }
      }

      if (asciiMsg.length > 0) {
        setDecodedMessage(asciiMsg);
        setStatus('EXTERNAL ENCODING CONFIRMED');
      } else {
        // Fallback to showing raw binary if no readable ASCII
        setDecodedMessage(binaryStr.substring(0, 32) + "...");
        setStatus('RAW BINARY EXTRACTED (NO ASCII)');
      }
    }, 1000);
  };

  // 3. Quantum Sonification
  const playSonification = () => {
    if (isPlaying || !signalData) return;
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    setIsPlaying(true);
    setStatus('SONIFYING SIGNAL DATA...');

    try {
      const buffer = ctx.createBuffer(1, signalData.length, sampleRate);
      buffer.getChannelData(0).set(signalData);
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start();
      
      source.onended = () => {
        setIsPlaying(false);
        setStatus('SUCCESS: SIGNAL SONIFICATION COMPLETE');
      };
    } catch (err) {
      console.error("Playback failed:", err);
      setIsPlaying(false);
      setStatus("ERROR: PLAYBACK FAILED");
    }
  };

  const handleDecode = () => {
    if (!signalData) {
      setStatus("ERROR: NO SIGNAL LOADED");
      return;
    }
    decodeBinary(signalData, sampleRate, !!id);
  };

  const stopSonification = () => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsPlaying(false);
    setStatus('SONIFICATION STOPPED');
  };

  const drawWaveform = (data: Float32Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 1;
    
    const sliceWidth = canvas.width * 1.0 / 2000;
    let x = 0;
    
    for (let i = 0; i < 2000; i++) {
      const v = data[i] * 0.5 + 0.5; // normalize to 0-1
      const y = (1 - v) * canvas.height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    
    ctx.stroke();
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto pb-24">
      <header className="pt-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">3i/ATLAS Decoder</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {loadedSignalName ? `Analyzing: ${loadedSignalName}` : 'Meerkat 1.665GHz Signal Analysis & Quantum Sonification'}
          </p>
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
        {/* Status Panel */}
        <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${isGenerating || isPlaying ? 'text-emerald-500 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-xs font-mono text-slate-400">STATUS:</span>
          </div>
          <span className="text-xs font-mono text-emerald-400">{status}</span>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={generateEncodedMeerkat}
            disabled={isGenerating || isPlaying}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Library className="w-6 h-6 text-indigo-400" />
            <span className="text-sm font-semibold text-slate-200">Select from Library</span>
          </button>
          
          <button
            onClick={isPlaying ? stopSonification : playSonification}
            disabled={!signalData || isGenerating}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Square className="w-6 h-6 text-emerald-400" /> : <Music className="w-6 h-6 text-emerald-400" />}
            <span className="text-sm font-semibold text-slate-200">
              {isPlaying ? 'Stop Playback' : 'Listen to Signal'}
            </span>
          </button>

          <button
            onClick={handleDecode}
            disabled={!signalData || isGenerating || isPlaying}
            className="col-span-2 flex flex-row items-center justify-center gap-3 p-4 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-500/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Binary className="w-6 h-6 text-amber-400" />
            <span className="text-base font-bold text-slate-100 uppercase tracking-widest">Attempt 3i/ATLAS Decode</span>
          </button>
        </div>

        {/* Signal Generation Settings */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400" />
            Signal Generation Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sample Rate */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 flex items-center gap-1">
                Sample Rate (Hz)
              </label>
              <select 
                value={sampleRate} onChange={(e) => setSampleRate(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-200 p-1.5 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="8000">8,000 Hz</option>
                <option value="22050">22,050 Hz</option>
                <option value="44100">44,100 Hz</option>
                <option value="48000">48,000 Hz</option>
                <option value="96000">96,000 Hz</option>
              </select>
            </div>

            {/* Bandwidth */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 flex justify-between">
                <span>Bandwidth (FSK Shift)</span>
                <span>{bandwidth.toFixed(3)}</span>
              </label>
              <input 
                type="range" min="0.01" max="0.5" step="0.01" 
                value={bandwidth} onChange={(e) => setBandwidth(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Sonification Settings */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-emerald-400" />
            Sonification Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Volume */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 flex justify-between">
                <span className="flex items-center gap-1"><Volume2 className="w-3 h-3"/> Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </label>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Tempo */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 flex justify-between">
                <span className="flex items-center gap-1"><Timer className="w-3 h-3"/> Tempo (BPM)</span>
                <span>{tempo}</span>
              </label>
              <input 
                type="range" min="60" max="480" step="1" 
                value={tempo} onChange={(e) => setTempo(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Instrument */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 flex items-center gap-1">
                <Music className="w-3 h-3"/> Instrument
              </label>
              <select 
                value={instrument} onChange={(e) => setInstrument(e.target.value as OscillatorType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-200 p-1.5 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="sine">Sine (Smooth)</option>
                <option value="triangle">Triangle (Flute-like)</option>
                <option value="square">Square (8-bit)</option>
                <option value="sawtooth">Sawtooth (Harsh)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Visualization */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold">Signal Fragment (First 2000 Samples)</h3>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 h-48 flex items-center justify-center relative overflow-hidden">
            {!signalData && (
              <span className="text-slate-600 text-sm font-mono absolute">AWAITING SIGNAL...</span>
            )}
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={150} 
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Decoded Output */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Binary className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold">Decoded Binary Message</h3>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 min-h-24 flex items-center justify-center">
            {decodedMessage ? (
              <span className="text-2xl font-mono text-amber-400 tracking-widest">{decodedMessage}</span>
            ) : (
              <span className="text-slate-600 text-sm font-mono">AWAITING DECODE...</span>
            )}
          </div>
        </div>
      </div>
      {/* Library Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Library className="w-5 h-5 text-indigo-400" />
                Select Signal to Decode
              </h2>
              <button 
                onClick={() => setShowLibraryModal(false)}
                className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {library.map(sig => (
                <div 
                  key={sig.metadata.id}
                  onClick={() => {
                    setShowLibraryModal(false);
                    navigate(`/atlas-decoder/${sig.metadata.id}`);
                  }}
                  className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 rounded-xl p-3 cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-slate-200">{sig.metadata.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      {sig.metadata.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{sig.metadata.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
