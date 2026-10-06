import React, { useState, useEffect, useCallback } from 'react';
import { Repeat, Calendar, DollarSign, Sparkles, CheckCircle2 } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { insightService } from '../services/insightService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export const Recurring = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recurring, setRecurring] = useState([]);
  const [error, setError] = useState(null);

  const fetchRecurring = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await insightService.getRecurring();
      setRecurring(res.recurring || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load recurring expenses.');
      addToast('Failed to load recurring expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  if (loading) return <LoadingSpinner label="Auditing active subscriptions & recurring cadence..." />;
  if (error) {
    return <EmptyState title="Recurring expenses unavailable" description={error} actionText="Retry" onAction={fetchRecurring} />;
  }

  const totalMonthly = recurring.reduce((acc, curr) => acc + curr.amount, 0);
  const totalYearly = totalMonthly * 12;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recurring Expenses & Subscriptions</h1>
        <p className="text-xs text-slate-500 mt-1">AI-detected recurring transactions, EMIs, and monthly subscriptions.</p>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Monthly Commitment"
          value={formatCurrency(totalMonthly)}
          icon={Repeat}
          subtitle="Total active recurring outflow"
          color="text-blue-600"
        />
        <StatCard
          title="Tracked Payments"
          value={recurring.length}
          icon={Calendar}
          subtitle="Subscriptions & recurring items"
          color="text-indigo-600"
        />
        <StatCard
          title="Projected Annual Outflow"
          value={formatCurrency(totalYearly)}
          icon={DollarSign}
          subtitle="12-month commitment projection"
          color="text-amber-500"
        />
      </div>

      {/* Table */}
      <Card title="Detected Recurring Payments" subtitle="Pattern-matched from transaction history">
        {recurring.length > 0 ? (
          <Table headers={['Description', 'Amount', 'Category', 'Frequency', 'Total Occurrences', 'Last Recorded']}>
            {recurring.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3.5 font-bold text-slate-900">{item.description}</td>
                <td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                <td className="px-4 py-3.5"><Badge>{item.category}</Badge></td>
                <td className="px-4 py-3.5 capitalize font-medium text-slate-700">{item.frequency}</td>
                <td className="px-4 py-3.5 font-bold text-blue-600">{item.count} times</td>
                <td className="px-4 py-3.5 text-slate-500 text-xs">{formatDate(item.lastDate)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No recurring expenses detected</p>
            <p className="mt-1">Add more transaction data to enable automated recurring subscription matching.</p>
          </div>
        )}
      </Card>

      {/* AI Subscription Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Subscription Management</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            You spend {formatCurrency(totalMonthly)} every month on recurring fixed obligations.
          </h3>
          <p className="text-xs text-slate-300">
            Automating recurring audits ensures forgotten subscriptions don't quietly bleed your monthly cash flow.
          </p>
        </div>
      </div>
    </div>
  );
};
