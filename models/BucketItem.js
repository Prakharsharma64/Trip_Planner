const mongoose = require('mongoose');

const bucketItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  status: { type: String, enum: ['want-to-visit', 'visited'], default: 'want-to-visit' },
  notes: String,
  visitedAt: Date,
}, { timestamps: true });

bucketItemSchema.index({ user: 1, destination: 1 }, { unique: true });

module.exports = mongoose.model('BucketItem', bucketItemSchema);
