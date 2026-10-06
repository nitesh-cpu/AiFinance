import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Upload, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SearchBar } from '../components/common/SearchBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ProgressBar } from '../components/common/ProgressBar';
import { transactionService } from '../services/transactionService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

const CATEGORIES = [
  'Food & Dining','Shopping','Transport','Entertainment','Healthcare',
  'Education','Bills & Utilities','Travel','Investments','Salary','Freelance','Other',
];

const initialForm = {
  description: '', amount: '', type: 'debit',
  category: '', date: new Date().toISOString().split('T')[0], notes: '',
};

export const Transactions = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [refreshCount, setRefreshCount] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const csvRef = useRef();

  useEffect(() => {
    let active = true;
    transactionService.getCategories()
      .then((availableCategories) => {
        if (active && availableCategories.length > 0) setCategories(availableCategories);
      })
      .catch((err) => {
        addToast(err.response?.data?.message || 'Failed to load transaction categories', 'error');
      });

    return () => {
      active = false;
    };
  }, [addToast]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      params.page = page;
      params.limit = limit;
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;

      const res = await transactionService.getTransactions(params);
      setTransactions(res.transactions || []);
      const nextPagination = res.pagination || {};
      setPagination(nextPagination);
      if (page > Math.max(1, nextPagination.pages || 0)) {
        setPage(Math.max(1, nextPagination.pages || 1));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch transactions.');
      addToast('Failed to fetch transactions', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, categoryFilter, startDate, endDate, page, limit, sortBy, sortOrder, addToast]);

  useEffect(() => {
    const timer = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions, refreshCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount || parseFloat(form.amount) <= 0) {
      addToast('Please fill all required fields with valid values', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingTx) {
        const res = await transactionService.updateTransaction(editingTx._id, form);
        setTransactions((current) => current.map((t) => t._id === editingTx._id ? res.transaction : t));
        addToast('Transaction updated successfully!', 'success');
      } else {
        const res = await transactionService.createTransaction(form);
        setTransactions((current) => [res.transaction, ...current]);
        setPage(1);
        addToast('Transaction added successfully!', 'success');
      }
      setRefreshCount((count) => count + 1);
      setIsAddModalOpen(false);
      setEditingTx(null);
      setForm(initialForm);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await transactionService.deleteTransaction(selectedTx._id);
      setTransactions((current) => current.filter((t) => t._id !== selectedTx._id));
      setRefreshCount((count) => count + 1);
      addToast('Transaction deleted', 'success');
      setIsDeleteOpen(false);
      setSelectedTx(null);
    } catch {
      addToast('Failed to delete transaction', 'error');
    }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    setImportProgress(0);
    try {
      const res = await transactionService.importCSV(file, (event) => {
        if (event.total) setImportProgress(Math.round((event.loaded / event.total) * 100));
      });
      setImportResult(res);
      setIsImportResultOpen(true);
      setPage(1);
      setRefreshCount((count) => count + 1);
      const importedCount = res.imported ?? res.count ?? 0;
      if (importedCount > 0) {
        const outcome = [
          `${importedCount} imported`,
          res.duplicatesSkipped ? `${res.duplicatesSkipped} duplicates skipped` : null,
          res.invalidRows ? `${res.invalidRows} invalid rows` : null,
        ].filter(Boolean).join('; ');
        addToast(outcome, res.invalidRows ? 'info' : 'success');
      } else if (res.invalidRows) {
        addToast(`No transactions imported; ${res.invalidRows} rows need correction.`, 'error');
      } else if (res.duplicatesSkipped) {
        addToast(`No new transactions imported; ${res.duplicatesSkipped} duplicates skipped.`, 'info');
      } else {
        addToast('The CSV has no transaction rows to import.', 'info');
      }
    } catch (err) {
      const response = err.response?.data;
      setImportResult({
        failed: true,
        message: response?.message || 'CSV import failed.',
        errors: response?.errors || [],
      });
      setIsImportResultOpen(true);
      addToast(response?.message || 'CSV import failed.', 'error');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      e.target.value = '';
    }
  };

  const openEdit = (tx) => {
    setEditingTx(tx);
    setForm({
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      date: tx.date?.split('T')[0] || new Date().toISOString().split('T')[0],
      notes: tx.notes || '',
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pagination.total || 0} total transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={csvRef} accept=".csv,text/csv" onChange={handleCSVImport} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => csvRef.current.click()} icon={Upload} isLoading={isImporting} disabled={isImporting}>
            {isImporting ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setEditingTx(null); setForm(initialForm); setIsAddModalOpen(true); }} icon={Plus}>
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder="Search transactions..."
            className="flex-1 min-w-[200px]"
          />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="credit">Income</option>
            <option value="debit">Expense</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            From
            <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="text-xs border border-slate-200 rounded-xl px-2 py-2 text-slate-700 bg-white" />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            To
            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="text-xs border border-slate-200 rounded-xl px-2 py-2 text-slate-700 bg-white" />
          </label>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            aria-label="Sort transactions by"
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white"
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="description">Description</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
            aria-label="Sort direction"
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white"
          >
            <option value="desc">Newest / Descending</option>
            <option value="asc">Oldest / Ascending</option>
          </select>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            aria-label="Transactions per page"
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white"
          >
            {[20, 50, 100].map((size) => <option key={size} value={size}>{size} per page</option>)}
          </select>
          {(typeFilter !== 'all' || categoryFilter !== 'all' || search || startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={() => {
              setTypeFilter('all');
              setCategoryFilter('all');
              setSearch('');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }} icon={X}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {isImporting && (
        <Card>
          <p className="text-xs font-semibold text-slate-700 mb-2">Uploading and processing CSV...</p>
          <ProgressBar value={importProgress} max={100} showLabel />
        </Card>
      )}

      {/* Transactions List */}
      {loading ? (
        <LoadingSpinner label="Loading transactions..." />
      ) : error ? (
        <EmptyState
          title="Transactions unavailable"
          description={error}
          actionText="Retry"
          onAction={fetchTransactions}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Add your first transaction or import from CSV to get started."
          action={<Button variant="primary" onClick={() => setIsAddModalOpen(true)} icon={Plus}>Add Transaction</Button>}
        />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isCredit = tx.type === 'credit';
              return (
                <div key={tx._id} className="py-4 flex items-center justify-between hover:bg-slate-50/80 px-3 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {isCredit
                        ? <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                        : <ArrowUpRight className="w-5 h-5 text-slate-600" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{tx.description}</p>
                      <p className="text-xs text-slate-500">
                        <Badge variant={isCredit ? 'success' : 'default'} className="mr-1">{tx.category}</Badge>
                        {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(tx)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setSelectedTx(tx); setIsDeleteOpen(true); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {pagination.pages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing {pagination.total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, pagination.total || 0)} of {pagination.total || 0}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </Button>
            <span>Page {page} of {pagination.pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.pages || loading} onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isImportResultOpen}
        onClose={() => setIsImportResultOpen(false)}
        title={importResult?.failed ? 'CSV import failed' : 'CSV import summary'}
      >
        <div className="space-y-4">
          {importResult?.failed ? (
            <p className="text-sm text-rose-700">{importResult.message}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 p-3"><span className="block text-slate-500">Total rows</span><strong>{importResult?.totalRows ?? 0}</strong></div>
                <div className="rounded-xl bg-emerald-50 p-3"><span className="block text-slate-500">Imported</span><strong>{importResult?.imported ?? 0}</strong></div>
                <div className="rounded-xl bg-amber-50 p-3"><span className="block text-slate-500">Duplicates skipped</span><strong>{importResult?.duplicatesSkipped ?? 0}</strong></div>
                <div className="rounded-xl bg-rose-50 p-3"><span className="block text-slate-500">Invalid rows</span><strong>{importResult?.invalidRows ?? 0}</strong></div>
                <div className="rounded-xl bg-blue-50 p-3"><span className="block text-slate-500">Categorized rows</span><strong>{importResult?.categorizedRows ?? 0}</strong></div>
                <div className="rounded-xl bg-indigo-50 p-3"><span className="block text-slate-500">ML categorized</span><strong>{importResult?.mlCategorizedRows ?? 0}</strong></div>
              </div>
            </>
          )}
          {importResult?.errors?.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-3">
              <h4 className="text-xs font-bold text-slate-800 mb-2">Validation details</h4>
              <ul className="space-y-1 text-xs text-slate-600">
                {importResult.errors.map((item, index) => (
                  <li key={`${item.row || 'header'}-${index}`}>
                    {item.row ? `Row ${item.row}: ` : ''}{item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {importResult?.errorsTruncated && <p className="text-xs text-slate-500">Some row errors were omitted from this summary.</p>}
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setIsImportResultOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingTx(null); setForm(initialForm); }}
        title={editingTx ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            {['debit', 'credit'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  form.type === t
                    ? t === 'credit' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400' : 'bg-blue-100 text-blue-700 ring-2 ring-blue-400'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'credit' ? '↓ Income' : '↑ Expense'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Description *</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Swiggy Order, Salary"
                required
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Amount (₹) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                min="1"
                step="0.01"
                required
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Auto-categorize</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Notes (optional)</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setIsAddModalOpen(false); setEditingTx(null); }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>
              {editingTx ? 'Update' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${selectedTx?.description}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
