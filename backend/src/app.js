import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import insightRoutes from './routes/insightRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import forecastRoutes from './routes/forecastRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();
const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SpendSense API is running', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/user', userRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
