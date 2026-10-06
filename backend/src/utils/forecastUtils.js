import axios from 'axios';
import { Transaction } from '../models/Transaction.js';
import { getMonthRange } from './dateUtils.js';

const HISTORY_MONTHS = 6;
const FORECAST_MONTHS = 3;

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const transactionTotal = (transactions, type) =>
  transactions.filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);

function linearProjection(values, offset) {
  const count = values.length;
  if (!count) return 0;
  if (count === 1) return Math.max(0, values[0]);

  const xMean = (count - 1) / 2;
  const yMean = values.reduce((total, value) => total + value, 0) / count;
  const denominator = values.reduce((total, _, index) => total + (index - xMean) ** 2, 0);
  const slope = values.reduce(
    (total, value, index) => total + (index - xMean) * (value - yMean),
    0
  ) / denominator;
  return Math.max(0, yMean + slope * (count - 1 + offset - xMean));
}

export async function buildForecast(userId, { allowML = true } = {}) {
  const currentMonth = getMonthRange();
  const firstHistoryMonth = getMonthRange(-HISTORY_MONTHS);
  const transactions = await Transaction.find({
    userId,
    date: { $gte: firstHistoryMonth.start, $lte: new Date() },
  }).select('date amount type category').lean();

  const groupedByMonth = new Map();
  const categoryNames = new Set();
  for (let offset = HISTORY_MONTHS; offset >= 0; offset -= 1) {
    const range = getMonthRange(-offset);
    groupedByMonth.set(monthKey(range.start), []);
  }
  for (const transaction of transactions) {
    const key = monthKey(new Date(transaction.date));
    if (groupedByMonth.has(key)) groupedByMonth.get(key).push(transaction);
    if (transaction.type === 'debit') categoryNames.add(transaction.category);
  }

  const history = [...groupedByMonth.entries()]
    .filter(([key]) => key < monthKey(currentMonth.start))
    .map(([key, monthTransactions]) => ({
      key,
      transactions: monthTransactions,
      income: transactionTotal(monthTransactions, 'credit'),
      expenses: transactionTotal(monthTransactions, 'debit'),
    }));
  const currentTransactions = groupedByMonth.get(monthKey(currentMonth.start)) || [];
  const hasHistory = history.some((month) => month.transactions.length > 0);
  const hasCurrentData = currentTransactions.length > 0;

  if (!hasHistory && !hasCurrentData) {
    return {
      forecast: [],
      avgIncome: 0,
      avgExpenses: 0,
      categoryForecasts: [],
      insufficientData: true,
      historyMonths: 0,
      message: 'Add transactions to build a personalized forecast.',
    };
  }

  const historicalExpenses = history.map((month) => month.expenses);
  const historicalIncomes = history.map((month) => month.income);
  const historicalTransactionMonths = history.filter((month) => month.transactions.length > 0).length;
  const daysInCurrentMonth = new Date(currentMonth.start.getFullYear(), currentMonth.start.getMonth() + 1, 0).getDate();
  const daysPassed = Math.max(1, Math.min(new Date().getDate(), daysInCurrentMonth));
  const currentMonthExpensePace = transactionTotal(currentTransactions, 'debit') / daysPassed * daysInCurrentMonth;
  const currentMonthIncomePace = transactionTotal(currentTransactions, 'credit') / daysPassed * daysInCurrentMonth;
  const expensesForProjection = hasHistory ? historicalExpenses : [currentMonthExpensePace];
  const incomesForProjection = hasHistory ? historicalIncomes : [currentMonthIncomePace];
  const average = (values) => values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

  let mlForecasts = [];
  if (allowML && historicalTransactionMonths >= 2) {
    const serviceUrl = (process.env.ML_SERVICE_URL || 'http://localhost:8001').replace(/\/+$/, '');
    try {
      const response = await axios.post(
        `${serviceUrl}/ml/forecast`,
        {
          currentSpending: historicalExpenses[historicalExpenses.length - 1] || 0,
          daysPassed: daysInCurrentMonth,
          historicalSpending: historicalExpenses,
          horizon: FORECAST_MONTHS,
        },
        {
          timeout: 1500,
          headers: process.env.ML_API_KEY ? { 'X-ML-Service-Key': process.env.ML_API_KEY } : {},
        }
      );
      mlForecasts = Array.isArray(response.data?.forecasts) ? response.data.forecasts : [];
    } catch (error) {
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'ml_forecast_unavailable',
        errorName: error.name || 'Error',
      }));
    }
  }

  const categoryForecasts = [...categoryNames].map((category) => {
    const monthlyAmounts = history.map((month) =>
      month.transactions
        .filter((transaction) => transaction.type === 'debit' && transaction.category === category)
        .reduce((total, transaction) => total + transaction.amount, 0)
    );
    const currentCategorySpend = transactionTotal(
      currentTransactions.filter((transaction) => transaction.category === category),
      'debit'
    );
    const predicted = hasHistory
      ? linearProjection(monthlyAmounts, 1)
      : currentCategorySpend / daysPassed * daysInCurrentMonth;
    return {
      category,
      predicted: Math.round(predicted),
      historicalAverage: Math.round(average(monthlyAmounts)),
    };
  }).sort((a, b) => b.predicted - a.predicted);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const forecast = Array.from({ length: FORECAST_MONTHS }, (_, index) => {
    const offset = index + 1;
    const futureMonth = new Date(currentMonth.start.getFullYear(), currentMonth.start.getMonth() + offset, 1);
    const mlProjection = mlForecasts.find((item) => item.monthOffset === offset);
    const projectedExpenses = mlProjection?.predictedSpending ??
      (history.length ? linearProjection(expensesForProjection, offset) : currentMonthExpensePace);
    const projectedIncome = history.length
      ? linearProjection(incomesForProjection, offset)
      : currentMonthIncomePace;
    const projectedCategories = categoryForecasts.map((category) => ({
      ...category,
      predicted: Math.round(hasHistory
        ? linearProjection(history.map((month) =>
          month.transactions
            .filter((transaction) => transaction.type === 'debit' && transaction.category === category.category)
            .reduce((total, transaction) => total + transaction.amount, 0)
        ), offset)
        : category.predicted),
    }));

    return {
      month: `${monthNames[futureMonth.getMonth()]} ${futureMonth.getFullYear()}`,
      projectedIncome: Math.round(projectedIncome),
      projectedExpenses: Math.round(projectedExpenses),
      projectedSavings: Math.round(projectedIncome - projectedExpenses),
      confidence: mlProjection?.confidence ??
        (historicalTransactionMonths >= 2 ? 65 : historicalTransactionMonths === 1 ? 35 : 25),
      categoryForecasts: projectedCategories,
    };
  });

  return {
    forecast,
    avgIncome: Math.round(history.length ? average(historicalIncomes) : currentMonthIncomePace),
    avgExpenses: Math.round(history.length ? average(historicalExpenses) : currentMonthExpensePace),
    categoryForecasts: forecast[0].categoryForecasts,
    insufficientData: historicalTransactionMonths < 2,
    historyMonths: historicalTransactionMonths,
    message: historicalTransactionMonths < 2
      ? 'This estimate is based on limited transaction history.'
      : null,
  };
}
