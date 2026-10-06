import { Transaction } from '../models/Transaction.js';
import { sendSuccess } from '../utils/response.js';
import { getMonthRange } from '../utils/dateUtils.js';
import { sendControllerError } from '../utils/controllerError.js';

const roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// GET /api/analytics/overview
export const getOverview = async (req, res) => {
  try {
    const { start } = getMonthRange();
    const now = new Date();
    const { start: prevStart, end: prevEnd } = getMonthRange(-1);
    const comparablePrevEnd = new Date(prevStart);
    comparablePrevEnd.setDate(Math.min(now.getDate(), new Date(prevEnd.getFullYear(), prevEnd.getMonth() + 1, 0).getDate()));
    comparablePrevEnd.setHours(23, 59, 59, 999);

    const summaries = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          $or: [
            { date: { $gte: start, $lte: now } },
            { date: { $gte: prevStart, $lte: comparablePrevEnd } },
          ],
        },
      },
      {
        $group: {
          _id: {
            period: { $cond: [{ $gte: ['$date', start] }, 'current', 'previous'] },
            type: '$type',
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
    const amountFor = (period, type) =>
      roundMoney(summaries.find((item) => item._id.period === period && item._id.type === type)?.amount || 0);
    const income = amountFor('current', 'credit');
    const expenses = amountFor('current', 'debit');
    const prevIncome = amountFor('previous', 'credit');
    const prevExpenses = amountFor('previous', 'debit');
    const transactionCount = summaries
      .filter((item) => item._id.period === 'current')
      .reduce((total, item) => total + item.count, 0);
    const currentSavings = roundMoney(income - expenses);
    const previousSavings = roundMoney(prevIncome - prevExpenses);

    const pctChange = (curr, prev) =>
      prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);

    return sendSuccess(res, 200, 'Overview fetched', {
      totalIncome: income,
      totalExpenses: expenses,
      netSavings: currentSavings,
      savingsRate: income > 0 ? Math.round((currentSavings / income) * 100) : 0,
      transactionCount,
      changes: {
        income: pctChange(income, prevIncome),
        expenses: pctChange(expenses, prevExpenses),
        savings: pctChange(currentSavings, previousSavings),
      },
    });
  } catch (error) {
    return sendControllerError(res, error, 'analytics_overview', 'Failed to fetch overview');
  }
};

// GET /api/analytics/categories
export const getCategoryBreakdown = async (req, res) => {
  try {
    const { start } = getMonthRange();
    const categories = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'debit',
          date: { $gte: start, $lte: new Date() },
        },
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const roundedCategories = categories.map((item) => ({
      category: item._id,
      amount: roundMoney(item.amount),
    }));
    const total = roundMoney(roundedCategories.reduce((sum, item) => sum + item.amount, 0));
    const result = roundedCategories.map(({ category, amount }) => ({
      category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }));

    return sendSuccess(res, 200, 'Category breakdown fetched', { categories: result, total });
  } catch (error) {
    return sendControllerError(res, error, 'analytics_categories', 'Failed to fetch category breakdown');
  }
};

// GET /api/analytics/spending-trend
export const getSpendingTrend = async (req, res) => {
  try {
    const months = Array.from({ length: 6 }, (_, index) => getMonthRange(index - 5));
    const now = new Date();
    const groupedMonths = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: months[0].start, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: '$date',
                timezone: localTimezone(),
              },
            },
            type: '$type',
          },
          amount: { $sum: '$amount' },
        },
      },
    ]);
    const totals = new Map();
    for (const item of groupedMonths) {
      const month = totals.get(item._id.month) || { income: 0, expenses: 0 };
      if (item._id.type === 'credit') month.income = roundMoney(item.amount);
      if (item._id.type === 'debit') month.expenses = roundMoney(item.amount);
      totals.set(item._id.month, month);
    }
    const trend = months.map(({ start, label }) => {
      const { income = 0, expenses = 0 } = totals.get(monthKey(start)) || {};
      return { month: label, income, expenses, savings: roundMoney(income - expenses) };
    });

    return sendSuccess(res, 200, 'Spending trend fetched', { trend });
  } catch (error) {
    return sendControllerError(res, error, 'analytics_trend', 'Failed to fetch trend');
  }
};

// GET /api/analytics/cash-flow
export const getCashFlow = async (req, res) => {
  try {
    const { start } = getMonthRange();
    const dailyTotals = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: start, $lte: new Date() },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: 'UTC',
            },
          },
          inflow: {
            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
          },
          outflow: {
            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    let running = 0;
    const cashFlow = dailyTotals.map(({ _id: date, inflow, outflow }) => {
      const roundedInflow = roundMoney(inflow);
      const roundedOutflow = roundMoney(outflow);
      const net = roundMoney(roundedInflow - roundedOutflow);
      running = roundMoney(running + net);
      return { date, inflow: roundedInflow, outflow: roundedOutflow, net, balance: running };
    });

    return sendSuccess(res, 200, 'Cash flow fetched', { cashFlow });
  } catch (error) {
    return sendControllerError(res, error, 'analytics_cash_flow', 'Failed to fetch cash flow');
  }
};
