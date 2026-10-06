import React, { useState } from 'react';
import { User, Shield, Sparkles, Bell, Download, Trash2 } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Toggle } from '../components/common/Toggle';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userService } from '../services/userService';

export const Settings = () => {
  const { user, updateUserProfile, logout } = useAuth();
  const { addToast } = useToast();

  const [fullName, setFullName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [isSaving, setIsSaving] = useState(false);

  // Security Toggles
  const [twoFactor, setTwoFactor] = useState(user?.security?.twoFactorEnabled ?? false);

  // AI Privacy Toggles
  const [personalizedAI, setPersonalizedAI] = useState(user?.preferences?.personalizedAI ?? true);
  const [transactionDataForAI, setTransactionDataForAI] = useState(user?.preferences?.transactionDataForAI ?? true);
  const [explainAIDecisions, setExplainAIDecisions] = useState(user?.preferences?.explainAIDecisions ?? true);

  // Notifications Toggles
  const [budgetAlerts, setBudgetAlerts] = useState(user?.notifications?.budgetAlerts ?? true);
  const [anomalyAlerts, setAnomalyAlerts] = useState(user?.notifications?.anomalyAlerts ?? true);
  const [recurringReminders, setRecurringReminders] = useState(user?.notifications?.recurringReminders ?? true);
  const [weeklySummary, setWeeklySummary] = useState(user?.notifications?.weeklySummary ?? true);

  // Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await userService.updateProfile({ name: fullName, currency });
      updateUserProfile(res.user);
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      addToast('Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePreference = async (key, val) => {
    try {
      const updated = {
        twoFactorEnabled: key === 'twoFactor' ? val : twoFactor,
        personalizedAI: key === 'personalizedAI' ? val : personalizedAI,
        transactionDataForAI: key === 'transactionDataForAI' ? val : transactionDataForAI,
        explainAIDecisions: key === 'explainAIDecisions' ? val : explainAIDecisions,
      };
      const response = await userService.updatePreferences(updated);
      updateUserProfile(response.user);
      addToast('Preferences saved', 'success');
    } catch (err) {
      addToast('Failed to save preference', 'error');
    }
  };

  const handleToggleNotification = async (key, val) => {
    try {
      const updated = {
        budgetAlerts: key === 'budgetAlerts' ? val : budgetAlerts,
        anomalyAlerts: key === 'anomalyAlerts' ? val : anomalyAlerts,
        recurringReminders: key === 'recurringReminders' ? val : recurringReminders,
        weeklySummary: key === 'weeklySummary' ? val : weeklySummary,
      };
      const response = await userService.updateNotifications(updated);
      updateUserProfile(response.user);
      addToast('Notification settings saved', 'success');
    } catch (err) {
      addToast('Failed to save notification settings', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== 'DELETE') {
      addToast('Please type DELETE to confirm', 'error');
      return;
    }
    try {
      await userService.deleteAccount();
      addToast('Account deleted successfully', 'info');
      logout();
    } catch {
      addToast('Failed to delete account', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage profile information, preferences, and security options.</p>
      </div>

      {/* Profile Card */}
      <Card title="👤 User Profile">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Base Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
            </select>
          </div>

          <div className="pt-2 text-right">
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Security */}
      <Card title="🛡 Security">
        <div className="divide-y divide-slate-100">
          <Toggle
            label="Two-factor authentication"
            description="Require an extra verification step when signing in."
            enabled={twoFactor}
            onChange={(val) => {
              setTwoFactor(val);
              handleTogglePreference('twoFactor', val);
            }}
          />
        </div>
      </Card>

      {/* AI & Privacy */}
      <Card title="✦ AI & Privacy Settings">
        <div className="divide-y divide-slate-100">
          <Toggle
            label="Personalized AI Insights"
            description="Generate customized financial recommendations based on your spending logs."
            enabled={personalizedAI}
            onChange={(val) => {
              setPersonalizedAI(val);
              handleTogglePreference('personalizedAI', val);
            }}
          />
          <Toggle
            label="Transaction Data for AI"
            description="Allow the AI engine to use your spending history for smarter recommendations."
            enabled={transactionDataForAI}
            onChange={(val) => {
              setTransactionDataForAI(val);
              handleTogglePreference('transactionDataForAI', val);
            }}
          />
          <Toggle
            label="Smart Recommendation Reasons"
            description="Display reasoning and breakdown for financial recommendations."
            enabled={explainAIDecisions}
            onChange={(val) => {
              setExplainAIDecisions(val);
              handleTogglePreference('explainAIDecisions', val);
            }}
          />
        </div>
      </Card>

      {/* Notifications */}
      <Card title="🔔 Notification Preferences">
        <div className="divide-y divide-slate-100">
          <Toggle
            label="Budget Exceed Threshold Alerts"
            enabled={budgetAlerts}
            onChange={(val) => {
              setBudgetAlerts(val);
              handleToggleNotification('budgetAlerts', val);
            }}
          />
          <Toggle
            label="Anomaly Detection Alerts"
            enabled={anomalyAlerts}
            onChange={(val) => {
              setAnomalyAlerts(val);
              handleToggleNotification('anomalyAlerts', val);
            }}
          />
          <Toggle
            label="Recurring Payment Reminders"
            enabled={recurringReminders}
            onChange={(val) => {
              setRecurringReminders(val);
              handleToggleNotification('recurringReminders', val);
            }}
          />
          <Toggle
            label="Weekly Summary Emails"
            enabled={weeklySummary}
            onChange={(val) => {
              setWeeklySummary(val);
              handleToggleNotification('weeklySummary', val);
            }}
          />
        </div>
      </Card>

      {/* Danger Zone */}
      <Card title="⚠ Danger Zone">
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-rose-600 block">Delete Account</span>
              <span className="text-slate-500">Permanently erase all transaction data, budgets, and user settings.</span>
            </div>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setIsDeleteModalOpen(true)}>
              Delete Account
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Account">
        <div className="space-y-4 text-xs">
          <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-semibold">
            Warning: This process is irreversible. Type DELETE below to proceed.
          </p>
          <input
            type="text"
            value={deleteConfirmInput}
            onChange={(e) => setDeleteConfirmInput(e.target.value)}
            placeholder="DELETE"
            className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-rose-300 rounded-xl font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteAccount}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
