/**
 * Fetch cover + gallery images for all destinations via Wikipedia/Commons APIs
 * and store them in MongoDB. Run after seed: npm run fetch-images
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Destination = require('../models/Destination');

const SEARCH_TERMS = {
  'Gir_Forest_National_Park': 'Gir Forest National Park Asiatic lion Gujarat',
  'Binsar_Wildlife_Sanctuary': 'Binsar Uttarakhand forest Himalaya',
  'Tirthan_Valley': 'Tirthan Valley Himachal Pradesh river',
  'Jibhi,_Himachal_Pradesh': 'Jibhi Himachal Pradesh village',
  'Lansdowne,_Uttarakhand': 'Lansdowne Uttarakhand hill station',
  'Barot,_Himachal_Pradesh': 'Barot Valley Himachal Pradesh',
  'Mandu,_Madhya_Pradesh': 'Mandu Madhya Pradesh fort palace',
  'Diu,_India': 'Diu island Gujarat fort beach',
  'Rann_of_Kutch': 'Rann of Kutch Gujarat desert salt',
};

function isGoodImg(url) {
  if (!url) return false;
  if (!/\.(jpg|jpeg|png|webp)/i.test(url)) return false;
  if (/icon|logo|flag|locator|blank|seal|coat|emblem|signature|button|wikimedia-logo|commons-logo|wikipedia-logo|\bmap\b|district_map|location_map|india_map|relief_map/i.test(url)) return false;
  return true;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function getWikipediaImage(wiki) {
  const title = wiki.replace(/_/g, ' ');
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&pithumbsize=700&piprop=thumbnail&format=json&titles=${encodeURIComponent(title)}`;
  const data = await fetchJson(url);
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const src = page?.thumbnail?.source;
  if (!src || !isGoodImg(src)) return null;
  return src.replace(/\/\d+px-/, '/700px-');
}

async function getCommonsImages(searchTerm, limit = 15) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerm)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url&format=json`;
  const data = await fetchJson(url);
  const pages = data?.query?.pages;
  if (!pages) return [];
  const urls = [];
  for (const pg of Object.values(pages)) {
    const u = pg?.imageinfo?.[0]?.url;
    if (isGoodImg(u)) urls.push(u);
  }
  return urls;
}

async function fetchImagesForDestination(dest) {
  const { name, wiki } = dest;
  let cover = null;
  let gallery = [];

  // 1. Try Wikipedia pageimages
  try {
    cover = await getWikipediaImage(wiki);
  } catch (e) {
    // ignore
  }

  // 2. Try Commons search (better results for many Indian places)
  const term = SEARCH_TERMS[wiki] || name;
  const term2 = `${name} India`;
  try {
    const [urls1, urls2] = await Promise.all([
      getCommonsImages(term, 15),
      getCommonsImages(term2, 10),
    ]);
    const seen = new Set();
    const combined = [];
    for (const u of [...urls1, ...urls2]) {
      if (!seen.has(u)) {
        seen.add(u);
        combined.push(u);
      }
    }
    if (combined.length) {
      if (!cover) cover = combined[0];
      gallery = combined;
    }
  } catch (e) {
    // ignore
  }

  // 3. If we still have nothing, use existing images from DB if any
  if (!cover && dest.images?.cover) cover = dest.images.cover;
  if (gallery.length === 0 && dest.images?.gallery?.length) gallery = dest.images.gallery;

  return { cover, gallery };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const destinations = await Destination.find().lean();
  console.log(`Fetching images for ${destinations.length} destinations...`);

  let updated = 0;
  for (let i = 0; i < destinations.length; i++) {
    const d = destinations[i];
    process.stdout.write(`[${i + 1}/${destinations.length}] ${d.name}... `);
    try {
      const { cover, gallery } = await fetchImagesForDestination(d);
      if (cover || gallery.length) {
        await Destination.updateOne(
          { _id: d._id },
          { $set: { images: { cover: cover || null, gallery: gallery || [] } } }
        );
        console.log(`✓ ${cover ? 'cover' : ''} ${gallery.length} gallery`);
        updated++;
      } else {
        console.log('⚠ no images found');
      }
      await new Promise((r) => setTimeout(r, 300)); // rate limit
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  console.log(`\nDone. Updated ${updated}/${destinations.length} destinations with images.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
