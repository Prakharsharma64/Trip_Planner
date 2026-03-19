const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  note: { type: String, default: '', trim: true },
}, { timestamps: true });

settlementSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);
