import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { DecodeOptions } from './signal-processing';
import type { Signal } from './signal-data';

// Custom IndexedDB storage for Zustand
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export interface SavedResult {
  id: string;
  signalId: string;
  type: 'image' | 'pattern';
  timestamp: number;
  data: any; // Image data or pattern analysis results
  options?: DecodeOptions & { width: number; lines: number };
}

interface AppState {
  savedResults: SavedResult[];
  recentSignals: string[];
  viewedSignals: string[];
  customSignals: Signal[];
  stats: {
    signalsAnalyzed: number;
    imagesDecoded: number;
    patternsFound: number;
  };
  settings: {
    theme: 'light' | 'dark';
    defaultDecodeOptions: DecodeOptions;
  };
  exploreState: {
    searchQuery: string;
    activeCategory: string | null;
    selectedTelescope: string;
    dateStart: string;
    dateEnd: string;
    coordPrecision: 'All' | 'Precise' | 'Imprecise';
    showFilters: boolean;
  };
  libraryState: {
    searchQuery: string;
  };
  addSavedResult: (result: Omit<SavedResult, 'id' | 'timestamp'>) => void;
  deleteSavedResult: (id: string) => void;
  addRecentSignal: (signalId: string) => void;
  markSignalAsViewed: (signalId: string) => void;
  addCustomSignal: (signal: Signal) => void;
  deleteCustomSignal: (id: string) => void;
  incrementStat: (stat: keyof AppState['stats']) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  updateExploreState: (state: Partial<AppState['exploreState']>) => void;
  updateLibraryState: (state: Partial<AppState['libraryState']>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      savedResults: [],
      recentSignals: [],
      viewedSignals: [],
      customSignals: [],
      stats: {
        signalsAnalyzed: 0,
        imagesDecoded: 0,
        patternsFound: 0,
      },
      settings: {
        theme: 'dark',
        defaultDecodeOptions: {
          gamma: 1.0,
          contrast: 1.0,
          brightness: 0,
          transpose: false,
          flipH: false,
          flipV: false,
        },
      },
      exploreState: {
        searchQuery: '',
        activeCategory: null,
        showFilters: false,
        selectedTelescope: 'All',
        dateStart: '',
        dateEnd: '',
        coordPrecision: 'All',
      },
      libraryState: {
        searchQuery: '',
      },
      addSavedResult: (result) => set((state) => ({
        savedResults: [
          { ...result, id: Math.random().toString(36).substring(2, 9), timestamp: Date.now() },
          ...state.savedResults,
        ],
      })),
      deleteSavedResult: (id) => set((state) => ({
        savedResults: state.savedResults.filter((r) => r.id !== id),
      })),
      addRecentSignal: (signalId) => set((state) => ({
        recentSignals: [signalId, ...state.recentSignals.filter(id => id !== signalId)].slice(0, 10),
      })),
      markSignalAsViewed: (signalId) => set((state) => ({
        viewedSignals: state.viewedSignals.includes(signalId) 
          ? state.viewedSignals 
          : [...state.viewedSignals, signalId],
      })),
      addCustomSignal: (signal) => set((state) => ({
        customSignals: [signal, ...state.customSignals],
      })),
      deleteCustomSignal: (id) => set((state) => ({
        customSignals: state.customSignals.filter((s) => s.metadata.id !== id),
      })),
      incrementStat: (stat) => set((state) => ({
        stats: { ...state.stats, [stat]: state.stats[stat] + 1 },
      })),
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),
      updateExploreState: (newState: Partial<AppState['exploreState']>) => set((state) => ({
        exploreState: { ...state.exploreState, ...newState },
      })),
      updateLibraryState: (newState: Partial<AppState['libraryState']>) => set((state) => ({
        libraryState: { ...state.libraryState, ...newState },
      })),
    }),
    {
      name: 'golden-signal-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
