import React from 'react';

export const Table = ({ headers = [], children, className = '' }) => {
  return (
    <div className={`w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {headers.map((header, idx) => (
              <th key={idx} className="px-4 py-3.5 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
          {children}
        </tbody>
      </table>
    </div>
  );
};
