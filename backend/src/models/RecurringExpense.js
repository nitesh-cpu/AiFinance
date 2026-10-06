import mongoose from 'mongoose';

const recurringExpenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    merchant: { type: String, required: true },
    amount: { type: Number, required: true },
    frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
    nextPaymentDate: { type: Date, required: true },
    confidence: { type: Number, default: 90 },
    detectionMethod: { type: String, default: 'pattern_matching' },
    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    category: { type: String, default: 'Bills' },
    necessary: { type: Boolean, default: true },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);

export const RecurringExpense = mongoose.model('RecurringExpense', recurringExpenseSchema);
