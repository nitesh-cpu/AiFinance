import mongoose from 'mongoose';

const insightSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['spending_alert', 'saving_opportunity', 'budget_risk', 'forecast', 'recurring', 'cash_flow', 'general'],
      default: 'general',
    },
    title: { type: String, required: true },
    summary: { type: String, required: true },

    dataFlow: {
      data: { type: String },
      analysis: { type: String },
      reason: { type: String },
      prediction: { type: String },
      action: { type: String },
    },

    reason: { type: String },
    actionText: { type: String },
    confidence: { type: Number, default: 0.9 },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

export const Insight = mongoose.model('Insight', insightSchema);
