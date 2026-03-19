const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currency: { type: String, default: 'INR' },
  tripDestination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
  tripStartDate: Date,
  tripEndDate: Date,
}, { timestamps: true });

groupSchema.index({ members: 1 });
groupSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Group', groupSchema);
