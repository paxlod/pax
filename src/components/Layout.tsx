import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Compass, Library, Image as ImageIcon, Settings, Radio, Search, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/explore', icon: Compass, label: 'Explore' },
    { to: '/ai-discoveries', icon: Sparkles, label: 'Nexus' },
    { to: '/anomaly-detector', icon: Search, label: 'Analysis' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 font-sans">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      
      <nav className="fixed bottom-0 w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-800 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
                isActive ? "text-emerald-500" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
