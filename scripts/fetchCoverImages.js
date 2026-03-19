/**
 * Fetch cover images from Wikipedia for all destinations and store in DB.
 * Uses pageimages API first, falls back to Commons search for better results.
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
  'Wayanad_district': 'Wayanad Kerala forest waterfall elephant',
  'Kodagu_district': 'Coorg Kodagu Karnataka coffee estate waterfall',
  'Lonar_crater_lake': 'Lonar crater lake Maharashtra meteorite',
  'Ranthambore_National_Park': 'Ranthambore fort Rajasthan tiger reserve',
  'Kumbhalgarh': 'Kumbhalgarh fort wall Rajasthan Aravalli',
  'Dzukou_Valley': 'Dzukou Valley Nagaland flowers lily',
  'Tawang': 'Tawang monastery Arunachal Pradesh Buddhist',
  'Mawlynnong': 'Mawlynnong cleanest village Meghalaya',
  'Majuli': 'Majuli island Assam Brahmaputra satra',
  'Ziro_Valley': 'Ziro Valley Arunachal Pradesh Apatani rice field',
  'Cherrapunji': 'Cherrapunji waterfall Meghalaya Nohkalikai',
  'Dawki': 'Dawki Umngot river Meghalaya crystal',
  'Hampi': 'Hampi ruins Vijayanagara Karnataka UNESCO',
  'Agumbe': 'Agumbe rainforest Karnataka king cobra',
  'Kolad,_Maharashtra': 'Kolad Kundalika river Maharashtra monsoon',
};

function extractWikiTitle(wikiUrl) {
  if (!wikiUrl || typeof wikiUrl !== 'string') return null;
  const m = wikiUrl.match(/\/wiki\/(.+)$/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
}

function isGoodImg(url) {
  if (!url || typeof url !== 'string') return false;
  if (!/\.(jpg|jpeg|png|webp)/i.test(url)) return false;
  if (/icon|logo|flag|locator|blank|seal|coat|emblem|signature|button|wikimedia-logo|commons-logo|wikipedia-logo|\bmap\b|district_map|location_map|india_map|relief_map/i.test(url)) return false;
  return true;
}

async function fetchPageImage(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&pithumbsize=700&piprop=thumbnail&format=json&origin=*&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const p = Object.values(pages)[0];
  const src = p?.thumbnail?.source;
  return src && isGoodImg(src) ? src : null;
}

async function fetchCommonsImages(searchTerm, limit = 3) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerm)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return [];
  const urls = [];
  for (const pg of Object.values(pages)) {
    const u = pg?.imageinfo?.[0]?.url;
    if (u && isGoodImg(u)) urls.push(u);
  }
  return urls;
}

async function getCoverForDestination(d) {
  const title = extractWikiTitle(d.wiki);
  if (!title) return null;
  const wikiKey = title.replace(/ /g, '_');
  let src = await fetchPageImage(title);
  if (src) return src;
  const term = SEARCH_TERMS[wikiKey] || d.name;
  const urls = await fetchCommonsImages(term, 6);
  return urls[0] || null;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const dests = await Destination.find({}).lean();
  let updated = 0;
  let failed = 0;
  for (let i = 0; i < dests.length; i++) {
    const d = dests[i];
    if (d.images?.cover) {
      process.stdout.write('.');
      continue;
    }
    try {
      const cover = await getCoverForDestination(d);
      if (cover) {
        await Destination.updateOne(
          { _id: d._id },
          { $set: { 'images.cover': cover } }
        );
        updated++;
        process.stdout.write('✓');
      } else {
        process.stdout.write('-');
        failed++;
      }
    } catch (err) {
      process.stdout.write('x');
      failed++;
    }
    if (i % 5 === 4) await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`\nDone. Updated: ${updated}, No image: ${failed}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
