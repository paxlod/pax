import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Radio, Terminal, Zap, FileJson, Disc, Activity, Cpu, ShieldAlert, Code2, Copy, Check, Info, Settings, Wind, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

type Mode = 'seti' | 'bifrost';

interface Playbook {
  id: string;
  label: string;
  mode: Mode;
  description: string;
  questions: string[];
}

const PLAYBOOKS: Playbook[] = [
  {
    id: 'seti_drift_search',
    label: 'SETI Drift-Rate Search',
    mode: 'seti',
    description: 'Design a narrowband drift-search pipeline (turboSETI/TTDD-style).',
    questions: [
      'Center frequency (Hz)',
      'Bandwidth (Hz)',
      'Integration time (s)',
      'Drift-rate range (Hz/s)',
      'SNR threshold'
    ]
  },
  {
    id: 'bifrost_seti_realtime',
    label: 'Real-time Bifrost SETI Pipeline',
    mode: 'bifrost',
    description: 'UDP→GPU→drift-search pipeline for live SETI observations.',
    questions: [
      'NICs and data rate',
      'Per-beam bandwidth',
      'Number of channels',
      'Maximum acceptable latency'
    ]
  },
  {
    id: 'sigmf_technosignature_analyzer',
    label: 'Analyze SigMF for Technosignatures',
    mode: 'seti',
    description: 'Load a SigMF recording, build a waterfall, and run a drift-search.',
    questions: [
      'SigMF header',
      'FFT size',
      'Time resolution',
      'Drift-rate range',
      'SNR threshold'
    ]
  },
  {
    id: 'narrowband_decoder',
    label: 'Decode Narrowband Signal',
    mode: 'seti',
    description: 'Design a demodulation and decoding chain for a detected narrowband hit.',
    questions: [
      'Hit parameters',
      'Access to raw IQ',
      'Suspected modulation'
    ]
  }
];

