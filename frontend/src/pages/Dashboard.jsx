import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Wallet, TrendingUp, CreditCard, PiggyBank,
  Sparkles, ArrowRight, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { analyticsService } from '../services/analyticsService';
import { transactionService } from '../services/transactionService';
import { budgetService } from '../services/budgetService';
import { insightService } from '../services/insightService';
import { formatCurrency, formatDate } from '../utils/formatters';

const CATEGORY_COLORS = [
  '#2563eb','#7c3aed','#db2777','#ea580c','#16a34a',
  '#0891b2','#ca8a04','#dc2626','#65a30d','#9333ea',
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trend, setTrend] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, categoryRes, trendRes, txRes, budgetRes, intelligenceRes] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getCategoryBreakdown(),
          analyticsService.getSpendingTrend(),
          transactionService.getTransactions({ limit: 5 }),
          budgetService.getBudgets(),
          insightService.getInsights(),
        ]);
        setStats(overviewRes);
        setCategories((categoryRes.categories || []).map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })));
        setTrend(trendRes.trend || []);
        setRecentTx(txRes.transactions || []);
        setBudgets(budgetRes.budgets || []);
        setIntelligence(intelligenceRes);
      } catch (err) {
        console.error('Dashboard load failed:', err);
        setError(err.response?.data?.message || 'Failed to load your financial dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [retryCount]);

  if (loading) return <LoadingSpinner label="Loading your financial dashboard..." />;
  if (error) {
    return <EmptyState title="Dashboard unavailable" description={error} actionText="Retry" onAction={() => setRetryCount((count) => count + 1)} />;
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Here's your financial overview for {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/transactions')} icon={ArrowRight}>
          Add Transaction
        </Button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Income"
          value={formatCurrency(stats?.totalIncome || 0)}
          change={stats?.changes?.income}
          icon={TrendingUp}
          subtitle="Total inflow this month"
          color="text-emerald-600"
        />
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(stats?.totalExpenses || 0)}
          change={stats?.changes?.expenses}
          icon={CreditCard}
          subtitle="Total outflow this month"
          color="text-red-500"
        />
        <StatCard
          title="Net Savings"
          value={formatCurrency(stats?.netSavings || 0)}
          change={stats?.changes?.savings}
          icon={PiggyBank}
          subtitle="Savings this month"
          color="text-blue-600"
        />
        <StatCard
          title="Savings Rate"
          value={`${stats?.savingsRate || 0}%`}
          icon={Wallet}
          subtitle={`${stats?.transactionCount || 0} transactions`}
          color="text-violet-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Trend Chart */}
        <Card
          title="Income vs Expenses"
          subtitle="Last 6 months trend"
          className="lg:col-span-2"
        >
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(value), name === 'income' ? 'Income' : 'Expenses']}
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expenses" stroke="#2563eb" strokeWidth={2} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Category Donut */}
        <Card title="Spending by Category" subtitle="This month's breakdown">
          {categories.length > 0 ? (
            <>
              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={categories} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="amount">
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2 pt-2 border-t border-slate-100 max-h-32 overflow-y-auto">
                {categories.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-700 font-medium truncate">{cat.category}</span>
                    </div>
                    <span className="font-bold text-slate-900 ml-2">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p className="text-sm">No spending data yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/transactions')}>
                Add a transaction
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* AI Insight + Budget Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personalized financial insights */}
        <Card title="Personalized Financial Insights" subtitle="Based on your transactions and recent trends">
          {intelligence?.insights?.length ? (
            <div className="space-y-3">
              {intelligence.insights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${insight.impact === 'high' ? 'text-amber-500' : 'text-blue-500'}`} />
                    <h3 className="text-xs font-bold text-slate-900">{insight.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 ml-6">{insight.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-5 text-center">
              {intelligence?.personalizedAIEnabled === false
                ? 'Personalized insights are turned off in AI & Privacy settings.'
                : 'Add transactions to receive insights based on your spending history.'}
            </p>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/ai-insights')}
            className="w-fit mt-4"
          >
            <span>Explore AI Insights</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>

        {/* Budget Status */}
        <Card title="Budget Status" subtitle="Current-period budget progress">
          {budgets.length > 0 ? (
            <div className="space-y-3">
              {budgets.slice(0, 4).map((b) => (
                <div key={b._id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{b.category}</span>
                    <span className={`font-bold ${b.percentage >= 90 ? 'text-red-500' : b.percentage >= 70 ? 'text-orange-500' : 'text-slate-600'}`}>
                      {formatCurrency(b.spent || 0)} / {formatCurrency(b.amount)}
                    </span>
                  </div>
                  <ProgressBar
                    value={b.spent || 0}
                    max={b.amount}
                    color={b.percentage >= 90 ? 'bg-red-500' : b.percentage >= 70 ? 'bg-orange-400' : 'bg-blue-500'}
                    height="h-1.5"
                  />
                </div>
              ))}
              {intelligence?.budgetWarnings?.slice(0, 2).map((warning) => (
                <p key={`${warning.category}-${warning.status}`} className="text-[11px] text-amber-700">
                  {warning.message}
                </p>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate('/budgets')}>
                Manage Budgets <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <p className="text-sm">No budgets set up yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/budgets')}>
                Create Budget
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Next-Month Forecast"
          subtitle="Projected from your recorded transaction history"
          action={<Button variant="ghost" size="sm" onClick={() => navigate('/forecast')}>View forecast</Button>}
        >
          {intelligence?.forecast ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 block">Expected expenses</span>
                <strong className="text-lg text-slate-900">{formatCurrency(intelligence.forecast.projectedExpenses)}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Projected savings</span>
                <strong className={`text-lg ${intelligence.forecast.projectedSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(intelligence.forecast.projectedSavings)}
                </strong>
              </div>
              {intelligence.forecast.categoryForecasts?.length > 0 && (
                <p className="col-span-2 text-xs text-slate-500">
                  Highest expected category: {intelligence.forecast.categoryForecasts[0].category} ({formatCurrency(intelligence.forecast.categoryForecasts[0].predicted)})
                </p>
              )}
              {intelligence.forecastDataLimited && (
                <p className="col-span-2 text-xs text-amber-700">Estimate is based on limited history.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-5 text-center">Add transactions to build a personalized forecast.</p>
          )}
        </Card>

        <Card
          title="Unusual Spending"
          subtitle="Recent transactions compared with your category history"
          action={<Button variant="ghost" size="sm" onClick={() => navigate('/anomalies')}>View alerts</Button>}
        >
          {intelligence?.anomalies?.length ? (
            <div className="space-y-3">
              {intelligence.anomalies.slice(0, 3).map((anomaly) => (
                <div key={anomaly.id} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <strong className="text-slate-800">{anomaly.description}</strong>
                    <p className="text-slate-500 mt-0.5">{anomaly.category} · {anomaly.deviation}% above recent baseline</p>
                  </div>
                  <strong className="text-rose-600 whitespace-nowrap">{formatCurrency(anomaly.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-5 text-center">
              {intelligence?.anomalyDataLimited
                ? 'More transaction history is needed to establish a personal baseline.'
                : 'No unusual transactions detected from available history.'}
            </p>
          )}
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card
        title="Recent Transactions"
        subtitle="Latest financial activity"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
            View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        }
      >
        {recentTx.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentTx.map((tx) => {
              const isCredit = tx.type === 'credit';
              return (
                <div key={tx._id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCredit ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {isCredit
                        ? <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                        : <ArrowUpRight className="w-5 h-5 text-slate-600" />
                      }
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block truncate max-w-[200px]">{tx.description}</span>
                      <span className="text-[11px] text-slate-500">{tx.category} • {formatDate(tx.date)}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <p className="text-sm">No transactions yet. Start by adding one!</p>
          </div>
        )}
      </Card>
    </div>
  );
};
