import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { getSignalById } from '../lib/signal-data';
import { DecodedImageView } from '../components/DecodedImageView';
import { ArrowLeft, Trash2, RefreshCw, Calendar, Radio } from 'lucide-react';
import { cn } from '../lib/utils';

export function ResultDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { savedResults, deleteSavedResult } = useAppStore();
  
  const result = savedResults.find(r => r.id === id);
  const signal = result ? getSignalById(result.signalId) : null;

  if (!result || !signal) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-slate-400">
        <p>Result not found</p>
        <button onClick={() => navigate('/gallery')} className="mt-4 text-emerald-500">Go to Gallery</button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteSavedResult(result.id);
    navigate('/gallery');
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-slate-100">Saved Result</h1>
        </div>
        <button 
          onClick={handleDelete}
          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 space-y-6 max-w-md mx-auto w-full">
        {/* Visual */}
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
          {result.type === 'image' ? (
            <DecodedImageView pixels={result.data} height={300} />
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
              <div className={cn(
                "inline-flex px-6 py-2 rounded-full border-2 font-bold uppercase tracking-widest text-xl mb-4",
                result.data.type === 'artificial' ? 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10' : 
                result.data.type === 'natural' ? 'text-blue-500 border-blue-500/50 bg-blue-500/10' : 
                'text-slate-400 border-slate-700 bg-slate-800'
              )}>
                {result.data.type}
              </div>
              <div className="text-slate-400 mb-6">Confidence: {(result.data.confidence * 100).toFixed(1)}%</div>
              
              {result.data.period && (
                <div className="bg-slate-950 px-4 py-3 rounded-lg border border-slate-800 w-full">
                  <div className="text-xs text-slate-500 mb-1">Periodicity</div>
                  <div className="text-lg font-mono text-slate-200">{result.data.period} samples</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{signal.metadata.name}</h2>
            <p className="text-sm text-slate-400 mt-1">{signal.metadata.description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Calendar className="w-4 h-4 text-slate-500" />
              {new Date(result.timestamp).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Radio className="w-4 h-4 text-slate-500" />
              {signal.metadata.category}
            </div>
          </div>
        </div>

        {/* Parameters (if image) */}
        {result.type === 'image' && result.options && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Decoder Parameters</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-slate-500">Dimensions</div>
              <div className="text-slate-300 font-mono text-right">{result.options.width}x{result.options.lines}</div>
              <div className="text-slate-500">Gamma</div>
              <div className="text-slate-300 font-mono text-right">{result.options.gamma.toFixed(2)}</div>
              <div className="text-slate-500">Contrast</div>
              <div className="text-slate-300 font-mono text-right">{result.options.contrast.toFixed(2)}</div>
              <div className="text-slate-500">Brightness</div>
              <div className="text-slate-300 font-mono text-right">{result.options.brightness}</div>
            </div>
          </div>
        )}

        <button 
          onClick={() => navigate(result.type === 'image' ? `/decoder/${signal.metadata.id}` : `/detector/${signal.metadata.id}`)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700"
        >
          <RefreshCw className="w-5 h-5" />
          <span className="font-medium">Re-analyze Signal</span>
        </button>
      </div>
    </div>
  );
}
