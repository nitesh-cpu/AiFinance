import { Budget } from '../models/Budget.js';
import { Transaction } from '../models/Transaction.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getMonthRange } from '../utils/dateUtils.js';
import { sendControllerError } from '../utils/controllerError.js';

// GET /api/budgets
export const getBudgets = async (req, res) => {
  try {
    const { start } = getMonthRange();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const budgets = await Budget.find({ userId: req.user._id });
    const [monthlySpend, weeklySpend] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: req.user._id, type: 'debit', date: { $gte: start, $lte: now } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { userId: req.user._id, type: 'debit', date: { $gte: weekStart, $lte: now } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ]),
    ]);
    const monthlyByCategory = new Map(monthlySpend.map((item) => [item._id, item.total]));
    const weeklyByCategory = new Map(weeklySpend.map((item) => [item._id, item.total]));
    const enriched = budgets.map((budget) => {
      const spentAmount = budget.period === 'weekly'
        ? weeklyByCategory.get(budget.category) || 0
        : monthlyByCategory.get(budget.category) || 0;
      return {
        ...budget.toObject(),
        spent: spentAmount,
        remaining: Math.max(0, budget.amount - spentAmount),
        percentage: budget.amount > 0 ? Math.min(100, Math.round((spentAmount / budget.amount) * 100)) : 0,
      };
    });

    return sendSuccess(res, 200, 'Budgets fetched', { budgets: enriched });
  } catch (error) {
    return sendControllerError(res, error, 'get_budgets', 'Failed to fetch budgets');
  }
};

// POST /api/budgets
export const createBudget = async (req, res) => {
  try {
    const { category, amount: rawAmount, period = 'monthly' } = req.body || {};
    const normalizedCategory = typeof category === 'string' ? category.trim() : '';
    const parsedAmount = Number(rawAmount);
    if (!normalizedCategory || normalizedCategory.length > 100 ||
      !Number.isFinite(parsedAmount) || parsedAmount <= 0 ||
      !['monthly', 'weekly'].includes(period)) {
      return sendError(res, 400, 'Provide a category (100 characters or fewer), positive amount, and valid period');
    }

    const existing = await Budget.findOne({ userId: req.user._id, category: normalizedCategory });
    if (existing) return sendError(res, 409, 'A budget already exists for this category');

    const budget = await Budget.create({
      userId: req.user._id,
      category: normalizedCategory,
      amount: parsedAmount,
      period,
    });
    return sendSuccess(res, 201, 'Budget created', { budget });
  } catch (error) {
    return sendControllerError(res, error, 'create_budget', 'Failed to create budget');
  }
};

// PUT /api/budgets/:id
export const updateBudget = async (req, res) => {
  try {
    const updates = {};
    const body = req.body || {};
    for (const field of ['category', 'amount', 'period', 'alertPercentage']) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    if (updates.category !== undefined) {
      if (typeof updates.category !== 'string' || !updates.category.trim() || updates.category.trim().length > 100) {
        return sendError(res, 400, 'Category must contain 1-100 characters');
      }
      updates.category = updates.category.trim();
    }
    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
      if (!Number.isFinite(updates.amount) || updates.amount <= 0) {
        return sendError(res, 400, 'Amount must be a positive number');
      }
    }
    if (updates.period !== undefined && !['monthly', 'weekly'].includes(updates.period)) {
      return sendError(res, 400, 'Period must be monthly or weekly');
    }
    if (updates.alertPercentage !== undefined) {
      updates.alertPercentage = Number(updates.alertPercentage);
      if (!Number.isFinite(updates.alertPercentage) || updates.alertPercentage < 1 || updates.alertPercentage > 100) {
        return sendError(res, 400, 'Alert percentage must be between 1 and 100');
      }
    }

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!budget) return sendError(res, 404, 'Budget not found');
    return sendSuccess(res, 200, 'Budget updated', { budget });
  } catch (error) {
    return sendControllerError(res, error, 'update_budget', 'Failed to update budget');
  }
};

// DELETE /api/budgets/:id
export const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!budget) return sendError(res, 404, 'Budget not found');
    return sendSuccess(res, 200, 'Budget deleted');
  } catch (error) {
    return sendControllerError(res, error, 'delete_budget', 'Failed to delete budget');
  }
};
