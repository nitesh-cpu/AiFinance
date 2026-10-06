import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import { Card } from '../components/common/Card';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { insightService } from '../services/insightService';
import { formatCurrency } from '../utils/formatters';

export const AIInsights = () => {
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState(null);
  const [insights, setInsights] = useState([]);
  const [personalizedAIEnabled, setPersonalizedAIEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [scoreRes, insightsRes] = await Promise.all([
          insightService.getHealthScore(),
          insightService.getInsights(),
        ]);
        setHealthScore(scoreRes);
        setInsights(insightsRes.insights || []);
        setPersonalizedAIEnabled(insightsRes.personalizedAIEnabled !== false);
      } catch (err) {
        console.error('Failed to load AI insights', err);
        setError(err.response?.data?.message || 'Failed to load financial insights.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [retryCount]);

  if (loading) return <LoadingSpinner label="Analyzing financial metrics & recommendations..." />;
  if (error) {
    return <EmptyState title="Financial insights unavailable" description={error} actionText="Retry" onAction={() => setRetryCount((count) => count + 1)} />;
  }

  const score = healthScore?.score ?? 0;
  const grade = healthScore?.grade ?? 'Not available';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Insights</h1>
        <p className="text-xs text-slate-500 mt-1">Smart financial health scoring & personalized behavior recommendations.</p>
      </div>

      {/* Financial Health Score Card */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Financial Health Score</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black text-slate-900 tracking-tight">{score}</span>
              <span className="text-sm font-bold text-slate-500">/ 100</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                score >= 60 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {grade}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-3 max-w-lg leading-relaxed">
              {healthScore?.insufficientData
                ? 'There are no transactions this month yet, so a meaningful health score is not available.'
                : `This score is based on your recorded income of ${formatCurrency(healthScore?.income || 0)} and expenses of ${formatCurrency(healthScore?.expenses || 0)} this month.`}
            </p>
          </div>

          <div className="w-full md:w-80 space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <ProgressBar value={score} max={100} color={score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-600' : 'bg-amber-500'} height="h-3" showLabel />
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-400 block">Savings Rate</span>
                <span className="font-bold text-slate-900">{healthScore?.savingsRate || 0}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Monthly Outflow</span>
                <span className="font-bold text-slate-900">{formatCurrency(healthScore?.expenses || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid of Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.length > 0 ? (
          insights.map((ins) => (
            <Card key={ins.id || ins.title} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${ins.impact === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                  {ins.impact === 'high' ? <AlertTriangle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{ins.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ins.message}</p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="col-span-2">
            <p className="text-xs text-slate-500 text-center py-6">
              {personalizedAIEnabled
                ? 'There are no personalized flags to show from your available transaction history.'
                : 'Personalized insights are turned off in AI & Privacy settings.'}
            </p>
          </Card>
        )}

      </div>

      {/* Privacy Guarantee Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-sm flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-blue-400 flex-shrink-0" />
        <div className="text-xs">
          <p className="font-bold text-white">Private & Secure Intelligence</p>
          <p className="text-slate-400 mt-0.5">Your insights use your account data. ML predictions are skipped when Transaction Data for AI is turned off.</p>
        </div>
      </div>
    </div>
  );
};
