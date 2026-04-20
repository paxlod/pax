import React from 'react';
import { useAppStore } from '../lib/store';
import { Moon, Sun, Info, Trash2, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export function Settings() {
  const { settings, updateSettings } = useAppStore();
  const { user, signIn, signOut } = useAuth();
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <header className="pt-4">
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Account</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div>
                  <div className="text-slate-200 font-medium">{user.displayName || 'User'}</div>
                  <div className="text-slate-500 text-xs">{user.email}</div>
                </div>
              </div>
              <button 
                onClick={signOut}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg transition-colors font-medium"
            >
              <LogIn className="w-5 h-5" />
              Sign In with Google
            </button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Appearance</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-slate-400" /> : <Sun className="w-5 h-5 text-slate-400" />}
              <span className="text-slate-200 font-medium">Dark Mode</span>
            </div>
            <button 
              onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Default Decoder Params</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm text-slate-300">Gamma</label>
              <span className="text-sm font-mono text-emerald-500">{settings.defaultDecodeOptions.gamma.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.2" max="3.0" step="0.1" 
              value={settings.defaultDecodeOptions.gamma} 
              onChange={(e) => updateSettings({ 
                defaultDecodeOptions: { ...settings.defaultDecodeOptions, gamma: Number(e.target.value) } 
              })}
              className="w-full accent-emerald-500"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm text-slate-300">Contrast</label>
              <span className="text-sm font-mono text-emerald-500">{settings.defaultDecodeOptions.contrast.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.5" max="3.0" step="0.1" 
              value={settings.defaultDecodeOptions.contrast} 
              onChange={(e) => updateSettings({ 
                defaultDecodeOptions: { ...settings.defaultDecodeOptions, contrast: Number(e.target.value) } 
              })}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Data</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {!showClearConfirm ? (
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-slate-800 transition-colors text-left"
            >
              <Trash2 className="w-5 h-5" />
              <span className="font-medium">Clear All Data</span>
            </button>
          ) : (
            <div className="p-4 space-y-3 bg-red-500/5">
              <p className="text-sm text-red-400">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    localStorage.removeItem('golden-signal-storage');
                    window.location.reload();
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Yes, Clear All
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3 pt-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-400 leading-relaxed">
            <p className="mb-2"><strong className="text-slate-300">Golden Signal Decoder v1.0</strong></p>
            <p>A simulation tool for analyzing extraterrestrial radio signals, inspired by the Voyager Golden Record and SETI research.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
