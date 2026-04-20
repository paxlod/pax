import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { getSignalById } from '../lib/signal-data';
import { DecodedImageView } from '../components/DecodedImageView';
import { Image as ImageIcon, Zap, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export function Gallery() {
  const { savedResults, deleteSavedResult } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'image' | 'pattern'>('all');

  const filtered = savedResults.filter(r => filter === 'all' || r.type === filter);

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <header className="pt-4">
        <h1 className="text-2xl font-bold text-slate-100">Gallery</h1>
        <p className="text-slate-400 mt-1 text-sm">Your saved decoded images and pattern analyses.</p>
      </header>

      <div className="flex gap-2">
        {(['all', 'image', 'pattern'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors",
              filter === f 
                ? "bg-emerald-600 text-white" 
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            )}
          >
            {f}s
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No saved results found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(result => {
            const signal = getSignalById(result.signalId);
            return (
              <div key={result.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group relative">
                <Link to={`/result/${result.id}`} className="block">
                  {result.type === 'image' ? (
                    <div className="h-32 bg-black">
                      <DecodedImageView pixels={result.data} height={128} />
                    </div>
                  ) : (
                    <div className="h-32 bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                      <Zap className={cn("w-8 h-8 mb-2", result.data.type === 'artificial' ? 'text-emerald-500' : 'text-blue-500')} />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{result.data.type}</span>
                      <span className="text-[10px] text-slate-500 mt-1">{(result.data.confidence * 100).toFixed(0)}% Conf</span>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-slate-200 truncate">{signal?.metadata.name || 'Unknown'}</h3>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      {result.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                      {new Date(result.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    deleteSavedResult(result.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