export function SetiTerminal() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<Mode>('seti');
  const [activePlaybook, setActivePlaybook] = useState<Playbook>(PLAYBOOKS[0]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync mode with playbook selection
  useEffect(() => {
    setActiveMode(activePlaybook.mode);
  }, [activePlaybook]);

  const handleModeChange = (mode: Mode) => {
    setActiveMode(mode);
    const firstInMode = PLAYBOOKS.find(p => p.mode === mode);
    if (firstInMode) {
      setActivePlaybook(firstInMode);
      setAnswers({});
      setGeneratedOutput(null);
    }
  };

  const handlePlaybookChange = (playbook: Playbook) => {
    setActivePlaybook(playbook);
    setAnswers({});
    setGeneratedOutput(null);
  };

  const handleInputChange = (question: string, value: string) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  };

  const handleCopy = () => {
    if (generatedOutput) {
      navigator.clipboard.writeText(generatedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateOutput = () => {
    setIsGenerating(true);
    setGeneratedOutput(null);

    // Simulate analysis delay
    setTimeout(() => {
      let output = '';
      const { id } = activePlaybook;

      if (id === 'seti_drift_search') {
        const fc = answers['Center frequency (Hz)'] || '1420405751';
        const bw = answers['Bandwidth (Hz)'] || '1000000';
        const ti = answers['Integration time (s)'] || '300';
        const dr = answers['Drift-rate range (Hz/s)'] || '±10';
        const snr = answers['SNR threshold'] || '10';

        output = `### SETI Narrowband Drift-Search Pipeline Design

1. **Recommended Resolutions**
   - Spectral Resolution: 2.7 Hz (chosen to maximize SNR for drifting CW signals over ${ti}s).
   - Time Resolution: 0.37s per spectrum (sufficiently oversampled for drift rates of ${dr}).
   - Trade-off: Narrower channels improve CW detection but increase compute load and drift sensitivity.

2. **Drift-Rate Grid**
   - Range: ${dr} Hz/s
   - Step Size: 0.01 Hz/s
   - Total Trials: ~2000 per sub-band.

3. **High-Level Algorithm**
   - Compute time–frequency waterfall (FFT over time).
   - For each drift rate, integrate power along the corresponding path in (f, t) using the Taylor Tree method.
   - Compute SNR for each path and record "hits" above ${snr} sigma.

4. **TurboSETI / TTDD Pseudo-Config**
\`\`\`yaml
pipeline_config:
  center_freq: ${fc} # Hz
  bandwidth: ${bw}   # Hz
  t_int: ${ti}       # s
  delta_f: 2.7       # Hz/channel
  drift_rate_min: -10.0
  drift_rate_max: 10.0
  drift_rate_step: 0.01
  snr_threshold: ${snr}
  algorithm: "TTDD"
\`\`\`

5. **Real-time Extension & RFI Rejection**
   - Implement concurrent execution using CUDA kernels.
   - Use 'ON-OFF' source matching: signals only appearing in target beam are candidate technosignatures.
   - Reject signals with zero drift rate as likely local RFI.`;
      } else if (id === 'bifrost_seti_realtime') {
        const nic = answers['NICs and data rate'] || '2x 100GbE (Mellanox ConnectX-6)';
        const bbw = answers['Per-beam bandwidth'] || '100 MHz';
        const nchan = answers['Number of channels'] || '32k';
        const lat = answers['Maximum acceptable latency'] || '100 ms';

        output = `### Bifrost Real-Time SETI Pipeline Skeleton

**Block Graph Architecture:**
1. **UDP Capture (CPU)**: \`bifrost.udp_capture\` ingest from ${nic}.
2. **Unpack/Quantization (GPU)**: Transfer to GPU ring buffer; convert 4-bit to 32-bit complex.
3. **Channelization (GPU)**: \`bifrost.fft\` to create ${nchan} channels.
4. **Power/Waterfall (GPU)**: \`bifrost.accumulate\` power spectra.
5. **Drift-Search (GPU)**: Execute custom CUDA kernel for dedoppler integration.
6. **Hit Sink (CPU)**: Write hits to HDF5/SigMF or message queue (Redis).

**Resource Allocation:**
- GPU: A100/H100 for high-throughput FFT and drift-search.
- Pinned Memory: Map host ring buffers directly to GPU memory for zero-copy transfers.
- Scaling: Inter-GPU communication via NVLink to distribute beam processing.

\`\`\`python
import bifrost as bf
import numpy as np

# Bifrost Pipeline Skeleton
def seti_realtime_pipeline():
    # Initialise ring buffers
    ring_iq = bf.Ring(name="iq_samples", space="cuda")
    ring_waterfall = bf.Ring(name="waterfall", space="cuda")
    
    # Blocks
    udp_block = bf.blocks.UdpCaptureBlock(
        addr="0.0.0.0", port=9001, core=2, ring=ring_iq
    )
    
    fft_block = bf.blocks.FftBlock(
        irange=ring_iq, orange=ring_waterfall, 
        nfft=${nchan}, core=3, gpu=0
    )
    
    drift_block = bf.blocks.DedopplerBlock(
        irange=ring_waterfall, snr_threshold=10, 
        drift_range=[-5, 5], gpu=0
    )
    
    # Start pipeline
    bf.get_default_pipeline().run()
\`\`\`

**Latency Notes:**
- Target latency: ${lat} reached via asynchronous ring buffer access.
- Scaling: Add nodes for each ${bbw} of bandwidth.`;
      } else if (id === 'sigmf_technosignature_analyzer') {
        const header = answers['SigMF header'] || 'core:sample_rate: 2.0e6, core:frequency: 1.42e9';
        const fft = answers['FFT size'] || '2048';
        const res = answers['Time resolution'] || '0.1s';

        output = `### SigMF Technosignature Analyzer Report

1. **Metadata Interpretation**
   - Sample Rate: From header (e.g. 2 MHz).
   - Frequency: Baseband or Center Frequency (1.42 GHz).
   - Datatype: Usually 'cf32_le' or 'ci16_le'.
   - Polarization: Dual-circular or linear.

2. **Analysis Steps**
   - Read binary IQ data using \`sigmf\` Python library.
   - Segment into chunks of size matching ${res}.
   - Perform ${fft}-point FFTs to generate waterfall matrix.

3. **Drift-Search Procedure**
   - Grid: covering requested range with sub-channel precision.
   - Integration: Power-summing along drift vectors in time-frequency plane.

\`\`\`python
import sigmf
import numpy as np
from scipy.fft import fft

# Offline Search Skeleton
def analyze_sigmf(file_path):
    handle = sigmf.SigMFFile(file_path)
    meta = handle.get_schema()
    data = handle.flatten_samples()
    
    fs = meta['core:sample_rate']
    fft_size = ${fft}
    
    # Waterfall Generation
    num_blocks = len(data) // fft_size
    waterfall = np.zeros((num_blocks, fft_size))
    
    for i in range(num_blocks):
        block = data[i*fft_size:(i+1)*fft_size]
        waterfall[i] = np.abs(fft(block))**2
    
    # Placeholder for drift search
    hits = run_drift_search(waterfall, drift_range=[-10, 10])
    return hits
\`\`\`

**RFI Discrimination:**
- Cross-check hits with local database of known terrestrial interference frequencies.`;
      } else if (id === 'narrowband_decoder') {
        const hit = answers['Hit parameters'] || 'Freq: 1420.4 MHz, Drift: -0.5 Hz/s, SNR: 45';
        const mod = answers['Suspected modulation'] || 'BPSK';

        output = `### Narrowband Search & Decoding Chain

1. **Frequency Correction (De-Doppler)**
   - Mix the RAW IQ signal with a complex exponential: $e^{-j 2 \pi (f_0 + \dot{f} \cdot t) t}$
   - This removes the ${hit} drift and centers the signal at DC.

2. **Filtering**
   - Apply a Brick-wall or FIR low-pass filter to isolate the narrowband carrier.
   - Prevents out-of-band noise from degrading symbol reconstruction.

3. **Demodulation Strategy (${mod})**
   - Carrier Recovery: Costas Loop or M-power loop to track phase.
   - Timing Recovery: Mueller and Müller or Gardner Oersted algorithm.

4. **Symbol Extraction**
   - Estimate symbol rate from power spectrum cyclostationary peaks.
   - Hard/Soft decisions on phase states.

\`\`\`python
# Decoding Pseudocode
def decode_hit(iq_samples, drift_rate):
    # 1. De-doppler
    t = np.arange(len(iq_samples)) / fs
    dd_sig = iq_samples * np.exp(-1j * 2 * np.pi * drift_rate * t**2 / 2)
    
    # 2. Demodulate (Assuming BPSK)
    bits = bpsk_demod(dd_sig)
    
    # 3. Structure Search
    entropy = calculate_entropy(bits)
    repeats = find_repetitions(bits)
    
    return bits, entropy, repeats
\`\`\`

5. **Structure Search**
   - Check for low entropy (non-random structure).
   - Look for mathematical constants (primes, pi) or universal diagrams (Arecibo-style).

*Note: No ET signal has been confirmed to date. All hits must be treated as candidate technosignatures pending peer review.*`;
      }

      setGeneratedOutput(output);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Dynamic Persona Bar */}
      <div className={cn(
        "h-1 fixed top-0 left-0 right-0 z-50 transition-colors duration-500",
        activeMode === 'seti' ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
      )} />

      {/* Header */}
      <header className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-1 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight">SETI Command Terminal</h1>
              <div className={cn(
                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                activeMode === 'seti' ? "bg-indigo-500 text-white" : "bg-emerald-500 text-slate-950"
              )}>
                {activeMode === 'seti' ? 'SETI SPECIALIST' : 'BIFROST ENGINEER'}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span className="animate-pulse">●</span>
              <span>SYSTEM ONLINE</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline uppercase">Current mode: {activeMode} ops</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-1 p-1 bg-slate-950/50 rounded-lg border border-slate-800/50">
          <button 
            onClick={() => handleModeChange('seti')}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-2 uppercase tracking-widest",
              activeMode === 'seti' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Radio className="w-3 h-3" />
            SETI Mode
          </button>
          <button 
            onClick={() => handleModeChange('bifrost')}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-2 uppercase tracking-widest",
              activeMode === 'bifrost' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Wind className="w-3 h-3" />
            Bifrost Mode
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar: Playbook Selection */}
        <aside className="w-full lg:w-80 border-r border-slate-800 bg-slate-900/30 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-2 px-2 mb-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available Playbooks</h2>
          </div>
          
          <div className="space-y-2">
            {PLAYBOOKS.filter(p => p.mode === activeMode).map((playbook) => (
              <button
                key={playbook.id}
                onClick={() => handlePlaybookChange(playbook)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                  activePlaybook.id === playbook.id 
                    ? "bg-slate-800/50 border-indigo-500/50 shadow-lg shadow-indigo-500/10" 
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                )}
              >
                {activePlaybook.id === playbook.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" 
                  />
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-xs font-bold transition-colors",
                    activePlaybook.id === playbook.id ? "text-indigo-400" : "text-slate-300 group-hover:text-slate-100"
                  )}>
                    {playbook.label}
                  </span>
                  {playbook.mode === 'bifrost' ? <Cpu className="w-3 h-3 text-emerald-500" /> : <Disc className="w-3 h-3 text-indigo-500" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                  {playbook.description}
                </p>
              </button>
            ))}
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800">
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Technosignature Ops</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed italic">
                "Our mission is to detect narrowband, continuous-wave (CW) signals drifting in frequency space. Integrated SNR is our primary metric for candidate validation."
              </p>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-950 p-4 lg:p-8 space-y-8 pb-20 lg:pb-8">
          {/* Active Playbook Form */}
          <section className="max-w-4xl mx-auto w-full space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "p-2 rounded-xl",
                activeMode === 'seti' ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"
              )}>
                {activePlaybook.id === 'bifrost_seti_realtime' ? <Zap className="w-6 h-6" /> : <Search className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{activePlaybook.label}</h2>
                <p className="text-xs text-slate-500 font-mono italic">{activePlaybook.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePlaybook.questions.map((q) => (
                <div key={q} className="space-y-1.5 focus-within:z-10 relative">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                    {q}
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter value..."
                    value={answers[q] || ''}
                    onChange={(e) => handleInputChange(q, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={generateOutput}
              disabled={isGenerating || activePlaybook.questions.some(q => !answers[q])}
              className={cn(
                "w-full py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]",
                isGenerating 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_8px_30px_rgb(79,70,229,0.2)]"
              )}
            >
              {isGenerating ? (
                <>
                  <Disc className="w-5 h-5 animate-spin" />
                  Generating Pipeline...
                </>
              ) : (
                <>
                  <Code2 className="w-5 h-5" />
                  Submit Parameters
                </>
              )}
            </button>
          </section>

          {/* Result Output */}
          <AnimatePresence>
            {generatedOutput && (
              <motion.section 
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="max-w-4xl mx-auto w-full"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <FileJson className="w-4 h-4 text-indigo-400" />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pipeline Specification v1.0</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleCopy}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold flex items-center gap-2 transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'COPIED' : 'COPY ALL'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6 overflow-x-auto">
                    <div className="prose prose-invert prose-xs max-w-none prose-p:text-slate-400 prose-headings:text-indigo-400 prose-code:text-indigo-300 prose-pre:bg-black/50 prose-pre:border prose-pre:border-slate-800">
                       <MarkdownContent content={generatedOutput} />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                        <Info className="w-3 h-3" />
                        <span>Validated for {activeMode} hardware</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                        <Settings className="w-3 h-3" />
                        <span>Precision: High</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600">Generated: {new Date().toISOString()}</span>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Simple Markdown component (simulated since we don't have react-markdown installed yet but we can use simple regex or split)
function MarkdownContent({ content }: { content: string }) {
  // Very basic markdown parser for the specific output structure
  const lines = content.split('\n');
  return (
    <div className="space-y-4 font-mono leading-relaxed">
      {lines.map((line, idx) => {
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-lg font-bold text-indigo-400 mt-6 mb-2 border-b border-indigo-900/30 pb-1">{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={idx} className="text-sm font-bold text-slate-200 uppercase tracking-wide mt-4">{line.replace(/\*\*/g, '')}</p>;
        }
        if (line.trim().startsWith('- ')) {
          const parts = line.trim().split(':');
          if (parts.length > 1) {
             return <div key={idx} className="flex gap-2 text-xs py-1 border-l-2 border-slate-800 pl-3">
               <span className="text-slate-500 font-bold whitespace-nowrap">{parts[0].replace('- ', '')}:</span>
               <span className="text-slate-300">{parts.slice(1).join(':')}</span>
             </div>;
          }
          return <li key={idx} className="text-xs list-none pl-4 relative before:content-['>'] before:absolute before:left-0 before:text-indigo-500">{line.replace('- ', '')}</li>;
        }
        if (line.startsWith('```')) {
          return null; // Handle code blocks
        }
        if (line.match(/^\d\./)) {
           return <p key={idx} className="text-sm font-bold text-indigo-300 mt-6">{line}</p>;
        }
        if (line.trim() === '') return <div key={idx} className="h-2" />;
        
        // Simple code block detection (everything between ```)
        const isCodeLine = line.match(/^(\s{2,}|import|pipeline|handle|def|bits|fs|return|bf\.|\s+\w+:)/);
        if (isCodeLine) {
           return <div key={idx} className="text-[11px] text-indigo-200/80 bg-indigo-950/20 px-2 font-mono whitespace-pre">{line}</div>;
        }

        return <p key={idx} className="text-xs text-slate-400">{line}</p>;
      })}
    </div>
  );
}
