import React from 'react';
import { Calendar } from 'lucide-react';

export const DateFilter = ({ value = 'October 2026', onChange, options = ['October 2026', 'September 2026', 'August 2026', 'Last 3 Months', 'Year 2026'] }) => {
  return (
    <div className="relative inline-flex items-center">
      <div className="absolute left-3 text-slate-400 pointer-events-none">
        <Calendar className="w-3.5 h-3.5" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl shadow-xs text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <div className="absolute right-2.5 pointer-events-none text-slate-400 text-[10px]">
        ▼
      </div>
    </div>
  );
};
