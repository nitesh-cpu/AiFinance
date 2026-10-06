import React from 'react';
import { Button } from './Button';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  title = 'No data available',
  description = 'There are currently no items to display.',
  icon: Icon = Inbox,
  action,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
      <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200/80 text-slate-400 mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {action || (actionText && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      ))}
    </div>
  );
};
