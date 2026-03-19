const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  category: {
    type: String,
    enum: ['Food', 'Transport', 'Stay', 'Activity', 'Shopping', 'Other'],
    default: 'Other',
  },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  splits: [splitSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

expenseSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
