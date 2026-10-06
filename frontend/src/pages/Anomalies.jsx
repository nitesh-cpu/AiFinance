import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Eye, Info } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { insightService } from '../services/insightService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export const Anomalies = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState([]);
  const [insufficientHistory, setInsufficientHistory] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await insightService.getAnomalies();
      const list = res.anomalies || [];
      setAnomalies(list);
      setInsufficientHistory(Boolean(res.insufficientData));
      if (list.length > 0) {
        setSelectedAnomaly(list[0]);
      } else {
        setSelectedAnomaly(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load anomalies.');
      addToast('Failed to load anomalies', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies, retryCount]);

  const handleMarkAsNormal = async (id) => {
    try {
      await insightService.updateAnomalyStatus(id, 'marked_normal');
      setAnomalies((items) => items.filter((anomaly) => (anomaly.id || anomaly._id) !== id));
      addToast('Transaction marked as normal.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update the anomaly status.', 'error');
      return;
    }
    if ((selectedAnomaly?.id || selectedAnomaly?._id) === id) {
      setSelectedAnomaly(anomalies.find((a) => (a.id || a._id) !== id) || null);
    }
    setIsDetailModalOpen(false);
  };

  if (loading) return <LoadingSpinner label="Evaluating transaction patterns..." />;
  if (error) {
    return <EmptyState title="Anomalies unavailable" description={error} actionText="Retry" onAction={() => setRetryCount((count) => count + 1)} />;
  }

  const highRiskCount = anomalies.filter((a) => a.severity === 'high').length;
  const mediumRiskCount = anomalies.filter((a) => a.severity === 'medium').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Unusual Spending Alerts</h1>
        <p className="text-xs text-slate-500 mt-1">
          Smart detection flagging transactions that deviate significantly from your usual category spending baseline.
        </p>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Flagged Transactions"
          value={anomalies.length}
          icon={AlertTriangle}
          subtitle="Total unusual transactions"
          color="text-amber-500"
        />
        <StatCard
          title="High Severity"
          value={highRiskCount}
          icon={ShieldAlert}
          subtitle="Outflow > 4x category average"
          color="text-rose-600"
        />
        <StatCard
          title="Moderate Severity"
          value={mediumRiskCount}
          icon={Info}
          subtitle="Outflow > 2x category average"
          color="text-blue-600"
        />
      </div>

      {/* Table of Anomalies */}
      <Card title="Flagged Transactions" subtitle="Transactions exceeding category historical baselines">
        {anomalies.length > 0 ? (
          <Table headers={['Description', 'Amount', 'Category', 'Severity', 'Expected Baseline', 'Variance', 'Action']}>
            {anomalies.map((anom) => {
              const id = anom.id || anom._id;
              const isSelected = (selectedAnomaly?.id || selectedAnomaly?._id) === id;
              return (
                <tr
                  key={id}
                  className={`hover:bg-slate-50 transition cursor-pointer ${
                    isSelected ? 'bg-blue-50/50 font-semibold' : ''
                  }`}
                  onClick={() => setSelectedAnomaly(anom)}
                >
                  <td className="px-4 py-3.5 font-bold text-slate-900">{anom.description}</td>
                  <td className="px-4 py-3.5 font-bold text-rose-600">{formatCurrency(anom.amount)}</td>
                  <td className="px-4 py-3.5"><Badge>{anom.category}</Badge></td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${
                      anom.severity === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {anom.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">₹{anom.expectedAmount}</td>
                  <td className="px-4 py-3.5 font-bold text-rose-600">+{anom.deviation}%</td>
                  <td className="px-4 py-3.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnomaly(anom);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">
              {insufficientHistory ? 'More transaction history is needed' : 'No unusual spending detected'}
            </p>
            <p className="mt-1">
              {insufficientHistory
                ? 'Add at least a few transactions in the same category to establish a personal baseline.'
                : 'Your recent spending is within the available historical category baselines.'}
            </p>
          </div>
        )}
      </Card>

      {/* Selected Anomaly Breakdown */}
      {selectedAnomaly && (
        <Card
          title={`Alert Details: ${selectedAnomaly.description}`}
          subtitle={`Recorded on ${formatDate(selectedAnomaly.date)}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Category Baseline</span>
                <span className="font-bold text-slate-800">~₹{selectedAnomaly.expectedAmount}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Transaction Amount</span>
                <span className="font-bold text-rose-600">{formatCurrency(selectedAnomaly.amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Variance</span>
                <span className="font-bold text-rose-600">+{selectedAnomaly.deviation}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Severity</span>
                <span className="font-bold text-slate-900 uppercase">{selectedAnomaly.severity}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2">Detection Details:</h4>
              <ul className="space-y-1 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                  <span>Amount {formatCurrency(selectedAnomaly.amount)} is {selectedAnomaly.deviation}% above your average {selectedAnomaly.category} spend of ₹{selectedAnomaly.expectedAmount}.</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 justify-end">
              <Button variant="outline" onClick={() => handleMarkAsNormal(selectedAnomaly.id || selectedAnomaly._id)}>
                Dismiss & Mark Normal
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modal View */}
      {selectedAnomaly && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Alert Details: ${selectedAnomaly.description}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-semibold">
              ⚠️ Flagged as {selectedAnomaly.severity?.toUpperCase()} severity alert.
            </div>

            <div className="space-y-2 text-slate-700">
              <div><strong>Description:</strong> {selectedAnomaly.description}</div>
              <div><strong>Amount:</strong> {formatCurrency(selectedAnomaly.amount)}</div>
              <div><strong>Category:</strong> {selectedAnomaly.category}</div>
              <div><strong>Category Baseline:</strong> ₹{selectedAnomaly.expectedAmount}</div>
              <div><strong>Variance:</strong> +{selectedAnomaly.deviation}%</div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleMarkAsNormal(selectedAnomaly.id || selectedAnomaly._id)}>
                Mark as Normal
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
