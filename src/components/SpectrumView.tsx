import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getFFTSpectrum } from '../lib/signal-processing';
import { Settings2 } from 'lucide-react';

interface SpectrumViewProps {
  data: number[];
  height?: number;
}

export function SpectrumView({ data, height = 200 }: SpectrumViewProps) {
  const [windowSize, setWindowSize] = useState(1024);
  const [overlap, setOverlap] = useState(512);
  const [showSettings, setShowSettings] = useState(false);

  const spectrumData = useMemo(() => {
    const { frequencies, magnitudes } = getFFTSpectrum(data, windowSize, overlap);
    return frequencies.map((f, i) => ({
      frequency: f,
      magnitude: magnitudes[i],
    }));
  }, [data, windowSize, overlap]);

  return (
    <div className="space-y-4">
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-slate-300">Frequency Spectrum (FFT)</h3>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {showSettings && (
          <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block flex justify-between">
                FFT Window Size
                <span className="text-emerald-500 font-mono">{windowSize}</span>
              </label>
              <input 
                type="range"
                min="256"
                max="4096"
                step="256"
                value={windowSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setWindowSize(newSize);
                  if (overlap >= newSize) setOverlap(Math.floor(newSize / 2));
                }}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>256</span>
                <span>1024</span>
                <span>4096</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block flex justify-between">
                Window Overlap
                <span className="text-emerald-500 font-mono">{overlap}</span>
              </label>
              <input 
                type="range"
                min="0"
                max={windowSize - 1}
                step="32"
                value={overlap}
                onChange={(e) => setOverlap(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0</span>
                <span>{Math.floor(windowSize / 2)}</span>
                <span>{windowSize - 1}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spectrumData}>
              <defs>
                <linearGradient id="spectrumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="frequency" 
                stroke="#64748b" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Frequency (bins)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                hide
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#10b981' }}
                labelStyle={{ color: '#64748b' }}
                labelFormatter={(label) => `Bin: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="magnitude" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#spectrumGradient)" 
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Resolution</div>
          <div className="text-sm font-mono text-slate-300">{(1 / windowSize).toFixed(6)} units/bin</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Bins</div>
          <div className="text-sm font-mono text-slate-300">{windowSize / 2}</div>
        </div>
      </div>
    </div>
  );
}
