import React, { useState } from 'react';
import { Bell, ChevronDown, Menu, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationPanel } from './NotificationPanel';
import { UserMenu } from './UserMenu';
import { initialNotifications } from '../../data/mockData';

export const Navbar = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden transition"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">SpendSense</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsUserMenuOpen(false);
            }}
            className="relative p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>
          <NotificationPanel
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
          />
        </div>

        {/* User Profile Button */}
        <div className="relative">
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 transition focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              {user?.avatar || 'NK'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-900 leading-tight">
                {user?.displayName || 'Nitesh Kumar'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Premium Member</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>
          <UserMenu isOpen={isUserMenuOpen} onClose={() => setIsUserMenuOpen(false)} />
        </div>
      </div>
    </header>
  );
};
