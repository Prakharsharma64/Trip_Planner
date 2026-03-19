require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const destinationsRouter = require('./routes/destinations');
const authRouter = require('./routes/auth');
const bucketRouter = require('./routes/bucket');
const usersRouter = require('./routes/users');
const groupsRouter = require('./routes/groups');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not set. Add it to .env for auth to work.');
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/bucket', bucketRouter);
app.use('/api/users', usersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/destinations', destinationsRouter);

app.use(express.static(path.join(__dirname)));

// Serve React build when available (for production)
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get(['/destinations', '/destinations/*', '/login', '/suggestions', '/bucket', '/profile', '/groups', '/groups/*'], (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.get('/', (req, res) => {
  const reactIndex = path.join(clientDist, 'index.html');
  if (fs.existsSync(reactIndex)) {
    return res.sendFile(reactIndex);
  }
  res.sendFile(path.join(__dirname, 'India_Trip_Guide_With_Photos.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
