import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Binary, Terminal, MessageSquare, Copy, Check, Zap } from 'lucide-react';
import { extractBinary, binaryToAscii } from '../lib/signal-processing';

interface DecoderModalProps {
  isOpen: boolean;
  onClose: () => void;
  signalData: number[];
  signalName: string;
}

export function DecoderModal({ isOpen, onClose, signalData, signalName }: DecoderModalProps) {
  const [binary, setBinary] = useState<number[]>([]);
  const [ascii, setAscii] = useState<string>('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [samplesPerBit, setSamplesPerBit] = useState(20);

  useEffect(() => {
    if (isOpen && signalData.length > 0) {
      handleDecode();
    }
  }, [isOpen, signalData, samplesPerBit]);

  const handleDecode = () => {
    setIsDecoding(true);
    // Simulate some work
    setTimeout(() => {
      const bits = extractBinary(signalData, samplesPerBit);
      setBinary(bits);
      setAscii(binaryToAscii(bits));
      setIsDecoding(false);
    }, 800);
  };

  const handleCopy = () => {
    const text = `Signal: ${signalName}\nBinary: ${binary.join('')}\nASCII: ${ascii}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Binary className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-slate-100 italic tracking-widest uppercase text-xs">Astro-Linguistics Decoder</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-2">
                    <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                      <Terminal className="w-3 h-3" />
                      Binary Stream
                    </h4>
                    <div className="h-32 overflow-y-auto font-mono text-[10px] text-emerald-500/80 break-all leading-relaxed scrollbar-hide bg-black/40 p-2 rounded-lg border border-emerald-500/10">
                      {isDecoding ? (
                        <div className="flex items-center gap-2 animate-pulse">
                          <span>[</span>
                          <span className="w-1 h-3 bg-emerald-500"></span>
                          <span>] SCANNING CARRIER WAVE...</span>
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
                      {isDecoding ? (
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
                    onClick={handleCopy}
                    disabled={isDecoding || binary.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-sm font-medium transition-all border border-slate-700 disabled:opacity-50"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied to Clipboard' : 'Copy Full Trace'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors border border-slate-700"
              >
                Close Trace
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
