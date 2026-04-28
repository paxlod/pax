import React, { useRef, useState, useEffect } from 'react';
import { getSignalLibrary } from '../lib/signal-data';
import { SignalCard } from '../components/SignalCard';
import { useAppStore } from '../lib/store';
import { Upload, Loader2, Info, ExternalLink, Database, ChevronDown, Search, Cloud, HardDrive, Trash2 } from 'lucide-react';
import { parseSignalFile } from '../lib/file-parser';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getSavedSignals, SavedSignal, deleteSavedSignal } from '../services/signalService';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
          <SignalCard key={signal.metadata.id} signal={signal.metadata} signalData={signal.data} />
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
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const [cloudSignals, setCloudSignals] = useState<SavedSignal[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const { searchQuery } = libraryState;
  const setSearchQuery = (val: string) => updateLibraryState({ searchQuery: val });
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (user && activeTab === 'cloud') {
        fetchCloudSignals();
      }
    });
    return () => unsubscribe();
  }, [activeTab]);

  const fetchCloudSignals = async () => {
    setIsLoadingCloud(true);
    try {
      const signals = await getSavedSignals();
      setCloudSignals(signals);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloud' && isAuthenticated) {
      fetchCloudSignals();
    }
  }, [activeTab, isAuthenticated]);

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
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const handleDeleteCloudSignal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this signal?')) return;
    try {
      await deleteSavedSignal(id);
      fetchCloudSignals();
    } catch(err) {
      console.error(err);
    }
  };

  const filteredLibrary = library.filter(signal => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      signal.metadata.frequency.toLowerCase().includes(query) ||
      signal.metadata.name.toLowerCase().includes(query) ||
      signal.metadata.description.toLowerCase().includes(query)
    );
  });

  const filteredCloud = cloudSignals.filter(signal => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      signal.name.toLowerCase().includes(query) ||
      (signal.description?.toLowerCase().includes(query)) ||
      (signal.category?.toLowerCase().includes(query))
    );
  });

  const groupedLocal = filteredLibrary.reduce((acc, signal) => {
    const cat = signal.metadata.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(signal);
    return acc;
  }, {} as Record<string, typeof library>);

  const groupedCloud = filteredCloud.reduce((acc, signal) => {
    const cat = signal.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(signal);
    return acc;
  }, {} as Record<string, typeof cloudSignals>);

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

      <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'local' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('local')}
        >
          <HardDrive className="w-4 h-4" /> Local Database
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'cloud' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('cloud')}
        >
          <Cloud className="w-4 h-4" /> Cloud Storage
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'local' ? (
          <motion.div key="local" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
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

            {Object.entries(groupedLocal).map(([category, signals]) => (
              <CategorySection key={category} category={category} signals={signals} />
            ))}
          </motion.div>
        ) : (
          <motion.div key="cloud" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
            {!isAuthenticated ? (
              <div className="text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800">
                <Cloud className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Please sign in to view your saved signals.</p>
              </div>
            ) : isLoadingCloud ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : cloudSignals.length === 0 ? (
              <div className="text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800">
                <Database className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No signals saved to the cloud yet.</p>
                <p className="text-slate-500 text-xs mt-2">Analyze a new signal to save it to your library.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedCloud).map(([category, signals]) => (
                  <section key={category}>
                    <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                      {category}
                      <span className="text-xs font-normal bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                        {signals.length}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {signals.map(signal => (
                        <div 
                          key={signal.id} 
                          onClick={() => navigate(`/analyzer/${signal.id}?source=cloud`)}
                          className="bg-slate-900/50 border border-slate-700 hover:border-indigo-500/50 p-4 rounded-xl cursor-pointer transition-colors relative group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-200 line-clamp-1 pr-8">{signal.name}</h3>
                            <button
                               onClick={(e) => handleDeleteCloudSignal(signal.id, e)}
                               className="absolute top-3 right-3 text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                            {signal.category && (
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider">
                                {signal.category}
                              </span>
                            )}
                          </div>
                          {signal.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mb-3">{signal.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {signal.tags?.map(t => (
                              <span key={t} className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded-sm">
                                #{t}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800">
                             Saved: {new Date(signal.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
