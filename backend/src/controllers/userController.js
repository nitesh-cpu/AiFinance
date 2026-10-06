import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendControllerError } from '../utils/controllerError.js';

const getUserPreferences = (user) => ({
  ...user.preferences,
  personalizedAI: user.preferences?.personalizedAI ?? true,
  transactionDataForAI: user.preferences?.transactionDataForAI ?? true,
  explainAIDecisions: user.preferences?.explainAIDecisions ?? true,
});

const getUserNotifications = (user) => ({
  ...user.notifications,
  budgetAlerts: user.notifications?.budgetAlerts ?? true,
  anomalyAlerts: user.notifications?.anomalyAlerts ?? true,
  recurringReminders: user.notifications?.recurringReminders ?? true,
  weeklySummary: user.notifications?.weeklySummary ?? true,
});

const getUserSecurity = (user) => ({
  ...user.security,
  twoFactorEnabled: user.security?.twoFactorEnabled ?? false,
});

// PUT /api/user/profile
export const updateProfile = async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) {
        return sendError(res, 400, 'Name must contain 1-100 characters');
      }
      updates.name = body.name.trim();
    }
    if (body.currency !== undefined) {
      if (typeof body.currency !== 'string' || !body.currency.trim() || body.currency.trim().length > 16) {
        return sendError(res, 400, 'Currency must contain 1-16 characters');
      }
      updates.currency = body.currency.trim();
    }
    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, 'Provide a name or currency to update');
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );
    if (!user) return sendError(res, 404, 'User not found');
    return sendSuccess(res, 200, 'Profile updated', { user: user.toJSON() });
  } catch (error) {
    return sendControllerError(res, error, 'update_profile', 'Failed to update profile');
  }
};

// PUT /api/user/preferences
export const updatePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 404, 'User not found');

    const body = req.body || {};
    const nextPreferences = {
      ...getUserPreferences(user),
      personalizedAI: body.personalizedAI ?? body.personalizedInsights ?? getUserPreferences(user).personalizedAI,
      transactionDataForAI: body.transactionDataForAI ?? body.dataForAI ?? getUserPreferences(user).transactionDataForAI,
      explainAIDecisions: body.explainAIDecisions ?? getUserPreferences(user).explainAIDecisions,
    };

    const nextSecurity = {
      ...getUserSecurity(user),
      twoFactorEnabled: body.twoFactorEnabled ?? body.twoFactor ?? getUserSecurity(user).twoFactorEnabled,
    };

    user.preferences = nextPreferences;
    user.security = nextSecurity;
    await user.save();

    return sendSuccess(res, 200, 'Preferences updated', { user: user.toJSON() });
  } catch (error) {
    return sendControllerError(res, error, 'update_preferences', 'Failed to update preferences');
  }
};

// PUT /api/user/notifications
export const updateNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 404, 'User not found');

    const body = req.body || {};
    user.notifications = {
      ...getUserNotifications(user),
      budgetAlerts: body.budgetAlerts ?? getUserNotifications(user).budgetAlerts,
      anomalyAlerts: body.anomalyAlerts ?? getUserNotifications(user).anomalyAlerts,
      recurringReminders: body.recurringReminders ?? getUserNotifications(user).recurringReminders,
      weeklySummary: body.weeklySummary ?? getUserNotifications(user).weeklySummary,
    };

    await user.save();
    return sendSuccess(res, 200, 'Notification settings updated', { user: user.toJSON() });
  } catch (error) {
    return sendControllerError(res, error, 'update_notifications', 'Failed to update notifications');
  }
};

// DELETE /api/user/account
export const deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    return sendSuccess(res, 200, 'Account deleted successfully');
  } catch (error) {
    return sendControllerError(res, error, 'delete_account', 'Failed to delete account');
  }
};
