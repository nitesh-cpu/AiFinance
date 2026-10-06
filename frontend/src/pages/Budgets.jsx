import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Table } from '../components/common/Table';
import { ProgressBar } from '../components/common/ProgressBar';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { budgetService } from '../services/budgetService';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

const CATEGORIES = [
  'Food & Dining','Shopping','Transport','Entertainment','Healthcare',
  'Education','Bills & Utilities','Travel','Investments','Other',
];

export const Budgets = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form State
  const [newCategory, setNewCategory] = useState('Food & Dining');
  const [newAmount, setNewAmount] = useState('8000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await budgetService.getBudgets();
      setBudgets(res.budgets || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load budgets.');
      addToast('Failed to load budgets', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!newAmount || parseFloat(newAmount) <= 0) {
      addToast('Please enter a valid monthly amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await budgetService.createBudget({
        category: newCategory,
        amount: Number(newAmount),
      });
      fetchBudgets();
      addToast(`Budget created for ${newCategory}!`, 'success');
      setIsCreateModalOpen(false);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create budget', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async () => {
    try {
      await budgetService.deleteBudget(selectedBudget._id);
      setBudgets(budgets.filter((b) => b._id !== selectedBudget._id));
      addToast('Budget deleted', 'success');
      setIsDeleteOpen(false);
      setSelectedBudget(null);
    } catch {
      addToast('Failed to delete budget', 'error');
    }
  };

  if (loading) return <LoadingSpinner label="Calculating budget limits & variance threshold..." />;
  if (error) {
    return <EmptyState title="Budgets unavailable" description={error} actionText="Retry" onAction={fetchBudgets} />;
  }

  const totalBudget = budgets.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Budgets</h1>
          <p className="text-xs text-slate-500 mt-1">Set spending thresholds per category and track variance.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
          Create Budget
        </Button>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Allocated Budget" value={formatCurrency(totalBudget)} icon={Target} subtitle="Monthly spending limit" color="text-blue-600" />
        <StatCard title="Total Spent" value={formatCurrency(totalSpent)} subtitle="Outflow recorded this month" color="text-red-500" />
        <StatCard title="Available Remaining" value={formatCurrency(totalRemaining)} subtitle="Safe buffer before overrun" color="text-emerald-600" />
      </div>

      {/* Overall Progress Card */}
      <Card title="Monthly Budget Utilization" subtitle={`Overall spend rate (${overallPercentage}%)`}>
        <div className="space-y-2">
          <ProgressBar value={totalSpent} max={totalBudget || 1} color={overallPercentage > 90 ? 'bg-red-500' : 'bg-blue-600'} height="h-3" showLabel />
          <div className="flex justify-between text-xs text-slate-500 font-medium pt-1">
            <span>Spent: {formatCurrency(totalSpent)}</span>
            <span>Total Budget Limit: {formatCurrency(totalBudget)}</span>
          </div>
        </div>
      </Card>

      {/* Category Budgets Table */}
      <Card title="Category Budgets" subtitle="Track category progress against targets">
        {budgets.length > 0 ? (
          <Table headers={['Category', 'Monthly Limit', 'Spent', 'Remaining', 'Progress', 'Actions']}>
            {budgets.map((b) => {
              const spent = b.spent || 0;
              const limit = b.amount || 1;
              const pct = Math.round((spent / limit) * 100);
              const remaining = Math.max(0, limit - spent);
              const isOver = pct >= 90;

              return (
                <tr key={b._id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3.5 font-bold text-slate-900">{b.category}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(limit)}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700">{formatCurrency(spent)}</td>
                  <td className="px-4 py-3.5 font-semibold text-emerald-600">{formatCurrency(remaining)}</td>
                  <td className="px-4 py-3.5 min-w-[160px]">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <ProgressBar value={spent} max={limit} color={isOver ? 'bg-rose-500' : 'bg-blue-600'} height="h-2" />
                      </div>
                      <span className={`text-xs font-bold ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => { setSelectedBudget(b); setIsDeleteOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete Budget"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs">
            <p className="font-semibold text-slate-700">No active budgets found</p>
            <p className="mt-1">Click "Create Budget" above to set category spending caps.</p>
          </div>
        )}
      </Card>

      {/* Create Budget Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Budget">
        <form onSubmit={handleCreateBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Monthly Limit (₹)</label>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="8000"
              min="100"
              required
              className="w-full px-4 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" type="submit" isLoading={isSubmitting}>
              Create Budget
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteBudget}
        title="Delete Budget"
        message={`Are you sure you want to delete the budget for ${selectedBudget?.category}?`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
