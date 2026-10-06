import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownRight, Sparkles, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { analyticsService } from '../services/analyticsService';
import { formatCurrency } from '../utils/formatters';

export const CashFlow = () => {
  const [loading, setLoading] = useState(true);
  const [cashFlow, setCashFlow] = useState([]);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchCashFlow = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getCashFlow();
      setCashFlow(res.cashFlow || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load cash flow data.');
      console.error('Failed to load cash flow data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCashFlow();
  }, [fetchCashFlow, retryCount]);

  if (loading) return <LoadingSpinner label="Projecting cash inflow vs outflow velocity..." />;
  if (error) {
    return <EmptyState title="Cash flow unavailable" description={error} actionText="Retry" onAction={() => setRetryCount((count) => count + 1)} />;
  }

  const totalInflow = cashFlow.reduce((acc, c) => acc + (c.inflow || 0), 0);
  const totalOutflow = cashFlow.reduce((acc, c) => acc + (c.outflow || 0), 0);
  const netSurplus = totalInflow - totalOutflow;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cash Flow Dynamics</h1>
        <p className="text-xs text-slate-500 mt-1">Daily liquidity trajectory & cash movement timelines.</p>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Inflow"
          value={formatCurrency(totalInflow)}
          icon={ArrowDownRight}
          subtitle="Income credits recorded"
          color="text-emerald-600"
        />
        <StatCard
          title="Total Outflow"
          value={formatCurrency(totalOutflow)}
          icon={ArrowUpRight}
          subtitle="Expenses debited"
          color="text-red-500"
        />
        <StatCard
          title="Net Cash Position"
          value={formatCurrency(netSurplus)}
          icon={DollarSign}
          subtitle="Net monthly surplus liquidity"
          color="text-blue-600"
        />
      </div>

      {/* Running Liquidity Balance Area Chart */}
      <Card title="Running Cash Balance Trajectory" subtitle="Net liquidity accumulation over time">
        <div className="h-72 w-full mt-2">
          {cashFlow.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(d) => d.split('-').slice(1).join('/')} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="balance" stroke="#16a34a" strokeWidth={2.5} fill="url(#cfGrad)" name="Running Balance" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
              <p>No transaction logs recorded for cash flow calculation yet.</p>
            </div>
          )}
        </div>
      </Card>

      {/* AI Cash Flow Outlook */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white shadow-md flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-white/10 text-emerald-300">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">✦ AI Cash Flow Intelligence</h4>
          <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
            Net surplus for this billing period stands at <strong className="text-white font-bold">{formatCurrency(netSurplus)}</strong>. Maintaining a positive cash flow cushion prevents emergency high-interest borrowing.
          </p>
        </div>
      </div>
    </div>
  );
};
