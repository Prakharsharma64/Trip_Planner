const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const BucketItem = require('../models/BucketItem');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/me', async (req, res) => {
  try {
    const [wantCount, visitedCount] = await Promise.all([
      BucketItem.countDocuments({ user: req.user._id, status: 'want-to-visit' }),
      BucketItem.countDocuments({ user: req.user._id, status: 'visited' }),
    ]);
    const u = req.user.toObject();
    res.json({
      ...u,
      location: u.location || { city: '', state: '' },
      bucketStats: { wantToVisit: wantCount, visited: visitedCount },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch(
  '/me',
  body('name').optional().trim().isLength({ min: 1 }),
  body('location').optional().isObject(),
  async (req, res) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      if (req.body.name) req.user.name = req.body.name;
      if (req.body.location) {
        if (!req.user.location) req.user.location = {};
        if (req.body.location.city !== undefined) req.user.location.city = req.body.location.city;
        if (req.body.location.state !== undefined) req.user.location.state = req.body.location.state;
      }
      await req.user.save();
      const { password, ...u } = req.user.toObject();
      res.json(u);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/users/search?email=... — find users by email for adding to groups
router.get('/search', async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) return res.json([]);
    const users = await User.find({
      email: { $regex: email, $options: 'i' },
    }).select('name email').limit(10).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
