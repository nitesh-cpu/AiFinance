import React from 'react';
import { Check, AlertTriangle, Sparkles, RefreshCw, DollarSign, X } from 'lucide-react';
import { initialNotifications } from '../../data/mockData';

export const NotificationPanel = ({ isOpen, onClose, notifications, onMarkAllRead }) => {
  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'insight':
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      case 'recurring':
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case 'income':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-fadeIn">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <p className="p-4 text-xs text-center text-slate-500">No notifications</p>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex gap-3 hover:bg-slate-50 transition ${
                !item.read ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs h-fit">
                {getIcon(item.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start gap-2">
                  <h5 className="text-xs font-semibold text-slate-900">{item.title}</h5>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.time}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.details}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
        <button
          onClick={onMarkAllRead}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg hover:bg-blue-50 transition"
        >
          <Check className="w-3.5 h-3.5" />
          Mark all as read
        </button>
      </div>
    </div>
  );
};
