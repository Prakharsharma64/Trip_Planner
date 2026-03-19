const express = require('express');
const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const BucketItem = require('../models/BucketItem');
const Destination = require('../models/Destination');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const items = await BucketItem.find({ user: req.user._id })
      .populate('destination')
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bucket/status?destinationIds=id1,id2,... — batch bucket status
router.get('/status', async (req, res) => {
  try {
    const ids = (req.query.destinationIds || '').split(',').filter(Boolean);
    if (!ids.length) return res.json({});
    const items = await BucketItem.find({
      user: req.user._id,
      destination: { $in: ids },
    }).lean();
    const map = {};
    for (const item of items) {
      map[String(item.destination)] = {
        status: item.status,
        visitedAt: item.visitedAt || null,
        bucketItemId: item._id,
      };
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/',
  body('destinationId').isMongoId(),
  async (req, res) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) {
        return res.status(400).json({ error: 'Invalid destination ID' });
      }
      const { destinationId } = req.body;
      const dest = await Destination.findById(destinationId);
      if (!dest) {
        return res.status(404).json({ error: 'Destination not found' });
      }
      const existing = await BucketItem.findOne({ user: req.user._id, destination: destinationId });
      if (existing) {
        return res.status(409).json({ error: 'Already in bucket list' });
      }
      const item = await BucketItem.create({
        user: req.user._id,
        destination: destinationId,
      });
      await item.populate('destination');
      res.status(201).json(item);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Already in bucket list' });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch(
  '/:id',
  param('id').isMongoId(),
  body('status').optional().isIn(['want-to-visit', 'visited']),
  body('notes').optional().isString(),
  body('visitedAt').optional().isISO8601(),
  async (req, res) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      const item = await BucketItem.findOne({ _id: req.params.id, user: req.user._id });
      if (!item) {
        return res.status(404).json({ error: 'Bucket item not found' });
      }
      if (req.body.status !== undefined) item.status = req.body.status;
      if (req.body.notes !== undefined) item.notes = req.body.notes;
      if (req.body.visitedAt !== undefined) item.visitedAt = req.body.visitedAt;
      await item.save();
      await item.populate('destination');
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete(
  '/:id',
  param('id').isMongoId(),
  async (req, res) => {
    try {
      const item = await BucketItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!item) {
        return res.status(404).json({ error: 'Bucket item not found' });
      }
      res.json({ message: 'Removed from bucket list' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
