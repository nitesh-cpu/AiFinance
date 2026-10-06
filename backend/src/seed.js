import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User.js';
import { Transaction } from './models/Transaction.js';
import { Budget } from './models/Budget.js';
import { Anomaly } from './models/Anomaly.js';
import { Forecast } from './models/Forecast.js';
import { Insight } from './models/Insight.js';
import { Notification } from './models/Notification.js';
import { RecurringExpense } from './models/RecurringExpense.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD;
const DEMO_NAME = process.env.SEED_DEMO_NAME || 'SpendSense Demo User';

const sampleTransactions = [
  // Income
  { description: 'Monthly Salary - TCS', amount: 85000, type: 'credit', category: 'Salary' },
  { description: 'Freelance Project - UI Design', amount: 15000, type: 'credit', category: 'Freelance' },
  // Food
  { description: 'Swiggy Order - Biryani', amount: 450, type: 'debit', category: 'Food & Dining' },
  { description: 'Zomato Order - Pizza', amount: 650, type: 'debit', category: 'Food & Dining' },
  { description: 'Cafe Coffee Day', amount: 380, type: 'debit', category: 'Food & Dining' },
  { description: 'Swiggy Instamart - Groceries', amount: 1200, type: 'debit', category: 'Food & Dining' },
  // Shopping
  { description: 'Amazon - Headphones', amount: 3499, type: 'debit', category: 'Shopping' },
  { description: 'Flipkart - T-Shirts', amount: 1299, type: 'debit', category: 'Shopping' },
  { description: 'Myntra - Jeans', amount: 2199, type: 'debit', category: 'Shopping' },
  // Transport
  { description: 'Uber - Office Commute', amount: 280, type: 'debit', category: 'Transport' },
  { description: 'Ola - Weekend Trip', amount: 450, type: 'debit', category: 'Transport' },
  { description: 'BPCL Petrol', amount: 2500, type: 'debit', category: 'Transport' },
  // Entertainment
  { description: 'Netflix Subscription', amount: 649, type: 'debit', category: 'Entertainment' },
  { description: 'Spotify Premium', amount: 119, type: 'debit', category: 'Entertainment' },
  { description: 'Disney+ Hotstar', amount: 299, type: 'debit', category: 'Entertainment' },
  // Bills
  { description: 'Electricity Bill - BSES', amount: 2100, type: 'debit', category: 'Bills & Utilities' },
  { description: 'Airtel Broadband', amount: 799, type: 'debit', category: 'Bills & Utilities' },
  { description: 'Jio Mobile Recharge', amount: 299, type: 'debit', category: 'Bills & Utilities' },
  // Healthcare
  { description: 'Apollo Pharmacy', amount: 850, type: 'debit', category: 'Healthcare' },
  // Investments
  { description: 'SIP - Axis Bluechip Fund', amount: 5000, type: 'debit', category: 'Investments' },
  { description: 'Zerodha - NIFTY50 ETF', amount: 10000, type: 'debit', category: 'Investments' },
];

async function seed() {
  try {
    if (process.env.NODE_ENV === 'production') throw new Error('The demo seed is disabled in production');
    if (!MONGO_URI || !DEMO_EMAIL || !DEMO_PASSWORD ||
      Buffer.byteLength(DEMO_PASSWORD, 'utf8') < 8 || Buffer.byteLength(DEMO_PASSWORD, 'utf8') > 72) {
      throw new Error('Set MONGO_URI, SEED_DEMO_EMAIL, and an 8-72 byte SEED_DEMO_PASSWORD');
    }

    await mongoose.connect(MONGO_URI);

    const normalizedEmail = DEMO_EMAIL.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: { name: DEMO_NAME.trim(), passwordHash },
        $setOnInsert: { email: normalizedEmail },
      },
      { new: true, upsert: true, runValidators: true }
    );
    await Promise.all([
      Transaction.deleteMany({ userId: user._id }),
      Budget.deleteMany({ userId: user._id }),
      Anomaly.deleteMany({ userId: user._id }),
      Forecast.deleteMany({ userId: user._id }),
      Insight.deleteMany({ userId: user._id }),
      Notification.deleteMany({ userId: user._id }),
      RecurringExpense.deleteMany({ userId: user._id }),
    ]);
    console.log(JSON.stringify({ level: 'info', event: 'demo_seed_user_ready' }));

    const now = new Date();
    const demoDate = (monthOffset, day) => {
      const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      date.setDate(day);
      return date;
    };

    // Create repeatable monthly history so forecast and recurring views are demonstrable.
    const txDocs = [];
    for (let month = 2; month >= 0; month--) {
      for (const t of sampleTransactions) {
        txDocs.push({
          userId: user._id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          date: demoDate(-month, month === 0 ? Math.max(1, now.getDate() - 2) : 5),
          source: 'manual',
        });
      }
    }

    txDocs.push({
      userId: user._id,
      description: 'Unusually large Food & Dining purchase',
      amount: 12500,
      type: 'debit',
      category: 'Food & Dining',
      date: demoDate(0, now.getDate()),
      source: 'manual',
    });

    await Transaction.insertMany(txDocs);
    console.log(JSON.stringify({ level: 'info', event: 'demo_seed_transactions_created', count: txDocs.length }));

    // Create budgets
    const budgets = [
      { category: 'Food & Dining', amount: 6000 },
      { category: 'Shopping', amount: 8000 },
      { category: 'Transport', amount: 4000 },
      { category: 'Entertainment', amount: 2000 },
      { category: 'Bills & Utilities', amount: 5000 },
      { category: 'Healthcare', amount: 3000 },
      { category: 'Investments', amount: 15000 },
    ];

    await Budget.insertMany(budgets.map((b) => ({ ...b, userId: user._id })));
    console.log(JSON.stringify({ level: 'info', event: 'demo_seed_budgets_created', count: budgets.length }));

    console.log(JSON.stringify({
      level: 'info',
      event: 'demo_seed_complete',
      demoData: 'three months of recurring transactions, current-month anomaly, and budget overrun',
    }));
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', event: 'demo_seed_failed', errorName: err.name || 'Error' }));
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
