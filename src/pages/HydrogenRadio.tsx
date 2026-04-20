import React, { useState, useEffect, useRef } from 'react';
import { Radio, Zap, Activity, Shield, Wifi, Globe, Terminal, Download, Play, Square, RefreshCcw, Star, Cable, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getSignalLibrary } from '../lib/signal-data';
import { Link } from 'react-router-dom';

export function HydrogenRadio() {
  const [isScanning, setIsScanning] = useState(false);
  const [frequency, setFrequency] = useState(1420.405);
  const [isLocked, setIsLocked] = useState(false);
  const [stationName, setStationName] = useState("");
  const [status, setStatus] = useState("IDLE");
  const [dataFlow, setDataFlow] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [signalStrength, setSignalStrength] = useState(0);

  // SDR Live Stream State
  const [sdrUrl, setSdrUrl] = useState("sdr://36.90.52.48:5556");
  const [sdrName, setSdrName] = useState("Ggu");
  const [sdrStatus, setSdrStatus] = useState<"DISCONNECTED" | "CONNECTING" | "STREAMING">("DISCONNECTED");
  const [streamMetrics, setStreamMetrics] = useState({ bandwidth: 0, latency: 0, packets: 0 });
  const sdrCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamAnimationRef = useRef<number | null>(null);

  // Audio Stream State
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscRef = useRef<{ osc: OscillatorNode, gain: GainNode } | null>(null);
  const noiseFilterRef = useRef<BiquadFilterNode | null>(null);
  const noiseSrcRef = useRef<AudioBufferSourceNode | null>(null);

  const hydrogenSignals = getSignalLibrary().filter(s => s.metadata.category === 'Hydrogen Radio');

  const startSdrAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.value = isMuted ? 0 : 0.15;
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // 1. Radio Static (Bandpass White Noise)
      const bufferSize = ctx.sampleRate * 2; // 2 seconds
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1000;
      noiseFilter.Q.value = 1.5;

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(masterGain);
      noiseSrc.start();
      noiseSrcRef.current = noiseSrc;
      noiseFilterRef.current = noiseFilter;

      // 2. Hydrogen Peak (Oscillator Tone)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 800;

      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.02;

      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
      oscRef.current = { osc, gain: oscGain };
    } catch (e) {
      console.error("Audio Context initialization failed", e);
    }
  };

  const stopSdrAudio = () => {
    if (noiseSrcRef.current) {
      try { noiseSrcRef.current.stop(); } catch(e){}
    }
    if (oscRef.current) {
      try { oscRef.current.osc.stop(); } catch(e){}
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  // Sync mute state dynamically
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(isMuted ? 0 : 0.15, audioCtxRef.current.currentTime, 0.1);
    }
  }, [isMuted]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopSdrAudio();
    };
  }, []);

  // Simulated HDR Streaming Canvas & Audio Sync
  useEffect(() => {

    if (sdrStatus === "STREAMING" && sdrCanvasRef.current) {
      const canvas = sdrCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fix canvas resolution for sharpness
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      let time = 0;
      let packetCount = 0;
      const drawStream = () => {
        time += 0.05;
        packetCount += Math.floor(Math.random() * 10) + 1;
        
        // Update metrics periodically
        if (Math.random() > 0.9) {
          setStreamMetrics({
            bandwidth: 1.2 + Math.random() * 0.5,
            latency: 40 + Math.random() * 20,
            packets: packetCount
          });
        }

        const w = rect.width;
        const h = rect.height;

        // Fade background for waterfall trail effect
        ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
        ctx.fillRect(0, 0, w, h);

        ctx.beginPath();
        ctx.lineWidth = 1.5;
        
        const bins = 400;
        // Hydrogen line is around 1420.405 MHz. We center it and add doppler drift.
        const dopplerCurrent = Math.sin(time * 0.2) * 20;
        const peakCenter = bins / 2 + dopplerCurrent; 
        const hLineAmplitude = 50 + Math.sin(time * 2.5) * 15;
        
        // Sync Audio with FFT Data
        if (oscRef.current && audioCtxRef.current && gainNodeRef.current?.gain.value! > 0) {
          try {
            oscRef.current.osc.frequency.setTargetAtTime(800 + dopplerCurrent * 4, audioCtxRef.current.currentTime, 0.1);
            oscRef.current.gain.gain.setTargetAtTime(0.01 + Math.max(0, (hLineAmplitude / 150) * 0.06), audioCtxRef.current.currentTime, 0.1);
            
            if (noiseFilterRef.current) {
              noiseFilterRef.current.frequency.setTargetAtTime(1000 + dopplerCurrent * 8, audioCtxRef.current.currentTime, 0.1);
            }
          } catch(e) {}
        }

        // Create gradient stroke
        const gradient = ctx.createLinearGradient(0, h, 0, 0);
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(0.5, '#3b82f6');
        gradient.addColorStop(1, '#60a5fa');
        ctx.strokeStyle = gradient;

        for (let i = 0; i < bins; i++) {
          const x = (i / bins) * w;
          const noise = Math.random() * 25; // Base noise floor
          
          // Primary Peak (Hydrogen Resonance)
          const dist1 = Math.abs(i - peakCenter);
          const bump1 = Math.max(0, hLineAmplitude * Math.exp(-(dist1 * dist1) / 40));
          
          // Secondary Harmonic/Interference
          const dist2 = Math.abs(i - (peakCenter + 80));
          const bump2 = Math.max(0, (20 + Math.random()*10) * Math.exp(-(dist2 * dist2) / 10));

          const y = h - 10 - noise - bump1 - bump2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        ctx.stroke();

        // Draw frequency guides
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '10px monospace';
        ctx.fillText('1420.35 MHz', 10, h - 5);
        ctx.fillText('H-Line 1420.405 MHz', w / 2 - 50, h - 5);
        ctx.fillText('1420.45 MHz', w - 80, h - 5);

        streamAnimationRef.current = requestAnimationFrame(drawStream);
      };
      
      drawStream();

      return () => {
        if (streamAnimationRef.current) cancelAnimationFrame(streamAnimationRef.current);
      };
    }
  }, [sdrStatus]);

  const toggleSdrStream = () => {
    if (sdrStatus === "DISCONNECTED") {
      setSdrStatus("CONNECTING");
      setTimeout(() => {
        setSdrStatus("STREAMING");
        setFrequency(1420.405);
        startSdrAudio();
      }, 1500);
    } else {
      setSdrStatus("DISCONNECTED");
      setStreamMetrics({ bandwidth: 0, latency: 0, packets: 0 });
      stopSdrAudio();
    }
  };

  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setFrequency(f => {
          const next = f + (Math.random() * 0.002 - 0.001);
          return parseFloat(next.toFixed(6));
        });
        setSignalStrength(Math.random() * 40 + 20);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  useEffect(() => {
    if (isScanning && !isLocked) {
      const timer = setTimeout(() => {
        const found = hydrogenSignals[Math.floor(Math.random() * hydrogenSignals.length)];
        setStationName(found.metadata.name);
        setIsLocked(true);
        setStatus("STATION LOCKED");
        setIsScanning(false);
        setSignalStrength(98);
        startDecompression();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isScanning, isLocked, hydrogenSignals]);

  const startDecompression = () => {
    setStatus("DECOMPRESSING DIGITAL PACKETS...");
    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      setProgress(p);
      const hex = Math.random().toString(16).substring(2, 10).toUpperCase();
      setDataFlow(prev => [hex, ...prev].slice(0, 10));
      
      if (p >= 100) {
        clearInterval(interval);
        setStatus("PULLED TO MOBILE: READY");
      }
    }, 100);
  };

  const handleScan = () => {
    setIsScanning(true);
    setIsLocked(false);
    setStationName("");
    setStatus("SCANNING 21cm BAND...");
    setProgress(0);
    setDataFlow([]);
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto pb-24">
      <header className="pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
            <Radio className="w-8 h-8 text-blue-500" />
            Hydrogen Radio
          </h1>
          <p className="text-slate-400 text-sm mt-1">21cm Digital Compressed Receiver</p>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold border",
          isLocked ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-800 text-slate-500 border-slate-700"
        )}>
          {isLocked ? "ONLINE" : "STANDBY"}
        </div>
      </header>

      {/* Frequency Display */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Globe className="w-24 h-24" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center space-y-2">
          <div className="text-xs font-mono text-blue-400 uppercase tracking-widest">Hydrogen Resonance Line</div>
          <div className="text-5xl font-mono font-bold text-slate-100 tabular-nums">
            {frequency.toFixed(4)}
            <span className="text-xl text-slate-500 ml-2">MHz</span>
          </div>
          <div className="w-full flex items-center gap-4 py-4">
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500" 
                animate={{ width: `${signalStrength}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500">SIG: {signalStrength.toFixed(0)}dB</span>
          </div>
        </div>
      </section>

      {/* Live SDR Stream Panel (User Requested Feature) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-6 shadow-xl">
        {/* SDR Target Info */}
        <div className="bg-blue-600/90 p-4 shrink-0 flex items-start justify-between relative group hover:bg-blue-600 transition-colors cursor-pointer" onClick={toggleSdrStream}>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent pointer-events-none" />
          <div className="z-10 relative">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Activity className={cn("w-5 h-5", sdrStatus !== "DISCONNECTED" && "animate-pulse")} />
              SpyServer: {sdrUrl}
            </h3>
            <p className="text-blue-100 text-sm">{sdrName} • Live Extragalactic Hydrogen Stream</p>
          </div>
          <Star className="w-6 h-6 text-white fill-white z-10 opacity-90" />
        </div>

        {/* Live Controls & Data View */}
        <div className="p-4 bg-slate-950 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button 
                onClick={toggleSdrStream}
                className={cn(
                  "flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                  sdrStatus === "STREAMING" 
                    ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20" 
                    : sdrStatus === "CONNECTING"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                )}
              >
                <Cable className="w-4 h-4 mr-2" />
                {sdrStatus === "STREAMING" ? "DISCONNECT STREAM" : sdrStatus === "CONNECTING" ? "HANDSHAKING..." : "CONNECT TO SPYSERVER"}
              </button>
              
              {sdrStatus === "STREAMING" && (
                <div className="flex items-center gap-3 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"/>LIVE</span>
                  <span className="text-blue-400">{streamMetrics.bandwidth.toFixed(2)} MB/s</span>
                  <span className="text-amber-400">{streamMetrics.latency.toFixed(0)} ms</span>
                  <span className="text-indigo-400">PKT: {streamMetrics.packets}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {sdrStatus === "STREAMING" && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 transition-colors"
                  aria-label={isMuted ? "Unmute stream" : "Mute stream"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
              )}
              {sdrStatus === "STREAMING" && (
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded">H-LINE: 1420.40575 MHz</span>
              )}
            </div>
          </div>

          <AnimatePresence>
            {sdrStatus === "STREAMING" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full h-64 border border-slate-800 rounded-xl overflow-hidden relative shadow-inner bg-slate-900"
              >
                <div className="absolute top-2 left-2 z-10 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded">
                  FFT SPECTRAL WATERFALL
                </div>
                <div className="absolute bottom-6 right-2 z-10 text-[10px] font-mono text-blue-400">
                  TARGET: HI EMISSION
                </div>
                <canvas 
                  ref={sdrCanvasRef} 
                  className="w-full h-full block"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Tuner Controls */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={handleScan}
          disabled={isScanning}
          className="flex flex-col items-center justify-center p-4 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/20 rounded-xl transition-all group"
        >
          <Wifi className={cn("w-6 h-6 text-blue-400 mb-2", isScanning && "animate-pulse")} />
          <span className="text-sm font-semibold text-slate-200">Auto Scan</span>
        </button>
        <button className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all">
          <Shield className="w-6 h-6 text-indigo-400 mb-2" />
          <span className="text-sm font-semibold text-slate-200">Decryption</span>
        </button>
      </div>

      {/* Status & Decompression */}
      <AnimatePresence>
        {(isScanning || isLocked) && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-mono text-emerald-500">{status}</span>
              </div>
              {isLocked && (
                <span className="text-xs font-bold text-blue-400">{stationName}</span>
              )}
            </div>

            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-2">
              {dataFlow.map((hex, i) => (
                <div key={i} className="text-[10px] font-mono text-slate-600 bg-slate-900/50 p-1 rounded text-center">
                  {hex}
                </div>
              ))}
            </div>

            {progress === 100 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-2 flex gap-3"
              >
                <Link 
                  to={`/analyzer/${hydrogenSignals[0].metadata.id}`}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Activity className="w-3 h-3" />
                  Analyze Station
                </Link>
                <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                  <Download className="w-3 h-3" />
                  Save Archive
                </button>
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <h2 className="text-slate-300 font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
          <RefreshCcw className="w-4 h-4 text-blue-500 text-xs" />
          Implementations in Features
        </h2>
        <div className="space-y-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs italic">HI</div>
            <div>
              <div className="text-sm font-medium text-slate-100 italic">"Modified Analyzer"</div>
              <p className="text-[10px] text-slate-500">21cm Spectral Mode integrated into Signal Analyzer.</p>
            </div>
          </div>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4 italic font-medium">
             <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs">HI</div>
             <div>
               <div className="text-sm font-medium text-slate-100">"Hydrogen Tuner"</div>
               <p className="text-[10px] text-slate-500">Global signal "pulling" algorithm implemented in all decoders.</p>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
