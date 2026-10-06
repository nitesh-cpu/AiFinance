import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Sparkles, TrendingUp, DollarSign, PiggyBank, CreditCard } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { reportService } from '../services/reportService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export const Reports = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getMonthlyReport();
      setReport(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch report.');
      console.error('Failed to fetch report', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = (type) => {
    addToast(`${type.toUpperCase()} export is not available yet.`, 'error');
  };

  if (loading) return <LoadingSpinner label="Generating executive financial report..." />;
  if (error) {
    return <EmptyState title="Report unavailable" description={error} actionText="Retry" onAction={fetchReport} />;
  }

  const summary = report?.summary || {};
  const topCategories = report?.topCategories || [];
  const topTransactions = report?.topTransactions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Period: {report?.period || 'Current Month'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
          <Button variant="primary" size="sm" icon={FileText} onClick={() => handleExport('pdf')}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Income" value={formatCurrency(summary.totalIncome || 0)} icon={DollarSign} subtitle="Monthly total inflow" color="text-emerald-600" />
        <StatCard title="Total Expenses" value={formatCurrency(summary.totalExpenses || 0)} icon={TrendingUp} subtitle="Monthly total outflow" color="text-red-500" />
        <StatCard title="Net Savings" value={formatCurrency(summary.netSavings || 0)} icon={PiggyBank} subtitle="Retained surplus" color="text-blue-600" />
        <StatCard title="Savings Rate" value={`${summary.savingsRate || 0}%`} icon={CreditCard} subtitle={`${summary.transactionCount || 0} total txns`} color="text-violet-600" />
      </div>

      {/* Top Categories & Top Outflow Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Spending Categories */}
        <Card title="Top Expense Categories" subtitle="Largest outflow drivers">
          <div className="space-y-3">
            {topCategories.length > 0 ? (
              topCategories.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{c.category}</span>
                    <span className="text-slate-900">{formatCurrency(c.amount)} ({c.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No spending data recorded.</p>
            )}
          </div>
        </Card>

        {/* Top Outflow Transactions */}
        <Card title="Largest Transactions" subtitle="Top 5 debits in this cycle">
          <div className="divide-y divide-slate-100">
            {topTransactions.length > 0 ? (
              topTransactions.map((tx) => (
                <div key={tx._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{tx.description}</span>
                    <span className="text-[11px] text-slate-400">{tx.category} • {formatDate(tx.date)}</span>
                  </div>
                  <span className="font-bold text-rose-600">-{formatCurrency(tx.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No transactions found.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Executive Summary Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md space-y-3">
        <div className="flex items-center gap-2 text-blue-300 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>✦ Executive AI Financial Summary</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          For period <strong className="text-white">{report?.period}</strong>, total inflow was {formatCurrency(summary.totalIncome || 0)} against total outflow of {formatCurrency(summary.totalExpenses || 0)}, yielding net retained savings of {formatCurrency(summary.netSavings || 0)} ({summary.savingsRate || 0}% savings rate).
        </p>
      </div>
    </div>
  );
};
