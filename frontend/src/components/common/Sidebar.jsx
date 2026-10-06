import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Sparkles,
  AlertTriangle,
  Repeat,
  Target,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { addToast } = useToast();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
    { label: 'Analysis', path: '/analysis', icon: PieChart },
    { label: 'AI Insights', path: '/ai-insights', icon: Sparkles, badge: 'AI' },
    { label: 'Anomalies', path: '/anomalies', icon: AlertTriangle },
    { label: 'Recurring', path: '/recurring', icon: Repeat },
    { label: 'Budgets', path: '/budgets', icon: Target },
    { label: 'Cash Flow', path: '/cash-flow', icon: ArrowUpRight },
    { label: 'Forecast', path: '/forecast', icon: TrendingUp },
    { label: 'Reports', path: '/reports', icon: FileText },
  ];

  const bottomItems = [
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Help', path: '/help', icon: HelpCircle },
  ];

  const handleLogout = async () => {
    await logout();
    addToast('Logged out successfully', 'info');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">
                SpendSense
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-blue-600 uppercase block">
                AI Finance SaaS
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
              Main Menu
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          item.badge === 'AI'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
              System
            </p>
            <nav className="space-y-1">
              {bottomItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all duration-150"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Product Footer Box */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>SpendSense Active</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              Smart financial tracking & optimization enabled.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
