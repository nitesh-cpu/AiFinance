import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true, maxlength: 500 },
    amount: { type: Number, required: true, min: 0.01, max: 1_000_000_000 },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: { type: String, required: true, default: 'Other', maxlength: 100 },
    source: { type: String, enum: ['manual', 'csv'], default: 'manual' },
    notes: { type: String, default: '', maxlength: 2000 },
    tags: [{ type: String, maxlength: 100 }],
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, type: 1, date: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
