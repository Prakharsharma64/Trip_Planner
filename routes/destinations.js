const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const Destination = require('../models/Destination');
const Recommendation = require('../models/Recommendation');
const { auth } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/optionalAuth');

const TIER_RANGES = {
  budget: { $or: [{ budgetMax: { $lte: 5000 } }, { budgetMax: null, budgetMin: { $lte: 5000 } }] },
  mid: { budgetMax: { $gte: 5000, $lte: 10000 } },
  luxury: { $or: [{ budgetMin: { $gte: 10000 } }, { budgetMax: { $gte: 10000 } }] },
};

function toFrontendActs(acts) {
  if (!acts || !Array.isArray(acts)) return [];
  return acts.map((a) => (typeof a === 'string' ? ['', a, '', ''] : [a.icon || '', a.title || '', a.description || '', a.image || '']));
}

function toDestination(d) {
  const { _id, __v, category, acts, ...rest } = d;
  return { _id, ...rest, category: d.category, acts: toFrontendActs(acts) };
}

// GET /api/destinations/states - must be before /:id
router.get('/states', async (req, res) => {
  try {
    const states = await Destination.distinct('state').then((s) => s.filter(Boolean).sort());
    res.json(states);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/destinations/suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { tier, maxBudget, category, state } = req.query;
    const filter = {};
    if (tier && TIER_RANGES[tier]) Object.assign(filter, TIER_RANGES[tier]);
    if (maxBudget) filter.budgetMax = { ...filter.budgetMax, $lte: parseInt(maxBudget, 10) };
    if (category) filter.category = category;
    if (state) filter.state = state;
    const docs = await Destination.find(filter).limit(20).lean();
    res.json(docs.map(toDestination));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/destinations/:id/recommendations — public + current user's private
router.get('/:id/recommendations', optionalAuth, async (req, res) => {
  try {
    const destId = req.params.id;
    const dest = await Destination.findById(destId);
    if (!dest) return res.status(404).json({ error: 'Destination not found' });
    const filter = { destination: destId };
    if (req.user) {
      filter.$or = [{ visibility: 'public' }, { user: req.user._id }];
    } else {
      filter.visibility = 'public';
    }
    const list = await Recommendation.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(list.map((r) => ({
      _id: r._id,
      placeName: r.placeName,
      description: r.description,
      visibility: r.visibility,
      createdAt: r.createdAt,
      userName: r.user?.name,
      isOwn: req.user && String(r.user?._id) === String(req.user._id),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/destinations/:id/recommendations — add recommendation (auth)
router.post(
  '/:id/recommendations',
  auth,
  body('placeName').trim().notEmpty().withMessage('Place name is required'),
  body('description').optional().trim(),
  body('visibility').optional().isIn(['public', 'private']),
  async (req, res) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) {
        return res.status(400).json({ error: errs.array()[0]?.msg || 'Invalid input' });
      }
      const destId = req.params.id;
      const dest = await Destination.findById(destId);
      if (!dest) return res.status(404).json({ error: 'Destination not found' });
      const rec = await Recommendation.create({
        destination: destId,
        user: req.user._id,
        placeName: req.body.placeName.trim(),
        description: (req.body.description || '').trim() || undefined,
        visibility: req.body.visibility === 'private' ? 'private' : 'public',
      });
      await rec.populate('user', 'name');
      res.status(201).json({
        _id: rec._id,
        placeName: rec.placeName,
        description: rec.description,
        visibility: rec.visibility,
        createdAt: rec.createdAt,
        userName: rec.user?.name,
        isOwn: true,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/destinations/:id/recommendations/:recId — delete own
router.delete('/:id/recommendations/:recId', auth, async (req, res) => {
  try {
    const rec = await Recommendation.findOne({
      _id: req.params.recId,
      destination: req.params.id,
      user: req.user._id,
    });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    await rec.deleteOne();
    res.json({ message: 'Recommendation removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/destinations/:id - single destination
router.get('/:id', async (req, res) => {
  try {
    const doc = await Destination.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Destination not found' });
    res.json(toDestination(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/destinations - paginated list with filters
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { tier, maxBudget, state, category, q } = req.query;

    const filter = {};
    if (tier && TIER_RANGES[tier]) Object.assign(filter, TIER_RANGES[tier]);
    if (maxBudget) filter.budgetMax = { ...filter.budgetMax, $lte: parseInt(maxBudget, 10) };
    if (state) filter.state = state;
    if (category) filter.category = category;
    if (q && q.trim()) {
      const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: re },
        { state: re },
        { about: re },
      ];
    }

    const [docs, total] = await Promise.all([
      Destination.find(filter).sort({ state: 1, name: 1 }).skip(skip).limit(limit).lean(),
      Destination.countDocuments(filter),
    ]);

    res.json({
      data: docs.map(toDestination),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
