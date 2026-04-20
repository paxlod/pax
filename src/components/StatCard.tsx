import React from 'react';
import { cn } from '../lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  trend?: string;
}

export function StatCard({ title, value, icon: Icon, className, trend }: StatCardProps) {
  return (
    <div className={cn("bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-sm font-medium">{title}</span>
        <Icon className="w-4 h-4 text-emerald-500" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-100">{value}</span>
        {trend && <span className="text-xs text-emerald-500">{trend}</span>}
      </div>
    </div>
  );
}
