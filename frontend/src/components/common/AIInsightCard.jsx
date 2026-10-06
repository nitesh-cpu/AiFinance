import React, { useState } from 'react';
import { Sparkles, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from './Button';

export const AIInsightCard = ({ insight, onAction }) => {
  const [showExplanation, setShowExplanation] = useState(false);

  const getTheme = () => {
    switch (insight.type) {
      case 'warning':
        return {
          bg: 'bg-amber-50/50 border-amber-200/80',
          badge: 'bg-amber-100 text-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
        };
      case 'opportunity':
        return {
          bg: 'bg-emerald-50/50 border-emerald-200/80',
          badge: 'bg-emerald-100 text-emerald-800',
          icon: Sparkles,
          iconColor: 'text-emerald-600',
        };
      case 'prediction':
      default:
        return {
          bg: 'bg-blue-50/50 border-blue-200/80',
          badge: 'bg-blue-100 text-blue-800',
          icon: Sparkles,
          iconColor: 'text-blue-600',
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <div className={`rounded-2xl border ${theme.bg} p-5 shadow-xs transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl bg-white shadow-xs ${theme.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.badge}`}>
              ✦ AI Insight
            </span>
            <h4 className="text-base font-bold text-slate-900 mt-1">{insight.title}</h4>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 mt-3 leading-relaxed">{insight.description}</p>

      {insight.reason && (
        <div className="mt-2 text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-700">Reason: </span>
          {insight.reason}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Explain AI Decision</span>
          {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {insight.actionText && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAction && onAction(insight)}
          >
            <span>{insight.actionText}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </div>

      {/* Structured Explainability Flow: DATA -> ANALYSIS -> REASON -> PREDICTION -> ACTION */}
      {showExplanation && (
        <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs animate-fadeIn text-xs">
          <p className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>How this insight was generated</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px] mb-3">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 font-semibold text-center text-slate-700">
              1. DATA
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 font-semibold text-center text-slate-700">
              2. ANALYSIS
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 font-semibold text-center text-slate-700">
              3. REASON
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 font-semibold text-center text-slate-700">
              4. PREDICTION
            </div>
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 font-semibold text-center text-blue-800">
              5. ACTION
            </div>
          </div>

          <div className="space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/50">
            <div><strong className="text-slate-800">Data used:</strong> {insight.dataFlow?.data || 'Transaction log from last 30 days'}</div>
            <div><strong className="text-slate-800">Analysis:</strong> {insight.dataFlow?.analysis || 'Category variance modeling'}</div>
            <div><strong className="text-slate-800">Reason:</strong> {insight.dataFlow?.reason || insight.reason}</div>
            <div><strong className="text-slate-800">Prediction:</strong> {insight.dataFlow?.prediction || 'Potential spending variance'}</div>
            <div><strong className="text-blue-700">Action:</strong> {insight.dataFlow?.action || insight.actionText}</div>
          </div>
        </div>
      )}
    </div>
  );
};
