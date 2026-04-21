import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignalById } from '../lib/signal-data';
import { extractBinary, binaryToAscii } from '../lib/signal-processing';
import { ArrowLeft, Binary, Terminal, MessageSquare, Copy, Check, Zap, Hash } from 'lucide-react';

function mapToAlphanumeric(intensityVal: number): string {
  const val = Math.round(intensityVal);
  if (val <= 0) return " ";
  if (val >= 1 && val <= 9) return val.toString();
  if (val >= 10 && val <= 35) return String.fromCharCode(val + 55);
  return "Z";
}

export function TelemetryDecoder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const signal = id ? getSignalById(id) : undefined;

  // Binary Decoder State
  const [samplesPerBit, setSamplesPerBit] = useState(20);
  const [binary, setBinary] = useState<number[]>([]);
  const [ascii, setAscii] = useState<string>('');
  const [isDecodingBinary, setIsDecodingBinary] = useState(false);
  const [copiedBinary, setCopiedBinary] = useState(false);

  // Telemetry (Wow!) State
  const [windowSize, setWindowSize] = useState(10); // Number of samples per window
  const [telemetryOutput, setTelemetryOutput] = useState<string>('');
  const [isDecodingTelemetry, setIsDecodingTelemetry] = useState(false);
  const [copiedTelemetry, setCopiedTelemetry] = useState(false);

  useEffect(() => {
    if (signal) {
      handleDecodeBinary();
      handleDecodeTelemetry();
    }
  }, [signal, samplesPerBit, windowSize]);

  const handleDecodeBinary = () => {
    if (!signal) return;
    setIsDecodingBinary(true);
    setTimeout(() => {
      const bits = extractBinary(signal.data, samplesPerBit);
      setBinary(bits);
      setAscii(binaryToAscii(bits));
      setIsDecodingBinary(false);
    }, 500);
  };

  const handleDecodeTelemetry = () => {
    if (!signal) return;
    setIsDecodingTelemetry(true);
    setTimeout(() => {
      const data = signal.data;
      const numWindows = Math.floor(data.length / windowSize);
      const rmsValues: number[] = [];

      for (let i = 0; i < numWindows; i++) {
        const window = data.slice(i * windowSize, (i + 1) * windowSize);
        if (window.length === 0) continue;
        const maxAbs = Math.max(...window.map(Math.abs));
        if (maxAbs === 0) {
          rmsValues.push(0.0);
        } else {
          const rms = Math.sqrt(window.reduce((acc, val) => acc + val * val, 0) / window.length);
          rmsValues.push(rms);
        }
      }

      // 10th percentile for noise floor
      const sortedRms = [...rmsValues].sort((a, b) => a - b);
      let noiseFloor = sortedRms[Math.floor(sortedRms.length * 0.1)] || 1e-6;
      if (noiseFloor === 0) noiseFloor = 1e-6;

      let snrValues = rmsValues.map(rms => Math.max(0, (rms / noiseFloor) - 1));
      const maxSnr = Math.max(...snrValues);
      
      if (maxSnr > 0) {
        snrValues = snrValues.map(val => (val / maxSnr) * 35);
      }

      const wowString = snrValues.map(mapToAlphanumeric).join('');
      
      // Format in columns of 50
      let formatted = '';
      for (let i = 0; i < wowString.length; i += 50) {
        formatted += wowString.substring(i, i + 50) + '\n';
      }

      setTelemetryOutput(formatted);
      setIsDecodingTelemetry(false);
    }, 500);
  };

  const handleCopyBinary = () => {
    const text = `Signal: ${signal?.metadata.name}\nBinary: ${binary.join('')}\nASCII: ${ascii}`;
    navigator.clipboard.writeText(text);
    setCopiedBinary(true);
    setTimeout(() => setCopiedBinary(false), 2000);
  };

  const handleCopyTelemetry = () => {
    const text = `Signal: ${signal?.metadata.name}\nWow! Telemetry Format:\n\n${telemetryOutput}`;
    navigator.clipboard.writeText(text);
    setCopiedTelemetry(true);
    setTimeout(() => setCopiedTelemetry(false), 2000);
  };

  if (!signal) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen text-slate-400 bg-slate-950">
        <p>Signal not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-emerald-500 hover:text-emerald-400">Go back</button>
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
          <h1 className="font-semibold text-slate-100 leading-tight tracking-tight uppercase italic text-sm">{signal.metadata.name}</h1>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Telemetry & Binary Decoder</span>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-4xl mx-auto w-full">
        {/* Section: Wow! Telemetry Decoder */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <Hash className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-slate-100 italic tracking-widest uppercase text-sm">Wow! Telemetry (SNR Scale)</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                Alphanumeric Intensity (0-35)
              </h4>
              <div className="h-64 overflow-y-auto font-mono text-[10px] text-purple-400/80 break-all leading-relaxed bg-black/40 p-4 rounded-lg border border-purple-500/10 whitespace-pre">
                {isDecodingTelemetry ? (
                  <div className="flex items-center gap-2 animate-pulse">
                    <span>[</span><span className="w-1 h-3 bg-purple-500"></span><span>] PROCESSING TELEMETRY...</span>
                  </div>
                ) : (
                  telemetryOutput || 'NO DATA'
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                  <Zap className="w-3 h-3 text-purple-400" />
                  Parameters
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
                      <span>Window Size (Samples)</span>
                      <span>{windowSize}</span>
                    </div>
                    <input 
                      type="range" min="2" max="200" step="2"
                      value={windowSize}
                      onChange={(e) => setWindowSize(parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleCopyTelemetry}
                disabled={isDecodingTelemetry || !telemetryOutput}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-sm font-medium transition-all border border-slate-700 disabled:opacity-50"
              >
                {copiedTelemetry ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedTelemetry ? 'Copied' : 'Copy Telemetry'}
              </button>
            </div>
          </div>
        </section>

        {/* Section: Binary & ASCII Translations */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <Binary className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-100 italic tracking-widest uppercase text-sm">Astro-Linguistics Decoder</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  Binary Stream
                </h4>
                <div className="h-32 overflow-y-auto font-mono text-[10px] text-emerald-500/80 break-all leading-relaxed bg-black/40 p-2 rounded-lg border border-emerald-500/10">
                  {isDecodingBinary ? (
                    <div className="flex items-center gap-2 animate-pulse">
                      <span>[</span><span className="w-1 h-3 bg-emerald-500"></span><span>] SCANNING CARRIER WAVE...</span>
                    </div>
                  ) : (
                    binary.join('') || 'NO BINARY ENCODING DETECTED'
                  )}
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 text-amber-500" />
                  ASCII Translation
                </h4>
                <div className="h-24 flex items-center justify-center font-mono text-xl text-amber-400 bg-black/40 rounded-lg border border-amber-500/10 p-4 text-center">
                  {isDecodingBinary ? (
                    <div className="text-xs animate-pulse text-amber-500/60 uppercase tracking-widest">
                      Reconstructing Graphemes...
                    </div>
                  ) : (
                    ascii || <span className="text-xs text-slate-600 italic">No semantic translation achieved</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                  <Zap className="w-3 h-3 text-blue-400" />
                  Extraction Parameters
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase tracking-wider">
                      <span>Samples Per Bit</span>
                      <span>{samplesPerBit}</span>
                    </div>
                    <input 
                      type="range" min="4" max="100" step="1"
                      value={samplesPerBit}
                      onChange={(e) => setSamplesPerBit(parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                    <p className="text-[9px] text-blue-400 italic leading-relaxed">
                      Adjust 'Samples Per Bit' if the resulting binary string appears disjointed or fails to produce recognizable ASCII characters.
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleCopyBinary}
                disabled={isDecodingBinary || binary.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-sm font-medium transition-all border border-slate-700 disabled:opacity-50"
              >
                {copiedBinary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedBinary ? 'Copied' : 'Copy Full Trace'}
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
