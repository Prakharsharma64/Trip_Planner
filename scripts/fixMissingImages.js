/**
 * Fetch images for destinations that have none, then assign to their activities.
 * Uses hardcoded verified Wikipedia/Commons URLs to guarantee success.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Destination = require('../models/Destination');

// Hardcoded verified image URLs for the problem destinations
const MANUAL_IMAGES = {
  'Kadmat Island': [
    'https://upload.wikimedia.org/wikipedia/commons/3/36/Kadmat_Island.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Lakshadweep_Island.jpg/800px-Lakshadweep_Island.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Beautiful_view_of_Kadmath_Island_Beach.jpg/800px-Beautiful_view_of_Kadmath_Island_Beach.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Lakshadweep_-_Islands.jpg/800px-Lakshadweep_-_Islands.jpg'
  ],
  'Bangaram Island': [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bangaram_Island_Resort.jpg/800px-Bangaram_Island_Resort.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Bangaram_Atoll.jpg/800px-Bangaram_Atoll.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lakshadweep_islands.jpg/800px-Lakshadweep_islands.jpg'
  ],
  'Puducherry (Pondicherry)': [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Promenade_Beach%2C_Puducherry.jpg/800px-Promenade_Beach%2C_Puducherry.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Auroville_Matrimandir.jpg/800px-Auroville_Matrimandir.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/French_War_Memorial_Puducherry.jpg/800px-French_War_Memorial_Puducherry.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Pondicherry_Museum.jpg/800px-Pondicherry_Museum.jpg'
  ],
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const [name, imgs] of Object.entries(MANUAL_IMAGES)) {
    const dest = await Destination.findOne({ name }).lean();
    if (!dest) { console.log(`Not found: ${name}`); continue; }

    console.log(`Fixing images for ${name}...`);

    const cover = imgs[0];
    const gallery = imgs; // Use all for gallery including cover to make it richer
    
    // Assign gallery images to activities
    const newActs = (dest.acts || []).map((act, i) => ({
      ...act,
      image: imgs[i % imgs.length],
    }));

    await Destination.updateOne(
      { _id: dest._id },
      { $set: { images: { cover, gallery }, acts: newActs } }
    );
    console.log(`  ✓ Saved cover + ${gallery.length} gallery + ${newActs.length} activity images`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
