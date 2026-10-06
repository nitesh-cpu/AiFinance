import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI ||= 'mongodb://127.0.0.1:27017/spendsense_test';
process.env.JWT_SECRET ||= 'test-only-secret-with-at-least-32-characters';
process.env.ML_SERVICE_URL ||= 'http://127.0.0.1:1';

const databaseName = new URL(process.env.MONGO_URI).pathname.slice(1);
assert.match(databaseName, /test/i, 'API tests must use a MongoDB database with "test" in its name');

const createdUserIds = [];
const apiHost = '127.0.0.1';
let baseUrl;
let server;
let app;
let mongoose;
let User;
let Transaction;
let Budget;
let Anomaly;
let userA;
let userB;
let headersA;
let headersB;

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: ['Bearer', token].join(' ') } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}

async function importCsv(token, content) {
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/csv' }), 'transactions.csv');
  const response = await fetch(`${baseUrl}/api/transactions/import-csv`, {
    method: 'POST',
    headers: { Authorization: ['Bearer', token].join(' ') },
    body: form,
  });
  return { status: response.status, body: await response.json() };
}

async function createTransaction(token, date, description, amount, type = 'expense', category = 'Food') {
  return request('/api/transactions', {
    method: 'POST',
    token,
    body: { date, description, amount, type, category },
  });
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

describe('SpendSense authenticated financial API', { concurrency: false }, () => {
  before(async () => {
    ({ default: mongoose } = await import('mongoose'));
    ({ User } = await import('../src/models/User.js'));
    ({ Transaction } = await import('../src/models/Transaction.js'));
    ({ Budget } = await import('../src/models/Budget.js'));
    ({ Anomaly } = await import('../src/models/Anomaly.js'));
    ({ default: app } = await import('../src/app.js'));
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    server = app.listen(0, apiHost);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    baseUrl = `http://${apiHost}:${server.address().port}`;

    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const registrationA = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'API Test A', email: `api-test-a-${unique}@example.invalid`, password: 'test-password-123' },
    });
    const registrationB = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'API Test B', email: `api-test-b-${unique}@example.invalid`, password: 'test-password-456' },
    });
    assert.equal(registrationA.status, 201);
    assert.equal(registrationB.status, 201);
    userA = registrationA.body.user;
    userB = registrationB.body.user;
    createdUserIds.push(userA._id, userB._id);
    headersA = registrationA.body.token;
    headersB = registrationB.body.token;
  });

  after(async () => {
    if (createdUserIds.length && mongoose?.connection?.readyState === 1) {
      await Promise.all([
        Transaction.deleteMany({ userId: { $in: createdUserIds } }),
        Budget.deleteMany({ userId: { $in: createdUserIds } }),
        Anomaly.deleteMany({ userId: { $in: createdUserIds } }),
        User.deleteMany({ _id: { $in: createdUserIds } }),
      ]);
    }
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose?.connection?.readyState) await mongoose.disconnect();
  });

  it('validates registration and login, protects private routes, and revokes tokens after password change', async () => {
    const invalidRegistration = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Bad Password', email: 'bad-password@example.invalid', password: 'short' },
    });
    assert.equal(invalidRegistration.status, 400);

    const duplicateRegistration = await request('/api/auth/register', {
      method: 'POST',
      body: { name: userA.name, email: userA.email.toUpperCase(), password: 'test-password-123' },
    });
    assert.equal(duplicateRegistration.status, 409);

    const unauthorized = await request('/api/transactions');
    assert.equal(unauthorized.status, 401);

    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: userA.email, password: 'incorrect-password' },
    });
    assert.equal(badLogin.status, 401);

    const changed = await request('/api/auth/change-password', {
      method: 'PUT',
      token: headersA,
      body: { currentPassword: 'test-password-123', newPassword: 'test-password-789' },
    });
    assert.equal(changed.status, 200);

    const revoked = await request('/api/transactions', { token: headersA });
    assert.equal(revoked.status, 401);

    const relogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: userA.email, password: 'test-password-789' },
    });
    assert.equal(relogin.status, 200);
    headersA = relogin.body.token;

    const missingProfileUpdate = await request('/api/user/profile', {
      method: 'PUT',
      token: headersA,
    });
    assert.equal(missingProfileUpdate.status, 400);
  });

  it('validates transactions and enforces user-scoped transaction and budget access', async () => {
    const missingTransaction = await request('/api/transactions', {
      method: 'POST',
      token: headersA,
    });
    assert.equal(missingTransaction.status, 400);

    const invalidTransaction = await createTransaction(headersA, daysAgo(0), 'Invalid amount', -1);
    assert.equal(invalidTransaction.status, 400);

    const created = await createTransaction(headersA, daysAgo(0), 'Current food', 100);
    assert.equal(created.status, 201);
    assert.equal(created.body.transaction.category, 'Food');
    const uncategorized = await request('/api/transactions', {
      method: 'POST',
      token: headersA,
      body: { description: 'Uber ride', amount: 50, type: 'expense' },
    });
    assert.equal(uncategorized.status, 201);
    assert.equal(uncategorized.body.transaction.category, 'Transport');
    const timezoneLessDate = await createTransaction(
      headersA,
      '2026-10-06T12:30:00',
      'Timezone-less timestamp',
      1
    );
    assert.equal(timezoneLessDate.status, 201);
    assert.equal(timezoneLessDate.body.transaction.date, '2026-10-06T12:30:00.000Z');
    const emptyUpdate = await request(`/api/transactions/${created.body.transaction._id}`, {
      method: 'PUT',
      token: headersA,
    });
    assert.equal(emptyUpdate.status, 400);
    const otherUserList = await request('/api/transactions', { token: headersB });
    assert.equal(otherUserList.body.transactions.length, 0);

    const badBudget = await request('/api/budgets', {
      method: 'POST',
      token: headersA,
      body: { category: 'Food', amount: -20, period: 'monthly' },
    });
    assert.equal(badBudget.status, 400);

    const createdBudget = await request('/api/budgets', {
      method: 'POST',
      token: headersA,
      body: { category: 'Food', amount: 250, period: 'monthly' },
    });
    assert.equal(createdBudget.status, 201);
    const duplicateBudget = await request('/api/budgets', {
      method: 'POST',
      token: headersA,
      body: { category: 'Food', amount: 250 },
    });
    assert.equal(duplicateBudget.status, 409);

    const crossUserUpdate = await request(`/api/budgets/${createdBudget.body.budget._id}`, {
      method: 'PUT',
      token: headersB,
      body: { amount: 500 },
    });
    assert.equal(crossUserUpdate.status, 404);

    const crossUserTransactionUpdate = await request(`/api/transactions/${created.body.transaction._id}`, {
      method: 'PUT',
      token: headersB,
      body: { amount: 999 },
    });
    assert.equal(crossUserTransactionUpdate.status, 404);

    const crossUserTransactionDelete = await request(`/api/transactions/${created.body.transaction._id}`, {
      method: 'DELETE',
      token: headersB,
    });
    assert.equal(crossUserTransactionDelete.status, 404);
  });

  it('aggregates analytics per user and rounds monetary summaries to cents', async () => {
    const now = new Date();
    const currentDate = now.toISOString();
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12).toISOString();
    assert.equal((await createTransaction(headersB, currentDate, 'Analytics decimal one', 0.1)).status, 201);
    assert.equal((await createTransaction(headersB, currentDate, 'Analytics decimal two', 0.2)).status, 201);
    assert.equal((await createTransaction(headersB, previousMonthDate, 'Analytics prior income', 1.25, 'income')).status, 201);

    const overview = await request('/api/analytics/overview', { token: headersB });
    assert.equal(overview.status, 200);
    assert.equal(overview.body.totalExpenses, 0.3);
    assert.equal(overview.body.transactionCount, 2);

    const categories = await request('/api/analytics/categories', { token: headersB });
    assert.equal(categories.status, 200);
    assert.equal(categories.body.total, 0.3);
    assert.equal(categories.body.categories.find((item) => item.category === 'Food').amount, 0.3);

    const trend = await request('/api/analytics/spending-trend', { token: headersB });
    assert.equal(trend.status, 200);
    assert.equal(trend.body.trend.length, 6);
    assert.equal(trend.body.trend.at(-1).expenses, 0.3);
    assert.equal(trend.body.trend.at(-2).income, 1.25);

    const cashFlow = await request('/api/analytics/cash-flow', { token: headersB });
    assert.equal(cashFlow.status, 200);
    assert.equal(cashFlow.body.cashFlow.at(-1).outflow, 0.3);

    const isolatedOverview = await request('/api/analytics/overview', { token: headersA });
    assert.notEqual(isolatedOverview.body.totalExpenses, 0.3);
  });

  it('imports CSV with validation, duplicate skipping, user isolation, recurring detection, and reports', async () => {
    const date = new Date();
    date.setDate(Math.max(1, date.getDate() - 1));
    const dateText = date.toISOString().slice(0, 10);
    const csvContent = [
      'Date,Description,Amount,Type,Category',
      `${dateText},Amazon headphones,2499,expense,`,
      `${dateText},  Amazon   headphones  ,2499,debit,`,
      `${dateText},Invalid purchase,-20,expense,Shopping`,
    ].join('\n');

    const imported = await importCsv(headersA, csvContent);
    assert.equal(imported.status, 201);
    assert.equal(imported.body.totalRows, 3);
    assert.equal(imported.body.imported, 1);
    assert.equal(imported.body.duplicatesSkipped, 1);
    assert.equal(imported.body.invalidRows, 1);

    const ownCsvTransaction = await request('/api/transactions?search=Amazon', { token: headersA });
    assert.equal(ownCsvTransaction.body.transactions.length, 1);
    assert.equal(ownCsvTransaction.body.transactions[0].category, 'Shopping');
    const repeatedImport = await importCsv(headersA, csvContent);
    assert.equal(repeatedImport.body.imported, 0);
    assert.equal(repeatedImport.body.duplicatesSkipped, 2);

    const otherUserImport = await importCsv(headersB, csvContent);
    assert.equal(otherUserImport.body.imported, 1);

    const months = [-2, -1, 0];
    for (const offset of months) {
      const recurringDate = new Date();
      recurringDate.setMonth(recurringDate.getMonth() + offset, 1);
      recurringDate.setHours(0, 0, 0, 0);
      assert.equal(
        (await createTransaction(headersA, recurringDate.toISOString(), 'Demo Netflix Subscription', 649, 'expense', 'Entertainment')).status,
        201
      );
    }
    const recurring = await request('/api/insights/recurring', { token: headersA });
    assert.equal(recurring.status, 200);
    assert.ok(recurring.body.recurring.some((item) => item.description === 'Demo Netflix Subscription' && item.count === 3));

    const report = await request('/api/reports/monthly', { token: headersA });
    assert.equal(report.status, 200);
    assert.ok(report.body.summary.totalExpenses >= 2499);

    const malformedHeader = await importCsv(headersA, 'Date,Amount\n2026-10-01,10');
    assert.equal(malformedHeader.status, 400);
  });

  it('returns user-specific budget, insight, forecast, and persisted anomaly results', async () => {
    await createTransaction(headersA, daysAgo(75), 'History food one', 100);
    await createTransaction(headersA, daysAgo(55), 'History food two', 110);
    await createTransaction(headersA, daysAgo(35), 'History food three', 120);
    await createTransaction(headersA, daysAgo(1), 'Unusual food purchase', 500);

    const insights = await request('/api/insights', { token: headersA });
    assert.equal(insights.status, 200);
    assert.ok(insights.body.summary.totalExpenses > 0);
    assert.ok(insights.body.budgetWarnings.some((warning) => warning.category === 'Food'));

    const forecast = await request('/api/forecast', { token: headersA });
    assert.equal(forecast.status, 200);
    assert.equal(forecast.body.forecast.length, 3);
    assert.ok(forecast.body.categoryForecasts.some((item) => item.category === 'Food'));

    const anomalies = await request('/api/insights/anomalies', { token: headersA });
    assert.equal(anomalies.status, 200);
    const anomaly = anomalies.body.anomalies.find((item) => item.description === 'Unusual food purchase');
    assert.ok(anomaly);

    const missingStatus = await request(`/api/insights/anomalies/${anomaly.id}`, {
      method: 'PATCH',
      token: headersA,
    });
    assert.equal(missingStatus.status, 400);

    const otherUserAnomalies = await request('/api/insights/anomalies', { token: headersB });
    assert.equal(otherUserAnomalies.body.anomalies.length, 0);

    const markedNormal = await request(`/api/insights/anomalies/${anomaly.id}`, {
      method: 'PATCH',
      token: headersA,
      body: { status: 'marked_normal' },
    });
    assert.equal(markedNormal.status, 200);
    const refresh = await request('/api/insights/anomalies', { token: headersA });
    assert.equal(refresh.body.anomalies.some((item) => item.id === anomaly.id), false);

    const records = await Anomaly.find({ userId: userA._id });
    assert.ok(records.length > 0);
  });

  it('returns an empty forecast and an insufficient-history response for a new user', async () => {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Empty History Test',
        email: `empty-history-${unique}@example.invalid`,
        password: 'test-password-123',
      },
    });
    assert.equal(registration.status, 201);
    createdUserIds.push(registration.body.user._id);

    const forecast = await request('/api/forecast', { token: registration.body.token });
    assert.equal(forecast.status, 200);
    assert.deepEqual(forecast.body.forecast, []);
    assert.equal(forecast.body.insufficientData, true);

    const anomalies = await request('/api/insights/anomalies', { token: registration.body.token });
    assert.equal(anomalies.status, 200);
    assert.equal(anomalies.body.insufficientData, true);
  });
});
