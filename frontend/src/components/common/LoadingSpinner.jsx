import React from 'react';

export const LoadingSpinner = ({ label = 'Loading SpendSense financial data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[250px] w-full">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
      {label && <p className="text-xs font-medium text-slate-500 mt-4 tracking-wide animate-pulse">{label}</p>}
    </div>
  );
};
