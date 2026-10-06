import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, TrendingUp, CreditCard } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { analyticsService } from '../services/analyticsService';
import { formatCurrency } from '../utils/formatters';

const CATEGORY_COLORS = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#ca8a04','#dc2626','#65a30d'];

export const Analysis = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, categoryRes, trendRes] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getCategoryBreakdown(),
          analyticsService.getSpendingTrend(),
        ]);
        setStats(overviewRes);
        setCategories((categoryRes.categories || []).map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })));
        setTrend(trendRes.trend || []);
      } catch (err) {
        console.error('Failed to load analysis', err);
        setError(err.response?.data?.message || 'Failed to load spending analysis.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [retryCount]);

  if (loading) return <LoadingSpinner label="Analyzing spending velocity & pattern mechanics..." />;
  if (error) {
    return <EmptyState title="Analysis unavailable" description={error} actionText="Retry" onAction={() => setRetryCount((count) => count + 1)} />;
  }

  const totalExpenses = stats?.totalExpenses || 0;
  const avgDaily = totalExpenses > 0 ? Math.round(totalExpenses / 30) : 0;
  const topCategory = categories[0]?.category || 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Spending Analysis</h1>
          <p className="text-xs text-slate-500 mt-1">Deep-dive into your expenditure patterns and velocity.</p>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Monthly Spending"
          value={formatCurrency(totalExpenses)}
          change={stats?.changes?.expenses}
          subtitle="Total outflow this month"
          icon={CreditCard}
          color="text-red-500"
        />
        <StatCard
          title="Daily Average Burn"
          value={formatCurrency(avgDaily)}
          subtitle="Avg burn per calendar day"
          icon={TrendingUp}
          color="text-amber-500"
        />
        <StatCard
          title="Top Category"
          value={topCategory}
          subtitle={categories[0] ? `${formatCurrency(categories[0].amount)} spent` : 'No data'}
          icon={Sparkles}
          color="text-blue-600"
        />
      </div>

      {/* Spending Trend Chart */}
      <Card title="Monthly Spending & Income Trend" subtitle="6-month comparison chart">
        <div className="h-64 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Area type="monotone" dataKey="expenses" stroke="#2563eb" strokeWidth={2.5} fill="url(#trendGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category Breakdown & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spending List */}
        <Card title="Category Spending" subtitle="Breakdown by expense groups">
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{cat.category}</span>
                    <span className="text-slate-900">{formatCurrency(cat.amount)} ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No category data recorded yet.</p>
            )}
          </div>
        </Card>

        {/* Income vs Expense Bar */}
        <Card title="Income vs Outflow" subtitle="6-month financial trajectory">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="income" fill="#16a34a" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#2563eb" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Key Takeaway Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-white/10 text-blue-300">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">✦ Automated Spending Intelligence</h4>
          <p className="text-xs text-slate-200 mt-1 leading-relaxed">
            {categories.length > 0
              ? `Your top spending category is "${categories[0].category}" accounting for ${categories[0].percentage}% of total expenses (${formatCurrency(categories[0].amount)}). Managing this key category can significantly increase your monthly net savings.`
              : 'Add more transactions to generate customized spending behavioral analysis.'}
          </p>
        </div>
      </div>
    </div>
  );
};
