import { Transaction } from '../models/Transaction.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getMonthRange } from '../utils/dateUtils.js';
import { sendControllerError } from '../utils/controllerError.js';

// GET /api/reports/monthly
export const getMonthlyReport = async (req, res) => {
  try {
    const { start, end, label } = getMonthRange();
    const txns = await Transaction.find({
      userId: req.user._id,
      date: { $gte: start, $lte: end },
    });

    const income = txns.filter((t) => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
    const expenses = txns.filter((t) => t.type === 'debit').reduce((a, t) => a + t.amount, 0);

    const catBreakdown = {};
    txns.filter((t) => t.type === 'debit').forEach((t) => {
      catBreakdown[t.category] = (catBreakdown[t.category] || 0) + t.amount;
    });

    const topCategories = Object.entries(catBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount, percentage: Math.round((amount / expenses) * 100) }));

    const topTransactions = txns
      .filter((t) => t.type === 'debit')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return sendSuccess(res, 200, 'Monthly report fetched', {
      period: label,
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        netSavings: income - expenses,
        savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
        transactionCount: txns.length,
      },
      topCategories,
      topTransactions,
    });
  } catch (error) {
    return sendControllerError(res, error, 'monthly_report', 'Failed to generate report');
  }
};
