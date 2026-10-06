import React from 'react';

export const Dropdown = ({ label, value, onChange, options = [], icon: Icon }) => {
  return (
    <div className="relative inline-flex items-center">
      {Icon && (
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Icon className="w-3.5 h-3.5" />
        </div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${
          Icon ? 'pl-8' : 'pl-3'
        } pr-7 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl shadow-xs text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition`}
      >
        {label && <option value="">{label}</option>}
        {options.map((opt) => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-2.5 pointer-events-none text-slate-400 text-[10px]">
        ▼
      </div>
    </div>
  );
};
