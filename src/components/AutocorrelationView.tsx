import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { autocorrelation } from '../lib/signal-processing';

interface AutocorrelationViewProps {
  data: number[];
  maxLag?: number;
  height?: number;
}

export function AutocorrelationView({ data, maxLag = 200, height = 200 }: AutocorrelationViewProps) {
  const acData = useMemo(() => {
    // Only analyze a portion if data is huge for performance
    const subData = data.length > maxLag * 4 ? data.slice(0, maxLag * 4) : data;
    const ac = autocorrelation(subData, maxLag);
    return ac.map((val, lag) => ({
      lag,
      correlation: val
    }));
  }, [data, maxLag]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Autocorrelation (Time-Lag Matrix)</h3>
      </div>
      
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={acData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="lag" 
              stroke="#64748b" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Lag (samples)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[-1, 1]}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
              itemStyle={{ color: '#8b5cf6' }}
              labelStyle={{ color: '#64748b' }}
            />
            <ReferenceLine y={0.3} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'right', value: 'Threshold', fill: '#10b981', fontSize: 10 }} />
            <Line 
              type="monotone" 
              dataKey="correlation" 
              stroke="#8b5cf6" 
              dot={false}
              strokeWidth={2}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-slate-500 mt-2 italic">
        Peaks in the autocorrelation indicate periodic structures or recurring pulse envelopes.
      </p>
    </div>
  );
}
