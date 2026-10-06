import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['warning', 'insight', 'recurring', 'income', 'budget', 'system'], default: 'system' },
    title: { type: String, required: true },
    details: { type: String, required: true },
    time: { type: String, default: 'Just now' },
    relatedEntity: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
