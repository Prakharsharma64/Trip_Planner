require('dotenv').config();
const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const fs = require('fs');
const path = require('path');

function loadBucketlist() {
  const dataPath = path.join(__dirname, '..', 'data', 'india-destinations-bucketlist.json');
  const raw = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(raw);
}

function parseBudget(budgetRange) {
  if (!budgetRange || typeof budgetRange !== 'string') return { budget: '', budgetMin: null, budgetMax: null };
  const cleaned = budgetRange.replace(/[₹,\s]/g, '').replace(/–/g, '-');
  const parts = cleaned.split('-').map((p) => parseInt(p.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
  const budgetMin = parts[0] || null;
  const budgetMax = parts[1] || parts[0] || null;
  return { budget: budgetRange, budgetMin, budgetMax };
}

function keyAttractionsToActs(keyAttractions) {
  if (!keyAttractions || !Array.isArray(keyAttractions)) return [];
  return keyAttractions.map((title) => ({ icon: '', title: String(title), description: '' }));
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const data = loadBucketlist();
  await Destination.deleteMany({});
  let count = 0;

  for (const [state, places] of Object.entries(data)) {
    if (state === '_meta') continue;
    for (const p of places) {
      const { budget, budgetMin, budgetMax } = parseBudget(p.budgetRange);
      await Destination.create({
        name: p.name,
        wiki: p.wiki || '',
        category: p.type || 'popular',
        state,
        weather: p.bestSeason || '',
        budget,
        budgetMin,
        budgetMax,
        acts: keyAttractionsToActs(p.keyAttractions),
        about: (p.keyAttractions || []).join('. ') || p.name,
      });
      count++;
    }
  }

  console.log(`Seeded ${count} destinations.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
