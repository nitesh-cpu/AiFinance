import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0, select: false },
    currency: { type: String, default: 'INR (₹)' },
    profilePhoto: { type: String, default: '' },

    preferences: {
      personalizedAI: { type: Boolean, default: true },
      transactionDataForAI: { type: Boolean, default: true },
      explainAIDecisions: { type: Boolean, default: true },
    },

    notifications: {
      budgetAlerts: { type: Boolean, default: true },
      anomalyAlerts: { type: Boolean, default: true },
      recurringReminders: { type: Boolean, default: true },
      weeklySummary: { type: Boolean, default: true },
    },

    security: {
      twoFactorEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Method to remove sensitive password hash when JSON response is generated
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.tokenVersion;
  return obj;
};

export const User = mongoose.model('User', userSchema);
