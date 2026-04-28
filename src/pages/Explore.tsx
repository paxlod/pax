import React, { useState, useMemo } from 'react';
import { getSignalLibrary } from '../lib/signal-data';
import { SignalCard } from '../components/SignalCard';
import { Search, Filter, Calendar, Telescope, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../lib/store';

export function Explore() {
  const { customSignals, exploreState, updateExploreState } = useAppStore();
  
  const {
    searchQuery,
    activeCategory,
    showFilters,
    selectedTelescope,
    dateStart,
    dateEnd,
    coordPrecision
  } = exploreState;

  const setSearchQuery = (val: string) => updateExploreState({ searchQuery: val });
  const setActiveCategory = (val: string | null) => updateExploreState({ activeCategory: val });
  const setShowFilters = (val: boolean) => updateExploreState({ showFilters: val });
  const setSelectedTelescope = (val: string) => updateExploreState({ selectedTelescope: val });
  const setDateStart = (val: string) => updateExploreState({ dateStart: val });
  const setDateEnd = (val: string) => updateExploreState({ dateEnd: val });
  const setCoordPrecision = (val: 'All' | 'Precise' | 'Imprecise') => updateExploreState({ coordPrecision: val });
  
  const library = useMemo(() => [...getSignalLibrary(), ...(customSignals || [])], [customSignals]);
  
  const categories = useMemo(() => Array.from(new Set(library.map(s => s.metadata.category))), [library]);
  const telescopes = useMemo(() => Array.from(new Set(library.map(s => s.metadata.telescope))).filter(Boolean).sort(), [library]);

  const filteredSignals = useMemo(() => {
    return library.filter(s => {
      const meta = s.metadata;
      
      // Basic filters
      const matchesSearch = meta.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            meta.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory ? meta.category === activeCategory : true;
      
      // Advanced filters
      const matchesTelescope = selectedTelescope === 'All' || meta.telescope === selectedTelescope;
      
      let matchesDate = true;
      if (dateStart || dateEnd) {
        // Handle 'Variable' or 'N/A' dates by excluding them if a date range is set
        if (meta.date === 'Variable' || meta.date === 'N/A') {
          matchesDate = false;
        } else {
          const signalDate = new Date(meta.date).getTime();
          if (!isNaN(signalDate)) {
            if (dateStart && signalDate < new Date(dateStart).getTime()) matchesDate = false;
            if (dateEnd && signalDate > new Date(dateEnd).getTime()) matchesDate = false;
          }
        }
      }

      let matchesCoords = true;
      if (coordPrecision !== 'All') {
        const isPrecise = meta.coordinates.includes('RA') && meta.coordinates.includes('Dec');
        if (coordPrecision === 'Precise' && !isPrecise) matchesCoords = false;
        if (coordPrecision === 'Imprecise' && isPrecise) matchesCoords = false;
      }

      return matchesSearch && matchesCategory && matchesTelescope && matchesDate && matchesCoords;
    });
  }, [library, searchQuery, activeCategory, selectedTelescope, dateStart, dateEnd, coordPrecision]);

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <header className="pt-4">
        <h1 className="text-2xl font-bold text-slate-100 mb-4">Explore Signals</h1>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text"
              placeholder="Search signals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-500" />
              Advanced Filters
            </div>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFilters && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
              {/* Telescope Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Telescope className="w-3.5 h-3.5 text-blue-400" />
                  Telescope / Source
                </label>
                <select 
                  value={selectedTelescope}
                  onChange={(e) => setSelectedTelescope(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="All">All Telescopes</option>
                  {telescopes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-slate-500 text-xs">to</span>
                  <input 
                    type="date" 
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Coordinate Precision Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Coordinate Precision
                </label>
                <select 
                  value={coordPrecision}
                  onChange={(e) => setCoordPrecision(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="All">All Coordinates</option>
                  <option value="Precise">Precise (RA/Dec available)</option>
                  <option value="Imprecise">Imprecise (N/A, Omnidirectional, etc.)</option>
                </select>
              </div>
              
              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => {
                    setSelectedTelescope('All');
                    setDateStart('');
                    setDateEnd('');
                    setCoordPrecision('All');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            activeCategory === null 
              ? "bg-emerald-600 text-white" 
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          )}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeCategory === cat 
                ? "bg-emerald-600 text-white" 
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="text-xs text-slate-500 font-medium px-1">
          Showing {filteredSignals.length} signals
        </div>
        {filteredSignals.length > 0 ? (
          filteredSignals.map(signal => (
            <SignalCard key={signal.metadata.id} signal={signal.metadata} signalData={signal.data} />
          ))
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No signals found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
