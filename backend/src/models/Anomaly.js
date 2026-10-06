import mongoose from 'mongoose';

const anomalySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    merchant: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    score: { type: Number, default: 0.85 },
    confidence: { type: Number, default: 90 },
    severity: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    reasons: [{ type: String }],
    usualRange: { type: String, default: '₹500 – ₹2,500' },
    differencePercentage: { type: String, default: '+150%' },
    status: { type: String, enum: ['unreviewed', 'reviewed', 'marked_normal'], default: 'unreviewed' },
  },
  { timestamps: true }
);

anomalySchema.index({ userId: 1, transactionId: 1 }, { unique: true });

export const Anomaly = mongoose.model('Anomaly', anomalySchema);
