import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignalById } from '../lib/signal-data';
import { extractPrincipalComponent, calculateWelchPSD } from '../lib/signal-processing';
import { ArrowLeft, Activity, Radio, Cpu, Network, Zap } from 'lucide-react';
import { WaveformView } from '../components/WaveformView';

export function MultivariatePCA() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const signal = id ? getSignalById(id) : undefined;

  const [sensors, setSensors] = useState<number[][]>([]);
  const [pc1, setPc1] = useState<number[] | null>(null);
  const [psdData, setPsdData] = useState<{ frequencies: number[], psd: number[] } | null>(null);
  const [dominantFreq, setDominantFreq] = useState<number | null>(null);
  const [correlationMatrix, setCorrelationMatrix] = useState<number[][] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Configuration identical to user's Python simulation
  const fs = 1000;
  const numSamples = 1000;

  useEffect(() => {
    if (!signal) return;

    // We slice the current SETI signal to act as the "Shared Hidden Rhythm" across all sensors
    // This perfectly emulates the scenario of measuring one faint alien signal embedded across noisy telemetry
    const baseSignal = new Array(numSamples).fill(0);
    for (let i = 0; i < Math.min(signal.data.length, numSamples); i++) {
        baseSignal[i] = signal.data[i] * 0.2; // Scaling down the true signal relative to interference
    }

    const t = Array.from({ length: numSamples }, (_, i) => i / fs);
    
    // Generate Sensor 1: Strong 120Hz + hidden signal + noise
    const s1 = t.map((time, i) => 
      1.0 * Math.sin(2 * Math.PI * 120 * time) + baseSignal[i] + 1.2 * (Math.random() * 2 - 1)
    );

    // Generate Sensor 2: Weak 80Hz + hidden signal + noise
    const s2 = t.map((time, i) => 
      0.5 * Math.sin(2 * Math.PI * 80 * time) + baseSignal[i] + 1.5 * (Math.random() * 2 - 1)
    );

    // Generate Sensor 3: Just heavy noise + hidden signal
    const s3 = t.map((time, i) => 
      baseSignal[i] + 2.0 * (Math.random() * 2 - 1)
    );

    const generatedSensors = [s1, s2, s3];
    setSensors(generatedSensors);
    setPc1(null);
    setPsdData(null);
    setDominantFreq(null);
    
    // Compute Correlation Matrix
    const N = generatedSensors[0].length;
    const numChannels = generatedSensors.length;
    const means = generatedSensors.map(ch => ch.reduce((a, b) => a + b, 0) / N);
    const stdDevs = generatedSensors.map((ch, i) => Math.sqrt(ch.reduce((a, b) => a + Math.pow(b - means[i], 2), 0) / N));
    
    const matrix = Array(numChannels).fill(0).map(() => Array(numChannels).fill(0));
    for (let i = 0; i < numChannels; i++) {
      for (let j = 0; j < numChannels; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          let covar = 0;
          for (let k = 0; k < N; k++) {
            covar += (generatedSensors[i][k] - means[i]) * (generatedSensors[j][k] - means[j]);
          }
          covar /= N;
          matrix[i][j] = covar / (stdDevs[i] * stdDevs[j]);
        }
      }
    }
    setCorrelationMatrix(matrix);
  }, [signal?.metadata.id]);

  const executePCA = () => {
    setIsProcessing(true);
    setTimeout(() => {
      // 1. Extract Principal Component
      const extractedPc1 = extractPrincipalComponent(sensors);
      setPc1(extractedPc1);

      // 2. Frequency Analysis on Shared Components (Welch Method)
      const welchResult = calculateWelchPSD(extractedPc1, fs, 256);
      setPsdData(welchResult);

      // 3. Peak Detection
      let maxPsd = -Infinity;
      let peakIdx = 0;
      welchResult.psd.forEach((p, idx) => {
         if (p > maxPsd) {
             maxPsd = p;
             peakIdx = idx;
         }
      });
      
      setDominantFreq(welchResult.frequencies[peakIdx]);
      setIsProcessing(false);
    }, 100);
  };

  const SensorChart = ({ data, color, title, height = 64 }: { data: number[], color: string, title: string, height?: number }) => {
    return (
      <div className="bg-[#111] p-3 rounded-xl border border-[#222]">
         <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-[#888] font-mono tracking-widest">{title}</span>
         </div>
         <div className="rounded overflow-hidden">
            <WaveformView data={data} color={color} height={height} />
         </div>
      </div>
    );
  };

  const BarChartPSD = ({ psd, freqs }: { psd: number[], freqs: number[] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !psd || psd.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const maxPsd = Math.max(...psd);
      
      ctx.fillStyle = '#6366f1'; // Indigo-500
      const barWidth = width / psd.length;

      for (let i = 0; i < psd.length; i++) {
        const normalizedH = (psd[i] / maxPsd) * height;
        ctx.fillRect(i * barWidth, height - normalizedH, barWidth - 1, normalizedH);
      }
    }, [psd]);

    return (
      <div className="bg-[#111] p-4 rounded-xl border border-[#222] mt-4">
         <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-[#888] font-mono tracking-widest uppercase">Welch Power Spectral Density</span>
         </div>
         <canvas ref={canvasRef} width={800} height={150} className="w-full h-32 bg-black rounded border-b border-l border-[#333]" />
         <div className="flex justify-between mt-2 text-[10px] text-[#666] font-mono">
           <span>0 Hz</span>
           <span>{fs/2} Hz (Nyquist)</span>
         </div>
      </div>
    );
  }

  const CorrelationHeatmap = ({ matrix }: { matrix: number[][] }) => {
    if (!matrix) return null;
    return (
      <div className="bg-[#111] p-4 rounded-xl border border-[#222] mt-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs text-[#888] font-mono tracking-widest uppercase flex items-center gap-2">
            <Network className="w-3 h-3" /> Sensor Correlation Matrix
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-center items-center text-[10px] text-[#888] font-mono mb-2">
          <div></div>
          <div>S1</div>
          <div>S2</div>
          <div>S3</div>
          {matrix.map((row, i) => (
            <React.Fragment key={`row-${i}`}>
              <div className="flex justify-end p-2 pr-4 items-center h-full">S{i + 1}</div>
              {row.map((val, j) => {
                const isPositive = val >= 0;
                // Scale alpha so extremely small correlations are dark, large are bright
                const alpha = Math.min(1, Math.abs(val) * 1.5 + 0.1); 
                const bgColor = isPositive 
                  ? `rgba(99, 102, 241, ${alpha})` // Indigo
                  : `rgba(239, 68, 68, ${alpha})`; // Red
                
                return (
                  <div 
                    key={`${i}-${j}`} 
                    className="aspect-square flex items-center justify-center text-xs font-mono text-white rounded border border-[#333]/50 transition-colors"
                    style={{ backgroundColor: bgColor }}
                    title={`Correlation S${i+1} x S${j+1}`}
                  >
                    {val.toFixed(2)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <p className="text-[10px] text-[#555] font-mono leading-tight mt-3">
          Cross-channel Pearson interdependencies. Highlights naturally shared variances prior to spatial PCA isolation.
        </p>
      </div>
    );
  };

  if (!signal) return <div className="p-8 text-white">Signal not found.</div>;

  return (
    <div className="bg-[#000000] min-h-screen text-slate-300 pb-24 font-sans selection:bg-indigo-500/30">
      <header className="px-6 py-4 border-b border-[#333333] flex items-center justify-between sticky top-0 bg-[#000000] z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-[#111111] hover:bg-[#222222] rounded-full transition-colors border border-[#333333]">
            <ArrowLeft className="w-5 h-5 text-indigo-500" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide uppercase">
              <Network className="w-5 h-5 text-indigo-500" />
              Multivariate Extractor
            </h1>
            <span className="text-[10px] text-[#666666] uppercase tracking-[0.2em] font-mono">Principal Component Array Filter</span>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Sensors & Simulation */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-5">
            <h2 className="text-xs text-indigo-400 font-mono tracking-widest uppercase mb-4 flex items-center gap-2">
               <Radio className="w-4 h-4" /> Telemetry Array
            </h2>
            <p className="text-[#888] text-xs leading-relaxed mb-6 font-mono">
              Injecting current signal <strong className="text-white">[{signal.metadata.name}]</strong> into a simulated multi-receiver array to test spatial filtering against extreme Radio Frequency Interference (RFI).
            </p>
            
            <div className="space-y-3">
              {sensors[0] && <SensorChart data={sensors[0]} color="#ef4444" title="SENSOR 1: 120Hz PRI + Noise + Signal" height={64} />}
              {sensors[1] && <SensorChart data={sensors[1]} color="#f59e0b" title="SENSOR 2: 80Hz PRI + Noise + Signal" height={64} />}
              {sensors[2] && <SensorChart data={sensors[2]} color="#64748b" title="SENSOR 3: Deep White Noise + Signal" height={64} />}
            </div>

            <button 
              onClick={executePCA}
              disabled={isProcessing}
              className="mt-6 w-full relative overflow-hidden bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-xl p-3 text-xs font-bold font-mono hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <Cpu className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              EXECUTE PCA DECOMPOSITION
            </button>
            
            {correlationMatrix && <CorrelationHeatmap matrix={correlationMatrix} />}
          </div>
        </div>

        {/* Right Col: PCA Results & Welch Periodogram */}
        <div className="lg:col-span-7 space-y-6">
           {pc1 ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#0a0a0a] border border-indigo-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(99,102,241,0.05)]">
                  <h2 className="text-xs text-indigo-400 font-mono tracking-widest uppercase mb-4 flex items-center gap-2">
                     <Activity className="w-4 h-4" /> PC1: Shared Hidden Rhythm
                  </h2>
                  <SensorChart data={pc1} color="#6366f1" title="EXTRACTED PRINCIPAL COMPONENT (ISOLATED SIGNAL)" height={128} />
                  
                  {psdData && (
                     <>
                       <BarChartPSD psd={psdData.psd} freqs={psdData.frequencies} />
                       
                       <div className="mt-6 border border-[#222] bg-[#111] rounded-lg p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <Zap className="w-5 h-5 text-emerald-400" />
                           <span className="text-sm font-mono text-[#aaa]">Welch Peak Detection:</span>
                         </div>
                         <span className="text-2xl font-bold font-mono text-emerald-400">
                           {dominantFreq?.toFixed(2)} Hz
                         </span>
                       </div>
                       <p className="text-[10px] text-[#666] font-mono mt-3 px-2">
                          * Peak extracted mathematically via np.argmax(psd) analogue across reduced spatial matrices.
                       </p>
                     </>
                  )}
                </div>
              </div>
           ) : (
              <div className="h-full min-h-[400px] border border-[#222] border-dashed rounded-xl flex flex-col items-center justify-center text-[#444] font-mono text-xs gap-4 p-8 text-center bg-[#050505]">
                 <Network className="w-12 h-12 opacity-50" />
                 <p>Awaiting dimensionality reduction.<br />Initialize Principal Component extraction.</p>
              </div>
           )}
        </div>

      </div>
    </div>
  );
}
