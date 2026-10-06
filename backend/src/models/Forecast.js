import mongoose from 'mongoose';

const forecastSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    period: { type: String, required: true }, // e.g. "October 2026"
    currentSpending: { type: Number, required: true },
    predictedSpending: { type: Number, required: true },
    lowerBound: { type: Number, required: true },
    upperBound: { type: Number, required: true },
    categoryForecasts: [
      {
        category: { type: String, required: true },
        current: { type: Number, required: true },
        predicted: { type: Number, required: true },
        budget: { type: Number, required: true },
        status: { type: String, required: true },
      },
    ],
    confidence: { type: Number, default: 0.92 },
    factors: [{ type: String }],
  },
  { timestamps: true }
);

export const Forecast = mongoose.model('Forecast', forecastSchema);
