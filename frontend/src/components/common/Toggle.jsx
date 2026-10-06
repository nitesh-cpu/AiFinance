import React from 'react';

export const Toggle = ({ enabled, onChange, label, description }) => {
  return (
    <div className="flex items-center justify-between py-2">
      {(label || description) && (
        <div className="pr-4">
          {label && <span className="text-sm font-medium text-slate-900 block">{label}</span>}
          {description && <span className="text-xs text-slate-500 block mt-0.5">{description}</span>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
