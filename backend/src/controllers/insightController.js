import { Transaction } from '../models/Transaction.js';
import { Anomaly } from '../models/Anomaly.js';
import { Budget } from '../models/Budget.js';
import axios from 'axios';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../utils/response.js';
import { getMonthRange } from '../utils/dateUtils.js';
import { buildForecast } from '../utils/forecastUtils.js';
import { sendControllerError } from '../utils/controllerError.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const formatAmount = (amount) => Math.round(amount).toLocaleString('en-IN');

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function analyzeTransactionAnomaly(transaction, historicalAmounts, allowML) {
  const baseline = historicalAmounts.reduce((total, amount) => total + amount, 0) / historicalAmounts.length;
  const usualRange = `₹${Math.round(Math.min(...historicalAmounts)).toLocaleString('en-IN')} – ₹${Math.round(Math.max(...historicalAmounts)).toLocaleString('en-IN')}`;
  const deviation = Math.round(((transaction.amount - baseline) / baseline) * 100);
  const fallback = {
    is_anomaly: transaction.amount >= baseline * 3,
    score: transaction.amount >= baseline * 3 ? 0.8 : 0.1,
    confidence: 70,
    severity: transaction.amount >= baseline * 5 ? 'High' : 'Medium',
    usual_range: usualRange,
    difference_percentage: `+${deviation}%`,
    reasons: [`This ${transaction.category} transaction is ${deviation}% above your average of ₹${Math.round(baseline).toLocaleString('en-IN')} across ${historicalAmounts.length} prior transactions.`],
  };
  if (!allowML) return fallback;

  const serviceUrl = (process.env.ML_SERVICE_URL || 'http://localhost:8001').replace(/\/+$/, '');
  try {
    const response = await axios.post(`${serviceUrl}/ml/anomaly`, {
      merchant: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      historical_amounts: historicalAmounts,
    }, {
      timeout: 1200,
      headers: process.env.ML_API_KEY ? { 'X-ML-Service-Key': process.env.ML_API_KEY } : {},
    });
    return response.data?.is_anomaly ? response.data : { ...response.data, ...fallback, is_anomaly: false };
  } catch (error) {
    console.warn(JSON.stringify({
      level: 'warn',
      event: 'ml_anomaly_unavailable',
      errorName: error.name || 'Error',
    }));
    return fallback;
  }
}

