import React from 'react';

export const Card = ({ children, className = '', title, subtitle, action, footer }) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
      {footer && <div className="mt-4 pt-4 border-t border-slate-100">{footer}</div>}
    </div>
  );
};
