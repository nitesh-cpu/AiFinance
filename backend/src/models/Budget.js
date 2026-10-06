import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0.01, max: 1_000_000_000 },
    period: { type: String, enum: ['monthly', 'weekly'], default: 'monthly' },
    alertPercentage: { type: Number, default: 80, min: 1, max: 100 },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, category: 1 }, { unique: true });

export const Budget = mongoose.model('Budget', budgetSchema);
