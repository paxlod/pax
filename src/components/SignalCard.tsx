import React from 'react';
import { SignalMetadata } from '../lib/signal-data';
import { Activity, Radio, Satellite, Zap, Waves, Sun, Globe, MessageSquare, FileAudio, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { useAppStore } from '../lib/store';

interface SignalCardProps {
  key?: string | number;
  signal: SignalMetadata;
  className?: string;
}

export function SignalCard({ signal, className }: SignalCardProps) {
  const { deleteCustomSignal, viewedSignals } = useAppStore();
  const isViewed = viewedSignals?.includes(signal.id);

  const getIcon = () => {
    switch (signal.category) {
      case 'Golden Record': return <Radio className="w-5 h-5 text-amber-500" />;
      case 'Pulsar': return <Activity className="w-5 h-5 text-blue-500" />;
      case 'SETI': return <Satellite className="w-5 h-5 text-emerald-500" />;
      case 'Breakthrough Listen': return <Satellite className="w-5 h-5 text-teal-500" />;
      case 'FRB': return <Zap className="w-5 h-5 text-rose-500" />;
      case 'Solar System': return <Sun className="w-5 h-5 text-orange-500" />;
      case 'Cosmology': return <Globe className="w-5 h-5 text-indigo-500" />;
      case 'Message': return <MessageSquare className="w-5 h-5 text-pink-500" />;
      case 'Custom': return <FileAudio className="w-5 h-5 text-slate-400" />;
      default: return <Waves className="w-5 h-5 text-slate-400" />;
    }
  };

  const getBadgeColor = () => {
    switch (signal.category) {
      case 'Golden Record': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Pulsar': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'SETI': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Breakthrough Listen': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      case 'FRB': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'Solar System': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Cosmology': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'Message': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'Custom': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this custom signal?')) {
      deleteCustomSignal(signal.id);
    }
  };

  return (
    <Link to={`/analyzer/${signal.id}`} className="block">
      <div className={cn(
        "bg-slate-900 border rounded-xl p-4 transition-all cursor-pointer group relative",
        isViewed 
          ? "border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:shadow-[0_0_20px_rgba(249,115,22,0.25)]" 
          : "border-slate-800 hover:border-slate-700",
        className
      )}>
        {signal.category === 'Custom' && (
          <button
            onClick={handleDelete}
            className="absolute top-4 right-4 p-2 bg-slate-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors z-10 opacity-0 group-hover:opacity-100"
            title="Delete custom signal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        
        <div className="flex justify-between items-start mb-3 pr-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
              {getIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">{signal.name}</h3>
              <span className="text-xs text-slate-400">{signal.telescope}</span>
            </div>
          </div>
          <span className={cn("text-[10px] px-2 py-1 rounded-full border font-medium uppercase tracking-wider", getBadgeColor())}>
            {signal.category}
          </span>
        </div>
        
        <p className="text-sm text-slate-400 line-clamp-2 mb-4">
          {signal.description}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>{signal.frequency}</span>
          </div>
          <div className="flex items-center gap-1">
            <Satellite className="w-3 h-3" />
            <span>{signal.date}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
