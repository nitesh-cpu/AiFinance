import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({ title, value, change, subtitle, icon: Icon, color = 'text-slate-700' }) => {
  const isPositive = change > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 transition-all hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl bg-slate-100 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>

        {change !== undefined && change !== null && (
          <div className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {isPositive ? '+' : ''}{change}%
          </div>
        )}
      </div>

      {subtitle && <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>}
    </div>
  );
};
