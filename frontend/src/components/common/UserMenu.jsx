import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const UserMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleNavigation = (path) => {
    onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    addToast('Logged out successfully', 'info');
    navigate('/login');
  };

  return (
    <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-fadeIn py-1">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Nitesh Kumar Mehta'}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email || 'nitesh@example.com'}</p>
      </div>

      <div className="py-1 border-b border-slate-100">
        <button
          onClick={() => handleNavigation('/settings')}
          className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
        >
          <User className="w-4 h-4 text-slate-400" />
          Profile
        </button>
        <button
          onClick={() => handleNavigation('/settings')}
          className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          Settings
        </button>
        <button
          onClick={() => handleNavigation('/settings')}
          className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
        >
          <Shield className="w-4 h-4 text-slate-400" />
          Security
        </button>
      </div>

      <div className="py-1">
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          Logout
        </button>
      </div>
    </div>
  );
};
