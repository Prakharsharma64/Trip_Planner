const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  icon: String,
  title: String,
  description: String,
  image: String,
}, { _id: false });

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  wiki: { type: String, required: true },
  category: { type: String, required: true },
  state: String,
  crowd: String,
  travel: String,
  weather: String,
  budget: String,
  budgetMin: Number,
  budgetMax: Number,
  route: String,
  about: String,
  acts: [activitySchema],
  tip: String,
  images: {
    cover: String,
    gallery: [String],
  },
}, { timestamps: true });

destinationSchema.index({ category: 1 });
destinationSchema.index({ name: 'text', state: 'text', about: 'text' });

module.exports = mongoose.model('Destination', destinationSchema);
