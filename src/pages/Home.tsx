import React from 'react';
import { useAppStore } from '../lib/store';
import { StatCard } from '../components/StatCard';
import { SignalCard } from '../components/SignalCard';
import { getSignalById, getSignalLibrary } from '../lib/signal-data';
import { Activity, Image as ImageIcon, Zap, ChevronRight, Library, Radio, Wifi, Search, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const { stats, recentSignals, customSignals } = useAppStore();
  const library = [...getSignalLibrary(), ...(customSignals || [])];
  const featured = library.slice(0, 2);
  
  const recents = recentSignals
    .map(id => getSignalById(id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
    .slice(0, 3);

  return (
    <div className="p-4 space-y-8 max-w-md mx-auto">
      <header className="pt-8 pb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Golden Signal
        </h1>
        <p className="text-slate-400 mt-1">Decoder & Analyzer</p>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <StatCard 
          title="Analyzed" 
          value={stats.signalsAnalyzed} 
          icon={Activity} 
          className="col-span-2"
        />
        <StatCard 
          title="Images" 
          value={stats.imagesDecoded} 
          icon={ImageIcon} 
        />
        <StatCard 
          title="Patterns" 
          value={stats.patternsFound} 
          icon={Zap} 
        />
      </section>

      <div className="flex gap-4">
        <Link to="/explore" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors text-center">
          <Activity className="w-6 h-6" />
          <span className="font-semibold text-sm">Start Analyzing</span>
        </Link>
        <Link to="/library" className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors border border-slate-700 text-center">
          <Library className="w-6 h-6" />
          <span className="font-semibold text-sm">Browse Library</span>
        </Link>
      </div>

      <section className="space-y-4">
        <Link to="/atlas-decoder" className="block bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-xl p-4 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 group-hover:text-indigo-300 transition-colors">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">3i/ATLAS Decoder</h3>
                <p className="text-xs text-slate-400 text-center">Meerkat Signal & Quantum Sonification</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
        </Link>

        <Link to="/hydrogen" className="block bg-blue-900/40 hover:bg-blue-900/60 border border-blue-500/30 rounded-xl p-4 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:text-blue-300 transition-colors">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Hydrogen Radio Network</h3>
                <p className="text-xs text-slate-400 italic">21cm Digital Compressed Stations</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
        </Link>

        <Link to="/anomaly-detector" className="block bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded-xl p-4 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg text-red-400 group-hover:text-red-300 transition-colors">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Deep Scan Intelligence</h3>
                <h3 className="text-sm font-semibold text-slate-200">Artificial Content Detection</h3>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
        </Link>
        
        <Link to="/anomalous-transient" className="block bg-orange-900/40 hover:bg-orange-900/60 border border-orange-500/30 rounded-xl p-4 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400 group-hover:text-orange-300 transition-colors">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">X-7 Decryption</h3>
                <p className="text-xs text-slate-400 italic">Anomalous Transient Telemetry Matrix</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
        </Link>
      </section>

      {recents.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {recents.map(signal => (
              <SignalCard key={`recent-${signal.metadata.id}`} signal={signal.metadata} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">Featured Signals</h2>
          <Link to="/explore" className="text-sm text-emerald-500 flex items-center">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {featured.map(signal => (
            <SignalCard key={`feat-${signal.metadata.id}`} signal={signal.metadata} />
          ))}
        </div>
      </section>
      
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-semibold text-slate-200 mb-2">About Golden Signal</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Inspired by the Voyager Golden Record, this app simulates the decoding of extraterrestrial radio signals. 
          Use the built-in tools to extract hidden images and detect artificial patterns in the noise.
        </p>
      </section>
    </div>
  );
}
