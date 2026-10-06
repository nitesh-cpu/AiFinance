import React from 'react';

export const ProgressBar = ({ value = 0, max = 100, color = 'bg-blue-600', height = 'h-2', showLabel = false }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-600 font-medium mb-1">
          <span>Progress</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${height}`}>
        <div
          className={`${color} ${height} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
