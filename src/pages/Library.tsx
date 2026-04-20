import React, { useRef, useState } from 'react';
import { getSignalLibrary } from '../lib/signal-data';
import { SignalCard } from '../components/SignalCard';
import { useAppStore } from '../lib/store';
import { Upload, Loader2, Info, ExternalLink, Database, ChevronDown, Search } from 'lucide-react';
import { parseSignalFile } from '../lib/file-parser';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const CategorySection: React.FC<{ category: string, signals: any[] }> = ({ category, signals }) => {
  const [limit, setLimit] = useState(10);
  const displayedSignals = signals.slice(0, limit);
  const hasMore = limit < signals.length;

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
        {category}
        <span className="text-xs font-normal bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
          {signals.length}
        </span>
      </h2>
      <div className="space-y-3">
        {displayedSignals.map(signal => (
          <SignalCard key={signal.metadata.id} signal={signal.metadata} />
        ))}
      </div>
      {hasMore && (
        <button 
          onClick={() => setLimit(l => l + 20)}
          className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 bg-slate-900/50 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
        >
          Show More <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </section>
  );
};

export function Library() {
  const { customSignals, addCustomSignal, libraryState, updateLibraryState } = useAppStore();
  const library = [...getSignalLibrary(), ...(customSignals || [])];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showSetiInfo, setShowSetiInfo] = useState(false);
  const { searchQuery } = libraryState;
  const setSearchQuery = (val: string) => updateLibraryState({ searchQuery: val });
  const navigate = useNavigate();
  
  const filteredLibrary = library.filter(signal => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      signal.metadata.frequency.toLowerCase().includes(query) ||
      signal.metadata.name.toLowerCase().includes(query) ||
      signal.metadata.description.toLowerCase().includes(query)
    );
  });

  // Group by category
  const grouped = filteredLibrary.reduce((acc, signal) => {
    const cat = signal.metadata.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(signal);
    return acc;
  }, {} as Record<string, typeof library>);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsImporting(true);
      const newSignal = await parseSignalFile(file);
      addCustomSignal(newSignal);
      navigate(`/analyzer/${newSignal.metadata.id}`);
    } catch (error) {
      console.error('Failed to parse file:', error);
      // Using a simple state for error display would be better, but for now we log it
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 space-y-8 max-w-md mx-auto">
      <header className="pt-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Signal Library</h1>
          <p className="text-slate-400 mt-1 text-sm">Browse the complete collection of simulated and historical signals.</p>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Import
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".csv,.dat,.txt,.wav,.mp3,.ogg" 
          className="hidden" 
        />
      </header>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-500" />
        </div>
        <input
          type="text"
          placeholder="Search by frequency (e.g. 1420 MHz) or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
        />
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-blue-400">
            <Database className="w-4 h-4" />
            <h3 className="text-sm font-semibold">SETI Datasets</h3>
          </div>
          <button 
            onClick={() => setShowSetiInfo(!showSetiInfo)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showSetiInfo ? 'Hide Guide' : 'How to Import?'}
          </button>
        </div>
        
        <AnimatePresence>
          {showSetiInfo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2 text-xs text-slate-400 leading-relaxed">
                <p>
                  You can analyze real SETI data by downloading datasets from sources like Kaggle or Breakthrough Listen.
                </p>
                <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50 space-y-2">
                  <p className="font-medium text-slate-300">Recommended Dataset:</p>
                  <a 
                    href="https://www.kaggle.com/datasets/tentotheminus9/seti-data" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    Kaggle: SETI Signal Data <ExternalLink className="w-3 h-3" />
                  </a>
                  <p>Download the CSV files and use the <strong>Import</strong> button above to load them into the analyzer.</p>
                </div>
                <div className="flex items-start gap-2 text-[10px] bg-blue-500/5 border border-blue-500/20 rounded p-2 text-blue-300/80">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  <p>The analyzer supports .csv, .dat, and .txt files. For multi-column CSVs, the last column is assumed to be the signal amplitude.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {Object.entries(grouped).map(([category, signals]) => (
        <CategorySection key={category} category={category} signals={signals} />
      ))}
    </div>
  );
}