async function refreshAnomalies(userId, allowML = true) {
  const now = new Date();
  const historyStart = new Date(now.getTime() - 120 * DAY_MS);
  const candidateStart = new Date(now.getTime() - 30 * DAY_MS);
  const transactions = await Transaction.find({
    userId,
    type: 'debit',
    date: { $gte: historyStart, $lte: now },
  }).select('date amount category description').sort({ date: -1 }).limit(1200).lean();
  transactions.sort((left, right) => new Date(left.date) - new Date(right.date));

  const candidates = [];
  let hasSufficientHistory = false;
  for (const transaction of transactions) {
    const transactionDate = new Date(transaction.date);
    if (transactionDate < candidateStart) continue;
    const baselineStart = new Date(transactionDate.getTime() - 90 * DAY_MS);
    const historicalAmounts = transactions
      .filter((previous) =>
        previous.category === transaction.category &&
        previous._id.toString() !== transaction._id.toString() &&
        new Date(previous.date) >= baselineStart &&
        new Date(previous.date) < transactionDate
      )
      .map((previous) => previous.amount);
    if (historicalAmounts.length < 3) continue;
    hasSufficientHistory = true;
    const baseline = historicalAmounts.reduce((total, amount) => total + amount, 0) / historicalAmounts.length;
    if (transaction.amount >= baseline * 2.5) {
      candidates.push({ transaction, historicalAmounts, ratio: transaction.amount / baseline });
    }
  }

  const prioritized = candidates.sort((a, b) => b.ratio - a.ratio).slice(0, 20);
  const detected = await mapConcurrent(prioritized, 4, async ({ transaction, historicalAmounts }) => {
    const result = await analyzeTransactionAnomaly(transaction, historicalAmounts, allowML);
    if (!result.is_anomaly) return null;

    const baseline = historicalAmounts.reduce((total, amount) => total + amount, 0) / historicalAmounts.length;
    const deviation = Math.round(((transaction.amount - baseline) / baseline) * 100);
    const values = {
      userId,
      transactionId: transaction._id,
      merchant: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      score: Number(result.score) || 0.8,
      confidence: Number(result.confidence) || 70,
      severity: result.severity === 'High' ? 'High' : 'Medium',
      reasons: Array.isArray(result.reasons) && result.reasons.length
        ? result.reasons
        : [`Amount is ${deviation}% above your recent ${transaction.category} transaction average.`],
      usualRange: result.usual_range || `₹${Math.round(Math.min(...historicalAmounts))} – ₹${Math.round(Math.max(...historicalAmounts))}`,
      differencePercentage: result.difference_percentage || `+${deviation}%`,
    };
    try {
      return await Anomaly.findOneAndUpdate(
        { userId, transactionId: transaction._id },
        { $set: values, $setOnInsert: { status: 'unreviewed' } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      return Anomaly.findOneAndUpdate({ userId, transactionId: transaction._id }, { $set: values }, { new: true });
    }
  });

  const detectedIds = detected.filter(Boolean).map((anomaly) => anomaly._id);
  if (!detectedIds.length) return { anomalies: [], insufficientData: !hasSufficientHistory };
  const records = await Anomaly.find({
    userId,
    _id: { $in: detectedIds },
    status: { $ne: 'marked_normal' },
  }).populate('transactionId', 'description date').sort({ amount: -1 }).lean();

  const anomalyList = records.map((record) => {
    const difference = Number(String(record.differencePercentage).replace(/[^\d.-]/g, '')) || 0;
    return {
      id: record._id,
      description: record.transactionId?.description || record.merchant,
      amount: record.amount,
      category: record.category,
      date: record.transactionId?.date || record.updatedAt,
      expectedAmount: Math.round(record.amount / (1 + difference / 100)),
      deviation: difference,
      severity: record.severity.toLowerCase(),
      score: record.score,
      confidence: record.confidence,
      reasons: record.reasons,
      status: record.status,
    };
  });
  return { anomalies: anomalyList, insufficientData: !hasSufficientHistory };
}

function groupExpenses(transactions) {
  const totals = new Map();
  for (const transaction of transactions) {
    if (transaction.type !== 'debit') continue;
    totals.set(transaction.category, (totals.get(transaction.category) || 0) + transaction.amount);
  }
  return totals;
}

function makeInsight(type, title, message, impact = 'medium') {
  return { id: `${type}-${title}`, type, title, message, impact, icon: type };
}

// GET /api/insights/health-score
export const getHealthScore = async (req, res) => {
  try {
    const { start, end } = getMonthRange();
    const txns = await Transaction.find({ userId: req.user._id, date: { $gte: start, $lte: new Date(Math.min(end.getTime(), Date.now())) } }).lean();

    const income = txns.filter((t) => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
    const expenses = txns.filter((t) => t.type === 'debit').reduce((a, t) => a + t.amount, 0);
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    // Calculate score out of 100
    let score = txns.length ? 50 : 0;
    if (savingsRate >= 30) score += 30;
    else if (savingsRate >= 20) score += 20;
    else if (savingsRate >= 10) score += 10;
    if (txns.length > 10) score += 10;
    if (income > 0) score += 10;

    score = Math.min(100, Math.max(0, score));

    return sendSuccess(res, 200, 'Health score fetched', {
      score,
      grade: txns.length === 0 ? 'Not enough data' : score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Attention',
      savingsRate: Math.round(savingsRate),
      income,
      expenses,
      insufficientData: txns.length === 0,
    });
  } catch (err) {
    return sendControllerError(res, err, 'health_score', 'Failed to compute health score');
  }
};

// GET /api/insights
export const getInsights = async (req, res) => {
  try {
    const personalizedAIEnabled = req.user.preferences?.personalizedAI !== false;
    const allowML = req.user.preferences?.transactionDataForAI !== false;
    const { start } = getMonthRange();
    const now = new Date();
    const { start: previousStart, end: previousEnd } = getMonthRange(-1);
    const comparablePreviousEnd = new Date(previousStart);
    comparablePreviousEnd.setDate(Math.min(now.getDate(), new Date(previousEnd.getFullYear(), previousEnd.getMonth() + 1, 0).getDate()));
    comparablePreviousEnd.setHours(23, 59, 59, 999);
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const transactionWindowStart = weekStart < start ? weekStart : start;
    const [transactionWindow, previousTransactions, budgets, forecastData, anomalyData] = await Promise.all([
      Transaction.find({ userId: req.user._id, date: { $gte: transactionWindowStart, $lte: now } }).lean(),
      Transaction.find({ userId: req.user._id, date: { $gte: previousStart, $lte: comparablePreviousEnd } }).lean(),
      Budget.find({ userId: req.user._id }).lean(),
      buildForecast(req.user._id, { allowML }),
      refreshAnomalies(req.user._id, allowML),
    ]);
    const currentMonthTransactions = transactionWindow.filter((transaction) => new Date(transaction.date) >= start);
    const currentExpenses = groupExpenses(currentMonthTransactions);
    const weeklyExpenses = groupExpenses(transactionWindow.filter(
      (transaction) => new Date(transaction.date) >= weekStart
    ));
    const { anomalies } = anomalyData;
    const previousExpenses = groupExpenses(previousTransactions);
    const totalIncome = currentMonthTransactions
      .filter((transaction) => transaction.type === 'credit')
      .reduce((total, transaction) => total + transaction.amount, 0);
    const totalExpenses = [...currentExpenses.values()].reduce((total, amount) => total + amount, 0);
    const previousIncome = previousTransactions
      .filter((transaction) => transaction.type === 'credit')
      .reduce((total, transaction) => total + transaction.amount, 0);
    const previousTotalExpenses = [...previousExpenses.values()].reduce((total, amount) => total + amount, 0);
    const currentSavingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome * 100 : null;
    const previousSavingsRate = previousIncome > 0 ? (previousIncome - previousTotalExpenses) / previousIncome * 100 : null;
    const insights = [];
    const sortedCategories = [...currentExpenses.entries()].sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length) {
      const [category, amount] = sortedCategories[0];
      insights.push(makeInsight(
        'spending',
        `Top spending category: ${category}`,
        `You have spent ₹${formatAmount(amount)} on ${category} so far this month.`,
        'medium'
      ));
    }
    const categoryChanges = [...previousExpenses.entries()]
      .map(([category, previousAmount]) => ({
        category,
        previousAmount,
        amount: currentExpenses.get(category) || 0,
      }))
      .filter((item) => item.previousAmount > 0)
      .map((item) => ({ ...item, change: Math.round((item.amount - item.previousAmount) / item.previousAmount * 100) }))
      .filter((item) => Math.abs(item.change) >= 10)
      .sort((left, right) => Math.abs(right.change) - Math.abs(left.change));
    for (const { category, amount, previousAmount, change } of categoryChanges) {
      insights.push(makeInsight(
        'spending_alert',
        `${category} spending ${change > 0 ? 'increased' : 'decreased'} ${Math.abs(change)}%`,
        `You spent ₹${formatAmount(amount)} on ${category} this month, compared with ₹${formatAmount(previousAmount)} last month.`,
        change > 0 ? 'high' : 'positive'
      ));
      break;
    }

    if (currentSavingsRate !== null && previousSavingsRate !== null &&
      Math.abs(currentSavingsRate - previousSavingsRate) >= 3) {
      const change = Math.round(currentSavingsRate - previousSavingsRate);
      insights.push(makeInsight(
        'saving_opportunity',
        `Savings rate ${change > 0 ? 'improved' : 'fell'} by ${Math.abs(change)} points`,
        `Your savings rate changed from ${Math.round(previousSavingsRate)}% last month to ${Math.round(currentSavingsRate)}% this month.`,
        change > 0 ? 'positive' : 'high'
      ));
    } else if (totalIncome > 0 && totalExpenses > totalIncome) {
      insights.push(makeInsight(
        'cash_flow',
        'Expenses exceed income',
        `This month your expenses are ₹${formatAmount(totalExpenses - totalIncome)} higher than your recorded income.`,
        'high'
      ));
    }

    const dayOfMonth = Math.max(1, today.getDate());
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysInWeek = Math.max(1, Math.floor((today.getTime() - weekStart.getTime()) / DAY_MS) + 1);
    const budgetWarnings = budgets.map((budget) => {
      const periodDays = budget.period === 'weekly' ? 7 : daysInMonth;
      const elapsedDays = budget.period === 'weekly' ? daysInWeek : dayOfMonth;
      const spent = (budget.period === 'weekly' ? weeklyExpenses : currentExpenses)
        .get(budget.category) || 0;
      const projected = spent / elapsedDays * periodDays;
      const projectedSpend = projected;
      const ratio = budget.amount > 0 ? spent / budget.amount * 100 : 0;
      const reachedLimit = spent >= budget.amount;
      const projectedOverrun = !reachedLimit && projectedSpend > budget.amount;
      const approaching = !reachedLimit && !projectedOverrun &&
        ratio >= (budget.alertPercentage ?? 80);
      if (!reachedLimit && !projectedOverrun && !approaching) return null;

      const periodLabel = budget.period === 'weekly' ? 'this week' : 'this month';
      const warning = {
        category: budget.category,
        spent: Math.round(spent),
        budget: budget.amount,
        projected: Math.round(projectedSpend),
        percentage: Math.round(ratio),
        period: budget.period,
        status: reachedLimit ? 'exceeded' : projectedOverrun ? 'projected' : 'approaching',
        message: reachedLimit
          ? `You have spent ₹${formatAmount(spent)} of your ₹${formatAmount(budget.amount)} ${budget.category} budget ${periodLabel}.`
          : projectedOverrun
            ? `At the current pace, ${budget.category} spending may reach ₹${formatAmount(projectedSpend)}, about ₹${formatAmount(projectedSpend - budget.amount)} over your budget ${periodLabel}.`
            : `${budget.category} has reached ${Math.round(ratio)}% of its ₹${formatAmount(budget.amount)} budget ${periodLabel}.`,
      };
      return warning;
    }).filter(Boolean).sort((a, b) => b.percentage - a.percentage);

    for (const warning of budgetWarnings.slice(0, 2)) {
      insights.push(makeInsight(
        warning.status === 'approaching' ? 'budget_risk' : 'forecast',
        `${warning.category} budget ${warning.status === 'exceeded' ? 'exceeded' : warning.status === 'projected' ? 'at risk' : 'approaching'}`,
        warning.message,
        warning.status === 'approaching' ? 'medium' : 'high'
      ));
    }

    if (anomalies.length) {
      const anomaly = anomalies[0];
      insights.push(makeInsight(
        'spending_alert',
        `Unusual ${anomaly.category} transaction detected`,
        `${anomaly.description} was ₹${formatAmount(anomaly.amount)}, ${anomaly.deviation}% above your recent category baseline.`,
        'high'
      ));
    }

    const nextForecast = forecastData.forecast[0];
    if (nextForecast && forecastData.historyMonths > 0) {
      insights.push(makeInsight(
        'forecast',
        'Personalized next-month forecast',
        `Based on your recorded history, next month's expenses are estimated at ₹${formatAmount(nextForecast.projectedExpenses)} with projected savings of ₹${formatAmount(nextForecast.projectedSavings)}.`,
        nextForecast.projectedSavings < 0 ? 'high' : 'medium'
      ));
    }

    const impactOrder = { high: 0, medium: 1, positive: 2 };
    const selectedInsights = insights
      .sort((left, right) => impactOrder[left.impact] - impactOrder[right.impact])
      .slice(0, 6);
    return sendSuccess(res, 200, 'Insights fetched', {
      insights: personalizedAIEnabled ? selectedInsights : [],
      personalizedAIEnabled,
      budgetWarnings,
      forecast: nextForecast || null,
      forecastDataLimited: forecastData.insufficientData,
      anomalies,
      anomalyDataLimited: anomalyData.insufficientData,
      summary: {
        totalIncome,
        totalExpenses,
        savings: totalIncome - totalExpenses,
        savingsRate: currentSavingsRate === null ? null : Math.round(currentSavingsRate),
        topCategories: sortedCategories.slice(0, 5).map(([category, amount]) => ({ category, amount })),
      },
    });
  } catch (err) {
    return sendControllerError(res, err, 'get_insights', 'Failed to generate insights');
  }
};

// GET /api/insights/anomalies
export const getAnomalies = async (req, res) => {
  try {
    const { anomalies, insufficientData } = await refreshAnomalies(
      req.user._id,
      req.user.preferences?.transactionDataForAI !== false
    );
    return sendSuccess(res, 200, 'Anomalies fetched', { anomalies, insufficientData });
  } catch (err) {
    return sendControllerError(res, err, 'get_anomalies', 'Failed to detect anomalies');
  }
};

// PATCH /api/insights/anomalies/:id
export const updateAnomalyStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['reviewed', 'marked_normal'].includes(status)) {
      return sendError(res, 400, 'Status must be reviewed or marked_normal');
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 404, 'Anomaly not found');
    }
    const anomaly = await Anomaly.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status },
      { new: true, runValidators: true }
    );
    if (!anomaly) return sendError(res, 404, 'Anomaly not found');
    return sendSuccess(res, 200, 'Anomaly status updated', { anomaly });
  } catch (err) {
    return sendControllerError(res, err, 'update_anomaly_status', 'Failed to update anomaly status');
  }
};

// GET /api/insights/recurring
export const getRecurring = async (req, res) => {
  try {
    const txns = await Transaction.find({ userId: req.user._id, type: 'debit' }).sort({ date: -1 }).limit(300);

    const descMap = {};
    txns.forEach((t) => {
      const key = t.description.toLowerCase().trim();
      if (!descMap[key]) descMap[key] = { transactions: [], amount: t.amount, category: t.category, description: t.description };
      descMap[key].transactions.push(t);
    });

    const recurring = Object.values(descMap)
      .filter((g) => g.transactions.length >= 2)
      .map((g) => ({
        description: g.description,
        category: g.category,
        amount: g.amount,
        frequency: g.transactions.length >= 10 ? 'weekly' : g.transactions.length >= 3 ? 'monthly' : 'occasional',
        count: g.transactions.length,
        lastDate: g.transactions[0].date,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return sendSuccess(res, 200, 'Recurring expenses fetched', { recurring });
  } catch (err) {
    return sendControllerError(res, err, 'get_recurring', 'Failed to detect recurring expenses');
  }
};
