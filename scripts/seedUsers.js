require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const USERS = [
  { name: 'Prakhar Sharma', email: 'prakhar@tripplanner.in', password: 'PrakharAdmin@2026', role: 'admin', location: { city: 'Jaipur', state: 'Rajasthan' } },
  { name: 'Abhinav Jain', email: 'abhinav@tripplanner.in', password: 'AbhinavUser@2026', role: 'user', location: { city: 'Delhi', state: 'Delhi' } },
  { name: 'Harshit Chauhan', email: 'harshit@tripplanner.in', password: 'HarshitUser@2026', role: 'user', location: { city: 'Delhi', state: 'Delhi' } },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      await User.create(u);
      console.log(`Created user: ${u.email} (${u.role})`);
    } else {
      console.log(`User exists: ${u.email}`);
    }
  }
  console.log('Seed users complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
