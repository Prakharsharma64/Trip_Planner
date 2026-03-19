/**
 * Assign activity images from each destination's existing gallery.
 * Instead of hitting Wikimedia APIs for each activity (which often fails on generic names),
 * we distribute the gallery images already fetched across the activities.
 * Run: npm run fetch-activity-images
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Destination = require('../models/Destination');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const destinations = await Destination.find({ 'acts.0': { $exists: true } }).lean();
  console.log(`Processing ${destinations.length} destinations...`);

  let totalAssigned = 0;
  let totalSkipped = 0;

  for (const d of destinations) {
    const gallery = d.images?.gallery || [];
    const cover = d.images?.cover;

    // Build image pool: cover first, then gallery images (skip duplicates)
    const pool = [];
    if (cover) pool.push(cover);
    for (const img of gallery) {
      if (img !== cover) pool.push(img);
    }

    if (pool.length === 0) {
      process.stdout.write(`\n⚠ ${d.name}: no gallery images`);
      continue;
    }

    const newActs = (d.acts || []).map((act, i) => {
      if (act.image) { totalSkipped++; return act; }
      // Cycle through pool images so each activity gets a different one
      const img = pool[i % pool.length];
      totalAssigned++;
      return { ...act, image: img };
    });

    await Destination.updateOne({ _id: d._id }, { $set: { acts: newActs } });
    process.stdout.write(`\n✓ ${d.name}: assigned ${newActs.filter(a => a.image).length}/${newActs.length} activities`);
  }

  console.log(`\n\nDone. Assigned ${totalAssigned} activity images from gallery (${totalSkipped} already had images).`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
