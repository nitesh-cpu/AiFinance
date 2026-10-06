import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { forecastService } from '../services/forecastService';
import { formatCurrency } from '../utils/formatters';

export const Forecast = () => {
  const [loading, setLoading] = useState(true);
  const [forecastData, setForecastData] = useState([]);
  const [forecastCategories, setForecastCategories] = useState([]);
  const [limitedHistory, setLimitedHistory] = useState(false);
  const [forecastMessage, setForecastMessage] = useState(null);
  const [avgExpenses, setAvgExpenses] = useState(0);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await forecastService.getForecast();
      setForecastData(res.forecast || []);
      setForecastCategories(res.categoryForecasts || []);
      setLimitedHistory(Boolean(res.insufficientData));
      setForecastMessage(res.message || null);
      setAvgExpenses(res.avgExpenses || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load forecast.');
      console.error('Failed to load forecast', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast, retryCount]);

  if (loading) return <LoadingSpinner label="Calculating financial projections..." />;
  if (error) {
    return <EmptyState title="Forecast unavailable" description={error} actionText="Retry" onAction={() => setRetryCount((count) => count + 1)} />;
  }

  const firstMonth = forecastData[0] || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Spending & Financial Forecast</h1>
        <p className="text-xs text-slate-500 mt-1">3-Month forward cash flow & expenditure projections based on recent trends.</p>
      </div>
      {limitedHistory && forecastMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {forecastMessage}
        </div>
      )}

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Avg Monthly Outflow"
          value={formatCurrency(avgExpenses)}
          icon={TrendingUp}
          subtitle="Recent baseline expenditure"
          color="text-red-500"
        />
        <StatCard
          title="Next Month Projected Spend"
          value={formatCurrency(firstMonth.projectedExpenses || 0)}
          subtitle={firstMonth.month || 'Next month'}
          color="text-indigo-600"
        />
        <StatCard
          title="Projected Next Savings"
          value={formatCurrency(firstMonth.projectedSavings || 0)}
          subtitle={`Prediction score: ${firstMonth.confidence || 85}%`}
          color="text-emerald-600"
        />
      </div>

      {/* 3-Month Projection Chart */}
      <Card title="3-Month Projected Outflow vs Inflow" subtitle="Forward financial trajectory">
        <div className="h-72 w-full mt-2">
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="projectedIncome" fill="#16a34a" name="Projected Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="projectedExpenses" fill="#7c3aed" name="Projected Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
              <p>Insufficient data to calculate 3-month forecast.</p>
            </div>
          )}
        </div>
      </Card>

      <Card title="Expected Category Spending" subtitle="Next month's category-level projection">
        {forecastCategories.length ? (
          <Table headers={['Category', 'Expected spending', 'Historical monthly average']}>
            {forecastCategories.slice(0, 8).map((item) => (
              <tr key={item.category} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3.5 font-medium text-slate-800">{item.category}</td>
                <td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(item.predicted)}</td>
                <td className="px-4 py-3.5 text-slate-600">{formatCurrency(item.historicalAverage)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="py-6 text-center text-xs text-slate-500">Category projections appear after transaction history is available.</p>
        )}
      </Card>

      {/* Forecast Table */}
      <Card title="Monthly Breakdown" subtitle="Detailed month-by-month financial projections">
        {forecastData.length ? (
          <Table headers={['Month', 'Projected Income', 'Projected Expenses', 'Projected Net Savings', 'Confidence']}>
            {forecastData.map((f, i) => (
              <tr key={i} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3.5 font-bold text-slate-900">{f.month}</td>
                <td className="px-4 py-3.5 font-bold text-emerald-600">{formatCurrency(f.projectedIncome)}</td>
                <td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(f.projectedExpenses)}</td>
                <td className={`px-4 py-3.5 font-bold ${f.projectedSavings >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  {formatCurrency(f.projectedSavings)}
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant="info">{f.confidence}%</Badge>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="py-6 text-center text-xs text-slate-500">A monthly forecast will appear once transaction history is available.</p>
        )}
      </Card>
    </div>
  );
};
