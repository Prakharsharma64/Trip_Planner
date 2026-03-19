const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  placeName: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
}, { timestamps: true });

recommendationSchema.index({ destination: 1, createdAt: -1 });
recommendationSchema.index({ user: 1, destination: 1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);
